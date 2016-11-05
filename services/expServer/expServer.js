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
var support = require('./support');

var strictSecurity = false;
var trustedCerts = [fs.readFileSync(config.serverKeyFile)];
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

var SupportStatus = {
    "OKLog": 0,
    "OKNoLog": 1,
    "OKUnknown": 2,
    "Error": -1
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

app.post("/removeSessionFiles", function(req, res) {
    console.log("Remove Session Files");
    var credArray = req.body;
    var filename =  credArray["filename"];
    support.removeSessionFiles(filename, res);
});

app.post("/recentLogs", function(req, res) {
    console.log("Fetch Recent Logs as Master");
    var credArray = req.body;
    var requireLineNum =  credArray["requireLineNum"];
    var str = {"requireLineNum" : requireLineNum, "filename": file};
    support.masterExecuteAction("/recentLogs", res, str);
});

app.post("/monitorLogs", function(req, res) {
    console.log("Monitor Recent Logs as Master");
    var credArray = req.body;
    var userID =  credArray["userID"];
    var str = {"filename": file, "userID": userID};
    console.log("userID", userID);
    support.masterExecuteAction("/monitorLogs", res, str);
});

app.post("/stopMonitorLogs", function(req, res) {
    console.log("Stop Monitoring Logs as Master");
    var credArray = req.body;
    var userID =  credArray["userID"];
    var str = {"userID": userID};
    support.masterExecuteAction("/stopMonitorLogs", res, str);
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
function UserInformation() {
    this.loginId = 0;
    this.entry_count = 0;
    this.mail = "";
    this.firstName = "";
    this.employeeType = "";
    return this;
}
UserInformation.prototype = {
    getLoginId: function() {
        return this.loginId;
    },
    getEntryCount: function() {
        return this.entry_count;
    },
    getMail: function() {
        return this.mail;
    },
    getFirstName: function() {
        return this.firstName;
    },
    getEmployeeType: function() {
        return this.employeeType;
    },

    setLoginId: function(loginId) {
        this.loginId = loginId;
    },
    setEntryCount: function(entry_count) {
        this.entry_count = entry_count;
    },
    setMail: function(mail) {
        this.mail = mail;
    },
    setFirstName: function(firstName) {
        this.firstName = firstName;
    },
    setEmployeeType: function(employeeType) {
        this.employeeType = employeeType;
    },

    isSupporter: function() {
        return this.employeeType == "supporter";
    },
    isAdmin: function() {
        return this.employeeType == "administrator";
    }
};

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
            var currentUser = new UserInformation();
            currentUser.setLoginId(loginId);
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
        user.setEntryCount(user.getEntryCount() + 1);
        user.setMail(entryObject.mail);
        user.setFirstName(entryObject.cn);
        user.setEmployeeType(entryObject.employeeType);
    }
}

function responseResult(loginId, res) {
    console.log("here!");
    var user = users.get(loginId);
    console.log("user", user);
    if (user.getEntryCount() >= 1) {
        if (user.getEntryCount() > 1) {
            console.log("More than one matched user was found");
        }
        // The employeeType is defined when adding new user
        // "administrator" for administrators, "normal user"
        // for normal users.
        var isAdmin = user.isAdmin();
        var isSupporter = user.isSupporter();
        console.log("isAdmin", isAdmin);
        console.log("isSupporter", isSupporter);
        res.send({"status": Status.Ok,
                  "firstName ": user.firstName,
                  "mail": user.mail,
                  "isAdmin": isAdmin,
                  "isSupporter": isSupporter});
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
    console.log("To start the installation process, please open a browser " +
                "to\n https://" + hostname + ":8443");
});
