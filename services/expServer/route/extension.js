
var express = require('express');
var router = express.Router();
var support = require('../expServerSupport.js');
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var Status = require('../supportStatusFile.js').Status;
var fs = require("fs");
var exec = require("child_process").exec;
var guiDir = (process.env.XCE_HTTP_ROOT ?
    process.env.XCE_HTTP_ROOT : "/var/www") + "/xcalar-gui";
var basePath = guiDir + "/assets/extensions/";

try {
    var aws = require("aws-sdk");
    aws.config.update({
        accessKeyId: 'AKIAJIVAAB7VSKQBZ6VQ',
        secretAccessKey: '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',
        region: 'us-west-2'
    });
    var s3 = new aws.S3();
} catch (error) {
    xcConsole.log("Failure: set up AWS! " + error);
}

// Start of marketplace calls
/**
options should include:
host: hostName,
port: portNumber,
path: /action/here,
method: "POST" || "GET",
addition stuff like
postData: // For Posts
*/

router.post("/extension/upload", function(req, res) {
    writeTarGzWithCleanup({
        status: Status.Ok,
        data: req.body.targz
    }, req.body.name, "0.0.1")
    .then(function() {
        xcConsole.log("Intall extension finishes, enabling it");
        return enableExtension(req.body.name);
    })
    .then(function() {
        xcConsole.log("Enable installed extension finishes");
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        xcConsole.log("Error: " + err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

function writeTarGz(retStruct, name, version) {
    var innerDeferred = jQuery.Deferred();
    try {
        if (retStruct.status !== Status.Ok) {
            return innerDeferred.reject(retStruct);
        }
    } catch (e) {
        return innerDeferred.reject(ret);
    }

    var zipFile = new Buffer(retStruct.data, 'base64');
    var zipPath = basePath + "ext-available/" + name + "-" + version +
    ".tar.gz";
    xcConsole.log("Adding extension to " + zipPath);
    fs.writeFile(zipPath, zipFile, function(error) {
        if (error) {
            innerDeferred.reject(error);
        }
        xcConsole.log("untar", zipPath);
        var out = exec("tar -zxf " + zipPath + " -C " + basePath +
         "ext-available/");
        out.on('close', function(code) {
            xcConsole.log("Success: Untar finishes");
            if (code) {
                innerDeferred.reject(code);
            } else {
                innerDeferred.resolve();
            }
        });
    });
    return innerDeferred.promise();
}
function writeTarGzWithCleanup(ret, name, version) {
    var deferred = jQuery.Deferred();
    writeTarGz(ret, name, version)
    .then(function() {
        // Remove the tar.gz
        fs.unlink(basePath + "ext-available/" + name + "-" + version +
          ".tar.gz", function(err) {
            // regardless of status, this is a successful install.
            // we simply console log if the deletion went wrong.
            if (err) {
                xcConsole.log("Failure: Failed to delete .tar.gz with err: "
                  + err);
            } else {
                xcConsole.log("Success: Removed .tar.gz finishes. ");
            }
            deferred.resolve();
        });
    })
    .fail(deferred.reject);
    return deferred.promise();
}

router.post("/extension/download", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            logs: "s3 package not setup correctly!"
        });
    }
    var download = function(appName, version) {
        var deferred = jQuery.Deferred();
        var params = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Key: 'extensions/' + appName + "/" + version + "/" + appName +
            '-' + version + '.tar.gz'
        };
        s3.getObject(params, function(err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve({
                    status: Status.Ok,
                    data: data.Body.toString('base64')
                });
            }
        });
        return deferred.promise();
    };
    xcConsole.log("Download Package");
    var pkg = req.body;
    xcConsole.log(pkg);
    download(pkg.name, pkg.version)
    .then(function(ret) {
        writeTarGzWithCleanup(ret, pkg.name, pkg.version);
    })
    .then(function() {
        res.jsonp({status: Status.Ok});
    })
    .fail(function() {
        xcConsole.log("Failure: "+arguments);
        res.jsonp({
            status: Status.Error,
            logs: JSON.stringify(arguments)
        });
    });
});

// type == "enabled" || type == "available"
function getExtensionFiles(extName, type) {
    var deferred = jQuery.Deferred();
    fs.readdir(basePath + "ext-" + type + "/", function(err, files) {
        var extFiles = [];
        if (err) {
            xcConsole.log("get extension files error" + err);
            deferred.reject(err);
        }
        for (var i = 0; i < files.length; i++) {
            if (extName === "") {
                extFiles.push(files[i]);
            } else {
                if (files[i].indexOf(extName + ".ext") === 0) {
                    extFiles.push(files[i]);
                }
            }
        }
        deferred.resolve(extFiles);
    });
    return deferred.promise();
}

router.delete("/extension/remove", function(req, res) {
    var extName = req.body.name;
    xcConsole.log("Removing extension: " + extName);

    getExtensionFiles(extName, "enabled")
    .then(function(files) {
        if (files.length > 0) {
            return jQuery.Deferred().reject("Must disable extension first");
        } else {
            return getExtensionFiles(extName, "available");
        }
    })
    .then(function(files) {
        var deferred = jQuery.Deferred();
        if (files.length === 0) {
            return deferred.reject("Extension does not exist");
        }
        // Remove all the files (symlinks are removed during disable)
        var str = "";
        for (var i = 0; i < files.length; i++) {
            str += "rm " + basePath + "ext-available/" + files[i] + ";";
        }
        var out = exec(str);
        out.on("close", function(code) {
            if (code) {
                deferred.reject(code);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    })
    .then(function() {
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        xcConsole.log("remove extension failed with error: " + err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

function enableExtension(extName) {
    var deferred = jQuery.Deferred();
    var filesToEnable = [];
    // List files in ext-available
    getExtensionFiles(extName, "available")
    .then(function(files) {
        filesToEnable = files;
        if (filesToEnable.length === 0) {
            return jQuery.Deferred().reject("No such extension found in " +
                "ext-available.");
        }
        return getExtensionFiles(extName, "enabled");
    })
    .then(function(files) {
        var filesRemaining = [];
        var i;
        // Check whether the extension is already enabled
        for (i = 0; i < filesToEnable.length; i++) {
            if (files.indexOf(filesToEnable[i]) === -1) {
                filesRemaining.push(filesToEnable[i]);
            }
        }
        if (filesRemaining.length === 0) {
            deferred.reject("Extension already enabled");
            return;
        }
        // Create symlinks in the ext-enabled folder
        var str = "";
        for (i = 0; i < filesRemaining.length; i++) {
            str += "ln -s " + "../ext-available/" + filesRemaining[i] +
            " " + basePath + "ext-enabled/" + filesRemaining[i] + ";";
        }
        // xcConsole.log(str);
        var out = exec(str);
        out.on('close', function(code) {
            if (code) {
                deferred.reject(code);
            } else {
                deferred.resolve();
            }
        });
    })
    .fail(deferred.reject);

    return deferred.promise();
}

router.post("/extension/enable", function(req, res) {
    var extName = req.body.name;
    xcConsole.log("Enabling extension: " + extName);

    enableExtension(extName)
    .then(function() {
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        xcConsole.log("Error: " + err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

router.post("/extension/disable", function(req, res) {
    var extName = req.body.name;
    xcConsole.log("Disabling extension: " + extName);

    getExtensionFiles(extName, "enabled")
    .then(function(files) {
        xcConsole.log(files);
        var deferred = jQuery.Deferred();
        var toRemove = [];
        var i;
        for (i = 0; i < files.length; i++) {
            if (files[i].indexOf(extName + ".ext") === 0) {
                toRemove.push(files[i]);
            }
        }
        if (toRemove.length === 0) {
            return deferred.reject("Extension was not enabled");
        }
        var str = "";
        for (i = 0; i < toRemove.length; i++) {
            str += "rm " + basePath + "ext-enabled/" + toRemove[i] + ";";
        }
        var out = exec(str);
        out.on('close', function(code) {
            if (code) {
                deferred.reject(code);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    })
    .then(function() {
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

router.get("/extension/getAvailable", function(req, res) {
    xcConsole.log("Getting available extensions");
    getExtensionFiles("", "available")
    .then(function(files) {
        var fileObj = {};
        for (var i = 0; i < files.length; i++) {
            if (files[i].indexOf(".ext.js") === -1 &&
                files[i].indexOf(".ext.py") === -1) {
                continue;
            }
            fileObj[files[i].substr(0, files[i].length - 7)] = true;
        }
        res.jsonp({
            status: Status.Ok,
            extensionsAvailable: Object.keys(fileObj)
        });
    })
    .fail(function(err) {
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

router.get("/extension/getEnabled", function(req, res) {
    xcConsole.log("Getting installed extensions");
    fs.readdir(basePath + "ext-enabled/", function(err, allNames) {
        if (err) {
            res.jsonp({
                status: Status.Error,
                log: JSON.stringify(err)
            });
            return;
        }
        var htmlString = '<html>\n' +
        '<head>\n';
        allNames.forEach(function(name) {
            if (name.indexOf(".ext.js") === name.length - ".ext.js".length) {
                htmlString += '    <script src="assets/extensions/ext-enabled/'+
                name + '" type="text/javascript"></script>\n';
            }
        });
        htmlString += '  </head>\n' +
        '  <body>\n' +
        '  </body>\n' +
        '</html>';
        res.jsonp({
            status: Status.Ok,
            data: htmlString
        });
    });
});
router.get("/extension/listPackage", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            logs: "s3 package not setup correctly!"
        });
    }
    var fetchAllApps = function() {
        var deferredOnFetch = jQuery.Deferred();

        var processItem = function(res, fileName) {
            var deferredOnProcessItem = jQuery.Deferred();
            var get = function(file) {
                var deferredOnGetFile = jQuery.Deferred();
                var params = {
                    Bucket: 'marketplace.xcalar.com', /* required */
                    Key: file
                };
                s3.getObject(params, function(err, data) {
                    if (err) {
                        deferredOnGetFile.reject(err);
                    }
                    else {
                        deferredOnGetFile.resolve(data.Body.toString('utf8'));
                    }
                });
                return deferredOnGetFile.promise();
            };
            if (fileName.endsWith(".txt")) {
                get(fileName)
                .then(function(data) {
                    res.push(JSON.parse(data));
                    deferredOnProcessItem.resolve();
                })
                .fail(function(err) {
                    deferredOnProcessItem.reject(err);
                });
            } else {
                deferredOnProcessItem.resolve();
            }
            return deferredOnProcessItem.promise();
        };

        var params = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Prefix: 'extensions/'
        };
        var processItemsDeferred = [];
        s3.listObjects(params, function(err, data) {
            if (err) {
                xcConsole.log(err); // an error occurred
                deferredOnFetch.reject(err);
            }
            else {
                var res = [];
                var items = data.Contents;
                items.forEach(function(item) {
                    fileName = item.Key;
                    processItemsDeferred.push(processItem(res, fileName));
                });
                jQuery.when.apply(jQuery, processItemsDeferred)
                .then(function() {
                    deferredOnFetch.resolve(res);
                })
                .fail(function(err) {
                    deferredOnFetch.reject(err);
                });
            }
        });
        return deferredOnFetch.promise();
    };
    fetchAllApps()
    .then(function(data) {
        return res.send(data);
    })
    .fail(function() {
        return res.send({"status": Status.Error, "logs": error});
    });
});
// End of marketplace calls

// Export router
module.exports = router;