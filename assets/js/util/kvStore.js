window.KVStore = (function($, KVStore) {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    var isUnCommit = false;
    var metaInfos;
    var ephMetaInfos; // Ephemeral meta
    var commitCnt = 0;

    // keys: gStorageKey, gEphStorageKey, gLogKey, gErrKey, gUserKey,
    // gSettingsKey
    KVStore.setup = function(keys) {
        for (var keyName in keys) {
            KVStore[keyName] = keys[keyName];
        }
        KVStore.commitKey = KVStore.gStorageKey + "-" + "commitKey";
    };

    KVStore.genMutex = function(kvKey, scope) {
        var mutexKey = kvKey + "-mutex";
        var mutex = new Mutex(mutexKey, scope);
        return mutex;
    };

    KVStore.get = function(key, scope) {
        var deferred = jQuery.Deferred();

        XcalarKeyLookup(key, scope)
        .then(function(value) {
            if (value != null && value.value != null) {
                deferred.resolve(value.value);
            } else {
                deferred.resolve(null);
            }
        })
        .fail(function(error) {
            console.error("Get from KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.getAndParse = function(key, scope) {
        var deferred = jQuery.Deferred();
        XcalarKeyLookup(key, scope)
        .then(function(value) {
            // "" can not be JSON.parse
            if (value != null && value.value != null && value.value !== "") {
                var passed = false;
                var error;
                try {
                    value = JSON.parse(value.value);
                    passed = true;
                } catch (err) {
                    console.error(err, value, key);
                    error = err;
                }

                if (passed) {
                    deferred.resolve(value);
                } else {
                    deferred.reject(error);
                }
            } else {
                deferred.resolve(null);
            }
        })
        .fail(function(error) {
            console.error("Get And Parse from KV Store fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.put = function(key, value, persist, scope) {
        var deferred = jQuery.Deferred();
        XcSupport.commitCheck()
        .then(function() {
            return XcalarKeyPut(key, value, persist, scope);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Put to KV Store fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.putWithMutex = function(key, value, persist, scope, noCommitCheck) {
        var deferred = jQuery.Deferred();
        var lock = KVStore.genMutex(key, scope);

        commitCheck()
        .then(function() {
            return lockAndPut();
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (error === ConcurrencyEnum.NoKVStore) {
                // XXX it's an error handling code, fix me if not correct
                Concurrency.initLock(lock)
                .then(lockAndPut)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
            }
        });

        function commitCheck() {
            if (noCommitCheck) {
                return PromiseHelper.resolve();
            } else {
                return XcSupport.commitCheck();
            }
        }

        function lockAndPut() {
            var innerDeferred = jQuery.Deferred();
            var lockString;

            Concurrency.tryLock(lock)
            .then(function(res) {
                lockString = res;
                console.log("lock key", key, "with", lockString);
                return XcalarKeyPut(key, value, persist, scope);
            })
            .then(function() {
                return Concurrency.unlock(lock, lockString);
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                console.error("Put to KV Store with mutex fails!", error);
                if (lockString != null) {
                    Concurrency.unlock(lock, lockString)
                    .always(function() {
                        innerDeferred.reject(error);
                    });
                } else {
                    innerDeferred.reject(error);
                }
            });

            return innerDeferred.promise();
        }

        return deferred.promise();
    };

    KVStore.append = function(key, value, persist, scope) {
        var deferred = jQuery.Deferred();

        XcSupport.commitCheck()
        .then(function() {
            return XcalarKeyAppend(key, value, persist, scope);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    };

    KVStore.delete = function(key, scope) {
        var deferred = jQuery.Deferred();

        XcalarKeyDelete(key, scope)
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Delete in KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.commit = function(atStartUp) {
        var deferred = jQuery.Deferred();
        var $autoSaveBtn = $("#autoSaveBtn");
        var $userSettingsSave = $("#userSettingsSave");
        var currentCnt = commitCnt;

        commitCnt++;

        $autoSaveBtn.addClass("saving");
        xcHelper.disableSubmit($autoSaveBtn);
        xcHelper.disableSubmit($userSettingsSave);

        metaInfos.update();


        XcSupport.stopHeartbeatCheck();

        KVStore.put(KVStore.gStorageKey, JSON.stringify(metaInfos), true,
                    gKVScope.META)
        .then(function() {
            if (DF.wasRestored()) {
                ephMetaInfos.update();
                return KVStore.put(KVStore.gEphStorageKey,
                                JSON.stringify(ephMetaInfos), false,
                                gKVScope.EPHM);
            } else {
                // if df wasn't restored yet, we don't want to commit empty
                // ephMetaInfos
                return PromiseHelper.resolve();
            }
        })
        .then(function() {
            return Log.commit();
        })
        .then(function() {
            if (!atStartUp) {
                return UserSettings.commit();
            }
        })
        .then(function() {
            return WorkbookManager.commit();
        })
        .then(function() {
            return XcalarSaveWorkbooks("*");
        })
        .then(function() {
            KVStore.logSave(true);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("commit fails!", error);
            deferred.reject(error);
        })
        .always(function() {
            XcSupport.restartHeartbeatCheck();
            // when there is no other commits
            if (currentCnt === commitCnt - 1) {
                $autoSaveBtn.removeClass("saving");
                xcHelper.enableSubmit($autoSaveBtn);
                xcHelper.enableSubmit($userSettingsSave);
            } else {
                console.info("not the latest commit");
            }
        });

        return deferred.promise();
    };

    KVStore.hasUnCommitChange = function() {
        return isUnCommit;
    };

    KVStore.logChange = function() {
        isUnCommit = true;
        // document.title = "* Xcalar";
        $("#favicon").attr("href", paths.faviconUnsave);
        $("#autoSaveBtn").addClass("unsave");
    };

    KVStore.logSave = function(updateInfo) {
        isUnCommit = false;
        // document.title = "Xcalar";
        $("#favicon").attr("href", paths.favicon);
        $("#autoSaveBtn").removeClass("unsave");

        if (!updateInfo) {
            return;
        }

        var name = "N/A";
        var modified = "N/A";
        var activeWKBKId = WorkbookManager.getActiveWKBK();

        if (activeWKBKId != null) {
            var workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
            if (workbook != null) {
                name = workbook.name;
                modified = xcHelper.getDate("-", null, workbook.modified) +
                           " " + xcHelper.getTime(null, workbook.modified);
            }
        }

        $("#worksheetInfo .wkbkName").text(name);
        modified = TooltipTStr.SavedOn + ": " + modified;
        xcTooltip.changeText($("#autoSaveBtn"), modified);
    };

    KVStore.restore = function() {
        var deferred = jQuery.Deferred();

        var gInfosUser = {};
        var gInfosSetting = {};
        var gInfosMeta = {};
        var gPendingUploads = [];
        var isEmpty = false;

        getUserInfo()
        .then(function(userMeta) {
            gInfosUser = userMeta;
            return getSettingInfo();
        })
        .then(function(settingMeta) {
            gInfosSetting = settingMeta;
            return getPendingUploads();
        })
        .then(function(uploadsMeta) {
            gPendingUploads = uploadsMeta;
            return getMetaInfo();
        })
        .then(function(meta) {
            gInfosMeta = meta || {};
            isEmpty = $.isEmptyObject(gInfosMeta);
            return restore();
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("KVStore restore fails!", error);
            deferred.reject(error);
        });

        function restore() {
            var innerDeferred = jQuery.Deferred();

            var userInfos = new UserInfoConstructor(gInfosUser);
            UserSettings.restore(userInfos, gInfosSetting)
            .then(function() {
                try {
                    metaInfos = new METAConstructor(gInfosMeta);
                    ephMetaInfos = new EMetaConstructor({});

                    WSManager.restore(metaInfos.getWSMeta());
                    TPrefix.restore(metaInfos.getTpfxMeta());
                    Aggregates.restore(metaInfos.getAggMeta());
                    TblManager.restoreTableMeta(metaInfos.getTableMeta());
                    DSCart.restore(metaInfos.getCartMeta());
                    Profile.restore(metaInfos.getStatsMeta());
                } catch (error) {
                    console.error(error.stack);
                    return PromiseHelper.reject(error);
                }
                return DSUploader.restore(gPendingUploads);
            })
            .then(function() {
                return SupTicketModal.restore();
            })
            .then(function() {
                if (isEmpty) {
                    console.info("KVStore is empty!");
                } else {
                    var oldLogCursor = metaInfos.getLogCMeta();
                    return Log.restore(oldLogCursor);
                }
            })
            .then(function() {
                // must come after Log.restore
                QueryManager.restore(metaInfos.getQueryMeta());
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        return deferred.promise();
    };

    KVStore.getEmataInfo = function() {
        // If the ephmeral datastructure is corrupt, we move ahead with the
        // rest of the restore since ephemeral isn't that important
        var ignoreFail = true;
        return getInfo(KVStore.gEphStorageKey, gKVScope.EPHM, ignoreFail);
    };

    function getInfo(infoKey, infoScope, ignoreFail) {
        var deferred = jQuery.Deferred();

        KVStore.getAndParse(infoKey, infoScope)
        .then(function(info) {
            if (typeof(info) === "object") {
                deferred.resolve(info);
            } else {
                var error = "Expect info of" + infoKey +
                            "to be an object but it's a " +
                            typeof(info) + " instead. Not restoring.";
                xcConsole.log(error);
                deferred.resolve({});
            }
        })
        .fail(function(error) {
            xcConsole.log("get meta of", infoKey, "fails", error);
            if (ignoreFail) {
                deferred.resolve({});
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function getUserInfo() {
        return getInfo(KVStore.gUserKey, gKVScope.USER);
    }

    function getSettingInfo() {
        return getInfo(KVStore.gSettingsKey, gKVScope.GLOB);
    }

    function getPendingUploads() {
        if (XVM.getLicenseMode() !== XcalarMode.Demo) {
            return PromiseHelper.resolve();
        }
        return getInfo(KVStore.gPendingUploadsKey, gKVScope.GLOB);
    }

    function getMetaInfo() {
        return getInfo(KVStore.gStorageKey, gKVScope.META);
    }

    KVStore.upgrade = function(oldMeta, constorName) {
        if (oldMeta == null) {
            return null;
        }

        var persistedVersion = oldMeta.version;
        xcAssert((persistedVersion != null) && (constorName != null));
        var newMeta = oldMeta;
        for (var i = 0; i < currentVersion - persistedVersion; i++) {
            var versionToBe = (persistedVersion + (i + 1));
            var ctor = constorName + "V" + versionToBe;

            xcAssert(window[ctor] != null &&
                    typeof window[ctor] === "function");
            newMeta = new window[ctor](newMeta);
        }
        return newMeta;
    };

    return (KVStore);
}(jQuery, {}));
