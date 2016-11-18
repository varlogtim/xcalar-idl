var cp = require('child_process');
var lineReader = require('readline');
var fs = require('fs');
var os = require('os');
var path = require('path');

var ssf = require('./supportStatusFile');
var tail = require('./tail');
var Status = ssf.Status;

var jQuery;
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});

var hostFile = '/config/privHosts.txt';

var bufferSize = 1024 * 1024;
var gMaxLogs = 500;
var tailUsers = new Map();

// Get all the Hosts from file
function readHostsFromFile(hostFile) {
    var deferred = jQuery.Deferred();
    var hosts = [];
    var rl = lineReader.createInterface({
        input: fs.createReadStream(hostFile)
    });
    rl.on('line', function(line) {
        hosts.push(line);
    });

    rl.on('error', function(err) {
        return deferred.reject(err);
    });

    rl.on('close', function(line) {
        return deferred.resolve(hosts);
    });
    return deferred.promise();
}

function masterExecuteAction (action, res, str) {
    var slaveAction = action + "/slave";
    var xlrRootPromise = getXlrRoot();
    xlrRootPromise.always(function(xlrRoot) {
        readHostsFromFile(xlrRoot + hostFile)
        .then(function(hosts) {
            sendCommandToSlaves(slaveAction, str, hosts)
            .then(function(results) {
                var logs = generateLogs(action, results);
                if (logs) {
                    res.send({"status": Status.Ok,
                              "logs": new Buffer(logs).toString('base64')});
                } else {
                    res.send({"status": Status.Ok});
                }
            })
            .fail(function(results) {
                var logs = generateLogs(action, results);
                if (logs) {
                    res.send({"status": Status.Error,
                              "logs": new Buffer(logs).toString('base64')});
                } else {
                    res.send({"status": Status.Error});
                }
            });
        })
        .fail(function(err) {
            res.send({"status": Status.Error,
                      "error": err});
        });
    })
}

function slaveExecuteAction (action, res, str) {
    switch(action) {
        case "/service/start/slave" :
            return xcalarStart(res);
        case "/service/stop/slave" :
            return xcalarStop(res);
        case "/service/restart/slave" :
            return xcalarRestart(res);
        case "/service/status/slave" :
            return xcalarStatus(res);
        case "/service/condrestart/slave":
            return xcalarCondrestart(res);
        case "/recentLogs/slave":
            return tail.tailByLargeBuffer(str["filename"], str["requireLineNum"], res);
        case "/monitorLogs/slave":
            {
                tail.createTailUser(str["userID"]);
                return tail.tailf(str["filename"], res, str["userID"]);
            }
        case "/stopMonitorLogs/slave":
            {
                tail.removeTailUser(str["userID"]);
                var retMsg = {"status": Status.Ok,
                              "logs" : "Stop monitoring successfully!"};
                res.send(retMsg);
                return;
            }
        default:
            console.log("Should not be here!");
    }
}

function sendCommandToSlaves(action, str, hosts) {
    var mainDeferred = jQuery.Deferred();
    var numDone = 0;
    var returns = {};
    var hasFailure = false;

    for(var i = 0; i < hosts.length; i++) {
        postRequest(hosts[i], str);
    }

    function postRequest(hostName, str) {
        jQuery.ajax({
            type: 'POST',
            data: JSON.stringify(str),
            contentType: 'application/json',
            url: "http://" + hostName + "/app" + action,
            // If one node fails for monitoring logs, we may still want to read
            // the logs from other logs, should not wait too long
            timeout: action == "/monitorLogs/slave" ? 1000 : 30000,
            success: function(data) {
                var ret = data;
                var retMsg;
                if (ret.status === Status.Ok) {
                    retMsg = ret;
                } else if (ret.status === Status.Error) {
                    retMsg = ret;
                    hasFailure = true;
                } else {
                    retMsg = {
                        status: Status.Unknown,
                        error: ret
                    };
                    hasFailure = true;
                }
                returns[hostName] = retMsg;
                numDone++;
                if (numDone === hosts.length) {
                    if (hasFailure) {
                        mainDeferred.reject(returns);
                    } else {
                        mainDeferred.resolve(returns);
                    }
                }
            },
            error: function(error, textStatus) {
                retMsg = {
                    status: Status.Error,
                    error: error,
                    logs: textStatus
                };
                returns[hostName] = retMsg;
                hasFailure = true;
                numDone++;
                if (numDone === hosts.length) {
                    if (hasFailure) {
                        mainDeferred.reject(returns);
                    } else {
                        mainDeferred.resolve(returns);
                    }
                }
            }
        });
    }
    return mainDeferred.promise();
}

function generateLogs(action, results) {
    var str = "Execute " + action + " for all Nodes:\n\n";
    if (results) {
        for (var key in results) {
            var resSlave = results[key];
            str = str + "Host: " +  key + "\n"
                      + "Return Status: " + ssf.getStatus(resSlave["status"]) + "\n";
            if (resSlave["logs"]) {
                str = str + "Logs: " + resSlave["logs"] + "\n\n";
            } else if (resSlave["error"]) {
                str = str + "Error: " + resSlave["error"].message + "\n\n";
            }
        }
    }
    return str;
}

// Handle Xcalar Services
function xcalarStart(res) {
    console.log("Enter Xcalar Start");
    var command = 'service xcalar start';
    return executeCommand(command, res);
}

function xcalarStop(res) {
    console.log("Enter Xcalar Stop");
    var command = 'service xcalar stop';
    return executeCommand(command, res);
}

function xcalarRestart(res) {
    console.log("Enter Xcalar Restart");
    var command = 'service xcalar restart';
    return executeCommand(command, res);
}

function xcalarStatus(res) {
    console.log("Enter Xcalar Status");
    var command = 'service xcalar status';
    return executeCommand(command, res);
}

function xcalarCondrestart(res) {
    console.log("Enter Xcalar Condrestart");
    var command = 'service xcalar condrestart';
    return executeCommand(command, res);
}

// Remove session files
function removeSessionFiles(filePath, res) {
    // '/var/opt/xcalar/sessions' without the final slash is also legal
    var deferredOut = jQuery.Deferred();

    getXlrRoot()
    .then(function(xlrRoot) {
        var sessionPath = xlrRoot + "/sessions/";
        var completePath = getCompletePath(sessionPath, filePath);
        var isLegalPath = isUnderBasePath(sessionPath, completePath);
        if (!isLegalPath) {
            console.log("The filename" + completePath + "is illegal");
            var retMsg = {"status": Status.Error,
                          "error" : new Error("Please Send a legal Session file/folder name.")};
            res.send(retMsg);
            return;
        }
        // Handle'/var/opt/xcalar/sessions', change to'/var/opt/xcalar/sessions/'
        if (completePath == sessionPath.substring(0, sessionPath.length - 1)) {
            completePath = completePath + '/';
        }
        // Handle '/var/opt/xcalar/sessions/', avoid delete the whole session
        // folder, just delete everything under this folder.
        if (completePath == sessionPath) {
            completePath = completePath + '*';
        }
        console.log("Remove file at: ", completePath);
        var command = 'rm -rf ' + completePath;
        return executeCommand(command);
    })
    .then(function() {
        var file = filePath;
        if (!filePath) {
            file = "all files under session folder";
        }
        var retMsg = {"status": Status.Ok,
                      "logs" : new Buffer("Remove " + file + " successfully!").toString('base64')};
        res.send(retMsg);
        deferredOut.resolve();
    })
    .fail(function() {
        var retMsg = result;
        res.send(retMsg);
        deferredOut.reject();
    });

    return deferredOut.promise();
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

function executeCommand(command, res) {
    var deferred = jQuery.Deferred();
    cp.exec(command, function(err,stdout,stderr) {
        var lines = String(stdout);
        console.log(lines);
        var result;
        result = {"status": Status.Ok,
                  "logs" : lines};
        if (res) {
            res.send(result);
        }
        deferred.resolve();
    });
    return deferred.promise();
}

// Other commands
function getXlrRoot() {
    var cfgLocation = "/etc/xcalar/default.cfg";
    var deferred = jQuery.Deferred();
    var defaultLoc = "/mnt/xcalar";
    var cfg = fs.readFile(cfgLocation, 'utf8', (err, data) => {
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
            console.log("Error: " + error);
            deferred.resolve("/mnt/xcalar");
        }
    });

    return deferred.promise();
}

function getLicense(res) {
    getXlrRoot()
    .then(function(location) {
        var licenseLocation = location + "/config/license.txt";
        fs.readFile(licenseLocation, 'utf8', (err, data) => {
            try {
                if (err) throw err;
                var license = data;
                res.send({"status": Status.Ok,
                          "logs": new Buffer(license).toString('base64')});
            } catch (error) {
                console.log("Error: " + error);
                res.send({"status": Status.Error,
                          "error": err});
            }
        });
    });

}

// Following function is from https://gist.github.com/tmazur/3965625
function isValidEmail(emailAddress) {
    var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
    return pattern.test(emailAddress);
}

function submitTicket(contents, res) {
    var customerName = JSON.parse(contents).userIdName;
    var subject = "Ticket from " + encodeURIComponent(customerName);
    contents = encodeURIComponent(contents);
    email = "xi@xcalar.com";
    if (isValidEmail(customerName)) {
        email = customerName;
    }
    var out = cp.exec('curl https://myxcalar.zendesk.com/api/v2/tickets.json ' +
               '-d \'{"ticket": {"requester": {"name": "' + customerName +
               '", "email": "' + email + '"}, "submitter_id": 410989, ' +
               '"subject": "' + subject + '", "comment": { "body": "' +
               contents + '" }}}\' -H "Content-Type: application/json" -v ' +
               '-u dshetty@xcalar.com:i0turb1ne! -X POST');
    var acked = false;
    out.stderr.on('data', function(data) {
        var lines = data.split("\n");
        var i = 0;
        for (; i<lines.length; i++) {
            var line = lines[i];
            if (line.indexOf("X-Zendesk-Request-Id") > -1) {
                acked = true;
                res.send({"status": Status.Ok,
                          "logs": new Buffer(lines).toString('base64')});
                console.log("Acked");
            }
        }
    });
    out.on('close', function() {
        if (!acked) {
            res.send({"status": Status.Error,
                      "error": "Failed to submit ticket"});
            acked = true;
            console.log("Failed to submit ticket");
        }
    });
}

exports.getXlrRoot = getXlrRoot;
exports.getLicense = getLicense;
exports.submitTicket = submitTicket;
exports.removeSessionFiles = removeSessionFiles;
exports.slaveExecuteAction =  slaveExecuteAction;
exports.masterExecuteAction = masterExecuteAction;
exports.readHostsFromFile = readHostsFromFile;