class DagAggManager {
    private static _instance = null;
    private aggregates: {[key: string]: AggregateInfo} = {};
    private kvStore: KVStore;

    constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public setup(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let key: string = KVStore.getKey("gDagAggKey");
        this.kvStore = new KVStore(key, gKVScope.WKBK);
        this.kvStore.getAndParse()
        .then((info: {[key: string]: AggregateInfo}) => {
            if (info) {
                this.aggregates = info;
            } else {
                this.aggregates = {};
            }
            return XcalarGetConstants("*");
        })
        .then((res: XcalarApiDagNodeInfoT[]) => {
            let toDelete: string[] = [];
            let agg: XcalarApiDagNodeInfoT;
            let constMap: {[key: string]: boolean} = {};
            for (let i = 0; i < res.length; i++) {
                agg = res[i];
                if (this.aggregates[agg.name] == null) {
                    // Aggregate doesn't exist anymore, we delete it.
                    toDelete.push(agg.name);
                } else {
                    constMap[agg.name] = true;
                }
            }
            let keys = Object.keys(this.aggregates);
            let aggName: string;
            for (let i = 0; i < keys.length; i++) {
                aggName = keys[i];
                if (!constMap[aggName] && this.aggregates[aggName].value != null) {
                    // Aggregate was deleted in the backend at some point
                    delete this.aggregates[aggName];
                }
            }
            if (toDelete.length != 0) {
                return this._deleteAgg(toDelete);
            }
            new DagAggPopup($("#modelingDagPanel"), $("#dagViewBar").find(".aggregates"));
            return PromiseHelper.resolve();
        })
        .then(deferred.resolve)
        .fail((err) => {
            console.error(err);
            deferred.reject(err);
        });
        return deferred.promise();
    }

    /**
     * Returns the AggregateInfo for a particular agg
     * @param dagNodeId
     * @param aggName
     */
    public getAgg(dagNodeId: string, aggName: string): AggregateInfo {
        return this.aggregates[this.wrapAggName(dagNodeId, aggName)];
    }

    /** Returns the map of aggregates */
    public getAggMap(): {[key: string]: AggregateInfo} {
        return this.aggregates;
    }


    public findAggSource(fullAggName: string): DagNodeAggregate {
        if (this.aggregates[fullAggName] == null) {
            return null;
        }
        let agg: AggregateInfo = this.aggregates[fullAggName];
        if (agg.node == '' || agg.graph == '') {
            throw new Error(DagNodeErrorType.NoGraph);
        }

        const dagTab: DagTab = DagTabManager.Instance.getTabById(agg.graph);
        if (dagTab == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const graph: DagGraph = dagTab.getGraph();
        if (graph == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const node: DagNodeAggregate = <DagNodeAggregate>graph.getNode(agg.node);
        if (node == null) {
            throw new Error(DagNodeErrorType.NoAggNode);
        }
        return node;
    }

    /**
     * Adds/replaces an aggregate represented by aggName and aggInfo
     * @param aggName
     * @param aggInfo
     */
    public addAgg(aggName: string, aggInfo: AggregateInfo): XDPromise<void> {
        if (this.aggregates[aggName] != null) {
            delete this.aggregates[aggName];
        }
        this.aggregates[aggName] = aggInfo;
        return this._saveAggMap();
    }

    public bulkAdd(aggs: AggregateInfo[]) {
        for(let i = 0; i < aggs.length; i++) {
            let agg: AggregateInfo = aggs[i];
            if (!DagTabUser.idIsForSQLFolder(agg.graph)) {
                this.aggregates[agg.dagName] = agg;
            }
        }
        return this._saveAggMap();
    }

    /**
     * Removes the aggregate. If it has a value, the corresponding table is deleted.
     * @param aggName
     * @param force Delete the aggregate names no matter what
     */
    public removeAgg(aggNames: string | string[], force?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (aggNames == "" || aggNames == []) {
            return PromiseHelper.resolve();
        }
        if (!(aggNames instanceof Array)) {
            aggNames = [aggNames];
        }
        let toDelete: string[] = [];
        for (var i = 0; i < aggNames.length; i++) {
            let aggName = aggNames[i];
            let agg: AggregateInfo = this.aggregates[aggName];
            if (agg == null && !force) {
                continue
            }

            delete this.aggregates[aggName];
            if (agg.value != null || force) {
                toDelete.push(aggName);
            }
        }
        this._deleteAgg(toDelete)
        .then(() => {
            return this._saveAggMap();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        return deferred.promise();
    }

    public removeValue(aggNames: string | string[], force?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (aggNames == "" || aggNames == []) {
            return PromiseHelper.resolve();
        }
        if (!(aggNames instanceof Array)) {
            aggNames = [aggNames];
        }
        let toDelete: string[] = [];
        for (var i = 0; i < aggNames.length; i++) {
            let aggName = aggNames[i];
            let agg: AggregateInfo = this.aggregates[aggName];
            if (agg == null && !force) {
                continue
            } else if (agg == null && force) {
                // This is an emergency delete
                toDelete.push(aggName);
                continue;
            }

            if (agg.value != null || force) {
                this.aggregates[aggName].value = null;
                toDelete.push(aggName)
            }
        }
        this._deleteAgg(toDelete)
        .then(() => {
            return this._saveAggMap();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        return deferred.promise();
    }


    /**
     * Returns if aggName exists yet
     * @param aggName
     */
    public hasAggregate(dagNodeId: string, aggName: string): boolean {
        let name = this.wrapAggName(dagNodeId, aggName);
        return (this.aggregates[name] != null)
    }

    public bulkNodeRemoval(aggregates: string[]): XDPromise<void> {
        let agg: string;
        for(let i = 0; i < aggregates.length; i++) {
            agg = aggregates[i];
            if (this.aggregates[agg] != null) {
                if (this.aggregates[agg].value != null) {
                    this.aggregates[agg].node = "";
                } else {
                    delete this.aggregates[agg];
                }
            }
        }
        return this._saveAggMap();
    }

    /** Updates the node IDs according to the passed in Map */
    public updateNodeIds(aggIdMap: Map<string, string>) {
        aggIdMap.forEach((id: string, agg: string) => {
            if (!this.aggregates[agg]) {
                return;
            }
            let aggregate: AggregateInfo = this.aggregates[agg];
            aggregate.node = id;
        });
        this._saveAggMap();
    }

    public graphRemoval(tabID: string): XDPromise<void> {
        let toDelete: string[] = [];
        for(let agg in this.aggregates) {
            let agginfo: AggregateInfo = this.aggregates[agg];
            if (agginfo.graph == tabID) {
                toDelete.push(agg);
            }
        }
        return this.removeAgg(toDelete);
    }

    /**
     * Creates the backend name for the aggregate based off the dag_id and aggname
     * @param dag_id
     * @param aggName
     */
    public wrapAggName(dag_id: string, aggName: string): string {
        let frontName = (aggName[0] == "^" ? aggName.substr(1) : aggName);
        if (dag_id == null || dag_id == "") {
            return frontName;
        }
        if (dag_id.endsWith('.sql')) {
            dag_id = dag_id.replace(".sql", "sql");
        }
        return dag_id + "-agg_" + frontName;
    }

    private _saveAggMap(): XDPromise<void> {
        return this.kvStore.put(JSON.stringify(this.aggregates), true, true);
    }

    private _deleteAgg(aggNames: string[]): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (aggNames.length == 0) {
            deferred.resolve();
            return deferred.promise();
        }
        let promises: XDPromise<void>[] = [];
        let sql = {
            "operation": SQLOps.DeleteAgg,
            "aggs": aggNames
        };
        let txId = Transaction.start({
            "operation": SQLOps.DeleteAgg,
            "sql": sql,
            "track": true
        });

        for (var i = 0; i < aggNames.length; i++) {
            promises.push(XIApi.deleteTable(txId, aggNames[i]));
        }

        PromiseHelper.when.apply(window, promises)
        .then(function() {
            Transaction.done(txId, {noSql: true});
            deferred.resolve();
        })
        .fail(function(err) {
            deferred.reject(err);
        });


        return deferred.promise();
    };
}