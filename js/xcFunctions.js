window.xcFunction = (function ($, xcFunction) {
    // filter table column
    xcFunction.filter = function (colNum, tableNum, options) {
        var deferred = jQuery.Deferred();

        var table        = gTables[tableNum];
        var tableName    = table.tableName;
        var frontColName = table.tableCols[colNum].name;
        var backColName  = table.tableCols[colNum].func.args[0];
        var tablCols     = xcHelper.deepCopy(table.tableCols);
        var msg          = StatusMessageTStr.Filter + ': ' + frontColName;
        var operator = options.operator;
        var value1 = options.value1;
        var value2 = options.value2;
        var value3 = options.value3;
        var fltStr = options.filterString;

        StatusMessage.show(msg);
        
        var previousTableName = xcFunction.getNewName(tableNum, tableName);
        WSManager.addTable(tableName);
        var renamePassed = false;
        XcalarRenameTable(tableName, previousTableName)
        .then(function() {
            xcFunction.renameHelper(tableNum, previousTableName, tableName);
            renamePassed = true;
            if (fltStr) {
                return (XcalarFilterHelper(fltStr, previousTableName,
                                           tableName));
            } else {
                return (XcalarFilter(operator, value1, value2, value3,
                                     previousTableName, tableName));
            }
        })
        .then(function() {
            setIndex(tableName, tablCols);
            return (refreshTable(tableName, tableNum));
        })
        .then(function() {
            // add sql
            SQL.add("Filter Table", {
                "operation"   : "filter",
                "tableName"   : previousTableName,
                "colName"     : frontColName,
                "backColName" : backColName,
                "colIndex"    : colNum,
                "operator"    : operator,
                "value"       : value2,
                "newTableName": tableName,
                "filterString": fltStr
            });
            
            StatusMessage.success(msg);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("failed here");
            Alert.error("Filter Columns Fails", error);
            StatusMessage.fail(StatusMessageTStr.FilterFailed, msg);
            
            if (renamePassed) {
                XcalarRenameTable(previousTableName, tableName)
                .then(function() {
                    xcFunction.renameHelper(tableNum, tableName,
                                            previousTableName);
                })
                .fail(function() {
                    // XX Not sure how to handle this;
                });
            }
            WSManager.renameTable(previousTableName, tableName);
            WSManager.removeTable(tableName);
            deferred.reject();
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
        var pCol      = table.tableCols[colNum - 1];
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

        var previousTableName = xcFunction.getNewName(tableNum, tableName);
        WSManager.addTable(tableName);
        var renamePassed = false;
        XcalarRenameTable(tableName, previousTableName)
        .then(function(){
            renamePassed = true;
            xcFunction.renameHelper(tableNum, previousTableName, tableName);
            return (XcalarIndexFromTable(previousTableName, backFieldName,
                                         tableName));
        })
        .then(function() {
            setDirection(tableName, order);
            setIndex(tableName, tablCols);

            return (refreshTable(tableName, tableNum,
                    KeepOriginalTables.DontKeep));
        })
        .then(function() {
            // add sql
            SQL.add("Sort Table", {
                "operation"   : "sort",
                "tableName"   : tableName,
                "key"         : frontFieldName,
                "direction"   : direction,
                "newTableName": tableName
            });

            StatusMessage.success(msg);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("Sort Rows Fails", error);
            StatusMessage.fail(StatusMessageTStr.SortFailed, msg);
            if (renamePassed) {
                XcalarRenameTable(previousTableName, tableName)
                .then(function() {
                    xcFunction.renameHelper(tableNum, tableName,
                                            previousTableName);
                })
                .fail(function() {
                    // XX Not sure how to handle this;
                });
            }
            WSManager.renameTable(previousTableName, tableName);
            WSManager.removeTable(tableName);
        });
    };

    // join two tables
    xcFunction.join = function (leftColNum, leftTableNum, rightColNum,
                                rightTableNum, joinStr, newTableName) {
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
        var leftTableName    = leftTable.tableName;
        var leftColName      = leftTable.tableCols[leftColNum].func.args[0];
        var leftFrontColName = leftTable.tableCols[leftColNum].name;

        var rightTable        = gTables[rightTableNum];
        var rightTableName    = rightTable.tableName;
        var rightColName      = rightTable.tableCols[rightColNum].func.args[0];
        var rightFrontColName = rightTable.tableCols[rightColNum].name;

        var leftSrcName;
        var rightSrcName;
        var newTableCols = createJoinedColumns(rightTable, leftTable);

        var msg = StatusMessageTStr.Join;
        var leftTableResult;
        var rightTableResult;
        StatusMessage.show(msg);
        WSManager.addTable(newTableName);
        showWaitCursor();
        // check left table lName"])index
        checkJoinTableIndex(leftColName, leftTable, isLeft, leftTableNum)
        .then(function(result) {
            leftTableResult = result;
            leftSrcName = result.tableName;
            // check right table index
            return (checkJoinTableIndex(rightColName, rightTable, isRight,
                                        rightTableNum));
        })
        .then(function(result) {
            rightTableResult = result;
            rightSrcName = result.tableName;
            // join indexed table
            console.log(leftSrcName, rightSrcName);
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
            .then(function() {
                deferred.reject(error);
            })
            .fail(function() {
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
        var newTableName = tableName + "-GroupBy";
        newTableName = xcHelper.randName(newTableName);
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
    xcFunction.map = function (colNum, tableNum, fieldName, mapString) {
        var deferred = jQuery.Deferred();

        var table           = gTables[tableNum];
        var tableName       = table.tableName;
        var tablCols        = xcHelper.deepCopy(table.tableCols);
        var tableProperties = {
            "bookmarks" : xcHelper.deepCopy(table.bookmarks),
            "rowHeights": xcHelper.deepCopy(table.rowHeights)
        };
        var msg = StatusMessageTStr.Map + " " + fieldName;

        StatusMessage.show(msg);
        var previousTableName = xcFunction.getNewName(tableNum, tableName);
        var renamePassed = false;
        WSManager.addTable(tableName);

        XcalarRenameTable(tableName, previousTableName)
        .then(function() {
            renamePassed = true;
            xcFunction.renameHelper(tableNum, previousTableName, tableName);
            return (XcalarMap(fieldName, mapString, previousTableName,
                              tableName));
        })
        .then(function() {
            
            setIndex(tableName, tablCols, null, tableProperties);
            return (refreshTable(tableName, tableNum));
        })
        .then(function() {
            // add sql
            SQL.add("Map Column", {
                "operation"   : "mapColumn",
                "srcTableName": previousTableName,
                "backname"    : tableName,
                "newTableName": tableName,
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
            if (renamePassed) {
                XcalarRenameTable(previousTableName, tableName)
                .then(function() {
                    xcFunction.renameHelper(tableNum, tableName,
                                            previousTableName);
                })
                .fail(function() {
                    // XX Not sure how to handle this;
                });
            }
            WSManager.renameTable(previousTableName, tableName);
            WSManager.removeTable(tableName);

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
            if (srcTableNum.length === 0 || isNaN(tableNum)) {
                srcTableNum = -1;
            } else {
                srcTableNum = parseInt(srcTableNum);
            }
            newTableName = tableName + "_" + (srcTableNum + 1);
        }
        WSManager.renameTable(tableName, newTableName);
        return (newTableName);
    };
    
    // does renames for gTables, worksheet, rightsidebar, dag
    xcFunction.renameHelper = function(tableNum, newTableName, oldTableName) {
        gTables[tableNum].tableName = newTableName;
        gTableIndicesLookup[newTableName] = gTableIndicesLookup[oldTableName];
        gTableIndicesLookup[newTableName].tableName = newTableName;
        delete gTableIndicesLookup[oldTableName];
        RightSideBar.renameTable(oldTableName, newTableName);  
        Dag.renameAllOccurrences(oldTableName, newTableName);
        $('#xcTheadWrap' + tableNum + ' .tableTitle input')
                                        .data('title', newTableName);
        return (newTableName);
    };

    // For xcFunction.join, check if table has correct index
    function checkJoinTableIndex(colName, table, isLeft, tableNum) {
        var deferred      = jQuery.Deferred();

        var indexColName  = table.keyName;
        var tableName     = table.tableName;

        var text          = isLeft ? "Left Table" : "Right Table";

        if (colName !== indexColName) {
            console.log(text, "not indexed correctly!");
            // XXX In the future,we can check if there are other tables that
            // are indexed on this key. But for now, we reindex a new table

            var previousTableName = xcFunction.getNewName(tableNum, tableName);
            var renamePassed = false;
            WSManager.addTable(tableName);

            XcalarRenameTable(tableName, previousTableName)
            .then(function() {
                xcFunction.renameHelper(tableNum, previousTableName, tableName);
                renamePassed = true;
                return (XcalarIndexFromTable(previousTableName, colName,
                                             tableName));
            })
            .then(function() {
                SQL.add("Index From Dataset", {
                "operation"   : "index",
                "key"         : colName,
                "newTableName": tableName,
                "dsName"      : tableName.substring(0,
                                 tableName.length - 6)
                });
                
                var columns = xcHelper.deepCopy(getIndex(previousTableName));
                setIndex(tableName, columns);
                gTableIndicesLookup[tableName].active = false;

                return (setupHiddenTable(tableName));
            })
            .then(function() {
                var index = gHiddenTables.length - 1;
                RightSideBar.addTables([gHiddenTables[index]],
                                        IsActive.Inactive);
                var result = {
                    newTableCreated : true,
                    tableName : tableName,
                    previousTableName : previousTableName
                };
                deferred.resolve(result);
            })
            .fail(function(error) {
                if (renamePassed) {
                    XcalarRenameTable(previousTableName, tableName)
                    .then(function() {
                        xcFunction.renameHelper(tableNum, tableName,
                                                previousTableName);
                    })
                    .fail(function() {
                        // XX Not sure how to handle this;
                    });
                }
                WSManager.renameTable(previousTableName, tableName);
                WSManager.removeTable(tableName);
                deferred.reject(error);
            });

        } else {
            console.log(text, "indexed correctly!");
            var result = {
                newTableCreated : false,
                tableName : tableName
            };
            deferred.resolve(result);
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

    // this function is called when a new table is created during a join because
    // the previous table wasn't correctly index, but the join failed so we have
    // to delete the new table and rename the old one back
    function renameTableJoinFailure(tableNum, result) {
        var deferred = jQuery.Deferred();
        if (!result.newTableCreated) {
            deferred.resolve();
            return (deferred.promise());
        }
        var tableName = result.tableName;
        var previousTableName = result.previousTableName;

        $('#inactiveTablesList').find('.tableInfo[data-tableName="' +
                                      tableName + '"]')
                                .find('.addArchivedBtn')
                                .click();

        RightSideBar.tableBulkAction("delete")
        .then(function() {
            return (XcalarRenameTable(previousTableName, tableName));
        })
        .then(function() {
            // WSManager.removeTable(previousTableName);
            WSManager.renameTable(previousTableName, tableName);
            xcFunction.renameHelper(tableNum, tableName, previousTableName);
            deferred.resolve();
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    return (xcFunction);
}(jQuery, {}));
