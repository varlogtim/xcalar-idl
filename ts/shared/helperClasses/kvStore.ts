class KVStore {
    /* ============== Static Properties and Methods ========= */
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    private static keys: Map<string, string> = new Map();
    private static isUnCommit: boolean = false;
    private static saveTimeTimer: number;
    private static commitCnt: number = 0;
    private static metaInfos: METAConstructor;
    private static ephMetaInfos: EMetaConstructor; // Ephemeral meta


    /**
     * KVStore.setupUserAndGlobalKey
     * keys: gUserKey, gSettingsKey, gNotebookKey, gIMDKey,
     */
    public static setupUserAndGlobalKey(): void {
        const globlKeys: any = WorkbookManager.getGlobalScopeKeys(currentVersion);
        const userScopeKeys: any = WorkbookManager.getUserScopeKeys(currentVersion);
        const keys: string[] = $.extend({}, globlKeys, userScopeKeys);
        for (var key in keys) {
            KVStore.keys.set(key, keys[key]);
        }
    }

    /**
     * KVStore.setupWKBKKey
     * keys: gStorageKey, gEphStorageKey, gLogKey, gErrKey, commitKey
     * @param keys
     */
    public static setupWKBKKey() {
        const wkbkScopeKeys: any = WorkbookManager.getWkbkScopeKeys(currentVersion);
        const keys: string[] = $.extend({}, wkbkScopeKeys);
        for (var key in keys) {
            KVStore.keys.set(key, keys[key]);
        }
        let commitKey: string = KVStore.getKey("gStorageKey");
        if (commitKey != null) {
            commitKey +=  "-" + "commitKey";
            KVStore.keys.set("commitKey", commitKey);
        }
    }

    /**
     * KVStore.getKey
     * @param key
     */
    public static getKey(key: string) {
        return KVStore.keys.get(key);
    }

    /**
     * KVStore.hasUnCommitChange
     */
    public static hasUnCommitChange(): boolean {
        return KVStore.isUnCommit;
    }

    /**
     * KVStore.logChange
     */
    public static logChange(): void {
        KVStore.isUnCommit = true;
        // document.title = "* Xcalar";
        $("#favicon").attr("href", paths.faviconUnsave);
        $("#autoSaveBtn").addClass("unsave");
    }

    /**
     * KVStore.logSave
     * @param updateUI
     */
    public static logSave(updateUI: boolean): void {
        KVStore.isUnCommit = false;

        $("#favicon").attr("href", paths.favicon);
        $("#autoSaveBtn").removeClass("unsave");

        if (!updateUI) {
            return;
        }

        let name = "N/A";
        let modified = "N/A";
        let time = "";
        const activeWKBKId = WorkbookManager.getActiveWKBK();
        if (activeWKBKId != null) {
            const workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
            if (workbook != null) {
                name = workbook.name;
                time = workbook.modified;
                modified = moment(time).fromNow();
            }
        }

        $("#worksheetInfo .wkbkName").text(name);
        modified = TooltipTStr.Saved + " " + modified;
        xcTooltip.changeText($("#autoSaveBtn"), modified);

        clearInterval(KVStore.saveTimeTimer);
        KVStore.saveTimeTimer = <any>setInterval(() => {
            if (time) {
                modified = TooltipTStr.Saved + " " + moment(time).fromNow();
                xcTooltip.changeText($("#autoSaveBtn"), modified);
            } else {
                clearInterval(KVStore.saveTimeTimer);
            }
        }, 60000); // 1 minute
    }

    /**
     * KVStore.commit
     * @param atStartUp
     */
    public static commit(atStartUp: boolean = false): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $autoSaveBtn: JQuery = $("#autoSaveBtn");
        const $userSettingsSave: JQuery = $("#userSettingsSave");
        const currentCnt: number = KVStore.commitCnt;

        this._updateCommitCnt();

        $autoSaveBtn.addClass("saving");
        xcHelper.disableSubmit($autoSaveBtn);
        xcHelper.disableSubmit($userSettingsSave);

        XcSupport.stopHeartbeatCheck();

        this._commitUserAndGlobalInfo(atStartUp)
        .then(() => {
            return this._commitWKBKInfo();
        })
        .then(() => {
            KVStore.logSave(true);
            deferred.resolve();
        })
        .fail((error) => {
            console.error("commit fails!", error);
            deferred.reject(error);
        })
        .always(() => {
            XcSupport.restartHeartbeatCheck();
            // when there is no other commits
            if (currentCnt === KVStore.commitCnt - 1) {
                $autoSaveBtn.removeClass("saving");
                xcHelper.enableSubmit($autoSaveBtn);
                xcHelper.enableSubmit($userSettingsSave);
            } else {
                console.info("not the latest commit");
            }
        });

        return deferred.promise();
    }

    /**
     * KVStore.restoreUserAndGlobalInfo
     */
    public static restoreUserAndGlobalInfo(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let gInfosUser: object = {};
        let gInfosSetting: object = {};

        KVStore.getUserInfo()
        .then((userMeta) => {
            gInfosUser = userMeta;
            return KVStore.getSettingInfo();
        })
        .then((settingMeta) => {
            gInfosSetting = settingMeta;
            return this._restoreUserAndGlobalInfoHelper(gInfosUser, gInfosSetting);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("KVStore restore user info fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * KVStore.restoreWKBKInfo
     */
    public static restoreWKBKInfo(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._getMetaInfo()
        .then((meta) => {
            const gInfosMeta: object = meta || {};
            return this._restoreWKBKInfoHelper(gInfosMeta);
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error("KVStore restore fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * KVStore.genMutex
     * @param kvKey
     * @param scope
     */
    public static genMutex(kvKey: string, scope: number): Mutex {
        const mutexKey: string = kvKey + "-mutex";
        return new Mutex(mutexKey, scope);
    }

    /**
     * KVStore.update
     * @param oldMeta
     * @param constorName
     */
    public static upgrade(oldMeta: any, constorName: string): object {
        if (oldMeta == null) {
            return null;
        }

        const persistedVersion: number = oldMeta.version;
        xcAssert((persistedVersion != null) && (constorName != null));

        let newMeta: any = oldMeta;
        for (let i = 0; i < currentVersion - persistedVersion; i++) {
            const versionToBe: number = (persistedVersion + (i + 1));
            const ctor: string = constorName + "V" + versionToBe;

            xcAssert(window[ctor] != null &&
                    typeof window[ctor] === "function");
            newMeta = new window[ctor](newMeta);
        }
        return newMeta;
    }

    /**
     * KVStore.getUserInfo
     */
    public static getUserInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gUserKey");
        const kvStore = new KVStore(key, gKVScope.USER);
        return kvStore.getInfo();
    }

    /**
     * KVStore.getSettingInfo
     */
    public static getSettingInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gSettingsKey");
        const kvStore = new KVStore(key, gKVScope.GLOB);
        return kvStore.getInfo();
    }

    private static _updateCommitCnt() {
        KVStore.commitCnt++;
    }

    private static _getMetaInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gStorageKey");
        const kvStore = new KVStore(key, gKVScope.WKBK);
        return kvStore.getInfo();
    }

    private static _restoreUserAndGlobalInfoHelper(
        gInfosUser: object,
        gInfosSetting: object,
    ): XDPromise<void> {
        const userInfos: UserInfoConstructor = new UserInfoConstructor(gInfosUser);
        return UserSettings.restore(userInfos, gInfosSetting);
    }

    private static _restoreWKBKInfoHelper(gInfosMeta: object): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const isEmpty: boolean = $.isEmptyObject(gInfosMeta);

        try {
            KVStore.metaInfos = new METAConstructor(gInfosMeta);
            KVStore.ephMetaInfos = new EMetaConstructor({});

            WSManager.restore(KVStore.metaInfos.getWSMeta());
            TableComponent.getPrefixManager().restore(KVStore.metaInfos.getTpfxMeta());
            Aggregates.restore(KVStore.metaInfos.getAggMeta());
            TblManager.restoreTableMeta(KVStore.metaInfos.getTableMeta());
            DSCart.restore(KVStore.metaInfos.getCartMeta());
            Profile.restore(KVStore.metaInfos.getStatsMeta());
        } catch (error) {
            console.error(error);
            return PromiseHelper.reject(error);
        }

        let promise: XDPromise<void>;
        if (isEmpty) {
            console.info("KVStore is empty!");
            promise = PromiseHelper.resolve();
        } else {
            const oldLogCursor: number = KVStore.metaInfos.getLogCMeta();
            promise = Log.restore(oldLogCursor);
        }

        promise
        .then(() => {
            // must come after Log.restore
            QueryManager.restore(KVStore.metaInfos.getQueryMeta());
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private static _commitUserAndGlobalInfo(atStartUp): XDPromise<void> {
        return atStartUp ? PromiseHelper.resolve() : UserSettings.commit();
    }

    private static _commitWKBKInfo(): XDPromise<void> {
        if (WorkbookManager.getActiveWKBK() == null) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        KVStore.metaInfos.update();

        const storageStore = new KVStore(KVStore.getKey("gStorageKey"), gKVScope.WKBK);
        storageStore.put(JSON.stringify(KVStore.metaInfos), true)
        .then(() => {
            if (DF.wasRestored()) {
                KVStore.ephMetaInfos.update();
                const ephStore = new KVStore(KVStore.getKey("gEphStorageKey"), gKVScope.GLOB);
                return ephStore.put(JSON.stringify(KVStore.ephMetaInfos), true);
            } else {
                // if df wasn't restored yet, we don't want to commit empty
                // ephMetaInfos
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            return Log.commit();
        })
        .then(() => {
            return WorkbookManager.commit();
        })
        .then(() => {
            var wkbkId = WorkbookManager.getActiveWKBK();
            var workbook = WorkbookManager.getWorkbook(wkbkId);
            if (workbook != null) {
                // just an error handler
                var wkbkName = workbook.name;
                return XcalarSaveWorkbooks(wkbkName);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* ============ End of Static Properties and Methods ======= */

    /* ============ Instance Properties and Methods ========== */
    private key: string;
    private scope: number;

    /**
     * constructor
     * @param key
     * @param scope
     */
    public constructor(key: string, scope: number) {
        this.key = key;
        this.scope = scope;
    }

    /**
     * get
     */
    public get(): XDPromise<string> {
        const deferred: XDDeferred<string | null> = PromiseHelper.deferred();

        XcalarKeyLookup(this.key, this.scope)
        .then(function(value) {
            if (value != null && value.value != null) {
                deferred.resolve(value.value);
            } else {
                deferred.resolve(null);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * getAndParse
     */
    public getAndParse(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const key: string = this.key;

        this.get()
        .then(function(value: string) {
            // "" can not be JSON.parse
            if (value != null && value !== "") {
                let passed: boolean = false;
                let error: Error;
                let parsedVal: any;

                try {
                    parsedVal = JSON.parse(value);
                    passed = true;
                } catch (err) {
                    console.error(err, value, key);
                    error = err;
                }

                if (passed) {
                    deferred.resolve(parsedVal);
                } else {
                    deferred.reject(error);
                }
            } else {
                deferred.resolve(null);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * put
     * @param value
     * @param persist
     * @param noCommitCheck
     */
    public put(
        value: string,
        persist: boolean,
        noCommitCheck: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const key: string = this.key;
        const scope: number = this.scope;

        this.commitCheck(noCommitCheck)
        .then(function() {
            return XcalarKeyPut(key, value, persist, scope);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * putWithMutex
     * @param value
     * @param persist
     * @param noCommitCheck
     */
    public putWithMutex(
        value: string,
        persist: boolean,
        noCommitCheck: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const key: string = this.key;
        const scope: number = this.scope;
        const lock = KVStore.genMutex(key, scope);
        const concurrency: Concurrency = new Concurrency(lock);

        function lockAndPut(): XDPromise<void> {
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();

            concurrency.tryLock()
            .then(function() {
                return XcalarKeyPut(key, value, persist, scope);
            })
            .then(function() {
                return concurrency.unlock();
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                console.error("Put to KV Store with mutex fails!", error);
                if (concurrency.isLocked()) {
                    concurrency.unlock()
                    .always(function() {
                        innerDeferred.reject(error);
                    });
                } else {
                    innerDeferred.reject(error);
                }
            });

            return innerDeferred.promise();
        }

        this.commitCheck(noCommitCheck)
        .then(function() {
            return lockAndPut();
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (error === ConcurrencyEnum.NoKVStore) {
                // XXX it's an error handling code, fix me if not correct
                concurrency.initLock()
                .then(lockAndPut)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    public setIfEqual(
        oldValue: string,
        newValue: string,
        persist: boolean,
        noCommitCheck: boolean = false
    ): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const key: string = this.key;
        const scope: number = this.scope;

        this.commitCheck(noCommitCheck)
        .then(function() {
            return XcalarKeySetIfEqual(scope, persist, key, oldValue, newValue);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * append
     * @param value
     * @param persist
     * @param noCommitCheck
     */
    public append(
        value: string,
        persist: boolean,
        noCommitCheck: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const key: string = this.key;
        const scope: number = this.scope;

        this.commitCheck(noCommitCheck)
        .then(function() {
            return XcalarKeyAppend(key, value, persist, scope);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * delete
     */
    public delete(): XDPromise<void> {
       return XcalarKeyDelete(this.key, this.scope);
    }

    private getInfo(ignoreFail: boolean = false): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const key: string = this.key;
        this.getAndParse()
        .then(function(info) {
            if (typeof(info) === "object") {
                deferred.resolve(info);
            } else {
                var error = "Expect info of" + key +
                            "to be an object but it's a " +
                            typeof(info) + " instead. Not restoring.";
                xcConsole.log(error);
                deferred.resolve({});
            }
        })
        .fail(function(error) {
            xcConsole.log("get meta of", key, "fails", error);
            if (ignoreFail) {
                deferred.resolve({});
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    private commitCheck(noCommitCheck: boolean): XDPromise<void> {
        if (noCommitCheck) {
            return PromiseHelper.resolve();
        } else {
            return XcUser.CurrentUser.commitCheck();
        }
    }
    /* ============ End of Instance Properties and Methods ========== */
}
if (typeof exports !== "undefined") {
    exports.KVStore = KVStore;
}