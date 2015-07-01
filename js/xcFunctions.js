window.xcFunction = (function ($, xcFunction) {
    var joinLookUp = {
        "Inner Join"      : JoinOperatorT.InnerJoin,
        "Left Outer Join" : JoinOperatorT.LeftOuterJoin,
        "Right Outer Join": JoinOperatorT.RightOuterJoin,
        "Full Outer Join" : JoinOperatorT.FullOuterJoin
    };

    // filter table column
    xcFunction.filter = function (colNum, tableNum, options) {
        var deferred = jQuery.Deferred();

        var table        = gTables[tableNum];
        var tableName    = table.tableName;
        var frontColName = table.tableCols[colNum].name;
        var backColName  = table.tableCols[colNum].func.args[0];
        var tablCols     = xcHelper.deepCopy(table.tableCols);
        var operator     = options.operator;
        var fltStr       = options.filterString;
        var newTableName = getNewTableName(tableName);

        var msg = StatusMessageTStr.Filter + ': ' + frontColName;
        StatusMessage.show(msg);
        
        // XXX Cheng must add table to worksheet before async call
        WSManager.addTable(newTableName);
        xcHelper.lockTable(tableNum);

        XcalarFilterHelper(fltStr, tableName, newTableName)
        .then(function() {
            setIndex(newTableName, tablCols);
            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            // add sql
            SQL.add("Filter Table", {
                "operation"   : "filter",
                "tableName"   : tableName,
                "colName"     : frontColName,
                "backColName" : backColName,
                "colIndex"    : colNum,
                "operator"    : operator,
                "value"       : fltStr,
                "newTableName": newTableName,
                "filterString": fltStr
            });
            xcHelper.unlockTable(tableName, true);
            StatusMessage.success(msg);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            WSManager.removeTable(newTableName);
            xcHelper.unlockTable(tableName);
            Alert.error("Filter Columns Fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msg);

            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // aggregate table column
    xcFunction.aggregate = function (colNum, frontColName, backColName,
                                     tableNum, aggrOp) {
        var tableName = gTables[tableNum].tableName;

        if (colNum === -1) {
            colNum = undefined;
        }

        var msg = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                    StatusMessageTStr.OnColumn + ": " + frontColName;
        StatusMessage.show(msg);
        showWaitCursor();

        XcalarAggregate(backColName, tableName, aggrOp)
        .then(function(value){
            // show result in alert modal
            var instr = 'This is the aggregate result for column "' +
                        frontColName + '". \r\n The aggregate operation is "' +
                        aggrOp + '".';
            // add alert
            Alert.show({
                "title"     : "Aggregate: " + aggrOp,
                "instr"     : instr,
                "msg"       : value,
                "isAlert"   : true,
                "isCheckBox": true
            });

            try {
                var val = JSON.parse(value);
                // add sql
                SQL.add("Aggregate", {
                    "operation": "aggregate",
                    "tableName": tableName,
                    "colName"  : frontColName,
                    "colIndex" : colNum,
                    "operator" : aggrOp,
                    "value"    : val.Value
                });
            } catch(error) {
                console.error(error, val);
            }
            StatusMessage.success(msg);
        })
        .fail(function(error) {
            Alert.error("Aggregate fails", error);
            StatusMessage.fail(StatusMessageTStr.AggregateFailed, msg);
        })
        .always(removeWaitCursor);

        return (true);
    };

    // sort table column
    xcFunction.sort = function (colNum, tableNum, order) {
        var table     = gTables[tableNum];
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
        StatusMessage.show(msg);

        // XXX Cheng must add to worksheet before async call
        WSManager.addTable(newTableName);
        xcHelper.lockTable(tableNum);

        XcalarIndexFromTable(tableName, backFieldName, newTableName)
        .then(function() {
            setDirection(newTableName, order);
            setIndex(newTableName, tablCols);

            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            // add sql
            SQL.add("Sort Table", {
                "operation"   : "sort",
                "tableName"   : tableName,
                "key"         : frontFieldName,
                "direction"   : direction,
                "newTableName": newTableName
            });
            xcHelper.unlockTable(tableName, true);
            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            WSManager.removeTable(newTableName);
            xcHelper.unlockTable(tableName);
            Alert.error("Sort Rows Fails", error);
            StatusMessage.fail(StatusMessageTStr.SortFailed, msg);
        });
    };

    // join two tables
    xcFunction.join = function (leftColNum, leftTableNum,
                                rightColNum, rightTableNum,
                                joinStr, newTableName,
                                leftRemoved, rightRemoved)
    {
        var deferred = jQuery.Deferred();
        var joinType = joinLookUp[joinStr];

        if (joinType == null) {
            console.error("Incorrect join type!");
            deferred.reject("Incorrect join type!");
            return (deferred.promise());
        }

        console.info("leftColNum", leftColNum,
                    "leftTableNum", leftTableNum,
                    "rightColNum", rightColNum,
                    "rightTableNum", rightTableNum,
                    "joinStr", joinStr,
                    "newTableName", newTableName);

        var leftTable        = gTables[leftTableNum];
        var leftTableName    = leftTable.tableName;
        var leftColName      = leftTable.tableCols[leftColNum].func.args[0];
        var leftFrontColName = leftTable.tableCols[leftColNum].name;

        var rightTable        = gTables[rightTableNum];
        var rightTableName    = rightTable.tableName;
        var rightColName      = rightTable.tableCols[rightColNum].func.args[0];
        var rightFrontColName = rightTable.tableCols[rightColNum].name;

        var leftSrcName;
        var rightSrcName;

        var leftTableResult;
        var rightTableResult;

        var msg = StatusMessageTStr.Join;

        StatusMessage.show(msg);
        xcHelper.lockTable(leftTableNum);
        xcHelper.lockTable(rightTableNum);
        WSManager.addTable(newTableName);
        // check left table index
        parallelIndex(leftColName, leftTableNum, rightColName, rightTableNum)
        .then(function(leftResult, rightResult) {
            leftTableResult = leftResult;
            leftSrcName = leftResult.tableName;

            rightTableResult = rightResult;
            rightSrcName = rightResult.tableName;
            // checkJoinTable index only created backend table,
            // here we get the info to set the indexed table as hidden table
            return setIndexedTableMeta(leftTableResult.tableName);
        })
        .then(function(result) {
            leftTableResult = result;
            return setIndexedTableMeta(rightTableResult.tableName);
        })
        .then(function(result) {
            rightTableResult = result;
            // join indexed table
            return (XcalarJoin(leftSrcName, rightSrcName,
                                newTableName, joinType));
        })
        .then(function() {
            var newTableCols = createJoinedColumns(leftTable, rightTable,
                                                    leftRemoved, rightRemoved);
            setIndex(newTableName, newTableCols);
            console.log('pause');
            return (refreshTable(newTableName, leftTableName,
                                 KeepOriginalTables.DontKeep,
                                 rightTableName));
        })
        .then(function() {
            SQL.add("Join Table", {
                "operation": "join",
                "leftTable": {
                    "name"    : leftTableName,
                    "colName" : leftFrontColName,
                    "colIndex": leftColNum
                },
                "rightTable": {
                    "name"    : rightTableName,
                    "colName" : rightFrontColName,
                    "colIndex": rightColNum
                },
                "joinType"    : joinStr,
                "newTableName": newTableName
            });
            xcHelper.unlockTable(leftTableName, true);
            xcHelper.unlockTable(rightTableName, true);

            StatusMessage.success(msg);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            WSManager.removeTable(newTableName);
            xcHelper.unlockTable(leftTableName);
            xcHelper.unlockTable(rightTableName);
            Alert.error("Join Table Fails", error);
            StatusMessage.fail(StatusMessageTStr.JoinFailed, msg);
            
            joinFailHandler(leftTableNum, leftTableResult)
            .then(function() {
                joinFailHandler(rightTableNum, rightTableResult);
            })
            .always(function() {
                deferred.reject(error);
            });
        });

        return (deferred.promise());
    };

    // group by on a column
    xcFunction.groupBy = function (colNum, frontFieldName, backFieldName,
                                    tableNum, newColName, operator) {
        var table        = gTables[tableNum];
        var tableName    = table.tableName;
        var newTableName = xcHelper.randName(tableName + "-GroupBy");

        if (colNum === -1) {
            colNum = undefined;
        }

        var msg = StatusMessageTStr.GroupBy + " " + operator;
        StatusMessage.show(msg);
        WSManager.addTable(newTableName);

        XcalarGroupBy(operator, newColName, backFieldName, tableName,
                      newTableName)
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

            var dataColNum = xcHelper.parseColNum($('#xcTable' + tableNum)
                                                 .find('th.dataCol')) - 1;
            var tablCols = [];
            tablCols[0] = newProgCol;
            tablCols[1] = xcHelper.deepCopy(table.tableCols[colNum]);
            tablCols[2] = xcHelper.deepCopy(table.tableCols[dataColNum]);

            setIndex(newTableName, tablCols);

            // return (refreshTable(newTableName, tableName,
            //         KeepOriginalTables.Keep));
            return (refreshTable(newTableName, null,
                                KeepOriginalTables.Keep));
        })
        .then(function() {
            // add sql
            SQL.add("Group By", {
                "operation"    : "groupBy",
                "tableName"    : tableName,
                "backFieldName": backFieldName,
                "colName"      : frontFieldName,
                "colIndex"     : colNum,
                "operator"     : operator,
                "newTableName" : newTableName,
                "newColumnName": newColName
            });

            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("GroupBy fails", error);
            StatusMessage.fail(StatusMessageTStr.GroupByFailed, msg);
            WSManager.removeTable(newTableName);
        });
    };

    // map a column
    xcFunction.map = function (colNum, tableNum, fieldName, mapString, options) {
        var deferred = jQuery.Deferred();

        var table        = gTables[tableNum];
        var tableName    = table.tableName;
        var newTableName = getNewTableName(tableName);

        var msg = StatusMessageTStr.Map + " " + fieldName;
        StatusMessage.show(msg);

        options = options || {};
        // XXX Cheng must add to worksheet before async call
        WSManager.addTable(newTableName);
        xcHelper.lockTable(tableNum);
        XcalarMap(fieldName, mapString, tableName, newTableName)
        .then(function() {
            var tablCols = mapColGenerate(colNum, fieldName, mapString,
                                        table.tableCols, options.replaceColumn);
            var tableProperties = {
                "bookmarks" : xcHelper.deepCopy(table.bookmarks),
                "rowHeights": xcHelper.deepCopy(table.rowHeights)
            };

            setIndex(newTableName, tablCols, null, tableProperties);
            return (refreshTable(newTableName, tableName));
        })
        .then(function() {
            // add sql
            SQL.add("Map Column", {
                "operation"   : "mapColumn",
                "srcTableName": tableName,
                "newTableName": newTableName,
                "colName"     : fieldName,
                "mapString"   : mapString
            });
            xcHelper.unlockTable(tableName, true);
            StatusMessage.success(msg);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableName);
            WSManager.removeTable(newTableName);

            Alert.error("mapColumn fails", error);
            StatusMessage.fail(StatusMessageTStr.MapFailed, msg);

            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // map two tables at the same time, now specifically for multi clause join
    xcFunction.twoMap = function(lOptions, rOptions, loclNewTable, msg) {
        var deferred = jQuery.Deferred();

        if (lOptions == null || rOptions == null) {
            deferred.reject("Invalid map parameters");
            return (deferred.promise());
        }

        var lColNum    = lOptions.colNum;
        var lTableNum  = lOptions.tableNum;
        var lTable     = gTables[lTableNum];
        var lTableName = lTable.tableName;
        var lNewName   = getNewTableName(lTableName);
        var lFieldName = lOptions.fieldName;
        var lMapString = lOptions.mapString;

        var rColNum    = rOptions.colNum;
        var rTableNum  = rOptions.tableNum;
        var rTable     = gTables[rTableNum];
        var rTableName = rTable.tableName;
        var rNewName   = getNewTableName(rTableName);
        var rFieldName = rOptions.fieldName;
        var rMapString = rOptions.mapString;


        msg = msg || StatusMessageTStr.Map + " " + lTableName +
                        " and " + rTableName;
        StatusMessage.show(msg);

        WSManager.addTable(lNewName);
        xcHelper.lockTable(lTableNum);

        WSManager.addTable(rNewName);
        xcHelper.lockTable(rTableNum);

        var deferred1 = XcalarMap(lFieldName, lMapString,
                                    lTableName, lNewName);
        var deferred2 = XcalarMap(rFieldName, rMapString,
                                    rTableName, rNewName);

        // XXX note that the current $.when cannot handle the failure gracefully
        $.when(deferred1, deferred2)
        .then(function() {
            var tablCols = mapColGenerate(lColNum, lFieldName, lMapString,
                                    lTable.tableCols, lOptions.replaceColumn);
            var tableProperties = {
                "bookmarks" : xcHelper.deepCopy(lTable.bookmarks),
                "rowHeights": xcHelper.deepCopy(lTable.rowHeights)
            };

            setIndex(lNewName, tablCols, null, tableProperties);
            return (refreshTable(lNewName, lTableName));
        })
        .then(function() {
            if (loclNewTable) {
                xcHelper.lockTable(lTableNum);
            }

            var tablCols = mapColGenerate(rColNum, rFieldName, rMapString,
                                    rTable.tableCols, rOptions.replaceColumn);
            var tableProperties = {
                "bookmarks" : xcHelper.deepCopy(rTable.bookmarks),
                "rowHeights": xcHelper.deepCopy(rTable.rowHeights)
            };

            setIndex(rNewName, tablCols, null, tableProperties);
            return (refreshTable(rNewName, rTableName));
        })
        .then(function() {
            if (loclNewTable) {
                xcHelper.lockTable(rTableNum);
            }

            SQL.add("Map Column", {
                "operation"   : "mapColumn",
                "srcTableName": lTableName,
                "newTableName": lNewName,
                "colName"     : lFieldName,
                "mapString"   : lMapString
            });

            SQL.add("Map Column", {
                "operation"   : "mapColumn",
                "srcTableName": rTableName,
                "newTableName": rNewName,
                "colName"     : rFieldName,
                "mapString"   : rMapString
            });

            xcHelper.unlockTable(lTableName, true);
            xcHelper.unlockTable(rTableName, true);

            StatusMessage.success(msg);

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(lTableName);
            xcHelper.unlockTable(rTableName);

            WSManager.removeTable(lNewName);
            WSManager.removeTable(rNewName);

            StatusMessage.fail(StatusMessageTStr.MapFailed, msg);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // export table
    xcFunction.exportTable = function(tableNum) {
        var tableName = gTables[tableNum].tableName;
        var retName   = $(".retTitle:disabled").val();

        if (!retName || retName === "") {
            retName = "testing";
        }

        var fileName = retName + ".csv";
        var msg = StatusMessageTStr.ExportTable + ": " + tableName;

        StatusMessage.show(msg);

        XcalarExport(tableName, fileName)
        .then(function() {
            var location = hostname + ":/var/tmp/xcalar/" + fileName;
            // add sql
            SQL.add("Export Table", {
                "operation": "exportTable",
                "tableName": tableName,
                "fileName" : fileName,
                "filePath" : location
            });

            // add alert
            var ins   = "Widget location: " +
                        "http://schrodinger/dogfood/widget/main.html?" +
                        "rid=" + retName;
            Alert.show({
                "title"     : "Successful Export",
                "msg"       : "File location: " + location,
                "instr"     : ins,
                "isAlert"   : true,
                "isCheckBox": true
            });
            StatusMessage.success(msg);
        })
        .fail(function(error) {
            Alert.error("Export Table Fails", error);
            StatusMessage.fail(StatusMessageTStr.ExportFailed, msg);
        })
        .always(function() {
            // removeWaitCursor();
        });
    };

    xcFunction.rename = function(tableNum, oldTableName, newTableName) {
        var deferred = jQuery.Deferred();

        if (tableNum == null || oldTableName == null || newTableName == null) {
            console.error("Invalid Parameters for renaming!");
            deferred.reject("Invalid renaming parameters");
            return (deferred.promise());
        }

        var table = gTables[tableNum];

        XcalarRenameTable(oldTableName, newTableName)
        .then(function() {
            WSManager.renameTable(oldTableName, newTableName);
            // does renames for gTables, worksheet, rightsidebar, dag
            table.tableName = newTableName;
            gTableIndicesLookup[newTableName] = gTableIndicesLookup[oldTableName];
            gTableIndicesLookup[newTableName].tableName = newTableName;
            delete gTableIndicesLookup[oldTableName];

            for (var i = 0, len = gTableOrderLookup.length; i < len; i++) {
                if (gTableOrderLookup[i] === oldTableName) {
                    gTableOrderLookup[i] = newTableName;
                    break;
                }
            }

            RightSideBar.renameTable(oldTableName, newTableName);
            Dag.renameAllOccurrences(oldTableName, newTableName);
            $('#xcTheadWrap' + tableNum + ' .tableTitle .text')
                                            .data('title', newTableName);
            deferred.resolve(newTableName);
        })
        .fail(function(error) {
            console.error("Rename Fails!". error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function getNewTableName(tableName) {
        return (tableName.split("#")[0] + Authentication.fetchHashTag());
    }

    // For xcFunction.join, check if table has correct index
    function checkJoinTableIndex(colName, tableNum) {
        var deferred = jQuery.Deferred();

        var table = gTables[tableNum];
        var tableName = table.tableName;

        if (colName !== table.keyName) {
            console.log(tableName, "not indexed correctly!");
            // XXX In the future,we can check if there are other tables that
            // are indexed on this key. But for now, we reindex a new table
            var newTableName = getNewTableName(tableName);

            // XXX Cheng must add to worksheet before async call
            WSManager.addTable(newTableName);

            XcalarIndexFromTable(tableName, colName, newTableName)
            .then(function() {
                var tablCols = xcHelper.deepCopy(table.tableCols);
                setIndex(newTableName, tablCols);
                gTableIndicesLookup[newTableName].active = false;

                SQL.add("Index Table", {
                    "operation"   : "index",
                    "key"         : colName,
                    "tableName"   : tableName,
                    "newTableName": newTableName
                });

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

    function parallelIndex(leftColName, leftTableNum, rightColName, rightTableNum) {
        var deferred = jQuery.Deferred();

        var deferred1 = checkJoinTableIndex(leftColName, leftTableNum);
        var deferred2 = checkJoinTableIndex(rightColName, rightTableNum);

        var status1 = status2 = "waiting";
        var leftResult, rightResult;
        var leftError, rightError;

        deferred1
        .then(function(res) {
            status1 = "done";
            leftResult = res;

            switch (status2) {
                case "done":
                    // when both done
                    deferred.resolve(leftResult, rightResult);
                    break;
                case "waiting":
                    // when deferred2 not finish, wait for it
                    break;
                case "fail":
                    // when deferred2 already fail, delete this table:
                    XcalarDeleteTable(res.tableName)
                    .always(function() {
                        console.error("Parrel index fails in rightTable",
                                      rightError);
                        deferred.reject(rightError);
                    });
                    break;
                default:
                    console.error("Wrong Status!");
                    break;
            }
        })
        .fail(function(error) {
            status1 = "fail";
            leftError = error;

            switch (status2) {
                case "done":
                    // when deferred2 done, delete right table
                    XcalarDeleteTable(rightResult.tableName)
                    .always(function() {
                        console.error("Parrel index fails in leftTable", error);
                        deferred.reject(error);
                    });
                    break;
                case "waiting":
                    // when deferred2 not finish, wait for it
                    break;
                case "fail":
                    // both fail
                    console.error("Parrel index all fails",
                                    leftError, rightError);
                    deferred.reject(leftError, rightError);
                    break;
                default:
                    console.error("Wrong Status!");
                    break;
            }
        });

        deferred2
        .then(function(res) {
            status2 = "done";
            rightResult = res;

            switch (status1) {
                case "done":
                    // when both done
                    deferred.resolve(leftResult, rightResult);
                    break;
                case "waiting":
                    // when deferred1 not finish, wait for it
                    break;
                case "fail":
                    // when deferred2 already fail:
                    XcalarDeleteTable(res.tableName)
                    .always(function() {
                        console.error("Parrel index fails in leftTable",
                                      leftError);
                        deferred.reject(leftError);
                    });
                    break;
                default:
                    console.error("Wrong Status!");
                    break;
            }
        })
        .fail(function(error) {
            status2 = "fail";
            rightError = error;

            switch (status1) {
                case "done":
                    // when deferred1 done, delete left table
                    XcalarDeleteTable(leftResult.tableName)
                    .always(function() {
                        console.error("Parrel index fails in rightTable", error);
                        deferred.reject(error);
                    });
                    break;
                case "waiting":
                    // when deferred1 not finish, wait for it
                    break;
                case "fail":
                    // both fail
                    console.error("Parrel index all fails",
                                    leftError, rightError);
                    deferred.reject(leftError, rightError);
                    break;
                default:
                    console.error("Wrong Status!");
                    break;
            }
        });

        return (deferred.promise());
    }

    function setIndexedTableMeta(tableName) {
        var deferred = jQuery.Deferred();

        setupHiddenTable(tableName)
        .then(function() {
            var index = gHiddenTables.length - 1;
            RightSideBar.addTables([gHiddenTables[index]],
                                    IsActive.Inactive);

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
    function createJoinedColumns(leftTable, rightTable, leftRemoved, rightRemoved) {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var newTableCols = [];
        var leftCols = xcHelper.deepCopy(leftTable.tableCols);
        var rightCols = xcHelper.deepCopy(rightTable.tableCols);
        var index = 0;
        var dataCol;
        var colName;

        leftRemoved = leftRemoved || {};
        rightRemoved = rightRemoved || {};

        for (var i = 0; i < leftCols.length; i++) {
            colName = leftCols[i].name;

            if (colName === "DATA") {
                dataCol = leftCols[i];
            } else if (!(colName in leftRemoved)) {
                newTableCols[index] = leftCols[i];
                newTableCols[index].index = index + 1;
                ++index;
            }
        }

        for (var i = 0; i < rightCols.length; i++) {
            colName = rightCols[i].name;

            if (colName !== "DATA" && !(colName in rightRemoved)) {
                newTableCols[index] = rightCols[i];
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
    function joinFailHandler(tableNum, result) {
        var deferred = jQuery.Deferred();

        result = result || {};

        var tableName = result.tableName;
        // when no new table created
        if (!result.newTableCreated) {
            deferred.resolve();
        } else if (result.setMeta) {
            $('#inactiveTablesList').find('.tableInfo[data-tableName="' +
                                          tableName + '"]')
                                    .find('.addArchivedBtn')
                                    .click();

            RightSideBar.tableBulkAction("delete")
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
