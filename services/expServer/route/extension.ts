import { Router } from "express";
export const router = Router();
import * as xcConsole from "../utils/expServerXcConsole";
import * as path from "path";
import * as fs from "fs";
import support from "../utils/expServerSupport";
import upload from "../controllers/upload";
import extensionManager from "../controllers/extensionManager";
import socket from "../controllers/socket";
import { Status } from "../utils/supportStatusFile";

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

router.post("/extension/upload",
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Writing Extension");
    let targz = req.body.targz;
    let name = path.basename(req.body.name);
    let defaultVersion = "0.0.1";
    extensionManager.writeTarGzWithCleanup(targz, name, defaultVersion)
    .then(function() {
        xcConsole.log("Install extension finished. Enabling it...");
        return extensionManager.enableExtension(name);
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

router.post("/extension/download",
            [support.checkAuthAdmin], function(req, res) {
    if (!extensionManager.s3Initialize()) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    xcConsole.log("Download Extension");
    let pkg = req.body;
    xcConsole.log(pkg);
    extensionManager.downloadExtension(pkg.name, pkg.version)
    .then(function(ret) {
        return extensionManager.writeTarGzWithCleanup(ret.data, pkg.name, pkg.version);
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

router.delete("/extension/remove",
              [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Removing Extension");
    let extName = req.body.name;
    xcConsole.log("Removing extension: " + extName);
    extensionManager.removeExtension(extName)
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

router.post("/extension/enable",
            [support.checkAuthAdmin], function(req, res) {
    let extName = req.body.name;
    xcConsole.log("Enabling extension: " + extName);
    extensionManager.enableExtension(extName)
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

router.post("/extension/disable",
            [support.checkAuthAdmin], function(req, res) {
    let extName = req.body.name;
    xcConsole.log("Disabling extension: " + extName);
    extensionManager.disableExtension(extName)
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

router.get("/extension/getAvailable",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Getting available extensions");
    extensionManager.getExtensionFiles("", "available")
    .then(function(files) {
        let fileObj = {};
        for (let i = 0; i < files.length; i++) {
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

router.get("/extension/getEnabled",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Getting installed extensions");
    fs.readdir(extensionManager.basePath + "ext-enabled/", function(err, allNames) {
        if (err) {
            xcConsole.error("Getting installed extensions", err);
            res.jsonp({
                status: Status.Error,
                error: JSON.stringify(err)
            });
            return;
        }
        let htmlString = '<html>\n' +
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

router.get("/extension/listPackage",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Listing Extensions");
    if (!extensionManager.s3Initialize()) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    extensionManager.fetchAllExtensions()
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

router.get('/extension/activeUsers',
        [support.checkAuth], function(req, res) {
    let activeUserInfos = {};
    let msg;
    let activeUserList = {};
    try {
        activeUserInfos = socket.getUserInfos();
        msg = Status.Ok;
        if ("no registered users" in activeUserInfos) {
            activeUserList = ["no registered users"];
            msg = Status.Error;
        }
        activeUserList = Object.keys(activeUserInfos);
    } catch (error) {
        activeUserList = ["activeUserList not found", error];
        msg = Status.Error;
    };

    res.jsonp({status: msg,
               data: activeUserList});
});