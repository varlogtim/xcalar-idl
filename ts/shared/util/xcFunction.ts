namespace xcFunction {
    interface XcFuncOptions {
        formOpenTime?: number;
    }

    interface XcFuncFilterOptions extends XcFuncOptions {
        filterString: string; // eval string, required
        worksheet?: string; // wsId
        complement?: boolean;
    }

    interface XcFuncSortColInfo {
        colNum?: number;
        ordering: number;
        typeToCast: ColumnType | null;
        name?: string;
    }

    interface XcFuncJoinInfo {
        colNums: number[]; // array of column numbers to join on
        casts: ColumnType[]; // array of cast types ["string", "boolean", null]
        pulledColumns: string[]; // columns to pulled out (front col name)
        tableId: TableId;
        rename: ColRenameInfo[]; // array of rename object, can be null or empty array
        allImmediates: string[]; // list of all immediate names. for use in xiapi for col name collision
        tablePos: number;
        ws: string;
    }

    interface XcFuncJoinOptions extends XcFuncOptions {
        keepTables: boolean; // if true will keep src tables in worksheet
        filterEvalString: string; // used only for cross joins
    }

    interface XcFuncSortOptions extends XcFuncOptions {

    }

    interface XcFuncUnionTableInfo extends UnionTableInfo {
        tablePos: number;
        ws: string;
    }

    interface XcFuncUnionOptions {
        keepTables: boolean,
        unionType?: UnionOperatorT,
        formOpenTime?: number
    }

    interface XcFuncAggColInfo extends AggColInfo {
        cast: ColumnType;
    }

    interface XcFuncGroupByColInfo {
        colName: string;
        cast: ColumnType;
    }

    interface XcFuncGroupByOptions extends XcFuncOptions {
        isIncSample: boolean;
        isKeepOriginal: boolean;
        isJoin: boolean;
        icvMode: boolean;
        columnsToKeep: number[];
        dstTableName: string;
        groupAll?: boolean
    }

    interface XcFuncMapOptions extends XcFuncOptions, xcHelper.MapColOption {
    }

    /**
     * xcFunction.filter
     * @param colNum
     * @param tableId
     * @param fltOptions
     */
    export function filter(
        colNum: number,
        tableId: TableId,
        fltOptions: XcFuncFilterOptions = <XcFuncFilterOptions>{}
    ): XDPromise<string> {
        const table: TableMeta = gTables[tableId];
        const tableName: string = table.getName();
        const frontColName: string = table.getCol(colNum).getFrontColName(true);
        const curWorksheet: string = WSManager.getWSFromTable(tableId);

        let formOpenTime: number;
        if (fltOptions.formOpenTime) {
            formOpenTime = fltOptions.formOpenTime;
            delete fltOptions.formOpenTime;
        }

        const sql: object = {
            operation: SQLOps.Filter,
            tableName: tableName,
            tableId: tableId,
            colName: frontColName,
            colNum: colNum,
            fltOptions: fltOptions,
            formOpenTime: formOpenTime,
            htmlExclude: ['formOpenTime']
        };
        const msg: string = StatusMessageTStr.Filter + ': ' +
            xcHelper.escapeHTMLSpecialChar(frontColName);
        const txId: number = Transaction.start({
            msg: msg,
            operation: SQLOps.Filter,
            sql: sql,
            steps: 1,
            track: true
        });

        xcHelper.lockTable(tableId, txId);

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let finalTableName: string;

        getUnsortedTableName(txId, tableName)
        .then((unsortedTable) => {
            return XIApi.filter(txId, fltOptions.filterString, unsortedTable);
        })
        .then((tableAfterFilter) => {
            finalTableName = tableAfterFilter;
            const oldTables = fltOptions.complement ? [] : [tableName];
            // fltOptions.worksheet is used in complement tables
            const worksheet: string = fltOptions.worksheet ?
                fltOptions.worksheet : curWorksheet;
            return TblManager.refreshTable([finalTableName], table.tableCols,
                oldTables, worksheet, txId, {
                    selectCol: colNum
                });
        })
        .then(() => {
            xcHelper.unlockTable(tableId);

            sql['newTableName'] = finalTableName;
            Transaction.done(txId, {
                msgTable: xcHelper.getTableId(finalTableName),
                sql: sql
            });
            deferred.resolve(finalTableName);
        })
        .fail((error) => {
            xcHelper.unlockTable(tableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.FilterFailed,
                "error": error
            });

            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * xcFunction.aggregate
     * aggregate table column
     * @param colNum
     * @param tableId
     * @param aggrOp
     * @param aggStr
     * @param aggName (optional), can be left blank (will autogenerate)
     */
    export function aggregate(
        colNum: number,
        tableId: TableId,
        aggrOp: string,
        aggStr: string,
        aggName?: string
    ): XDPromise<string | number> {
        const table: TableMeta = gTables[tableId];
        let frontColName: string;
        let backColName: string;
        if (colNum != null && colNum !== -1) {
            const progCol: ProgCol = table.getCol(colNum);
            frontColName = progCol.getFrontColName(true);
            backColName = progCol.getBackColName();
        } else {
            frontColName = aggStr;
            backColName = aggStr;
        }

        const title: string = xcHelper.replaceMsg(AggTStr.AggTitle, {
            op: aggrOp
        });
        let instr: string = xcHelper.replaceMsg(AggTStr.AggInstr, {
            col: frontColName,
            op: aggrOp
        });
        const hasAggName: boolean = (aggName && aggName[0] === gAggVarPrefix);
        if (hasAggName) {
            instr += xcHelper.replaceMsg(AggTStr.AggName, {
                aggName: aggName
            });
        }

        const aggInfo: any = Aggregates.getAgg(tableId, backColName, aggrOp);
        if (aggInfo != null && !hasAggName) {
            const alertMsg: string = xcHelper.replaceMsg(AggTStr.AggMsg, {
                val: xcHelper.numToStr(aggInfo.value)
            });
            Alert.show({
                title: title,
                instr: instr,
                msg: alertMsg,
                isAlert: true
            });

            return PromiseHelper.resolve(aggInfo.value, aggInfo.dagName);
        }

        const tableName: string = table.getName();
        const sql: object = {
            operation: SQLOps.Aggr,
            tableName: tableName,
            tableId: tableId,
            colName: frontColName,
            colNum: colNum,
            aggrOp: aggrOp,
            aggStr: aggStr,
            aggName: aggName,
            htmlExclude: ["aggStr"]
        };
        const msg: string = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
            StatusMessageTStr.OnColumn + ": " +
            xcHelper.escapeHTMLSpecialChar(frontColName);
        const txId: number = Transaction.start({
            msg: msg,
            operation: SQLOps.Aggr,
            sql: sql,
            steps: 1,
            track: true
        });

        xcHelper.lockTable(tableId, txId);

        // backend doesn't take gAggVarPrefix so we will add it back later
        const origAggName: string = aggName;
        if (hasAggName) {
            aggName = aggName.slice(1);
        }

        const deferred: XDDeferred<string | number> = PromiseHelper.deferred();
        getUnsortedTableName(txId, tableName)
        .then((unsortedTable) => {
            return XIApi.aggregate(txId, aggrOp, aggStr, unsortedTable, aggName);
        })
        .then((value, dstDagName, toDelete) => {
            const aggRes: object = {
                value: value,
                dagName: dstDagName,
                aggName: origAggName,
                tableId: tableId,
                backColName: backColName,
                op: aggrOp
            };

            if (toDelete) {
                // and to UI cache only
                Aggregates.addAgg(aggRes, true);
            } else {
                Aggregates.addAgg(aggRes, false);
                TableList.refreshConstantList();
            }

            Transaction.done(txId, { msgTable: tableId });
            // show result in alert modal
            const alertMsg = xcHelper.replaceMsg(AggTStr.AggMsg, {
                val: xcHelper.numToStr(<number>value)
            });

            Alert.show({
                title: title,
                instr: instr,
                msg: alertMsg,
                isAlert: true
            });
            deferred.resolve(value, dstDagName);
        })
        .fail((error) => {
            Transaction.fail(txId, {
                failMsg: StatusMessageTStr.AggregateFailed,
                error: error
            });
            deferred.reject(error);
        })
        .always(() => {
            xcHelper.unlockTable(tableId);
        });

        return deferred.promise();
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
            const progCol: ProgCol = table.getCol(colInfo.colNum);
            if (progCol == null) {
                keys.push(colInfo.name);
            } else {
                keys.push(progCol.getFrontColName(true));
            }

            colNums.push(colInfo.colNum);
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
                if (parsedName.prefix !== "") {
                    // if it's a prefix, need to cast to immediate first
                    // as sort will create an immeidate and go back to sort table's
                    // parent table need to have the same column
                    const type: ColumnType = (progCol == null) ?
                    null : progCol.getType();
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
                        type: null
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
        const worksheet: string = WSManager.getWSFromTable(tableId);
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

        getUnsortedTableName(txId, tableName)
        .then((unsortedTable) => {
            return typeCastHelper(unsortedTable);
        })
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
            const colsToSelect: number[] = colNums.filter((colNum) => colNum > 0);
            // sort will filter out KNF, so it change the profile
            return TblManager.refreshTable([finalTableName], finalTableCols,
                [tableName], worksheet, txId, { selectCol: colsToSelect });
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
     * xcFunction.join
     * @param joinStr
     * @param lJoinInfo
     * @param rJoinInfo
     * @param newTableName
     * @param options
     */
    export function join(
        joinStr: string,
        lJoinInfo: XcFuncJoinInfo = <XcFuncJoinInfo>{},
        rJoinInfo: XcFuncJoinInfo = <XcFuncJoinInfo>{},
        newTableName: string,
        options: XcFuncJoinOptions = <XcFuncJoinOptions>{}
    ): XDPromise<string> {
        newTableName = newTableName + Authentication.getHashId();

        const lTableId: TableId = lJoinInfo.tableId;
        const lColNums: number[] = lJoinInfo.colNums;
        const lTable: TableMeta = gTables[lTableId];
        const lTableName: string = lTable.getName();
        lJoinInfo.tablePos = WSManager.getTableRelativePosition(lTableId);
        lJoinInfo.ws = WSManager.getWSFromTable(lTableId);

        const rTableId: TableId = rJoinInfo.tableId;
        const rColNums: number[] = rJoinInfo.colNums;
        const rTable: TableMeta = gTables[rTableId];
        const rTableName: string = rTable.getName();
        rJoinInfo.tablePos = WSManager.getTableRelativePosition(rTableId);
        rJoinInfo.ws = WSManager.getWSFromTable(rTableId);

        const lColNames: string[] = lColNums.map((colNum) => {
            return lTable.getCol(colNum).getBackColName();
        });

        const rColNames: string[] = rColNums.map((colNum) => {
            return rTable.getCol(colNum).getBackColName();
        });

        // joined table will in the current active worksheet.
        const worksheet: string = WSManager.getActiveWS();
        const sql: object = {
            "operation": SQLOps.Join,
            "lTableName": lTableName,
            "lColNums": lColNums,
            "lJoinInfo": lJoinInfo,
            "rTableName": rTableName,
            "rColNums": rColNums,
            "rJoinInfo": rJoinInfo,
            "newTableName": newTableName,
            "joinStr": joinStr,
            "worksheet": worksheet,
            "options": options,
            "htmlExclude": ["lJoinInfo", "rJoinInfo", "worksheet", "options"]
        };

        // regular join on unsorted cols = 3, 1 if sorted (through groupby)
        // left table index (optional), right table index (optional), join

        // multi join on unsorted cols = 5, 3 if sorted
        // concat left, concat right, index left, index right, join
        const steps: number = (lColNums.length > 1) ? 5 : 3;
        const txId: number = Transaction.start({
            msg: StatusMessageTStr.Join,
            operation: SQLOps.Join,
            sql: sql,
            steps: steps,
            track: true
        });

        xcHelper.lockTable(lTableId, txId);
        xcHelper.lockTable(rTableId, txId);

        const scrollChecker: ScrollTableChecker = new ScrollTableChecker();

        const lTableInfo: JoinTableInfo = {
            tableName: lTableName,
            columns: lColNames,
            casts: lJoinInfo.casts,
            rename: lJoinInfo.rename,
            allImmediates: lJoinInfo.allImmediates
        };

        const rTableInfo: JoinTableInfo = {
            tableName: rTableName,
            columns: rColNames,
            casts: rJoinInfo.casts,
            rename: rJoinInfo.rename,
            allImmediates: rJoinInfo.allImmediates
        };

        const joinType: JoinType = gJoinLookup[joinStr];
        const newTableId: TableId = xcHelper.getTableId(newTableName);
        const joinOpts: JoinOptions = {
            newTableName: newTableName,
            evalString: options.filterEvalString
        };
        let finalJoinTableName: string;
        let focusOnTable: boolean = false;

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        getUnsortedTableName(txId, lTableName, rTableName)
        .then((lUnsortedTable, rUnSortedTable) => {
            lTableInfo.tableName = lUnsortedTable;
            rTableInfo.tableName = rUnSortedTable;
            return XIApi.join(txId, joinType, lTableInfo, rTableInfo, joinOpts);
        })
        .then((finalTableName, _tempCols, lRename, rRename) => {
            finalJoinTableName = finalTableName;
            const finalCols: ProgCol[] = xcHelper.createJoinedColumns(
                lTableInfo.tableName, rTableInfo.tableName,
                lJoinInfo.pulledColumns, rJoinInfo.pulledColumns,
                lRename, rRename);
            const tablesToReplace: string[] = options.keepTables ?
                [] : [lTableName, rTableName];
            focusOnTable = scrollChecker.checkScroll();

            return TblManager.refreshTable([finalTableName], finalCols,
                tablesToReplace, worksheet, txId, { focusWorkspace: focusOnTable });
        })
        .then(() => {
            Transaction.done(txId, {
                msgTable: newTableId,
                noNotification: focusOnTable
            });
            deferred.resolve(finalJoinTableName);
        })
        .fail((error) => {
            Transaction.fail(txId, {
                failMsg: StatusMessageTStr.JoinFailed,
                error: error
            });
            deferred.reject(error);
        })
        .always(() => {
            xcHelper.unlockTable(lTableId);
            xcHelper.unlockTable(rTableId);
        });

        return deferred.promise();
    }

    /**
     * xcFunction.union
     * @param tableInfos
     * @param dedup
     * @param newTableName
     * @param options
     */
    export function union(
        tableInfos: XcFuncUnionTableInfo[],
        dedup: boolean,
        newTableName: string,
        options: XcFuncUnionOptions = <XcFuncUnionOptions>{}
    ): XDPromise<string> {
        if (newTableName != null) {
            newTableName += Authentication.getHashId();
        }

        const tableIds: TableId[] = [];
        const tableNames: string[] = [];
        tableInfos.forEach((tableInfo) => {
            const tableId: TableId = xcHelper.getTableId(tableInfo.tableName);
            tableIds.push(tableId);
            tableInfo.tablePos = WSManager.getTableRelativePosition(tableId);
            tableInfo.ws = WSManager.getWSFromTable(tableId);
            tableNames.push(gTables[tableId].getName());
        });

        const sql: object = {
            operation: SQLOps.Union,
            tableNames: tableNames,
            tableInfos: xcHelper.deepCopy(tableInfos),
            dedup: dedup,
            newTableName: newTableName,
            options: options,
            htmlExclude: ["tableInfos", "options"]
        };

        const txId: number = Transaction.start({
            msg: StatusMessageTStr.Union,
            operation: SQLOps.Union,
            steps: 1,
            sql: sql,
            track: true
        });

        tableIds.forEach((tableId) => {
            xcHelper.lockTable(tableId, txId);
        });

        const scrollChecker: ScrollTableChecker = new ScrollTableChecker();

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const curWS: string = WSManager.getActiveWS();
        let focusOnTable: boolean = false;
        let finalTableName: string;
        let finalTableCols: ProgCol[];

        getUnsortedTablesInUnion(txId, tableNames)
        .then((unsortedTables) => {
            unsortedTables.forEach((unsortedTable, index) => {
                tableInfos[index].tableName = unsortedTable;
            });

            return XIApi.union(txId, <UnionTableInfo[]>tableInfos, dedup,
                newTableName, options.unionType);
        })
        .then((nTableName, nTableCols) => {
            finalTableCols = nTableCols;
            finalTableName = nTableName;
            focusOnTable = scrollChecker.checkScroll();
            const tablesToReplace: string[] = options.keepTables ? [] : tableNames;
            return TblManager.refreshTable([finalTableName], finalTableCols,
                tablesToReplace, curWS, txId, { focusWorkspace: focusOnTable });
        })
        .then(() => {
            sql["newTableName"] = finalTableName;
            Transaction.done(txId, {
                msgTable: xcHelper.getTableId(finalTableName),
                noNotification: focusOnTable,
                sql: sql
            });
            deferred.resolve(finalTableName);
        })
        .fail((error) => {
            Transaction.fail(txId, {
                failMsg: StatusMessageTStr.UnionFailed,
                error: error
            });
            deferred.reject(error);
        })
        .always(() => {
            tableIds.forEach((tableId) => {
                xcHelper.unlockTable(tableId);
            });
        });

        return deferred.promise();
    }

    /**
     * xcFunction.groupBy
     * @param tableId
     * @param aggregateArgs
     * @param groupByCols
     * @param options
     */
    export function groupBy(
        tableId: TableId,
        aggregateArgs: XcFuncAggColInfo[],
        groupByCols: XcFuncGroupByColInfo[],
        options: XcFuncGroupByOptions = <XcFuncGroupByOptions>{}
    ): XDPromise<string> {
        // Validation
        if (tableId == null ||
            (groupByCols.length < 1 && !options.groupAll) ||
            aggregateArgs.length < 1 ||
            aggregateArgs[0].aggColName.length < 1
        ) {
            return PromiseHelper.reject('Invalid Parameters!');
        }

        const table: TableMeta = gTables[tableId];
        const tableName: string = table.getName();
        let dstTableName: string = options.dstTableName || null;
        if (dstTableName != null) {
            dstTableName += Authentication.getHashId();
        }

        let steps: number;
        // XXX figure out num steps with multiple group bys
        if (groupByCols.length > 1) {
            // concat, index(optional), groupby, [cuts]
            steps = 3 + groupByCols.length;
        } else {
            // index(optional), groupby
            steps = 2;
        }

        const isJoin: boolean = options.isJoin || false;
        if (isJoin) {
            if (groupByCols.length > 1) {
                // concat L, concat R, index L,  index R, join
                steps += 5;
            } else { // one groupByCol, indexed groupby table will exists already
                // index, join
                steps += 2;
            }
        }
        if (aggregateArgs.length > 1) {
            steps = -1;
        }

        const sql: object = {
            operation: SQLOps.GroupBy,
            args: aggregateArgs,
            tableName: tableName,
            tableId: tableId,
            groupByCols: groupByCols,
            options: options,
            htmlExclude: ["options"]
        };

        const txId: number = Transaction.start({
            msg: StatusMessageTStr.GroupBy,
            operation: SQLOps.GroupBy,
            steps: steps,
            sql: sql,
            track: true
        });

        const scrollChecker: ScrollTableChecker = new ScrollTableChecker();
        xcHelper.lockTable(tableId, txId);

        let isIncSample: boolean = options.isIncSample || false;
        // do not pass in the cast property
        const aggArgs: AggColInfo[] = aggregateArgs.map((aggArg) => {
            return {
                operator: aggArg.operator,
                aggColName: aggArg.aggColName,
                newColName: aggArg.newColName,
                isDistinct: aggArg.isDistinct
            };
        });

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const curWS: string = WSManager.getWSFromTable(tableId);
        const isKeepOriginal: boolean = options.isKeepOriginal || false;
        const groupByColNames: string[] = groupByCols.map((gbCol) => gbCol.colName);
        const newKeys: string[] = isIncSample ? [] : getNewGroupByKeys(aggArgs, groupByColNames);
        let focusOnTable: boolean = false;
        let finalTableName: string;
        let finalTableCols: ProgCol[];

        let srcTable: string;
        getUnsortedTableName(txId, tableName)
        .then((unsortedTable) => {
            const needsIndexCast = groupByCols.filter((colInfo) => {
                return colInfo.cast != null;
            }).length > 0;
            let castArgsPromise: XDPromise<string>;
            // agg and groupByCols has no cast
            if (aggArgs.length === 1 && aggregateArgs[0].cast && !needsIndexCast &&
                !aggArgs[0].isDistinct) {
                // if single group by
                aggArgs[0].aggColName = xcHelper.castStrHelper(aggregateArgs[0].aggColName,
                    aggregateArgs[0].cast, false);
                castArgsPromise = PromiseHelper.resolve(unsortedTable);
            } else {
                castArgsPromise = castCols(unsortedTable);
            }
            return castArgsPromise
        })
        .then((castTableName) => {
            srcTable = castTableName;
            const groupByOpts: GroupByOptions = {
                newTableName: dstTableName,
                isIncSample: isIncSample,
                icvMode: options.icvMode,
                groupAll: options.groupAll,
                newKeys: newKeys
            };
            return XIApi.groupBy(txId, aggArgs, groupByColNames,
                castTableName, groupByOpts);
        })
        .then((nTableName, _tempCols, _newKeyFieldName) => {
            const sampleCols: number[] = isIncSample ? options.columnsToKeep : null;
            const nTableCols = xcHelper.createGroupByColumns(srcTable, newKeys,
                aggArgs, sampleCols);
            if (isJoin) {
                const dataColNum: number = table.getColNumByBackName("DATA");
                return groupByJoinHelper(nTableName, nTableCols, dataColNum,
                    isIncSample, newKeys);
            } else {
                return PromiseHelper.resolve(nTableName, nTableCols);
            }
        })
        .then((nTableName: string, nTableCols: ProgCol[]) => {
            finalTableCols = nTableCols;
            finalTableName = nTableName;
            focusOnTable = scrollChecker.checkScroll();

            const tableOptions: object = { "focusWorkspace": focusOnTable };
            let tablesToReplace: string[] = null;
            if (isJoin) {
                const colsToSelect: number[] = [];
                for (let i = 0; i < aggregateArgs.length; i++) {
                    colsToSelect.push(i + 1);
                }
                tableOptions['selectCol'] = colsToSelect;
                tablesToReplace = [tableName];
            } else if (!isKeepOriginal) {
                tablesToReplace = [tableName];
            }

            return TblManager.refreshTable([finalTableName], finalTableCols,
                tablesToReplace, curWS, txId, tableOptions);
        })
        .then(() => {
            sql['newTableName'] = finalTableName;
            Transaction.done(txId, {
                msgTable: xcHelper.getTableId(finalTableName),
                sql: sql,
                noNotification: focusOnTable
            });
            deferred.resolve(finalTableName);
        })
        .fail((error) => {
            Transaction.fail(txId, {
                failMsg: StatusMessageTStr.GroupByFailed,
                error: error,
                sql: sql
            });
            deferred.reject(error);
        })
        .always(() => {
            xcHelper.unlockTable(tableId);
        });

        // cast before doing the group by
        function castCols(tableToCast): XDPromise<string> {
            const takenNames: object = {};
            aggArgs.forEach((aggArg) => {
                takenNames[aggArg.newColName] = true;
            });
            const mapStrs: string[] = [];
            const newCastNames: string[] = [];
            let castTableCols: ProgCol[] = table.tableCols;
            const castHelper = function (type: ColumnType, colName: string): string {
                let parsedName: string = xcHelper.parsePrefixColName(colName).name;
                parsedName = xcHelper.stripColName(parsedName);
                const newCastName: string = xcHelper.getUniqColName(tableId,
                    parsedName, false, takenNames);
                takenNames[newCastName] = true;

                const mapStr: string = xcHelper.castStrHelper(colName, type, false);
                mapStrs.push(mapStr);
                newCastNames.push(newCastName);
                const colNum: number = table.getColNumByBackName(colName);
                const mapOptions: xcHelper.MapColOption = {
                    replaceColumn: true,
                    resize: true,
                    type: type
                };
                castTableCols = xcHelper.mapColGenerate(colNum, newCastName,
                    mapStr, castTableCols, mapOptions);
                return newCastName;
            };

            for (let i = 0; i < aggArgs.length; i++) {
                const type: ColumnType = aggregateArgs[i].cast;
                if (type != null) {
                    const colName: string = aggregateArgs[i].aggColName;
                    const newCastName: string = castHelper(type, colName);
                    aggArgs[i].aggColName = newCastName;
                }
            }

            for (let i = 0; i < groupByCols.length; i++) {
                const type: ColumnType = groupByCols[i].cast;
                if (type != null) {
                    const colName: string = groupByCols[i].colName;
                    const newCastName: string = castHelper(type, colName);
                    groupByColNames[i] = newCastName;
                }
            }

            if (mapStrs.length > 0) {
                const innerDeferred: XDDeferred<string> = PromiseHelper.deferred();
                XIApi.map(txId, mapStrs, tableToCast, newCastNames)
                    .then((castTableName) => {
                        TblManager.setOrphanTableMeta(castTableName, castTableCols);
                        innerDeferred.resolve(castTableName);
                    })
                    .fail((error) => {
                        innerDeferred.reject(error);
                    });
                return innerDeferred.promise();
            } else {
                return PromiseHelper.resolve(tableToCast);
            }
        }

        // TODO when multi-groupby we can use the unsplit table instead of
        // splitting and then concatting again
        function groupByJoinHelper(
            nTable: string,
            nCols: ProgCol[],
            dataColNum: number,
            isIncSample: boolean,
            groupByCols: string[]
        ): XDPromise<string> {
            const jonTable: string = xcHelper.getTableName(nTable) +
                Authentication.getHashId();
            const lTable: TableMeta = gTables[tableId];
            const lTName: string = gTables[tableId].getName();

            const rTName: string = nTable;
            const lCols: string[] = groupByColNames;
            const rRename: ColRenameInfo[] = [];

            const rCols: string[] = groupByCols.map((colName) => {
                colName = xcHelper.stripColName(colName);
                const parse: PrefixColInfo = xcHelper.parsePrefixColName(colName);
                let hasNameConflict: boolean;
                if (isIncSample) {
                    // XXX Cheng: now we don't support join back with incSample
                    // once support, need to verify if it works
                    hasNameConflict = lTable.hasCol(parse.name, parse.prefix);
                } else {
                    colName = parse.name;
                    hasNameConflict = lTable.hasCol(parse.name, "");
                }

                if (hasNameConflict) {
                    // when has immediates conflict
                    console.info("Has immediates conflict, auto resolved");
                    const newName: string = xcHelper.randName(parse.name + "_GB", 3);
                    const renameMap: ColRenameInfo = xcHelper.getJoinRenameMap(colName, newName);
                    rRename.push(renameMap);
                }

                return colName;
            });

            // need to store previous table meta in case of new col names
            TblManager.setOrphanTableMeta(nTable, nCols);

            const innerDeferred: XDDeferred<string> = PromiseHelper.deferred();
            const joinType: JoinType = JoinOperatorT.FullOuterJoin;
            const joinOpts: JoinOptions = { newTableName: jonTable };
            const lTableInfo: JoinTableInfo = {
                tableName: lTName,
                columns: lCols
            };
            const rTableInfo: JoinTableInfo = {
                tableName: rTName,
                columns: rCols,
                rename: rRename
            };

            XIApi.join(txId, joinType, lTableInfo, rTableInfo, joinOpts)
                .then((jonTable, _tempCols, lRename, rRename) => {
                    const joinTableCols: ProgCol[] = xcHelper.createJoinedColumns(
                        lTableInfo.tableName, rTableInfo.tableName,
                        lTableInfo.pulledColumns, rTableInfo.pulledColumns,
                        lRename, rRename);
                    // remove the duplicated columns that were joined
                    joinTableCols.splice(joinTableCols.length -
                        (nCols.length), nCols.length - 1);
                    // put datacol back to where it was
                    joinTableCols.splice(dataColNum - 1, 0,
                        joinTableCols.splice(joinTableCols.length - 1, 1)[0]);
                    // put the groupBy column in front
                    for (let i = 0; i < aggregateArgs.length; i++) {
                        joinTableCols.unshift(nCols[i]);
                    }
                    innerDeferred.resolve(jonTable, joinTableCols);
                })
                .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        return deferred.promise();
    }

    function getNewGroupByKeys(
        aggArgs: AggColInfo[],
         groupByColNames: string[]
    ): string[] {
        const takenNames: Set<string> = new Set();

        aggArgs.forEach((aggInfo) => {
            takenNames.add(aggInfo.newColName);
        });
        const parsedGroupByCols: PrefixColInfo[] = groupByColNames.map(xcHelper.parsePrefixColName);
        parsedGroupByCols.forEach((parsedCol) => {
            if (!parsedCol.prefix) {
                takenNames.add(parsedCol.name);
            }
        });

        const newKeys: string[] = parsedGroupByCols.map((parsedCol) => {
            if (!parsedCol.prefix) {
                // immediate
                return parsedCol.name;
            } else {
                // prefix
                let name: string = xcHelper.stripColName(parsedCol.name, false);
                if (!takenNames.has(name)) {
                    return name;
                }

                name = xcHelper.convertPrefixName(parsedCol.prefix, name);
                let newName: string = name;
                if (!takenNames.hasOwnProperty(newName)) {
                    return newName;
                }
                return xcHelper.randName(name);
            }
        });
        return newKeys;
    }

    /**
     * xcFunction.map
     * @param colNum
     * @param tableId
     * @param fieldName
     * @param mapString
     * @param mapOptions
     * @param icvMode
     */
    export function map(
        colNum: number,
        tableId: TableId,
        fieldName: string,
        mapString: string,
        mapOptions: XcFuncMapOptions = <XcFuncMapOptions>{},
        icvMode
    ): XDPromise<string> {
        const table: TableMeta = gTables[tableId];
        const tableName: string = table.getName();

        const worksheet = WSManager.getWSFromTable(tableId);
        const sql: object = {
            operation: SQLOps.Map,
            tableName: tableName,
            tableId: tableId,
            colNum: colNum,
            fieldName: fieldName,
            mapString: mapString,
            mapOptions: mapOptions,
            htmlExclude: ["mapOptions"]
        };
        const msg: string = StatusMessageTStr.Map + " " +
            xcHelper.escapeHTMLSpecialChar(fieldName);
        const txId = Transaction.start({
            msg: msg,
            operation: SQLOps.Map,
            sql: sql,
            steps: 1,
            track: true
        });

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let finalTableName: string;
        let finalTableId: TableId;

        xcHelper.lockTable(tableId, txId);

        getUnsortedTableName(txId, tableName)
        .then((unsortedTable) => {
            return XIApi.map(txId, [mapString], unsortedTable,
                [fieldName], undefined, icvMode);
        })
        .then((tableAfterMap) => {
            finalTableName = tableAfterMap;
            finalTableId = xcHelper.getTableId(finalTableName);

            const tablCols: ProgCol[] = xcHelper.mapColGenerate(colNum, fieldName,
                mapString, table.tableCols, mapOptions);
            return TblManager.refreshTable([finalTableName], tablCols,
                [tableName], worksheet, txId, { selectCol: colNum });
        })
        .then(() => {
            Profile.copy(tableId, finalTableId);
            sql['newTableName'] = finalTableName;
            Transaction.done(txId, {
                msgTable: xcHelper.getTableId(finalTableName),
                sql: sql
            });

            deferred.resolve(finalTableName);
        })
        .fail((error) => {
            Transaction.fail(txId, {
                failMsg: StatusMessageTStr.MapFailed,
                error: error
            });

            deferred.reject(error);
        })
        .always(() => {
            xcHelper.unlockTable(tableId);
        });

        return deferred.promise();
    }

    /**
     * xcFunction.rename
     * @param tableId
     * @param newTableName
     */
    export function rename(
        tableId: TableId,
        newTableName: string
    ): XDPromise<string> {
        if (tableId == null || newTableName == null) {
            return PromiseHelper.reject("Invalid renaming parameters");
        }

        const table: TableMeta = gTables[tableId];
        const oldTableName = table.tableName;
        const sql: object = {
            operation: SQLOps.RenameTable,
            tableId: tableId,
            oldTableName: oldTableName,
            newTableName: newTableName
        };
        const txId: number = Transaction.start({
            operation: SQLOps.RenameTable,
            sql: sql,
            steps: 1,
            track: true
        });

        // not lock table is the operation is short
        xcHelper.lockTable(tableId, txId, {delayTime: 500});

        const newTableNameId: TableId = xcHelper.getTableId(newTableName);
        if (newTableNameId !== tableId) {
            console.warn("Table Id not consistent");
            newTableName = xcHelper.getTableName(newTableName) + "#" + tableId;
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        XIApi.renameTable(txId, oldTableName, newTableName)
        .then(() => {
            // does renames for gTables, tabelist, dag
            table.tableName = newTableName;

            Dag.renameAllOccurrences(oldTableName, newTableName);
            TblManager.updateHeaderAndListInfo(tableId);

            Transaction.done(txId, {});
            deferred.resolve(newTableName);
        })
        .fail((error) => {
            Transaction.fail(txId, { error: error });
            deferred.reject(error);
        })
        .always(() => {
            xcHelper.unlockTable(tableId);
        });

        return deferred.promise();
    }

    /**
     *  xcFunction.project
     * @param colNames
     * @param tableId
     * @param options
     */
    export function project(
        colNames: string[],
        tableId: TableId,
        options: XcFuncOptions = <XcFuncOptions>{}
    ): XDPromise<string> {
        const startTime: number = Date.now();
        const txId: number = Transaction.start({
            msg: StatusMessageTStr.Project,
            operation: SQLOps.Project,
            steps: 1,
            track: true
        });

        xcHelper.lockTable(tableId, txId);

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const tableName: string = gTables[tableId].getName();
        const formOpenTime: number = options.formOpenTime;
        const startScrollPosition: number = $('#mainFrame').scrollLeft();
        const worksheet: string = WSManager.getWSFromTable(tableId);

        let finalTableName: string;
        let focusOnTable: boolean = false;

        getUnsortedTableName(txId, tableName)
        .then((unsortedTable) => {
            return XIApi.project(txId, colNames, unsortedTable);
        })
        .then((newTableName) => {
            finalTableName = newTableName;
            const timeAllowed: number = 1000;
            const endTime: number = Date.now();
            const elapsedTime: number = endTime - startTime;
            const timeSinceLastClick: number = endTime -
                gMouseEvents.getLastMouseDownTime();
            // we'll focus on table if its been less than timeAllowed OR
            // if the user hasn't clicked or scrolled
            if (elapsedTime < timeAllowed ||
                (timeSinceLastClick >= elapsedTime &&
                    ($('#mainFrame').scrollLeft() === startScrollPosition))
            ) {
                focusOnTable = true;
            }

            const tableCols: ProgCol[] = xcHelper.deepCopy(gTables[tableId].tableCols);
            const finalTableCols: ProgCol[] = [];
            for (let i = 0; i < tableCols.length; i++) {
                let index: number = colNames.indexOf(tableCols[i].backName);
                if (index > -1) {
                    finalTableCols.push(tableCols[i]);
                } else if (tableCols[i].backName === "DATA") {
                    finalTableCols.push(ColManager.newDATACol());
                }
            }

            return TblManager.refreshTable([finalTableName], finalTableCols,
                [tableName], worksheet, txId, { focusWorkspace: focusOnTable });
        })
        .then(() => {
            const sql: object = {
                operation: SQLOps.Project,
                tableName: tableName,
                tableId: tableId,
                colNames: colNames,
                newTableName: finalTableName,
                formOpenTime: formOpenTime,
                htmlExclude: ["formOpenTime"]
            };

            Transaction.done(txId, {
                msgTable: xcHelper.getTableId(finalTableName),
                sql: sql,
                noNotification: focusOnTable
            });
            deferred.resolve(finalTableName);
        })
        .fail((error) => {
            xcHelper.unlockTable(tableId);
            Transaction.fail(txId, {
                failMsg: StatusMessageTStr.ProjectFailed,
                error: error
            });
            deferred.reject(error);
        })
        .always(() => {
            xcHelper.unlockTable(tableId);
        });

        return deferred.promise();
    }

    /**
     * xcFunction.checkOrder
     * @param tableName
     */
    export function checkOrder(tableName: string): XDPromise<number> {
        const tableId: TableId = xcHelper.getTableId(tableName);
        const table: TableMeta = gTables[tableId];
        if (table != null) {
            const keys: object[] = table.getKeys();
            const order: number = table.getOrdering();
            if (keys != null && XcalarOrderingTStr.hasOwnProperty(order)) {
                return PromiseHelper.resolve(order, keys);
            }
        }
        return XIApi.checkOrder(tableName);
    }


    /**
     * xcFunction.getNumRows
     * @param tableName
     */
    export function getNumRows(tableName: string): XDPromise<number> {
        const tableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] &&
            gTables[tableId].resultSetCount > -1) {
            return PromiseHelper.resolve(gTables[tableId].resultSetCount);
        }
        return XIApi.getNumRows(tableName);
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

    function getUnsortedTablesInUnion(
        txId: number,
        tableNames: string[]
    ): XDPromise<string[]> {
        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        const unsortedTables: string[] = [];

        const promises: XDPromise<void>[] = tableNames.map((tableName, index) => {
                return getUnsortedTableName(txId, tableName)
                    .then((unsortedTableName) => {
                        unsortedTables[index] = unsortedTableName;
                    });
            }
        );

        PromiseHelper.when.apply(this, promises)
        .then(() => {
            deferred.resolve(unsortedTables);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }
}
