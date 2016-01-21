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

        var table        = gTables[tableId];
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

        var worksheet = WSManager.getWSFromTable(tableId);
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

        xcHelper.lockTable(tableId);

        XcalarFilter(fltStr, tableName, newTableName, sqlOptions)
        .then(function() {
            return TblManager.refreshTable([newTableName], tablCols,
                                            [tableName], worksheet);
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, newTableId);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
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

        var table        = gTables[tableId];
        var tableName    = table.tableName;
        var frontColName = table.tableCols[colNum].name;
        var backColName  = table.tableCols[colNum].func.args[0];

        if (colNum === -1) {
            colNum = undefined;
        }

        var msg = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                    StatusMessageTStr.OnColumn + ": " + frontColName;
        var msgObj = {
            "msg"      : msg,
            "operation": SQLOps.Aggr
        };
        var msgId = StatusMessage.addMsg(msgObj);
        xcHelper.lockTable(tableId);

        var instr = 'This is the aggregate result for column "' +
                    frontColName + '". \r\n The aggregate operation is "' +
                    aggrOp + '".';

        var aggInfo = WSManager.checkAggInfo(tableId, backColName, aggrOp);
        if (aggInfo != null) {
            xcHelper.unlockTable(tableId);
            setTimeout(function() {
                Alert.show({
                    "title"  : "Aggregate: " + aggrOp,
                    "instr"  : instr,
                    "msg"    : '{"Value":' + aggInfo.value + "}",
                    "isAlert": true
                });
                StatusMessage.success(msgId, false, tableId);
                

                deferred.resolve();
            }, 500);
            
            return (deferred.promise());
        }

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
            setTimeout(function() {
                Alert.show({
                    "title"  : "Aggregate: " + aggrOp,
                    "instr"  : instr,
                    "msg"    : value,
                    "isAlert": true
                });
            }, 500);
            
            try {
                var val = JSON.parse(value);
                // dagName is the result table name for aggreagate
                var aggRes = {
                    "value"  : val.Value,
                    "dagName": dstDagName
                };

                WSManager.addAggInfo(tableId, backColName, aggrOp, aggRes);
                TableList.refreshAggTables();
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

        var table     = gTables[tableId];
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

            var worksheet = WSManager.getWSFromTable(tableId);
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

            xcHelper.lockTable(tableId);

            XcalarIndexFromTable(tableName, backFieldName, newTableName,
                                 xcOrder, sqlOptions)
            .then(function() {
                // sort do not change groupby stats of the table
                Profile.copy(tableId, newTableId);
                return TblManager.refreshTable([newTableName], tablCols,
                                                [tableName], worksheet);
            })
            .then(function() {
                StatusMessage.success(msgId, false, newTableId);
                xcHelper.unlockTable(tableId, true);
                commitToStorage();
                deferred.resolve();
            })
            .fail(function(error) {
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

        // joined table will in the current active worksheet.
        var worksheet = WSManager.getActiveWS();
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

            var lColNum = res.lColNum;
            var rColNum = res.rColNum;

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

                return TblManager.refreshTable([newTableName], newTableCols,
                                    [lTableName, rTableName], worksheet);
            })
            .then(function() {
                xcHelper.unlockTable(lTableId, true);
                xcHelper.unlockTable(rTableId, true);

                StatusMessage.success(msgId, false, newTableId);
                commitToStorage();
                deferred.resolve();
            })
            .fail(function(error) {
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
                                   indexedCols, aggColName,
                                   isIncSample, newColName)
    {
        var deferred = jQuery.Deferred();

        // Validation
        if (tableId < 0 || indexedCols.length < 1 || aggColName.length < 1) {
            deferred.reject("Invalid Parameters!");
            return (deferred.promise());
        }

        var table     = gTables[tableId];
        var tableName = table.tableName;
        var columns   = table.tableCols;
        var columnLen = columns.length;

        // current workshhet index
        var curWS = WSManager.getWSFromTable(tableId);

        var indexedTable;
        var indexedColName;

        var groupbyTable;
        var finalTableName;
        var finalTableId;

        // extract groupByCols and their types
        var groupByCols = indexedCols.split(",");
        var groupByColsLen = groupByCols.length;
        var isMultiGroupby = (groupByColsLen > 1);
        var groupByColTypes = [];

        for (var i = 0; i < groupByColsLen; i++) {
            groupByCols[i] = groupByCols[i].trim();

            for (var j = 0; j < columnLen; j++) {
                var progCol = columns[j];
                if (progCol.func.args[0] === groupByCols[i]) {
                    groupByColTypes[i] = progCol.type;
                    break;
                }
            }
        }

        var finalTableCols = getFinalGroupByCols(tableId, groupByCols,
                                                 newColName, isIncSample);

        var msgId = StatusMessage.addMsg({
            "msg"      : StatusMessageTStr.GroupBy + " " + operator,
            "operation": SQLOps.GroupBy
        });

        xcHelper.lockTable(tableId);

        getGroupbyIndexedTable()
        .then(function(result) {
            // table name may have changed after sort!
            indexedTable = result.tableName;

            if (isMultiGroupby) {
                if (result.indexCol != null) {
                    indexedColName = result.indexCol;
                } else {
                    throw "No index col";
                }
            } else {
                indexedColName = groupByCols[0];
            }

            // get name from src table
            groupbyTable = xcHelper.getTableName(tableName) + "-GroupBy";
            groupbyTable = xcHelper.randName(groupbyTable) +
                            Authentication.getHashId();

            var groupBySqlOptions = {
                "operation"   : SQLOps.GroupByAction,
                "action"      : "groupby",
                "operator"    : operator,
                "tableName"   : indexedTable,
                "aggColName"  : aggColName,
                "newColName"  : newColName,
                "isIncSample" : isIncSample,
                "groupbyTable": groupbyTable
            };

            return XcalarGroupBy(operator, newColName, aggColName,
                                indexedTable, groupbyTable,
                                isIncSample, groupBySqlOptions);
        })
        .then(function() {
            if (isMultiGroupby) {
                // multi group by should extract column from groupby table
                return extractColFromMap(groupbyTable, groupByCols,
                                        groupByColTypes, indexedColName,
                                        finalTableCols, isIncSample, curWS);
            } else {
                return promiseWrapper(groupbyTable);
            }
        })
        .then(function(nTableName) {
            finalTableName = nTableName;
            finalTableId = xcHelper.getTableId(finalTableName);

            return TblManager.refreshTable([finalTableName], finalTableCols,
                                            null, curWS);
        })
        .then(function() {
            SQL.add("Group By", {
                "operation"   : SQLOps.GroupBy,
                "operator"    : operator,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "indexedCols" : indexedCols,
                "aggColName"  : aggColName,
                "newColName"  : newColName,
                "isIncSample" : isIncSample,
                "newTableName": finalTableName
            });

            xcHelper.unlockTable(tableId);
            commitToStorage();
            StatusMessage.success(msgId, false, finalTableId);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("GroupBy Failed", error);
            StatusMessage.fail(StatusMessageTStr.GroupByFailed, msgId);
            deferred.reject(error);
        });

        return (deferred.promise());

        function getGroupbyIndexedTable() {
            if (isMultiGroupby) {
                // multiGroupBy should first do a map and then index
                return checkMultiGroupByIndex(groupByCols, tableId, curWS);
            } else {
                // single groupBy, check index
                return checkTableIndex(groupByCols[0], tableId);
            }
        }
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

        var worksheet = WSManager.getWSFromTable(tableId);
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

        xcHelper.lockTable(tableId);

        XcalarMap(fieldName, mapString, tableName, newTableName, sqlOptions)
        .then(function() {
            var tablCols = xcHelper.mapColGenerate(colNum, fieldName, mapString,
                                                    table.tableCols, mapOptions);

            // map do not change groupby stats of the table
            Profile.copy(tableId, newTableId);

            return TblManager.refreshTable([newTableName], tablCols,
                                            [tableName], worksheet);
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, newTableId);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            Alert.error("Map Failed", error);
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
        var lTable     = gTables[lTableId];
        var lTableName = lTable.tableName;
        var lFieldName = lOptions.fieldName;
        var lMapString = lOptions.mapString;

        var rColNum    = rOptions.colNum;
        var rTableId   = rOptions.tableId;
        var rTable     = gTables[rTableId];
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

        var lWorksheet = WSManager.getWSFromTable(lTableId);
        var rWorksheet = WSManager.getWSFromTable(rTableId);

        var lNewInfo = getNewTableInfo(lTableName);
        var lNewName = lNewInfo.tableName;
        var lNewId   = lNewInfo.tableId;

        var rNewInfo = getNewTableInfo(rTableName);
        var rNewName = rNewInfo.tableName;
        // var rNewId   = rNewInfo.tableId;

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

        xcHelper.lockTable(lTableId);
        xcHelper.lockTable(rTableId);

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

            var refreshOptions = {"lockTable": true};
            return TblManager.refreshTable([lNewName], lTableCols, [lTableName],
                                            lWorksheet, refreshOptions);
        })
        .then(function() {
            var rTableCols = xcHelper.mapColGenerate(rColNum, rFieldName,
                                        rMapString, rTable.tableCols, rOptions);
            var refreshOptions = {"lockTable": true};
            return TblManager.refreshTable([rNewName], rTableCols, [rTableName],
                                            rWorksheet, refreshOptions);
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
            if (error && (error.status === StatusT.StatusDsODBCTableExists ||
                error.status === StatusT.StatusExist) &&
                $('#exportName:visible').length !== 0) {
                StatusBox.show(ErrorTextTStr.NameInUse, $('#exportName'), true);
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

            TableList.renameTable(tableId, newTableName);
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

    function getFinalGroupByCols(tableId, groupByCols, newColName, isIncSample) {
        var table = gTables[tableId];
        var tableCols = table.tableCols;

        var numTableCols = tableCols.length;
        var numGroupByCols = groupByCols.length;
        var newColIndex = 1;

        if (isIncSample) {
            // getIndexOfFirstGroupByCol
            for (var i = 0; i < numTableCols; i++) {
                for (var j = 0; j < numGroupByCols; j++) {
                    if (tableCols[i].func.args &&
                        tableCols[i].func.args[0] === groupByCols[j])
                    {
                        newColIndex = i + 1;
                        break;
                    }
                }
            }
        }

        // the groupBy result column
        var escapedName = newColName;
        if (newColName.indexOf('.') > -1) {
            escapedName = newColName.replace(/\./g, "\\\.");
        }

        var newProgCol = ColManager.newCol({
            "name"    : newColName,
            "width"   : gNewCellWidth,
            "isNewCol": false,
            "userStr" : '"' + newColName + '" = pull(' + escapedName + ')',
            "func"    : {
                "func": "pull",
                "args": [escapedName]
            }
        });

        var finalCols;
        if (isIncSample) {
            // Note that if include sample,
            // a.b should not be escaped to a\.b
            finalCols = xcHelper.deepCopy(tableCols);
            finalCols.splice(newColIndex - 1, 0, newProgCol);

        } else {
            finalCols = [newProgCol];
            // Pull out each individual groupByCols
            for (var i = 0; i < numGroupByCols; i++) {
                var colName = groupByCols[i];
                var col = getCol(colName) || {};

                if (colName.indexOf('.') > -1) {
                    // when the groupby col name has dot, it should be escsped
                    colName = colName.replace(/\./g, "\\\.");
                }

                finalCols[1 + i] = ColManager.newCol({
                    "name"    : col.name || colName,
                    "type"    : col.type || null,
                    "width"   : gNewCellWidth,
                    "isNewCol": false,
                    "userStr" : '"' + colName + '" = pull(' + colName + ')',
                    "func"    : {
                        "func": "pull",
                        "args": [colName]
                    }
                });
            }

            var $dataCol = $("#xcTable-" + tableId).find('th.dataCol');
            var dataColNum = xcHelper.parseColNum($dataCol) - 1;

            finalCols[1 + numGroupByCols] = xcHelper.deepCopy(tableCols[dataColNum]);
        }

        return finalCols;

        function getCol(backColName) {
            for (var c = 0; c < numTableCols; c++) {
                if (tableCols[c].func.args &&
                    tableCols[c].func.args[0] === backColName) {
                    return tableCols[c];
                }
            }
            return null;
        }
    }

    function getNewTableInfo(tableName) {
        var newId   = Authentication.getHashId().split("#")[1];
        var newName = tableName.split("#")[0] + "#" + newId;

        return { "tableName": newName, "tableId": newId };
    }

    // check if table has correct index
    function checkTableIndex(colName, tableId) {
        var deferred = jQuery.Deferred();
        var table     = gTables[tableId];
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
                var wsId = WSManager.getWSFromTable(tableId);
                // must add to worksheet before async call
                WSManager.addTable(newTableId, wsId);

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

                    TblManager.setgTable(newTableName, tablCols);
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

    function checkMultiGroupByIndex(groupByCols, tableId, curWS) {
        var deferred = jQuery.Deferred();

        // From Jerene:
        // 1. merge multi columns into one using udf multiJoinModule
        // 2. sort this merged column
        var srcTable     = gTables[tableId];
        var srcTableName = srcTable.tableName;
        var srcTableCols = srcTable.tableCols;

        var mapTableInfo = getNewTableInfo(srcTableName);
        var mapTableName = mapTableInfo.tableName;
        var mapTableId   = mapTableInfo.tableId;

        var indexedTableName;
        var indexedTableId;

        var mapStr = "multiJoinModule:multiJoin(" + groupByCols.join(", ") + ")";
        var groupByField = xcHelper.randName("multiGroupBy", 5);

        var sqlOptions = {
            "operation"   : SQLOps.GroupByAction,
            "action"      : "multiMap",
            "srcTableName": srcTableName,
            "newTableName": mapTableName,
            "colName"     : groupByField,
            "mapString"   : mapStr
        };

        XcalarMap(groupByField, mapStr, srcTableName, mapTableName, sqlOptions)
        .then(function() {
            // add mapped table meta
            WSManager.addTable(mapTableId, curWS);
            var tableCols = xcHelper.deepCopy(srcTableCols);
            return TblManager.setgTable(mapTableName, tableCols);
        })
        .then(function() {
            // inactive the mapped table and add info in right side bar
            setIndexedTableMeta({
                "newTableCreated": true,
                "setMeta"        : false,
                "tableName"      : mapTableName,
                "tableId"        : mapTableId
            });

            // index the mapped table
            var indexedTableInfo = getNewTableInfo(mapTableName);
            indexedTableName = indexedTableInfo.tableName;
            indexedTableId = indexedTableInfo.tableId;

            sqlOptions = {
              "operation"   : SQLOps.GroupByAction,
              "action"      : "index",
              "tableName"   : mapTableName,
              "key"         : groupByField,
              "newTableName": indexedTableName,
              "sorted"      : false
            };

            return XcalarIndexFromTable(mapTableName, groupByField,
                                        indexedTableName,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        sqlOptions);
        })
        .then(function() {
            // add indexed table meta
            WSManager.addTable(indexedTableId, curWS);
            var tableCols = xcHelper.deepCopy(srcTableCols);
            return TblManager.setgTable(indexedTableName, tableCols);
        })
        .then(function() {
            // inactive the reIndexed table and add info in right side bar
            setIndexedTableMeta({
                "newTableCreated": true,
                "setMeta"        : false,
                "tableName"      : indexedTableName,
                "tableId"        : indexedTableId
            });

            deferred.resolve({
                "tableName": indexedTableName,
                "indexCol" : groupByField
            });
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function extractColFromMap(groupbyTableName, colArray, colTypes,
                                indexedColName, finalTableCols,
                                isIncSample, curWS)
    {
        var deferred = jQuery.Deferred();

        // XXX Jerene: Okay this is really dumb, but we have to keep mapping
        var mapStrStarter = "cut(" + indexedColName + ", ";
        var tableCols = extractColGetColHelper(finalTableCols, 0, isIncSample);
        var lastTableName;

        TblManager.setgTable(groupbyTableName, tableCols)
        .then(function() {
            var groubyTableId = xcHelper.getTableId(groupbyTableName);

            WSManager.addTable(groubyTableId, curWS);
            setIndexedTableMeta({
                "newTableCreated": true,
                "setMeta"        : false,
                "tableName"      : groupbyTableName,
                "tableId"        : groubyTableId
            });

            var promises = [];
            var currTableName = groupbyTableName;

            for (var i = 0; i < colArray.length; i++) {
                var mapStr = mapStrStarter + (i + 1) + ", " + '".Xc."' + ")";
                // convert type
                // XXX FIXME if need more other types
                if (colTypes[i] === "integer") {
                    mapStr = "int(" + mapStr + ")";
                } else if (colTypes[i] === "float") {
                    mapStr = "float(" + mapStr + ")";
                } else if (colTypes[i] === "boolean") {
                    mapStr = "bool(" + mapStr + ")";
                }

                var newTableName = getNewTableInfo(currTableName).tableName;
                var isLastTable = (i === colArray.length - 1);
                tableCols = extractColGetColHelper(finalTableCols, i + 1,
                                                    isIncSample);
                var args = {
                    "colName"     : colArray[i],
                    "mapString"   : mapStr,
                    "srcTableName": currTableName,
                    "newTableName": newTableName
                };

                promises.push(extracColMapHelper.bind(this, args, curWS,
                                                    tableCols, isLastTable));
                currTableName = newTableName;
            }

            lastTableName = currTableName;

            return chain(promises);
        })
        .then(function() {
            deferred.resolve(lastTableName);
        })
        .fail(deferred.reject);

        return (deferred.promise());
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

    function extracColMapHelper(mapArgs, curWS, tableCols, isLastTable) {
        var deferred = jQuery.Deferred();

        var colName = mapArgs.colName;
        var mapStr = mapArgs.mapString;
        var srcTableName = mapArgs.srcTableName;
        var newTableName = mapArgs.newTableName;
        var newTableId = xcHelper.getTableId(newTableName);

        var sqlOptions = {
            "operation"   : SQLOps.GroupByAction,
            "action"      : "extract column",
            "srcTableName": srcTableName,
            "newTableName": newTableName,
            "colName"     : colName,
            "mapString"   : mapStr
        };

        XcalarMap(colName, mapStr, srcTableName, newTableName, sqlOptions)
        .then(function() {
            if (isLastTable) {
                // this is the last table, we will
                // set the meta data in xcFunctions.groupBy
                return promiseWrapper(null);
            } else {
                WSManager.addTable(newTableId, curWS);
                return TblManager.setgTable(newTableName, tableCols);
            }
        })
        .then(function() {
            if (isLastTable) {
                // this is the last table, we will
                // set the meta data in xcFunctions.groupBy
                deferred.resolve();
            } else {
                // inactive the table
                setIndexedTableMeta({
                    "newTableCreated": true,
                    "setMeta"        : false,
                    "tableName"      : newTableName,
                    "tableId"        : newTableId
                });
                deferred.resolve();
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function joinCheck(lColNums, lTableId, rColNums, rTableId) {
        var deferred = jQuery.Deferred();
        var len = lColNums.length;

        // validation check
        xcHelper.assert((len === rColNums.length && len >= 1),
                        "Invalid parameters in join");

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

        var table = gTables[tableResult.tableId];
        table.beInActive();
        TableList.addTables([table], IsActive.Inactive);

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
                ++index;
            }
        }

        for (var i = 0; i < rCols.length; i++) {
            colName = rCols[i].name;

            if (colName !== "DATA" && !(colName in rRemoved)) {
                newTableCols[index] = rCols[i];
                ++index;
            }
        }

        // now newTablCols.length is differenet from len
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

            TableList.tableBulkAction("delete", TableType.InActive)
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
