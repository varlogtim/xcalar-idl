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
    private originalSQLNode: DagNodeSQL;

    public constructor(
        node: DagNode,
        txId: number,
        tabId: string,
        noReplaceParam: boolean = false,
        originalSQLNode: DagNodeSQL
    ) {
        this.node = node;
        this.txId = txId;
        this.tabId = tabId;
        this.replaceParam = !noReplaceParam;
        this.originalSQLNode = originalSQLNode;
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
        try {
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
                    return this._map(optimized);
                case DagNodeType.Split:
                    return this._map(optimized);
                case DagNodeType.Round:
                    return this._map(optimized);
                case DagNodeType.Project:
                    return this._project();
                case DagNodeType.Explode:
                    return this._map(optimized);
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
                case DagNodeType.SQLFuncIn:
                    return this._sqlFuncIn();
                case DagNodeType.SQLFuncOut:
                    return this._sqlFuncOut();
                default:
                    throw new Error(type + " not supported!");
            }
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject(e.message);
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
                return this._synthesizeDataset(dsName, schema, optimized);
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
        schema: ColSchema[],
        optimized?: boolean
    ): XDPromise<string> {
        const desTable = this._generateTableName();
        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(schema);
        let sameSession: boolean = null;
        if (optimized) {
            // sameSession must be set to false
            sameSession = false;
        }
        // TODO: XXX parseDS should not be called here
        dsName = parseDS(dsName);
        return XIApi.synthesize(this.txId, colInfos, dsName, desTable, sameSession);
    }

    private _synthesize(): XDPromise<string> {
        const node: DagNodeSynthesize = <DagNodeSynthesize>this.node;
        const params: DagNodeSynthesizeInputStruct = node.getParam(this.replaceParam);
        let typeConverter = (type: ColumnType | string | null): DfFieldTypeT => {
            if (type == null) {
                // when specially be null (just change name, not cast type)
                return null;
            }
            for (let key in ColumnType) {
                if (ColumnType[key] === type) {
                    // when prodvide ColumnType
                    return xcHelper.convertColTypeToFieldType(<ColumnType>type);
                }
            }

            // when from upgrade code, be DfFieldTypeT
            return DfFieldTypeTFromStr[type];
        };

        const colsInfo: ColRenameInfo[] = params.colsInfo.map((colInfo) => {
            let fieldType: DfFieldTypeT = typeConverter(colInfo.columnType);
            return xcHelper.getJoinRenameMap(colInfo.sourceColumn,
                                             colInfo.destColumn,
                                             fieldType);
        });
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.synthesize(this.txId, colsInfo, srcTable, desTable);
    }

    private _aggregate(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeAggregate = <DagNodeAggregate>this.node;
        const params: DagNodeAggregateInputStruct = node.getParam(this.replaceParam);
        const usedAggs: string[] = this.node.getAggregates();
        const evalStr: string = this._mapEvalStrAggs(params.evalString, usedAggs);
        const tableName: string = this._getParentNodeTable(0);
        let dstAggName: string = params.dest;
        let unwrappedName = dstAggName;
        // Create the correct aggregate name
        if (dstAggName.startsWith(gAggVarPrefix)) {
            dstAggName = dstAggName.substring(1);
        }
        dstAggName = DagAggManager.Instance.wrapAggName(this.tabId, dstAggName);

        //Update eval string with correct aggregates

        XIApi.aggregateWithEvalStr(this.txId, evalStr, tableName, dstAggName)
        .then((value, aggName) => {
            node.setAggVal(value);
            if (!optimized && value) {
                // We don't want to add if optimized or ran as a query
                const aggRes: object = {
                    value: value,
                    dagName: dstAggName,
                    aggName: unwrappedName,
                    tableId: tableName,
                    backColName: null,
                    op: null,
                    node: node.getId(),
                    graph: this.tabId
                };
                return DagAggManager.Instance.addAgg(aggName, aggRes);
            }
            return PromiseHelper.resolve();
        })
        .then(() => {
            deferred.resolve(null); // no table generated
        })
        .fail((err) => {
            // Remove the aggregate in the background
            PromiseHelper.alwaysResolve(XcalarGetConstants(dstAggName))
            .then((list: XcalarApiDagNodeInfoT[]) => {
                if (list && list.length != 0) {
                    PromiseHelper.alwaysResolve(DagAggManager.Instance.removeValue(dstAggName, true));
                }
            })
            deferred.reject(err);
        });
        return deferred.promise();
    }

    private _filter(): XDPromise<string> {
        const node: DagNodeFilter = <DagNodeFilter>this.node;
        const params: DagNodeFilterInputStruct = node.getParam(this.replaceParam);
        const fltStr: string = this._mapEvalStrAggs(params.evalString, node.getAggregates());
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.filter(this.txId, fltStr, srcTable, desTable);
    }

    private _groupby(): XDPromise<string> {
        const self = this;
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeGroupBy = <DagNodeGroupBy>this.node;
        const params: DagNodeGroupByInputStruct = node.getParam(this.replaceParam);
        const srcTable: string = this._getParentNodeTable(0);
        const usedAggs: string[] = this.node.getAggregates();
        const aggArgs: AggColInfo[] = params.aggregate.map((aggInfo) => {
            return {
                operator: aggInfo.operator,
                aggColName: this._mapEvalStrAggs(aggInfo.sourceColumn, usedAggs),
                newColName: aggInfo.destColumn,
                isDistinct: aggInfo.distinct
            }
        });
        const newKeys: string[] = node.updateNewKeys(params.newKeys);
        if (params.joinBack) {
            params.includeSample = false;
        }
        const options: GroupByOptions = {
            newTableName: this._generateTableName(),
            isIncSample: params.includeSample,
            icvMode: params.icv,
            groupAll: params.groupAll,
            newKeys: newKeys,
            dhtName: params.dhtName
        };

        cast()
        .then((castTableName) => {
            return XIApi.groupBy(self.txId, aggArgs, params.groupBy, castTableName, options);
        })
        .then((nTableName, nTableCols, _renamedGBCols) => {
            if (params.joinBack) {
                return _groupByJoinHelper(nTableName);
            } else {
                return PromiseHelper.resolve(nTableName, nTableCols);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        function _groupByJoinHelper(
            rTable: string, // table resulting from the group by
        ): XDPromise<string> {
            const joinOpts: JoinOptions = {
                newTableName: self._generateTableName(),
                keepAllColumns: true
            };
            const lTableInfo: JoinTableInfo = {
                tableName: srcTable,
                columns: params.groupBy
            };

            const rTableInfo: JoinTableInfo = {
                tableName: rTable,
                columns: newKeys,
                rename: node.getJoinRenames()
            };

            return XIApi.join(self.txId, JoinOperatorT.FullOuterJoin,
                              lTableInfo, rTableInfo, joinOpts)
        }

        function cast(): XDPromise<string> {
            if (aggArgs.length === 1 && params.aggregate[0].cast && !aggArgs[0].isDistinct) {
                aggArgs[0].aggColName = xcHelper.castStrHelper(aggArgs[0].aggColName,
                    params.aggregate[0].cast, false);
                return PromiseHelper.resolve(srcTable);
            }
            const takenNames = {};
            aggArgs.forEach((aggArg) => {
                takenNames[aggArg.newColName] = true;
            });
            newKeys.forEach((newKey) => {
                takenNames[newKey] = true;
            });
            self.node.getParents()[0].getLineage().getColumns().forEach((col) => {
                takenNames[col.getBackColName()] = true;
            });
            const mapStrs: string[] = [];
            const newCastNames: string[] = [];
            aggArgs.forEach((_aggArg, i) => {
                const type: string = params.aggregate[i].cast;
                if (type != null) {
                    const colName: string = params.aggregate[i].sourceColumn;
                    const newCastName: string = castHelper(type, colName);
                    aggArgs[i].aggColName = newCastName;
                }
            });

            if (mapStrs.length > 0) {
                return XIApi.map(self.txId, mapStrs, srcTable, newCastNames, self._generateTableName());
            } else {
                return PromiseHelper.resolve(srcTable);
            }

            function castHelper(type: string, colName: string): string {
                let parsedName: string = xcHelper.stripColName(xcHelper.parsePrefixColName(colName).name);
                let newCastName: string;
                if (takenNames[parsedName]) {
                    const validFunc = (newColName) => {
                        return !takenNames[newColName];
                    };
                    newCastName = xcHelper.uniqueName(parsedName, validFunc, null, 50);
                } else {
                    newCastName = parsedName;
                }

                takenNames[newCastName] = true;
                const mapStr: string = xcHelper.castStrHelper(colName, type, false);
                mapStrs.push(mapStr);
                newCastNames.push(newCastName);
                return newCastName;
            };
        }
        return deferred.promise();
    }

    private _join(_optimized?: boolean): XDPromise<string> {
        const node: DagNodeJoin = <DagNodeJoin>this.node;
        const params: DagNodeJoinInputStruct = node.getParam(this.replaceParam);
        const parents: DagNode[] = node.getParents();
        // Sanity check
        for (let i = 0 ; i < 2; i++) {
            let parent = parents[i];
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
        const lTableInfo: JoinTableInfo = this._joinInfoConverter(
            params.left,
            parents[0],
            {
                keepAllColumns: params.keepAllColumns,
            });
        const rTableInfo: JoinTableInfo = this._joinInfoConverter(
            params.right,
            parents[1],
            {
                keepAllColumns: params.keepAllColumns,
            });
        const usedAggs = this.node.getAggregates();
        const options: JoinOptions = {
            newTableName: this._generateTableName(),
            evalString: this._mapEvalStrAggs(params.evalString, usedAggs),
            nullSafe: params.nullSafe,
            keepAllColumns: false // Backend is removing this flag, so XD should not use it anymore
            // keepAllColumns: params.keepAllColumns
        };
        return XIApi.join(this.txId, joinType, lTableInfo, rTableInfo, options);
    }

    private _joinInfoConverter(
        joinTableInfo: DagNodeJoinTableInput,
        parentNode: DagNode,
        options?: {
            keepAllColumns?: boolean,
        }
    ): JoinTableInfo {
        const allImmediates: string[] = parentNode.getLineage().getDerivedColumns();
        const {
            keepAllColumns = true
        } = options || {};
        const colNamesToKeep = keepAllColumns
            ? parentNode.getLineage()
                .getColumns().map((col) => col.getBackColName())
            : joinTableInfo.keepColumns;
        const rename = this._joinRenameConverter(colNamesToKeep, joinTableInfo.rename);
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

    private _map(_optimized: boolean): XDPromise<string> {
        const node: DagNodeMap = <DagNodeMap>this.node;
        const params: DagNodeMapInputStruct = node.getParam(this.replaceParam);
        const mapStrs: string[] = [];
        const newFields: string[] = [];
        const aggregates: string[] = node.getAggregates();

        params.eval.forEach((item) => {
            let evalString = this._mapEvalStrAggs(item.evalString, aggregates);
            mapStrs.push(evalString);
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
        if (params.columns.length > node.getNumParent()) {
            return PromiseHelper.reject("Invalid number of columns specified");
        }

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
        const inputParent = customNode.getInputParent(node);
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
        const columns: {sourceColumn: string, destColumn: string}[] = exportInput.columns;
        const progCols: ProgCol[] = node.getParents()[0].getLineage().getColumns();
        const backCols: string[] = columns.map((column) => {
            let col: ProgCol = progCols.find((col: ProgCol) => {
                return col.name == column.sourceColumn || col.getBackColName() == column.sourceColumn;
            })
            if (col == null) {
                return column.sourceColumn;
            } else {
                return col.getBackColName();
            }
        });
        if (backCols.length != columns.length) {
            throw new Error("Could not export, columns are missing.");
        }
        const driverColumns: XcalarApiExportColumnT[] = columns.map((_e,i) => {
            let col = new XcalarApiExportColumnT();
            col.columnName = backCols[i];
            col.headerName = columns[i].destColumn;
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
        let priorDestTable = node.getStoredQueryDest(this.tabId);
        let promise;
        if (priorDestTable) {
            promise = PromiseHelper.resolve("", [priorDestTable]);
        } else {
            promise = graph.getQuery(node.getId(), optimized, true, true);
        }
        let destTable: string;
        promise
        .then((query: string, tables) => {
            if ("object" == typeof tables) {
                // get the last dest table
                destTable = tables[tables.length - 1];
            }
            if (!priorDestTable) {
                node.setStoredQueryDest(this.tabId, destTable);
                return XIApi.query(this.txId, destTable, query);
            } else {
                return PromiseHelper.resolve();
            }
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
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodePublishIMD = <DagNodePublishIMD>this.node;
        const params: DagNodePublishIMDInputStruct = node.getParam(this.replaceParam);
        let columns: ProgCol[] = node.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0] || [];
        let colInfo: ColRenameInfo[] = xcHelper.createColInfo(columns);
        let tableName: string = params.pubTableName;
        XIApi.publishTable(this.txId, params.primaryKeys,
            this._getParentNodeTable(0), tableName,
            colInfo, params.operator)
        .then(() => {
            if (!(typeof PTblManager === "undefined")) {
                return PTblManager.Instance.addTable(tableName);
            }
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject)
        return deferred.promise();
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
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeExtension = <DagNodeExtension>this.node;
        let finalTable: string

        node.getQuery()
        .then((resTable, query) => {
            finalTable = resTable;
            if (!query) {
                // when the extension doesn't generate query
                return PromiseHelper.resolve();
            }
            return XIApi.query(this.txId, finalTable, query);
        })
        .then(() => {
            deferred.resolve(finalTable);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getRefreshColInfoFromSchema(schema: ColSchema[]): RefreshColInfo[] {
        return schema.map((col: ColSchema) => {
            return {
                sourceColumn: col.name,
                destColumn: col.name,
                columnType: DfFieldTypeTStr[xcHelper.convertColTypeToFieldType(col.type)]
            };
        });
    }

    private _IMDTable(): XDPromise<string> {
        const self = this;
        const node: DagNodeIMDTable = <DagNodeIMDTable>this.node;
        const params: DagNodeIMDTableInputStruct = node.getParam(this.replaceParam);
        //XXX TODO: Integrate with new XIAPI.publishTable
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const newTableName = this._generateTableName();
        let cols: RefreshColInfo[] = this._getRefreshColInfoFromSchema(params.schema);
        let limitedRows: number = params.limitedRows;
        if (isNaN(limitedRows) || limitedRows < 0 || !Number.isInteger(limitedRows)) {
            limitedRows = null;
        }

        PromiseHelper.alwaysResolve(XcalarRestoreTable(params.source))
        .then(() => {
            return XcalarRefreshTable(params.source, newTableName,
                -1, params.version, self.txId, params.filterString,
                cols, limitedRows);
        })
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);
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
        const newKeys: string[] = node.updateNewKeys(params.newKeys);

        const sortedColumns = params.columns.map((column, i) => {
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

            return {
                name: name,
                ordering: XcalarOrderingTFromStr[column.ordering],
                type: type,
                keyFieldName: newKeys[i]
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
        const params: DagNodeSQLInputStruct = node.getParam();
        if (!params.sqlQueryStr) {
            return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
        }

        const queryId = node.getSQLQueryId();
        let xcQueryString;
        // search for queryString in original node if it exists
        if (this.originalSQLNode) {
            xcQueryString = this.originalSQLNode.getXcQueryString();
        } else {
            xcQueryString = node.getXcQueryString();
        }

        let promise: XDPromise<any> = PromiseHelper.resolve({xcQueryString: xcQueryString});
        let compiled = false;
        if (!xcQueryString) {
            compiled = true;
            promise = node.compileSQL(params.sqlQueryStr, queryId, {}, self.replaceParam);
        } else if (!node.getXcQueryString()) {
            // query string exists in original node but not the clone
            node.setNewTableName(this.originalSQLNode.getNewTableName());
            node.setXcQueryString(this.originalSQLNode.getXcQueryString());
            node.setRawXcQueryString(this.originalSQLNode.getRawXcQueryString());
            node.setRawColumns(this.originalSQLNode.getColumns());
            node.setTableSrcMap(this.originalSQLNode.getTableSrcMap());
            node.updateSubGraph();
            const lineage = node.getLineage();
            lineage.reset();
            lineage.getChanges();
        }
        const newDestTableName = self._generateTableName();
        node.setSQLQuery({
            queryString: params.sqlQueryStr,
            dataflowId: this.tabId
        });
        promise
        .then((ret) => {
            if (compiled && this.originalSQLNode) {
                // since compilation is done on a cloned sql node, apply
                // changes to the original sql node so it's cached
                this.originalSQLNode.setNewTableName(ret.newTableName);
                this.originalSQLNode.setXcQueryString(ret.xcQueryString);
                this.originalSQLNode.setColumns(ret.allCols);
                this.originalSQLNode.setTableSrcMap(ret.tableSrcMap);
                this.originalSQLNode.updateSubGraph();
                const lineage = this.originalSQLNode.getLineage();
                lineage.reset();
                lineage.getChanges();
            }

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
            node.setSQLQuery({
                status: SQLStatus.Running,
                startTime: new Date()
            });
            node.updateSQLQueryHistory();
            return XIApi.query(self.txId, queryId, replaceRetStruct.newQueryStr,
                                                                       options);
        })
        .then(function(res) {
            // Set status to Done
            node.setSQLQuery({
                status: SQLStatus.Done,
                endTime: new Date(),
                newTableName: newDestTableName
            });
            node.getSQLQuery().columns = node.getColumns();
            node.updateSQLQueryHistory();
            deferred.resolve(newDestTableName, res);
        })
        .fail(function(error) {
            node.setSQLQuery({
                endTime: new Date()
            });
            if ((error instanceof Object && error.error ===
                "Error: " + SQLErrTStr.Cancel) || error === SQLErrTStr.Cancel) {
                node.setSQLQuery({
                    status: SQLStatus.Cancelled
                });
            } else {
                node.setSQLQuery({
                    status: SQLStatus.Failed,
                    errorMsg: JSON.stringify(error)
                });
            }
            // Set status to Cancelled or Failed
            node.updateSQLQueryHistory();
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
                            console.log("publish table as source: ", source[i]);
                            continue;
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
                newTableMap[operation.args.dest] = newDestTableName;
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

    private _sqlFuncIn(): XDPromise<string> {
        const node: DagNodeSQLFuncIn = <DagNodeSQLFuncIn>this.node;
        const params: DagNodeSQLFuncInInputStruct = node.getParam(this.replaceParam);
        const isSimulate: boolean = Transaction.isSimulate(this.txId);
        const source: string = params.source;
        if (isSimulate) {
            return PromiseHelper.resolve(source);
        } else {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            const newTableName = this._generateTableName();
            const cols: RefreshColInfo[] = this._getRefreshColInfoFromSchema(node.getSchema());
            XcalarRefreshTable(source, newTableName, -1, -1, this.txId, "", cols)
            .then(() => {
                deferred.resolve(newTableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    }

    private _sqlFuncOut(): XDPromise<string> {
        const node: DagNodeSQLFuncOut = <DagNodeSQLFuncOut>this.node;
        const params: DagNodeSQLFuncOutInputStruct = node.getParam(this.replaceParam);
        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(params.schema);
        const nameSet: Set<string> = new Set();
        let hasDupName: boolean = false;
        colInfos.forEach((colInfo) => {
            let newName = colInfo.new.toUpperCase(); // need to make the name be uppercase for sql
            colInfo.new = newName;
            if (nameSet.has(newName)) {
                hasDupName = true;
            } else {
                nameSet.add(newName);
            }
        });
        if (hasDupName) {
            return PromiseHelper.reject("Has duplicate column name in SQL Function out");
        }
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.synthesize(this.txId, colInfos, srcTable, desTable);
    }

    private _mapEvalStrAggs(evalString: string, aggs: string[]): string {
        if (aggs.length == 0) {
            return evalString;
        }
        for (let i = 0; i < aggs.length; i++) {
            let frontName = aggs[i];
            let modifiedFront = frontName;
            if (frontName.startsWith(gAggVarPrefix)) {
                modifiedFront = frontName.substring(1);
            }
            let backName = gAggVarPrefix + DagAggManager.Instance.wrapAggName(this.tabId, modifiedFront);
            evalString = evalString.replace(frontName, backName);
        }
        return evalString;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeExecutor = DagNodeExecutor;
};
