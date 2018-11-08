class DagNodeSQL extends DagNode {
    protected input: DagNodeSQLInput;
    protected columns: {name: string, backName: string, type: ColumnType}[];
    protected sqlQueryString: string;
    protected identifiers: Map<number, string>; // 1 to 1 mapping
    protected tableSrcMap: {};
    protected subGraph: DagSubGraph;
    protected SQLName: string;
    protected subInputNodes: DagNodeSQLSubInput[];
    protected subOutputNodes: DagNodeSQLSubOutput[];
    protected tableNewDagIdMap: {};
    protected finalTableName: string; // Currently only one ouput as multi-query is disabled

    public constructor(options: DagNodeSQLInfo) {
        super(options);
        this.type = DagNodeType.SQL;
        this.setSqlQueryString(options.sqlQueryString);
        const identifiers = new Map<number, string>();
        if (options.identifiersOrder && options.identifiers) {
            options.identifiersOrder.forEach(function(idx) {
                identifiers.set(idx, options.identifiers[idx]);
            });
        }
        this.identifiers = identifiers;
        this.tableSrcMap = options.tableSrcMap;
        this.columns = options.columns;
        this.maxParents = -1;
        this.minParents = 1;
        this.display.icon = "&#xe957;";
        this.input = new DagNodeSQLInput(options.input);
        // Subgraph info won't be serialized
        this.subGraph = new DagSubGraph();
        this.subInputNodes = [];
        this.subOutputNodes = [];
        this.tableNewDagIdMap = {};
        this.updateSubGraph();
        this.SQLName = xcHelper.randName("SQLTab_");
    }

    public updateSubGraph(): void {
        DagTabManager.Instance.removeTabByNode(this);
        this.subGraph.remove();
        this.subInputNodes = [];
        this.subOutputNodes = [];
        const connections: NodeConnection[] = [];
        const xcQuery = this.getParam().queryStr;
        if (!xcQuery) {
            return;
        }
        const finalTableName = this.getParam().newTableName;
        const retStruct = DagGraph.convertQueryToDataflowGraph(JSON.parse(xcQuery),
                                                               this.tableSrcMap,
                                                               finalTableName);
        const dagInfoList = retStruct.dagInfoList;
        const dagIdParentIdxMap = retStruct.dagIdParentIdxMap;
        const outputDagId = retStruct.outputDagId;
        // XXX convertQueryToDataflowGraph needs to return tableNewDagIdMap
        this.tableNewDagIdMap = retStruct.tableNewDagIdMap;
        for (let i = 0; i < Object.keys(dagIdParentIdxMap).length; i++) {
            this.subInputNodes.push(null);
        }
        dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
            const parents: DagNodeId[] = dagNodeInfo.parents;
            const node: DagNode = DagNodeFactory.create(dagNodeInfo);
            this.subGraph.addNode(node);
            const nodeId: string = node.getId();
            if (parents.length === 0) {
                const index = dagIdParentIdxMap[nodeId];
                const inNodePort = {
                    node: node,
                    portIdx: 0 // finalizing guarantees there is only one parent
                }
                this.addInputNode(inNodePort, index - 1);
            } else {
                for (let i = 0; i < parents.length; i++) {
                    connections.push({
                        parentId: parents[i],
                        childId: nodeId,
                        pos: i
                    });
                }
            }
            if (nodeId === outputDagId) {
                this.addOutputNode(node);
            }
        });
        // restore edges
        this.subGraph.restoreConnections(connections);
        this.subGraph.setTableDagIdMap(this.tableNewDagIdMap);
        this.subGraph.initializeProgress();
    }
    public getSQLName(): string {
        return this.SQLName;
    }
    public setSQLName(SQLName: string): void {
        this.SQLName = SQLName;
    }
    public getSubGraph(): DagSubGraph {
        return this.subGraph;
    }

    public getColumns(): {name: string, backName: string, type: ColumnType}[] {
        return this.columns;
    }
    public setColumns(columns: {name: string, backName: string, type: ColumnType}[]): void {
        this.columns = columns;
    }
    public getSqlQueryString(): string {
        return this.sqlQueryString;
    }
    public setSqlQueryString(sqlQueryString: string): void {
        this.sqlQueryString = sqlQueryString;
    }
    public getIdentifiers(): Map<number, string> {
        return this.identifiers;
    }
    public setIdentifiers(identifiers: Map<number, string>): void {
        this.identifiers = identifiers;
    }
    public getTableSrcMap(): {} {
        return this.tableSrcMap;
    }
    public setTableSrcMap(tableSrcMap: {}): void {
        this.tableSrcMap = tableSrcMap;
    }

    /**
     * Set sql node's parameters
     * @param input {DagNodeProjectSQLStruct}
     * @param input.evalString {string}
     */
    public setParam(input: DagNodeSQLInputStruct = <DagNodeSQLInputStruct>{}, noAutoExecute?: boolean) {
        this.input.setInput({
            queryStr: input.queryStr,
            newTableName: input.newTableName,
            jdbcCheckTime: input.jdbcCheckTime
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(_columns, replaceParameters?: boolean): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const finalCols: ProgCol[] = this.columns.map((column) => {
            return ColManager.newPullCol(column.name, column.backName, column.type);
        });
        const parents: DagNode[] = this.getParents();
        parents.forEach((parent) => {
            parent.getLineage().getColumns(replaceParameters).forEach((parentCol) => {
                changes.push({
                    from: parentCol,
                    to: null
                });
            })
        });
        finalCols.forEach((column) => {
            changes.push({
                from: null,
                to: column
            });
        });

        return {
            columns: finalCols,
            changes: changes
        };
    }

    protected _getSerializeInfo(): DagNodeSQLInfo {
        const nodeInfo = super._getSerializeInfo() as DagNodeSQLInfo;
        nodeInfo.sqlQueryString = this.sqlQueryString;
        nodeInfo.identifiersOrder = [];
        nodeInfo.identifiers = {};
        this.identifiers.forEach(function(value, key) {
            nodeInfo.identifiersOrder.push(key);
            nodeInfo.identifiers[key] = value;
        });
        nodeInfo.tableSrcMap = this.tableSrcMap;
        nodeInfo.columns = this.columns;
        return nodeInfo;
    }

    /**
     * Link an input node(in the sub graph) to a custom node's inPort. Call this method when expanding the input ports.
     * @param inNodePort The node & port to link
     * @param inPortIdx The index of the input port. If not specified, a new inPort will be assigned
     * @returns index of the inPort
     * @description
     * 1. Create a new DagNodeSQLSubInput node, if it doesn't exist
     * 2. Add the DagNodeSQLSubInput node to _input list
     * 3. Connect DagNodeSQLSubInput node to the acutal DagNode in subGraph
     */
    public addInputNode(inNodePort: NodeIOPort, inPortIdx?: number): number {
        if (inPortIdx == null || inPortIdx >= this.subInputNodes.length) {
            inPortIdx = this.subInputNodes.length;
        }

        const subGraph = this.getSubGraph();

        // Create a new input node if it doesn't exist and add to sub graph
        let inputNode = this._getInputPort(inPortIdx);
        if (!inputNode) {
            inputNode = new DagNodeSQLSubInput();
            this.subGraph.addNode(inputNode);
        }
        this._setInputPort(inputNode, inPortIdx);

        // Link the node in sub graph with input node
        if (inNodePort.node != null) {
            const inputNode = this.subInputNodes[inPortIdx];
            subGraph.connect(inputNode.getId(), inNodePort.node.getId(), inNodePort.portIdx);
        }
        return inPortIdx;
    }
    private _setInputPort(inputNode: DagNodeSQLSubInput, inPortIdx?: number): number {
        if (inPortIdx == null || inPortIdx >= this.subInputNodes.length) {
            inPortIdx = this.subInputNodes.length;
        }

        if (this.subInputNodes[inPortIdx] == null) {
            inputNode.setContainer(this);
            this.subInputNodes[inPortIdx] = inputNode;
            if (!this.getSubGraph().hasNode(inputNode.getId())) {
                this.getSubGraph().addNode(inputNode);
            }
        }

        return inPortIdx;
    }
    private _getInputPort(inPortIdx): DagNodeSQLSubInput {
        return this.subInputNodes[inPortIdx];
    }
    /**
     * Get the list of input nodes
     */
    public getInputNodes(): DagNodeSQLSubInput[] {
        return this.subInputNodes;
    }
    /**
     * Find the index of input port associated to a given input node
     * @param inputNode
     */
    public getInputIndex(inputNode: DagNodeSQLSubInput): number {
        for (let i = 0; i < this.subInputNodes.length; i ++) {
            if (this.subInputNodes[i] === inputNode) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Find the parent node of a input port
     * @param inputNode
     */
    public getInputParent(inputNode: DagNodeSQLSubInput): DagNode {
        const inPortIdx = this.getInputIndex(inputNode);
        if (inPortIdx < 0) {
            return null;
        }
        const parents = this.getParents();
        if (inPortIdx >= parents.length) {
            return null;
        }
        return parents[inPortIdx];
    }

    /**
     * Link an output node(in the sub graph) to a SQL node's outPort. Call this method when expanding the output ports.
     * @param outNode The node to link
     * @param outPortIdx The index of the output port. If not specified, a new outPort will be assigned
     * @returns index of the outPort
     * @description
     * 1. Create a new DagNodeSQLSubOutput node, if it doesn't exist
     * 2. Add the DagNodeSQLSubOutput node to _output list
     * 3. Connect DagNodeSQLSubOutput node to the acutal DagNode in subGraph
     */
    public addOutputNode(outNode: DagNode, outPortIdx?: number): number {
        if (outPortIdx == null || outPortIdx >= this.subOutputNodes.length) {
            outPortIdx = this.subOutputNodes.length;
        }

        // Create a new output node if it doesn't exist
        const outputNode = this._getOutputPort(outPortIdx) || new DagNodeSQLSubOutput();
        this._setOutputPort(outputNode, outPortIdx);

        // Link the node in sub graph with output node
        if (outNode != null) {
            this.getSubGraph().connect(
                outNode.getId(),
                outputNode.getId(),
                0 // output node has only one parent
            );
        }
        return outPortIdx;
    }
    private _setOutputPort(outputNode: DagNodeSQLSubOutput, outPortIdx?: number): number {
        if (outPortIdx == null || outPortIdx >= this.subOutputNodes.length) {
            outPortIdx = this.subOutputNodes.length;
        }
        if (this.subOutputNodes[outPortIdx] == null) {
            this.subOutputNodes[outPortIdx] = outputNode;
            if (!this.getSubGraph().hasNode(outputNode.getId())) {
                this.getSubGraph().addNode(outputNode);
            }
        }

        // This is not an export node, because it has output ports
        this.maxChildren = -1;

        return outPortIdx;
    }
    private _getOutputPort(outPortIdx: number): DagNodeSQLSubOutput {
        return this.subOutputNodes[outPortIdx];
    }
    /**
     * Get the list of output nodes
     */
    public getOutputNodes(): DagNodeSQLSubOutput[] {
        return this.subOutputNodes;
    }
}