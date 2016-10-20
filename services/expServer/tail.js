var cp = require('child_process');
var fs = require('fs');
var btoa = require('btoa');
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

var Status = {
    "Ok": 0,
    "Done": 1,
    "Running": 2,
    "Error": -1,
};

var tailUsers = new Map();

function TailUserInformation() {
    this.userID = undefined;
    this.isFirstMonitorReq = true;
    this.fileID = undefined;
    this.position = undefined;
    this.lastMonitorTime = undefined;
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
    }
};

function createTailUser(userID) {
    if(!(tailUsers.has(userID))) {
        var currentUser = Object.create(TailUserInformation.prototype);
        currentUser.setUserID(userID);
        tailUsers.set(userID, currentUser);
    }
}

function removeTailUser(userID) {
    if(tailUsers.has(userID)) {
        tailUsers.delete(userID);
    }
}

function tailByChildProcess(filename, requireLineNum, res) {
    var deferred = jQuery.Deferred();
    var command = 'tail ' + filename + ' -n ' + requireLineNum;
    cp.exec(command, function(err,stdout,stderr){
        if(err){
            console.log(err.message);
            res.send({"status": Status.Error});
            deferred.reject();
        } else {
            var lines = String(stdout);
            lines = btoa(lines);
            res.send({"status": Status.Ok,
                      "logs" : lines});
            deferred.resolve(lines);
        }
    });
    return deferred.promise();
}

function tailByLargeBuffer(filename, requireLineNum, res) {
    if(!isLogNumValid(requireLineNum)) {
        res.send({"status": Status.Error,
                  "message": "Please Enter a nonnegative integer" +
                             "not over 500"});
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
        console.log(lines.substring(0, lines.length - 1));
        lines = btoa(lines);
        res.send({"status": Status.Ok,
              "logs" : lines});
        deferredOut.resolve(fd, stat, lines);
    })
    .fail(function() {
        console.log("something fails!");
        res.send({"status": Status.Error});
        deferredOut.reject();
    });
    return deferredOut.promise();
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

function tailf(filename, res, userID) {
    var user = tailUsers.get(userID);
    // Detect the case that xi quit without sending the stop Monitoring command
    lostConnectDetection(userID);
    // First time for Monitor, just fetch 10 recent logs by calling function tailByLargeBuffer
    if(user.getIsFirstMonitorReq()) {
        clearFirstMonitor(userID);
        var promise = tailByLargeBuffer(filename, 10, res);
        jQuery.when(promise)
        .then(function(fd, stat) {
            user.setFileID(fd);
            user.setPosition(stat.size);
        });
    // Fetch new Logs after the first time;
    } else {
        sendRecentLogs(res, userID);
    }
}

function sendRecentLogs(res, userID) {
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
        }
        lines = btoa(lines);
        res.send({"status": Status.Ok, "logs" : lines});
    })
    .fail(function() {
        console.log("Tail Process fails!");
        res.send({"status": Status.Error});
    });
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

exports.tailf = tailf;
exports.tailByLargeBuffer = tailByLargeBuffer;
exports.tailByChildProcess = tailByChildProcess;
exports.setFirstMonitor = setFirstMonitor;
exports.createTailUser = createTailUser;
exports.removeTailUser = removeTailUser;