window.XcSupport = (function(XcSupport, $) {
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
    var turnOffRedMemoryAlert = false;
    // constant
    var defaultCommitFlag = "commit-default";

    XcSupport.setup = function(stripEmail) {
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
            //userToken = "0000";
        } catch (error) {
            console.error(error);
        }
    };

    XcSupport.getUserIdUnique = getUserIdUnique;

    function stripCharFromUserName(name, ch) {
        var atIndex = name.indexOf(ch);
        if (atIndex > 0) {
            name = name.substring(0, atIndex);
        }
        return name;
    }

    XcSupport.getUser = function() {
        return username;
    };

    XcSupport.getFullUsername = function() {
        return fullUsername;
    };

    XcSupport.holdSession = function(workbookId, alreadyStarted) {
        if (workbookId == null) {
            xcSessionStorage.removeItem(XcSupport.getUser());
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var xcSocket = XcSocket.Instance;
        var promise = (alreadyStarted === true)
                      ? PromiseHelper.resolve(false)
                      : xcSocket.checkUserSessionExists(workbookId);

        promise
        .then(sessionHoldAlert)
        .then(function() {
            xcSessionStorage.removeItem(XcSupport.getUser());
            xcSocket.registerUserSession(workbookId);
            commitFlag = randCommitFlag();
            // hold the session
            return XcalarKeyPut(KVStore.commitKey, commitFlag,
                                false, gKVScope.FLAG);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    function sessionHoldAlert(userExist) {
        var deferred = PromiseHelper.deferred();
        if (userExist) {
            var lastLogInTime = xcSessionStorage.getItem(XcSupport.getUser());
            lastLogInTime = Number(lastLogInTime);
            // 25000 is the pingInterval for socket io if it's long polling
            // see: https://socket.io/docs/server-api/
            if (lastLogInTime && new Date().getTime() - lastLogInTime <= 25000) {
                // in this case consider as a refresh case
                deferred.resolve();

            } else {
                var $initScreen = $("#initialLoadScreen");
                var isVisible = $initScreen.is(":visible");
                if (isVisible) {
                    $initScreen.hide();
                }
                // when seesion is hold by others
                Alert.show({
                    "title": WKBKTStr.Hold,
                    "msg": WKBKTStr.HoldMsg,
                    "buttons": [{
                        "name": CommonTxtTstr.Back,
                        "className": "cancel",
                        "func": function() {
                            deferred.reject(WKBKTStr.Hold);
                        }
                    },
                    {
                        "name": WKBKTStr.Release,
                        "className": "cancel",
                        "func": function() {
                            if (isVisible) {
                                $initScreen.show();
                            }
                            deferred.resolve();
                        }
                    }],
                    "noCancel": true
                });
            }
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    XcSupport.releaseSession = function() {
        var deferred = PromiseHelper.deferred();
        var promise;

        if (xcManager.isStatusFail()) {
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
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    XcSupport.commitCheck = function(isFromHeatbeatCheck) {
        var deferred = PromiseHelper.deferred();
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

    XcSupport.memoryCheck = function(onlyCheckOnWarn) {
        if (isCheckingMem) {
            console.warn("Last time's mem check not finish yet");
            return PromiseHelper.resolve();
        } else if (onlyCheckOnWarn && !hasMemoryWarn()) {
            // this case no need to check
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();

        isCheckingMem = true;

        refreshTables()
        .then(XcalarApiTop)
        .then(XcSupport.detectMemoryUsage)
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            isCheckingMem = false;
        });

        return deferred.promise();

        function refreshTables() {
            if (jQuery.isEmptyObject(gTables) && gOrphanTables.length === 0) {
                // no tables, need a refresh
                var promise = TableList.refreshOrphanList(false);
                return PromiseHelper.alwaysResolve(promise);
            } else {
                return PromiseHelper.resolve();
            }
        }

        function hasMemoryWarn() {
            var $memoryAlert = $("#memoryAlert");
            return ($memoryAlert.hasClass("yellow") ||
                    $memoryAlert.hasClass("red"));
        }
    };

    XcSupport.detectMemoryUsage = function(topOutput) {
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
        var avgUsg = used / total;
        if (isNaN(avgUsg)) {
            avgUsg = 0;
        }

        var shouldAlert = handleMemoryUsage(highestMemUsage, avgUsg);
        if (shouldAlert) {
            return PromiseHelper.alwaysResolve(TableList.refreshOrphanList(false));
        } else {
            return PromiseHelper.resolve();
        }
    };

    function handleMemoryUsage(highestMemUsage, avgMemUsage) {
        var yellowThreshold = 0.6;
        var redThreshold = 0.8;
        var shouldAlert = false;
        var $memoryAlert = $("#memoryAlert").removeClass("inActive");

        if (highestMemUsage > redThreshold) {
            // when it's red, can stop loop immediately
            $memoryAlert.addClass("red").removeClass("yellow");
            shouldAlert = true;
            redMemoryAlert();
        } else if (highestMemUsage > yellowThreshold) {
            // when it's yellow, should continue loop
            // to see if it has any red case
            $memoryAlert.addClass("yellow").removeClass("red");
            shouldAlert = true;
        } else {
            $memoryAlert.removeClass("red").removeClass("yellow");
        }

        var highPercent = Math.round(highestMemUsage * 100) + "%";
        var percent = Math.round(avgMemUsage * 100) + "%";
        var highestUsageText = "<br>" + CommonTxtTstr.HighXcalarMemUsage +
                                ": " + highPercent;
        var usageText = "<br>" + CommonTxtTstr.XcalarMemUsage + ": " + percent;
        var text;
        if (shouldAlert) {
            // we want user to drop table first and only when no tables
            // let them drop ds
            if (jQuery.isEmptyObject(gTables) && gOrphanTables.length === 0)
            {
                text = TooltipTStr.LowMemInDS + highestUsageText + usageText;
                $memoryAlert.removeClass("tableAlert");
            } else {
                text = TooltipTStr.LowMemInTable + highestUsageText + usageText;
                $memoryAlert.addClass("tableAlert");
            }
        } else {
            text = TooltipTStr.SystemGood + usageText;
        }

        xcTooltip.changeText($memoryAlert, text);
        return shouldAlert;
    }

    function redMemoryAlert() {
        if (turnOffRedMemoryAlert || Alert.isVisible()) {
            return;
        }

        var instr = xcHelper.replaceMsg(MonitorTStr.LowMemInstr, {
            link: paths.memory
        });
        Alert.show({
            title: MonitorTStr.LowMem,
            instrTemplate: instr,
            msg: MonitorTStr.LowMemMsg,
            isAlert: true,
            isCheckBox: true,
            onCancel: function() {
                turnOffRedMemoryAlert = Alert.isChecked();
            }
        });
    }

    XcSupport.heartbeatCheck = function() {
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
            XcSupport.commitCheck(true)
            .then(function() {
                return XcSupport.memoryCheck();
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

    XcSupport.stopHeartbeatCheck = function() {
        clearInterval(commitCheckTimer);
        commitCheckTimer = null;
        heartbeatLock++;
        // console.log("lock to", heartbeatLock);
    };

    XcSupport.restartHeartbeatCheck = function() {
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

        return XcSupport.heartbeatCheck();
    };

    XcSupport.checkConnection = function() {
        checkConnection()
        .fail(function() {
            var error = {"error": ThriftTStr.CCNBE};
            var id = Alert.error(ThriftTStr.CCNBEErr, error, {
                "lockScreen": true,
                "noLogout": true
            });
            Log.backup();

            checkConnectionTrigger(10, id);
        });
    };

    XcSupport.checkStats = function(stats) {
        var data = {};
        var deferred = PromiseHelper.deferred();
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
            console.info(data);
            deferred.resolve(header + file);
        });
        return deferred.promise();
    };

    XcSupport.downloadLog = function(targetUsername, targetWorkbookName) {
        var log;
        var errLog;
        XcalarKeyLookup(targetUsername + "-wkbk-" + targetWorkbookName +
                        "-gLog-" + currentVersion, 1)
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

    XcSupport.downloadStats = function(stats) {
        XcSupport.checkStats(stats)
        .then(function(f) {
            xcHelper.downloadAsFile(userIdName + "-stats-" +
                                    xcHelper.getCurrentTimeStamp() + ".txt", f);
            console.log(f);
        });
    };

    XcSupport.downloadLRQ = function(lrqName) {
        XcalarExportRetina(lrqName)
        .then(function(a) {
            xcHelper.downloadAsFile(lrqName + ".tar.gz", a.retina, true);
        })
        .fail(function(error) {
            Alert.error(DFTStr.DownloadErr, error);
        });
    };

    XcSupport.getRunTimeBreakdown = function(dfName) {
        XcalarQueryState(dfName)
        .then(function(ret) {
            var nodeArray = ret.queryGraph.node;
            for (var i = 0; i < nodeArray.length; i++) {
                console.log(XcalarApisTStr[nodeArray[i].api] + " - " +
                            nodeArray[i].name.name + ": " +
                            nodeArray[i].elapsed.milliseconds + "ms");
            }
        });
    };

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
                    xcHelper.reload(hardLoad);
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
        if (Log.hasUncommitChange() ||
            KVStore.hasUnCommitChange()) {
            return KVStore.commit();
        } else {
            return PromiseHelper.resolve();
        }
    }

    function commitMismatchHandler() {
        XcSupport.stopHeartbeatCheck();

        // hide all modal
        $(".modalContainer:not(.locked)").hide();
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
        var deferred = PromiseHelper.deferred();

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

    function getUserIdUnique(name) {
        var hash = jQuery.md5(name);
        var len = 5;
        var id = parseInt("0x" + hash.substring(0, len)) + 4000000;
        return id;
    }

    return (XcSupport);
}({}, jQuery));
