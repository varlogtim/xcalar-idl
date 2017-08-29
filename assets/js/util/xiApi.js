window.XIApi = (function(XIApi) {
    var aggOps = null;

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
        var keyName;
        var order;

        if (table != null) {
            keyName = table.getKeyName();
            order = table.getOrdering();
            if (keyName != null && XcalarOrderingTStr.hasOwnProperty(order)) {
                return PromiseHelper.resolve(order, keyName);
            }
        }

        if (txId != null && Transaction.isSimulate(txId)) {
            return PromiseHelper.resolve(null, null);
        }

        var deferred = jQuery.Deferred();

        XcalarGetTableMeta(tableName)
        .then(function(tableMeta) {
            order = tableMeta.ordering;
            keyName = xcHelper.getTableKeyFromMeta(tableMeta);
            deferred.resolve(order, keyName);
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
            newTableName = getNewTableName(tableName);
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
                        tableId = xcHelper.getTableId(curTableName);
                        maxIntAggVarName = "XC_SORT_COL_" + tableId + "_" + index +
                                           "_maxInteger";
                        return XcalarAggregate("maxInteger(" + colName + ")",
                                                 maxIntAggVarName,
                                                 curTableName, txId);
                    })
                    .then(function() {
                        fromTableName = curTableName;
                        tableId = Authentication.getHashId();
                        curTableName = xcHelper.getTableName(fromTableName) +
                                       tableId;
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
                var tableId = Authentication.getHashId();
                curTableName = xcHelper.getTableName(fromTableName) +
                               tableId;

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
                // for numbers, add a constant to make everything non-negative and
                // zero-pad according to largest number to sort.

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
                    actualString = "add(mult(-1," + colName + ")," + maxAggVarName + ")";
                }
                var maxPadding = 'repeat("0", len(cut(string(' + inside +
                              '),1,".")))';

                var curNumDigits = 'len(cut(string(sub(' + actualString + ',' +
                                  minAggVarName + ')),1,"."))';

                var mapStr = 'concat(substring(' + maxPadding + ',' + curNumDigits +
                             ',0),string(sub(' + actualString + ',' + minAggVarName + ')))';

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
            deferred.resolve(newTableName);
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
        .then(function(sortOrder, sortKey) {
            if (order === sortOrder && colName === sortKey) {
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
                        "old": "test",
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
            !(joinType in JoinOperatorTStr))
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
            lCasts = new Array(lColNames.length);
            rCasts = new Array(lColNames.length);
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
        var checkJoinKey = gEnableJoinKeyCheck;
        var deferred = jQuery.Deferred();
        var lTable_index;
        var rTable_index;
        var tempTables = [];
        var joinedCols;
        // Step 1: check if it's a multi Join.
        // If yes, should do a map to concat all columns
        // will also do casts during the concat map
        multiJoinAndCastCheck(lColNames, lTableName, rColNames, rTableName,
                             lCasts, rCasts, txId)
        .then(function(res) {
            tempTables = tempTables.concat(res.tempTables);
            // Step 2: index the left table and right table
            return joinIndexCheck(res, checkJoinKey, txId);
        })
        .then(function(lInexedTable, rIndexedTable, tempTablesInIndex) {
            lTable_index = lInexedTable;
            rTable_index = rIndexedTable;
            tempTables = tempTables.concat(tempTablesInIndex);
            if (!isValidTableName(newTableName)) {
                newTableName = getNewTableName(lTableName.substring(0, 5) +
                                                "-" +
                                                rTableName.substring(0, 5));
            }
            // Step 3: join left table and right table
            return XcalarJoin(lInexedTable, rIndexedTable, newTableName,
                                joinType, lRename, rRename, txId);
        })
        .then(function() {
            if (checkJoinKey) {
                // this is the table that has change all col name
                lTableName = lTable_index;
                rTableName = rTable_index;
            }

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
            gbArgs[0].aggColName.length < 1 || gbArgs[0].operator == null)
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

        // 0 cols is a special case of 'multiGroupBy'
        // if (groupByCols.length < 1) {
        //     return PromiseHelper.reject("Invalid args in groupby");
        // }

        var deferred = jQuery.Deferred();

        var tempTables = [];
        var indexedTable;
        var indexedColName;
        var finalTable;
        var isMultiGroupby = (groupByCols.length !== 1);
        var unstrippedIndexedColName;
        var renamedGroupByCols = [];

        var finalCols = getFinalGroupByCols(tableName, groupByCols, gbArgs,
                                            isIncSample, sampleCols,
                                            renamedGroupByCols);
        // tableName is the original table name that started xiApi.groupby
        getGroupbyIndexedTable(txId, tableName, groupByCols)
        .then(function(resTable, resCol, tempTablesInIndex) {
            // table name may have changed after sort!
            indexedTable = resTable;
            unstrippedIndexedColName = resCol;
            indexedColName = xcHelper.stripColName(resCol);
            tempTables = tempTables.concat(tempTablesInIndex);

            // get name from src table
            if (finalTableName == null) {
                finalTableName = getNewTableName(tableName, "-GB");
            }
            var promises = [];
            var gbTableName = finalTableName;
            var sample = isIncSample;
            for (var i = 0; i < gbArgs.length; i++) {
                if (gbArgs.length > 1) {
                    gbTableName = getNewTableName(finalTableName);
                }
                if (i > 0) {
                    // only do sample on first groupby
                    sample = false;
                }
                var newKeyFieldName = xcHelper.parsePrefixColName(indexedColName)
                                              .name;
                if (sample) {
                    // incSample does not take renames
                    newKeyFieldName = null;
                }
                promises.push(XcalarGroupBy(gbArgs[i].operator,
                    gbArgs[i].newColName, gbArgs[i].aggColName,
                    indexedTable, gbTableName, sample, icvMode, newKeyFieldName,
                    txId));
            }
            return PromiseHelper.when.apply(window, promises);
        })
        .then(function() {
            var args = arguments;
            if (!isIncSample) {
                indexedColName = xcHelper.parsePrefixColName(indexedColName)
                                         .name;
            }

            return groupByJoinHelper(txId, indexedColName,
                                unstrippedIndexedColName, finalTableName,
                                    gbArgs, args, isIncSample);
        })
        .then(function(retTableName) {
            finalTableName = retTableName;
            if (isMultiGroupby && !isIncSample) {
                // multi group by should extract column from groupby table
                return extractColFromMap(tableName, finalTableName, groupByCols,
                                         indexedColName, finalCols,
                                         renamedGroupByCols, txId);
            } else {
                return PromiseHelper.resolve(finalTableName, []);
            }
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

    function multiJoinAndCastCheck(lColNames, lTableName, rColNames, rTableName,
                                  lCasts, rCasts, txId) {
        var deferred = jQuery.Deferred();
        var len = lColNames.length;
        var tempTables = [];
        // left cols
        var lTableId = xcHelper.getTableId(lTableName);
        var rTableId = xcHelper.getTableId(rTableName);
        var lCols = null; // ok if null, only being used for setorphantablemeta
        var rCols = null; // ok if null, only being used for setorphantablemeta
        if (gTables[lTableId] && gTables[rTableId]) {
            lCols = gTables[lTableId].tableCols;
            rCols = gTables[rTableId].tableCols;
        }

        var deferred1;
        var deferred2;
        var lNewName;
        var rNewName;
        var lColName;
        var rColName;
        var lString;
        var rString;

        if (len === 1) {// single join
            if (!lCasts[0] && !rCasts[0]) {
                deferred.resolve({
                    "lTableName": lTableName,
                    "lColName": lColNames[0],
                    "rTableName": rTableName,
                    "rColName": rColNames[0],
                    "tempTables": tempTables
                });
            } else {
                if (lCasts[0]) {
                    lNewName = getNewTableName(lTableName);
                    lString = xcHelper.castStrHelper(lColNames[0], lCasts[0]);
                    lColName = xcHelper.randName("leftJoinCol");
                    deferred1 = XcalarMap(lColName, lString, lTableName,
                                          lNewName, txId);
                } else {
                    lNewName = lTableName;
                    lColName = lColNames[0];
                    deferred1 = PromiseHelper.resolve();
                }
                if (rCasts[0]) {
                    rNewName = getNewTableName(rTableName);
                    rString = xcHelper.castStrHelper(rColNames[0], rCasts[0]);
                    rColName = xcHelper.randName("rightJoinCol");
                    deferred2 = XcalarMap(rColName, rString, rTableName,
                                          rNewName, txId);
                } else {
                    rNewName = rTableName;
                    rColName = rColNames[0];
                    deferred2 = PromiseHelper.resolve();
                }

                PromiseHelper.when(deferred1, deferred2)
                .then(function() {
                    if (lCasts[0]) {
                        TblManager.setOrphanTableMeta(lNewName, lCols);
                        tempTables.push(lNewName);
                    }
                    if (rCasts[0]) {
                        TblManager.setOrphanTableMeta(rNewName, rCols);
                        tempTables.push(rNewName);
                    }

                    deferred.resolve({
                        "lTableName": lNewName,
                        "lColName": lColName,
                        "rTableName": rNewName,
                        "rColName": rColName,
                        "tempTables": tempTables
                    });
                })
                .fail(function() {
                    var error = xcHelper.getPromiseWhenError(arguments);
                    deferred.reject(error);
                });
            }
        } else {
            // multi join
            lNewName = getNewTableName(lTableName);
            var lCastColNames = xcHelper.getJoinCastStrings(lColNames, lCasts);
            lString = xcHelper.getMultiJoinMapString(lCastColNames);
            lColName = xcHelper.randName("leftJoinCol");

            // right cols
            rNewName = getNewTableName(rTableName);
            var rCastColNames = xcHelper.getJoinCastStrings(rColNames, rCasts);
            rString = xcHelper.getMultiJoinMapString(rCastColNames);
            rColName = xcHelper.randName("rightJoinCol");

            deferred1 = XcalarMap(lColName, lString, lTableName, lNewName, txId);
            deferred2 = XcalarMap(rColName, rString, rTableName, rNewName, txId);

            PromiseHelper.when(deferred1, deferred2)
            .then(function() {
                TblManager.setOrphanTableMeta(lNewName, lCols);
                TblManager.setOrphanTableMeta(rNewName, rCols);
                tempTables.push(lNewName);
                tempTables.push(rNewName);

                deferred.resolve({
                    "lTableName": lNewName,
                    "lColName": lColName,
                    "rTableName": rNewName,
                    "rColName": rColName,
                    "tempTables": tempTables
                });
            })
            .fail(function() {
                var error = xcHelper.getPromiseWhenError(arguments);
                deferred.reject(error);
            });
        }

        return deferred.promise();
    }

    function joinIndexCheck(joinInfo, checkJoinKey, txId) {
        var deferred = jQuery.Deferred();
        var deferred1;
        var deferred2;
        var lColName = joinInfo.lColName;
        var rColName = joinInfo.rColName;
        var lTableName = joinInfo.lTableName;
        var rTableName = joinInfo.rTableName;

        if (checkJoinKey) {
            // when it's self join or globally enabled
            deferred1 = handleJoinKey(lColName, lTableName, txId, true);
            deferred2 = handleJoinKey(rColName, rTableName, txId, false);
        } else if (lTableName === rTableName && lColName === rColName) {
            // when it's self join
            var defs = selfJoinIndex(lColName, lTableName, txId);
            deferred1 = defs[0];
            deferred2 = defs[1];
        } else {
            deferred1 = checkTableIndex(lColName, lTableName, txId);
            deferred2 = checkTableIndex(rColName, rTableName, txId);
        }

        PromiseHelper.when(deferred1, deferred2)
        .then(function(res1, res2) {
            var lInexedTable = res1[0];
            var rIndexedTable = res2[0];
            var tempTables = res1[2].concat(res2[2]);
            deferred.resolve(lInexedTable, rIndexedTable, tempTables);
        })
        .fail(function() {
            var error = xcHelper.getPromiseWhenError(arguments);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function selfJoinIndex(colName, tableName, txId) {
        var deferred1 = jQuery.Deferred();
        var deferred2 = jQuery.Deferred();

        checkTableIndex(colName, tableName, txId)
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

    function checkIfNeedIndex(colToIndex, tableName, tableKey, order, txId) {
        var deferred = jQuery.Deferred();
        var shouldIndex = false;
        var tempTables = [];

        getUnsortedTableName(tableName, null, txId)
        .then(function(unsorted) {
            if (unsorted !== tableName) {
                // this is sorted table, should index a unsorted one
                XIApi.checkOrder(unsorted, txId)
                .then(function(parentOrder, parentKey) {
                    if (parentKey !== colToIndex) {
                        if (tableKey != null && parentKey !== tableKey) {
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
                            XcalarIndexFromTable(unsorted, tableKey, indexTable,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        txId)
                            .then(function() {
                                if (tableKey === colToIndex) {
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
                            // when parent is indexed on tableKey,
                            // still but need another index on colName
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
                if (colToIndex !== tableKey) {
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

    function handleJoinKey(colToIndex, tableName, txId, isLeft) {
        // XXX this is only a temp fix for join key collision
        // XXX when backend handle it, this code should be removed
        var deferred = jQuery.Deferred();
        var suffix = isLeft ? "_left" : "_right";
        var tableId = xcHelper.getTableId(tableName);
        var tableCols = gTables[tableId].tableCols;

        var tableNamePart = xcHelper.getTableName(tableName);
        var colNums = [];
        var mapStrings = [];
        var newFieldNames = [];
        var newTableNames = [];
        var newTypes = [];
        var resizeHeaders = [];
        var tempTables = [];

        var promises = [];

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol() || progCol.isEmptyCol()) {
                continue;
            }

            var type = progCol.getType();
            if (type !== "string" && type !== "float" && type !== "integer" &&
                type !== "boolean")
            {
                // don't cast array or object
                continue;
            }

            if (type === "integer") {
                // integer also cast to float since we cannot tell
                type = "float";
            }
            var colName = progCol.getBackColName();
            colNums.push(i + 1);
            mapStrings.push(xcHelper.castStrHelper(colName, type));
            newFieldNames.push(colName + suffix);
            newTableNames.push(tableNamePart + Authentication.getHashId());
            newTypes.push(type);
            resizeHeaders.push(progCol.sizedTo === "header");

            if (colName === colToIndex) {
                // if colToIndex is pulled out, it's renamed
                // otherwise, not renamed
                colToIndex = colName + suffix;
            }
        }

        // this makes it easy to get previous table name
        newTableNames.push(tableName);

        for (var i = colNums.length - 1; i >= 0; i--) {
            promises.push(changeTypeHelper.bind(this, i));
        }

        PromiseHelper.chain(promises)
        .then(function(newTableName) {
            // when no column type change
            if (newTableName == null) {
                newTableName = tableName;
            }
            return checkTableIndex(colToIndex, newTableName, txId);
        })
        .then(function(indexedTable, shouldIndex, tempTablesInIndex) {
            tempTables = tempTables.concat(tempTablesInIndex);
            deferred.resolve(indexedTable, shouldIndex, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();

        function changeTypeHelper(index) {
            var innerDeferred = jQuery.Deferred();

            var curTableName = newTableNames[index + 1];
            var newTableName = newTableNames[index];
            var fieldName = xcHelper.stripColName(newFieldNames[index]);
            var mapString = mapStrings[index];
            var curColNum = colNums[index];
            var resize = resizeHeaders[index];

            XIApi.map(txId, mapString, curTableName, fieldName, newTableName)
            .then(function() {
                var mapOptions = {
                    "replaceColumn": true,
                    "type": newTypes[index],
                    "resize": resize
                };
                var curTableId = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;

                var newTablCols = xcHelper.mapColGenerate(curColNum, fieldName,
                                        mapString, curTableCols, mapOptions);
                tempTables.push(newTableName);
                TblManager.setOrphanTableMeta(newTableName, newTablCols);
                innerDeferred.resolve(newTableName);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }
    }

    // check if table has correct index
    function checkTableIndex(colName, tableName, txId, isApiCall) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        var tableCols = null;
        var table = null;
        var indexTable;

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
        } else if (Transaction.isSimulate(txId)) {
            indexTable = SQLApi.getIndexTable(tableName, colName);
            if (indexTable != null) {
                return PromiseHelper.resolve(indexTable, true, [], true);
            }
        } else {
            table = gTables[tableId];
            tableCols = table.tableCols;
            indexTable = table.getIndexTable(colName);
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
                    table.removeIndexTable(colName);
                }
            }
        }

        XIApi.checkOrder(tableName, txId)
        .then(function(order, keyName) {
            return checkIfNeedIndex(colName, tableName, keyName, order, txId);
        })
        .then(function(shouldIndex, unsortedTable, tempTables) {
            if (shouldIndex) {
                console.log(tableName, "not indexed correctly!");
                // XXX In the future,we can check if there are other tables that
                // are indexed on this key. But for now, we reindex a new table
                var newTableName = getNewTableName(tableName, ".index");
                XcalarIndexFromTable(unsortedTable, colName, newTableName,
                                     XcalarOrderingT.XcalarOrderingUnordered,
                                     txId)
                .then(function() {
                    if (!isApiCall) {
                        tempTables.push(newTableName);
                        TblManager.setOrphanTableMeta(newTableName, tableCols);
                    }
                    if (Transaction.isSimulate(txId)) {
                        SQLApi.cacheIndexTable(tableName, colName, newTableName);
                    } else if (table != null) {
                        table.setIndexTable(colName, newTableName);
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

    function concatGroupByCols(txId, tableName, groupByCols) {
        if (groupByCols.length === 1) {
            return PromiseHelper.resolve(groupByCols[0], tableName, []);
        }

        var deferred = jQuery.Deferred();

        var tableId = xcHelper.getTableId(tableName);
        var tableCols = null;

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
        } else {
            var table = gTables[tableId];
            tableCols = table.tableCols;
        }

        var mapStr;
        if (groupByCols.length === 0) {
            mapStr = "int(1)";
        } else {
            mapStr = xcHelper.getMultiJoinMapString(groupByCols);
        }
        var groupByField = xcHelper.randName("multiGroupBy");

        XIApi.map(txId, mapStr, tableName, groupByField)
        .then(function(tableAfterMap) {
            TblManager.setOrphanTableMeta(tableAfterMap, tableCols);
            deferred.resolve(groupByField, tableAfterMap, [tableAfterMap]);
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
        var groupByField;
        var tempTables = [];

        concatGroupByCols(txId, tableName, groupByCols)
        .then(function(resCol, resTable, resTempTables) {
            tempTables = resTempTables || [];
            groupByField = resCol;
            return checkTableIndex(resCol, resTable, txId);
        })
        .then(function(indexedTable, shouldIndex, temIndexTables) {
            tempTables = tempTables.concat(temIndexTables);
            deferred.resolve(indexedTable,groupByField, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getFinalGroupByCols(tableName, groupByCols, gbArgs,
                                 isIncSample, sampleCols, renamedGroupByCols) {
        var dataCol = ColManager.newDATACol();
        var tableId = xcHelper.getTableId(tableName);
        for (var i = 0; i < groupByCols.length; i++) {
            renamedGroupByCols.push(groupByCols[i]);
        }

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
            return [dataCol];
        }

        var table = gTables[tableId];
        var tableCols = table.tableCols;
        var newColNames = {};
        var newProgCols = [];
        var numNewCols = gbArgs.length;

        gbArgs.forEach(function(gbArg) {
            var name = gbArg.newColName;
            newColNames[name] = true;
            newProgCols.push(ColManager.newPullCol(name, name));
        });

        var numGroupByCols = groupByCols.length;
        var finalCols;

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

    function groupByJoinHelper(txId, indexedColName, unstrippedIndexedColName,
                                finalTableName, gbArgs,
                                args, isIncSample) {
        var deferred = jQuery.Deferred();
        if (gbArgs.length < 2) {
            return PromiseHelper.resolve(finalTableName);
        }

        var parsedIndexedColName = xcHelper.parsePrefixColName(
                                    indexedColName).name;
        // the 2nd, 3rd etc group by table doesn't use isIncSample
        // so we need the parsedColName

        var promises = [];
        var lCols = [indexedColName];
        var rCols = [parsedIndexedColName];
        finalTableName = args[0].tableName;
        if (isIncSample) {
            lCols = [unstrippedIndexedColName];
        }

        for (var i = 1; i < gbArgs.length; i++) {
            var lTableInfo = {
                "tableName": finalTableName,
                "columns": lCols
            };

            var newName = xcHelper.randName(parsedIndexedColName + "_GB", 3);
            var renameMap = xcHelper.getJoinRenameMap(parsedIndexedColName,
                                                  newName);

            var rTableInfo = {
                "tableName": args[i].tableName,
                "columns": rCols,
                "rename": [renameMap]
            };

            finalTableName = getNewTableName(finalTableName);
            var joinOptions = {
                newTableName: finalTableName
            };
            promises.push(XIApi.join.bind(null, txId,
            JoinOperatorT.InnerJoin, lTableInfo, rTableInfo, joinOptions));
        }

        // TODO: instead of a chain of joining to the previous table, we can do
        // A-B -> AB, C-D -> CD, then AB-CD -> ABCD
        PromiseHelper.chain(promises)
        .then(function() {
            deferred.resolve(finalTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // used after a multi-group by to split the concated column
    function extractColFromMap(srcTableName, groupbyTableName, groupByCols,
                               indexedColName, finalTableCols,
                               renamedGroupByCols, txId)
    {
        var deferred = jQuery.Deferred();

        var numGroupByCols = groupByCols.length;
        var srcTableId = xcHelper.getTableId(srcTableName);
        var groupByColTypes = [];

        if (srcTableId == null || !gTables.hasOwnProperty(srcTableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
            groupByColTypes = new Array(numGroupByCols);
        } else {
            var srcTable = gTables[srcTableId];
            for (var i = 0; i < numGroupByCols; i++) {
                var progCol = srcTable.getColByBackName(groupByCols[i]);
                if (progCol != null) {
                    groupByColTypes[i] = progCol.getType();
                } else {
                    console.error("Error Case!");
                    groupByColTypes[i] = null;
                }
            }
        }

        var mapStrStarter = "cut(" + indexedColName + ", ";
        var tableCols = extractColGetColHelper(finalTableCols, 0);

        TblManager.setOrphanTableMeta(groupbyTableName, tableCols);

        var promises = [];
        var currTableName = groupbyTableName;
        var tempTables = [];
        var mapStrs = [];
        var colNames = [];

        for (var i = 0; i < numGroupByCols; i++) {
            var mapStr = mapStrStarter + (i + 1) + ", " + '".Xc."' + ")";
            // convert type
            // XXX FIXME if need more other types
            if (groupByColTypes[i] === "integer") {
                mapStr = "int(" + mapStr + ")";
            } else if (groupByColTypes[i] === "float") {
                mapStr = "float(" + mapStr + ")";
            } else if (groupByColTypes[i] === "boolean") {
                mapStr = "bool(" + mapStr + ")";
            }

            tableCols = extractColGetColHelper(finalTableCols, i + 1);

            var parsedName = xcHelper.parsePrefixColName(renamedGroupByCols[i])
                                                                        .name;
            parsedName = xcHelper.stripColName(parsedName);

            mapStrs.push(mapStr);
            colNames.push(parsedName);

            if (i === 0) {
                var newTableName = getNewTableName(currTableName);
                tempTables.push(currTableName);
                currTableName = newTableName;
            }
        }
        var args = {
            "colNames": colNames,
            "mapStrings": mapStrs,
            "srcTableName": groupbyTableName,
            "newTableName": newTableName
        };

        var lastTableName = currTableName;

        extractColMapHelper(args, tableCols, txId)
        .then(function() {
            deferred.resolve(lastTableName, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function extractColGetColHelper(tableCols, index) {
        var newCols = xcHelper.deepCopy(tableCols);
        newCols.splice(index + 1, newCols.length - index - 2);
        // Note that after splice, newCols.length changes

        return newCols;
    }

    function extractColMapHelper(mapArgs, tableCols, txId) {
        var deferred = jQuery.Deferred();

        var colNames = mapArgs.colNames;
        var mapStrs = mapArgs.mapStrings;
        var srcTableName = mapArgs.srcTableName;
        var newTableName = mapArgs.newTableName;

        if (!mapStrs.length) {
            return PromiseHelper.resolve();
        }

        XcalarMap(colNames, mapStrs, srcTableName, newTableName, txId)
        .then(function() {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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

    return (XIApi);
}({}));
