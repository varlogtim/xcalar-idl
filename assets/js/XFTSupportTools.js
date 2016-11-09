window.XFTSupportTools = (function(XFTSupportTools) {
    var monitorIntervalId;
    var lastReturnSucc = true;

    XFTSupportTools.getRecentLogs = function(requireLineNum) {
        var action = "/recentLogs";
        var str = {"requireLineNum" : requireLineNum};
        return requestService(action, str);
    }

    // pass in callbacks to get triggered upon each post return
    XFTSupportTools.monitorLogs = function(errCallback, successCallback) {
        clearInterval(monitorIntervalId);
        monitorIntervalId = setInterval(getLog, 2000);
        getLog();

        function getLog() {
            if (lastReturnSucc) {
                lastReturnSucc = false;
                var action = "/monitorLogs";
                // support multiple user)
                var data = {"userID" : userIdUnique};
                postRequest(action, data)
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
                        errCallback(err);
                    }
                });
            }
        }
    }

    XFTSupportTools.stopMonitorLogs = function() {
        var deferred = jQuery.Deferred();
        clearInterval(monitorIntervalId);
        $.ajax({
            type: 'POST',
            data: JSON.stringify({"userID" : Support.getUser()}),
            contentType: 'application/json',
            url: "https://" + hostname + ":12124/app/stopMonitorLogs",
            success: function(data) {
                var ret = data;
                if (ret.status === Status.Ok) {
                    console.log('Stop successfully');
                    deferred.resolve(ret);
                } else if (ret.status === Status.Error) {
                    console.error('Stop fails');
                    deferred.reject(ret);
                } else {
                    console.log('shouldnt be here');
                    deferred.reject(ret);
                }
            },
            error: function(error) {
                console.error(error);
                deferred.reject(error);
            }
        });
        return (deferred.promise());
    };

    XFTSupportTools.startXcalarServices = function() {
        var action = "/service/start";
        return requestService(action);
    };

    XFTSupportTools.stopXcalarServices = function() {
        var action = "/service/stop";
        return requestService(action);
    };

    XFTSupportTools.restartXcalarServices = function() {
        var action = "/service/restart";
        return requestService(action);
    };

    XFTSupportTools.statusXcalarServices = function() {
        var action = "/service/status";
        return requestService(action);
    };

    XFTSupportTools.condrestartXcalarServices = function() {
        var action = "/service/condrestart";
        return requestService(action);
    };

    XFTSupportTools.removeSessionFiles = function(filename) {
        var action = "/removeSessionFiles";
        var str = {"filename" : filename};
        return requestService(action, str);
    };

    XFTSupportTools.getLicense = function() {
        var action = "/getLicense";
        return requestService(action);
    };

    XFTSupportTools.fileTicket = function(jsonStr) {
        var action = "/fileTicket";
        var str = {"contents": jsonStr};
        return requestService(action, str);
    };

    function requestService(action, str) {
        var promise = postRequest(action, str);
        var deferred = jQuery.Deferred();
        promise
        .then(function(result) {
            console.log("Every Node execute successfully");
            console.log(result.logs);
            deferred.resolve(result);
        })
        .fail(function(result) {
            console.log("With Node fail to execute");
            console.log(result.logs);
            deferred.reject(result);
        });
        return deferred.promise();
    }

    function postRequest(action, str) {
        var deferred = jQuery.Deferred();
        $.ajax({
            type: 'POST',
            data: JSON.stringify(str),
            contentType: 'application/json',
            //url: "http://cantor.int.xcalar.com:12125" + action,
            url: "https://" + hostname + ":12124/app" + action,
            success: function(data) {
                var ret = data;
                var retMsg;
                if (ret.status === Status.Ok) {
                    var retMsg;
                    var status;
                    var logs;
                    if (ret.logs) {
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
                        status: SupportStatus.OKUnknown,
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