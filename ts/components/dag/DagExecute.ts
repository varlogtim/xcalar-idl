interface DagNodeInput {

}

interface DagNodeDatasetInput extends DagNodeInput {
    source: string;
    prefix: string;
}

interface DagNodeFilterInput extends DagNodeInput {
    fltStr: string;
}

class DagExecute {
    private node: DagNode;
    private txId: number;

    public static test() {
        const node = new DagNode({id: "12345", type: DagNodeType.Filter});  
       
        node.setParams({
            fltStr: "eq(prefix::column0, 254487263)"
        });
        const parentNode = new DagNode({id: "54321", type: DagNodeType.Dataset});
        parentNode.setParams({
            source: "cheng.25132.gdelt",
            prefix: "prefix"
        });
        node.connectToParent(parentNode, 0);

        const txId = Transaction.start({});
        return new DagExecute(parentNode, txId).run()
                .then(() => {
                    return new DagExecute(node, txId).run();
                })
                .then(() => {
                    console.info("check", node.getTable(), "in temp list");
                })
    }

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
        const params: DagNodeDatasetInput = <DagNodeDatasetInput>this.node.getParams();
        const dsName: string = params.source;
        const prefix: string = params.prefix;
        const desTable = this._generateTableName();
        return XIApi.indexFromDataset(this.txId, dsName, desTable, prefix);
    }

    private _filter(): XDPromise<string> {
        const params: DagNodeFilterInput = <DagNodeFilterInput>this.node.getParams();
        const fltStr: string = params.fltStr;
        const parentNode = this.node.getParent(0);
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