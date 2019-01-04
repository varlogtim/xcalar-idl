class SQLExecutor {
    private _sql: string;
    private _sqlNode: DagNodeSQL;
    private _fakeIMDNode: DagNodeIMDTable;
    private _tempTab: DagTabUser;
    private _tempGraph: DagGraph;

    public constructor(sql: string) {
        this._sql = sql.replace(/;+$/, "");
        this._fakeIMDNode = <DagNodeIMDTable>DagNodeFactory.create({
            type: DagNodeType.IMDTable
        });
        this._sqlNode = <DagNodeSQL>DagNodeFactory.create({
            type: DagNodeType.SQL
        });
        this._createDataflow();
    }

    public execute(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        try {
            const publishedTableNodes: DagNodeIMDTable[] = [this._fakeIMDNode];
            this._addPublishedTableNodes(publishedTableNodes)
            this._configurePublishedTableNode()
            .then(() => {
                this._configureSQLNode(publishedTableNodes);
                return this._tempGraph.execute([this._sqlNode.getId()])
            })
            .then(() => {
                return this._tempTab.save();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } catch (e) {
            deferred.reject({error: e.mesaage});
        }

        return deferred.promise();
    }

    private _createDataflow(): void {
        this._tempGraph = new DagGraph();
        const name: string = ".tempSQL" + DagTab.generateId();
        this._tempTab = new DagTabUser(name, null, this._tempGraph, false, xcTimeHelper.now());
        this._tempGraph.addNode(this._sqlNode);
    }

    private _addPublishedTableNodes(nodes: DagNodeIMDTable[]): void {
        this._tempGraph.addNode(this._fakeIMDNode);
        const sqlNodeId: DagNodeId = this._sqlNode.getId();
        nodes.forEach((node, index) => {
            this._tempGraph.connect(node.getId(), sqlNodeId, index);
        });
    }

    // XXX TODO remove the fake thing
    private _configurePublishedTableNode(): XDPromise<void> {
        return this._fakeIMDNode.setParam({
            source: "SQLA",
            version: -1,
            filterString: "",
            columns: ["class_id"]
        });
    }

    // fakIMDNode -> SQLNode
    private _configureSQLNode(publishedTableNodes: DagNodeIMDTable[]): void {
        const identifiers = {};
        const identifiersMap: Map<number, string> = new Map();
        const identifiersOrder: number[] = [];
        publishedTableNodes.forEach((node, index) => {
            let pos: number = index + 1;
            let source: string = node.getSource();
            identifiers[pos] = source;
            identifiersOrder.push(pos);
            identifiersMap.set(pos, source);
        });
        this._sqlNode.setIdentifiers(identifiersMap);
        this._sqlNode.setParam({
            sqlQueryStr: this._sql,
            identifiers: identifiers,
            identifiersOrder: identifiersOrder
        }, true);
    }
}