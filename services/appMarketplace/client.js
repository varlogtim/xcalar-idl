var express = require("express");
var fs = require("fs");
var bodyParser = require("body-parser");
var url = require("url");

var app = express();
var appDir = "./apps";
var extensionDir = "./extensions";
var udfDir = "./udfs";

var Status = {
    "Error": -1,
    "Unknown": 0,
    "Ok": 1,
    "Done"   : 2,
    "Running": 3,
    "Incomplete": 4
};

var host = "https://authentication.xcalar.net/marketplace/";
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});
app.listen(3000, function() {
    console.log("Working on port 3000");
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

require("jsdom").env("", function(err, window) {
    if (err) {
        return res.send({"status": Status["Error"], "logs": err});
    }
    jQuery = require("jquery")(window);
});

var __validate = function(content) {
    var name = content.name;
    var version = content.version;
    var savedAsName1 = content.savedAsName1;
    var savedAsName2 = content.savedAsName2;
    var namePattern = /[a-z]+/;
    var versionPattern = /[0-9]+\.[0-9]+\.[0-9]+/;

    if (name === null || name.length === 0) {
        return false;
    }
    if (version === null || version.length === 0) {
        return false;
    }
    if (!namePattern.exec(name)) {
        return false;
    }
    if (!versionPattern.exec(version)) {
        return false;
    }
    if (((savedAsName1 === name + ".ext.py")
        && (savedAsName2 === name + ".ext.js"))
        || ((savedAsName1 === name + ".ext.js")
        && (savedAsName2 === name + ".ext.py"))) {
        return true;
    }
    return false;
};

app.all("/*", function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

/*
Right /uploadContent is implemented in a really clumsy way.
Will fix in the next version.
*/

function sendRequest(action, url, data) {
    var deferred = jQuery.Deferred();
    jQuery.ajax({
        "method": action,
        "url": url,
        "data": data,
        success: function(data) {
            deferred.resolve();
        },
        error: function(err) {
            console.log("Error: " + err);
            deferred.reject();
        }
    });
    return deferred.promise();
}

function readFile(filePath) {
    var deferred = jQuery.Deferred();
    fs.readFile(filePath, "utf8", function(err, data) {
        if (err) {
            deferred.reject(err);
            return;
        }
        deferred.resolve(data);
    });
    return deferred.promise();
}

app.post("/uploadContent", function(req, res) {
    var filePath1 = req.body.filePath1;
    var savedAsName1 = req.body.savedAsName1;
    var filePath2 = req.body.filePath2;
    var savedAsName2 = req.body.savedAsName2;
    var name = req.body.name;
    var version = req.body.version;
    var content = req.body;

    if (!__validate(content)) {
        res.send({"status": Status.Error,
            "logs": "Validation fails: wrong input"});
        return;
    }

    if (filePath1.length === 0 || savedAsName1.length === 0) {
        res.send({"status": "Error", "logs":
            "Please specify at least one file & save as"});
        return;
    }

    var deferredOut = jQuery.Deferred();
    readFile(filePath1)
    .then(function(data) {
        var dataToSent = {
            "appName": name,
            "savedAsName": savedAsName1,
            "version": version,
            "content": data
        };
        return sendRequest("POST", host + "uploadContent", dataToSent);
    })
    .then(function() {
        return readFile(filePath2);
    })
    .then(function(data) {
        console.log("Finish uploading the first file");
        var dataToSent = {
            "appName": name,
            "savedAsName": savedAsName2,
            "version": version,
            "content": data
        };
        return sendRequest("POST", host + "uploadContent", dataToSent);
    })
    .then(function() {
        console.log("Finish uploading the second file");
        console.log("Start gzipping");
        var dataToSent = {
            "appName": name,
            "filePath1": savedAsName1,
            "filePath2": savedAsName2,
            "version": version
        };
        return sendRequest("POST", host + "gzip", dataToSent);
    })
    .then(function(result) {
        console.log("Finish gzipping");
        res.send({"status": Status.Ok, "logs": result});
        deferredOut.resolve();
    })
    .fail(function(error) {
        res.send({"status": Status.Error, "logs": error});
        deferredOut.reject();
    });
    return deferredOut.promise();
});

app.post("/uploadMeta", function(req, res) {
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
    };
    var deferredOut = jQuery.Deferred();
    function readImage() {
        if (imagePath.length !== 0) {
            return readFile(imagePath);
        } else {
            return jQuery.Deferred().resolve().promise();
        }
    }
    readImage()
    .then(function(data) {
        if (data) {
            dataToSent["image"] = data.toString("base64");
        }
        return sendRequest("POST", host+"uploadMeta", dataToSent);
    })
    .then(function(result) {
        console.log("Finish gzipping");
        res.send({"status": Status.Ok, "logs": result});
        deferredOut.resolve();
    })
    .fail(function(error) {
        res.send({"status": Status.Error, "logs": error});
        deferredOut.reject();
    });
    return deferredOut.promise();
});
