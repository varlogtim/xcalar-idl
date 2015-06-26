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
        var msg          = StatusMessageTStr.Filter + ': ' + frontColName;
        var operator     = options.operator;
        var fltStr       = options.filterString;
        var oldTableName;

        StatusMessage.show(msg);
        
        // XXX Cheng must get ws index before async call
        var wsIndex = WSManager.getWSFromTable(tableName);

        xcFunction.rename(tableNum)
        .then(function(previousTableName) {
            var innerDeferred = jQuery.Deferred();

            oldTableName = previousTableName;
            // this is for table after filter
            WSManager.addTable(tableName, wsIndex);

            XcalarFilterHelper(fltStr, previousTableName, tableName)
            .then(function() {
                setIndex(tableName, tablCols);
                return (refreshTable(tableName, tableNum));
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                // we call WSManager.addTable(tableName, wsIndex)
                // before the filter
                WSManager.removeTable(tableName);
                // rename the old table back to tableName
                xcFunction.rename(tableNum, previousTableName, tableName);

                innerDeferred.reject(error);
            });

            return (innerDeferred.promise());
        })
        .then(function() {
            // add sql
            SQL.add("Filter Table", {
                "operation"   : "filter",
                "tableName"   : oldTableName,
                "colName"     : frontColName,
                "backColName" : backColName,
                "colIndex"    : colNum,
                "operator"    : operator,
                "value"       : fltStr,
                "newTableName": tableName,
                "filterString": fltStr
            });

            StatusMessage.success(msg);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
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
        var msg       = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                        StatusMessageTStr.OnColumn + ": " + frontColName;
        if (colNum === -1) {
            colNum = undefined;
        }
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
        var oldTableName;

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

        // XXX Cheng must get ws index before async call
        var wsIndex = WSManager.getWSFromTable(tableName);

        xcFunction.rename(tableNum)
        .then(function(previousTableName) {
            var innerDeferred = jQuery.Deferred();

            oldTableName = previousTableName;
            // this is for table after filter
            WSManager.addTable(tableName, wsIndex);

            XcalarIndexFromTable(previousTableName, backFieldName, tableName)
            .then(function() {
                setDirection(tableName, order);
                setIndex(tableName, tablCols);

                return (refreshTable(tableName, tableNum));
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                // we call WSManager.addTable(tableName, wsIndex)
                // before the filter
                WSManager.removeTable(tableName);
                // rename the old table back to tableName
                xcFunction.rename(tableNum, previousTableName, tableName);

                innerDeferred.reject(error);
            });

            return (innerDeferred.promise());
        })
        .then(function() {
            // add sql
            SQL.add("Sort Table", {
                "operation"   : "sort",
                "tableName"   : oldTableName,
                "key"         : frontFieldName,
                "direction"   : direction,
                "newTableName": tableName
            });

            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("Sort Rows Fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msg);
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
        showWaitCursor();

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
            return setIndexedTableMeta(leftTableResult.tableName,
                                        leftTableResult.previousTableName);
        })
        .then(function(result) {
            leftTableResult = result;
            return setIndexedTableMeta(rightTableResult.tableName,
                                        rightTableResult.previousTableName);
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

            return (refreshTable(newTableName, leftTableNum,
                                 KeepOriginalTables.DontKeep, rightTableNum));
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

            StatusMessage.success(msg);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Join Table Fails", error);
            StatusMessage.fail(StatusMessageTStr.JoinFailed, msg);

            WSManager.removeTable(newTableName);
            
            renameTableJoinFailure(leftTableNum, leftTableResult)
            .then(function() {
                renameTableJoinFailure(rightTableNum, rightTableResult);
            })
            .always(function() {
                deferred.reject(error);
            });
        })
        .always(removeWaitCursor);

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

            return (refreshTable(newTableName, tableNum,
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

        var table     = gTables[tableNum];
        var tableName = table.tableName;
        var tablCols  = xcHelper.deepCopy(table.tableCols);
        var tableProperties = {
            "bookmarks" : xcHelper.deepCopy(table.bookmarks),
            "rowHeights": xcHelper.deepCopy(table.rowHeights)
        };
        var oldTableName;

        var msg = StatusMessageTStr.Map + " " + fieldName;

        StatusMessage.show(msg);

        // XXX Cheng must get ws index before async call
        var wsIndex = WSManager.getWSFromTable(tableName);

        xcFunction.rename(tableNum)
        .then(function(previousTableName) {
            var innerDeferred = jQuery.Deferred();

            oldTableName = previousTableName;
            // this is for table after filter
            WSManager.addTable(tableName, wsIndex);

            XcalarMap(fieldName, mapString, previousTableName, tableName)
            .then(function() {
                if (colNum > -1) {
                    var numColsRemoved = 0;
                    var cellWidth = gNewCellWidth;
                    if (options && options.replaceColumn) {
                        numColsRemoved = 1;
                        cellWidth = tablCols[colNum - 1].width;
                    }
                    var newProgCol = ColManager.newCol({
                        "index"   : colNum,
                        "name"    : fieldName,
                        "width"   : cellWidth,
                        "userStr" : '"' + fieldName + '" =map(' + mapString + ')',
                        "isNewCol": false
                    });
                    newProgCol.func.func = "pull";
                    newProgCol.func.args = [];
                    newProgCol.func.args[0] = fieldName;
                    tablCols.splice(colNum - 1, numColsRemoved, newProgCol);

                }
                setIndex(tableName, tablCols, null, tableProperties);
                return (refreshTable(tableName, tableNum));
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                // we call WSManager.addTable(tableName, wsIndex)
                // before the filter
                WSManager.removeTable(tableName);
                // rename the old table back to tableName
                xcFunction.rename(tableNum, previousTableName, tableName);

                innerDeferred.reject(error);
            });

            return (innerDeferred.promise());
        })
        .then(function() {
            // add sql
            SQL.add("Map Column", {
                "operation"   : "mapColumn",
                "srcTableName": oldTableName,
                "newTableName": tableName,
                "colName"     : fieldName,
                "mapString"   : mapString
            });

            StatusMessage.success(msg);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("mapColumn fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msg);

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

        var fileName  = retName + ".csv";
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

    xcFunction.getNewName = function(tableNum, tableName, options) {
        var newTableName;
        if (options && options.name) {
            newTableName = options.name;
        } else {
            var srcTableName = Dag.getSrcTableName(tableName, tableNum);
            var srcTableNum = srcTableName.substr(tableName.length + 1);
            if (srcTableNum.length === 0 || isNaN(srcTableNum)) {
                srcTableNum = -1;
            } else {
                srcTableNum = parseInt(srcTableNum);
            }
            newTableName = tableName + "_" + (srcTableNum + 1);
        }

        WSManager.renameTable(tableName, newTableName);
        return (newTableName);
    };

    xcFunction.rename = function(tableNum, oldTableName, newTableName) {
        var deferred = jQuery.Deferred();
        var table    = gTables[tableNum];

        if (oldTableName == null) {
            oldTableName = table.tableName;
        }

        // WSManager.renameTable is in xcFunction.getNewName
        if (newTableName == null) {
            newTableName = xcFunction.getNewName(tableNum, oldTableName);
        } else {
            xcFunction.getNewName(tableNum, oldTableName, {"name": newTableName});
        }

        XcalarRenameTable(oldTableName, newTableName)
        .then(function() {
            // does renames for gTables, worksheet, rightsidebar, dag
            table.tableName = newTableName;
            gTableIndicesLookup[newTableName] = gTableIndicesLookup[oldTableName];
            gTableIndicesLookup[newTableName].tableName = newTableName;
            delete gTableIndicesLookup[oldTableName];

            RightSideBar.renameTable(oldTableName, newTableName);
            Dag.renameAllOccurrences(oldTableName, newTableName);
            $('#xcTheadWrap' + tableNum + ' .tableTitle input')
                                            .data('title', newTableName);
            deferred.resolve(newTableName);
        })
        .fail(function(error) {
            console.error("Rename Fails!". error);

            WSManager.renameTable(newTableName, oldTableName);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    // For xcFunction.join, check if table has correct index
    function checkJoinTableIndex(colName, tableNum) {
        var deferred = jQuery.Deferred();

        var table = gTables[tableNum];
        var tableName = table.tableName;
        var oldTableName;

        if (colName !== table.keyName) {
            console.log(tableName, "not indexed correctly!");
            // XXX In the future,we can check if there are other tables that
            // are indexed on this key. But for now, we reindex a new table

            // XXX Cheng must get ws index before async call
            var wsIndex = WSManager.getWSFromTable(tableName);

            xcFunction.rename(tableNum)
            .then(function(previousTableName) {
                var innerDeferred = jQuery.Deferred();

                oldTableName = previousTableName;
                // this is for table after filter
                WSManager.addTable(tableName, wsIndex);

                XcalarIndexFromTable(previousTableName, colName, tableName)
                .then(function() {
                    var tablCols = xcHelper.deepCopy(table.tableCols);
                    setIndex(tableName, tablCols);
                    gTableIndicesLookup[tableName].active = false;

                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    // we call WSManager.addTable(tableName, wsIndex)
                    // before the filter
                    WSManager.removeTable(tableName);
                    // rename the old table back to tableName
                    xcFunction.rename(tableNum, previousTableName, tableName);

                    innerDeferred.reject(error);
                });

                return (innerDeferred.promise());
            })
            .then(function() {
                SQL.add("Index Table", {
                    "operation"   : "index",
                    "key"         : colName,
                    "tableName"   : oldTableName,
                    "newTableName": tableName
                });

                deferred.resolve({
                    "newTableCreated"  : true,
                    "setMeta"          : false,
                    "tableName"        : tableName,
                    "previousTableName": oldTableName
                });
            })
            .fail(deferred.reject);

        } else {
            console.log(tableName, "indexed correctly!");

            deferred.resolve({
                "newTableCreated": false,
                "tableName"      : tableName
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
                    .then(function() {
                        return xcFunction.rename(leftTableNum,
                                                 res.previousTableName,
                                                 res.tableName);
                    })
                    .always(function() {
                        console.error("Parrel index fails in rightTable",
                                      rightError);
                        deferred.reject(rightError);
                    });
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
                    .then(function() {
                        return xcFunction.rename(rightTableNum,
                                                 rightResult.previousTableName,
                                                 rightResult.tableName);
                    })
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
                    .then(function() {
                        return xcFunction.rename(rightTableNum,
                                                 res.previousTableName,
                                                 res.tableName);
                    })
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
                    .then(function() {
                        return xcFunction.rename(leftTableNum,
                                                 leftResult.previousTableName,
                                                 leftResult.tableName);
                    })
                    .always(function() {
                        console.error("Parrel index fails in rightTable", error);
                        deferred.reject(error);
                    });
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
        })

        return (deferred.promise());
    }

    function setIndexedTableMeta(tableName, oldTableName) {
        var deferred = jQuery.Deferred();

        setupHiddenTable(tableName)
        .then(function() {
            var index = gHiddenTables.length - 1;
            RightSideBar.addTables([gHiddenTables[index]],
                                    IsActive.Inactive);

            deferred.resolve({
                "newTableCreated"  : true,
                "setMeta"          : true,
                "tableName"        : tableName,
                "previousTableName": oldTableName
            });
        })
        .fail(function(error) {
            deferred.reject(error);
        });

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
    // to delete the new table and rename the old one back
    function renameTableJoinFailure(tableNum, result) {
        var deferred = jQuery.Deferred();

        result = result || {};
        // when no new table created
        if (!result.newTableCreated) {
            deferred.resolve();
            return (deferred.promise());
        }

        var tableName = result.tableName;
        var previousTableName = result.previousTableName;

        if (result.setMeta) {
            $('#inactiveTablesList').find('.tableInfo[data-tableName="' +
                                          tableName + '"]')
                                    .find('.addArchivedBtn')
                                    .click();

            RightSideBar.tableBulkAction("delete")
            .then(function() {
                return (xcFunction.rename(tableNum, previousTableName, tableName));
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            XcalarDeleteTable(tableName)
            .then(function() {
                return xcFunction.rename(tableNum, previousTableName, tableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    return (xcFunction);
}(jQuery, {}));
