var cp = require("child_process");
var fs = require("fs");
var os = require("os");
var path = require("path");
var timer = require("timers");
var http = require("http");
var https = require("https");

var ssf = require("./supportStatusFile.js");
var tail = require("./tail");
var xcConsole = require('./expServerXcConsole.js').xcConsole;

var Status = ssf.Status;
var httpStatus = require("../../assets/js/httpStatus.js").httpStatus;

var jQuery;
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});

var defaultHostsFile = "/etc/xcalar/default.cfg";

var defaultXcalarctl = process.env.XLRDIR ?
    process.env.XLRDIR + "/bin/xcalarctl" : "/opt/xcalar/bin/xcalarctl";
var defaultHttpPort = process.env.XCE_HTTP_PORT ?
    process.env.XCE_HTTP_PORT : 80;
var defaultHttpsPort = process.env.XCE_HTTPS_PORT ?
    process.env.XCE_HTTPS_PORT : 443;
// we need to fix this eventually, but for now ignore untrusted certs
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
var defaultStartCommand = defaultXcalarctl + " start";
var defaultStopCommand = defaultXcalarctl + " stop";
var defaultStatusCommand = defaultXcalarctl + " status";

var logPath = "/var/log/Xcalar.log";

var bufferSize = 1024 * 1024;
var gMaxLogs = 500;

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

// Get all the Hosts from file
function readHostsFromFile(hostFile) {
    var deferred = jQuery.Deferred();
    var hosts = [];

    fs.readFile(hostFile, "utf8", function(err, hostData) {
        if (err) {
            return deferred.reject(err);
        }
        var tempHosts = hostData.split("\n");
        for (var i = 0; i < tempHosts.length; i++) {
            var str = tempHosts[i].trim();
            var re = /Node\.([0-9]+)\.IpAddr=(.*)/g;
            var matches = re.exec(str);
            if (matches && matches.length >= 3) {
                hosts.push(matches[2]);
            }
        }
        deferred.resolve(hosts);
    });
    return deferred.promise();
}

function masterExecuteAction(action, slaveUrl, content) {
    var deferredOut = jQuery.Deferred();
    function readHosts() {
        var deferred = jQuery.Deferred();
        var hostFile = process.env.XCE_CONFIG ?
                        process.env.XCE_CONFIG : defaultHostsFile;
        readHostsFromFile(hostFile)
        .then(function(hosts) {
            deferred.resolve(hosts);
        })
        .fail(function(err) {
            var retMsg = {
                // No matter what error happens, the master
                // should return return a 404 uniformly
                "status": httpStatus.NotFound,
                "logs": JSON.stringify(err)
            };
            deferred.reject(retMsg);
        });
        return deferred.promise();
    }

    readHosts()
    .then(function(hosts) {
        var deferred = jQuery.Deferred();
        var retMsg;
        var logs;
        sendCommandToSlaves(action, slaveUrl, content, hosts)
        .then(function(results) {
            logs = generateLogs(action, slaveUrl, results);
            retMsg = {
                // If every child node return with status 200, then master should
                // return a 200 code
                "status": httpStatus.OK,
                "logs": logs
            };
            if (slaveUrl === "/service/logs/slave" && action === "GET" &&
                content.isMonitoring === "true") {
                retMsg.updatedLastMonitorMap = generateLastMonitorMap(results);
            }
            deferred.resolve(retMsg);
        })
        .fail(function(results) {
            logs = generateLogs(action, slaveUrl, results);
            retMsg = {
                // If some child nodes do not return with status 200, then master
                // should return return a 404 uniformly
                "status": httpStatus.NotFound,
                "logs": logs
            };
            if (slaveUrl === "/service/logs/slave" && action === "GET" &&
                content.isMonitoring === "true") {
                retMsg.updatedLastMonitorMap = generateLastMonitorMap(results);
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
            return readInstallerLog();
        default:
            xcConsole.log("Should not be here!");
    }
}

function sendCommandToSlaves(action, slaveUrl, content, hosts) {
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
            console.error(error);
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

// Remove session files
function removeSessionFiles(filePath) {
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
        lines += data;
        var result;
        result = {"status": httpStatus.InternalServerError,
            "logs": lines};
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
function getXlrRoot() {
    var cfgLocation =  process.env.XCE_CONFIG ?
        process.env.XCE_CONFIG : defaultHostsFile;
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
    getXlrRoot()
    .then(function(location) {
        var licenseLocation = location + "/config/license.txt";
        fs.readFile(licenseLocation, 'utf8', function(err, data) {
            var retMsg;
            try {
                var license = data;
                retMsg = {"status": httpStatus.OK,
                    "logs": license};
                deferredOut.resolve(retMsg);
            } catch (error) {
                retMsg = {"status": httpStatus.BadRequest,
                    "error": error};
                deferredOut.reject(retMsg);
            }
        });
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
            xcConsole.log(data);
            deferredOut.resolve({
                "status": httpStatus.OK,
                "logs": JSON.stringify(data)
            });
        },
        error: function(err) {
            xcConsole.log(err);
            deferredOut.reject(err);
            return;
        }
    });
    return deferredOut.promise();
}

function hasLogFile(filePath) {
    var deferred = jQuery.Deferred();
    fs.access(filePath, function(err) {
        if (!err) {
            deferred.resolve();
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

function readInstallerLog() {
    var deferred = jQuery.Deferred();
    fs.readFile('/tmp/xcalar/installer.log', 'utf8', function(err, data) {
        if (err) {
            retMsg = {
                "status": httpStatus.InternalServerError,
                "error": err
            };
            deferred.reject(retMsg);
        }
        retMsg = {
            "status": httpStatus.OK,
            "logs": data
        };
        deferred.resolve(retMsg);
    });
    return deferred.promise();
}

function unitTest() {
    exports.generateLogs = generateLogs;
    exports.isUnderBasePath = isUnderBasePath;
    exports.isComplete = isComplete;
    exports.readHostsFromFile = readHostsFromFile;
}

exports.getXlrRoot = getXlrRoot;
exports.getLicense = getLicense;
exports.submitTicket = submitTicket;
exports.removeSessionFiles = removeSessionFiles;
exports.slaveExecuteAction = slaveExecuteAction;
exports.masterExecuteAction = masterExecuteAction;
exports.readHostsFromFile = readHostsFromFile;
exports.removeSHM = removeSHM;
exports.hasLogFile = hasLogFile;
exports.unitTest = unitTest;