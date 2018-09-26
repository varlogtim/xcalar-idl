class DagNodeExecutor {
    private node: DagNode;
    private txId: number;

    public constructor(node: DagNode, txId: number) {
        this.node = node;
        this.txId = txId;
    }

    /**
     * run the node operation
     */
    public run(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const node: DagNode =  this.node;
        node.beRunningState();

        this._apiAdapter()
        .then((destTable) => {
            if (destTable != null) {
                node.setTable(destTable);
            }
            node.beCompleteState();
            deferred.resolve(destTable);
        })
        .fail((error) => {
            const errorStr: string = (typeof error === "string") ?
            error : JSON.stringify(error);
            node.beErrorState(errorStr);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _apiAdapter(): XDPromise<string | null> {
        const type: DagNodeType = this.node.getType();
        switch (type) {
            case DagNodeType.Dataset:
                return this._loadDataset();
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
            case DagNodeType.Project:
                return this._project();
            case DagNodeType.Set:
                return this._set();
            case DagNodeType.Export:
                return this._export();
            case DagNodeType.Custom:
                return this._custom();
            case DagNodeType.CustomInput:
                return this._customInput();
            case DagNodeType.DFIn:
                return this._dfIn();
            case DagNodeType.DFOut:
                return this._dfOut();
            case DagNodeType.PublishIMD:
                return this._publishIMD();
            default:
                throw new Error(type + " not supported!");
        }
    }

    private _getParentNodeTable(pos: number): string {
        const parentNode: DagNode = this.node.getParents()[pos];
        return parentNode.getTable();
    }

    // XXX TODO
    private _generateTableName(): string {
        console.warn("not implemented yet!");
        return xcHelper.randName("test") + Authentication.getHashId();
    }

    private _loadDataset(): XDPromise<string> {
        const node: DagNodeDataset = <DagNodeDataset>this.node;
        const params: DagNodeDatasetInput = node.getParam();
        const dsName: string = params.source;
        const prefix: string = params.prefix;
        const desTable = this._generateTableName();
        return XIApi.indexFromDataset(this.txId, dsName, desTable, prefix);
    }

    private _aggregate(): XDPromise<null> {
        const deferred: XDDeferred<null> = PromiseHelper.deferred();
        const node: DagNodeAggregate = <DagNodeAggregate>this.node;
        const params: DagNodeAggregateInput = node.getParam();
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
                op: null
            };
            Aggregates.addAgg(aggRes, toDelete);
            deferred.resolve(null); // no table generated
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _filter(): XDPromise<string> {
        const node: DagNodeFilter = <DagNodeFilter>this.node;
        const params: DagNodeFilterInput = node.getParam();
        const fltStr: string = params.evalString;
        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        return XIApi.filter(this.txId, fltStr, srcTable, desTable);
    }

    private _groupby(): XDPromise<string> {
        const node: DagNodeGroupBy = <DagNodeGroupBy>this.node;
        const params: DagNodeGroupByInput = node.getParam();
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
            newKeys: params.newKeys
        };
        return XIApi.groupBy(this.txId, aggArgs, params.groupBy, srcTable, options);
    }

    private _join(): XDPromise<string> {
        const node: DagNodeJoin = <DagNodeJoin>this.node;
        const params: DagNodeJoinInput = node.getParam();
        // convert joinType
        let joinType: JoinType = null;
        for (let key in JoinOperatorT) {
            if (key.toLowerCase() === params.joinType.toLowerCase()) {
                joinType = <JoinType>JoinOperatorT[key];
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
        }
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
        const params: DagNodeMapInput = node.getParam();
        const mapStrs: string[] = [];
        const newFields: string[] = [];

        params.eval.forEach((item) => {
            mapStrs.push(item.evalString);
            newFields.push(item.newField);
        });

        const srcTable: string = this._getParentNodeTable(0);
        const desTable: string = this._generateTableName();
        const isIcv: boolean = params.icv;
        return XIApi.map(this.txId, mapStrs, srcTable, newFields, desTable, isIcv);
    }

    private _project(): XDPromise<string> {
        const node: DagNodeProject = <DagNodeProject>this.node;
        const params: DagNodeProjectInput = node.getParam();
        const srcTable: string = this._getParentNodeTable(0);
        const destTable: string = this._generateTableName();
        return XIApi.project(this.txId, params.columns, srcTable, destTable);
    }

    private _set(): XDPromise<string> {
        const node: DagNodeSet = <DagNodeSet>this.node;
        const params: DagNodeSetInput = node.getParam();
        const unionType: UnionOperatorT = this._getUnionType(params.unionType);
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

    private _getUnionType(unionType: UnionType): UnionOperatorT {
        switch (unionType) {
            case (UnionType.Except):
                return UnionOperatorT.UnionExcept;
            case (UnionType.Intersect):
                return UnionOperatorT.UnionIntersect;
            case (UnionType.Union):
                return UnionOperatorT.UnionStandard;
            default:
                throw new Error("Union Type " + unionType + " not supported");
        }
    }

    private _export(): XDPromise<null> {
        const deferred: XDDeferred<null> = PromiseHelper.deferred();
        const node: DagNodeExport = <DagNodeExport>this.node;
        const params: DagNodeExportInput = node.getParam();
        const srcTable: string = this._getParentNodeTable(0);
        const numCols: number = params.columns.length;
        const frontColumns: string[] = [];
        const backColumns: string[] = [];

        params.columns.forEach((colInfo) => {
            backColumns.push(colInfo.sourceColumn);
            frontColumns.push(colInfo.destColumn);
        });

        XIApi.exportTable(this.txId, srcTable, params.exportName,
            params.targetName, numCols, backColumns, frontColumns,
            params.keepOrder, params.options)
        .then(() => {
            deferred.resolve(null); // no table generated
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _dfIn(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        try {
            const node: DagNodeDFIn = <DagNodeDFIn>this.node;
            const res = node.getLinedNodeAndGraph();
            const graph: DagGraph = res.graph;
            const linkOutNode: DagNodeDFOut = res.node;
            let destTable: string;
            graph.getQuery(linkOutNode.getId())
            .then((query, table) => {
                destTable = table;
                return XIApi.query(this.txId, destTable, query);
            })
            .then(() => {
                deferred.resolve(destTable);
            })
            .fail(deferred.reject);
        } catch (e) {
            console.error("execute error", e);
            deferred.reject(e);
        }

        return deferred.promise();
    }

    private _dfOut(): XDPromise<null> {
        return PromiseHelper.resolve(null);
    }

    private _publishIMD(): XDPromise<null> {
        const node: DagNodePublishIMD = <DagNodePublishIMD>this.node;
        const params: DagNodePublishIMDInput = node.getParam();
        //XXX TODO: Integrate with new XIAPI.publishTable
        const deferred: XDDeferred<null> = PromiseHelper.deferred();
        return deferred.resolve();
    }
}