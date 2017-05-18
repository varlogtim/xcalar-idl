window.XFTSupportTools = (function(XFTSupportTools, $) {
    var monitorIntervalId;
    var lastReturnSucc = true;
    var expendFactor = 1.2;
    var timeoutBase = 300000;
    var timeout = timeoutBase * expendFactor * expendFactor * 2;
    var lastMonitorMap = {};

    XFTSupportTools.getRecentLogs = function(requireLineNum, filePath,
        fileName) {
        var action = "GET";
        var url = "/logs";
        var content = {
            "requireLineNum": requireLineNum,
            "isMonitoring": false,
            "filePath": filePath,
            "fileName": fileName
        };
        return sendRequest(action, url, content);
    };

    // pass in callbacks to get triggered upon each post return
    XFTSupportTools.monitorLogs = function(filePath, fileName, errCallback, successCallback) {
        clearInterval(monitorIntervalId);
        monitorIntervalId = setInterval(getLog, 2000);
        getLog();

        function getLog() {
            if (lastReturnSucc) {
                lastReturnSucc = false;
                var action = "GET";
                var url = "/logs";
                var content = {
                    "lastMonitorMap": JSON.stringify(lastMonitorMap),
                    "isMonitoring": true,
                    "filePath": filePath,
                    "fileName": fileName
                };
                sendRequest(action, url, content)
                .then(function(ret) {
                    console.info(ret);
                    lastReturnSucc = true;
                    setLastMonitors(ret.updatedLastMonitorMap);
                    if (typeof successCallback === "function") {
                        successCallback(ret);
                    }
                })
                .fail(function(err) {
                    console.warn(err);
                    lastReturnSucc = true;
                    if (!err.updatedLastMonitorMap) {
                        // connection error
                        lastMonitorMap = {};
                        clearInterval(monitorIntervalId);
                    } else {
                        // node failure case
                        setLastMonitors(err.updatedLastMonitorMap);
                    }
                    // If not all nodes return successfully, getLog() will
                    // enter here, then we should still keep watching the
                    // successfully return logs.
                    if (typeof errCallback === "function") {
                        errCallback(err);
                    }
                });
            }
        }
    };

    XFTSupportTools.stopMonitorLogs = function() {
        clearInterval(monitorIntervalId);
        lastMonitorMap = {};
    };

    XFTSupportTools.clusterStart = function() {
        var action = "POST";
        var url = "/service/start";
        return sendRequest(action, url);
    };

    XFTSupportTools.clusterStop = function() {
        var action = "POST";
        var url = "/service/stop";
        return sendRequest(action, url);
    };

    XFTSupportTools.clusterRestart = function() {
        var action = "POST";
        var url = "/service/restart";
        return sendRequest(action, url);
    };

    XFTSupportTools.clusterStatus = function() {
        var action = "GET";
        var url = "/service/status";
        return sendRequest(action, url);
    };

    XFTSupportTools.removeSessionFiles = function(filename) {
        var action = "DELETE";
        var url = "/sessionFiles";
        var content = {"filename": filename};
        return sendRequest(action, url, content);
    };

    XFTSupportTools.removeSHM = function() {
        var action = "DELETE";
        var url = "/SHMFiles";
        return sendRequest(action, url);
    };

    XFTSupportTools.getLicense = function() {
        var action = "GET";
        var url = "/license";
        return sendRequest(action, url);
    };

    XFTSupportTools.fileTicket = function(inputStr) {
        var action = "POST";
        var url = "/ticket";
        var content = {"contents": inputStr};
        return sendRequest(action, url, content);
    };

    function isHTTP() {
        return window.location.protocol === "http:";
    }

    function sendRequest(action, url, content) {
        var data = prePraseSendData(action, content);
        var deferred = jQuery.Deferred();
        $.ajax({
            "type": action,
            "data": data,
            "contentType": "application/json",
            "url": xcHelper.getAppUrl() + url,
            "cache": false,
            "timeout": timeout,
            success: function(data) {
                data = parseSuccessData(data);
                deferred.resolve(data);
            },
            error: function(xhr) {
                var data = parseErrorData(xhr);
                // console.log(data.logs);
                deferred.reject(data);
            }
        });
        return deferred.promise();
    }

    function prePraseSendData(action, content) {
        var data = content ? content : {};
        // A flag to indicate whether current window is using http protocol or not
        data.isHTTP = isHTTP();
        // Post and Delete case, send a String
        // Get case, send a JSON object
        if (action !== "GET") {
            data = JSON.stringify(data);
        }
        return data;
    }

    function parseSuccessData(data) {
        // If this request will be sent to all slave nodes
        // success state means that all slave nodes return 200
         // to master node
        if (data.logs) {
            data.logs = atob(data.logs);
        }
        return data;
    }

    function parseErrorData(xhr) {
        // If this request will be sent to all slave nodes
        // error state means that some slave nodes fails to
        // return 200 to master node
        var data;
        if (xhr.responseJSON) {
            // under this case, server sent the response and set
            // the status code
            data = xhr.responseJSON;
            if (data.logs) {
                data.logs = atob(data.logs);
            }
        } else {
            // under this case, the error status is not set by
            // server, it may due to other reasons, therefore we
            // need to create our own JSON object
            data = {
                "status": xhr.status,
                "logs": xhr.statusText,
                "unexpectedError": true
            };
        }
        return data;
    }

    function setLastMonitors(map) {
        for (var node in map) {
            lastMonitorMap[node] = map[node];
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        var oldSendRequest = sendRequest;
        XFTSupportTools.__testOnly__ = {};
        XFTSupportTools.__testOnly__.prePraseSendData = prePraseSendData;
        XFTSupportTools.__testOnly__.parseSuccessData = parseSuccessData;
        XFTSupportTools.__testOnly__.parseErrorData = parseErrorData;
        XFTSupportTools.__testOnly__.getMonitorMap = function() {
            return lastMonitorMap;
        };

        XFTSupportTools.__testOnly__.setSendRequest = function(res, isErr){
            sendRequest = function(action, url, content) {
                var output = res || prePraseSendData(action, content);
                if (isErr) {
                    return PromiseHelper.reject(output);
                } else {
                    return PromiseHelper.resolve(output);
                }
            };
            return sendRequest;
        };

        XFTSupportTools.__testOnly__.resetSendRequest = function() {
            sendRequest = oldSendRequest;
        };
    }
    /* End Of Unit Test Only */

    return (XFTSupportTools);
}({}, jQuery));