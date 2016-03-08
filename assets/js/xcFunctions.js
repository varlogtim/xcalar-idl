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

        var newTableInfo = getNewTableInfo(tableName);
        var newTableName = newTableInfo.tableName;
        var newTableId   = newTableInfo.tableId;

        var worksheet = WSManager.getWSFromTable(tableId);


        var sql = {
            "operation"   : SQLOps.Filter,
            "tableName"   : tableName,
            "tableId"     : tableId,
            "colName"     : frontColName,
            "colNum"      : colNum,
            "newTableName": newTableName,
            "fltOptions"  : fltOptions
        };
        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.Filter + ': ' + frontColName,
            "operation": SQLOps.Filter,
            "sql"      : sql
        });

        xcHelper.lockTable(tableId);

        XcalarFilter(fltStr, tableName, newTableName, txId)
        .then(function() {
            var options = {"selectCol": colNum};
            return TblManager.refreshTable([newTableName], tablCols,
                                            [tableName], worksheet, options);
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            Transaction.done(txId, {"msgTable": newTableId});
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.FilterFailed,
                "error"  : error
            });

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

        xcHelper.lockTable(tableId);

        var title = xcHelper.replaceMsg(AggTStr.AggTitle, {"op": aggrOp});
        var instr = xcHelper.replaceMsg(AggTStr.AggInstr, {
            "col": frontColName,
            "op" : aggrOp
        });

        var aggInfo = WSManager.checkAggInfo(tableId, backColName, aggrOp);
        if (aggInfo != null) {
            xcHelper.unlockTable(tableId);
            setTimeout(function() {
                var alertMsg = xcHelper.replaceMsg(AggTStr.AggMsg, {
                    "val": aggInfo.value
                });
                Alert.show({
                    "title"  : title,
                    "instr"  : instr,
                    "msg"    : alertMsg,
                    "isAlert": true
                });

                deferred.resolve();
            }, 500);

            return (deferred.promise());
        }

        var sql = {
            "operation": SQLOps.Aggr,
            "tableName": tableName,
            "tableId"  : tableId,
            "colName"  : frontColName,
            "colNum"   : colNum,
            "aggrOp"   : aggrOp
        };
        var msg = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                  StatusMessageTStr.OnColumn + ": " + frontColName;
        var txId = Transaction.start({
            "msg"      : msg,
            "operation": SQLOps.Aggr,
            "sql"      : sql
        });

        XcalarAggregate(backColName, tableName, aggrOp, txId)
        .then(function(value, dstDagName) {
            try {
                var val = JSON.parse(value);
                // dagName is the result table name for aggreagate
                var aggRes = {
                    "value"  : val.Value,
                    "dagName": dstDagName
                };

                WSManager.addAggInfo(tableId, backColName, aggrOp, aggRes);
                TableList.refreshAggTables();
            } catch (error) {
                console.error(error);
            }

            Transaction.done(txId, {"msgTable": tableId});

            // show result in alert modal
            Alert.show({
                "title"  : title,
                "instr"  : instr,
                "msg"    : value,
                "isAlert": true
            });

            deferred.resolve();
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.AggregateFailed,
                "error"  : error
            });

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

                    var mgs = xcHelper.replaceMsg(IndexTStr.SortedErr, {
                        "order": textOrder
                    });
                    Alert.error(IndexTStr.Sorted, mgs);
                    deferred.reject("Already sorted on current column");
                    return;
                }
            }

            var newTableInfo = getNewTableInfo(tableName);
            var newTableName = newTableInfo.tableName;
            var newTableId   = newTableInfo.tableId;

            var worksheet = WSManager.getWSFromTable(tableId);
            var sql = {
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
            var txId = Transaction.start({
                "msg"      : StatusMessageTStr.Sort + " " + frontFieldName,
                "operation": SQLOps.Sort,
                "sql"      : sql
            });

            xcHelper.lockTable(tableId);

            XcalarIndexFromTable(tableName, backFieldName, newTableName,
                                 xcOrder, txId)
            .then(function() {
                var options = {"selectCol": colNum - 1};
                // sort will filter out KNF, so it change the profile
                return TblManager.refreshTable([newTableName], tablCols,
                                                [tableName], worksheet,
                                                options);
            })
            .then(function() {
                xcHelper.unlockTable(tableId, true);

                Transaction.done(txId, {"msgTable": newTableId});

                deferred.resolve();
            })
            .fail(function(error) {
                xcHelper.unlockTable(tableId);

                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.SortFailed,
                    "error"  : error
                });
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
        var lTablePos  = WSManager.getTableRelativePosition(lTableId);
        var rTablePos  = WSManager.getTableRelativePosition(rTableId);

        // joined table will in the current active worksheet.
        var worksheet = WSManager.getActiveWS();

        var sql = {
            "operation"   : SQLOps.Join,
            "lTableName"  : lTableName,
            "lTableId"    : lTableId,
            "lTablePos"   : lTablePos,
            "lColNums"    : lColNums,
            "rTableName"  : rTableName,
            "rTableId"    : rTableId,
            "rTablePos"   : rTablePos,
            "rColNums"    : rColNums,
            "newTableName": newTableName,
            "joinStr"     : joinStr,
            "worksheet"   : worksheet,
            "htmlExclude" : ["lTablePos", "rTablePos", "worksheet"]
        };

        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.Join,
            "operation": SQLOps.Join,
            "sql"      : sql
        });

        xcHelper.lockTable(lTableId);
        xcHelper.lockTable(rTableId);

        // Step 1: check if it's a multi Join.
        // If yes, should do a map to concat all columns
        multiJoinCheck(lColNums, lTableId, rColNums, rTableId, txId)
        .then(function(res) {
            var deferred1 = checkTableIndex(res.lColName, res.lTableId, txId);
            var deferred2 = checkTableIndex(res.rColName, res.rTableId, txId);

            // Step 2: index the left table and right table
            return xcHelper.when(deferred1, deferred2);
        })
        .then(function(lInexedTable, rIndexedTable) {
            // Step 3: join left table and right table
            return XcalarJoin(lInexedTable, rIndexedTable, newTableName,
                                joinType, txId);
        })
        .then(function() {
            var newTableCols = createJoinedColumns(lTable, rTable);
            return TblManager.refreshTable([newTableName], newTableCols,
                                        [lTableName, rTableName], worksheet);
        })
        .then(function() {
            xcHelper.unlockTable(lTableId, true);
            xcHelper.unlockTable(rTableId, true);

            Transaction.done(txId, {"msgTable": newTableId});

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(lTableId);
            xcHelper.unlockTable(rTableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.JoinFailed,
                "error"  : error
            });
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

        var txId = Transaction.start({
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

            return XcalarGroupBy(operator, newColName, aggColName,
                                indexedTable, groupbyTable,
                                isIncSample, txId);
        })
        .then(function() {
            if (isMultiGroupby) {
                // multi group by should extract column from groupby table
                return extractColFromMap(groupbyTable, groupByCols,
                                        groupByColTypes, indexedColName,
                                        finalTableCols, isIncSample, txId);
            } else {
                return promiseWrapper(groupbyTable);
            }
        })
        .then(function(nTableName) {
            finalTableName = nTableName;
            finalTableId = xcHelper.getTableId(finalTableName);
            var timeAllowed = 1000;
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
            xcHelper.unlockTable(tableId);

            var sql = {
                "operation"   : SQLOps.GroupBy,
                "operator"    : operator,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "indexedCols" : indexedCols,
                "aggColName"  : aggColName,
                "newColName"  : newColName,
                "isIncSample" : isIncSample,
                "newTableName": finalTableName
            };

            Transaction.done(txId, {
                "msgTable"      : finalTableId,
                "sql"           : sql,
                "noNotification": focusOnTable
            });

            deferred.resolve(finalTableName);
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            var sql = {
                "operation"   : SQLOps.GroupBy,
                "operator"    : operator,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "indexedCols" : indexedCols,
                "aggColName"  : aggColName,
                "newColName"  : newColName,
                "isIncSample" : isIncSample,
                "newTableName": finalTableName
            };

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.GroupByFailed,
                "error"  : error,
                "sql"    : sql
            });

            deferred.reject(error);
        });

        return (deferred.promise());

        function getGroupbyIndexedTable() {
            if (isMultiGroupby) {
                // multiGroupBy should first do a map and then index
                return checkMultiGroupByIndex(groupByCols, tableId, txId);
            } else {
                // single groupBy, check index
                return checkTableIndex(groupByCols[0], tableId, txId);
            }
        }
    };

    // map a column
    xcFunction.map = function(colNum, tableId, fieldName, mapString, mapOptions) {
        var deferred = jQuery.Deferred();

        mapOptions = mapOptions || {};

        var table = gTables[tableId];
        var tableName = table.tableName;
        var newTableInfo = getNewTableInfo(tableName);
        var newTableName = newTableInfo.tableName;
        var newTableId = newTableInfo.tableId;

        var worksheet = WSManager.getWSFromTable(tableId);
        var sql = {
            "operation"   : SQLOps.Map,
            "tableName"   : tableName,
            "tableId"     : tableId,
            "newTableName": newTableName,
            "colNum"      : colNum,
            "fieldName"   : fieldName,
            "mapString"   : mapString,
            "mapOptions"  : mapOptions
        };
        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.Map + " " + fieldName,
            "operation": SQLOps.Map,
            "sql"      : sql
        });

        xcHelper.lockTable(tableId);

        XcalarMap(fieldName, mapString, tableName, newTableName, txId)
        .then(function() {
            var tablCols = xcHelper.mapColGenerate(colNum, fieldName, mapString,
                                                    table.tableCols, mapOptions);

            // map do not change groupby stats of the table
            Profile.copy(tableId, newTableId);
            var options = {"selectCol": colNum - 1};
            return TblManager.refreshTable([newTableName], tablCols,
                                            [tableName], worksheet, options);
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            Transaction.done(txId, {"msgTable": newTableId});

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.MapFailed,
                "error"  : error
            });

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
        // var location = hostname + ":/var/tmp/xcalar/" + exportName;

        var sql = {
            "operation"   : SQLOps.ExportTable,
            "tableName"   : tableName,
            "exportName"  : exportName,
            "targetName"  : targetName,
            "numCols"     : numCols,
            "frontColumns": frontColumns,
            "backColumns" : backColumns,
            "revertable"  : false
        };
        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.ExportTable + ": " + tableName,
            "operation": SQLOps.ExportTable,
            "sql"      : sql
        });

        XcalarExport(tableName, exportName, targetName, numCols, backColumns,
                     frontColumns, txId)
        .then(function() {
            var instr = xcHelper.replaceMsg(ExportTStr.SuccessInstr, {
                "table"   : tableName,
                "location": targetName,
                "file"    : exportName
            });
            var msg = xcHelper.replaceMsg(ExportTStr.SuccessMsg, {
                "file"    : exportName,
                "location": targetName
            });

            Alert.show({
                "title"     : ExportTStr.Success,
                "msg"       : msg,
                "instr"     : instr,
                "isAlert"   : true,
                "isCheckBox": true,
                "onClose"   : function() {
                    $('#alertContent').removeClass('leftalign');
                }
            });
            $('#alertContent').addClass('leftAlign');
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(tableName)
            });

            deferred.resolve();
        })
        .fail(function(error) {
            var noAlert;
            // if error is that export name already in use and modal is still
            // visible, then show a statusbox next to the name field
            if (error && (error.status === StatusT.StatusDsODBCTableExists ||
                error.status === StatusT.StatusExist) &&
                $('#exportName:visible').length !== 0) {
                StatusBox.show(ErrTStr.NameInUse, $('#exportName'), true);
                noAlert = true;
            } else {
                noAlert = false;
            }

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ExportFailed,
                "error"  : error,
                "noAlert": noAlert
            });

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

        var sql = {
            "operation"   : SQLOps.RenameTable,
            "tableId"     : tableId,
            "oldTableName": oldTableName,
            "newTableName": newTableName
        };
        var txId = Transaction.start({
            "operation": SQLOps.RenameTable,
            "sql"      : sql
        });

        // not lock table is the operation is short
        var lockTimer = setTimeout(function() {
            xcHelper.lockTable(tableId);
        }, 500);

        var newTableNameId = xcHelper.getTableId(newTableName);
        if (newTableNameId !== tableId) {
            console.warn("Table Id not consistent");
            newTableName = xcHelper.getTableName(newTableName) + "#" + tableId;
        }

        XcalarRenameTable(oldTableName, newTableName, txId)
        .then(function() {
            // does renames for gTables, rightsidebar, dag
            table.tableName = newTableName;

            TableList.renameTable(tableId, newTableName);
            Dag.renameAllOccurrences(oldTableName, newTableName);

            updateTableHeader(tableId);

            Transaction.done(txId);
            deferred.resolve(newTableName);
        })
        .fail(function(error) {
            console.error("Rename Fails!". error);

            Transaction.fail(txId, {
                "noAlert": noAlert,
                "error"  : error
            });
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
            var dataCol = tableCols[dataColNum];
            dataCol.width = 'auto';

            finalCols[1 + numGroupByCols] = xcHelper.deepCopy(dataCol);
        }

        return finalCols;
    }

    function getNewTableInfo(tableName) {
        var newId   = Authentication.getHashId().split("#")[1];
        var newName = tableName.split("#")[0] + "#" + newId;

        return { "tableName": newName, "tableId": newId };
    }

    // check if table has correct index
    function checkTableIndex(colName, tableId, txId) {
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

                XcalarIndexFromTable(unsortedTable, colName, newTableName,
                                     XcalarOrderingT.XcalarOrderingUnordered,
                                     txId)
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

                                XcalarIndexFromTable(unsorted, tableKey, indexTable,
                                             XcalarOrderingT.XcalarOrderingUnordered,
                                             txId)
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

    function checkMultiGroupByIndex(groupByCols, tableId, txId) {
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

        XcalarMap(groupByField, mapStr, srcTableName, mapTableName, txId)
        .then(function() {
            // add mapped table meta
            var tableCols = xcHelper.deepCopy(srcTableCols);
            TblManager.setOrphanTableMeta(mapTableName, tableCols);

            // index the mapped table
            indexedTableName = getNewTableInfo(mapTableName).tableName;

            return XcalarIndexFromTable(mapTableName, groupByField,
                                        indexedTableName,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        txId);
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
                            indexedColName, finalTableCols, isIncSample, txId)
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
                                            tableCols, isLastTable, txId));
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

        return (deferred.promise());
    }

    function multiJoinCheck(lColNums, lTableId, rColNums, rTableId, txId) {
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

            var deferred1 = XcalarMap(lColName, lString,
                                    lTableName, lNewName, txId);
            var deferred2 = XcalarMap(rColName, rString,
                                    rTableName, rNewName, txId);

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
