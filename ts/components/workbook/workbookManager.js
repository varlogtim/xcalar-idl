window.WorkbookManager = (function($, WorkbookManager) {
    var wkbkKey;
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

    function setupWorkbooks() {
        var deferred = PromiseHelper.deferred();
        WorkbookManager.getWKBKsAsync()
        .then(syncSessionInfo)
        .then(function(wkbkId) {
            if (wkbkId == null) {
                setURL(null, true);
                deferred.reject(WKBKTStr.NoWkbk);
            } else {
                // retrieve key from username and wkbkId
                setupKVStore(wkbkId);
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

    WorkbookManager.getWKBKsAsync = function() {
        var deferred = PromiseHelper.deferred();
        var sessionInfo;

        XcalarListWorkbooks("*")
        .then(function(sessionRes) {
            sessionInfo = sessionRes;
            return KVStore.getAndParse(wkbkKey, gKVScope.WKBK);
        })
        .then(function(wkbk) {
            deferred.resolve(wkbk, sessionInfo);
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

    function setURL(workbookId, replace) {
        try {
            var curHref = window.location.href;
            var url = new URL(window.location.href);
            var workbookName = null;
            if (workbookId != null && wkbkSet.has(workbookId)) {
                workbookName = wkbkSet.get(workbookId).getName();
                url.searchParams.set("workbook", workbookName);
            } else {
                url.searchParams.delete("workbook");
            }

            if (!curHref.endsWith(url.href)) {
                if (replace) {
                    window.history.replaceState("view workbook", workbookName, url.href);
                } else {
                    window.history.pushState("view workbook", workbookName, url.href);
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

        var wkbk;
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
        var username = XcSupport.getUser();

        XcalarNewWorkbook(wkbkName, isCopy, copySrcName)
        .then(function() {
            // when create new wkbk, we always deactiveate it
            var options = {
                "id": getWKBKId(wkbkName),
                "name": wkbkName,
                "srcUser": username,
                "curUser": username,
                "resource": false
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
            // in case KVStore has some remants about wkbkId, clear it
            var def = delWKBKHelper(wkbk.id);
            return PromiseHelper.alwaysResolve(def);
        })
        .then(function() {
            return JupyterPanel.newWorkbook(wkbkName, wkbk.id);
        })
        .then(function() {
            // If workbook is active, make it inactive so that our UX is linear
            return XcalarListWorkbooks(wkbkName);
        })
        .then(function(retStruct) {
            if (retStruct.numSessions !== 1) {
                var error = "More than one workbook with same name/No workbook";
                console.error(error);
                deferred.reject(error);
            } else {
                if (retStruct.sessions[0].state === "Active") {
                    // This happens when there are no active sessions. The
                    // first one we create gets auto activated
                    xcAssert(!WorkbookManager.getActiveWKBK());
                    XcalarDeactivateWorkbook(retStruct.sessions[0].name)
                    .always(function() {
                        deferred.resolve(wkbk.id);
                        // XXX Handle failure here separately! It should never
                        // happen...
                    });
                } else {
                    deferred.resolve(wkbk.id);
                }
            }
        })
        .fail(function(error) {
            console.error("Create workbook failed!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    // switch to another workbook
    WorkbookManager.switchWKBK = function(wkbkId) {
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

        $("#initialLoadScreen").show();
        XcSupport.stopHeartbeatCheck();

        var promise = (activeWKBKId != null) ?
                        commitActiveWkbk() : PromiseHelper.resolve();

        promise
        .then(function() {
            var toWkbkName = toWkbk.getName();
            return switchWorkBookHelper(toWkbkName);
        })
        .then(function() {
            setActiveWKBK(wkbkId);
            return switchWorkbookAnimation();
        })
        .then(function() {
            gotoWorkbook(wkbkId);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Switch Workbook Fails", error);
            error = error || {error: "Error occurred while switching workbooks"};
            $("#initialLoadScreen").hide();
            $("#container").removeClass("switchingWkbk");
            endProgressCycle();
            deferred.reject(error);
        })
        .always(function() {
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
        var queryName = XcSupport.getUser() + ":" + wkbkName;
        progressCycle(queryName, checkInterval);
        $("#initialLoadScreen").data("curquery", queryName);
        $("#container").addClass("switchingWkbk");

        XcalarActivateWorkbook(wkbkName)
        .then(deferred.resolve)
        .fail(function(error) {
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

        XcalarDownloadWorkbook(workbookName)
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

        XcalarUploadWorkbook(workbookName, workbookContent)
        .then(deferred.resolve)
        .fail(function(err) {
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
            return copyHelper(srcWKBKId, newWKBKId);
        })
        .then(function() {
            return XcalarRenameWorkbook(newName, srcWKBK.name);
        })
        .then(function() {
            var def = delWKBKHelper(srcWKBK.id);
            return PromiseHelper.alwaysResolve(def);
        })
        .then(function() {
            var options = {
                "id": newWKBKId,
                "name": newName,
                "description": description || srcWKBK.description,
                "created": srcWKBK.created,
                "srcUser": srcWKBK.srcUser,
                "curUser": srcWKBK.curUser,
                "numWorksheets": srcWKBK.numWorksheets,
                "resource": srcWKBK.resource
            };

            var newWkbk = new WKBK(options);
            wkbkSet.put(newWKBKId, newWkbk);
            wkbkSet.delete(srcWKBK.id);
            return saveWorkbook();
        })
        .then(function() {
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
            return JupyterPanel.deleteWorkbook(workbookId);
        })
        .then(function() {
            var def = delWKBKHelper(workbookId);
            return PromiseHelper.alwaysResolve(def);
        })
        .then(function() {
            wkbkSet.delete(workbook.id);
            return WorkbookManager.commit();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    WorkbookManager.getGlobalScopeKeys = function(version) {
        return getGlobalScopeKeys(version);
    };

    function initializeVariable() {
        // key that stores all workbook infos for the user
        wkbkKey = getWKbkKey(currentVersion);
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
        var username = XcSupport.getUser();
        return generateKey(username, "workbookInfos", version);
    }

    function setupKVStore(wkbkId) {
        var globlKeys = getGlobalScopeKeys(currentVersion);
        var userScopeKeys = getUserScopeKeys(currentVersion);
        var wkbkScopeKeys = getWkbkScopeKeys(wkbkId, currentVersion);

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
        var username = XcSupport.getUser();
        var gUserKey = generateKey(username, "gUser", version);
        var gAuthKey = generateKey(username, "authentication", version);

        return {
            "gUserKey": gUserKey,
            "gAuthKey": gAuthKey,
        };
    }

    function getWkbkScopeKeys(wkbkId, version) {
        var gStorageKey = generateKey(wkbkId, "gInfo", version);
        var gLogKey = generateKey(wkbkId, "gLog", version);
        var gErrKey = generateKey(wkbkId, "gErr", version);
        var gOverwrittenLogKey = generateKey(wkbkId, "gOverwritten", version);
        var gNotebookKey = generateKey(wkbkId, "gNotebook", version);

        return {
            "gStorageKey": gStorageKey,
            "gLogKey": gLogKey,
            "gErrKey": gErrKey,
            "gOverwrittenLogKey": gOverwrittenLogKey,
            "gNotebookKey": gNotebookKey,
        };
    }

    // sync sessionInfo with wkbkInfo
    function syncSessionInfo(oldWorkbooks, sessionInfo) {
        var deferred = PromiseHelper.deferred();

        try {
            syncWorkbookMeta(oldWorkbooks, sessionInfo)
            .then(function() {
                var activeWorkbooks = getActiveWorkbooks(sessionInfo);
                var activeId = getActiveWorkbookId(activeWorkbooks);
                deferred.resolve(activeId);
            })
            .fail(deferred.reject);
        } catch (error) {
            console.error(error);
            deferred.reject(error);
        }

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

    function syncWorkbookMeta(oldWorkbooks, sessionInfo) {
        var numSessions = sessionInfo.numSessions;
        var sessions = sessionInfo.sessions;

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

            wkbk.setResource(hasResouce);
            wkbkSet.put(wkbkId, wkbk);
        }

        for (var oldWkbkId in oldWorkbooks) {
            console.warn("Error!", oldWkbkId, "is missing.");
        }

        // refresh workbook info
        return saveWorkbook();
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

    WorkbookManager.getStorageKey = function(workbookId) {
        return getWkbkScopeKeys(workbookId, currentVersion).gStorageKey;
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
            var wkbkId = getWKBKId(wkbkName);
            var keys = getWkbkScopeKeys(wkbkId, version);
            wkbks[wkbkId] = keys;
        }

        return wkbks;
    }

    function saveWorkbook() {
        return KVStore.put(wkbkKey, wkbkSet.getWithStringify(), true, gKVScope.WKBK);
    }

    function resetActiveWKBK(newWKBKId) {
        setupKVStore(newWKBKId);
        setActiveWKBK(newWKBKId);
        setURL(newWKBKId, true);
        // rehold the session as KVStore's key changed
        return XcSupport.holdSession(newWKBKId, true);
    }

    // helper for WorkbookManager.copyWKBK
    function copyHelper(srcId, newId) {
        var deferred = PromiseHelper.deferred();
        var oldWkbkScopeKeys = getWkbkScopeKeys(srcId, currentVersion);
        var newWkbkScopeKeys = getWkbkScopeKeys(newId, currentVersion);

        copyAction("gStorageKey", gKVScope.META)
        .then(function() {
            return copyAction("gLogKey", gKVScope.LOG);
        })
        .then(function() {
            return copyAction("gErrKey", gKVScope.ERR);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        function copyAction(key, scope) {
            // copy all info to new key
            var innerDeferred = PromiseHelper.deferred();
            var oldKey = oldWkbkScopeKeys[key];
            var newKey = newWkbkScopeKeys[key];

            KVStore.get(oldKey, scope)
            .then(function(value) {
                return KVStore.put(newKey, value, true, scope);
            })
            .then(innerDeferred.resolve)
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        return deferred.promise();
    }

    function delWKBKHelper(wkbkId) {
        var deferred = PromiseHelper.deferred();

        var wkbkScopeKeys = getWkbkScopeKeys(wkbkId, currentVersion);

        var storageKey = wkbkScopeKeys.gStorageKey;
        var logKey = wkbkScopeKeys.gLogKey;
        var errorKey = wkbkScopeKeys.gErrKey;
        var overwrittenLogKey = wkbkScopeKeys.gOverwrittenLogKey;
        var notebookKey = wkbkScopeKeys.gNotebookKey;

        var def1 = XcalarKeyDelete(storageKey, gKVScope.META);
        var def3 = XcalarKeyDelete(logKey, gKVScope.LOG);
        var def2 = XcalarKeyDelete(errorKey, gKVScope.ERR);
        var def4 = XcalarKeyDelete(overwrittenLogKey, gKVScope.WKBK);
        var def5 = XcalarKeyDelete(notebookKey, gKVScope.WKBK);

        PromiseHelper.when(def1, def2, def3, def4, def5)
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Delete workbook fails!", error);
            deferred.reject(error);
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
        var username = XcSupport.getUser();
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
        WorkbookManager.__testOnly__.delWKBKHelper = delWKBKHelper;
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
