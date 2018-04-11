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

        upgradeHelper(gEphStorageKey, gKVScope.GLOB, "EMetaConstructor")
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
     * User keys:
     *  gUserKey, for UserInfoConstructor
     *  wkbkKey, for WKBK
     */
    function upgradeUserInfos(userKeys) {
        var def1 = upgradeUserSettings(userKeys.gUserKey);
        var def2 = upgradeWKBkSet(userKeys.wkbkKey);
        return PromiseHelper.when(def1, def2);
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
        var wkbkStore = new KVStore(wkbkKey, gKVScope.USER);
        wkbkStore.getAndParse()
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
        for (var wkbkName in wkbks) {
            var wkbkInfoKeys = wkbks[wkbkName];
            wkbksCache[wkbkName] = {};
            defArray.push(upgradeOneWkbk(wkbkInfoKeys, wkbkName));
        }

        return PromiseHelper.when.apply(this, defArray);
    }

    /*
     * Wkbk keys:
     *  gStorageKey, for METAConstructor
     *  gLogKey, for XcLog
     *  gErrKey, for XcLog (error log)
     *  gOverwrittenLogKey, for XcLog
     *  gAuthKey, for XcAuth
     *  gNotebookKey XXX not sure how to handle upgrade yet
     */
    function upgradeOneWkbk(wkbkInfoKeys, wkbkName) {
        var def1 = upgradeStorageMeta(wkbkInfoKeys.gStorageKey, wkbkName);
        var def2 = upgradeAuth(wkbkInfoKeys.gAuthKey, wkbkName);
        var def3 = upgradeLogMeta(wkbkInfoKeys.gLogKey, wkbkName);
        var def4 = upgradeErrorLogMeta(wkbkInfoKeys.gErrKey, wkbkName);
        var def5 = upgradeOverwrittenLogMeta(wkbkInfoKeys.gOverwrittenLogKey, wkbkName);
        var def6 = upgradeNotbookMeta(wkbkInfoKeys.gNotebookKey, wkbkName);
        return PromiseHelper.when(def1, def2, def3, def4, def5, def6);
    }

    function upgradeStorageMeta(gStorageKey, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var wkbkContainer = wkbksCache[wkbkName];
        upgradeHelper(gStorageKey, gKVScope.WKBK, "METAConstructor", wkbkName)
        .then(function(meta) {
            wkbkContainer.meta = meta;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeLogMeta(gLogKey, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var wkbkContainer = wkbksCache[wkbkName];

        upgradeLogMetaHelper(gLogKey, wkbkName)
        .then(function(newLog) {
            wkbkContainer.log = newLog;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeErrorLogMeta(gErrKey, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var wkbkContainer = wkbksCache[wkbkName];

        upgradeLogMetaHelper(gErrKey, wkbkName)
        .then(function(newErrorLog) {
            wkbkContainer.errorLog = newErrorLog;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeOverwrittenLogMeta(gOverwrittenLogKey, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var wkbkContainer = wkbksCache[wkbkName];

        upgradeLogMetaHelper(gOverwrittenLogKey, wkbkName)
        .then(function(newOverwrittenLog) {
            wkbkContainer.overwrittenLog = newOverwrittenLog;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // Special case: after upgrade, Log.upgrade already return a string
    function upgradeLogMetaHelper(key, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var kvStore = new KVStore(key, gKVScope.WKBK);
        var currentSession = sessionName;
        setSessionName(wkbkName);
        
        kvStore.get()
        .then(function(log) {
            deferred.resolve(Log.upgrade(log));
        })
        .fail(deferred.reject);

        setSessionName(currentSession);
        return deferred.promise();
    }

    function upgradeAuth(gAuthKey, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var wkbkContainer = wkbksCache[wkbkName];
        upgradeHelper(gAuthKey, gKVScope.WKBK, "XcAuth", wkbkName)
        .then(function(auth) {
            wkbkContainer.auth = auth;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function upgradeNotbookMeta(gNotebookKey, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var wkbkContainer = wkbksCache[wkbkName];
        var kvStore = new KVStore(gNotebookKey, gKVScope.WKBK);
        var currentSession = sessionName;
        setSessionName(wkbkName);
        
        kvStore.get()
        .then(function(value) {
            wkbkContainer.notebook = value;
            deferred.resolve();
        })
        .fail(deferred.reject);

        setSessionName(currentSession);
        return deferred.promise();
    }

    function upgradeHelper(key, scope, consctorName, wkbkName) {
        var deferred = PromiseHelper.deferred();
        var kvStore = new KVStore(key, scope);
        var currentSession = sessionName;

        if (wkbkName != null) {
            setSessionName(wkbkName);
        }

        kvStore.getAndParse()
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

        setSessionName(currentSession);

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

        var def1 = checkAndWrite(eMetaKey, eMeta, gKVScope.GLOB, true);
        var def2 = checkAndWrite(genSettingsKey, genSettings, gKVScope.GLOB, true);
        return PromiseHelper.when(def1, def2);
    }

    function writeUserInfos(userKeys) {
        var userSettingsKey = userKeys.gUserKey;
        var userSettings = userCache.userSettings;

        var wkbksKey = userKeys.wkbkKey;
        var wkbks = userCache.wkbks;

        var def1 = writeHelper(userSettingsKey, userSettings, gKVScope.USER);
        var def2 = writeHelper(wkbksKey, wkbks, gKVScope.USER);
        return PromiseHelper.when(def1, def2);
    }

    function writeWkbkInfo(wkbks) {
        var defArray = [];
        for (var wkbkName in wkbks) {
            var wkbkInfoKeys = wkbks[wkbkName];
            defArray.push(writeOneWkbk(wkbkInfoKeys, wkbkName));
        }

        return PromiseHelper.when.apply(this, defArray);
    }

    function writeOneWkbk(wkbkInfoKeys, wkbkName) {
        var wkbkContainer = wkbksCache[wkbkName];
        var metaKey = wkbkInfoKeys.gStorageKey;
        var meta = wkbkContainer.meta;

        var authKey = wkbkInfoKeys.gAuthKey;
        var auth = wkbkContainer.auth;

        var logKey = wkbkInfoKeys.gLogKey;
        var log = wkbkContainer.log;

        var errorKey = wkbkInfoKeys.gErrKey;
        var errorLog = wkbkContainer.errorLog;

        var overwrittenKey = wkbkInfoKeys.gOverwrittenLogKey;
        var overwrittenLog = wkbkContainer.overwrittenLog;

        var notebookKey = wkbkInfoKeys.gNotebookKey;
        var notebook = wkbkContainer.notebook;

        var def1 = writeHelper(metaKey, meta, gKVScope.WKBK, false, wkbkName);
        var def2 = writeHelper(authKey, auth, gKVScope.WKBK, false, wkbkName);
        var def3 = writeHelper(logKey, log, gKVScope.WKBK, true, wkbkName);
        var def4 = writeHelper(errorKey, errorLog, gKVScope.WKBK, true, wkbkName);
        var def5 = writeHelper(overwrittenKey, overwrittenLog, gKVScope.WKBK, true, wkbkName);
        var def6 = writeHelper(notebookKey, notebook, gKVScope.WKBK, false, wkbkName);
        return PromiseHelper.when(def1, def2, def3, def4, def5, def6);
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

    function writeHelper(key, value, scope, alreadyStringify, needMutex, wkbkName) {
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

        var currentSession = sessionName;
        if (wkbkName != null) {
            setSessionName(wkbkName);
        }
        var kvStore = new KVStore(key, scope);
        if (needMutex) {
            
            return kvStore.putWithMutex(stringified, true, true);
        } else {
            return kvStore.put(stringified, true, true);
        }
        setSessionName(currentSession);
    }
    /* end of write part */

    return Upgrader;
}({}, jQuery));
