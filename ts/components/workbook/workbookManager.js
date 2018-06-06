window.WorkbookManager = (function($, WorkbookManager) {
    var wkbkStore;
    var activeWKBKId;
    var wkbkSet;
    var checkInterval = 2000; // progress bar check time
    var progressTimeout;

    // initial setup
    WorkbookManager.setup = function() {
        initializeVariable();
        setupSessionCancel();
        return setupWorkbooks();
    };

    function setupWorkbooks(refreshing) {
        var deferred = PromiseHelper.deferred();
        WorkbookManager.getWKBKsAsync(refreshing)
        .then(syncSessionInfo)
        .then(function(wkbkId) {
            if (wkbkId == null) {
                setURL(null, true);
                deferred.reject(WKBKTStr.NoWkbk);
            } else {
                // retrieve key from username and wkbkId
                setupKVStore();
                setActiveWKBK(wkbkId);
                setURL(wkbkId, true);
                deferred.resolve(wkbkId);
            }
        })
        .fail(function(error) {
            if (error !== WKBKTStr.NoWkbk) {
                console.error("Setup Workbook fails!", error);
            }
            deferred.reject(error);
        })
        .always(function() {
            KVStore.logSave(true);
        });

        return deferred.promise();
    }

    WorkbookManager.upgrade = function(oldWkbks) {
        if (oldWkbks == null) {
            return null;
        }

        var newWkbks = {};
        for (var wkbkId in oldWkbks) {
            var wkbk = oldWkbks[wkbkId];
            newWkbks[wkbkId] = KVStore.upgrade(wkbk, "WKBK");
        }

        return newWkbks;
    };

    WorkbookManager.commit = function() {
        // if activeWKBK is null, then it's creating a new WKBK
        if (activeWKBKId != null) {
            var wkbk = wkbkSet.get(activeWKBKId);
            if (wkbk != null) {
                wkbk.update();
            }
        }

        return saveWorkbook();
    };

    WorkbookManager.getWorkbooks = function() {
        return wkbkSet.getAll();
    };

    WorkbookManager.getWorkbook = function(workbookId) {
        return wkbkSet.get(workbookId) || null;
    };

    WorkbookManager.getWKBKsAsync = function(refreshing) {
        var deferred = PromiseHelper.deferred();
        var sessionInfo;

        XcalarListWorkbooks("*")
        .then(function(sessionRes) {
            sessionInfo = sessionRes;
            return wkbkStore.getAndParse();
        })
        .then(function(wkbk) {
            deferred.resolve(wkbk, sessionInfo, refreshing);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };
    // get current active workbook
    WorkbookManager.getActiveWKBK = function() {
        return activeWKBKId;
    };

    function setActiveWKBK(workbookId) {
        if (workbookId == null) {
            activeWKBKId = null;
            setSessionName(null);
            return true;
        }

        var wkbk = wkbkSet.get(workbookId);
        if (wkbk == null) {
            // error case
            return false;
        }

        activeWKBKId = workbookId;
        setSessionName(wkbk.getName());
        return true;
    }

    function setURL(workbookId, replace, newTab) {
        try {
            var curHref = window.location.href;
            var url = new URL(window.location.href);
            var workbookName = null;
            var newHref;
            if (workbookId != null && wkbkSet.has(workbookId)) {
                workbookName = wkbkSet.get(workbookId).getName();
                newHref = xcHelper.setURLParam("workbook", workbookName);
            } else {
                newHref = xcHelper.deleteURLParam("workbook");
            }

            if (newTab) {
                var win = window.open(newHref, '_blank');
                if (win) {
                    win.focus();
                }
                return;
            }

            if (!curHref.endsWith(newHref)) {
                if (replace) {
                    window.history.replaceState("view workbook", workbookName, newHref);
                } else {
                    window.history.pushState("view workbook", workbookName, newHref);
                }
            }
        } catch (e) {
            console.error("set url error", e);
        }
    }

    function gotoWorkbook(workbookId, replaceURL) {
        setURL(workbookId, replaceURL);
        xcHelper.reload();
    }

    WorkbookManager.updateWorksheet = function(numWorksheets) {
        var workbook = wkbkSet.get(activeWKBKId);
        workbook.numWorksheets = numWorksheets;
    };

    // make new workbook
    WorkbookManager.newWKBK = function(wkbkName, srcWKBKId) {
        if (!wkbkName) {
            return PromiseHelper.reject("Invalid name");
        }

        var isCopy = (srcWKBKId != null);
        var copySrc = null;

        if (isCopy) {
            copySrc = wkbkSet.get(srcWKBKId);
            if (copySrc == null) {
                // when the source workbook's meta not exist
                return PromiseHelper.reject("missing workbook meta");
            }
        }

        var deferred = PromiseHelper.deferred();
        var copySrcName = isCopy ? copySrc.name : null;
        var username = XcUser.getCurrentUserName();

        XcalarNewWorkbook(wkbkName, isCopy, copySrcName)
        .then(function() {
            return finishCreatingWKBK(wkbkName, username, isCopy, copySrc);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Create workbook failed!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    // switch to another workbook
    WorkbookManager.switchWKBK = function(wkbkId, newTab, $workbookBox) {
        // validation
        if (wkbkId === activeWKBKId) {
            return PromiseHelper.reject({
                "error": "Cannot switch to same workbook"
            });
        }

        var toWkbk = wkbkSet.get(wkbkId);
        if (toWkbk == null) {
            return PromiseHelper.reject({
                "error": "Invalid workbook Id"
            });
        }

        var deferred = PromiseHelper.deferred();

        if (!newTab) {
            $("#initialLoadScreen").show();
        } else {
            if ($workbookBox.hasClass("active")) {
                setURL(wkbkId, false, true);
                deferred.resolve();
                return deferred.promise();
            }

            $workbookBox.addClass("loading");
        }

        var promise = (!newTab && activeWKBKId != null) ?
                        commitActiveWkbk() : PromiseHelper.resolve();

        XcSupport.stopHeartbeatCheck();

        promise
        .then(function() {
            var toWkbkName = toWkbk.getName();
            return switchWorkBookHelper(toWkbkName);
        })
        .then(function() {
            if (!newTab) {
                setActiveWKBK(wkbkId);
                return switchWorkbookAnimation();
            } else {
                setURL(wkbkId, false, true);
                $workbookBox.addClass("active");
                $workbookBox.find(".isActive").text(WKBKTStr.Active);
                deferred.resolve();
            }
        })
        .then(function() {
            if (!newTab) {
                gotoWorkbook(wkbkId);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Switch Workbook Fails", error);
            error = error || {error: "Error occurred while switching workbooks"};
            if (!newTab) {
                $("#initialLoadScreen").hide();
                $("#container").removeClass("switchingWkbk");
            }
            endProgressCycle();
            deferred.reject(error);
        })
        .always(function() {
            if (newTab) {
                $workbookBox.removeClass("loading");
            }
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    WorkbookManager.gotoWorkbook = function(workbookId, replaceURL) {
        gotoWorkbook(workbookId, replaceURL);
    };

    function countdown() {
        if (!$("#monitorTopBar").find(".wkbkTitle").is(":visible")) {
            return PromiseHelper.resolve();
        }
        var deferred = PromiseHelper.deferred();
        var time = 3;
        var msg = xcHelper.replaceMsg(WKBKTStr.Refreshing, {
            time: time
        });
        $("#monitorTopBar").find(".wkbkTitle").text(msg);

        var interval = setInterval(function() {
            time--;
            if (time > 0) {
                var msg = xcHelper.replaceMsg(WKBKTStr.Refreshing, {
                    time: time
                });
                $("#monitorTopBar").find(".wkbkTitle").text(msg);
            } else {
                clearInterval(interval);
                deferred.resolve();
            }
        }, 1000);

        return deferred.promise();
    }

    function isActiveWorkbook(workbookName) {
        var deferred = PromiseHelper.deferred();

        XcalarListWorkbooks(workbookName)
        .then(function(ret) {
            var session = ret.sessions[0];
            var isActive = (session.state === "Active");
            deferred.resolve(isActive);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function switchWorkBookHelper(wkbkName) {
        var deferred = PromiseHelper.deferred();

        restoreInactivePublishedTable()
        .then(function() {
            var queryName = XcUser.getCurrentUserName() + ":" + wkbkName;
            progressCycle(queryName, checkInterval);
            $("#initialLoadScreen").data("curquery", queryName);
            $("#container").addClass("switchingWkbk");
            return XcalarActivateWorkbook(wkbkName);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (error && error.canceled) {
                deferred.reject(error);
                return;
            }
            console.error(error);

            isActiveWorkbook(wkbkName)
            .then(function(isActive) {
                if (isActive) {
                    // when it's active
                    deferred.resolve();
                } else {
                    deferred.reject(error);
                }
            })
            .fail(deferred.reject);
        })
        .always(function() {
            $("#initialLoadScreen").removeClass("canceling")
                                   .removeData("canceltime");
            $("#initialLoadScreen").find(".animatedEllipsisWrapper .text")
                                    .text(StatusMessageTStr.PleaseWait);
            $("#container").removeClass("switchingWkbk");
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "activate",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": getWKBKId(wkbkName)
            });
        });

        return deferred.promise();
    }

    // copy workbook
    WorkbookManager.copyWKBK = function(srcWKBKId, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var newId;
        var promise = (activeWKBKId == null)
                      ? PromiseHelper.resolve() // no active workbook
                      : KVStore.commit();

        promise
        .then(function() {
            return WorkbookManager.newWKBK(wkbkName, srcWKBKId);
        })
        .then(function(id) {
            newId = id;
            return copyHelper(srcWKBKId, newId);
        })
        .then(function() {
            deferred.resolve(newId);
        })
        .fail(function(error) {
            console.error("Copy Workbook fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    WorkbookManager.downloadWKBK = function(workbookName) {
        var deferred = PromiseHelper.deferred();
        var jupyterFolderPath = "";
        var wkbk = wkbkSet.get(getWKBKId(workbookName));

        if (wkbk) {
            var folderName = wkbk.jupyterFolder;
            if (folderName) {
                jupyterFolderPath = window.jupyterNotebooksPath + folderName +
                                    "/";
            }
        }

        XcalarDownloadWorkbook(workbookName, jupyterFolderPath)
        .then(function(file) {
            xcHelper.downloadAsFile(workbookName + ".tar.gz", file.sessionContent, true);
            deferred.resolve();
        })
        .fail(function(err) {
            deferred.reject(err);
        });

        return deferred.promise();
    };

    WorkbookManager.uploadWKBK = function(workbookName, workbookContent) {
        var deferred = PromiseHelper.deferred();

        var jupFolderName;
        var username = XcUser.getCurrentUserName();
        var parsedWorkbookContent;

        readFile(workbookContent)
        .then(function(res) {
            parsedWorkbookContent = res;
            return JupyterPanel.newWorkbook(workbookName);
        })
        .then(function(folderName) {
            var jupyterFolderPath;
            if (typeof folderName !== "string") {
                // it's an error so default to "";
                folderName = "";
            }
            jupFolderName = folderName;
            if (!folderName) { // can be empty due to error or if not found
                jupyterFolderPath = "";
            } else {
                jupyterFolderPath = window.jupyterNotebooksPath + folderName +
                                    "/";
            }
            return XcalarUploadWorkbook(workbookName, parsedWorkbookContent,
                                        jupyterFolderPath);
        })
        .then(function() {
            return finishCreatingWKBK(workbookName, username, null, null,
                                      jupFolderName);
        })
        .then(deferred.resolve)
        .fail(function(err) {
            // XXX need to remove jupyter folder
            deferred.reject(err);
        });

        return deferred.promise();
    };

    WorkbookManager.deactivate = function(workbookId) {
        var wkbk = wkbkSet.get(workbookId);
        if (wkbk == null) {
            return PromiseHelper.reject(WKBKTStr.DeactivateErr);
        }

        // should stop check since seesion is released
        XcSupport.stopHeartbeatCheck();

        $("#initialLoadScreen").show();
        var deferred = PromiseHelper.deferred();
        var isCurrentWKBK = (workbookId === activeWKBKId);
        var promise = isCurrentWKBK ?
                        commitActiveWkbk() : PromiseHelper.resolve();

        promise
        .then(function() {
            return XcalarDeactivateWorkbook(wkbk.getName());
        })
        .then(function() {
            // no need to save as resource will be synced in setup
            wkbk.setResource(false);

            if (isCurrentWKBK) {
                setActiveWKBK(null);
                setURL(null, true);
            }
            var xcSocket = XcSocket.Instance;
            xcSocket.unregisterUserSession(workbookId);
            xcSocket.sendMessage("refreshWorkbook", {
                "action": "deactivate",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": workbookId
            });
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            $("#initialLoadScreen").hide();
            endProgressCycle();
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    WorkbookManager.inActiveAllWKBK = function() {
        var deferred = PromiseHelper.deferred();
        var promises = [];

        XcalarListWorkbooks("*")
        .then(function(output) {
            var numSessions = output.numSessions;
            var sessions = output.sessions;
            for (var i = 0; i < numSessions; i++) {
                var session = sessions[i];
                if (session.state === "Active") {
                    promises.push(XcalarDeactivateWorkbook.bind(this,
                                                                session.name));
                }
            }

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            setActiveWKBK(null);
            gotoWorkbook(null, true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    WorkbookManager.updateDescription = function(wkbkId, description) {
        var deferred = PromiseHelper.deferred();
        var wkbk = wkbkSet.get(wkbkId);
        wkbk.description = description;
        wkbk.update();

        saveWorkbook()
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "description",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": wkbkId
            });
            deferred.resolve(wkbkId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    WorkbookManager.renameWKBK = function(srcWKBKId, newName, description) {
        var newWKBKId = getWKBKId(newName);
        if (wkbkSet.has(newWKBKId)) {
            var errStr = xcHelper.replaceMsg(ErrTStr.WorkbookExists, {
                workbookName: newName
            });
            return PromiseHelper.reject(errStr);
        }

        var deferred = PromiseHelper.deferred();
        var isCurrentWKBK = (srcWKBKId === activeWKBKId);
        var srcWKBK = wkbkSet.get(srcWKBKId);

        // should follow theses order:
        // 1. stop heart beat check (in case key is changed)
        // 2. copy meta to new wkbkb,
        // 3. rename wkbk
        // 4. delete meta in current wkbk
        // 5. update wkbkSet meta
        // 6. reset KVStore and change active key if change current wkbk's name
        // 7. restart heart beat check
        XcSupport.stopHeartbeatCheck();

        var promise = (activeWKBKId == null)
                      ? PromiseHelper.resolve() // when no active workbook
                      : KVStore.commit();

        promise
        .then(function() {
            return XcalarRenameWorkbook(newName, srcWKBK.name);
        })
        .then(function() {
            return JupyterPanel.renameWorkbook(srcWKBK.jupyterFolder, newName);
        })
        .then(function(folderName) {
            if (typeof folderName !== "string") {
                folderName = srcWKBK.jupyterFolder;
            }
            var options = {
                "id": newWKBKId,
                "name": newName,
                "description": description || srcWKBK.description,
                "created": srcWKBK.created,
                "srcUser": srcWKBK.srcUser,
                "curUser": srcWKBK.curUser,
                "numWorksheets": srcWKBK.numWorksheets,
                "resource": srcWKBK.resource,
                "jupyterFolder": folderName,
                "sessionId": srcWKBK.sessionId
            };

            var newWkbk = new WKBK(options);
            wkbkSet.put(newWKBKId, newWkbk);
            wkbkSet.delete(srcWKBK.id);
            return saveWorkbook();
        })
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "rename",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": srcWKBKId,
                "oldName": srcWKBK.name,
                "newName": newName
            });
            if (isCurrentWKBK) {
                /// Change workbookname in status bar
                $("#worksheetInfo .wkbkName").text(newName);
                return resetActiveWKBK(newWKBKId);
            }
        })
        .then(function() {
            deferred.resolve(newWKBKId);
        })
        .fail(deferred.reject)
        .always(function() {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    WorkbookManager.deleteWKBK = function(workbookId) {
        var workbook = wkbkSet.get(workbookId);

        if (workbook == null) {
            return PromiseHelper.reject(WKBKTStr.DelErr);
        }

        var deferred = PromiseHelper.deferred();

        // 1. Stop heart beat check (Heartbeat key may change due to active
        //                           worksheet changing)
        // 2. Delete workbook form backend
        // 3. Delete the meta data for the current workbook
        // 4. Restart heart beat check
        XcSupport.stopHeartbeatCheck();

        XcalarDeleteWorkbook(workbook.name)
        .then(function() {
            JupyterPanel.deleteWorkbook(workbookId);
            wkbkSet.delete(workbook.id);
            return WorkbookManager.commit();
        })
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "delete",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk":workbookId
            });
            deferred.resolve.apply(this, arguments);
        })
        .fail(deferred.reject)
        .always(function() {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    WorkbookManager.getGlobalScopeKeys = function(version) {
        return getGlobalScopeKeys(version);
    };

    WorkbookManager.getIDfromName = function(name) {
        return getWKBKId(name);
    };

    function initializeVariable() {
        // key that stores all workbook infos for the user
        var wkbkKey = getWKbkKey(currentVersion);
        wkbkStore = new KVStore(wkbkKey, gKVScope.USER);
        wkbkSet = new WKBKSet();
    }

    function setupSessionCancel() {
        var $loadScreen = $("#initialLoadScreen");
        $loadScreen.find(".cancel").click(function() {
            if ($loadScreen.hasClass("canceling")) {
                return;
            }
            $loadScreen.addClass("canceling");
            var time = Date.now();
            $loadScreen.data('canceltime', time);
            $loadScreen.addClass("alertOpen");

            Alert.show({
                "title": WKBKTStr.CancelTitle,
                "msg": WKBKTStr.CancelMsg,
                "hideButtons": ["cancel"],
                "buttons": [{
                    "name": AlertTStr.CLOSE,
                    "className": "btn-cancel",
                    func: function() {
                        $loadScreen.removeClass("canceling alertOpen");
                    }
                }, {
                    "name": AlertTStr.CONFIRM,
                    func: cancel
                }],
                "onCancel": function() {
                    $loadScreen.removeClass("canceling alertOpen");
                },
                "ultraHighZindex": true
            });

            function cancel() {
                $loadScreen.removeClass("alertOpen");
                if ($loadScreen.data("canceltime") !== time ||
                    !$loadScreen.hasClass("canceling")) {
                    return;
                }
                endProgressCycle();

                $loadScreen.find(".animatedEllipsisWrapper .text")
                           .text(StatusMessageTStr.Canceling);
                var queryName = $loadScreen.data("curquery");
                XcalarQueryCancel(queryName)
                .always(function() {
                    $loadScreen.removeClass("canceling")
                               .removeData("canceltime");
                    $loadScreen.find(".animatedEllipsisWrapper .text")
                               .text(StatusMessageTStr.PleaseWait);
                });
            }
        });
    }

    function getWKbkKey(version) {
        var username = XcUser.getCurrentUserName();
        return generateKey(username, "workbookInfos", version);
    }

    function setupKVStore() {
        var globlKeys = getGlobalScopeKeys(currentVersion);
        var userScopeKeys = getUserScopeKeys(currentVersion);
        var wkbkScopeKeys = getWkbkScopeKeys(currentVersion);

        var keys = $.extend({}, globlKeys, userScopeKeys, wkbkScopeKeys);

        KVStore.setup(keys);
    }

    function getGlobalScopeKeys(version) {
        var gEphInfoKey = generateKey("", "gEphInfo", version);
        var gSharedDSKey = generateKey("", "gSharedDS", version);
        var gSettingsKey = generateKey("", "gSettings", version);

        return {
            "gEphStorageKey": gEphInfoKey,
            "gSettingsKey": gSettingsKey,
            "gSharedDSKey": gSharedDSKey
        };
    }

    function getUserScopeKeys(version) {
        var username = XcUser.getCurrentUserName();
        var gUserKey = generateKey(username, "gUser", version);

        return {
            "gUserKey": gUserKey
        };
    }

    function getWkbkScopeKeys(version) {
        var gStorageKey = generateKey("gInfo", version);
        var gLogKey = generateKey("gLog", version);
        var gErrKey = generateKey("gErr", version);
        var gOverwrittenLogKey = generateKey("gOverwritten", version);
        var gNotebookKey = generateKey("gNotebook", version);
        var gAuthKey = generateKey("authentication", version);
        var gIMDKey = generateKey("gIMDKey", version);

        return {
            "gStorageKey": gStorageKey,
            "gLogKey": gLogKey,
            "gErrKey": gErrKey,
            "gOverwrittenLogKey": gOverwrittenLogKey,
            "gAuthKey": gAuthKey,
            "gNotebookKey": gNotebookKey,
            "gIMDKey": gIMDKey
        };
    }

    // sync sessionInfo with wkbkInfo
    function syncSessionInfo(oldWorkbooks, sessionInfo, refreshing) {
        var deferred = PromiseHelper.deferred();

        syncWorkbookMeta(oldWorkbooks, sessionInfo, refreshing)
        .then(function() {
            var activeWorkbooks = getActiveWorkbooks(sessionInfo);
            var activeId = getActiveWorkbookId(activeWorkbooks);
            deferred.resolve(activeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getActiveWorkbooks(sessionInfo) {
        var numSessions = sessionInfo.numSessions;
        var sessions = sessionInfo.sessions;
        var activeWorkbooks = [];
        for (var i = 0; i < numSessions; i++) {
            if (sessions[i].state === "Active") {
                activeWorkbooks.push(sessions[i].name);
            }
        }
        return activeWorkbooks;
    }

    function getActiveWorkbookId(activeWorkbooks) {
        var params = xcHelper.decodeFromUrl(window.location.href);
        var activeWKBKName = params["workbook"];
        if (activeWKBKName && activeWorkbooks.includes(activeWKBKName)) {
            return getWKBKId(activeWKBKName);
        } else {
            return null;
        }
    }

    function checkResource(sessionInfo) {
        return (sessionInfo.toLowerCase() === "has resources");
    }

    function syncWorkbookMeta(oldWorkbooks, sessionInfo, refreshing) {
        try {
            if (oldWorkbooks == null) {
                oldWorkbooks = {};
            }
            var numSessions = sessionInfo.numSessions;
            var sessions = sessionInfo.sessions;
            if  (refreshing) {
                initializeVariable();
            }

            for (var i = 0; i < numSessions; i++) {
                var wkbkName = sessions[i].name;
                var hasResouce = checkResource(sessions[i].info);
                var wkbkId = getWKBKId(wkbkName);
                var wkbk;

                if (oldWorkbooks.hasOwnProperty(wkbkId)) {
                    wkbk = new WKBK(oldWorkbooks[wkbkId]);
                    delete oldWorkbooks[wkbkId];
                } else {
                    console.warn("Error!", wkbkName, "has no meta.");
                    wkbk = new WKBK({
                        "id": wkbkId,
                        "name": wkbkName,
                        "noMeta": true
                    });
                }

                wkbk.setSessionId(sessions[i].sessionId);
                wkbk.setResource(hasResouce);
                wkbkSet.put(wkbkId, wkbk);
            }

            for (var oldWkbkId in oldWorkbooks) {
                console.warn("Error!", oldWkbkId, "is missing.");
            }

            if (refreshing) {
                return PromiseHelper.resolve();
            } else {
                return saveWorkbook();
            }
        } catch (error) {
            console.error(error);
            return PromiseHelper.reject("error");
        }
    }

    WorkbookManager.getKeysForUpgrade = function(sessionInfo, version) {
        var globalKeys = getGlobalScopeKeys(version);
        var userKeys = getUserScopeKeysForUpgrade(version);
        var wkbkKeys = getWkbkScopeKeysForUpgrade(sessionInfo, version);

        return {
            "global": globalKeys,
            "user": userKeys,
            "wkbk": wkbkKeys
        };
    };

    WorkbookManager.getStorageKey = function() {
        return getWkbkScopeKeys(currentVersion).gStorageKey;
    };

    // used in socket updates
    WorkbookManager.updateWorkbooks = function(info) {
        if (XcUser.getCurrentUserName() !== info.user) {
            // XXX socket should only send messages to relevant users
            return;
        }
        var activeWkbk = WorkbookManager.getActiveWKBK();
        if (info.action === "deactivate" &&
            activeWkbk && activeWkbk === info.triggerWkbk) {
            XcSupport.stopHeartbeatCheck();
            var wkbk = wkbkSet.get(activeWkbk);
            wkbk.setResource(false);
            setActiveWKBK(null);
            setURL(null, true);
            WorkbookPanel.show();
            var xcSocket = XcSocket.Instance;
            xcSocket.unregisterUserSession(activeWkbk);
            $("#container").addClass("noWorkbook noMenuBar");

            return;
        }
        setupWorkbooks(true)
        .always(function() {
            if (info.action === "rename") {
                if (activeWkbk && activeWkbk === info.triggerWkbk) {
                    $("#worksheetInfo .wkbkName").text(info.newName);
                    var newWKBKId = getWKBKId(info.newName);
                    resetActiveWKBK(newWKBKId);
                    var newFoldername = WorkbookManager.getWorkbook(newWKBKId).jupyterFolder;
                    JupyterPanel.updateFolderName(newFoldername);
                }
                WorkbookPanel.updateWorkbooks(info);
                WorkbookInfoModal.update(info);
            } else if (info.action === "delete") {
                WorkbookPanel.updateWorkbooks(info);
                WorkbookInfoModal.update(info);
            }
            WorkbookPanel.listWorkbookCards();
        });
    };

    function getUserScopeKeysForUpgrade(version) {
        var keys = getUserScopeKeys(version);
        var wkbkKeyOfVersion = getWKbkKey(version);

        keys = $.extend(keys, {
            "wkbkKey": wkbkKeyOfVersion
        });

        return keys;
    }

    function getWkbkScopeKeysForUpgrade(sessionInfo, version) {
        var wkbks = {};
        var numSessions = sessionInfo.numSessions;
        var sessions = sessionInfo.sessions;

        for (var i = 0; i < numSessions; i++) {
            var wkbkName = sessions[i].name;
            var keys = getWkbkScopeKeys(version);
            wkbks[wkbkName] = keys;
        }

        return wkbks;
    }

    function saveWorkbook() {
        return wkbkStore.put(wkbkSet.getWithStringify(), true);
    }

    function resetActiveWKBK(newWKBKId) {
        setupKVStore(newWKBKId);
        setActiveWKBK(newWKBKId);
        setURL(newWKBKId, true);
        // rehold the session as KVStore's key changed
        return XcUser.CurrentUser.holdSession(newWKBKId, true);
    }

    // if upload, jupFolderName should be provided
    function finishCreatingWKBK(wkbkName, username, isCopy, copySrc, jupFolderName) {
        var deferred = PromiseHelper.deferred();
        var wkbk;

        var jupyterPromise;
        if (!jupFolderName) {
            jupyterPromise = JupyterPanel.newWorkbook(wkbkName);
        } else {
            jupyterPromise = PromiseHelper.resolve(jupFolderName);
        }

        jupyterPromise
        .then(function(folderName) {
            // when create new wkbk, we always deactiveate it
            if (typeof folderName !== "string") {
                folderName = "";
            }

            // XXX for uploads, we should include description and numWorksheets
            var options = {
                "id": getWKBKId(wkbkName),
                "name": wkbkName,
                "srcUser": username,
                "curUser": username,
                "resource": false,
                "jupyterFolder": folderName
            };

            if (isCopy) {
                options.numWorksheets = copySrc.numWorksheets;
                options.modified = copySrc.modified;
            }

            wkbk = new WKBK(options);
            wkbkSet.put(wkbk.id, wkbk);

            return saveWorkbook();
        })
        .then(function() {
            // If workbook is active, make it inactive so that our UX is linear
            return XcalarListWorkbooks(wkbkName);
        })
        .then(function(retStruct) {
            if (retStruct.numSessions !== 1) {
                var error;
                if (retStruct.numSessions === 0) {
                    error = ErrTStr.NoWKBKErr;
                } else {
                    error = ErrTStr.MultipleWKBKErr;
                }
                console.error(error);
                deferred.reject(error);
            } else {
                try {
                    wkbk.setSessionId(retStruct.sessions[0].sessionId);
                } catch (e) {
                    console.error(e);
                }

                if (retStruct.sessions[0].state === "Active") {
                    // This happens when there are no active sessions. The
                    // first one we create gets auto activated
                    xcAssert(!WorkbookManager.getActiveWKBK());
                    XcalarDeactivateWorkbook(retStruct.sessions[0].name)
                    .always(function() {
                        broadCast();
                        deferred.resolve(wkbk.id);
                        // XXX Handle failure here separately! It should never
                        // happen...
                    });
                } else {
                    broadCast();
                    deferred.resolve(wkbk.id);
                }
            }
        })
        .fail(deferred.reject);

        function broadCast() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "newWorkbook",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": getWKBKId(wkbkName)
            });
        }

        return deferred.promise();
    }

    // helper for WorkbookManager.copyWKBK
    function copyHelper(srcId, newId) {
        var oldWKBK = wkbkSet.get(srcId);
        var newWKBK = wkbkSet.get(newId);
        if (oldWKBK == null || newWKBK == null) {
            return PromiseHelper.reject('error case');
        }

        var oldName = oldWKBK.getName();
        var sessionId = oldWKBK.sessionId;
        var newName = newWKBK.getName();

        var getKVHelper = function(key) {
            var currentSession = sessionName;
            var kvStore = new KVStore(key, gKVScope.WKBK);

            setSessionName(oldName);
            var promise = kvStore.get();
            setSessionName(currentSession);
            return promise;
        };

        var putKVHelper = function(key, value) {
            var currentSession = sessionName;
            var kvStore = new KVStore(key, gKVScope.WKBK);

            setSessionName(newName);
            var promise = kvStore.put(value, true);
            setSessionName(currentSession);
            return promise;
        };

        var copyAction = function(key) {
            // copy all info to new key
            var deferred = PromiseHelper.deferred();

            getKVHelper(key)
            .then(function(value) {
                return putKVHelper(key, value);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        var wkbkScopeKeys = getWkbkScopeKeys(currentVersion);
        var promises = [];
        for (var key in wkbkScopeKeys) {
            if (key === 'gNotebookKey') {
                continue; // XXX temporarily skip it
            }
            promises.push(copyAction(wkbkScopeKeys[key]));
        }
        promises.push(copyUDFs());

        function copyUDFs() {
            // list udfs belonging to the src workbook
            // get the code for each udf in the list
            // submit the code as a new udf for the dest workbook
            var innerDeferred = PromiseHelper.deferred();

            var workbookUDFPath = "/workbook/" + userIdName + "/" + sessionId + "/udf/";

            XcalarListXdfs("*" + workbookUDFPath + "*", "*")
            .then(function(result) {
                var promises = [];
                var udfs = {};
                result.fnDescs.forEach(function(fn) {
                    var udfName = fn.fnName.split(":")[0];
                    udfs[udfName] = true;
                });
                for (var name in udfs) {
                    promises.push(uploadUDF(name, newName));
                }
                PromiseHelper.when.apply(this, promises)
                .always(function() {
                    if (Object.keys(udfs).length) {
                        var xcSocket = XcSocket.Instance;
                        xcSocket.sendMessage("refreshUDFWithoutClear");
                    }
                    innerDeferred.resolve();
                });
            });

            return innerDeferred.promise();
        }

        JupyterPanel.copyWorkbook(oldWKBK.jupyterFolder, newWKBK.jupyterFolder);

        return PromiseHelper.when.apply(this, promises);
    }

    // when copying a workbook, we must make a copy of the udfs and upload
    // to the new workbook
    function uploadUDF(fnName, newName) {
        var deferred = PromiseHelper.deferred();
        var storedUdfs = UDF.getUDFs();
        var promise;
        if (storedUdfs[fnName]) {
            promise = PromiseHelper.resolve(storedUdfs[fnName]);
        } else {
            promise = XcalarDownloadPython(fnName);
        }
        promise
        .always(function(res) {
            if (res) {
                fnName = fnName.split("/").pop();
                var currentSession = sessionName;
                setSessionName(newName);

                XcalarUploadPython(fnName, res, true)
                .always(function() {
                    deferred.resolve();
                });
                setSessionName(currentSession);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    function commitActiveWkbk() {
        // to switch workbook, should release all ref count first
        var deferred = PromiseHelper.deferred();
        var promise = TblManager.freeAllResultSetsSync();

        PromiseHelper.alwaysResolve(promise)
        .then(function() {
            return KVStore.commit();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    // generate key for KVStore use
    function generateKey() {
        // currently just cat all arguments as a key
        var key;
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i]) {
                if (!key) {
                    key = arguments[i];
                } else {
                    key += "-" + arguments[i];
                }
            }
        }
        return (key);
    }

    function getWKBKId(wkbkName) {
        var username = XcUser.getCurrentUserName();
        return generateKey(username, "wkbk", wkbkName);
    }

    function switchWorkbookAnimation(failed) {
        var deferred = PromiseHelper.deferred();
        if (!failed) {
            progressComplete();
        }
        var $loadScreen = $("#initialLoadScreen");
        $loadScreen.removeClass("canceling").removeData("canceltime");
        $loadScreen.find(".animatedEllipsisWrapper .text")
                   .text(StatusMessageTStr.PleaseWait);
        countdown()
        .always(function() {
            MainMenu.close(true);
            WorkbookPanel.hide(true);

            deferred.resolve();
        });
        return deferred.promise();
    }

    function progressCycle(queryName, adjustTime, retry) {
        var intTime = checkInterval;
        if (adjustTime) {
            intTime = Math.max(200, checkInterval - adjustTime);
        }
        progressTimeout = setTimeout(function() {
            var timeoutNum = progressTimeout;
            var startTime = Date.now();

            getProgress(queryName)
            .then(function(progress) {
                if (timeoutNum !== progressTimeout || progress.numTotal < 1) {
                    return;
                }

                var $loadScreen = $("#initialLoadScreen");
                var $bar = $loadScreen.find(".progressBar");
                var $numSteps = $loadScreen.find(".numSteps");
                var $progressNode = $loadScreen.find(".progressNode");
                if (!$loadScreen.hasClass("sessionProgress")) {
                    $loadScreen.addClass("sessionProgress");
                    $bar.stop().width(0).data("pct", 0);
                    $progressNode.text("").data("node", "");
                }
                $bar.data("totalsteps", progress.numTotal);
                $numSteps.text(progress.numCompleted + "/" + progress.numTotal);

                var prevNode = $progressNode.data("node");
                var curNode = progress.processingNode;
                var pct;
                if (curNode) {
                    $progressNode.text(StatusMessageTStr.CurrReplay + ": " +
                                        XcalarApisTStr[curNode.api])
                                 .data("node", curNode);
                    pct = Math.round(100 * curNode.numWorkCompleted /
                                           curNode.numWorkTotal);
                } else if (prevNode) {
                    $progressNode.text(StatusMessageTStr.CompReplay + ": " +
                                       XcalarApisTStr[prevNode.api]);
                    pct = 100;
                } else {
                    pct = 0;
                }
                pct = Math.max(pct, 0);
                pct = Math.min(pct, 100); // between 0 and 100

                if (prevNode && curNode &&
                    prevNode.dagNodeId !== curNode.dagNodeId) {
                    // new node so reset width
                    $bar.stop().width(0).data("pct", 0);
                }

                if (pct && pct >= $bar.data("pct")) {
                    var animTime = checkInterval;
                    if (pct === 100) {
                        animTime /= 2;
                    }
                    $bar.animate({"width": pct + "%"}, animTime, "linear");
                    $bar.data("pct", pct);
                }

                if (progress.numCompleted !== progress.numTotal) {
                    var elapsedTime = Date.now() - startTime;
                    progressCycle(queryName, elapsedTime);
                }
            })
            .fail(function() {
                if (timeoutNum !== progressTimeout) {
                    return;
                }
                if (!retry) {
                    progressCycle(queryName, true);
                }
            });
        }, intTime);
    }

    function getProgress(queryName) {
        var deferred = PromiseHelper.deferred();
        XcalarQueryState(queryName)
        .then(function(ret) {
            var state;
            var numCompleted = 0;
            var processingNode;
            for (var i = 0; i < ret.queryGraph.numNodes; i++) {
                state = ret.queryGraph.node[i].state;
                if (state === DgDagStateT.DgDagStateReady) {
                    numCompleted++;
                } else if (state === DgDagStateT.DgDagStateProcessing) {
                    processingNode = ret.queryGraph.node[i];
                }
            }
            var progress = {
                numCompleted: numCompleted,
                numTotal: ret.queryGraph.numNodes,
                processingNode: processingNode
            };
            deferred.resolve(progress);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function progressComplete() {
        var $loadScreen = $("#initialLoadScreen");
        var $bar = $loadScreen.find(".progressBar");
        var $numSteps = $loadScreen.find(".numSteps");
        $bar.stop().width("100%").data('pct', 100);
        var numSteps = $bar.data("totalsteps");
        $numSteps.text(numSteps + "/" + numSteps);
        clearTimeout(progressTimeout);
    }

    function endProgressCycle() {
        clearTimeout(progressTimeout);
        progressTimeout += "canceled";
        $("#initialLoadScreen").removeClass("sessionProgress");
    }

    function readFile(file) {
        var deferred = PromiseHelper.deferred();
        var reader = new FileReader();

        reader.onload = function(event) {
            deferred.resolve(event.target.result);
        };

        reader.onloadend = function(event) {
            var error = event.target.error;
            if (error != null) {
                deferred.reject(error);
            }
        };

        reader.readAsBinaryString(file);

        return deferred.promise();
    }

    // always resolves
    function restoreInactivePublishedTable() {
        var deferred = PromiseHelper.deferred();
        var progressCircle;
        var canceled = false;
        XcalarListPublishedTables("*")
        .then(function(result) {
            var inactiveTables = result.tables.filter(function(table) {
                return !table.active;
            });
            var promises = [];
            inactiveTables.forEach(function(table) {
                promises.push(function() {
                    if (canceled) {
                        return PromiseHelper.reject({canceled: true});
                    } else {
                        return restorePublishedTable(table.name);
                    }
                });
            });
            if (promises.length) {
                showRestoreProgress(inactiveTables.length);
            }
            return PromiseHelper.chain(promises);
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            var $waitSection = $("#initialLoadScreen").find(".publishSection");
            $waitSection.empty();
            $waitSection.removeClass("hasProgress");
            $waitSection.parent().removeClass("pubTable");
        });

        return deferred.promise();

        function restorePublishedTable(tableName) {
            var deferred = PromiseHelper.deferred();
            XcalarRestoreTable(tableName)
            .then(function () {
                progressCircle.increment();
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        function showRestoreProgress(numSteps) {
            var $waitSection = $("#initialLoadScreen").find(".publishSection");
            $waitSection.addClass("hasProgress");
            $waitSection.parent().addClass("pubTable");
            var progressAreaHtml = xcHelper.getLockIconHtml("pubTablesWorksheet", 0, true, true);
            $waitSection.html(progressAreaHtml);
            $waitSection.find(".stepText").addClass("extra").append(
                '<span class="extraText">' + IMDTStr.Activating + '</span>')
            progressCircle = new ProgressCircle("pubTablesWorksheet", 0, true, {steps: numSteps});
            $waitSection.find(".cancelLoad").data("progresscircle",
                                                    progressCircle);
            progressCircle.update(0, 1000);

            $waitSection.find(".progressCircle .xi-close").click(function() {
                canceled = true;
            });
        }
    }



    /* Unit Test Only */
    if (window.unitTestMode) {
        var cacheActiveWKBKId = undefined;
        WorkbookManager.__testOnly__ = {};
        WorkbookManager.__testOnly__.setAcitiveWKBKId = function(id) {
            cacheActiveWKBKId = activeWKBKId;
            activeWKBKId = id;
        };
        WorkbookManager.__testOnly__.restoreWKBKId = function() {
            if (cacheActiveWKBKId !== undefined) {
                activeWKBKId = cacheActiveWKBKId;
                cacheActiveWKBKId = undefined;
            }
        };
        WorkbookManager.__testOnly__.generateKey = generateKey;
        WorkbookManager.__testOnly__.getWKBKId = getWKBKId;
        WorkbookManager.__testOnly__.copyHelper = copyHelper;
        WorkbookManager.__testOnly__.resetActiveWKBK = resetActiveWKBK;
        WorkbookManager.__testOnly__.saveWorkbook = saveWorkbook;
        WorkbookManager.__testOnly__.syncSessionInfo = syncSessionInfo;
        WorkbookManager.__testOnly__.switchWorkBookHelper = switchWorkBookHelper;
        WorkbookManager.__testOnly__.changeIntTime = function(time) {
            checkInterval = time;
        };
        WorkbookManager.__testOnly__.progressCycle = progressCycle;
        WorkbookManager.__testOnly__.endProgressCycle = endProgressCycle;
        WorkbookManager.__testOnly__.countdown = countdown;
        WorkbookManager.__testOnly__.setupWorkbooks = setupWorkbooks;
    }
    /* End Of Unit Test Only */

    return (WorkbookManager);
}(jQuery, {}));
