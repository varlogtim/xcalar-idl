class DagTabUser extends DagTab {
    private _autoSave: boolean;
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
        this._tempKVStore = new KVStore(`.temp.DF2.${this._id}`, gKVScope.WKBK);
        this._autoSave = true;
    }

    public setName(newName: string): void {
        super.setName(newName);
        this.save(true); // do a force save
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let savedDagInfo: any;
        let savedGraph: DagGraph;
        
        this._loadFromKVStore()
        .then((dagInfo, graph) => {
            savedDagInfo = dagInfo;
            savedGraph = graph;
            return this._loadFromTempKVStore();
        })
        .then((tempDagInfo, tempGraph) => {
            this._autoSave = savedDagInfo.autoSave;
            if (tempDagInfo == null) {
                // when no local meta, use the saved one
                this._unsaved = false;
                this._setGraph(savedGraph);
            } else {
                this._unsaved = true;
                this._setGraph(tempGraph);
            }
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

    public isAutoSave(): boolean {
        return this._autoSave;
    }

    public setAutoSave(autoSave): void {
        this._autoSave = autoSave;
        if (autoSave) {
            this._tempKVStore.delete();
        }
        // no matter it changes to auto save or not, do a force save
        // to remember the state first
        this.save(true);
    }

    public save(forceSave: boolean = false): XDPromise<void> {
        if (this._disableSave) {
            return PromiseHelper.resolve();
        }

        if (!this._autoSave && !forceSave) {
            this._unsaved = true;
            return this._writeToTempKVStore()
                    .then(() => {
                        this._trigger("modify");
                    });
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._unsaved = false;
        this._writeToKVStore()
        .then(() => {
            this._trigger("save");
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
            return this._kvStore.delete();
        })
        .then(() => {
            return PromiseHelper.alwaysResolve(this._tempKVStore.delete());
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
        // format is .temp/randNum/fileName
        const tempName: string = ".temp/" + xcHelper.randName("rand") + "/" + this.getName();
        const fakeDag: DagTabShared = new DagTabShared(tempName, null, this._dagGraph);
        let hasShared: boolean = false;

        fakeDag.share()
        .then(() => {
            hasShared = true;
            return fakeDag.download(name, optimized);
        })
        .then(() => {
            fakeDag.delete();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            if (hasShared) {
                // if temp shared dataflow has created, delete it
                fakeDag.delete();
            }
        });

        return deferred.promise();
    }

    public clone(): DagTabUser {
        const clonedGraph: DagGraph = this.getGraph().clone();
        const clonedTab = new DagTabUser(this.getName(), null, clonedGraph);
        return clonedTab;
    }

    protected _getJSON(): {
        name: string,
        id: string,
        dag: DagGraphInfo,
        autoSave: boolean
    } {
        const json = <any>super._getJSON();
        json.autoSave = this._autoSave;
        return json;
    }

    protected _writeToKVStore(): XDPromise<void> {
        return super._writeToKVStore(this._getJSON());
    }
}