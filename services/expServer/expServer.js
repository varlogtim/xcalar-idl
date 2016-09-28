var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');
var https = require("https");
require('shelljs/global');
var ldap = require('ldapjs');
var exec = require('child_process').exec;

var strictSecurity = false;
var config = require('./ldapConfig.json');
var trustedCerts = [fs.readFileSync(config.serverKeyFile)];
var app = express();


// Example AD settings (now gotten from ldapConfig.json)
//
/*var ldap_uri = 'ldap://pdc1.int.xcalar.com:389';
var userDN = "cn=users,dc=int,dc=xcalar,dc=net";
var useTLS = true;
var searchFilter = "(&(objectclass=user)(userPrincipalName=%username%))";
var activeDir = true;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt'; */

//
// Example OpenLDAP Settings (now gotten from ldapConfig.json)
//

/* var ldap_uri = 'ldap://turing.int.xcalar.com:389';
var userDN = "uid=%username%,ou=People,dc=int,dc=xcalar,dc=com";
var useTLS = false;
var searchFilter = "";
var activeDir = false;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt'; */

/**
var privateKey = fs.readFileSync('cantor.int.xcalar.com.key', 'utf8');
var certificate = fs.readFileSync('cantor.int.xcalar.com.crt', 'utf8');
var credentials = {key: privateKey, cert:certificate};
*/

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

var finalStruct = {
    "nfsOption": undefined, // Either empty struct (use ours) or
            // { "nfsServer": "netstore.int.xcalar.com",
            //   "nfsMountPoint": "/public/netstore",
            //   "nfsUsername": "jyang",
            //   "nfsGroup": "xcalarEmployee" }
    "hostnames": [],
    "username": "",
    "credentials": {} // Either password or sshKey
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
var licenseLocation = "/tmp/license.txt";

function initStepArray() {
    curStep = {
        "stepString": "Step [0] Starting...",
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
    execString += " --license-file " + licenseLocation;
    // execString += " --installer " + installerLocation;

    if ("nfsServer" in nfsOptions) {
        execString += " --nfs-host " + nfsOptions.nfsServer;
        execString += " --nfs-folder " + nfsOptions.nfsMountPoint;
        if ("nfsUsername" in nfsOptions) {
            execString += " --nfs-uid " + nfsOptions.nfsUsername;
            execString += " --nfs-gid " + nfsOptions.nfsGroup;
        }
    }

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

    res.send({"status": curStep.status,
              "retVal": ackArray});
    console.log("Success: send status array");
}

function stdOutCallback(dataBlock) {
    var lines = dataBlock.split("\n");
    for (var i = 0; i<lines.length; i++) {
        var data = lines[i];
        //console.log("Start =="+data+"==");
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

app.post('/checkLicense', function(req, res) {
    console.log("Checking License");
    var credArray = req.body;
    var hasError = false;
    var errors = [];

    // XXX change to write to config
    var fileLocation = "/tmp/license.txt";
    fs.writeFile(fileLocation, credArray.licenseKey);
    // Call bash to check license with this
    var out = exec(scriptDir + '/01-* --license-file ' + fileLocation);

    out.stdout.on('data', function(data) {
        if (data.indexOf("SUCCESS") > -1) {
            res.send({"status": Status.Ok
                      // "numNodes": blah
                    });
            console.log("Success: Checking License");
        } else if (data.indexOf("FAILURE") > -1) {
            res.send({"status": Status.Error});
            console.log("Error: Checking License");
        }
    });

});

app.post("/runInstaller", function(req, res) {
    console.log("Executing Precheck");
    var credArray = req.body;
    var hasError = false;
    var errors = [];

    // Write files to /config and chmod
    var hostnameLocation = "/tmp/hosts.txt";
    var credentialLocation = "/tmp/key.txt";
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

    fs.writeFile(licenseLocation, "1234-1234-1234-1234");

    var hostArray = credArray.hostnames;
    fs.writeFile(hostnameLocation, hostArray.join("\n"));

    var execString = scriptDir + "/cluster-install.sh";
    cliArguments = genExecString(hostnameLocation, credentialLocation,
                                 isPassword, credArray.username,
                                 credArray.port,
                                 credArray.nfsOption);

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


app.post("/listPackages", function(req, res) {
    console.log("List Packages");
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    var f = fs.readFile("marketplace.json", (err, data) => {
        if (err) throw err;
        res.send(data);
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

app.post('/login', function(req, res) {
    console.log("Login process");
    var credArray = req.body;
    var hasError = false;
    var errors = [];
    if (credArray) {
        // here is the LDAP related material
        // it's activated if xiusername is in the request body
        if (("xiusername" in credArray) && ("xipassword" in credArray)) {

            var username = credArray["xiusername"];
            var password = credArray["xipassword"];

            var client_url = config.ldap_uri.endsWith('/') ? config.ldap_uri : config.ldap_uri+'/';
            console.log("client_url");
            console.log(client_url);

            var userDN = config.userDN;
            var searchFilter = config.searchFilter;

            var activeDir = (config.activeDir === 'true');
            var useTLS = (config.useTLS === 'true');

            console.log('connecting to: '+client_url);

            var client = ldap.createClient({
                url: client_url,
                timeout: 10000,
                connectTimeout: 20000
            });

            // two kinds of LDAP, one to connect to an Active Directory,
            // another to a generic OpenLDAP server.
            var searchOpts = {
                filter: searchFilter != "" ?
                    searchFilter.replace('%username%',username) : undefined,
                scope: 'sub',
                attributes: ['CN']
            };

            if (!activeDir) {
                userDN = userDN.replace('%username%', username);
                username = userDN;
            }

            var bindCallback = _bindCallback(client, searchOpts, res, userDN);

            var excpUnbindErr = _unbindError('Unbind for unexpected error');

            if (useTLS) {

                var tlsOpts = {
                    cert: trustedCerts,
                    rejectUnauthorized: strictSecurity
                };

                console.log("Starting TLS...");
                client.starttls(tlsOpts, [], function(err) {
                    if (err) {
                        console.log("TLS startup error: " + err.message);
                        res.send("LDAP TLS Failure!\n");
                        return;
                    }
                    ldapAuth(username, password, client, bindCallback, excpUnbindErr, res);
                });

            } else {
                ldapAuth(username, password, client, bindCallback, excpUnbindErr, res);
            };
        } else {
            res.send({"status": Status.Error});
        }
    } else {
        res.send({"status": Status.Error});
    }
});

function _unbindError(step) {
    return function(err) {
        if(err){
            console.log(err.message);
        } else {
            console.log('client disconnected ' + step);
        };
    };
};

function _bindCallback(client, searchOpts, httpres, userDN) {
    return function(err, res) {
        var bindUnbindErr = _unbindError('Unbind after bind process');
        var searchUnbindErr = _unbindError('Unbind after search process');

        if (err) {
            console.log(err.message);
            client.unbind(bindUnbindErr);
            httpres.send({"status": Status.Error});
        } else {
            console.log('connected');

            client.search(userDN, searchOpts, function(error, search) {
                console.log('Searching.....');
                var entry_count = 0;

                search.on('searchEntry', function(entry) {
                    console.log('Checking entries.....');
                    if(entry.object){
                        console.log('entry: %j ' + JSON.stringify(entry.object));
                        entry_count++;
                    }
                });

                search.on('error', function(error) {
                    console.error('LDAP search error: ' + error.message);
                    httpres.send({"status": Status.Error});
                    client.unbind(searchUnbindErr);
                });

                search.on('end', function(result) {
                    console.log('status: ' + result.status);
                    if (entry_count > 1) {
                        console.log("More than one matched user was found");
                        httpres.send({"status": Status.Ok});
                    } else if (entry_count === 1) {
                        httpres.send({"status": Status.Ok});
                    } else {
                        console.log("No matched user");
                        httpres.send({"status": Status.Error});
                    }
                    client.unbind(searchUnbindErr);
                });
            });
        };
    };
};



function ldapAuth(username, password, client, bindCallback, bindErr, res) {
    console.log('--- going to try to connect user ---');
    try {
        client.bind(username, password, bindCallback);
    } catch(error){
        console.log(error);
        client.unbind(bindErr);
        res.send({"status": Status.Error});
    };
};


var httpServer = http.createServer(app);
var port = 12124;
httpServer.listen(port, function() {
    console.log("I am listening on port " + port);
});
