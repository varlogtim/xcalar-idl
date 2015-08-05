window.xcFunction = (function ($, xcFunction) {
    var joinLookUp = {
        "Inner Join"      : JoinOperatorT.InnerJoin,
        "Left Outer Join" : JoinOperatorT.LeftOuterJoin,
        "Right Outer Join": JoinOperatorT.RightOuterJoin,
        "Full Outer Join" : JoinOperatorT.FullOuterJoin
    };

    // filter table column
    xcFunction.filter = function (colNum, tableId, options) {
        var deferred = jQuery.Deferred();

        var table        = xcHelper.getTableFromId(tableId);
        var tableName    = table.tableName;
        var frontColName = table.tableCols[colNum].name;
        var backColName  = table.tableCols[colNum].func.args[0];
        var tablCols     = xcHelper.deepCopy(table.tableCols);
        var operator     = options.operator;
        var fltStr       = options.filterString;
        var newTableName = getNewTableName(tableName);

        var msg = StatusMessageTStr.Filter + ': ' + frontColName;
        var msgObj = {
            "msg"      : msg,
            "operation": "filter",
            "tableName": newTableName
        };
        var msgId = StatusMessage.addMsg(msgObj);
        
        // must add table to worksheet before async call
        WSManager.addTable(newTableName);

        xcHelper.lockTable(tableId);

        var sqlOptions = {
                "operation"   : "filter",
                "tableName"   : tableName,
                "colName"     : frontColName,
                "backColName" : backColName,
                "colIndex"    : colNum,
                "operator"    : operator,
                "value"       : fltStr,
                "newTableName": newTableName,
                "filterString": fltStr};

        XcalarFilterHelper(fltStr, tableName, newTableName, sqlOptions)
        .then(function() {
            setIndex(newTableName, tablCols);
            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            WSManager.removeTable(newTableName);
            xcHelper.unlockTable(tableId);
            Alert.error("Filter Columns Fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msgId);

            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // aggregate table column
    xcFunction.aggregate = function (colNum, tableId, aggrOp) {
        var table        = xcHelper.getTableFromId(tableId);
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
            "operation": "aggregate",
            "tableName": tableName
        };
        var msgId = StatusMessage.addMsg(msgObj);
        xcHelper.lockTable(tableId);

        var sqlOptions = {
            "operation": "aggregate",
            "tableName": tableName,
            "colName"  : frontColName,
            "colIndex" : colNum,
            "operator" : aggrOp
        };
        XcalarAggregate(backColName, tableName, aggrOp, sqlOptions)
        .then(function(value){
            // show result in alert modal
            var instr = 'This is the aggregate result for column "' +
                        frontColName + '". \r\n The aggregate operation is "' +
                        aggrOp + '".';
            // add alert
            Alert.show({
                "title"  : "Aggregate: " + aggrOp,
                "instr"  : instr,
                "msg"    : value,
                "isAlert": true
            });

            StatusMessage.success(msgId);
        })
        .fail(function(error) {
            Alert.error("Aggregate fails", error);
            StatusMessage.fail(StatusMessageTStr.AggregateFailed, msgId);
        })
        .always(function(){
            xcHelper.unlockTable(tableId);
        });

        return (true);
    };

    // sort table column
    xcFunction.sort = function (colNum, tableId, order) {
        var table     = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;
        var tablCols  = xcHelper.deepCopy(table.tableCols);
        var pCol      = tablCols[colNum - 1];
        var direction = (order === SortDirection.Forward) ? "ASC" : "DESC";
        var backFieldName;
        var frontFieldName;
        var newTableName = getNewTableName(tableName);

        switch (pCol.func.func) {
            case ("pull"):
                // Pulled directly, so just sort by this
                frontFieldName = pCol.name;
                backFieldName = pCol.func.args[0];
                break;
            default:
                console.error("Cannot sort a col derived " +
                              "from unsupported func");
                return;
        }

        var msg = StatusMessageTStr.Sort + " " + frontFieldName;
        var msgObj = {
            "msg"      : msg,
            "operation": "sort",
            "tableName": newTableName
        };
        var msgId = StatusMessage.addMsg(msgObj);

        // XXX Cheng must add to worksheet before async call
        WSManager.addTable(newTableName);
        xcHelper.lockTable(tableId);

        var sqlOptions = {
                "operation"   : "sort",
                "tableName"   : tableName,
                "key"         : frontFieldName,
                "direction"   : direction,
                "newTableName": newTableName};
                 
        XcalarIndexFromTable(tableName, backFieldName, newTableName, sqlOptions)
        .then(function() {
            // sort do not change groupby stats of the table
            var newTableId = xcHelper.getTableId(newTableName);
            STATSManager.copy(tableId, newTableId);

            setIndex(newTableName, tablCols, null, null);
            
            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            StatusMessage.success(msgId);
            xcHelper.unlockTable(tableId, true);
            commitToStorage();
        })
        .fail(function(error) {
            WSManager.removeTable(newTableName);
            xcHelper.unlockTable(tableId);
            Alert.error("Sort Rows Fails", error);
            StatusMessage.fail(StatusMessageTStr.SortFailed, msgId);
        });
    };

    // join two tables
    xcFunction.join = function (lColNum, lTableId, rColNum, rTableId,
                                joinStr, newTableName, lRemoved, rRemoved)
    {
        var deferred = jQuery.Deferred();
        var joinType = joinLookUp[joinStr];

        if (joinType == null) {
            console.error("Incorrect join type!");
            deferred.reject("Incorrect join type!");
            return (deferred.promise());
        }

        console.info("leftColNum", lColNum,
                    "leftTableId", lTableId,
                    "rightColNum", rColNum,
                    "rightTableId", rTableId,
                    "joinStr", joinStr,
                    "newTableName", newTableName);

        var lTable        = xcHelper.getTableFromId(lTableId);
        var lTableName    = lTable.tableName;
        var lColName      = lTable.tableCols[lColNum].func.args[0];
        var lFrontColName = lTable.tableCols[lColNum].name;

        var rTable        = xcHelper.getTableFromId(rTableId);
        var rTableName    = rTable.tableName;
        var rColName      = rTable.tableCols[rColNum].func.args[0];
        var rFrontColName = rTable.tableCols[rColNum].name;

        var lSrcName;
        var rSrcName;

        var lTableResult;
        var rTableResult;

        var msg = StatusMessageTStr.Join;
        var msgObj = {
            "msg"      : msg,
            "operation": "join",
            "tableName": newTableName
        };
        var msgId = StatusMessage.addMsg(msgObj);

        xcHelper.lockTable(lTableId);
        xcHelper.lockTable(rTableId);

        WSManager.addTable(newTableName);
        // check left table index
        parallelIndex(lColName, lTableId, rColName, rTableId)
        .then(function(lResult, rResult) {
            lTableResult = lResult;
            lSrcName = lResult.tableName;

            rTableResult = rResult;
            rSrcName = rResult.tableName;
            // checkJoinTable index only created backend table,
            // here we get the info to set the indexed table as hidden table
            return (setIndexedTableMeta(lTableResult.tableName));
        })
        .then(function(result) {
            lTableResult = result;
            return (setIndexedTableMeta(rTableResult.tableName));
        })
        .then(function(result) {
            rTableResult = result;
            // join indexed table
            var sqlOptions = {
                "operation": "join",
                "leftTable": {
                    "name"    : lTableName,
                    "colName" : lFrontColName,
                    "colIndex": lColNum
                },
                "rightTable": {
                    "name"    : rTableName,
                    "colName" : rFrontColName,
                    "colIndex": rColNum
                },
                "joinType"    : joinStr,
                "newTableName": newTableName
            };
            return (XcalarJoin(lSrcName, rSrcName, newTableName,
                                joinType, sqlOptions));
        })
        .then(function() {
            var newTableCols = createJoinedColumns(lTable, rTable,
                                                    lRemoved, rRemoved);
            setIndex(newTableName, newTableCols);

            return (refreshTable(newTableName, lTableName,
                                 KeepOriginalTables.DontKeep,
                                 rTableName));
        })
        .then(function() {
            xcHelper.unlockTable(lTableId, true);
            xcHelper.unlockTable(rTableId, true);

            StatusMessage.success(msgId);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            WSManager.removeTable(newTableName);
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

        return (deferred.promise());
    };

    // group by on a column
    xcFunction.groupBy = function (operator, tableId,
                                   indexedColName, aggColName,
                                   isIncSample, newColName)
    {
        // Validation
        if (tableId < 0 || indexedColName.length < 1 || aggColName.length < 1) {
            console.error("Invalid Parameters!");
            return;
        }

        var table     = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;

        var columns = table.tableCols;
        var numCols = columns.length;

        var indexedColNum = -1;
        for (i = 0; i < numCols; i++) {
            if (columns[i].name === indexedColName && columns[i].func.args) {
                indexedColNum = i;
                break;
            }
        }

        // var aggColNum = -1;
        // for (i = 0; i < numCols; i++) {
        //     if (columns[i].name === aggColName && columns[i].func.args) {
        //         aggColNum = i;
        //         break;
        //     }
        // }

        // Here newTableName is generated by the origin table, not
        // the indexed table, in the assume that is OK to do so.
        var newTableName = xcHelper.getTableName(tableName) + "-GroupBy";
        newTableName = xcHelper.randName(newTableName) +
                        Authentication.fetchHashTag();
        var msgObj = {
            "msg"      : StatusMessageTStr.GroupBy + " " + operator,
            "operation": "group by",
            "tableName": newTableName
        };
        var msgId = StatusMessage.addMsg(msgObj);

        WSManager.addTable(newTableName);

        xcHelper.lockTable(tableId);

        checkTableIndex(indexedColName, tableId)
        .then(function(result) {
            xcHelper.unlockTable(tableId);
            // table name may change after sort!
            tableName = result.tableName;

            var sqlOptions = {
                "operation"    : "groupBy",
                "tableName"    : tableName,
                "groupbyCol"   : indexedColName,
                "aggCol"       : aggColName,
                "operator"     : operator,
                "newTableName" : newTableName,
                "newColumnName": newColName,
                "includeSample": isIncSample
            };

            return (XcalarGroupBy(operator, newColName, aggColName,
                                  tableName, newTableName,
                                  isIncSample, sqlOptions));
        })
        .then(function() {
            var escapedName = newColName;
            if (newColName.indexOf('.') > -1) {
                escapedName = newColName.replace(/\./g, "\\\.");
            }
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
            if (indexedColNum === -1) {
                tablCols[1] = ColManager.newCol({
                    "index"   : 1,
                    "name"    : indexedColName,
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
                tablCols[1] = xcHelper.deepCopy(table.tableCols[indexedColNum]);
            }
            // Note that if inculde sample a.b should not be escaped to a\.b
            if (!isIncSample && tablCols[1].name.indexOf('.') > -1) {
                var newEscapedName = tablCols[1].name.replace(/\./g, "\\\.");
                tablCols[1].userStr = tablCols[1].name + '" = pull(' +
                                       newEscapedName + ')';
                tablCols[1].func.args = [newEscapedName];
            }

            tablCols[2] = xcHelper.deepCopy(table.tableCols[dataColNum]);

            setIndex(newTableName, tablCols);

            return (refreshTable(newTableName, null, KeepOriginalTables.Keep));
        })
        .then(function() {
            commitToStorage();
            StatusMessage.success(msgId);
        })
        .fail(function(error) {
            Alert.error("GroupBy fails", error);
            WSManager.removeTable(newTableName);
            StatusMessage.fail(StatusMessageTStr.GroupByFailed, msgId);
        });
    };

    // map a column
    xcFunction.map = function (colNum, tableId, fieldName, mapString, options) {
        var deferred = jQuery.Deferred();

        var table        = xcHelper.getTableFromId(tableId);
        var tableName    = table.tableName;
        var newTableName = getNewTableName(tableName);

        var msg = StatusMessageTStr.Map + " " + fieldName;
        var msgObj = {
            "msg"      : msg,
            "operation": "map",
            "tableName": newTableName
        };
        var msgId = StatusMessage.addMsg(msgObj);

        options = options || {};
        // must add to worksheet before async call or will end up adding to th
        // wrong worksheet
        WSManager.addTable(newTableName);
        xcHelper.lockTable(tableId);
        
        var sqlOptions = {
                "operation"   : "mapColumn",
                "srcTableName": tableName,
                "newTableName": newTableName,
                "colName"     : fieldName,
                "mapString"   : mapString
        };

        XcalarMap(fieldName, mapString, tableName, newTableName, sqlOptions)
        .then(function() {
            var tablCols = mapColGenerate(colNum, fieldName, mapString,
                                        table.tableCols, options.replaceColumn);
            var tableProperties = {
                "bookmarks" : xcHelper.deepCopy(table.bookmarks),
                "rowHeights": xcHelper.deepCopy(table.rowHeights)
            };

            // map do not change groupby stats of the table
            var oldTableId = xcHelper.getTableId(tableName);
            var newTableId = xcHelper.getTableId(newTableName);
            STATSManager.copy(oldTableId, newTableId);

            setIndex(newTableName, tablCols, null, tableProperties);
            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);
            WSManager.removeTable(newTableName);

            Alert.error("mapColumn fails", error);
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
        var lNewName   = getNewTableName(lTableName);
        var lFieldName = lOptions.fieldName;
        var lMapString = lOptions.mapString;

        var rColNum    = rOptions.colNum;
        var rTableId   = rOptions.tableId;
        var rTable     = xcHelper.getTableFromId(rTableId);
        var rTableName = rTable.tableName;
        var rNewName   = getNewTableName(rTableName);
        var rFieldName = rOptions.fieldName;
        var rMapString = rOptions.mapString;

        msg = msg || StatusMessageTStr.Map + " " + lTableName +
                        " and " + rTableName;
        var msgObj = {
            "msg"      : msg,
            "operation": "map",
            "tableName": lNewName
        };
        var msgId = StatusMessage.addMsg(msgObj);

        WSManager.addTable(lNewName);
        xcHelper.lockTable(lTableId);

        WSManager.addTable(rNewName);
        xcHelper.lockTable(rTableId);

        var sqlOptions1 = {
            "operation"   : "mapColumn",
            "srcTableName": lTableName,
            "newTableName": lNewName,
            "colName"     : lFieldName,
            "mapString"   : lMapString
        };

        var sqlOptions2 = {
            "operation"   : "mapColumn",
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

            var lTableCols = mapColGenerate(lColNum, lFieldName, lMapString,
                                    lTable.tableCols, lOptions.replaceColumn);
            var lTableProperties = {
                "bookmarks" : xcHelper.deepCopy(lTable.bookmarks),
                "rowHeights": xcHelper.deepCopy(lTable.rowHeights)
            };

            setIndex(lNewName, lTableCols, null, lTableProperties);

            var rTableCols = mapColGenerate(rColNum, rFieldName, rMapString,
                                    rTable.tableCols, rOptions.replaceColumn);
            var rTableProperties = {
                "bookmarks" : xcHelper.deepCopy(rTable.bookmarks),
                "rowHeights": xcHelper.deepCopy(rTable.rowHeights)
            };

            setIndex(rNewName, rTableCols, null, rTableProperties);

            // XXX should change to xcHelper.when after fix async bug in refresh
            return (refreshTable(lNewName, lTableName));
        })
        .then(function() {
            return (refreshTable(rNewName, rTableName));
        })
        .then(function(ret1, ret2) {

            xcHelper.unlockTable(lTableId, true);
            xcHelper.unlockTable(rTableId, true);

            StatusMessage.success(msgId);
            deferred.resolve(lNewName, rNewName);
        })
        .fail(function(err1, err2) {
            xcHelper.unlockTable(lTableId);
            xcHelper.unlockTable(rTableId);

            WSManager.removeTable(lNewName);
            WSManager.removeTable(rNewName);

            StatusMessage.fail(StatusMessageTStr.MapFailed, msgId);
            var ret1 = thriftLog("DualMap", err1);
            var ret2 = thriftLog("DualMap", err2);
            deferred.reject(ret1 + ", " + ret2);
        });

        return (deferred.promise());
    };

    // export table
    xcFunction.exportTable = function (tableName, exportName) {
        var retName   = $(".retTitle:disabled").val();

        if (!retName || retName === "") {
            retName = "testing";
        }

        // now disable retName
        // var fileName = retName + ".csv";
        var msg = StatusMessageTStr.ExportTable + ": " + tableName;
        var msgObj = {
            "msg"      : msg,
            "operation": "export",
            "tableName": tableName
        };
        var msgId = StatusMessage.addMsg(msgObj);
        
        var sqlOptions = {
                "operation": "exportTable",
                "tableName": tableName,
                "fileName" : exportName,
                "filePath" : location
                         };

        XcalarExport(tableName, exportName, false, sqlOptions)
        .then(function() {
            var location = hostname + ":/var/tmp/xcalar/" + exportName;
            // add alert
            var ins = "Widget location: " +
                        "http://schrodinger/dogfood/widget/main.html?" +
                        "rid=" + retName;
            Alert.show({
                "title"     : "Successful Export",
                "msg"       : "File location: " + location,
                "instr"     : ins,
                "isAlert"   : true,
                "isCheckBox": true
            });
            StatusMessage.success(msgId);
        })
        .fail(function(error) {
            Alert.error("Export Table Fails", error);
            StatusMessage.fail(StatusMessageTStr.ExportFailed, msgId);
        })
        .always(function() {
            // removeWaitCursor();
        });
    };

    xcFunction.rename = function (tableId, oldTableName, newTableName) {
        var deferred = jQuery.Deferred();

        if (tableId == null || oldTableName == null || newTableName == null) {
            console.error("Invalid Parameters for renaming!");
            deferred.reject("Invalid renaming parameters");
            return (deferred.promise());
        }

        var table = xcHelper.getTableFromId(tableId);
        var sqlOptions = {
            "operation": "renameTable",
            "oldName"  : oldTableName,
            "newName"  : newTableName
        };

        xcHelper.lockTable(tableId);

        XcalarRenameTable(oldTableName, newTableName, sqlOptions)
        .then(function() {

            WSManager.renameTable(oldTableName, newTableName);
            // does renames for gTables, worksheet, rightsidebar, dag
            table.tableName = newTableName;
            gTableIndicesLookup[newTableName] =
                                              gTableIndicesLookup[oldTableName];
            gTableIndicesLookup[newTableName].tableName = newTableName;
            delete gTableIndicesLookup[oldTableName];

            for (var i = 0, len = gTableOrderLookup.length; i < len; i++) {
                if (gTableOrderLookup[i] === oldTableName) {
                    gTableOrderLookup[i] = newTableName;
                    break;
                }
            }

            RightSideBar.renameTable(tableId, newTableName);
            Dag.renameAllOccurrences(oldTableName, newTableName);

            var $th = xcHelper.getElementByTableId(tableId, "xcTheadWrap");
            $th.find(".tableTitle .text").data('title', newTableName);

            deferred.resolve(newTableName);
        })
        .fail(function(error) {
            console.error("Rename Fails!". error);
            deferred.reject(error);
        })
        .always(function() {
            xcHelper.unlockTable(tableId);
        });

        return (deferred.promise());
    };

    function getNewTableName (tableName) {
        return (tableName.split("#")[0] + Authentication.fetchHashTag());
    }

    // check if table has correct index
    function checkTableIndex (colName, tableId) {
        var deferred = jQuery.Deferred();

        var table     = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;

        if (colName !== table.keyName) {
            console.log(tableName, "not indexed correctly!");
            // XXX In the future,we can check if there are other tables that
            // are indexed on this key. But for now, we reindex a new table
            var newTableName = getNewTableName(tableName);

            // XXX Cheng must add to worksheet before async call
            WSManager.addTable(newTableName, null, true);
            var sqlOptions = {
                    "operation"   : "index",
                    "key"         : colName,
                    "tableName"   : tableName,
                    "newTableName": newTableName
                };
            XcalarIndexFromTable(tableName, colName, newTableName, sqlOptions)
            .then(function() {
                var tablCols = xcHelper.deepCopy(table.tableCols);
                setIndex(newTableName, tablCols);
                gTableIndicesLookup[newTableName].active = false;

                deferred.resolve({
                    "newTableCreated": true,
                    "setMeta"        : false,
                    "tableName"      : newTableName
                });
            })
            .fail(function(error) {
                WSManager.removeTable(newTableName);
                deferred.reject(error);
            });

        } else {
            console.log(tableName, "indexed correctly!");

            deferred.resolve({
                "newTableCreated": false,
                "tableName"      : tableName,
                "newTableName"   : tableName
            });
        }

        return (deferred.promise());
    }

    function parallelIndex (lColName, lTableId, rColName, rTableId) {
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
                    console.error("Parallel index fails in rightTable",
                                  failed);
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
                    console.error("Parallel index fails in leftTable",
                                  failed);
                    deferred.reject(failed);
                });
            }

            if (!del1 && !de2) {
                // when both fails, nothing need to delete
                deferred.reject(ret1, ret2);
            }
        });
        return (deferred.promise());
    }

    function setIndexedTableMeta (tableName) {
        var deferred = jQuery.Deferred();

        setupHiddenTable(tableName)
        .then(function() {
            var index = gHiddenTables.length - 1;
            RightSideBar.addTables([gHiddenTables[index]], IsActive.Inactive);

            deferred.resolve({
                "newTableCreated": true,
                "setMeta"        : true,
                "tableName"      : tableName
            });
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    // For xcFuncion.join, deepy copy of right table and left table columns
    function createJoinedColumns (lTable, rTable, lRemoved, rRemoved) {
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
    function joinFailHandler (result) {
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

            RightSideBar.tableBulkAction("delete", "inactive")
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            XcalarDeleteTable(tableName)
            .then(deferred.resolve)
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    function mapColGenerate(colNum, colName, mapStr, tableCols, isReplace) {
        var copiedCols = xcHelper.deepCopy(tableCols);

        if (colNum > -1) {
            var numColsRemoved = 0;
            var cellWidth = gNewCellWidth;

            if (isReplace) {
                numColsRemoved = 1;
                cellWidth = copiedCols[colNum - 1].width;
            }

            var newProgCol = ColManager.newCol({
                "index"   : colNum,
                "name"    : colName,
                "width"   : cellWidth,
                "userStr" : '"' + colName + '" =map(' + mapStr + ')',
                "isNewCol": false
            });
            newProgCol.func.func = "pull";
            newProgCol.func.args = [];
            newProgCol.func.args[0] = colName;
            copiedCols.splice(colNum - 1, numColsRemoved, newProgCol);
        }

        return (copiedCols);
    }

    return (xcFunction);
}(jQuery, {}));
