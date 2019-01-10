class DagTabSQLFunc extends DagTabUser {
    public static KEY: string = "SQLFunc";

    public static setup(): void {
        this.uid = new XcUID(this.KEY);
    }

    public static listFuncs(): string[] {
        let dagTabs: Map<string, DagTab> = DagList.Instance.getAllDags();
        let funcs: string[] = [];
        dagTabs.forEach((dagTab) => {
            let name: string = dagTab.getName();
            if (dagTab instanceof DagTabSQLFunc) {
                funcs.push(name);
            }
        });
        return funcs;
    }

    public static getFunc(name: string): DagTabSQLFunc {
        let dag: DagTabSQLFunc;
        let dagTabs: Map<string, DagTab> = DagList.Instance.getAllDags();
        dagTabs.forEach((dagTab, id) => {
            if (name === dagTab.getName() && id.startsWith(DagTabSQLFunc.KEY)) {
                dag = <DagTabSQLFunc>dagTab;
                return false; // stop loop
            }
        });

        return dag;
    }

    /**
     * @override
     * @param name
     * @param id
     */
    protected static _createTab(name: string, id: string): DagTabSQLFunc {
        return new DagTabSQLFunc(name, id, null, null, xcTimeHelper.now());
    }

    public constructor(
        name: string,
        id?: string,
        dagGraph?: DagGraph,
        reset?: boolean,
        createTime?: number
    ) {
        id = id || DagTabSQLFunc.generateId();
        super(name, id, dagGraph, reset, createTime);
    }

    public getQuery(inputs: string[]): XDPromise<string> {        
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        this._loadGraph()
        .then(() => {
            let clonedGraph: DagGraph;
            let outNodes: DagNodeSQLFuncOut[];
            [clonedGraph, outNodes] = this._configureQueryInput(inputs);
            if (outNodes.length === 1) {
                return clonedGraph.getQuery(outNodes[0].getId(), false, false);
            } else {
                return PromiseHelper.reject({
                    hasError: true,
                    type: DagNodeErrorType.InvalidSQLFunc
                })
            }
        })
        .then((query: string, destTables: string[]) => {
            let desTable: string = destTables[destTables.length - 1];
            deferred.resolve(query, desTable);
        })
        .fail((result) => {
            if (typeof result === "object" &&
                result.hasError
            ) {
                deferred.reject({
                    error: result.type
                });
            } else {
                deferred.reject(result);
            }
        });

        return deferred.promise();
    }

    public getSchema(): XDPromise<ColSchema[]> {
        const deferred: XDDeferred<ColSchema[]> = PromiseHelper.deferred();
        this._loadGraph()
        .then(() => {
            const nodes: DagNodeSQLFuncOut[] = this._getOutputNode();
            let schema: ColSchema[] = [];
            if (nodes.length === 1) {
                // invalid case
                schema = nodes[0].getSchema();
            }
            deferred.resolve(schema);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public addInput(dagNode: DagNodeSQLFuncIn): void {
        if (dagNode == null) {
            return;
        }
        const inputs = this._getInputNodes();
        dagNode.setOrder(inputs.length);
    }

    public removeInput(order: number): DagNodeSQLFuncIn[] {
        if (order == null) {
            return [];
        }

        const inputs = this._getInputNodes();
        let changeNodes: DagNodeSQLFuncIn[] = [];
        for (let i = order; i < inputs.length; i++) {
            if (inputs[i] != null) {
                inputs[i].setOrder(i - 1);
                changeNodes.push(inputs[i]);
            }
        }
        return changeNodes;
    }

    public addBackInput(order: number): DagNodeSQLFuncIn[] {
        if (order == null) {
            return [];
        }

        const inputs = this._getInputNodes();
        let changeNodes: DagNodeSQLFuncIn[] = [];
        for (let i = order; i < inputs.length; i++) {
            if (inputs[i] != null) {
                inputs[i].setOrder(i + 1);
                changeNodes.push(inputs[i]);
            }
        }
        return changeNodes;
    }

    private _loadGraph(): XDPromise<void> {
        if (this._dagGraph == null) {
            return this.load();
        } else {
            return PromiseHelper.resolve();
        }
    }

    private _getOutputNode(): DagNodeSQLFuncOut[] {
        let nodes: DagNodeSQLFuncOut[] = [];
        this._dagGraph.getAllNodes().forEach((dagNode) => {
            if (dagNode instanceof DagNodeSQLFuncOut) {
                nodes.push(dagNode);
            }
        });
        return nodes;
    }

    private _getInputNodes(): DagNodeSQLFuncIn[] {
        let nodes: DagNodeSQLFuncIn[] = [];
        this._dagGraph.getAllNodes().forEach((dagNode) => {
            if (dagNode instanceof DagNodeSQLFuncIn) {
                let order = dagNode.getOrder();
                if (order != null) {
                    nodes[order] = dagNode;
                }

            }
        });
        return nodes;
    }

    private _configureQueryInput(input: string[]): [DagGraph, DagNodeSQLFuncOut[]] {
        const clonedGraph: DagGraph = this._dagGraph.clone();
        let outNodes: DagNodeSQLFuncOut[] = [];
        clonedGraph.getAllNodes().forEach((dagNode) => {
            if (dagNode instanceof DagNodeSQLFuncIn) {
                let index: number = dagNode.getOrder();
                let source: string = index == null ? "" : input[index];
                dagNode.setParam({
                    source: source
                });
            } else if (dagNode instanceof DagNodeSQLFuncOut) {
                outNodes.push(dagNode);
            }
        });

        return [clonedGraph, outNodes];
    }
}