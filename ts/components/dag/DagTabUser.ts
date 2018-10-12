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
        this.save();
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadFromKVStore()
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
        const promise: XDPromise<void> = this._writeToKVStore();
        promise
        .then(() => {
            const activeWKBKId = WorkbookManager.getActiveWKBK();
            if (activeWKBKId != null) {
                const workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
                workbook.update();
            }
            KVStore.logSave(true);
        });

        return promise;
    }

    public delete(): XDPromise<void> {
        let sql = {
            "operation": SQLOps.DeleteTable,
            "tableName": this._id + "_dag_*",
            "tableType": TableType.Unknown
        };
        let txId = Transaction.start({
            "operation": SQLOps.DeleteTable,
            "sql": sql,
            "steps": 1,
            "track": true
        });
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.alwaysResolve(XIApi.deleteTable(txId, this._id + "_dag_*", true))
        .then(() => {
            this._kvStore.delete()
            .then(() => {
                Transaction.done(txId, null);
                deferred.resolve();
            })
            .fail((err: ThriftError) => {
                Transaction.fail(txId, {
                    error: err.error
                });
                deferred.reject()
            });
        });
        return deferred.promise();
    }

    public download(): XDPromise<void> {
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
            return fakeDag.download();
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
}