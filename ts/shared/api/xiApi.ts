namespace XIApi {
    let aggOps: Set<string>;

    interface DSArgs {
        url: string;
        isRecur: boolean;
        format: string;
        maxSampleSize: number;
        skipRows: number;
        pattern: string;
        targetName: string;
    }

    interface FormatArgs {
        format: string;
        fieldDelim: string;
        recordDelim: string;
        schemaMode: number;
        quoteChar: string;
        typedColumns: object[];
        moduleName: string;
        funcName: string;
        udfQuery: string;
    }

    interface JoinCastInfo {
        tableName: string,
        columns: string[],
        casts: XcCast[]
    }

    interface JoinIndexInfo {
        lTableName: string,
        lColNames: string[]
        rTableName: string,
        rColNames: string[],
        tempTables: string[]
    }

    interface JoinIndexResult {
        tableName: string;
        oldKeys: string[];
        newKeys: string[];
    }

    interface CastInfoOptions {
        overWrite: boolean; // overWrite old column name or not
        handleNull: boolean; // handle null case or not
        castPrefix: boolean; // cast prefix field or not
    }

    interface CastResult {
        tableName: string;
        colNames: string[];
        types: ColumnType[];
        newTable?: boolean;
    }

    interface UnionRenameInfo {
        tableName: string;
        renames: ColRenameInfo[]
    }

    function getKeySet<T>(keys: T[]): Set<T> {
        const set: Set<T> = new Set();
        keys.forEach((key) => {
            set.add(key);
        });
        return set;
    }

    function isCorrectTableNameFormat(tableName: string): boolean {
        if (tableName == null || tableName === '') {
            return false;
        }
        // if (typeof sqlMode !== 'undefined' && sqlMode) {
        //     return true;
        // }
        const regexp: RegExp = new RegExp('^.*#[0-9]+$');
        return regexp.test(tableName);
    }

    function isValidTableName(tableName: string): boolean {
        let isValid: boolean = isCorrectTableNameFormat(tableName);
        if (!isValid) {
            if (tableName != null) {
                console.error("incorrect table name format");
            }
            return false;
        }

        let namePart: string = xcHelper.getTableName(tableName);
        // allow table name to start with dot
        isValid = xcHelper.isValidTableName(namePart);
        if (!isValid) {
            // we allow name that has dot internally
            namePart = namePart.replace(/\./g, "");
            isValid = xcHelper.isValidTableName(namePart);
        }
        if (!isValid) {
            if (tableName != null) {
                console.error("incorrect table name format");
            }
        }
        return isValid;
    }

    function isValidAggName(aggName: string): boolean {
        if (isCorrectTableNameFormat(aggName)) {
            // allow aggName to have the table name format
            return isValidTableName(aggName);
        } else {
            // no blanks, must start with alpha, cannot have any special chars
            // other than _ and - and #
            return xcHelper.isValidTableName(aggName);
        }
    }

    function isValidPrefix(prefix: string): boolean {
        if (!prefix || prefix === "") {
            console.error("invalid prefix");
            return false;
        }
        return <boolean>xcHelper.checkNamePattern(PatternCategory.Prefix,
                                                  PatternAction.Check, prefix);
    }

    function getNewTableName(
        tableName: string,
        affix?: string,
        rand: boolean = false
    ): string {
        let nameRoot: string = xcHelper.getTableName(tableName);

        if (affix != null) {
            nameRoot += affix;
        }

        if (rand) {
            nameRoot = xcHelper.randName(nameRoot);
        }

        return (nameRoot + Authentication.getHashId());
    }

    function getNewJoinTableName(
        lTableName: string,
        rTableName: string,
        newTableName: string
    ): string {
        let res: string = newTableName;
        if (!isValidTableName(newTableName)) {
            const lPart: string = lTableName.split("#")[0];
            const rPart: string = rTableName.split("#")[0];
            res = getNewTableName(lPart.substring(0, 5) + "-" + rPart.substring(0, 5));
        }
        return res;
    }

    function convertOp(op: string): string {
        if (op && op.length) {
            op = op.slice(0, 1).toLowerCase() + op.slice(1);
        }
        return op;
    }

    function getLocalAggOps(): Set<string> {
        const set: Set<string> = new Set<string>();
        for (let key in AggrOp) {
            const op: string = convertOp(AggrOp[key]);
            set.add(op);
        }
        return set;
    }

    function parseAggOps(aggXdfs: any): Set<string> {
        try {
            const set: Set<string> = new Set<string>();
            aggXdfs.fnDescs.forEach((func) => { set.add(func.fnName); });
            return set;
        } catch (e) {
            console.error("get category error", e);
            return getLocalAggOps();
        }
    }

    function getAggOps(): XDPromise<Set<string>> {
        if (aggOps != null) {
            return PromiseHelper.resolve(aggOps);
        }

        const deferred: XDDeferred<Set<string>> = PromiseHelper.deferred();
        const index: number = FunctionCategoryT.FunctionCategoryAggregate;
        const category: string = FunctionCategoryTStr[index];
        XcalarListXdfs("*", category)
        .then((res) => {
            aggOps = parseAggOps(res);
            deferred.resolve(aggOps);
        })
        .fail((error) => {
            console.error("get category error", error);
            aggOps = getLocalAggOps();
            deferred.resolve(aggOps); // still resolve
        });

        return deferred.promise();
    }

    /* =========== Index Helper ================ */
    function isSameKey(key1: string[], key2: string[]): boolean {
        if (key1.length !== key2.length) {
            return false;
        }

        for (let i = 0, len = key1.length; i < len; i++) {
            if (key1[i] !== key2[i]) {
                return false;
            }
        }

        return true;
    }

    function checkIfNeedIndex(
        colsToIndex: string[],
        tableName: string,
        tableKeys: any[],
        order: number,
        txId: number
    ): XDPromise<boolean> {
        const tableKeyNames: string[] = tableKeys.map((key) => key.name);
        const keyInfos: object[] = tableKeyNames.map((key) => {
            return {
                name: key,
                ordering: XcalarOrderingT.XcalarOrderingUnordered
            };
        });

        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        let shouldIndex: boolean = false;
        const tempTables: string[] = [];

        if (colsToIndex.length === 0) {
            return PromiseHelper.resolve(false, tableName, tempTables);
        }

        getUnsortedTableName(tableName, null, txId, colsToIndex)
        .then((unsorted) => {
            if (unsorted !== tableName) {
                // this is sorted table, should index a unsorted one
                XIApi.checkOrder(unsorted, txId)
                .then((_parentOrder, parentKeys) => {
                    const parentKeyNames: string[] = parentKeys.map((key) => key.name);
                    if (!isSameKey(parentKeyNames, colsToIndex)) {
                        if (!isSameKey(parentKeyNames, tableKeyNames)) {
                            // if current is sorted, the parent should also
                            // index on the tableKey to remove "FNF"
                            // var fltTable = getNewTableName(tableName,
                            //                               ".fltParent", true);

                            // XXX This is correct, but there are some backend issues with excluding FNFs for now 7071, 7622
                            // So for now, we will have to use the old method in trunk. But for the demo, since we are not sorting, we will not run into this :) Also there are no FNFs
                            // var fltStr = "exists(" + tableKey + ")";
                            // XIApi.filter(txId, fltStr, unsorted, fltTable)
                            // .then(function(tblAfterFlt) {
                            //     // must index
                            //     shouldIndex = true;
                            //     tempTables.push(tblAfterFlt);
                            //     deferred.resolve(shouldIndex, tblAfterFlt,
                            //                      tempTables);
                            // })
                            // .fail(deferred.reject);

                            const indexTable: string = getNewTableName(tableName,
                                                          ".indexParent", true);
                            XcalarIndexFromTable(unsorted, keyInfos, indexTable, txId)
                            .then(() => {
                                if (isSameKey(tableKeyNames, colsToIndex)) {
                                    // when the parent has right index
                                    shouldIndex = false;
                                } else {
                                    // when parent need another index on colName
                                    shouldIndex = true;
                                }
                                tempTables.push(indexTable);
                                deferred.resolve(shouldIndex, indexTable, tempTables);
                            })
                            .fail(deferred.reject);
                        } else {
                            // when parent is indexed on tableKeys,
                            // still need another index on colNames
                            shouldIndex = true;
                            deferred.resolve(shouldIndex, unsorted, tempTables);
                        }
                    } else {
                        // because FAJS will automatically find parent table
                        // so if parent table is already index on colName
                        // no need to do another index
                        shouldIndex = false;
                        deferred.resolve(shouldIndex, unsorted, tempTables);
                    }
                })
                .fail(deferred.reject);
            } else {
                // this is the unsorted table
                if (!isSameKey(tableKeyNames, colsToIndex)) {
                    shouldIndex = true;
                } else if (!XcalarOrderingTStr.hasOwnProperty(order) ||
                          order === XcalarOrderingT.XcalarOrderingInvalid) {
                    console.error("invalid ordering");
                    shouldIndex = true;
                }

                deferred.resolve(shouldIndex, tableName, tempTables);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* check if table has correct index
        resolve: {
            indexTable: (string) table to idnex
            indexKeys: (string) keys indexed on
            tempTables: (array) list of temp tables
            hasIndexed: (boolean) has indexed or not
            isCache: (boolean) is cache or not
        }
     */
    function checkTableIndex(
        txId: number,
        colNames: string[],
        tableName: string,
        isApiCall: boolean
    ): XDPromise<TableIndexResult> {
        const tableId: TableId = xcHelper.getTableId(tableName);
        let tableCols: ProgCol[] = null;
        let table: TableMeta = null;

        if (Transaction.isSimulate(txId)) {
            if (!Transaction.isEdit(txId)) {
                let indexCache: TableIndexCache = SQLApi.getIndexTable(tableName, colNames);
                if (indexCache != null) {
                    return PromiseHelper.resolve({
                        indexTable: indexCache.tableName,
                        indexKeys: indexCache.keys,
                        tempTables: [],
                        hasIndexed: true,
                        isCache: true
                    });
                }
            }
        } else if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
        } else {
            table = gTables[tableId];
            tableCols = table.tableCols;
            let indexCache: TableIndexCache = table.getIndexTable(colNames);
            if (indexCache != null) {
                // XXX Note: here the assume is if index table has meta,
                // it should exists
                // more reliable might be use XcalarGetTables to check, but it's
                // async
                const indexTableId: string | number = xcHelper.getTableId(indexCache.tableName);
                if (gTables.hasOwnProperty(indexTableId)) {
                    console.log("has cached of index table", indexCache.tableName);
                    QueryManager.addIndexTable(txId, indexCache.tableName);
                    return PromiseHelper.resolve( {
                        indexTable: indexCache.tableName,
                        indexKeys: indexCache.keys,
                        tempTables: [],
                        hasIndexed: true,
                        isCache: true
                    });
                } else {
                    console.log("cached index table", indexCache.tableName, "not exists");
                    table.removeIndexTable(colNames);
                }
            }
        }

        const deferred: XDDeferred<TableIndexResult> = PromiseHelper.deferred();
        XIApi.checkOrder(tableName, txId)
        .then((order, keys) => {
            return checkIfNeedIndex(colNames, tableName, keys, order, txId);
        })
        .then((shouldIndex: boolean, unsortedTable: string, tempTables: string[]) => {
            if (shouldIndex) {
                console.log(tableName, "not indexed correctly!");
                // XXX In the future,we can check if there are other tables that
                // are indexed on this key. But for now, we reindex a new table
                const newTableName: string = getNewTableName(tableName, ".index");
                const keyInfos: object[] = colNames.map((colName) => {
                    return {
                        name: colName,
                        ordering: XcalarOrderingT.XcalarOrderingUnordered
                    };
                });
                XcalarIndexFromTable(unsortedTable, keyInfos, newTableName, txId)
                .then((res) => {
                    var newKeys = res.newKeys;
                    if (!isApiCall && !Transaction.isEdit(txId) &&
                        !Transaction.isSimulate(txId)) {
                        tempTables.push(newTableName);
                        TblManager.setOrphanTableMeta(newTableName, tableCols);
                    }
                    if (Transaction.isEdit(txId)) {
                        // no caching
                    } else if (Transaction.isSimulate(txId)) {
                        SQLApi.cacheIndexTable(tableName, colNames,
                                               newTableName, newKeys);
                    } else if (table != null) {
                        table.setIndexTable(colNames, newTableName, newKeys);
                    }
                    deferred.resolve({
                        indexTable: newTableName,
                        indexKeys: newKeys,
                        tempTables: tempTables,
                        hasIndexed: shouldIndex,
                        isCache: false
                    });
                })
                .fail((error) => {
                    if (error.code === StatusT.StatusAlreadyIndexed) {
                        deferred.resolve({
                            indexTable: unsortedTable,
                            indexKeys: colNames,
                            tempTables: tempTables,
                            hasIndexed: false,
                            isCache: false
                        });
                    } else {
                        deferred.reject(error);
                    }
                });
            } else {
                console.log(tableName, "indexed correctly!");
                deferred.resolve({
                    indexTable: unsortedTable,
                    indexKeys: colNames,
                    tempTables: tempTables,
                    hasIndexed: shouldIndex,
                    isCache: false
                });
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    /* ========== End of Index Helper =========== */

    /* ========== Cast Helper =================== */
    function getCastInfo(
        tableName: string,
        colNames: string[],
        casts: XcCast[],
        options: CastInfoOptions = <CastInfoOptions>{}
    ) {
        const tableId: TableId = xcHelper.getTableId(tableName);
        const overWrite: boolean = options.overWrite || false;
        const handleNull: boolean = options.handleNull || false;
        const castPrefix: boolean = options.castPrefix || false;

        const nameSet: Set<string> = getKeySet<string>(colNames);
        const mapStrs: string[] = [];
        const newTypes: ColumnType[] = [];
        const newFields: string[] = []; // this is for map
        const newColNames: string[] = []; // this is for index

        casts.forEach((typeToCast, index) => {
            const colName: string = colNames[index];
            const parsedCol: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            const name: string = xcHelper.stripColName(parsedCol.name, false);
            let newType: ColumnType = null;
            let newField: string = null;

            if (typeToCast == null && castPrefix && parsedCol.prefix) {
                // when it's a fatptr and no typeToCast specified
                try {
                    newType = gTables[tableId].getColByBackName(colName).getType();
                } catch (e) {
                    console.error(e);
                    // when fail to get the col type from meta, cast to string
                    // XXX this is a hack util backend support auto cast when indexing
                    newType = ColumnType.string;
                }
                newField = overWrite ?
                            name :
                            xcHelper.convertPrefixName(parsedCol.prefix, name);
                // handle name conflict case
                if (nameSet.has(newField)) {
                    newField = xcHelper.convertPrefixName(parsedCol.prefix, name);
                    newField = xcHelper.getUniqColName(tableId, newField);
                }
            } else if (typeToCast != null) {
                newType = typeToCast;
                newField = name;
            }

            if (newType != null) {
                newField = overWrite ? newField : xcHelper.randName(newField + "_");
                mapStrs.push(xcHelper.castStrHelper(colName, newType, handleNull));
                newFields.push(newField);
            }
            const newColName = newField || colName;
            newColNames.push(newColName);
            newTypes.push(newType);
        });

        return {
            mapStrs: mapStrs,
            newFields: newFields,
            newColNames: newColNames,
            newTypes: newTypes
        };
    }

    function castColumns(
        txId: number,
        tableName: string,
        colNames: string[],
        casts: XcCast[],
        options: CastInfoOptions = <CastInfoOptions>{}
    ): XDPromise<CastResult> {
        const castInfo = getCastInfo(tableName, colNames, casts, options);
        if (castInfo.mapStrs.length === 0) {
            return PromiseHelper.resolve({
                tableName: tableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: false
            });
        }

        let deferred: XDDeferred<CastResult> = PromiseHelper.deferred();
        const tableId: TableId = xcHelper.getTableId(tableName);
        // ok if null, only being used for setorphantablemeta
        const progCols: ProgCol[] = gTables[tableId] ?
                                    gTables[tableId].tableCols : null;
        const newTableName: string = getNewTableName(tableName);
        XIApi.map(txId, castInfo.mapStrs, tableName, castInfo.newFields, newTableName)
        .then(() => {
            TblManager.setOrphanTableMeta(newTableName, progCols);

            deferred.resolve({
                tableName: newTableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: true
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    /* ============= End of Cast Helper ============== */

    /* ============= Join Helper ===================== */
    function joinCast(
        txId: number,
        lInfo: JoinCastInfo,
        rInfo: JoinCastInfo
    ): XDPromise<JoinIndexInfo> {
        const lColNames: string[] = lInfo.columns;
        const lTableName: string = lInfo.tableName;

        const rColNames: string[] = rInfo.columns;
        const rTableName: string = rInfo.tableName;

        let def1: XDPromise<CastResult>;
        let def2: XDPromise<CastResult>;
        if (lColNames.length === 0 && rColNames.length === 0) {
            // cross join, no need to cast
            def1 = PromiseHelper.resolve({
                tableName: lTableName,
                colNames: lColNames
            });

            def2 = PromiseHelper.resolve({
                tableName: rTableName,
                colNames: rColNames
            });
        } else {
            def1 = castColumns(txId, lTableName, lColNames, lInfo.casts);
            def2 = castColumns(txId, rTableName, rColNames, rInfo.casts);
        }

        const deferred: XDDeferred<JoinIndexInfo> = PromiseHelper.deferred();
        PromiseHelper.when(def1, def2)
        .then((lRes: CastResult, rRes: CastResult) => {
            const tempTables: string[] = [];
            if (lRes.newTable) {
                tempTables.push(lRes.tableName);
            }

            if (rRes.newTable) {
                tempTables.push(rRes.tableName);
            }

            deferred.resolve({
                "lTableName": lRes.tableName,
                "lColNames": lRes.colNames,
                "rTableName": rRes.tableName,
                "rColNames": rRes.colNames,
                "tempTables": tempTables
            });
        })
        .fail((...error) => {
            deferred.reject(xcHelper.getPromiseWhenError(<any>error));
        });

        return deferred.promise();
    }

    function selfJoinIndex(
        txId: number,
        colNames: string[],
        tableName: string
    ): XDPromise<TableIndexResult>[] {
        const def1: XDDeferred<TableIndexResult> = PromiseHelper.deferred();
        const def2: XDDeferred<TableIndexResult> = PromiseHelper.deferred();

        checkTableIndex(txId, colNames, tableName, false)
        .then((res) => {
            def1.resolve(res);
            def2.resolve(res);
        })
        .fail((...arg) => {
            def1.reject.apply(this, arg);
            def2.reject.apply(this, arg);
        });

        return [def1.promise(), def2.promise()];
    }

    /**
     *
     * @param txId
     * @param joinInfo
     * @param removeNulls
     * @returns Promise<lInfo, rInfo, tempTables>
     */
    function joinIndex(
        txId: number,
        joinInfo: JoinIndexInfo,
        removeNulls: boolean
    ): XDPromise<JoinIndexResult> {
        const lColNames: string[] = joinInfo.lColNames;
        const rColNames: string[] = joinInfo.rColNames;
        const lTableName: string = joinInfo.lTableName;
        const rTableName: string = joinInfo.rTableName;

        if (lColNames.length !== rColNames.length) {
            return PromiseHelper.reject('invalid case');
        }

        // for cross joins where no col names should be provided
        if (lColNames.length === 0 ) {
            const lInfo: JoinIndexResult = {
                tableName: lTableName,
                oldKeys: [],
                newKeys: []
            };
            const rInfo: JoinIndexResult = {
                tableName: rTableName,
                oldKeys: [],
                newKeys: []
            };
            return PromiseHelper.resolve(lInfo, rInfo, []);
        }

        let def1: XDPromise<TableIndexResult>;
        let def2: XDPromise<TableIndexResult>;
        if (lTableName === rTableName && isSameKey(lColNames, rColNames)) {
            // when it's self join
            [def1, def2] = selfJoinIndex(txId, lColNames, lTableName);
        } else {
            def1 = checkTableIndex(txId, lColNames, lTableName, false);
            def2 = checkTableIndex(txId, rColNames, rTableName,false);
        }

        let lIndexedTable: string;
        let rIndexedTable: string;
        let lNewKeys: string[];
        let rNewKeys: string[];

        let tempTables: string[];
        const deferred: XDDeferred<JoinIndexResult> = PromiseHelper.deferred();

        PromiseHelper.when(def1, def2)
        .then((res1: TableIndexResult, res2: TableIndexResult) => {
            lIndexedTable = res1.indexTable;
            rIndexedTable = res2.indexTable;
            lNewKeys = res1.indexKeys;
            rNewKeys = res2.indexKeys;
            tempTables = res1.tempTables.concat(res2.tempTables);

            if (removeNulls) {
                const newTableName: string = getNewTableName(lTableName, ".noNulls");
                const fltStr: string = "exists(" + lColNames[0] + ")";
                tempTables.push(newTableName);
                return XcalarFilter(fltStr, lIndexedTable, newTableName, txId);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            const lInfo: JoinIndexResult = {
                tableName: lIndexedTable,
                oldKeys: lColNames,
                newKeys: lNewKeys
            };
            const rInfo: JoinIndexResult = {
                tableName: rIndexedTable,
                oldKeys: rColNames,
                newKeys: rNewKeys
            };
            deferred.resolve(lInfo, rInfo, tempTables);
        })
        .fail((...error) => {
            deferred.reject(xcHelper.getPromiseWhenError(<any>error));
        });

        return deferred.promise();
    }

    function getUnusedImmNames(
        allImm: string[],
        newKeys: string[],
        renameInfos: ColRenameInfo[]
    ): string[] {
        if (!allImm || allImm.length === 0) {
            return [];
        }
        const immSet: Set<string> = getKeySet<string>(allImm);
        newKeys.forEach((name) => {
            immSet.delete(name);
        });

        renameInfos.forEach((renameInfo) => {
            immSet.delete(renameInfo.new);
        });

        const unusedImm: string[] = allImm.filter((imm) => immSet.has(imm));
        return unusedImm;
    }

    function resolveDupName(
        renameInfos: ColRenameInfo[],
        indexRes: JoinIndexResult,
        otherKeys: string[],
        suffix: string
    ): void {
        const otherKeySet: Set<string> = getKeySet<string>(otherKeys);
        const newKeys: string[] = indexRes.newKeys;
        indexRes.oldKeys.forEach((oldKey, index) => {
            const newKey: string = newKeys[index];
            if (newKey !== oldKey && otherKeySet.has(newKey)) {
                // when it's fatptr convert to immediate
                const oldName: string = newKey;
                const newName: string = newKey + suffix;
                renameInfos.push(xcHelper.getJoinRenameMap(oldName, newName));
            }
        });
    }

    function resolveJoinColRename(
        lRename: ColRenameInfo[],
        rRename: ColRenameInfo[],
        lIndexRes: JoinIndexResult,
        rIndexRes: JoinIndexResult,
        lImm: string[],
        rImm: string[]
    ): void {
        const lOthers: string[] = getUnusedImmNames(lImm, lIndexRes.newKeys, lRename);
        const rOthers: string[] = getUnusedImmNames(rImm, rIndexRes.newKeys, rRename);
        const lAllKeys: string[] = xcHelper.arrayUnion(lIndexRes.newKeys, lOthers);
        const rAllKeys: string[] = xcHelper.arrayUnion(rIndexRes.newKeys, rOthers);
        const lSuffix: string = xcHelper.randName("_l_index");
        const rSuffix: string = xcHelper.randName("_r_index");

        resolveDupName(lRename, lIndexRes, rAllKeys, lSuffix);
        resolveDupName(rRename, rIndexRes, lAllKeys, rSuffix);
    }

    // sXXX TODO: switch left and right and support right semi joins
    function semiJoinHelper(
        txId: number,
        lIndexedTable: string,
        rIndexedTable: string,
        rIndexedColNames: string[],
        newTableName: string,
        joinType: JoinType,
        lRename: ColRenameInfo[],
        rRename: ColRenameInfo[],
        tempTables: string[],
        existenceCol: string
    ): XDPromise<any> {
        // XXX FIXME rIndexedColNames[0] is wrong in the cases where it is
        // called a::b, and there's another immediate called a-b
        // This is because a::b will becomes a-b.
        const isAntiSemiJoin: boolean = joinType === JoinCompoundOperatorTStr.LeftAntiSemiJoin ||
                                        joinType === JoinCompoundOperatorTStr.RightAntiSemiJoin;
        const isExistenceJoin: boolean = joinType === JoinCompoundOperatorTStr.ExistenceJoin;
        const newGbTableName: string = getNewTableName(rIndexedTable);
        const newKeyFieldName: string = xcHelper.stripPrefixInColName(rIndexedColNames[0]);
        const newColName: string = xcHelper.randName("XC_GB_COL");

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let antiJoinTableName: string;
        let existJoinTableName: string;

        XcalarGroupByWithEvalStrings([newColName], ["count(1)"], rIndexedTable,
                                    newGbTableName, false, false, newKeyFieldName,
                                    false, txId)
        .then(() => {
            if (isAntiSemiJoin) {
                antiJoinTableName = getNewTableName(rIndexedTable);
                return XcalarJoin(lIndexedTable, newGbTableName,
                                antiJoinTableName, JoinOperatorT.LeftOuterJoin,
                                lRename, rRename, undefined, txId);
            } else if (isExistenceJoin) {
                existJoinTableName = getNewTableName(lIndexedTable);
                return XcalarJoin(lIndexedTable, newGbTableName,
                            existJoinTableName, JoinOperatorT.LeftOuterJoin,
                            lRename, rRename, undefined, txId);
            } else {
                return XcalarJoin(lIndexedTable, newGbTableName,
                                    newTableName, JoinOperatorT.InnerJoin,
                                    lRename, rRename, undefined, txId);
            }
        })
        .then(() => {
            if (isAntiSemiJoin) {
                tempTables.push(antiJoinTableName);
                const fltStr = "not(exists(" + newKeyFieldName + "))";
                return XcalarFilter(fltStr, antiJoinTableName, newTableName, txId);
            } else if (isExistenceJoin) {
                tempTables.push(existJoinTableName);
                const mapStr = "exists(" + newKeyFieldName + ")";
                return XcalarMap([existenceCol], [mapStr], existJoinTableName, newTableName, txId);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then((ret) => {
            const res = $.extend(ret, {
                tempCols: [newColName]
            });
            deferred.resolve(res);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function replaceImmediate(col: ProgCol, renameInfos: ColRenameInfo[]): void {
        renameInfos.forEach((renameInfo) => {
            // when backName === srcColName, it's a derived field
            if (renameInfo.type !== DfFieldTypeT.DfFatptr &&
                renameInfo.orig === col.backName
            ) {
                const newName: string = renameInfo.new;
                col.backName = newName;
                col.name = newName;
                if (col.sizedTo === "header") {
                    col.width = xcHelper.getDefaultColWidth(newName);
                }
                return false; // stop loop
            }
        });
    }

    // for each fat ptr rename, find whether a column has this fat ptr as
    // a prefix. If so, fix up all fields in colStruct that pertains to the prefix
    function replacePrefix(col: ProgCol, renameInfos: ColRenameInfo[]): void {
        renameInfos.forEach((renameInfo) => {
            if (renameInfo.type === DfFieldTypeT.DfFatptr &&
                !col.immediate &&
                col.prefix === renameInfo.orig
            ) {
                // the replace will only repalce the first occurrence, so is fine
                col.backName = col.backName.replace(renameInfo.orig, renameInfo.new);
                col.func.args[0] = col.func.args[0].replace(renameInfo.orig, renameInfo.new);
                col.prefix = col.prefix.replace(renameInfo.orig, renameInfo.new);
                col.userStr = '"' + col.name + '" = pull(' + col.backName + ')';
                if (col.sizedTo === "header") {
                    col.width = xcHelper.getDefaultColWidth(col.name, col.prefix);
                }
                return false; // stop loop
            }
        });
    }

    function getPulledColsAfterJoin(
        tableName: string,
        pulledColNames: string[],
        renameInfos: ColRenameInfo[]
    ): ProgCol[] {
        const pulledCols: ProgCol[] = [];
        const tableId: TableId = xcHelper.getTableId(tableName);
        if (tableId == null || gTables[tableId] == null ||
            gTables[tableId].tableCols == null) {
            return pulledCols;
        }

        const table: TableMeta = gTables[tableId];
        const cols: ProgCol[] = xcHelper.deepCopy(table.tableCols);
        if (!pulledColNames) {
            return cols;
        }

        for (let i = 0; i < pulledColNames.length; i++) {
            const colIndex: number = table.getColNumByBackName(pulledColNames[i]) - 1;
            const col: ProgCol = cols[colIndex];
            if (renameInfos && renameInfos.length > 0) {
                replaceImmediate(col, renameInfos);
                replacePrefix(col, renameInfos);
            }
            pulledCols.push(col);
        }

        return pulledCols;
    }

    // For xiApi.join, deep copy of right table and left table columns
    function createJoinedColumns(
        lTableName: string,
        rTableName: string,
        pulledLColNames: string[],
        pulledRColNames: string[],
        lRenames: ColRenameInfo[],
        rRenames: ColRenameInfo[]
    ): ProgCol[] {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var lCols = getPulledColsAfterJoin(lTableName, pulledLColNames, lRenames);
        var rCols = getPulledColsAfterJoin(rTableName, pulledRColNames, rRenames);
        const excludeDataCol = (col) => col.name !== "DATA";

        const lNewCols: ProgCol[] = lCols.filter(excludeDataCol);
        const rNewCols: ProgCol[] = rCols.filter(excludeDataCol);
        const newTableCols: ProgCol[] = lNewCols.concat(rNewCols);
        newTableCols.push(ColManager.newDATACol());

        return newTableCols;
    }

    /* ============= End of Join Helper ================ */

    /* ============= GroupBy Helper ==================== */
    function getGroupByAggEvalStr(aggArg: AggColInfo): string {
        let evalStr = null;
        const op: string = convertOp(aggArg.operator);
        const colName = aggArg.aggColName;
        // XXX currently don't support Multi-operation in multi-evalgroupBy
        if (op === "stdevp") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName})))`;
        } else if (op === "stdev") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1)))`;
        } else if (op === "varp") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName}))`;
        } else if (op === "var") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1))`;
        } else {
            evalStr = `${op}(${colName})`;
        }
        return evalStr;
    }

    function getIncSampleGroupByCols(
        tableId: TableId,
        sampleCols: number[],
        groupByCols: string[],
        aggProgCols: ProgCol[]
    ): ProgCol[] {
        const table: TableMeta = gTables[tableId];
        const tableCols: ProgCol[] = table.tableCols;
        const newCols: ProgCol[] = [];
        const numGroupByCols: number = groupByCols.length;
        let newProgColPosFound: boolean = false;

        // find the first col that is in groupByCols
        // and insert aggCols
        sampleCols.forEach((colIndex) => {
            const curCol = tableCols[colIndex];
            const colName: string = curCol.getBackColName();
            if (!newProgColPosFound) {
                for (let i = 0; i < numGroupByCols; i++) {
                    if (colName === groupByCols[i]) {
                        newProgColPosFound = true;
                        aggProgCols.forEach((progCol) => {
                            newCols.push(progCol);
                        });
                        break;
                    }
                }
            }

            newCols.push(curCol);
        });

        if (!newProgColPosFound) {
            aggProgCols.forEach((progCol) => {
                newCols.unshift(progCol);
            });
        }
        // Note that if include sample,
        // a.b should not be escaped to a\.b
        const finalCols: ProgCol[] = newCols.map((col) => new ProgCol(col));
        return finalCols;
    }

    function getTableKeys(txId: number, tableName: string): XDPromise<object[]> {
        const deferred: XDDeferred<object[]> = PromiseHelper.deferred();
        XIApi.checkOrder(tableName, txId)
        .then((_ordering, keys) => {
            deferred.resolve(keys);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getFinalGroupByCols(
        txId: number,
        tableName: string,
        finalTableName: string,
        groupByCols: string[],
        aggArgs: AggColInfo[],
        isIncSample: boolean,
        sampleCols: number[]
    ): XDPromise<ProgCol[]> {
        const dataCol: ProgCol = ColManager.newDATACol();
        const renamedGroupByCols: string[] = groupByCols.map((colName) => colName);

        const newProgCols: ProgCol[] = [];
        const usedNameSet: Set<string> = new Set();
        aggArgs.forEach((aggArg) => {
            const name: string = aggArg.newColName;
            usedNameSet.add(name);
            newProgCols.push(ColManager.newPullCol(name, name));
        });

        const tableId: TableId = xcHelper.getTableId(tableName);
        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // We really should clean up this function to remove the requirement
            // of gTables
            groupByCols.forEach((name) => {
                if (!usedNameSet.has[name]) {
                    usedNameSet.add(name);
                    newProgCols.push(ColManager.newPullCol(name, name));
                }
            });

            console.warn("Cannot find table. Not handling sampleCols");
            newProgCols.push(dataCol);
            return PromiseHelper.resolve(newProgCols, renamedGroupByCols);
        } else if (isIncSample) {
            const finalCols: ProgCol[] = getIncSampleGroupByCols(tableId, sampleCols, groupByCols, newProgCols);
            finalCols.push(dataCol);
            return PromiseHelper.resolve(finalCols, renamedGroupByCols);
        } else {
            const deferred: XDDeferred<ProgCol[]> = PromiseHelper.deferred();
            getTableKeys(txId, finalTableName)
            .then((keys: any) => {
                keys.forEach((key, index) => {
                    newProgCols.push(ColManager.newPullCol(key.name));
                    renamedGroupByCols[index] = key.name;
                });
                newProgCols.push(dataCol);
                deferred.resolve(newProgCols, renamedGroupByCols);
            })
            .fail(() => {
                newProgCols.push(dataCol);
                deferred.resolve(newProgCols, renamedGroupByCols); // still resolve
            });
            return deferred.promise();
        }
    }

    // XXX FIXME: currently it can only triggered by sql which assumes all columns
    // are derived fields. When this assumption breaks, must hand the case when
    // newKeyFieldName in XcalarGroupByWithEvalStrings is a prefix
    function computeDistinctGroupby(
        txId: number,
        origTableName: string,
        groupOnCols: string[],
        distinctCol: string,
        aggArgs: AggColInfo[],
        distinctGbTables: string[],
        tempTables: string[],
        tempCols: string[]
    ): XDPromise<void> {
        let reuseIndex: boolean = false;
        let newGroupOnCols: string[];
        let groupAll: boolean = groupOnCols.length === 0;
        if (groupOnCols.indexOf(distinctCol) === -1) {
            newGroupOnCols = groupOnCols.concat([distinctCol]);
        } else {
            reuseIndex = true;
            newGroupOnCols = groupOnCols;
        }
        const gbDistinctTableName: string = getNewTableName(origTableName, "gbDistinct");
        const gbTableName: string = getNewTableName(origTableName, "gb");
        let newIndexTable: string;

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        checkTableIndex(txId, newGroupOnCols, origTableName, false)
        .then((res) => {
            if (res.tempTables != null) {
                res.tempTables.forEach((tempTable) => {
                    tempTables.push(tempTable);
                });
            }
            for (let i: number = 0; i < newGroupOnCols.length; i++) {
                newGroupOnCols[i] = newGroupOnCols[i].substr(newGroupOnCols[i]
                                                        .lastIndexOf(":") + 1);
            }

            const indexedTableName: string = res.indexTable;
            const newAggColName = "XC_COUNT_" + xcHelper.getTableId(gbTableName);
            tempCols.push(newAggColName);
            tempTables.push(gbDistinctTableName);
            // XXX [0] argument needs to be fixed once bohan's fix goes in
            return XcalarGroupByWithEvalStrings([newAggColName],
                                                ["count(1)"],
                                                indexedTableName,
                                                gbDistinctTableName,
                                                false,
                                                false,
                                                newGroupOnCols[0],
                                                false,
                                                txId);
        })
        .then(() => {
            if (reuseIndex || groupAll) {
                newIndexTable = gbDistinctTableName;
                return PromiseHelper.resolve({});
            } else {
                newIndexTable = getNewTableName(origTableName, "index");
                tempTables.push(newIndexTable);
                for (let i: number = 0; i < groupOnCols.length; i++) {
                    groupOnCols[i] = groupOnCols[i].substr(groupOnCols[i]
                                                    .lastIndexOf(":") + 1);
                }
                const keyInfos: object[] = groupOnCols.map((colName) => {
                    return {
                        name: colName,
                        ordering: XcalarOrderingT.XcalarOrderingUnordered
                    };
                });
                return XcalarIndexFromTable(gbDistinctTableName, keyInfos,
                                            newIndexTable, txId);
            }
        })
        .then((res) => {
            const evalStrs: string[] = [];
            const newColNames: string[] = [];
            aggArgs.forEach((aggArg) => {
                aggArg.aggColName = aggArg.aggColName.substr(aggArg.aggColName
                                                        .lastIndexOf(":") + 1);
                evalStrs.push(aggArg.operator + "(" + aggArg.aggColName + ")");
                newColNames.push(aggArg.newColName);
            });
            // This is to optimize the join later so that it doesn't have to
            // re-index
            if (Transaction.isSimulate(txId) && !Transaction.isEdit(txId)) {
                SQLApi.cacheIndexTable(gbDistinctTableName, groupOnCols,
                                        newIndexTable, res.newKeys);
            }
            // TODO add the same cacheIndexTable for interactive
            return XcalarGroupByWithEvalStrings(newColNames,
                                                evalStrs,
                                                newIndexTable,
                                                gbTableName, false, false,
                                                newGroupOnCols[0],
                                                groupAll, txId);
        })
        .then(() => {
            tempTables.push(gbTableName);
            distinctGbTables.push(gbTableName);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function cascadingJoins(
        txId: number,
        distinctGbTables: string[],
        origGbTable: string,
        joinCols: string[],
        tempTables: string[],
        tempCols: string[]
    ): XDPromise<string> {
        if (distinctGbTables.length === 0) {
            return PromiseHelper.resolve(origGbTable);
        }

        tempTables.push(origGbTable);

        let curTableName: string = origGbTable;
        let promises: XDPromise<void>[] = [];
        for (let i = 0; i < distinctGbTables.length; i++) {
            // The index cols will collide for sure. So we must rename these
            // The newly generated columns cannot collide because they will
            // be renamed earlier on XXX add asserts / fixme
            const rTableName: string = distinctGbTables[i];
            const rRename: ColRenameInfo[] = [];
            const rTableId: TableId = xcHelper.getTableId(rTableName);
            let joinType: JoinType = JoinOperatorT.InnerJoin;
            if (joinCols.length === 0) {
                joinType = JoinOperatorT.CrossJoin;
            } else {
                joinCols.forEach((colName) => {
                    const newColName = colName + "_" + rTableId;
                    rRename.push({
                        orig: colName,
                        new: newColName,
                        type: DfFieldTypeT.DfUnknown
                    });
                    tempCols.push(newColName);
                });
            }

            let newTableName: string;
            if (i === distinctGbTables.length - 1) {
                newTableName = getNewTableName(origGbTable);
            } else {
                newTableName = getNewTableName(origGbTable, "join");
            }
            if (i < distinctGbTables.length - 1) {
                // Don't push final table
                tempTables.push(newTableName);
            }

            promises.push(XcalarJoin.bind(this, curTableName, rTableName,
                                newTableName, joinType,
                                [], rRename, undefined, txId));
            curTableName = newTableName;
        }

        const finalJoinedTable: string = curTableName;
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        PromiseHelper.chain(promises)
        .then(() => {
            deferred.resolve(finalJoinedTable);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function distinctGroupby(
        txId: number,
        tableName: string,
        groupOnCols: string[],
        distinctAggArgs: AggColInfo[],
        gbTableName: string
    ): XDPromise<string> {
        // The below is an optimization. If multiple aggOps are operating on the
        // same column, we only need do that groupby once
        const aggCols: object = {};
        distinctAggArgs.forEach((aggArg) => {
            const aggColName: string = aggArg.aggColName;
            if (aggColName in aggCols) {
                aggCols[aggColName].push(aggArg);
            } else {
                aggCols[aggColName] = [aggArg];
            }
        });

        const promises: XDPromise<void>[] = [];
        const distinctGbTables: string[] = [];
        const tempTables: string[] = [];
        const tempCols: string[] = [];
        for (let distinctCol in aggCols) {
            promises.push(computeDistinctGroupby(txId, tableName,
                            groupOnCols, distinctCol, aggCols[distinctCol],
                            distinctGbTables, tempTables, tempCols));
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        PromiseHelper.when.apply(this, promises)
        .then(() => {
            // Now we want to do cascading joins on the newTableNames
            return cascadingJoins(txId, distinctGbTables, gbTableName, groupOnCols,
                                tempTables, tempCols);
        })
        .then((finalJoinedTable) => {
            deferred.resolve(finalJoinedTable, tempTables, tempCols);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* ============= End of GroupBy Helper ============= */

    /* ============= Union Helper ====================== */
    function checkUnionTableInfos(tableInfos: UnionTableInfo[]): UnionTableInfo[] {
        if (tableInfos == null ||
            !(tableInfos instanceof Array) ||
            tableInfos.length < 1
        ) {
            return null;
        }

        const colLen: number = tableInfos[0].columns.length;
        for (let i = 0; i < colLen; i++) {
            for (let j = 0; j < tableInfos.length; j++) {
                if (tableInfos[j].columns[i].name == null) {
                    // this is for no match case
                    tableInfos[j].columns[i].name = xcHelper.randName("XCALAR_FNF");
                }

                if (j > 0) {
                    // type and rename need to match
                    if (tableInfos[j].columns[i].rename == null ||
                        tableInfos[j].columns[i].rename !== tableInfos[0].columns[i].rename ||
                        tableInfos[j].columns[i].type == null ||
                        tableInfos[j].columns[i].type !== tableInfos[0].columns[i].type) {
                        return null;
                    }
                }
            }
        }
        return tableInfos;
    }

    function unionCast(
        txId: number,
        tableInfos: UnionTableInfo[]
    ): XDPromise<UnionRenameInfo[]> {
        const unionRenameInfos: UnionRenameInfo[] = [];
        const tempTables: string[] = [];
        const caseHelper = function(
            tableInfo: UnionTableInfo,
            index: number
        ): XDPromise<void> {
            const columns: UnionColInfo[] = tableInfo.columns;

            const colNames: string[] = [];
            const casts: ColumnType[] = [];
            columns.forEach((colInfo) => {
                colNames.push(colInfo.name);
                casts.push(colInfo.cast ? colInfo.type : null);
            });

            const tableName: string = tableInfo.tableName;
            const options: CastInfoOptions = {
                castPrefix: true,
                handleNull: true,
                overWrite: false
            };

            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            castColumns(txId, tableName, colNames, casts, options)
            .then((res) => {
                if (res.newTable) {
                    tempTables.push(res.tableName);
                }
                const renames: ColRenameInfo[] = res.colNames.map((colName, i) => {
                    const newName: string = columns[i].rename;
                    const type: ColumnType = res.types[i] ? res.types[i] : columns[i].type;
                    const fieldType: DfFieldTypeT = xcHelper.convertColTypeToFieldType(type);
                    return xcHelper.getJoinRenameMap(colName, newName, fieldType);
                });

                unionRenameInfos[index] = {
                    tableName: res.tableName,
                    renames: renames
                };
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        };

        const promises: XDPromise<void>[] = tableInfos.map(caseHelper);
        const deferred: XDDeferred<UnionRenameInfo[]> = PromiseHelper.deferred();
        PromiseHelper.when.apply(this, promises)
        .then(() => {
            deferred.resolve(unionRenameInfos, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getUnionConcatMapStr(
        colNames: string[],
        colTypes: DfFieldTypeT[]
    ): string {
        let mapStr: string = "";
        const len: number = colNames.length;
        const vals = colNames.map((colName, index) => {
            if (colTypes[index] === DfFieldTypeT.DfString) {
                return `ifStr(exists(${colName}), ${colName}, "XC_FNF")`;
            } else {
                return `ifStr(exists(string(${colName})), string(${colName}), "XC_FNF")`;
            }
        });

        for (let i = 0; i < len - 1; i++) {
            mapStr += `concat(${vals[i]}, concat(".Xc.", `;
        }

        mapStr += vals[len - 1];
        mapStr += '))'.repeat(len - 1);
        return mapStr;
    }

    function unionAllIndexHelper(
        txId: number,
        unionRenameInfo: UnionRenameInfo,
        indexColName: string,
        tempTables: string[]
    ): XDPromise<void> {
        // step 1: concat all columns
        // step 2: index on the concat column
        const colNames: string[] = [];
        const colTypes: DfFieldTypeT[] = [];
        unionRenameInfo.renames.forEach((renameInfo) => {
            const colName: string = renameInfo.orig;
            colNames.push(colName);
            colTypes.push(renameInfo.type);
        });

        const mapStr: string = getUnionConcatMapStr(colNames, colTypes);
        const concatColName: string =  xcHelper.randName("XC_CONCAT");
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let curTableName: string = unionRenameInfo.tableName;

        // step 1, concat all cols into one col
        XIApi.map(txId, [mapStr], curTableName, [concatColName])
        .then((tableAfterMap) => {
            tempTables.push(curTableName);
            curTableName = tableAfterMap;
            // step 2: index on the concat column
            return XIApi.index(txId, concatColName, curTableName);
        })
        .then((finalTableName) => {
            tempTables.push(curTableName);
            unionRenameInfo.tableName = finalTableName;
            const type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(
                ColumnType.string);
            const rename: ColRenameInfo = xcHelper.getJoinRenameMap(
                concatColName, indexColName, type);
            unionRenameInfo.renames.push(rename);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function unionAllIndex(
        txId: number,
        unionRenameInfos: UnionRenameInfo[]
    ): XDPromise<UnionRenameInfo[]> {
        const tempTables: string[] = [];
        const indexColName: string = xcHelper.randName("XC_UNION_INDEX");
        const promises: XDPromise<void>[] = unionRenameInfos.map((renameInfo) => {
            return unionAllIndexHelper(txId, renameInfo, indexColName, tempTables);
        });

        const deferred: XDDeferred<UnionRenameInfo[]> = PromiseHelper.deferred();
        PromiseHelper.when.apply(this, promises)
        .then(() => {
            deferred.resolve(unionRenameInfos, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    /* ============= End of Union Helper ================ */
    /**
     * XIApi.filter
     * @param txId
     * @param fltStr
     * @param tableName
     * @param newTableName
     */
    export function filter(
        txId: number,
        fltStr: string,
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        if (txId == null || fltStr == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in filter");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        XcalarFilter(fltStr, tableName, newTableName, txId)
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.genAggStr
     * @param fieldName
     * @param op
     */
    export function genAggStr(fieldName: string, op: string): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        op = convertOp(op);

        getAggOps()
        .then((aggs) => {
            if (!aggs.has(op)) {
                deferred.resolve('');
            } else {
                let evalStr = op + '(' + fieldName + ')';
                deferred.resolve(evalStr);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.aggregateWithEvalStr
     * @param txId
     * @param evalStr
     * @param tableName
     * @param dstAggName, dstAggName is optional and
     * can be left blank (will autogenerate) and new agg table will be deleted
     */
    export function aggregateWithEvalStr(
        txId: number,
        evalStr: string,
        tableName: string,
        dstAggName: string
    ): XDPromise<string | number> {
        if (evalStr == null || tableName == null || txId == null) {
            return PromiseHelper.reject("Invalid args in aggregate");
        }

        const deferred: XDDeferred<string | number> = PromiseHelper.deferred();
        let toDelete = false;

        if (!isValidAggName(dstAggName)) {
            if (dstAggName != null) {
                console.error("invalid agg name");
            }
            const nameRoot: string = xcHelper.getTableName(tableName);
            dstAggName = xcHelper.randName(nameRoot + "-agg");
            toDelete = true;
        }

        let aggVal;
        XcalarAggregate(evalStr, dstAggName, tableName, txId)
        .then((val, dstDagName) => {
            aggVal = val;
            if (toDelete) {
                const promise: XDPromise<XcalarApiDeleteDagNodeOutputT> = XIApi.deleteTable(txId, dstDagName);
                return PromiseHelper.alwaysResolve(promise);
            }
        })
        .then(() => {
            let passed: boolean = false;
            let err: Error;
            let value: string | number;
            try {
                value = aggVal.Value;
                passed = true;
            } catch (error) {
                err = error;
            }
            if (passed) {
                deferred.resolve(value, dstAggName, toDelete);
            } else {
                deferred.reject({'error': err});
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.aggregate
     * @param txId
     * @param aggOp
     * @param colName
     * @param tableName
     * @param dstAggName optional, can be left blank (will autogenerate)
     * and new agg table will be deleted
     */
    export function aggregate(
        txId: number,
        aggOp: string,
        colName: string,
        tableName: string,
        dstAggName?: string
    ): XDPromise<string | number> {
        if (colName == null ||
            tableName == null ||
            aggOp == null ||
            txId == null
        ) {
            return PromiseHelper.reject("Invalid args in aggregate");
        }

        const deferred: XDDeferred<string | number> = PromiseHelper.deferred();
        XIApi.genAggStr(colName, aggOp)
        .then((evalStr) => {
            return XIApi.aggregateWithEvalStr(txId, evalStr,
                                             tableName, dstAggName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }
    /**
     * XIApi.checkOrder
     * @param tableName
     * @param txId
     * @returns XDPromise<order, keys>
     */
    export function checkOrder(
        tableName: string,
        txId: number
    ): XDPromise<number> {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in checkOrder");
        }

        const tableId: string | number = xcHelper.getTableId(tableName);
        const table: TableMeta = gTables[tableId];
        if (table != null) {
            const keys: object[] = table.getKeys();
            const order: number = table.getOrdering();
            if (keys != null && XcalarOrderingTStr.hasOwnProperty(order)) {
                return PromiseHelper.resolve(order, keys);
            }
        }

        if (txId != null && Transaction.isSimulate(txId)) {
            return PromiseHelper.resolve(null, []);
        }

        const deferred: XDDeferred<number> = PromiseHelper.deferred();
        XcalarGetTableMeta(tableName)
        .then((tableMeta) => {
            const keys: object[] = xcHelper.getTableKeyInfoFromMeta(tableMeta);
            deferred.resolve(tableMeta.ordering, keys);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.load
     * @param dsArgs, dsArgs is as follows: url, isRecur, maxSampleSize,
     * skipRows, pattern,
     * @param formatArgs, formatArgs is as follows: format("CSV", "JSON",
     * "Excel", "raw"), if "CSV", then fieldDelim, recordDelim,
     * schemaMode, quoteChar, moduleName, funcName, udfQuery
     * @param dsName
     * @param txId
     */
    export function load(
        dsArgs: DSArgs,
        formatArgs: FormatArgs,
        dsName: string,
        txId: number
    ): XDPromise<void> {
        if (txId == null ||
            !dsArgs ||
            !formatArgs ||
            !dsArgs.url ||
            !formatArgs.format
        ) {
            return PromiseHelper.reject("Invalid args in load");
        }

        const url: string = dsArgs.url;
        const isRecur: boolean = dsArgs.isRecur || false;
        const format: string = formatArgs.format;
        const maxSampleSize: number = dsArgs.maxSampleSize || 0;
        const skipRows: number = dsArgs.skipRows || 0;
        const pattern: string = dsArgs.pattern;

        let fieldDelim: string;
        let recordDelim: string;
        let schemaMode: number = CsvSchemaModeT.CsvSchemaModeNoneProvided;
        let quoteChar: string;
        let typedColumns: object[] = [];
        let schemaFile: string = ""; // Not implemented yet. Wait for backend
        if (format === "CSV") {
            fieldDelim = formatArgs.fieldDelim || "";
            recordDelim = formatArgs.recordDelim || "\n";
            schemaMode = formatArgs.schemaMode || CsvSchemaModeT.CsvSchemaModeNoneProvided;
            quoteChar = formatArgs.quoteChar || '"';
            typedColumns = formatArgs.typedColumns || [];
        }

        const moduleName: string = formatArgs.moduleName || "";
        const funcName: string = formatArgs.funcName || "";
        const udfQuery: string = formatArgs.udfQuery;

        const options: object = {
            "sources": [{
                "targetName": dsArgs.targetName,
                "path": url,
                "recursive": isRecur,
                "fileNamePattern": pattern
            }],
            "format": format,
            "fieldDelim": fieldDelim,
            "recordDelim": recordDelim,
            "schemaMode": schemaMode,
            "moduleName": moduleName,
            "funcName": funcName,
            "maxSampleSize": maxSampleSize,
            "quoteChar": quoteChar,
            "skipRows": skipRows,
            "udfQuery": udfQuery,
            "typedColumns": typedColumns,
            "schemaFile": schemaFile
        };

        return XcalarLoad(dsName, options, txId);
    }

    /**
     * XIApi.indexFromDataset
     * @param txId
     * @param dsName
     * @param newTableName
     * @param prefix
     */
    export function indexFromDataset(
        txId: number,
        dsName: string,
        newTableName: string,
        prefix: string
    ): XDPromise<string> {
        if (txId == null || dsName == null) {
            return PromiseHelper.reject("Invalid args in indexFromDataset");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(newTableName);
        }

        if (!isValidPrefix(prefix)) {
            prefix = xcHelper.normalizePrefix(prefix);
        }

        XcalarIndexFromDataset(dsName, "xcalarRecordNum", newTableName, prefix, txId)
        .then(() => {
            deferred.resolve(newTableName, prefix);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.index
     * @param txId
     * @param colToIndex
     * @param tableName
     * @returns Promise<indexTable, indexArgs>, indexTable: (string),
     * indexArgs: (object) see checckTableIndex
     */
    export function index(
        txId: number,
        colToIndex: string | string[],
        tableName: string
    ): XDPromise<string> {
        if (txId == null || colToIndex == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in index");
        }
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const colsToIndex: string[] = (colToIndex instanceof Array) ?
                                        <string[]>colToIndex : [colToIndex];

        checkTableIndex(txId, colsToIndex, tableName,  true)
        .then((res) => {
            deferred.resolve(res.indexTable, res);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.sort
     * @param txId
     * @param sortColsAndOrder
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sort(
        txId: number,
        colInfos: SortColInfo[],
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        if (txId == null ||
            colInfos == null ||
            tableName == null ||
            !(colInfos instanceof Array)
        ) {
            return PromiseHelper.reject("Invalid args in sort");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const tableId: TableId = xcHelper.getTableId(tableName);

        colInfos.forEach((colInfo) => {
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

        // Check for case where table is already sorted
        XIApi.checkOrder(tableName, txId)
        .then((_sortOrder, sortKeys) => {
            if (sortKeys.length === colInfos.length) {
                let diffFound: boolean = false;
                for (let i = 0; i < sortKeys.length; i++) {
                    if (sortKeys[i].name !== colInfos[i].name ||
                        sortKeys[i].ordering !== XcalarOrderingTStr[colInfos[0].ordering]
                    ) {
                        diffFound = true;
                        break;
                    }
                }
                if (!diffFound) {
                    return PromiseHelper.reject(null, true);
                }
            }
            if (!isValidTableName(newTableName)) {
                newTableName = getNewTableName(tableName);
            }

            return XcalarIndexFromTable(tableName, colInfos, newTableName, txId);
        })
        .then((res) => {
            deferred.resolve(newTableName, res.newKeys);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.sortAscending
     * @param txId
     * @param colName
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sortAscending(
        txId: number,
        colName: string,
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        // a quick function to sort ascending
        const colInfos: SortColInfo[] = [{
            name: colName,
            ordering: XcalarOrderingT.XcalarOrderingAscending
        }];
        return XIApi.sort(txId, colInfos, tableName, newTableName);
    }

    /**
     * XIApi.sortDescending
     * @param txId
     * @param colName
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sortDescending(
        txId: number,
        colName: string,
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        // a quick function to sort descending
        const colInfos: SortColInfo[] = [{
            name: colName,
            ordering: XcalarOrderingT.XcalarOrderingDescending
        }];
        return XIApi.sort(txId, colInfos, tableName, newTableName);
    }

    /**
     * XIApi.map
     * @param txId
     * @param mapStrs
     * @param tableName
     * @param newColNames
     * @param newTableName
     * @param icvMode
     * @returns Promise<newTableName>
     */
    export function map(
        txId: number,
        mapStrs: string[],
        tableName: string,
        newColNames: string[],
        newTableName?: string,
        icvMode: boolean = false
    ): XDPromise<string> {
        if (txId == null ||
            mapStrs == null ||
            tableName == null ||
            newColNames == null
        ) {
            return PromiseHelper.reject("Invalid args in map");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XcalarMap(newColNames, mapStrs, tableName, newTableName, txId, false, icvMode)
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.join
     * @param txId
     * @param joinType
     * @param lTableInfo
     * @param rTableInfo
     * @param options
     * @returns Promise<newTableName, joinedCols, tempCols>
     *
     * for the type in renameMap in lableInfo/rTableInfo
     * if it's fat ptr, pass in DfFieldTypeT.DfFatptr, othewise, pass in null
     * sample:
     * lTableInfo = {
     *  "tableName": "test#ab123",
     *  "columns": ["test::colA", "test::colB"],
     *  "casts": ["string", null],
     *  "pulledColumns": ["test::colA", "test::colB"],
     *  "rename": [{
     *      "new": "test2",
     *      "orig": "test",
     *      "type": DfFieldTypeT.DfFatptr or DfFieldTypeT.DfUnknown
     *  }],
     *  "allImmediates": ["a", "b", "c"]
     * }
     */
    export function join(
        txId: number,
        joinType: JoinType,
        lTableInfo: JoinTableInfo,
        rTableInfo: JoinTableInfo,
        options: JoinOptions = <JoinOptions>{}
    ): XDPromise<string> {
        if (txId == null ||
            joinType == null ||
            !(joinType in JoinOperatorTStr || joinType in JoinCompoundOperator) ||
            !(lTableInfo instanceof Object) ||
            !(rTableInfo instanceof Object) ||
            lTableInfo.columns == null ||
            rTableInfo.columns == null ||
            lTableInfo.tableName == null ||
            rTableInfo.tableName == null
        ) {
            return PromiseHelper.reject("Invalid args in join");
        }

        const lTableName: string = lTableInfo.tableName;
        const lColNames: string[] = (lTableInfo.columns instanceof Array) ?
                                    lTableInfo.columns : [lTableInfo.columns];
        const pulledLColNames: string[] = lTableInfo.pulledColumns;
        const lRename: ColRenameInfo[] = lTableInfo.rename || [];
        let lCasts: XcCast[] = lTableInfo.casts;

        const rTableName: string = rTableInfo.tableName;
        const rColNames: string[] = (rTableInfo.columns instanceof Array) ?
                                    rTableInfo.columns : [rTableInfo.columns];
        const pulledRColNames: string[] = rTableInfo.pulledColumns;
        const rRename: ColRenameInfo[] = rTableInfo.rename || [];
        let rCasts: XcCast[] = rTableInfo.casts;


        if ((joinType !== JoinOperatorT.CrossJoin && lColNames.length < 1) ||
            lColNames.length !== rColNames.length
        ) {
            return PromiseHelper.reject("Invalid args in join");
        }

        if (lCasts == null) {
            lCasts = new Array(lColNames.length).fill(null);
        }

        if (rCasts == null) {
            rCasts = new Array(rColNames.length).fill(null);
        }

        if (!(lCasts instanceof Array)) {
            lCasts = [lCasts];
        }

        if (!(rCasts instanceof Array)) {
            rCasts = [rCasts];
        }

        const clean: boolean = options.clean || false;
        const existenceCol: string = options.existenceCol;
        let newTableName: string = options.newTableName;
        let tempTables: string[] = [];
        let rIndexColNames: string[];

        const lCastInfo: JoinCastInfo = {
            tableName: lTableName,
            columns: lColNames,
            casts: lCasts
        };
        const rCastInfo: JoinCastInfo = {
            tableName: rTableName,
            columns: rColNames,
            casts: rCasts
        };

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        // Step 1: cast columns
        joinCast(txId, lCastInfo, rCastInfo)
        .then((res) => {
            tempTables = tempTables.concat(res.tempTables);
            // Step 2: index the left table and right table
            rIndexColNames = res.rColNames;
            return joinIndex(txId, res, lTableInfo.removeNulls);
        })
        .then((lRes: JoinIndexResult, rRes: JoinIndexResult, tempTablesInIndex: string[]) => {
            tempTables = tempTables.concat(tempTablesInIndex);
            // Step 3: resolve name collision
            const lIndexedTable: string = lRes.tableName;
            const rIndexedTable: string = rRes.tableName;
            const lImm: string[] = lTableInfo.allImmediates || [];
            const rImm: string[] = rTableInfo.allImmediates || [];
            resolveJoinColRename(lRename, rRename, lRes, rRes, lImm, rImm);
            // If rIndexColNames has been renamed because of
            // resolveJoinIndexColRename, we must make sure the rIndexColNames
            // array is with the POST rename functions because semiJoinHelper
            // will use this column to filter
            for (let i = 0; i < rRename.length; i++) {
                const index: number = rIndexColNames.indexOf(rRename[i].orig);
                if (index > -1) {
                    rIndexColNames[index] = rRename[i].new;
                }
            }

            newTableName = getNewJoinTableName(lTableName, rTableName, newTableName);
            // Step 3: Join
            if (joinType in JoinCompoundOperator) {
                // semi join  case
                // This call will call Xcalar Join because it will swap the
                // left and right tables
                return semiJoinHelper(txId, lIndexedTable, rIndexedTable,
                                      rIndexColNames,
                                      newTableName, joinType, lRename, rRename,
                                      tempTables, existenceCol);
            } else {
                // cross join or normal join
                let joinOptions = undefined;
                if (options && options.evalString) {
                    // cross join case
                    joinOptions = {evalString: options.evalString};
                }
                return XcalarJoin(lIndexedTable, rIndexedTable, newTableName,
                        <number>joinType, lRename, rRename, joinOptions, txId);
            }
        })
        .then((ret) => {
            // Step 4: get joined columns
            let tempCols: string[];
            if (ret && ret.tempCols) {
                tempCols = ret.tempCols;
            }
            const joinedCols: ProgCol[] = createJoinedColumns(lTableName, rTableName,
                                                pulledLColNames, pulledRColNames,
                                                lRename, rRename);
            if (clean) {
                XIApi.deleteTableAndMetaInBulk(txId, tempTables, true)
                .always(() => {
                    deferred.resolve(newTableName, joinedCols, tempCols);
                });
            } else {
                deferred.resolve(newTableName, joinedCols, tempCols);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.groupBy
     * @param txId
     * @param aggArgs
     * @param groupByCols
     * @param tableName
     * @param options
     * @returns Promise<finalTable, finalCols, renamedGroupByCols, tempCols>
     */
    export function groupBy(
        txId: number,
        aggArgs: AggColInfo[],
        groupByCols: string[],
        tableName: string,
        options: GroupByOptions = <GroupByOptions>{}
    ): XDPromise<string> {
        if (txId == null ||
            aggArgs == null ||
            groupByCols == null ||
            tableName == null ||
            aggArgs[0].newColName == null ||
            aggArgs[0].aggColName.length < 1)
        {
            return PromiseHelper.reject("Invalid args in groupby");
        }

        if (!(groupByCols instanceof Array)) {
            groupByCols = [groupByCols];
        }

        // Split aggArgs into 2 arrays, one array with operators and
        // Another array that's just aliasing
        const distinctAggArgs: AggColInfo[] = [];
        let normalAggArgs: AggColInfo[] = [];

        aggArgs.forEach((aggArg) => {
            if (aggArg.isDistinct) {
                distinctAggArgs.push(aggArg);
            } else {
                normalAggArgs.push(aggArg);
            }
        });

        let tempCols: string[] = [];
        // XXX This is one extra groupby that can be avoided. But for code
        // cleanliness, we're going to use this workaround for now. Eventually
        // If opArray.length === 0, we want to skip until after the first
        // XcalarGroupBy call
        let tempColName: string;
        if (normalAggArgs.length === 0) {
            tempColName = "XC_COUNT_" + xcHelper.getTableId(tableName);
            normalAggArgs = [{
                operator: "count",
                aggColName: "1",
                newColName: tempColName
            }];
            tempCols.push(tempColName);
        }

        const isIncSample: boolean = options.isIncSample || false;
        const sampleCols: number[] = options.sampleCols || [];
        const icvMode: boolean = options.icvMode || false;
        const clean: boolean = options.clean || false;
        const groupAll: boolean = options.groupAll || false;
        const isMultiGroupby: boolean = (groupByCols.length > 1);
        let gbTableName: string = options.newTableName;
        let tempTables: string[] = [];
        let finalCols: ProgCol[];
        let renamedGroupByCols: string[] = [];
        let finalTable: string;

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        // tableName is the original table name that started xiApi.groupby
        checkTableIndex(txId, groupByCols, tableName, false)
        .then((res) => {
            tempTables = tempTables.concat(res.tempTables);
            // table name may have changed after sort!
            let indexedTable: string = res.indexTable;
            let indexedColName: string = res.indexKeys.length === 0 ?
                            null : xcHelper.stripColName(res.indexKeys[0]);

            // get name from src table
            if (!isValidTableName(gbTableName)) {
                gbTableName = getNewTableName(tableName, "-GB");
            }

            // incSample does not take renames, multiGroupby already handle
            // the name in index stage
            const newKeyFieldName: string = (isIncSample || isMultiGroupby
                                || groupAll) ? null :
                                xcHelper.stripPrefixInColName(indexedColName);
            const newColNames: string[] = [];
            const evalStrs: string[] = [];
            normalAggArgs.forEach((aggArg) => {
                newColNames.push(aggArg.newColName);
                evalStrs.push(getGroupByAggEvalStr(aggArg));
            });

            return XcalarGroupByWithEvalStrings(newColNames, evalStrs,
                indexedTable, gbTableName, isIncSample,
                icvMode, newKeyFieldName, groupAll, txId)
        })
        .then(() => {
            // XXX Check whether tempTables is well tracked
            return distinctGroupby(txId, tableName, groupByCols,
                                    distinctAggArgs, gbTableName);
        })
        .then((resTable, resTempTables, resTempCols) => {
            finalTable = resTable;
            tempTables = tempTables.concat(resTempTables);
            tempCols = tempCols.concat(resTempCols);
            return getFinalGroupByCols(txId, tableName, resTable, groupByCols,
                                       aggArgs, isIncSample, sampleCols);
        })
        .then((resCols, resRenamedCols) => {
            finalCols = resCols;
            renamedGroupByCols = resRenamedCols;
            if (clean) {
                // remove intermediate table
                XIApi.deleteTableAndMetaInBulk(txId, tempTables, true)
                .always(() => {
                    deferred.resolve(finalTable, finalCols,
                                    renamedGroupByCols, tempCols);
                });
            } else {
                deferred.resolve(finalTable, finalCols,
                                renamedGroupByCols, tempCols);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.union
     * sample:
     *  var tableInfos = [{
     *      tableName: "test#ab123",
     *      columns: [{
     *          name: "test2",
     *          rename: "test",
     *          type: "string"
     *          cast: true
     *      }]
     *  }]
     * @param txId
     * @param tableInfos
     * @param dedup
     * @param newTableName
     * @param unionType Enum
     * @returns Promise<newTableName, newTableCols>
     */
    export function union(
        txId: number,
        tableInfos: UnionTableInfo[],
        dedup: boolean = false,
        newTableName?: string,
        unionType?: UnionOperatorT
    ): XDPromise<string> {
        if (unionType === undefined) {
            unionType = UnionOperatorT.UnionStandard;
        }
        tableInfos = checkUnionTableInfos(tableInfos);
        if (txId == null || tableInfos == null) {
            return PromiseHelper.reject("Invalid args in union");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableInfos[0].tableName);
        }

        let tempTables: string[] = [];
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        unionCast(txId, tableInfos)
        .then((unionRenameInfos: UnionRenameInfo[], resTempTables: string[]) => {
            tempTables = tempTables.concat(resTempTables);

            if (dedup || unionType !== UnionOperatorT.UnionStandard) {
                return unionAllIndex(txId, unionRenameInfos);
            } else {
                return PromiseHelper.resolve(unionRenameInfos, []);
            }
        })
        .then((unionRenameInfos: UnionRenameInfo[], resTempTables: string[]) => {
            tempTables = tempTables.concat(resTempTables);

            const tableNames: string[] = [];
            const colInfos: ColRenameInfo[][] = [];
            unionRenameInfos.forEach((tableInfo) => {
                tableNames.push(tableInfo.tableName);
                colInfos.push(tableInfo.renames);
            });
            return XcalarUnion(tableNames, newTableName, colInfos, dedup,
                               unionType, txId);
        })
        .then(() => {
            const newTableCols: ProgCol[] = tableInfos[0].columns.map((col) => {
                return ColManager.newPullCol(col.rename, null, col.type);
            });
            newTableCols.push(ColManager.newDATACol());
            deferred.resolve(newTableName, newTableCols);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

   /**
    * XIApi.project
    * @param txId
    * @param columns, an array of column names (back column name)
    * @param tableName, table's name
    * @param newTableName(Optional), new table's name
    */
    export function project(
        txId: number,
        columns: string[],
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        if (txId == null || columns == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in project");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XcalarProject(columns, tableName, newTableName, txId)
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    export function synthesize(
        txId: number,
        colInfos: ColRenameInfo[],
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        if (txId == null || colInfos == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in synthesize");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XcalarSynthesize(tableName, newTableName, colInfos, txId)
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.query
     * @param txId
     * @param queryName
     * @param queryStr
     * @param fromJdbc
     */
    export function query(
        txId: number,
        queryName: string,
        queryStr: string,
        jdbcCheckTime: number
    ): XDPromise<XcalarApiQueryStateOutputT> {
        if (txId == null || queryName == null || queryStr == null) {
            return PromiseHelper.reject("Invalid args in query");
        }
        return XcalarQueryWithCheck(queryName, queryStr, txId, false, jdbcCheckTime);
    }

    /**
     * XIApi.exportTable
     */
    export function exportTable(
        txId: number,
        tableName: string,
        exportName: string,
        targetName: string,
        numCols: number,
        backColumns: string[],
        frontColumns: string[],
        keepOrder: boolean,
        options: ExportTableOptions
    ): XDPromise<void> {
        if (txId == null || tableName == null || exportName == null) {
            return PromiseHelper.reject("Invalid args in export");
        }
        return XcalarExport(tableName, exportName, targetName, numCols,
                        backColumns, frontColumns, keepOrder, options, txId);
    }

    /**
     * XIApi.genRowNum
     * @param txId
     * @param tableName
     * @param newColName
     * @param newTableName
     */
    export function genRowNum(
        txId: number,
        tableName: string,
        newColName: string,
        newTableName: string
    ): XDPromise<string> {
        if (txId == null || tableName == null || newColName == null) {
            return PromiseHelper.reject("Invalid args in get row num");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XcalarGenRowNum(tableName, newTableName, newColName, txId)
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.getNumRows
     * @param tableName
     * @param options
     */
    export function getNumRows(
        tableName: string,
        options: GetNumRowsOptions = <GetNumRowsOptions>{}
    ): XDPromise<number> {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in getNumRows");
        }
        if (options.useConstant) {
            // when use constant
            const dstAggName: string = options.constantName;
            if (dstAggName == null) {
                return PromiseHelper.reject("Invalid args in getNumRows");
            }

            const txId: number = options.txId;
            const colName: string = options.colName;
            const aggOp: string = AggrOp.Count;
            return <XDPromise<number>>XIApi.aggregate(txId, aggOp, colName,
                                                    tableName, dstAggName);
        }

        const tableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] &&
            gTables[tableId].resultSetCount > -1) {
            return PromiseHelper.resolve(gTables[tableId].resultSetCount);
        }
        return XcalarGetTableCount(tableName);
    }

    /**
     * XIApi.fetchData
     * @param tableName
     * @param startRowNum
     * @param rowsRequested
     */
    export function fetchData(
        tableName: string,
        startRowNum: number,
        rowsRequested: number
    ): XDPromise<string[]> {
        if (tableName == null || startRowNum == null ||
            rowsRequested == null || rowsRequested <= 0)
        {
            return PromiseHelper.reject({error: "Invalid args in fetch data"});
        }

        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        let resultSetId: string;

        XcalarMakeResultSetFromTable(tableName)
        .then((res) => {
            resultSetId = res.resultSetId;
            const totalRows: number = res.numEntries;
            if (totalRows == null || totalRows === 0) {
                return PromiseHelper.reject("No Data!");
            }

            // startRowNum starts with 1, rowPosition starts with 0
            const rowPosition: number = startRowNum - 1;
            const rowsToFetch = Math.min(rowsRequested, totalRows);
            return XcalarFetchData(resultSetId, rowPosition, rowsToFetch,
                                   totalRows, [], 0, 0);
        })
        .then((result: string[]) => {
            const finalData: string[] = result.map((data) => data);
            XcalarSetFree(resultSetId)
            .always(() => {
                deferred.resolve(finalData);
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.fetchDataAndParse
     * @param tableName
     * @param startRowNum
     * @param rowsRequested
     */
    export function fetchDataAndParse(
        tableName: string,
        startRowNum: number,
        rowsRequested: number
    ): XDPromise<object[]> {
        // similar with XIApi.fetchData, but will parse the value
        const deferred: XDDeferred<object[]> = PromiseHelper.deferred();
        XIApi.fetchData(tableName, startRowNum, rowsRequested)
        .then((data: string[]) => {
            try {
                const parsedData: any[] = data.map((d) => JSON.parse(d));
                deferred.resolve(parsedData);
            } catch(error) {
                console.error(error);
                deferred.reject(error);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.fetchColumnData
     * @param colName
     * @param tableName
     * @param startRowNum
     * @param rowsRequested
     */
    export function fetchColumnData(
        colName: string,
        tableName: string,
        startRowNum: number,
        rowsRequested: number
    ): XDPromise<any[]> {
        if (colName == null) {
            // other args with check in XIApi.fetchData
            return PromiseHelper.reject("Invalid args in fetch data");
        }

        const deferred: XDDeferred<any[]> = PromiseHelper.deferred();
        XIApi.fetchData(tableName, startRowNum, rowsRequested)
        .then((data) => {
            try {
                const result: any[] = data.map((d) => {
                    const row: object = JSON.parse(d);
                    return row[colName];
                });
                deferred.resolve(result);
            } catch (error) {
                deferred.reject(error);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.deleteTable
     * @param txId
     * @param tableName
     * @param toIgnoreError boolean, if set true,
     * will always resolve the promise even the call fails.
     */
    export function deleteTable(
        txId: number,
        tableName: string,
        toIgnoreError: boolean = false
    ): XDPromise<XcalarApiDeleteDagNodeOutputT> {
        if (txId == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in delete table");
        }

        const deferred: XDDeferred<XcalarApiDeleteDagNodeOutputT> = PromiseHelper.deferred();
        XcalarDeleteTable(tableName, txId)
        .then(deferred.resolve)
        .fail((error) => {
            if (toIgnoreError) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    // if at least 1 table fails, will reject
    /**
     * XIApi.deleteTables
     * @param txId
     * @param arrayOfQueries
     * @param jdbcCheckTime
     */
    export function deleteTables(
        txId: number,
        arrayOfQueries: object[],
        jdbcCheckTime: number
    ): XDPromise<any> {
        if (arrayOfQueries == null) {
            // txID not needed if deleting undone tables
            return PromiseHelper.reject('Invalid args in delete table');
        }

        let queryName: string = xcHelper.randName('sql');
        let queryStr: string = JSON.stringify(arrayOfQueries);
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarQueryWithCheck(queryName, queryStr, txId, false, jdbcCheckTime)
        .then((res) => {
            // results come back in random order so we create a map of names
            let resMap: Map<string, number> = new Map();
            const nodes: any[] = res.queryGraph.node;
            nodes.forEach((node) => {
                resMap.set(node.input.deleteDagNodeInput.namePattern, node.state);
            });

            let hasError: boolean = false;
            let results: object[] = arrayOfQueries.map((query: any) => {
                const tableName: string = query.args.namePattern;
                const state: number = resMap.get(tableName);

                if (state === DgDagStateT.DgDagStateReady ||
                    state === DgDagStateT.DgDagStateDropped
                ) {
                    return null;
                } else {
                    hasError = true;
                    return {error: DgDagStateTStr[state]};
                }
            });

            if (hasError) {
                deferred.reject.apply(this, results);
            } else {
                deferred.resolve.apply(this, results);
            }
        })
        .fail(() => {
            var results = [];
            for (var i = 0; i < arrayOfQueries.length; i++) {
                results.push({error: DgDagStateTStr[DgDagStateT.DgDagStateError]});
            }
            deferred.reject.apply(this, results);
        });

        return deferred.promise();
    };

    /**
     * XIApi.deleteTableAndMeta
     * @param txId
     * @param tableName
     * @param toIgnoreError
     */
    export function deleteTableAndMeta(
        txId: number,
        tableName: string,
        toIgnoreError: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XIApi.deleteTable(txId, tableName, toIgnoreError)
        .then(() => {
            const tableId: TableId = xcHelper.getTableId(tableName);
            TableList.removeTable(tableId);
            if (tableId != null && gTables[tableId] != null) {
                delete gTables[tableId];
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /**
     * XIApi.deleteTableAndMetaInBulk
     * @param txId
     * @param tables
     * @param toIgnoreError
     */
    export function deleteTableAndMetaInBulk(
        txId: number,
        tables: string[],
        toIgnoreError: boolean = false
    ): XDPromise<void> {
        const promises: XDPromise<void>[] = tables.map((tableName) => {
            return XIApi.deleteTableAndMeta(txId, tableName, toIgnoreError);
        });
        return PromiseHelper.when.apply(this, promises);
    }

    /**
     * XIApi.createDataTarget
     * @param targetType
     * @param targetName
     * @param targetParams
     */
    export function createDataTarget(
        targetType: string,
        targetName: string,
        targetParams: object[]
    ): XDPromise<void> {
        return XcalarTargetCreate(targetType, targetName, targetParams);
    }

    /**
     * XIApi.deleteDataTarget
     * @param targetName
     */
    export function deleteDataTarget(targetName: string): XDPromise<void> {
        return XcalarTargetDelete(targetName);
    }

    /* Unit Test Only */
    if (typeof window !== "undefined" && window["unitTestMode"]) {
        XIApi["__testOnly__"] = {
            isCorrectTableNameFormat: isCorrectTableNameFormat,
            isValidTableName: isValidTableName,
            isValidAggName: isValidAggName,
            isValidPrefix: isValidPrefix,
            getNewTableName: getNewTableName,
            getNewJoinTableName: getNewJoinTableName,
            convertOp: convertOp,
            parseAggOps: parseAggOps,
            isSameKey: isSameKey,
            checkIfNeedIndex: checkIfNeedIndex,
            checkTableIndex: checkTableIndex,
            getUnusedImmNames: getUnusedImmNames,
            getCastInfo: getCastInfo,
            castColumns: castColumns,
            joinCast: joinCast,
            joinIndex: joinIndex,
            resolveJoinColRename: resolveJoinColRename,
            semiJoinHelper: semiJoinHelper,
            createJoinedColumns: createJoinedColumns,
            getGroupByAggEvalStr: getGroupByAggEvalStr,
            getFinalGroupByCols: getFinalGroupByCols,
            computeDistinctGroupby: computeDistinctGroupby,
            cascadingJoins: cascadingJoins,
            distinctGroupby: distinctGroupby,
            checkUnionTableInfos: checkUnionTableInfos,
            unionCast: unionCast,
            getUnionConcatMapStr: getUnionConcatMapStr,
            unionAllIndex: unionAllIndex
        }
    }
    /* End Of Unit Test Only */
}

if (typeof exports !== 'undefined') {
    exports.XIApi = XIApi;
}
