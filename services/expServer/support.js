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

var path = require('path');
var sessionPath = '/var/opt/xcalar/sessions/';

var Status = {
    "Ok": 0,
    "Done": 1,
    "Running": 2,
    "Error": -1,
};

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

function getCompletePath(filePath) {
    var normalizedPath;
    if(path.isAbsolute(filePath)) {
        normalizedPath = path.normalize(filePath);
    } else {
        normalizedPath = path.normalize(sessionPath + filePath);
    }
    return normalizedPath;
}

function isUnderBasePath(basePath, completePath) {
    return completePath.indexOf(basePath) == 0 ||
           completePath == basePath.substring(0, basePath.length - 1);
}

function removeSessionFiles(filePath, res) {
    var completePath = getCompletePath(filePath);
    // '/var/opt/xcalar/sessions' without the final slash is also legal
    var isLegalPath = isUnderBasePath(sessionPath, completePath);
    if(!isLegalPath) {
        console.log("The filename is illegal");
         res.send({"status": Status.Error,
                   "logs" : "Please Send a legal Session file/folder name."});
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
    return executeCommand(command, res);
}

exports.removeSessionFiles = removeSessionFiles;
exports.xcalarStart = xcalarStart;
exports.xcalarStop = xcalarStop;
exports.xcalarRestart = xcalarRestart;
exports.xcalarStatus = xcalarStatus;
exports.xcalarCondrestart = xcalarCondrestart;