// This is the service that is run anywhere so most of the time there will be
// calls that aren't used

// Start of generic setup stuff
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
    var socket = require('./socket.js');
    var support = require('./expServerSupport.js');
    var xcConsole = require('./expServerXcConsole.js').xcConsole;
    var login = require('./expLogin.js');
    var upload = require('./upload.js');
    var Status = require('./supportStatusFile.js').Status;
    var httpStatus = require('../../assets/js/httpStatus.js').httpStatus;
    var serverPort = process.env.XCE_EXP_PORT ?
    process.env.XCE_EXP_PORT : 12124;

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

    // End of generic setup stuff

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
    var errorLog = "";

    function initStepArray() {
        curStep = {
            "stepString": "Step [0] Starting...",
            "nodesCompletedCurrent": [],
            "status": Status.Running,
        };
    }

    function genExecString(hostnameLocation, hasPrivHosts,
     credentialLocation, isPassword,
     username, port, nfsOption,
     installationDirectory) {
        var execString = " -h " + hostnameLocation;
        execString += " -l " + username;
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

        if (nfsOption) {
            // Xcalar to mount NFS
            if (nfsOption.nfsServer) {
                execString += " --nfs-host " + nfsOption.nfsServer;
                execString += " --nfs-folder " + nfsOption.nfsMountPoint;
                if (nfsOption.nfsUsername) {
                    execString += " --nfs-uid " + nfsOption.nfsUsername;
                }

                if (nfsOption.nfsGroup) {
                    execString += " --nfs-gid " + nfsOption.nfsGroup;
                }
            } else if (nfsOption.nfsReuse) {
                // Xcalar Root Already mounted
                execString += " --nfs-reuse " + nfsOption.nfsReuse;
            }
        }
        if (installationDirectory) {
            execString += " --install-dir " + installationDirectory;
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

    function createStatusArray(credArray) {
        var deferred = jQuery.Deferred();
        var ackArray = [];
        // Check global array that has been populated by prev step
        for (var i = 0; i<credArray.hostnames.length; i++) {
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
            support.masterExecuteAction("GET", "/installationLogs/slave",
                {isHTTP: "true"})
            .always(function(message) {
                retMsg = {
                    "status": httpStatus.OK,
                    "curStepStatus": curStep.curStepStatus,
                    "retVal": ackArray,
                    "errorLog": errorLog,
                    "installationLogs": message.logs
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

    function convertToBase64(logs) {
        return new Buffer(logs).toString('base64');
    }

    function stdErrCallback(dataBlock) {
        errorLog += dataBlock + "\n";
    }

    function checkLicense(credArray) {
        var deferredOut = jQuery.Deferred();
        var fileLocation = licenseLocation;
        fs.writeFile(fileLocation, credArray.licenseKey, function(err) {
            var retMsg;
            if (err) {
                retMsg = {"status": httpStatus.InternalServerError};
                deferredOut.reject(retMsg);
                return;
            }
            var out = exec(scriptDir + '/01-* --license-file ' + fileLocation);
            out.stdout.on('data', function(data) {
                if (data.indexOf("SUCCESS") > -1) {
                    retMsg = {"status": httpStatus.OK, "verified": true};
                    xcConsole.log("Success: Check License");
                    deferredOut.resolve(retMsg);
                } else if (data.indexOf("FAILURE") > -1) {
                    retMsg = {"status": httpStatus.OK, "verified": false};
                    xcConsole.log("Failure: Check License");
                    deferredOut.reject(retMsg);
                }
            });
        });
        return deferredOut.promise();
    }

    app.get('/xdp/license/verification', function(req, res) {
        xcConsole.log("Checking License");
        var credArray = req.query;
        checkLicense(credArray)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.get("/xdp/installation/status", function(req, res) {
        xcConsole.log("Checking Status");
        var credArray = req.query;
        createStatusArray(credArray)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.post("/xdp/installation/start", function(req, res) {
        xcConsole.log("Installing Xcalar");
        var credArray = req.body;
        installXcalar(credArray);
        // Immediately ack after starting
        res.send({"status": httpStatus.OK});
        xcConsole.log("Immediately acking runInstaller");
    });

    app.post("/xdp/installation/finish", function(req, res) {
        xcConsole.log("completed Installation");
        completeInstallation()
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.post("/xdp/installation/cancel", function(req, res) {
        xcConsole.log("Cancelled installation");
        res.send({"status": httpStatus.OK});
    });

    app.post("/ldap/installation", function(req, res) {
        xcConsole.log("Installing Ldap");
        var credArray = req.body;
        installLdap(credArray.domainName,
                    credArray.password,
                    credArray.companyName)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.put("/ldap/config", function(req, res) {
        xcConsole.log("Writing Ldap configurations");
        writeLdapConfig(req.body)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    function installLdap(domainName, password, companyName) {
        var deferredOut = jQuery.Deferred();
        var execString = scriptDir + "/ldap-install.sh ";
        execString += cliArguments; // Add all the previous stuff
        execString += genLdapExecString(domainName, password,companyName);
        out = exec(execString);

        var replied = false;
        out.stdout.on('data', function(data) {
            xcConsole.log(data);
        });
        var errorMessage = "ERROR: ";
        out.stderr.on('data', function(data) {
            errorMessage += data;
            xcConsole.log("Error: " + data);
        });

        out.on('close', function(code) {
            // Exit code. When we fail, we return non 0
            if (code) {
                xcConsole.log("Failure: " + code + " " + errorMessage);
                if (!replied) {
                    retMsg = {
                        "status": httpStatus.InternalServerError,
                        "logs": errorMessage
                    };
                    deferredOut.reject(retMsg);
                }
            } else {
                copyFiles()
                .always(function(message) {
                    deferredOut.resolve(message);
                });
            }
        });
        return deferredOut.promise();
    }

    function writeLdapConfig(credArray) {
        var deferredOut = jQuery.Deferred();
        try {
            fs.writeFileSync(ldapLocation, JSON.stringify(credArray, null, 4));
            copyFiles()
            .always(function(message) {
                deferredOut.resolve(message);
            });
        } catch (err) {
            xcConsole.log(err);
            var retMsg = {
                "status": httpStatus.InternalServerError,
                "logs": JSON.stringify(err)};
            deferredOut.reject(retMsg);
        }
        return deferredOut.promise();
    }

    function installXcalar(credArray) {
        // // Write files to /config and chmod
        var isPassword = true;
        var hostArray = credArray.hostnames;
        var hasPrivHosts = false;

        function initialStep() {
            var deferred = jQuery.Deferred();
            if ("password" in credArray.credentials) {
                var password = credArray.credentials.password;
                fs.writeFile(credentialLocation, password,
                    {mode: parseInt('600', 8)},function(err) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }
                        deferred.resolve();
                    });
            } else {
                isPassword = false;
                var sshkey = credArray.credentials.sshKey;
                fs.writeFile(credentialLocation, sshkey,
                    {mode: parseInt('600', 8)}, function(err) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }
                        deferred.resolve();
                    });
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
                fs.writeFile(privHostnameLocation,
                    credArray.hostnames.join("\n"),
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
            var execString = scriptDir + "/cluster-install.sh";
            cliArguments = genExecString(hostnameLocation, hasPrivHosts,
               credentialLocation,
               isPassword, credArray.username,
               credArray.port,
               credArray.nfsOption,
               credArray.installationDirectory);
            execString += cliArguments;
            initStepArray();

            out = exec(execString);

            out.stdout.on('data', stdOutCallback);
            out.stderr.on('data', stdErrCallback);

            out.on('close', function(code) {
                // Exit code. When we fail, we return non 0
                if (code) {
                    xcConsole.log("Failure: Executing " + execString +
                                  " fails. " + errorLog);
                    curStep.curStepStatus = installStatus.Error;
                } else {
                    curStep.curStepStatus = installStatus.Done;
                }
            });
        })
        .fail(function(err) {
            xcConsole.log("Failure: Xcalar installation fails. " + err);
            curStep.curStepStatus = installStatus.Error;
        });
    }

    // Single node commands
    app.delete("/sessionFiles", function(req, res) {
        xcConsole.log("Removing Session Files");
        var filename =  req.body.filename;
        support.removeSessionFiles(filename)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.delete("/SHMFiles", function(req, res) {
        xcConsole.log("Removing Files under folder SHM");
        support.removeSHM()
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/license", function(req, res) {
        xcConsole.log("Get License");
        support.getLicense()
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.post("/ticket", function(req, res) {
        xcConsole.log("File Ticket");
        var contents = req.body.contents;
        support.submitTicket(contents)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/logs", function(req, res) {
        xcConsole.log("Fetching Recent Logs as Master");
        support.masterExecuteAction("GET", "/logs/slave", req.query)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/logs/slave", function(req, res) {
        xcConsole.log("Fetching Recent Logs as Slave");
        support.slaveExecuteAction("GET", "/logs/slave", req.body)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.get("/installationLogs/slave", function(req, res) {
        xcConsole.log("Fetching Installation Logs as Slave");
        support.slaveExecuteAction("GET", "/installationLogs/slave")
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    function copyFiles() {
        var deferredOut = jQuery.Deferred();
        var execString = scriptDir + "/deploy-shared-config.sh ";
        execString += cliArguments;
        xcConsole.log(execString);
        out = exec(execString);
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
    // End of installer calls

    // Invoke the Service router
    app.use(require('./route/service.js'));

    // Invoke the Extension router
    app.use(require('./route/extension.js'));

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
        xcConsole.log("Login process");
        var credArray = req.body;
        login.loginAuthentication(credArray)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    /*
    Right /uploadContent is implemented in a really clumsy way.
    Will fix in the next version.
    */
    app.post("/uploadContent", function(req, res) {
        xcConsole.log("Uploading content");
        upload.uploadContent(req, res);
    });

    app.post('/getTimezoneOffset', function(req, res) {
        xcConsole.log("Getting Server Timezone Offset");
        var timezoneOffset = new Date().getTimezoneOffset();
        xcConsole.log("Server Timezone Offset: " + timezoneOffset);
        res.send({"offset": timezoneOffset});
    });

    function getOperatingSystem() {
        var deferred = jQuery.Deferred();
        var out = exec("cat /etc/*release");
        var output = "";
        out.stdout.on('data', function(data) {
            output += data;
        });
        out.stderr.on('data', function(err) {
            xcConsole.log("Failure: Get OS information " + err);
            deferred.reject(output);
        });
        out.on('close', function(code) {
            if (code) {
                xcConsole.log("Failure: Get OS information " + code);
                deferred.reject(output);
            } else {
                deferred.resolve(output);
            }
        });
        return deferred.promise();
    }

    function unitTest() {
        exports.genExecString = genExecString;
        exports.genLdapExecString = genLdapExecString;
        responseReplace();
        function responseReplace() {
            support.removeSessionFiles = fakeResponseRSF;
            support.removeSHM = fakeResponseSHM;
            support.getLicense = fakeResponseLicense;
            support.submitTicket = fakeResponseSubmitTicket;
            support.masterExecuteAction = fakeResponseMasterExecuteAction;
            support.slaveExecuteAction = fakeResponseSlaveExecuteAction;
            login.loginAuthentication = fakeResponseLogin;
            upload.uploadContent = fakeResponseUploadContent;
        }

        function fakeResponseRSF() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response remove Session Files!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseSHM() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response remove SHM Files!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseLicense() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response get License!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseSubmitTicket() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response submit Ticket!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseMasterExecuteAction(action, slaveUrl) {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Master: Fake response! " + slaveUrl
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseSlaveExecuteAction(action, slaveUrl) {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Slave: Fake response! " + slaveUrl
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseLogin() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response login!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseUploadContent(req, res) {
            res.send("Fake response uploadContent!");
        }
    }
    exports.unitTest = unitTest;

    getOperatingSystem()
    .always(function(data) {
        data = data.toLowerCase();
        var ca = '';
        if (data.indexOf("centos") > -1) {
            xcConsole.log("Operation System: CentOS");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("ubuntu") > -1) {
            xcConsole.log("Operation System: Ubuntu");
            ca = '/etc/ssl/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("red hat") > -1 || data.indexOf("redhat") > -1) {
            xcConsole.log("Operation System: RHEL");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("oracle linux") > -1) {
            xcConsole.log("Operation System: Oracle Linux");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (ca !== '' && fs.existsSync(ca)) {
            xcConsole.log('Loading trusted certificates from ' + ca);
            try {
                require('ssl-root-cas').addFile(ca).inject();
                xcConsole.log("Success: Loaded CA");
            } catch (e) {
                xcConsole.log("Failure: Loaded ca: " + ca + " !" +
                    "https will not be enabled!");
            }
        } else {
            xcConsole.log('Xcalar trusted certificate not found');
        }

        var httpServer = http.createServer(app);
        socket(httpServer);
        var port = serverPort;
        httpServer.listen(port, function() {
            var hostname = process.env.DEPLOY_HOST;
            if (!hostname) {
                hostname = "localhost";
            }
            xcConsole.log("All ready");
        });
    });
});
