var atob = require("atob");
// Control xcalar services
var actionStart = "/service/start";
var actionStop = "/service/stop";
var actionRestart = "/service/restart";
var actionStatus = "/service/status/slave";
var actionCondRestart = "/service/condrestart";
var hostFile = '/config/privHosts.txt';
var support = require('./support');
var ssf = require('./supportStatusFile');
var Status = ssf.Status;

var hosts = [];

var jQuery;
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});


function testService(reverseOperation, targetOperation, preStatus, expectedStatus) {
    var deferredOut = jQuery.Deferred();
    var deferredReverseOperation = jQuery.Deferred();
    var deferredStatus = jQuery.Deferred();
    var deferredOperation = jQuery.Deferred();
    // Get all the host nodes
    getHost()
    // Stop xcalar service
    .then(function(hosts) {
        sendRequest(reverseOperation)
        .always(function(retMsg) {
            deferredReverseOperation.resolve(hosts);
        });
    });
    // Send request to each node to get their status, find out all stopped nodes,
    // assuming those nodes are good nodes
    deferredReverseOperation
    .then(function(hosts) {
        getStatusFromEachSlave(hosts)
        .always(function(retMsgArr) {
            var goodNodes = findGoodNodes(preStatus, retMsgArr);
            deferredStatus.resolve(goodNodes);
        });
    });
    // Start xcalar service
    deferredStatus
    .then(function(goodNodes) {
        sendRequest(targetOperation)
        .always(function(retMsg) {
            deferredOperation.resolve(goodNodes);
        });
    });
    // Get the status of all the good nodes, if they are all successfully started,
    // then service xcalar start is working correctly!
    deferredOperation
    .then(function(goodNodes) {
        getStatusFromEachSlave(goodNodes)
        .always(function(retMsgArr) {
            if(judgeExecution(expectedStatus, goodNodes, retMsgArr)) {
                deferredOut.resolve();
            } else {
                deferredOut.reject();
            }
        });
    });

    return deferredOut.promise();
}

function findGoodNodes(isGoodNodesStarted, retMsgArr) {
    var goodNodes = [];
    for (var key in retMsgArr) {
        if(retMsgArr[key].logs) {
            if(isGoodNodesStarted && retMsgArr[key].logs.indexOf("Mgmtd started") != -1) {
                goodNodes.push(key);
            }
            if(!isGoodNodesStarted && retMsgArr[key].logs.indexOf("Mgmtd not started") != -1) {
                goodNodes.push(key);
            }
        }
    }
    return goodNodes;
}

function judgeExecution(isGoodNodesStarted, goodNodes, retMsgArr) {
    var startNum = 0;
    var stopNum = 0;

    if(retMsgArr) {
        for (var key in retMsgArr) {
            var resSlave = retMsgArr[key];
            if(resSlave["logs"].indexOf("Mgmtd started") != -1) {
                startNum++;
            } else if (resSlave["logs"].indexOf("Mgmtd not started") != -1) {
                stopNum++;
            }
        }
    }

    if(isGoodNodesStarted) {
        if(startNum != goodNodes.length) {
            return false;
        } else {
            return true;
        }
    } else {
        if(stopNum != goodNodes.length) {
            return false;
        } else {
            return true;
        }
    }
}

function testServiceStart() {
    var deferredOut = jQuery.Deferred();
    testService(actionStop, actionStart, false, true)
    .then(function() {
        console.log("Execute service start successfully!");
        deferredOut.resolve();
    })
    .fail(function() {
        console.log("Fail to execute service start!");
        deferredOut.reject();
    });
    return deferredOut.promise();
}

function testServiceStop() {
    var deferredOut = jQuery.Deferred();
    testService(actionStart, actionStop, true, false)
    .then(function() {
        console.log("Execute service stop successfully!");
        deferredOut.resolve();
    })
    .fail(function() {
        console.log("Fail to execute service stop!");
        deferredOut.reject();
    });
    return deferredOut.promise();
}

function testServiceRestart() {
    var deferredOut = jQuery.Deferred();
    var p1 = testService(actionStart, actionRestart, true, true);
    var p2 = testService(actionStop, actionRestart, false, true);
    jQuery.when(p1, p2)
    .then(function() {
        console.log("Execute service restart successfully!");
        deferredOut.resolve();
    })
    .fail(function() {
        console.log("Fail to execute service restart!");
        deferredOut.reject();
    });
    return deferredOut.promise();
}

function getHost() {
    var deferred = jQuery.Deferred();
    support.getXlrRoot()
    .always(function(xlrRoot) {
        support.readHostsFromFile(xlrRoot + hostFile)
        .always(function(hosts) {
            deferred.resolve(hosts);
        })
    })
    return deferred.promise();
}

function getStatusFromEachSlave(hosts) {
    var mainDeferred = jQuery.Deferred();
    var numDone = 0;
    var returns = {};
    var hasFailure = false;

    for(var i = 0; i < hosts.length; i++) {
        postRequest(hosts[i]);
    }

    function postRequest(hostName) {
        jQuery.ajax({
            type: 'POST',
            contentType: 'application/json',
            url: "http://" + hostName + "/app" + actionStatus,
            success: function(data) {
                var ret = data;
                var retMsg;
                if (ret.status === Status.Ok) {
                    retMsg = ret;
                    returns[hostName] = retMsg;
                } else if (ret.status === Status.Error) {
                    retMsg = ret;
                    hasFailure = true;
                } else {
                    retMsg = {
                        status: Status.OKUnknown,
                        error: ret
                    };
                    hasFailure = true;
                }
                numDone++;
                if (numDone === hosts.length) {
                    if(hasFailure) {
                        mainDeferred.reject(returns);
                    } else {
                        mainDeferred.resolve(returns);
                    }
                }
            },
            error: function(error) {
                numDone++;
                if (numDone === hosts.length - 1) {
                    mainDeferred.reject(returns);
                }
            }
        });
    }
    return mainDeferred.promise();
}

function sendRequest(action, str) {
    var deferred = jQuery.Deferred();
    jQuery.ajax({
        type: 'POST',
        data: JSON.stringify(str),
        contentType: 'application/json',
        url: "http://" + hostName + "/app" + action,
        success: function(data) {
            var ret = data;
            var retMsg;
            if (ret.status === Status.Ok) {
                var retMsg;
                var status;
                var logs;
                if (ret.logs) {
                    logs = atob(ret.logs);
                    status = Status.Ok;
                } else {
                    logs = "";
                    status = Status.Ok;
                }
                retMsg = {
                    status: status,
                    logs: logs
                };
                deferred.resolve(retMsg);
            } else if (ret.status === Status.Error) {
                retMsg = {
                    status: Status.Error,
                    error: ret
                };
                deferred.reject(retMsg);
            } else {
                retMsg = {
                    status: Status.OKUnknown,
                    error: ret
                };
                deferred.reject(retMsg);
            }
        },
        error: function(error) {
            retMsg = {
                status: Status.Error,
                error: error
            };
            deferred.reject(retMsg);
        }
    });
    return deferred.promise();
}

setTimeout(function() {
    testServiceStart()
    .always(function() {
        testServiceStop()
        .always(function() {
            testServiceRestart();
        });
    });
}, 5000);