window.XFTSupportTools = (function(XFTSupportTools) {
    var monitorIntervalId;
    var lastReturnSucc = true;

    XFTSupportTools.getRecentLogs = function(requireLineNum) {
        var action = "recentLogs";
        var str = {"requireLineNum" : requireLineNum};
        return (postRequest(action, str));
    }

    // pass in callbacks to get triggered upon each post return
    XFTSupportTools.monitorLogs = function(errCallback, successCallback) {
        clearInterval(monitorIntervalId);
        monitorIntervalId = setInterval(function() {
            if (lastReturnSucc) {
                lastReturnSucc = false;
                var action = "monitorLogs";
                // support multiple user
                var data = {"userID" : Support.getUser()};
                var promise = postRequest(action, data);
                promise
                .then(function(ret) {
                    console.info(ret);
                    lastReturnSucc = true;
                    if (typeof successCallback === "function") {
                        successCallback(ret);
                    }
                })
                .fail(function(err) {
                    console.warn(err);
                    lastReturnSucc = false;
                    if (typeof errCallback === "function") {
                        errCallback(ret);
                    }
                });
            }
        }, 1000);
    }

    XFTSupportTools.stopMonitorLogs = function() {
        var deferred = jQuery.Deferred();
        clearInterval(monitorIntervalId);
        $.ajax({
            type: 'POST',
            data: JSON.stringify({"userID" : Support.getUser()}),
            contentType: 'application/json',
            url: "https://authentication.xcalar.net/app/stopMonitorLogs",
            // url: "http://dijkstra:12124/stopMonitorLogs",
            success: function(data) {
                var ret = data;
                if (ret.status === Status.Ok) {
                    console.log('Stop successfully');
                    deferred.resolve(ret);
                } else if (ret.status === Status.Error) {
                    console.log('Stop fails');
                    deferred.reject(ret);
                } else {
                    console.log('shouldnt be here');
                    deferred.reject(ret);
                }
            },
            error: function(error) {
                console.log(error);
                deferred.reject(error);
            }
        });
        return (deferred.promise());
    };

    XFTSupportTools.startXcalarServices = function() {
        var action = "xcalarStart";
        return (postRequest(action));
    };

    XFTSupportTools.stopXcalarServices = function() {
        var action = "xcalarStop";
        return (postRequest(action));
    };

    XFTSupportTools.restartXcalarServices = function() {
        var action = "xcalarRestart";
        return (postRequest(action));
    };

    XFTSupportTools.statusXcalarServices = function() {
        var action = "xcalarStatus";
        return (postRequest(action));
    };

    XFTSupportTools.condrestartXcalarServices = function() {
        var action = "xcalarCondrestart";
        var str = undefined;
        return (postRequest(action, str));
    };

    XFTSupportTools.removeSessionFiles = function(filename) {
        var action = "removeSessionFiles";
        var str = {"filename" : filename};
        return (postRequest(action, str));
    };

    function postRequest(action, str) {
        var deferred = jQuery.Deferred();
        $.ajax({
            type: 'POST',
            data: JSON.stringify(str),
            contentType: 'application/json',
            url: "http://authentication.xcalar.net/app/" + action,
            // url: "http://dijkstra:12124/" + action,
            success: function(data) {
                var ret = data;
                var retMsg;
                if (ret.status === Status.Ok) {
                    var retMsg;
                    var status;
                    var logs;
                    if(ret.logs) {
                        logs = atob(ret.logs);
                        status = SupportStatus.OKLog;
                    } else {
                        logs = "";
                        status = SupportStatus.OKNoLog;
                    }
                    retMsg = {
                        status: status,
                        logs: logs
                    };
                    deferred.resolve(retMsg);
                } else if (ret.status === Status.Error) {
                    retMsg = {
                        status: SupportStatus.Error,
                        error: ret
                    };
                    deferred.reject(retMsg);
                } else {
                    retMsg = {
                        status: OKUnknown,
                        error: ret
                    };
                    deferred.reject(retMsg);
                }
            },
            error: function(error) {
                clearInterval(monitorIntervalId);
                retMsg = {
                    status: SupportStatus.Error,
                    error: error
                };
                deferred.reject(retMsg);
            }
        });
        return deferred.promise();
    }
    return (XFTSupportTools);
}({}));