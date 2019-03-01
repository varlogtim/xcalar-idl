class DagNodeSQL extends DagNode {
    public static readonly PREFIX: string = "sqlQuery";

    protected input: DagNodeSQLInput;
    protected columns: {name: string, backName: string, type: ColumnType}[];
    protected xcQueryString: string;
    protected rawXcQueryString: string; // partially optimized query (curretnly without pushToSelect)
    protected identifiers: Map<number, string>; // 1 to 1 mapping
    protected tableSrcMap: {};
    protected subGraph: DagSubGraph;
    protected SQLName: string;
    protected subInputNodes: DagNodeSQLSubInput[];
    protected subOutputNodes: DagNodeSQLSubOutput[];
    protected newTableName: string; // Currently only one ouput as multi-query is disabled
    protected tableNewDagIdMap: {};
    protected dagIdToTableNamesMap: {}; // id to tableName map stores all the tables related to the dag node
    protected aggregatesCreated: string[];
    // in topological order

    // non-persistent
    private _queryObj: any;

    public constructor(options: DagNodeSQLInfo) {
        super(options);
        this.type = DagNodeType.SQL;
        this.tableSrcMap = options.tableSrcMap;
        this.columns = options.columns;
        this.maxParents = -1;
        this.minParents = 0; // when working on pub tables in SQL mode, it can be 0
        this.display.icon = "&#xe957;";
        this.input = new DagNodeSQLInput(options.input);
        const identifiers = new Map<number, string>();
        const identifiersOrder = this.input.getInput().identifiersOrder;
        const identifiersRaw = this.input.getInput().identifiers;
        if (identifiersOrder && identifiersRaw ) {
            identifiersOrder.forEach(function(idx) {
                identifiers.set(idx, identifiersRaw[idx]);
            });
        }
        this.identifiers = identifiers;
        // Subgraph info won't be serialized
        this.subInputNodes = [];
        this.subOutputNodes = [];
        this.SQLName = xcHelper.randName("SQLTab_");
        this._queryObj = {
            queryId: xcHelper.randName(DagNodeSQL.PREFIX, 8)
        };
        this.aggregatesCreated = [];
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

    // XXX TODO: decouple with UI code
    public updateSQLQueryHistory(updateStats: boolean = false): void {
        if (updateStats) {
            this._updateStatsInSQLQuery();
        }
        SQLHistorySpace.Instance.update(this._queryObj);
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

    public updateSubGraph(_newTableMap?: {}, rawXcQuery?: boolean): void {
        if (_newTableMap) {
            // If it's simply updating the mapping of oldTableName -> newTableName
            // no need to re-build the entire sub graph
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
            return;
        }
        // XXX TODO: decouple with UI code
        this.getRuntime().getDagTabService().removeTabByNode(this);
        this.subGraph = this.getRuntime().accessible(new DagSubGraph());
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
        this.tableNewDagIdMap = retStruct.tableNewDagIdMap;
        this.dagIdToTableNamesMap = retStruct.dagIdToTableNamesMap;
        const dagInfoList = retStruct.dagInfoList;
        const dagIdParentMap = retStruct.dagIdParentMap;
        const outputDagId = retStruct.outputDagId;
        for (let i = 0; i < this.identifiers.size; i++) {
            this.subInputNodes.push(null);
        }
        dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
            const parents: DagNodeId[] = dagNodeInfo.parents;
            const node: DagNode = DagNodeFactory.create(dagNodeInfo);
            this.subGraph.addNode(node);
            const nodeId: string = node.getId();
            const dagParents = dagIdParentMap[nodeId];
            if (dagParents) {
                dagParents.forEach((dagParent) => {
                    const index = dagParent.index;
                    const srcId = dagParent.srcId;
                    const inNodePort = {
                        node: node,
                        portIdx: index
                    }
                    this.addInputNode(inNodePort, srcId - 1);
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
        // restore edges
        this.subGraph.restoreConnections(connections);
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
    public setIdentifiers(identifiers: Map<number, string>): void {
        if (!identifiers) {
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
        let dropAsYouGo: boolean = input.dropAsYouGo;
        if (dropAsYouGo == null) {
            dropAsYouGo = true; // default to be true
        }
        this.input.setInput({
            sqlQueryStr: input.sqlQueryStr,
            identifiers: input.identifiers,
            identifiersOrder: input.identifiersOrder,
            dropAsYouGo: dropAsYouGo
        });
        super.setParam(null, noAutoExecute);
    }

    /**
     * DFS to get lineage changes from sub graph
     * @param columnMapList a column map {finalColName: [finalProgColumn, changedFlag]} wrapped with a list
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
                    newColumnMap[change.from.backName] = oldColumnMap[change.to.backName];
                    newColumnMap[change.from.backName][1] = true;
                }
            });
        }
        columnMapList[0] = newColumnMap;
        node.getParents().forEach((parent) => {
            this._backTraverseColumnChanges(columnMapList, parent);
        });
    }

    public lineageChange(_columns, replaceParameters?: boolean): DagLineageChange {
        let columnMap = {};
        const finalColumnMap = {}; // {finalColName: [finalProgColumn, changedFlag]}
        const finalCols: ProgCol[] = [];
        this.columns.forEach((column) => {
            const finalColumn = ColManager.newPullCol(column.name,
                                                      column.backName,
                                                      column.type);
            finalColumnMap[column.backName] = [finalColumn, false];
            finalCols.push(finalColumn);
        });
        // Wrap it with a list so that it can be modified across recursions
        const columnMapList = [finalColumnMap];
        for (const outputNode of this.subOutputNodes) {
            this._backTraverseColumnChanges(columnMapList, outputNode);
            break; // We support only one output for now
        }
        columnMap = columnMapList[0];

        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const parents: DagNode[] = this.getParents();
        parents.forEach((parent) => {
            parent.getLineage().getColumns(replaceParameters).forEach((parentCol) => {
                const finalColStruct = columnMap[parentCol.backName];
                if (finalColStruct) {
                    const finalCol = columnMap[parentCol.backName][0];
                    const hasChanged = columnMap[parentCol.backName][1];
                    if (hasChanged) {
                        changes.push({
                            from: parentCol,
                            to: finalCol
                        });
                    }
                    delete finalColumnMap[finalCol.backName];
                } else {
                    changes.push({
                        from: parentCol,
                        to: null
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
    protected _getSerializeInfo(includeStats?: boolean): DagNodeSQLInfo {
        const nodeInfo = super._getSerializeInfo(includeStats) as DagNodeSQLInfo;
        nodeInfo.tableSrcMap = this.tableSrcMap;
        nodeInfo.columns = this.columns;
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
            subGraph.connect(inputNode.getId(), inNodePort.node.getId(), inNodePort.portIdx, false, false);
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
                0, // output node has only one parent
                false,
                false
            );
        }
        return outPortIdx;
    }

    public disconnectFromParent(parentNode: DagNode, pos: number): boolean {
        const wasSpliced = super.disconnectFromParent(parentNode, pos);
        // when removing connection to a parent, also remove sql identifier
        let sqlParams: DagNodeSQLInputStruct = this.getParam();
        let index = sqlParams.identifiersOrder.indexOf(pos + 1);
        if (index > -1) {
            sqlParams.identifiersOrder.splice(index, 1);
            delete sqlParams.identifiers[pos + 1];
            // decrement other identifiers
            const newRawIdentifiers = {};
            sqlParams.identifiersOrder.forEach((idx, i) => {
                if (idx > pos) {
                    sqlParams.identifiersOrder[i] = idx - 1;
                    newRawIdentifiers[idx - 1] = sqlParams.identifiers[idx];
                } else {
                    newRawIdentifiers[idx] = sqlParams.identifiers[idx];
                }
            });
            sqlParams.identifiers = newRawIdentifiers;
            // reset this.identifiers
            const identifiers = new Map<number, string>();
            sqlParams.identifiersOrder.forEach((idx) => {
                identifiers.set(idx, sqlParams.identifiers[idx]);
            });

            this.identifiers = identifiers;
            this.setParam(sqlParams, true);
        }
        return wasSpliced;
    }

    /**
     * @override
     * Change node to configured state
     * @param isUpdateSubgraph set to false, when triggered by subGraph event
     */
    public beConfiguredState(isUpdateSubgraph: boolean = true): void {
        if (this.getState() === DagNodeState.Complete ||
            this.getState() === DagNodeState.Error) {
            // When it is a "reset"
            this.setXcQueryString(null);
            this.setRawXcQueryString(null);
        }
        super.beConfiguredState();
        if (isUpdateSubgraph) {
            // Update the state of nodes in subGraph
            const subGraph = this.getSubGraph();
            if (subGraph) {
                subGraph.getAllNodes().forEach((node) => {
                    node.beConfiguredState();
                });
            }
        }
    }

    protected _getColumnsUsedInInput(): Set<string> {
        return null;
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

    private _getDerivedColName(colName: string): string {
        if (colName.indexOf("::") > 0) {
            colName = colName.split("::")[1];
        }
        if (colName.endsWith("_integer") || colName.endsWith("_float") ||
            colName.endsWith("_boolean") || colName.endsWith("_string")) {
            colName = colName.substring(0, colName.lastIndexOf("_"));
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
            throw SQLErrTStr.InvalidColTypeForFinalize + col.name + "(" + col.type + ")";
        }
        const colInfo: ColRenameInfo = {
            orig: col.name,
            new: this._getDerivedColName(col.name).toUpperCase(),
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
                "noSql": true
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
                "noSql": true
            });
            deferred.reject(SQLErrTStr.FinalizingFailed);
        });
        return deferred.promise();
    }

    private _finalizeTable(
        sourceId: number,
        srcTableName?: string,
        columns?: ColSchema[],
        pubTablesInfo?: {}
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let destTableName;
        let pubTableName; // published tables will have it, also as srcTableName
        let cols = [];
        const selectCliArray = [];
        if (sourceId != null) {
            if (pubTablesInfo) {
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
                        return PromiseHelper.reject("Duplicate column: " + colSchema.name);
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
                destTableName = xcHelper.randName("sqlTable") + Authentication.getHashId();
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
                             xcHelper.randName("sqlTable") + Authentication.getHashId();
                if (srcTable instanceof DagNodeIMDTable) {
                    pubTableName = srcTable.getSource().toUpperCase();
                }
                destTableName = srcTableName;
                cols = srcTable.getLineage().getColumns();
            }
        } else {
            destTableName = srcTableName;
            cols = columns;
        }

        let colInfos: ColRenameInfo[] = [];
        const remainCols: ColRenameInfo[] = [];

        const schema = [];
        const colNameMap = {};
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
            if (colInfo.new !== colInfo.orig) {
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
                pubTableName: pubTableName
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
                pubTableName: pubTableName
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
        columns?: ColSchema[]
    ): XDPromise<any> {
        var deferred = PromiseHelper.deferred();
        this._finalizeTable(sourceId, srcTableName, columns, pubTablesInfo)
        .then(function(ret) {
            const schema = ret.schema;
            var tableMetaCol = {};
            tableMetaCol["XC_TABLENAME_" + ret.finalizedTableName] = "string";
            schema.push(tableMetaCol);

            const structToSend: SQLSchema = {
                tableName: sqlTableName.toUpperCase(),
                tableColumns: schema
            }

            console.log(structToSend);
            const retStruct = {
                cliArray: ret.cliArray,
                structToSend: structToSend,
                srcTableName: ret.srcTableName,
                pubTableName: ret.pubTableName,
                finalizedTableName: ret.finalizedTableName
            }
            deferred.resolve(retStruct);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public sendSchema(
        identifiers: Map<number, string>,
        pubTablesInfo?: {},
        sqlFuncs?: {}
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const self = this;
        let schemaQueryArray = [];
        const promiseArray = [];
        let allSchemas: SQLSchema[] = [];
        const tableSrcMap = {};
        // used for SQL functions
        const selectTableMap = {};
        const sqlFuncQueries = [];
        const sqlFuncSchemas = [];
        const visitedMap = {};
        identifiers.forEach(function(value, key) {
            const innerDeferred = PromiseHelper.deferred();
            const sourceId = key;
            const tableName = value;
            self._finalizeAndGetSchema(sourceId, tableName, pubTablesInfo)
            .then(function(retStruct) {
                if (retStruct.pubTableName) {
                    selectTableMap[retStruct.pubTableName] = retStruct.finalizedTableName;
                }
                schemaQueryArray = schemaQueryArray.concat(retStruct.cliArray);
                allSchemas.push(retStruct.structToSend);
                if (!pubTablesInfo) {
                    // If it's SQL mode, we don't do this bc pub table name is fixed
                    tableSrcMap[retStruct.srcTableName] = key;
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
                for (const key in sqlFuncs) {
                    innerPromiseArray.push(self._getSchemasAndQueriesFromSqlFuncs
                                               .bind(self,
                                                     {key: sqlFuncs[key]},
                                                     sqlFuncQueries,
                                                     sqlFuncSchemas,
                                                     selectTableMap,
                                                     visitedMap));
                }
            }
            return PromiseHelper.chain(innerPromiseArray);
        })
        .then(function() {
            // always drop schema on plan server first
            return SQLUtil.Instance.sendToPlanner(self.getId(), "dropAll");
        })
        .then(function() {
            allSchemas = allSchemas.concat(sqlFuncSchemas);
            // send schema to plan server
            return SQLUtil.Instance.sendToPlanner(self.getId(), "update", allSchemas);
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
                tableSrcMap: tableSrcMap
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
                          type: this._getColType(allCols[i].colType)});
        }
        return columns;
    }
    private _getColType(sqlType: string) {
        switch (sqlType) {
            case "float":
                return ColumnType.float;
            case "int":
                return ColumnType.integer;
            case "string":
                return ColumnType.string;
            case "bool":
                return ColumnType.boolean;
            case "timestamp":
                return ColumnType.timestamp;
            case "numeric":
                return ColumnType.money;
            default:
                return null;
        }
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
            return PromiseHelper.reject("Invalid SQL Function: " +
                                        JSON.stringify(sqlFunc));
        }
        const key = Object.keys(sqlFunc)[0];
        if (visitedMap.hasOwnProperty(key)) {
            return PromiseHelper.resolve(visitedMap[key]);
        }
        const funcName = sqlFunc[key].funcName;
        // list all functions and check if funcName is there
        if (!DagTabSQLFunc.hasFunc(funcName)) {
            return PromiseHelper.reject("Cannot find SQL function: " + funcName);
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
                const newSqlFunc = {identifier: arg[identifier]};
                promises.push(this._getSchemasAndQueriesFromSqlFuncs(newSqlFunc,
                                                                     allQueries,
                                                                     allSchemas,
                                                                     selectTableMap,
                                                                     visitedMap));
            }
        }
        const tempTab = DagTabSQLFunc.getFunc(funcName);
        let newTableName;
        PromiseHelper.when(...promises)
        .then((...tableNames) => {
            for (const tableName of tableNames) {
                if (tableName) {
                    inputTableNames.push(tableName);
                }
            }
            return tempTab.getQuery(inputTableNames);
        })
        .then((queries, tableName) => {
            visitedMap[key] = tableName;
            newTableName = tableName;
            JSON.parse(queries).forEach((query) => {
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
        .fail(deferred.reject);
        return deferred.promise();
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
            sqlFunctions?: {}
        } = {},
        replaceParam: boolean = true
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const sqlCom = new SQLCompiler();
        const self = this;
        let schemaQueryString;
        let tableSrcMap;
        // All options
        let identifiers;
        let sqlMode;
        let pubTablesInfo;
        let dropAsYouGo;
        let sqlFunctions;
        try {
            if (replaceParam) {
                // paramterize SQL
                sqlQueryStr = xcHelper.replaceMsg(sqlQueryStr,
                    DagParamManager.Instance.getParamMap(), true);
            }
            // set all options
            self.setIdentifiers(options.identifiers);
            identifiers = self.getIdentifiers();
            sqlMode = options.sqlMode;
            pubTablesInfo = options.pubTablesInfo;
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

            self.sendSchema(identifiers, pubTablesInfo, sqlFunctions)
            .then(function(ret) {
                schemaQueryString = ret.queryString;
                tableSrcMap = ret.tableSrcMap
                self.setTableSrcMap(tableSrcMap);
                const struct = {"sqlQuery": sqlQueryStr};
                return SQLUtil.Instance.sendToPlanner(self.getId(), "query", struct);
            })
            .then(function(data) {
                let logicalPlan = "";
                try {
                    logicalPlan = JSON.parse(JSON.parse(data).sqlQuery);
                } catch(e) {
                    return PromiseHelper.reject("Failed to parse logical plan: " + data);
                }
                return sqlCom.compile(queryId, logicalPlan, true);
            })
            .then(function(queryString, newTableName, newCols) {
                self.setNewTableName(newTableName);
                self.setColumns(newCols);
                const optimizer = new SQLOptimizer();
                const optimizations = {combineProjectWithSynthesize: true,
                                       dropAsYouGo: dropAsYouGo};
                let optimizedQueryString;
                try {
                    if (sqlMode) {
                        self.setRawXcQueryString(optimizer.logicalOptimize(
                                                            queryString,
                                                            optimizations,
                                                            schemaQueryString));
                        optimizations["pushToSelect"] = true;
                    }
                    optimizedQueryString = optimizer.logicalOptimize(queryString,
                                                                optimizations,
                                                                schemaQueryString);
                } catch (e) {
                    return PromiseHelper.reject(e);
                }
                self.setAggregatesCreated(optimizer.getAggregates());
                self.setXcQueryString(optimizedQueryString);
                const retStruct = {
                    newTableName: newTableName,
                    xcQueryString: optimizedQueryString,
                    allCols: newCols,
                    tableSrcMap: tableSrcMap
                }
                self.updateSubGraph();
                const lineage = self.getLineage();
                lineage.reset();
                lineage.getChanges();
                deferred.resolve(retStruct);
            })
            .fail(function(errorMsg) {
                console.error("sql compile error: " + errorMsg);
                let error = errorMsg;
                if (typeof errorMsg === "string") {
                    if (errorMsg.indexOf(SQLErrTStr.Cancel) === -1) {
                        Alert.show({
                            title: SQLErrTStr.Err,
                            msg: errorMsg,
                            isAlert: true,
                            align: "left",
                            preSpace: true,
                            sizeToText: true
                        });
                        error = null; // already alert, reject null
                    }
                    self.setSQLQuery({errorMsg: errorMsg, endTime: new Date()});
                }
                deferred.reject(error);
            })
            .always(() => {
                this.events.trigger(DagNodeEvents.EndSQLCompile, {
                    id: this.getId(),
                    node: this
                });
            });
        } catch (e) {
            Alert.show({
                title: "Compilation Error",
                msg: "Error details: " + JSON.stringify(e),
                isAlert: true
            });
            self.setSQLQuery({errorMsg: JSON.stringify(e), endTime: new Date()});
            this.events.trigger(DagNodeEvents.EndSQLCompile, {
                id: this.getId(),
                node: this
            });
            deferred.reject();
        }
        return deferred.promise();
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSQL = DagNodeSQL;
};
