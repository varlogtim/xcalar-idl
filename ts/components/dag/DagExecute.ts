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
    public run(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.node.setState(DagNodeState.Running);

        this._apiAdapter()
        .then((destTable) => {
            this.node.setTable(destTable);
            this.node.setState(DagNodeState.Complete);
            deferred.resolve();
        })
        .fail((error) => {
            this.node.setState(DagNodeState.Error);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _apiAdapter(): XDPromise<string> {
        const type: DagNodeType = this.node.getType();
        switch (type) {
            case DagNodeType.Dataset:
                return this._loadDataset();
            case DagNodeType.Filter:
                return this._filter();
            default:
                throw new Error(type + " not supported!");
        }
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
        const parentNode = this.node.getParents()[0];
        const srcTable = parentNode.getTable();
        const desTable = this._generateTableName();
        return XIApi.filter(this.txId, fltStr, srcTable, desTable);
    }

    // XXX TODO
    private _generateTableName(): string {
        console.warn("not implemented yet!");
        return xcHelper.randName("test") + Authentication.getHashId();
    }
}