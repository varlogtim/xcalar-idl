class DagNodeSQL extends DagNode {
    public static readonly PREFIX: string = "sqlQuery";

    protected input: DagNodeSQLInput;
    protected columns: {name: string, backName: string, type: ColumnType}[];
    protected xcQueryString: string;
    protected rawXcQueryString: string; // partially optimized query (curretnly
                                        // without pushToSelect)
    protected identifiers: Map<number, string>; // 1 to 1 mapping
    protected identifiersNameMap: {}; // key is dagId, value is identifier name
    protected tableSrcMap: {};
    protected subGraph: DagSubGraph;
    protected SQLName: string;
    protected subInputNodes: DagNodeSQLSubInput[];
    protected subOutputNodes: DagNodeSQLSubOutput[];
    protected newTableName: string; // Currently only one ouput as multi-query
                                    // is disabled
    protected tableNewDagIdMap: {};
    protected dagIdToTableNamesMap: {}; // id to tableName map stores all the
                                        // tables related to the dag node
    protected aggregatesCreated: string[];
    private subGraphNodeIds: DagNodeId[];
    private firstTimeSubGraph: boolean = true;
    // in topological order

    // non-persistent
    private _queryObj: any;
    private _allowUpdateSQLHistory: boolean = false;
    protected _udfErrorsMap: {}; // nodeId to MapUDFFailureInfo

    public constructor(options: DagNodeSQLInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.SQL;
        this.tableSrcMap = options.tableSrcMap;
        this.columns = options.columns;
        this.maxParents = -1;
        this.minParents = 0; // when working on pub tables in SQL mode, it can
                             // be 0
        this.display.icon = "&#xe957;";
        this.input = this.getRuntime().accessible(new DagNodeSQLInput(options.input));
        const identifiers = new Map<number, string>();
        const identifiersOrder = this.input.getInput().identifiersOrder;
        const identifiersRaw = this.input.getInput().identifiers;
        if (identifiersOrder && identifiersRaw ) {
            identifiersOrder.forEach(function(idx) {
                identifiers.set(idx, identifiersRaw[idx]);
            });
        }
        this.identifiers = identifiers;
        this.identifiersNameMap = options.identifiersNameMap || {};
        // Subgraph info won't be serialized
        this.subInputNodes = [];
        this.subOutputNodes = [];
        this.SQLName = xcHelper.randName("SQLTab_");
        this._queryObj = {
            queryId: xcHelper.randName(DagNodeSQL.PREFIX, 8)
        };
        this.aggregatesCreated = [];
        this.subGraphNodeIds = options.subGraphNodeIds;
        this._udfErrorsMap = options.udfErrors || {};
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          }
        }
    };

    public getSQLQueryId(): string {
        return this._queryObj.queryId;
    }

    public setSQLQuery(queryObj): void {
        for (let key in queryObj) {
            this._queryObj[key] = queryObj[key];
        }
    }

    public getSQLQuery(): any {
        return this._queryObj;
    }

    public subscribeHistoryUpdate(): void {
        this._allowUpdateSQLHistory = true;
    }

    // XXX TODO: decouple with UI code
    public updateSQLQueryHistory(updateStats: boolean = false): void {
        if (updateStats) {
            this._updateStatsInSQLQuery();
        }
        if (this._allowUpdateSQLHistory) {
            SQLHistorySpace.Instance.update(this._queryObj);
        }
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "SQL";
    }

    private _updateStatsInSQLQuery(): void {
        try {
            let stats = this.getOverallStats();
            this._queryObj.rows = stats.rows;
            this._queryObj.skew = stats.skewValue;
        } catch (e) {
            console.error(e);
        }
    }

    public updateSubGraph(
        _newTableMap?: {},
        rawXcQuery?: boolean,
        noInputOutputNodes?: boolean,
        sessionTables?: Map<string,string>,
        schema?: {} // used for session tables
    ): void {
        if (_newTableMap) {
            // If it's simply updating the mapping of oldTableName ->
            // newTableName. No need to re-build the entire sub graph
            const dagIdToTableNamesMap = this.dagIdToTableNamesMap;
            const oldMap = this.tableNewDagIdMap;
            const newMap = {};
            for (const key in oldMap) {
                if (_newTableMap.hasOwnProperty(key)) {
                    newMap[_newTableMap[key]] = oldMap[key];
                } else {
                    newMap[key] = oldMap[key];
                }
            }
            for (const key in dagIdToTableNamesMap) {
                for (let i = 0; i < dagIdToTableNamesMap[key].length; i++) {
                    const oldTableName = dagIdToTableNamesMap[key][i];
                    if (_newTableMap.hasOwnProperty(oldTableName)) {
                        dagIdToTableNamesMap[key][i] = _newTableMap[oldTableName];
                    }
                }
            }
            this.tableNewDagIdMap = newMap;
            this.dagIdToTableNamesMap = dagIdToTableNamesMap;
            this.subGraph.setTableDagIdMap(newMap);
            this.subGraph.setDagIdToTableNamesMap(dagIdToTableNamesMap);
            this.subGraph.initializeProgress();
            this.subGraph.updateNodeDescriptions(_newTableMap);
            return;
        }
        // XXX TODO: decouple with UI code
        this.getRuntime().getDagTabService().removeTabByNode(this);
        this.subGraph = this.getRuntime().accessible(new DagSubGraph());
        this._setupSubGraphEvents();
        this.subInputNodes = [];
        this.subOutputNodes = [];
        const connections: NodeConnection[] = [];
        const xcQuery = rawXcQuery ? this.getRawXcQueryString() :
                                     this.getXcQueryString();
        if (!xcQuery) {
            return;
        }
        const newTableName = this.getNewTableName();
        const retStruct = DagGraph.convertQueryToDataflowGraph(JSON.parse(xcQuery),
                                                               this.getState(),
                                                               this.tableSrcMap,
                                                               newTableName);
        if (this.firstTimeSubGraph && this.subGraphNodeIds) {
            // ensures subGraph is created with previous nodeIds
            // need to keep subGraph nodeIds the same so that queryNodes in
            // execution can map to the nodeIds
            this._replaceSubGraphNodeIds(retStruct);
            this.firstTimeSubGraph = false;
        }
        let scrIdToTableNameMap = {};
        for (let i in this.tableSrcMap) {
            scrIdToTableNameMap[this.tableSrcMap[i]] = i;
        }

        this.tableNewDagIdMap = retStruct.tableNewDagIdMap;
        this.dagIdToTableNamesMap = retStruct.dagIdToTableNamesMap;
        const dagInfoList: any[] = retStruct.dagInfoList;
        const dagIdParentMap = retStruct.dagIdParentMap;
        let outputDagId = retStruct.outputDagId;
        for (let i = 0; i < this.identifiers.size; i++) {
            this.subInputNodes.push(null);
        }

        this.subGraphNodeIds = [];

        dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
            const parents: DagNodeId[] = dagNodeInfo.parents;
            if (this._udfErrorsMap[dagNodeInfo.id]) {
                dagNodeInfo["udfError"] = this._udfErrorsMap[dagNodeInfo.id];
            }
            const node: DagNode = DagNodeFactory.create(dagNodeInfo);
            if (node instanceof DagNodeIMDTable) {
                const imdInput: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>dagNodeInfo.input;
                node.fetchAndSetSubgraph(imdInput.source);
            }
            this.subGraph.addNode(node);
            const nodeId: string = node.getId();
            this.subGraphNodeIds.push(nodeId);

            const dagParents = dagIdParentMap[nodeId];
            if (dagParents && !noInputOutputNodes) {
                dagParents.forEach((dagParent) => {
                    const index = dagParent.index;
                    const srcId = dagParent.srcId;
                    const inNodePort = {
                        node: node,
                        portIdx: index
                    }
                    this._addInputNode(inNodePort, srcId - 1);
                });
            } else if (dagParents && sessionTables) {
                dagParents.forEach(dagParent => {
                    const index = dagParent.index;
                    const srcId = dagParent.srcId;

                    if (scrIdToTableNameMap[srcId]) {
                        let nodeSchema: ColSchema[] = [];
                        if (schema && schema[scrIdToTableNameMap[srcId]]) {
                            nodeSchema = schema[scrIdToTableNameMap[srcId]].map((col) => {
                                return {
                                    name: col.name,
                                    type: col.type
                                }
                            });
                        }
                        const subGraph = this.getSubGraph();
                        const lNode = subGraph.newNode(<DagNodeDFInInfo>{
                            "type": DagNodeType.DFIn,
                            "subType": null,
                            "input": {
                                "dataflowId": "",
                                "linkOutName": "",
                                "source": scrIdToTableNameMap[srcId]
                            },
                            "schema": nodeSchema,
                            "state": DagNodeState.Complete,
                            "table": scrIdToTableNameMap[srcId],
                            "configured": true
                        });
                        subGraph.connect(lNode.getId(), node.getId(), index, false, false);
                    }
                });
            }
            // there will be cases where the node has 1 parent that's an inputnode
            // and the other parent is in a node already in the subgraph
            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null) {
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
        this.firstTimeSubGraph = false;
        // restore edges
        this.subGraph.restoreConnections(connections);
        this.subGraph.keepAllJoinColumns();
        this.subGraph.setTableDagIdMap(retStruct.tableNewDagIdMap);
        this.subGraph.setDagIdToTableNamesMap(retStruct.dagIdToTableNamesMap);
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
    public setColumns(columns: SQLColumn[]): void {
        this.columns = this._getQueryTableCols(columns);
    }
    public setRawColumns(columns) {
        this.columns = columns;
    }
    public getXcQueryString(): string {
        return this.xcQueryString;
    }
    public setXcQueryString(xcQueryString: string) {
        this.xcQueryString = xcQueryString;
    }
    public getRawXcQueryString(): string {
        return this.rawXcQueryString;
    }
    public setRawXcQueryString(xcQueryString: string) {
        this.rawXcQueryString = xcQueryString;
    }
    public getNewTableName(): string{
        return this.newTableName;
    }
    public setNewTableName(newTableName: string): void {
        this.newTableName = newTableName;
    }
    public getIdentifiers(): Map<number, string> {
        super.getIdentifiers();
        return this.identifiers;
    }
    public setIdentifiers(
        identifiers: Map<number, string>,
        cleanUp?: boolean
    ): void {
        if (!identifiers && !cleanUp) {
            return;
        }
        super.setIdentifiers(identifiers);
        this.identifiers = identifiers;
        const identifiersOrder = [];
        const rawIdentifiers = {};
        const sqlParams: DagNodeSQLInputStruct = this.getParam();
        let hasChange = false;
        let idx = 0;
        this.identifiers.forEach(function(value, key) {
            identifiersOrder.push(key);
            rawIdentifiers[key] = value;
            if (sqlParams.identifiersOrder[idx] !== identifiersOrder[idx] ||
                sqlParams.identifiers[key] !== rawIdentifiers[key]) {
                    hasChange = true;
                }
        });
        if (Object.keys(sqlParams.identifiers).length !==
            Object.keys(rawIdentifiers).length ||
            sqlParams.identifiersOrder.length !== identifiersOrder.length) {
                hasChange = true;
            }
        if (hasChange) {
            sqlParams.identifiers = rawIdentifiers;
            sqlParams.identifiersOrder = identifiersOrder;
            this.setParam(sqlParams, true);
        }
    }
    private _getIdentifiersNameMap(): {} {
        return this.identifiersNameMap;
    }
    public setIdentifiersNameMap(identifiersNameMap: {}) {
        this.identifiersNameMap = identifiersNameMap;
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
    public setParam(
        input: DagNodeSQLInputStruct = <DagNodeSQLInputStruct>{},
        noAutoExecute?: boolean
    ) {
        let dropAsYouGo: boolean = input.dropAsYouGo;
        if (dropAsYouGo == null) {
            dropAsYouGo = true; // default to be true
        }
        this.input.setInput({
            sqlQueryStr: input.sqlQueryStr,
            identifiers: input.identifiers,
            identifiersOrder: input.identifiersOrder,
            dropAsYouGo: dropAsYouGo,
            outputTableName: input.outputTableName
        });
        super.setParam(null, noAutoExecute);
    }

     /**
      * @override
     * attach table to the node
     * @param tableName the name of the table associated with the node
     */
    public setTable(tableName: string, popupEvent: boolean = false) {
        super.setTable(tableName, popupEvent);
        const outputNode = this.subOutputNodes[0];
        if (outputNode) {
            outputNode.setTable(tableName, popupEvent);
            this.getSubGraphOutputNodes().forEach((parentNode) => {
                parentNode.setTable(tableName, popupEvent);
            });
        }
    }

    public getSubGraphOutputNodes(): DagNode[] {
        let resultNodes:DagNode[] = [];

        this.subOutputNodes.forEach((outputNode) => {
            if (outputNode) {
                outputNode.getParents().forEach((node) => {
                    if (node) {
                        resultNodes.push(node);
                    }
                })
            }
        });

        return resultNodes;
    }

    public getUDFErrors(): any {
        return this._udfErrorsMap;
    }

    /**
     * DFS to get lineage changes from sub graph
     * @param columnMapList a column map {finalColName: [finalProgColumn,
     *                      changedFlag]} wrapped with a list
     * @param node current node
     */
    private _backTraverseColumnChanges(columnMapList: {}[], node: DagNode) {
        // Traverse all lineage changes excluding a -> null and null -> a
        const oldColumnMap = columnMapList[0];
        const newColumnMap = Object.assign({}, oldColumnMap);
        const lineage = node.getLineage();
        if (lineage != null) {
            const changes = lineage.getChanges();
            changes.forEach((change) => {
                if (change.to == null || change.from == null) return;
                if (oldColumnMap[change.to.backName]) {
                    delete newColumnMap[change.to.backName];
                    newColumnMap[change.from.backName] =
                                               oldColumnMap[change.to.backName];
                    newColumnMap[change.from.backName][1] = true;
                }
            });
        }
        columnMapList[0] = newColumnMap;
        node.getParents().forEach((parent) => {
            this._backTraverseColumnChanges(columnMapList, parent);
        });
    }

    public lineageChange(
            _columns,
            replaceParameters?: boolean
    ): DagLineageChange {
        let columnMap = {};
        const finalColumnMap = {}; // {finalColName: [finalProgColumn,
                                    //  changedFlag]}
        const finalCols: ProgCol[] = [];
        let hiddenColumns = this.lineage.getHiddenColumns();
        if (this.columns) {
            this.columns.forEach((column) => {
                const finalColumn = ColManager.newPullCol(column.name,
                                                            column.backName,
                                                            column.type);
                finalColumnMap[column.backName] = [finalColumn, false];
                finalCols.push(finalColumn);
            });
        }
        // Wrap it with a list so that it can be modified across recursions
        const columnMapList = [finalColumnMap];
        for (const outputNode of this.subOutputNodes) {
            this._backTraverseColumnChanges(columnMapList, outputNode);
            break; // We support only one output for now
        }
        columnMap = columnMapList[0];

        const changes: DagColumnChange[] = [];
        const parents: DagNode[] = this.getParents();
        parents.forEach((parent) => {
            parent.getLineage().getColumns(replaceParameters, true).forEach((parentCol) => {
                const finalColStruct = columnMap[parentCol.backName];
                if (finalColStruct) {
                    const finalCol = columnMap[parentCol.backName][0];
                    const hasChanged = columnMap[parentCol.backName][1];
                    if (hasChanged) {
                        changes.push({
                            from: parentCol,
                            to: finalCol,
                            hidden: hiddenColumns.has(parentCol.getBackColName())
                        });
                    }
                    delete finalColumnMap[finalCol.backName];
                } else {
                    changes.push({
                        from: parentCol,
                        to: null,
                        hidden: hiddenColumns.has(parentCol.getBackColName())
                    });
                }
            });
        });

        for (const colName in finalColumnMap) {
            changes.push({
                from: null,
                to: finalColumnMap[colName][0]
            });
        }

        return {
            columns: finalCols,
            changes: changes
        };
    }

    /**
     * @override
     * @param includeStats: boolean
     */
    protected _getSerializeInfo(
        includeStats?: boolean,
        forCopy?: boolean
    ): DagNodeSQLInfo {
        const nodeInfo = super._getSerializeInfo(includeStats) as DagNodeSQLInfo;
        nodeInfo.tableSrcMap = this.tableSrcMap;
        nodeInfo.columns = this.columns;
        nodeInfo.identifiersNameMap = this.identifiersNameMap;
        nodeInfo.isHidden = this.display.isHidden;
        nodeInfo.udfErrors = this._udfErrorsMap;
        if (!forCopy && this.subGraphNodeIds) {
            nodeInfo.subGraphNodeIds = this.subGraphNodeIds;
        }
        return nodeInfo;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeSQLInputStruct = this.getParam();
        if (input.sqlQueryStr) {
            let str: string = input.sqlQueryStr.slice(0, 20);
            if (str.length < input.sqlQueryStr.length) {
                // when it's part of the query
                str += "...";
            }
            str = str.replace(/\n/g, " ");
            hint = str;
        }
        return hint;
    }

     /**
     * @override
     */
    protected _updateSubGraphProgress(queryNodes: XcalarApiDagNodeT[]): void {
        const subGraph = this.getSubGraph();
        if (!subGraph) {
            return;
        }
        subGraph.updateSQLSubGraphProgress(queryNodes);
    }

    /**
     * Link an input node(in the sub graph) to a custom node's inPort.
     * Call this method when expanding the input ports.
     * @param inNodePort The node & port to link
     * @param inPortIdx The index of the input port. If not specified,
     *                  a new inPort will be assigned
     * @returns index of the inPort
     * @description
     * 1. Create a new DagNodeSQLSubInput node, if it doesn't exist
     * 2. Add the DagNodeSQLSubInput node to _input list
     * 3. Connect DagNodeSQLSubInput node to the acutal DagNode in subGraph
     */
    private _addInputNode(inNodePort: NodeIOPort, inPortIdx?: number, isSessionTable?: boolean): number {
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
            subGraph.connect(inputNode.getId(), inNodePort.node.getId(),
                             inNodePort.portIdx, false, false);
        }
        return inPortIdx;
    }
    private _setInputPort(
        inputNode: DagNodeSQLSubInput,
        inPortIdx?: number
    ): number {
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
     * Link an output node(in the sub graph) to a SQL node's outPort. Call this
     * method when expanding the output ports.
     * @param outNode The node to link
     * @param outPortIdx The index of the output port. If not specified, a new
     *                   outPort will be assigned
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
        const outputNode = this._getOutputPort(outPortIdx) ||
                           new DagNodeSQLSubOutput();
        this._setOutputPort(outputNode, outPortIdx);

        // Link the node in sub graph with output node
        if (outNode != null) {
            this.getSubGraph().connect(
                outNode.getId(),
                outputNode.getId(),
                0, // output node has only one parent
                false,
                false
            );
        }
        return outPortIdx;
    }

    /**
     * @override
     * @param parentNode
     * @param pos
     */
    public connectToParent(
        parentNode: DagNode,
        pos: number = 0,
        spliceIn: boolean = false,
        updateConfig: boolean = true
    ): void {
        super.connectToParent(parentNode, pos, spliceIn);
        if (!updateConfig) return;

        if (typeof SQLOpPanel !== "undefined" && SQLOpPanel.Instance.isOpen()) {
            SQLOpPanel.Instance.updateNodeParents();
        }
    }

    public disconnectFromParent(
        parentNode: DagNode,
        pos: number,
        updateConfig: boolean = true
    ): boolean {
        const wasSpliced = super.disconnectFromParent(parentNode, pos);
        if (!updateConfig) return wasSpliced;

        if (typeof SQLOpPanel !== "undefined" && SQLOpPanel.Instance.isOpen()) {
            SQLOpPanel.Instance.updateNodeParents();
        }
        return wasSpliced;
    }

    /**
     * @override
     * Change node to configured state
     * @param isUpdateSubgraph set to false, when triggered by subGraph event
     */
    public beConfiguredState(isUpdateSubgraph: boolean = true): void {
        super.beConfiguredState();
        if (isUpdateSubgraph) {
            // Update the state of nodes in subGraph
            const subGraph = this.getSubGraph();
            if (subGraph) {
                subGraph.getAllNodes().forEach((node) => {
                    node.beConfiguredState();
                });
            }
            this._udfErrorsMap = {};
            this.events.trigger(DagNodeEvents.UDFErrorChange, {
                node: this
            });
        }
    }

    protected _getColumnsUsedInInput(): Set<string> {
        return null;
    }

    private _setOutputPort(
        outputNode: DagNodeSQLSubOutput,
        outPortIdx?: number
    ): number {
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

    public resetSubGraphNodeIds() {
        this.subGraphNodeIds = null;
    }

    public getTableNewDagIdMap() {
        return this.tableNewDagIdMap;
    }

    public hide(): void {
        this.display.isHidden = true;
        this.display.coordinates.x = 0;
        this.display.coordinates.y = 0;
        this.events.trigger(DagNodeEvents.Hide, {
            id: this.getId(),
            node: this
        });
    }

    public isHidden(): boolean {
        return this.display.isHidden;
    }

    private _getDerivedColName(colName: string, validate?: boolean): string {
        if (colName.indexOf("::") > 0) {
            colName = colName.split("::")[1];
        }
        if (colName.endsWith("_integer") || colName.endsWith("_float") ||
            colName.endsWith("_boolean") || colName.endsWith("_string")) {
            colName = colName.substring(0, colName.lastIndexOf("_"));
        }
        if (validate && xcHelper.validateColName(colName, true, true, false)) {
            throw SQLErrTStr.InvalidColName + colName;
        }
        colName = xcHelper.cleanseSQLColName(colName);
        return colName;
    }

    // === Copied from derived conversion
    private _getDerivedCol(col: ColSchema): ColRenameInfo {
        // convert prefix field of primitive type to derived
        if (col.type !== 'integer' && col.type !== 'float' &&
            col.type !== 'boolean' && col.type !== 'timestamp' &&
            col.type !== "string" && col.type !== 'money') {
            // can't handle other types in SQL
            return null;
        }
        const colInfo: ColRenameInfo = {
            orig: col.name,
            new: this._getDerivedColName(col.name, true).toUpperCase(),
            type: xcHelper.convertColTypeToFieldType(col.type)
        };
        return colInfo;
    }

    private _getSynthesize(
        colInfos: ColRenameInfo[],
        srcTableName: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let txId = Transaction.start({
            "operation": "SQL Simulate",
            "simulate": true
        });
        let cliArray = [];
        XIApi.synthesize(txId, colInfos, srcTableName)
        .then(function(finalizedTableName) {
            cliArray.push(Transaction.done(txId, {
                "noNotification": true,
                "noLog": true
            }));
            const ret = {
                finalizedTableName: finalizedTableName,
                cliArray: cliArray
            }
            deferred.resolve(ret);
        })
        .fail(function() {
            Transaction.done(txId, {
                "noNotification": true,
                "noLog": true
            });
            deferred.reject(SQLErrTStr.FinalizingFailed);
        });
        return deferred.promise();
    }

    private _finalizeTable(
        sourceId: number,
        srcTableName?: string,
        columns?: ColSchema[],
        pubTablesInfo?: {},
        sessionTables?: Map<string,string>
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let destTableName;
        let pubTableName; // published tables will have it, also as srcTableName
        let cols = [];
        const selectCliArray = [];
        sessionTables = sessionTables || new Map();
        if (sourceId != null) {
            srcTableName = this.identifiers.get(sourceId);
            if (sessionTables.has(srcTableName)) {
                destTableName = sessionTables.get(srcTableName);
                for (const colSchema of pubTablesInfo[srcTableName].schema) {
                    colSchema.backName = colSchema.name;
                    cols.push(colSchema);
                }
            } else if (pubTablesInfo) {
                // This is for SQL mode where SQL node works with pub tables
                srcTableName = this.identifiers.get(sourceId);
                if (this.getParents().length > 0 || !srcTableName ||
                    !pubTablesInfo[srcTableName]) {
                        return PromiseHelper.reject("Invalid publish tables");
                }
                const renameMap = [];
                const colNameSet = new Set();
                for (const colSchema of pubTablesInfo[srcTableName].schema) {
                    const upperName = colSchema.name.toUpperCase();
                    if (colNameSet.has(upperName)) {
                        return PromiseHelper.reject("Duplicate column: " +
                                                    colSchema.name);
                    }
                    colNameSet.add(upperName);
                    renameMap.push({
                        sourceColumn: colSchema.name,
                        destColumn: upperName,
                        columnType: DfFieldTypeTStr[xcHelper
                                .convertColTypeToFieldType(colSchema.type)]
                    });
                    colSchema.backName = upperName;
                    cols.push(colSchema);
                }
                // const batchId = pubTablesInfo[srcTableName].batchId;
                destTableName = xcHelper.randName("sqlTable") +
                                Authentication.getHashId();
                const selectCli = {
                    "operation": "XcalarApiSelect",
                    "args": {
                        "source": srcTableName,
                        "dest": destTableName,
                        "minBatchId": -1,
                        // "maxBatchId": batchId != null ? batchId : -1,
                        "maxBatchId": -1, // we disabled default transactions
                        "columns": renameMap
                    }
                }
                pubTableName = srcTableName;
                selectCliArray.push(JSON.stringify(selectCli));
            } else {
                // This is for advanced mode where SQL node has >=1 parents
                if (this.getParents().length < sourceId) {
                    return PromiseHelper.reject("Node connection doesn't exist");
                }
                const srcTable = this.getParents()[sourceId - 1];
                srcTableName = srcTable.getTable() ||
                               xcHelper.randName("sqlTable") +
                               Authentication.getHashId();
                if (srcTable instanceof DagNodeIMDTable) {
                    pubTableName = srcTable.getSource().toUpperCase();
                }
                destTableName = srcTableName;
                cols = srcTable.getLineage().getColumns(false, true);
            }
        } else {
            destTableName = srcTableName;
            cols = columns;
        }

        if (cols.length === 0) {
            return PromiseHelper.reject(SQLErrTStr.NoInputColumn);
        }

        let colInfos: ColRenameInfo[] = [];
        const remainCols: ColRenameInfo[] = [];

        const schema = [];
        const colNameMap = {};
        const invalidColumns = {};
        for (let i = 0; i < cols.length; i++) {
            let col = cols[i];
            if (sourceId != null) {
                const progCol = cols[i];
                if (progCol.name === "DATA") {
                    continue;
                }
                col = {
                    name: progCol.backName,
                    type: progCol.type as ColumnType
                }
            }
            let colInfo;
            try {
                colInfo = this._getDerivedCol(col);
            } catch(e) {
                deferred.reject(e);
                return deferred.promise();
            }
            if (colInfo === null) {
                invalidColumns[col.name] = col.type;
                continue;
            } else if (colInfo.new !== colInfo.orig) {
                // otherwise nothing to finalize
                colInfos.push(colInfo);
            } else {
                remainCols.push(colInfo)
            }
            if (colNameMap[colInfo.new]) {
                deferred.reject("Duplicate column: " + colInfo.orig + ", " +
                                colNameMap[colInfo.new]);
                return deferred.promise();
            }
            colNameMap[colInfo.new] = colInfo.orig;
            const schemaStruct = {};
            schemaStruct[colInfo.new] = col.type === ColumnType.money
                                        ? "money" : col.type;
            schema.push(schemaStruct);
        }
        if (colInfos.length === 0) {
            const ret = {
                finalizedTableName: destTableName,
                cliArray: selectCliArray,
                schema: schema,
                srcTableName: srcTableName,
                pubTableName: pubTableName,
                invalidColumns: invalidColumns
            }
            return PromiseHelper.resolve(ret);
        } else {
            colInfos = colInfos.concat(remainCols);
        }
        this._getSynthesize(colInfos, destTableName)
        .then((ret) => {
            const finalizeStruct = {
                finalizedTableName: ret.finalizedTableName,
                cliArray: selectCliArray.concat(ret.cliArray),
                schema: schema,
                srcTableName: srcTableName,
                pubTableName: pubTableName,
                invalidColumns: invalidColumns
            }
            deferred.resolve(finalizeStruct);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _finalizeAndGetSchema(
        sourceId: number,
        sqlTableName: string,
        pubTablesInfo?: {},
        srcTableName?: string,
        columns?: ColSchema[],
        sessionTables?: Map<string,string>,
    ): XDPromise<any> {
        var deferred = PromiseHelper.deferred();
        this._finalizeTable(sourceId, srcTableName, columns, pubTablesInfo, sessionTables)
        .then(function(ret) {
            const structToSend: SQLSchema = {
                tableName: sqlTableName.toUpperCase(),
                tableColumns: ret.schema,
                xcTableName: ret.finalizedTableName
            }

            // console.log(structToSend);
            const retStruct = {
                cliArray: ret.cliArray,
                structToSend: structToSend,
                srcTableName: ret.srcTableName,
                pubTableName: ret.pubTableName,
                finalizedTableName: ret.finalizedTableName,
                invalidColumns: ret.invalidColumns
            }
            deferred.resolve(retStruct);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public sendSchema(
        identifiers: Map<number, string>,
        pubTablesInfo?: {},
        sqlFuncs?: {},
        usedTables?: string[],
        compileId?: string,
        sessionTables?: Map<string,string>
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const self = this;
        let schemaQueryArray = [];
        const promiseArray = [];
        let allSchemas: SQLSchema[] = [];
        const tableSrcMap = {};
        const invalidColumnsMap = {};
        // used for SQL functions
        const selectTableMap = {};
        const sqlFuncQueries = [];
        const sqlFuncSchemas = [];
        const visitedMap = {};
        compileId = compileId || "";
        identifiers.forEach(function(value, key) {
            if (!value || (usedTables &&
                           usedTables.indexOf(value.toUpperCase()) === -1)) {
                return;
            }
            const innerDeferred = PromiseHelper.deferred();
            const sourceId = key;
            const tableName = value;
            self._finalizeAndGetSchema(sourceId, tableName, pubTablesInfo, null, null, sessionTables)
            .then(function(retStruct) {
                selectTableMap[retStruct.structToSend.tableName] = retStruct.structToSend.xcTableName;
                schemaQueryArray = schemaQueryArray.concat(retStruct.cliArray);
                allSchemas.push(retStruct.structToSend);
                if (!pubTablesInfo) {
                    // If it's SQL mode, we don't do this bc pub table name is fixed
                    tableSrcMap[retStruct.srcTableName] = key;
                } else if (sessionTables && sessionTables.has(retStruct.srcTableName)) {
                    tableSrcMap[sessionTables.get(retStruct.srcTableName)] = key;
                }
                if (retStruct.invalidColumns &&
                    Object.keys(retStruct.invalidColumns).length > 0) {
                    invalidColumnsMap[tableName.toUpperCase()] =
                                                       retStruct.invalidColumns;
                }
                innerDeferred.resolve();
            })
            .fail((err) => {
                innerDeferred.reject(err);
            });
            promiseArray.push(innerDeferred.promise());
        });

        PromiseHelper.when.apply(self, promiseArray)
        .then(function() {
            const innerPromiseArray = [];
            if (sqlFuncs) {
                const sqlFuncsArray = [];
                for (const key in sqlFuncs) {
                    sqlFuncsArray.push({
                        key: key,
                        value: sqlFuncs[key]
                    });
                }
                // place outer functions first
                sqlFuncsArray.sort((a,b) => {
                    return b.key.length - a.key.length;
                });
                sqlFuncsArray.forEach((s) => {
                    const sqlFunc = {};
                    sqlFunc[s.key] = s.value;
                    innerPromiseArray.push(self._getSchemasAndQueriesFromSqlFuncs
                                               .bind(self,
                                                     sqlFunc,
                                                     sqlFuncQueries,
                                                     sqlFuncSchemas,
                                                     selectTableMap,
                                                     visitedMap));
                });
            }
            return PromiseHelper.chain(innerPromiseArray);
        })
        .then(function() {
            // always drop schema on plan server first
            return SQLUtil.sendToPlanner(self.getId() + compileId, "dropAll");
        })
        .then(function() {
            allSchemas = allSchemas.concat(sqlFuncSchemas);
            // send schema to plan server
            return SQLUtil.sendToPlanner(self.getId() + compileId, "update", allSchemas);
        })
        .then(function() {
            schemaQueryArray = schemaQueryArray.concat(sqlFuncQueries).map(function(cli) {
                if (cli.endsWith(",")) {
                    cli = cli.substring(0, cli.length - 1);
                }
                return cli;
            });
            const queryString = "[" + schemaQueryArray.join(",") + "]";
            const ret = {
                queryString: queryString,
                tableSrcMap: tableSrcMap,
                invalidColumnsMap: invalidColumnsMap
            }
            deferred.resolve(ret);
        })
        .fail(function(err) {
            if (typeof err === "string") {
                deferred.reject(err);
            } else if (err) {
                deferred.reject(JSON.stringify(err));
            } else {
                let error = "Sending schema failed";
                for (let i = 0; i < arguments.length; i++) {
                    if (arguments[i]) {
                        error += " at: " + arguments[i];
                        break;
                    }
                }
                deferred.reject(error);
            }
        });
        return deferred.promise();
    }

    private _getQueryTableCols(allCols: SQLColumn[]) {
        const columns: {name: string, backName: string, type: ColumnType}[] = [];
        for (let i = 0; i < allCols.length; i++) {
            const colName = allCols[i].rename || allCols[i].colName;
            columns.push({name: colName,
                          backName: colName,
                          type: xcHelper.getCastTypeToColType(allCols[i].colType)});
        }
        return columns;
    }

    private _getSchemasAndQueriesFromSqlFuncs(
        sqlFunc: {},
        allQueries: string[],
        allSchemas: SQLSchema[],
        selectTableMap: {}, // {pubTable: selectTable}
        visitedMap: {}
    ): XDPromise<any> {
        const inputTableNames = [];
        if (Object.keys(sqlFunc).length > 1) {
            return PromiseHelper.reject("Invalid table function: " + JSON.stringify(sqlFunc));
        }
        const key = Object.keys(sqlFunc)[0];
        if (visitedMap.hasOwnProperty(key)) {
            return PromiseHelper.resolve(visitedMap[key]);
        }
        const funcName = sqlFunc[key].funcName;
        // list all functions and check if funcName is there
        if (!DagTabSQLFunc.hasFunc(funcName)) {
            return PromiseHelper.reject("Cannot find table function: " + funcName);
        }
        const deferred = PromiseHelper.deferred();
        const args = sqlFunc[key].arguments;
        const newIdentifier = sqlFunc[key].newTableName;
        const promises = [];
        for (const arg of args) {
            const identifier = Object.keys(arg)[0];
            if (visitedMap.hasOwnProperty(identifier)) {
                continue;
            }
            if (typeof arg[identifier] === "string") {
                if (!selectTableMap.hasOwnProperty(identifier)) {
                    return PromiseHelper.reject("Published table not ready: " +
                                                identifier);
                }
                inputTableNames.push(selectTableMap[identifier]);
            } else {
                const newSqlFunc = {};
                newSqlFunc[identifier] = arg[identifier];
                promises.push(this._getSchemasAndQueriesFromSqlFuncs(newSqlFunc,
                                                                     allQueries,
                                                                     allSchemas,
                                                                     selectTableMap,
                                                                     visitedMap));
            }
        }
        const tempTab: DagTabSQLFunc = DagTabSQLFunc.getFunc(funcName);
        let newTableName;
        PromiseHelper.when(...promises)
        .then((tableNames: string[]) => {
            for (const tableName of tableNames) {
                if (tableName) {
                    inputTableNames.push(tableName);
                }
            }
            return tempTab.getQuery(inputTableNames);
        })
        .then((ret) => {
            const {queryStr, destTable} = ret;
            visitedMap[key] = destTable;
            newTableName = destTable;
            JSON.parse(queryStr).forEach((query) => {
                allQueries.push(JSON.stringify(query));
            })
            return tempTab.getSchema();
        })
        .then((columns) => {
            return this._finalizeAndGetSchema(undefined, newIdentifier, undefined,
                                              newTableName, columns);
        })
        .then((ret) => {
            const cliArray = ret.cliArray;
            cliArray.forEach((query) => {
                allQueries.push(query);
            })
            allSchemas.push(ret.structToSend);
            deferred.resolve(ret.finalizedTableName);
        })
        .fail((err) => {
            err = "Table function " + funcName + " failed: "
                  + this.errStringify(err);
            deferred.reject(err);
        });
        return deferred.promise();
    }

    private errStringify(err): string {
        if (typeof err === "object") {
            if (err instanceof Error) {
                err = err.stack;
            } else if (err instanceof Array) {
                let outStr: string = "[";
                for (let innerErr of err) {
                    outStr = outStr + this.errStringify(innerErr) + ", ";
                }
                err = outStr.substring(0, outStr.length - 2) + "]";
            } else {
                err = JSON.stringify(err);
            }
        }
        return err;
    }

    private setAggregatesCreated(aggs: string[]): void {
        this.aggregatesCreated = aggs;
    }

    public getAggregatesCreated(): string[] {
        return this.aggregatesCreated;
    }

    public compileSQL(
        sqlQueryStr: string,
        queryId: string,
        options: {
            identifiers?: Map<number, string>,
            sqlMode?: boolean,
            pubTablesInfo?: {},
            dropAsYouGo?: boolean
            sqlFunctions?: {},
            originalSQLNode?: DagNodeSQL,
            noPushToSelect?: boolean,
            sessionTables?: Map<string, string>,
            schema?: {}
        } = {},
        replaceParam: boolean = true
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const self = this;
        let schemaQueryString;
        let tableSrcMap;
        let invalidColumnsMap;
        // All options
        let identifiers;
        let sqlMode;
        let pubTablesInfo;
        let dropAsYouGo;
        let sqlFunctions;
        let compileId = "_sql" + Authentication.getHashId();
        let sessionTables;
        try {
            // set all options
            self.setIdentifiers(options.identifiers);
            identifiers = self.getIdentifiers();
            sqlMode = options.sqlMode;
            pubTablesInfo = options.pubTablesInfo;
            sessionTables = options.sessionTables;
            if (options.dropAsYouGo == null) {
                dropAsYouGo = self.getParam().dropAsYouGo == null ? true :
                                                self.getParam().dropAsYouGo;
            } else {
                dropAsYouGo = options.dropAsYouGo;
            }
            sqlFunctions = options.sqlFunctions;
            this.events.trigger(DagNodeEvents.StartSQLCompile, {
                id: this.getId(),
                node: this
            });

            const optimizations: SQLOptimization = {
                combineProjectWithSynthesize: true,
                dropAsYouGo: dropAsYouGo
            };
            let promise;
            if (!sqlMode) {
                const parseStruct = {
                    sqlQuery: sqlQueryStr,
                    ops: ["identifier", "sqlfunc"],
                    isMulti: true
                };
                promise = SQLUtil.sendToPlanner(self.getId() + compileId, "parse",
                                                parseStruct);
            } else {
                promise = PromiseHelper.resolve();
            }
            promise
            .then(function(ret) {
                let usedTables: string[];
                if (ret) {
                    const sqlParseRet = JSON.parse(ret).ret;
                    let sqlStructArray: SQLParserStruct[];
                    if (!(sqlParseRet instanceof Array)) { // Remove this after parser change in
                        if (sqlParseRet.errorMsg) {
                            return PromiseHelper.reject(sqlParseRet.errorMsg);
                        }
                        sqlStructArray = sqlParseRet.parseStructs;
                    } else {
                        sqlStructArray = sqlParseRet;
                    }
                    if (sqlStructArray.length > 1) {
                        return PromiseHelper.reject(SQLErrTStr.MultiQueries);
                    }
                    usedTables = sqlStructArray[0].identifiers || [];
                    usedTables = usedTables.map((table) => {
                        if (table.length > 2 && table[0] === "`" && table[table.length - 1] === "`") {
                            table = table.substring(1, table.length - 1);
                        }
                        return table.toUpperCase();
                    });
                    sqlQueryStr = sqlStructArray[0].newSql;
                    sqlFunctions = sqlStructArray[0].functions;
                }
                return self.sendSchema(identifiers, pubTablesInfo, sqlFunctions,
                                       usedTables, compileId, sessionTables);
            })
            .then(function(ret) {
                schemaQueryString = ret.queryString;
                tableSrcMap = ret.tableSrcMap;
                invalidColumnsMap = ret.invalidColumnsMap;
                self.setTableSrcMap(tableSrcMap);
                const struct = {"sqlQuery": sqlQueryStr};
                return SQLUtil.sendToPlanner(self.getId() + compileId, "query", struct);
            })
            .then(function(data) {
                let logicalPlan = "";
                try {
                    logicalPlan = JSON.parse(JSON.parse(data).sqlQuery);
                } catch(e) {
                    return PromiseHelper.reject("Failed to parse logical plan: "
                                                                        + data);
                }
                const sqlQueryObj = new SQLQuery(queryId, sqlQueryStr,
                                                 logicalPlan, optimizations);
                return SQLCompiler.compile(sqlQueryObj);
            })
            .then(function(sqlQueryObj: SQLQuery) {
                self.setColumns(sqlQueryObj.allColumns);
                let optimizeStruct;
                try {
                    if (sqlMode) {
                        self.setRawXcQueryString(LogicalOptimizer.optimize(
                                                    sqlQueryObj.xcQueryString,
                                                    sqlQueryObj.optimizations,
                                                    schemaQueryString)
                                                    .optimizedQueryString);
                        if (!options.noPushToSelect) {
                            sqlQueryObj.optimizations.pushToSelect = true;
                        }
                    }
                    optimizeStruct = LogicalOptimizer.optimize(
                                                    sqlQueryObj.xcQueryString,
                                                    sqlQueryObj.optimizations,
                                                    schemaQueryString);
                } catch (e) {
                    if (e.error && typeof e.error === "string") {
                        return PromiseHelper.reject(e.error);
                    } else {
                        return PromiseHelper.reject(e);
                    }
                }
                sqlQueryObj.xcQueryString = optimizeStruct.optimizedQueryString;
                const aggregates = optimizeStruct.aggregates;
                const replaceRetStruct = self.replaceSQLTableName(sqlQueryObj.xcQueryString,
                                                                  sqlQueryObj.newTableName);
                self.setNewTableName(replaceRetStruct.newDestTableName);
                self.setAggregatesCreated(aggregates);
                self.setXcQueryString(replaceRetStruct.newQueryStr);
                self.setTableSrcMap(tableSrcMap);
                const retStruct = {
                    newTableName: replaceRetStruct.newDestTableName,
                    xcQueryString: replaceRetStruct.newQueryStr,
                    allCols: sqlQueryObj.allColumns,
                    tableSrcMap: tableSrcMap
                };
                self.updateSubGraph(null, null, sqlMode, sessionTables, options.schema);
                self.updateSubGraph(replaceRetStruct.newTableMap, null, sqlMode);
                // recalculate the lineage after compilation
                const lineage = self.getLineage();
                lineage.reset();
                lineage.getColumns(replaceParam);
                deferred.resolve(retStruct);
            })
            .fail(function(errorMsg) {
                console.error("sql compile error: ", errorMsg);
                const errorMsgBackup = errorMsg;
                try {
                    if (typeof errorMsg === "string") {
                        if (/^(.|\n)*== SQL ==(.|\n)*\^\^\^/.test(errorMsg)) {
                            errorMsg = errorMsg.match(/^(.|\n)*== SQL ==(.|\n)*\^\^\^/)[0];
                        }
                        let lines = errorMsg.split("\n");
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].startsWith("+-")) {
                                lines.splice(i - 1, lines.length - i + 1);
                                break;
                            }
                        }
                        errorMsg = lines.join("\n");
                        errorMsg = errorMsg.replace(/\.;*$/, ".");
                    }
                } catch (e) {
                    errorMsg = errorMsgBackup;
                }
                errorMsg = self.errStringify(errorMsg);
                if (errorMsg.indexOf(SQLErrTStr.Cancel) === -1) {
                    if (errorMsg.match(/cannot resolve .* given input columns/g)) {
                        // XXX Ideally should let sql parser deal with this so
                        // we don't need this kind of error parsing
                        let colName = errorMsg.substring(
                                errorMsg.indexOf("'") + 1,
                                errorMsg.lastIndexOf("' given input columns")).
                                toUpperCase();
                        let table;
                        if (colName.indexOf(".`") > 0) {
                            // has table identifier
                            table = colName[0] === "`" ?
                                    colName.substring(1, colName.indexOf("`.")):
                                    colName.substring(0, colName.indexOf(".`"));
                            colName = colName.slice(colName.indexOf(".`") + 2,
                                                    -1);
                        } else {
                            colName = colName.slice(1, -1);
                        }
                        if (table) {
                            const schema = invalidColumnsMap[table];
                            if (schema) {
                                for (const col in schema) {
                                    if (self._getDerivedColName(col) ===
                                        colName) {
                                        errorMsg =
                                            SQLErrTStr.InvalidColTypeForFinalize
                                            + col + "(" + schema[col] + ")";
                                    }
                                }
                            }
                        } else {
                            let found = false;
                            for (const key in invalidColumnsMap) {
                                if (found) break;
                                const schema = invalidColumnsMap[key];
                                for (const col in schema) {
                                    if (self._getDerivedColName(col)
                                            .toUpperCase() === colName) {
                                        errorMsg =
                                            SQLErrTStr.InvalidColTypeForFinalize
                                            + col + "(" + schema[col] + ")";
                                        found = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (errorMsg.startsWith("Expressions referencing the"
                        + " outer query are not supported outside of"
                        + " WHERE/HAVING clauses:")) {
                        if (errorMsg.indexOf("#") !== -1) {
                            errorMsg = errorMsg.substring(0, errorMsg.indexOf("outer("))
                                + errorMsg.substring(errorMsg.indexOf("outer(") + 6,
                                errorMsg.indexOf("#")) + ". Please check if subquery"
                                + " reference columns out of scope";
                        } else {
                            errorMsg = errorMsg + ". Please check if subquery"
                                        + " reference columns out of scope";
                        }
                    }
                }
                self.setSQLQuery({errorMsg: errorMsg, endTime: new Date()});
                deferred.reject(errorMsg);
            })
            .always(() => {
                this.events.trigger(DagNodeEvents.EndSQLCompile, {
                    id: this.getId(),
                    node: this
                });
            });
        } catch (e) {
            self.setSQLQuery({errorMsg: JSON.stringify(e), endTime: new Date()});
            this.events.trigger(DagNodeEvents.EndSQLCompile, {
                id: this.getId(),
                node: this
            });
            deferred.reject(e);
        }
        return deferred.promise();
    }

    // after converting a query into dag nodes, we reassign the dagNodeIds
    // with those of this.subGraphNodeIds
    private _replaceSubGraphNodeIds(retStruct): void {
        if (this.subGraphNodeIds.length !== retStruct.dagInfoList.length) {
            console.error("")
            return;
        }
        let oldIdNewIdMap = new Map();
        retStruct.dagInfoList.forEach((dagNodeInfo: DagNodeInfo, i) => {
            let newId = this.subGraphNodeIds[i];
            let oldId = dagNodeInfo.id;
            oldIdNewIdMap.set(oldId, newId);
            dagNodeInfo.id = newId;
            dagNodeInfo["nodeId"] = newId;
        });
        retStruct.dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
            const parents: DagNodeId[] = dagNodeInfo.parents;
            parents.forEach((dagParent, i) => {
                parents[i] = oldIdNewIdMap.get(dagParent);
            });
        });
        for (let oldId in retStruct.dagIdParentMap) {
            let newId = oldIdNewIdMap.get(oldId);
            let cache = retStruct.dagIdParentMap[oldId];
            delete retStruct.dagIdParentMap[oldId];
            retStruct.dagIdParentMap[newId] = cache;
        }
        for (let oldId in retStruct.dagIdToTableNamesMap) {
            let newId = oldIdNewIdMap.get(oldId);
            let cache = retStruct.dagIdToTableNamesMap[oldId];
            delete retStruct.dagIdToTableNamesMap[oldId];
            retStruct.dagIdToTableNamesMap[newId] = cache;
        }
        for (let tableName in retStruct.tableNewDagIdMap) {
            let oldId = retStruct.tableNewDagIdMap[tableName];
            let newId = oldIdNewIdMap.get(oldId);
            retStruct.tableNewDagIdMap[tableName] = newId;
        }
        retStruct.outputDagId = oldIdNewIdMap.get(retStruct.outputDagId);
    }

    /**
     * Since fake table names are created by compiler, we need to replace all of
     * them before execution. Used both here and in DagNodeExecutor with different arguments
     * @param queryStr  xcalar query string
     * @param oldDestTableName  destTableName created by compiler
     * @param tabId     id of current tab
     * @param tableSrcMap   {compilerTableName: sourceId}
     * @param replaceMap    {sourceId: newParentTableName}
     */
    public replaceSQLTableName(
        queryStr: string,
        oldDestTableName: string,
        tabId?: string,
        tableSrcMap?: {},
        replaceMap?: {}
    ): {newQueryStr: string,
        newDestTableName: string,
        newTableSrcMap: {},
        newTableMap: {}} {
        const queryStruct = JSON.parse(queryStr);
        const newTableMap = {};
        const newAggMap = {};
        const newTableSrcMap = {};
        const newDestTableName = this._generateTableName("SQLTAG_DEST", tabId);
        let tagCount = -1;
        queryStruct.forEach((operation) => {
            if (operation.operation === "XcalarApiDeleteObjects") {
                const namePattern = operation.args.namePattern;
                if (namePattern && newTableMap[namePattern]) {
                    operation.args.namePattern = newTableMap[namePattern];
                }
                if (namePattern && newAggMap["^" + operation.args.namePattern]) {
                    operation.args.namePattern = newAggMap["^" + operation.args.namePattern].substring(1);
                }
                return;
            }
            let source = operation.args.source;
            // source replacement
            if (typeof source === "string") {
                source = [source];
            }
            for (let i = 0; i < source.length; i++) {
                if (tabId && tableSrcMap && replaceMap) {
                    if (!newTableMap[source[i]]) {
                        const idx = tableSrcMap[source[i]];
                        if (idx) {
                            newTableMap[source[i]] = replaceMap[idx];
                            newTableSrcMap[replaceMap[idx]] = idx;
                        } else {
                            // console.log("publish table as source: ", source[i]);
                            continue;
                        }
                    }
                    source[i] = newTableMap[source[i]];
                } else {
                    newTableMap[source[i]] = newTableMap[source[i]] || source[i];
                    source[i] = newTableMap[source[i]];
                }
            }
            if (source.length === 1) {
                operation.args.source = source[0];
            } else {
                operation.args.source = source;
            }
            // agg replacement for eval strings
            if (operation.operation === "XcalarApiJoin") {
                operation.args.evalString = XDParser.XEvalParser
                                    .replaceColName(operation.args.evalString,
                                                    {}, newAggMap, true);
            } else if (operation.operation === "XcalarApiGroupBy"
                       || operation.operation === "XcalarApiMap"
                       || operation.operation === "XcalarApiFilter"
                       || operation.operation === "XcalarApiAggregate") {
                for (let i = 0; i < operation.args.eval.length; i++) {
                    operation.args.eval[i].evalString = XDParser.XEvalParser
                                .replaceColName(operation.args.eval[i].evalString,
                                                {}, newAggMap, true);
                }
            }
            // dest replacement
            if (operation.args.dest === oldDestTableName) {
                newTableMap[operation.args.dest] = newDestTableName;
                operation.args.dest = newDestTableName;
            } else if (operation.operation !== "XcalarApiAggregate") {
                if (!newTableMap[operation.args.dest]) {
                    tagCount++;
                    newTableMap[operation.args.dest] = this._generateTableName("SQLTAG_" + tagCount, tabId);
                }
                operation.args.dest = newTableMap[operation.args.dest];
            } else {
                tagCount++;
                let newAggName = this._generateTableName("SQLTAG_" + tagCount, tabId, true);
                newAggMap["^" + operation.args.dest] = "^" + newAggName;
                operation.args.dest = newAggName;
            }
        });
        return {newQueryStr: JSON.stringify(queryStruct),
                newDestTableName: newDestTableName,
                newTableSrcMap: newTableSrcMap,
                newTableMap: newTableMap};
    }

    private _generateTableName(tag: string, tabId?: string, isAgg?: boolean): string {
        let tableName;
        try {
            let prefix;
            if (this.getParam().outputTableName) {
                prefix = this.getParam(true).outputTableName;
            } else {
                prefix = xcHelper.genTableNameFromNode(this);
            }
            prefix = prefix.replace(/_SQLTAG_DEST/g, ""); // remove old tags
            if (prefix == "") {
                const identifiersList: string[] = [];
                this.identifiers.forEach((identifier) => identifiersList.push(identifier));
                prefix = identifiersList.join("_");
            }
            if (isAgg) {
                tableName = prefix + (tag ? "_" + tag : "") +
                        Authentication.getTableId().substring(1);
            } else {
                tableName = prefix + (tag ? "_" + tag : "") +
                        Authentication.getTableId();
                if (!XIApi.isValidTableName(tableName)) {
                    tableName = XIApi.getNewTableName(tableName);
                }
            }
        } catch (e) {
            // in noed js env it's normal to have code here
            if (!xcHelper.isNodeJs()) {
                console.error("generate table name error", e);
            }
            // when has error case, use the old behavior
            // XXX TODO: deprecate it
            if (isAgg) {
                tableName = "table_" + (tabId ? tabId : "") + "_" + this.getId()
                    + (tag ? "_" + tag : "") + Authentication.getHashId().substring(1);
            } else {
                tableName = "table_" + (tabId ? tabId : "") + "_" + this.getId()
                    + (tag ? "_" + tag : "") + Authentication.getHashId();
                if (!XIApi.isValidTableName(tableName)) {
                    tableName = XIApi.getNewTableName(tableName);
                }
            }
        }

        return tableName;
    }

    private _setupSubGraphEvents() {
        // Listen to sub graph changes
        const subGraph = this.getSubGraph();
        subGraph.events.on(DagNodeEvents.SubGraphUDFErrorChange, (info) => {
            let mapNode = info.node;
            if (!mapNode.getUDFError()) {
                delete this._udfErrorsMap[info.node.getId()];
            } else {
                this._udfErrorsMap[info.node.getId()] = info.node.getUDFError();
            }
            // console.log("sql", info.node);
            this.events.trigger(DagNodeEvents.UDFErrorChange, {
                node: this
            });
        });
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSQL = DagNodeSQL;
};
