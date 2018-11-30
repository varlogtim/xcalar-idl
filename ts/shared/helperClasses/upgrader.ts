class Upgrader {
    private _globalCache: Map<string, any>;
    private _userCache: Map<string, any>;
    private _wkbksCache: Map<string, any>;
    private _version: number;

    constructor(version) {
        this._version = version;
        this._initialize();
    }

    /**
     * Upgrader.exec
     */
    public exec(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const version: number = this._version;

        WorkbookManager.getWKBKsAsync()
            .then((_oldWorkbooks, sessionInfo, isWrongNode) => {
                if (isWrongNode) {
                    // wrong node don't do upgrade
                    return;
                } else {
                    const currentKeys: object = WorkbookManager.getKeysForUpgrade(sessionInfo, version);
                    const upgradeKeys: object = WorkbookManager.getKeysForUpgrade(sessionInfo, currentVersion);
                    return this._execUpgrade(currentKeys, upgradeKeys);
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    };

    private _initialize(): void {
        this._globalCache = new Map();
        this._userCache = new Map();
        this._wkbksCache = new Map();
    }

    private _execUpgrade(currentKeys: object, upgradeKeys: object): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $text: JQuery = $("#initialLoadScreen .text");
        const oldText: string = $text.text();
        $text.text(CommonTxtTstr.Upgrading);
        console.log("upgrade workbook", currentKeys, upgradeKeys);
        // step 1. read and upgrade old data
        this._readAndUpgrade(currentKeys)
            .then(() => {
                // step 2. write new data
                return this._writeToNewVersion(upgradeKeys);
            })
            .then(() => {
                // bump up version
                return XVM.commitKVVersion();
            })
            .then(() => {
                console.log("upgrade success", this._globalCache,
                    this._userCache, this._wkbksCache);
                deferred.resolve();
            })
            .fail((error) => {
                // XXX now just let the whole setup fail
                // may have a better way to handle it
                xcConsole.error(error);
                deferred.reject(error);
            })
            .always(() => {
                $text.text(oldText);
            });

        return deferred.promise();
    }

    /* ===================== Start of read and upgrade part ================= */
    private _upgradeHelper(
        key: string,
        scope: number,
        consctorName: string,
        wkbkName?: string
    ): XDPromise<object> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        const kvStore: KVStore = new KVStore(key, scope);
        const currentSession: string = sessionName;

        if (wkbkName != null) {
            setSessionName(wkbkName);
        }

        kvStore.getAndParse()
            .then((meta) => {
                try {
                    let newMeta: object = KVStore.upgrade(meta, consctorName);
                    deferred.resolve(newMeta);
                } catch (error) {
                    let err: Error = error.stack || error;
                    console.error(error.stack || error);
                    deferred.reject(err);
                }
            })
            .fail(deferred.reject);

        setSessionName(currentSession);

        return deferred.promise();
    }

    private _upgradeGenSettings(gSettingsKey: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._upgradeHelper(gSettingsKey, gKVScope.GLOB, 'GenSetting')
            .then((genSettings) => {
                this._globalCache.set('genSettings', genSettings);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /*
     * global keys:
     *  gSettingsKey, for GenSettings
     */
    private _upgradeGlobalInfos(globalKeys: GlobalKVKeySet): XDPromise<void> {
        const def2: XDPromise<void> = this._upgradeGenSettings(globalKeys.gSettingsKey);
        return PromiseHelper.when(def1, def2);
    }

    private _upgradeUserSettings(gUserKey: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._upgradeHelper(gUserKey, gKVScope.USER, 'UserInfoConstructor')
            .then((userSettings) => {
                if (userSettings != null) {
                    const UserInfoKeys: { DS: 'gDSObj' } = new UserInfoConstructor().getMetaKeys();
                    const oldDS: object = userSettings[UserInfoKeys.DS];
                    userSettings[UserInfoKeys.DS] = DS.upgrade(oldDS);
                }

                this._userCache.set('userSettings', userSettings);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _upgradeWKBkSet(wkbkKey: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkStore: KVStore = new KVStore(wkbkKey, gKVScope.USER);
        wkbkStore.getAndParse()
            .then((oldWkbks) => {
                try {
                    const wkbks: object = WorkbookManager.upgrade(oldWkbks);
                    this._userCache.set('wkbks', wkbks);
                    deferred.resolve();
                } catch (error) {
                    console.error(error.stack);
                    deferred.reject(error);
                }
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /*
     * User keys:
     *  gUserKey, for UserInfoConstructor
     *  wkbkKey, for WKBK
     */
    private _upgradeUserInfos(userKeys: UserKVKeySet): XDPromise<void> {
        const def1: XDPromise<void> = this._upgradeUserSettings(userKeys.gUserKey);
        const def2: XDPromise<void> = this._upgradeWKBkSet(userKeys.wkbkKey);
        return PromiseHelper.when(def1, def2);
    }

    private _upgradeStorageMeta(
        gStorageKey: string,
        wkbkName: string
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkContainer: Map<string, any> = this._wkbksCache.get(wkbkName);
        this._upgradeHelper(gStorageKey, gKVScope.WKBK, 'METAConstructor', wkbkName)
            .then((meta) => {
                wkbkContainer.set('meta', meta);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    // Special case: after upgrade, Log.upgrade already return a string
    private _upgradeLogMetaHelper(
        key: string,
        wkbkName: string
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        const currentSession: string = sessionName;
        setSessionName(wkbkName);

        kvStore.get()
            .then((oldLog) => {
                deferred.resolve(Log.upgrade(oldLog));
            })
            .fail(deferred.reject);

        setSessionName(currentSession);
        return deferred.promise();
    }

    private _upgradeLogMeta(
        gLogKey: string,
        wkbkName: string
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkContainer: Map<string, string> = this._wkbksCache.get(wkbkName);

        this._upgradeLogMetaHelper(gLogKey, wkbkName)
            .then((newLog) => {
                wkbkContainer.set('log', newLog);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _upgradeErrorLogMeta(
        gErrKey: string,
        wkbkName: string
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkContainer: Map<string, string> = this._wkbksCache.get(wkbkName);

        this._upgradeLogMetaHelper(gErrKey, wkbkName)
            .then((newErrorLog) => {
                wkbkContainer.set('errorLog', newErrorLog);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _upgradeOverwrittenLogMeta(
        gOverwrittenLogKey: string,
        wkbkName: string
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkContainer: Map<string, string> = this._wkbksCache.get(wkbkName);

        this._upgradeLogMetaHelper(gOverwrittenLogKey, wkbkName)
            .then((newOverwrittenLog) => {
                wkbkContainer.set('overwrittenLog', newOverwrittenLog);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _upgradeAuth(gAuthKey: string, wkbkName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkContainer: Map<string, any> = this._wkbksCache.get(wkbkName);

        this._upgradeHelper(gAuthKey, gKVScope.WKBK, 'XcAuth', wkbkName)
            .then((auth) => {
                wkbkContainer.set('auth', auth);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _upgradeNotbookMeta(
        gNotebookKey: string,
        wkbkName: string
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkContainer: Map<string, string> = this._wkbksCache.get(wkbkName);
        const kvStore: KVStore = new KVStore(gNotebookKey, gKVScope.WKBK);
        const currentSession: string = sessionName;
        setSessionName(wkbkName);

        kvStore.get()
            .then((notebook) => {
                wkbkContainer.set('notebook', notebook);
                deferred.resolve();
            })
            .fail(deferred.reject);

        setSessionName(currentSession);
        return deferred.promise();
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
    private _upgradeOneWkbk(
        wkbkInfoKeys: WkbkKVKeySet,
        wkbkName: string
    ): XDPromise<void> {
        const def1: XDPromise<void> = this._upgradeStorageMeta(wkbkInfoKeys.gStorageKey, wkbkName);
        const def2: XDPromise<void> = this._upgradeAuth(wkbkInfoKeys.gAuthKey, wkbkName);
        const def3: XDPromise<void> = this._upgradeLogMeta(wkbkInfoKeys.gLogKey, wkbkName);
        const def4: XDPromise<void> = this._upgradeErrorLogMeta(wkbkInfoKeys.gErrKey, wkbkName);
        const def5: XDPromise<void> = this._upgradeOverwrittenLogMeta(wkbkInfoKeys.gOverwrittenLogKey, wkbkName);
        const def6: XDPromise<void> = this._upgradeNotbookMeta(wkbkInfoKeys.gNotebookKey, wkbkName);
        return PromiseHelper.when(def1, def2, def3, def4, def5, def6);
    }

    private _upgradeWkbkInfos(wkbks: object) {
        const defArray: XDPromise<void>[] = [];
        for (let wkbkName in wkbks) {
            const wkbkInfoKeys: WkbkKVKeySet = wkbks[wkbkName];
            this._wkbksCache.set(wkbkName, new Map());
            defArray.push(this._upgradeOneWkbk(wkbkInfoKeys, wkbkName));
        }

        return PromiseHelper.when.apply(this, defArray);
    }

    private _readAndUpgrade(currentKeys: object): XDPromise<void> {
        const def1: XDPromise<void> = this._upgradeGlobalInfos(currentKeys['global']);
        const def2: XDPromise<void> = this._upgradeUserInfos(currentKeys['user']);
        const def3: XDPromise<void> = this._upgradeWkbkInfos(currentKeys['wkbk']);
        return PromiseHelper.when(def1, def2, def3);
    }

    /* ================== end of read and upgrade part ====================== */

    /* ======================== Write part ================================== */
    private _writeHelper(
        key: string,
        value: string | object,
        scope: number,
        alreadyStringify: boolean = false,
        needMutex: boolean = false,
        wkbkName?: string
    ): XDPromise<void> {
        if (value == null) {
            // skip null value
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const stringified: string = alreadyStringify ?
            <string>value : JSON.stringify(value);
        const currentSession: string = sessionName;
        if (wkbkName != null) {
            setSessionName(wkbkName);
        }
        const kvStore: KVStore = new KVStore(key, scope);
        let promise: XDPromise<void>;
        if (needMutex) {
            promise = kvStore.putWithMutex(stringified, true, true);
        } else {
            promise = kvStore.put(stringified, true, true);
        }

        promise
            .then(deferred.resolve)
            .fail(deferred.reject);

        setSessionName(currentSession);

        return deferred.promise();
    }

    private _checkAndWrite(key, value, scope, needMutex): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const kvStore: KVStore = new KVStore(key, scope);
        kvStore.get()
            .then((oldValue) => {
                if (oldValue != null) {
                    console.log("info of new version already exist");
                } else {
                    return this._writeHelper(key, value, scope, null, needMutex);
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _writeGlobalInfos(globalKeys: GlobalKVKeySet): XDPromise<void> {
        const genSettingsKey: string = globalKeys.gSettingsKey;
        const genSettings: string = this._globalCache.get('genSettings');

        return this._checkAndWrite(genSettingsKey, genSettings, gKVScope.GLOB, true);
    }

    private _writeUserInfos(userKeys: UserKVKeySet): XDPromise<void> {
        const userSettingsKey: string = userKeys.gUserKey;
        const userSettings: object = this._userCache.get('userSettings');

        const wkbksKey: string = userKeys.wkbkKey;
        const wkbks: object = this._userCache.get('wkbks');

        const def1: XDPromise<void> = this._writeHelper(userSettingsKey,
            userSettings,
            gKVScope.USER);
        const def2: XDPromise<void> = this._writeHelper(wkbksKey,
            wkbks,
            gKVScope.USER);
        return PromiseHelper.when(def1, def2);
    }

    private _writeOneWkbk(
        wkbkInfoKeys: WkbkKVKeySet,
        wkbkName: string
    ): XDPromise<void> {
        const wkbkContainer: Map<string, any> = this._wkbksCache.get(wkbkName);
        const metaKey: string = wkbkInfoKeys.gStorageKey;
        const meta: object = wkbkContainer.get('meta');

        const authKey: string = wkbkInfoKeys.gAuthKey;
        const auth: object = wkbkContainer.get('auth');

        const logKey: string = wkbkInfoKeys.gLogKey;
        const log: string = wkbkContainer.get('log');

        const errorKey: string = wkbkInfoKeys.gErrKey;
        const errorLog: string = wkbkContainer.get('errorLog');

        const overwrittenKey: string = wkbkInfoKeys.gOverwrittenLogKey;
        const overwrittenLog: string = wkbkContainer.get('overwrittenLog');

        const notebookKey: string = wkbkInfoKeys.gNotebookKey;
        const notebook: object = wkbkContainer.get('notebook');

        const def1: XDPromise<void> = this._writeHelper(metaKey, meta,
            gKVScope.WKBK, false, false, wkbkName);
        const def2: XDPromise<void> = this._writeHelper(authKey, auth,
            gKVScope.WKBK, false, false, wkbkName);
        const def3: XDPromise<void> = this._writeHelper(logKey, log,
            gKVScope.WKBK, true, false, wkbkName);
        const def4: XDPromise<void> = this._writeHelper(errorKey, errorLog,
            gKVScope.WKBK, true, false, wkbkName);
        const def5: XDPromise<void> = this._writeHelper(overwrittenKey, overwrittenLog,
            gKVScope.WKBK, true, false, wkbkName);
        const def6: XDPromise<void> = this._writeHelper(notebookKey, notebook,
            gKVScope.WKBK, true, false, wkbkName);
        return PromiseHelper.when(def1, def2, def3, def4, def5, def6);
    }

    private _writeWkbkInfo(wkbks: object): XDPromise<void> {
        const defArray: XDPromise<void>[] = [];
        for (let wkbkName in wkbks) {
            let wkbkInfoKeys: WkbkKVKeySet = wkbks[wkbkName];
            defArray.push(this._writeOneWkbk(wkbkInfoKeys, wkbkName));
        }
        return PromiseHelper.when.apply(this, defArray);
    }

    private _writeToNewVersion(upgradeKeys: object): XDPromise<void> {
        const def1: XDPromise<void> = this._writeGlobalInfos(upgradeKeys['global']);
        const def2: XDPromise<void> = this._writeUserInfos(upgradeKeys['user']);
        const def3: XDPromise<void> = this._writeWkbkInfo(upgradeKeys['wkbk']);
        return PromiseHelper.when(def1, def2, def3);
    }
    /* =========================== end of write part ======================== */
}
