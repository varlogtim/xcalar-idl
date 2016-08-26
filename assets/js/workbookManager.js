window.WorkbookManager = (function($, WorkbookManager) {
    var username;

    var wkbkKey;
    var activeWKBKKey;
    var activeWKBKId;

    var wkbkSet;

    // initial setup
    WorkbookManager.setup = function() {
        var deferred = jQuery.Deferred();

        username = Support.getUser();

        // key that stores all workbook infos for the user
        wkbkKey = generateKey(username, "workbookInfos");
        // key that stores the current active workbook Id
        activeWKBKKey = generateKey(username, "activeWorkbook");
        wkbkSet = new WKBKSet();

        WorkbookManager.getWKBKsAsync()
        .then(syncSessionInfo)
        .then(activateWorkbook)
        .then(function(wkbkId) {
            activeWKBKId = wkbkId;
            // retive key from username and wkbkId
            setupKVStore(wkbkId);
            deferred.resolve();
        })
        .fail(function(error) {
            if (error !== WKBKTStr.NoWkbk) {
                console.error("Setup Workbook fails!", error);
            }
            deferred.reject(error);
        })
        .always(function() {
            updateBottomBar();
        });

        return deferred.promise();
    };

    WorkbookManager.commit = function() {
        var deferred = jQuery.Deferred();
        // if activeWKBK is null, then it's creating a new WKBK
        if (activeWKBKId != null) {
            var wkbk = wkbkSet.get(activeWKBKId);
            if (wkbk != null) {
                wkbk.update();
            }
        }

        saveWorkbook()
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(updateBottomBar);

        return deferred.promise();
    };

    WorkbookManager.getWorkbooks = function() {
        return wkbkSet.getAll();
    };

    WorkbookManager.getWorkbook = function(workbookId) {
        var allWorkbooks = wkbkSet.getAll();
        if (!allWorkbooks) {
            return;
        }
        if (!(workbookId in allWorkbooks)) {
            return;
        }

        return allWorkbooks[workbookId];
    };

    WorkbookManager.getWorkbookIdByName = function(workbookName) {
        // Get full workbookId by relative name
        return getWKBKId(workbookName);
    };

    WorkbookManager.getWKBKsAsync = function() {
        var deferred = jQuery.Deferred();
        var sessionInfo;

        XcalarListWorkbooks("*")
        .then(function(output) {
            sessionInfo = output;
            // console.log(sessionInfo);
            return KVStore.getAndParse(wkbkKey, gKVScope.WKBK);
        })
        .then(function(wkbk) {
            deferred.resolve(wkbk, sessionInfo);
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };
    // get current active workbook
    WorkbookManager.getActiveWKBK = function() {
        return (activeWKBKId);
    };

    // get current user
    WorkbookManager.getUser = function() {
        return (username);
    };

    // make new workbook
    WorkbookManager.newWKBK = function(wkbkName, srcWKBKId) {
        var deferred = jQuery.Deferred();

        if (!wkbkName) {
            deferred.reject("Invalid name");
            return (deferred.promise());
        }

        var wkbk;
        var isCopy = (srcWKBKId != null);
        var copySrc = null;

        if (isCopy) {
            copySrc = wkbkSet.get(srcWKBKId);
            if (copySrc == null) {
                // when the source workbook's meta not exist
                deferred.reject("missing workbook meta");
                return (deferred.promise());
            }
        }

        var copySrcName = isCopy ? copySrc.name : null;

        XcalarNewWorkbook(wkbkName, isCopy, copySrcName)
        .then(function() {
            var options = {
                "id"     : getWKBKId(wkbkName),
                "name"   : wkbkName,
                "srcUser": username,
                "curUser": username
            };

            if (isCopy) {
                options.numWorksheets = copySrc.numWorksheets;
            }

            wkbk = new WKBK(options);
            wkbkSet.put(wkbk.id, wkbk);

            return saveWorkbook();
        })
        .then(function() {
            // in case KVStore has some remants about wkbkId, clear it
            var innerDeferred = jQuery.Deferred();

            delWKBKHelper(wkbk.id)
            .always(innerDeferred.resolve);

            return innerDeferred.promise();
        })
        .then(function() {
            deferred.resolve(wkbk.id);
        })
        .fail(function(error) {
            console.error("Create workbook failed!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    WorkbookManager.updateWorksheet = function(numWorksheets) {
        var workbook = wkbkSet.get(activeWKBKId);
        workbook.numWorksheets = numWorksheets;
    };

    // switch to another workbook
    WorkbookManager.switchWKBK = function(wkbkId) {
        // validation
        if (wkbkId == null) {
            return PromiseHelper.reject({"error": "Invalid workbook Id!"});
        }

        if (wkbkId === activeWKBKId) {
            return PromiseHelper.reject({"error": "Cannot switch to same " +
                                                  "workbook"});
        }

        var deferred = jQuery.Deferred();
        var fromWkbkName;
        var toWkbkName;

        if (activeWKBKId == null) {
            // case 1: creat a totaly new workbook
            // case 2: continue a worbook that has no meta
            // (in this case, when reload, will check the workbook is inactive
            // and will active it)
            KVStore.put(activeWKBKKey, wkbkId, true, gKVScope.WKBK)
            .then(function() {
                // The action below is a no-op if it's already active.
                $("#initialLoadScreen").show();
                return XcalarSwitchToWorkbook(wkbkSet.get(wkbkId).name, null);
            })
            .then(function() {
                switchWorkbookAnimation();
                location.reload();
                deferred.resolve();
            })
            .fail(function(ret) {
                if (ret.status === StatusT.StatusSessionNotInact) {
                    switchWorkbookAnimation();
                    location.reload();
                    deferred.resolve();
                } else {
                    deferred.reject(ret);
                }
            });
            return deferred.promise();
        }

        // check if the wkbkId is right
        var toWkbk = wkbkSet.get(wkbkId);
        if (toWkbk != null) {
            toWkbkName = toWkbk.name;

            fromWkbkName = (activeWKBKId == null) ?
                                    null :
                                    wkbkSet.get(activeWKBKId).name;
        } else {
            deferred.reject({"error": "No such workbook id!"});
            return deferred.promise();
        }

        // should stop check since seesion is released
        Support.stopHeartbeatCheck();

        // to switch workbook, should release all ref count first

        switchWorkbookAnimation();
        $("#initialLoadScreen").show();

        freeAllResultSetsSync()
        .then(function() {
            return KVStore.commit();
        })
        .then(function() {
            return Support.releaseSession();
        })
        .then(function() {
            return XcalarSwitchToWorkbook(toWkbkName, fromWkbkName);
        })
        .then(function() {
            return XcalarKeyPut(activeWKBKKey, wkbkId, true, gKVScope.WKBK);
        })
        .then(function() {
            removeUnloadPrompt();

            location.reload();
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Switch Workbook Fails", error);
            $("#initialLoadScreen").hide();
            // restart if fails
            Support.heartbeatCheck();
            deferred.reject(error);
        });

        return deferred.promise();
    };

    // copy workbook
    WorkbookManager.copyWKBK = function(srcWKBKId, wkbkName) {
        var deferred = jQuery.Deferred();
        var newId;

        KVStore.commit()
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

    WorkbookManager.inActiveAllWKBK = function() {
        var deferred = jQuery.Deferred();
        var promises = [];

        XcalarListWorkbooks("*")
        .then(function(output) {
            var numSessions = output.numSessions;
            var sessions = output.sessions;
            // console.log(sessionInfo);
            for (var i = 0; i < numSessions; i++) {
                var session = sessions[i];
                if (session.state === "Active") {
                    promises.push(XcalarInActiveWorkbook.bind(this, session.name));
                }
            }

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            return XcalarKeyDelete(activeWKBKKey, gKVScope.WKBK);
        })
        .then(function() {
            removeUnloadPrompt();
            location.reload();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    WorkbookManager.renameWKBK = function(srcWKBKId, newName) {
        var newWKBKId = getWKBKId(newName);

        if (wkbkSet.has(newWKBKId)) {
            var errStr = xcHelper.replaceMsg(ErrTStr.WorkbookExists,
                                             {'workbookName': newName});
            return PromiseHelper.reject(errStr);
        }

        var deferred = jQuery.Deferred();
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
        Support.stopHeartbeatCheck();

        KVStore.commit()
        .then(function() {
            return copyHelper(srcWKBKId, newWKBKId);
        })
        .then(function() {
            return XcalarRenameWorkbook(newName, srcWKBK.name);
        })
        .then(function() {
            var innerDeferred = jQuery.Deferred();
            delWKBKHelper(srcWKBK.id)
            .always(innerDeferred.resolve);

            return innerDeferred.promise();
        })
        .then(function() {
            var options = {
                "id"     : newWKBKId,
                "name"   : newName,
                "created": srcWKBK.created,
                "srcUser": srcWKBK.srcUser,
                "curUser": srcWKBK.curUser
            };

            var newWkbk = new WKBK(options);
            wkbkSet.put(newWKBKId, newWkbk);
            wkbkSet.delete(srcWKBK.id);
            return saveWorkbook();
        })
        .then(function() {
            if (isCurrentWKBK) {
                return resetActiveWKBK(newWKBKId);
            }
        })
        .then(function() {
            deferred.resolve(newWKBKId);
        })
        .fail(deferred.reject)
        .always(Support.heartbeatCheck);

        return deferred.promise();
    };

    WorkbookManager.deleteWKBK = function(workbookId) {
        var deferred = jQuery.Deferred();
        var isCurrentWKBK = (workbookId === activeWKBKId);
        var workbook = wkbkSet.get(workbookId);

        // 1. Stop heart beat check (Heartbeat key may change due to active
        //                           worksheet changing)
        // 2. Delete workbook form backend
        // 2. Delete the meta data for the current workbook
        // 3. Remove KV store key for active workbook if deleted workbook is
        //    previously the active one
        // 4. Restart heart beat check
        Support.stopHeartbeatCheck();

        XcalarDeleteWorkbook(workbook.name)
        .then(function() {
            var innerDeferred = jQuery.Deferred();
            delWKBKHelper(workbookId)
            .always(innerDeferred.resolve);
            return innerDeferred.promise();
        })
        .then(function() {
            if (isCurrentWKBK) {
                return XcalarKeyDelete(activeWKBKKey, gKVScope.WKBK);
            } else {
                PromiseHelper.resolve(null);
            }
        })
        .then(function() {
            wkbkSet.delete(workbook.id);
            return KVStore.commit();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(Support.heartbeatCheck);

        return deferred.promise();
    };

    // XXX this is buggy now because it clear wkbkInfo but the session info is kept!
    WorkbookManager.emptyAll = function() {
        var deferred = jQuery.Deferred();
        var promises = [];

        // delete all workbooks
        var workbooks = wkbkSet.getAll();
        for (var wkbkId in workbooks) {
            promises.push(delWKBKHelper.bind(this, wkbkId));
        }

        // delete all active workbook key
        promises.push(KVStore.delete.bind(this, activeWKBKKey, gKVScope.WKBK));

        PromiseHelper.chain(promises)
        .then(function() {
            return KVStore.delete(wkbkKey, gKVScope.WKBK);
        })
        .then(function() {
            console.log("empty all workbook related info");
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("empty all workbook related fails", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    function setupKVStore(wkbkId) {
        // retrieve key from username and wkbkId
        var gInfoKey    = generateKey(wkbkId, "gInfo");
        var gEphInfoKey = generateKey(wkbkId, "gEphInfo");
        var gLogKey     = generateKey(wkbkId, "gLog");
        var gErrKey     = generateKey(wkbkId, "gErr");
        var gUserKey    = generateKey(username, 'gUser');

        KVStore.setup(gInfoKey, gEphInfoKey, gLogKey, gErrKey, gUserKey);
    }

    function syncSessionInfo(oldWorkbooks, sessionInfo) {
        var deferred = jQuery.Deferred();
        // sync sessionInfo with wkbkInfo
        try {
            var numSessions = sessionInfo.numSessions;
            var sessions = sessionInfo.sessions;
            var wkbkName;
            var wkbkId;
            var wkbk;
            var loseOldMeta = false;
            var activeWorkbooks = [];
            var storedActiveId;

            if (oldWorkbooks == null) {
                oldWorkbooks = {};
                loseOldMeta = true;
            }

            for (var i = 0; i < numSessions; i++) {
                wkbkName = sessions[i].name;
                if (sessions[i].state === "Active") {
                    activeWorkbooks.push(sessions[i].name);
                }
                wkbkId = getWKBKId(wkbkName);

                if (oldWorkbooks.hasOwnProperty(wkbkId)) {
                    wkbk = new WKBK(oldWorkbooks[wkbkId]);
                    delete oldWorkbooks[wkbkId];
                } else {
                    console.warn("Error!", wkbkName, "has no meta.");
                    wkbk = new WKBK({
                        "id"    : wkbkId,
                        "name"  : wkbkName,
                        "noMeta": true
                    });
                }

                wkbkSet.put(wkbkId, wkbk);
            }

            for (var oldWkbkId in oldWorkbooks) {
                console.warn("Error!", oldWkbkId, "is missing.");
            }

            // refresh workbook info
            saveWorkbook()
            .then(function() {
                if (loseOldMeta) {
                    // If we fail to get our old meta data, set activeWorkbook
                    // to null
                    return PromiseHelper.resolve(null);
                } else {
                    return KVStore.get(activeWKBKKey, gKVScope.WKBK);
                }
            })
            .then(function(activeId) {
                storedActiveId = activeId;
                var deferred = jQuery.Deferred();
                // Handle case where there are 2 or more active workbooks or
                // where there is no active workbook but we think that there is
                if (activeWorkbooks.length === 0 && activeId) {
                    // We think there's an active workbook but there actually
                    // isn't. Remove active and set it to null. next step
                    // resolves this
                    storedActiveId = undefined;
                    return KVStore.delete(activeWKBKKey, gKVScope.WKBK);
                } else if (activeWorkbooks.length === 1 && !activeId) {
                    // Backend has active, we don't. Set it and go
                    storedActiveId = getWKBKId(activeWorkbooks[0]);
                    return KVStore.put(activeWKBKKey, storedActiveId, true,
                                       gKVScope.WKBK);
                } else if (activeWorkbooks.length === 1 && activeId &&
                    getWKBKId(activeWorkbooks[0]) !== activeId) {
                    // Backend's version of active is different from us.
                    // We listen to backend
                    storedActiveId = getWKBKId(activeWorkbooks[0]);
                    return KVStore.put(activeWKBKKey, storedActiveId, true,
                                       gKVScope.WKBK);
                } else if (activeWorkbooks.length > 1) {
                    // This is something that we do not support
                    // We will inactivate all the sessions and force user to
                    // reselect
                    storedActiveId = undefined;
                    var defArray = [];
                    for (var i = 0; i<activeWorkbooks.length; i++) {
                        defArray.push(XcalarInActiveWorkbook(
                                                           activeWorkbooks[i]));
                    }

                    defArray.push(KVStore.delete(activeWKBKKey, gKVScope.WKBK));
                    return PromiseHelper.when.apply(this, defArray);
                } else {
                    deferred.resolve();
                }
                return deferred.promise();
            })
            .then(function() {
                deferred.resolve(storedActiveId, sessionInfo);
            })
            .fail(deferred.reject);
        } catch (error) {
            console.error(error);
            deferred.reject(error);
        }

        return deferred.promise();
    }

    function activateWorkbook(wkbkId, sessionInfo) {
        var deferred = jQuery.Deferred();

        try {
            var numSessions = sessionInfo.numSessions;
            // if no any workbook, force displaying the workbook modal
            if (wkbkId == null || numSessions === 0 || !wkbkSet.has(wkbkId)) {
                if (wkbkId == null) {
                    deferred.reject(WKBKTStr.NoWkbk);
                } else {
                    KVStore.delete(activeWKBKKey, gKVScope.WKBK)
                    .always(function() {
                        deferred.reject(WKBKTStr.NoWkbk);
                    });
                }
            } else {
                var wkbkName = wkbkSet.get(wkbkId).name;
                var sessions = sessionInfo.sessions;
                var isInactive = false;

                for (var i = 0; i < numSessions; i++) {
                    var session = sessions[i];

                    if (session.name === wkbkName &&
                        session.state === "Inactive")
                    {
                        isInactive = true;
                        break;
                    }
                }

                if (isInactive) {
                    XcalarSwitchToWorkbook(wkbkName, null)
                    .then(function() {
                        deferred.resolve(wkbkId);
                    })
                    .fail(deferred.reject);
                } else {
                    deferred.resolve(wkbkId);
                }
            }
        } catch (error) {
            console.error(error);
            deferred.reject(error);
        }

        return deferred.promise();
    }

    function saveWorkbook() {
        return KVStore.put(wkbkKey, wkbkSet.getWithStringify(), true, gKVScope.WKBK);
    }

    function updateBottomBar() {
        var name = "N/A";
        var created = "N/A";
        var modified = "N/A";

        if (activeWKBKId != null) {
            var workbook = wkbkSet.get(activeWKBKId);
            if (workbook != null) {
                name = workbook.name;
                created = xcHelper.getDate("-", null, workbook.created);
                modified = xcHelper.getDate("-", null, workbook.modified) +
                           " " + xcHelper.getTime(null, workbook.modified);
                $("#autoSaveBtn").removeClass("unsave");
            }
        }

        $("#worksheetInfo .wkbkName").text(name);
        $("#workspaceDate .date").text(created);
        $("#autoSavedInfo").text(modified);
    }

    function resetActiveWKBK(newWKBKId) {
        var deferred = jQuery.Deferred();

        setupKVStore(newWKBKId);
        // rehold the session as KVStore's key changed
        Support.holdSession()
        .then(function() {
            activeWKBKId = newWKBKId;
            return KVStore.put(activeWKBKKey, activeWKBKId, true, gKVScope.WKBK);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    // helper for WorkbookManager.copyWKBK
    function copyHelper(srcId, newId) {
        var deferred = jQuery.Deferred();

        var oldInfoKey    = generateKey(srcId, "gInfo");
        var oldEphInfoKey = generateKey(srcId, "gEphInfo");
        var oldLogKey     = generateKey(srcId, "gLog");
        var oldErrKey     = generateKey(srcId, "gErr");
        var newInfoKey    = generateKey(newId, "gInfo");
        var newEphInfoKey = generateKey(newId, "gEphInfo");
        var newLogKey     = generateKey(newId, "gLog");
        var newErrKey     = generateKey(newId, "gErr");

        // copy all info to new key
        KVStore.get(oldInfoKey, gKVScope.META)
        .then(function(value) {
            return KVStore.put(newInfoKey, value, true, gKVScope.META);
        })
        .then(function() {
            return KVStore.get(oldEphInfoKey, gKVScope.EPHM);
        })
        .then(function(value) {
            // If success, then put this key into the new workbook
            // If fail, then ignore and proceed with the rest of the copying
            return KVStore.put(newEphInfoKey, value, false, gKVScope.EPH)
                   .then(continuation);
        }, function(value) {
            // Getting of newEphInfoKey failed, continue with rest
            continuation();
        });

        function continuation() {
            KVStore.get(oldLogKey, gKVScope.LOG)
            .then(function(value) {
                return KVStore.put(newLogKey, value, true, gKVScope.LOG);
            })
            .then(function() {
                return KVStore.get(oldErrKey, gKVScope.ERR);
            })
            .then(function(value) {
                return KVStore.put(newErrKey, value, true, gKVScope.ERR);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    // helper for WorkbookManager.emptyAll
    function delWKBKHelper(wkbkId) {
        var deferred = jQuery.Deferred();

        var storageKey = generateKey(wkbkId, "gInfo");
        var ephStorageKey = generateKey(wkbkId, "gEphInfo");
        var logKey = generateKey(wkbkId, "gLog");

        var def1 = XcalarKeyDelete(storageKey, gKVScope.META);
        var def3 = XcalarKeyDelete(ephStorageKey, gKVScope.EPHM);
        var def2 = XcalarKeyDelete(logKey, gKVScope.LOG);

        jQuery.when(def1, def2, def3)
        .then(function() {
            console.log("Delete workbook", wkbkId);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Delete workbook fails!", error);
            deferred.reject(error);
        });

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
        return generateKey(username, "wkbk", wkbkName);
    }

    function switchWorkbookAnimation() {
        Workbook.hide(true);
    }

    return (WorkbookManager);
}(jQuery, {}));
