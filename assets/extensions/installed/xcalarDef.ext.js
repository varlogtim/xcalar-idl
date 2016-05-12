window.UExtXcalarDef = (function(UExtXcalarDef, $) {
    UExtXcalarDef.buttons = [{
        "buttonText"   : "Horizontal Partition",
        "fnName"       : "hPartition",
        "arrayOfFields": [{
            "type"      : "number",
            "name"      : "No. of Partitions",
            "fieldClass": "partitionNums",
            "typeCheck" : {
                "integer": true,
                "min"    : 1,
                "max"    : 10
            }
        }]
    },
    {
        "buttonText"   : "Windowing",
        "fnName"       : "windowChain",
        "arrayOfFields": [{
            "type"      : "column",
            "name"      : "Window On",
            "fieldClass": "winCol",
            "autofill"  : true,
            "typeCheck" : {
                "columnType": ["number"]
            }
        },
        {
            "type"      : "column",
            "name"      : "Sort On",
            "fieldClass": "sortCol",
            "typeCheck" : {
                "columnType": ["string", "number"]
            }
        },
        {
            "type"      : "string",
            "name"      : "Sort Order",
            "autofill"  : "ascending",
            "fieldClass": "order"
        },
        {
            "type"      : "number",
            "name"      : "Lag",
            "fieldClass": "lag",
            "typeCheck" : {
                "integer": true,
                "min"    : 0
            }
        },
        {
            "type"      : "number",
            "name"      : "Lead",
            "fieldClass": "lead",
            "typeCheck" : {
                "integer": true,
                "min"    : 0
            }
        }]
    }];

    UExtXcalarDef.undoActionFn = undefined;
    UExtXcalarDef.actionFn = function(txId, colNum, tableId, functionName, argList) {
        switch (functionName) {
            case ("hPartition"):
                return horizontalPartition(txId,colNum, tableId, argList["partitionNums"]);
            case ("windowChain"):
                return windowChain(txId, colNum, tableId,
                                    argList.winCol, argList.sortCol, argList.order,
                                    argList.lag, argList.lead);
            default:
                return PromiseHelper.reject("Invalid Function");
        }

        // Horizontal Partition
        function horizontalPartition(txId, colNum, tableId, partitionNums) {
            var deferred    = jQuery.Deferred();
            var worksheet   = WSManager.getWSFromTable(tableId);
            var table       = gTables[tableId];
            var tableName   = table.tableName;
            var tableCols   = table.tableCols;
            var colType     = tableCols[colNum - 1].type;
            var colName     = tableCols[colNum - 1].name;
            var backColName = tableCols[colNum - 1].getBackColName();
            var newTables = [];

            if (colType !== "integer" && colType !== "float" &&
                colType !== "string" && colType !== "boolean") {
                console.error("Invalid col type!");
                deferred.reject("Invalid col type!");
                return (deferred.promise());
            }

            var tableNamePart = tableName.split("#")[0];

            getUniqueValues(partitionNums)
            .then(function(uniqueVals) {
                var len = uniqueVals.length;
                var promises = [];

                for (var i = 0; i < len; i++) {
                    promises.push(hPartitionHelper.bind(this, uniqueVals[i],
                                                        i, colType));
                }

                return PromiseHelper.chain(promises);
            })
            .then(function() {
                deferred.resolve(newTables);
            })
            .fail(deferred.reject);

            return deferred.promise();

            function hPartitionHelper(fltVal, index, type) {
                var innerDeferred = jQuery.Deferred();

                var srcTable = tableName;
                var filterTable = tableNamePart + "-HP" + (index + 1) +
                                    Authentication.getHashId();
                var filterTableId = xcHelper.getTableId(filterTable);
                var fltStr;

                newTables[index] = filterTable;

                switch (type) {
                    case "string":
                        fltStr = "eq(" + backColName + ", \"" + fltVal + "\")";
                        break;
                    default:
                        // integer, float and boolean
                        fltStr = "eq(" + backColName + ", " + fltVal + ")";
                        break;
                }

                XIApi.filter(txId, fltStr, srcTable, filterTable)
                .then(function() {
                    var filterCols = xcHelper.deepCopy(tableCols);
                    return TblManager.refreshTable([filterTable], filterCols,
                                                    [], worksheet);
                })
                .then(function() {
                    innerDeferred.resolve(filterTableId);
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }

            function getUniqueValues(rowsToFetch) {
                var innerDeferred = jQuery.Deferred();
                var keyCol = backColName;
                var srcTable = tableName;

                // Step 1. Do groupby count($keyCol), GROUP BY ($keyCol)
                // aka, index on keyCol and then groupby count
                // this way we get the unique value of src table
                var isIncSample = false;
                var groupByCol = xcHelper.randName("randCol");
                var groupbyTable = ".tempGB." + tableNamePart +
                                    Authentication.getHashId();

                XIApi.groupBy(txId, AggrOp.Count, keyCol, keyCol,
                                isIncSample, srcTable,
                                groupByCol, groupbyTable)
                .then(function(tableAfterGroupby) {
                    // Step 2. Sort on desc on groupby table by groupByCol
                    // this way, the keyCol that has most count comes first
                    var sortTable = ".tempGB-Sort." + tableNamePart +
                                    Authentication.getHashId();
                    return XIApi.sortDescending(txId, groupByCol,
                                                tableAfterGroupby, sortTable);
                })
                .then(function(tableAfterSort) {
                    // Step 3, fetch data
                    return XIApi.fetchColumnData(keyCol, tableAfterSort, 1, rowsToFetch);
                })
                .then(function(result) {
                    innerDeferred.resolve(result);
                    // XXXX Should delete the interim table when delete is enabled
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }
        }

        function windowChain(txId, colNum, tableId, winCol, sortCol, direction, lag, lead) {
            if (lag === 0 && lead === 0) {
                return PromiseHelper.reject(ErrTStr.NoAllZeros);
            }

            if (direction.startsWith("desc")) {
                direction = XcalarOrderingT.XcalarOrderingDescending;
            } else if (direction.startsWith("asc")) {
                direction = XcalarOrderingT.XcalarOrderingAscending;
            } else {
                return PromiseHelper.reject("Sort Order Field can only be ascending or descending");
            }

            var deferred = jQuery.Deferred();
            // XXX: Fill in all the SQL stuff
            var worksheet = WSManager.getWSFromTable(tableId);

            var table = gTables[tableId];
            var tableCols = table.tableCols;
            var colName = winCol;
            var tableName = table.tableName;
            var tableNameRoot = tableName.split("#")[0];
            var finalTableName;

            var randNumber = Math.floor(Math.random() * 100);

            // constant to mark it's a lag table, lead table, or current table
            var WinState = {
                "lag" : "lag",
                "lead": "lead",
                "cur" : "cur"
            };

            // cache tableNames for lag, lead and cur table
            var tableNames = {
                "lag" : [],
                "lead": [],
                "cur" : ""
            };

            // cache renamed col of the colName in lag, lead and cur table
            var winColNames = {
                "lag" : [],
                "lead": [],
                "cur" : ""
            };

            // cache names of genUniq col in lag, lead and cur table
            var genUniqColNames = {
                "lag" : [],
                "lead": [],
                "cur" : ""
            };

            var type = "string"; // default
            var newOrigSortedOnCol;

            // Step 1: sort table
            sortTable(tableName, sortCol)
            .then(function(tableAfterSort) {
                // Step 2. Figure out column type info from orig table.
                // We need it in step 4.
                return getSortColType(tableAfterSort);
            })
            .then(function(tableAfterSort, sortColType) {
                type = sortColType;
                // Step 3 Get Unique Column, on SORTED table.
                return genRowNum(tableAfterSort);
            })
            .then(function(tableWithUniqOrig, uniqColName) {
                // Step 4 Generate the columns for lag and lead. We need to
                // duplicate current table to have a unique column name if not 
                // later we will suffer when we self join
                var defArray = [];
                var i;
                for (i = 0; i < lag; i++) {
                    defArray.push(ladLeadMap(WinState.lag, i,
                                             tableWithUniqOrig, uniqColName));
                }

                for (i = 0; i < lead; i++) {
                    defArray.push(ladLeadMap(WinState.lead, i,
                                             tableWithUniqOrig, uniqColName));
                }

                defArray.push(ladLeadMap(WinState.cur, -1,
                                         tableWithUniqOrig, uniqColName));
                return PromiseHelper.when.apply(window, defArray);
            })
            .then(function() {
                // Step 5 Create unique col names for each of the tables
                // This is so that we don't suffer when we self join
                var defArray = [];
                var i;
                for (i = 0; i < lag; i++) {
                    defArray.push(winColRename(WinState.lag, i, colName));
                }
                for (i = 0; i < lead; i++) {
                    defArray.push(winColRename(WinState.lead, i, colName));
                }

                defArray.push(winColRename(WinState.cur, -1, colName));
                return PromiseHelper.when.apply(window, defArray);
            })
            .then(function() {
                // Step 6 Need to recast the original sorted by column in cur
                // table to avoid name collisions
                newOrigSortedOnCol = "orig_" + sortCol + "_" +
                                     randNumber;

                var mapStr = type + "(" + sortCol + ")";
                return reCastCurTable(newOrigSortedOnCol, mapStr);
            })
            .then(function() {
                // Step 7 inner join funnesss!
                // Order: Take cur, join lags then join leads
                var defChain = [];
                var lTable = tableNames.cur;
                var lCol = genUniqColNames.cur;
                var newTableName;
                var i;
                for (i = 0; i < lag; i++) {
                    newTableName = tableNameRoot + "_PromiseHelper.chain_" +
                                    Authentication.getHashId();
                    rTable = tableNames.lag[i];
                    finalTableName = newTableName;
                    defChain.push(winJoin.bind(this, lCol, lTable,
                                                newTableName, i, WinState.lag));
                    lTable = newTableName;
                }

                for (i = 0; i < lead; i++) {
                    newTableName = tableNameRoot + "_PromiseHelper.chain_" +
                                    Authentication.getHashId();
                    rTable = tableNames.lead[i];
                    finalTableName = newTableName;
                    defChain.push(winJoin.bind(this, lCol, lTable,
                                                newTableName, i, WinState.lead));
                    lTable = newTableName;
                }

                return PromiseHelper.chain(defChain);
            })
            .then(function() {
                // Step 8 Sort ascending or descending by the cur order number
                var oldTableName = finalTableName;
                var indexCol = newOrigSortedOnCol;
                return XIApi.sort(txId, direction, indexCol, oldTableName);
            })
            .then(function(tableAfterSort) {
                finalTableName = tableAfterSort;
                // Step 9 YAY WE ARE FINALLY DONE! Just start picking out all
                // the columns now and do the sort and celebrate
                var colNames = [];
                var finalCols = [];
                // Don't pull cur. Instead pull the original sorted col which
                // cur was generated on.
                colNames.push(newOrigSortedOnCol);

                for (var i = lag - 1; i >= 0; i--) {
                    colNames.push(winColNames.lag[i]);
                }

                colNames.push(winColNames.cur);

                for (var i = 0; i < lead; i++) {
                    colNames.push(winColNames.lead[i]);
                }

                var colLen = colNames.length;
                for (var i = 0; i < colLen; i++) {
                    var colType;

                    if (colNames[i] !== newOrigSortedOnCol) {
                        colType = "float";
                    } else {
                        switch (type) {
                            case ("int"):
                                colType = "integer";
                                break;
                            case ("bool"):
                                colType = "boolean";
                                break;
                            default:
                                colType = type;
                        }
                    }

                    finalCols[i] = ColManager.newCol({
                        "name"    : colNames[i],
                        "type"    : colType,
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + colNames[i] + '" = pull(' +
                                    colNames[i] + ')',
                        "func"    : {
                            "func": "pull",
                            "args": [colNames[i]]
                        }
                    });
                }

                finalCols.push(ColManager.newDATACol());

                return TblManager.refreshTable([finalTableName], finalCols,
                                                [], worksheet);
            })
            .then(function() {
                deferred.resolve(finalTableName);
            })
            .fail(deferred.reject);

            return deferred.promise();

            function sortTable(srcTable, colToSort) {
                var innerDeferred = jQuery.Deferred();

                XIApi.sort(txId, direction, colToSort, srcTable)
                .then(innerDeferred.resolve)
                .fail(function(error) {
                    if ((error instanceof Object) &&
                        error.error === SortStatus.Sorted) {
                        console.log("already sorted on ", srcTable);
                        innerDeferred.resolve(srcTable);
                    } else {
                        innerDeferred.reject(error);
                    }
                });

                return innerDeferred.promise();
            }

            function getSortColType(srcTable) {
                var innerDeferred = jQuery.Deferred();
                var sortColType = "string"; // default

                XcalarMakeResultSetFromTable(srcTable)
                .then(function(ret) {
                    sortColType = DfFieldTypeTStr[ret.keyAttrHeader.type];
                    switch (sortColType) {
                        case ("DfString"):
                            sortColType = "string";
                            break;
                        case ("DfInt32"):
                        case ("DfInt64"):
                        case ("DfUInt32"):
                        case ("DfUInt64"):
                            sortColType = "int";
                            break;
                        case ("DfFloat32"):
                        case ("DfFloat64"):
                            sortColType = "float";
                            break;
                        case ("DfBoolean"):
                            sortColType = "bool";
                            break;
                        default:
                            sortColType = "string";
                            break;
                    }
                    return XcalarSetFree(ret.resultSetId);
                })
                .then(function() {
                    innerDeferred.resolve(srcTable, sortColType);
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }

            function genRowNum(srcTable) {
                var innerDeferred = jQuery.Deferred();

                var newTableName = tableNameRoot + Authentication.getHashId();
                var newColName = "orig_order_" + randNumber;

                XcalarGenRowNum(srcTable, newTableName, newColName, txId)
                .then(function() {
                    TblManager.setOrphanTableMeta(newTableName, tableCols);
                    innerDeferred.resolve(newTableName, newColName);
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }

            function ladLeadMap(state, index, srcTable, uniqColName) {
                var innerDeferred = jQuery.Deferred();
                var newTableName;
                var newColName;
                var mapStr;
                var suffix = (index + 1);

                if (state === WinState.lag) {
                    // lagMapString
                    mapStr = "add(" + uniqColName + ", " + suffix + ")";
                    newTableName = tableNameRoot + "_" + randNumber + "_lag_" +
                                    suffix + Authentication.getHashId();
                    newColName = "lag_" + suffix + "_" + randNumber;

                } else if (state === WinState.lead) {
                    // leadMapString
                    mapStr = "sub(" + uniqColName + ", " + suffix + ")";
                    newTableName = tableNameRoot + "_" + randNumber + "_lead_" +
                                    suffix + Authentication.getHashId();
                    newColName = "lead_" + suffix + "_" + randNumber;
                } else if (state === WinState.cur) {
                    // curMapString
                    mapStr = "float(" + uniqColName + ")";
                    newTableName = tableNameRoot + "_" + randNumber + "_cur" +
                                   Authentication.getHashId();
                    newColName = "cur_" + randNumber;
                } else {
                    throw "Error Case!";
                }

                // cache tableName and colName for later user
                if (state === WinState.cur) {
                    tableNames.cur = newTableName;
                    genUniqColNames.cur = newColName;
                } else {
                    tableNames[state][index] = newTableName;
                    genUniqColNames[state][index] = newColName;
                }

                XcalarMap(newColName, mapStr, srcTable, newTableName, txId)
                .then(function() {
                    TblManager.setOrphanTableMeta(newTableName, tableCols);
                    innerDeferred.resolve();
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }

            function winColRename(state, index, winCol) {
                var innerDeferred = jQuery.Deferred();
                var newColName;

                var srcTable;
                var mapStr = "float(" + winCol + ")";
                var suffix = (index + 1);

                if (state === WinState.lag) {
                    // lag
                    srcTable = tableNames.lag[index];
                    newColName = "lag_" + suffix + "_" + colName;
                } else if (state === WinState.lead) {
                    // lead
                    srcTable = tableNames.lead[index];
                    newColName = "lead_" + suffix + "_" + colName;
                } else if (state === WinState.cur) {
                    // cur
                    srcTable = tableNames.cur;
                    newColName = "cur_" + colName;
                } else {
                    throw "Error Case!";
                }

                var newTableName = srcTable.split("#")[0] +
                                    Authentication.getHashId();
                // update tableName and cache colName
                if (state === WinState.cur) {
                    tableNames.cur = newTableName;
                    winColNames.cur = newColName;
                } else {
                    tableNames[state][index] = newTableName;
                    winColNames[state][index] = newColName;
                }

                XcalarMap(newColName, mapStr, srcTable, newTableName, txId)
                .then(function() {
                    var newCols = [];
                    newCols[0] = ColManager.newCol({
                        "name"    : newColName,
                        "type"    : "float",
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + newColName + '" = pull(' +
                                        newColName + ')',
                        "func"    : {
                            "func": "pull",
                            "args": [newColName]
                        }
                    });
                    newCols.push(ColManager.newDATACol());
                    TblManager.setOrphanTableMeta(newTableName, newCols);
                    innerDeferred.resolve();
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }

            function reCastCurTable(newMapCol, mapStr) {
                var innerDeferred = jQuery.Deferred();
                var srcTable = tableNames.cur;
                var newTableName = srcTable.split("#")[0] +
                                   Authentication.getHashId();
                tableNames.cur = newTableName;

                XcalarMap(newMapCol, mapStr, srcTable, newTableName, txId)
                .then(function() {
                    var srcTableId = xcHelper.getTableId(srcTable);
                    var srcTableCols = gTables[srcTableId].tableCols;
                    TblManager.setOrphanTableMeta(newTableName, srcTableCols);
                    innerDeferred.resolve();
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }

            function winJoin(lCol, lTable, newTableName, index, state) {
                if (state !== WinState.lag && state !== WinState.lead) {
                    // state can only be lag or lead
                    return PromiseHelper.reject("Error Case in win join");
                }

                var innerDeferred = jQuery.Deferred();
                var joinType = JoinOperatorT.InnerJoin;
                var rTable = tableNames[state][index];
                var rCol = genUniqColNames[state][index];;

                XIApi.join(txId, joinType, lCol, lTable, rCol, rTable, newTableName)
                .then(function() {
                    var lTableId = xcHelper.getTableId(lTable);
                    var newCols = xcHelper.deepCopy(gTables[lTableId].tableCols);
                    newCols.unshift(ColManager.newCol({
                        "name"    : rCol,
                        "type"    : "float",
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + rCol + '" = pull(' + rCol + ')',
                        "func"    : {
                            "func": "pull",
                            "args": [rCol]
                        }
                    }));

                    TblManager.setOrphanTableMeta(newTableName, newCols);
                    innerDeferred.resolve();
                })
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }
        }
    };

    return (UExtXcalarDef);
}({}, jQuery));

