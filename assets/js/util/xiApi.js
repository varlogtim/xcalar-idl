window.XIApi = (function(XIApi, $) {
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

    // dstAggName is optional and can be left blank (will autogenerate)
    // and new agg table will be deleted
    XIApi.aggregate = function(txId, aggOp, colName, tableName, dstAggName) {
        if (colName == null || tableName == null ||
            aggOp == null || txId == null)
        {
            return PromiseHelper.reject("Invalid args in aggregate");
        }
        var evalStr = generateAggregateString(colName, aggOp);
        return XIApi.aggregateWithEvalStr(txId, evalStr, tableName, dstAggName);
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
            var nameRoot = xcHelper.getTableName(tableName);
            dstAggName = xcHelper.randName(nameRoot + "-agg");
            toDelete = true;
        }

        XcalarAggregate(evalStr, dstAggName, tableName, txId)
        .then(function(value, dstDagName) {
            deleteHelper(dstDagName)
            .always(function() {
                var passed = false;
                var val;
                var err;
                try {
                    val = JSON.parse(value);
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

    XIApi.checkOrder = function(tableName) {
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
        // url, isRecur, maxSampleSize, skipRows, isRegex
        // formatArgs is as follows:
        // format("CSV", "JSON", "Excel", "raw"), if "CSV", then
        // fieldDelim, recordDelim, hasHeader, quoteChar,
        // moduleName, funcName
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

        return XcalarLoad(url, format, dsName, fieldDelim, recordDelim,
                          hasHeader, moduleName, funcName, isRecur,
                          maxSampleSize, quoteChar, skipRows, isRegex, txId);
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

    XIApi.sort = function(txId, order, colName, tableName, newTableName) {
        if (txId == null || order == null || colName == null ||
            tableName == null || !(order in XcalarOrderingTStr))
        {
            return PromiseHelper.reject("Invalid args in sort");
        }

        var deferred = jQuery.Deferred();
        // Check for case where table is already sorted
        XIApi.checkOrder(tableName)
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

    XIApi.map = function(txId, mapStr, tableName, newColName, newTableName,
                         icvMode) {
        if (txId == null || mapStr == null ||
            tableName == null || newColName == null)
        {
            return PromiseHelper.reject("Invalid args in map");
        }

        var deferred = jQuery.Deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        XcalarMap(newColName, mapStr, tableName, newTableName, txId, false,
                  icvMode)
        .then(function() {
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /*
        lTableInfo/rTableInfo: object with the following attrs:
            columns: array of back colum names to join
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
        var pulledLColNames = lTableInfo.pulledColumns;
        var lRename = lTableInfo.rename || [];

        var rTableName = rTableInfo.tableName;
        var rColNames = rTableInfo.columns;
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
        multiJoinCheck(lColNames, lTableName, rColNames, rTableName, txId)
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
     * options:
     *  isIncSample: true/false, include sample or not,
     *               not specified is equal to false
     *  sampleCols: array, sampleColumns to keep,
     *              only used when isIncSample is true
     *  icvMode: true/false, icv mode or not
     *  newTableName: string, dst table name, optional
     *  clean: true/false, if set true, will remove intermediate tables
     */
    XIApi.groupBy = function(txId, operator, groupByCols, aggColName,
                             tableName, newColName, options)
    {
        if (txId == null || operator == null || groupByCols == null ||
            aggColName == null || tableName == null ||
            newColName == null || aggColName.length < 1)
        {
            return PromiseHelper.reject("Invalid args in groupby");
        }

        options = options || {};
        var isIncSample = options.isIncSample || false;
        var sampleCols = options.sampleCols || [];
        var icvMode = options.icvMode || false;
        var newTableName = options.newTableName || null;
        var clean = options.clean || false;

        if (!(groupByCols instanceof Array)) {
            groupByCols = [groupByCols];
        }

        if (groupByCols.length < 1) {
            return PromiseHelper.reject("Invalid args in groupby");
        }

        var deferred = jQuery.Deferred();

        var tempTables = [];
        var indexedTable;
        var indexedColName;
        var finalTable;
        var isMultiGroupby = (groupByCols.length > 1);
        var finalCols = getFinalGroupByCols(tableName, groupByCols,
                                            newColName, isIncSample,
                                            sampleCols);

        getGroupbyIndexedTable(txId, tableName, groupByCols)
        .then(function(resTable, resCol, tempTablesInIndex) {
            // table name may have changed after sort!
            indexedTable = resTable;
            indexedColName = resCol;
            tempTables = tempTables.concat(tempTablesInIndex);

            // get name from src table
            if (newTableName == null) {
                newTableName = getNewTableName(tableName, "-GB");
            }
            return XcalarGroupBy(operator, newColName, aggColName,
                                indexedTable, newTableName,
                                isIncSample, icvMode, txId);
        })
        .then(function() {
            if (isMultiGroupby && !isIncSample) {
                // multi group by should extract column from groupby table
                return extractColFromMap(tableName, newTableName, groupByCols,
                                         indexedColName, finalCols,
                                         isIncSample, txId);
            } else {
                return PromiseHelper.resolve(newTableName, []);
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
            deferred.resolve(finalTable, finalCols);
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

    XIApi.getNumRows = function(tableName) {
        if (tableName === null) {
            return PromiseHelper.reject("Invalid args in getNumRows");
        }
        var tableId = xcHelper.getTableId(tableName);
        if (tableId && gTables[tableId] &&
            gTables[tableId].resultSetCount > -1) {
            return PromiseHelper.resolve(gTables[tableId].resultSetCount);
        }
        return XcalarGetTableCount(tableName);
    };

    XIApi.fetchData = function(tableName, startRowNum, rowsToFetch) {
        if (tableName === null || startRowNum === null ||
            rowsToFetch === null || rowsToFetch <= 0)
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
        if (colName === null) {
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

    function multiJoinCheck(lColNames, lTableName, rColNames, rTableName, txId) {
        var deferred = jQuery.Deferred();
        var len = lColNames.length;
        var tempTables = [];

        if (len === 1) {
            // single join
            deferred.resolve({
                "lTableName": lTableName,
                "lColName": lColNames[0],
                "rTableName": rTableName,
                "rColName": rColNames[0],
                "tempTables": tempTables
            });
        } else {
            // multi join
            // left cols
            var lTableId = xcHelper.getTableId(lTableName);
            var rTableId = xcHelper.getTableId(rTableName);
            var lCols = gTables[lTableId].tableCols;
            var rCols = gTables[rTableId].tableCols;

            var lNewName = getNewTableName(lTableName);
            var lColName = xcHelper.randName("leftJoinCol");
            var lString = xcHelper.getMultiJoinMapString(lColNames);

            // right cols
            var rNewName = getNewTableName(rTableName);

            var rString  = xcHelper.getMultiJoinMapString(rColNames);
            var rColName = xcHelper.randName("rightJoinCol");

            var deferred1 = XcalarMap(lColName, lString,
                                      lTableName, lNewName, txId);
            var deferred2 = XcalarMap(rColName, rString,
                                      rTableName, rNewName, txId);

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

    function checkIfNeedIndex(colToIndex, tableName, tableKey, txId) {
        var deferred = jQuery.Deferred();
        var shouldIndex = false;
        var tempTables = [];

        getUnsortedTableName(tableName)
        .then(function(unsorted) {
            if (unsorted !== tableName) {
                // this is sorted table, should index a unsorted one
                XIApi.checkOrder(unsorted)
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
                }

                deferred.resolve(shouldIndex, tableName, tempTables);
            }
        });

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
            resizeHeaders.push(progCol.sizedToHeader);

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
            var fieldName = xcHelper.stripeColName(newFieldNames[index]);
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
        var progCol;

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
        } else {
            var table = gTables[tableId];
            tableCols = table.tableCols;
            progCol = table.getColByBackName(colName);

            if (progCol != null && progCol.indexTable != null) {
                // XXX Note: here the assume is if index table has meta,
                // it should exists
                // more reliable might be use XcalarGetTables to check, but it's
                // async
                console.log("has cahced of index table", progCol.indexTable);
                var indexTableId = xcHelper.getTableId(progCol.indexTable);
                if (gTables.hasOwnProperty(indexTableId)) {
                    return PromiseHelper.resolve(progCol.indexTable, true, []);
                } else {
                    delete progCol.indexTable;
                }
            }
        }

        XIApi.checkOrder(tableName)
        .then(function(order, keyName) {
            return checkIfNeedIndex(colName, tableName, keyName, txId);
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
                    if (progCol != null) {
                        progCol.indexTable = newTableName;
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
        if (groupByCols.length <= 1) {
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

        var mapStr = xcHelper.getMultiJoinMapString(groupByCols);
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
        var i = 0;
        var j = 0;
        for (i = 0; i < rename.length; i++) {
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
                }
            }
        }
    }

    // For xiApi.join, deepy copy of right table and left table columns
    function createJoinedColumns(lTableId, rTableId, pulledLColNames,
                                pulledRColNames, lRename, rRename) {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var newTableCols = [];
        var lCols = [];
        var rCols = [];
        var index = 0;
        var colName;
        var dataCol = ColManager.newDATACol();
        var tempCols;
        var table;

        // XXX this function and the one with rTableId can
        // be combined into one
        if (lTableId != null && gTables[lTableId] != null &&
            gTables[lTableId].tableCols != null)
        {
            table = gTables[lTableId];
            lCols = xcHelper.deepCopy(table.tableCols);
            if (pulledLColNames) {
                tempCols = [];
                for (var i = 0; i < pulledLColNames.length; i++) {
                    var colNum = table.getColNumByBackName(pulledLColNames[i]) - 1;
                    if (lRename && lRename.length > 0) {
                        for (var j = 0; j<lRename.length; j++) {
                            if (lRename[j].orig === lCols[colNum].backName)
                            {
                                lCols[colNum].backName = lRename[j].new;
                                lCols[colNum].name = lRename[j].new;
                                if (lCols[colNum].sizedToHeader) {
                                    var widthOptions = {
                                        defaultHeaderStyle: true
                                    };
                                    cellWidth = xcHelper.getTextWidth(null,
                                                lRename[j].new,
                                                widthOptions);
                                    lCols[colNum].width = cellWidth;
                                }
                            }
                        }
                        replacePrefix(lCols[colNum], lRename);
                    }
                    tempCols.push(lCols[colNum]);
                }
                lCols = tempCols;
            }
        }

        if (rTableId != null && gTables[rTableId] != null &&
            gTables[rTableId].tableCols != null)
        {
            table = gTables[rTableId];
            rCols = xcHelper.deepCopy(table.tableCols);
            if (pulledRColNames) {
                tempCols = [];
                for (var i = 0; i < pulledRColNames.length; i++) {
                    var colNum = table.getColNumByBackName(pulledRColNames[i]) - 1;
                    if (rRename && rRename.length > 0) {
                        for (var j = 0; j<rRename.length; j++) {
                            if (rRename[j].orig === rCols[colNum].backName)
                            {
                                rCols[colNum].backName = rRename[j].new;
                                rCols[colNum].name = rRename[j].new;
                                if (rCols[colNum].sizedToHeader) {
                                    var widthOptions = {
                                        defaultHeaderStyle: true
                                    };
                                    cellWidth = xcHelper.getTextWidth(null,
                                                rRename[j].new,
                                                widthOptions);
                                    rCols[colNum].width = cellWidth;
                                }
                            }
                        }
                        replacePrefix(rCols[colNum], rRename);
                    }
                    tempCols.push(rCols[colNum]);
                }
                rCols = tempCols;
            }
        }

        for (var i = 0; i < lCols.length; i++) {
            colName = lCols[i].name;

            if (colName !== "DATA") {
                newTableCols[index] = lCols[i];
                ++index;
            }
        }

        for (var i = 0; i < rCols.length; i++) {
            colName = rCols[i].name;

            if (colName !== "DATA") {
                newTableCols[index] = rCols[i];
                ++index;
            }
        }

        // now newTablCols.length is differenet from len
        newTableCols.push(dataCol);
        return (newTableCols);
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

    function getFinalGroupByCols(tableName, groupByCols, newColName,
                                 isIncSample, sampleCols) {
        var dataCol = ColManager.newDATACol();
        var tableId = xcHelper.getTableId(tableName);

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
            return [dataCol];
        }

        var table = gTables[tableId];
        var tableCols = table.tableCols;

        // xx kinda crazy but the backend returns a lot of \ slashes
        // var escapedName = xcHelper.escapeColName(newColName.replace(/\./g, "\\."));
        var escapedName = newColName;
        // front name of a.b turns into a\.b in the backend and then
        // we need to escape the \ and . in a\.b to access it so it becomes a\\\.b
        var newProgCol = ColManager.newPullCol(newColName, escapedName);
        var numGroupByCols = groupByCols.length;
        var finalCols;

        if (isIncSample) {
            var newCols = [];
            var newProgColPosFound = false;
            for (var i = 0; i < sampleCols.length; i++) {
                var colNum = sampleCols[i];
                var backCol = tableCols[colNum].getBackColName();
                if (!newProgColPosFound) {
                    for (var j = 0; j < numGroupByCols; j++) {
                        if (backCol === groupByCols[j]) {
                            newCols.push(newProgCol);
                            newProgColPosFound = true;
                            break;
                        }
                    }
                }

                newCols.push(tableCols[colNum]);
            }

            if (!newProgColPosFound) {
                newCols.unshift(newProgCol);
            }
            // Note that if include sample,
            // a.b should not be escaped to a\.b
            var dataColNum = gTables[tableId].getColNumByBackName("DATA") - 1;
            newCols.push(tableCols[dataColNum]);
            finalCols = xcHelper.deepCopy(newCols);
        } else {
            finalCols = [newProgCol];
            // Pull out each individual groupByCols
            for (var i = 0; i < numGroupByCols; i++) {
                var backColName = groupByCols[i];
                var progCol = table.getColByBackName(backColName) || {};
                // even though backColName may be escaped, the returned column
                // from the backend will be escaped again

                // both "a\.b" and "a.b" will become "a\.b" after groupby
                // escapedName = xcHelper.unescapeColName(backColName);
                escapedName = xcHelper.escapeColName(backColName);
                // backend returns escaped dots so we must escape again
                escapedName = xcHelper.escapeColName(escapedName);

                // with no sample, group col is immediates
                escapedName = xcHelper.parsePrefixColName(escapedName).name;
                var colName = progCol.name || backColName;

                finalCols[1 + i] = ColManager.newCol({
                    "backName": escapedName,
                    "name": progCol.name || colName,
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

            finalCols[1 + numGroupByCols] = dataCol;
        }

        return finalCols;
    }

    function extractColFromMap(srcTableName, groupbyTableName, groupByCols,
                               indexedColName, finalTableCols,
                               isIncSample, txId)
    {
        var deferred = jQuery.Deferred();

        var numGroupByCols = groupByCols.length;
        var scrTableId = xcHelper.getTableId(srcTableName);
        var groupByColTypes = [];

        if (scrTableId == null || !gTables.hasOwnProperty(scrTableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
            groupByColTypes = new Array(numGroupByCols);
        } else {
            var srcTable = gTables[scrTableId];
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

        // XXX Jerene: Okay this is really dumb, but we have to keep mapping
        var mapStrStarter = "cut(" + indexedColName + ", ";
        var tableCols = extractColGetColHelper(finalTableCols, 0, isIncSample);

        TblManager.setOrphanTableMeta(groupbyTableName, tableCols);

        var promises = [];
        var currTableName = groupbyTableName;
        var tempTables = [];

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

            var newTableName = getNewTableName(currTableName);
            var isLastTable = (i === groupByCols.length - 1);
            tableCols = extractColGetColHelper(finalTableCols, i + 1, isIncSample);

            var parsedName = xcHelper.parsePrefixColName(groupByCols[i]).name;
            var args = {
                "colName": parsedName,
                "mapString": mapStr,
                "srcTableName": currTableName,
                "newTableName": newTableName
            };

            promises.push(extracColMapHelper.bind(this, args, tableCols,
                                                  isLastTable, txId));
            tempTables.push(currTableName);
            currTableName = newTableName;
        }
        var lastTableName = currTableName;
        PromiseHelper.chain(promises)
        .then(function() {
            deferred.resolve(lastTableName, tempTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function extractColGetColHelper(tableCols, index, isIncSample) {
        var newCols = xcHelper.deepCopy(tableCols);
        if (isIncSample) {
            return newCols;
        }

        newCols.splice(index + 1, newCols.length - index - 2);
        // Note that after splice, newCols.length changes

        return newCols;
    }

    function extracColMapHelper(mapArgs, tableCols, isLastTable, txId) {
        var deferred = jQuery.Deferred();

        var colName = mapArgs.colName;
        var mapStr = mapArgs.mapString;
        var srcTableName = mapArgs.srcTableName;
        var newTableName = mapArgs.newTableName;

        XcalarMap(colName, mapStr, srcTableName, newTableName, txId)
        .then(function() {
            if (!isLastTable) {
                // the last table will set meta data in xcFunctions.groupBy
                TblManager.setOrphanTableMeta(newTableName, tableCols);
            }

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function isValidTableName(tableName) {
        var isValid = isCorrectTableNameFormat(tableName);

        if (!isValid) {
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
}({}, jQuery));
