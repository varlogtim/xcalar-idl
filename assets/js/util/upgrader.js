window.Upgrader = (function(Upgrader, $) {
    var globalCache;
    var userCache;
    var wkbksCache;

    Upgrader.exec = function(version) {
        var deferred = jQuery.Deferred();
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
        .fail(deferred.fail);

        return deferred.promise();
    };

    function initialize() {
        globalCache = {};
        userCache = {};
        wkbksCache = {};
    }

    function execUpgrade(currentKeys, upgradeKeys) {
        var deferred = jQuery.Deferred();
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
     *  gPendingUploadsKey, a simple array of string (no upgarde)
     */
    function upgradeGlobalInfos(globalKeys) {
        var def1 = upgradeEphMeta(globalKeys.gEphStorageKey);
        var def2 = upgradeGenSettings(globalKeys.gSettingsKey);
        return PromiseHelper.when(def1, def2);
    }

    function upgradeEphMeta(gEphStorageKey) {
        var deferred = jQuery.Deferred();

        upgradeHelper(gEphStorageKey, gKVScope.EPHM, "EMetaConstructor")
        .then(function(eMeta) {
            globalCache.eMeta = eMeta;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeGenSettings(gSettingsKey) {
        var deferred = jQuery.Deferred();

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
        var deferred = jQuery.Deferred();

        upgradeHelper(gAuthKey, gKVScope.AUTH, "XcAuth")
        .then(function(auth) {
            userCache.auth = auth;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeUserSettings(gUserKey) {
        var deferred = jQuery.Deferred();

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
        var deferred = jQuery.Deferred();

        KVStore.getAndParse(wkbkKey, gKVScope.WKBK)
        .then(function(oldWkbks) {
            try {
                userCache.wkbks = WorkbookManager.upgrade(oldWkbks);
                deferred.resolve();
            } catch (error) {
                console.error(error.stack);
                deferred.reject(error);
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
        var deferred = jQuery.Deferred();

        upgradeHelper(gStorageKey, gKVScope.META, "METAConstructor")
        .then(function(meta) {
            wkbkContainer.meta = meta;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // Special case: after upgrade, SQL.upgrade already return a string
    function upgradeLogMeta(gLogKey, wkbkContainer) {
        var deferred = jQuery.Deferred();

        KVStore.get(gLogKey, gKVScope.LOG)
        .then(function(oldLog) {
            wkbkContainer.log = SQL.upgrade(oldLog);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // Special case: after upgrade, SQL.upgrade already return a string
    function upgradeErrorLogMeta(gErrKey, wkbkContainer) {
        var deferred = jQuery.Deferred();

        KVStore.get(gErrKey, gKVScope.ERR)
        .then(function(oldErrorLog) {
            wkbkContainer.errorLog = SQL.upgrade(oldErrorLog);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeHelper(key, scope, consctorName) {
        var deferred = jQuery.Deferred();

        KVStore.getAndParse(key, scope)
        .then(function(meta) {
            try {
                var newMeta = KVStore.upgrade(meta, consctorName);
                deferred.resolve(newMeta);
            } catch (error) {
                console.error(error.stack);
                deferred.reject(error);
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

        var def1 = checkAndWrite(eMetaKey, eMeta, gKVScope.EPHM);
        var def2 = checkAndWrite(genSettingsKey, genSettings, gKVScope.GLOB);
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

    function checkAndWrite(key, value, scope) {
        var deferred = jQuery.Deferred();

        KVStore.get(key, scope)
        .then(function(oldValue) {
            if (oldValue != null) {
                xcConsole.log("info of new version already exist");
            } else {
                return writeHelper(key,value, scope);
            }

            deferred.resolve();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function writeHelper(key, value, scope, alreadyStringify) {
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
        return XcalarKeyPut(key, stringified, true, scope);
    }
    /* end of write part */

    return Upgrader;
}({}, jQuery));