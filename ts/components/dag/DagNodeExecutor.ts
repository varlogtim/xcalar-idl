class DagNodeExecutor {
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
            if (typeof error === "string") {
                errorStr = error;
            } else {
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
                return this._aggregate();
            case DagNodeType.Filter:
                return this._filter();
            case DagNodeType.GroupBy:
                return this._groupby();
            case DagNodeType.Join:
                return this._join();
            case DagNodeType.Map:
                return this._map();
            case DagNodeType.Split:
                return this._split();
            case DagNodeType.Round:
                return this._round();
            case DagNodeType.Project:
                return this._project();
            case DagNodeType.Explode:
                return this._explode();
            case DagNodeType.Set:
                return this._set();
            case DagNodeType.Export:
                return this._export();
            case DagNodeType.Custom:
                return this._custom();
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
            default:
                throw new Error(type + " not supported!");
        }
    }

    private _getParentNodeTable(pos: number): string {
        const parentNode: DagNode = this.node.getParents()[pos];
        return parentNode.getTable();
    }

    private _generateTableName(): string {
        return "table_" + this.tabId + "_" + this.node.getId() + Authentication.getHashId();
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
        PromiseHelper.alwaysResolve(XcalarDatasetActivate(dsName))
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
                            defail: e
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

    private _aggregate(): XDPromise<string> {
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
        .then((value, aggName, toDelete) => {
            node.setAggVal(value);
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
        const options: GroupByOptions = {
            newTableName: this._generateTableName(),
            isIncSample: params.includeSample,
            icvMode: params.icv,
            groupAll: params.groupAll,
            newKeys: params.newKeys,
            dhtName: params.dhtName
        };
        return XIApi.groupBy(this.txId, aggArgs, params.groupBy, srcTable, options);
    }

    private _join(): XDPromise<string> {
        const node: DagNodeJoin = <DagNodeJoin>this.node;
        const params: DagNodeJoinInputStruct = node.getParam(this.replaceParam);
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
        const lTableInfo: JoinTableInfo = this._joinInfoConverter(params.left, parents[0]);
        const rTableInfo: JoinTableInfo = this._joinInfoConverter(params.right, parents[1]);
        const options: JoinOptions = {
            newTableName: this._generateTableName(),
            evalString: params.evalString
        };
        return XIApi.join(this.txId, joinType, lTableInfo, rTableInfo, options);
    }

    private _joinInfoConverter(
        joinTableInfo: DagNodeJoinTableInput,
        parentNode: DagNode
    ): JoinTableInfo {
        // XXX not implemented yet
        console.error("getting immeidates not implement yet!");
        const allImmediates: string[] = parentNode.getLineage().getDerivedColumns();
        const rename: ColRenameInfo[] = joinTableInfo.rename.map((rename) => {
            return {
                orig: rename.sourceColumn,
                new: rename.destColumn,
                type: rename.prefix ? DfFieldTypeT.DfFatptr : DfFieldTypeT.DfUnknown
            }
        });
        return {
            tableName: parentNode.getTable(),
            columns: joinTableInfo.columns,
            casts: joinTableInfo.casts,
            rename: rename,
            allImmediates: allImmediates
        }
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

    private _split(): XDPromise<string> {
        const {
            source: colToSplit, delimiter, dest: toCols
        } = <DagNodeSplitInputStruct>this.node.getParam(this.replaceParam);
        const delimStr = delimiter.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        const srcTable = this._getParentNodeTable(0);
        const destTable = this._generateTableName();

        if (toCols.length === 0) {
            return PromiseHelper.reject('New column name not specified');
        }

        // Split column with map(cut)
        const newFields: string[] = [];
        const mapStrs: string[] = [];
        for (let i = 0; i < toCols.length; i ++) {
            mapStrs.push(`cut(${colToSplit}, ${i + 1}, "${delimStr}")`);
            newFields.push(toCols[i]);
        }
        return XIApi.map(this.txId, mapStrs, srcTable, newFields, destTable, false);
    }

    private _round(): XDPromise<string> {
        const { sourceColumn, numDecimals, destColumn } = this.node.getParam();
        const srcTable = this._getParentNodeTable(0);
        const destTable = this._generateTableName();

        let sourceColType = null;
        for (const col of this.node.getParents()[0].getLineage().getColumns()) {
            if (col.getBackColName() == sourceColumn) {
                sourceColType = col.getType();
                break;
            }
        }
        if (sourceColType == null) {
            return PromiseHelper.reject(`SourceColumn ${sourceColumn} not found`);
        }

        const evalSource = sourceColType === ColumnType.float
            ? sourceColumn
            : `float(${sourceColumn})`;
        const evalStr = `round(${evalSource},${numDecimals})`;
        return XIApi.map(this.txId, [evalStr], srcTable, [destColumn], destTable, false);
    }

    private _explode(): XDPromise<string> {
        const { sourceColumn, delimiter, destColumn } = this.node.getParam();
        const delimStr = delimiter.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        const srcTable = this._getParentNodeTable(0);
        const destTable = this._generateTableName();

        const evalStr = `explodeString(${sourceColumn},"${delimStr}")`;
        return XIApi.map(this.txId, [evalStr], srcTable, [destColumn], destTable, false);
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

    private _custom(): XDPromise<null> {
        const deferred: XDDeferred<null> = PromiseHelper.deferred();
        const node: DagNodeCustom = <DagNodeCustom>this.node;

        node.getSubGraph().execute()
        .then(() => {
            // DagNodeCustom.getTable() is overridden to return output node's table
            // So we don't need a table name here
            deferred.resolve(null);
        })
        .fail((error) => {
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _customInput(): XDPromise<null> {
        // DagNodeCustomInput.getTable() is orverridden to return input parent's table
        // So we don't need a table name here
        return PromiseHelper.resolve(null);
    }

    private _customOutput(): XDPromise<null> {
        // DagNodeCustomOutput.getTable() is orverridden to return output parent's table
        // So we don't need a table name here
        return PromiseHelper.resolve(null);
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

    private _export(): XDPromise<null> {
        const deferred: XDDeferred<null> = PromiseHelper.deferred();
        const node: DagNodeExport = <DagNodeExport>this.node;
        const exportInput: DagNodeExportInputStruct = node.getParam(this.replaceParam);
        const columns: string[] = exportInput.columns;
        const progCols: ProgCol[] = node.getParents()[0].getLineage().getColumns();
        const backCols: string[] = columns.map((name) => {
            return progCols.find((col: ProgCol) => {
                return col.name == name || col.getBackColName() == name;
            }).getBackColName();
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
        const exportName: string = this._generateTableName();
        XIApi.exportTable(this.txId, srcTable, driverName, driverParams, driverColumns, exportName)
        .then(() => {
            deferred.resolve(null); // no table generated
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _dfIn(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        try {
            const node: DagNodeDFIn = <DagNodeDFIn>this.node;
            const res = node.getLinedNodeAndGraph();
            const graph: DagGraph = res.graph;
            const linkOutNode: DagNodeDFOut = res.node;
            if (linkOutNode.shouldLinkAfterExecuition()) {
                return this._linkWithExecution(graph, linkOutNode, optimized);
            } else {
                return this._linkWithBatch(graph, linkOutNode, optimized);
            }
        } catch (e) {
            console.error("execute error", e);
            deferred.reject(e);
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
        .then((query, table) => {
            destTable = table;
            return XIApi.query(this.txId, destTable, query);
        })
        .then(() => {
            deferred.resolve(destTable);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX TODO: if it's linkAfterExecution, lock the table
    // and unlock when reset
    private _dfOut(): XDPromise<null> {
        const node: DagNodeDFOut = <DagNodeDFOut>this.node;
        let destTable: string = null;
        if (node.getNumParent() === 1) {
            destTable =  node.getParents()[0].getTable();
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
            return PromiseHelper.reject(e);
        }
    }

    private _IMDTable(): XDPromise<string> {
        const self = this;
        const node: DagNodeIMDTable = <DagNodeIMDTable>this.node;
        const params: DagNodeIMDTableInputStruct = node.getParam(this.replaceParam);
        //XXX TODO: Integrate with new XIAPI.publishTable
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const newTableName = this._generateTableName();
        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            let tables: PublishTable[] = result.tables;
            let table: PublishTable =
                tables.find((pubTab: PublishTable) => {
                    return (pubTab.name == params.source);
                });
            if (table == null) {
                return deferred.reject("Publish Table does not exist: " + params.source);
            }
            let columns: RefreshColInfo[] =
                params.columns.map((name: string) => {
                    let col: PublishTableCol = table.values.find((col) => {
                        return (col.name == name);
                    });
                    if (col == null) {
                        return;
                    }
                    let type: string = col.type;
                    let args = {
                        sourceColumn: name,
                        destColumn: name,
                        columnType: type
                    };
                    return args;
                });
            if (!table.active) {
                XcalarRestoreTable(params.source)
                .then(() => {
                    return XcalarRefreshTable(params.source, newTableName,
                        -1, params.version, self.txId, params.filterString,
                        columns);
                })
                .fail((error) => {
                    deferred.reject(error);
                });
            } else {
                return XcalarRefreshTable(params.source, newTableName,
                    -1, params.version, self.txId, params.filterString,
                    columns);
            }
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
        const node: DagNodeSQL = <DagNodeSQL>this.node;
        const params: DagNodeSQLInputStruct = node.getParam();
        if (!params.queryStr) {
            return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
        }
        const replaceMap = {};
        const queryName = xcHelper.randName("sqlQuery", 8);
        node.getParents().forEach((parent, idx) => {
            const newTableName = parent.getTable();
            replaceMap[idx + 1] = newTableName;
        });
        const queryObj = {
            queryId: queryName,
            status: SQLStatus.Running,
            queryString: node.getSqlQueryString(),
            startTime: new Date()
        }
        const newTableName = this._generateTableName();
        // Set status to Running
        SqlQueryHistoryPanel.Card.getInstance().update(queryObj);
        const retStruct = this._replaceSQLTableName(params.queryStr,
                                                   node.getTableSrcMap(),
                                                   replaceMap,
                                                   params.newTableName,
                                                   newTableName);
        node.setTableSrcMap(retStruct.newTableSrcMap);
        params.queryStr = retStruct.newQueryStr;
        params.newTableName = newTableName;
        node.setParam(params, true);
        node.updateSubGraph();
        const queryNodes = JSON.parse(params.queryStr);
        node.getSubGraph().startExecution(queryNodes);
        const options = {
            jdbcCheckTime: params.jdbcCheckTime
        };
        XIApi.query(this.txId, queryName, params.queryStr, options)
        .then(function(res) {
            // Set status to Done
            queryObj["status"] = SQLStatus.Done;
            queryObj["endTime"] = new Date();
            SqlQueryHistoryPanel.Card.getInstance().update(queryObj);
            deferred.resolve(newTableName, res);
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
    private _replaceSQLTableName(
        queryStr: string,
        tableSrcMap: {},
        replaceMap: {},
        oldDestTableName: string,
        newDestTableName: string
    ): {newQueryStr: string,
        newTableSrcMap: {}} {
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

                const idx = tableSrcMap[source[i]];
                if (idx) {
                    source[i] = replaceMap[idx];
                    newTableSrcMap[source[i]] = idx;
                } else if (!source[i].startsWith("XC_AGG_") &&
                           !source[i].startsWith("XC_SUBQ_")) {
                    if (!newTableMap[source[i]]) {
                        newTableMap[source[i]] = this._generateTableName();
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
                newTableSrcMap: newTableSrcMap};
    }
}