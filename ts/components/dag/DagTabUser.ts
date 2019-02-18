class DagTabUser extends DagTab {
    private _reset: boolean;
    private _createdTime: number;

    /**
     * DagTabUser.restore
     * @param dagList
     */
    public static restore(
        dagList: {name: string, id: string, reset: boolean, createdTime: number}[]
    ): XDPromise<DagTabUser[]> {
        const deferred: XDDeferred<DagTabUser[]> = PromiseHelper.deferred();
        const dagIdSet: Set<string> = new Set();
        const dagTabs: DagTabUser[] = [];
        let metaNotMatch: boolean = false;

        this._getAllDagsFromKVStore()
        .then((ids) => {
            ids.forEach((id) => {
                dagIdSet.add(id);
            });
            dagList.forEach((dagInfo) => {
                let id: string = dagInfo.id;
                if (dagIdSet.has(id)) {
                    if (id.startsWith(DagTabSQLFunc.KEY)) {
                        dagTabs.push(new DagTabSQLFunc(dagInfo.name, dagInfo.id, null, dagInfo.reset, dagInfo.createdTime));
                    } else {
                        dagTabs.push(new DagTabUser(dagInfo.name, dagInfo.id, null, dagInfo.reset, dagInfo.createdTime));
                    }
                    dagIdSet.delete(dagInfo.id);
                } else {
                    // when dag list has meta but the dag not exists
                    console.error(JSON.stringify(dagInfo),
                    "is in meta but no corresponding dag exists");
                    metaNotMatch = true;
                }
            });

            if (dagIdSet.size > 0) {
                // when some dag are missing in meta
                console.error("missing some dags, restoring...");
                metaNotMatch = true;
                const promises: XDPromise<void>[] = [];
                dagIdSet.forEach((id) => {
                    promises.push(this._restoreMissingDag(id, dagTabs));
                });
                return PromiseHelper.when(...promises);
            }
        })
        .then(() => {
            deferred.resolve(dagTabs, metaNotMatch);
        })
        .fail(deferred.reject)

        return deferred.promise();
    }

    /**
     * DagTabUser.hasDataflowAsync
     * @param dataflowId
     */
    public static hasDataflowAsync(dataflowId: string): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        let key: string = dataflowId;
        KVStore.list(key, gKVScope.WKBK)
        .then((res) => {
            let ids: string[] = res.keys.filter((key) => key === dataflowId);
            let exist: boolean = ids.length === 1;
            deferred.resolve(exist);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * DagTabUser.isForSQLFolder
     * return true if the tab is generated from sql mode
     * @param dagTab
     */
    public static isForSQLFolder(dagTab: DagTab): boolean {
        let id = dagTab.getId();
        return id && id.endsWith("sql");
    }

    protected static _createTab(name: string, id: string): DagTabUser {
        return new DagTabUser(name, id, null, null, xcTimeHelper.now());
    }

    private static _getAllDagsFromKVStore(): XDPromise<string[]> {
        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        const allDagsKey: string = this.KEY;
        KVStore.list(`^${allDagsKey}*`, gKVScope.WKBK)
        .then((res) => {
            const ids: string[] = res.keys.filter((key) => key.startsWith(allDagsKey));
            deferred.resolve(ids);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private static _restoreMissingDag(
        id: string,
        dagTabs: DagTabUser[]
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const kvStore: KVStore = new KVStore(id, gKVScope.WKBK);
        kvStore.getAndParse()
        .then((res) => {
            try {
                const name: string = res.name;
                dagTabs.push(this._createTab(name, id));
            } catch (e) {
                console.error(e);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public constructor(
        name: string,
        id?: string,
        graph?: DagGraph,
        reset?: boolean,
        createdTime?: number
    ) {
        super(name, id, graph);
        this._kvStore = new KVStore(this._id, gKVScope.WKBK);
        this._reset = reset;
        this._createdTime = createdTime;
    }

    public setName(newName: string): void {
        super.setName(newName);
        this.save(); // do a force save
    }

    public load(reset?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadFromKVStore()
        .then((dagInfo, graph: DagGraph) => {
            reset = reset|| this._reset;
            if (reset) {
                graph = this._resetHelper(dagInfo.dag);
                this._reset = false;
                DagList.Instance.saveUserDagList();
            }
            this.setGraph(graph);

            if (reset) {
                return this._writeToKVStore();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            if (typeof error === "object" && error.error === DFTStr.InvalidDF) {
                // An invalid dagTab has been stored- let's delete it.
                this.delete();
            }
            deferred.reject(error);
        });
        return deferred.promise();
    }

    public save(): XDPromise<void> {
        if (this._disableSaveLock > 0) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._writeToKVStore()
        .then(() => {
            this._trigger("save");
            Log.commit();
            KVStore.logSave(true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public delete(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._deleteTableHelper()
        .then(() => {
            return PromiseHelper.alwaysResolve(this._deleteAggregateHelper());
        })
        .then(() => {
            return this._deleteRetinaHelper();
        })
        .then(() => {
            return this._kvStore.delete();
        })
        .then(() => {
            // alwaysResolves returns an object that we don't need
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public download(name: string, optimized?: boolean): XDPromise<void> {
        // Step for download local dataflow:
        // 1. upload as a temp shared dataflow
        // 2. download the temp shared dataflow
        // 3. delete the temp shared dataflow
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const tempName: string = this._getTempName();
        const fakeTab: DagTabPublished = new DagTabPublished(tempName, null, this._dagGraph);
        let hasShared: boolean = false;

        fakeTab.publish()
        .then(() => {
            hasShared = true;
            return fakeTab.download(name, optimized);
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            if (hasShared) {
                // if temp shared dataflow has created, delete it
                fakeTab.delete();
            }
        });

        return deferred.promise();
    }

    public upload(content: string, overwriteUDF: boolean): XDPromise<void> {
        // Step for upload dataflow to local workbook:
        // 1. upload as a temp shared dataflow
        // 2. get the graph and copy to local tab, save the tab
        // 3. get the UDF and copy to local workbook
        // 3. delete the temp shared dataflow
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const tempName: string = this._getTempName();
        const fakeTab: DagTabPublished = new DagTabPublished(tempName);
        let hasFakeDag: boolean = false;
        let hasGetMeta: boolean = false;

        fakeTab.upload(content)
        .then(() => {
            hasFakeDag = true;
            return fakeTab.load();
        })
        .then((dagInfo) => {
            let error = this._validateUploadType(dagInfo);
            if (error) {
                return PromiseHelper.reject({
                    error: error
                });
            }
        })
        .then(() => {
            this._dagGraph = fakeTab.getGraph();
            return this.save();
        })
        .then(() => {
            hasGetMeta = true;
            DagList.Instance.addDag(this);
            return fakeTab.copyUDFToLocal(overwriteUDF);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            let alertOption: Alert.AlertOptions = null;
            if (hasGetMeta) {
                alertOption = {
                    title: DFTStr.UploadErr,
                    instr: DFTStr.UpoladErrInstr,
                    msg: error.error,
                    isAlert: true
                }
            }
            deferred.reject(error, alertOption);
        })
        .always(() => {
            if (hasFakeDag) {
                // if temp shared dataflow has created, delete it
                fakeTab.delete();
            }
        });

        return deferred.promise();
    }

    public clone(): DagTabUser {
        const clonedGraph: DagGraph = this.getGraph().clone();
        const clonedTab = new DagTabUser(this.getName(), null, clonedGraph, null, xcTimeHelper.now());
        return clonedTab;
    }

    public needReset(): boolean {
        return this._reset;
    }

    public getCreatedTime(): number {
        return this._createdTime;
    }

    protected _writeToKVStore(): XDPromise<void> {
        // getJSON with includeStats = true
        return super._writeToKVStore(this._getJSON(true));
    }

    protected _getTempName(): string {
         // format is .temp/randNum/fileName
         const tempName: string = ".temp/" + xcHelper.randName("rand") + "/" + this.getName();
         return tempName;
    }

    protected _validateUploadType(dagInfo: {name: string}): string {
        try {
            let name: string = dagInfo.name;
            if (name.startsWith(".temp/" + DagTabSQLFunc.KEY)) {
                return DFTStr.InvalidSQLFuncUpload;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }
}