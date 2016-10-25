window.XFTSupportTools = (function(XFTSupportTools) {
    var monitorIntervalId;
    var lastReturnSucc = true;

    XFTSupportTools.getRecentLogs = function(requireLineNum) {
        var action = "recentLogs";
        var str = {"requireLineNum" : requireLineNum};
        postRequest(action, str);
    }


    XFTSupportTools.monitorLogs = function() {
        clearInterval(monitorIntervalId);
        monitorIntervalId = setInterval(function() {
            if(lastReturnSucc) {
                lastReturnSucc = false;
                var action = "monitorLogs";
                // support multiple user
                var data = {"userID" : Support.getUser()};
                var promise = postRequest(action, data);
                promise
                .then(function() {
                    lastReturnSucc = true;
                })
                .fail(function() {
                    lastReturnSucc = false;
                });
            }
        }, 1000);
    }

    XFTSupportTools.stopMonitorLogs = function() {
        clearInterval(monitorIntervalId);
        $.ajax({
            type: 'POST',
            data: JSON.stringify({"userID" : Support.getUser()}),
            contentType: 'application/json',
            url: "https://authentication.xcalar.net/app/stopMonitorLogs",
            success: function(data) {
                ret = data;
                if (ret.status === Status.Ok) {
                    console.log('Stop successfully');
                } else if (ret.status === Status.Error) {
                    console.log('Stop fails');
                } else {
                    console.log('shouldnt be here');
                }
            },
            error: function(error) {
                console.log(error);
            }
        });
    }

    XFTSupportTools.startXcalarServices = function() {
        var action = "xcalarStart";
        postRequest(action);
    }

    XFTSupportTools.stopXcalarServices = function() {
        var action = "xcalarStop";
        postRequest(action);
    }

    XFTSupportTools.restartXcalarServices = function() {
        var action = "xcalarRestart";
        postRequest(action);
    }

    XFTSupportTools.statusXcalarServices = function() {
        var action = "xcalarStatus";
        postRequest(action);
    }

    XFTSupportTools.condrestartXcalarServices = function() {
        var action = "xcalarCondrestart";
        var str = undefined;
        postRequest(action, str);
    }

    XFTSupportTools.removeSessionFiles = function(filename) {
        var action = "removeSessionFiles";
        var str = {"filename" : filename};
        postRequest(action, str);
    }


    function postRequest(action, str) {
        var deferred = jQuery.Deferred();
        $.ajax({
            type: 'POST',
            data: JSON.stringify(str),
            contentType: 'application/json',
            url: "https://authentication.xcalar.net/app/" + action,
            success: function(data) {
                ret = data;
                if (ret.status === Status.Ok) {
                    if(ret.logs) {
                        console.log(atob(ret.logs));
                    }
                    deferred.resolve();
                } else if (ret.status === Status.Error) {
                    console.log('return error',ret.message);
                    deferred.reject();
                } else {
                    console.log('shouldnt be here');
                    deferred.reject();
                }
            },
            error: function(error) {
                clearInterval(monitorIntervalId);
                deferred.reject();
            }
        });
        return deferred.promise();
    }
    return (XFTSupportTools);
}({}));