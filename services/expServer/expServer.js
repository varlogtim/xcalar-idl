var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require("http");
var https = require("https");
require('shelljs/global');

var privateKey = fs.readFileSync('cantor.int.xcalar.com.key', 'utf8');
var certificate = fs.readFileSync('cantor.int.xcalar.com.crt', 'utf8');
var credentials = {key: privateKey, cert:certificate};

var app = express();
app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Please use post instead');
});


//var finalStruct = {
    //"nfsOption": undefined, // Either empty struct (use ours) or 
    //         { "nfsServer": "netstore.int.xcalar.com",
    //           "nfsMountPoint": "/public/netstore",
    //           "nfsUsername": "jyang",
    //           "nfsGroup": "xcalarEmployee" }
    //"hostnames": [],
    //"username": "",
    //"credentials": {} // Either password or sshKey
//};

var Api = {
    "runPrecheck": 0,
    "checkPrecheckStatus": 1,
    "runInstaller": 2,
    "checkInstallerStatus": 3,
    "completeInstallation": 4
};

var Status = {
    "Ok": 0,
    "Done": 1,
    "Running": 2,
    "Error": -1,
};


app.post('/', function(req, res) {
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    switch(credArray.api) {
    case (Api.runPrecheck):
        res.send({"status": Status.Ok});
        break;
    case (Api.checkPrecheckStatus):
        var finalStruct = JSON.parse(credArray.struct);
        var ackArray = [];
        for (var i = 0; i<finalStruct.hostnames.length; i++) {
            ackArray.push("Precheck Step 1: Blah");
            console.log(finalStruct.hostnames[i]);
        }
        res.send({"status": Status.Running,
                  "retVal": ackArray});
        break;
    case (Api.runInstaller):
        res.send({"status": Status.Ok});
        break;
    case (Api.checkInstallerStatus):
        var finalStruct = JSON.parse(credArray.struct);
        var ackArray = [];
        for (var i = 0; i<finalStruct.hostnames.length; i++) {
            ackArray.push("Installer Step 1: Blah");
            console.log(finalStruct.hostnames[i]);
        }
        res.send({"status": Status.Running,
                  "retVal": ackArray});
        break;
    case (Api.completeInstallation):
        res.send({"status": Status.Ok});
        break;
    default:
        console.log("Boo");
        console.log(JSON.stringify(credArray));
    }
    /**
    for (var i = 0; i<credArray.length; i++) {
        console.log("host"+i+": "+credArray[i].hostname);
        var ec = exec('/home/jyang/node/testScript.sh '+credArray[i].hostname+' '+
                      credArray[i].username+' '+
                      credArray[i].password).code;
        if (ec !== 0) {
            hasError = true;
            errors[i] = ec;
        }
    }
    if (hasError) {
        res.send("Script executed with error code: "+JSON.stringify(ec));
    } else {
        res.send("Installation successful!");
    }
    */
});

var httpsServer = https.createServer(credentials, app);

httpsServer.listen(12124, function() {
    console.log("https app listening!");
});
