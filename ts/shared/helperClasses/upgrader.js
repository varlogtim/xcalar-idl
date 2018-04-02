window.Upgrader = (function(Upgrader, $) {
    var globalCache;
    var userCache;
    var wkbksCache;

    Upgrader.exec = function(version) {
        var deferred = PromiseHelper.deferred();
        initialize();
        WorkbookManager.getWKBKsAsync()
        .then(function(oldWorkbooks, sessionInfo, isWrongNode) {
            if (isWrongNode) {
                // wrong node don't do upgrade
                return;
            } else {
                var currentKeys = WorkbookManager.getKeysForUpgrade(sessionInfo,
                                                                    version);
                var upgradeKeys = WorkbookManager.getKeysForUpgrade(sessionInfo,
                                                                currentVersion);
                return execUpgrade(currentKeys, upgradeKeys);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    function initialize() {
        globalCache = {};
        userCache = {};
        wkbksCache = {};
    }

    function execUpgrade(currentKeys, upgradeKeys) {
        var deferred = PromiseHelper.deferred();
        var $text = $("#initialLoadScreen .text");
        var oldText = $text.text();

        $text.text(CommonTxtTstr.Upgrading);
        console.log("upgrade workbook", currentKeys, upgradeKeys);
        // step 1. read and upgrade old data
        readAndUpgrade(currentKeys)
        .then(function() {
            // step 2. write new data
            return writeToNewVersion(upgradeKeys);
        })
        .then(function() {
            // bump up version
            return XVM.commitKVVersion();
        })
        .then(function() {
            console.log("upgrade success", globalCache, userCache, wkbksCache);
            deferred.resolve();
        })
        .fail(function(error) {
            // XXX now just let the whole setup fail
            // may have a better way to handle it
            xcConsole.error(error);
            deferred.reject(error);
        })
        .always(function() {
            $text.text(oldText);
        });

        return deferred.promise();
    }

    /* Start of read and upgrade part */

    function readAndUpgrade(currentKeys) {
        var def1 = upgradeGlobalInfos(currentKeys.global);
        var def2 = upgradeUserInfos(currentKeys.user);
        var def3 = upgradeWkbkInfos(currentKeys.wkbk);
        return PromiseHelper.when(def1, def2, def3);
    }

    /*
     * global keys:
     *  gEphStorageKey, for EMetaConstructor
     *  gSettingsKey, for GenSettings
     */
    function upgradeGlobalInfos(globalKeys) {
        var def1 = upgradeEphMeta(globalKeys.gEphStorageKey);
        var def2 = upgradeGenSettings(globalKeys.gSettingsKey);
        return PromiseHelper.when(def1, def2);
    }

    function upgradeEphMeta(gEphStorageKey) {
        var deferred = PromiseHelper.deferred();

        upgradeHelper(gEphStorageKey, gKVScope.EPHM, "EMetaConstructor")
        .then(function(eMeta) {
            globalCache.eMeta = eMeta;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeGenSettings(gSettingsKey) {
        var deferred = PromiseHelper.deferred();

        upgradeHelper(gSettingsKey, gKVScope.GLOB, "GenSettings")
        .then(function(genSettings) {
            globalCache.genSettings = genSettings;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /*
     * global keys:
     *  gAuthKey, for XcAuth
     *  gUserKey, for UserInfoConstructor
     *  wkbkKey, for WKBK
     */
    function upgradeUserInfos(userKeys) {
        var def1 = upgradeAuth(userKeys.gAuthKey);
        var def2 = upgradeUserSettings(userKeys.gUserKey);
        var def3 = upgradeWKBkSet(userKeys.wkbkKey);

        return PromiseHelper.when(def1, def2, def3);
    }

    function upgradeAuth(gAuthKey) {
        var deferred = PromiseHelper.deferred();

        upgradeHelper(gAuthKey, gKVScope.AUTH, "XcAuth")
        .then(function(auth) {
            userCache.auth = auth;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeUserSettings(gUserKey) {
        var deferred = PromiseHelper.deferred();

        upgradeHelper(gUserKey, gKVScope.USER, "UserInfoConstructor")
        .then(function(userSettings) {
            if (userSettings != null) {
                var UserInfoKeys = new UserInfoConstructor().getMetaKeys();
                var oldDS = userSettings[UserInfoKeys.DS];
                userSettings[UserInfoKeys.DS] = DS.upgrade(oldDS);
            }

            userCache.userSettings = userSettings;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeWKBkSet(wkbkKey) {
        var deferred = PromiseHelper.deferred();
        var storageStore = new KVStore(wkbkKey, gKVScope.WKBK);
        storageStore.getAndParse()
        .then(function(oldWkbks) {
            var passed = false;
            var err;
            try {
                userCache.wkbks = WorkbookManager.upgrade(oldWkbks);
                passed = true;
            } catch (error) {
                console.error(error.stack);
                err = error;
            }
            if (passed) {
                deferred.resolve();
            } else {
                deferred.reject(err);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeWkbkInfos(wkbks) {
        var defArray = [];
        for (var wkbkId in wkbks) {
            var wkbkInfoKeys = wkbks[wkbkId];
            wkbksCache[wkbkId] = {};
            defArray.push(upgradeOneWkbk(wkbkInfoKeys, wkbksCache[wkbkId]));
        }

        return PromiseHelper.when.apply(this, defArray);
    }

    /*
     * Wkbk keys:
     *  gStorageKey, for METAConstructor
     *  gLogKey, for XcLog
     *  gErrKey, for XcLog (error log)
     */
    function upgradeOneWkbk(wkbkInfoKeys, wkbkContainer) {
        var def1 = upgradeStorageMeta(wkbkInfoKeys.gStorageKey, wkbkContainer);
        var def2 = upgradeLogMeta(wkbkInfoKeys.gLogKey, wkbkContainer);
        var def3 = upgradeErrorLogMeta(wkbkInfoKeys.gErrKey, wkbkContainer);
        return PromiseHelper.when(def1, def2, def3);
    }

    function upgradeStorageMeta(gStorageKey, wkbkContainer) {
        var deferred = PromiseHelper.deferred();

        upgradeHelper(gStorageKey, gKVScope.META, "METAConstructor")
        .then(function(meta) {
            wkbkContainer.meta = meta;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // Special case: after upgrade, Log.upgrade already return a string
    function upgradeLogMeta(gLogKey, wkbkContainer) {
        var deferred = PromiseHelper.deferred();
        var logStore = new KVStore(gLogKey, gKVScope.LOG);
        logStore.get()
        .then(function(oldLog) {
            wkbkContainer.log = Log.upgrade(oldLog);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // Special case: after upgrade, Log.upgrade already return a string
    function upgradeErrorLogMeta(gErrKey, wkbkContainer) {
        var deferred = PromiseHelper.deferred();
        var errorLogStore = new KVStore(gErrKey, gKVScope.ERR);
        errorLogStore.get()
        .then(function(oldErrorLog) {
            wkbkContainer.errorLog = Log.upgrade(oldErrorLog);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeHelper(key, scope, consctorName) {
        var deferred = PromiseHelper.deferred();
        var kvStore = new KVStore(key, scope);
        kvStore.getAndParse(key, scope)
        .then(function(meta) {
            var passed = false;
            var newMeta;
            var err;
            try {
                newMeta = KVStore.upgrade(meta, consctorName);
                passed = true;
            } catch (error) {
                err = error.stack || error;
                console.error(error.stack || error);
            }
            if (passed) {
                deferred.resolve(newMeta);
            } else {
                deferred.reject(err);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    /* end of read and upgrade part */

    /* Write part */
    function writeToNewVersion(upgradeKeys) {
        var def1 = writeGlobalInfos(upgradeKeys.global);
        var def2 = writeUserInfos(upgradeKeys.user);
        var def3 = writeWkbkInfo(upgradeKeys.wkbk);

        return PromiseHelper.when(def1, def2, def3);
    }

    function writeGlobalInfos(globalKeys) {
        var eMetaKey = globalKeys.gEphStorageKey;
        var eMeta = globalCache.eMeta;

        var genSettingsKey = globalKeys.gSettingsKey;
        var genSettings = globalCache.genSettings;

        var def1 = checkAndWrite(eMetaKey, eMeta, gKVScope.EPHM, true);
        var def2 = checkAndWrite(genSettingsKey, genSettings, gKVScope.GLOB, true);
        return PromiseHelper.when(def1, def2);
    }

    function writeUserInfos(userKeys) {
        var authKey = userKeys.gAuthKey;
        var auth = userCache.auth;

        var userSettingsKey = userKeys.gUserKey;
        var userSettings = userCache.userSettings;

        var wkbksKey = userKeys.wkbkKey;
        var wkbks = userCache.wkbks;

        var def1 = writeHelper(authKey, auth, gKVScope.AUTH);
        var def2 = writeHelper(userSettingsKey, userSettings, gKVScope.USER);
        var def3 = writeHelper(wkbksKey, wkbks, gKVScope.WKBK);
        return PromiseHelper.when(def1, def2, def3);
    }

    function writeWkbkInfo(wkbks) {
        var defArray = [];
        for (var wkbkId in wkbks) {
            var wkbkInfoKeys = wkbks[wkbkId];
            defArray.push(writeOneWkbk(wkbkInfoKeys, wkbksCache[wkbkId]));
        }

        return PromiseHelper.when.apply(this, defArray);
    }

    function writeOneWkbk(wkbkInfoKeys, wbkContainer) {
        var metaKey = wkbkInfoKeys.gStorageKey;
        var meta = wbkContainer.meta;

        var logKey = wkbkInfoKeys.gLogKey;
        var log = wbkContainer.log;

        var errorKey = wkbkInfoKeys.gErrKey;
        var errorLog = wbkContainer.errorLog;

        var def1 = writeHelper(metaKey, meta, gKVScope.META);
        var def2 = writeHelper(logKey, log, gKVScope.LOG, true);
        var def3 = writeHelper(errorKey, errorLog, gKVScope.ERR, true);
        return PromiseHelper.when(def1, def2, def3);
    }

    function checkAndWrite(key, value, scope, needMutex) {
        var deferred = PromiseHelper.deferred();
        var kvStore = new KVStore(key, scope);
        kvStore.get(key, scope)
        .then(function(oldValue) {
            if (oldValue != null) {
                console.log("info of new version already exist");
            } else {
                return writeHelper(key, value, scope, null, needMutex);
            }

            deferred.resolve();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function writeHelper(key, value, scope, alreadyStringify, needMutex) {
        if (value == null) {
            // skip null value
            return PromiseHelper.resolve();
        }

        var stringified;
        if (!alreadyStringify) {
            stringified = JSON.stringify(value);
        } else {
            stringified = value;
        }

        if (needMutex) {
            var kvStore = new KVStore(key, scope);
            return kvStore.putWithMutex(stringified, true, true);
        } else {
            return kvStore.put(stringified, true, true);
        }
    }
    /* end of write part */

    return Upgrader;
}({}, jQuery));
