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
     * KVStore.setup
     * keys: gStorageKey, gEphStorageKey, gLogKey, gErrKey, gUserKey,
     * gSettingsKey, gNotebookKey, commitKey
     * @param keys
     */
    public static setup(keys: string[]) {
        for (var key in keys) {
            KVStore.keys.set(key, keys[key]);
        }
        const commitKey = KVStore.getKey("gStorageKey") + "-" + "commitKey";
        KVStore.keys.set("commitKey", commitKey);
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
    public static commit(atStartUp: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $autoSaveBtn: JQuery = $("#autoSaveBtn");
        const $userSettingsSave: JQuery = $("#userSettingsSave");
        const currentCnt: number = KVStore.commitCnt;

        KVStore.updateCommitCnt();

        $autoSaveBtn.addClass("saving");
        xcHelper.disableSubmit($autoSaveBtn);
        xcHelper.disableSubmit($userSettingsSave);

        KVStore.metaInfos.update();

        XcSupport.stopHeartbeatCheck();

        const storageStore = new KVStore(KVStore.getKey("gStorageKey"), gKVScope.WKBK);
        storageStore.put(JSON.stringify(KVStore.metaInfos), true)
        .then(function() {
            if (DF.wasRestored()) {
                KVStore.ephMetaInfos.update();
                const ephStore = new KVStore(KVStore.getKey("gEphStorageKey"), gKVScope.GLOB);
                return ephStore.put(JSON.stringify(KVStore.ephMetaInfos), false);
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
            var wkbkId = WorkbookManager.getActiveWKBK();
            var wkbkName = WorkbookManager.getWorkbook(wkbkId).name;
            return XcalarSaveWorkbooks(wkbkName);
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
     * KVStore.restore
     */
    public static restore(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        let gInfosUser: object = {};
        let gInfosSetting: object = {};

        KVStore.getUserInfo()
        .then(function(userMeta) {
            gInfosUser = userMeta;
            return KVStore.getSettingInfo();
        })
        .then(function(settingMeta) {
            gInfosSetting = settingMeta;
            return KVStore.getMetaInfo();
        })
        .then(function(meta) {
            const gInfosMeta: object = meta || {};
            return KVStore.restoreHelper(gInfosUser, gInfosSetting, gInfosMeta);
        })
        .then(deferred.resolve)
        .fail(function(error) {
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

    private static updateCommitCnt() {
        KVStore.commitCnt++;
    }

    private static getUserInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gUserKey");
        const kvStore = new KVStore(key, gKVScope.USER);
        return kvStore.getInfo();
    }

    private static getSettingInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gSettingsKey");
        const kvStore = new KVStore(key, gKVScope.GLOB);
        return kvStore.getInfo();
    }

    private static getMetaInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gStorageKey");
        const kvStore = new KVStore(key, gKVScope.WKBK);
        return kvStore.getInfo();
    }

    private static restoreHelper(
        gInfosUser: object,
        gInfosSetting: object,
        gInfosMeta: object,
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const isEmpty: boolean = $.isEmptyObject(gInfosMeta);
        const userInfos: UserInfoConstructor = new UserInfoConstructor(gInfosUser);

        UserSettings.restore(userInfos, gInfosSetting)
        .then(function() {
            try {
                KVStore.metaInfos = new METAConstructor(gInfosMeta);
                KVStore.ephMetaInfos = new EMetaConstructor({});

                WSManager.restore(KVStore.metaInfos.getWSMeta());
                TPrefix.restore(KVStore.metaInfos.getTpfxMeta());
                Aggregates.restore(KVStore.metaInfos.getAggMeta());
                TblManager.restoreTableMeta(KVStore.metaInfos.getTableMeta());
                DSCart.restore(KVStore.metaInfos.getCartMeta());
                Profile.restore(KVStore.metaInfos.getStatsMeta());
            } catch (error) {
                console.error(error.stack);
                return PromiseHelper.reject(error);
            }
        })
        .then(function() {
            if (isEmpty) {
                console.info("KVStore is empty!");
            } else {
                const oldLogCursor: number = KVStore.metaInfos.getLogCMeta();
                return Log.restore(oldLogCursor);
            }
        })
        .then(function() {
            // must come after Log.restore
            QueryManager.restore(KVStore.metaInfos.getQueryMeta());
            deferred.resolve();
        })
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

        function lockAndPut(): XDPromise<void> {
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            let lockString: string;

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

        this.commitCheck(noCommitCheck)
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
            return XcSupport.commitCheck();
        }
    }
    /* ============ End of Instance Properties and Methods ========== */
}