var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require("http");
var https = require("https");
require('shelljs/global');
var exec = require('child_process').exec;

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
    "checkStatus": 1,
    "runInstaller": 2,
    "completeInstallation": 3,
    "checkLicense": 4,
};

var Status = {
    "Ok": 0,
    "Done": 1,
    "Running": 2,
    "Error": -1,
};

var curStep = {};

var getNodeRegex = /\[([0-9]+)\]/;
var getStatusRegex = /\[([A-Z]+)\]/;
var installerLocation = "";
var cliArguments  = "";

var scriptDir = "/installer";

function initStepArray() {
    curStep = {
        "stepString": "Step [0] Starting...",
        "prevString": "",
        "nodesCompletedCurrent": [],
        "status": Status.Running,
    };
}

function genExecString(hostnameLocation, credentialLocation, isPassword,
                       username, port, nfsOptions) {
    var execString = " -h " + hostnameLocation;
    if (isPassword) {
        execString += " --password-file ";
    } else {
        execString += " -i ";
    }
    execString += credentialLocation;
    execString += " -p " + port;
    // execString += " --installer " + installerLocation;

    if (nfsOptions) {
        execString += " --nfs-host " + nfsOptions.nfsServer;
        execString += " --nfs-folder " + nfsOptions.nfsMountPoint;
        if (nfsOptions.nfsUsername) {
            execString += " --nfs-uid " + nfsOptions.nfsUsername;
            execString += " --nfs-gid " + nfsOptions.nfsGroup;
        }
    }

    return execString;
}

function sendStatusArray(finalStruct, res) {
    var ackArray = [];

    console.log(finalStruct);
    console.log(curStep);
    // Check global array that has been populated by prev step
    for (var i = 0; i<finalStruct.hostnames.length; i++) {
        if (curStep.nodesCompletedCurrent[i] === true) {
            ackArray.push(curStep.stepString);
        } else if (curStep.nodesCompletedCurrent[i] === false) {
            ackArray.push("FAILED: " + curStep.stepString);
        } else {
            ackArray.push(curStep.prevString);
        }
    }

    res.send({"status": curStep.status,
              "retVal": ackArray});
}

function stdOutCallback(dataBlock) {
    var lines = dataBlock.split("\n");

    for (var i = 0; i<lines.length; i++) {
        var data = lines[i];
        console.log ("Start =="+data+"==");
        if (data.indexOf("Step [") === 0 || data.indexOf("STEP [") === 0) {
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
        }
    }
}

app.post('/', function(req, res) {
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    console.log("Api: " + credArray.api);
    switch(credArray.api) {
    case (Api.checkLicense):
        // XXX change to write to config
        var fileLocation = "/tmp/license.txt";
        fs.writeFile(fileLocation, credArray.struct.licenseKey);
        // Call bash to check license with this 
        var out = exec(scriptDir + '/01-* --license-file ' + fileLocation);
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
        console.log("Executing Precheck");
        // Write files to /config and chmod
        var hostnameLocation = "/tmp/hosts.txt";
        var credentialLocation = "/tmp/key.txt";
        var isPassword = true;

        console.log(credArray.struct);
        if ("password" in credArray.struct.credentials) {
            console.log("Password");
            var password = credArray.struct.credentials.password;
            fs.writeFile(credentialLocation, password,
                         {mode: parseInt('600', 8)});
        } else {
            console.log("sshKey");
            isPassword = false;
            var sshkey = credArray.struct.credentials.sshKey;
            fs.writeFile(credentialLocation, sshkey,
                         {mode: parseInt('600', 8)});
        }

        var hostArray = credArray.struct.hostnames;
        fs.writeFile(hostnameLocation, hostArray.join("\n"));

        var execString = scriptDir + "/02*";
        cliArguments = genExecString(hostnameLocation, credentialLocation,
                                     isPassword, credArray.struct.username,
                                     credArray.struct.port,
                                     credArray.struct.nfsOption);

        execString += cliArguments;
        execString += "; " + scriptDir + "/03*";
        execString += cliArguments;
        initStepArray();

        out = exec(execString);
        
        out.stdout.on('data', stdOutCallback);

        out.on('close', function(code) {
            // Exit code. When we fail, we return non 0
            if (code) {
                console.log("Oh noes!");
                curStep.status = Status.Error;
            } else {
                curStep.status = Status.Done;
            }

        });
        
        // Immediately ack after starting
        res.send({"status": Status.Ok});
        break;
    case (Api.checkStatus):
        console.log("Getting status");
        var finalStruct = credArray.struct;
        sendStatusArray(finalStruct, res);
        break;
    case (Api.runInstaller):
        initStepArray();
        // Make bash call to start
        console.log("Running installer");
        var execString = scriptDir + "/04-*";
        execString += cliArguments;
        execString += "; " + scriptDir + "/05-*" + cliArguments;
        execString += "; " + scriptDir + "/06-*" + cliArguments;

        out = exec(execString);
        out.stdout.on('data', stdOutCallback);

        out.on('close', function(code) {
            // Exit code. When we fail, we return non 0
            if (code) {
                console.log("Oh noes!");
                curStep.status = Status.Error;
            } else {
                curStep.status = Status.Done;
            }
        });

        // Immediately ack after starting
        res.send({"status": Status.Ok});
        break;
    
    // case (Api.completeInstallation):
    //     var execString = scriptDir + "/04-start.sh";
    //     execString += cliArguments;

    //     out = exec(execString);
    //     out.on('close', function(code) {
    //         if (code) {
    //             console.log("Oh Noes");
    //             res.send({"status": Status.Error});
    //         } else {
    //             res.send({"status": Status.Ok});
    //         }
    //     });
    //     break;
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

