var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');
var exec = require('child_process').exec;
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// app.get('/*', function(req, res) {
//     res.send('Please use post instead');
// });

function parseData(data) {
    console.log("start");
    console.log(data);
    console.log("end");
}

app.get("/stop/:vmname", function(req, res) {
    if (!req.params.vmname.startsWith("preview-")) {
        res.send("Cannot shut down non preview vm " + req.params.vmname);
    } else {
        var out = exec("gce-control.sh stop " + req.params.vmname + " 2>&1");
        var logs = "";
        out.stdout.on("data", function(d) {
            logs += d;
        });
        out.on("close", function(code) {
            res.send({"exitCode": code,
                      "output": logs});
        });
    }
});

app.get("/start/:vmname", function(req, res) {
    if (!req.params.vmname.startsWith("preview-")) {
        res.send("Cannot start up non preview vm " + req.params.vmname);
    } else {
        var out = exec("gce-control.sh start " + req.params.vmname + " 2>&1");
        var logs = "";
        out.stdout.on("data", function(d) {
            logs += d;
        });
        out.on("close", function(code) {
            res.send({"exitCode": code,
                      "output": logs});
        });
    }
});

var httpServer = http.createServer(app);
var port = 12126;
httpServer.listen(port, function() {
    console.log("All ready");
});
