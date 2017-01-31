var express = require("express");
var fs = require("fs");
var bodyParser = require("body-parser");
var url = require("url");

var app = express();
var appDir = "./apps"
var extensionDir = "./extensions"
var udfDir = "./udfs"

var Status = {
    "Error": -1,
    "Unknown": 0,
    "Ok": 1,
    "Done"   : 2,
    "Running": 3,
    "Incomplete": 4
};

// var host = "https://authentication.xcalar.net/marketplace/"
var host = "http://euler:3001/"
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

var __validate = function(name, version) {
    if (name == null || name.length == 0) {
        return false;
    }
    if (version == null || version.length == 0) {
        return false;
    }
    return true;
}

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
app.post("/uploadContent", function(req, res) {
    var filePath1 = req.body.filePath1;
    var savedAsName1 = req.body.savedAsName1;
    var filePath2 = req.body.filePath2;
    var savedAsName2 = req.body.savedAsName2;
    var filePath3 = req.body.filePath3;
    var savedAsName3 = req.body.savedAsName3;
    var name = req.body.name;
    var version = req.body.version;
    if (!__validate(name, version)) {
        return res.send({"status": Status.Error, "logs": "Validation fails: wrong input"});
    }
    if (filePath1.length != 0 && savedAsName1.length != 0) {
        fs.readFile(filePath1, "utf8", function(err, data) {
            if (err) {
                return res.send({"status": Status.Error, "logs": err});
            }
            var dataToSent = {
                "appName": name,
                "savedAsName": savedAsName1,
                "version": version,
                "content": data
            }
            console.log("Start uploading the first file");
            jQuery.ajax({
                method     : "POST",
                url        : host+"uploadContent",
                data       : dataToSent,
                error: function(error) {
                    return res.send({"status": Status.Error, "logs": error});
                },
                success: function(result) {
                    if (filePath2.length != 0 && savedAsName2.length != 0) {
                        fs.readFile(filePath2, "utf8", function(err, data) {
                          if (err) {
                              return res.send({"status": Status.Error, "logs": err});
                          }
                          var dataToSent = {
                              "appName": name,
                              "savedAsName": savedAsName2,
                              "version": version,
                              "content": data
                          }
                          console.log("Start uploading the second file");
                          jQuery.ajax({
                              method     : "POST",
                              url        : host+"uploadContent",
                              data       : dataToSent,
                              error: function(error) {
                                  return res.send({"status": Status.Error, "logs": error});
                              },
                              success: function(result) {
                                  if (filePath3.length != 0 && savedAsName3.length != 0) {
                                      fs.readFile(filePath3, "utf8", function(err, data) {
                                          if (err) {
                                              return res.send({"status": Status.Error, "logs": err});
                                          }
                                          var dataToSent = {
                                              "appName": name,
                                              "savedAsName": savedAsName3,
                                              "version": version,
                                              "content": data
                                          }
                                          console.log("Start uploading the third file");
                                          jQuery.ajax({
                                              method     : "POST",
                                              url        : host+"uploadContent",
                                              data       : dataToSent,
                                              error: function(error) {
                                                  return res.send({"status": Status.Error, "logs": error});
                                              },
                                              success: function(result) {
                                                  console.log("Start zipping");
                                                  var dataToSent = {
                                                      "appName": name,
                                                      "filePath1": savedAsName1,
                                                      "filePath2": savedAsName2,
                                                      "filePath3": savedAsName3,
                                                      "version": version
                                                  }
                                                  jQuery.ajax({
                                                    method     : "POST",
                                                    url        : host+"zip",
                                                    data       : dataToSent,
                                                    success: function(result) {
                                                      return res.send({"status": Status.Ok, "logs": result});
                                                    },
                                                    error: function(error) {
                                                      return res.send({"status": Status.Error, "logs": error});
                                                    }
                                                  });
                                              }
                                          });
                                      });
                                  } else {
                                      console.log("Start zipping");
                                      var dataToSent = {
                                          "appName": name,
                                          "filePath1": savedAsName1,
                                          "filePath2": savedAsName2,
                                          "filePath3": "",
                                          "version": version
                                      }
                                      jQuery.ajax({
                                          method     : "POST",
                                          url        : host+"zip",
                                          data       : dataToSent,
                                          success: function(result) {
                                              return res.send({"status": Status.Ok, "logs": result});
                                          },
                                          error: function(error) {
                                              return res.send({"status": Status.Error, "logs": error});
                                          }
                                      });
                                  }
                              }
                          });
                        });
                    } else {
                        console.log("Start zipping");
                        var dataToSent = {
                            "appName": name,
                            "filePath1": savedAsName1,
                            "filePath2": "",
                            "filePath3": "",
                            "version": version
                        }
                        jQuery.ajax({
                            method     : "POST",
                            url        : host+"zip",
                            data       : dataToSent,
                            success: function(result) {
                                return res.send({"status": Status.Ok, "logs": result});
                            },
                            error: function(error) {
                                return res.send({"status": Status.Error, "logs": error});
                            }
                        });
                    }
                }
            });
        });
    } else {
        return res.send({"status": "Error", "logs": "Please specify at least one file & save as"});
    }
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
    }
    if (imagePath.length != 0) {
        fs.readFile(imagePath, function(err, data) {
            if (err) {
                return res.send({"status": Status.Error, "logs": err});
            }
            image = data.toString("base64");
            dataToSent["image"] = image
            jQuery.ajax({
                method     : "POST",
                url        : host+"uploadMeta",
                data       : dataToSent,
                success: function(result) {
                    return res.send({"status": Status.Ok, "logs": result});
                },
                error: function(error) {
                    return res.send({"status": Status.Error, "logs": error});
                }
            });
        });
    } else {
        jQuery.ajax({
            method     : "POST",
            url        : host+"uploadMeta",
            data       : dataToSent,
            success: function(result) {
                return res.send({"status": Status.Ok, "logs": result});
            },
            error: function(error) {
                return res.send({"status": Status.Error, "logs": error});
            }
        });
    }
});