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
    var bodyParser = require('body-parser');
    var fs = require('fs');
    var http = require('http');
    var https = require("https");
    require('shelljs/global');
    var ldap = require('ldapjs');
    var exec = require('child_process').exec;
    try {
        var AWS = require('aws-sdk');
        var guiDir = "/var/www/xcalar-gui";
        if (fs.existsSync("./awsWriteConfig.json")) {
            AWS.config.loadFromPath(guiDir + "/services/expServer/awsWriteConfig.json");
        } else {
            AWS.config.loadFromPath(guiDir + "/services/expServer/awsReadConfig.json");
        }
        var s3 = new AWS.S3();
    } catch(error) {
        console.log(error);
        console.log("Fail to set up AWS!");
    }

    var socket = require('./socket');
    var tail = require('./tail');
    var support = require('./support');
    var login = require('./expLogin');
    var upload = require('./upload');
    var Status = require('./supportStatusFile').Status;
    var httpStatus = require('./../../assets/js/httpStatus.js').httpStatus;

    var basePath = "/var/www/xcalar-gui/assets/extensions/";

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
                           username, port, nfsOption) {
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

    function convertToBase64(logs) {
        return new Buffer(logs).toString('base64');
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
        fs.writeFile(fileLocation, credArray.licenseKey, function(err) {
            if (err) {
                console.log(err);
                res.send({"status": Status.Error});
                return;
            }
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
    });

    app.post("/runInstaller", function(req, res) {
        console.log("Executing Installer");
        var credArray = req.body;
        var hasError = false;
        var errors = [];

        // Write files to /config and chmod

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
        })
        .fail(function(err) {
            console.log(err);
            curStep.status = Status.Error;
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

    // Single node commands
    app.delete("/sessionFiles", function(req, res) {
        console.log("Remove Session Files");
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
        console.log("Remove Files under folder SHM");
        support.removeSHM()
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/license", function(req, res) {
        console.log("Get License");
        support.getLicense()
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.post("/ticket", function(req, res) {
        console.log("File Ticket");
        var contents = req.body.contents;
        support.submitTicket(contents)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    // Master request
    app.post("/service/start", function(req, res) {
        console.log("Start Xcalar Services as Master");
        support.masterExecuteAction("POST", "/service/start/slave", req.body)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.post("/service/stop", function(req, res) {
        console.log("Stop Xcalar Service as Master");
        support.masterExecuteAction("POST", "/service/stop/slave", req.body)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    // We call stop and then start instead of restart because xcalar service restart
    // restarts each node individually rather than the nodes as a cluster. This causes
    // the generation count on the nodes to be different.
    app.post("/service/restart", function(req, res) {
        console.log("Restart Xcalar Services as Master");
        var message1;
        var message2;
        function stop() {
            var deferred = jQuery.Deferred();
            support.masterExecuteAction("POST", "/service/stop/slave", req.body)
            .always(deferred.resolve);
            return deferred;
        }
        stop()
        .then(function(ret) {
            var deferred = jQuery.Deferred();
            message1 = ret;
            support.masterExecuteAction("POST", "/service/start/slave", req.body)
            .always(deferred.resolve);
            return deferred;
        })
        .then(function(ret) {
            var deferred = jQuery.Deferred();
            message2 = ret;
            message2.logs = message1.logs + message2.logs;
            return deferred.resolve().promise();
        })
        .then(function(ret) {
            if (message2.logs) {
                message2.logs = convertToBase64(message2.logs);
            }
            res.status(message2.status).send(message2);
        });
    });

    app.get("/service/status", function(req, res) {
        console.log("Show Xcalar Services status as Master");
        // req.query for Ajax, req.body for sennRequest
        support.masterExecuteAction("GET", "/service/status/slave", req.query)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/logs", function(req, res) {
        console.log("Fetch Recent Logs as Master");
        support.masterExecuteAction("GET", "/logs/slave", req.query)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    // Slave request
    app.post("/service/start/slave", function(req, res) {
        console.log("Start Xcalar Services as Slave");
        support.slaveExecuteAction("POST", "/service/start/slave")
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.post("/service/stop/slave", function(req, res) {
        console.log("Stop Xcalar Services as Slave");
        support.slaveExecuteAction("POST", "/service/stop/slave")
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.get("/service/status/slave", function(req, res) {
        console.log("Show Xcalar Services status as Slave");
        support.slaveExecuteAction("GET", "/service/status/slave")
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.get("/logs/slave", function(req, res) {
        console.log("Fetch Recent Logs as Slave");
        support.slaveExecuteAction("GET", "/logs/slave", req.body)
        .always(function(message) {
            res.status(message.status).send(message);
        });
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
            fs.writeFile(file, JSON.stringify(credArray, null, 4), function(err) {
                if (err) {
                    console.log(err);
                    res.send({"status": Status.Error,
                              "reason": JSON.stringify(err)});
                    return;
                }
                copyFiles(res);
            });
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

    app.post("/uploadExtension", function(req, res) {
        var tarFile = req.body.targz;
        writeTarGzWithCleanup({status: Status.Ok,
                               data: req.body.targz},
                               req.body.name, "0.0.1")
        .then(function() {
            return enableExtension(req.body.name);
        })
        .then(function() {
            res.jsonp({status:Status.Ok});
        })
        .fail(function(err) {
            console.log("Error: " + err);
            res.jsonp({status: Status.Error,
                       error: err});
        });
    });

    function writeTarGzWithCleanup(ret, name, version) {
        function writeTarGz(retStruct) {
            var innerDeferred = jQuery.Deferred();
            try {
                if (retStruct.status !== Status.Ok) {
                    return innerDeferred.reject(retStruct);
                }
            } catch(e) {
                return innerDeferred.reject(ret);
            }

            xcConsole.log(retStruct.data.length);

            var zipFile = new Buffer(retStruct.data, 'base64');
            var zipPath = basePath + "ext-available/" + name + "-" + version +
                          ".tar.gz";
            xcConsole.log(zipPath);
            fs.writeFile(basePath + "ext-available/" + name + "-" + version +
                         ".tar.gz", zipFile, function(error) {
                if (error) {
                    innerDeferred.reject(error);
                }
                xcConsole.log("Writing");
                var out = exec("tar -zxf " + zipPath + " -C " + basePath +
                               "ext-available/");
                out.on('close', function(code) {
                    if (code) {
                        innerDeferred.reject(code);
                    } else {
                        innerDeferred.resolve();
                    }
                });
            });
            return innerDeferred.promise();
        }

        var deferred = jQuery.Deferred();
        writeTarGz(ret)
        .then(function() {
            // Remove the tar.gz
            fs.unlink(basePath + "ext-available/" + name + "-" + version +
                      ".tar.gz", function(err) {
                        // regardless of status, this is a successful install.
                        // we simply console log if the deletion went wrong.
                if (err) {
                    console.log("Deletion of .tar.gz failed: " + err);
                }
                deferred.resolve();
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    app.post("/downloadExtension", function(req, res) {
        if (!s3) {
            return res.jsonp({status: Status.Error,
                              logs: "s3 package not setup correctly!"});
        }
        var download = function(appName, version) {
            var deferred = jQuery.Deferred();
            var params = {
                Bucket: 'marketplace.xcalar.com', /* required */
                Key: 'extensions/' + appName + "/" + version + "/" + appName +
                     '-' + version + '.tar.gz'
            };
            s3.getObject(params, function(err, data) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    deferred.resolve({status: Status.Ok,
                                      data: data.Body.toString('base64')});
                }
            });
            return deferred.promise();
        };

        xcConsole.log("Download Package");
        var pkg = req.body;
        xcConsole.log(pkg);
        var url = "/marketplace/download?name=" + pkg.name + "&version=" +
                  pkg.version;

        download(pkg.name, pkg.version)
        .then(function(ret) {
            writeTarGzWithCleanup(ret, pkg.name, pkg.version);
        })
        .then(function() {
            res.jsonp({status: Status.Ok});
        })
        .fail(function() {
            xcConsole.log("Failed: "+arguments);
            res.jsonp({status: Status.Error,
                       logs: JSON.stringify(arguments)});
        });
    });

    // type == "enabled" || type == "available"
    function getExtensionFiles(extName, type) {
        var deferred = jQuery.Deferred();
        fs.readdir(basePath + "ext-" + type + "/", function(err, files) {
            var extFiles = [];
            if (err) {
                deferred.reject(err);
            }
            for (var i = 0; i < files.length; i++) {
                if (extName === "") {
                    extFiles.push(files[i]);
                } else {
                    if (files[i].indexOf(extName + ".ext") === 0) {
                        extFiles.push(files[i]);
                    }
                }
            }
            deferred.resolve(extFiles);
        });
        return deferred.promise();
    }

    app.post("/removeExtension", function(req, res) {
        var extName = req.body.name;
        console.log("Removing extension: " + extName);

        getExtensionFiles(extName, "enabled")
        .then(function(files) {
            if (files.length > 0) {
                return jQuery.Deferred().reject("Must disable extension first");
            } else {
                return getExtensionFiles(extName, "available");
            }
        })
        .then(function(files) {
            var deferred = jQuery.Deferred();
            if (files.length === 0) {
                return deferred.reject("Extension does not exist");
            }
            // Remove all the files (symlinks are removed during disable)
            var str = "";
            for (var i = 0; i < files.length; i++) {
                str += "rm " + basePath + "ext-available/" + files[i] + ";";
            }
            var out = exec(str);
            out.on("close", function(code) {
                if (code) {
                    deferred.reject(code);
                } else {
                    deferred.resolve();
                }
            });
            return deferred.promise();
        })
        .then(function() {
            res.jsonp({status: Status.Ok});
        })
        .fail(function(err) {
            console.log("remove extension failed with error: " + err);
            res.jsonp({status: Status.Error,
                       error: err});
        });
    });

    function enableExtension(extName) {
        var deferred = jQuery.Deferred();
        var filesToEnable = [];
        // List files in ext-available
        getExtensionFiles(extName, "available")
        .then(function(files) {
            filesToEnable = files;
            if (filesToEnable.length === 0) {
                return jQuery.Deferred().reject("No such extension found in " +
                                                "ext-available.");
            }
            return getExtensionFiles(extName, "enabled");
        })
        .then(function(files) {
            var filesRemaining = [];
            // Check whether the extension is already enabled
            for (var i = 0; i < filesToEnable.length; i++) {
                if (files.indexOf(filesToEnable[i]) === -1) {
                    filesRemaining.push(filesToEnable[i]);
                }
            }
            if (filesRemaining.length === 0) {
                return deferred.reject("Extension already enabled");
            }
            // Create symlinks in the ext-enabled folder
            var str = "";
            for (var i = 0; i < filesRemaining.length; i++) {
                str += "ln -s " + "../ext-available/" + filesRemaining[i] +
                      " " + basePath + "ext-enabled/" + filesRemaining[i] + ";";
            }
            console.log(str);
            var out = exec(str);
            out.on('close', function(code) {
                if (code) {
                    deferred.reject(code);
                } else {
                    deferred.resolve();
                }
            });
        });
        return deferred.promise();
    }

    app.post("/enableExtension", function(req, res) {
        var extName = req.body.name;
        console.log("Enabling extension: " + extName);

        enableExtension(extName)
        .then(function() {
            res.jsonp({status:Status.Ok});
        })
        .fail(function(err) {
            console.log("Error: " + err);
            res.jsonp({status:Status.Error,
                       error: err});
        });

    });

    app.post("/disableExtension", function(req, res) {
        var extName = req.body.name;
        console.log("Disabling extension: " + extName);

        getExtensionFiles(extName, "enabled")
        .then(function(files) {
            console.log(files);
            var deferred = jQuery.Deferred();
            var toRemove = [];
            for (var i = 0; i < files.length; i++) {
                if (files[i].indexOf(extName + ".ext") === 0) {
                    toRemove.push(files[i]);
                }
            }
            if (toRemove.length === 0) {
                return deferred.reject("Extension was not enabled");
            }
            var str = "";
            for (var i = 0; i < toRemove.length; i++) {
                str += "rm " + basePath + "ext-enabled/" + toRemove[i] + ";";
            }
            var out = exec(str);
            out.on('close', function(code) {
                if (code) {
                    deferred.reject(code);
                } else {
                    deferred.resolve();
                }
            });
            return deferred.promise();
        })
        .then(function() {
            res.jsonp({status: Status.Ok});
        })
        .fail(function(err) {
            res.jsonp({status: Status.Error,
                       error: err});
        });
    });

    app.post("/getAvailableExtension", function(req, res) {
        console.log("Getting available extensions");
        getExtensionFiles("", "available")
        .then(function(files) {
            var fileObj = {};
            for (var i = 0; i < files.length; i++) {
                if (files[i].indexOf(".ext.js") === -1 &&
                    files[i].indexOf(".ext.py") === -1) {
                    continue;
                }
                fileObj[files[i].substr(0, files[i].length - 7)] = true;
            }
            res.jsonp({status: Status.Ok,
                       extensionsAvailable: Object.keys(fileObj)});
        })
        .fail(function(err) {
            res.jsonp({status: Status.Error,
                       error: err});
        });
    });

    app.post("/getEnabledExtensions", function(req, res) {
        console.log("Getting installed extensions");
        fs.readdir(basePath + "ext-enabled/", function(err, allNames) {
            if (err) {
                res.jsonp({status: Status.Error,
                           log: JSON.stringify(err)});
                return;
            }
            var htmlString = '<html>\n' +
                                '<head>\n';
            allNames.forEach(function(name) {
                if (name.indexOf(".ext.js") === name.length - ".ext.js".length) {
                    htmlString += '    <script src="assets/extensions/ext-enabled/'+
                                  name + '" type="text/javascript"></script>\n';
                }
            });
            htmlString += '  </head>\n' +
                          '  <body>\n' +
                          '  </body>\n' +
                          '</html>';
            res.jsonp({status: Status.Ok,
                       data: htmlString});
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

    app.post("/listPackage", function(req, res) {
        if (!s3) {
            return res.jsonp({status: Status.Error,
                              logs: "s3 package not setup correctly!"});
        }
        var fetchAllApps = function() {
            var deferredOnFetch = jQuery.Deferred();

            var processItem = function(res, fileName) {
                var deferredOnProcessItem = jQuery.Deferred();
                var get = function(file) {
                    var deferredOnGetFile = jQuery.Deferred();
                    var params = {
                        Bucket: 'marketplace.xcalar.com', /* required */
                        Key: file
                    };
                    s3.getObject(params, function(err, data) {
                        if (err) {
                            deferredOnGetFile.reject(err);
                        }
                        else {
                            deferredOnGetFile.resolve(data.Body.toString('utf8'));
                        }
                    });
                    return deferredOnGetFile.promise();
                };
                if (fileName.endsWith(".txt")) {
                    get(fileName)
                    .then(function(data) {
                        res.push(JSON.parse(data));
                        deferredOnProcessItem.resolve();
                    })
                    .fail(function(err) {
                        deferredOnProcessItem.reject(err);
                    });
                } else {
                    deferredOnProcessItem.resolve();
                }
                return deferredOnProcessItem.promise();
            };

            var params = {
                Bucket: 'marketplace.xcalar.com', /* required */
                Prefix: 'extensions/'
            };
            var processItemsDeferred = [];
            s3.listObjects(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                    deferredOnFetch.reject(err);
                }
                else {
                    var res = [];
                    var items = data.Contents;
                    var pending = items.length;
                    items.forEach(function(item) {
                        fileName = item.Key;
                        processItemsDeferred.push(processItem(res, fileName));
                    });
                    jQuery.when.apply(jQuery, processItemsDeferred)
                    .then(function() {
                        deferredOnFetch.resolve(res);
                    })
                    .fail(function(err) {
                        deferredOnFetch.reject(err);
                    });
                }
            });
            return deferredOnFetch.promise();
        };
        fetchAllApps()
        .then(function(data) {
            return res.send(data);
        })
        .fail(function(err) {
            return res.send({"status": Status.Error, "logs": error});
        });
    });

    /*
    Right /uploadContent is implemented in a really clumsy way.
    Will fix in the next version.
    */
    app.post("/uploadContent", function(req, res) {
        upload.uploadContent(req, res);
    });

    app.post("/uploadMeta", function(req, res) {
        upload.uploadMeta(req, res);
    });

    app.post('/getTimezoneOffset', function(req, res) {
        var timezoneOffset = new Date().getTimezoneOffset();
        console.log("Server timezone offset: " + timezoneOffset);
        res.send(timezoneOffset);
    });

    function getOperatingSystem() {
        var deferred = jQuery.Deferred();
        var out = exec("cat /etc/*release");
        var output = "";
        out.stdout.on('data', function(data) {
            output += data;
        });
        out.stderr.on('data', function(err) {
            console.log("Get OS information failed!" + err);
            deferred.reject(output);
        });
        out.on('close', function(code) {
            if (code) {
                console.log("Get OS information failed!" + code);
                deferred.reject(output);
            } else {
                deferred.resolve(output);
            }
        });
        return deferred.promise();
    }

    getOperatingSystem()
    .always(function(data) {
        data = data.toLowerCase();
        var ca = '';
        if (data.indexOf("centos") > -1) {
            console.log("CentOS System");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("ubuntu") > -1) {
            console.log("Ubuntu System");
            ca = '/etc/ssl/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("ret hat") > -1 || data.indexOf("rethat") > -1) {
            console.log("RHEL System");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("oracle linux") > -1) {
            console.log("Oracle Linux System");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (ca !== '' && fs.existsSync(ca)) {
            console.log('loading trusted certificates from ' + ca);
            try {
                require('ssl-root-cas').addFile(ca).inject();
                console.log("Load CA successfully!");
            } catch (e) {
                console.log("Fail to load ca: " + ca + " !" +
                    "https will not be enabled!");
            }
        } else {
            console.log('Xcalar trusted certificate not found');
        }

        var httpServer = http.createServer(app);
        socket(httpServer);
        var port = 12124;
        httpServer.listen(port, function() {
            var hostname = process.env.DEPLOY_HOST;
            if (!hostname) {
                hostname = "localhost";
            }
            console.log("All ready");
        });
    });
});