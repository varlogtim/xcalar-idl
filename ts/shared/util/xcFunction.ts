namespace xcFunction {
    interface XcFuncOptions {
        formOpenTime?: number;
    }

    interface XcFuncSortColInfo {
        colNum?: number;
        ordering: number;
        typeToCast: ColumnType | null;
        name?: string;
    }

    interface XcFuncSortOptions extends XcFuncOptions {

    }

    /**
     * xcFunction.sort
     * @param tableId
     * @param colInfo
     * @param options
     */
    export function sort(
        tableId: string,
        colInfos: XcFuncSortColInfo[],
        options: XcFuncSortOptions = <XcFuncSortOptions>{}
    ): XDPromise<string> {
        const table: TableMeta = gTables[tableId];
        const tableName: string = table.getName();
        const tableCols: ProgCol[] = table.tableCols;
        const keys: string[] = [];
        const colNums: number[] = [];
        const orders: number[] = [];

        colInfos.forEach((colInfo) => {
            let progCol: ProgCol = null;
            let colNum: number = colInfo.colNum
            if (colInfo.colNum == null && colInfo.name != null) {
                colNum = table.getColNumByBackName(colInfo.name);
            }

            if (colNum != null) {
                progCol = table.getCol(colInfo.colNum);
            }
            if (progCol == null) {
                keys.push(colInfo.name);
            } else {
                keys.push(progCol.getFrontColName(true));
            }

            colNums.push(colNum);
            orders.push(colInfo.ordering);
        });

        function typeCastHelper(srcTable: string): XDPromise<string> {
            const typesToCast: ColumnType[] = [];
            const mapStrs: string[] = [];
            const mapColNames: string[] = [];
            const newColInfos: {name: string, ordering: XcalarOrderingT, type?: ColumnType}[] = [];
            let newTableCols: ProgCol[] = tableCols;

            colInfos.forEach((colInfo, i) => {
                const progCol: ProgCol = table.getCol(colNums[i]);
                const backColName: string = (progCol == null) ?
                    colInfo.name : progCol.getBackColName();

                const parsedName: PrefixColInfo = xcHelper.parsePrefixColName(backColName);
                let typeToCast: ColumnType = colInfo.typeToCast;
                const type: ColumnType = (progCol == null) ?
                    null : progCol.getType();
                if (parsedName.prefix !== "") {
                    // if it's a prefix, need to cast to immediate first
                    // as sort will create an immeidate and go back to sort table's
                    // parent table need to have the same column
                    typeToCast = typeToCast || type;
                }
                if (typeToCast != null) {
                    const mapString: string = xcHelper.castStrHelper(backColName, typeToCast, false);
                    let mapColName: string = xcHelper.stripColName(parsedName.name);
                    mapColName = xcHelper.getUniqColName(tableId, mapColName);

                    mapStrs.push(mapString);
                    mapColNames.push(mapColName);
                    typesToCast.push(typeToCast);
                    newColInfos.push({
                        name: mapColName,
                        ordering: colInfo.ordering,
                        type: typeToCast
                    });

                    const mapOptions: xcHelper.MapColOption = {
                        replaceColumn: true,
                        resize: true,
                        type: typeToCast
                    };
                    newTableCols = xcHelper.mapColGenerate(colNums[i], mapColName,
                        mapString, newTableCols, mapOptions);
                } else {
                    newColInfos.push({
                        name: backColName,
                        ordering: colInfo.ordering,
                        type: type
                    });
                }
            });

            if (!mapStrs.length) {
                return PromiseHelper.resolve(srcTable, newColInfos, tableCols);
            }

            sql['typeToCast'] = typesToCast;
            const innerDeferred: XDDeferred<string> = PromiseHelper.deferred();

            XIApi.map(txId, mapStrs, srcTable, mapColNames)
            .then((mapTableName) => {
                TblManager.setOrphanTableMeta(mapTableName, newTableCols);
                innerDeferred.resolve(mapTableName, newColInfos, newTableCols);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        // XXX fix this
        const direction: string = (orders[0] === XcalarOrderingT.XcalarOrderingAscending) ?
            "ASC" : "DESC";
        const sql: object = {
            operation: SQLOps.Sort,
            tableName: tableName,
            tableId: tableId,
            keys: keys,
            colNums: colNums,
            orders: orders,
            direction: direction,
            sorted: true,
            options: options,
            colInfo: colInfos,
            htmlExclude: ["options", "colInfo"]
        };
        let msg;
        if (colInfos.length > 1) {
            msg = StatusMessageTStr.Sort + " multiple columns";
        } else {
            msg = StatusMessageTStr.Sort + " " +
                xcHelper.escapeHTMLSpecialChar(keys[0]);
        }
        const txId: number = Transaction.start({
            msg: msg,
            operation: SQLOps.Sort,
            sql: sql,
            track: true
        });

        // user timeout because it may fail soon if table is already sorted
        // lock table will cause blinking
        xcHelper.lockTable(tableId, txId, {delayTime: 200});

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let finalTableName: string;
        let finalTableCols: ProgCol[];

        typeCastHelper(tableName)
        .then((tableToSort, newColInfos, newTableCols) => {
            finalTableCols = newTableCols;

            newColInfos.forEach((colInfo) => {
                if (colInfo.type == null) {
                    const table: TableMeta = gTables[tableId];
                    if (table != null) {
                        const progCol: ProgCol = table.getCol(colInfo.colNum);
                        if (progCol != null) {
                            colInfo.name = progCol.getBackColName();
                            colInfo.type = progCol.getType();
                            if (colInfo.type === ColumnType.number) {
                                colInfo.type = ColumnType.float;
                            }
                        }
                    }
                }
            });

            return XIApi.sort(txId, newColInfos, tableToSort);
        })
        .then((sortTableName) => {
            finalTableName = sortTableName;
            // sort will filter out KNF, so it change the profile
            return TblManager.refreshTable([finalTableName], finalTableCols, [tableName], txId);
        })
        .then(() => {
            if (table.hasLock()) {
                xcHelper.unlockTable(tableId);
            }

            sql['newTableName'] = finalTableName;
            Transaction.done(txId, {
                msgTable: xcHelper.getTableId(finalTableName),
                sql: sql
            });
            deferred.resolve(finalTableName);
        })
        .fail((error, sorted) => {
            if (table.hasLock()) {
                xcHelper.unlockTable(tableId);
            }

            if (sorted) {
                Transaction.cancel(txId);
                const msg: string = xcHelper.replaceMsg(IndexTStr.SortedErr, {
                    order: XcalarOrderingTStr[orders[0]].toLowerCase() // XXX fix this
                });
                Alert.error(IndexTStr.Sorted, msg);
            } else if (error.error === SQLType.Cancel) {
                Transaction.cancel(txId);
                deferred.resolve();
            } else {
                Transaction.fail(txId, {
                    failMsg: StatusMessageTStr.SortFailed,
                    error: error
                });
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     *
     * @param txId
     * @param tableName
     * @param otherTableName
     * @param colsToIndex an optional array of colnames, if a new index table
     * needs to be created, "colsToIndex" will be used
     * as the keys for the new index table
     */
    function getUnsortedTableName(
        txId: number,
        tableName: string,
        otherTableName?: string,
        colsToIndex?: string[]
    ): XDPromise<string> {
        // XXX this may not right but have to this
        // or some intermediate table cannot be found
        if (txId != null && Transaction.isSimulate(txId)) {
            return PromiseHelper.resolve(tableName, otherTableName);
        }

        if (!otherTableName) {
            return getUnsortedTableHelper(txId, tableName, colsToIndex);
        } else {
            const def1: XDPromise<string> = getUnsortedTableHelper(txId, tableName, colsToIndex);
            const def2: XDPromise<string> = getUnsortedTableHelper(txId, otherTableName, colsToIndex);
            return PromiseHelper.when(def1, def2);
        }
    };

    function getUnsortedTableHelper(
        txId: number,
        table: string,
        colsToIndex?: string[]
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const originalTableName = table;
        let srcTableName = table;

        XcalarGetDag(table)
        .then((nodeArray) => {
            // Check if the last one is a sort. If it is, then use the unsorted
            // one
            // If it isn't then just return the original
            if (nodeArray.node[0].api === XcalarApisT.XcalarApiIndex) {
                const indexInput = nodeArray.node[0].input.indexInput;
                const primeKey = indexInput.key[0];
                // no matter it's sorted or multi sorted, first key must be sorted
                if (primeKey.ordering ===
                    XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending] ||
                    primeKey.ordering ===
                    XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]
                ) {
                    // Find parent and return parent's name
                    const node = DagFunction.construct(nodeArray.node).tree;
                    srcTableName = node.getSourceNames()[0];
                    const hasReadyState = checkIfTableHasReadyState(node
                                                                  .parents[0]);

                    if (!hasReadyState) {
                        srcTableName = xcHelper.getTableName(originalTableName) +
                                       Authentication.getHashId();
                        let colNames: string[];
                        if (!colsToIndex) {
                            colNames = indexInput.key.map((keyAttr) => keyAttr.name);
                        } else {
                            colNames = colsToIndex;
                        }

                        return XIApi.index(txId, colNames, originalTableName, srcTableName);
                    } else {
                        return PromiseHelper.resolve(null);
                    }
                }
            } else if (nodeArray.node[0].api === XcalarApisT.XcalarApiExecuteRetina) {
                // if this is a sorted retina node, then it doesn't have
                // parents we can use to index on, so we index on the retina
                // node itself
                var innerDeferred = PromiseHelper.deferred();
                XcalarGetTableMeta(table)
                .then((ret) => {
                    var keyAttrs = ret.keyAttr;
                    if (keyAttrs[0] &&
                        (keyAttrs[0].ordering ===
                        XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending] ||
                        keyAttrs[0].ordering ===
                        XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending])) {

                        srcTableName = xcHelper.getTableName(originalTableName) +
                                       Authentication.getHashId();
                        let colNames: string[];
                        if (!colsToIndex) {
                            colNames = keyAttrs.map((keyAttr) => keyAttr.name);
                        } else {
                            colNames = colsToIndex;
                        }
                        return XIApi.index(txId, colNames, originalTableName, srcTableName);
                    } else {
                        return PromiseHelper.resolve();
                    }
                })
                .then(innerDeferred.resolve)
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            } else {
                return PromiseHelper.resolve(null);
            }
        })
        .then(function() {
            deferred.resolve(srcTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}