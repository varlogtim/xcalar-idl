class DagNodeExecutor {
    /**
     * DagNodeExecutor.getTableNamePrefix
     * @param tabId
     */
    public static getTableNamePrefix(tabId: string): string {
        return "table_" + tabId;
    }

    private node: DagNode;
    private txId: number;
    private tabId: string;
    private replaceParam: boolean;

    public constructor(
        node: DagNode,
        txId: number,
        tabId: string,
        noReplaceParam: boolean = false
    ) {
        this.node = node;
        this.txId = txId;
        this.tabId = tabId;
        this.replaceParam = !noReplaceParam;
    }

    /**
     * run the node operation
     */
    public run(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNode =  this.node;
        const isSimulate: boolean = Transaction.isSimulate(this.txId);
        if (!isSimulate && !optimized) {
            node.beRunningState();
        }
        node.getParents().forEach((parent) => {
            const parentTableName = parent.getTable();
            DagTblManager.Instance.resetTable(parentTableName);
        });

        this._apiAdapter(optimized)
        .then((destTable) => {
            if (destTable != null) {
                node.setTable(destTable);
                DagTblManager.Instance.addTable(destTable);
            }
            if (!isSimulate && !optimized) {
                node.beCompleteState();
            }

            deferred.resolve(destTable);
        })
        .fail((error) => {
            let errorStr: string;
            if (error == null) {
                errorStr = ErrTStr.Unknown;
            } else if (typeof error === "string") {
                errorStr = error;
            } else if (typeof error === "object") {
                let nodeProp;
                if (error.node) {
                    nodeProp = error.node;
                    // stringifying node results in circular dependency
                    delete error.node;
                }
                errorStr = JSON.stringify(error);
                if (nodeProp) {
                    error.node = nodeProp;
                }
            } else {
                // should be invalid case
                errorStr = JSON.stringify(error);
            }
            node.beErrorState(errorStr);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _apiAdapter(optimized?: boolean): XDPromise<string | null> {
        const type: DagNodeType = this.node.getType();
        switch (type) {
            case DagNodeType.Dataset:
                return this._loadDataset(optimized);
            case DagNodeType.Aggregate:
                return this._aggregate(optimized);
            case DagNodeType.Filter:
                return this._filter();
            case DagNodeType.GroupBy:
                return this._groupby();
            case DagNodeType.Join:
                return this._join(optimized);
            case DagNodeType.Map:
                return this._map();
            case DagNodeType.Split:
                return this._map();
            case DagNodeType.Round:
                return this._map();
            case DagNodeType.Project:
                return this._project();
            case DagNodeType.Explode:
                return this._map();
            case DagNodeType.Set:
                return this._set();
            case DagNodeType.Export:
                return this._export(optimized);
            case DagNodeType.Custom:
                return this._custom(optimized);
            case DagNodeType.CustomInput:
                return this._customInput();
            case DagNodeType.CustomOutput:
                return this._customOutput();
            case DagNodeType.DFIn:
                return this._dfIn(optimized);
            case DagNodeType.DFOut:
                return this._dfOut();
            case DagNodeType.PublishIMD:
                return this._publishIMD();
            case DagNodeType.UpdateIMD:
                return this._updateIMD();
            case DagNodeType.Jupyter:
                return this._jupyter();
            case DagNodeType.Extension:
                return this._extension();
            case DagNodeType.IMDTable:
                return this._IMDTable();
            case DagNodeType.SQL:
                return this._sql();
            case DagNodeType.RowNum:
                return this._rowNum();
            case DagNodeType.Index:
                return this._index();
            case DagNodeType.Sort:
                return this._sort();
            case DagNodeType.Placeholder:
                return this._placeholder();
            case DagNodeType.Synthesize:
                return this._synthesize();
            default:
                throw new Error(type + " not supported!");
        }
    }

    private _getParentNodeTable(pos: number): string {
        const parentNode: DagNode = this.node.getParents()[pos];
        return parentNode.getTable();
    }

    private _generateTableName(): string {
        return DagNodeExecutor.getTableNamePrefix(this.tabId) +
        "_" + this.node.getId() + Authentication.getHashId();
    }

    private _loadDataset(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeDataset = <DagNodeDataset>this.node;
        const params: DagNodeDatasetInputStruct = node.getParam(this.replaceParam);
        const dsName: string = params.source;

        // XXX Note: have to do it because of a bug in call indexDataset through query
        // it didn't add the load lock and will cause a bug.
        // the lock is per each workbook
        // so XD need to maunally call it.
        PromiseHelper.alwaysResolve(this._activateDataset(dsName))
        .then(() => {
            if (params.synthesize === true) {
                const schema: ColSchema[] = node.getSchema();
                return this._synthesizeDataset(dsName, schema);
            } else {
                if (optimized && Transaction.isSimulate(this.txId)) {
                    try {
                        const loadArg = JSON.parse(node.getLoadArgs());
                        Transaction.log(this.txId, JSON.stringify(loadArg), null, 0);
                    } catch (e) {
                        return PromiseHelper.reject({
                            error: "Prase load args error",
                            defail: e.message
                        });
                    }
                }
                const prefix: string = params.prefix;
                return this._indexDataset(dsName, prefix);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _activateDataset(dsName): XDPromise<void> {
        if (typeof DS !== "undefined") {
            return DS.activate([dsName], true);
        } else {
            return XcalarDatasetActivate(dsName);
        }
    }

    private _indexDataset(dsName: string, prefix: string): XDPromise<string> {
        const desTable = this._generateTableName();
        return XIApi.indexFromDataset(this.txId, dsName, desTable, prefix);
    }

    private _synthesizeDataset(
        dsName: string,
        schema: ColSchema[]
    ): XDPromise<string> {
        const desTable = this._generateTableName();
        const colInfos: ColRenameInfo[] = schema.map((colInfo) => {
            const type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(colInfo.type);
            const name: string = colInfo.name;
            return xcHelper.getJoinRenameMap(name, name, type);
        });
        // TODO: XXX parseDS should not be called here
        dsName = parseDS(dsName);
        return XIApi.synthesize(this.txId, colInfos, dsName, desTable);
    }

    private _synthesize(): XDPromise<string> {
        const node: DagNodeSynthesize = <DagNodeSynthesize>this.node;
        const params: DagNodeSynthesizeInputStruct = node.getParam(this.replaceParam);
        const colsInfo: ColRenameInfo[] = params.colsInfo.map((colInfo) => {
            return xcHelper.getJoinRenameMap(colInfo.sourceColumn,
                                             colInfo.destColumn,
                                             DfFieldTypeTFromStr[colInfo.columnType]);
        });
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.synthesize(this.txId, colsInfo, srcTable, desTable);
    }

    private _aggregate(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeAggregate = <DagNodeAggregate>this.node;
        const params: DagNodeAggregateInputStruct = node.getParam(this.replaceParam);
        const evalStr: string = params.evalString;
        const tableName: string = this._getParentNodeTable(0);
        let dstAggName: string = params.dest;
        if (dstAggName.startsWith(gAggVarPrefix)) {
            dstAggName = dstAggName.substring(1);
        }
        XIApi.aggregateWithEvalStr(this.txId, evalStr, tableName, dstAggName)
        .then((value, aggName) => {
            node.setAggVal(value);
            if (!optimized) {
                const aggRes: object = {
                    value: value,
                    dagName: aggName,
                    aggName: "\^" + aggName,
                    tableId: tableName,
                    backColName: null,
                    op: null,
                    node: node.getId(),
                    graph: this.tabId
                };
                return DagAggManager.Instance.addAgg("\^" + aggName, aggRes);
            }
            return PromiseHelper.resolve();
        })
        .then(() => {
            deferred.resolve(null); // no table generated
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _filter(): XDPromise<string> {
        const node: DagNodeFilter = <DagNodeFilter>this.node;
        const params: DagNodeFilterInputStruct = node.getParam(this.replaceParam);
        const fltStr: string = params.evalString;
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.filter(this.txId, fltStr, srcTable, desTable);
    }

    private _groupby(): XDPromise<string> {
        const node: DagNodeGroupBy = <DagNodeGroupBy>this.node;
        const params: DagNodeGroupByInputStruct = node.getParam(this.replaceParam);
        const srcTable: string = this._getParentNodeTable(0);
        const aggArgs: AggColInfo[] = params.aggregate.map((aggInfo) => {
            return {
                operator: aggInfo.operator,
                aggColName: aggInfo.sourceColumn,
                newColName: aggInfo.destColumn,
                isDistinct: aggInfo.distinct
            }
        });
        const newKeys: string[] = node.updateNewKeys(params.newKeys);
        const options: GroupByOptions = {
            newTableName: this._generateTableName(),
            isIncSample: params.includeSample,
            icvMode: params.icv,
            groupAll: params.groupAll,
            newKeys: newKeys,
            dhtName: params.dhtName
        };
        return XIApi.groupBy(this.txId, aggArgs, params.groupBy, srcTable, options);
    }

    private _join(optimized?: boolean): XDPromise<string> {
        const node: DagNodeJoin = <DagNodeJoin>this.node;
        const params: DagNodeJoinInputStruct = node.getParam(this.replaceParam);
        // Sanity check
        for (const parent of node.getParents()) {
            if (parent == null || parent.getLineage() == null) {
                return PromiseHelper.reject('Lineage is broken');
            }
        }

        // convert joinType
        let joinType: JoinType = null;
        for (let key in JoinOperatorTFromStr) {
            if (key.toLowerCase() === params.joinType.toLowerCase()) {
                joinType = <JoinType>JoinOperatorTFromStr[key];
                break;
            }
        }
        joinType = (joinType == null) ? <JoinType>params.joinType : joinType;
        const parents: DagNode[] = node.getParents();
        const lTableInfo: JoinTableInfo = this._joinInfoConverter(
            params.left,
            parents[0],
            { keepAllColumns: params.keepAllColumns, isOptimizedMode: optimized });
        const rTableInfo: JoinTableInfo = this._joinInfoConverter(
            params.right,
            parents[1],
            { keepAllColumns: params.keepAllColumns, isOptimizedMode: optimized });
        const options: JoinOptions = {
            newTableName: this._generateTableName(),
            evalString: params.evalString,
            keepAllColumns: params.keepAllColumns
        };
        return XIApi.join(this.txId, joinType, lTableInfo, rTableInfo, options);
    }

    private _joinInfoConverter(
        joinTableInfo: DagNodeJoinTableInput,
        parentNode: DagNode,
        options?: { keepAllColumns?: boolean, isOptimizedMode?: boolean }
    ): JoinTableInfo {
        // XXX not implemented yet
        console.error("getting immeidates not implement yet!");
        const allImmediates: string[] = parentNode.getLineage().getDerivedColumns();
        const { keepAllColumns = true, isOptimizedMode = false } = options || {};
        let rename: ColRenameInfo[];
        if (keepAllColumns) {
            if (isOptimizedMode) {
                // In optimized DF execution, backend acts as if the keepAllColumns == false
                // So we have to fill the rename list with all the columns
                const colNamesToKeep = parentNode.getLineage()
                    .getColumns().map((col) => col.getBackColName());
                rename = this._joinRenameConverter(colNamesToKeep, joinTableInfo.rename);

            } else {
                // In non-optimized DF execution, backend will honor the keepAllColumns flag
                // So we just need to specify the columns must to be renamed(due to name conflicting)
                rename = joinTableInfo.rename.map((rename) => {
                    return {
                        orig: rename.sourceColumn,
                        new: rename.destColumn,
                        type: rename.prefix ? DfFieldTypeT.DfFatptr : DfFieldTypeT.DfUnknown
                    }
                });
            }
        } else {
            // Columns to keep = selected columns + joinOn columns
            const colNamesToKeep = joinTableInfo.columns.concat(joinTableInfo.keepColumns);
            rename = this._joinRenameConverter(colNamesToKeep, joinTableInfo.rename);
        }
        return {
            tableName: parentNode.getTable(),
            columns: joinTableInfo.columns,
            // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
            // casts: joinTableInfo.casts,
            casts: null,
            rename: rename,
            allImmediates: allImmediates
        }
    }

    private _joinRenameConverter(
        colNamesToKeep: string[],
        renameInput: { sourceColumn: string, destColumn: string, prefix: boolean }[]
    ): ColRenameInfo[] {
        // Convert rename list => map, for fast lookup
        const colRenameMap: Map<string, string> = new Map();
        const prefixRenameMap: Map<string, string> = new Map();
        renameInput.forEach(({ prefix, sourceColumn, destColumn }) => {
            if (prefix) {
                prefixRenameMap.set(sourceColumn, destColumn);
            } else {
                colRenameMap.set(sourceColumn, destColumn);
            }
        });

        // Apply rename to the columns need to keep
        const prefixSet: Set<string> = new Set();
        const rename = [];
        for (const colName of colNamesToKeep) {
            const parsed = xcHelper.parsePrefixColName(colName);
            if (parsed.prefix.length > 0) {
                // Prefixed column: put the prefix in the rename list
                const oldPrefix = parsed.prefix;
                if (prefixSet.has(oldPrefix)) {
                    continue; // This prefix has already been renamed
                }
                prefixSet.add(oldPrefix);
                const newPrefix = prefixRenameMap.get(oldPrefix) || oldPrefix;
                rename.push({
                    orig: oldPrefix, new: newPrefix, type: DfFieldTypeT.DfFatptr
                });
            } else {
                // Derived column: put column name in the rename list
                const newName = colRenameMap.get(colName) || colName;
                rename.push({
                    orig: colName, new: newName, type: DfFieldTypeT.DfUnknown
                });
            }
        }

        return rename;
    }

    private _map(): XDPromise<string> {
        const node: DagNodeMap = <DagNodeMap>this.node;
        const params: DagNodeMapInputStruct = node.getParam(this.replaceParam);
        const mapStrs: string[] = [];
        const newFields: string[] = [];

        params.eval.forEach((item) => {
            mapStrs.push(item.evalString);
            newFields.push(item.newField);
        });

        const aggregates: string[] = node.getAggregates();
        for (let i = 0; i < aggregates.length; i++) {
            let agg = aggregates[i];
            if (!DagAggManager.Instance.hasAggregate(agg)) {
                return PromiseHelper.reject("Aggregate " + agg + " does not exist.");
            }
            if (DagAggManager.Instance.getAgg(agg).value == null) {
                return PromiseHelper.reject("Aggregate " + agg + "has not been run.");
            }
        }

        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        const isIcv: boolean = params.icv;

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XIApi.map(this.txId, mapStrs, srcTable, newFields, desTable, isIcv)
        .then((tableAfterMap) => {
            if (node.getSubType() === DagNodeSubType.Cast) {
                return this._projectCheck(tableAfterMap);
            } else {
                return PromiseHelper.resolve(tableAfterMap);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _projectCheck(srcTable: string): XDPromise<string> {
        const node: DagNode = this.node;
        const prefixColumns: string[] = node.getLineage().getPrefixColumns();
        let prefixColumnsInParent: string[] = [];
        node.getParents().forEach((parentNode) => {
            prefixColumnsInParent = prefixColumnsInParent.concat(parentNode.getLineage().getPrefixColumns());
        });
        if (prefixColumnsInParent.length !== 0 && prefixColumns.length === 0) {
            // when before the op it has prefix, after the op it doesn't
            // which means all fatptr are "hidden", need to do a synthesize
            const columns: string[] = node.getLineage().getDerivedColumns();
            const destTable: string = this._generateTableName();
            return XIApi.project(this.txId,columns, srcTable, destTable);
        } else {
            return PromiseHelper.resolve(srcTable);
        }
    }

    private _project(): XDPromise<string> {
        const node: DagNodeProject = <DagNodeProject>this.node;
        const params: DagNodeProjectInputStruct = node.getParam(this.replaceParam);
        const srcTable: string = this._getParentNodeTable(0);
        const destTable: string = this._generateTableName();
        return XIApi.project(this.txId, params.columns, srcTable, destTable);
    }

    private _set(): XDPromise<string> {
        const node: DagNodeSet = <DagNodeSet>this.node;
        const params: DagNodeSetInputStruct = node.getParam(this.replaceParam);
        const unionType: UnionOperatorT = this._getUnionType(node.getSubType());
        const desTable: string = this._generateTableName();
        const tableInfos: UnionTableInfo[] = params.columns.map((colInfo, index) => {
            const columns: UnionColInfo[] = colInfo.map((col) => {
                const name: string = col.sourceColumn;
                let cast: boolean = col.cast;
                if (!cast && name != null) {
                    const prefix = xcHelper.parsePrefixColName(name).prefix;
                    // prefix column must cast
                    cast = (prefix ? true : false);
                }
                return {
                    name: name,
                    rename: col.destColumn,
                    type: col.columnType,
                    cast: cast
                }
            });

            return {
                tableName: this._getParentNodeTable(index),
                columns: columns
            }
        });

        return XIApi.union(this.txId, tableInfos, params.dedup, desTable, unionType);
    }

    private _custom(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeCustom = <DagNodeCustom>this.node;
        const isSimulate: boolean = Transaction.isSimulate(this.txId);

        if (isSimulate) { // In batch mode
            // Clone the custom node to avoid unexpected behavior
            // We dont use DagGraph.clone, because DagNodeCustom.clone() can create DagNodeCustomInput correctly.
            // Specificly, DagNodeCustomInput.setContainer() must be called during clone
            const clonedNode = <DagNodeCustom>node.clone();

            // DagNodeCustomInput relies on DagNodeCustom.getParents() to find the upstream node
            // So we have to link the cloned node to its parents
            node.getParents().forEach((parent, index) => {
                if (parent != null) {
                    clonedNode.connectToParent(parent, index);
                }
            });
            const clonedGraph = clonedNode.getSubGraph();

            // Execute the subGraph in batch mode
            let destTable;
            clonedGraph.getQuery(null, optimized, false)
            .then((query, tables) => {
                tables = tables || [];
                destTable = tables[tables.length - 1];
                return XIApi.query(this.txId, destTable, query);
            })
            .then(() => {
                deferred.resolve(destTable);
            })
            .fail(deferred.reject)
            .always(() => {
                // Cleanup connections of cloned node to prevent memleak
                node.getParents().forEach((parent, index) => {
                    if (parent != null) {
                        clonedNode.disconnectFromParent(parent, index);
                    }
                });
            });
        } else {
            node.getSubGraph().execute(null, optimized, this.txId)
            .then(() => {
                deferred.resolve((node.getTable()));
            })
            .fail((error) => {
                deferred.reject(error);
            });
        }

        return deferred.promise();
    }

    private _customInput(): XDPromise<string> {
        const node: DagNodeCustomInput = <DagNodeCustomInput>this.node;
        const customNode: DagNodeCustom = node.getContainer();
        if (customNode == null) {
            return PromiseHelper.reject('CustomInput has no container');
        }
        const inputParent =  customNode.getInputParent(node);
        if (inputParent == null) {
            return PromiseHelper.reject('CustomInput has no corresponding parent');
        }
        return PromiseHelper.resolve(inputParent.getTable());
}

    private _customOutput(): XDPromise<string> {
        const outputParent = this.node.getParents()[0];
        if (outputParent == null) {
            return PromiseHelper.resolve(null);
        }
        return PromiseHelper.resolve(outputParent.getTable());
    }

    private _getUnionType(setSubType: DagNodeSubType): UnionOperatorT {
        switch (setSubType) {
            case (DagNodeSubType.Except):
                return UnionOperatorT.UnionExcept;
            case (DagNodeSubType.Intersect):
                return UnionOperatorT.UnionIntersect;
            case (DagNodeSubType.Union):
                return UnionOperatorT.UnionStandard;
            default:
                throw new Error("Set Type " + setSubType + " not supported");
        }
    }

    private _export(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeExport = <DagNodeExport>this.node;
        const exportInput: DagNodeExportInputStruct = node.getParam(this.replaceParam);
        const columns: string[] = exportInput.columns;
        const progCols: ProgCol[] = node.getParents()[0].getLineage().getColumns();
        const backCols: string[] = columns.map((name) => {
            let col: ProgCol = progCols.find((col: ProgCol) => {
                return col.name == name || col.getBackColName() == name;
            })
            if (col == null) {
                return name;
            } else {
                return col.getBackColName();
            }
        });
        if (backCols.length != columns.length) {
            throw new Error("Could not export, columns are missing.");
        }
        const driverColumns: XcalarApiExportColumnT[] = columns.map((_e,i) => {
            let col = new XcalarApiExportColumnT();
            col.headerName = columns[i];
            col.columnName = backCols[i];
            return col;
        });
        const driverName: string = exportInput.driver;
        let driverParams = exportInput.driverArgs;
        const srcTable: string = this._getParentNodeTable(0);
        let exportName: string;
        if (optimized) {
            exportName = gXcalarApiLrqExportPrefix + srcTable;
        } else {
            exportName = this._generateTableName();
        }

        XIApi.exportTable(this.txId, srcTable, driverName, driverParams, driverColumns, exportName)
        .then(() => {
            if (optimized) {
                deferred.resolve(srcTable);
            } else {
                deferred.resolve(null); // no table generated
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _dfIn(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        try {
            const node: DagNodeDFIn = <DagNodeDFIn>this.node;
            const res = node.getLinkedNodeAndGraph();
            const graph: DagGraph = res.graph;
            const linkOutNode: DagNodeDFOut = res.node;
            if (linkOutNode.shouldLinkAfterExecuition()) {
                return this._linkWithExecution(graph, linkOutNode, optimized);
            } else {
                return this._linkWithBatch(graph, linkOutNode, optimized);
            }
        } catch (e) {
            console.error("execute error", e);
            deferred.reject({
                error: e.message
            });
        }

        return deferred.promise();
    }

    private _linkWithExecution(
        graph: DagGraph,
        node: DagNodeDFOut,
        optimized?: boolean
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        if (optimized && node.getTable()) {
            const desTable = this._generateTableName();
            const sourceTable = node.getTable();
            // sameSession must be set to false
            XIApi.synthesize(this.txId, [], sourceTable, desTable, false)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            // no need to execute graph if dfOut node has table
            let promise;
            if (node.getState() !== DagNodeState.Complete ||
                !DagTblManager.Instance.hasTable(node.getTable())) {
                // XXX check why node may not be complete or have table
                promise = graph.execute([node.getId()])
            } else {
                promise = PromiseHelper.resolve();
            }
            promise
            .then(() => {
                const destTable: string = node.getTable();
                deferred.resolve(destTable);
            })
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    // creates a new query from the linkOut's ancestors and runs it
    private _linkWithBatch(graph: DagGraph, node: DagNodeDFOut, optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let destTable: string;
        graph.getQuery(node.getId(), optimized)
        .then((query, tables) => {
            if ("object" == typeof tables) {
                // get the last dest table
                destTable = tables[tables.length - 1];
            }
            return XIApi.query(this.txId, destTable, query);
        })
        .then(() => {
            if (node.getSubType() === DagNodeSubType.DFOutOptimized) {
                return this._synthesizeDFOutInBatch(destTable, node);
            } else {
                return PromiseHelper.resolve(destTable);
            }
        })
        .then((finaTable: string) => {
            deferred.resolve(finaTable);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // optimized link out run a retina which will synthesize the table
    // here we do the equavilent thing for the link in batch mode
    private _synthesizeDFOutInBatch(
        srcTable: string,
        node: DagNodeDFOut
    ): XDPromise<string> {
        // what the linkOutOptimized node store is the schema after synthesize
        // which is destColName and colType
        const colMap: Map<string, ColumnType> = new Map();
        node.getLineage().getColumns().forEach((progCol) => {
            colMap.set(progCol.getBackColName(), progCol.getType());
        });

        const columns: {sourceName: string, destName: string}[] = node.getParam().columns;
        const colsInfo: ColRenameInfo[] = columns.map((colInfo) => {
            const sourceName: string = colInfo.sourceName;
            const destName: string = colInfo.destName;
            const columnType: ColumnType = colMap.get(destName);
            const type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(columnType);
            return xcHelper.getJoinRenameMap(sourceName, destName, type);
        });
        const desTable: string = this._generateTableName();
        return XIApi.synthesize(this.txId, colsInfo, srcTable, desTable);
    }

    // XXX TODO: if it's linkAfterExecution, lock the table
    // and unlock when reset
    private _dfOut(): XDPromise<null> {
        const node: DagNodeDFOut = <DagNodeDFOut>this.node;
        let destTable: string = null;
        if (node.getNumParent() === 1) {
            destTable = node.getParents()[0].getTable();
        }
        return PromiseHelper.resolve(destTable);
    }

    private _publishIMD(): XDPromise<string> {
        const node: DagNodePublishIMD = <DagNodePublishIMD>this.node;
        const params: DagNodePublishIMDInputStruct = node.getParam(this.replaceParam);
        let columns: ProgCol[] = node.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0] || [];
        let colInfo: ColRenameInfo[] = xcHelper.createColInfo(columns);
        return XIApi.publishTable(this.txId, params.primaryKeys,
            this._getParentNodeTable(0), params.pubTableName,
            colInfo, params.operator);
    }

    private _updateIMD(): XDPromise<string> {
        const node: DagNodeUpdateIMD = <DagNodeUpdateIMD>this.node;
        const params: DagNodeUpdateIMDInputStruct = node.getParam(this.replaceParam);
        let columns: ProgCol[] = node.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0] || [];
        let colInfo: ColRenameInfo[] = xcHelper.createColInfo(columns);
        return XIApi.updatePubTable(this.txId, this._getParentNodeTable(0),
            params.pubTableName, colInfo, params.operator);
    }

    private _extension(): XDPromise<string> {
        try {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            const node: DagNodeExtension = <DagNodeExtension>this.node;
            const params: DagNodeExtensionInputStruct = node.getConvertedParam();
            let finaTable: string;
            ExtensionManager.triggerFromDF(params.moduleName, params.functName, params.args)
            .then((resTable, query) => {
                finaTable = resTable;
                return XIApi.query(this.txId, finaTable, query);
            })
            .then(() => {
                deferred.resolve(finaTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject({
                error: e.message
            });
        }
    }

    private _IMDTable(): XDPromise<string> {
        const self = this;
        const node: DagNodeIMDTable = <DagNodeIMDTable>this.node;
        const params: DagNodeIMDTableInputStruct = node.getParam(this.replaceParam);
        //XXX TODO: Integrate with new XIAPI.publishTable
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const newTableName = this._generateTableName();
        let cols: RefreshColInfo[] = params.schema.map((col: ColSchema) => {
            return {
                sourceColumn: col.name,
                destColumn: col.name,
                columnType: DfFieldTypeTStr[xcHelper.convertColTypeToFieldType(col.type)]
            };
        })
        PromiseHelper.alwaysResolve(XcalarRestoreTable(params.source))
        .then(() => {
            return XcalarRefreshTable(params.source, newTableName,
                -1, params.version, self.txId, params.filterString,
                cols);
        })
        .then(() => {
            return deferred.resolve(newTableName);
        })
        .fail(function(err) {
            return deferred.reject(err);
        });
        return deferred.promise();
    }

    private _jupyter(): XDPromise<string> {
        const node: DagNodeJupyter = <DagNodeJupyter>this.node;
        const params: DagNodeJupyterInputStruct = node.getParam();
        const colMap: Map<string, ProgCol> = new Map();
        for (const colInfo of node.getParents()[0].getLineage().getColumns()) {
            colMap.set(colInfo.getBackColName(), colInfo);
        }

        // Prepare parameters for synthesize API call
        const colRenames: ColRenameInfo[] = [];
        for (const { sourceColumn, destColumn } of params.renames) {
            if (!colMap.has(sourceColumn)) {
                return PromiseHelper.reject(`Source column ${sourceColumn} doesn't exist`);
            }
            const sourceColType = colMap.get(sourceColumn).getType();
            colRenames.push({
                orig: sourceColumn,
                new: destColumn,
                type: xcHelper.convertColTypeToFieldType(sourceColType)
            });
        }

        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();

        return XIApi.synthesize(this.txId, colRenames, srcTable, desTable);
    }

    private _rowNum(): XDPromise<string> {
        const node: DagNodeRowNum = <DagNodeRowNum>this.node;
        const params: DagNodeRowNumInputStruct = node.getParam();
        const newField: string = params.newField;
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.genRowNum(this.txId, srcTable, newField, desTable);
    }

    private _index(): XDPromise<string> {
        const colNames: string[] = [];
        const newKeys: string[] = [];
        const node: DagNodeIndex = <DagNodeIndex>this.node;
        const params: DagNodeIndexInputStruct = node.getParam();
        // XXX Need to be fixed when DagNodeIndexInputStruct is fixed
        const columns = params.columns;
        columns.forEach((column) => {
            colNames.push(column["name"]);
            newKeys.push(column["keyFieldName"]);
        })
        const srcTable: string = this._getParentNodeTable(0);
        return XIApi.index(this.txId, colNames, srcTable, undefined, newKeys, params.dhtName);
    }

    private _sort(): XDPromise<string> {
        const node: DagNodeSort = <DagNodeSort>this.node;
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        const params: DagNodeSortInputStruct = node.getParam(this.replaceParam);
        const progCols: ProgCol[] = node.getParents()[0].getLineage().getColumns();

        const sortedColumns = params.columns.map((column) => {
            const name = column.columnName;
            const progCol = progCols.find((col: ProgCol) => {
                return col.name == name || col.getBackColName() == name;
            });
            let type;
            if (progCol) {
                type = xcHelper.convertColTypeToFieldType(progCol.getType());
            } else {
                type = DfFieldTypeT.DfUnknown;
            }
            type = null;

            return {
                name: name,
                ordering: XcalarOrderingTFromStr[column.ordering],
                type: type
            };
        });

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XIApi.sort(this.txId, sortedColumns, srcTable, desTable)
        .then((tableAfterSort) => {
            return this._projectCheck(tableAfterSort);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _placeholder(): XDPromise<string> {
        return PromiseHelper.resolve();
    }

    private _sql(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const self = this;
        const node: DagNodeSQL = <DagNodeSQL>self.node;
        const params: DagNodeSQLInputStruct = node.getParam(self.replaceParam);
        if (!params.sqlQueryStr) {
            return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
        }

        const queryId = xcHelper.randName("sqlQuery", 8);
        let xcQueryString = node.getXcQueryString();
        let promise: XDPromise<any> = PromiseHelper.resolve({xcQueryString: xcQueryString});
        if (!xcQueryString) {
            promise = node.compileSQL(params.sqlQueryStr, queryId);
        }
        const newDestTableName = self._generateTableName();
        const queryObj = {
            queryId: queryId,
            queryString: params.sqlQueryStr
        };
        promise
        .then(function(ret) {
            const replaceMap = {};
            node.getParents().forEach((parent, idx) => {
                const newTableName = parent.getTable();
                replaceMap[idx + 1] = newTableName;
            });
            const oldDestTableName = node.getNewTableName();
            const replaceRetStruct = self._replaceSQLTableName(ret.xcQueryString,
                                                        node.getTableSrcMap(),
                                                        replaceMap,
                                                        oldDestTableName,
                                                        newDestTableName);
            node.setTableSrcMap(replaceRetStruct.newTableSrcMap);
            node.setXcQueryString(replaceRetStruct.newQueryStr);
            node.setNewTableName(newDestTableName);
            node.updateSubGraph(replaceRetStruct.newTableMap);
            const queryNodes = JSON.parse(replaceRetStruct.newQueryStr);
            node.getSubGraph().startExecution(queryNodes, null);
            // Might need to make it configurable
            const options = {
                jdbcCheckTime: 500
            };
            // Set status to Running
            queryObj["status"] = SQLStatus.Running;
            queryObj["startTime"] = new Date();
            SqlQueryHistoryPanel.Card.getInstance().update(queryObj);
            return XIApi.query(self.txId, queryId, replaceRetStruct.newQueryStr,
                                                                       options);
        })
        .then(function(res) {
            // Set status to Done
            queryObj["status"] = SQLStatus.Done;
            queryObj["endTime"] = new Date();
            SqlQueryHistoryPanel.Card.getInstance().update(queryObj);
            deferred.resolve(newDestTableName, res);
        })
        .fail(function(error) {
            queryObj["endTime"] = new Date();
            if (error === SQLErrTStr.Cancel) {
                queryObj["status"] = SQLStatus.Cancelled;
            } else {
                queryObj["status"] = SQLStatus.Failed;
                queryObj["errorMsg"] = JSON.stringify(error);
            }
            // Set status to Cancelled or Failed
            SqlQueryHistoryPanel.Card.getInstance().update(queryObj);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    /**
     * Since fake table names are created by compiler, we need to replace all of
     * them before execution
     * @param queryStr  xcalar query string
     * @param tableSrcMap   {compilerTableName: sourceId}
     * @param replaceMap    {sourceId: newParentTableName}
     * @param oldDestTableName  destTableName created by compiler
     * @param newDestTableName  new destTableName
     */
    private _replaceSQLTableName(
        queryStr: string,
        tableSrcMap: {},
        replaceMap: {},
        oldDestTableName: string,
        newDestTableName: string
    ): {newQueryStr: string,
        newTableSrcMap: {},
        newTableMap: {}} {
        const queryStruct = JSON.parse(queryStr);
        const newTableMap = {};
        const newTableSrcMap = {};
        queryStruct.forEach((operation) => {
            if (!operation.args.source || !operation.args.dest) {
                const namePattern = operation.args.namePattern;
                if (namePattern && newTableMap[namePattern]) {
                    operation.args.namePattern = newTableMap[namePattern];
                }
                return;
            }
            let source = operation.args.source;
            // source replacement
            if (typeof source === "string") {
                source = [source];
            }
            for (let i = 0; i < source.length; i++) {
                if (!source[i].startsWith("XC_AGG_") &&
                    !source[i].startsWith("XC_SUBQ_")) {
                    if (!newTableMap[source[i]]) {
                        const idx = tableSrcMap[source[i]];
                        if (idx) {
                            newTableMap[source[i]] = replaceMap[idx];
                            newTableSrcMap[replaceMap[idx]] = idx;
                        } else {
                            newTableMap[source[i]] = this._generateTableName();
                        }
                    }
                    source[i] = newTableMap[source[i]];
                }
            }
            if (source.length === 1) {
                operation.args.source = source[0];
            } else {
                operation.args.source = source;
            }
            // dest replacement
            if (operation.args.dest === oldDestTableName) {
                operation.args.dest = newDestTableName;
            } else if (!operation.args.dest.startsWith("XC_AGG_") &&
                       !operation.args.dest.startsWith("XC_SUBQ_")) {
                if (!newTableMap[operation.args.dest]) {
                    newTableMap[operation.args.dest] = this._generateTableName();
                }
                operation.args.dest = newTableMap[operation.args.dest];
            }
        });
        return {newQueryStr: JSON.stringify(queryStruct),
                newTableSrcMap: newTableSrcMap,
                newTableMap: newTableMap};
    }
}