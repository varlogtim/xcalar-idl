window.xcFunction = (function ($, xcFunction) {
    xcFunction.checkSorted = function(tableNum) {
        var deferred  = jQuery.Deferred();
        // XXX for general case, the two names should be the same for
        // data set sample table
        var frontName = gTables[tableNum].frontTableName;
        var srcName   = gTables[tableNum].backTableName;

        if (gTables[tableNum].isTable) {
            deferred.resolve(srcName);
        } else {
            var datasetName = gTableIndicesLookup[frontName].datasetName;
            var resultSetId = gTables[tableNum].resultSetId;

            XcalarSetFree(resultSetId)
            .then(function() {
                // XXX maybe later we shall change it to delete and refresh
                gTableIndicesLookup[frontName].datasetName = undefined;
                gTableIndicesLookup[frontName].isTable = true;

                return (XcalarIndexFromDataset(datasetName, "recordNum",
                                              srcName));
            })
            .then(function() {
                SQL.add("Index From Dataset", {
                    "operation"   : "index",
                    "newTableName": srcName,
                    "dsName"      : datasetName
                });
                gTables[tableNum].isTable = true;

                return (getResultSet(true, srcName));
            })
            .then(function(resultSet) {
                gTables[tableNum].resultSetId = resultSet.resultSetId;

                deferred.resolve(srcName);
            })
            .fail(function(thriftError) {
                if (thriftError.statusCode === StatusT.StatusNsObjAlreadyExists)
                {
                    console.warn("Table or dataset already exists");
                    deferred.resolve(srcName);
                }
            });
        }
        return (deferred.promise());
    };

    // filter table column
    xcFunction.filter = function (colNum, tableNum, options) {
        var table        = gTables[tableNum];
        var frontName    = table.frontTableName;
        var frontColName = table.tableCols[colNum].name;
        var backColName  = table.tableCols[colNum].func.args[0];
        var tablCols     = xcHelper.deepCopy(table.tableCols);
        var newTableName = xcHelper.randName("tempFilterTable-");
        var msg          = StatusMessageTStr.Filter + ': ' + frontColName;
        var operator = options.operator;
        var value1 = options.value1;
        var value2 = options.value2;
        var value3 = options.value3;
        var fltStr = options.filterString;

        StatusMessage.show(msg);
        WSManager.addTable(newTableName);

        xcFunction.checkSorted(tableNum)
        .then(function(srcName) {
            if (fltStr) {
                return (XcalarFilterHelper(fltStr, srcName, newTableName));
            } else {
                return (XcalarFilter(operator, value1, value2, value3,
                                     srcName, newTableName));
            }
        })
        .then(function() {
            setIndex(newTableName, tablCols);
            return (refreshTable(newTableName, tableNum));
        })
        .then(function() {
            // add sql
            SQL.add("Filter Table", {
                "operation"   : "filter",
                "tableName"   : frontName,
                "colName"     : frontColName,
                "backColName" : backColName,
                "colIndex"    : colNum,
                "operator"    : operator,
                "value"       : value2,
                "newTableName": newTableName,
                "filterString": fltStr
            });
            
            StatusMessage.success(msg);
            commitToStorage();
            
        })
        .fail(function(error) {
            console.log("failed here");
            Alert.error("Filter Columns Fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msg);

            WSManager.removeTable(newTableName);
            return (false);
        });
        return (true);
    };

    // aggregate table column
    xcFunction.aggregate = function (colNum, frontColName, backColName,
                                     tableNum, aggrOp) {
        // var table     = gTables[tableNum];
        var frontName = gTables[tableNum].frontTableName;
        var msg       = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                        StatusMessageTStr.OnColumn + ": " + frontColName;
        if (colNum === -1) {
            colNum = undefined;
        }
        StatusMessage.show(msg);
        showWaitCursor();

        xcFunction.checkSorted(tableNum)
        .then(function(srcName) {
            return (XcalarAggregate(backColName, srcName, aggrOp));
        })
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
                    "tableName": frontName,
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

    // sort tabe column
    xcFunction.sort = function (colNum, tableNum, order) {
        var table     = gTables[tableNum];
        var isTable   = table.isTable;
        var tableName = table.frontTableName;
        var srcName   = isTable ? table.backTableName :
                                  gTableIndicesLookup[tableName].datasetName;
        var tablCols  = xcHelper.deepCopy(table.tableCols);
        var pCol      = table.tableCols[colNum - 1];

        if (!isTable) {
            var newTableName = table.backTableName;
        } else {
            var newTableName = xcHelper.randName("tempSortTable-");
        }
        var backFieldName;
        var frontFieldName;

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


        var direction = (order === SortDirection.Forward) ? "ASC" : "DESC";
        var msg       = StatusMessageTStr.Sort + " " + frontFieldName;

        StatusMessage.show(msg);
        WSManager.addTable(newTableName);

        getIndexedTable(srcName, backFieldName, newTableName, isTable)
        .then(function() {
            setDirection(newTableName, order);
            setIndex(newTableName, tablCols);

            return (refreshTable(newTableName, tableNum,
                    KeepOriginalTables.DontKeep));
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

            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("Sort Rows Fails", error);
            StatusMessage.fail(StatusMessageTStr.SortFailed, msg);
            WSManager.removeTable(newTableName);
        });
    };

    // join two tables
    xcFunction.join = function (leftColNum, leftTableNum, rightColNum, rightTableNum, joinStr, newTableName) {
        var deferred = jQuery.Deferred();
        var isLeft   = true;
        var isRight  = false;
        var joinType;

        switch (joinStr) {
            case ("Inner Join"):
                joinType = JoinOperatorT.InnerJoin;
                break;
            case ("Left Outer Join"):
                joinType = JoinOperatorT.LeftOuterJoin;
                break;
            case ("Right Outer Join"):
                joinType = JoinOperatorT.RightOuterJoin;
                break;
            case ("Full Outer Join"):
                joinType = JoinOperatorT.FullOuterJoin;
                break;
            default:
                console.warn("Incorrect join type!");
                break;
        }

        console.log("leftColNum", leftColNum,
                    "leftTableNum", leftTableNum,
                    "rightColNum", rightColNum,
                    "rightTableNum", rightTableNum,
                    "joinStr", joinStr,
                    "newTableName", newTableName);

        var leftTable        = gTables[leftTableNum];
        var leftFrontName    = leftTable.frontTableName;
        var leftColName      = leftTable.tableCols[leftColNum].func.args[0];
        var leftFrontColName = leftTable.tableCols[leftColNum].name;

        var rightTable        = gTables[rightTableNum];
        var rightFrontName    = rightTable.frontTableName;
        var rightColName      = rightTable.tableCols[rightColNum].func.args[0];
        var rightFrontColName = rightTable.tableCols[rightColNum].name;

        var leftSrcName;
        var rightSrcName;
        var newTableCols = createJoinedColumns(rightTable, leftTable);

        var msg = StatusMessageTStr.Join;

        StatusMessage.show(msg);
        WSManager.addTable(newTableName);
        showWaitCursor();
        // check left table lName"])index
        checkJoinTableIndex(leftColName, leftTable, isLeft)
        .then(function(realLeftTableName) {
            leftSrcName = realLeftTableName;
            // check right table index
            return (checkJoinTableIndex(rightColName, rightTable, isRight));
        })
        .then(function(realRightTableName) {
            rightSrcName = realRightTableName;
            // join indexed table
            return (XcalarJoin(leftSrcName, rightSrcName,
                                newTableName, joinType));
        })
        .then(function() {
            setIndex(newTableName, newTableCols);

            return (refreshTable(newTableName, leftTableNum,
                                 KeepOriginalTables.DontKeep, rightTableNum));
        })
        .then(function() {
            SQL.add("Join Table", {
                "operation": "join",
                "leftTable": {
                    "name"    : leftFrontName,
                    "backname": leftSrcName,
                    "colName" : leftFrontColName,
                    "colIndex": leftColNum
                },
                "rightTable": {
                    "name"    : rightFrontName,
                    "backname": rightSrcName,
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

            deferred.reject(error);
        })
        .always(removeWaitCursor);

        return (deferred.promise());
    };

    // group by on a column
    xcFunction.groupBy = function (colNum, frontFieldName, backFieldName,
                                    tableNum, newColName, operator) {
        var table        = gTables[tableNum];
        var frontName    = table.frontTableName;
        var srcName      = table.backTableName;
        var newTableName = xcHelper.randName("tempGroupByTable-");

        if (colNum === -1) {
            colNum = undefined;
        }

        var msg = StatusMessageTStr.GroupBy + " " + operator;
        StatusMessage.show(msg);
        WSManager.addTable(newTableName);

        XcalarGroupBy(operator, newColName, backFieldName, srcName,
                      newTableName)
        .then(function() {
            // TODO Create new gTables entry
            // setIndex(newTableName, newTableCols);
            return (refreshTable(newTableName, tableNum,
                    KeepOriginalTables.Keep));
        })
        .then(function() {
            // add sql
            SQL.add("Group By", {
                "operation"    : "groupBy",
                "tableName"    : frontName,
                "backname"     : srcName,
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
    xcFunction.map = function (colNum, tableNum, fieldName, mapString) {
        var deferred = jQuery.Deferred();

        var table           = gTables[tableNum];
        var frontName       = table.frontTableName;
        var newTableName    = xcHelper.randName("tempMapTable-");
        var tablCols        = xcHelper.deepCopy(table.tableCols);
        var tableProperties = {
            "bookmarks" : xcHelper.deepCopy(table.bookmarks),
            "rowHeights": xcHelper.deepCopy(table.rowHeights)
        };
        var backTableName;
        var msg = StatusMessageTStr.Map + " " + fieldName;

        StatusMessage.show(msg);
        WSManager.addTable(newTableName);

        xcFunction.checkSorted(tableNum)
        .then(function(srcName) {
            backTableName = srcName;
            return (XcalarMap(fieldName, mapString, srcName, newTableName));
        })
        .then(function() {
            setIndex(newTableName, tablCols, null, tableProperties);

            return (refreshTable(newTableName, tableNum));
        })
        .then(function() {
            // add sql
            SQL.add("Map Column", {
                "operation"   : "mapColumn",
                "srcTableName": frontName,
                "backname"    : backTableName,
                "newTableName": newTableName,
                "colName"     : fieldName,
                "mapString"   : mapString
            });

            StatusMessage.success(msg);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error){
            Alert.error("mapColumn fails", error);
            StatusMessage.fail(StatusMessageTStr.MapFailed, msg);
            WSManager.removeTable(newTableName);

            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // export table
    xcFunction.exportTable = function(tableNum) {
        var frontName = gTables[tableNum].frontTableName;
        var retName   = $(".retTitle:disabled").val();

        if (!retName || retName === "") {
            retName = "testing";
        }

        var fileName  = retName + ".csv";
        var msg = StatusMessageTStr.ExportTable + ": " + frontName;

        StatusMessage.show(msg);

        xcFunction.checkSorted(tableNum)
        .then(function(srcName) {
            return (XcalarExport(srcName, fileName));
        })
        .then(function() {
            var location = hostname + ":/var/tmp/xcalar/" + fileName;
            // add sql
            SQL.add("Export Table", {
                "operation": "exportTable",
                "tableName": frontName,
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

    function getIndexedTable(srcName, fieldName, newTableName, isTable) {
        if (isTable) {
            return (XcalarIndexFromTable(srcName, fieldName, newTableName));
        } else {
            return (XcalarIndexFromDataset(srcName, fieldName, newTableName));
        }
    }

    // For xcFunction.join, check if table has correct index
    function checkJoinTableIndex(colName, table, isLeft) {
        var deferred      = jQuery.Deferred();

        var indexColName  = table.keyName;
        var frontName     = table.frontTableName;
        var backTableName = table.backTableName;

        var text          = isLeft ? "Left Table" : "Right Table";

        if (colName !== indexColName) {
            console.log(text, "not indexed correctly!");
            // XXX In the future,we can check if there are other tables that
            // are indexed on this key. But for now, we reindex a new table
           
            var isTable      = table.isTable;
            var srcName      = isTable ?
                                    backTableName :
                                    gTableIndicesLookup[frontName].datasetName;
            if (!isTable) {
                var newTableName = backTableName;
            } else {
                var newTableName = xcHelper.randName(backTableName);
            }

            getIndexedTable(srcName, colName, newTableName, isTable)
            .then(function() {
                if (isTable) {
                    SQL.add("Sort Table", {
                    "operation"   : "sort",
                    "tableName"   : srcName,
                    "key"         : colName,
                    "direction"   : "ASC",
                    "newTableName": newTableName
                    });
                } else {
                    SQL.add("Index From Dataset", {
                    "operation"   : "index",
                    "key"         : colName,
                    "newTableName": newTableName,
                    "dsName"      : backTableName.substring(0,
                                     backTableName.length - 6)
                    });
                }
                var colums = xcHelper.deepCopy(getIndex(srcName));

                setIndex(newTableName, colums);
                gTableIndicesLookup[newTableName].active = false;

                return (setupHiddenTable(newTableName));
            })
            .then(function() {
                var index = gHiddenTables.length - 1;

                RightSideBar.addTables([gHiddenTables[index]],
                                        IsActive.Inactive);

                deferred.resolve(newTableName);
            })
            .fail(deferred.reject);

        } else {
            console.log(text, "indexed correctly!");
            deferred.resolve(backTableName);
        }

        return (deferred.promise());
    }

    // For xcFuncion.join, deepy copy of right table and left table columns
    function createJoinedColumns(rightTable, leftTable) {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var newTableCols      = xcHelper.deepCopy(leftTable.tableCols);
        var len               = newTableCols.length;
        var newRightTableCols = xcHelper.deepCopy(rightTable.tableCols);
        var removed           = false;
        var dataCol;

        for (var i = 0; i < len; i++) {
            if (!removed) {
                if (newTableCols[i].name === "DATA") {
                    dataCol = newTableCols.splice(i, 1);
                    removed = true;
                }
            } else {
                newTableCols[i].index--;
            }
        }

        removed = false;

        for (var i = 0; i < newRightTableCols.length; i++) {
            newRightTableCols[i].index += len;

            if (!removed) {
                if (newRightTableCols[i].name === "DATA") {
                    newRightTableCols.splice(i, 1);
                    removed = true;
                }
            } else {
                newRightTableCols[i].index--;

            }
        }

        newTableCols = newTableCols.concat(newRightTableCols);
        // now newTablCols.length is differenet from len
        dataCol[0].index = newTableCols.length + 1;
        newTableCols = newTableCols.concat(dataCol);
        return (newTableCols);
    }

    return (xcFunction);
}(jQuery, {}));
