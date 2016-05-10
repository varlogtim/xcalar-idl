window.UExtXcalarDef = (function(UExtXcalarDef, $) {
    UExtXcalarDef.buttons = [
        {"buttonText": "Horizontal Partition",
         "fnName": "hPartition",
         "arrayOfFields": [{"type": "number",
                            "name": "No. of Partitions",
                            "fieldClass": "partitionNums"},
                          ]
        },
        {"buttonText": "Windowing",
         "fnName": "windowChain",
         "arrayOfFields": [{"type": "number",
                            "name": "Lag",
                            "fieldClass": "lag"},
                           {"type": "number",
                            "name": "Lead",
                            "fieldClass": "lead"}
                          ]
        },
    ];

    UExtXcalarDef.undoActionFn = undefined;
    UExtXcalarDef.actionFn = function(colNum, tableId, functionName, argList) {
        switch (functionName) {
        case ("hPartition"):
            var $partitionNums = $('#extensionOpModal').find('.argument').eq(0);
            if (hPartArgCheck($partitionNums)) {
                ExtensionOpModal.close();
                horizontalPartition(colNum, tableId, argList["partitionNums"]);
                return (true);
            } else {
                return (false);
            }
            break;
        case ("windowChain"):
            var $lag = $('#extensionOpModal').find('.argument').eq(0);
            var $lead = $('#extensionOpModal').find('.argument').eq(1);
            if (windowArgCheck($lag, $lead)) {
                windowChain(colNum, tableId, argList["lag"], argList["lead"]);
                return (true);
            } else {
                return (false);
            }
            break;
        default:
            return (true);
        }



        function hPartArgCheck($input) {
            var partitionNums = Number($input.val().trim());
            var rangeErr = xcHelper.replaceMsg(ErrWRepTStr.InvalidRange, {
                "num1": 1,
                "num2": 10
            });

            var isValid = xcHelper.validate([
                {
                    "$selector": $input,
                    "text"     : ErrTStr.OnlyNumber
                },
                {
                    "$selector": $input,
                    "text"     : ErrTStr.OnlyNumber,
                    "check"    : function() {
                        return (isNaN(partitionNums) ||
                                !Number.isInteger(partitionNums));
                    }
                },
                {
                    "$selector": $input,
                    "text"     : rangeErr,
                    "check"    : function() {
                        return partitionNums < 1 || partitionNums > 10;
                    }
                }
            ]);

            if (!isValid) {
                return (false);
            }

            $input.val("").blur();
            return (true);
        }

        // Horizontal Partition
        function horizontalPartition(colNum, tableId, partitionNums) {
            var isValidParam = (colNum != null && tableId != null &&
                                partitionNums != null);
            xcHelper.assert(isValidParam, "Invalid Parameters");

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

            xcHelper.lockTable(tableId);

            var txId = Transaction.start({
                "msg"      : StatusMessageTStr.HorizontalPartition,
                "operation": SQLOps.hPartition
            });

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
            .then(function(finalTableId) {
                xcHelper.unlockTable(tableId);

                var sql = {
                    "operation"    : SQLOps.hPartition,
                    "tableName"    : tableName,
                    "tableId"      : tableId,
                    "colNum"       : colNum,
                    "colName"      : colName,
                    "partitionNums": partitionNums,
                    "newTableNames": newTables
                };

                Transaction.done(txId, {
                    "msgTable": finalTableId,
                    "sql"     : sql
                });
                deferred.resolve();
            })
            .fail(function(error) {
                xcHelper.unlockTable(tableId);

                var sql = {
                    "operation"    : SQLOps.hPartition,
                    "tableName"    : tableName,
                    "tableId"      : tableId,
                    "colNum"       : colNum,
                    "colName"      : colName,
                    "partitionNums": partitionNums,
                    "newTableNames": newTables
                };

                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.HPartitionFailed,
                    "error"  : error,
                    "sql"    : sql
                });
                deferred.reject(error);
            });

            return (deferred.promise());

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

        function windowArgCheck($lagInput, $leadInput) {
            var lag = Number($lagInput.val());
            var lead = Number($leadInput.val());
            // validation check
            var isValid = xcHelper.validate([
                {
                    "$selector": $lagInput
                },
                {
                    "$selector": $leadInput
                },
                {
                    "$selector": $lagInput,
                    "text"     : ErrTStr.OnlyNumber,
                    "check"    : function() {
                        return (isNaN(lag) || !Number.isInteger(lag));
                    }
                },
                {
                    "$selector": $lagInput,
                    "text"     : ErrTStr.NoNegativeNumber,
                    "check"    : function() { return (lag < 0); }
                },
                {
                    "$selector": $leadInput,
                    "text"     : ErrTStr.OnlyNumber,
                    "check"    : function() {
                        return (isNaN(lead) || !Number.isInteger(lead));
                    }
                },
                {
                    "$selector": $leadInput,
                    "text"     : ErrTStr.NoNegativeNumber,
                    "check"    : function() { return (lead < 0); }
                },
                {
                    "$selector": $leadInput,
                    "text"     : ErrTStr.NoAllZeros,
                    "check"    : function() {
                        return (lag === 0 && lead === 0);
                    }
                }
            ]);

            if (!isValid) {
                return (false);
            }

            $lagInput.val("").blur();
            $leadInput.val("").blur();
            return (true);
        }

        function windowChain(colNum, tableId, lag, lead) {
            var deferred = jQuery.Deferred();
            // XXX: Fill in all the SQL stuff
            var worksheet = WSManager.getWSFromTable(tableId);

            var table = gTables[tableId];
            var tableCols = table.tableCols;
            var colName = tableCols[colNum - 1].name;
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
            var origSortedOnCol = "";
            var newOrigSortedOnCol;
            var direction = XcalarOrderingT.XcalarOrderingAscending; // default

            // Step -1. Figure out how the column is sorted before window,
            // because we have to resort by this ordering once the window is
            // done
            var sortedStr = $("#dagWrap-" + tableId).find(".actionType:last")
                             .attr("data-info");
            if (sortedStr.indexOf("sort") === -1) {
            // This is not a sorted table! I can just check that this table is
            // sorted because of the way that the UI always uses the unsorted
            // table. But backend should technically return us some information
            // XXX: Potential trap with tables created in the backend and then
            // inducted into the front end
                Alert.error(StatusMessageTStr.WindowFailed, ErrTStr.InvalidWin);
                deferred.reject(ErrTStr.InvalidWin);
                return deferred.promise();
            } else {
                if (sortedStr.indexOf("desc") !== -1) {
                    // Descending sort
                    direction = XcalarOrderingT.XcalarOrderingDescending;
                } else {
                    direction = XcalarOrderingT.XcalarOrderingAscending;
                }
            }

            xcHelper.lockTable(tableId);
            var txId = Transaction.start({
                "msg"      : StatusMessageTStr.Window,
                "operation": SQLOps.Window
            });

            // Step 0. Figure out column type info from orig table. We need it
            // in step 4.
            XcalarMakeResultSetFromTable(tableName)
            .then(function(ret) {
                type = DfFieldTypeTStr[ret.keyAttrHeader.type];
                switch (type) {
                    case ("DfString"):
                        type = "string";
                        break;
                    case ("DfInt32"):
                    case ("DfInt64"):
                    case ("DfUInt32"):
                    case ("DfUInt64"):
                        type = "int";
                        break;
                    case ("DfFloat32"):
                    case ("DfFloat64"):
                        type = "float";
                        break;
                    case ("DfBoolean"):
                        type = "bool";
                        break;
                    default:
                        type = "string";
                        break;
                }
                origSortedOnCol = ret.keyAttrHeader.name;
                newOrigSortedOnCol = "orig_" + origSortedOnCol + "_" +
                                     randNumber;
                return XcalarSetFree(ret.resultSetId);
            })
            .then(function() {
                // Step 1 Get Unique Column, on SORTED table.
                return genRowNum(tableName);
            })
            .then(function(tableWithUniqOrig, uniqColName) {
                // Step 2 Generate the columns for lag and lead. We need to
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
                // Step 3 Create unique col names for each of the tables
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
                // Step 4 Need to recast the original sorted by column in cur
                // table to avoid name collisions
                var mapStr = type + "(" + origSortedOnCol + ")";
                return reCastCurTable(newOrigSortedOnCol, mapStr);
            })
            .then(function() {
                // Step 5 inner join funnesss!
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
                // Step 6 Sort ascending or descending by the cur order number
                var oldTableName = finalTableName;
                var indexCol = newOrigSortedOnCol;
                return XIApi.sort(txId, direction, indexCol, oldTableName);
            })
            .then(function(tableAfterSort) {
                finalTableName = tableAfterSort;
                // Step 7 YAY WE ARE FINALLY DONE! Just start picking out all
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
                xcHelper.unlockTable(tableId);

                var sql = {
                    "operation"   : SQLOps.Window,
                    "tableName"   : tableName,
                    "tableId"     : tableId,
                    "colNum"      : colNum,
                    "colName"     : colName,
                    "lag"         : lag,
                    "lead"        : lead,
                    "newTableName": finalTableName
                };

                Transaction.done(txId, {
                    "msgTable": xcHelper.getTableId(finalTableName),
                    "sql"     : sql
                });

                deferred.resolve();
            })
            .fail(function(error) {
                xcHelper.unlockTable(tableId);

                var sql = {
                    "operation"   : SQLOps.Window,
                    "tableName"   : tableName,
                    "tableId"     : tableId,
                    "colNum"      : colNum,
                    "colName"     : colName,
                    "lag"         : lag,
                    "lead"        : lead,
                    "newTableName": finalTableName
                };

                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.WindowFailed,
                    "error"  : error,
                    "sql"    : sql
                });

                deferred.reject(error);
            });

            return deferred.promise();

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

