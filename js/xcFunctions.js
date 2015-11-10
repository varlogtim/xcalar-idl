window.xcFunction = (function($, xcFunction) {
    var joinLookUp = {
        "Inner Join"      : JoinOperatorT.InnerJoin,
        "Left Outer Join" : JoinOperatorT.LeftOuterJoin,
        "Right Outer Join": JoinOperatorT.RightOuterJoin,
        "Full Outer Join" : JoinOperatorT.FullOuterJoin
    };

    // filter table column
    xcFunction.filter = function(colNum, tableId, fltOptions) {
        var deferred = jQuery.Deferred();

        var table        = xcHelper.getTableFromId(tableId);
        var tableName    = table.tableName;
        var frontColName = table.tableCols[colNum].name;
        var backColName  = table.tableCols[colNum].func.args[0];
        var tablCols     = xcHelper.deepCopy(table.tableCols);
        var fltStr       = fltOptions.filterString;

        var msg = StatusMessageTStr.Filter + ': ' + frontColName;
        var msgObj = {
            "msg"      : msg,
            "operation": SQLOps.Filter
        };
        var msgId = StatusMessage.addMsg(msgObj);
        
        var newTableInfo = getNewTableInfo(tableName);
        var newTableName = newTableInfo.tableName;
        var newTableId   = newTableInfo.tableId;

        // must add to worksheet before async call or will end up adding to th
        // wrong worksheet
        WSManager.addTable(newTableId);
        xcHelper.lockTable(tableId);

        var sqlOptions = {
            "operation"   : SQLOps.Filter,
            "tableName"   : tableName,
            "tableId"     : tableId,
            "colName"     : frontColName,
            "backColName" : backColName,
            "colNum"      : colNum,
            "newTableName": newTableName,
            "fltOptions"  : fltOptions
        };

        XcalarFilter(fltStr, tableName, newTableName, sqlOptions)
        .then(function() {
            return (setgTable(newTableName, tablCols));
        })
        .then(function() {
            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, newTableId);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            WSManager.removeTable(newTableId);
            xcHelper.unlockTable(tableId);
            Alert.error("Filter Columns Fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msgId);

            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // aggregate table column
    xcFunction.aggregate = function(colNum, tableId, aggrOp) {
        var deferred = jQuery.Deferred();

        var table        = xcHelper.getTableFromId(tableId);
        var tableName    = table.tableName;
        var frontColName = table.tableCols[colNum].name;
        var backColName  = table.tableCols[colNum].func.args[0];

        if (colNum === -1) {
            colNum = undefined;
        }

        var instr = 'This is the aggregate result for column "' +
                    frontColName + '". \r\n The aggregate operation is "' +
                    aggrOp + '".';

        var aggInfo = WSManager.checkAggInfo(tableId, backColName, aggrOp);
        if (aggInfo != null) {

            Alert.show({
                "title"  : "Aggregate: " + aggrOp,
                "instr"  : instr,
                "msg"    : '{"Value":' + aggInfo.value + "}",
                "isAlert": true
            });

            deferred.resolve();
            return (deferred.promise());
        }


        var msg = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                    StatusMessageTStr.OnColumn + ": " + frontColName;
        var msgObj = {
            "msg"      : msg,
            "operation": SQLOps.Aggr
        };
        var msgId = StatusMessage.addMsg(msgObj);
        xcHelper.lockTable(tableId);

        var sqlOptions = {
            "operation": SQLOps.Aggr,
            "tableName": tableName,
            "tableId"  : tableId,
            "colName"  : frontColName,
            "colNum"   : colNum,
            "aggrOp"   : aggrOp
        };

        XcalarAggregate(backColName, tableName, aggrOp, sqlOptions)
        .then(function(value, dstDagName) {
            // show result in alert modal
            Alert.show({
                "title"  : "Aggregate: " + aggrOp,
                "instr"  : instr,
                "msg"    : value,
                "isAlert": true
            });

            try {
                var val = JSON.parse(value);
                // dagName is the result table name for aggreagate
                var aggRes = {
                    "value"  : val.Value,
                    "dagName": dstDagName
                };

                WSManager.addAggInfo(tableId, backColName, aggrOp, aggRes);
                RightSideBar.refreshAggTables();
                commitToStorage();
            } catch (error) {
                console.error(error);
            }

            StatusMessage.success(msgId, false, tableId);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Aggregate fails", error);
            StatusMessage.fail(StatusMessageTStr.AggregateFailed, msgId);
            deferred.reject(error);
        })
        .always(function() {
            xcHelper.unlockTable(tableId);
        });

        return (deferred.promise());
    };

    // sort table column
    xcFunction.sort = function(colNum, tableId, order) {
        var deferred = jQuery.Deferred();

        var table     = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;
        var tablCols  = xcHelper.deepCopy(table.tableCols);
        var pCol      = tablCols[colNum - 1];
        var direction = (order === SortDirection.Forward) ? "ASC" : "DESC";
        var backFieldName;
        var frontFieldName;
        var xcOrder;
        if (order === SortDirection.Backward) {
            xcOrder = XcalarOrderingT.XcalarOrderingDescending;
        } else {
            xcOrder = XcalarOrderingT.XcalarOrderingAscending;
        }

        switch (pCol.func.func) {
            case ("pull"):
                // Pulled directly, so just sort by this
                frontFieldName = pCol.name;
                backFieldName = pCol.func.args[0];
                break;
            default:
                deferred.reject("unsupported func");
                return (deferred.promise());
        }

        // Check for case where table is already sorted
        XcalarGetDag(tableName)
        .then(function(nodeArray) {
            if (XcalarApisTStr[nodeArray.node[0].api] === "XcalarApiIndex") {
                var indexInput = nodeArray.node[0].input.indexInput;
                if ((indexInput.ordering === xcOrder) &&
                    indexInput.keyName === backFieldName)
                {
                    var textOrder;
                    if (direction === "ASC") {
                        textOrder = "ascending";
                    } else {
                        textOrder = "descending";
                    }
                    Alert.error("Table already sorted",
                            "Current table is already sorted on this column" +
                            " in " + textOrder + " order"
                            );
                    console.log("Already sorted");
                    deferred.reject("Already sorted on current column");
                    return;
                }
            }

            var msg = StatusMessageTStr.Sort + " " + frontFieldName;
            var msgObj = {
                "msg"      : msg,
                "operation": SQLOps.Sort
            };
            var msgId = StatusMessage.addMsg(msgObj);

            var newTableInfo = getNewTableInfo(tableName);
            var newTableName = newTableInfo.tableName;
            var newTableId   = newTableInfo.tableId;

            // must add to worksheet before async call or will end up adding to th
            // wrong worksheet
            WSManager.addTable(newTableId);
            xcHelper.lockTable(tableId);

            var sqlOptions = {
                "operation"   : SQLOps.Sort,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "key"         : frontFieldName,
                "colNum"      : colNum,
                "order"       : order,
                "direction"   : direction,
                "newTableName": newTableName,
                "sorted"      : true
            };

            
                 
            XcalarIndexFromTable(tableName, backFieldName, newTableName,
                                 xcOrder, sqlOptions)
            .then(function() {
                // sort do not change groupby stats of the table
                STATSManager.copy(tableId, newTableId);

                return (setgTable(newTableName, tablCols, null, null));
            })
            .then(function() {
                return (refreshTable(newTableName, tableName));
            })
            .then(function() {
                StatusMessage.success(msgId, false, newTableId);
                xcHelper.unlockTable(tableId, true);
                commitToStorage();
                deferred.resolve();
            })
            .fail(function(error) {
                WSManager.removeTable(newTableId);
                xcHelper.unlockTable(tableId);
                Alert.error("Sort Rows Fails", error);
                StatusMessage.fail(StatusMessageTStr.SortFailed, msgId);
                deferred.reject(error);
            });
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    // join two tables
    xcFunction.join = function(lColNums, lTableId, rColNums, rTableId,
                                joinStr, newTableName)
    {
        var deferred = jQuery.Deferred();
        var joinType = joinLookUp[joinStr];

        if (joinType == null) {
            deferred.reject("Incorrect join type!");
            return (deferred.promise());
        }

        var sqlOptions = {
            "operation"   : SQLOps.Join,
            "lTableName"  : gTables[lTableId].name,
            "lTableId"    : lTableId,
            "lColNums"    : lColNums,
            "rTableName"  : gTables[rTableId].name,
            "rTableId"    : rTableId,
            "rColNums"    : rColNums,
            "newTableName": newTableName,
            "joinStr"     : joinStr
        };

        joinCheck(lColNums, lTableId, rColNums, rTableId)
        .then(function(res) {
            lTableId = res.lTableId;
            rTableId = res.rTableId;

            lColNum = res.lColNum;
            rColNum = res.rColNum;

            var joinOptions = res.joinOptions || {};

            var lTable     = gTables[lTableId];
            var lTableName = lTable.tableName;
            var lColName   = lTable.tableCols[lColNum].func.args[0];

            var rTable     = gTables[rTableId];
            var rTableName = rTable.tableName;
            var rColName   = rTable.tableCols[rColNum].func.args[0];

            var lSrcName;
            var rSrcName;

            var lTableResult;
            var rTableResult;


            xcHelper.lockTable(lTableId);
            xcHelper.lockTable(rTableId);

            var msg = StatusMessageTStr.Join;
            var msgObj = {
                "msg"      : msg,
                "operation": SQLOps.Join
            };
            var msgId = StatusMessage.addMsg(msgObj);

            var newTableId = xcHelper.getTableId(newTableName);
            WSManager.addTable(newTableId);

            // check table index
            parallelIndex(lColName, lTableId, rColName, rTableId)
            .then(function(lResult, rResult) {
                lTableResult = lResult;
                lSrcName = lResult.tableName;

                rTableResult = rResult;
                rSrcName = rResult.tableName;

                return (XcalarJoin(lSrcName, rSrcName, newTableName,
                                    joinType, sqlOptions));
            })
            .then(function() {
                var lRemoved = joinOptions.lRemoved;
                var rRemoved = joinOptions.rRemoved;
                var newTableCols = createJoinedColumns(lTable, rTable,
                                                       lRemoved, rRemoved);
                return (setgTable(newTableName, newTableCols));
            })
            .then(function() {
                var refreshOptions = {
                    "keepOriginal"       : false,
                    "additionalTableName": rTableName
                };
                return (refreshTable(newTableName, lTableName, refreshOptions));
            })
            .then(function() {
                xcHelper.unlockTable(lTableId, true);
                xcHelper.unlockTable(rTableId, true);

                StatusMessage.success(msgId, false, newTableId);
                commitToStorage();
                deferred.resolve();
            })
            .fail(function(error) {
                WSManager.removeTable(newTableId);
                xcHelper.unlockTable(lTableId);
                xcHelper.unlockTable(rTableId);
                Alert.error("Join Table Fails", error);
                StatusMessage.fail(StatusMessageTStr.JoinFailed, msgId);

                joinFailHandler(lTableResult)
                .then(function() {
                    joinFailHandler(rTableResult);
                })
                .always(function() {
                    deferred.reject(error);
                });
            });
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    // group by on a column
    xcFunction.groupBy = function(operator, tableId,
                                   indexedColName, aggColName,
                                   isIncSample, newColName)
    {
        var deferred = jQuery.Deferred();

        // Validation
        if (tableId < 0 || indexedColName.length < 1 || aggColName.length < 1) {
            deferred.reject("Invalid Parameters!");
            return (deferred.promise());
        }

        var table     = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;
        var currWorksheetIdx = WSManager.getWSFromTable(tableId);
        var columns = table.tableCols;
        var numCols = columns.length;
        var frontIndexedColName;
        var finalTableName;
        // Here newTableName is generated by the origin table, not
        // the indexed table, in the assume that is OK to do so.
        var newTableName = xcHelper.getTableName(tableName) + "-GroupBy";
        newTableName = xcHelper.randName(newTableName) +
                        Authentication.getHashId();
        var msgObj = {
            "msg"      : StatusMessageTStr.GroupBy + " " + operator,
            "operation": SQLOps.GroupBy
        };
        var msgId = StatusMessage.addMsg(msgObj);

        var newTableId = xcHelper.getTableId(newTableName);
        WSManager.addTable(newTableId);

        xcHelper.lockTable(tableId);
        
        var groupByCols = indexedColName.split(",");

        for (var i = 0; i < groupByCols.length; i++) {
            groupByCols[i] = groupByCols[i].trim();
        }

        var escapedName = newColName;
        if (newColName.indexOf('.') > -1) {
            escapedName = newColName.replace(/\./g, "\\\.");
        }

        multiGroupBy(groupByCols, tableId)
        .then(function(result) {

            // table name may have changed after sort!
            tableName = result.tableName;
            if (result.indexCol !== undefined) {
                indexedColName = result.indexCol;
            }
            var sqlOptions = {
                "operation"     : SQLOps.GroupBy,
                "operator"      : operator,
                "tableName"     : tableName,
                "tableId"       : tableId,
                "indexedColName": indexedColName,
                "aggColName"    : aggColName,
                "newTableName"  : newTableName,
                "newColName"    : newColName,
                "isIncSample"   : isIncSample
            };

            return (XcalarGroupBy(operator, newColName, aggColName,
                                  tableName, newTableName,
                                  isIncSample, sqlOptions));
        })
        .then(function() {
            return (extractColFromMap(newTableName, tableName, groupByCols,
                                      indexedColName, newColName));
        })
        .then(function(nTableName) {
            // final table is ready, just need to set the columns to pull out
            var newProgCol = ColManager.newCol({
                "index"   : 1,
                "name"    : newColName,
                "width"   : gNewCellWidth,
                "isNewCol": false,
                "userStr" : '"' + newColName + '" = pull(' + escapedName + ')',
                "func"    : {
                    "func": "pull",
                    "args": [escapedName]
                }
            });

            var $table     = xcHelper.getElementByTableId(tableId, "xcTable");
            var $dataCol   = $table.find('th.dataCol');
            var dataColNum = xcHelper.parseColNum($dataCol) - 1;

            var tablCols = [];
            tablCols[0] = newProgCol;

            var indexedColNum = -1;
            if (groupByCols.length === 1) {
                for (var i = 0; i < numCols; i++) {
                    if (columns[i].name === indexedColName &&
                        columns[i].func.args) {
                        indexedColNum = i;
                        break;
                    }
                }
            }

            if (indexedColNum === -1) {
                if (groupByCols.length === 1) {
                    frontIndexedColName = getFrontColName(indexedColName, tableId);
                    tablCols[1] = ColManager.newCol({
                        "index"   : 2,
                        "name"    : frontIndexedColName,
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + indexedColName + '" = pull(' +
                                    indexedColName + ')',
                        "func": {
                            "func": "pull",
                            "args": [indexedColName]
                        }
                    });
                } else {
                    // Pull out each individual one by doing maps
                    for (var i = 0; i < groupByCols.length; i++) {
                        var colName = groupByCols[i];
                        var frontColName =  getFrontColName(colName, tableId);

                        tablCols[1 + i] = ColManager.newCol({
                        "index"   : 2 + i,
                        "name"    : frontColName,
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + colName + '" = pull(' +
                                    colName + ')',
                        "func": {
                            "func": "pull",
                            "args": [colName]
                        }
                        });
                    }
                }
            } else {
                tablCols[1] = xcHelper.deepCopy(table.tableCols[indexedColNum]);
                tablCols[1].index = 2;
            }
            // Note that if include sample a.b should not be escaped to a\.b
            if (!isIncSample && tablCols[1].name.indexOf('.') > -1) {
                for (var i = 0; i < tablCols.length - 1; i++) {
                    if (tablCols[i + 1].name.indexOf('.') === -1) {
                        continue;
                    }
                    var newEscapedName = tablCols[i + 1].name.replace(/\./g,
                                                                    "\\\.");
                    tablCols[i + 1].userStr = tablCols[i + 1].name +
                                            '" = pull(' + newEscapedName + ')';
                    tablCols[i + 1].func.args = [newEscapedName];
                }
            }

            tablCols[1 + groupByCols.length] =
                                 xcHelper.deepCopy(table.tableCols[dataColNum]);
            tablCols[tablCols.length - 1].index = tablCols.length;
            WSManager.addTable(xcHelper.getTableId(nTableName),
                                currWorksheetIdx);

            xcHelper.unlockTable(tableId);
            finalTableName = nTableName;
            return (setgTable(nTableName, tablCols));
            
        })
        .then(function() {
            xcHelper.unlockTable(tableId);
        
            var refreshOptions = {
                "keepOriginal": true
            };
            return (refreshTable(finalTableName, null, refreshOptions));
        })
        .then(function() {
            commitToStorage();
            StatusMessage.success(msgId, false,
                                  xcHelper.getTableId(finalTableName));
            deferred.resolve();
        })
        .fail(function(error) {
            // XXX need to clean up all the tables if it's a multiGB
            Alert.error("GroupBy fails", error);
            WSManager.removeTable(newTableId);
            StatusMessage.fail(StatusMessageTStr.GroupByFailed, msgId);
            deferred.reject("error");
        });

        return (deferred.promise());
    };

    // map a column
    xcFunction.map = function(colNum, tableId, fieldName, mapString, mapOptions) {
        var deferred = jQuery.Deferred();

        var table     = gTables[tableId];
        var tableName = table.tableName;

        var msg = StatusMessageTStr.Map + " " + fieldName;
        var msgObj = {
            "msg"      : msg,
            "operation": SQLOps.Map
        };
        var msgId = StatusMessage.addMsg(msgObj);

        mapOptions = mapOptions || {};

        var newTableInfo = getNewTableInfo(tableName);
        var newTableName = newTableInfo.tableName;
        var newTableId   = newTableInfo.tableId;

        // must add to worksheet before async call or will end up adding to th
        // wrong worksheet
        WSManager.addTable(newTableId);
        xcHelper.lockTable(tableId);
        
        var sqlOptions = {
            "operation"   : SQLOps.Map,
            "tableName"   : tableName,
            "tableId"     : tableId,
            "newTableName": newTableName,
            "colNum"      : colNum,
            "fieldName"   : fieldName,
            "mapString"   : mapString,
            "mapOptions"  : mapOptions
        };

        XcalarMap(fieldName, mapString, tableName, newTableName, sqlOptions)
        .then(function() {
            var tablCols = xcHelper.mapColGenerate(colNum, fieldName, mapString,
                                                    table.tableCols, mapOptions);
            var tableProperties = {
                "bookmarks" : xcHelper.deepCopy(table.bookmarks),
                "rowHeights": xcHelper.deepCopy(table.rowHeights)
            };

            // map do not change groupby stats of the table
            var oldTableId = xcHelper.getTableId(tableName);
            newTableId = xcHelper.getTableId(newTableName);
            STATSManager.copy(oldTableId, newTableId);

            return (setgTable(newTableName, tablCols, null, tableProperties));
        })
        .then(function() {
            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, newTableId);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);
            WSManager.removeTable(newTableId);

            Alert.error("Map fails", error);
            StatusMessage.fail(StatusMessageTStr.MapFailed, msgId);

            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // map two tables at the same time, now specifically for multi clause join
    xcFunction.twoMap = function(lOptions, rOptions, lockNewTable, msg) {
        var deferred = jQuery.Deferred();

        if (lOptions == null || rOptions == null) {
            deferred.reject("Invalid map parameters");
            return (deferred.promise());
        }

        var lColNum    = lOptions.colNum;
        var lTableId   = lOptions.tableId;
        var lTable     = xcHelper.getTableFromId(lTableId);
        var lTableName = lTable.tableName;
        var lFieldName = lOptions.fieldName;
        var lMapString = lOptions.mapString;

        var rColNum    = rOptions.colNum;
        var rTableId   = rOptions.tableId;
        var rTable     = xcHelper.getTableFromId(rTableId);
        var rTableName = rTable.tableName;
        var rFieldName = rOptions.fieldName;
        var rMapString = rOptions.mapString;

        msg = msg || StatusMessageTStr.Map + " " + lTableName +
                        " and " + rTableName;
        var msgObj = {
            "msg"      : msg,
            "operation": "map"
        };
        var msgId = StatusMessage.addMsg(msgObj);

        var lNewInfo = getNewTableInfo(lTableName);
        var lNewName = lNewInfo.tableName;
        var lNewId   = lNewInfo.tableId;

        var rNewInfo = getNewTableInfo(rTableName);
        var rNewName = rNewInfo.tableName;
        var rNewId   = rNewInfo.tableId;

        // must add to worksheet before async call or will end up adding to th
        // wrong worksheet
        WSManager.addTable(lNewId);
        xcHelper.lockTable(lTableId);

        WSManager.addTable(rNewId);
        xcHelper.lockTable(rTableId);

        var sqlOptions1 = {
            "operation"   : SQLOps.JoinMap,
            "srcTableName": lTableName,
            "newTableName": lNewName,
            "colName"     : lFieldName,
            "mapString"   : lMapString
        };

        var sqlOptions2 = {
            "operation"   : SQLOps.JoinMap,
            "srcTableName": rTableName,
            "newTableName": rNewName,
            "colName"     : rFieldName,
            "mapString"   : rMapString
        };

        var deferred1 = XcalarMap(lFieldName, lMapString,
                                    lTableName, lNewName, sqlOptions1);
        var deferred2 = XcalarMap(rFieldName, rMapString,
                                    rTableName, rNewName, sqlOptions2);

        xcHelper.when(deferred1, deferred2)
        .then(function(ret1, ret2) {
            // XXX: You can check whether deferred1 or deferred2 has an error
            // by using if (ret1 && ret1.error != undefined) // deferred1 failed
            if (lockNewTable) {
                xcHelper.lockTable(lTableId);
                xcHelper.lockTable(rTableId);
            }

            var lTableCols = xcHelper.mapColGenerate(lColNum, lFieldName,
                                        lMapString, lTable.tableCols, lOptions);
            var lTableProperties = {
                "bookmarks" : xcHelper.deepCopy(lTable.bookmarks),
                "rowHeights": xcHelper.deepCopy(lTable.rowHeights)
            };

            return (setgTable(lNewName, lTableCols, null, lTableProperties));
            // XXX should change to xcHelper.when after fix async bug in refresh
           
        })
        .then(function() {
            var refreshOptions = {
                "lockTable": true
            };
            return (refreshTable(lNewName, lTableName, refreshOptions));
        })
        .then(function() {
            var rTableCols = xcHelper.mapColGenerate(rColNum, rFieldName,
                                        rMapString, rTable.tableCols, rOptions);
            var rTableProperties = {
                "bookmarks" : xcHelper.deepCopy(rTable.bookmarks),
                "rowHeights": xcHelper.deepCopy(rTable.rowHeights)
            };

            return (setgTable(rNewName, rTableCols, null, rTableProperties));
        })
        .then(function() {
            var refreshOptions = {
                "lockTable": true
            };
            return (refreshTable(rNewName, rTableName, refreshOptions));
        })
        .then(function() {

            xcHelper.unlockTable(lTableId, true);
            xcHelper.unlockTable(rTableId, true);

            StatusMessage.success(msgId, false, lNewId);
            deferred.resolve(lNewName, rNewName);
        })
        .fail(function(err1, err2) {
            xcHelper.unlockTable(lTableId);
            xcHelper.unlockTable(rTableId);

            WSManager.removeTable(lNewId);
            WSManager.removeTable(rNewId);

            StatusMessage.fail(StatusMessageTStr.MapFailed, msgId);
            var ret1 = thriftLog("DualMap", err1);
            var ret2 = thriftLog("DualMap", err2);
            deferred.reject(ret1 + ", " + ret2);
        });

        return (deferred.promise());
    };

    // export table
    xcFunction.exportTable = function(tableName, exportName, targetName,
                                        numCols, columns) {
        var deferred = jQuery.Deferred();
        var retName  = $(".retTitle:disabled").val();

        if (!retName || retName === "") {
            retName = "testing";
        }

        // now disable retName
        // var fileName = retName + ".csv";
        var msg = StatusMessageTStr.ExportTable + ": " + tableName;
        var msgObj = {
            "msg"      : msg,
            "operation": "export"
        };
        var msgId = StatusMessage.addMsg(msgObj);
        // var location = hostname + ":/var/tmp/xcalar/" + exportName;

        var sqlOptions = {
            "operation" : SQLOps.ExportTable,
            "tableName" : tableName,
            "exportName": exportName,
            "targetName": targetName,
            "numCols"   : numCols,
            "columns"   : columns
        };

        XcalarExport(tableName, exportName, targetName, numCols, columns, sqlOptions)
        .then(function() {
            // add alert
            // var ins = "Widget location: " +
            //             "http://schrodinger/dogfood/widget/main.html?" +
            //             "rid=" + retName;
            var ins = "Table \"" + tableName + "\" was succesfully exported " +
                      "to " + targetName + " under the name: " + exportName +
                      ".csv";
            var alertMsg = "File Name: " + exportName + ".csv\n" +
                            "File Location: " + targetName;

            Alert.show({
                "title"     : "Successful Export",
                "msg"       : alertMsg,
                "instr"     : ins,
                "isAlert"   : true,
                "isCheckBox": true,
                "onClose"   : function() {
                                $('#alertContent').removeClass('leftalign');
                            }
            });
            $('#alertContent').addClass('leftAlign');
            StatusMessage.success(msgId, false, xcHelper.getTableId(tableName));
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            // if error is that export name already in use and modal is still
            // visible, then show a statusbox next to the name field
            if ((error.status === StatusT.StatusDsODBCTableExists ||
                error.status === StatusT.StatusExist) &&
                $('#exportName:visible').length !== 0) {

                var text = "Name is in use. Please choose a unique name.";
                StatusBox.show(text, $('#exportName'), true);
            } else {
                Alert.error("Export Table Failed", error);
            }
            
            StatusMessage.fail(StatusMessageTStr.ExportFailed, msgId);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    xcFunction.rename = function(tableId, newTableName) {
        var deferred = jQuery.Deferred();

        if (tableId == null || newTableName == null) {
            deferred.reject("Invalid renaming parameters");
            return (deferred.promise());
        }

        var table = gTables[tableId];
        var oldTableName = table.tableName;
        var sqlOptions = {
            "operation"   : SQLOps.RenameTable,
            "tableId"     : tableId,
            "oldTableName": oldTableName,
            "newTableName": newTableName
        };

        // not lock table is the operation is short
        var lockTimer = setTimeout(function() {
            xcHelper.lockTable(tableId);
        }, 500);

        var newTableNameId = xcHelper.getTableId(newTableName);
        if (newTableNameId !== tableId) {
            console.warn("Table Id not consistent");
            newTableName = xcHelper.getTableName(newTableName) + "#" + tableId;
        }

        XcalarRenameTable(oldTableName, newTableName, sqlOptions)
        .then(function() {
            // does renames for gTables, rightsidebar, dag
            table.tableName = newTableName;

            RightSideBar.renameTable(tableId, newTableName);
            Dag.renameAllOccurrences(oldTableName, newTableName);

            updateTableHeader(tableId);

            commitToStorage();
            deferred.resolve(newTableName);
        })
        .fail(function(error) {
            console.error("Rename Fails!". error);
            deferred.reject(error);
        })
        .always(function() {
            clearTimeout(lockTimer);
            xcHelper.unlockTable(tableId);
        });

        return (deferred.promise());
    };

    function getFrontColName(backColName, tableId) {
        var columns = xcHelper.getTableFromId(tableId).tableCols;
        var numCols = columns.length;
        var frontColName = backColName;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].func.args &&
                columns[i].func.args[0] === backColName) {
                frontColName = columns[i].name;
                break;
            }
        }
        return (frontColName);
    }

    function getNewTableInfo(tableName) {
        var newId   = Authentication.getHashId().split("#")[1];
        var newName = tableName.split("#")[0] + "#" + newId;

        return { "tableName": newName, "tableId": newId };
    }

    // check if table has correct index
    function checkTableIndex(colName, tableId) {
        var deferred = jQuery.Deferred();
        var table     = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;
        var parentIndexedWrongly = false;
        var unsortedTableName = tableName;

        getUnsortedTableName(tableName)
        .then(function(unsorted) {
            if (unsorted !== tableName) {
                unsortedTableName = unsorted;
                return (XcalarMakeResultSetFromTable(unsorted));
            } else {
                var tmp = jQuery.Deferred();
                tmp.resolve();
                return (tmp.promise());
            }
        })
        .then(function(resultSet) {
            if (resultSet && resultSet.keyAttrHeader.name !== colName) {
                parentIndexedWrongly = true;
            }

            if ((unsortedTableName === tableName && colName !== table.keyName) ||
                (unsortedTableName !== tableName && parentIndexedWrongly)) {
                console.log(tableName, "not indexed correctly!");
                // XXX In the future,we can check if there are other tables that
                // are indexed on this key. But for now, we reindex a new table
                var newTableInfo = getNewTableInfo(tableName);
                var newTableName = newTableInfo.tableName;
                var newTableId   = newTableInfo.tableId;

                // append new table to the same ws as the old table
                var wsIndex = WSManager.getWSFromTable(tableId);
                // must add to worksheet before async call
                WSManager.addTable(newTableId, wsIndex);

                var sqlOptions = {
                    "operation"   : SQLOps.CheckIndex,
                    "key"         : colName,
                    "tableName"   : tableName,
                    "newTableName": newTableName,
                    "sorted"      : false
                };

                XcalarIndexFromTable(tableName, colName, newTableName,
                                     XcalarOrderingT.XcalarOrderingUnordered,
                                     sqlOptions)
                .then(function() {
                    var tablCols = xcHelper.deepCopy(table.tableCols);

                    setgTable(newTableName, tablCols);
                    gTables[newTableId].active = false;

                    var tableResult = {
                        "newTableCreated": true,
                        "setMeta"        : false,
                        "tableName"      : newTableName,
                        "tableId"        : newTableId
                    };
                    deferred.resolve(setIndexedTableMeta(tableResult));
                })
                .fail(function(error) {
                    WSManager.removeTable(newTableId);
                    deferred.reject(error);
                });
            } else {
                console.log(tableName, "indexed correctly!");

                deferred.resolve({
                    "newTableCreated": false,
                    "tableName"      : tableName,
                    "tableId"        : tableId
                });
            }
        });
        return (deferred.promise());
    }

    function multiGroupBy(groupByCols, tableId) {
        var deferred = jQuery.Deferred();
        // console.log(arguments);
        // XXX TODO WSManager.delTable
        var groupByField;
        var newTableName;
        if (groupByCols.length === 1) {
            return (checkTableIndex(groupByCols[0], tableId));
        } else {
            // 1. merge multi columns into one using udf multiJoinModule
            // 2. sort this merged column

            var mapStr = "multiJoinModule:multiJoin(";
            groupByField = xcHelper.randName("multiGroupBy", 5);
            var originTable = xcHelper.getTableFromId(tableId);
            var originTableName = originTable.tableName;
            newTableName = getNewTableInfo(originTableName).tableName;
            var currWorksheetIdx = WSManager.getWSFromTable(tableId);
            var newTableId = xcHelper.getTableId(newTableName);
            var reindexedTableName;
            var reindexedTableId;
            
            for (var i = 0; i < groupByCols.length; i++) {
                mapStr += groupByCols[i] + ", ";
            }
            mapStr = mapStr.substring(0, mapStr.length - 2);
            mapStr += ")";

            XcalarMap(groupByField, mapStr, originTableName,
                      newTableName, {
                          "operation"   : SQLOps.GroupbyMap,
                          "srcTableName": originTableName,
                          "newTableName": newTableName,
                          "colName"     : groupByField,
                          "mapString"   : mapStr
            })
            .then(function() {
                WSManager.addTable(newTableId, currWorksheetIdx);
                var tableCols = xcHelper.deepCopy(originTable.tableCols);
                return (setgTable(newTableName, tableCols));
            })
            .then(function() {
                gTables[newTableId].active = false;

                var tableResult = {
                    "newTableCreated": true,
                    "setMeta"        : false,
                    "tableName"      : newTableName,
                    "tableId"        : newTableId
                };

                setIndexedTableMeta(tableResult);
                reindexedTableName = getNewTableInfo(newTableName).tableName;
                XcalarIndexFromTable(newTableName, groupByField,
                                     reindexedTableName,
                                     XcalarOrderingT.XcalarOrderingUnordered, {
                          "operation"   : SQLOps.GroupbyIndex,
                          "tableName"   : newTableName,
                          "key"         : groupByField,
                          "newTableName": reindexedTableName,
                          "sorted"      : false
                })
                .then(function(ret) {
                    reindexedTableId = xcHelper.getTableId(reindexedTableName);
                    WSManager.addTable(reindexedTableId, currWorksheetIdx);
                    var tableCols = xcHelper.deepCopy(originTable.tableCols);
                    return (setgTable(reindexedTableName, tableCols));
                })
                .then(function() {
                    gTables[newTableId].active = false;

                    var tableResult = {
                        "newTableCreated": true,
                        "setMeta"        : false,
                        "tableName"      : reindexedTableName,
                        "tableId"        : reindexedTableId
                    };

                    setIndexedTableMeta(tableResult);

                    deferred.resolve({
                        "newTableCreated": true,
                        "setMeta"        : false,
                        "tableName"      : reindexedTableName,
                        "indexCol"       : groupByField
                    });
                })
                .fail(function() {
                    // XXX TODO HANDLE ME
                });
            })
            .fail(function() {
                // XXX TODO HANDLE ME
            });
        }
        return (deferred.promise());
    }

    function extractColFromMap(tableName, origTableName, colArray,
                                indexedColName, gbColName) {
        var deferred = jQuery.Deferred();
        var lastTableName = tableName;
        var currWorksheetIdx =
                       WSManager.getWSFromTable(xcHelper.getTableId(tableName));
        if (colArray.length === 1) {
            deferred.resolve(tableName);
        } else {
            var deferredArray = []; // Array for deferred
            var argArray = [];
            // XXX Okay this is really dumb, but we have to keep mapping
            // XXX TODO FIXME When Mike fixes cut, this should use cut
            var mapStrStarter = "cut(" + indexedColName + ", ";
            var currExec = 0;
            var origTableId = xcHelper.getTableId(origTableName);
           
            var tableCols = extractColTableColsHelper(origTableName, gbColName,
                                                      indexedColName);

            setgTable(tableName, tableCols)
            .then(function() {
                var tableResult = {
                    "newTableCreated": true,
                    "setMeta"        : false,
                    "tableName"      : tableName,
                    "tableId"        : xcHelper.getTableId(tableName)
                };
                setIndexedTableMeta(tableResult);

                var currTableName = tableName;
                var currTableId = xcHelper.getTableId(currTableName);
                currWorksheetIdx = WSManager.getWSFromTable(currTableId);
                tableCols = xcHelper.deepCopy(tableCols);
                tableCols.splice(1, 1); // remove the 'mulitGroupby' col

                for (var i = 0; i < colArray.length; i++) {
                    var mapStr = mapStrStarter + (i + 1) + ", " + '".Xc."' + ")";
                    var newTableName = getNewTableInfo(currTableName).tableName;
                    var sqlOptions = {
                        "operation"   : SQLOps.GroupbyMap,
                        "srcTableName": currTableName,
                        "newTableName": newTableName,
                        "colName"     : colArray[i],
                        "mapString"   : mapStr
                    };
                    // This uses XcalarMap instead of xcFunction.map because
                    // it's a by product of an operation, so locking tables and
                    // such are not needed. Neither is updating the status message
                    argArray[i] = {
                        "arg1": colArray[i],
                        "arg2": mapStr,
                        "arg3": currTableName,
                        "arg4": newTableName,
                        "arg5": sqlOptions
                    };
                    deferredArray[i] = function() {
                        var tempTableName = argArray[currExec].arg4;
                        var def = XcalarMap(argArray[currExec].arg1,
                                            argArray[currExec].arg2,
                                            argArray[currExec].arg3,
                                            argArray[currExec].arg4,
                                            argArray[currExec].arg5)
                                            .then(function(ret) {
                                                var tempTableId = xcHelper.getTableId(tempTableName);
                                                if (currExec !== colArray.length) {
                                                    WSManager.addTable(tempTableId, currWorksheetIdx);
                                                }
                                                var tempCols = getMultiGroupByProgCol(tableCols, argArray[currExec - 1].arg1, origTableId);
                                                return (setgTable(tempTableName, tempCols));
                                            })
                                            .then(function() {
                                                var tempTableId = xcHelper.getTableId(tempTableName);
                                                gTables[tempTableId].active = false;

                                                var tableResult = {
                                                    "newTableCreated": true,
                                                    "setMeta"        : false,
                                                    "tableName"      : tempTableName,
                                                    "tableId"        : tempTableId
                                                };
        
                                                if (currExec === colArray.length) {
                                                    // this is the last table, we will
                                                    // set the meta data in xcFunctions.groupBy
                                                    return (promiseWrapper(tableResult));
                                                } else {
                                                    var result = setIndexedTableMeta(tableResult);
                                                    return (promiseWrapper(result));
                                                }
                                            });
                        currExec++;
                        return (def);
                    };
                    currTableName = newTableName;
                    lastTableName = currTableName;
                }
                var starter = jQuery.Deferred();
                var chain = starter.promise();
                for (var i = 0; i < colArray.length; i++) {
                    chain = chain.then((function(index) {
                        return (deferredArray[index]);
                    })(i));
                }
                starter.resolve();
                chain
                .then(function() {
                    WSManager.addTable(xcHelper.getTableId(lastTableName),
                                       currWorksheetIdx);
                    deferred.resolve(lastTableName);
                })
                .fail(function() {
                    // XXX HANDLE THIS!
                    console.error("XXX Handle this!");
                    deferred.reject("Maps failed");
                });
            })
            .fail(function(err) {
                console.error(err);
            });

        }
        return (deferred.promise());
    }

    // this function is called inside extractColFromMap
    // it returns the gTable columns info after a group by is performed on a
    // table that is sorted on a mapped column
    // It returns the 1.groupby col 2.indexed col 3.data col
    function extractColTableColsHelper(origTableName, gbColName, indexedColName) {
        // set up the groupby column
        var escapedName = gbColName;
        if (gbColName.indexOf('.') > -1) {
            escapedName = gbColName.replace(/\./g, "\\\.");
        }

        var tableCols = [];
        var newProgCol = ColManager.newCol({
            "index"   : 1,
            "name"    : gbColName,
            "width"   : gNewCellWidth,
            "isNewCol": false,
            "userStr" : '"' + gbColName + '" = pull(' + escapedName + ')',
            "func"    : {
                "func": "pull",
                "args": [escapedName]
            }
        });

        // set up the indexed Column
        var escapedName2 = indexedColName;
        if (indexedColName.indexOf('.') > -1) {
            escapedName2 = indexedColName.replace(/\./g, "\\\.");
        }
        var secondProgCol = ColManager.newCol({
            "index"   : 2,
            "type"    : "string",
            "name"    : indexedColName,
            "width"   : gNewCellWidth,
            "isNewCol": false,
            "userStr" : '"' + indexedColName + '" = pull(' + escapedName2 + ')',
            "func"    : {
                "func": "pull",
                "args": [escapedName2]
            }
        });

        // find the column number of the DATA in the original table to copy it
        var origTableId = xcHelper.getTableId(origTableName);
        var origTableCols = gTables[origTableId].tableCols;
        var numCols = origTableCols.length;
        var dataColNum;
        for (var i = numCols - 1; i > -1; i--) {
            if (origTableCols[i].name === 'DATA') {
                dataColNum = i;
                break;
            }
        }

        // Push the 3 progcols into an array and return it
        tableCols.push(newProgCol);
        tableCols.push(secondProgCol);
        tableCols.push(xcHelper.deepCopy(origTableCols[dataColNum]));
        tableCols[2].index = 3;
        return (tableCols);
    }

    function getProgCol(colName, tableId) {
        var columns = xcHelper.getTableFromId(tableId).tableCols;
        var numCols = columns.length;
        var progCol;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].func.args &&
                columns[i].func.args[0] === colName) {
                progCol = columns[i];
                break;
            }
        }
        return (xcHelper.deepCopy(progCol));
    }

    function getMultiGroupByProgCol(tableCols, colName, tableId) {
        
        tableCols = xcHelper.deepCopy(tableCols);
        var numCols = tableCols.length;
        var progCol = getProgCol(colName, tableId);
        progCol.index = numCols;
        progCol.width = gNewCellWidth;
        progCol.type = "string";

        tableCols.splice(tableCols.length - 1, 0, progCol); // insert column
        tableCols[numCols].index = numCols + 1; // adjust Data col num;

        return (tableCols);
    }

    function joinCheck(lColNums, lTableId, rColNums, rTableId) {
        var deferred = jQuery.Deferred();
        var len = lColNums.length;

        // validation check
        if (len !== rColNums.length || len < 1) {
            deferred.reject("Invalid parameters in join");
            return (deferred.promise());
        }

        if (len === 1) {
            // single join
            deferred.resolve({
                "lColNum" : lColNums[0],
                "lTableId": lTableId,
                "rColNum" : rColNums[0],
                "rTableId": rTableId
            });
        } else {
            // multi join

            // left cols
            var lString  = 'multiJoinModule:multiJoin(';
            var lColName = xcHelper.randName("leftJoinCol");
            var lCols    = gTables[lTableId].tableCols;
            var lColNum  = lCols.length;

            for (var i = 0; i <= len - 2; i++) {
                lString += lCols[lColNums[i]].func.args[0] + ", ";
            }
            lString += lCols[lColNums[len - 1]].func.args[0] + ")";

            // right cols
            var rString  = 'multiJoinModule:multiJoin(';
            var rColName = xcHelper.randName("rightJoinCol");
            var rCols    = gTables[rTableId].tableCols;
            var rColNum  = rCols.length;

            for (var i = 0; i <= len - 2; i++) {
                rString += rCols[rColNums[i]].func.args[0] + ", ";
            }

            rString += rCols[rColNums[len - 1]].func.args[0] + ")";

            var lMapOptions = {
                "colNum"   : lColNum,
                "tableId"  : lTableId,
                "fieldName": lColName,
                "mapString": lString
            };

            var rMapOptions = {
                "colNum"   : rColNum,
                "tableId"  : rTableId,
                "fieldName": rColName,
                "mapString": rString
            };

            var mapMsg = StatusMessageTStr.Map + " for multiClause Join";

            xcFunction.twoMap(lMapOptions, rMapOptions, true, mapMsg)
            .then(function(lNewName, rNewName) {
                var lRemoved = {};
                var rRemoved = {};

                lRemoved[lColName] = true;
                rRemoved[rColName] = true;

                var lNewId = xcHelper.getTableId(lNewName);
                var rNewId = xcHelper.getTableId(rNewName);

                var joinOptions = {
                    "lRemoved": lRemoved,
                    "rRemoved": rRemoved
                };

                var res = {
                    "lColNum"    : lColNum - 1,
                    "lTableId"   : lNewId,
                    "rColNum"    : rColNum - 1,
                    "rTableId"   : rNewId,
                    "joinOptions": joinOptions
                };

                deferred.resolve(res);
            })
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    function parallelIndex(lColName, lTableId, rColName, rTableId) {
        var deferred = jQuery.Deferred();

        var deferred1 = checkTableIndex(lColName, lTableId);
        var deferred2 = checkTableIndex(rColName, rTableId);

        xcHelper.when(deferred1, deferred2)
        .then(function(ret1, ret2) {
            deferred.resolve(ret1, ret2);
        })
        .fail(function(ret1, ret2) {
            // If one fails, we abort entire transaction. This means that we
            // delete even the operation that has completed and rewind to prev
            // good state
            var del1 = false;
            var del2 = false;
            if (ret1 && ret1.error != null &&
                !(ret2 && (ret2.error != null))) {
                // Left table has an error, should del right table
                del2 = true;
            }
            if (ret2 && ret2.error != null &&
                !(ret1 && (ret1.error != null))) {
                // Right table has an error, should del left table
                del1 = true;
            }

            var res;
            var failed;
            var sqlOptions;

            if (del1) {
                // delete left table (rigt table error)
                res = ret1;
                failed = ret2;
                sqlOptions = {
                    "operation": "deleteTable",
                    "tableName": res.tableName
                };

                XcalarDeleteTable(res.tableName, sqlOptions)
                .always(function() {
                    console.error("Parallel index fails in rightTable", failed);
                    deferred.reject(failed);
                });
            }

            if (del2) {
                // delete right table (left table error)
                res = ret2;
                failed = ret1;
                sqlOptions = {
                    "operation": "deleteTable",
                    "tableName": res.tableName
                };

                XcalarDeleteTable(res.tableName, sqlOptions)
                .always(function() {
                    console.error("Parallel index fails in leftTable", failed);
                    deferred.reject(failed);
                });
            }

            if (!del1 && !del2) {
                // when both fails, nothing need to delete
                deferred.reject(ret1, ret2);
            }
        });
        return (deferred.promise());
    }

    function setIndexedTableMeta(tableResult) {
        if (tableResult.newTableCreated === false) {
            return ({
                "newTableCreated": false,
                "setMeta"        : true,
                "tableName"      : tableResult.tableName,
                "tableId"        : tableResult.tableId
            });
        }

        setupHiddenTable(tableResult.tableName);
        var table = gTables[tableResult.tableId];
        RightSideBar.addTables([table], IsActive.Inactive);

        return ({
            "newTableCreated": true,
            "setMeta"        : true,
            "tableName"      : tableResult.tableName,
            "tableId"        : tableResult.tableId
        });

    }

    // For xcFuncion.join, deepy copy of right table and left table columns
    function createJoinedColumns(lTable, rTable, lRemoved, rRemoved) {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var newTableCols = [];
        var lCols = xcHelper.deepCopy(lTable.tableCols);
        var rCols = xcHelper.deepCopy(rTable.tableCols);
        var index = 0;
        var dataCol;
        var colName;

        lRemoved = lRemoved || {};
        rRemoved = rRemoved || {};

        for (var i = 0; i < lCols.length; i++) {
            colName = lCols[i].name;

            if (colName === "DATA") {
                dataCol = lCols[i];
            } else if (!(colName in lRemoved)) {
                newTableCols[index] = lCols[i];
                newTableCols[index].index = index + 1;
                ++index;
            }
        }

        for (var i = 0; i < rCols.length; i++) {
            colName = rCols[i].name;

            if (colName !== "DATA" && !(colName in rRemoved)) {
                newTableCols[index] = rCols[i];
                newTableCols[index].index = index + 1;
                ++index;
            }
        }

        // now newTablCols.length is differenet from len
        dataCol.index = newTableCols.length + 1;
        newTableCols.push(dataCol);

        return (newTableCols);
    }

    // this function is called when a new table is created during a join because
    // the previous table wasn't correctly index, but the join failed so we have
    // to delete the new table
    function joinFailHandler(result) {
        var deferred = jQuery.Deferred();

        result = result || {};

        var tableName = result.tableName;
        // when no new table created
        if (!result.newTableCreated) {
            deferred.resolve();
        } else if (result.setMeta) {
            var tableId = xcHelper.getTableId(tableName);
            $('#inactiveTablesList').find('.tableInfo[data-id="' +
                                        tableId + '"]')
                                    .find('.addTableBtn')
                                    .click();

            RightSideBar.tableBulkAction("delete", TableType.InActive)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            XcalarDeleteTable(tableName)
            .then(deferred.resolve)
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    return (xcFunction);
}(jQuery, {}));
