var cp = require('child_process');
var fs = require('fs');

var jQuery;
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});

var bufferSize = 1024 * 1024;
var gMaxLogs = 500;

var ssf = require('./supportStatusFile');
var Status = ssf.Status;

var tailUsers = new Map();

function TailUserInformation() {
    this.userID = undefined;
    this.isFirstMonitorReq = true;
    this.fileID = undefined;
    this.position = undefined;
    // The last time that expServer receive a request
    this.lastMonitorTime = undefined;
    // The last time to fetch the log
    this.lastGetLogTime = undefined;
    return this;
}

TailUserInformation.prototype = {
    getUserID: function() {
        return this.userID;
    },
    getIsFirstMonitorReq: function() {
        return this.isFirstMonitorReq;
    },
    getFileID: function() {
        return this.fileID;
    },
    getPosition: function() {
        return this.position;
    },
    getLastMonitorTime: function() {
        return this.lastMonitorTime;
    },
    getLastGetLogTime: function() {
        return this.lastGetLogTime;
    },
    setUserID: function(userID) {
        this.userID = userID;
    },
    setIsFirstMonitorReq: function(value) {
        this.isFirstMonitorReq = value;
    },
    setFileID: function(fileID) {
        this.fileID = fileID;
    },
    setPosition: function(position) {
        this.position = position;
    },
    setLastMonitorTime: function(lastMonitorTime) {
        this.lastMonitorTime = lastMonitorTime;
    },
    setLastGetLogTime: function(lastGetLogTime) {
        this.lastGetLogTime = lastGetLogTime;
    }
};

function createTailUser(userID) {
    if(!(tailUsers.has(userID))) {
        var currentUser = new TailUserInformation();
        currentUser.setUserID(userID);
        tailUsers.set(userID, currentUser);
    }
}

function removeTailUser(userID) {
    if(tailUsers.has(userID)) {
        tailUsers.delete(userID);
    }
}

// tail with Xcalar.log exist
function tail(filename, requireLineNum, res) {
    console.log("Enter tail by large buffer")
    if(!isLogNumValid(requireLineNum)) {
        if(res) {
            res.send({"status": Status.Error,
                      "error": "Please Enter a nonnegative integer" +
                                         "not over 500"});
        }
        return;
    }
    var deferred = jQuery.Deferred();
    var deferredOut = jQuery.Deferred();
    fs.stat(filename, function(err, stat) {
        if (err) {
            console.log("fail to get file status: " + err.message);
            deferred.reject();
        } else {
            deferred.resolve(stat);
        }
    });
    deferred.promise()
    .then(function(stat) {
        console.log("stat", stat)
        if(!stat || stat.size == 0) {
            if(res) {
                console.log("Empty file");
                res.send({"status": Status.Ok,
                          "logs": "The file is empty!"});
            }
            deferred.reject();
        }
        var deferred2 = jQuery.Deferred();
        fs.open(filename, 'r', function(err, fd) {
            if(err) {
                console.log("fail to open the file: " + err.message);
                deferred2.reject();
            } else {
                deferred2.resolve(fd, stat);
            }
        });
        return deferred2.promise();
    })
    .then(function(fd, stat) {
        var deferred3 = jQuery.Deferred();
        //  How many line end have been meet
        var lineEndNum = 0;
        var lines = '';
        var readFromEnd = function(buf) {
            var startPosition;
            var bufferReadLength;
            // If the file is large, fill in the whole buf
            if((stat.size-lines.length) >= buf.length) {
                startPosition = stat.size-lines.length-buf.length;
                bufferReadLength = buf.length;
            // If the file is small, fill in part of the buf
            } else {
                startPosition = 0;
                bufferReadLength = stat.size-lines.length;
            }
            fs.read(fd, buf, 0, bufferReadLength, startPosition,
                function(err, bytesRead, buffer) {
                if(err) {
                    client.log("fail to read the buffer: " + err.message);
                    deferred3.reject();
                } else {
                    for(var i = bufferReadLength - 1; i >= 0; i--) {
                        if ((lines.length + 1) >= stat.size) {
                            lines = lines.substring(lines.length-stat.size);
                            deferred3.resolve(fd, stat, lines);
                            return;
                        }
                        // meet a '\n'
                        if (buffer[i] === 0x0a) {
                            lineEndNum++;
                            if (lineEndNum == requireLineNum + 1) {
                                deferred3.resolve(fd, stat, lines);
                                return;
                            }
                        }
                        lines = String.fromCharCode(buffer[i]) + lines;
                    }
                    readFromEnd(new Buffer(bufferSize));
                }
            });
            return deferred3.promise();
        }
        return readFromEnd(new Buffer(bufferSize));
    })
    .then(function(fd, stat, lines) {
        if(lines) {
            console.log(lines.substring(0, lines.length - 1));
            res.send({"status": Status.Ok, "logs" : lines});
        } else {
            res.send({"status": Status.Ok});
        }
        deferredOut.resolve(fd, stat, lines);
    })
    .fail(function() {
        console.log("something fails!");
        res.send({"status": Status.Error});
        deferredOut.reject();
    });
    return deferredOut.promise();
}

// tail f with Xcalar.log exist
function tailf(filename, res, userID) {
    var user = tailUsers.get(userID);
    // Detect the case that xi quit without sending the stop Monitoring command
    lostConnectDetection(userID);
    // First time for Monitor, just fetch 10 recent logs by calling function tailByLargeBuffer
    if(user.getIsFirstMonitorReq()) {
        clearFirstMonitor(userID);
        var promise = tail(filename, 10, res);
        jQuery.when(promise)
        .then(function(fd, stat) {
            user.setFileID(fd);
            user.setPosition(stat.size);
        });
    // Fetch new Logs after the first time;
    } else {
        sendRecentLogsWithLog(res, userID);
    }
}

// send recent logs with Xcalar.log exist
function sendRecentLogsWithLog(res, userID) {
    var user = tailUsers.get(userID);
    var lines = "";
    var deferred = jQuery.Deferred();

    var readRecentLogs = function() {
        var buf = new Buffer(bufferSize);
        var fileID = user.getFileID();
        var userPosition = user.getPosition();
        fs.read(fileID, buf, 0, bufferSize, userPosition,
            function(err, bytesRead, buf) {
            if (err) {
                console.log(err.message);
                deferred.reject();
            }
            for (var i = 0; i < bytesRead; i++) {
                user.position++;
                lines = lines + String.fromCharCode(buf[i]);
            }
            if (bytesRead == bufferSize) {
                readRecentLogs();
            } else {
                deferred.resolve(lines);
            }
        });
        return deferred.promise();
    };
    readRecentLogs();

    deferred.promise()
    .then(function(lines){
        if(lines) {
            console.log(lines.substring(0, lines.length - 1));
            res.send({"status": Status.Ok, "logs" : lines});
        } else {
            res.send({"status": Status.Ok});
        }
    })
    .fail(function() {
        console.log("Tail Process fails!");
        res.send({"status": Status.Error});
    });
}

// tail without Xcalar.log exists, in centOS
function tailWithoutLog(requireLineNum, res) {
    console.log("Tail the Xcalar logs");
    if (!isLogNumValid(requireLineNum)) {
        if (res) {
            res.send({"status": Status.Error,
                      "error": "Please Enter a nonnegative integer" +
                                         "not over 500"});
        }
        return;
    }
    var deferred = jQuery.Deferred();
    var command = 'journalctl -n ' + requireLineNum;
    cp.exec(command, function(err,stdout,stderr) {
        var lines = String(stdout);
        console.log(lines);
        var result;
        result = {"status": Status.Ok,
                  "logs" : lines};
        if (res) {
            res.send(result);
        }
        var currentTime = getCurrentTime();
        deferred.resolve(currentTime);
    });
    return deferred.promise();
}

// tail f without Xcalar.log exist, in centOS
function tailfWithoutLog(res, userID) {
    var user = tailUsers.get(userID);
    // Detect the case that xi quit without sending the stop Monitoring command
    lostConnectDetection(userID);
    // First time for Monitor, just fetch 10 recent logs by calling function
    // tailByLargeBuffer
    if(user.getIsFirstMonitorReq()) {
        clearFirstMonitor(userID);
        tailWithoutLog(10, res)
        .then(function(currentTime) {
            user.setLastGetLogTime(currentTime);
        });
    // Fetch new Logs after the first time;
    } else {
        return sendRecentLogsWithoutLog(res, userID);
    }
}

// send recent logs without Xcalar.log exist
function sendRecentLogsWithoutLog(res, userID) {
    var user = tailUsers.get(userID);
    var lastGetLogTime = user.getLastGetLogTime();
    var currentTime = getCurrentTime();

    user.setLastGetLogTime(currentTime);
    var deferred = jQuery.Deferred();
    var command = 'journalctl --since ' + lastGetLogTime +
                  ' --until ' + currentTime;
    cp.exec(command, function(err,stdout,stderr) {
        var lines = String(stdout);
        var firstLineIndex = lines.indexOf("\n");
        lines = lines.substring(firstLineIndex + 1);
        if(lines) {
            console.log(lines);
        }
        var result;
        result = {"status": Status.Ok,
                  "logs" : lines};
        if (res) {
            res.send(result);
        }
        deferred.resolve(currentTime);
    });
    return deferred.promise();
}

function isLogNumValid(num) {
    if(isNaN(num)) {
        return false;
    } else {
        if(Number.isInteger(num) && num >= 0  && num <= gMaxLogs) {
            return true;
        }
        return false;
    }
}

function getCurrentTime() {
    var date = new Date();
    var month = date.getMonth()+1 < 10 ? "0" + (date.getMonth() + 1) :
                                         date.getMonth()+1 ;
    var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    var year = date.getFullYear();
    var hour = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    var minute = date.getMinutes() < 10 ? "0" + date.getMinutes() :
                                          date.getMinutes();
    var second = date.getSeconds() < 10 ? "0" + date.getSeconds() :
                                          date.getSeconds();
    var formatedDate = '"' + year + '-' + month + '-' + day + ' ' + hour + ':'
                        + minute + ':' + second + '"';
    return formatedDate;
}

function lostConnectDetection(userID) {
    var user = tailUsers.get(userID);
    var currentTime = new Date().getTime();
    var lastMonitorTime = user.getLastMonitorTime();
    if((!lastMonitorTime) || (currentTime - lastMonitorTime > 30000)) {
        setFirstMonitor(userID);
    }
    user.setLastMonitorTime(currentTime);
}

function setFirstMonitor(userID) {
    var user = tailUsers.get(userID);
    user.setIsFirstMonitorReq(true);
}

function clearFirstMonitor(userID) {
    var user = tailUsers.get(userID);
    user.setIsFirstMonitorReq(false);
}

exports.tail = tail;
exports.tailf = tailf;
exports.tailWithoutLog = tailWithoutLog;
exports.tailfWithoutLog = tailfWithoutLog;
exports.setFirstMonitor = setFirstMonitor;
exports.createTailUser = createTailUser;
exports.removeTailUser = removeTailUser;