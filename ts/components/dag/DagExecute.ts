class DagExecute {
    private node: DagNode;
    private txId: number;

    public constructor(node: DagNode, txId: number) {
        this.node = node;
        this.txId = txId;
    }

    /**
     * run the node operation
     */
    public run(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        this.node.beRunningState();

        this._apiAdapter()
        .then((destTable) => {
            if (destTable != null) {
                this.node.setTable(destTable);
            }
            this.node.beCompleteState();
            deferred.resolve(destTable);
        })
        .fail((error) => {
            this.node.beErrorState();
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _apiAdapter(): XDPromise<string> {
        const type: DagNodeType = this.node.getType();
        switch (type) {
            case DagNodeType.Aggregate:
                return this._aggregate();
            case DagNodeType.Dataset:
                return this._loadDataset();
            case DagNodeType.Filter:
                return this._filter();
            case DagNodeType.Map:
                return this._map();
            default:
                throw new Error(type + " not supported!");
        }
    }

    private _aggregate(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeAggregate = <DagNodeAggregate>this.node;
        const params: DagNodeAggregateInput = node.getParam();
        const evalStr: string = params.evalString;
        const tableName: string = this._getParentNodeTable(0);
        const dstAggName: string = params.dest;

        XIApi.aggregateWithEvalStr(this.txId, evalStr, tableName, dstAggName)
        .then((aggRes) => {
            node.setAggVal(aggRes);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _loadDataset(): XDPromise<string> {
        const node: DagNodeDataset = <DagNodeDataset>this.node;
        const params: DagNodeDatasetInput = node.getParam();
        const dsName: string = params.source;
        const prefix: string = params.prefix;
        const desTable = this._generateTableName();
        return XIApi.indexFromDataset(this.txId, dsName, desTable, prefix);
    }

    private _filter(): XDPromise<string> {
        const node: DagNodeFilter = <DagNodeFilter>this.node;
        const params: DagNodeFilterInput = node.getParam();
        const fltStr: string = params.evalString;
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.filter(this.txId, fltStr, srcTable, desTable);
    }

    private _map(): XDPromise<string> {
        const node: DagNodeMap = <DagNodeMap>this.node;
        const params: DagNodeMapInput = node.getParam();
        const mapStrs: string[] = [];
        const newFields: string[] = [];

        params.eval.forEach((item) => {
            mapStrs.push(item.evalString);
            newFields.push(item.newField);
        });

        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        const isIcv: boolean = params.icv;
        return XIApi.map(this.txId, mapStrs, srcTable, newFields, desTable, isIcv);
    }

    private _getParentNodeTable(pos: number): string {
        const parentNode: DagNode = this.node.getParents()[pos];
        return parentNode.getTable();
    }

    // XXX TODO
    private _generateTableName(): string {
        console.warn("not implemented yet!");
        return xcHelper.randName("test") + Authentication.getHashId();
    }
}