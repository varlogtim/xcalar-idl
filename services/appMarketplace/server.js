var express = require("express");
var fs = require("fs");
var url = require("url");
var EasyZip = require("easy-zip").EasyZip;
var bodyParser = require("body-parser");
var fstream = require("fstream");
var pathHandler = require("path");

var app = express();

var Status = {
    "Error": -1,
    "Unknown": 0,
    "Ok": 1,
    "Done"   : 2,
    "Running": 3,
    "Incomplete": 4
};

app.get("/", function(req, res) {
    res.send("Hello");
});

app.listen(3001, function() {
    console.log("Working on port 3001");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit: "50mb"}));

require("jsdom").env("", function(err, window) {
    if (err) {
        return res.send({"status": Status.Error, "logs": err});
    }
    jQuery = require("jquery")(window);
});

app.all("/*", function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

var __createIfNotExists = function(projectName, version) {
    dir = __dirname + "/extensions"
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    dir = dir + "/" + projectName
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    dir = dir + "/" + version
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

app.post("/uploadContent", function(req, res) {
    console.log(req.body);
    var appName = req.body.appName;
    var savedAsName = req.body.savedAsName;
    var version = req.body.version;
    var content = req.body.content;
    __createIfNotExists(appName, version);
    var filename = __dirname + "/extensions" + "/" + appName + "/" + version + "/" + savedAsName
    fs.writeFile(filename, content, function(err) {
        if(err) {
            return res.send({"status": Status.Error, "logs": err});
        }
        console.log("App was saved!");
    });
    res.send("Success");
});

app.post("/zip", function(req, res) {
    var appName = req.body.appName;
    var version = req.body.version;
    var dir = __dirname + "/extensions" + "/" + appName + "/" + version;
    var fileName = dir + "/" + appName + "-" + version + ".zip";
    var filePath1 = req.body.filePath1;
    var filePath2 = req.body.filePath2;
    var filePath3 = req.body.filePath3;
    var filenames = []
    var files = []
    if (filePath1.length != 0) {
        files.push(dir + "/" + filePath1);
        filenames.push(filePath1);
    }
    if (filePath2.length != 0) {
        files.push(dir + "/" + filePath2);
        filenames.push(filePath2);
    }
    if (filePath3.length != 0) {
        files.push(dir + "/" + filePath3);
        filenames.push(filePath3);
    }
    var zip = new EasyZip();
    zipFiles = []
    for (i = 0; i < files.length; i++) {
        zipFiles.push({source : files[i],target:filenames[i]});
    }
    console.log(zipFiles);
    zip.batchAdd(zipFiles, function(){
        zip.writeToFile(fileName);
        for (var i = 0; i < files.length; i++) {
            filename = files[i];
            fs.unlink(filename, function(err) {
                if (err) {
                    return res.send({"status": Status.Error, "logs": err});
                }
            });
        }
        return res.send("Success");
    });
});


app.post("/uploadMeta", function(req, res) {
    var appName = req.body.appName;
    var version = req.body.version;
    var imageUrl = req.body.imageUrl;
    var description = req.body.description;
    var author = req.body.author;
    var image = req.body.image;
    __createIfNotExists(appName, version);
    var filename = __dirname + "/extensions" + "/" + appName + "/" + version + "/" + appName + ".txt"
    var jsonMetaOutput = {
        "name": appName,
        "version": version,
        "description": description,
        "author": author,
        "imageUrl": imageUrl,
        "image": image
    };
    if (fs.existsSync(filename)) {
        fs.readFile(filename, "utf8", function(err, oldData) {
            if (err) {
                return res.send({"status": Status.Error, "logs": err});
            }
            oldData = JSON.parse(oldData);
            for (var key in jsonMetaOutput) {
                if (jsonMetaOutput[key].length === 0 && key in oldData) {
                    jsonMetaOutput[key] = oldData[key];
                }
            }
            fs.writeFile(filename, JSON.stringify(jsonMetaOutput), function(err) {
                if (err) {
                    return res.send({"status": Status.Error, "logs": err});
                }
                console.log("Metadata file was saved!");
            });
        });
    } else {
        fs.writeFile(filename, JSON.stringify(jsonMetaOutput), function(err) {
            if(err) {
                return res.send({"status": Status.Error, "logs": err});
            }
            console.log("Metadata file was saved!");
        });
    }
    res.send("Success");
});

/*
Example: http://localhost:3001/list
*/
app.get("/list", function(req, res) {
    if (!fs.existsSync(__dirname + "/extensions")) {
        fs.mkdirSync(__dirname + "/extensions");
    }
    _getAllFilesFromFolder(__dirname + "/extensions")
    .then(function(extensions) {
        res.jsonp(extensions);
    });
});

var __validate = function(name, version) {
    if (name == null || name.length == 0) {
        return false;
    }
    if (version == null || version.length == 0) {
        return false;
    }
    return true;
}

/*
Example: http://localhost:3001/download?name=testApp&version=1.0.0
*/
app.get("/download", function(req, res) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var appName = query.name
    var version = query.version
    if (!__validate(appName, version)) {
        return res.send({"status": Status["Error"], "logs": "Please specify name, version and type"});
    }
    var appFolder = __dirname + "/extensions" + "/" + appName + "/" + version + "/";
    var fileName = appFolder + appName + "-" + version + ".zip"
    console.log(fileName);
    if (!fs.existsSync(fileName)) {
        return res.send({"status": Status["Error"], "logs": "File not exists"});
    }

    fs.readFile(fileName, function(err, data) {
        if (err) {
            console.log("Error");
            res.send({status: Status.Error});
        }
        var a = new Buffer(data).toString('base64');
	console.log(a.length);
	res.send({status: Status.Ok,
              data: a});
    });
/**
    res.writeHead(200, {
        "Content-Type"        : "application/octet-stream",
        "Content-Disposition" : "attachment; filename="+appName+"-"+version+".zip",
        "Content-Encoding"    : "zip"
    });
    console.log("Downloading from " + appFolder);
    fstream.Reader({ "path" : fileName, "type" : "File" })
        .pipe(res); // Write back to the response, or wherever else...
*/
});

var _getAllFilesFromFolder = function(dir) {
    var deferred = jQuery.Deferred();
    var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = pathHandler.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        results.push(file);
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    };
    walk(dir, function(err, results) {
        var allMeta = [];
        var fileCount = 0;
        if (results.length == 0) {
            deferred.resolve(allMeta);
        }
        for (var i = 0; i < results.length; i++) {
            file = results[i];
            if (file.includes(".txt")) {
                fileCount += 1;
            }
        }
        if (fileCount == 0) {
            deferred.resolve(allMeta);
        }
        for (var i = 0; i < results.length; i++) {
            file = results[i];
            if (file.includes(".txt")) {
                fs.readFile(file, "utf8", function(err, data) {
                    if (err) {
                        return console.log(err);
                    }
                    allMeta.push(JSON.parse(data));
                    if (allMeta.length == fileCount) {
                        deferred.resolve(allMeta);
                    }
                });
            }
        }
    });
    return deferred.promise();
};

