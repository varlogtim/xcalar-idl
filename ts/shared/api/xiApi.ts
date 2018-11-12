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
        casts: ColumnType[]
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
        const regexp: RegExp = new RegExp('^.*#[a-zA-Z0-9_]+$');
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

    function getAggValue(txId: number, aggName: string): XDPromise<string | number> {
        if (txId != null && Transaction.isSimulate(txId)) {
            return PromiseHelper.resolve(null);
        }

        const deferred: XDDeferred<string | number> = PromiseHelper.deferred();
        XIApi.fetchData(aggName, 1, 1)
        .then((data) => {
            try {
                const constant: string | number = JSON.parse(data[0]).constant;
                deferred.resolve(constant);
            } catch (e) {
                console.error(e);
                deferred.resolve(null, e);
            }
        })
        .fail(() => {
            deferred.resolve(null, "Invalid aggregate")
        });

        return deferred.promise();
    }


    /* =========== Index Helper ================ */
    function indexHelper(
        txId: number,
        keyInfos: {
            name: string,
            ordering: XcalarOrderingT,
            type?: ColumnType,
            keyFieldName?: string,
        }[],
        tableName: string,
        newTableName: string,
        dhtName: string
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        let newKeys: string[];
        XcalarIndexFromTable(tableName, keyInfos, newTableName, dhtName, simuldateTxId)
        .then((res) => {
            newKeys = res.newKeys;
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(newTableName, newKeys);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

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
    /* ========== End of Index Helper =========== */

    /* ========== Cast Helper =================== */
    function getCastInfo(
        colNames: string[],
        casts: ColumnType[],
        options: CastInfoOptions = <CastInfoOptions>{}
    ) {
        const overWrite: boolean = options.overWrite || false;
        const handleNull: boolean = options.handleNull || false;
        const castPrefix: boolean = options.castPrefix || false;

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
                throw new Error("prefix field must have a cast type");
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
        casts: ColumnType[],
        options: CastInfoOptions = <CastInfoOptions>{}
    ): XDPromise<CastResult> {
        const castInfo = getCastInfo(colNames, casts, options);
        if (castInfo.mapStrs.length === 0) {
            return PromiseHelper.resolve({
                tableName: tableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: false
            });
        }

        let deferred: XDDeferred<CastResult> = PromiseHelper.deferred();
        const newTableName: string = getNewTableName(tableName);
        XIApi.map(txId, castInfo.mapStrs, tableName, castInfo.newFields, newTableName)
        .then(() => {
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

    function synthesizeColumns(
        txId: number,
        tableName: string,
        colNames: string[],
        casts: ColumnType[]
    ): XDPromise<CastResult> {
        const options: CastInfoOptions = {
            castPrefix: true,
            handleNull: true,
            overWrite: false
        };
        const castInfo = getCastInfo(colNames, casts, options);
        if (castInfo.mapStrs.length === 0) {
            return PromiseHelper.resolve({
                tableName: tableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: false
            });
        }

        const colInfos: ColRenameInfo[] = colNames.map((colName, i) => {
            const newName: string = castInfo.newColNames[i];
            const type: ColumnType = castInfo.newTypes[i];
            const fieldType: DfFieldTypeT = xcHelper.convertColTypeToFieldType(type);
            return xcHelper.getJoinRenameMap(colName, newName, fieldType);
        });

        const newTableName: string = getNewTableName(tableName);
        const deferred: XDDeferred<CastResult> = PromiseHelper.deferred();

        XIApi.synthesize(txId, colInfos, tableName, newTableName)
        .then(() => {
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
    function joinHelper(
        txId: number,
        lIndexedTable: string,
        rIndexedTable: string,
        newTableName: string,
        joinType: number,
        lRename: ColRenameInfo[],
        rRename: ColRenameInfo[],
        options: {evalString: string} = {evalString: ""}
    ): XDPromise<string[]> {
        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarJoin(lIndexedTable, rIndexedTable, newTableName,
            <number>joinType, lRename, rRename, options, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            // the temp cols for normal join is empty
            deferred.resolve([]);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

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
    ): XDPromise<string>[] {
        const def1: XDDeferred<string> = PromiseHelper.deferred();
        const def2: XDDeferred<string> = PromiseHelper.deferred();

        XIApi.index(txId, colNames, tableName)
        .then((...arg) => {
            def1.resolve.apply(this, arg);
            def2.resolve.apply(this, arg);
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
            return PromiseHelper.resolve(lInfo, rInfo, [], []);
        }

        let def1: XDPromise<string>;
        let def2: XDPromise<string>;
        if (lTableName === rTableName && isSameKey(lColNames, rColNames)) {
            // when it's self join
            [def1, def2] = selfJoinIndex(txId, lColNames, lTableName);
        } else {
            def1 = XIApi.index(txId, lColNames, lTableName);
            def2 = XIApi.index(txId, rColNames, rTableName);
        }

        let lIndexedTable: string;
        let rIndexedTable: string;
        let lNewKeys: string[];
        let rNewKeys: string[];
        let tempCols: string[];

        let tempTables: string[] = [];
        const deferred: XDDeferred<JoinIndexResult> = PromiseHelper.deferred();

        PromiseHelper.when(def1, def2)
        .then((res1, res2) => {
            lIndexedTable = res1[0];
            rIndexedTable = res2[0];
            lNewKeys = res1[2];
            rNewKeys = res2[2];
            if (lTableName === rTableName && isSameKey(lColNames, rColNames)) {
                tempCols = res1[3];
            } else {
                tempCols = res1[3].concat(res2[3]);
            }

            if (removeNulls) {
                const newTableName: string = getNewTableName(lTableName, ".noNulls");
                const fltStr: string = "exists(" + lColNames[0] + ")";
                tempTables.push(newTableName);
                return XIApi.filter(txId, fltStr, lIndexedTable, newTableName);
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
            deferred.resolve(lInfo, rInfo, tempTables, tempCols);
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
    ): XDPromise<string[]> {
        // XXX FIXME rIndexedColNames[0] is wrong in the cases where it is
        // called a::b, and there's another immediate called a-b
        // This is because a::b will becomes a-b.
        const isAntiSemiJoin: boolean = joinType === JoinCompoundOperatorTStr.LeftAntiSemiJoin ||
                                        joinType === JoinCompoundOperatorTStr.RightAntiSemiJoin;
        const isExistenceJoin: boolean = joinType === JoinCompoundOperatorTStr.ExistenceJoin;
        const newGbTableName: string = getNewTableName(rIndexedTable);
        const newKeyFieldName: string = xcHelper.stripPrefixInColName(rIndexedColNames[0]);
        const newColName: string = xcHelper.randName("XC_GB_COL");

        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        let antiJoinTableName: string;
        let existJoinTableName: string;

        groupByHelper(txId, [newColName], ["count(1)"], rIndexedTable,
        newGbTableName, false, false, newKeyFieldName, false)
        .then(() => {
            if (isAntiSemiJoin) {
                antiJoinTableName = getNewTableName(rIndexedTable);
                return joinHelper(txId, lIndexedTable, newGbTableName,
                                antiJoinTableName, JoinOperatorT.LeftOuterJoin,
                                lRename, rRename);
            } else if (isExistenceJoin) {
                existJoinTableName = getNewTableName(lIndexedTable);
                return joinHelper(txId, lIndexedTable, newGbTableName,
                            existJoinTableName, JoinOperatorT.LeftOuterJoin,
                            lRename, rRename);
            } else {
                return joinHelper(txId, lIndexedTable, newGbTableName,
                                    newTableName, JoinOperatorT.InnerJoin,
                                    lRename, rRename);
            }
        })
        .then(() => {
            if (isAntiSemiJoin) {
                tempTables.push(antiJoinTableName);
                const fltStr = "not(exists(" + newKeyFieldName + "))";
                return XIApi.filter(txId, fltStr, antiJoinTableName, newTableName);
            } else if (isExistenceJoin) {
                tempTables.push(existJoinTableName);
                const mapStr = "exists(" + newKeyFieldName + ")";
                return XIApi.map(txId, [mapStr], existJoinTableName, [existenceCol], newTableName);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            const tempCols: string[] = [newColName];
            deferred.resolve(tempCols);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    /* ============= End of Join Helper ================ */

    /* ============= GroupBy Helper ==================== */
    function groupByHelper(
        txId: number,
        newColNames: string[],
        evalStrs: string[],
        tableName: string,
        newTableName: string,
        incSample: boolean = false,
        icvMode: boolean = false,
        newKeyFieldName: string = "",
        groupAll: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarGroupByWithEvalStrings(newColNames, evalStrs, tableName,
        newTableName, incSample, icvMode, newKeyFieldName, groupAll, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

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
    // XXX FIXME: currently it can only triggered by sql which assumes all columns
    // are derived fields. When this assumption breaks, must hand the case when
    // newKeyFieldName in groupByHelper is a prefix
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
        XIApi.index(txId, newGroupOnCols, origTableName)
        .then((indexedTableName) => {
            for (let i: number = 0; i < newGroupOnCols.length; i++) {
                newGroupOnCols[i] = stripColName(newGroupOnCols[i]);
            }


            const newAggColName = "XC_COUNT_" + xcHelper.getTableId(gbTableName);
            tempCols.push(newAggColName);
            tempTables.push(gbDistinctTableName);
            // XXX [0] argument needs to be fixed once bohan's fix goes in
            return groupByHelper(txId, [newAggColName], ["count(1)"],
            indexedTableName, gbDistinctTableName, false, false,
            newGroupOnCols[0], false);
        })
        .then(() => {
            if (reuseIndex || groupAll) {
                newIndexTable = gbDistinctTableName;
                return PromiseHelper.resolve({});
            } else {
                newIndexTable = getNewTableName(origTableName, "index");
                tempTables.push(newIndexTable);
                for (let i: number = 0; i < groupOnCols.length; i++) {
                    groupOnCols[i] = stripColName(groupOnCols[i]);
                }
                return XIApi.index(txId, groupOnCols, gbDistinctTableName, newIndexTable);
            }
        })
        .then(() => {
            const evalStrs: string[] = [];
            const newColNames: string[] = [];
            aggArgs.forEach((aggArg) => {
                aggArg.aggColName = stripColName(aggArg.aggColName);
                evalStrs.push(aggArg.operator + "(" + aggArg.aggColName + ")");
                newColNames.push(aggArg.newColName);
            });
            console.log(evalStrs);
            return groupByHelper(txId, newColNames, evalStrs, newIndexTable,
            gbTableName, false, false, newGroupOnCols[0], groupAll);
        })
        .then(() => {
            tempTables.push(gbTableName);
            distinctGbTables.push(gbTableName);
            deferred.resolve();
        })
        .fail(deferred.reject);

        // convert a::b into b or int(a::b, 10) into int(b, 10)
        // XXX not handling nested eval functions
        function stripColName(colName: string): string {
            let prefix = "";
            // extract the name if wrapped in a cast
            if (colName.startsWith("int(") || colName.startsWith("string(") ||
                colName.startsWith("float(") || colName.startsWith("bool(")) {
                prefix = colName.slice(0, colName.indexOf("("));
                colName = colName.substring(colName.indexOf("(") + 1,
                                            colName.length - 1);
                if (colName.indexOf(",") > -1) {
                    colName = colName.substring(0, colName.indexOf(","));
                }
            }
            colName = colName.substr(colName.lastIndexOf(":") + 1);
            if (prefix) {
                colName = prefix + "(" + colName;
                if (prefix === "int") {
                    colName += ", 10";
                }
                colName += ")";
            }
            return colName;
        }

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

            promises.push(joinHelper.bind(this, txId, curTableName, rTableName,
                                newTableName, joinType,
                                [], rRename));
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
        groupOnCols = xcHelper.deepCopy(groupOnCols);
        // we're going to manipulate groupOnCols
        // and don't want to modify the original copy
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
    function unionHelper(
        txId: number,
        tableNames: string[],
        newTableName: string,
        colInfos: ColRenameInfo[][],
        dedup: boolean,
        unionType: UnionOperatorT
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarUnion(tableNames, newTableName, colInfos, dedup, unionType, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

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
                const parsedCol: PrefixColInfo = xcHelper.parsePrefixColName(colInfo.name);
                let cast = colInfo.cast ? colInfo.type : null;
                if (parsedCol.prefix) {
                    // prefix col must cast
                    cast = colInfo.type;
                }
                casts.push(cast);
            });

            const tableName: string = tableInfo.tableName;
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            synthesizeColumns(txId, tableName, colNames, casts)
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
            return XIApi.index(txId, [concatColName], curTableName);
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

        const simuldateTxId: number = startSimulate();
        XcalarFilter(fltStr, tableName, newTableName, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
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
        let err: string;

        if (!isValidAggName(dstAggName)) {
            if (dstAggName != null) {
                console.error("invalid agg name");
            }
            const nameRoot: string = xcHelper.getTableName(tableName);
            dstAggName = xcHelper.randName(nameRoot + "-agg");
            toDelete = true;
        }

        let aggVal: string | number;
        const simuldateTxId: number = startSimulate();
        XcalarAggregate(evalStr, dstAggName, tableName, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = getNewTableName(dstAggName);
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            return getAggValue(txId, dstAggName);
        })
        .then((val, error) => {
            aggVal = val;
            err = error;
            if (toDelete) {
                return PromiseHelper.alwaysResolve(XIApi.deleteTable(txId, dstAggName));
            }
        })
        .then(() => {
            if (err != null) {
                deferred.reject({error: err});
            } else {
                deferred.resolve(aggVal, dstAggName, toDelete);
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
     * @returns XDPromise<order, keys>
     */
    export function checkOrder(tableName: string): XDPromise<number> {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in checkOrder");
        }

        const deferred: XDDeferred<number> = PromiseHelper.deferred();
        XcalarGetTableMeta(tableName)
        .then((tableMeta) => {
            const keys: {name: string, ordering: XcalarOrderingT}[] = xcHelper.getTableKeyInfoFromMeta(tableMeta);
            deferred.resolve(tableMeta.ordering, keys);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX TODO: remove it and use XIApi.loadDataset
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

        return XIApi.loadDataset(txId, dsName, options);
    }

    /**
     * XIApi.loadDataset
     * @param txId
     * @param dsName
     * @param options
     */
    export function loadDataset (
        txId: number,
        dsName: string,
        options: object
    ): XDPromise<any> {
        if (txId == null || !dsName || !options) {
            return PromiseHelper.reject("Invalid args in load dataset");
        }

        // XXX TODO: make the query version work
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        // const simuldateTxId: number = startSimulate();
        let hasCreate: boolean = false;

        XcalarDatasetCreate(dsName, options)
        .then(() => {
            hasCreate = true;
            // return XcalarDatasetActivate(dsName, simuldateTxId);
            return XcalarDatasetActivate(dsName, txId);
        })
        // .then(() => {
        //     const query: string = endSimulate(simuldateTxId);
        //     const queryName: string = dsName;
        //     return XIApi.query(txId, queryName, query);
        // })
        .then(deferred.resolve)
        .fail((error) => {
            if (hasCreate) {
                XcalarDatasetDelete(dsName);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * XIApi.deleteDataset
     * @param txId
     * @param dsName
     * @param options
     */
    export function deleteDataset (
        txId: number,
        dsName: string,
        allowDeactivateFail: boolean = false
    ): XDPromise<any> {
        if (!dsName) {
            return PromiseHelper.reject("Invalid args in delete dataset");
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const deactivate = () => {
            const innerDeferred: XDDeferred<any> = PromiseHelper.deferred();
            XcalarDatasetDeactivate(dsName)
            .then(deferred.resolve)
            .fail((error) => {
                if (allowDeactivateFail) {
                    deferred.resolve();
                } else {
                    deferred.reject(error);
                }
            });
            return innerDeferred.promise();
        };

        deactivate()
        .then(() => {
            return XcalarDatasetDelete(dsName, txId);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
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

        const simuldateTxId: number = startSimulate();
        XcalarIndexFromDataset(dsName, gXcalarRecordNum, newTableName, prefix, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(newTableName, prefix);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.index
     * @param txId
     * @param colNames
     * @param tableName
     * @param newTableName
     * @param newKeys
     * @param dhtName (Note that only groupBy's index is valid to use dht)
     * @returns Promise<indexTable, indexArgs>, indexTable: (string),
     * indexArgs: (object) see checckTableIndex
     */
    export function index(
        txId: number,
        colNames: string[],
        tableName: string,
        newTableName?: string,
        newKeys?: string[],
        dhtName?: string
    ): XDPromise<string> {
        if (txId == null ||
            colNames == null ||
            tableName == null ||
            !(colNames instanceof Array)
        ) {
            return PromiseHelper.reject("Invalid args in index");
        }

        let indexCache: TableIndexCache = SQLApi.getIndexTable(tableName, colNames);
        if (indexCache != null) {
            console.info("has cached of index table", indexCache.tableName);
            // log this indexed table as part of the transaction so afterwards
            // we can add a tag to the indexed table to indicate it is
            // part of the transaction
            if (typeof QueryManager !== "undefined") {
                // XXX For JDBC. QueryManager is currently browser side code. So
                // it shouldn't be mixed up with API layer code.
                // We can probably better solve the issue when we have clear
                // code layers/structures.
                QueryManager.addIndexTable(txId, indexCache.tableName);
            }
            return PromiseHelper.resolve(indexCache.tableName, true,
                                         indexCache.keys, indexCache.tempCols);
        }
        if (colNames.length === 0) {
            return PromiseHelper.resolve(tableName, false, colNames, []);
        }

        newKeys = newKeys || [];
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let keysList: string[] = [];
        let tempCols: string[] = [];
        const keyInfos: {
            name: string,
            ordering: XcalarOrderingT,
            keyFieldName: string
        }[] = colNames.map((colName, index) => {
            if (newKeys[index] && keysList.indexOf(newKeys[index]) != -1 ||
                newKeys[index] == undefined && keysList.indexOf(colName) != -1) {
                newKeys[index] = (newKeys[index] || colName) + "_copy_"
                                 + Authentication.getHashId().substring(1);
                tempCols.push(newKeys[index]);
            }
            keysList.push(newKeys[index] || colName);
            return {
                name: colName,
                ordering: XcalarOrderingT.XcalarOrderingUnordered,
                keyFieldName: newKeys[index] || null
            };
        });
        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName, ".index");
        }
        indexHelper(txId, keyInfos, tableName, newTableName, dhtName)
        .then((newTableName, newKeys) => {
            SQLApi.cacheIndexTable(tableName, colNames,
                                        newTableName, newKeys, tempCols);
            deferred.resolve(newTableName, false, newKeys, tempCols);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.sort
     * @param txId
     * @param keyInfos
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sort(
        txId: number,
        keyInfos: {
            name: string,
            ordering: XcalarOrderingT,
            type?: ColumnType
        }[],
        tableName: string,
        newTableName?: string,
        dhtName?: string
    ): XDPromise<string> {
        if (txId == null ||
            keyInfos == null ||
            tableName == null ||
            !(keyInfos instanceof Array)
        ) {
            return PromiseHelper.reject("Invalid args in sort");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        indexHelper(txId, keyInfos, tableName, newTableName, dhtName)
        .then((newTableName, newKeys) => {
            deferred.resolve(newTableName, newKeys);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.sortAscending
     * @param txId
     * @param colNames
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sortAscending(
        txId: number,
        colNames: string[],
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        // a quick function to sort ascending
        const keyInfos: {
            name: string, ordering: XcalarOrderingT
        }[] = colNames.map((colName) => {
            return {
                name: colName,
                ordering: XcalarOrderingT.XcalarOrderingAscending
            }
        });
        return XIApi.sort(txId, keyInfos, tableName, newTableName);
    }

    /**
     * XIApi.sortDescending
     * @param txId
     * @param colNames
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sortDescending(
        txId: number,
        colNames: string[],
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        // a quick function to sort descending
        const keyInfos: {
            name: string, ordering: XcalarOrderingT
        }[] = colNames.map((colName) => {
            return {
                name: colName,
                ordering: XcalarOrderingT.XcalarOrderingDescending
            }
        });
        return XIApi.sort(txId, keyInfos, tableName, newTableName);
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

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const simuldateTxId: number = startSimulate();
        XcalarMap(newColNames, mapStrs, tableName, newTableName, icvMode, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
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
        const lRename: ColRenameInfo[] = lTableInfo.rename || [];
        let lCasts: ColumnType[] = lTableInfo.casts;

        const rTableName: string = rTableInfo.tableName;
        const rColNames: string[] = (rTableInfo.columns instanceof Array) ?
                                    rTableInfo.columns : [rTableInfo.columns];
        const rRename: ColRenameInfo[] = rTableInfo.rename || [];
        let rCasts: ColumnType[] = rTableInfo.casts;


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
        let tempColNames: string[];

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
        .then((lRes: JoinIndexResult, rRes: JoinIndexResult, tempTablesInIndex:
                string[], tempCols: string[]) => {
            tempTables = tempTables.concat(tempTablesInIndex);
            tempColNames = tempCols;
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
                return joinHelper(txId, lIndexedTable, rIndexedTable, newTableName,
                        <number>joinType, lRename, rRename, joinOptions);
            }
        })
        .then((tempCols) => {
            tempCols = tempCols.concat(tempColNames);
            if (clean) {
                XIApi.deleteTableInBulk(txId, tempTables, true)
                .always(() => {
                    deferred.resolve(newTableName, tempCols, lRename, rRename);
                });
            } else {
                deferred.resolve(newTableName, tempCols, lRename, rRename);
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
     * @returns Promise<finalTable, tempCols, newKeyFieldName, newKeys>
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
        // groupBy call
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

        const icvMode: boolean = options.icvMode || false;
        const clean: boolean = options.clean || false;
        const groupAll: boolean = options.groupAll || false;
        const isMultiGroupby: boolean = (groupByCols.length > 1);
        let gbTableName: string = options.newTableName;
        let tempTables: string[] = [];
        let finalTable: string;
        let newKeyFieldName: string;
        let newKeys: string[] = options.newKeys || [];
        let isIncSample: boolean = options.isIncSample || false;
        newKeys.forEach((colName) => {
            if (xcHelper.parsePrefixColName(colName).prefix) {
                isIncSample = true; // if there is prefix field in newKeys, keep sample
                return false;
            }
        });

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        // tableName is the original table name that started xiApi.groupby
        XIApi.index(txId, groupByCols, tableName, null, newKeys, options.dhtName)
        .then((indexedTable, _isCache, indexKeys) => {
            newKeys = indexKeys;
            // table name may have changed after sort!
            let indexedColName: string = indexKeys.length === 0 ?
                            null : xcHelper.stripColName(indexKeys[0]);

            // get name from src table
            if (!isValidTableName(gbTableName)) {
                gbTableName = getNewTableName(tableName, "-GB");
            }

            // incSample does not take renames, multiGroupby already handle
            // the name in index stage
            newKeyFieldName = (isIncSample || isMultiGroupby || groupAll) ?
            null : xcHelper.stripPrefixInColName(indexedColName);
            const newColNames: string[] = [];
            const evalStrs: string[] = [];
            normalAggArgs.forEach((aggArg) => {
                newColNames.push(aggArg.newColName);
                evalStrs.push(getGroupByAggEvalStr(aggArg));
            });

            return groupByHelper(txId, newColNames, evalStrs,
            indexedTable, gbTableName, isIncSample,
            icvMode, newKeyFieldName, groupAll)
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

            if (clean) {
                // remove intermediate table
                const promise: XDPromise<void> = XIApi.deleteTableInBulk(txId, tempTables, true)
                return PromiseHelper.alwaysResolve(promise);
            }
        })
        .then(() => {
            deferred.resolve(finalTable, tempCols, newKeyFieldName, newKeys);
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
            return unionHelper(txId, tableNames, newTableName, colInfos, dedup, unionType);
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
        const simuldateTxId: number = startSimulate();
        XcalarProject(columns, tableName, newTableName, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
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
        const simuldateTxId: number = startSimulate();
        XcalarSynthesize(tableName, newTableName, colInfos, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
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
        jdbcCheckTime?: number,
        noCleanup?: boolean
    ): XDPromise<XcalarApiQueryStateOutputT> {
        if (txId == null || queryName == null || queryStr == null) {
            return PromiseHelper.reject("Invalid args in query");
        }

        if (Transaction.isSimulate(txId)) {
            if (queryStr.startsWith("[") && queryStr.endsWith("]")) {
                queryStr = queryStr.substring(1, queryStr.length - 1);
            }
            Transaction.log(txId, queryStr);
            return PromiseHelper.resolve({});
        } else {
            if (!queryStr.startsWith("[")) {
                // when query is not in the form of JSON array
                if (queryStr.endsWith(",")) {
                    queryStr = queryStr.substring(0, queryStr.length - 1);
                }
                queryStr = "[" + queryStr + "]";
            }

            const deferred: XDDeferred<any> = PromiseHelper.deferred();
            XcalarQueryWithCheck(queryName, queryStr, txId, false, jdbcCheckTime, noCleanup)
            .then((res) => {
                let error: {error: string, log?: string} = null;
                try {
                    res.queryGraph.node.forEach((nodeInfo) => {
                        // XXX TODO: wire in status
                        const state = nodeInfo.state;
                        if (state=== DgDagStateT.DgDagStateError) {
                            error = {
                                error: DgDagStateTStr[state],
                                log: nodeInfo.log
                            };
                            return false; // stop loop
                        }
                    });
                } catch (e) {
                    console.error(e);
                    // if cannot correctly parse the return structure,
                    // still resolve it
                }

                if (error == null) {
                    deferred.resolve(res);
                } else {
                    deferred.reject(error);
                }
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    }

    /**
     * XIApi.exportTable
     */
    export function exportTable(
        txId: number,
        tableName: string,
        driverName: string,
        driverParams: {},
        columns: XcalarApiExportColumnT[],
        exportName: string
    ): XDPromise<void> {
        if (txId == null || tableName == null || exportName == null || driverName == null ||
            columns.length == 0) {
            return PromiseHelper.reject("Invalid args in export");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarExport(tableName, driverName, driverParams, columns, exportName)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = getNewTableName(exportName);
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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

    // XXX TODO: wait for 13273 to be fixed, then change it to use query
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
    ): XDPromise<void> {
        if (txId == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in delete table");
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarDeleteTable(tableName, txId)
        .then(function(ret) {
            SQLApi.deleteIndexTable(tableName);
            deferred.resolve(ret);
        })
        .fail((error) => {
            if (toIgnoreError) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    /**
     * XIApi.deleteTableInBulk
     * @param txId
     * @param tables
     * @param toIgnoreError
     */
    export function deleteTableInBulk(
        txId: number,
        tables: string[],
        toIgnoreError: boolean = false
    ): XDPromise<void> {
        const promises: XDPromise<void>[] = tables.map((tableName) => {
            return XIApi.deleteTable(txId, tableName, toIgnoreError);
        });
        return PromiseHelper.when.apply(this, promises);
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
                    SQLApi.deleteIndexTable(tableName);
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

    export function renameTable(
        txId: number,
        tableName: string,
        newTableName: string
    ): XDPromise<string> {
        if (txId == null ||
            tableName == null ||
            !isValidTableName(newTableName)
        ) {
            return PromiseHelper.reject("Invalid args in rename table");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XcalarRenameTable(tableName, newTableName, txId)
        .then(() => {
            SQLApi.deleteIndexTable(tableName);
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

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

    /**
    * XIApi.publishTable
    * @param txId
    * @param primaryKey, Name of the column that acts as primary key
    * @param tableName, table's name
    * @param pubTableName, new published table's name
    * @param colInfo, Information about the columns within the table
    * @param imdCol,  (optional) name of the column that acts as the operator
    */
    export function publishTable(
        txId: number,
        primaryKeys: string[],
        srcTableName: string,
        pubTableName: string,
        colInfo: ColRenameInfo[],
        imdCol?: string
    ): XDPromise<string> {
        if (txId == null || primaryKeys == null ||
            srcTableName == null || pubTableName == null ||
            colInfo == null) {
            return PromiseHelper.reject("Invalid args in publish");
        }
        let keyNames: string[] = primaryKeys.map((primaryKey) => {
            return (primaryKey[0] == "$") ?
                primaryKey.substr(1) : primaryKey;
        });

        if (!colInfo.find((info: ColRenameInfo) => {
            return (keyNames.includes(info.orig));
        })) {
            return PromiseHelper.reject("Primary Key not in Table");
        }

        const roColName: string = "XcalarRankOver";
        const opCode: string = "XcalarOpCode";
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const indexTableName: string = xcHelper.randName("test") + Authentication.getHashId();
        const opCodeTableName: string = xcHelper.randName("test") + Authentication.getHashId();
        const rowNumTableName: string = xcHelper.randName("test") + Authentication.getHashId();
        let rowPromise: XDPromise<string>;
        const primaryKeyList: {name: string, ordering: XcalarOrderingT}[] =
            primaryKeys.map((primaryKey) => {
                primaryKey = xcHelper.parsePrefixColName(primaryKey).name;
                return {name: primaryKey,
                    ordering: XcalarOrderingT.XcalarOrderingUnordered};
        });
        if (imdCol[0] == "$") {
            imdCol = imdCol.substr(1);
        }

        // Assemble rankOverColumn
        rowPromise =  XIApi.genRowNum(txId, srcTableName,
            roColName, rowNumTableName);

        rowPromise
        .then(function(table: string) {
            // Assemble opcode column
            let mapStr: string[] = [];
            if (imdCol != null && imdCol != "") {
                mapStr = ["int(" + imdCol + ")"];
            } else {
                mapStr = ["int(1)"];
            }
            return XIApi.map(txId, mapStr, table,
                [opCode], opCodeTableName);
        })
        .then(function(table: string) {
            // synthesize
            colInfo.push({
                orig: roColName,
                new: roColName,
                type: DfFieldTypeT.DfInt64
            }, {
                orig: opCode,
                new: opCode,
                type: DfFieldTypeT.DfInt64
            }
        );
            return XIApi.synthesize(txId, colInfo, table);
        })
        .then(function(tableName) {
            // Reorder just in case
            // XXX TODO: expose it
            const dhtName: string = "";
            return indexHelper(txId, primaryKeyList, tableName, indexTableName, dhtName);
        })
        .then(function() {
            // Finally publish the table
            return XcalarPublishTable(indexTableName, pubTableName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    function startSimulate(): number {
        const txId: number = Transaction.start({
            operation: "Simulate",
            simulate: true
        });
        return txId;
    }

    function endSimulate(txId: number): string {
        let query: string = Transaction.done(txId, {
            noNotification: true,
            noSql: true,
            noCommit: true
        });
        return query;
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
            getUnusedImmNames: getUnusedImmNames,
            getCastInfo: getCastInfo,
            castColumns: castColumns,
            synthesizeColumns: synthesizeColumns,
            joinCast: joinCast,
            joinIndex: joinIndex,
            resolveJoinColRename: resolveJoinColRename,
            semiJoinHelper: semiJoinHelper,
            getGroupByAggEvalStr: getGroupByAggEvalStr,
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
