class DagTabUser extends DagTab {
    /**
     * DagTabUser.restore
     * @param dagList
     */
    public static restore(
        dagList: {name: string, id: string}[]
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
                if (dagIdSet.has(dagInfo.id)) {
                    dagTabs.push(new DagTabUser(dagInfo.name, dagInfo.id));
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

    private static _getAllDagsFromKVStore(): XDPromise<string[]> {
        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        KVStore.list("^DF2*", gKVScope.WKBK)
        .then((res) => {
            const ids: string[] = res.keys.filter((key) => key.startsWith("DF2"));
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
                dagTabs.push(new DagTabUser(name, id));
            } catch (e) {
                console.error(e);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public constructor(name: string, id?: string, graph?: DagGraph) {
        super(name, id, graph);
        this._kvStore = new KVStore(this._id, gKVScope.WKBK);
    }

    public setName(newName: string): void {
        super.setName(newName);
        this.save(); // do a force save
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadFromKVStore()
        .then((_dagInfo, graph) => {
            this.setGraph(graph);
            deferred.resolve();
        })
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
        const clonedTab = new DagTabUser(this.getName(), null, clonedGraph);
        return clonedTab;
    }

    protected _writeToKVStore(): XDPromise<void> {
        // getJSON with includeStats = true
        return super._writeToKVStore(this._getJSON(true));
    }

    private _getTempName(): string {
         // format is .temp/randNum/fileName
         const tempName: string = ".temp/" + xcHelper.randName("rand") + "/" + this.getName();
         return tempName;
    }
}