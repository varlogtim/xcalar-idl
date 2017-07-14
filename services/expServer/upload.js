var fs = require('fs');
var exec = require('child_process').exec;
var Status = require('./supportStatusFile').Status;
var guiDir = (process.env.XCE_HTTP_ROOT ?
    process.env.XCE_HTTP_ROOT : "/var/www") + "/xcalar-gui";

var validate = function(name, version) {
    if (name == null || name.length === 0) {
        return false;
    }
    if (version == null || version.length === 0) {
        return false;
    }
    return true;
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

// Promise wrappers for exec and fs.writeFile

function execPromise(command, options) {
    var deferred = jQuery.Deferred();

    exec(command, options, function(err, stdout, stderr) {
        if (err) {
            deferred.reject({"status": Status.Error, "logs": err});
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise();
}

function writeFilePromise(filePath, data) {
    var deferred = jQuery.Deferred();
    fs.writeFile(filePath, data, function(err) {
        if (err) {
            deferred.reject({"status": Status.Error, "logs": err});
        } else {
            deferred.resolve();
        }
    })

    return deferred.promise();
}

function uploadContent(req, res) {
    var awsTmp = require('aws-sdk');
    var s3Tmp = new awsTmp.S3({
        "accessKeyId": "AKIAIMI35A6P3BFJTDEQ",
        "secretAccessKey": "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"
    });

    var tmpPrefix = "/tmp/app" + getRandomInt(0, 1000) + "/";
    deleteFolderRecursive(tmpPrefix);
    console.log("Deleted local " + tmpPrefix);
    create(tmpPrefix)
    .then(function() {
        var name = req.body.name;
        var version = req.body.version;
        var jsFileText = req.body.jsFileText;
        var jsFilePath = req.body.jsFilePath;
        var jsFileName = name + '.ext.js';
        var jsFileObj = req.body.jsFileObj;
        var pyFileText = req.body.pyFileText;
        var pyFilePath = req.body.pyFilePath;
        var pyFileName = name + '.ext.py';
        var pyFileObj = req.body.pyFileObj;

        var jsPromise;
        var pyPromise;

        // Prefer file upload over file path if both are provided
        if (jsFileObj) {
            jsPromise = writeFilePromise(tmpPrefix + jsFileName, jsFileText);
        } else {
            var copyJsFile = "cp " + jsFilePath + " " + tmpPrefix + jsFileName;
            jsPromise = execPromise(copyJsFile);
        }

        if (pyFileObj) {
            pyPromise = writeFilePromise(tmpPrefix + pyFileName, pyFileText);
        } else {
            var copyPyFile = "cp " + pyFilePath + " " + tmpPrefix + pyFileName;
            pyPromise = execPromise(copyPyFile);
        }

        jQuery.when(jsPromise, pyPromise)
        .then(function() {
            return gzipAndUpload(name, version, tmpPrefix, s3Tmp)
        })
        .then(function() {
            return uploadMeta(req, res, s3Tmp);
        })
        .then(function(data) {
            res.send({"Data": data, "status": Status.Ok})
        })
        .fail(function(errObj) {
            res.send(errObj);
        });
    });
}

function gzipAndUpload(name, version, tmpPrefix, s3Tmp) {
    var tmpTarGz = tmpPrefix+"tmp.tar.gz";
    var deferred = jQuery.Deferred();
    gzip(tmpTarGz, tmpPrefix)
    .then(function() {
        console.log("Succeeded to tar");
        fs.readFile(tmpTarGz, function(err, data) {
            upload('extensions/' + name + "/" + version + "/" + name + '-' +
                version + '.tar.gz', data, s3Tmp)
            .then(function() {
                console.log("Uploaded .tar.gz");
                deleteFolderRecursive(tmpPrefix);
                console.log("Deleted local " + tmpPrefix);
                deferred.resolve(Status.Done);
            });
        });
    });
    return deferred.promise();
}

function deleteFolderRecursive(path) {
  if ( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function create(dir) {
    var deferred = jQuery.Deferred();
    fs.access(dir, function(err) {
        if (err) {
            fs.mkdirSync(dir);
            deferred.resolve();
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise();
}

function gzip(fileName, tmpPrefix) {
    var deferred = jQuery.Deferred();
    var execString = "tar -czf " + fileName + " -C " + tmpPrefix +
        " . --exclude \"*.tar.gz\" --warning=no-file-changed";
    var out = exec(execString);

    out.on('close', function(code) {
        // code(1) means files were changed while being archived
        if (code === 0 || code === 1) {
            console.log("Succeeded to tar gz");
            deferred.resolve(Status.Done);
        } else {
            console.log("Failed to tar gz");
            console.log("Error code is " + code);
            deferred.reject();
        }
    });
    return deferred.promise();
}

function uploadMeta(req, res, s3Tmp) {

    var name = req.body.name;
    var version = req.body.version;
    var imageUrl = req.body.imageUrl;
    var description = req.body.description;
    var main = req.body.main;
    var repository_type = req.body.repository_type;
    var repository_url = req.body.repository_url;
    var author = req.body.author;
    var category = req.body.category;
    var website = req.body.website;
    var imagePath = req.body.imgPath;
    var imageBinary = req.body.imgBinary;
    var dataToSend = {
        "appName": name,
        "version": version,
        "description": description,
        "main": main,
        "repository_type": repository_type,
        "repository_url": repository_url,
        "author": author,
        "category": category,
        "imageUrl": imageUrl,
        "website": website,
        "image": ""
    };

    var file = 'extensions/'+name+"/"+version+"/"+name+'.txt';
    var image;
    // Prefer file upload over file path if both are provided
    if (imageBinary) {
        dataToSend.image = imageBinary;
        return upload(file, JSON.stringify(dataToSend), s3Tmp)
    } else {
        var deferred = jQuery.Deferred();
        fs.readFile(imagePath, function(err, data) {
            if (err) {
                console.log("here")
                deferred.reject({"status": Status.Error, "logs": err});
            } else {
                image = data.toString("base64");
                dataToSend.image = image;
                upload(file, JSON.stringify(dataToSend), s3Tmp)
                .then(deferred.resolve)
                .fail(deferred.reject);
            }
        });
        return deferred.promise();
    }
}

function upload(file, content, s3Tmp) {
    var deferred = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com',
        Key: file,
        Body: content
    };
    s3Tmp.putObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            deferred.resolve(data);
        }
    });
    return deferred.promise();
}

exports.uploadContent = uploadContent;
exports.uploadMeta = uploadMeta;
