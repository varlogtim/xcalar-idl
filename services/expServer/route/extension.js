var express = require('express');
var router = express.Router();
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var httpStatus = require('../../../assets/js/httpStatus.js').httpStatus;
var fs = require("fs");
var exec = require("child_process").exec;
var guiDir = (process.env.XCE_HTTP_ROOT ?
    process.env.XCE_HTTP_ROOT : "/var/www") + "/xcalar-gui";
var basePath = guiDir + "/assets/extensions/";
var upload = require('../upload.js');

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

function writeTarGz(targz, name, version) {
    var deferred = jQuery.Deferred();
    var zipFile = new Buffer(targz, 'base64');
    var zipPath = basePath + "ext-available/" + name + "-" + version +
    ".tar.gz";
    xcConsole.log("Adding extension to " + zipPath);
    fs.writeFile(zipPath, zipFile, function(error) {
        if (error) {
            deferred.reject(error);
        }
        xcConsole.log("untar", zipPath);
        var out = exec("tar -zxf " + zipPath + " -C " + basePath +
                       "ext-available/");
        out.on('close', function(code) {
            // Code is either 0, which means success, or 1, which means error.
            if (code) {
                deferred.reject("Unable to untar");
            } else {
                xcConsole.log("Success: Untar finishes");
                deferred.resolve("writeTarGz succeeds");
            }
        });
    });
    return deferred.promise();
}
function writeTarGzWithCleanup(targz, name, version) {
    var deferred = jQuery.Deferred();
    writeTarGz(targz, name, version)
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
            deferred.resolve("writeTarGzWithCleanup succeeds");
        });
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function downloadExtension(extName, version) {
    var deferred = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Key: 'extensions/' + extName + "/" + version + "/" + extName +
             '-' + version + '.tar.gz'
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            var ret = {
                status: httpStatus.OK,
                data: data.Body.toString('base64')
            };
            deferred.resolve(ret);
        }
    });
    return deferred.promise();
}

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
            // Code is either 0, which means success, or 1, which means error.
            if (code) {
                deferred.reject("Creating link fails");
            } else {
                deferred.resolve("enableExtension succeeds");
            }
        });
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function disableExtension(extName) {
    var deferred = jQuery.Deferred();
    getExtensionFiles(extName, "enabled")
    .then(function(files) {
        xcConsole.log(files);
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
                deferred.resolve("disableExtension succeeds");
            }
        });
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function removeExtension(extName) {
    var deferred = jQuery.Deferred();
    getExtensionFiles(extName, "enabled")
    .then(function(files) {
        if (files.length > 0) {
            return jQuery.Deferred().reject("Must disable extension first");
        } else {
            return getExtensionFiles(extName, "available");
        }
    })
    .then(function(files) {
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
                deferred.resolve("removeExtension succeeds");
            }
        });
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function processItem(ret, fileName) {
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
            } else {
                deferredOnGetFile.resolve(data.Body.toString('utf8'));
            }
        });
        return deferredOnGetFile.promise();
    };
    if (fileName.endsWith(".txt")) {
        get(fileName)
        .then(function(data) {
            ret.push(JSON.parse(data));
            deferredOnProcessItem.resolve("processItem succeeds");
        })
        .fail(function(err) {
            deferredOnProcessItem.reject(err);
        });
    } else {
        deferredOnProcessItem.resolve("processItem succeeds");
    }
    return deferredOnProcessItem.promise();
}

function fetchAllExtensions() {
    var deferredOnFetch = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Prefix: 'extensions/'
    };
    var processItemsDeferred = [];
    s3.listObjects(params, function(err, data) {
        if (err) {
            xcConsole.log(err); // an error occurred
            deferredOnFetch.reject(err);
        } else {
            var ret = [];
            var items = data.Contents;
            items.forEach(function(item) {
                fileName = item.Key;
                processItemsDeferred.push(processItem(ret, fileName));
            });
            jQuery.when.apply(jQuery, processItemsDeferred)
            .then(function() {
                deferredOnFetch.resolve(ret);
            })
            .fail(function(err) {
                deferredOnFetch.reject(err);
            });
        }
    });
    return deferredOnFetch.promise();
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
    var targz = req.body.targz;
    var name = req.body.name;
    var defaultVersion = "0.0.1";
    writeTarGzWithCleanup(targz, name, defaultVersion)
    .then(function() {
        xcConsole.log("Intall extension finishes, enabling it");
        return enableExtension(name);
    })
    .then(function() {
        xcConsole.log("Enable installed extension finishes");
        res.jsonp({status: httpStatus.OK});
    })
    .fail(function(err) {
        xcConsole.log("Error: " + err);
        res.jsonp({
            status: httpStatus.InternalServerError,
            error: err
        });
    });
});

router.post("/extension/download", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: httpStatus.InternalServerError,
            error: "s3 package not setup correctly!"
        });
    }
    xcConsole.log("Download Package");
    var pkg = req.body;
    xcConsole.log(pkg);
    downloadExtension(pkg.name, pkg.version)
    .then(function(ret) {
        writeTarGzWithCleanup(ret, pkg.name, pkg.version);
    })
    .then(function() {
        res.jsonp({status: httpStatus.OK});
    })
    .fail(function() {
        xcConsole.log("Failure: " + arguments);
        res.jsonp({
            status: httpStatus.InternalServerError,
            error: JSON.stringify(arguments)
        });
    });
});

router.delete("/extension/remove", function(req, res) {
    var extName = req.body.name;
    xcConsole.log("Removing extension: " + extName);
    removeExtension(extName)
    .then(function() {
        res.jsonp({status: httpStatus.OK});
    })
    .fail(function(err) {
        xcConsole.log("remove extension failed with error: " + err);
        res.jsonp({
            status: httpStatus.InternalServerError,
            error: err
        });
    });
});

router.post("/extension/enable", function(req, res) {
    var extName = req.body.name;
    xcConsole.log("Enabling extension: " + extName);
    enableExtension(extName)
    .then(function() {
        res.jsonp({status: httpStatus.OK});
    })
    .fail(function(err) {
        xcConsole.log("Error: " + err);
        res.jsonp({
            status: httpStatus.InternalServerError,
            error: err
        });
    });
});

router.post("/extension/disable", function(req, res) {
    var extName = req.body.name;
    xcConsole.log("Disabling extension: " + extName);
    disableExtension(extName)
    .then(function() {
        res.jsonp({status: httpStatus.OK});
    })
    .fail(function(err) {
        xcConsole.log("Error: " + err);
        res.jsonp({
            status: httpStatus.InternalServerError,
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
            status: httpStatus.OK,
            extensionsAvailable: Object.keys(fileObj)
        });
    })
    .fail(function(err) {
        res.jsonp({
            status: httpStatus.InternalServerError,
            error: err
        });
    });
});

router.get("/extension/getEnabled", function(req, res) {
    xcConsole.log("Getting installed extensions");
    fs.readdir(basePath + "ext-enabled/", function(err, allNames) {
        if (err) {
            res.jsonp({
                status: httpStatus.InternalServerError,
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
            status: httpStatus.OK,
            data: htmlString
        });
    });
});

router.get("/extension/listPackage", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: httpStatus.InternalServerError,
            error: "s3 package not setup correctly!"
        });
    }
    fetchAllExtensions()
    .then(function(data) {
        return res.send(data);
    })
    .fail(function() {
        return res.send({"status": httpStatus.InternalServerError, "error": error});
    });
});
/*
Right /extension/publish (originally as /uploadContent) is implemented in a really clumsy way.
Will fix in the next version.
*/
router.post("/extension/publish", function(req, res) {
    xcConsole.log("Uploading content");
    upload.uploadContent(req, res);
});
// End of marketplace calls

// Below part is only for Unit Test
function fakeWriteTarGz() {
    writeTarGz = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakeWriteTarGzWithCleanup() {
    writeTarGzWithCleanup = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakeProcessItem() {
    processItem = function() {
        return jQuery.Deferred().reject("processItem fails").promise();
    };
}
function fakeDownloadExtension() {
    downloadExtension = function() {
        return jQuery.Deferred().resolve([]).promise();
    };
}
function fakeRemoveExtension() {
    removeExtension = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakeEnableExtension() {
    enableExtension = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakeDisableExtension() {
    disableExtension = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakeGetExtensionFiles() {
    getExtensionFiles = function() {
        return jQuery.Deferred().resolve([]).promise();
    };
}
function fakeFetchAllExtensions() {
    fetchAllExtensions = function() {
        return jQuery.Deferred().resolve({"status": httpStatus.OK}).promise();
    };
}
function fakeUploadContent() {
    upload.uploadContent = function(req, res) {
        res.send({"status": httpStatus.OK});
    };
}
if (process.env.NODE_ENV === "test") {
    exports.writeTarGz = writeTarGz;
    exports.writeTarGzWithCleanup = writeTarGzWithCleanup;
    exports.downloadExtension = downloadExtension;
    exports.getExtensionFiles = getExtensionFiles;
    exports.enableExtension = enableExtension;
    exports.disableExtension = disableExtension;
    exports.removeExtension = removeExtension;
    exports.processItem = processItem;
    exports.fetchAllExtensions = fetchAllExtensions;
    // Replace functions
    exports.fakeWriteTarGz = fakeWriteTarGz;
    exports.fakeWriteTarGzWithCleanup = fakeWriteTarGzWithCleanup;
    exports.fakeDownloadExtension = fakeDownloadExtension;
    exports.fakeRemoveExtension = fakeRemoveExtension;
    exports.fakeEnableExtension = fakeEnableExtension;
    exports.fakeDisableExtension = fakeDisableExtension;
    exports.fakeProcessItem = fakeProcessItem;
    exports.fakeGetExtensionFiles = fakeGetExtensionFiles;
    exports.fakeFetchAllExtensions = fakeFetchAllExtensions;
    exports.fakeUploadContent = fakeUploadContent;
}
// Export router
exports.router = router;