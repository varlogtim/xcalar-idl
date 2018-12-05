class DagAggManager {
    private static _instance = null;
    private aggregates: {[key: string]: AggregateInfo} = {};
    private kvStore: KVStore;

    constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public setup(): XDPromise<any> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
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
                if (this.aggregates["\^" + agg.name] == null) {
                    // Aggregate doesn't exist anymore, we delete it.
                    toDelete.push(agg.name);
                } else {
                    constMap["\^" + agg.name] = true;
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
     * @param aggName
     */
    public getAgg(aggName: string): AggregateInfo {
        return this.aggregates[aggName];
    }

    /** Returns the map of aggregates */
    public getAggMap(): {[key: string]: AggregateInfo} {
        return this.aggregates;
    }

    /**
     * Returns the named aggregates
     */
    public getNamedAggs(): string[] {
        return Object.keys(this.aggregates);
    }

    public findAggSource(aggName: string): DagNodeAggregate {
        if (this.aggregates[aggName] == null) {
            return null;
        }
        let agg: AggregateInfo = this.aggregates[aggName];
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
        const node: DagNode = graph.getNode(agg.node);
        if (node == null) {
            throw new Error(DagNodeErrorType.NoAggNode);
        }
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
            this.aggregates[agg.dagName] = agg;
        }
        return this._saveAggMap();
    }

    /**
     * Removes the aggregate. If it has a value, the corresponding table is deleted.
     * @param aggName
     * @param force
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
            if (agg == null) {
                continue
            }

            delete this.aggregates[aggName];
            if (agg.value != null || force) {
                toDelete.push(aggName.substr(1))
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
     * Removes the node from the aggregate represented by aggName
     * @param aggName
     */
    public removeNode(aggNames: string | string[]): XDPromise<void>{
        if (aggNames == "" || aggNames == []) {
            return PromiseHelper.resolve();
        }
        if (!(aggNames instanceof Array)) {
            aggNames = [aggNames];
        }
        for (var i = 0; i < aggNames.length; i++) {
            let aggName = aggNames[i];
            if (!this.aggregates[aggName]) {
                continue;
            }
            this.aggregates[aggName].node = "";
        }
        return this._saveAggMap();
    }

    public removeValue(aggNames: string | string[]): XDPromise<void> {
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
            if (agg == null) {
                continue
            }

            if (agg.value != null) {
                this.aggregates[aggName].value = null;
                toDelete.push(aggName.substr(1))
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
    public hasAggregate(aggName: string): boolean {
        return (this.aggregates[aggName] != null)
    }

    public bulkNodeRemoval(aggregates: string[]): XDPromise<void> {
        let agg: string;
        for(let i = 0; i < aggregates.length; i++) {
            agg = aggregates[i];
            if (this.hasAggregate(agg)) {
                if (this.aggregates[agg].value != null) {
                    this.aggregates[agg].node = "";
                } else {
                    delete this.aggregates[agg];
                }
            }
        }
        return this._saveAggMap();
    }

    public graphRemoval(tabID: string): XDPromise<void> {
        let toDelete: string[] = [];
        for(let agg in this.aggregates) {
            let agginfo: AggregateInfo = this.aggregates[agg];
            if (agginfo.graph == tabID) {
                toDelete.push(agg);
            }
        }
        return this.bulkNodeRemoval(toDelete);
    }

    private _saveAggMap(): XDPromise<void> {
        return this.kvStore.put(JSON.stringify(this.aggregates), true, true);
    }

    private _deleteAgg(aggNames: string[]): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
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
            Transaction.done(txId, null);
            deferred.resolve();
        })
        .fail(function(err) {
            deferred.reject(err);
        });


        return deferred.promise();
    };
}