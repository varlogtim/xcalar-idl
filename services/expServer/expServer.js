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
var config = require('./ldapConfig.json');

var strictSecurity = false;
var trustedCerts = [fs.readFileSync(config.serverKeyFile)];
var app = express();

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

// End of generic setup stuff

// Start of installer calls
var finalStruct = {
    "nfsOption": undefined, // Either empty struct (use ours) or
            // { "nfsServer": "netstore.int.xcalar.com",
            //   "nfsMountPoint": "/public/netstore",
            //   "nfsUsername": "jyang",
            //   "nfsGroup": "xcalarEmployee" }
    "hostnames": [],
    "privHostNames": [],
    "username": "",
    "port": 22,
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
var stepNum = 0;

var scriptDir = "/installer";
var licenseLocation = "/config/license.txt";
var hostnameLocation = "/config/hosts.txt";
var privHostnameLocation = "/config/privHosts.txt";
var credentialLocation = "/tmp/key.txt";

function initStepArray() {
    curStep = {
        "stepString": "Step [0] Starting...",
        "nodesCompletedCurrent": [],
        "status": Status.Running,
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

    if (curStep.status !== Status.Ok) {
        res.send({"status": curStep.status,
                  "retVal": ackArray,
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

    // XXX change to write to config
    var fileLocation = licenseLocation;
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

    if (credArray.privHostNames.length > 0) {
        fs.writeFile(privHostnameLocation, credArray.privHostNames.join("\n"));
        hasPrivHosts = true;
    }

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

app.post("/recentLogs", function(req, res) {
    console.log("Fetch Recent Logs");
    var credArray = req.body;
    var requireLineNum =  credArray["requireLineNum"];
    tail.tailByLargeBuffer(file, requireLineNum, res);
});

app.post("/monitorLogs", function(req, res) {
    var credArray = req.body;
    var userID =  credArray["userID"];
    tail.createTailUser(userID);
    tail.tailf(file, res, userID);
});

app.post("/stopMonitorLogs", function(req, res) {
    console.log("Stop Monitoring Logs");
    var credArray = req.body;
    var userID =  credArray["userID"];
    tail.removeTailUser(userID);
    res.send({"status": Status.Ok});
});

app.post("/writeConfig", function(req, res) {
    console.log("Writing Ldap configurations");
    var credArray = req.body;
    var file = "/config/ldapConfig.json";
    try {
        fs.writeFileSync(file, JSON.stringify(credArray, null, 4));
        res.send({"status": Status.Ok});
    } catch (err) {
        console.log(err);
        res.send({"status": Status.Error});
    }
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

var users = new Map();
var loginId = 0;
var UserInformation = {
    loginId: 0,
    entry_count: 0,
    mail: "",
    firstName: "",
    employeeType: ""
}

app.post('/login', function(req, res) {
    console.log("Login process");
    var credArray = req.body;
    var hasError = false;
    var errors = [];

    if (credArray) {
        // here is the LDAP related material
        // it's activated if xiusername is in the request body
        if (("xiusername" in credArray) && ("xipassword" in credArray)) {

            // Save the information of current user into a HashTable
            var currentUser = Object.create(UserInformation);
            currentUser.loginId = loginId;
            users.set(loginId, currentUser);

            // Configuration Parameter to Connect to LDAP
            var username = credArray["xiusername"];
            var password = credArray["xipassword"];
            var client_url = config.ldap_uri.endsWith('/') ?
                             config.ldap_uri : config.ldap_uri+'/';
            var userDN = config.userDN;
            var searchFilter = config.searchFilter;
            var activeDir = (config.activeDir === 'true');
            var useTLS = (config.useTLS === 'true');
            var client = ldap.createClient({
                url: client_url,
                timeout: 10000,
                connectTimeout: 20000
            });
            var searchOpts = {
                filter: searchFilter != "" ?
                    searchFilter.replace('%username%',username):undefined,
                scope: 'sub',
                attributes: ['cn','mail','employeeType']
            };
            if (!activeDir) {
                userDN = userDN.replace('%username%', username);
                username = userDN;
            }

            // Use TLS Protocol
            if (useTLS) {
                var tlsOpts = {
                    cert: trustedCerts,
                    rejectUnauthorized: strictSecurity
                };
                console.log("Starting TLS...");
                client.starttls(tlsOpts, [], function(err) {
                    if (err) {
                        console.log("TLS startup error: " + err.message);
                        responseError(res);
                        return;
                    }
                });
            }

            // LDAP Authentication
            var deferred = jQuery.Deferred();
            client.bind(username, password, function(error) {
                if (error) {
                    console.log("Bind Error! " + error.message)
                    loginId++;
                    deferred.reject();
                } else {
                    console.log('Bind Successful!');
                    client.search(userDN, searchOpts,
                                  function(error, search) {
                        deferred.resolve(error, search, loginId);
                        loginId++;
                    });
               }
            });
            deferred
            .then(function(error, search, currLogin) {
                var deferred2 = jQuery.Deferred();
                search.on('searchEntry', function(entry) {
                    console.log('Searching entries.....');
                    writeEntry(entry, currLogin);
                });

                search.on('error', function(error) {
                    console.log('Search error: ' + error.message);
                    deferred2.reject();
                });

                search.on('end', function(result) {
                    console.log('Finished Search!');
                    client.unbind();
                    deferred2.resolve(currLogin);
                });
                return deferred2.promise();
            })
            .then(function(currLogin) {
                responseResult(currLogin, res);
            })
            .fail(function() {
                client.unbind();
                responseError(res);
            });
        } else {
             responseError(res);
        }
    } else {
        responseError(res);
    }

});


function writeEntry(entry, loginId) {
    if(entry.object){
        var entryObject = JSON.parse(JSON.stringify(entry.object));
        var user = users.get(loginId);
        user.entry_count++;
        user.mail = entryObject.mail;
        user.firstName = entryObject.cn;
        user.employeeType = entryObject.employeeType;
    }
}

function responseResult(loginId, res) {
    var user = users.get(loginId);
    if (user.entry_count >= 1) {
        if (user.entry_count > 1) {
            console.log("More than one matched user was found");
        }
        // The employeeType is defined when adding new user
        // "administrator" for administrators, "normal user"
        // for normal users.
        var isAdmin = (user.employeeType == "administrator");
        res.send({"status": Status.Ok,
                  "firstName ": user.firstName,
                  "mail": user.mail,
                  "isAdmin": isAdmin});
    } else {
        console.log("No matched user");
        responseError(res);
    }
}

function responseError(res) {
    res.send({"status": Status.Error});
}

var httpServer = http.createServer(app);
var port = 12124;
httpServer.listen(port, function() {
    var hostname = process.env.DEPLOY_HOST;
    if (!hostname) {
        hostname = "localhost";
    }
    console.log("To start the installation process, please open a browser to\n" +
                hostname + ":8443");
});
