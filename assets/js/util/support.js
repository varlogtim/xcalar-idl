window.Support = (function(Support, $) {
    var username;
    var commitFlag;
    var commitCheckTimer;
    var commitCheckInterval = 120000; // 2 mins each check
    var commitCheckInterval = 30000; // 0.5 mins each check
    var commitCheckError = "commit key not match";
    var memoryCheck = true;

    var connectionCheckTimer;
    var connectionCheckInterval = 10000; // 10s/check

    var numNodes;
    var statsMap = null;
    // constant
    var defaultCommitFlag = "commit-default";
    var defaultMemoryLimit = 70;

    var statsCache = {}; // Store temporary version of the Stats

    Support.setup = function() {
        try {
            username = sessionStorage.getItem("xcalar-username");
            // set up session variables
            userIdName = username;
            userIdUnique = getUserIdUnique(username);
        } catch (error) {
            console.error(error);
        }
    };

    Support.getUser = function() {
        return username;
    };

    Support.config = function(options) {
        if (options.memoryCheck != null) {
            memoryCheck = options.memoryCheck;
        }
    };

    Support.holdSession = function() {
        return sessionHoldCheck();
    };

    Support.releaseSession = function() {
        var deferred = jQuery.Deferred();
        var promise;

        if (StartManager.getStatus() === SetupStatus.Fail) {
            // when setup fails and logout, should not commit
            // (the module even didn't setup yet)
            promise = PromiseHelper.resolve();
        } else {
            promise = KVStore.commit();
        }

        promise
        .then(function() {
            return XcalarKeyPut(KVStore.commitKey, defaultCommitFlag, false, gKVScope.FLAG);
        })
        .then(function() {
            sessionStorage.removeItem(username);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    // in case you are hold forever
    Support.forceReleaseSession = function() {
        sessionStorage.removeItem(username);
        XcalarKeyPut(KVStore.commitKey, defaultCommitFlag, false, gKVScope.FLAG)
        .then(function() {
            location.reload();
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    Support.commitCheck = function() {
        var deferred = jQuery.Deferred();
        if (KVStore.commitKey == null) {
            // when workbook is not set up yet or no workbook yet
            deferred.resolve();
        } else {
            XcalarKeyLookup(KVStore.commitKey, gKVScope.FLAG)
            .then(function(val) {
                if (val == null || val.value !== commitFlag) {
                    commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.resolve();
                }
            })
            .fail(function(error) {
                if (error.status === StatusT.StatusSessionNotFound) {
                    commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.reject(error);
                }
            });
        }

        return (deferred.promise());
    };

    Support.memoryCheck = function() {
        if (!memoryCheck) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();

        defaultMemoryLimit = UserSettings.getPref('memoryLimit')
                                     || defaultMemoryLimit;

        XcalarApiTop()
        .then(function(result) {
            var tops = result.topOutputPerNode;
            for (var i = 0, len = tops.length; i < len; i++) {
                if (tops[i].memUsageInPercent > defaultMemoryLimit) {
                    DeleteTableModal.show(true);
                    return;
                }
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    Support.heartbeatCheck = function() {
        commitCheckInterval = (UserSettings.getPref('commitInterval') * 1000) ||
                             commitCheckInterval;
        clearInterval(commitCheckTimer);
        commitCheckTimer = setInterval(function() {
            if (KVStore.commitKey == null) {
                // when workbook is not set up yet or no workbook yet
                return;
            }

            Support.commitCheck()
            .then(function() {
                return Support.memoryCheck();
            })
            .then(function() {
                return autoSave();
            })
            .fail(function(error) {
                console.error(error);
            });

        }, commitCheckInterval);
    };

    Support.stopHeartbeatCheck = function() {
        clearInterval(commitCheckTimer);
    };

    Support.checkConnection = function() {
        // if we get this status, there may not be a connection to the backend
        // if xcalargetversion doesn't work then it's very probably that
        // there is no connection so alert.
        var connectionCheck = true;
        var deferred = jQuery.Deferred();

        XcalarGetVersion(connectionCheck)
        .then(deferred.resolve)
        .fail(function(error) {
            checkConnection();
            deferred.reject(error);
        });

        return deferred.promise();
    };

    Support.checkStats = function(stats) {
        var data = {};
        var deferred = jQuery.Deferred();
        getStatsMap()
        .then(function() {
            var statsMapArray = [];
            if (!stats) {
                for (var statKey in statsMap) {
                    statsMapArray.push(statsMap[statKey]);
                }

            } else if (!statsMap.hasOwnProperty(stats)) {
                console.error(stats, "doesn't exist");
                console.info("check:", statsMap);
                deferred.reject();
                return;
            } else {
                statsMapArray.push(statsMap[stats]);
            }

            var promises = [];

            for (var node = 0; node < numNodes; node++) {
                for (var sid = 0; sid < statsMapArray.length; sid++) {
                    var statsId = statsMapArray[sid];
                    promises.push(getStat.bind(null, node, statsId, data));
                }
            }

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            statsCache = data;
            console.log(statsMap);
            var file = "";
            for (var groupId in data) {
                var oneRow = {};
                // var notFound = false;
                for (var j = 0; j < data[groupId]["node0"]["stats"].length; j++) {
                    oneRow.groupName = groupId;
                    for (var gName in statsMap) {
                        if (statsMap[gName] === groupId) {
                            oneRow.groupName = gName;
                            break;
                        }
                    }

                    oneRow.name = data[groupId]["node0"]["stats"][j]["statName"];
                    for (var i = 0; i<numNodes; i++) {
                        stat = data[groupId]["node"+i]["stats"][j];
                        oneRow["node"+i] = stat["statValue"];
                    }
                    var outRow = ("                                         " +
                                  oneRow.groupName).slice(-40);
                    outRow += ("                                         " +
                               oneRow.name).slice(-40);
                    for (var i = 0; i < numNodes; i++) {
                        outRow += ("                                         " +
                                   oneRow["node"+i]).slice(-20);
                    }
                    outRow += "\n";
                    file += outRow;
                }
            }

            var header = ("                                    GroupName")
                          .slice(-40);
            header += ("                                         StatName")
                       .slice(-40);
            for (var i = 0; i < numNodes; i++) {
                header += ("                                         Node"+i)
                           .slice(-20);
            }
            header += "\n";
            statsCache = header + file;
            console.info(data);
            deferred.resolve(header + file);
        });
        return deferred.promise();
    };

    Support.downloadLog = function(targetUsername, targetWorkbookName) {
        var log;
        var errLog;
        XcalarKeyLookup(targetUsername+"-wkbk-"+targetWorkbookName+"-gLog", 1)
        .then(function(l) {
            log = l;
            return (XcalarKeyLookup(targetUsername + "-wkbk-" +
                                   targetWorkbookName + "-gErr", 1));
        })
        .then(function(e) {
            errLog = e;
            var overall = {};
            overall.log = log;
            overall.err = errLog;
            xcHelper.downloadAsFile(targetUsername + "-" + targetWorkbookName +
                                    ".txt", JSON.stringify(overall));
        });
    };

    Support.downloadStats = function(stats) {
        Support.checkStats(stats)
        .then(function(f) {
            xcHelper.downloadAsFile(userIdName + "-stats-" +
                                    xcHelper.getCurrentTimeStamp() + ".txt", f);
            console.log(f);
        });
    };

    Support.downloadLRQ = function(lrqName) {
        XcalarExportRetina(lrqName)
        .then(function(a) {
            xcHelper.downloadAsFile(lrqName + ".tar.gz", a.retina, true);
        })
        .fail(function(error) {
            Alert.error(DFTStr.DownloadErr, error);
        });
    };

    //Support.uploadLRQ = function(lrqName, overwriteUDF, )

    function sessionHoldCheck() {
        var deferred = jQuery.Deferred();

        holdCheckHelper()
        .then(function() {
            commitFlag = randCommitFlag();
            // hold the session
            return XcalarKeyPut(KVStore.commitKey, commitFlag, false, gKVScope.FLAG);
        })
        .then(function() {
            // mark as hold in browser tab
            sessionStorage.setItem(username, "hold");
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());

        function holdCheckHelper() {
            var innerDeferred = jQuery.Deferred();

            XcalarKeyLookup(KVStore.commitKey, gKVScope.FLAG)
            .then(function(val) {
                if (val == null || val.value === defaultCommitFlag) {
                    innerDeferred.resolve();
                } else if (sessionStorage.getItem(username) === "hold") {
                    // when this browser tab hold the seesion and not release
                    console.warn("Session not release last time...");
                    innerDeferred.resolve();
                } else {
                    innerDeferred.reject(WKBKTStr.Hold);
                }
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }
    }

    function checkConnection() {
        clearTimeout(connectionCheckTimer);

        connectionCheckTimer = setTimeout(function() {
            // if fail, continue to another check
            Support.checkConnection()
            .then(function() {
                clearTimeout(connectionCheckTimer);
                // reload browser if connection back
                location.reload();
            });
        }, connectionCheckInterval);
    }

    function autoSave() {
        if (SQL.hasUnCommitChange() ||
            KVStore.hasUnCommitChange()) {
            return KVStore.commit();
        } else {
            return PromiseHelper.resolve();
        }
    }

    function commitMismatchHandler() {
        Support.stopHeartbeatCheck();

        // hide all modal
        $(".modalContainer:not(.locked)").hide();
        // this browser tab does not hold any more
        sessionStorage.removeItem(username);
        // user should force to logout
        sessionStorage.removeItem("xcalar-username");

        Alert.show({
            "title"     : WKBKTStr.Expire,
            "msg"       : WKBKTStr.ExpireMsg,
            "lockScreen": true,
            "logout"    : true
        });
    }

    function randCommitFlag() {
        return "commit" + Math.floor((Math.random() * 10000) + 1);
    }

    function getStatsMap() {
        if (statsMap != null) {
            return PromiseHelper.resolve();
        }
        var deferred = jQuery.Deferred();

        XcalarGetStatGroupIdMap(0, 100)
        .then(function(res) {
            statsMap = {};
            var groups = res.groupName;
            var numGroupNames = res.numGroupNames;
            for (var i = 0; i < numGroupNames; i++) {
                statsMap[groups[i]] = i;
            }

            return XcalarApiTop();
        })
        .then(function(res) {
            numNodes = res.numNodes;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getStat(nodeId, statsId, data) {
        var deferred = jQuery.Deferred();

        XcalarGetStatsByGroupId([nodeId], [statsId])
        .then(function(res) {
            if (!data[statsId]) {
                data[statsId] = {};
            }
            data[statsId]["node" + nodeId] = res;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getUserIdUnique(name) {
        var hash = jQuery.md5(name);
        var len = 5;
        var id = parseInt("0x" + hash.substring(0, len)) + 4000000;
        return id;
    }

    return (Support);
}({}, jQuery));
