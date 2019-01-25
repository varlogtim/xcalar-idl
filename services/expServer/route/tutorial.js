var express = require('express');
var router = express.Router();
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var Status = require('../supportStatusFile').Status;
var support = require('../expServerSupport.js');

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

function downloadTutorial(tutName, version) {
    var deferred = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Key: 'tutorials/' + tutName + "/" + version + "/" + tutName +
             '-' + version + '.xlrwb.tar.gz'
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            var error = "Download tutorial failed with error: " + err;
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

function processItem(ret, fileName) {
    var deferredOnProcessItem = jQuery.Deferred();
    var getTutorial = function(file) {
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
        getTutorial(fileName)
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

function fetchAllTutorials() {
    var deferredOnFetch = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Prefix: 'tutorials/'
    };
    var processItemsDeferred = [];
    s3.listObjects(params, function(err, data) {
        if (err) {
            xcConsole.error('fetch tutorials', err); // an error occurred
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
                xcConsole.error('fetch tutorials', JSON.stringify(arguments));
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


router.post("/tutorial/download",
            [support.checkAuthAdmin], function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    xcConsole.log("Download Tutorial");
    var pkg = req.body;
    downloadTutorial(pkg.name, pkg.version)
    .then(function(ret) {
        res.jsonp({status: Status.Ok, data: ret.data});
    })
    .fail(function(err) {
        xcConsole.error("download extension failed", err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

router.get("/tutorial/listPackage",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Listing Tutorials");
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    fetchAllTutorials()
    .then(function(data) {
        return res.send(data);
    })
    .fail(function(error) {
        return res.send({"status": Status.Error, "error": error});
    });
});
// Below part is only for Unit Test
function fakeProcessItem(func) {
    processItem = func;
}
function fakeDownloadTutorial(func) {
    downloadTutorial = func;
}
function fakeFetchAllTutorials(func) {
    fetchAllTutorials = func;
}
function fakeGetObject(func) {
    s3.getObject = func;
}

if (process.env.NODE_ENV === "test") {
    exports.downloadTutorial = downloadTutorial;
    exports.processItem = processItem;
    exports.fetchAllTutorials = fetchAllTutorials;
    exports.getObject = s3.getObject;
    // Replace functions
    exports.fakeDownloadTutorial = fakeDownloadTutorial;
    exports.fakeProcessItem = fakeProcessItem;
    exports.fakeFetchAllTutorials = fakeFetchAllTutorials;
    exports.fakeGetObject = fakeGetObject;
}

// Export router
exports.router = router;
