// This is the service that is run anywhere so most of the time there will be
// calls that aren't used

// Start of generic setup stuff
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');
var https = require("https");
require('shelljs/global');
var ldap = require('ldapjs');
var exec = require('child_process').exec;
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});

var tail = require('./tail');
var support = require('./support');
var login = require('./expLogin');
var Status = require('./supportStatusFile').Status;

var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.get('/*', function(req, res) {
    res.send('Please use post instead');
});

var verbose = true;
var xcConsole = {
    "log": function() {
        if (verbose) {
            console.log.apply(this, arguments);
        }
    }
};

// End of generic setup stuff

// Start of installer calls
var finalStruct = {
    "nfsOption"    : undefined, // Either empty struct (use ours) or
            // { "nfsServer": "netstore.int.xcalar.com",
            //   "nfsMountPoint": "/public/netstore",
            //   "nfsUsername": "jyang",
            //   "nfsGroup": "xcalarEmployee" }
    "hostnames"    : [],
    "privHostNames": [],
    "username"     : "",
    "port"         : 22,
    "credentials"  : {} // Either password or sshKey
};

var curStep = {};

var getNodeRegex = /\[([0-9]+)\]/;
var getStatusRegex = /\[([A-Z]+)\]/;
var installerLocation = "";
var cliArguments  = "";
var stepNum = 0;

var scriptDir = "/installer";
var licenseLocation = "/config/license.txt";
var hostnameLocation = "/config/hosts.txt";
var privHostnameLocation = "/config/privHosts.txt";
var credentialLocation = "/tmp/key.txt";

function initStepArray() {
    curStep = {
        "stepString"           : "Step [0] Starting...",
        "nodesCompletedCurrent": [],
        "status"               : Status.Running,
    };
}

function genExecString(hostnameLocation, hasPrivHosts,
                       credentialLocation, isPassword,
                       username, port, nfsOptions) {
    var execString = " -h " + hostnameLocation;
    execString+= " -l " + username;
    if (hasPrivHosts) {
        execString += " --priv-hosts-file " + privHostnameLocation;
    }
    if (isPassword) {
        execString += " --password-file ";
    } else {
        execString += " -i ";
    }
    execString += credentialLocation;
    execString += " -p " + port;
    execString += " --license-file " + licenseLocation;
    // execString += " --installer " + installerLocation;

    if (nfsOptions && "nfsServer" in nfsOptions) {
        execString += " --nfs-host " + nfsOptions.nfsServer;
        execString += " --nfs-folder " + nfsOptions.nfsMountPoint;

        if (nfsOptions.nfsUsername) {
            execString += " --nfs-uid " + nfsOptions.nfsUsername;
        }

        if (nfsOptions.nfsGroup) {
            execString += " --nfs-gid " + nfsOptions.nfsGroup;
        }
    }

    return execString;
}

function genLdapExecString(domainName, password, companyName) {
    var execString = "";
    execString += " --ldap-domain " + domainName;
    execString += " --ldap-org " + '"' + companyName + '"';

    var crypto = require('crypto');
    var shasum = crypto.createHash('sha1');

    salt = crypto.randomBytes(4);

    shasum.update(password);
    shasum.update(salt);

    var bufSalt = new Buffer(salt);
    var hexSSHA = new Buffer(shasum.digest('hex') + bufSalt.toString('hex'),
                             'hex');

    password = '{SSHA}' + hexSSHA.toString('base64');
    execString += " --ldap-password " + '"' + password + '"';
    return execString;
}

function sendStatusArray(finalStruct, res) {
    var ackArray = [];
    // Check global array that has been populated by prev step
    for (var i = 0; i<finalStruct.hostnames.length; i++) {
        if (curStep.nodesCompletedCurrent[i] === true) {
            ackArray.push(curStep.stepString + " (Done)");
        } else if (curStep.nodesCompletedCurrent[i] === false) {
            ackArray.push("FAILED: " + curStep.stepString);
        } else {
            ackArray.push(curStep.stepString + " (Executing)");
        }
    }

    if (curStep.status !== Status.Ok) {
        res.send({"status": curStep.status,
            "retVal"  : ackArray,
            "errorLog": errorLog});
    } else {
        res.send({"status": curStep.status,
                  "retVal": ackArray});
    }
    console.log("Success: send status array");
}

function stdOutCallback(dataBlock) {
    var lines = dataBlock.split("\n");
    for (var i = 0; i<lines.length; i++) {
        var data = lines[i];
        console.log("Start =="+data+"==");
        if (data.indexOf("Step [") === 0 || data.indexOf("STEP [") === 0) {
            // New Step! Means all the old ones are done
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

var errorLog = "";
function stdErrCallback(dataBlock) {
    errorLog += dataBlock + "\n";
}

app.post('/checkLicense', function(req, res) {
    console.log("Checking License");
    var credArray = req.body;
    var hasError = false;
    var errors = [];

    var fileLocation = licenseLocation;
    fs.writeFile(fileLocation, credArray.licenseKey);

    var out = exec(scriptDir + '/01-* --license-file ' + fileLocation);

    out.stdout.on('data', function(data) {
        if (data.indexOf("SUCCESS") > -1) {
            res.send({"status": Status.Ok});
            console.log("Success: Checking License");
        } else if (data.indexOf("FAILURE") > -1) {
            res.send({"status": Status.Error});
            console.log("Error: Checking License");
        }
    });

});

app.post("/runInstaller", function(req, res) {
    console.log("Executing Installer");
    var credArray = req.body;
    var hasError = false;
    var errors = [];

    // Write files to /config and chmod

    var isPassword = true;

    if ("password" in credArray.credentials) {
        var password = credArray.credentials.password;
        fs.writeFile(credentialLocation, password,
                     {mode: parseInt('600', 8)});
    } else {
        isPassword = false;
        var sshkey = credArray.credentials.sshKey;
        fs.writeFile(credentialLocation, sshkey,
                     {mode: parseInt('600', 8)});
    }

    var hostArray = credArray.hostnames;
    var hasPrivHosts = false;
    fs.writeFile(hostnameLocation, hostArray.join("\n"));

    if(credArray.privHostNames.length > 0) {
        fs.writeFile(privHostnameLocation, credArray.privHostNames.join("\n"));
    } else {
        fs.writeFile(privHostnameLocation, credArray.hostnames.join("\n"));
    }
    hasPrivHosts = true;

    var execString = scriptDir + "/cluster-install.sh";
    cliArguments = genExecString(hostnameLocation, hasPrivHosts,
                                 credentialLocation,
                                 isPassword, credArray.username,
                                 credArray.port,
                                 credArray.nfsOption);

    execString += cliArguments;
    initStepArray();

    out = exec(execString);

    out.stdout.on('data', stdOutCallback);
    out.stderr.on('data', stdErrCallback);

    out.on('close', function(code) {
        // Exit code. When we fail, we return non 0
        if (code) {
            console.log("Oh noes!");
            console.log("execString: " + execString);
            console.log("stderr: " + errorLog);
            curStep.status = Status.Error;
        } else {
            curStep.status = Status.Done;
        }

    });

    // Immediately ack after starting
    res.send({"status": Status.Ok});
    console.log("Immediately acking runInstaller");

});

app.post("/checkStatus", function(req, res) {
    console.log("Check Status");
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    var finalStruct = credArray;
    sendStatusArray(finalStruct, res);
});

app.post("/cancelInstall", function(req, res) {
    console.log("Cancel install");
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    res.send({"status": Status.Ok});
});


var file = "/var/log/Xcalar.log";

// Single node commands
app.post("/removeSessionFiles", function(req, res) {
    console.log("Remove Session Files");
    var filename =  req.body.filename;
    support.removeSessionFiles(filename, res);
});

app.post("/removeSHM", function(req, res) {
    console.log("Remove Files under folder SHM");
    support.removeSHM(res);
});

app.post("/getLicense", function(req, res) {
    console.log("Get License");
    support.getLicense(res);
});

app.post("/fileTicket", function(req, res) {
    console.log("File Ticket");
    var contents = req.body.contents;
    support.submitTicket(contents, res);
});

// Master request
app.post("/service/start", function(req, res) {
    console.log("Start Xcalar Services as Master");
    support.masterExecuteAction("/service/start", res);
});

app.post("/service/stop", function(req, res) {
    console.log("Stop Xcalar Service as Master");
    support.masterExecuteAction("/service/stop", res);
});

app.post("/service/restart", function(req, res) {
    console.log("Restart Xcalar Services as Master");
    support.masterExecuteAction("/service/restart", res);
});

app.post("/service/status", function(req, res) {
    console.log("Show Xcalar Services status as Master");
    support.masterExecuteAction("/service/status", res);
});

app.post("/service/condrestart", function(req, res) {
    console.log("Condrestart Xcalar Services as Master");
    support.masterExecuteAction("/service/condrestart", res);
});

app.post("/recentLogs", function(req, res) {
    console.log("Fetch Recent Logs as Master");
    var credArray = req.body;
    var requireLineNum =  credArray["requireLineNum"];

    support.hasLogFile(file)
    .then(function() {
        var str = {requireLineNum : requireLineNum, filename: file};
        support.masterExecuteAction("/recentLogs", res, str);
    })
    .fail(function() {
        var str = {"requireLineNum" : requireLineNum};
        // var str = {"requireLineNum" : requireLineNum};
        support.masterExecuteAction("/recentJournals", res, str);
    });
});

app.post("/monitorLogs", function(req, res) {
    console.log("Monitor Recent Logs as Master");
    var credArray = req.body;
    var userID =  credArray["userID"];

    support.hasLogFile(file)
    .then(function() {
        var str = {"filename": file, "userID": userID};
        support.masterExecuteAction("/monitorLogs", res, str);
    })
    .fail(function() {
        var str = {"userID": userID};
        support.masterExecuteAction("/monitorJournals", res, str);
    });
});

app.post("/stopMonitorLogs", function(req, res) {
    console.log("Stop Monitoring Logs as Master");
    var credArray = req.body;
    var userID =  credArray["userID"];
    var str = {"userID": userID};
    support.masterExecuteAction("/stopMonitorLogs", res, str);
});

app.post("/setTimeout", function(req, res) {
    console.log("Set the current time out as Master");
    var credArray = req.body;
    var timeout =  credArray["timeout"];
    var str = {"timeout": timeout};
    support.masterExecuteAction("/setTimeout", res, str);
});

// Slave request
app.post("/service/start/slave", function(req, res) {
    console.log("Start Xcalar Services as Slave");
    support.slaveExecuteAction("/service/start/slave", res);
});

app.post("/service/stop/slave", function(req, res) {
    console.log("Stop Xcalar Services as Slave");
    support.slaveExecuteAction("/service/stop/slave", res);
});

app.post("/service/restart/slave", function(req, res) {
    console.log("Restart Xcalar Services as Slave");
    support.slaveExecuteAction("/service/restart/slave", res);
});

app.post("/service/status/slave", function(req, res) {
    console.log("Show Xcalar Services statu as Slave");
    support.slaveExecuteAction("/service/status/slave", res);
});

app.post("/service/condrestart/slave", function(req, res) {
    console.log("Condrestart Xcalar Services as Slave");
    support.slaveExecuteAction("/service/condrestart/slave", res);
});

app.post("/recentLogs/slave", function(req, res) {
    console.log("Fetch Recent Logs as Slave");
    var credArray = req.body;
    var requireLineNum =  credArray["requireLineNum"];
    var str = {"requireLineNum" : requireLineNum, "filename": file};
    support.slaveExecuteAction("/recentLogs/slave", res, str);
});

app.post("/monitorLogs/slave", function(req, res) {
    console.log("Monitor Recent Logs as Slave");
    var credArray = req.body;
    var userID =  credArray["userID"];
    var str = {"filename": file, "userID": userID};
    support.slaveExecuteAction("/monitorLogs/slave", res, str);
});

app.post("/stopMonitorLogs/slave", function(req, res) {
    console.log("Stop Monitoring Logs as Slave");
    var credArray = req.body;
    var userID =  credArray["userID"];
    var str = {"filename": file, "userID": userID};
    support.slaveExecuteAction("/stopMonitorLogs/slave", res, str);
});

app.post("/recentJournals/slave", function(req, res) {
    console.log("Fetch Recent Journals as Slave");
    var credArray = req.body;
    var requireLineNum =  credArray["requireLineNum"];
    var str = {"requireLineNum" : requireLineNum};
    support.slaveExecuteAction("/recentJournals/slave", res, str);
});

app.post("/monitorJournals/slave", function(req, res) {
    console.log("Monitor Recent Journals as Slave");
    var credArray = req.body;
    var userID =  credArray["userID"];
    var str = {"userID": userID};
    support.slaveExecuteAction("/monitorJournals/slave", res, str);
});

app.post("/setTimeout/slave", function(req, res) {
    console.log("Set the current time out as Slave");
    var credArray = req.body;
    var timeout =  credArray["timeout"];
    var str = {"timeout": timeout};
    support.slaveExecuteAction("/setTimeout/slave", res, str);
});

function copyFiles(res) {
    var execString = scriptDir + "/deploy-shared-config.sh ";
    execString += cliArguments;
    console.log(execString);
    out = exec(execString);
    out.stdout.on('data', function(data) {
        console.log(data);
    });
    var errorMessage = "ERROR: ";
    out.stderr.on('data', function(data) {
        errorMessage += data;
        console.log("ERROR: " + data);
    });
    out.on('close', function(code) {
        if (code) {
            console.log("Copy failed");
            res.send({"status": Status.Error,
                "reason": errorMessage});
        } else {
            res.send({"status": Status.Ok});
        }
    });
}

app.post("/writeConfig", function(req, res) {
    console.log("Writing Ldap configurations");
    var credArray = req.body;
    var file = "/config/ldapConfig.json";
    try {
        fs.writeFileSync(file, JSON.stringify(credArray, null, 4));
        copyFiles(res);
    } catch (err) {
        console.log(err);
        res.send({"status": Status.Error,
            "reason": JSON.stringify(err)});
    }
});

app.post("/installLdap", function(req, res) {
    console.log("Installing Ldap");
    var credArray = req.body;

    var execString = scriptDir + "/ldap-install.sh ";
    execString += cliArguments; // Add all the previous stuff

    execString += genLdapExecString(credArray.domainName,
                                    credArray.password,
                                    credArray.companyName);
    console.log(execString);
    out = exec(execString);

    var replied = false;
    out.stdout.on('data', function(data) {
        console.log(data);
    });
    var errorMessage = "ERROR: ";
    out.stderr.on('data', function(data) {
        errorMessage += data;
        console.log("ERROR: " + data);
    });

    out.on('close', function(code) {
        // Exit code. When we fail, we return non 0
        if (code) {
            console.log("Oh noes!");
            if (!replied) {
                res.send({"status": Status.Error,
                    "reason": errorMessage});
            }
        } else {
            copyFiles(res);
        }
    });
});

app.post("/completeInstallation", function(req, res) {
    console.log("Complete Installation");
    var execString = scriptDir + "/04-start.sh";
    execString += cliArguments;

    out = exec(execString);
    out.on('close', function(code) {
        if (code) {
            console.log("Oh Noes");
            res.send({"status": Status.Error});
        } else {
            res.send({"status": Status.Ok});
        }
    });
});

// End of installer calls

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
function sendRequest(options) {
    var deferred = jQuery.Deferred();

    if (!options || !options.host || !options.method) {
        return jQuery.Deferred().reject("options not set");
    }

    var hostName = options.host;
    var action = options.path;

    if (options.method === "POST") {
        if (!options.postData) {
            options.postData = "{}";
        }
        options.headers = {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(options.postData)
        };
    }

    function afterSendHandler(res) {
        res.setEncoding('utf8');
        var totalData = "";
        res.on('data', function(data) {
            totalData += data;
        });
        res.on('end', function() {
           xcConsole.log("ended");
           deferred.resolve(totalData);
        });
    }

    function afterErrorHandler(error) {
        xcConsole.error(error);
        retMsg = {
            status: Status.Error,
            error: error,
            logs: error.message
        };
        deferred.reject(retMsg);
    }

    var req;
    if (options.method === "GET") {
        xcConsole.log("Received request for :" + hostName + action);
        req = https.get(hostName + action, afterSendHandler);
    } else if (options.method === "POST") {
        req = https.request(options, afterSendHandler);
    } else {
        return jQuery.Deferred.reject("Only GET and POST for sendRequest");
    }
    req.on('error', afterErrorHandler);
    req.end();

    return deferred.promise();
}

app.post("/downloadPackage", function(req, res) {
    function parseExtensionsHtml(html) {
        var lines = html.split("\n");
        var packages = {};
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            var installationDir = "/extensions/installed/";
            if (line.indexOf("<!--") > -1 ||
                line.indexOf(installationDir) < 0) {
                continue;
            }
            var name = line.substring(line.indexOf(installationDir) +
                                      installationDir.length,
                                      line.indexOf(".ext.js"));
            packages[name] = true;
        }
        return packages;
    }

    xcConsole.log("Download Package");
    var pkg = req.body;
    xcConsole.log(pkg);
    var url = "/marketplace/download?name=" + pkg.name + "&version=" +
              pkg.version;
    var basePath = "/var/www/xcalar-gui/assets/extensions/installed/";

    var options = {
        host: "https://authentication.xcalar.net",
        port: 3001,
        path: url,
        method: "GET",
    };
    sendRequest(options)
    .then(function(ret) {
        xcConsole.log(ret);
        var deferred = jQuery.Deferred();
        var retStruct;
        try {
            retStruct = JSON.parse(ret);
            if (retStruct.status !== Status.Ok) {
                return deferred.reject(retStruct);
            }
        } catch(e) {
            return deferred.reject(ret);
        }

        xcConsole.log(retStruct.data.length);

        var zipFile = new Buffer(retStruct.data, 'base64');
        var zipPath = basePath + pkg.name + "-" + pkg.version + ".zip";
        xcConsole.log(zipPath);
        fs.writeFile(basePath+pkg.name+"-"+pkg.version+".zip", zipFile,
        function(a) {
            xcConsole.log("Writing");
            var out = exec("tar -zxf " + zipPath + " -C " + basePath);
            out.on('close', function(code) {
                if (code) {
                    deferred.reject(code);
                } else {
                    deferred.resolve();
                }
            });
        });
        return deferred.promise();
    })
    .then(function() {
        xcConsole.log("Appending to extensions.html");
        var deferred = jQuery.Deferred();
        xcConsole.log(basePath + "../extensions.html");
        fs.readFile(basePath + "../extensions.html", 'utf8',
                    function(err, data) {
            xcConsole.log(err, data);
            if (err) {
                deferred.reject(err);
            }
            var packages = parseExtensionsHtml(data);
            xcConsole.log(packages);
            if (pkg.name in packages) {
                xcConsole.log(pkg.name + " is already in extensions.html");
                deferred.resolve(data);
            } else {
                var startIdx = data.indexOf("<!--NEW EXTENSION HERE");
                var newString = data.substring(0, startIdx) +
                    '    <script src="assets/extensions/installed/' + pkg.name +
                    '.ext.js" type="text/javascript"></script>\n' +
                    '    <!--NEW EXTENSION HERE-->\n' +
                    data.substring(startIdx);
                deferred.resolve(newString);
            }
        });
        return deferred.promise();
    })
    .then(function(newString) {
        fs.writeFile(basePath + "../extensions.html", newString,
                     function() {
            res.jsonp({status: Status.Ok});
        });
    })
    .fail(function() {
        xcConsole.log("Failed: "+arguments);
        res.jsonp({status: Status.Error,
                   logs: JSON.stringify(arguments)});
    });
});

// End of marketplace calls

// Start of LDAP calls
/**
Example AD settings (now gotten from ldapConfig.json)
var ldap_uri = 'ldap://pdc1.int.xcalar.com:389';
var userDN = "cn=users,dc=int,dc=xcalar,dc=net";
var useTLS = true;
var searchFilter = "(&(objectclass=user)(userPrincipalName=%username%))";
var activeDir = true;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';

Example OpenLDAP Settings (now gotten from ldapConfig.json)

var ldap_uri = 'ldap://turing.int.xcalar.com:389';
var userDN = "uid=%username%,ou=People,dc=int,dc=xcalar,dc=com";
var useTLS = false;
var searchFilter = "";
var activeDir = false;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt'; */

app.post('/login', function(req, res) {
    console.log("Login process");
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    login.loginAuthentication(credArray, res);
});

var httpServer = http.createServer(app);
require('ssl-root-cas').addFile('/etc/apache2/ssl/ca.pem').inject();
var port = 12124;
httpServer.listen(port, function() {
    var hostname = process.env.DEPLOY_HOST;
    if (!hostname) {
        hostname = "localhost";
    }
    console.log("All ready");
});
