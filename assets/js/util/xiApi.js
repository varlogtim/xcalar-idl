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
    XIApi.aggregateWithEvalStr = function(txId, evalStr, tableName, dstAggName) {
        if (evalStr == null || tableName == null || txId == null) {
            return PromiseHelper.reject("Invalid args in aggregate");
        }

        var deferred = jQuery.Deferred();
        var toDelete = false;

        if (!isValidTableName(dstAggName)) {
            var nameRoot = xcHelper.getTableName(tableName);
            dstAggName = xcHelper.randName(nameRoot + "-agg");
            toDelete = true;
        }

        XcalarAggregate(evalStr, dstAggName, tableName, txId)
        .then(function(value, dstDagName) {
            deleteHelper(dstDagName)
            .always(function() {
                try {
                    var val = JSON.parse(value);
                    deferred.resolve(val.Value, dstAggName, toDelete);
                } catch (error) {
                    deferred.reject({"error": error});
                }
            });
        })
        .fail(deferred.reject);

        return deferred.promise();

        function deleteHelper(tableToDelete) {
            if (toDelete) {
                return XcalarDeleteTable(tableToDelete, txId);
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
        })
        .then(function() {
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

        XcalarIndexFromDataset(dsName, "recordNum", newTableName, prefix,
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

    XIApi.join = function(txId, joinType, lColNames, lTableName, rColNames,
                          rTableName, newTableName, pulledLColNames,
                          pulledRColNames, lRename, rRename) {
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

        var checkJoinKey = gEnableJoinKeyCheck;
        var deferred = jQuery.Deferred();
        var lTable_index;
        var rTable_index;
        // Step 1: check if it's a multi Join.
        // If yes, should do a map to concat all columns
        multiJoinCheck(lColNames, lTableName, rColNames, rTableName, txId)
        .then(function(res) {
            var deferred1;
            var deferred2;

            if (checkJoinKey) {
                // when it's self join or globally enabled
                deferred1 = handleJoinKey(res.lColName, res.lTableName, txId, true);
                deferred2 = handleJoinKey(res.rColName, res.rTableName, txId, false);
            } else {
                deferred1 = checkTableIndex(res.lColName, res.lTableName, txId);
                deferred2 = checkTableIndex(res.rColName, res.rTableName, txId);
            }

            // Step 2: index the left table and right table
            return PromiseHelper.when(deferred1, deferred2);
        })
        .then(function(lInexedTable, rIndexedTable) {
            lTable_index = lInexedTable;
            rTable_index = rIndexedTable;
            if (!isValidTableName(newTableName)) {
                newTableName = getNewTableName(lTableName.substring(0, 5) + "-"+
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
            var joinedCols = createJoinedColumns(lTableId, rTableId,
                                                 pulledLColNames,
                                                 pulledRColNames,
                                                 lRename,
                                                 rRename);

            deferred.resolve(newTableName, joinedCols);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    XIApi.groupBy = function(txId, operator, groupByCols, aggColName,
                            isIncSample, tableName,
                            newColName, newTableName, icvMode)
    {
        if (txId == null || operator == null || groupByCols == null ||
            aggColName == null || isIncSample == null || tableName == null ||
            newColName == null || aggColName.length < 1)
        {
            return PromiseHelper.reject("Invalid args in groupby");
        }

        if (!(groupByCols instanceof Array)) {
            groupByCols = [groupByCols];
        }

        if (groupByCols.length < 1) {
            return PromiseHelper.reject("Invalid args in groupby");
        }

        var deferred = jQuery.Deferred();

        var indexedColName;
        var isMultiGroupby = (groupByCols.length > 1);
        var finalCols = getFinalGroupByCols(tableName, groupByCols,
                                                 newColName, isIncSample);

        getGroupbyIndexedTable()
        .then(function(resTable, resCol) {
            // table name may have changed after sort!
            var indexedTable = resTable;
            indexedColName = resCol;

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
                return PromiseHelper.resolve(newTableName);
            }
        })
        .then(function(finalTableName) {
            deferred.resolve(finalTableName, finalCols);
        })
        .fail(deferred.reject);

        return deferred.promise();

        function getGroupbyIndexedTable() {
            var innerDeferred = jQuery.Deferred();

            if (isMultiGroupby) {
                // multiGroupBy should first do a map and then index
                checkMultiGroupByIndex(groupByCols, tableName, txId)
                .then(innerDeferred.resolve)
                .fail(innerDeferred.reject);
            } else {
                // single groupBy, check index
                checkTableIndex(groupByCols[0], tableName, txId)
                .then(function(resTable) {
                    innerDeferred.resolve(resTable, groupByCols[0]);
                })
                .fail(innerDeferred.reject);
            }

            return innerDeferred.promise();
        }
    };

    XIApi.query = function(txId, queryName, queryStr) {
        if (txId == null || queryName == null || queryStr == null) {
            return PromiseHelper.reject("Invalid args in query");
        }
        return XcalarQueryWithCheck(queryName, queryStr, txId);
    };

    XIApi.getRowNum = function(txId, tableName, newColName, newTableName) {
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

            for (var i = 0, len = data.length; i < len; i++) {
                try {
                    var row = JSON.parse(data[i]);
                    result.push(row[colName]);
                } catch (error) {
                    console.error(error, data[i]);
                    deferred.reject(error);
                    return;
                }
            }

            deferred.resolve(result);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    function multiJoinCheck(lColNames, lTableName, rColNames, rTableName, txId) {
        var deferred = jQuery.Deferred();
        var len = lColNames.length;

        if (len === 1) {
            // single join
            deferred.resolve({
                "lTableName": lTableName,
                "lColName"  : lColNames[0],
                "rTableName": rTableName,
                "rColName"  : rColNames[0]
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

                deferred.resolve({
                    "lTableName": lNewName,
                    "lColName"  : lColName,
                    "rTableName": rNewName,
                    "rColName"  : rColName
                });
            })
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    function checkIfNeedIndex(colToIndex, tableName, tableKey, txId) {
        var deferred = jQuery.Deferred();
        var shouldIndex = false;

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
                            var indexTable = getNewTableName(tableName, ".indexParent", true);
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

                                deferred.resolve(shouldIndex, indexTable);
                            })
                            .fail(deferred.reject);
                        } else {
                            // when parent is indexed on tableKey,
                            // still but need another index on colName
                            shouldIndex = true;
                            deferred.resolve(shouldIndex, unsorted);
                        }
                    } else {
                        // because FAJS will automatically find parent table
                        // so if parent table is already index on colName
                        // no need to do another index
                        shouldIndex = false;
                        deferred.resolve(shouldIndex, unsorted);
                    }
                })
                .fail(deferred.reject);
            } else {
                // this is the unsorted table
                if (colToIndex !== tableKey) {
                    shouldIndex = true;
                }

                deferred.resolve(shouldIndex, tableName);
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
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();

        function changeTypeHelper(index) {
            var innerDeferred = jQuery.Deferred();

            var curTableName = newTableNames[index + 1];
            var newTableName = newTableNames[index];
            var fieldName = newFieldNames[index];
            var mapString = mapStrings[index];
            var curColNum = colNums[index];
            var resize = resizeHeaders[index];

            XIApi.map(txId, mapString, curTableName, fieldName, newTableName)
            .then(function() {
                var mapOptions = {
                    "replaceColumn": true,
                    "type"         : newTypes[index],
                    "resize"       : resize
                };
                var curTableId = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;

                var newTablCols = xcHelper.mapColGenerate(curColNum, fieldName,
                                        mapString, curTableCols, mapOptions);

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

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
        } else {
            var table = gTables[tableId];
            tableCols = table.tableCols;
        }

        XIApi.checkOrder(tableName)
        .then(function(order, keyName) {
            return checkIfNeedIndex(colName, tableName, keyName, txId);
        })
        .then(function(shouldIndex, unsortedTable) {
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
                        TblManager.setOrphanTableMeta(newTableName, tableCols);
                    }
                    deferred.resolve(newTableName, shouldIndex);
                })
                .fail(function(error) {
                    if (error.code === StatusT.StatusAlreadyIndexed) {
                        deferred.resolve(unsortedTable, false);
                    } else {
                        deferred.reject(error);
                    }
                });
            } else {
                console.log(tableName, "indexed correctly!");
                deferred.resolve(unsortedTable, shouldIndex);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function checkMultiGroupByIndex(groupByCols, tableName, txId) {
        var deferred = jQuery.Deferred();

        // From Jerene:
        // 1. merge multi columns into one using concat xdf
        // 2. sort this merged column
        var tableId = xcHelper.getTableId(tableName);
        var tableCols = null;

        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // in case we have no meta of the table
            console.warn("cannot find the table");
        } else {
            var table = gTables[tableId];
            tableCols = table.tableCols;
        }

        var mapTableName = getNewTableName(tableName);
        var indexedTableName;

        var mapStr = xcHelper.getMultiJoinMapString(groupByCols);
        var groupByField = xcHelper.randName("multiGroupBy");

        XcalarMap(groupByField, mapStr, tableName, mapTableName, txId)
        .then(function() {
            // add mapped table meta
            TblManager.setOrphanTableMeta(mapTableName, tableCols);

            // index the mapped table
            indexedTableName = getNewTableName(mapTableName);
            return XcalarIndexFromTable(mapTableName, groupByField,
                                        indexedTableName,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        txId);
        })
        .then(function() {
            // add indexed table meta
            TblManager.setOrphanTableMeta(indexedTableName, tableCols);
            deferred.resolve(indexedTableName, groupByField);
        })
        .fail(deferred.reject);

        return deferred.promise();
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

        if (lTableId != null && gTables[lTableId] != null &&
            gTables[lTableId].tableCols != null)
        {
            var table = gTables[lTableId];
            lCols = xcHelper.deepCopy(table.tableCols);
            if (pulledLColNames) {
                var tempCols = [];
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
                                    cellWidth = getTextWidth(null,
                                                lRename[j].new,
                                                widthOptions);
                                    lCols[colNum].width = cellWidth;
                                }
                            }
                        }
                    }
                    tempCols.push(lCols[colNum]);
                }
                lCols = tempCols;
            }
        }

        if (rTableId != null && gTables[rTableId] != null &&
            gTables[rTableId].tableCols != null)
        {
            // rCols = xcHelper.deepCopy(gTables[rTableId].tableCols);
            var table = gTables[rTableId];
            rCols = xcHelper.deepCopy(table.tableCols);
            if (pulledRColNames) {
                var tempCols = [];
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
                                    cellWidth = getTextWidth(null,
                                                rRename[j].new,
                                                widthOptions);
                                    rCols[colNum].width = cellWidth;
                                }
                            }
                        }
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

    function getFinalGroupByCols(tableName, groupByCols, newColName, isIncSample) {
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
            var newColIndex = 1;
            // getIndexOfFirstGroupByCol
            for (var i = 0; i < tableCols.length; i++) {
                // Skip DATA and new column
                if (tableCols[i].isDATACol() || tableCols[i].isEmptyCol()) {
                    continue;
                }

                var backCol = tableCols[i].getBackColName();
                for (var j = 0; j < numGroupByCols; j++) {
                    if (backCol === groupByCols[j])
                    {
                        newColIndex = i + 1;
                        break;
                    }
                }
            }
            // Note that if include sample,
            // a.b should not be escaped to a\.b
            finalCols = xcHelper.deepCopy(tableCols);
            finalCols.splice(newColIndex - 1, 0, newProgCol);
        } else {
            finalCols = [newProgCol];
            // Pull out each individual groupByCols
            for (var i = 0; i < numGroupByCols; i++) {
                var backColName = groupByCols[i];
                var progCol = table.getColByBackName(backColName) || {};
                // even though backColName may be escaped, the returned column
                // from the backend will be escaped again

                // both "a\.b" and "a.b" will become "a\.b" after groupby
                escapedName = xcHelper.unescapeColName(backColName);
                escapedName = xcHelper.escapeColName(escapedName);
                // with no sample, group col is immediates
                escapedName = xcHelper.parsePrefixColName(escapedName).name;
                var colName = progCol.name || backColName;

                finalCols[1 + i] = ColManager.newCol({
                    "backName": escapedName,
                    "name"    : progCol.name || colName,
                    "type"    : progCol.type || null,
                    "width"   : progCol.width || gNewCellWidth,
                    "isNewCol": false,
                    "userStr" : '"' + colName + '" = pull(' + escapedName + ')',
                    "func"    : {
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
                               indexedColName, finalTableCols, isIncSample, txId)
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
                "colName"     : parsedName,
                "mapString"   : mapStr,
                "srcTableName": currTableName,
                "newTableName": newTableName
            };

            promises.push(extracColMapHelper.bind(this, args, tableCols,
                                                  isLastTable, txId));
            currTableName = newTableName;
        }

        var lastTableName = currTableName;
        PromiseHelper.chain(promises)
        .then(function() {
            deferred.resolve(lastTableName);
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
        var regex = "^.*#[a-zA-Z0-9]{2}[0-9]+$";
        var regexp = new RegExp(regex);
        var isValid = (tableName != null) && (tableName !== "") &&
                      (regexp.test(tableName));
        return isValid;
    }

    function isValidPrefix(prefix) {
        var regex = "^[a-zA-Z0-9]{1,255}$";
        var regexp = new RegExp(regex);
        var isValid = (prefix != null) && (prefix !== "") &&
                      (regexp.test(prefix));
        return isValid;
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
        // Strip all random characters from dsName
        var prefix = dsName.replace(/[^0-9a-z]/gi, '');
        if (prefix.length > 255) {
            prefix = prefix.substr(0, 255);
        }
        return prefix;
    }

    return (XIApi);
}({}, jQuery));
