var cp = require('child_process');
var fs = require('fs');
var bufferSize = 256 * 1024;
var gMaxLogs = 500;

var jQuery;

require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});

var Status = {
    "Ok": 0,
    "Done": 1,
    "Running": 2,
    "Error": -1,
};

exports.tailByChildProcess = function(filename, requireLineNum, res) {
    var deferred = jQuery.Deferred();
    var command = 'tail ' + filename + ' -n ' + requireLineNum;
    cp.exec(command, function(err,stdout,stderr){
        if(err){
            console.log(err.message);
            res.send({"status": Status.Error});
            deferred.reject();
        } else {
            var lines = String(stdout);
            res.send({"status": Status.Ok,
                      "logs" : lines});
            deferred.resolve(lines);
        }
    });
    return deferred.promise();
}

exports.tailByLargeBuffer = function(filename, requireLineNum, res) {
    var deferred = jQuery.Deferred();
    var deferredOut = jQuery.Deferred();
    fs.stat(filename, function(err, stat) {
        if (err) {
            console.log("fail to get file status: " + err.message);
            deferred.reject();
        } else {
            console.log("stat size " + stat.size);
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
                console.log("fd " + fd);
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
            fs.read(fd, buf, 0, buf.length, stat.size-lines.length-buf.length,
                    function(err, bytesRead, buffer) {
                if(err) {
                    client.log("fail to read the buffer: " + err.message);
                    deferred3.reject();
                } else {
                    // meet a '\n'
                    for(var i = bufferSize - 1; i >= 0; i--) {
                        if (buffer[i] === 0x0a) {
                            lineEndNum++;
                            if (lineEndNum == requireLineNum + 1) {
                                if (lines.length > stat.size) {
                                    lines = lines.substring(lines.length-stat.size);
                                }
                                deferred3.resolve(lines);
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
    .then(function(lines) {
        res.send({"status": Status.Ok,
                  "logs" : lines});
        deferredOut.resolve(lines);
    })
    .fail(function() {
        console.log("something fails!");
        res.send({"status": Status.Error});
        deferredOut.reject();
    });

    return deferredOut.promise();
}

exports.isLogNumValid = function(num) {
    if(isNaN(num)) {
        return false;
    } else {
        if(Number.isInteger(num) && num >= 0  && num <= gMaxLogs) {
            return true;
        }
        return false;
    }
}
