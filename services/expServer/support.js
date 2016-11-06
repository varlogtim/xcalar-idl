var cp = require('child_process');
var atob = require('atob');
var btoa = require('btoa');
var lineReader = require('readline');
var fs = require('fs');
var os = require('os');
var path = require('path');

var ssf = require('./supportStatusFile');
var tail = require('./tail');
var SupportStatus = ssf.SupportStatus;

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
    var promise = readHostsFromFile(getXlrRoot() + hostFile);
    promise
    .then(function(hosts) {
        var promiseSlaves = sendCommandToSlaves(slaveAction, str, hosts);
        promiseSlaves
        .then(function(results) {
            var logs = generateLogs(action, results);
            if(logs) {
                res.send({"status": SupportStatus.OKLog,
                          "logs": btoa(logs)});
            } else {
                res.send({"status": SupportStatus.OKNoLog});
            }
        })
        .fail(function(results) {
            var logs = generateLogs(action, results);
            if(logs) {
                res.send({"status": SupportStatus.Error,
                          "logs": btoa(logs)});
            } else {
                res.send({"status": SupportStatus.Error});
            }
        });
    })
    .fail(function(err) {
        res.send({"status": SupportStatus.Error,
                  "error": err});
    });
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
                var retMsg = {"status": SupportStatus.OKLog,
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
            url: "http://" + hostName + ":12124" + action,
            success: function(data) {
                var ret = data;
                var retMsg;
                if (ret.status === SupportStatus.OKLog || ret.status === SupportStatus.OKNoLog) {
                    retMsg = ret;
                } else if (ret.status === SupportStatus.Error) {
                    retMsg = ret;
                    hasFailure = true;
                } else {
                    retMsg = {
                        status: SupportStatus.OKUnknown,
                        error: ret
                    };
                    hasFailure = true;
                }
                returns[hostName] = retMsg;
                numDone++;
                if (numDone === hosts.length) {
                    if(hasFailure) {
                        mainDeferred.reject(returns);
                    } else {
                        mainDeferred.resolve(returns);
                    }
                }
            },
            error: function(error) {
                retMsg = {
                    status: SupportStatus.Error,
                    error: error
                };
                returns[hostName] = retMsg;
                numDone++;
                if (numDone === hosts.length - 1) {
                    mainDeferred.reject(returns);
                }
            }
        });
    }
    return mainDeferred.promise();
}

function generateLogs(action, results) {
    var str = "Execute " + action + " for all Nodes:\n\n";
    if(results) {
        for (var key in results) {
            var resSlave = results[key];
            str = str + "Host: " +  key + "\n"
                      + "Return Status: " + ssf.getStatus(resSlave["status"]) + "\n";
            if(resSlave["logs"]) {
                str = str + "Logs: " + resSlave["logs"] + "\n";
            }
            if(resSlave["error"]) {
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
    var sessionPath = getXlrRoot() + "/sessions/";
    var completePath = getCompletePath(sessionPath, filePath);
    var isLegalPath = isUnderBasePath(sessionPath, completePath);
    var deferred = jQuery.Deferred();
    if(!isLegalPath) {
        console.log("The filename" + completePath + "is illegal");
        var retMsg = {"status": SupportStatus.Error,
                      "error" : new Error("Please Send a legal Session file/folder name.")};
        res.send(retMsg);
        return;
    }
    // Handle'/var/opt/xcalar/sessions', change to'/var/opt/xcalar/sessions/'
    if(completePath == sessionPath.substring(0, sessionPath.length - 1)) {
        completePath = completePath + '/';
    }
    // Handle '/var/opt/xcalar/sessions/', avoid delete the whole session
    // folder, just delete everything under this folder.
    if(completePath == sessionPath) {
        completePath = completePath + '*';
    }
    console.log("Remove file at: ", completePath);
    var command = 'rm -rf ' + completePath;
    var promise = executeCommand(command);
    promise
    .then(function(result) {
        var file = filePath;
        if (!filePath) {
            file = "all files under session folder";
        }
        var retMsg = {"status": SupportStatus.OKLog,
                      "logs" : btoa("Remove " + file + " successfully!")};
        res.send(retMsg);
        deferred.resolve();
    })
    .fail(function(result) {
        var retMsg = result;
        res.send(retMsg);
        deferred.reject();
    });
    return deferred.promise();
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
        if (err) {
            console.log(err.message);
            var result = {"status": SupportStatus.Error,
                          "error": err};
            if(res) {
                res.send(result);
            }
            deferred.reject();
        } else {
            var lines = String(stdout);
            console.log(lines);
            var result;
            if (lines) {
                result = {"status": SupportStatus.OKLog,
                          "logs" : lines};
            } else {
                result = {"status": SupportStatus.OKNoLog,
                          "logs" : lines};
            }
            if (res) {
                res.send(result);
            }
            deferred.resolve();
        }
    });
    return deferred.promise();
}

// Other commands
function getXlrRoot() {
    var cfgLocation = "/etc/xcalar/default.cfg";
    var cfg = fs.readFileSync(cfgLocation);
    var lines = cfg.split("\n");
    var i = 0;
    for (; i<lines.length; i++) {
        if (lines[i].indexOf("Constants.XcalarRootCompletePath") > -1) {
            return jQuery.trim(lines[i].split("=")[1]);
        }
    }
    return "/mnt/xcalar";
}

function getLicense(res) {
    var licenseLocation = getXlrRoot() + "/config/license.txt";
    try {
        var license = fs.readFileSync(licenseLocation);
        res.send({"status": SupportStatus.OKLog,
                  "log": license});
    } catch (err) {
        res.send({"status": SupportStatus.Error,
                  "error": err});
    }

}

function submitTicket(contents, res) {

    contents = encodeURIComponent(contents);
    var out = exec('curl https://myxcalar.zendesk.com/api/v2/tickets.json ' +
               '-d \'{"ticket": {"requester": {"name": "The Customer", ' +
               '"email": "thecustomer@domain.com"}, "submitter_id": 410989, ' +
               '"subject": "My printer is on fire!", "comment": { "body": "' +
               contents + '" }}}\' -H "Content-Type: application/json" -v ' +
               '-u dshetty@xcalar.com:i0turb1ne! -X POST');
    var acked = false;
    out.stdout.on('data', function(data) {
        var lines = data.split("\n");
        var i = 0;
        for (; i<lines.length; i++) {
            var line = lines[i];
            if (line.indexOf("X-Zendesk-Request-Id") > -1) {
                acked = true;
                res.send({"status": SupportStatus.OKLog,
                          "logs"  : atob(lines)});
            }
        }
        console.log(data);
    });
    out.on('close', function() {
        if (!acked) {
            res.send({"status": SupportStatus.Error,
                      "error": "Failed to submit ticket"});
            acked = true;
        }
    });
}

exports.getLicense = getLicense;
exports.removeSessionFiles = removeSessionFiles;
exports.slaveExecuteAction =  slaveExecuteAction;
exports.masterExecuteAction = masterExecuteAction;
