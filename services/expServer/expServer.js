var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require("http");
var https = require("https");
require('shelljs/global');

/**
var privateKey = fs.readFileSync('cantor.int.xcalar.com.key', 'utf8');
var certificate = fs.readFileSync('cantor.int.xcalar.com.crt', 'utf8');
var credentials = {key: privateKey, cert:certificate};
*/
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
    "completeInstallation": 4,
    "checkLicense": 5
};

var Status = {
    "Ok": 0,
    "Done": 1,
    "Running": 2,
    "Error": -1,
};

var curStep = {
    "stepString": "Step [0] Starting...",
    "prevString": "",
    "nodesCompletedCurrent": []
};

var getNodeRegex = /\[\([0-9]+\)\]/;
var getStatusRegex = /\[\([A-Z]+\)\]/;

app.post('/', function(req, res) {
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    switch(credArray.api) {
    case (Api.checkLicense):
        // XXX change to write to config
        var fileLocation = "/tmp/license.txt";
        fs.writeFile(fileLocation, credArray.struct.licenseKey);
        // Call bash to check license with this 
        var out = exec('/config/01-license.sh --license-file ' + fileLocation);
        out.stderr.on('data', function(data) {
            console.log(data);
            if (data === "Blah blah verified") {
                res.send({"status": Status.Ok,
                          // "numNodes": blah
                        });
            } else if (data === "FAILED") {
                res.send({"status": Status.Error});
            }
        });
        break;
    case (Api.runPrecheck):
        // Write files to /config and chmod
        var hostnameLocation = "/tmp/hosts.txt";
        var credentialLocation = "/tmp/key.txt";
        var isPassword = true;

        console.log(credArray.struct.credentials);
        if ("password" in credArray.struct.credentials) {
            console.log("Password");
            var password = credArray.struct.credentials.password;
            fs.writeFile(credentialLocation, password,
                         {mode: parseInt('400', 8)});
        } else {
            console.log("sshKey");
            isPassword = false;
            var sshkey = credArray.struct.credentials.sshKey;
            fs.writeFile(credentialLocation, sshkey,
                         {mode: parseInt('400', 8)});
        }

        var hostArray = credArray.struct.hostnames;
        fs.writeFile(hostnameLocation, hostArray.join("\n"));

        var out;
        if (isPassword) {
            out = exec('/config/02-precheck.sh -h ' + hostnameLocation +
                ' -');
        } else {
            out = exec('/config/02-precheck.sh ');
        }
        out.stderr.on('data', function(data) {
            console.log(data);
            if (data.indexOf("Step [") === 0) {
                // New Step! Means all the old ones are done
                curStep.prevString = curStep.stepString;
                curStep.stepString = data;
                curStep.nodesCompletedCurrent = [];
            } else if (data.indexOf("[") === 0) {
                // One node completed current step!
                var hostId = (getNodeRegex.exec(data))[1];
                var status = (getStatusRegex.exec(data))[1];
                if (status === "SUCCESS") {
                    curStep.nodesCompletedCurrent[hostId] = true;
                } else {
                    curStep.nodesCompletedCurrent[hostId] = false;
                    // XXX error message?
                }
                //
            }
            // Step [1/8]: Check host connection
            // [2] 00:50:30 [SUCCESS] tesla:22021
        });
        
        // Immediately ack after starting
        res.send({"status": Status.Ok});
        break;
    case (Api.checkPrecheckStatus):
        // Make bash call to get status
        var finalStruct = credArray.struct;
        var ackArray = [];
        // Check global array that has been populated by prev step
        for (var i = 0; i<finalStruct.hostnames.length; i++) {
            ackArray.push("Precheck Step 1: Blah");
            console.log(finalStruct.hostnames[i]);
        }
        res.send({"status": Status.Running,
                  "retVal": ackArray});
        break;
    case (Api.runInstaller):
        // Make bash call to start
        // Immediately ack after starting
        res.send({"status": Status.Ok});
        break;
    case (Api.checkInstallerStatus):
        // Make bash call to get status
        var finalStruct = credArray.struct;
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

/**
var httpsServer = https.createServer(credentials, app);

httpsServer.listen(12124, function() {
    console.log("https app listening!");
});
*/
var httpServer = http.createServer(app);

httpServer.listen(12124, function() {
    console.log("http app listening!");
});

