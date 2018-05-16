var fs = require('fs');
var stream = require('stream');
var ldap = require('ldapjs');
var express = require('express');
var router = express.Router();
var zlib = require('zlib');
var support = require('../expServerSupport.js');
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var Status = require('../supportStatusFile').Status;
var httpStatus = require('../../../assets/js/httpStatus.js').httpStatus;
var exec = require("child_process").exec;

// Start of installer calls
var installStatus = {
    "Error": -1,
    "Done": 2,
    "Running": 1
};
var curStep = {};
var getNodeRegex = /\[([0-9]+)\]/;
var getStatusRegex = /\[([A-Z]+)\]/;
var cliArguments  = "";
var path = require("path");
var scriptRoot = process.env.XCE_INSTALLER_ROOT;
if (!scriptRoot) {
    scriptRoot = "";
}
var scriptDir = path.join(scriptRoot, "/installer");
var licenseLocation = path.join(scriptRoot, "/config/license.txt");
var hostnameLocation = path.join(scriptRoot, "/config/hosts.txt");
var privHostnameLocation = path.join(scriptRoot, "/config/privHosts.txt");
var ldapLocation = path.join(scriptRoot, "/config/ldapConfig.json");
var credentialLocation = path.join(scriptRoot, "/tmp/key.txt");
var discoveryResultLocation=path.join(scriptRoot, "/tmp/config.json");
var errorLog = "";

function initStepArray() {
    curStep = {
        "stepString": "Step [0] Starting...",
        "nodesCompletedCurrent": [],
        "status": Status.Running,
    };
}
function clearErrorLog() {
    errorLog = "";
}

function genExecString(input) {
    var hasPrivHosts = input.hasPrivHosts;
    var credentialsOption = input.credArray.credentials;
    var username = input.credArray.username;
    var port = input.credArray.port;
    var nfsOption = input.credArray.nfsOption;
    var installationDirectory = input.credArray.installationDirectory;
    var ldapOption = input.credArray.ldap;
    var defaultAdminOption = input.credArray.defaultAdminConfig;
    var serDes = input.credArray.serializationDirectory;
    var preConfig = input.credArray.preConfig;
    var supportBundles = input.credArray.supportBundles;
    var enableHotPatches = input.credArray.enableHotPatches;

    var execString = " -h " + hostnameLocation;
    execString += " -l " + username;
    if (hasPrivHosts) {
        execString += " --priv-hosts-file " + privHostnameLocation;
    }
    if ("password" in credentialsOption) {
        execString += " --ssh-mode password";
        execString += " --password-file " + credentialLocation;
    } else if ("sshKey" in credentialsOption) {
        execString += " --ssh-mode key";
        execString += " -i " + credentialLocation;
    } else if ("sshUserSettings" in credentialsOption) {
        execString += " --ssh-mode user";
    }
    execString += " -p " + port;
    execString += " --license-file " + licenseLocation;
    // execString += " --installer " + installerLocation;

    if (nfsOption) {
        // Xcalar to mount NFS
        if (nfsOption.option === "customerNfs") {
            execString += " --nfs-mode external";
            execString += " --nfs-host " + nfsOption.nfsServer;
            execString += " --nfs-folder " + nfsOption.nfsMountPoint;
            if (nfsOption.nfsUsername) {
                execString += " --nfs-uid " + nfsOption.nfsUsername;
            }
            if (nfsOption.nfsGroup) {
                execString += " --nfs-gid " + nfsOption.nfsGroup;
            }
        } else if (nfsOption.option === "readyNfs") {
            // Xcalar Root Already mounted
            execString += " --nfs-mode reuse";
            execString += " --nfs-reuse " + nfsOption.nfsReuse;
        } else if (nfsOption.option === "xcalarNfs") {
            execString += " --nfs-mode create";
        }

        if (nfsOption.copy) {
            execString += " --nfs-copy";
        }
    }
    if (ldapOption) {
        if (ldapOption.deployOption === "xcalarLdap") {
            execString += " --ldap-mode create";
            execString += " --ldap-domain " + ldapOption.domainName;
            execString += " --ldap-org " + '"' + ldapOption.companyName + '"';
            execString += " --ldap-password " + '"' + encryptPassword(ldapOption.password) + '"';
        } else if (ldapOption.deployOption === "customerLdap") {
            execString += " --ldap-mode external";
        }
    }
    if (defaultAdminOption) {
        if (defaultAdminOption.defaultAdminEnabled) {
            execString += " --default-admin";
            execString += " --admin-username " + '"' + defaultAdminOption.username + '"';
            execString += " --admin-email " + '"' + defaultAdminOption.email + '"';
            execString += " --admin-password " + '"' + defaultAdminOption.password + '"';
        }
    }
    if (serDes) {
        execString += " --serdes " + '"' + serDes + '"';
    }
    if (!preConfig) {
        execString += " --pre-config";
    }
    if (installationDirectory) {
        execString += " --install-dir " + installationDirectory;
    }
    if (supportBundles) {
        execString += " --support-bundles";
    }
    if (enableHotPatches) {
        execString += " --enable-hotPatches";
    }

    return execString;
}

function genDiscoverExecString(hostnameLocation,
                               credentialLocation,
                               isPassword,
                               username, port,
                               installationDirectory) {
    var execString = " -h " + hostnameLocation;
    execString += " -l " + username;
    if (isPassword) {
        execString += " --password-file ";
    } else {
        execString += " -i ";
    }
    execString += credentialLocation;
    execString += " -p " + port;
    execString += " --install-dir " + installationDirectory;

    return execString;
}

function encryptPassword(password) {
    var crypto = require('crypto');
    var shasum = crypto.createHash('sha1');

    var salt = crypto.randomBytes(4);
    var encryptedPassword = "";

    shasum.update(password);
    shasum.update(salt);

    var bufSalt = new Buffer(salt);
    var hexSSHA = new Buffer(shasum.digest('hex') + bufSalt.toString('hex'),
                             'hex');

    encryptedPassword = '{SSHA}' + hexSSHA.toString('base64');

    return encryptedPassword;
}

function createStatusArray(credArray) {
    var deferred = jQuery.Deferred();
    var ackArray = [];
    // Check global array that has been populated by prev step
    for (var i = 0; i < credArray.hostnames.length; i++) {
        if (curStep.nodesCompletedCurrent[i] === true) {
            ackArray.push(curStep.stepString + " (Done)");
        } else if (curStep.nodesCompletedCurrent[i] === false) {
            ackArray.push("FAILED: " + curStep.stepString);
        } else {
            ackArray.push(curStep.stepString + " (Executing)");
        }
    }
    var retMsg;
    if (curStep.curStepStatus === installStatus.Error) {
        support.slaveExecuteAction("GET", "/installationLogs/slave",
                                    {isHTTP: "true"})
        .always(function(message) {
            retMsg = {
                "status": httpStatus.OK,
                "curStepStatus": curStep.curStepStatus,
                "retVal": ackArray,
                "errorLog": errorLog, // the error message by script running
                "installationLogs": message.logs // all installation logs
            };
            deferred.reject(retMsg);
        });
    } else {
        retMsg = {
            "status": httpStatus.OK,
            "curStepStatus": curStep.curStepStatus,
            "retVal": ackArray
        };
        deferred.resolve(retMsg);
    }
    xcConsole.log("Success: send status array");
    return deferred.promise();
}

function stdOutCallback(dataBlock) {
    var lines = dataBlock.split("\n");
    for (var i = 0; i<lines.length; i++) {
        var data = lines[i];
        xcConsole.log("Start ==" + data + "==");
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

function stdErrCallback(dataBlock) {
    errorLog += dataBlock + "\n";
}

function checkLicense(credArray, script) {
    var deferredOut = jQuery.Deferred();
    var fileLocation = licenseLocation;
    var compressedLicense = new Buffer(credArray.licenseKey, 'base64');
    var licenseStream =  new stream.PassThrough();

    licenseStream.write(compressedLicense);
    licenseStream.end();

    licenseFileStream = fs.createWriteStream(fileLocation);
    licenseStream.pipe(zlib.createGunzip()).pipe(licenseFileStream);

    var retMsg;
    licenseFileStream.on('error', function(err) {
        retMsg = {"status": httpStatus.InternalServerError};
        if (err) {
            deferredOut.reject(retMsg);
            return;
        }
    });

    licenseFileStream.on('close', function(data) {
        var out;
        if (script) {
            out = exec(script);
        } else {
            out = exec(scriptDir + '/01-* --license-file ' + fileLocation);
        }
        out.stdout.on('data', function(data) {
            if (data.indexOf("SUCCESS") > -1) {
                retMsg = {"status": httpStatus.OK, "verified": true};
                xcConsole.log("Success: Check License");
                // deferredOut.resolve(retMsg);
            } else if (data.indexOf("FAILURE") > -1) {
                retMsg = {"status": httpStatus.OK, "verified": false};
                xcConsole.log("Failure: Check License");
                // deferredOut.reject(retMsg);
            }
        });
        out.stdout.on('close', function(data) {
            if (retMsg && retMsg.hasOwnProperty("verified") && retMsg.verified) {
                // Only resolve when verified is true
                deferredOut.resolve(retMsg);
            } else {
                // This can be: 1. verified is false.
                // 2. For test case when data does not contain SUCCESS or FAILURE
                deferredOut.reject(retMsg);
            }
        });
    });

    return deferredOut.promise();
}

function copyFiles(script) {
    var deferredOut = jQuery.Deferred();
    var execString = scriptDir + "/deploy-shared-config.sh ";
    execString += cliArguments;
    xcConsole.log(execString);
    var out;
    if (script) {
        out = exec(script);
    } else {
        out = exec(execString);
    }
    out.stdout.on('data', function(data) {
        xcConsole.log(data);
    });
    var errorMessage = "ERROR: ";
    out.stderr.on('data', function(data) {
        errorMessage += data;
        xcConsole.log("ERROR: " + data);
    });
    out.on('close', function(code) {
        var retMsg;
        if (code) {
            xcConsole.log("Failure: Copy files.");
            retMsg = {
                "status": httpStatus.InternalServerError,
                "reason": errorMessage
            };
            deferredOut.reject(retMsg);
        } else {
            retMsg = {"status": httpStatus.OK};
            deferredOut.resolve(retMsg);
        }
    });
    return deferredOut.promise();
}

function installUpgradeUtil(credArray, execCommand, script) {
    // Write files to /config and chmod
    var deferredOut = jQuery.Deferred();
    var hostArray = credArray.hostnames;
    var hasPrivHosts = false;
    clearErrorLog();

    function initialStep() {
        var deferred = jQuery.Deferred();
        if ("password" in credArray.credentials) {
            var password = credArray.credentials.password;
            fs.writeFile(credentialLocation, password,
                         {mode: parseInt('600', 8)},
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             deferred.resolve();
                         });
        } else if ("sshKey" in credArray.credentials) {
            var sshkey = credArray.credentials.sshKey;
            fs.writeFile(credentialLocation, sshkey,
                         {mode: parseInt('600', 8)},
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             deferred.resolve();
                         });
        } else {  // when it contains sshUserSettings
            deferred.resolve();
        }
        return deferred.promise();
    }

    initialStep()
    .then(function() {
        var deferred = jQuery.Deferred();
        fs.writeFile(hostnameLocation, hostArray.join("\n"), function(err) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve();
        });
        return deferred.promise();
    })
    .then(function() {
        var deferred = jQuery.Deferred();
        if (credArray.privHostNames.length > 0) {
            fs.writeFile(privHostnameLocation,
                         credArray.privHostNames.join("\n"),
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             hasPrivHosts = true;
                             deferred.resolve();
                         });
        } else {
            fs.writeFile(privHostnameLocation, credArray.hostnames.join("\n"),
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             hasPrivHosts = true;
                             deferred.resolve();
                         });
        }
        return deferred.promise();
    })
    .then(function() {
        var deferred = jQuery.Deferred();
        fs.writeFile(ldapLocation, JSON.stringify(credArray.ldap, null, 4),
                     function(err) {
                         if (err) {
                             deferred.reject(err);
                             return;
                         }
                         deferred.resolve();
                     });
        return deferred.promise();
    })
    .then(function() {
        var deferred = jQuery.Deferred();
        var execString = scriptDir + "/" + execCommand;
        cliArguments = genExecString({
            "hasPrivHosts": hasPrivHosts,
            "credArray": credArray
        });

        execString += cliArguments;
        initStepArray();
        var out;
        if (script) {
            out = exec(script);
        } else {
            out = exec(execString);
        }

        out.stdout.on('data', stdOutCallback);
        out.stderr.on('data', stdErrCallback);

        out.on('close', function(code) {
            // Exit code. When we fail, we return non 0
            if (code) {
                xcConsole.log("Failure: Executing " + execString +
                  " fails. " + errorLog);
                curStep.curStepStatus = installStatus.Error;
                deferred.reject();
            } else {
                curStep.curStepStatus = installStatus.Done;
                deferred.resolve();
            }
        });
        return deferred.promise();
    })
    .then(function() {
        deferredOut.resolve();
    })
    .fail(function(err) {
        xcConsole.log("Failure: Xcalar installation fails. " + err);
        curStep.curStepStatus = installStatus.Error;
        deferredOut.reject(err);
    });
    return deferredOut.promise();
}

function discoverUtil(credArray, execCommand, script) {
    // Write files to /config and chmod
    var deferredOut = jQuery.Deferred();
    var hostArray = credArray.hostnames;
    var hasPrivHosts = false;
    var retMsg = {};
    clearErrorLog();

    function initialStep() {
        var deferred = jQuery.Deferred();
        if ("password" in credArray.credentials) {
            var password = credArray.credentials.password;
            fs.writeFile(credentialLocation, password,
                         {mode: parseInt('600', 8)},
                         function(err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            deferred.resolve();
                         });
        } else if ("sshKey" in credArray.credentials) {
            var sshkey = credArray.credentials.sshKey;
            fs.writeFile(credentialLocation, sshkey,
                         {mode: parseInt('600', 8)},
                         function(err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            deferred.resolve();
                         });
        } else {  // when it contains sshUserSettings
            deferred.resolve();
        }
        return deferred.promise();
    }

    initialStep()
    .then(function() {
        var deferred = jQuery.Deferred();
        fs.writeFile(hostnameLocation, hostArray.join("\n"), function(err) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve();
        });
        return deferred.promise();
    })
    .then(function() {
        var deferred = jQuery.Deferred();
        var execString = scriptDir + "/" + execCommand;
        cliArguments = genExecString({
            "hasPrivHosts": hasPrivHosts,
            "credArray": credArray
        });
        execString += cliArguments;
        initStepArray();
        var out;
        if (script) {
            out = exec(script);
        } else {
            out = exec(execString);
        }

        out.stdout.on('data', stdOutCallback);
        out.stderr.on('data', stdErrCallback);

        out.on('close', function(code) {
            // Exit code. When we fail, we return non 0
            if (code) {
                xcConsole.log("Failure: Executing " + execString +
                              " fails. " + errorLog);
                deferred.reject(code);
            } else {
                fs.readFile(discoveryResultLocation, "utf8", function(err, data) {
                    if (err) deferred.reject(err);
                    var discoveryResult=JSON.parse(data.replace(/\n$/, ''));
                    deferred.resolve(discoveryResult);
                });
            }
        });
        return deferred.promise();
    })
    .fail(function(err) {
        xcConsole.log("Failure: Xcalar discovery failed with return code: " + err);
        support.slaveExecuteAction("GET", "/installationLogs/slave",
            {isHTTP: "true"})
        .always(function(message) {
            retMsg = {
                "status": httpStatus.InternalServerError,
                "errorLog": errorLog, // the error message by script running
                "installationLogs": message.logs // all installation logs
            };
            deferredOut.reject(retMsg);
        });
    })
    .done(function(discoveryResult) {
        xcConsole.log("Success: Xcalar discovery succeeded.");
        deferredOut.resolve(discoveryResult);
    });

    return deferredOut.promise();
}

function installXcalar(credArray) {
    installUpgradeUtil(credArray, "cluster-install.sh");
}

function upgradeXcalar(credArray) {
    installUpgradeUtil(credArray, "cluster-upgrade.sh");
}

function uninstallXcalar(credArray) {
    installUpgradeUtil(credArray, "cluster-uninstall.sh");
}

function discoverXcalar(credArray) {
    return discoverUtil(credArray, "cluster-discover.sh");
}

router.post('/xdp/license/verification', function(req, res) {
    xcConsole.log("Checking License");
    var credArray = req.body;
    checkLicense(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/installation/status", function(req, res) {
    xcConsole.log("Checking Install Status");
    var credArray = req.body;
    createStatusArray(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/installation/start", function(req, res) {
    xcConsole.log("Installing Xcalar");
    var credArray = req.body;
    installXcalar(credArray);
    // Immediately ack after starting
    res.send({"status": httpStatus.OK});
    xcConsole.log("Immediately acking runInstaller");
});


router.post("/xdp/discover", function(req, res) {
    xcConsole.log("Discovering Xcalar");
    var credArray = req.body;
    var copied = JSON.parse(JSON.stringify(credArray));
    delete copied.credentials;
    xcConsole.log(JSON.stringify(copied));
    discoverXcalar(credArray)
    .fail(function (message) {
        res.status(message.status).send(message);
    })
    .done(function (discoveryResult) {
        msg = {
            "status": httpStatus.OK,
            "discoverResult": discoveryResult
        };
        res.status(msg.status).send(msg);
    });
});

router.post("/xdp/upgrade/status", function(req, res) {
    xcConsole.log("Checking Upgrade Status");
    var credArray = req.body;
    createStatusArray(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/upgrade/start", function(req, res) {
    xcConsole.log("Upgrading Xcalar");
    var credArray = req.body;
    upgradeXcalar(credArray);
    // Immediately ack after starting
    res.send({"status": httpStatus.OK});
    xcConsole.log("Immediately acking runInstaller");
});

router.post("/xdp/uninstallation/status", function(req, res) {
    xcConsole.log("Checking Uninstall Status");
    var credArray = req.body;
    createStatusArray(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/uninstallation/start", function(req, res) {
    xcConsole.log("Uninstalling Xcalar");
    var credArray = req.body;
    uninstallXcalar(credArray);
    // Immediately ack after starting
    res.send({"status": httpStatus.OK});
    xcConsole.log("Immediately acking runInstaller");
});

router.post("/xdp/installation/cancel", function(req, res) {
    xcConsole.log("Cancelled installation");
    res.send({"status": httpStatus.OK});
});

router.get("/installationLogs/slave", function(req, res) {
    xcConsole.log("Fetching Installation Logs as Slave");
    support.slaveExecuteAction("GET", "/installationLogs/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

// Below part is only for Unit Test
function getCurStepStatus() {
    return curStep.curStepStatus;
}
function setTestVariables(opts) {
    if (opts.hostnameLocation) {
        hostnameLocation = opts.hostnameLocation;
    }
    if (opts.privHostnameLocation) {
        privHostnameLocation = opts.privHostnameLocation;
    }
    if (opts.ldapLocation) {
        ldapLocation = opts.ldapLocation;
    }
    if (opts.discoveryResultLocation) {
        discoveryResultLocation = opts.discoveryResultLocation;
    }
    if (opts.licenseLocation) {
        licenseLocation = opts.licenseLocation;
    }
    if (opts.credentialLocation) {
        credentialLocation = opts.credentialLocation;
    }
}
function fakeCheckLicense(func) {
    checkLicense = func;
}
function fakeInstallUpgradeUtil(func) {
    installUpgradeUtil = func;
}
function fakeDiscoverUtil(func) {
    discoverUtil = func;
}
function fakeCreateStatusArray(func) {
    createStatusArray = func;
}
function fakeSlaveExecuteAction(func) {
    support.slaveExecuteAction = func;
}
if (process.env.NODE_ENV === "test") {
    exports.genExecString = genExecString;
    exports.encryptPassword = encryptPassword;
    exports.genDiscoverExecString = genDiscoverExecString;
    exports.createStatusArray = createStatusArray;
    exports.checkLicense = checkLicense;
    exports.copyFiles = copyFiles;
    exports.installUpgradeUtil = installUpgradeUtil;
    exports.discoverUtil = discoverUtil;
    exports.getCurStepStatus = getCurStepStatus;
    exports.setTestVariables = setTestVariables;
    // Fake functions
    exports.fakeCheckLicense = fakeCheckLicense;
    exports.fakeInstallUpgradeUtil = fakeInstallUpgradeUtil;
    exports.fakeDiscoverUtil = fakeDiscoverUtil;
    exports.fakeCreateStatusArray = fakeCreateStatusArray;
    exports.fakeSlaveExecuteAction = fakeSlaveExecuteAction;
}
exports.router = router;
