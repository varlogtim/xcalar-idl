var fs = require('fs');
var exec = require('child_process').exec;
var Status = require('./supportStatusFile').Status;
var guiDir = "/var/www/xcalar-gui";

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

/*
Right /uploadContent is implemented in a really clumsy way.
Will fix in the next version.
*/
function uploadContent(req, res) {
    if (fs.existsSync(guiDir + "/services/expServer/awsWriteConfig.json")) {
        var awsTmp = require('aws-sdk');
        var s3Tmp = new awsTmp.S3();
    } else {
        return res.send({"status": Status.Error, "logs": "You're not permitted to upload"});
    }
    var tmpPrefix = "/tmp/app" + getRandomInt(0, 1000) + "/";
    deleteFolderRecursive(tmpPrefix);
    console.log("Deleted local " + tmpPrefix);
    create(tmpPrefix)
    .then(function() {
        var filePath1 = req.body.filePath1;
        var savedAsName1 = req.body.savedAsName1;
        var filePath2 = req.body.filePath2;
        var savedAsName2 = req.body.savedAsName2;
        var filePath3 = req.body.filePath3;
        var savedAsName3 = req.body.savedAsName3;
        var name = req.body.name;
        var version = req.body.version;
        if (!validate(name, version)) {
            return res.send({"status": Status.Error, "logs": "Validation fails: wrong input"});
        }
        if (filePath1 == null || filePath1.length == 0 || savedAsName1.length == 0) {
            return res.send({"status": "Error", "logs": "Please specify at least one file & save as"});
        }
        var execString = "cp " + filePath1 + " " + tmpPrefix + savedAsName1;
        var out = exec(execString);

        out.on('close', function(code) {
            if (code != 0 && code != 1) {
                console.log("Failed to upload");
                console.log("Error code is " + code);
                return res.send({"status": Status.Error, "code": code});
            }
            console.log("Copying first file to local /tmp");
            if (filePath2 != null && filePath2.length != 0 && savedAsName2.length != 0) {
                var execString = "cp " + filePath2 + " " + tmpPrefix + savedAsName2;
                var out = exec(execString);
                out.on('close', function(code) {
                    if (code != 0 && code != 1) {
                        console.log("Failed to upload");
                        console.log("Error code is " + code);
                        return res.send({"status": Status.Error, "code": code});
                    }
                    console.log("Copying second file to local /tmp");
                    if (filePath3 != null && filePath3.length != 0 && savedAsName3.length != 0) {
                        var execString = "cp " + filePath3 + " " + tmpPrefix + savedAsName3;
                        var out = exec(execString);
                        out.on('close', function(code) {
                            if (code != 0 && code != 1) {
                                console.log("Failed to upload");
                                console.log("Error code is " + code);
                                return res.send({"status": Status.Error, "code": code});
                            }
                            console.log("Copying third file to local /tmp");
                            gzipAndUpload(name, version, tmpPrefix, s3Tmp)
                            .then(function() {
                                return res.send({"status": Status.Ok});
                            });
                        });
                    } else {
                        gzipAndUpload(name, version, tmpPrefix, s3Tmp)
                        .then(function() {
                            return res.send({"status": Status.Ok});
                        });
                    }
                });
            } else {
                gzipAndUpload(name, version, tmpPrefix, s3Tmp)
                .then(function() {
                    return res.send({"status": Status.Ok});
                });
            }
            // code(1) means files were changed while being archived
        });
    });
};

var gzipAndUpload = function(name, version, tmpPrefix, s3Tmp) {
    var tmpTarGz = tmpPrefix+"tmp.tar.gz";
    var deferred = jQuery.Deferred();
    gzip(tmpTarGz, tmpPrefix)
    .then(function() {
        console.log("Succeeded to tar");
        fs.readFile(tmpTarGz, function(err, data) {
            upload('extensions/'+name+"/"+version+"/"+name+'-'+version+'.tar.gz', data, s3Tmp)
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

var deleteFolderRecursive = function(path) {
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
};

var create = function(dir) {
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

var gzip = function(fileName, tmpPrefix) {
    var deferred = jQuery.Deferred();
    var execString = "tar -czf " + fileName + " -C " + tmpPrefix + " . --exclude \"*.tar.gz\" --warning=no-file-changed";
    var out = exec(execString);

    out.on('close', function(code) {
        // code(1) means files were changed while being archived
        if (code == 0 || code == 1) {
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

function uploadMeta(req, res) {
    if (fs.existsSync("./awsWriteConfig.json")) {
        var awsTmp = require('aws-sdk');
        var s3Tmp = new awsTmp.S3();
    } else {
        return res.send({"status": Status.Error, "logs": "You're not permitted to upload"});
    }
    var name = req.body.name;
    var version = req.body.version;
    var imageUrl = req.body.imageUrl;
    var description = req.body.description;
    var main = req.body.main;
    var repository_type = req.body.repository_type;
    var repository_url = req.body.repository_url;
    var author = req.body.author;
    var category = req.body.category;
    var imageUrl = req.body.imageUrl;
    var website = req.body.website;
    var imagePath = req.body.path;
    dataToSent = {
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
    }
    if (imagePath.length != 0) {
        fs.readFile(imagePath, function(err, data) {
            if (err) {
                return res.send({"status": Status.Error, "logs": err});
            }
            image = data.toString("base64");
            dataToSent["image"] = image
            var file = 'extensions/'+name+"/"+version+"/"+name+'.txt';
            upload(file, JSON.stringify(dataToSent), s3Tmp)
            .then(function(data) {
                return res.send(data);
            });
        });
    } else {
        var file = 'extensions/'+name+"/"+version+"/"+name+'.txt';
        upload(file, JSON.stringify(dataToSent), s3Tmp)
        .then(function(data) {
            return res.send(data);
        });
    }
};

var upload = function(file, content, s3Tmp) {
    var deferred = jQuery.Deferred();
    params = {
        Bucket: 'marketplace.xcalar.com',
        Key: file,
        Body: content
    }
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
