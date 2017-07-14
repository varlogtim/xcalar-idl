var cp = require('child_process');
var fs = require('fs');
var path = require('path');

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

var httpStatus = require('./../../assets/js/httpStatus.js').httpStatus;
var support = require('./support.js');
var xcConsole = support.xcConsole;
// var logPath = "/var/log/Xcalar.log";

//*** This file is broken into two parts due to different OS requiring different
//*** methods to access syslog. On Ubuntu, we tail /var/log/Xcalar.log
//*** On centos, we call journalctl

// *************************** tail Xcalar.log ****************************** //
// Tail Xcalar.log
function tailLog(requireLineNum, filePath, fileName) {
    var deferredOut = jQuery.Deferred();
    function checkLineNum(requireLineNumInput) {
        var deferred = jQuery.Deferred();
        var requireLineNum = Number(requireLineNumInput);
        if (!isLogNumValid(requireLineNum)) {
            var retMsg = {
                "status": Status.BadRequest, // Bad Request
                "logs": "Please enter a non-negative number less than 500"
            };
            deferred.reject(retMsg);
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    checkLineNum(requireLineNum)
    .then(function() {
        return getPath(filePath, fileName);
    })
    .then(function(logPath, stat) {
        var deferred = jQuery.Deferred();
        if (!stat || stat.size === 0) {
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Empty File"
            };
            // reject doesn't means that the status can't be 200, it means that
            // we already know the result and do not need to pass parameters
            // and move forward to next steps
            deferred.reject(retMsg);
        } else {
            fs.open(logPath, 'r', function(err, fd) {
                if (err) {
                    var retMsg = {
                        "status": httpStatus.InternalServerError, // Server Internal error
                        "logs": "fail to open the file: " + err.message
                    };
                    deferred.reject(retMsg);
                } else {
                    deferred.resolve(fd, stat);
                }
            });
        }
        return deferred.promise();
    })
    .then(function(fd, stat) {
        var deferred = jQuery.Deferred();
        //  How many line end have been meet
        var lineEndNum = 0;
        var lines = '';
        var readFromEnd = function(buf) {
            var startPosition;
            var bufferReadLength;
            // If the file is large, fill in the whole buf
            if ((stat.size - lines.length) >= buf.length) {
                startPosition = stat.size - lines.length - buf.length;
                bufferReadLength = buf.length;
            // If the file is small, fill in part of the buf
            } else {
                startPosition = 0;
                bufferReadLength = stat.size - lines.length;
            }
            fs.read(fd, buf, 0, bufferReadLength, startPosition,
                function(err, bytesRead, buffer) {
                    if (err) {
                        var retMsg = {
                            "status": httpStatus.Forbidden,
                            "logs": "fail to read the file: " + err.message
                        };
                        deferred.reject(retMsg);
                    } else {
                        for (var i = bufferReadLength - 1; i >= 0; i--) {
                            // If we don't have requireNum lines and we already
                            // reach the beginning of the this file, don't read
                            // the last bits as they are non sense
                            if ((lines.length + 1) >= stat.size) {
                                lines = lines.substring(lines.length - stat.size);
                                deferred.resolve(lines, stat);
                                return;
                            }
                            // meet a '\n'
                            if (buffer[i] === 0x0a) {
                                lineEndNum++;
                                // as the last line always ends with '\n', if you
                                // want to have requireNum + 1 lines, you need to
                                // meet require + 1 '\n'
                                if (lineEndNum === requireLineNum + 1) {
                                    deferred.resolve(lines, stat);
                                    return;
                                }
                            }
                            lines = String.fromCharCode(buffer[i]) + lines;
                        }
                        readFromEnd(new Buffer(bufferSize));
                    }
                });
            return deferred.promise();
        };
        return readFromEnd(new Buffer(bufferSize));
    })
    .then(function(lines, stat) {
        var retMsg = {
            "status": httpStatus.OK,
            "logs": lines,
            "lastMonitor": stat.size
        };
        if (lines) {
            xcConsole.log(lines.substring(0, lines.length - 1));
        }
        deferredOut.resolve(retMsg);
    })
    .fail(function(retMsg) {
        deferredOut.reject(retMsg);
    });

    return deferredOut.promise();
}

// Tail -f
function monitorLog(lastMonitor, filePath, fileName) {
    if (lastMonitor === -1) {
        return tailLog(10, filePath, fileName);
    } else {
        return sinceLastMonitorLog(Number(lastMonitor), filePath, fileName);
    }
}

// Send delta Xcalar.log logs
function sinceLastMonitorLog(lastMonitor, filePath, fileName) {
    var deferredOut = jQuery.Deferred();
    getPath(filePath, fileName)
    .then(function(logPath, stat) {
        var deferred = jQuery.Deferred();
        if (!stat || stat.size === 0) {
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Empty File"
            };
            // reject doesn't means that the status can't be 200, it means that
            // we already know the result and do not need to pass parameters
            // and move forward to next steps
            deferred.reject(retMsg);
        } else {
            fs.open(logPath, 'r', function(err, fd) {
                if (err) {
                    var retMsg = {
                        "status": httpStatus.Forbidden,
                        "logs": "fail to open the file: " + err.message
                    };
                    deferred.reject(retMsg);
                } else {
                    deferred.resolve(fd, stat);
                }
            });
        }
        return deferred.promise();
    })
    .then(function(fd, stat) {
        var lines = '';
        var buf = new Buffer(bufferSize);
        var deferred = jQuery.Deferred();
        var readRecentLogs = function() {
            fs.read(fd, buf, 0, bufferSize, lastMonitor,
                function(err, bytesRead, buf) {
                    if (err) {
                        var retMsg = {
                            "status": httpStatus.Forbidden,
                            "logs": "fail to read the file: " + err.message
                        };
                        deferred.reject(retMsg);
                    }
                    for (var i = 0; i < bytesRead; i++) {
                        lines = lines + String.fromCharCode(buf[i]);
                    }
                    if (bytesRead === bufferSize) {
                        readRecentLogs();
                    } else {
                        deferred.resolve(lines, stat);
                    }
                });
            return deferred.promise();
        };
        return readRecentLogs();
    })
    .then(function(lines, stat) {
        if (lines) {
            xcConsole.log(lines.substring(0, lines.length - 1));
        }
        var retMsg = {
            "status": httpStatus.OK,
            "logs": lines,
            "lastMonitor": stat.size
        };
        deferredOut.resolve(retMsg);
    })
    .fail(function(retMsg) {
        deferredOut.reject(retMsg);
    });
    return deferredOut.promise();
}

// // ***************************** journalctl ********************************* //
// // journalctl
// function tailJournal(requireLineNum) {
//     var deferredOut = jQuery.Deferred();
//     var deferred = jQuery.Deferred();
//     if (!isLogNumValid(requireLineNum)) {
//         var retMsg = {
//             "status": httpStatus.BadRequest, // Bad Request
//             "logs": "Please Enter a nonnegative integer not over 500"
//         };
//         deferred.reject(retMsg);
//     } else {
//         deferred.resolve();
//     }
//     deferred.promise()
//     .then(function() {
//         var deferred = jQuery.Deferred();
//         var command = 'journalctl -n ' + requireLineNum;
//         cp.exec(command, function(err,stdout,stderr) {
//             var retMsg;
//             if (err) {
//                 retMsg = {
//                     "status": httpStatus.InternalServerError, // Server Internal Error
//                     "logs": "Fail to execute " + err.message
//                 };
//                 deferred.reject(retMsg);
//             } else {
//                 var lines = String(stdout);
//                 var currentTime = getCurrentTime();
//                 retMsg = {
//                     "status": httpStatus.OK,
//                     "logs": lines,
//                     "lastMonitor": currentTime
//                 };
//                 deferred.resolve(retMsg);
//             }
//         });
//         return deferred.promise();
//     })
//     .then(function(retMsg) {
//         deferredOut.resolve(retMsg);
//     })
//     .fail(function(retMsg) {
//         deferredOut.reject(retMsg);
//     });
//     return deferredOut.promise();
// }

// // journalctl -f
// function monitorJournal(lastMonitor) {
//     if (lastMonitor === -1) {
//         return tailJournal(10);
//     } else {
//         return sinceLastMonitorJournal(lastMonitor);
//     }
// }

// // Send delta journalctl logs
// function sinceLastMonitorJournal(lastMonitor) {
//     var deferredOut = jQuery.Deferred();
//     var currentTime = getCurrentTime();
//     var command = 'journalctl --since ' + lastMonitor +
//                   ' --until ' + currentTime;
//     cp.exec(command, function(err,stdout,stderr) {
//         var retMsg;
//         if (err) {
//             retMsg = {
//                 "status": httpStatus.InternalServerError, // Server Internal Error
//                 "logs": "Fail to execute " + err.message
//             };
//             deferredOut.reject(retMsg);
//         } else {
//             var lines = "";
//             lines = String(stdout);
//             var firstLineIndex = lines.indexOf("\n");
//             lines = lines.substring(firstLineIndex + 1);
//             retMsg = {
//                 "status": httpStatus.OK,
//                 "logs": lines,
//                 "lastMonitor": currentTime
//             };
//             deferredOut.resolve(retMsg);
//         }
//     });
//     return deferredOut.promise();
// }

// *************************** Common Functions ***************************** //
function isLogNumValid(num) {
    if (isNaN(num)) {
        return false;
    } else {
        if (Number.isInteger(num) && num >= 0 && num <= gMaxLogs) {
            return true;
        }
        return false;
    }
}

function getPath(filePath, fileName) {
    var deferredOut = jQuery.Deferred();

    function getFileName() {
        var deferred = jQuery.Deferred();
        if (fileName === "node.*.out" || fileName === "node.*.err"
            || fileName === "node.*.log") {
            getNodeId()
            .then(function(nodeID) {
                xcConsole.log("NodeID: " + nodeID);
                if (fileName === "node.*.out") {
                    deferred.resolve("node." + nodeID + ".out");
                } else if (fileName === "node.*.err") {
                    deferred.resolve("node." + nodeID + ".err");
                } else {
                    deferred.resolve("node." + nodeID + ".log");
                }
            })
            .fail(function(err) {
                var retMsg = {
                    // Server Internal error
                    "status": httpStatus.InternalServerError,
                    "logs": "Can not get the Node ID " + err
                };
                deferred.reject(retMsg);
            });
        } else {
            deferred.resolve(fileName);
        }
        return deferred.promise();
    }

    getFileName()
    .then(function(realName) {
        var logPath = path.join(filePath, realName);
        xcConsole.log("Reading file stat: " + logPath);
        return readFileStat(logPath);
    })
    .then(function(currFile, stat) {
        deferredOut.resolve(currFile, stat);
    })
    .fail(function(retMsg) {
        deferredOut.reject(retMsg);
    });
    return deferredOut.promise();
}

function getNodeId() {
    var deferredOut = jQuery.Deferred();
    var command = "/opt/xcalar/bin/xcalarctl status";
    var reg = /^Node\sID:\s([0-9]+)$/;
    var lineData = "";
    var out = cp.exec(command);

    out.stdout.on('data', function(data) {
        lineData += data;
    });

    out.stdout.on('close', function() {
        var lines = lineData.split("\n");
        if (lines.length === 0) {
            deferredOut.reject();
            return;
        }
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            var arr = reg.exec(line);
            if (arr && arr.length > 0) {
                deferredOut.resolve(arr[1]);
                return;
            }
        }
        deferredOut.reject();
    });

    out.stdout.on('error', function(err) {
        xcConsole.log(err);
        deferredOut.reject(err);
    });
    return deferredOut.promise();
}

function readFileStat(currFile) {
    var deferred = jQuery.Deferred();
    fs.stat(currFile, function(err, stat) {
        var retMsg;
        if (err) {
            xcConsole.log(err);
            retMsg = {
                // Server Internal error
                "status": httpStatus.InternalServerError,
                "logs": "Fail to read file stat" + err
            };
            deferred.reject(retMsg);
        } else if (stat.size === 0) {
            retMsg = {
                // Server Internal error
                "status": httpStatus.InternalServerError,
                "logs": "File " + currFile + " is empty."
            };
            deferred.reject(retMsg);
        } else {
            deferred.resolve(currFile, stat);
        }
    });
    return deferred.promise();
}

function getCurrentTime() {
    function addLeading0(val) {
        if (val < 10) {
            return "0" + val;
        }
        return val;
    }
    var date = new Date();
    var month = addLeading0(date.getMonth() + 1);
    var day = addLeading0(date.getDate());
    var year = date.getFullYear();
    var hour = addLeading0(date.getHours());
    var minute = addLeading0(date.getMinutes());
    var second = addLeading0(date.getSeconds());
    var formatedDate = '"' + year + '-' + month + '-' + day + ' ' + hour +
                       ':' + minute + ':' + second + '"';
    return formatedDate;
}

exports.tailLog = tailLog;
exports.monitorLog = monitorLog;
// exports.tailJournal = tailJournal;
// exports.monitorJournal = monitorJournal;