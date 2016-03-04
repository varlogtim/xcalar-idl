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
        var frontColName = table.tableCols[colNum].getFronColName();
        var tablCols     = xcHelper.deepCopy(table.tableCols);
        var fltStr       = fltOptions.filterString;

        var msg = StatusMessageTStr.Filter + ': ' + frontColName;
        var msgId = StatusMessage.addMsg({
            "msg"      : msg,
            "operation": SQLOps.Filter
        });
        
        var newTableInfo = getNewTableInfo(tableName);
        var newTableName = newTableInfo.tableName;
        var newTableId   = newTableInfo.tableId;

        var worksheet = WSManager.getWSFromTable(tableId);
        var sqlOptions = {
            "operation"   : SQLOps.Filter,
            "tableName"   : tableName,
            "tableId"     : tableId,
            "colName"     : frontColName,
            "colNum"      : colNum,
            "newTableName": newTableName,
            "fltOptions"  : fltOptions
        };

        xcHelper.lockTable(tableId);

        XcalarFilter(fltStr, tableName, newTableName, sqlOptions)
        .then(function() {
            var options = {
                selectCol: colNum
            };
            return TblManager.refreshTable([newTableName], tablCols,
                                            [tableName], worksheet, options);
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, newTableId);
            KVStore.commit();
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
        var tableCol     = table.tableCols[colNum];
        var frontColName = tableCol.getFronColName();
        var backColName  = tableCol.getBackColName();

        var msg = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                    StatusMessageTStr.OnColumn + ": " + frontColName;
        var msgId = StatusMessage.addMsg({
            "msg"      : msg,
            "operation": SQLOps.Aggr
        });

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
                KVStore.commit();
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
        var pCol      = table.tableCols[colNum - 1];
        var backFieldName = pCol.getBackColName();
        var frontFieldName = pCol.getFronColName();

        var tablCols  = xcHelper.deepCopy(table.tableCols);
        var direction = (order === SortDirection.Forward) ? "ASC" : "DESC";
        var xcOrder;

        if (order === SortDirection.Backward) {
            xcOrder = XcalarOrderingT.XcalarOrderingDescending;
        } else {
            xcOrder = XcalarOrderingT.XcalarOrderingAscending;
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
                var options = {
                    selectCol: colNum - 1
                };
                // sort will filter out KNF, so it change the profile
                return TblManager.refreshTable([newTableName], tablCols,
                                                [tableName], worksheet, 
                                                options);
            })
            .then(function() {
                xcHelper.unlockTable(tableId, true);
                StatusMessage.success(msgId, false, newTableId);
                
                KVStore.commit();
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

        var lTable     = gTables[lTableId];
        var lTableName = lTable.tableName;
        var rTable     = gTables[rTableId];
        var rTableName = rTable.tableName;
        var newTableId = xcHelper.getTableId(newTableName);

        // joined table will in the current active worksheet.
        var worksheet = WSManager.getActiveWS();

        var msgId = StatusMessage.addMsg({
            "msg"      : StatusMessageTStr.Join,
            "operation": SQLOps.Join
        });

        xcHelper.lockTable(lTableId);
        xcHelper.lockTable(rTableId);

        // Step 1: check if it's a multi Join.
        // If yes, should do a map to concat all columns
        multiJoinCheck(lColNums, lTableId, rColNums, rTableId)
        .then(function(res) {
            var deferred1 = checkTableIndex(res.lColName, res.lTableId);
            var deferred2 = checkTableIndex(res.rColName, res.rTableId);

            // Step 2: index the left table and right table
            return xcHelper.when(deferred1, deferred2);
        })
        .then(function(lInexedTable, rIndexedTable) {
            var sqlOptions = {
                "operation"   : SQLOps.Join,
                "lTableName"  : lTableName,
                "lTableId"    : lTableId,
                "lColNums"    : lColNums,
                "rTableName"  : rTableName,
                "rTableId"    : rTableId,
                "rColNums"    : rColNums,
                "newTableName": newTableName,
                "joinStr"     : joinStr
            };
            // Step 3: join left table and right table
            return XcalarJoin(lInexedTable, rIndexedTable, newTableName,
                                joinType, sqlOptions);
        })
        .then(function() {
            var newTableCols = createJoinedColumns(lTable, rTable);
            return TblManager.refreshTable([newTableName], newTableCols,
                                        [lTableName, rTableName], worksheet);
        })
        .then(function() {
            xcHelper.unlockTable(lTableId, true);
            xcHelper.unlockTable(rTableId, true);

            StatusMessage.success(msgId, false, newTableId);
            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(lTableId);
            xcHelper.unlockTable(rTableId);

            Alert.error("Join Table Fails", error);
            StatusMessage.fail(StatusMessageTStr.JoinFailed, msgId);
            deferred.reject(error);
        });

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
            var progCol = table.getProgCol(groupByCols[i]);
            if (progCol != null) {
                groupByColTypes[i] = progCol.type;
            } else {
                console.error("Error Case!");
            }
        }

        var finalTableCols = getFinalGroupByCols(tableId, groupByCols,
                                                 newColName, isIncSample);

        var msgId = StatusMessage.addMsg({
            "msg"      : StatusMessageTStr.GroupBy + " " + operator,
            "operation": SQLOps.GroupBy
        });

        xcHelper.lockTable(tableId);
        var startTime = (new Date()).getTime();
        var focusOnTable = false;
        var startScrollPosition = $('#mainFrame').scrollLeft();

        getGroupbyIndexedTable()
        .then(function(resTable, resCol) {
            // table name may have changed after sort!
            indexedTable = resTable;
            indexedColName = resCol;

            // get name from src table
            groupbyTable = xcHelper.getTableName(tableName) + "-GB" +
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
                                        finalTableCols, isIncSample);
            } else {
                return promiseWrapper(groupbyTable);
            }
        })
        .then(function(nTableName) {
            finalTableName = nTableName;
            finalTableId = xcHelper.getTableId(finalTableName);
            var timeAllowed = 1000; // 
            var endTime = (new Date()).getTime();
            var elapsedTime = endTime - startTime;
            var timeSinceLastClick = endTime -
                                     gMouseEvents.getLastMouseDownTime();
            // we'll focus on table if its been less than timeAllowed OR
            // if the user hasn't clicked or scrolled
            if (elapsedTime < timeAllowed ||
                (timeSinceLastClick >= elapsedTime &&
                    ($('#mainFrame').scrollLeft() === startScrollPosition))) {
                focusOnTable = true;
            }
            var options = {"focusWorkspace": focusOnTable};

            return TblManager.refreshTable([finalTableName], finalTableCols,
                                            null, curWS, options);
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
            KVStore.commit();
            StatusMessage.success(msgId, focusOnTable, finalTableId);
            deferred.resolve(finalTableName);
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);
            Alert.error("GroupBy Failed", error);
            StatusMessage.fail(StatusMessageTStr.GroupByFailed, msgId);
            deferred.reject(error);
        });

        return (deferred.promise());

        function getGroupbyIndexedTable() {
            if (isMultiGroupby) {
                // multiGroupBy should first do a map and then index
                return checkMultiGroupByIndex(groupByCols, tableId);
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
            var options = {
                selectCol: colNum - 1
            };
            return TblManager.refreshTable([newTableName], tablCols,
                                            [tableName], worksheet, options);
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, newTableId);
            KVStore.commit();

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

    // export table
    // backColumns and frontColumns are arrays of column names
    xcFunction.exportTable = function(tableName, exportName, targetName,
                                      numCols, backColumns, frontColumns) {
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
            "columns"   : frontColumns
        };

        XcalarExport(tableName, exportName, targetName, numCols, backColumns,
                     frontColumns, sqlOptions)
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
            KVStore.commit();
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

            KVStore.commit();
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
                // Skip DATA and new column
                if (tableCols[i].isDATACol() || tableCols[i].isNewCol) {
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
        }

        // the groupBy result column
        var escapedName = newColName;
        if (newColName.indexOf('.') > -1) {
            escapedName = newColName.replace(/\./g, "\\\.");
        }

        var widthOptions = {
            defaultHeaderStyle: true
        };
        var width = getTextWidth($(), newColName, widthOptions);

        var newProgCol = ColManager.newCol({
            "name"    : newColName,
            "width"   : width,
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
                var progCol = table.getProgCol(colName) || {};

                if (colName.indexOf('.') > -1) {
                    // when the groupby col name has dot, it should be escsped
                    colName = colName.replace(/\./g, "\\\.");
                }
                
                finalCols[1 + i] = ColManager.newCol({
                    "name"    : progCol.name || colName,
                    "type"    : progCol.type || null,
                    "width"   : progCol.width || gNewCellWidth,
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
    }

    function getNewTableInfo(tableName) {
        var newId   = Authentication.getHashId().split("#")[1];
        var newName = tableName.split("#")[0] + "#" + newId;

        return { "tableName": newName, "tableId": newId };
    }

    // check if table has correct index
    function checkTableIndex(colName, tableId) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.tableName;
        var tableKey = table.keyName;

        checkIfNeedIndex(tableName)
        .then(function(shouldIndex, unsortedTable) {
            if (shouldIndex) {
                console.log(tableName, "not indexed correctly!");
                // XXX In the future,we can check if there are other tables that
                // are indexed on this key. But for now, we reindex a new table
                var newTableName = getNewTableInfo(tableName).tableName;

                var sqlOptions = {
                    "operation"   : SQLOps.CheckIndex,
                    "key"         : colName,
                    "tableName"   : unsortedTable,
                    "newTableName": newTableName,
                    "sorted"      : false
                };

                XcalarIndexFromTable(unsortedTable, colName, newTableName,
                                     XcalarOrderingT.XcalarOrderingUnordered,
                                     sqlOptions)
                .then(function() {
                    var tablCols = xcHelper.deepCopy(table.tableCols);
                    TblManager.setOrphanTableMeta(newTableName, tablCols);

                    deferred.resolve(newTableName, colName);
                })
                .fail(deferred.reject);
            } else {
                console.log(tableName, "indexed correctly!");
                deferred.resolve(unsortedTable, colName);
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());

        function checkIfNeedIndex() {
            var innerDeferred = jQuery.Deferred();
            var shouldIndex = false;

            getUnsortedTableName(tableName)
            .then(function(unsorted) {
                if (unsorted !== tableName) {
                    // this is sorted table, should index a unsorted one

                    // XXX this will add result count!!!
                    XcalarMakeResultSetFromTable(unsorted)
                    .then(function(resultSet) {
                        resultSet = resultSet || {};
                        var parentKey = resultSet.keyAttrHeader.name;

                        if (parentKey !== colName) {
                            if (parentKey !== tableKey) {
                                // if current is sorted, the parent should also
                                // index on the tableKey to remove "KNF"
                                var indexTable = getNewTableInfo(tableName).tableName;
                                var sqlOptions = {
                                    "operation"   : SQLOps.ProfileAction,
                                    "action"      : "index",
                                    "tableName"   : unsorted,
                                    "colName"     : tableKey,
                                    "newTableName": indexTable,
                                    "sorted"      : false
                                };

                                XcalarIndexFromTable(unsorted, tableKey, indexTable,
                                             XcalarOrderingT.XcalarOrderingUnordered,
                                             sqlOptions)
                                .then(function() {
                                    if (tableKey === colName) {
                                        // when the parent has right index
                                        shouldIndex = false;
                                    } else {
                                        // when parent need another index on colName
                                        shouldIndex = true;
                                    }

                                    innerDeferred.resolve(shouldIndex,
                                                            indexTable);
                                })
                                .fail(innerDeferred.reject);
                            } else {
                                // when parent is indexed on tableKey,
                                // still but need another index on colName
                                shouldIndex = true;
                                innerDeferred.resolve(shouldIndex, unsorted);
                            }
                        } else {
                            // because FAJS will automatically find parent table
                            // so if parent table is already index on colName
                            // no need to do another index
                            shouldIndex = false;
                            innerDeferred.resolve(shouldIndex, unsorted);
                        }
                    })
                    .fail(innerDeferred.reject);
                } else {
                    // this is the unsorted table
                    if (colName !== tableKey) {
                        shouldIndex = true;
                    }

                    innerDeferred.resolve(shouldIndex, tableName);
                }
            });

            return innerDeferred.promise();
        }
    }

    function checkMultiGroupByIndex(groupByCols, tableId) {
        var deferred = jQuery.Deferred();

        // From Jerene:
        // 1. merge multi columns into one using udf multiJoinModule
        // 2. sort this merged column
        var srcTable     = gTables[tableId];
        var srcTableName = srcTable.tableName;
        var srcTableCols = srcTable.tableCols;

        var mapTableName = getNewTableInfo(srcTableName).tableName;

        var indexedTableName;

        var mapStr = "default:multiJoin(" + groupByCols.join(", ") + ")";
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
            var tableCols = xcHelper.deepCopy(srcTableCols);
            TblManager.setOrphanTableMeta(mapTableName, tableCols);

            // index the mapped table
            indexedTableName = getNewTableInfo(mapTableName).tableName;

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
            var tableCols = xcHelper.deepCopy(srcTableCols);
            TblManager.setOrphanTableMeta(indexedTableName, tableCols);

            deferred.resolve(indexedTableName, groupByField);
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function extractColFromMap(groupbyTableName, colArray, colTypes,
                                indexedColName, finalTableCols, isIncSample)
    {
        var deferred = jQuery.Deferred();

        // XXX Jerene: Okay this is really dumb, but we have to keep mapping
        var mapStrStarter = "cut(" + indexedColName + ", ";
        var tableCols = extractColGetColHelper(finalTableCols, 0, isIncSample);

        TblManager.setOrphanTableMeta(groupbyTableName, tableCols);

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

            promises.push(extracColMapHelper.bind(this, args,
                                                tableCols, isLastTable));
            currTableName = newTableName;
        }

        var lastTableName = currTableName;

        chain(promises)
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

    function extracColMapHelper(mapArgs, tableCols, isLastTable) {
        var deferred = jQuery.Deferred();

        var colName = mapArgs.colName;
        var mapStr = mapArgs.mapString;
        var srcTableName = mapArgs.srcTableName;
        var newTableName = mapArgs.newTableName;

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
            if (!isLastTable) {
                // the last table will set meta data in xcFunctions.groupBy
                TblManager.setOrphanTableMeta(newTableName, tableCols);
            }

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function multiJoinCheck(lColNums, lTableId, rColNums, rTableId) {
        var deferred = jQuery.Deferred();
        var len = lColNums.length;

        // validation check
        xcHelper.assert((len === rColNums.length && len >= 1),
                        "Invalid parameters in join");

        var lTable = gTables[lTableId];
        var lCols  = lTable.tableCols;
        var lTableName = lTable.tableName;

        var rTable = gTables[rTableId];
        var rCols  = rTable.tableCols;
        var rTableName = rTable.tableName;

        if (len === 1) {
            // single join
            deferred.resolve({
                "lTableId"  : lTableId,
                "lTableName": lTableName,
                "lColName"  : lCols[lColNums[0]].getBackColName(),
                "rTableId"  : rTableId,
                "rTableName": rTableName,
                "rColName"  : rCols[rColNums[0]].getBackColName()
            });
        } else {
            // multi join

            // left cols
            var lNewInfo = getNewTableInfo(lTableName);
            var lNewName = lNewInfo.tableName;
            var lNewId   = lNewInfo.tableId;

            var lString  = 'default:multiJoin(';
            var lColName = xcHelper.randName("leftJoinCol");

            for (var i = 0; i <= len - 2; i++) {
                lString += lCols[lColNums[i]].getBackColName() + ", ";
            }
            lString += lCols[lColNums[len - 1]].getBackColName() + ")";

            // right cols
            var rNewInfo = getNewTableInfo(rTableName);
            var rNewName = rNewInfo.tableName;
            var rNewId   = rNewInfo.tableId;

            var rString  = 'default:multiJoin(';
            var rColName = xcHelper.randName("rightJoinCol");

            for (var i = 0; i <= len - 2; i++) {
                rString += rCols[rColNums[i]].getBackColName() + ", ";
            }

            rString += rCols[rColNums[len - 1]].getBackColName() + ")";

            var lSqlOption = {
                "operation"   : SQLOps.JoinMap,
                "srcTableName": lTableName,
                "newTableName": lNewName,
                "colName"     : lColName,
                "mapString"   : lString
            };

            var rSqlOptions = {
                "operation"   : SQLOps.JoinMap,
                "srcTableName": rTableName,
                "newTableName": rNewName,
                "colName"     : rColName,
                "mapString"   : rString
            };

            var deferred1 = XcalarMap(lColName, lString,
                                    lTableName, lNewName, lSqlOption);
            var deferred2 = XcalarMap(rColName, rString,
                                    rTableName, rNewName, rSqlOptions);

            xcHelper.when(deferred1, deferred2)
            .then(function() {
                var lTableCols = xcHelper.deepCopy(lCols);
                var rTableCols = xcHelper.deepCopy(rCols);
                TblManager.setOrphanTableMeta(lNewName, lTableCols);
                TblManager.setOrphanTableMeta(rNewName, rTableCols);

                deferred.resolve({
                    "lTableId"  : lNewId,
                    "lTableName": lNewName,
                    "lColName"  : lColName,
                    "rTableId"  : rNewId,
                    "rTableName": rNewName,
                    "rColName"  : rColName
                });
            })
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    // For xcFuncion.join, deepy copy of right table and left table columns
    function createJoinedColumns(lTable, rTable) {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var newTableCols = [];
        var lCols = xcHelper.deepCopy(lTable.tableCols);
        var rCols = xcHelper.deepCopy(rTable.tableCols);
        var index = 0;
        var dataCol;
        var colName;

        for (var i = 0; i < lCols.length; i++) {
            colName = lCols[i].name;

            if (colName === "DATA") {
                dataCol = lCols[i];
            } else {
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

    return (xcFunction);
}(jQuery, {}));
