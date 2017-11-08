require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);

    var express = require('express');
    var bodyParser = require("body-parser");
    var fs = require("fs");
    var path = require("path");
    var http = require("http");
    require("shelljs/global");
    var exec = require("child_process").exec;
    var app = express();

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Headers", "Content-Type");
        res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
        next();
    });

    var hostname = "http://bellman.int.xcalar.com:27000";

    // "/sql/schemaupdate/:sesId"
    app.put("/sql/schemaupdate/:sesId", function(req, res) {
        var curlStr = "curl -v " + hostname + "/xcesql/schemaupdate/" +
                      req.params.sesId + " -X PUT -d '" +
             JSON.stringify(req.body) + "' -H 'Content-type: application/json'";
        console.log(curlStr);
        var out = exec(curlStr);
        var o = "";
        out.stdout.on("data", function(data) {
            o += data;
            //console.log(data);
        });
        out.on("close", function() {
            //console.log("closed");
            res.jsonp({status:200,
                       stdout: o});
        });
        out.stderr.on("data", function(data) {
            //console.log("ERROR: " + data);
        });
    });

    app.post("/sql/sqlquery/:sesId/:a/:b", function(req, res) {
        var curlStr = "curl -v " + hostname + "/xcesql/sqlquery/" +
                      req.params.sesId + "/" + req.params.a + "/" +
                      req.params.b + " -X POST -d '" +
                      JSON.stringify(req.body) +
                      "' -H 'Content-type: application/json'";
        console.log(curlStr);
        var out = exec(curlStr);
        var o = "";
        out.stdout.on("data", function(data) {
            o += data;
            //console.log(data);
        });
        out.on("close", function() {
            //console.log("closed");
            res.jsonp({status:200,
                       stdout: o});
        });
        out.stderr.on("data", function(data) {
            //console.log("ERROR: " + data);
        });
    });

    app.all("/*", function(req, res) {
        console.log(req.params);
        res.jsonp({status:200,
                   message: "Hellooo"});
    });

    var httpServer = http.createServer(app);
    var port = 12127;
    httpServer.listen(port, function() {
        console.log("All ready");
    });
});
