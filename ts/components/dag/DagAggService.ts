class DagAggService {
    private _aggregates: Map<string, AggregateInfo> = new Map();

    public getAgg(dagNodeId: string, aggName: string): AggregateInfo {
        if (this._hasManager()) {
            return DagAggManager.Instance.getAgg(dagNodeId, aggName);
        } else {
            return this._aggregates.get(this.wrapAggName(dagNodeId, aggName));
        }
    }

    /**
     * Adds/replaces an aggregate represented by aggName and aggInfo
     * @param aggName
     * @param aggInfo
     */
    public addAgg(aggName: string, aggInfo: AggregateInfo): XDPromise<void> {
        if (this._hasManager()) {
            return DagAggManager.Instance.addAgg(aggName, aggInfo);
        } else {
            this._aggregates.set(aggName, aggInfo);
            return PromiseHelper.resolve();
        }
    }

    /**
     * Returns if aggName exists yet
     * @param aggName
     */
    public hasAggregate(dagNodeId: string, aggName: string): boolean {
        if (this._hasManager()) {
            return DagAggManager.Instance.hasAggregate(dagNodeId, aggName);
        } else {
            const name = this.wrapAggName(dagNodeId, aggName);
            return (this._aggregates.has(name));
        }
    }

    /** Returns the map of aggregates */
    public getAggMap(): {[key: string]: AggregateInfo} {
        if (this._hasManager()) {
            return DagAggManager.Instance.getAggMap();
        } else {
            const result = {};
            this._aggregates.forEach((aggInfo, aggName) => {
                result[aggName] = aggInfo;
            });
            return result;
        }
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

    private _hasManager(): boolean {
        return typeof DagAggManager !== 'undefined';
    }
}

if (typeof exports !== 'undefined') {
    exports.DagAggService = DagAggService;
}