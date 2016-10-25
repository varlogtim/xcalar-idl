var cp = require('child_process');
var jQuery;
var btoa = require('btoa');
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

function removeSessionFiles(filename, res) {
    var file = "";
    if(filename == "" || filename == "undefined" ||filename == undefined) {
        file = '*';
    } else {
        var fileNameIndex = filename.lastIndexOf('/');
        if(fileNameIndex != -1) {
            file = filename.substring(fileNameIndex + 1);
        } else {
            file = filename;
        }
        if(file == "") {
            file = '*';
        }
    }
    var command = 'rm -rf /var/opt/xcalar/sessions/' + file;
    return executeCommand(command, res);
}

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

function executeCommand(command, res) {
    var deferred = jQuery.Deferred();
    cp.exec(command, function(err,stdout,stderr){
        if(err){
            console.log(err.message);
            res.send({"status": Status.Error});
                deferred.reject();
        } else {
            var lines = String(stdout);
            console.log(lines);
            lines = btoa(lines);
            res.send({"status": Status.Ok,
                      "logs" : lines});
            deferred.resolve(lines);
        }
    });
    return deferred.promise();
}

exports.removeSessionFiles = removeSessionFiles;
exports.xcalarStart = xcalarStart;
exports.xcalarStop = xcalarStop;
exports.xcalarRestart = xcalarRestart;
exports.xcalarStatus = xcalarStatus;
exports.xcalarCondrestart = xcalarCondrestart;