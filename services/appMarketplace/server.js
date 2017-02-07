var express = require("express");
var fs = require("fs");
var url = require("url");
var bodyParser = require("body-parser");
var pathHandler = require("path");
var exec = require('child_process').exec;
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
    var deferred = jQuery.Deferred();
    var promise = __create(dir)
    promise
    .then(function() {
        dir = dir + "/" + projectName
        return __create(dir)
    })
    .then(function() {
        dir = dir + "/" + version
        return __create(dir)
    })
    .then(function() {
        deferred.resolve();
    })
    .fail(function() {
        deferred.reject();
    });
    return deferred.promise();
}

var __create = function(dir) {
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

app.post("/uploadContent", function(req, res) {
    // console.log(req.body);
    var appName = req.body.appName;
    var savedAsName = req.body.savedAsName;
    var version = req.body.version;
    var content = req.body.content;
    console.log("Start creating");
    __createIfNotExists(appName, version)
    .then(function() {
        console.log("Finish creating");
        // TODO: create a method to construct filePath
        var filename = __dirname + "/extensions" + "/" + appName + "/" + version + "/" + savedAsName;
        fs.writeFile(filename, content, function(err) {
            if(err) {
                return res.send({"status": Status.Error, "logs": err});
            } else {
                return res.send("Success");
            }
        });
    })
    .fail(function(err) {
        return res.send({"status": Status.Error, "logs": err});
    });
});

app.post("/gzip", function(req, res) {
    var appName = req.body.appName;
    var version = req.body.version;
    var dir = __dirname + "/extensions" + "/" + appName + "/" + version;
    var fileName = dir + "/" + appName + "-" + version + ".tar.gz";
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
    __gzip(dir, fileName)
    .then(function() {
        console.log("Upload successfully");
        for (var i = 0; i < files.length; i++) {
            filename = files[i];
            fs.unlink(filename, function(err) {
                if (err) {
                    return res.send({"status": Status.Error, "logs": err});
                }
            });
        }
        return res.send("Success");
    })
    .fail(function(err) {
        return res.send({"status": Status.Error, "logs": err});
    });
});

var __gzip = function(dir, fileName) {
    var deferred = jQuery.Deferred();
    var execString = "tar -czf " + fileName + " -C " + dir + " . --exclude \"*.tar.gz\" --warning=no-file-changed"
    var out = exec(execString);

    out.on('close', function(code) {
        // code(1) means files were changed while being archived
        if (code == 0 || code == 1) {
            console.log("Succeeded to upload");
            deferred.resolve(Status.Done);
        } else {
            console.log("Failed to upload");
            console.log("Error code is " + code);
            deferred.reject();
        }
    });
    return deferred.promise();
}


app.post("/uploadMeta", function(req, res) {
    var appName = req.body.appName;
    var version = req.body.version;
    var description = req.body.description;
    var author = req.body.author;
    var image = req.body.image;
    __createIfNotExists(appName, version)
    .then(function() {
        var filename = __dirname + "/extensions" + "/" + appName + "/" + version + "/" + appName + ".txt"
        var jsonMetaOutput = {
            "name": appName,
            "version": version,
            "description": description,
            "author": author,
            "image": image
        };
        var promise = __uploadMeta(filename, jsonMetaOutput)
        return promise
    })
    .then(function() {
        return res.send("Success");
    })
    .fail(function(err) {
        return res.send({"status": Status.Error, "logs": err});
    });
});

var __uploadMeta = function(filename, jsonMetaOutput) {
    var deferred = jQuery.Deferred();
    fs.access(filename, function(err) {
        if (err) {
            fs.writeFile(filename, JSON.stringify(jsonMetaOutput), function(err) {
                if(err) {
                    deferred.reject();
                }
                console.log("Metadata file was saved!");
                deferred.resolve();
            });
        } else {
            fs.readFile(filename, "utf8", function(err, oldData) {
                if (err) {
                    return deferred.reject();
                }
                try {
                    oldData = JSON.parse(oldData);
                }
                catch (e) {
                    return deferred.reject();
                }
                for (var key in jsonMetaOutput) {
                    if (jsonMetaOutput[key].length === 0 && key in oldData) {
                        jsonMetaOutput[key] = oldData[key];
                    }
                }
                fs.writeFile(filename, JSON.stringify(jsonMetaOutput), function(err) {
                    if (err) {
                        return deferred.reject();
                    }
                    console.log("Metadata file was updated!");
                    deferred.resolve();
                });
            });
        }
    });
    return deferred.promise();
}

/*
Example: http://localhost:3001/list
*/
app.get("/list", function(req, res) {
    fs.access(__dirname + "/extensions", function(err) {
        if (err) {
            fs.mkdirSync(__dirname + "/extensions");
        }
        _getAllFilesFromFolder(__dirname + "/extensions")
        .then(function(extensions) {
            res.jsonp(extensions);
        })
        .fail(function(err) {
            return res.send({"status": Status.Error, "logs": err});
        });
    })
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
    var fileName = appFolder + appName + "-" + version + ".tar.gz"
    // console.log(fileName);
    fs.access(fileName, function (err) {
        if (err) {
            return res.send({"status": Status.Error, "logs": "File not exists"});
        }
        fs.readFile(fileName, function(err, data) {
            if (err) {
                return res.send({"status": Status.Error, "logs": err});
            } else {
                var a = new Buffer(data).toString('base64');
                return res.send({"status": Status.Ok, "data": a});
            }
        });
    });
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

