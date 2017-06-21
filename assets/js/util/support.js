window.Support = (function(Support, $) {
    var username;
    var fullUsername;
    var commitFlag;
    var commitCheckTimer;
    var commitCheckInterval = 120000; // 2 mins each check
    var commitCheckError = "commit key not match";
    var cancelCheck = "cancel check";

    var connectionCheckTimer;
    var connectionCheckInterval = 10000; // 10s/check

    var numNodes;
    var statsMap = null;
    var isCheckingMem = false;
    var heartbeatLock = 0;
    // constant
    var defaultCommitFlag = "commit-default";

    var statsCache = {}; // Store temporary version of the Stats

    Support.setup = function(stripEmail) {
        try {
            username = xcSessionStorage.getItem("xcalar-username");
            fullUsername = username;

            if (stripEmail) {
                username = stripCharFromUserName(username, "@");
            }
            if (gCollab) {
                username = stripCharFromUserName(username, "/");
            }
            // set up session variables
            userIdName = username;
            userIdUnique = getUserIdUnique(username);
        } catch (error) {
            console.error(error);
        }
    };

    Support.getUserIdUnique = getUserIdUnique;

    function stripCharFromUserName(name, ch) {
        var atIndex = name.indexOf(ch);
        if (atIndex > 0) {
            name = name.substring(0, atIndex);
        }
        return name;
    }

    Support.getUser = function() {
        return username;
    };

    Support.getFullUsername = function() {
        return fullUsername;
    };

    Support.holdSession = function() {
        return sessionHoldCheck();
    };

    Support.releaseSession = function() {
        var deferred = jQuery.Deferred();
        var promise;

        if (xcManager.getStatus() === SetupStatus.Fail) {
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
            xcSessionStorage.removeItem(username);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    // in case you are hold forever
    Support.forceReleaseSession = function() {
        xcSessionStorage.removeItem(username);
        XcalarKeyPut(KVStore.commitKey, defaultCommitFlag, false, gKVScope.FLAG)
        .then(function() {
            location.reload();
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    Support.commitCheck = function(isFromHeatbeatCheck) {
        var deferred = jQuery.Deferred();
        if (KVStore.commitKey == null ||
            WorkbookManager.getActiveWKBK() == null) {
            // when workbook is not set up yet or no workbook yet
            deferred.resolve();
        } else {
            XcalarKeyLookup(KVStore.commitKey, gKVScope.FLAG)
            .then(function(val) {
                if (isFromHeatbeatCheck && (commitCheckTimer == null)) {
                    deferred.reject(cancelCheck);
                } else if (val == null || val.value !== commitFlag) {
                    commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.resolve();
                }
            })
            .fail(function(error) {
                if (isFromHeatbeatCheck && (commitCheckTimer == null)) {
                    deferred.reject(cancelCheck);
                } else if (error.status === StatusT.StatusSessionNotFound) {
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
        if (isCheckingMem) {
            console.warn("Last time's  mem check not finish yet");
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();

        var yellowThreshold = 0.6;
        var redThreshold = 0.8;

        isCheckingMem = true;

        refreshTables()
        .then(XcalarApiTop)
        .then(detectMemoryUsage)
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            isCheckingMem = false;
        });

        return deferred.promise();

        function refreshTables() {
            var innerDeferred = jQuery.Deferred();
            // need it to detect if users have tables
            TableList.refreshOrphanList(false)
            .always(innerDeferred.resolve);

            return innerDeferred.promise();
        }

        function detectMemoryUsage(topOutput) {
            var highestMemUsage = 0;
            var used = 0;
            var total = 0;

            var numNodes = topOutput.numNodes;

            for (var i = 0; i < numNodes; i++) {
                var node = topOutput.topOutputPerNode[i];
                var xdbUsage = node.xdbUsedBytes / node.xdbTotalBytes;

                used += node.xdbUsedBytes;
                total += node.xdbTotalBytes;

                highestMemUsage = Math.max(highestMemUsage, xdbUsage);
            }

            handleMemoryUsage(highestMemUsage, used / total);
        }

        function handleMemoryUsage(highestMemUsage, avgMemUsage) {
            var shouldAlert = false;
            var $memoryAlert = $("#memoryAlert");

            if (highestMemUsage > redThreshold) {
                // when it's red, can stop loop immediately
                $memoryAlert.addClass("red").removeClass("yellow");
                shouldAlert = true;
            } else if (highestMemUsage > yellowThreshold) {
                // when it's yellow, should continue loop
                // to see if it has any red case
                $memoryAlert.addClass("yellow").removeClass("red");
                shouldAlert = true;
            } else {
                $memoryAlert.removeClass("red").removeClass("yellow");
            }

            var percent = Math.round(avgMemUsage * 100) + "%";
            var usageText = "<br>" + CommonTxtTstr.XDBUsage + ": " + percent;
            if (shouldAlert) {
                // we want user to drop table first and only when no tables
                // let them drop ds
                if (jQuery.isEmptyObject(gTables) && gOrphanTables.length === 0)
                {
                    text = TooltipTStr.LowMemInDS + usageText;
                    $memoryAlert.removeClass("tableAlert");
                } else {
                    text = TooltipTStr.LowMemInTable + usageText;
                    $memoryAlert.addClass("tableAlert");
                }
            } else {
                text = TooltipTStr.SystemGood + usageText;
            }

            xcTooltip.changeText($memoryAlert, text);
            return shouldAlert;
        }
    };

    Support.heartbeatCheck = function() {
        if (WorkbookManager.getActiveWKBK() == null) {
            console.info("no active workbook, not check");
            return;
        }

        var isChecking = false;
        commitCheckInterval = (UserSettings.getPref('commitInterval') * 1000) ||
                             commitCheckInterval;
        clearInterval(commitCheckTimer);
        commitCheckTimer = setInterval(function() {
            if (KVStore.commitKey == null) {
                // when workbook is not set up yet or no workbook yet
                return;
            }

            // last time not finishing
            if (isChecking) {
                console.warn("Last time's check not finishing yet!");
                return;
            }

            isChecking = true;
            Support.commitCheck(true)
            .then(function() {
                // this one just commit tracker data
                // can be paraell
                xcTracker.commit();
                return Support.memoryCheck();
            })
            .then(function() {
                return autoSave();
            })
            .fail(function(error) {
                console.error(error);
            })
            .always(function() {
                isChecking = false;
            });

        }, commitCheckInterval);
    };

    Support.stopHeartbeatCheck = function() {
        clearInterval(commitCheckTimer);
        commitCheckTimer = null;
        heartbeatLock++;
        // console.log("lock to", heartbeatLock);
    };

    Support.restartHeartbeatCheck = function() {
        if (heartbeatLock === 0) {
            console.error("wrong trigger, must combine with stopHeartbeatCheck");
            return;
        }
        heartbeatLock--;
        // console.log("unlock to", heartbeatLock);
        if (heartbeatLock > 0) {
            console.info("heart beat is locked");
            return;
        }

        return Support.heartbeatCheck();
    };

    Support.checkConnection = function() {
        checkConnection()
        .fail(function() {
            var error = {"error": ThriftTStr.CCNBE};
            var id = Alert.error(ThriftTStr.CCNBEErr, error, {
                "lockScreen": true,
                "noLogout": true
            });
            SQL.backup();

            checkConnectionTrigger(10, id);
        });
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
                    for (var i = 0; i < numNodes; i++) {
                        stat = data[groupId]["node" + i]["stats"][j];
                        oneRow["node" + i] = stat["statValue"];
                    }
                    var outRow = ("                                         " +
                                  oneRow.groupName).slice(-40);
                    outRow += ("                                         " +
                               oneRow.name).slice(-40);
                    for (var i = 0; i < numNodes; i++) {
                        outRow += ("                                         " +
                                   oneRow["node" + i]).slice(-20);
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
                header += ("                                         Node" + i)
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

    Support.getRunTimeBreakdown = function(dfName) {
        XcalarQueryState(dfName)
        .then(function(ret) {
            var nodeArray = ret.queryGraph.node;
            for (var i = 0; i < nodeArray.length; i++) {
                console.log(XcalarApisTStr[nodeArray[i].api] + ": " +
                            nodeArray[i].elapsed.milliseconds + "ms");
            }
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
            xcSessionStorage.setItem(username, "hold");
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
                } else if (xcSessionStorage.getItem(username) === "hold") {
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
        // if we get this status, there may not be a connection to the backend
        // if xcalargetversion doesn't work then it's very probably that
        // there is no connection so alert.
        var connectionCheck = true;
        return XVM.checkVersion(connectionCheck);
    }

    function checkConnectionTrigger(cnt, alertId) {
        var interval = 1000; // 1s/update
        var mod = Math.floor(connectionCheckInterval / interval);
        cnt = cnt % mod;

        var shouldCheck = (cnt === 0);
        var timeRemain = (connectionCheckInterval - cnt * interval) / 1000;
        var msg = AlertTStr.NoConnect + " ";

        msg += shouldCheck
                ? AlertTStr.Connecting
                : xcHelper.replaceMsg(AlertTStr.TryConnect, {
                    "second": timeRemain
                });

        Alert.updateMsg(alertId, msg);

        clearTimeout(connectionCheckTimer);

        connectionCheckTimer = setTimeout(function() {
            if (shouldCheck) {
                // if fail, continue to another check
                checkConnection()
                .then(function(versionMatch) {
                    clearTimeout(connectionCheckTimer);
                    // reload browser if connection back
                    var hardLoad = !versionMatch;
                    location.reload(hardLoad);
                })
                .fail(function() {
                    checkConnectionTrigger(cnt + 1, alertId);
                });
            } else {
                checkConnectionTrigger(cnt + 1, alertId);
            }
        }, interval);
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
        xcSessionStorage.removeItem(username);
        // user should force to logout
        xcSessionStorage.removeItem("xcalar-username");

        Alert.show({
            "title": WKBKTStr.Expire,
            "msg": WKBKTStr.ExpireMsg,
            "lockScreen": true,
            "logout": true
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
