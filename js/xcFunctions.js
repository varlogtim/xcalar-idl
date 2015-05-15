window.xcFunction = (function ($, xcFunction) {
    xcFunction.checkSorted = function(tableNum) {
        var deferred  = jQuery.Deferred();
        // XXX for general case, the two names should be the same for 
        // data set sample table
        var frontName = gTables[tableNum].frontTableName
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
                gTables[tableNum].isTable = true;

                return (getResultSet(true, srcName));
            })
            .then(function(resultSet) {
                gTables[tableNum].resultSetId = resultSet.resultSetId;

                deferred.resolve(srcName);
            });
        }
        return (deferred.promise());
    }
    // filter table column
    xcFunction.filter = function (colNum, tableNum, operator, value) {
        var table        = gTables[tableNum];
        var frontName    = table.frontTableName;
        var frontColName = table.tableCols[colNum - 1].name;
        var backColName  = table.tableCols[colNum - 1].func.args[0];
        var tablCols     = xcHelper.deepCopy(table.tableCols);
        var newTableName = xcHelper.randName("tempFilterTable-");
        var msg          = StatusMessageTStr.Filter+': '+frontColName;

        StatusMessage.show(msg);

        xcFunction.checkSorted(tableNum)
        .then(function(srcName) {
            return (XcalarFilter(operator, value, backColName, 
                                 srcName, newTableName));
        })
        .then(function() {
            setIndex(newTableName, tablCols);

            return (refreshTable(newTableName, tableNum));
        })
        .then(function() {
            // add sql
            SQL.add("Filter Table", {
                "operation"    : "filter",
                "tableName"    : frontName,
                "colName"      : frontColName,
                "colIndex"     : colNum,
                "operator"     : operator,
                "value"        : value,
                "newTableName" : newTableName
            });

            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("Filter Columns Fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msg);
        });
    }

    // aggregate table column
    xcFunction.aggregate = function (colNum, tableNum, aggrOp) {
        var table     = gTables[tableNum];
        var frontName = gTables[tableNum].frontTableName;
        var pCol      = table.tableCols[colNum - 1];

        if (pCol.func.func != "pull") {
            console.log(pCol);
            alert("Cannot aggregate on column that does not exist in DATA.");
            return;
        }

        var frontColName = pCol.name;
        var backColName  = pCol.func.args[0];
        var msg          = StatusMessageTStr.Aggregate + " " + aggrOp + " " + 
                           StatusMessageTStr.OnColumn + ": " + frontColName;

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
                "title"      : "Aggregate: " + aggrOp,
                "instr"      : instr,
                "msg"        : value,
                "isAlert"    : true,
                "isCheckBox" : true
            });

            try {
                var val = JSON.parse(value);
                // add sql
                SQL.add("Aggregate", {
                    "operation" : "aggregate",
                    "tableName" : frontName,
                    "colName"   : frontColName,
                    "colIndex"  : colNum,
                    "operator"  : aggrOp,
                    "value"     : val["Value"]
                });
            } catch(error) {
                consolr.error(error, val);
            }

            StatusMessage.success(msg);
        })
        .fail(function(error) {
            Alert.error("Aggregate fails", error);
            StatusMessage.fail(StatusMessageTStr.AggregateFailed, msg);
        })
        .always(removeWaitCursor);
    }

    // sort tabe column
    xcFunction.sort = function (colNum, tableNum, order) {
        var table     = gTables[tableNum];
        var isTable   = table.isTable;
        var tableName = table.frontTableName;
        var srcName   = isTable ? table.backTableName : 
                                  gTableIndicesLookup[tableName].datasetName;
        var tablCols  = xcHelper.deepCopy(table.tableCols);
        var pCol      = table.tableCols[colNum - 1];

        var newTableName = xcHelper.randName("tempSortTable-");
        var backFieldName;
        var frontFieldName;

        switch(pCol.func.func) {
            case ("pull"):
                // Pulled directly, so just sort by this
                frontFieldName = pCol.name;
                backFieldName = pCol.func.args[0];
                break;
            default:
                var error = "Cannot sort a col derived from unsupported func";
                console.error(error);
                return;
        }


        var direction = (order == SortDirection.Forward) ? "ASC" : "DESC";
        var msg       = StatusMessageTStr.Sort + " " + frontFieldName;

        StatusMessage.show(msg);

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
                "operation"    : "sort",
                "tableName"    : tableName,
                "key"          : frontFieldName,
                "direction"    : direction,
                "newTableName" : newTableName
            });

            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("Sort Rows Fails", error);
            StatusMessage.fail(StatusMessageTStr.SortFailed, msg);
        });
    }

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
                console.log("Incorrect join type!");
                break;
        }

        console.log("leftColNum"   , leftColNum,
                    "leftTableNum" , leftTableNum, 
                    "rightColNum"  , rightColNum,
                    "rightTableNum", rightTableNum,
                    "joinStr"      , joinStr,
                    "newTableName" , newTableName);

        var leftTable      = gTables[leftTableNum];
        var leftFrontName  = leftTable.frontTableName;
        var leftColName    = leftTable.tableCols[leftColNum].func.args[0];
        var leftFrontColName    = leftTable.tableCols[leftColNum].name;

        var rightTable     = gTables[rightTableNum];
        var rightFrontName = rightTable.frontTableName
        var rightColName   = rightTable.tableCols[rightColNum].func.args[0];
        var rightFrontColName   = rightTable.tableCols[rightColNum].name;

        var leftSrcName;
        var rightSrcName;
        var newTableCols   = createJoinedColumns(rightTable, leftTable);

        var msg            = StatusMessageTStr.Join;

        StatusMessage.show(msg);

        showWaitCursor();
        // check left table index
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
                "operation"    : "join",
                "leftTable"    : {
                    "name"     : leftFrontName,
                    "colName"  : leftFrontColName,
                    "colIndex" : leftColNum
                },
                "rightTable"   : {
                    "name"     : rightFrontName,
                    "colName"  : rightFrontColName,
                    "colIndex" : rightColNum
                },
                "joinType"     : joinStr,
                "newTableName" : newTableName
            });

            StatusMessage.success(msg);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Join Table Fails", error);
            StatusMessage.fail(StatusMessageTStr.JoinFailed, msg);

            deferred.reject(error);
        })
        .always(removeWaitCursor);

        return (deferred.promise());
    }

    // group by on a column
    xcFunction.groupBy = function (colNum, tableNum, newColName, operator) {
        var table          = gTables[tableNum];
        var frontName      = table.frontTableName;
        var srcName        = table.backTableName;
        var frontFieldName = table.tableCols[colNum - 1].name;
        var backFieldName  = table.tableCols[colNum - 1].func.args[0];
        var newTableName   = xcHelper.randName("tempGroupByTable-");

        var msg            = StatusMessageTStr.GroupBy + " " + operator;

        StatusMessage.show(msg);
        
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
                "operation"     : "groupBy",
                "tableName"     : frontName,
                "colName"       : frontFieldName,
                "colIndex"      : colNum,
                "operator"      : operator,
                "newTableName"  : newTableName,
                "newColumnName" : newColName
            });

            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("GroupBy fails", error);
            StatusMessage.fail(StatusMessageTStr.GroupByFailed, msg);
        });
    }

    // map a column
    xcFunction.map = function (colNum, tableNum, fieldName, mapString) {
        var deferred        = jQuery.Deferred();

        var table           = gTables[tableNum];
        var frontName       = table.frontTableName;
        var newTableName    = xcHelper.randName("tempMapTable-");
        var tablCols        = xcHelper.deepCopy(table.tableCols);
        var tableProperties = { 
            "bookmarks"  :  xcHelper.deepCopy(table.bookmarks), 
            "rowHeights" :  xcHelper.deepCopy(table.rowHeights)
        };

        var msg             = StatusMessageTStr.Map + " " + fieldName;

        StatusMessage.show(msg);

        xcFunction.checkSorted(tableNum)
        .then(function(srcName) {
            return (XcalarMap(fieldName, mapString, srcName, newTableName));
        })
        .then(function() {
            setIndex(newTableName, tablCols, null, tableProperties);

            return (refreshTable(newTableName, tableNum));
        })
        .then(function() {
            // add sql
            SQL.add("Map Column", {
                "operation"    : "mapColumn",
                "srcTableName" : frontName,
                "newTableName" : newTableName,
                "colName"      : fieldName,
                "mapString"    : mapString
            });

            StatusMessage.success(msg);
            commitToStorage();

            deferred.resolve();
        })
        .fail(function(error){
            Alert.error("mapColumn fails", error);
            StatusMessage.fail(StatusMessageTStr.MapFailed, msg);

            deferred.reject(error);
        });

        return (deferred.promise());
    }
    // export table
    xcFunction.exportTable = function(tableNum) {
        var frontName = gTables[tableNum].frontTableName;
        var retName   = $(".retTitle:disabled").val();

        if (!retName || retName == "") {
            retName = "testing";
        }

        var fileName  = retName + ".csv";
        var msg       = StatusMessageTStr.ExportTable + ": " + frontName;

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

            var title = "Successful Export";
            var ins   = "Widget location: " +
                        "http://schrodinger/dogfood/widget/main.html?"+
                        "rid=" + retName;
            var msg   = "File location: " + location;

            Alert.show({'title'  : title, 'msg'       :msg, 'instr': ins,
                        'isAlert': true,  'isCheckBox':true });
            StatusMessage.success(msg);
        })
        .fail(function(error) {
            Alert.error("Export Table Fails", error);
            StatusMessage.fail(StatusMessageTStr.ExportFailed, msg);
        })
        .always(function() {
            // removeWaitCursor();
        });
    }

    function getIndexedTable(srcName, fieldName, newTableName, isTable) {
        if (isTable) {
            return (XcalarIndexFromTable(srcName, fieldName, newTableName));
        } else {
            return (XcalarIndexFromDataset(srcName, fieldName, newTableName));
        }
    }

    // For xcFuncion.join, check if table has correct index
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
            var newTableName = xcHelper.randName(backTableName);
            var isTable      = table.isTable;
            var srcName      = isTable ? 
                                    backTableName : 
                                    gTableIndicesLookup[frontName].datasetName;

            getIndexedTable(srcName, colName, newTableName, isTable)
            .then(function() {
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
                if (newTableCols[i].name == "DATA") {
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
                if (newRightTableCols[i].name == "DATA") {
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