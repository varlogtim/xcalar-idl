class DagNodeExecutor {
    public static readonly XcalarApiLrqExportPrefix: string = ".XcalarLRQExport.";
    /**
     * DagNodeExecutor.getTableNamePrefix
     * @param tabId
     */
    public static getTableNamePrefix(tabId: string): string {
        if (tabId && tabId.length < 20) {
            //XXX hacky way to detect if tab is published table tab
            if (DagTabManager && DagTabManager.Instance.getTabById(tabId)) {
                let tabName = DagTabManager.Instance.getTabById(tabId).getName();
                tabId = "published_" + <string>xcHelper.checkNamePattern(null, PatternAction.Fix, tabName, "_");
            }
        }
        return "table_" + tabId;
    }

    private node: DagNode;
    private txId: number;
    private tabId: string;
    private replaceParam: boolean;
    private originalSQLNode: DagNodeSQL;
    private isBatchExecution: boolean;
    private isOptimized: boolean;
    private aggNames: Map<string, string>;
    private isLinkInBatch: boolean;


    public constructor(
        node: DagNode,
        txId: number,
        tabId: string,
        options?: {
            noReplaceParam?: boolean,
            originalSQLNode?: DagNodeSQL,
            isBatchExecution?: boolean,
            aggNames?: Map<string, string>,
            isLinkInBatch?: boolean
        }
    ) {
        this.node = node;
        this.txId = txId;
        this.tabId = tabId;
        options = options || {};
        this.replaceParam = !options.noReplaceParam;
        this.originalSQLNode = options.originalSQLNode;
        this.isBatchExecution = options.isBatchExecution || false;
        this.aggNames = options.aggNames;
        this.isLinkInBatch = options.isLinkInBatch;
    }

    /**
     * run the node operation
     */
    public run(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNode = this.node;
        const isSimulate: boolean = Transaction.isSimulate(this.txId);
        let isStepThrough: boolean = (!isSimulate && !optimized);
        this.isOptimized = optimized;

        node.getParents().forEach((parent) => {
            const parentTableName = parent.getTable();
            DagTblManager.Instance.resetTable(parentTableName);
        });

        this._beforeRun(isStepThrough)
        .then(() => {
            return this._apiAdapter(optimized);
        })
        .then((destTable) => {
            if (destTable != null) {
                node.setTable(destTable);
                DagTblManager.Instance.addTable(destTable);
            }
            if (isStepThrough) {
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

    private _beforeRun(isStepThrough: boolean): XDPromise<void> {
        if (!isStepThrough) {
            return PromiseHelper.resolve();
        }
        const node: DagNode = this.node;
        if (node instanceof DagNodeAggregate) {
            return PromiseHelper.alwaysResolve(node.resetAgg());
        } else {
            node.beRunningState();
            return PromiseHelper.resolve();
        }
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
                    return this._join();
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
                    return this._dfOut(optimized);
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
                case DagNodeType.Deskew:
                    return this._deskew();
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

    private _generateTableName(source?: string): string {
        let tabId = this.tabId;
        if (tabId == null) {
            tabId = this._getClosestTabId(this.txId);
        }

        try {
            let prefix: string = "";
            if (source) {
                prefix = xcHelper.getTableName(source);
            } else {
                prefix = xcHelper.genTableNameFromNode(this.node);
            }
            return prefix + Authentication.getTableId(tabId);
        } catch (e) {
            console.error("generate table name error", e);
            // when has error case, use the old behavior
            // XXX TODO: deprecate it
            return DagNodeExecutor.getTableNamePrefix(tabId) +
            "_" + this.node.getId() + Authentication.getHashId();
        }
    }

    private _getClosestTabId(txId) {
        const txLog = Transaction.get(txId);
        if (txLog) {
            if (txLog.tabId != null) {
                return txLog.tabId;
            } else if (txLog.parentTxId != null) {
                return this._getClosestTabId(txLog.parentTxId)
            }
        }
        return undefined;
    }

    private _loadDataset(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeDataset = <DagNodeDataset>this.node;
        const params: DagNodeDatasetInputStruct = node.getParam(this.replaceParam);
        let dsName: string = params.source;

        if (optimized) {
            // if ds already exist, load dataset will reuse in loadArgs in
            // dataset meta, so have to give the optimized exuection a unique ds name
            dsName = this._getOptimizedDSName(dsName);
        }
        // XXX Note: have to do it because of a bug in call indexDataset through query
        // it didn't add the load lock and will cause a bug.
        // the lock is per each workbook
        // so XD need to maunally call it.
        let def = optimized ? PromiseHelper.resolve() : PromiseHelper.alwaysResolve(this._activateDataset(dsName));
        def
        .then(() => {
            if (optimized && Transaction.isSimulate(this.txId)) {
                try {
                    let loadArg = this._getOptimizedLoadArg(node, dsName);
                    Transaction.log(this.txId, loadArg, null, 0);
                } catch (e) {
                    return PromiseHelper.reject({
                        error: "Parse load args error",
                        detail: e.message
                    });
                }
            }

            if (params.synthesize === true) {
                const schema: ColSchema[] = node.getSchema();
                return this._synthesizeDataset(dsName, schema);
            } else {
                const prefix: string = params.prefix;
                return this._indexDataset(dsName, prefix);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getOptimizedDSName(dsName: string): string {
        return xcHelper.randName("Optimized.") + "." + dsName;
    }

    private _getOptimizedLoadArg(
        node: DagNodeDataset,
        dsName: string
    ): string {
        let loadArgStr: string = node.getLoadArgs();
        loadArgStr = DagNodeInput.replaceParameters(
            loadArgStr,
            this.getRuntime().getDagParamService().getParamMap()
        );
        // loadArgStr = DagNodeInput.replaceParameters(loadArgStr, DagParamManager.Instance.getParamMap());
        let loadArg = JSON.parse(loadArgStr);
        loadArg.args.dest = dsName;
        return JSON.stringify(loadArg);
    }

    private _activateDataset(dsName): XDPromise<void> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();

        const txId = Transaction.start({
            operation: "activate dataset",
            track: true,
            tabId: this.tabId,
            parentTxId: this.txId,
            parentNodeInfo: {nodeId: this.node.getId(), tabId: this.tabId}
        });
        if (typeof DS !== "undefined") {
            return DS.activate([dsName], false, txId);
        } else {
            XcalarDatasetActivate(dsName, txId)
            .always((res) => {
                deferred.resolve(res);
                Transaction.done(txId);
            });
            return deferred.promise();
        }
    }

    private _indexDataset(dsName: string, prefix: string): XDPromise<string> {
        const desTable = this._generateTableName(xcHelper.parseDSName(dsName).dsName);
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XIApi.indexFromDataset(this.txId, dsName, desTable, prefix)
        .then((ret) => {
            deferred.resolve(ret.newTableName);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _synthesizeDataset(
        dsName: string,
        schema: ColSchema[],
    ): XDPromise<string> {
        const desTable = this._generateTableName(xcHelper.parseDSName(dsName).dsName);
        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(schema);
        // when load dataset, the dataset should always be from the same seesion
        let sameSession: boolean = true;
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

        if (optimized) {
            dstAggName = "batch_" + this.tabId + "_" + dstAggName;
            unwrappedName = gAggVarPrefix + dstAggName;
        } else if (this.isLinkInBatch && this.aggNames.has(unwrappedName)) {
            dstAggName = this.aggNames.get(unwrappedName);
            if (dstAggName.startsWith(gAggVarPrefix)) {
                dstAggName = dstAggName.substring(1);
            }
            unwrappedName = gAggVarPrefix + dstAggName;
        }

        //Update eval string with correct aggregates
        XIApi.aggregateWithEvalStr(this.txId, evalStr, tableName, dstAggName)
        .then((ret) => {
            const {value} = ret;
            node.setAggVal(value);
            deferred.resolve(dstAggName); // no table generated
        })
        .fail(deferred.reject);
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
                isDistinct: aggInfo.distinct,
                delim: aggInfo.delim
            }
        });
        const newKeys: string[] = node.updateNewKeys(params.newKeys);
        if (params.joinBack) {
            params.includeSample = false;
        }
        if (params.groupAll) {
            params.includeSample = false;
            params.joinBack = false;
        }
        let sampleCols: {name: string, type: DfFieldTypeT}[];
        if (params.includeSample) {
            sampleCols = node.getParents()[0].getLineage().getColumns(this.replaceParam, true).map(col => {
                return {
                    name: col.getBackColName(),
                    type: xcHelper.convertColTypeToFieldType(col.getType())
                }
            });
        }
        const options: GroupByOptions = {
            newTableName: this._generateTableName(),
            isIncSample: params.includeSample,
            allCols: sampleCols,
            icvMode: params.icv,
            groupAll: params.groupAll,
            newKeys: newKeys,
            dhtName: params.dhtName,
            clean: !this.isOptimized
        };

        cast()
        .then((castTableName) => {
            return XIApi.groupBy(self.txId, aggArgs, params.groupBy, castTableName, options);
        })
        .then(({finalTable}) => {

            if (params.joinBack) {
                return _groupByJoinHelper(finalTable);
            } else {
                return PromiseHelper.resolve(finalTable);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        function _groupByJoinHelper(
            rTable: string, // table resulting from the group by
        ): XDPromise<string> {
            const joinOpts: JoinOptions = {
                newTableName: self._generateTableName(),
                keepAllColumns: true,
                clean: !self.isOptimized
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
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            XIApi.join(self.txId, JoinOperatorT.FullOuterJoin,
                              lTableInfo, rTableInfo, joinOpts)
            .then((ret) => {
                deferred.resolve(ret.newTableName)
            })
            .fail(deferred.reject);
            return deferred.promise();
        }

        // only used for groupby so far
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
            self.node.getParents()[0].getLineage().getColumns(false, true).forEach((col) => {
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

    private _join(): XDPromise<string> {
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
            keepAllColumns: false, // Backend is removing this flag, so XD should not use it anymore
            clean: !this.isOptimized
        };

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XIApi.join(this.txId, joinType, lTableInfo, rTableInfo, options)
        .then((ret) => {
            deferred.resolve(ret.newTableName);
        })
        .fail(deferred.reject);
        return deferred.promise();
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
                .getColumns(this.replaceParam, true).map((col) => col.getBackColName())
            : joinTableInfo.keepColumns;
        const rename = DagNodeJoin.joinRenameConverter(colNamesToKeep, joinTableInfo.rename);
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

    private _map(): XDPromise<string> {
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
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XIApi.union(this.txId, tableInfos, params.dedup, desTable, unionType, !this.isOptimized)
        .then((ret) => {
            deferred.resolve(ret.newTableName);
        })
        .fail(deferred.reject);
        return deferred.promise();
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
            .then((res) => {
                let {queryStr, destTables} = res;
                let tables = destTables || [];
                destTable = tables[tables.length - 1];
               return XIApi.query(this.txId, destTable, queryStr);
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
            const txLog = Transaction.get(this.txId);
            txLog.setParentNodeInfo(node.getId(), this.tabId);

            node.getSubGraph().execute(null, optimized, this.txId)
            .then(() => {
                txLog.resetParentNodeInfo();
                try {
                    // Always get the first output node, as we only support on output for now
                    deferred.resolve(node.getOutputNodes()[0].getTable());
                } catch(e) {
                    // This could happend, as custom node can end with some out nodes
                    deferred.resolve();
                }
            })
            .fail((error) => {
                txLog.resetParentNodeInfo();
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
        const progCols: ProgCol[] = node.getParents()[0].getLineage().getColumns(this.replaceParam, true);
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
            exportName = DagNodeExecutor.XcalarApiLrqExportPrefix + srcTable;
        } else {
            exportName = this._generateTableName();
        }

        XIApi.exportTable(this.txId, srcTable, driverName, driverParams, driverColumns, exportName)
        .then(() => {
            if (optimized) {
                deferred.resolve(srcTable);
            } else {
                deferred.resolve(exportName);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _dfIn(optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        try {
            const node: DagNodeDFIn = <DagNodeDFIn>this.node;
            if (node.hasSource()) {
                return this._linkWithSource(node, optimized);
            }
            const res = node.getLinkedNodeAndGraph();
            const graph: DagGraph = res.graph;
            const linkOutNode: DagNodeDFOut = res.node;
            if (linkOutNode.shouldLinkAfterExecution()) {
                return this._linkWithExecution(graph, linkOutNode, node, optimized);
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

    private _linkWithSource(
        node: DagNodeDFIn,
        optimized?: boolean
    ): XDPromise<string> {
        let param: DagNodeDFInInputStruct = node.getParam(this.replaceParam);
        let source: string = param.source;
        if (optimized) {
            const desTable = this._generateTableName(source);
            // get table outside from batch data flow, so sameSession must be set to false
            return XIApi.synthesize(this.txId, [], source, desTable, false)
        } else {
            node.setTable(source, true);
            DagTblManager.Instance.addTable(source);
            node.updateStepThroughProgress();
            node.beCompleteState();
            if (xcHelper.isNodeJs()) {
                return PromiseHelper.resolve(source);
            } else {
                // for XD environment, detect if the table exist
                let deferred: XDDeferred<string> = PromiseHelper.deferred();
                XIApi.getTableMeta(source)
                .then(() => {
                    deferred.resolve(source);
                })
                .fail(deferred.reject);

                return deferred.promise();
            }
        }
    }

    private _linkWithExecution(
        graph: DagGraph,
        node: DagNodeDFOut,
        dfInNode: DagNodeDFIn,
        optimized?: boolean
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        if (optimized) {
            let sourceTable: string = node.getTable();
            if (!sourceTable && graph === dfInNode.getGraph()) {
                // when link is in the same dataflow, as optimized
                // execution make a clone of graph, it loese the cached table
                // need to find the real link out node
                let realLinkOutNode: DagNodeDFOut = dfInNode.getLinkedNodeAndGraph(true).node;
                sourceTable = realLinkOutNode.getTable();
            }

            if (!sourceTable) {
                throw new Error("Cannot find source result in the linked node correctly.");
            }
            const desTable = this._generateTableName(sourceTable);
            // get table outside from batch flow, so sameSession must be set to false
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
                if (destTable) {
                    dfInNode.setTable(destTable, true);
                    DagTblManager.Instance.addTable(destTable);
                    dfInNode.updateStepThroughProgress();
                }
                dfInNode.beCompleteState();
                deferred.resolve(destTable);
            })
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    // creates a new query from the linkOut's ancestors and runs it
    private _linkWithBatch(graph: DagGraph, linkOutNode: DagNodeDFOut, optimized?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let priorDestTable;
        let rootTx;
        if (optimized) {
            rootTx = Transaction.getRootTx(this.txId);
            if (rootTx) {
                priorDestTable = rootTx.getStoredQueryDest(linkOutNode.getId(), graph.getTabId());
            }
        } else {
            priorDestTable = linkOutNode.getStoredQueryDest(this.tabId);
        }

        let promise;
        let noQueryNeeded = false;
        let txLog: Transaction.TXLog;
        if (priorDestTable) {
            console.log("reusing cache", linkOutNode);
            noQueryNeeded = true;
            promise = PromiseHelper.resolve({queryStr: "", destTables:[priorDestTable]});
        } else {
            txLog = Transaction.get(this.txId);
            txLog.setParentNodeInfo(this.node.getId(), this.tabId); // used to track dataset activation
            promise = graph.getQuery(linkOutNode.getId(), optimized, true, true, this.txId, !optimized, true);
        }
        let destTable: string;
        promise
        .then((ret) => {
            if (txLog) {
                txLog.resetParentNodeInfo();
            }
            let {queryStr, destTables} = ret;
            if ("object" == typeof destTables) {
                // get the last dest table
                destTable = destTables[destTables.length - 1];
                let newDestTable: string = this._generateTableName(destTable);
                if (queryStr && queryStr.length) {
                    try {
                        // give final table name a name matching the
                        // the link in node's id
                        let query = JSON.parse(queryStr);
                        let lastQuery;
                        for (let i = query.length - 1; i >= 0; i--) {
                            let q = query[i];
                            if (q.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                                lastQuery = q;
                                break;
                            }
                        }
                        lastQuery.args.dest = newDestTable;
                        destTables[destTables.length - 1] = newDestTable;
                        destTable = newDestTable;
                        queryStr = JSON.stringify(query);
                    } catch(e) {
                        console.error(queryStr, e);
                    }
                }
            }
            if (!priorDestTable) {
                try {
                    let queryLen: number = JSON.parse(queryStr).length;
                    if (queryLen === 0) {
                        noQueryNeeded = true;
                    }
                } catch (e) {}
                if (optimized) {
                    rootTx.setStoredQueryDest(linkOutNode.getId(), graph.getTabId(), destTable);
                } else {
                    linkOutNode.setStoredQueryDest(this.tabId, destTable);
                }

                return XIApi.query(this.txId, destTable, queryStr);
            } else {
                noQueryNeeded = true;
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            if (linkOutNode.getSubType() === DagNodeSubType.DFOutOptimized) {
                return this._synthesizeDFOutInBatch(destTable, linkOutNode, false);
            } else {
                return PromiseHelper.resolve(destTable);
            }
        })
        .then((finaTable: string) => {
            if (noQueryNeeded) {
                this.node.beCompleteState();
            } // else will be completed when queryStateOutput returns
            deferred.resolve(finaTable);
        })
        .fail((e) => {
            if (txLog) {
                txLog.resetParentNodeInfo();
            }
            deferred.reject(e);
        });

        return deferred.promise();
    }

    // optimized link out run a retina which will synthesize the table
    // here we do the equavilent thing for the link in batch mode
    private _synthesizeDFOutInBatch(
        srcTable: string,
        node: DagNodeDFOut,
        excludeAllDerived: boolean
    ): XDPromise<string> {
        // what the linkOutOptimized node store is the schema after synthesize
        // which is destColName and colType
        try {
            const colMap: Map<string, ColumnType> = new Map();
            const parentNode = node.getParents()[0];
            parentNode.getLineage().getColumns(this.replaceParam, true).forEach((progCol) => {
                colMap.set(progCol.getBackColName(), progCol.getType());
            });

            let hasPrefix: boolean = false;
            const columns: {sourceName: string, destName: string}[] = node.getParam().columns;
            const colsInfo: ColRenameInfo[] = columns.map((colInfo) => {
                const sourceName: string = colInfo.sourceName;
                const destName: string = colInfo.destName;
                const columnType: ColumnType = colMap.get(sourceName);
                const type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(columnType);
                if (xcHelper.parsePrefixColName(sourceName).prefix !== "") {
                    hasPrefix = true;
                }
                return xcHelper.getJoinRenameMap(sourceName, destName, type);
            });
            if (excludeAllDerived && !hasPrefix) {
                // when no prefix column, don't need to do synthesize
                return PromiseHelper.resolve(srcTable);
            }
            const desTable: string = this._generateTableName();
            return XIApi.synthesize(this.txId, colsInfo, srcTable, desTable);
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject("Error configuration in synthesize");
        }
    }

    // XXX TODO: if it's linkAfterExecution, lock the table
    // and unlock when reset
    private _dfOut(optimized: boolean): XDPromise<string | null> {
        const node: DagNodeDFOut = <DagNodeDFOut>this.node;
        let srcTable: string = null;
        if (node.getNumParent() === 1) {
            srcTable = this._getParentNodeTable(0);
        }
        if (!optimized) {
            return PromiseHelper.resolve(srcTable);
        } else {
            // XXX FIX ME: this is a temp workaround to fix SDK-733
            return this._synthesizeDFOutInBatch(srcTable, node, true);
        }
    }

    private _publishIMD(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodePublishIMD = <DagNodePublishIMD>this.node;
        const params: DagNodePublishIMDInputStruct = node.getParam(this.replaceParam);
        let columns: ProgCol[] = node.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns(this.replaceParam, true);
        })[0] || [];
        columns = columns.filter((col: ProgCol) => {
            return params.columns.includes(col.getFrontColName());
        });

        let colInfo: ColRenameInfo[] = xcHelper.createColInfo(columns);
        let tableName: string = params.pubTableName;

        const txLog = Transaction.get(this.txId);
        txLog.setCurrentNodeInfo(node.getId(), this.tabId);
        XIApi.publishTable(this.txId, params.primaryKeys,
            this._getParentNodeTable(0), tableName,
            colInfo, params.operator)
        .then(() => {
            txLog.resetCurrentNodeInfo();
            if (!(typeof PTblManager === "undefined")) {
                return PTblManager.Instance.addTable(tableName);
            }
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((err) => {
            txLog.resetCurrentNodeInfo();
            deferred.reject(err);
        });
        return deferred.promise();
    }

    private _updateIMD(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeUpdateIMD = <DagNodeUpdateIMD>this.node;
        const params: DagNodeUpdateIMDInputStruct = node.getParam(this.replaceParam);
        let columns: ProgCol[] = node.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns(this.replaceParam, true);
        })[0] || [];
        let colInfo: ColRenameInfo[] = xcHelper.createColInfo(columns);
        const txLog = Transaction.get(this.txId);
        txLog.setCurrentNodeInfo(node.getId(), this.tabId);
        XIApi.updatePubTable(this.txId, this._getParentNodeTable(0),
            params.pubTableName, colInfo, params.operator)
        .then((res) => {
            txLog.resetCurrentNodeInfo();
            deferred.resolve(res);
        })
        .fail((err) => {
            txLog.resetCurrentNodeInfo();
            deferred.reject(err);
        });
        return deferred.promise();
    }

    private _extension(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNodeExtension = <DagNodeExtension>this.node;
        let finalTable: string
        const txLog = Transaction.get(this.txId);
        node.getQuery()
        .then((ret) => {
            const {resTable, query} = ret;
            finalTable = resTable;
            if (!query) {
                // when the extension doesn't generate query
                return PromiseHelper.resolve();
            }
            txLog.setCurrentNodeInfo(node.getId(), this.tabId);
            return XIApi.query(this.txId, finalTable, query);
        })
        .then(() => {
            txLog.resetCurrentNodeInfo();
            deferred.resolve(finalTable);
        })
        .fail((err) => {
            txLog.resetCurrentNodeInfo();
            deferred.reject(err);
        });

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
        const newTableName = this._generateTableName(params.source);
        let cols: RefreshColInfo[] = this._getRefreshColInfoFromSchema(params.schema);
        let limitedRows: number = params.limitedRows;
        if (isNaN(limitedRows) || limitedRows < 0 || !Number.isInteger(limitedRows)) {
            limitedRows = null;
        }

        this._restoreIMDTable(params.source)
        .then(() => {
            return XcalarRefreshTable(params.source, newTableName,
                -1, params.version, self.txId, params.filterString,
                cols, limitedRows);
        })
        .then((res) => {
            node.setElapsedTime(res.timeElapsed);
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _restoreIMDTable(tableName: string): XDPromise<void> {
        if (typeof PTblManager === "undefined") {
            return PromiseHelper.alwaysResolve(XcalarRestoreTable(tableName));
        } else {
            return PromiseHelper.alwaysResolve(
                PTblManager.Instance.activateTables([tableName], true)
            );
        }
    }

    private _jupyter(): XDPromise<string> {
        const node: DagNodeJupyter = <DagNodeJupyter>this.node;
        const params: DagNodeJupyterInputStruct = node.getParam();
        const colMap: Map<string, ProgCol> = new Map();
        for (const colInfo of node.getParents()[0].getLineage().getColumns(this.replaceParam, true)) {
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
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XIApi.index(this.txId, colNames, srcTable, undefined, newKeys, params.dhtName)
        .then((ret) => {
            deferred.resolve(ret.newTableName);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _deskew(): XDPromise<string> {
        const colNames: string[] = [];
        const newKeys: string[] = [];
        const node: DagNodeDeskew = <DagNodeDeskew>this.node;
        const params: DagNodeDeskewInputStruct = node.getParam();
        colNames.push(params.column);
        newKeys.push(node.updateNewKey(params.newKey));
        const srcTable: string = this._getParentNodeTable(0);
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XIApi.index(this.txId, colNames, srcTable, undefined, newKeys)
        .then((ret) => {
            deferred.resolve(ret.newTableName);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _sort(): XDPromise<string> {
        const node: DagNodeSort = <DagNodeSort>this.node;
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        const params: DagNodeSortInputStruct = node.getParam(this.replaceParam);
        const progCols: ProgCol[] = node.getParents()[0].getLineage().getColumns(this.replaceParam, true);
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
        .then((ret) => {
            const tableAfterSort = ret.newTableName;
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
            promise = node.compileSQL(params.sqlQueryStr, queryId,
                    {originalSQLNode: this.originalSQLNode}, self.replaceParam);
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
        let newDestTableName: string;
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
            const replaceRetStruct = node.replaceSQLTableName(ret.xcQueryString,
                                                        oldDestTableName,
                                                        self.tabId,
                                                        node.getTableSrcMap(),
                                                        replaceMap);
            newDestTableName = replaceRetStruct.newDestTableName;
            node.setTableSrcMap(replaceRetStruct.newTableSrcMap);
            node.setXcQueryString(replaceRetStruct.newQueryStr);
            node.setNewTableName(newDestTableName);
            node.updateSubGraph(replaceRetStruct.newTableMap);
            let finalQueryStr = replaceRetStruct.newQueryStr;
            const queryNodes = JSON.parse(finalQueryStr);
            queryNodes.forEach(queryNode => {
                // add comments with nodeIds so we can track progress
                if (queryNode.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                    let tableName = queryNode.args.dest;
                    if (queryNode.operation === XcalarApisTStr[XcalarApisT.XcalarApiAggregate] &&
                        !tableName.startsWith(gAggVarPrefix)) {
                        tableName = gAggVarPrefix + tableName;
                    }
                    queryNode.comment = JSON.stringify({nodeIds: [node.getTableNewDagIdMap()[tableName]]});
                }
            });

            finalQueryStr = JSON.stringify(queryNodes);
            node.setXcQueryString(finalQueryStr);

            node.getSubGraph().startExecution(queryNodes, null);
            // Might need to make it configurable
            const options = {
                checkTime: 500
            };
            // Set status to Running
            node.setSQLQuery({
                status: SQLStatus.Running,
                startTime: new Date()
            });
            node.updateSQLQueryHistory();
            let finalQueryStrParamReplaced: string = DagNodeInput.replaceParameters(
                    finalQueryStr, this.getRuntime().getDagParamService().getParamMap());

            return XIApi.query(self.txId, queryId, finalQueryStrParamReplaced, options);
        })
        .then(function(_res) {
            node.getSQLQuery().columns = node.getColumns();
            node.updateSQLQueryHistory();
            deferred.resolve(newDestTableName);
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

    private _sqlFuncIn(): XDPromise<string> {
        const node: DagNodeSQLFuncIn = <DagNodeSQLFuncIn>this.node;
        const params: DagNodeSQLFuncInInputStruct = node.getParam(this.replaceParam);
        const isSimulate: boolean = Transaction.isSimulate(this.txId);
        const source: string = params.source;
        if (isSimulate && !this.isBatchExecution) {
            return PromiseHelper.resolve(source);
        } else {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            const newTableName = this._generateTableName(source);
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
            return PromiseHelper.reject("Has duplicate column name in table function out");
        }
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.synthesize(this.txId, colInfos, srcTable, desTable);
    }

    private _mapEvalStrAggs(evalString: string, aggs: string[]): string {
        if (aggs.length == 0 || (!this.isOptimized && !(this.isLinkInBatch && !this.isOptimized))) {
            return evalString;
        }
        if (this.isLinkInBatch && !this.isOptimized) {
            aggs.forEach(frontName => {
                if (this.aggNames.has(frontName)) {
                    let renamed = this.aggNames.get(frontName);
                    if (!renamed.startsWith(gAggVarPrefix)) {
                        renamed = gAggVarPrefix + renamed;
                    }
                    evalString = evalString.replace(frontName, renamed);
                }
            });
            return evalString;
        }
        for (let i = 0; i < aggs.length; i++) {
            let frontName = aggs[i];
            if (this.aggNames.has(frontName)) {
                let modifiedFront = frontName;
                if (frontName.startsWith(gAggVarPrefix)) {
                    modifiedFront = frontName.substring(1);
                }
                let backName = gAggVarPrefix + "batch_" + this.tabId + "_" + modifiedFront;
                evalString = evalString.replace(frontName, backName);
            }
        }
        return evalString;
    }

    protected getRuntime(): DagRuntime {
        return DagRuntime.getDefaultRuntime();
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeExecutor = DagNodeExecutor;
};
