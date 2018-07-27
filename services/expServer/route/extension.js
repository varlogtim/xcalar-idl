var express = require('express');
var router = express.Router();
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var Status = require('../supportStatusFile').Status;
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
    xcConsole.error("Failure: set up AWS! " + error);
}

function writeTarGz(targz, name, version) {
    var deferred = jQuery.Deferred();
    var zipFile = new Buffer(targz, 'base64');
    var zipPath = basePath + "ext-available/" + name + "-" + version +
    ".tar.gz";
    xcConsole.log("Adding extension to " + zipPath);
    fs.writeFile(zipPath, zipFile, function(error) {
        if (error) {
            deferred.reject("Adding Extension failed with error: " + error);
        }
        xcConsole.log("untar", zipPath);
        var out = exec("tar -zxf " + zipPath + " -C " + basePath +
                       "ext-available/");
        out.on('close', function(code) {
            // Code is either 0, which means success, or 1, which means error.
            if (code) {
                xcConsole.log("Failure: Untar failed");
                deferred.reject("Adding Extension failed with error: Unable to untar the extension");
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
                xcConsole.error("Failure: Failed to delete .tar.gz with err: "
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
            var error = "Download extension failed with error: " + err;
            xcConsole.error(error);
            deferred.reject(error);
        } else {
            var ret = {
                status: Status.Ok,
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
            var error = "Getting extension files failed with error: " + err;
            xcConsole.error(error);
            deferred.reject(error);
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
            xcConsole.log('extension', extName, 'is not available');
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
            var error = "Extension " + extName + " already enabled";
            xcConsole.error(error);
            deferred.reject(error);
            return;
        }
        // Create symlinks in the ext-enabled folder
        var str = "";
        for (i = 0; i < filesRemaining.length; i++) {
            str += "ln -s " + "../ext-available/" + filesRemaining[i] +
                   " " + basePath + "ext-enabled/" + filesRemaining[i] + ";";
        }
        var out = exec(str);
        out.on('close', function(code) {
            // Code is either 0, which means success, or 1, which means error.
            if (code) {
                var error = "Enable extension " + extName +
                " failed when creating link";
                xcConsole.error(error);
                deferred.reject(error);
            } else {
                xcConsole.log('enable Extension succeeds');
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
        var toRemove = [];
        var i;
        for (i = 0; i < files.length; i++) {
            if (files[i].indexOf(extName + ".ext") === 0) {
                toRemove.push(files[i]);
            }
        }
        if (toRemove.length === 0) {
            var error = "Extension " + extName +  " was not enabled";
            xcConsole.error(error);
            return deferred.reject(error);
        }
        xcConsole.log('disable', toRemove);
        var str = "";
        for (i = 0; i < toRemove.length; i++) {
            str += "rm " + basePath + "ext-enabled/" + toRemove[i] + ";";
        }
        var out = exec(str);
        out.on('close', function(code) {
            if (code) {
                var error = 'Disable extension ' + extName +
                ' failed with code: ' + code;
                xcConsole.error(error);
                deferred.reject(error);
            } else {
                xcConsole.log('disable extension', extName, 'succeed');
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
            var error = "Extension " + extName + " must be disabled first";
            xcConsole.error(error);
            return jQuery.Deferred().reject(error);
        } else {
            return getExtensionFiles(extName, "available");
        }
    })
    .then(function(files) {
        if (files.length === 0) {
            var error = "Extension " + extName + " does not exist";
            xcConsole.error(error);
            return deferred.reject(error);
        }
        // Remove all the files (symlinks are removed during disable)
        var str = "";
        for (var i = 0; i < files.length; i++) {
            str += "rm " + basePath + "ext-available/" + files[i] + ";";
        }
        var out = exec(str);
        out.on("close", function(code) {
            if (code) {
                var error = "Remove extension " + extName +
                " failed with error code: " + code;
                xcConsole.error(error);
                deferred.reject(error);
            } else {
                xcConsole.log('remove extension', extName, 'succeeds');
                deferred.resolve("removeExtension succeeds");
            }
        });
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function processItem(ret, fileName) {
    var deferredOnProcessItem = jQuery.Deferred();
    var getExtension = function(file) {
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
        getExtension(fileName)
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
            xcConsole.error('fetch extensions', err); // an error occurred
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
                xcConsole.error('fetch extensions', JSON.stringify(arguments));
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
    xcConsole.log("Writing Extension");
    var targz = req.body.targz;
    var name = req.body.name;
    var defaultVersion = "0.0.1";
    writeTarGzWithCleanup(targz, name, defaultVersion)
    .then(function() {
        xcConsole.log("Install extension finished. Enabling it...");
        return enableExtension(name);
    })
    .then(function() {
        xcConsole.log("Enable installed extension finished");
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        xcConsole.error("Upload extension failed", err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

router.post("/extension/download", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    xcConsole.log("Download Extension");
    var pkg = req.body;
    xcConsole.log(pkg);
    downloadExtension(pkg.name, pkg.version)
    .then(function(ret) {
        return writeTarGzWithCleanup(ret.data, pkg.name, pkg.version);
    })
    .then(function() {
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        xcConsole.error("download extension failed", err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

router.delete("/extension/remove", function(req, res) {
    xcConsole.log("Removing Extension");
    var extName = req.body.name;
    xcConsole.log("Removing extension: " + extName);
    removeExtension(extName)
    .then(function() {
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        xcConsole.error("remove extension failed", err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

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
    disableExtension(extName)
    .then(function() {
        res.jsonp({status: Status.Ok});
    })
    .fail(function(err) {
        xcConsole.error("disable extenion failed", err);
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
            xcConsole.error("Getting installed extensions", err);
            res.jsonp({
                status: Status.Error,
                error: JSON.stringify(err)
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
    xcConsole.log("Listing Extensions");
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    fetchAllExtensions()
    .then(function(data) {
        return res.send(data);
    })
    .fail(function(error) {
        return res.send({"status": Status.Error, "error": error});
    });
});
/*
Right /extension/publish (originally as /uploadContent) is implemented in a really clumsy way.
Will fix in the next version.
*/
router.post("/extension/publish", function(req, res) {
    xcConsole.log("Publish Extension");
    upload.uploadContent(req, res)
    .then(function(data) {
        res.send({"status": Status.Ok, "data": data});
    })
    .fail(function(error) {
        res.send({"status": Status.Error, "error": error});
    });
});
// End of marketplace calls

// Below part is only for Unit Test
function fakeWriteTarGz(func) {
    writeTarGz = func;
}
function fakeWriteTarGzWithCleanup(func) {
    writeTarGzWithCleanup = func;
}
function fakeProcessItem(func) {
    processItem = func;
}
function fakeDownloadExtension(func) {
    downloadExtension = func;
}
function fakeRemoveExtension(func) {
    removeExtension = func;
}
function fakeEnableExtension(func) {
    enableExtension = func;
}
function fakeDisableExtension(func) {
    disableExtension = func;
}
function fakeGetExtensionFiles(func) {
    getExtensionFiles = func;
}
function fakeFetchAllExtensions(func) {
    fetchAllExtensions = func;
}
function fakeGetObject(func) {
    s3.getObject = func;
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
    exports.getObject = s3.getObject;
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
    exports.fakeGetObject = fakeGetObject;
}
// Export router
exports.router = router;