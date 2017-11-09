(function() {
    var XIApi = {};
    var aggOps = null;

    var root = this;

    XIApi.filter = function(txId, fltStr, tableName, newTableName) {
        if (txId == null || fltStr == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in filter");
        }

        var deferred = jQuery.Deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        XcalarFilter(fltStr, tableName, newTableName, txId)
        .then(function() {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.genAggStr = function(fieldName, op) {
        var deferred = jQuery.Deferred();
        if (op && op.length) {
            op = op.slice(0, 1).toLowerCase() + op.slice(1);
        }

        getAggOps()
        .then(function(aggs) {
            var evalStr = "";
            if (!aggs.hasOwnProperty(op)) {
                deferred.resolve(evalStr);
                return;
            }

            evalStr += op + "(" + fieldName + ")";
            deferred.resolve(evalStr);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    function getAggOps() {
        if (aggOps != null) {
            return PromiseHelper.resolve(aggOps);
        }

        var deferred = jQuery.Deferred();
        var index = FunctionCategoryT.FunctionCategoryAggregate;
        var category = FunctionCategoryTStr[index];
        XcalarListXdfs("*", category)
        .then(function(res) {
            aggOps = parseAggOps(res);
            deferred.resolve(aggOps);
        })
        .fail(function(error) {
            console.error("get category error", error);
            aggOps = getLocalAggOps();
            // still resolve
            deferred.resolve(aggOps);
        });

        return deferred.promise();
    }

    function parseAggOps(aggXdfs) {
        var res = {};
        try {
            var funcs = aggXdfs.fnDescs;
            funcs.forEach(function(func) {
                res[func.fnName] = true;
            });
        } catch (e) {
            console.error("get category error", e);
            res = getLocalAggOps();
        }
        return res;
    }

    function getLocalAggOps() {
        var res = {};
        for (var key in AggrOp) {
            var op = AggrOp[key];
            if (op && op.length) {
                op = op.slice(0, 1).toLowerCase() + op.slice(1);
            }
            res[op] = true;
        }

        return res;
    }

    // dstAggName is optional and can be left blank (will autogenerate)
    // and new agg table will be deleted
    XIApi.aggregate = function(txId, aggOp, colName, tableName, dstAggName) {
        if (colName == null || tableName == null ||
            aggOp == null || txId == null)
        {
            return PromiseHelper.reject("Invalid args in aggregate");
        }

        var deferred = jQuery.Deferred();

        XIApi.genAggStr(colName, aggOp)
        .then(function(evalStr) {
            return XIApi.aggregateWithEvalStr(txId, evalStr,
                                             tableName, dstAggName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    // dstAggName is optional and can be left blank (will autogenerate)
    // and new agg table will be deleted
    XIApi.aggregateWithEvalStr = function(txId, evalStr, tableName, dstAggName) {
        if (evalStr == null || tableName == null || txId == null) {
            return PromiseHelper.reject("Invalid args in aggregate");
        }

        var deferred = jQuery.Deferred();
        var toDelete = false;

        if (!isValidAggName(dstAggName)) {
            if (dstAggName != null) {
                console.error("invalid agg name");
            }
            var nameRoot = xcHelper.getTableName(tableName);
            dstAggName = xcHelper.randName(nameRoot + "-agg");
            toDelete = true;
        }

        XcalarAggregate(evalStr, dstAggName, tableName, txId)
        .then(function(val, dstDagName) {
            deleteHelper(dstDagName)
            .always(function() {
                var passed = false;
                var err;
                try {
                    passed = true;
                } catch (error) {
                    err = error;
                }
                if (passed) {
                    deferred.resolve(val.Value, dstAggName, toDelete);
                } else {
                    deferred.reject({"error": err});
                }
            });
        })
        .fail(deferred.reject);

        return deferred.promise();

        function deleteHelper(tableToDelete) {
            if (toDelete) {
                return XIApi.deleteTable(txId, tableToDelete);
            } else {
                return PromiseHelper.resolve();
            }
        }
    };

    XIApi.checkOrder = function(tableName, txId) {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in checkOrder");
        }

        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];

        if (table != null) {
            var keyNames = table.getKeyName();
            var order = table.getOrdering();
            if (keyNames != null && XcalarOrderingTStr.hasOwnProperty(order)) {
                return PromiseHelper.resolve(order, keyNames);
            }
        }

        if (txId != null && Transaction.isSimulate(txId)) {
            return PromiseHelper.resolve(null, []);
        }

        var deferred = jQuery.Deferred();

        XcalarGetTableMeta(tableName)
        .then(function(tableMeta) {
            var keys = xcHelper.getTableKeyFromMeta(tableMeta);
            deferred.resolve(tableMeta.ordering, keys);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.load = function(dsArgs, formatArgs, dsName, txId) {
        // dsArgs is as follows:
        // url, isRecur, maxSampleSize, skipRows, isRegex, pattern,
        // formatArgs is as follows:
        // format("CSV", "JSON", "Excel", "raw"), if "CSV", then
        // fieldDelim, recordDelim, hasHeader, quoteChar
        // moduleName, funcName, udfQuery
        if (txId == null || !dsArgs || !formatArgs || !dsArgs.url ||
            !formatArgs.format) {
            return PromiseHelper.reject("Invalid args in load");
        }
        var url = dsArgs.url;
        var isRecur = dsArgs.isRecur || false;
        var format = formatArgs.format;
        var maxSampleSize = dsArgs.maxSampleSize || 0;
        var skipRows = dsArgs.skipRows || 0;
        var isRegex = dsArgs.isRegex || false;
        var pattern = xcHelper.getFileNamePattern(dsArgs.pattern, isRegex);

        var fieldDelim;
        var recordDelim;
        var hasHeader;
        var quoteChar;
        if (format === "CSV") {
            fieldDelim = formatArgs.fieldDelim || "";
            recordDelim = formatArgs.recordDelim || "\n";
            hasHeader = formatArgs.hasHeader || false;
            quoteChar = formatArgs.quoteChar || '"';
        }

        var moduleName = formatArgs.moduleName || "";
        var funcName = formatArgs.funcName || "";
        var udfQuery = formatArgs.udfQuery;

        var options = {
            "fieldDelim": fieldDelim,
            "recordDelim": recordDelim,
            "hasHeader": hasHeader,
            "moduleName": moduleName,
            "funcName": funcName,
            "isRecur": isRecur,
            "maxSampleSize": maxSampleSize,
            "quoteChar": quoteChar,
            "skipRows": skipRows,
            "fileNamePattern": pattern,
            "udfQuery": udfQuery
        };

        return XcalarLoad(url, format, dsName, options, txId);
    };

    XIApi.indexFromDataset = function(txId, dsName, newTableName, prefix) {
        var deferred = jQuery.Deferred();
        if (txId == null || dsName == null) {
            return PromiseHelper.reject("Invalid args in indexFromDataset");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(newTableName);
        }

        if (!isValidPrefix(prefix)) {
            prefix = getNewPrefix(prefix);
        }

        XcalarIndexFromDataset(dsName, "xcalarRecordNum", newTableName, prefix,
                               txId)
        .then(function() {
            deferred.resolve(newTableName, prefix);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.index = function(txId, colToIndex, tableName) {
        if (txId == null || colToIndex == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in index");
        }
        colToIndex = (colToIndex instanceof Array) ? colToIndex : [colToIndex];
        return checkTableIndex(colToIndex, tableName, txId, true);
    };

    XIApi.multiSort = function(txId, sortColsAndOrder, tableName, newTableName)
    {
        var tableId = xcHelper.getTableId(tableName);
        for (var i = 0; i < sortColsAndOrder.length; i++) {
            if (!sortColsAndOrder[i].type) {
                var progCol = gTables[tableId].
                              tableCols[sortColsAndOrder[i].colNum-1];
                sortColsAndOrder[i].name = progCol.backName;
                sortColsAndOrder[i].type = progCol.type;
                if (progCol.type === "number") {
                    sortColsAndOrder[i].type = "float";
                }
            }
        }

        if (txId == null || sortColsAndOrder == null || tableName == null ||
            !(sortColsAndOrder instanceof Array) ||
            (sortColsAndOrder.length < 2)) {
            return PromiseHelper.reject("Invalid args in multisort");
        }

        var fromTableName = tableName;
        var curTableName = tableName;
        var modifiedCols = [];

        function modifyColumn(colName, colType, order, index) {
            var deferred = jQuery.Deferred();
            var maxIntAggVarName;

            if (colType === "string") {
                if (order === XcalarOrderingT.XcalarOrderingAscending) {
                    modifiedCols[index] = colName;
                    deferred.resolve(curTableName);
                } else {
                    fromTableName = curTableName;
                    curTableName = xcHelper.getTableName(fromTableName) +
                                   Authentication.getHashId();
                    // XXX Check for already sorted
                    XcalarIndexFromTable(fromTableName, colName, curTableName,
                                         order, txId)
                    .then(function() {
                        var tableId = Authentication.getHashId();
                        fromTableName = curTableName;
                        curTableName = xcHelper.getTableName(fromTableName) +
                                       tableId;
                        colName = "XC_SORT_CONCAT_RT_COL_" +
                                  xcHelper.getTableId(fromTableName) + "_" +
                                  index;
                        return XcalarGenRowNum(fromTableName, curTableName,
                                               colName, txId);
                    })
                    .then(function() {
                        var tableId = xcHelper.getTableId(curTableName);
                        maxIntAggVarName = "XC_SORT_COL_" + tableId + "_" +
                                           index + "_maxInteger";
                        return XcalarAggregate("maxInteger(" + colName + ")",
                                                 maxIntAggVarName,
                                                 curTableName, txId);
                    })
                    .then(function() {
                        fromTableName = curTableName;
                        curTableName = xcHelper.getTableName(fromTableName) +
                                       Authentication.getHashId();
                        var mapStr =
                                'concat(repeat("0",int(sub(len(string(^' +
                                maxIntAggVarName + ')), len(string(' + colName +
                                '))))),string(' + colName + '))';
                        colName = "XC_SORT_COL_" +
                                  xcHelper.getTableId(fromTableName) + "_" +
                                  index;
                        return XcalarMap(colName, mapStr, fromTableName,
                                         curTableName, txId);
                    })
                    .then(function() {
                        modifiedCols[index] = colName;
                        deferred.resolve(curTableName);
                    })
                    .fail(deferred.reject);
                }
            } else if (colType === "boolean") {
                fromTableName = curTableName;
                curTableName = xcHelper.getTableName(fromTableName) +
                               Authentication.getHashId();

                var mapStr = "string(int(";
                if (order === XcalarOrderingTStr.Ascending) {
                    mapStr += colName;
                } else {
                    mapStr += "add(1, mult(-1," + colName + "))";
                }
                mapStr += "))";

                colName = "XC_SORT_COL_" + xcHelper.getTableId(fromTableName) +
                          "_" + index;
                XcalarMap(colName, mapStr, fromTableName, curTableName, txId)
                .then(function() {
                    modifiedCols[index] = colName;
                    deferred.resolve(curTableName);
                })
                .fail(deferred.reject);
            } else {
                // for numbers, add a constant to make everything non-negative
                // and zero-pad according to largest number to sort.

                var tableId = xcHelper.getTableId(fromTableName);
                var maxAggVarName = "XC_SORT_COL_" + tableId + "_" + index +
                                    "_max";
                var minAggVarName = "XC_SORT_COL_" + tableId + "_" + index +
                                    "_min";

                var maxPromise = XcalarAggregate("max(" + colName + ")",
                                                 maxAggVarName,
                                                 fromTableName, txId);
                var minPromise = XcalarAggregate("min(" + colName + ")",
                                                 minAggVarName,
                                                 fromTableName, txId);
                maxAggVarName = "^" + maxAggVarName;
                minAggVarName = "^" + minAggVarName;
                var inside;
                var actualString;
                if (order === XcalarOrderingT.XcalarOrderingAscending) {
                    inside = "sub(" + maxAggVarName + "," + minAggVarName + ")";
                    actualString = colName;
                } else {
                    inside = "sub(mult(-1," + minAggVarName + "),mult(-1," +
                             maxAggVarName + "))";
                    actualString = "add(mult(-1," + colName + ")," +
                                   maxAggVarName + ")";
                }
                var maxPadding = 'repeat("0", len(cut(string(' + inside +
                              '),1,".")))';

                var curNumDigits = 'len(cut(string(' + actualString +
                                   '),1,"."))';

                var mapStr = 'concat(substring(' + maxPadding + ',' +
                             curNumDigits + ',0),string(' + actualString +
                             '))';

                colName = "XC_SORT_COL_" + tableId + "_" + index;
                fromTableName = curTableName;
                curTableName = xcHelper.getTableName(curTableName) +
                               Authentication.getHashId();
                PromiseHelper.when(maxPromise, minPromise)
                .then(function() {
                    return XcalarMap(colName, mapStr, fromTableName,
                                     curTableName, txId);
                })
                .then(function() {
                    modifiedCols[index] = colName;
                    deferred.resolve(curTableName);
                })
                .fail(deferred.reject);
            }
            return deferred.promise();
        }

        var self = this;
        var deferred = jQuery.Deferred();

        var promises = [];
        for (var i = 0; i < sortColsAndOrder.length; i++) {
            promises.push(
                function(colName, colType, order, index) {
                    return modifyColumn(colName, colType, order, index);
                }.bind(self, sortColsAndOrder[i].name, sortColsAndOrder[i].type,
                       sortColsAndOrder[i].order, i));
        }

        var concatTableName;
        var concatColName;
        PromiseHelper.chain(promises)
        .then(function(finalTableName) {
            // We are done normalizing every column.
            // ModifiedCols[i] contains the normalized column name for column i
            var concatMapStr = "";
            var lastIndex = modifiedCols.length - 1;

            // tab - low ascii value
            var colDelimeter = '\t\txc\t';

            for (var i = 0; i < lastIndex; i++) {
                var currName = modifiedCols[i];
                concatMapStr += "concat(" + currName + ", " + 'concat("' +
                                colDelimeter + '", ';
            }
            var endStr = ")".repeat(2*lastIndex);
            concatMapStr += modifiedCols[lastIndex] + endStr;

            concatTableName = getNewTableName(finalTableName);

            concatColName = "XC_SORT_CONCAT_" +
                            xcHelper.getTableId(finalTableName);
            return XcalarMap(concatColName, concatMapStr, finalTableName,
                             concatTableName, txId);
        })
        .then(function() {
            if (!isValidTableName(newTableName)) {
                newTableName = getNewTableName(tableName);
            }
            return XcalarIndexFromTable(concatTableName, concatColName,
                                        newTableName,
                                        XcalarOrderingT.XcalarOrderingAscending,
                                        txId);
        })
        .then(function() {
            deferred.resolve({newTableName: newTableName,
                              sortColName: concatColName});
        })
        .fail(deferred.reject)
        .always(function() {
            return XcalarDeleteConstants("XC_SORT_COL_" + tableId + "_*", txId);
        });

        return deferred.promise();
    };

    XIApi.sort = function(txId, order, colName, tableName, newTableName) {
        if (txId == null || order == null || colName == null ||
            tableName == null || !(order in XcalarOrderingTStr))
        {
            return PromiseHelper.reject("Invalid args in sort");
        }

        var deferred = jQuery.Deferred();
        // Check for case where table is already sorted
        XIApi.checkOrder(tableName, txId)
        .then(function(sortOrder, sortKeys) {
            if (order === sortOrder &&
                sortKeys.length === 1 &&
                colName === sortKeys[0]) {
                return PromiseHelper.reject(null, true);
            }

            if (!isValidTableName(newTableName)) {
                newTableName = getNewTableName(tableName);
            }

            return XcalarIndexFromTable(tableName, colName, newTableName,
                                        order, txId);
        })
        .then(function() {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.sortAscending = function(txId, colName, tableName, newTableName) {
        // a quick function to sort ascending
        var order = XcalarOrderingT.XcalarOrderingAscending;
        return XIApi.sort(txId, order, colName, tableName, newTableName);
    };

    XIApi.sortDescending = function(txId, colName, tableName, newTableName) {
        // a quick function to sort descending
        var order = XcalarOrderingT.XcalarOrderingDescending;
        return XIApi.sort(txId, order, colName, tableName, newTableName);
    };

    XIApi.map = function(txId, mapStrs, tableName, newColNames, newTableName,
                         icvMode) {
        if (txId == null || mapStrs == null ||
            tableName == null || newColNames == null)
        {
            return PromiseHelper.reject("Invalid args in map");
        }

        var deferred = jQuery.Deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        XcalarMap(newColNames, mapStrs, tableName, newTableName, txId, false,
                  icvMode)
        .then(function() {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /*
        lTableInfo/rTableInfo: object with the following attrs:
            columns: array of back colum names to join,
            casts: array of cast types ["string", "boolean", null] etc
            pulledColumns: columns to pulled out (front col name)
            tableName: table's name
            reaname: array of rename object

        rename map: object generate by
        xcHelper.getJoinRenameMap(oldName, newName, type)
        if it's fat ptr, pass in DfFieldTypeT.DfFatptr, othewise, pass in null

            sample:
                var lTableInfo = {
                    "tableName": "test#ab123",
                    "columns": ["test::colA", "test::colB"],
                    "pulledColumns": ["test::colA", "test::colB"],
                    "rename": [{
                        "new": "test2",
                        "orig": "test",
                        "type": DfFieldTypeT.DfFatptr
                    }]
                }

        options:
            newTableName: string, final table's name, optional
            clean: boolean, remove intermediate table if set true
    */
    XIApi.join = function(txId, joinType, lTableInfo, rTableInfo, options) {
        if (!(lTableInfo instanceof Object) ||
            !(rTableInfo instanceof Object))
        {
            return PromiseHelper.reject("Invalid args in join");
        }

        var lTableName = lTableInfo.tableName;
        var lColNames = lTableInfo.columns;
        var lCasts = lTableInfo.casts;
        var pulledLColNames = lTableInfo.pulledColumns;
        var lRename = lTableInfo.rename || [];

        var rTableName = rTableInfo.tableName;
        var rColNames = rTableInfo.columns;
        var rCasts = rTableInfo.casts;
        var pulledRColNames = rTableInfo.pulledColumns;
        var rRename = rTableInfo.rename || [];

        if (lColNames == null || lTableName == null ||
            rColNames == null || rTableName == null ||
            joinType == null || txId == null ||
            !(joinType in JoinOperatorTStr || joinType in JoinCompoundOperator))
        {
            return PromiseHelper.reject("Invalid args in join");
        }

        if (!(lColNames instanceof Array)) {
            lColNames = [lColNames];
        }

        if (!(rColNames instanceof Array)) {
            rColNames = [rColNames];
        }
        if (!lCasts) {
            lCasts = new Array(lColNames.length).fill(null);
            rCasts = new Array(lColNames.length).fill(null);
        }

        if (!(lCasts instanceof Array)) {
            lCasts = [lCasts];
        }

        if (!(rCasts instanceof Array)) {
            rCasts = [rCasts];
        }

        if (lColNames.length < 1 || lColNames.length !== rColNames.length) {
            return PromiseHelper.reject("Invalid args in join");
        }

        options = options || {};

        var newTableName = options.newTableName;
        var clean = options.clean || false;
        var deferred = jQuery.Deferred();
        var tempTables = [];
        var joinedCols;

        // var lIndexColNames;
        var rIndexColNames;
        // Step 1: cast columns, and if it's a mutli join,
        // auto cast the remaining columns to derived feidls
        var lCastInfo = {
            tableName: lTableName,
            columns: lColNames,
            casts: lCasts
        };
        var rCastInfo = {
            tableName: rTableName,
            columns: rColNames,
            casts: rCasts
        };
        joinCast(txId, lCastInfo, rCastInfo)
        .then(function(res) {
            tempTables = tempTables.concat(res.tempTables);
            // Step 2: index the left table and right table
            // lIndexColNames = res.lColNames;
            rIndexColNames = res.rColNames;
            if (joinType === JoinCompoundOperatorTStr.CrossJoin) {
                // After the index, any type of join will do, so default to
                // inner
                joinType = JoinOperatorT.InnerJoin;
                return crossJoinIndexHelper(res, rRename, txId);
            } else {
                return joinIndexCheck(res, txId);
            }
        })
        .then(function(lIndexedTable, rIndexedTable, tempTablesInIndex) {
            tempTables = tempTables.concat(tempTablesInIndex);
            if (!isValidTableName(newTableName)) {
                newTableName = getNewTableName(lTableName.substring(0, 5) +
                                               "-" +
                                               rTableName.substring(0, 5));
            }

            // Step 3: Check if semi join
            if (joinType in JoinCompoundOperator &&
                joinType !== JoinCompoundOperatorTStr.CrossJoin) {
                // This call will call Xcalar Join because it will swap the
                // left and right tables
                return semiJoinHelper(lIndexedTable, rIndexedTable,
                                      rIndexColNames,
                                      newTableName, joinType, lRename, rRename,
                                      tempTables,
                                      txId);
            } else {
                // Step 3: join left table and right table
                return XcalarJoin(lIndexedTable, rIndexedTable, newTableName,
                                  joinType, lRename, rRename, txId);
            }
        })
        .then(function() {
            var lTableId = xcHelper.getTableId(lTableName);
            var rTableId = xcHelper.getTableId(rTableName);
            joinedCols = createJoinedColumns(lTableId, rTableId,
                                            pulledLColNames,
                                            pulledRColNames,
                                            lRename,
                                            rRename);
            if (clean) {
                return XIApi.deleteTableAndMetaInBulk(txId, tempTables, true);
            }
        })
        .then(function() {
            deferred.resolve(newTableName, joinedCols);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };


    /*
     * gbArgs: an array of objects with operator, aggColName, and newColName
     *         properties - for multi group by operations
     * options:
     *  isIncSample: true/false, include sample or not,
     *               not specified is equal to false
     *  sampleCols: array, sampleColumns to keep,
     *              only used when isIncSample is true
     *  icvMode: true/false, icv mode or not
     *  newTableName: string, dst table name, optional
     *  clean: true/false, if set true, will remove intermediate tables
     */

    XIApi.groupBy = function(txId, gbArgs, groupByCols, tableName, options) {
        if (txId == null || gbArgs == null || groupByCols == null ||
            tableName == null || gbArgs[0].newColName == null ||
            gbArgs[0].aggColName.length < 1)
        {
            return PromiseHelper.reject("Invalid args in groupby");
        }

        options = options || {};
        var isIncSample = options.isIncSample || false;
        var sampleCols = options.sampleCols || [];
        var icvMode = options.icvMode || false;
        var finalTableName = options.newTableName || null;
        var clean = options.clean || false;

        if (!(groupByCols instanceof Array)) {
            groupByCols = [groupByCols];
        }

        // Split gbArgs into 2 arrays, one array with operators and
        // Another array that's just aliasing

        var aliasArray = [];
        var opArray = [];

        for (var i = 0; i < gbArgs.length; i++) {
            if (!gbArgs[i].operator) {
                aliasArray.push(gbArgs[i]);
            } else {
                opArray.push(gbArgs[i]);
            }
        }
        gbArgs = opArray;

        var deferred = jQuery.Deferred();

        var tempTables = [];
        var indexedTable;
        var finalTable;
        var isMultiGroupby = (groupByCols.length !== 1);
        var renamedGroupByCols = [];

        var finalCols = getFinalGroupByCols(tableName, groupByCols, gbArgs,
                                            isIncSample, sampleCols,
                                            renamedGroupByCols);
        // tableName is the original table name that started xiApi.groupby
        getGroupbyIndexedTable(txId, tableName, groupByCols)
        .then(function(resTable, resCols, tempTablesInIndex) {
            // table name may have changed after sort!
            indexedTable = resTable;
            var indexedColName = xcHelper.stripColName(resCols[0]);
            tempTables = tempTables.concat(tempTablesInIndex);

            // get name from src table
            if (finalTableName == null) {
                finalTableName = getNewTableName(tableName, "-GB");
            }
            var gbTableName = finalTableName;
            // incSample does not take renames

            // XXX hack until backend support multikey after groupby
            if (isMultiGroupby) {
                isIncSample = true;
            }
            var newKeyFieldName = isIncSample ? null
                                  : xcHelper.parsePrefixColName(indexedColName)
                                            .name;
            var operators = [];
            var newColNames = [];
            var aggColNames = [];

            gbArgs.forEach(function(gbArg) {
                operators.push(gbArg.operator);
                newColNames.push(gbArg.newColName);
                aggColNames.push(gbArg.aggColName);
            });

            return XcalarGroupBy(operators, newColNames, aggColNames,
                                indexedTable, gbTableName, isIncSample,
                                icvMode, newKeyFieldName, txId);
        })
        .then(function() {
            var deferred = jQuery.Deferred();
            var resTable = finalTableName;
            var tempTablesInMap = [];

            if (aliasArray.length > 0) {
                // Included sample to do some renames
                var newFieldNames = [];
                var evalStrs = [];
                var prevCols = finalCols;
                for (var i = 0; i < aliasArray.length; i++) {
                    var type = aliasArray[i].dataType;
                    newFieldNames.push(aliasArray[i].newColName);
                    evalStrs.push(type + "(" + aliasArray[i].aggColName + ")");
                    var colType = null;
                    switch (type) {
                        case ("float"):
                            colType = ColumnType.float;
                            break;
                        case ("int"):
                            colType = ColumnType.integer;
                            break;
                        case ("bool"):
                            colType = ColumnType.boolean;
                            break;
                        case ("string"):
                            colType = ColumnType.string;
                            break;
                        default:
                            break;
                    }
                    finalCols.push(ColManager.newPullCol(
                                        aliasArray[i].newColName,
                                        aliasArray[i].newColName, colType));
                }
                var newTableName = getNewTableName(resTable);
                XcalarMap(newFieldNames, evalStrs, resTable,
                          newTableName, txId)
                .then(function() {
                    tempTablesInMap = tempTablesInMap.concat([resTable,
                                                              newTableName]);
                    var prevName = newTableName;
                    newTableName = getNewTableName(newTableName);
                    for (var i = 0; i < prevCols.length; i++) {
                        newFieldNames.push(prevCols[i].getBackColName());
                    }

                    return XcalarProject(newFieldNames, prevName, newTableName,
                                         txId);
                })
                .then(function() {
                    deferred.resolve(newTableName, tempTablesInMap);
                })
                .fail(deferred.reject);
            } else {
                deferred.resolve(resTable, tempTablesInMap);
            }
            return deferred.promise();
        })
        .then(function(resTable, tempTablesInMap) {
            finalTable = resTable;
            tempTables = tempTables.concat(tempTablesInMap);
            if (clean) {
                // remove intermediate table
                return XIApi.deleteTableAndMetaInBulk(txId, tempTables, true);
            }
        })
        .then(function() {
            deferred.resolve(finalTable, finalCols, renamedGroupByCols);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /*
        columns: an array of column names (back column name)
        tableName: table's name
        newTableName(optional): new table's name
    */
    XIApi.project = function(txId, columns, tableName, newTableName) {
        if (txId == null || columns == null || tableName == null)
        {
            return PromiseHelper.reject("Invalid args in project");
        }

        var deferred = jQuery.Deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        XcalarProject(columns, tableName, newTableName, txId)
        .then(function() {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.query = function(txId, queryName, queryStr) {
        if (txId == null || queryName == null || queryStr == null) {
            return PromiseHelper.reject("Invalid args in query");
        }
        return XcalarQueryWithCheck(queryName, queryStr, txId);
    };

    /*
     *   attribute in options:
     *      splitType
     *      headerType,
     *      format,
     *      createRule,
     *      handleName
     */
    XIApi.export = function(txId, tableName, exportName, targetName, numCols,
                            backColumns, frontColumns, keepOrder, options) {
        if (txId == null || tableName == null || exportName == null) {
            return PromiseHelper.reject("Invalid args in export");
        }
        return XcalarExport(tableName, exportName, targetName, numCols,
                        backColumns, frontColumns, keepOrder, options, txId);
    };

    XIApi.genRowNum = function(txId, tableName, newColName, newTableName) {
        if (txId == null || tableName == null || newColName == null) {
            return PromiseHelper.reject("Invalid args in get row num");
        }

        var deferred = jQuery.Deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        XcalarGenRowNum(tableName, newTableName, newColName, txId)
        .then(function() {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.getNumRows = function(tableName, options) {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in getNumRows");
        }
        options = options || {};
        if (options.useConstant) {
            // when use constant
            var txId = options.txId;
            var colName = options.colName;
            var aggOp = AggrOp.Count;
            var dstAggName = options.constantName;
            if (dstAggName == null) {
                return PromiseHelper.reject("Invalid args in getNumRows");
            }

            return XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName);
        }

        var tableId = xcHelper.getTableId(tableName);
        if (tableId && gTables[tableId] &&
            gTables[tableId].resultSetCount > -1) {
            return PromiseHelper.resolve(gTables[tableId].resultSetCount);
        }
        return XcalarGetTableCount(tableName);
    };

    XIApi.fetchData = function(tableName, startRowNum, rowsToFetch) {
        if (tableName == null || startRowNum == null ||
            rowsToFetch == null || rowsToFetch <= 0)
        {
            return PromiseHelper.reject("Invalid args in fetch data");
        }

        var deferred = jQuery.Deferred();
        var resultSetId;
        var finalData;

        XcalarMakeResultSetFromTable(tableName)
        .then(function(res) {
            resultSetId = res.resultSetId;
            var totalRows = res.numEntries;

            if (totalRows == null || totalRows === 0) {
                return PromiseHelper.reject("No Data!");
            }

            // startRowNum starts with 1, rowPosition starts with 0
            var rowPosition = startRowNum - 1;
            rowsToFetch = Math.min(rowsToFetch, totalRows);
            return XcalarFetchData(resultSetId, rowPosition, rowsToFetch,
                                   totalRows, [], 0);
        })
        .then(function(result) {
            finalData = [];
            for (var i = 0, len = result.length; i < len; i++) {
                finalData.push(result[i].value);
            }
            return XcalarSetFree(resultSetId);
        })
        .then(function() {
            deferred.resolve(finalData);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.fetchDataAndParse = function(tableName, startRowNum, rowsToFetch) {
        // similar with XIApi.fetchData, but will parse the value
        var deferred = jQuery.Deferred();

        XIApi.fetchData(tableName, startRowNum, rowsToFetch)
        .then(function(data) {
            var parsedData = [];

            for (var i = 0, len = data.length; i < len; i++) {
                try {
                    parsedData.push(JSON.parse(data[i]));
                } catch (error) {
                    console.error(error, data[i]);
                    deferred.reject(error);
                    return;
                }
            }

            deferred.resolve(parsedData);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.fetchColumnData = function(colName, tableName, startRowNum, rowsToFetch) {
        if (colName == null) {
            // other args with check in XIApi.fetchData
            return PromiseHelper.reject("Invalid args in fetch data");
        }

        var deferred = jQuery.Deferred();

        XIApi.fetchData(tableName, startRowNum, rowsToFetch)
        .then(function(data) {
            var result = [];
            var failed = false;
            var err;
            for (var i = 0, len = data.length; i < len; i++) {
                try {
                    var row = JSON.parse(data[i]);
                    result.push(row[colName]);
                } catch (error) {
                    console.error(error, data[i]);
                    err = error;
                    failed = true;
                }
                if (failed) {
                    deferred.reject(err);
                    return;
                }
            }

            deferred.resolve(result);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.appSet = function(txId, name, hostType, duty, execStr) {
        // appName: name for app, doesn't have to match any name in execStr
        // hostType: python for python app, presumably cpp for cpp app
        // duty: leave blank, or possibly "load"
        // execStr: body of the app
        var deferred = jQuery.Deferred();
        if (txId == null || name == null) {
            return PromiseHelper.reject("Invalid args in appSet");
        }

        // TODO: check for valid hostType, duty, execStr
        // SUBTODO: What are valid hostTypes?
        // SUBTODO: What are valid duties?
        // SUBTODO: If execStr has, for instance, syntax error,
        //          should we check that here or wait until backend
        //          catches it.
        XcalarAppSet(name, hostType, duty, execStr)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.appRun = function(txId, name, isGlobal, inStr) {
        if (txId == null || name == null) {
            return PromiseHelper.reject("Invalid args in appSet");
        }
        return XcalarAppRun(name, isGlobal, inStr);
    };

    XIApi.appReap = function(txId, name, appGroupId) {
        if (txId == null || name == null) {
            return PromiseHelper.reject("Invalid args in appReap");
        }
        return XcalarAppReap(name, appGroupId);
    };

    XIApi.appExecute = function(txId, name, isGlobal, inStr) {
        if (txId == null || name == null) {
            return PromiseHelper.reject("Invalid args in appRun");
        }
        return XcalarAppExecute(name, isGlobal, inStr);
    };

    // toIgnoreError: boolean, if set true, will always resolve
    // the promise even the call fails.
    XIApi.deleteTable = function(txId, tableName, toIgnoreError) {
        if (txId == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in delete table");
        }

        var deferred = jQuery.Deferred();

        XcalarDeleteTable(tableName, txId)
        .then(deferred.resolve)
        .fail(function(error) {
            if (toIgnoreError) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    };

    XIApi.deleteTableAndMeta = function(txId, tableName, toIgnoreError) {
        var deferred = jQuery.Deferred();

        XIApi.deleteTable(txId, tableName, toIgnoreError)
        .then(function() {
            var tableId = xcHelper.getTableId(tableName);
            if (tableId != null && gTables[tableId] != null) {
                delete gTables[tableId];
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Drop Table Failed!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    XIApi.deleteTableAndMetaInBulk = function(txId, tables, toIgnoreError) {
        var promises = [];
        for (var i = 0, len = tables.length; i < len; i++) {
            var def = XIApi.deleteTableAndMeta(txId, tables[i], toIgnoreError);
            promises.push(def);
        }
        return PromiseHelper.when.apply(this, promises);
    };

    function joinCast(txId, lInfo, rInfo) {
        var deferred = jQuery.Deferred();

        var lColNames = lInfo.columns;
        var lTableName = lInfo.tableName;
        var lCasts = lInfo.casts;

        var rColNames = rInfo.columns;
        var rTableName = rInfo.tableName;
        var rCasts = rInfo.casts;

        var len = lColNames.length;
        var def1;
        var def2;

        if (len === 1 && !lCasts[0]) {
            // single and no cast
            def1 = PromiseHelper.resolve({
                tableName: lTableName,
                colNames: lColNames
            });
        } else {
            // single join with cast or multi join
            def1 = castMap(txId, lTableName, lColNames, lCasts);
        }

        if (len === 1 && !rCasts[0]) {
            // single and no cast
            def2 = PromiseHelper.resolve({
                tableName: rTableName,
                colNames: rColNames
            });
        } else {
            // single join with cast or multi join
            def2 = castMap(txId, rTableName, rColNames, rCasts);
        }

        PromiseHelper.when(def1, def2)
        .then(function(lRes, rRes) {
            var tempTables = [];
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
        .fail(function() {
            deferred.reject(xcHelper.getPromiseWhenError(arguments));
        });

        return deferred.promise();
    }

    function castMap(txId, tableName, colNames, casts, overWrite) {
        var deferred = jQuery.Deferred();
        var castInfo = getCastInfo(tableName, colNames, casts, overWrite);
        var newColNames = castInfo.newColNames;

        if (castInfo.mapStrs.length === 0) {
            deferred.resolve({
                tableName: tableName,
                colNames: newColNames
            });
        } else {
            var tableId = xcHelper.getTableId(tableName);
            // ok if null, only being used for setorphantablemeta
            var progCols = gTables[tableId] ? gTables[tableId].tableCols : null;
            var newTableName = getNewTableName(tableName);
            XcalarMap(castInfo.newFields, castInfo.mapStrs,
                      tableName, newTableName, txId)
            .then(function() {
                TblManager.setOrphanTableMeta(newTableName, progCols);

                deferred.resolve({
                    tableName: newTableName,
                    colNames: newColNames,
                    newTable: true
                });
            })
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    function getCastInfo(tableName, colNames, casts, overWrite) {
        var tableId = xcHelper.getTableId(tableName);
        var mapStrs = [];
        var newFields = []; // this is for map
        var newColNames = []; // this is for index

        casts.forEach(function(typeToCast, index) {
            var colName = colNames[index];
            var parsedCol = xcHelper.parsePrefixColName(colName);
            var newType;
            var newField = colName;

            if (!typeToCast && parsedCol.prefix) {
                // when it's a fatptr and no typeToCast specified
                try {
                    newType = gTables[tableId].getColByBackName(colName).getType();
                } catch (e) {
                    console.error(e);
                    // when fail to get the col type from meta, cast to string
                    // XXX this is a hack util backend support auto cast when indexing
                    newType = "string";
                }
                newField = overWrite
                           ? parsedCol.name
                           : parsedCol.prefix + "_" + parsedCol.name;
            } else {
                newType = typeToCast;
                newField = parsedCol.name;
            }

            if (newType != null) {
                newField = overWrite ? newField : xcHelper.randName(newField);
                mapStrs.push(xcHelper.castStrHelper(colName, newType));
                newFields.push(newField);
            }
            newColNames.push(newField);
        });

        return {
            mapStrs: mapStrs,
            newFields: newFields,
            newColNames: newColNames
        };
    }

    function joinIndexCheck(joinInfo, txId) {
        var deferred = jQuery.Deferred();
        var deferred1;
        var deferred2;
        var lColNames = joinInfo.lColNames;
        var rColNames = joinInfo.rColNames;
        var lTableName = joinInfo.lTableName;
        var rTableName = joinInfo.rTableName;

        if (lTableName === rTableName &&
            isSameKey(lColNames, rColNames))
        {
            // when it's self join
            var defs = selfJoinIndex(lColNames, lTableName, txId);
            deferred1 = defs[0];
            deferred2 = defs[1];
        } else {
            deferred1 = checkTableIndex(lColNames, lTableName, txId);
            deferred2 = checkTableIndex(rColNames, rTableName, txId);
        }

        PromiseHelper.when(deferred1, deferred2)
        .then(function(res1, res2) {
            var lIndexedTable = res1[0];
            var rIndexedTable = res2[0];
            var tempTables = res1[2].concat(res2[2]);
            deferred.resolve(lIndexedTable, rIndexedTable, tempTables);
        })
        .fail(function() {
            var error = xcHelper.getPromiseWhenError(arguments);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function selfJoinIndex(colNames, tableName, txId) {
        var deferred1 = jQuery.Deferred();
        var deferred2 = jQuery.Deferred();

        checkTableIndex(colNames, tableName, txId)
        .then(function() {
            deferred1.resolve.apply(this, arguments);
            deferred2.resolve.apply(this, arguments);
        })
        .fail(function() {
            deferred1.reject.apply(this, arguments);
            deferred2.reject.apply(this, arguments);
        });

        return [deferred1.promise(), deferred2.promise()];
    }

    function isSameKey(key1, key2) {
        if (key1.length !== key2.length) {
            return false;
        }

        for (var i = 0, len = key1.length; i < len; i++) {
            if (key1[i] !== key2[i]) {
                return false;
            }
        }

        return true;
    }

    function checkIfNeedIndex(colsToIndex, tableName, tableKeys, order, txId) {
        var deferred = jQuery.Deferred();
        var shouldIndex = false;
        var tempTables = [];

        getUnsortedTableName(tableName, null, txId)
        .then(function(unsorted) {
            if (unsorted !== tableName) {
                // this is sorted table, should index a unsorted one
                XIApi.checkOrder(unsorted, txId)
                .then(function(parentOrder, parentKeys) {
                    if (!isSameKey(parentKeys, colsToIndex)) {
                        if (!isSameKey(parentKeys, tableKeys)) {
                            // if current is sorted, the parent should also
                            // index on the tableKey to remove "KNF"
                            // var fltTable = getNewTableName(tableName,
                            //                               ".fltParent", true);

                            // XXX this is correct This is correct, but there are some backend issues with excluding FNFs for now 7071, 7622
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

                            var indexTable = getNewTableName(tableName,
                                                          ".indexParent", true);
                            XcalarIndexFromTable(unsorted, tableKeys, indexTable,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        txId)
                            .then(function() {
                                if (isSameKey(tableKeys, colsToIndex)) {
                                    // when the parent has right index
                                    shouldIndex = false;
                                } else {
                                    // when parent need another index on colName
                                    shouldIndex = true;
                                }
                                tempTables.push(indexTable);
                                deferred.resolve(shouldIndex, indexTable,
                                                 tempTables);
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
                if (!isSameKey(tableKeys, colsToIndex)) {
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

    function crossJoinIndexHelper(joinInfo, rRename, txId) {
        var deferred = jQuery.Deferred();

        var lTableName = joinInfo.lTableName;
        var rTableName = joinInfo.rTableName;

        var lNewColName = xcHelper.randName("XC_JOIN_CL");
        var lMapTableName = getNewTableName(lTableName);
        var lIndexTableName = getNewTableName(lTableName);

        var rNewColName;
        var rMapTableName;
        var rIndexTableName;

        var lDef;
        var rDef;

        var selfJoin = false;

        // 1. Generate a column of 1s on the left and right
        // 2. Index by the columns and resolve the two new table names
        lDef = XcalarMap(lNewColName, "int(1)", lTableName, lMapTableName, txId)
        .then(function() {
            return XcalarIndexFromTable(lMapTableName, lNewColName,
                                        lIndexTableName,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        txId);
        });

        if (lTableName !== rTableName) {
            rNewColName = xcHelper.randName("XC_JOIN_CR");
            rMapTableName = getNewTableName(rTableName);
            rIndexTableName = getNewTableName(rTableName);
            rDef = XcalarMap(rNewColName, "int(1)", rTableName, rMapTableName,
                             txId)
            .then(function() {
                return XcalarIndexFromTable(rMapTableName, rNewColName,
                                            rIndexTableName,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                            txId);
            });
        } else {
            selfJoin = true;
            rRename.push({"new": lNewColName + "1",
                          "orig": lNewColName,
                          "type": DfFieldTypeT.DfUnknown});
            rIndexTableName = lIndexTableName;
            rDef = lDef;
        }

        PromiseHelper.when(lDef, rDef)
        .then(function() {
            var tempTables = [];

            tempTables.push(lMapTableName);
            tempTables.push(lIndexTableName);
            if (!selfJoin) {
                tempTables.push(rMapTableName);
                tempTables.push(rIndexTableName);
            }

            deferred.resolve(lIndexTableName, rIndexTableName, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function semiJoinHelper(lIndexedTable, rIndexedTable, rIndexedColNames,
                            newTableName,
                            joinType, lRename, rRename, tempTables, txId) {
        var deferred = jQuery.Deferred();
        // TODO: switch left and right and support right semi joins
        var newColName = xcHelper.randName("XC_GB_COL");
        var newGbTableName = getNewTableName(rIndexedTable);
        var antiJoinTableName;

        tempTables.push(newGbTableName);
        XcalarGroupBy("count", newColName, rIndexedColNames[0], rIndexedTable,
                      newGbTableName, false, false, rIndexedColNames[0], txId)
        .then(function() {
            if (joinType === JoinCompoundOperatorTStr.LeftAntiSemiJoin ||
                joinType === JoinCompoundOperatorTStr.RightAntiSemiJoin) {
                antiJoinTableName = getNewTableName(rIndexedTable);
                return XcalarJoin(lIndexedTable, newGbTableName,
                                  antiJoinTableName,
                                  JoinOperatorT.LeftOuterJoin,
                                  lRename, rRename, txId);
            } else {
                return XcalarJoin(lIndexedTable, newGbTableName, newTableName,
                    JoinOperatorT.InnerJoin, lRename, rRename, txId);
            }
        })
        .then(function() {
            if (joinType === JoinCompoundOperatorTStr.LeftAntiSemiJoin ||
                joinType === JoinCompoundOperatorTStr.RightAntiSemiJoin) {
                tempTables.push(antiJoinTableName);
                return XcalarFilter("not(exists(" + rIndexedColName + "))",
                       antiJoinTableName, newTableName, txId);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    // check if table has correct index
    function checkTableIndex(colNames, tableName, txId, isApiCall) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        var tableCols = null;
        var table = null;
        var indexTable;

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
        } else if (Transaction.isSimulate(txId)) {
            indexTable = SQLApi.getIndexTable(tableName, colNames);
            if (indexTable != null) {
                return PromiseHelper.resolve(indexTable, true, [], true);
            }
        } else {
            table = gTables[tableId];
            tableCols = table.tableCols;
            indexTable = table.getIndexTable(colNames);
            if (indexTable != null) {
                // XXX Note: here the assume is if index table has meta,
                // it should exists
                // more reliable might be use XcalarGetTables to check, but it's
                // async
                var indexTableId = xcHelper.getTableId(indexTable);
                if (gTables.hasOwnProperty(indexTableId)) {
                    console.log("has cached of index table", indexTable);
                    QueryManager.addIndexTable(txId, indexTable);
                    return PromiseHelper.resolve(indexTable, true, [], true);
                } else {
                    console.log("cached index table", indexTable, "not exists");
                    table.removeIndexTable(colNames);
                }
            }
        }

        XIApi.checkOrder(tableName, txId)
        .then(function(order, keys) {
            return checkIfNeedIndex(colNames, tableName, keys, order, txId);
        })
        .then(function(shouldIndex, unsortedTable, tempTables) {
            if (shouldIndex) {
                console.log(tableName, "not indexed correctly!");
                // XXX In the future,we can check if there are other tables that
                // are indexed on this key. But for now, we reindex a new table
                var newTableName = getNewTableName(tableName, ".index");
                XcalarIndexFromTable(unsortedTable, colNames, newTableName,
                                     XcalarOrderingT.XcalarOrderingUnordered,
                                     txId)
                .then(function() {
                    if (!isApiCall) {
                        tempTables.push(newTableName);
                        TblManager.setOrphanTableMeta(newTableName, tableCols);
                    }
                    if (Transaction.isSimulate(txId)) {
                        SQLApi.cacheIndexTable(tableName, colNames, newTableName);
                    } else if (table != null) {
                        table.setIndexTable(colNames, newTableName);
                    }
                    deferred.resolve(newTableName, shouldIndex, tempTables);
                })
                .fail(function(error) {
                    if (error.code === StatusT.StatusAlreadyIndexed) {
                        deferred.resolve(unsortedTable, false, tempTables);
                    } else {
                        deferred.reject(error);
                    }
                });
            } else {
                console.log(tableName, "indexed correctly!");
                deferred.resolve(unsortedTable, shouldIndex, tempTables);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function replacePrefix(col, rename) {
        // for each fat ptr rename, find whether a column has this fat ptr as
        // a prefix. If so, fix up all fields in colStruct that pertains to the
        // prefix
        for (var i = 0; i < rename.length; i++) {
            if (rename[i].type === DfFieldTypeT.DfFatptr) {
                if (!col.immediate && col.prefix === rename[i].orig) {
                    col.backName = col.backName.replace(rename[i].orig,
                                                        rename[i].new);
                    col.func.args[0] = col.func.args[0].replace(rename[i].orig,
                                                                rename[i].new);
                    col.prefix = col.prefix.replace(rename[i].orig,
                                                    rename[i].new);
                    col.userStr = '"' + col.name + '" = pull(' + rename[i].new +
                                  '::' + col.name + ')';
                    if (col.sizedTo === "header") {
                        col.width = xcHelper.getDefaultColWidth(col.name,
                                                                col.prefix);
                    }
                }
            }
        }
    }

    function getPulledColsAfterJoin(tableId, pulledColNames, renames) {
        var pulledCols = [];
        if (tableId == null || gTables[tableId] == null ||
            gTables[tableId].tableCols == null) {
            return pulledCols;
        }

        var table = gTables[tableId];
        var cols = xcHelper.deepCopy(table.tableCols);
        if (pulledColNames) {
            for (var i = 0; i < pulledColNames.length; i++) {
                var colNum = table.getColNumByBackName(pulledColNames[i]) - 1;
                var col = cols[colNum];
                if (renames && renames.length > 0) {
                    for (var j = 0; j < renames.length; j++) {
                        // when backName === srcColName, it's a derived field
                        if (renames[j].orig === col.backName) {
                            var newName = renames[j].new;
                            col.backName = newName;
                            col.name = newName;
                            if (col.sizedTo === "header") {
                                col.width = xcHelper.getDefaultColWidth(newName);
                            }
                        }
                    }
                    replacePrefix(col, renames);
                }
                pulledCols.push(col);
            }
        } else {
            pulledCols = cols;
        }
        return pulledCols;
    }

    function excludeDataCol(col) {
        return col.name !== "DATA";
    }

    // For xiApi.join, deepy copy of right table and left table columns
    function createJoinedColumns(lTableId, rTableId, pulledLColNames,
                                pulledRColNames, lRename, rRename) {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var lCols = getPulledColsAfterJoin(lTableId, pulledLColNames, lRename);
        var rCols = getPulledColsAfterJoin(rTableId, pulledRColNames, rRename);

        var lNewCols = lCols.filter(excludeDataCol);
        var rNewCols = rCols.filter(excludeDataCol);
        var newTableCols = lNewCols.concat(rNewCols);
        newTableCols.push(ColManager.newDATACol());

        return newTableCols;
    }

    function getGroupbyIndexedTable(txId, tableName, groupByCols) {
        // From Jerene:
        // 1. merge multi columns into one using concat xdf
        // 2. sort this merged column
        var deferred = jQuery.Deferred();
        var groupByFields;
        var tempTables = [];
        var def;

        if (groupByCols.length === 1) {
            // single group by
            def = PromiseHelper.resolve({
                tableName: tableName,
                colNames: groupByCols
            });
        } else {
            var casts = new Array(groupByCols.length).fill(null);
            def = castMap(txId, tableName, groupByCols, casts, true);
        }

        def
        .then(function(res) {
            if (res.newTable) {
                tempTables.push(res.tableName);
            }
            groupByFields = res.colNames;
            return checkTableIndex(groupByFields, res.tableName, txId);
        })
        .then(function(indexedTable, shouldIndex, temIndexTables) {
            tempTables = tempTables.concat(temIndexTables);
            deferred.resolve(indexedTable, groupByFields, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getFinalGroupByCols(tableName, groupByCols, gbArgs,
                                 isIncSample, sampleCols, renamedGroupByCols) {
        var dataCol = ColManager.newDATACol();
        var tableId = xcHelper.getTableId(tableName);
        var newColNames = {};
        var newProgCols = [];
        var numNewCols = gbArgs.length;
        var numGroupByCols = groupByCols.length;
        var finalCols;

        for (var i = 0; i < groupByCols.length; i++) {
            renamedGroupByCols.push(groupByCols[i]);
        }

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // We really should clean up this function to remove the requirement
            // of gTables
            finalCols = [];
            gbArgs.forEach(function(gbArg) {
                var name = gbArg.newColName;
                newColNames[name] = true;
                newProgCols.push(ColManager.newPullCol(name, name));
            });

            groupByCols.forEach(function(name) {
                if (!newColNames[name]) {
                    newColNames[name] = true;
                    newProgCols.push(ColManager.newPullCol(name, name));
                }
            });

            console.warn("Cannot find table. Not handling sampleCols");

            newProgCols.push(dataCol);
            return newProgCols;
        }

        var table = gTables[tableId];
        var tableCols = table.tableCols;

        gbArgs.forEach(function(gbArg) {
            var name = gbArg.newColName;
            newColNames[name] = true;
            newProgCols.push(ColManager.newPullCol(name, name));
        });

        if (isIncSample) {
            var newCols = [];
            var newProgColPosFound = false;
            sampleCols.forEach(function(colNum) {
                var backCol = tableCols[colNum].getBackColName();
                if (!newProgColPosFound) {
                    for (var j = 0; j < numGroupByCols; j++) {
                        if (backCol === groupByCols[j]) {
                            for (var k = 0; k < numNewCols; k++) {
                                newCols.push(newProgCols[k]);
                            }
                            newProgColPosFound = true;
                            break;
                        }
                    }
                }

                newCols.push(tableCols[colNum]);
            });

            if (!newProgColPosFound) {
                newProgCols.forEach(function(progCol) {
                    newCols.unshift(progCol);
                });
            }
            // Note that if include sample,
            // a.b should not be escaped to a\.b
            var dataColNum = gTables[tableId].getColNumByBackName("DATA") - 1;
            newCols.push(tableCols[dataColNum]);
            finalCols = newCols.map(function(col) {
                return new ProgCol(col);
            });
        } else {
            finalCols = newProgCols.map(function(progCol) {
                return progCol;
            });
            // finalCols = [newProgCol];
            // Pull out each individual groupByCols
            for (var i = 0; i < numGroupByCols; i++) {
                var backColName = groupByCols[i];
                var progCol = table.getColByBackName(backColName) || {};
                var parsedPrefixName = xcHelper.parsePrefixColName(backColName);
                var escapedName = xcHelper.stripColName(parsedPrefixName.name);
                var colName;
                if (escapedName in newColNames) {
                    var limit = 50;
                    var tries = 0;
                    var newName = parsedPrefixName.prefix + "_" + escapedName;

                    while (tries < limit) {
                        if (newName in newColNames) {
                            tries++;
                            newName = escapedName + tries;
                        } else {
                            break;
                        }
                    }
                    if (tries >= limit) {
                        newName = xcHelper.randName(escapedName);
                    }
                    escapedName = newName;
                    colName = escapedName;
                } else {
                    colName = progCol.name || backColName;
                }
                colName = xcHelper.parsePrefixColName(colName).name;
                colName = xcHelper.stripColName(colName);
                newColNames[escapedName] = true;
                renamedGroupByCols[i] = escapedName;

                finalCols[numNewCols + i] = ColManager.newCol({
                    "backName": escapedName,
                    "name": colName,
                    "type": progCol.type || null,
                    "width": progCol.width || gNewCellWidth,
                    "isNewCol": false,
                    "userStr": '"' + colName + '" = pull(' + escapedName + ')',
                    "func": {
                        "func": "pull",
                        "args": [escapedName]
                    }
                });
            }

            finalCols[numNewCols + numGroupByCols] = dataCol;
        }
        return finalCols;
    }

    function isValidTableName(tableName) {
        var isValid = isCorrectTableNameFormat(tableName);
        if (!isValid) {
            if (tableName != null) {
                console.error("incorrect table name format");
            }
            return false;
        }

        var namePart = xcHelper.getTableName(tableName);
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

    function isValidAggName(aggName) {
        if (isCorrectTableNameFormat(aggName)) {
            // allow aggName to have the table name format
            return isValidTableName(aggName);
        } else {
            // no blanks, must start with alpha, cannot have any special chars
            // other than _ and - and #
            return xcHelper.isValidTableName(aggName);
        }
    }

    function isCorrectTableNameFormat(tableName) {
        if (tableName == null || tableName === "") {
            return false;
        }
        if (typeof sqlMode !== "undefined" && sqlMode) {
            return true;
        }
        var regex = "^.*#[a-zA-Z0-9]{2}[0-9]+$";
        var regexp = new RegExp(regex);
        return regexp.test(tableName);
    }

    function isValidPrefix(prefix) {
        if (!prefix || prefix === "") {
            console.error("invalid prefix");
            return false;
        }
        return xcHelper.checkNamePattern("prefix", "check", prefix);
    }

    function getNewTableName(tableName, affix, rand) {
        var nameRoot = xcHelper.getTableName(tableName);

        if (affix != null) {
            nameRoot += affix;
        }

        if (rand) {
            nameRoot = xcHelper.randName(nameRoot);
        }

        return (nameRoot + Authentication.getHashId());
    }

    function getNewPrefix(dsName) {
        return xcHelper.normalizePrefix(dsName);
    }

    if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = XIApi;
        }
        exports.XIApi = XIApi;
    } else {
        root.XIApi = XIApi;
    }
}());
