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
            KVStore.logSave(true);
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
        .fail(deferred.reject);

        return deferred.promise();
    };

    WorkbookManager.getWorkbooks = function() {
        return wkbkSet.getAll();
    };

    WorkbookManager.getWorkbook = function(workbookId) {
        var allWorkbooks = wkbkSet.getAll();
        if (!allWorkbooks) {
            return null;
        }
        if (!(workbookId in allWorkbooks)) {
            return null;
        }

        return allWorkbooks[workbookId];
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

        var deferred = jQuery.Deferred();
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
                options.modified = copySrc.modified;
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
            // case 1: create a totally new workbook
            // case 2: continue a worbook that has no meta
            // (in this case, when reload, will check the workbook is inactive
            // and will active it)
            KVStore.put(activeWKBKKey, wkbkId, true, gKVScope.WKBK)
            .then(function() {
                // The action below is a no-op to backend if already active.
                $("#initialLoadScreen").show();
                return switchWorkBookHelper(wkbkSet.get(wkbkId).name, null);
            })
            .then(function() {
                switchWorkbookAnimation();
                activeWKBKId = wkbkId;
                xcHelper.reload();
                deferred.resolve();
            })
            .fail(function(ret) {
                if (ret && ret.status === StatusT.StatusSessionNotInact) {
                    switchWorkbookAnimation();
                    xcHelper.reload();
                    deferred.resolve();
                } else {
                    if (!ret) {
                        ret = {error:
                                    "Error occurred while switching workbooks"};
                    }
                    $("#initialLoadScreen").hide();
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
        $("#initialLoadScreen").show();

        freeAllResultSetsSync(true)
        .then(function() {
            return KVStore.commit();
        })
        .then(function() {
            return switchWorkBookHelper(toWkbkName, fromWkbkName);
        })
        .then(function() {
            return XcalarKeyPut(activeWKBKKey, wkbkId, true, gKVScope.WKBK);
        })
        .then(function() {
            switchWorkbookAnimation();
            removeUnloadPrompt();
            activeWKBKId = wkbkId;
            xcHelper.reload();
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

        function switchWorkBookHelper(toName, fromName) {
            var innerDeferred = jQuery.Deferred();

            XcalarSwitchToWorkbook(toName, fromName)
            .then(function() {
                innerDeferred.resolve();
            })
            .fail(function(error) {
                XcalarListWorkbooks(toName)
                .then(function(ret) {
                    var sessionInfo = ret.sessions[0];
                    if (sessionInfo.state === "Active") {
                        // when error but backend still active the session
                        showAlert();
                    } else {
                        console.log(error);
                        innerDeferred.reject(error);
                    }
                })
                .fail(function(error) {
                    // reject the outside level of error
                    console.log(error);
                    innerDeferred.reject(error);
                });
            });

            function showAlert() {
                $("#initialLoadScreen").hide();

                Alert.show({
                    "title"   : WKBKTStr.SwitchErr,
                    "msg"     : WKBKTStr.SwitchErrMsg,
                    "onCancel": function() { innerDeferred.reject(); },
                    "buttons" : [{
                        "name"     : CommonTxtTstr.Continue,
                        "className": "continue",
                        "func"     : function() {
                            $("#initialLoadScreen").show();
                            innerDeferred.resolve();
                        }
                    }]
                });
            }

            return innerDeferred.promise();
        }
    };

    // copy workbook
    WorkbookManager.copyWKBK = function(srcWKBKId, wkbkName) {
        var deferred = jQuery.Deferred();
        var newId;
        var promise;

        if (activeWKBKId == null) {
            // no active workbook
            promise = PromiseHelper.resolve();
        } else {
            promise = KVStore.commit();
        }

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
                    promises.push(XcalarDeactivateWorkbook.bind(this,
                                                                session.name));
                }
            }

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            return XcalarKeyDelete(activeWKBKKey, gKVScope.WKBK);
        })
        .then(function() {
            removeUnloadPrompt();
            activeWKBKId = null;
            xcHelper.reload();
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
        var promise = null;
        if (activeWKBKId == null) {
            // when no active workbook
            promise = PromiseHelper.resolve();
        } else {
            Support.stopHeartbeatCheck();
            promise = KVStore.commit();
        }

        promise
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
            if (activeWKBKId != null) {
                Support.heartbeatCheck();
            }
        });

        return deferred.promise();
    };

    WorkbookManager.deleteWKBK = function(workbookId) {
        var workbook = wkbkSet.get(workbookId);

        if (workbook == null) {
            return PromiseHelper.reject(WKBKTStr.DelErr);
        }

        var deferred = jQuery.Deferred();
        var isCurrentWKBK = (workbookId === activeWKBKId);

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

            // XXX may not need KVStore.commit(),
            // bring KVStore.commit() back if it's buggy
            return WorkbookManager.commit();

            // var innerDeferred = jQuery.Deferred();
            // KVStore.commit()
            // .then(innerDeferred.resolve)
            // .fail(function(error) {
            //     if (error.status === StatusT.StatusSessionNotFound) {
            //         // normal error when no any active seesion
            //         // and trigger deleting
            //         innerDeferred.resolve();
            //     } else {
            //         innerDeferred.reject(error);
            //     }
            // });

            // return innerDeferred.promise();
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
        var gInfoKey     = generateKey(wkbkId, "gInfo");
        var gEphInfoKey  = generateKey("", "gEphInfo"); // Global key!!!
        var gLogKey      = generateKey(wkbkId, "gLog");
        var gErrKey      = generateKey(wkbkId, "gErr");
        var gUserKey     = generateKey(username, 'gUser');
        var gSettingsKey = generateKey("", 'gSettings'); // global key

        var keys = {
            gStorageKey   : gInfoKey,
            gEphStorageKey: gEphInfoKey, // Global key!!!
            gLogKey       : gLogKey,
            gErrKey       : gErrKey,
            gUserKey      : gUserKey,
            gSettingsKey  : gSettingsKey
        };

        KVStore.setup(keys);
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
            var wrongNode = false;

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
                // XXX This does not work yet because of a backend bug
                // where you are not able to deactivate a workbook from another
                // node.
                var innerDeferred = jQuery.Deferred();
                var deferred;
                // Test session kvstore write
                if (activeWorkbooks.length === 1) {
                    deferred = KVStore.put("testKey", "unused", false,
                                XcalarApiKeyScopeT.XcalarApiKeyScopeSession);
                } else {
                    innerDeferred.resolve();
                    return innerDeferred.promise();
                }

                deferred
                .then(innerDeferred.resolve)
                .fail(function() {
                    wrongNode = true;
                    innerDeferred.resolve();
                });

                return innerDeferred.promise();
            })
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
                } else if (activeWorkbooks.length > 1 || wrongNode) {
                    // This clause needs to be in front of the other 2
                    // This is something that we do not support
                    // We will inactivate all the sessions and force user to
                    // reselect
                    storedActiveId = undefined;
                    var defArray = [];
                    for (var i = 0; i<activeWorkbooks.length; i++) {
                        defArray.push(XcalarDeactivateWorkbook(
                                                           activeWorkbooks[i]));
                    }
                    if (activeId) {
                        defArray.push(KVStore.delete(activeWKBKKey,
                                                     gKVScope.WKBK));
                    }
                    return PromiseHelper.when.apply(this, defArray);
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
            // if no workbook, force displaying the workbook modal
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

        copyAction("gInfo", gKVScope.META)
        .then(function() {
            // If success, then put this key into the new workbook
            // If fail, then ignore and proceed with the rest of the copying
            return copyAction("gEphInfo", gKVScope.EPHM, true);
        })
        .then(function() {
            return copyAction("gLog", gKVScope.LOG);
        })
        .then(function() {
            return copyAction("gErr", gKVScope.ERR);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        function copyAction(key, scope, ignoreFail) {
            // copy all info to new key
            var innerDeferred = jQuery.Deferred();
            var oldKey = generateKey(srcId, key);
            var newKey = generateKey(newId, key);

            KVStore.get(oldKey, scope)
            .then(function(value) {
                return KVStore.put(newKey, value, true, scope);
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                if (ignoreFail) {
                    innerDeferred.resolve();
                } else {
                    innerDeferred.reject(error);
                }
            });

            return innerDeferred.promise();
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        WorkbookManager.__testOnly__ = {};
        WorkbookManager.__testOnly__.generateKey = generateKey;
        WorkbookManager.__testOnly__.getWKBKId = getWKBKId;
        WorkbookManager.__testOnly__.delWKBKHelper = delWKBKHelper;
        WorkbookManager.__testOnly__.copyHelper = copyHelper;
        WorkbookManager.__testOnly__.resetActiveWKBK = resetActiveWKBK;
        WorkbookManager.__testOnly__.saveWorkbook = saveWorkbook;
    }
    /* End Of Unit Test Only */

    return (WorkbookManager);
}(jQuery, {}));
