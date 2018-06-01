namespace xcFunction {
    interface XcFuncOptions {
        formOpenTime: number;
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

        XIApi.filter(txId, fltOptions.filterString, tableName)
            .then((tableAfterFilter) => {
                finalTableName = tableAfterFilter;
                const oldTables = fltOptions.complement ? [] : [tableName];
                // fltOptions.worksheet is used in complement tables
                const worksheet: string = fltOptions.worksheet ?
                    fltOptions.worksheet : curWorksheet;
                return TblManager.refreshTable([finalTableName], table.tableCols,
                    oldTables, worksheet, txId, { selectCol: colNum });
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
        XIApi.aggregate(txId, aggrOp, aggStr, tableName, aggName)
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

        function typeCastHelper(): XDPromise<string> {
            const typesToCast: ColumnType[] = [];
            const mapStrs: string[] = [];
            const mapColNames: string[] = [];
            const newColInfos: SortColInfo[] = [];
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
                        colNum: colNums[i],
                        ordering: colInfo.ordering,
                        type: null
                    });
                }
            });

            if (!mapStrs.length) {
                return PromiseHelper.resolve(tableName, newColInfos, tableCols);
            }

            sql['typeToCast'] = typesToCast;
            const innerDeferred: XDDeferred<string> = PromiseHelper.deferred();

            XIApi.map(txId, mapStrs, tableName, mapColNames)
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

        typeCastHelper()
            .then((tableToSort, newColInfos, newTableCols) => {
                finalTableCols = newTableCols;
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
            pulledColumns: lJoinInfo.pulledColumns,
            rename: lJoinInfo.rename,
            allImmediates: lJoinInfo.allImmediates
        };

        const rTableInfo: JoinTableInfo = {
            tableName: rTableName,
            columns: rColNames,
            casts: rJoinInfo.casts,
            pulledColumns: rJoinInfo.pulledColumns,
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
        XIApi.join(txId, joinType, lTableInfo, rTableInfo, joinOpts)
            .then((finalTableName, finalTableCols) => {
                finalJoinTableName = finalTableName;
                const tablesToReplace: string[] = options.keepTables ?
                    [] : [lTableName, rTableName];
                focusOnTable = scrollChecker.checkScroll();

                return TblManager.refreshTable([finalTableName], finalTableCols,
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
            tableInfos: tableInfos,
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

        XIApi.union(txId, <UnionTableInfo[]>tableInfos, dedup, newTableName,
                    options.unionType)
            .then((nTableName, nTableCols) => {
                finalTableCols = nTableCols;
                finalTableName = nTableName;

                focusOnTable = scrollChecker.checkScroll();
                const tablesToReplace: string[] = options.keepTables ? [] : tableNames;
                return TblManager.refreshTable([finalTableName], finalTableCols,
                    tablesToReplace, curWS, txId, { focusWorkspace: focusOnTable });
            })
            .then(() => {
                Transaction.done(txId, {
                    msgTable: xcHelper.getTableId(finalTableName),
                    noNotification: focusOnTable
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
    };

    /**
     * xcFunction.groupBy
     * @param tableId
     * @param aggRegateArgs
     * @param groupByCols
     * @param options
     */
    export function groupBy(
        tableId: TableId,
        aggRegateArgs: XcFuncAggColInfo[],
        groupByCols: XcFuncGroupByColInfo[],
        options: XcFuncGroupByOptions = <XcFuncGroupByOptions>{}
    ): XDPromise<string> {
        // Validation
        if (tableId == null ||
            groupByCols.length < 1 ||
            aggRegateArgs.length < 1 ||
            aggRegateArgs[0].aggColName.length < 1
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
        if (aggRegateArgs.length > 1) {
            steps = -1;
        }

        const sql: object = {
            operation: SQLOps.GroupBy,
            args: aggRegateArgs,
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

        const isIncSample: boolean = options.isIncSample || false;
        // do not pass in the cast property
        const aggArgs: AggColInfo[] = aggRegateArgs.map((aggArg) => {
            return {
                operator: aggArg.operator,
                aggColName: aggArg.aggColName,
                newColName: aggArg.newColName
            };
        });

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const curWS: string = WSManager.getWSFromTable(tableId);
        const isKeepOriginal: boolean = options.isKeepOriginal || false;
        const groupByColNames: string[] = groupByCols.map((gbCol) => gbCol.colName);
        let focusOnTable: boolean = false;
        let finalTableName: string;
        let finalTableCols: ProgCol[];

        const needsIndexCast = groupByCols.filter((colInfo) => {
            return colInfo.cast != null;
        }).length > 0;
        let castArgsPromise: XDPromise<string>;
        // agg and groupByCols has no cast
        if (aggArgs.length === 1 && aggRegateArgs[0].cast && !needsIndexCast) {
            // if single group by
            aggArgs[0].aggColName = xcHelper.castStrHelper(aggRegateArgs[0].aggColName,
                aggRegateArgs[0].cast, false);
            castArgsPromise = PromiseHelper.resolve(tableName);
        } else {
            castArgsPromise = castCols();
        }

        castArgsPromise
            .then((castTableName) => {
                const groupByOpts: GroupByOptions = {
                    newTableName: dstTableName,
                    isIncSample: isIncSample,
                    sampleCols: options.columnsToKeep,
                    icvMode: options.icvMode
                };
                return XIApi.groupBy(txId, aggArgs, groupByColNames,
                    castTableName, groupByOpts);
            })
            .then((nTableName, nTableCols, renamedGBCols) => {
                if (isJoin) {
                    const dataColNum: number = table.getColNumByBackName("DATA");
                    return groupByJoinHelper(nTableName, nTableCols, dataColNum,
                        isIncSample, renamedGBCols);
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
                    for (let i = 0; i < aggRegateArgs.length; i++) {
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
        function castCols(): XDPromise<string> {
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
                const type: ColumnType = aggRegateArgs[i].cast;
                if (type != null) {
                    const colName: string = aggRegateArgs[i].aggColName;
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
                XIApi.map(txId, mapStrs, tableName, newCastNames)
                    .then((castTableName) => {
                        TblManager.setOrphanTableMeta(castTableName, castTableCols);
                        innerDeferred.resolve(castTableName);
                    })
                    .fail((error) => {
                        innerDeferred.reject(error);
                    });
                return innerDeferred.promise();
            } else {
                return PromiseHelper.resolve(tableName);
            }
        }

        // TODO when multi-groupby we can use the unsplit table instead of
        // splitting and then concatting again
        function groupByJoinHelper(
            nTable: string,
            nCols: ProgCol[],
            dataColNum: number,
            isIncSample: boolean,
            renamedGBCols: string[]
        ): XDPromise<string> {
            const jonTable: string = xcHelper.getTableName(nTable) +
                Authentication.getHashId();
            const lTable: TableMeta = gTables[tableId];
            const lTName: string = gTables[tableId].getName();

            const rTName: string = nTable;
            const lCols: string[] = groupByColNames;
            const rRename: ColRenameInfo[] = [];

            const rCols: string[] = renamedGBCols.map((colName) => {
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
                .then((jonTable, joinTableCols) => {
                    // remove the duplicated columns that were joined
                    joinTableCols.splice(joinTableCols.length -
                        (nCols.length), nCols.length - 1);
                    // put datacol back to where it was
                    joinTableCols.splice(dataColNum - 1, 0,
                        joinTableCols.splice(joinTableCols.length - 1, 1)[0]);
                    // put the groupBy column in front
                    for (let i = 0; i < aggRegateArgs.length; i++) {
                        joinTableCols.unshift(nCols[i]);
                    }
                    innerDeferred.resolve(jonTable, joinTableCols);
                })
                .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        return deferred.promise();
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

        XIApi.map(txId, [mapString], tableName, [fieldName], undefined, icvMode)
            .then((tableAfterMap) => {
                finalTableName = tableAfterMap;
                finalTableId = xcHelper.getTableId(finalTableName);

                const tablCols: ProgCol[] = xcHelper.mapColGenerate(colNum, fieldName,
                    mapString, table.tableCols, mapOptions);

                // map do not change groupby stats of the table
                Profile.copy(tableId, finalTableId);
                return TblManager.refreshTable([finalTableName], tablCols,
                    [tableName], worksheet, txId, { selectCol: colNum });
            })
            .then(() => {
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
     * xcFunction.exportTable
     * @param tableName
     * @param exportName
     * @param targetName
     * @param numCols
     * @param backColumns
     * @param frontColumns
     * @param keepOrder
     * @param dontShowModal
     * @param options
     */
    export function exportTable(
        tableName: string,
        exportName: string,
        targetName: string,
        numCols: number,
        backColumns: string[],
        frontColumns: string[],
        keepOrder: boolean,
        dontShowModal: boolean,
        options: ExportTableOptions = <ExportTableOptions>{}
    ): XDPromise<void> {
        // use timestap to guarantee unique name
        options.handleName = tableName + ".export." + new Date().getTime();

        const sql: object = {
            operation: SQLOps.ExportTable,
            tableName: tableName,
            exportName: exportName,
            targetName: targetName,
            numCols: numCols,
            frontColumns: frontColumns,
            backColumns: backColumns,
            keepOrder: keepOrder || false,
            options: options,
            htmlExclude: ['options']
        };
        const txId: number = Transaction.start({
            msg: StatusMessageTStr.ExportTable + ": " + tableName,
            operation: SQLOps.ExportTable,
            sql: sql,
            steps: 1,
            track: true
        });

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XIApi.exportTable(txId, tableName, exportName, targetName, numCols,
            backColumns, frontColumns, keepOrder, options)
            .then((_retStruct) => {
                // XXX retStruct is unused. retStruct.timeTaken contains how long
                // the operation took to run
                if (!dontShowModal) {
                    const instr: string = xcHelper.replaceMsg(ExportTStr.SuccessInstr, {
                        table: tableName,
                        location: targetName,
                        file: exportName
                    });

                    const msg: string = '<div class="exportInfo">' +
                        '<div class="row">' +
                        '<span class="label">' + ExportTStr.FolderName +
                        ': </span>' +
                        '<span class="field">' + exportName + '</span>' +
                        '</div>' +
                        '<div class="row">' +
                        '<span class="label">' + ExportTStr.TargetName +
                        ': </span>' +
                        '<span class="field">' + targetName + '</span>' +
                        '</div>' +
                        '</div>';


                    Alert.show({
                        title: ExportTStr.Success,
                        msgTemplate: msg,
                        instr: instr,
                        isAlert: true
                    });
                }
                Transaction.done(txId, {
                    msgTable: xcHelper.getTableId(tableName)
                });
                deferred.resolve();
            })
            .fail((error) => {
                let noAlert: boolean;
                // if error is that export name already in use and modal is still
                // visible, then show a statusbox next to the name field
                if (error && error.status != null &&
                    (error.status === StatusT.StatusDsODBCTableExists ||
                        error.status === StatusT.StatusExist ||
                        error.status === StatusT.StatusExportSFFileExists) &&
                    $('#exportName:visible').length !== 0) {
                    StatusBox.show(ErrTStr.NameInUse, $('#exportName'), true);
                    noAlert = true;
                } else {
                    noAlert = false;
                }

                Transaction.fail(txId, {
                    failMsg: StatusMessageTStr.ExportFailed,
                    error: error,
                    noAlert: noAlert
                });

                deferred.reject(error);
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

        XcalarRenameTable(oldTableName, newTableName, txId)
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

        XIApi.project(txId, colNames, tableName)
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
}
