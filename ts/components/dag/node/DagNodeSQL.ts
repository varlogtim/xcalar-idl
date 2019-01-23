class DagNodeSQL extends DagNode {
    protected input: DagNodeSQLInput;
    protected columns: {name: string, backName: string, type: ColumnType}[];
    protected xcQueryString: string;
    protected identifiers: Map<number, string>; // 1 to 1 mapping
    protected tableSrcMap: {};
    protected subGraph: DagSubGraph;
    protected SQLName: string;
    protected subInputNodes: DagNodeSQLSubInput[];
    protected subOutputNodes: DagNodeSQLSubOutput[];
    protected newTableName: string; // Currently only one ouput as multi-query is disabled
    protected tableNewDagIdMap: {};
    protected dagIdToTableNamesMap: {}; // id to tableName map stores all the tables related to the dag node
    // in topological order

    // non-persistent
    private _queryObj: any;

    public constructor(options: DagNodeSQLInfo) {
        super(options);
        this.type = DagNodeType.SQL;
        this.tableSrcMap = options.tableSrcMap;
        this.columns = options.columns;
        this.maxParents = -1;
        this.minParents = 1;
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
            queryId: xcHelper.randName("sqlQuery", 8)
        };
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

    public updateSQLQueryHisory(updateStats: boolean = false): void {
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

    public updateSubGraph(_newTableMap?: {}): void {
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
        DagTabManager.Instance.removeTabByNode(this);
        this.subGraph = new DagSubGraph();
        this.subInputNodes = [];
        this.subOutputNodes = [];
        const connections: NodeConnection[] = [];
        const xcQuery = this.getXcQueryString();
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
    public getXcQueryString(): string {
        return this.xcQueryString;
    }
    public setXcQueryString(xcQueryString: string) {
        this.xcQueryString = xcQueryString;
    }
    public getNewTableName(): string{
        return this.newTableName;
    }
    public setNewTableName(newTableName: string): void {
        this.newTableName = newTableName;
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
            sqlQueryStr: input.sqlQueryStr,
            identifiers: input.identifiers,
            identifiersOrder: input.identifiersOrder
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(_columns, replaceParameters?: boolean): DagLineageChange {
        if (this.columns == null) {
            return {
                columns: [],
                changes: []
            }
        }

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
            sqlParams.identifiersOrder.forEach((idx, i) => {
                if (idx > pos) {
                    sqlParams.identifiersOrder[i] = idx - 1;
                    // decrement identifier keys but append a letter so that
                    // we don't overwrite an identifier with the same new key
                    sqlParams.identifiers[(idx - 1) + "x"] = sqlParams.identifiers[idx];
                    delete sqlParams.identifiers[idx];
                }
            });
            for (let i in sqlParams.identifiers) {
                // loop through the identifiers and restore the keys
                if (typeof i === "string" && i.endsWith("x")) {
                    sqlParams.identifiers[i.slice(0, i.indexOf("x"))] = sqlParams.identifiers[i];
                    delete sqlParams.identifiers[i];
                }
            }

            // reset this.identifiers
            const identifiers = new Map<number, string>();
            sqlParams.identifiersOrder.forEach((idx) => {
                identifiers.set(idx, sqlParams.identifiers[idx]);
            });

            this.identifiers = identifiers;
            this.setParam(sqlParams);
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
            let subGraph = this.getSubGraph();
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
        colName = colName.replace(/[\^,\(\)\[\]{}'"\.\\ ]/g, "_");
        return colName;
    }

    // === Copied from derived conversion
    private _getDerivedCol(col: ProgCol): ColRenameInfo {
        // convert prefix field of primitive type to derived
        if (col.type !== 'integer' && col.type !== 'float' &&
            col.type !== 'boolean' && col.type !== 'timestamp' &&
            col.type !== "string") {
            // can't handle other types in SQL
            return;
        }
        const colInfo: ColRenameInfo = {
            orig: col.backName,
            new: this._getDerivedColName(col.backName).toUpperCase(),
            type: xcHelper.convertColTypeToFieldType(col.type as ColumnType)
        };
        return colInfo;
    }

    private _finalizeTable(sourceId: number): XDPromise<any> {
        if (this.getParents().length < sourceId) {
            return PromiseHelper.reject("Node connection doesn't exist");
        }
        const deferred = PromiseHelper.deferred();
        const srcTable = this.getParents()[sourceId - 1];
        const srcTableName = srcTable.getTable() ||
                     xcHelper.randName("sqlTable") + Authentication.getHashId();
        let pubTableName;
        if (srcTable instanceof DagNodeIMDTable) {
            pubTableName = srcTable.getSource().toUpperCase();
        }

        const cols = srcTable.getLineage().getColumns();
        let colInfos: ColRenameInfo[] = [];
        const remainCols: ColRenameInfo[] = [];

        const schema = [];
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (col.name === "DATA") {
                continue;
            }
            const colInfo = this._getDerivedCol(col);
            if (!colInfo) {
                var colName = col.backName === ""? col.name : col.backName;
                deferred.reject(SQLErrTStr.InvalidColTypeForFinalize
                                + colName + "(" + col.type + ")");
                return deferred.promise();
            }
            if (colInfo.new !== colInfo.orig) {
                // otherwise nothing to finalize
                colInfos.push(colInfo);
            } else {
                remainCols.push(colInfo)
            }
            const schemaStruct = {};
            schemaStruct[colInfo.new] = col.type;
            schema.push(schemaStruct);
        }
        let cliArray = [];
        if (colInfos.length === 0) {
            const ret = {
                finalizedTableName: srcTableName,
                cliArray: cliArray,
                schema: schema,
                srcTableName: srcTableName,
                pubTableName: pubTableName
            }
            return PromiseHelper.resolve(ret);
        } else {
            colInfos = colInfos.concat(remainCols);
        }

        let txId = Transaction.start({
            "operation": "SQL Simulate",
            "simulate": true
        });
        XIApi.synthesize(txId, colInfos, srcTableName)
        .then(function(finalizedTableName) {
            cliArray.push(Transaction.done(txId, {
                "noNotification": true,
                "noSql": true
            }));
            txId = Transaction.start({
                "operation": "SQL Simulate",
                "simulate": true
            });
            const ret = {
                finalizedTableName: finalizedTableName,
                cliArray: cliArray,
                schema: schema,
                srcTableName: srcTableName,
                pubTableName: pubTableName
            }
            deferred.resolve(ret);
        })
        .fail(function() {
            deferred.reject(SQLErrTStr.FinalizingFailed);
        });

        return deferred.promise();
    }

    private _finalizeAndGetSchema(
        sourceId: number,
        tableName: string
    ): XDPromise<any> {
        var deferred = PromiseHelper.deferred();
        this._finalizeTable(sourceId)
        .then(function(ret) {
            const finalizedTableName = ret.finalizedTableName;
            const schema = ret.schema;
            var tableMetaCol = {};
            tableMetaCol["XC_TABLENAME_" + finalizedTableName] = "string";
            schema.push(tableMetaCol);

            const structToSend: SQLSchema = {
                tableName: tableName.toUpperCase(),
                tableColumns: schema
            }

            console.log(structToSend);
            const retStruct = {
                cliArray: ret.cliArray,
                structToSend: structToSend,
                srcTableName: ret.srcTableName,
                pubTableName: ret.pubTableName
            }
            deferred.resolve(retStruct);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public sendSchema(
        identifiers: Map<number, string>,
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
            self._finalizeAndGetSchema(sourceId, tableName)
            .then(function(retStruct) {
                if (retStruct.pubTableName) {
                    selectTableMap[retStruct.pubTableName] = retStruct.srcTableName;
                }
                schemaQueryArray = schemaQueryArray.concat(retStruct.cliArray);
                allSchemas.push(retStruct.structToSend);
                tableSrcMap[retStruct.srcTableName] = key;
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
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
            return SQLOpPanel.updatePlanServer("dropAll");
        })
        .then(function() {
            allSchemas = allSchemas.concat(sqlFuncSchemas);
            // send schema to plan server
            return SQLOpPanel.updatePlanServer("update", allSchemas);
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
            if (err && err.responseJSON) {
                deferred.reject(err.responseJSON.exceptionMsg);
            } else if (err && err.status === 0) {
                deferred.reject(SQLErrTStr.FailToConnectPlanner);
            } else if (err) {
                deferred.reject(JSON.stringify(err));
            } else {
                deferred.reject();
            }
        });
        return deferred.promise();
    }

    private _getQueryTableCols(allCols: SQLColumn[]) {
        const columns: {name: string, backName: string, type: ColumnType}[] = [];
        const colNameSet = new Set();
        for (let i = 0; i < allCols.length; i++) {
            if (colNameSet.has(allCols[i].colName)) {
                let k = 1;
                while (colNameSet.has(allCols[i].colName + "_" + k)) {
                    k++;
                }
                allCols[i].colName = allCols[i].colName + "_" + k;
            }
            colNameSet.add(allCols[i].colName);
            const colName = allCols[i].rename || allCols[i].colName;
            columns.push({name: allCols[i].colName,
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
            return PromiseHelper.resolve();
        }
        const funcName = sqlFunc[key].funcName;
        // list all functions and check if funcName is there
        if (!DagTabSQLFunc.hasFunc(funcName)) {
            return PromiseHelper.reject("Cannot find SQL function: " + funcName);
        }
        const deferred = PromiseHelper.deferred();
        const args = sqlFunc[key].arguments;
        const newIdentifier = sqlFunc[key].newTableName;
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
                return PromiseHelper.reject("Nested SQL functions not suppported");
                // XXX Not supported
                // const newSqlFunc = {identifier: arg[identifier]};
                // var promise = this._getSchemasAndQueriesFromSqlFuncs(newSqlFunc,
                //                                                      allQueries,
                //                                                      allSchemas,
                //                                                      visitedMap)
                //             .then((newTableName) => {
                //                 inputTableNames.push(newTableName)
                //             })
            }
        }
        const tempTab = DagTabSQLFunc.getFunc(funcName);
        let newTableName;
        tempTab.getQuery(inputTableNames)
        .then((queries, tableName) => {
            visitedMap[key] = tableName;
            newTableName = tableName;
            JSON.parse(queries).forEach((query) => {
                allQueries.push(JSON.stringify(query));
            })
            return tempTab.getSchema();
        })
        .then((columns) => {
            const tableColumns = []; // for sendSchema
            columns.forEach((column) => {
                const upperName = column.name.toUpperCase();
                const colStruct = {};
                colStruct[upperName] = column.type;
                tableColumns.push(colStruct);
            });
            const tableNameCol = {};
            tableNameCol["XC_TABLENAME_" + newTableName] = "string";
            tableColumns.push(tableNameCol);
            const schemaToSend: SQLSchema = {
                tableName: newIdentifier,
                tableColumns: tableColumns
            }
            allSchemas.push(schemaToSend);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public compileSQL(
        sqlQueryStr: string,
        queryId: string,
        identifiers?: Map<number, string>,
        sqlMode?: boolean
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const sqlCom = new SQLCompiler();
        const self = this;
        let schemaQueryString;
        let tableSrcMap;
        let sqlFuncs;
        let replacedSqlQuery;
        try {
            // paramterize SQL
            sqlQueryStr = xcHelper.replaceMsg(sqlQueryStr,
                                DagParamManager.Instance.getParamMap(), true);
            identifiers = identifiers || self.getIdentifiers();
            if (sqlMode) {
                const retStruct = XDParser.SqlParser.getSQLTableFunctions(sqlQueryStr);
                sqlFuncs = retStruct.sqlFunctions;
                replacedSqlQuery = retStruct.sqlQuery;
            }
            self.sendSchema(identifiers, sqlFuncs)
            .then(function(ret) {
                schemaQueryString = ret.queryString;
                tableSrcMap = ret.tableSrcMap
                self.setTableSrcMap(tableSrcMap);
                const sqlQueryToCompile = replacedSqlQuery || sqlQueryStr
                return sqlCom.compile(queryId, sqlQueryToCompile);
            })
            .then(function(queryString, newTableName, newCols) {
                self.setNewTableName(newTableName);
                self.setColumns(newCols);
                const optimizer = new SQLOptimizer();
                const optimizedQueryString = optimizer.logicalOptimize(queryString,
                                        {combineProjectWithSynthesize: true,
                                         dropAsYouGo: true}, schemaQueryString);
                self.setXcQueryString(optimizedQueryString);
                const retStruct = {
                    newTableName: newTableName,
                    xcQueryString: optimizedQueryString,
                    allCols: newCols,
                    tableSrcMap: tableSrcMap
                }
                self.updateSubGraph();
                deferred.resolve(retStruct);
            })
            .fail(function(errorMsg) {
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
                    }
                }
                deferred.reject();
            });
        } catch (e) {
            Alert.show({
                title: "Compilation Error",
                msg: "Error details: " + JSON.stringify(e),
                isAlert: true
            });
            deferred.reject();
        }
        return deferred.promise();
    }
}