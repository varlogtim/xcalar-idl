// this module support column related functions
window.ColManager = (function($, ColManager) {
    // new ProgCol obj
    ColManager.newCol = function(options) {
        var progCol = new ProgCol(options);
        return (progCol);
    };

    ColManager.newPullCol = function(colName, type) {
        return (ColManager.newCol({
            "backName": colName,
            "name"    : colName,
            "type"    : type,
            "width"   : gNewCellWidth,
            "isNewCol": false,
            "userStr" : '"' + colName + '" = pull(' + colName + ')',
            "func"    : {
                "name": "pull",
                "args": [colName]
            }
        }));
    };

    // special case, specifically for DATA col
    ColManager.newDATACol = function() {
        var progCol = ColManager.newCol({
            "backName": "DATA",
            "name"    : "DATA",
            "type"    : "object",
            "width"   : "auto",// to be determined when building table
            "userStr" : "DATA = raw()",
            "func"    : {
                "name": "raw",
                "args": []
            },
            "isNewCol": false
        });

        return (progCol);
    };

    ColManager.setupProgCols = function(tableId) {
        var keyName = gTables[tableId].keyName;
        // We cannot rely on addCol to create a new progCol object because
        // add col relies on gTableCol entry to determine whether or not to add
        // the menus specific to the main key
        var newProgCol = ColManager.newCol({
            "backName": keyName,
            "name"    : keyName,
            "width"   : gNewCellWidth,
            "userStr" : '"' + keyName + '" = pull(' + keyName + ')',
            "func"    : {
                "name": "pull",
                "args": [keyName]
            },
            "isNewCol": false
        });

        insertColHelper(0, tableId, newProgCol);
        // is this where we add the indexed column??
        insertColHelper(1, tableId, ColManager.newDATACol(2));
    };

    ColManager.addCol = function(colNum, tableId, name, options) {
        var $tableWrap = $("#xcTableWrap-" + tableId);
        var $table     = $tableWrap.find(".xcTable");
        var table      = gTables[tableId];
        var numCols    = table.tableCols.length;
        var newColid   = colNum;

        // options
        options = options || {};
        var width       = options.width || gNewCellWidth;
        // var resize      = options.resize || false;
        var isNewCol    = options.isNewCol || false;
        var select      = options.select || false;
        var inFocus     = options.inFocus || false;
        var newProgCol  = options.progCol;
        var type        = newProgCol ? "undefined" : "newColumn";
        var noAnimate   = options.noAnimate;
        var isHidden    = options.isHidden || false;
        var decimals    = options.decimals || -1;
        var format      = options.format || null;
        var columnClass;
        var color;


        if (options.direction !== "L") {
            newColid += 1;
        }

        if (name == null) {
            name = "";
            select = true;
            columnClass = " newColumn";
        } else if (name === table.keyName) {
            columnClass = " indexedColumn";
        } else {
            columnClass = "";
        }

        if (select) {
            color = " selectedCell";
            $('.selectedCell').removeClass('selectedCell');
        } else if (isNewCol) {
            color = " unusedCell";
        } else {
            color = "";
        }

        if (!newProgCol) {
            name = name || "";

            newProgCol = ColManager.newCol({
                "backName": name,
                "name"    : name,
                "width"   : width,
                "userStr" : '"' + name + '" = ',
                "isNewCol": isNewCol,
                "type"    : type,
                "isHidden": isHidden,
                "decimals": decimals,
                "format"  : format
            });

            insertColHelper(newColid - 1, tableId, newProgCol);
        }
        // change table class before insert a new column
        for (var i = numCols; i >= newColid; i--) {
            $tableWrap.find('.col' + i)
                      .removeClass('col' + i)
                      .addClass('col' + (i + 1));
        }
        // insert new th column
        options = {
            "name"    : name,
            "width"   : width,
            "isHidden": isHidden
        };

        var $th = $(TblManager.generateColumnHeadHTML(columnClass, color,
                                                      newColid, options));
        $tableWrap.find('.th.col' + (newColid - 1)).after($th);

        if (isNewCol) {
            $th.find(".flexContainer").mousedown()
                .find(".editableHead").focus();
        }

        if (gMinModeOn || noAnimate) {
            updateTableHeader(tableId);
            TableList.updateTableInfo(tableId);
            $tableWrap.find('.rowGrab').width($table.width());
            matchHeaderSizes($table);
            moveFirstColumn();
        } else {
            // var $th = $tableWrap.find('.th.col' + newColid);
            $th.width(10);
            if (!isHidden) {
                $th.animate({width: width}, 300, function() {
                        updateTableHeader(tableId);
                        TableList.updateTableInfo(tableId);
                        matchHeaderSizes($table);
                    });
                moveTableTitlesAnimated(tableId, $tableWrap.width(),
                                    10 - width, 300);
            } else {
                updateTableHeader(tableId);
                TableList.updateTableInfo(tableId);
                matchHeaderSizes($table);
            }
        }

        // get the first row in UI and start to add td to each row
        // var numRow = $table.find("tbody tr").length;
        var idOfFirstRow  = $table.find("tbody tr:first").attr("class");
        var idOfLastRow  = $table.find("tbody tr:last").attr("class");
        var startingIndex = idOfFirstRow ?
                                parseInt(idOfFirstRow.substring(3)) : 1;
        var endingIndex = parseInt(idOfLastRow.substring(3));

        if (columnClass !== " indexedColumn") {
            columnClass = ""; // we don't need to add class to td otherwise
        }

        var newCellHTML = '<td ' + 'class="' + color + ' ' + columnClass +
                          ' col' + newColid + '"></td>';

        var i = startingIndex;
        while (i <= endingIndex) {
            $table.find(".row" + i + " .col" + (newColid - 1))
                  .after(newCellHTML);
            i++;
        }

        if (inFocus) {
            var $input = $table.find('tr:first .editableHead.col' + newColid);
            // Without doing this, the lastTarget will still be a div
            // even we focus on the input, so press space will make table scroll
            gMouseEvents.setMouseDownTarget($input);
            gMouseEvents.setClickTarget($input);
            $input.focus();
        }
    };

    //options
    // noAnimate: boolean, if true, no animation is applied
    ColManager.delCol = function(colNums, tableId, options) {
        // deletes an array of columns
        var deferred  = jQuery.Deferred();
        var table     = gTables[tableId];
        var tableName = table.tableName;
        var $table    = $('#xcTable-' + tableId);
        var numCols   = colNums.length;
        var colNum;
        var colIndex;
        var colNames = [];
        var promises = [];
        var colWidths = 0;
        var tableWidth = $table.closest('.xcTableWrap').width();
        var progCols = [];
        options = options || {};
        for (var i = 0; i < numCols; i++) {
            colNum = colNums[i];
            colIndex = colNum - i;
            var col = table.tableCols[colIndex - 1];
            colNames.push(col.name);
            progCols.push(col);
            if (col.isHidden) {
                colWidths += 15;
            } else {
                colWidths += table.tableCols[colIndex - 1].width;
            }
            promises.push(delColHelper(colNum, colNum, tableId, true, colIndex,
                                       options.noAnimate));
        }
        if (gMinModeOn || options && options.noAnimate) {
            moveTableTitles($table.closest('.xcTableWrap'));
        } else {
            moveTableTitlesAnimated(tableId, tableWidth, colWidths, 200);
        }

        var noSave = true;
        FnBar.clear(noSave);

        jQuery.when.apply($, promises).done(function() {
            var numAllCols = table.tableCols.length;
            updateTableHeader(tableId);
            TableList.updateTableInfo(tableId);
            for (var j = colNums[0]; j <= numAllCols; j++) {
                var oldColNum = xcHelper.parseColNum($table.find('th').eq(j));
                $table.find(".col" + oldColNum)
                      .removeClass('col' + oldColNum)
                      .addClass('col' + j);
            }

            matchHeaderSizes($table);
            xcHelper.removeSelectionRange();

             // add SQL
            SQL.add("Delete Column", {
                "operation"  : SQLOps.DeleteCol,
                "tableName"  : tableName,
                "tableId"    : tableId,
                "colNames"   : colNames,
                "colNums"    : colNums,
                "progCols"   : progCols,
                "htmlExclude": ["progCols"]
            });
            deferred.resolve();
        });

        return (deferred.promise());
    };

    // specifically used for json modal
    ColManager.pullCol = function(colNum, tableId, nameInfo, pullColOptions) {
        var deferred = jQuery.Deferred();

        pullColOptions = pullColOptions || {};

        var isDataTd = pullColOptions.isDataTd || false;
        var isArray  = pullColOptions.isArray || false;
        var noAnimate = pullColOptions.noAnimate || false;

        var $table    = $("#xcTable-" + tableId);
        var table     = gTables[tableId];
        var tableCols = table.tableCols;
        var col       = tableCols[colNum - 1];
        var fullName  = nameInfo.name;
        var escapedName = nameInfo.escapedName;

        if (!isDataTd) {
            var symbol = "";
            if (!isArray) {
                symbol = ".";
            }

            escapedName = col.getBackColName() + symbol + escapedName;
            fullName = col.getBackColName().replace(/\\\./g, ".") + symbol +
                       fullName;
        }
        var usrStr = '"' + fullName + '" = pull(' + escapedName + ')';

        var tableName   = table.tableName;
        var siblColName = table.tableCols[colNum - 1].name;
        var newColName  = xcHelper.getUniqColName(tableId, fullName);
        var direction;
        if (isDataTd) {
            direction = "L";
        } else {
            direction = "R";
        }
        var widthOptions = {
            defaultHeaderStyle: true
        };
        var width = getTextWidth($(), newColName, widthOptions);
        ColManager.addCol(colNum, tableId, newColName, {
            "direction": direction,
            "select"   : true,
            "noAnimate": noAnimate,
            "width"    : width
        });

        if (direction === "R") {
            colNum++;
        }

        // now the column is different as we add a new column
        var newCol = table.tableCols[colNum - 1];
        newCol.func.name = "pull";
        newCol.func.args = [escapedName];
        newCol.userStr = usrStr;

        var sqlOptions = {
            "operation"     : SQLOps.PullCol,
            "tableName"     : tableName,
            "tableId"       : tableId,
            "siblColName"   : siblColName,
            "newColName"    : newColName,
            "colNum"        : colNum,
            "direction"     : direction,
            "nameInfo"      : nameInfo,
            "pullColOptions": pullColOptions,
            "htmlExclude"   : ["pullColOptions"]
        };

        ColManager.execCol("pull", usrStr, tableId, colNum, {noLog: true})
        .then(function() {
            updateTableHeader(tableId);
            TableList.updateTableInfo(tableId);
            $table.find("tr:first th.col" + (colNum + 1) +
                        " .editableHead").focus();

            // add sql
            SQL.add("Pull Column", sqlOptions);
            deferred.resolve();
        })
        .fail(function(error) {
            SQL.errorLog("Pull Column", sqlOptions, null, error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    ColManager.changeType = function(colTypeInfos, tableId) {
        var deferred = jQuery.Deferred();

        var numColInfos = colTypeInfos.length;
        var worksheet   = WSManager.getWSFromTable(tableId);
        var table       = gTables[tableId];
        var tableName   = table.tableName;
        var tableCols   = table.tableCols;

        var tableNamePart = tableName.split("#")[0];
        var newTableNames = [];
        var newFieldNames = [];
        var mapStrings = [];

        var i;
        var colInfo;
        var col;
        for (i = numColInfos - 1; i >= 0; i--) {
            newTableNames[i] = tableNamePart + Authentication.getHashId();
            colInfo = colTypeInfos[i];
            col = tableCols[colInfo.colNum - 1];
            // here use front col name to generate newColName
            newFieldNames[i] = xcHelper.getUniqColName(tableId,
                                        col.getFronColName() + "_" + colInfo.type);
            mapStrings[i] = xcHelper.castStrHelper(col.getBackColName(), colInfo.type);
        }

        // this makes it easy to get previous table name
        // when index === numColInfos
        newTableNames[numColInfos] = tableName;

        xcHelper.lockTable(tableId);

        var sql = {
            "operation"   : SQLOps.ChangeType,
            "tableName"   : tableName,
            "tableId"     : tableId,
            "newTableName": newTableNames[0],
            "colTypeInfos": colTypeInfos
        };
        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.ChangeType,
            "operation": SQLOps.ChangeType,
            "sql"      : sql
        });

        var promises = [];
        for (i = numColInfos - 1; i >= 0; i--) {
            promises.push(chagneTypeHelper.bind(this, i));
        }

        PromiseHelper.chain(promises)
        .then(function(newTableId) {
            // map do not change stats of the table
            Profile.copy(tableId, newTableId);
            xcHelper.unlockTable(tableId);

            Transaction.done(txId, {"msgTable": newTableId});
            deferred.resolve(newTableId);
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ChangeTypeFailed,
                "error"  : error
            });
            deferred.reject(error);
        });

        return (deferred.promise());

        function chagneTypeHelper(index) {
            var innerDeferred = jQuery.Deferred();

            var curTableName = newTableNames[index + 1];
            var newTableName = newTableNames[index];
            var fieldName = newFieldNames[index];
            var mapString = mapStrings[index];
            var curColNum = colTypeInfos[index].colNum;

            XIApi.map(txId, mapString, curTableName, fieldName, newTableName)
            .then(function() {
                var mapOptions = {"replaceColumn": true};
                var curTableId = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;

                var newTablCols = xcHelper.mapColGenerate(curColNum, fieldName,
                                        mapString, curTableCols, mapOptions);

                if (index > 0) {
                    TblManager.setOrphanTableMeta(newTableName, newTablCols);
                    return PromiseHelper.resolve(null);
                } else {
                    var options = {
                        selectCol: curColNum
                    };
                    return TblManager.refreshTable([newTableName], newTablCols,
                                               [tableName], worksheet, options);
                }
            })
            .then(function() {
                var newTableId = xcHelper.getTableId(newTableName);
                innerDeferred.resolve(newTableId);
            })
            .fail(function(error) {
                innerDeferred.reject(error);
            });

            return (innerDeferred.promise());
        }
    };



    // XXX temporarily invalid it because xcalarQuery may crash
    // instead of return error status
    // ColManager.changeType = function(colTypeInfos, tableId) {
    //     function mapStrHelper(colName, colType) {
    //         var mapStr = "";
    //         switch (colType) {
    //             case ("boolean"):
    //                 mapStr += "bool(";
    //                 break;
    //             case ("float"):
    //                 mapStr += "float(";
    //                 break;
    //             case ("integer"):
    //                 mapStr += "int(";
    //                 break;
    //             case ("string"):
    //                 mapStr += "string(";
    //                 break;
    //             default:
    //                 console.warn("XXX no such operator! Will guess");
    //                 mapStr += colType + "(";
    //                 break;
    //         }

    //         mapStr += colName + ")";

    //         return (mapStr);
    //     }

    //     function setTableHelper(curTableName, curTableCols, curWS, srcTable, archive) {
    //         var innerDeferred = jQuery.Deferred();
    //         var curTableId = xcHelper.getTableId(curTableName);
    //         var srcTableId = srcTable.tableId;
    //         var tableProperties = {
    //             "bookmarks" : xcHelper.deepCopy(srcTable.bookmarks),
    //             "rowHeights": xcHelper.deepCopy(srcTable.rowHeights)
    //         };

    //         setgTable(curTableName, curTableCols, null, tableProperties)
    //         .then(function() {
    //             // map do not change stats of the table
    //             Profile.copy(srcTableId, curTableId);
    //             WSManager.addTable(curTableId, curWS);
    //             if (archive) {
    //                 archiveTable(curTableId, ArchiveTable.Keep);
    //             }
    //         })
    //         .then(innerDeferred.resolve)
    //         .fail(innerDeferred.reject);

    //         return (innerDeferred.promise());
    //     }

    //     var deferred = jQuery.Deferred();

    //     var numColInfos = colTypeInfos.length;
    //     var table       = gTables[tableId];
    //     var tableName   = table.tableName;
    //     var tableCols   = table.tableCols;
    //     var currentWS   = WSManager.getActiveWS();

    //     var tableNamePart = tableName.split("#")[0];
    //     var tableNames = [];
    //     var fieldNames = [];
    //     var mapStrings = [];
    //     var query = "";
    //     var finalTable = "";
    //     var finalTableId;
    //     var msgId;
    //     var sqlOptions;

    //     getUnsortedTableName(tableName)
    //     .then(function(unsortedTableName) {
    //         var srctable = unsortedTableName;

    //         for (var i = 0; i < numColInfos; i++) {
    //             var colInfo = colTypeInfos[i];
    //             var col = tableCols[colInfo.colNum - 1];

    //             tableNames[i] = tableNamePart + Authentication.getHashId();
    //             // here use front col name to generate newColName
    //             fieldNames[i] = col.name + "_" + colInfo.type;
    //             mapStrings[i] = mapStrHelper(col.getBackColName(), colInfo.type);

    //             query += 'map --eval "' + mapStrings[i] +
    //                     '" --srctable "' + srctable +
    //                     '" --fieldName "' + fieldNames[i] +
    //                     '" --dsttable "' + tableNames[i] + '"';

    //             if (i !== numColInfos - 1) {
    //                 query += ';';
    //             }

    //             srctable = tableNames[i];
    //         }

    //         finalTable = tableNames[numColInfos - 1];
    //         finalTableId = xcHelper.getTableId(finalTable);

    //         var msg = StatusMessageTStr.ChangeType;
    //         var msgObj = {
    //             "msg"      : msg,
    //             "operation": SQLOps.ChangeType
    //         };
    //         msgId = StatusMessage.addMsg(msgObj);
    //         xcHelper.lockTable(tableId);
    //         WSManager.addTable(finalTableId);

    //         sqlOptions = {
    //             "operation"   : SQLOps.ChangeType,
    //             "tableName"   : tableName,
    //             "tableId"     : tableId,
    //             "newTableName": finalTable,
    //             "colTypeInfos": colTypeInfos
    //         };
    //         var queryName = xcHelper.randName("changeType");

    //         return (XcalarQueryWithCheck(queryName, query));
    //     })
    //     .then(function() {
    //         var mapOptions = { "replaceColumn": true };
    //         var curTableCols = tableCols;
    //         var promises = [];

    //         for (var j = 0; j < numColInfos; j++) {
    //             var curColNum = colTypeInfos[j].colNum;
    //             var curTable  = tableNames[j];
    //             var archive   = (j === numColInfos - 1) ? false : true;

    //             curTableCols = xcHelper.mapColGenerate(curColNum, fieldNames[j],
    //                                 mapStrings[j], curTableCols, mapOptions);
    //             promises.push(setTableHelper.bind(this, curTable, curTableCols,
    //                                               currentWS, table, archive));
    //         }

    //         return (PromiseHelper.chain(promises));
    //     })
    //     .then(function() {
    //         return (refreshTable(finalTable, tableName));
    //     })
    //     .then(function() {
    //         xcHelper.unlockTable(tableId);
    //         StatusMessage.success(msgId, false, finalTableId);

    //         SQL.add("Change Data Type", sqlOptions, query);
    //         KVStore.commit();
    //         deferred.resolve();
    //     })
    //     .fail(function(error) {
    //         xcHelper.unlockTable(tableId);
    //         WSManager.removeTable(finalTableId);

    //         Alert.error(StatusMessageTStr.ChangeTypeFailed, error);
    //         StatusMessage.fail(StatusMessageTStr.ChangeTypeFailed, msgId);
    //         SQL.errorLog("Change Data Type", sqlOptions, query, error);
    //         deferred.reject(error);
    //     });

    //     return (deferred.promise());
    // };

    ColManager.splitCol = function(colNum, tableId, delimiter, numColToGet, isAlertOn) {
        // isAlertOn is a flag to alert too many column will generate
        // when do replay, this flag is null, so no alert
        // since we assume user want to replay it.
        var deferred = jQuery.Deferred();
        var splitWithDelimIndex = null;
        var userNumColToGet = numColToGet;

        var worksheet   = WSManager.getActiveWS();
        var table       = gTables[tableId];
        var tableName   = table.tableName;
        var tableCols   = table.tableCols;
        var newColNum   = colNum;
        var colName     = tableCols[colNum - 1].name;
        var backColName = tableCols[colNum - 1].getBackColName();

        var tableNamePart = tableName.split("#")[0];
        var newTableNames = [];
        var newFieldNames = [];

        xcHelper.lockTable(tableId);

        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.SplitColumn,
            "operation": SQLOps.SplitCol
        });

        getSplitNumHelper()
        .then(function(colToSplit, delimIndex) {
            numColToGet = colToSplit;
            splitWithDelimIndex = delimIndex;

            // index starts with 1 to make the code easier,
            // since the xdf cut(col, index, delim)'s index also stars with 1
            var i;
            for (i = 1; i <= numColToGet; i++) {
                newTableNames[i] = tableNamePart + Authentication.getHashId();
            }

            // Check duplication
            var tryCount  = 0;
            var colPrefix = colName + "-split";

            i = 1;
            while (i <= numColToGet && tryCount <= 50) {
                ++tryCount;

                for (i = 1; i <= numColToGet; i++) {
                    if (i === numColToGet && splitWithDelimIndex != null) {
                        newFieldNames[i] = colPrefix + "-rest";
                    } else {
                        newFieldNames[i] = colPrefix + "-" + i;
                    }

                    if (table.hasCol(newFieldNames[i])) {
                        newFieldNames = [];
                        colPrefix = colName + "-split-" + tryCount;
                        break;
                    }
                }
            }

            if (tryCount > 50) {
                console.warn("Too much try, overwrite origin col name!");
                for (i = 1; i <= numColToGet; i++) {
                    newFieldNames[i] = colName + "-split" + i;
                }
            }

            // do this so that it's easy to get parent table in splitColHelper()
            newTableNames[0] = tableName;

            var promises = [];
            for (i = 1; i <= numColToGet; i++) {
                promises.push(splitColHelper.bind(this, i));
            }

            return PromiseHelper.chain(promises);
        })
        .then(function(newTableId) {
            // map do not change stats of the table
            Profile.copy(tableId, newTableId);
            xcHelper.unlockTable(tableId);

            var sql = {
                "operation"   : SQLOps.SplitCol,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "newTableName": newTableNames[numColToGet],
                "colNum"      : colNum,
                "delimiter"   : delimiter,
                "numColToGet" : userNumColToGet,
                "numNewCols"  : numColToGet,
                "htmlExclude" : ['numColToGet']
            };

            Transaction.done(txId, {
                "msgTable": newTableId,
                "sql"     : sql
            });
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            var sql = {
                "operation"   : SQLOps.SplitCol,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "newTableName": newTableNames[numColToGet],
                "colNum"      : colNum,
                "delimiter"   : delimiter,
                "numColToGet" : userNumColToGet,
                "numNewCols"  : numColToGet,
                "htmlExclude" : ['numColToGet']
            };

            if (error === SQLType.Cancel) {
                Transaction.cancel(txId, {"sql": sql});
                deferred.resolve();
            } else {
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.SplitColumnFailed,
                    "error"  : error,
                    "sql"    : sql
                });
                deferred.reject(error);
            }

        });

        return (deferred.promise());

        function splitColHelper(index) {
            var innerDeferred = jQuery.Deferred();

            var mapString;
            if (index === numColToGet && splitWithDelimIndex != null) {
                mapString = 'default:splitWithDelim(' + backColName + ', ' +
                            splitWithDelimIndex + ', "' + delimiter + '")';
            } else {
                mapString = 'cut(' + backColName + ', ' + index + ', "' +
                            delimiter + '")';
            }

            var curTableName = newTableNames[index - 1];
            var newTableName = newTableNames[index];
            var fieldName = newFieldNames[index];
            var newTableId = xcHelper.getTableId(newTableName);

            XIApi.map(txId, mapString, curTableName, fieldName, newTableName)
            .then(function() {
                var curTableId   = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;
                var newTableCols = xcHelper.mapColGenerate(++newColNum,
                                        fieldName, mapString, curTableCols);
                if (index < numColToGet) {
                    TblManager.setOrphanTableMeta(newTableName, newTableCols);
                    return PromiseHelper.resolve(null);
                } else {
                    return TblManager.refreshTable([newTableName], newTableCols,
                                                [tableName], worksheet);
                }
            })
            .then(function() {
                innerDeferred.resolve(newTableId);
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }

        function getSplitNumHelper() {
            var innerDeferred = jQuery.Deferred();

            if (numColToGet != null) {
                // have an extra column for the rest of string
                // and the delim index should be numColToGet
                alertHelper(numColToGet + 1, numColToGet, innerDeferred);
                return (innerDeferred.promise());
            }

            var mapString = 'countChar(' + backColName + ', "' +
                                delimiter + '")';
            var fieldName = xcHelper.randName("mappedCol");
            var curTableName = tableName;
            var newTableName = ".tempMap." + tableNamePart +
                                Authentication.getHashId();

            XIApi.map(txId, mapString, curTableName, fieldName, newTableName)
            .then(function() {
                var dstAggName = newTableName.split("#")[0] + "-aggregate" +
                                 Authentication.getHashId();
                return XIApi.aggregate(txId, AggrOp.MaxInteger, fieldName,
                                       dstAggName, newTableName);
            })
            .then(function(value) {
                // Note that the splitColNum should be charCountNum + 1
                alertHelper(value + 1, null, innerDeferred);
                // XXXX Should delete the newTableName when delete is enabled
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }

        function alertHelper(numToSplit, numDelim, curDeferred) {
            if (isAlertOn && numToSplit > 15) {
                var msg = xcHelper.replaceMsg(ColTStr.SplitColWarnMsg, {
                    "num": numToSplit
                });

                Alert.show({
                    "title"  : ColTStr.SplitColWarn,
                    "msg"    : msg,
                    "confirm": function() {
                        curDeferred.resolve(numToSplit, numDelim);
                    },
                    "cancel": function() {
                        curDeferred.reject(SQLType.Cancel);
                    }
                });
            } else {
                curDeferred.resolve(numToSplit, numDelim);
            }
        }
    };

    // options
    // keepEditable: boolean, if true then we dont remove disabled and editable
    // class
    ColManager.renameCol = function(colNum, tableId, newName, options) {
        var table   = gTables[tableId];
        var $table  = $("#xcTable-" + tableId);
        var $th     = $table.find('th.col' + colNum);
        var curCol  = table.tableCols[colNum - 1];
        var oldName = curCol.name;
        options = options || {};

        curCol.name = newName;
        var wasEditable = $th.find('.flexWrap.editable').length;
        var $editableHead = $th.find('.editableHead');
        if (!options.keepEditable) {
            $th.find('.flexWrap.editable').removeClass('editable');
            $editableHead.prop("disabled", true);

            FnBar.focusOnCol($editableHead, tableId, colNum, true);
        } else {
            $th.find('.flexWrap.flex-mid').addClass('editable');
            $th.find('.editableHead').prop("disabled", false);
        }

        $editableHead.val(newName).attr("value", newName);


        // adjust rightsidebar column name
        TableList.updateColName(tableId, colNum, newName);

        SQL.add("Rename Column", {
            "operation"  : SQLOps.RenameCol,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colName"    : oldName,
            "colNum"     : colNum,
            "newName"    : newName,
            "wasNew"     : wasEditable,
            "htmlExclude": ["wasNew"]
        });

        KVStore.commit();
    };

    ColManager.format = function(colNums, tableId, formats) {
        var table = gTables[tableId];
        var tableCols = [];
        var oldFormats = [];
        var decimals = [];
        var colNames = [];
        var tableCol;
        var decimal;
        var colNum;
        var $tableWrap = $('#xcTableWrap-' + tableId);
        var filteredColNums = [];
        var filteredFormats = [];
        // var format;

        for (var i = 0; i < colNums.length; i++) {
            colNum = colNums[i];
            tableCol = table.tableCols[colNum - 1];
            if (formats[i] === "default") {
                formats[i] = null;
            }
            if (tableCol.format === formats[i]) {
                continue;
            }

            filteredColNums.push(colNum);
            filteredFormats.push(formats[i]);

            tableCols.push(tableCol);
            oldFormats.push(tableCol.format);
            decimal = tableCol.decimals;
            decimals.push(decimal);

            $tableWrap.find('td.col' + colNum).each(function() {
                var $td = $(this);
                var oldVal = $td.find(".originalData").text();
                if (oldVal != null) {
                    // not knf
                    var newVal = formatColumnCell(oldVal, formats[i], decimal);
                    $td.children(".displayedData").text(newVal);
                }
            });
            tableCol.format = formats[i];
            colNames.push(tableCol.name);
        }
        if (!filteredColNums.length) {
            return;
        }

        SQL.add("Change Format", {
            "operation"  : SQLOps.ChangeFormat,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colNames"   : colNames,
            "colNums"    : filteredColNums,
            "formats"    : filteredFormats,
            "oldFormats" : oldFormats,
            "htmlExclude": ["oldFormats"]
        });
    };

    ColManager.roundToFixed = function(colNums, tableId, decimals) {
        var table = gTables[tableId];
        var tableCol;
        var format;
        var prevDecimals = [];
        var $tableWrap = $('#xcTableWrap-' + tableId);
        var colNum;
        var colNames = [];

        for (var i = 0; i < colNums.length; i++) {
            colNum = colNums[i];
            tableCol = table.tableCols[colNum - 1];
            format = tableCol.format;
            prevDecimals.push(tableCol.decimals);
            colNames.push(tableCol.name);
            $tableWrap.find('td.col' + colNum).each(function() {
                var $td = $(this);
                var oldVal = $td.find(".originalData").text();
                if (oldVal != null) {
                    // not knf
                    var newVal = formatColumnCell(oldVal, format, decimals[i]);
                    $td.children(".displayedData").text(newVal);
                }
            });
            tableCol.decimals = decimals[i];
        }

        SQL.add("Round To Fixed", {
            "operation"   : SQLOps.RoundToFixed,
            "tableName"   : table.tableName,
            "tableId"     : tableId,
            "colNames"    : colNames,
            "colNums"     : colNums,
            "decimals"    : decimals,
            "prevDecimals": prevDecimals,
            "htmlExclude" : ["prevDecimals"]
        });
    };

    // currently only being used by drag and drop (and undo/redo)
    // options:
    // undoRedo: boolean, if true change html of columns
    ColManager.reorderCol = function(tableId, oldColNum, newColNum, options) {
        var oldIndex = oldColNum - 1;
        var newIndex = newColNum - 1;
        var $table   = $("#xcTable-" + tableId);
        var table    = gTables[tableId];
        var colName  = table.tableCols[oldIndex].name;

        var progCol = removeColHelper(oldIndex, tableId);

        insertColHelper(newIndex, tableId, progCol);

        $table.find('.col' + oldColNum)
                 .removeClass('col' + oldColNum)
                 .addClass('colNumToChange');

        if (oldColNum > newColNum) {
            for (var i = oldColNum; i >= newColNum; i--) {
                $table.find('.col' + i)
                       .removeClass('col' + i)
                       .addClass('col' + (i + 1));
            }
        } else {
            for (var i = oldColNum; i <= newColNum; i++) {
                $table.find('.col' + i)
                       .removeClass('col' + i)
                       .addClass('col' + (i - 1));
            }
        }

        TableList.updateTableInfo(tableId);

        $table.find('.colNumToChange')
            .addClass('col' + newColNum)
            .removeClass('colNumToChange');

        if (options && options.undoRedo) {
            var target = newColNum;
            if (newColNum < oldColNum) {
                target = newColNum - 1;
            }

            $table.find('th').eq(target)
                             .after($table.find('th.col' + newColNum));

            $table.find('tbody tr').each(function() {
                $(this).find('td').eq(target)
                                  .after($(this).find('td.col' + newColNum));
            });
        }

        // add sql
        SQL.add("Change Column Order", {
            "operation": SQLOps.ReorderCol,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colName"  : colName,
            "oldColNum": oldColNum,
            "newColNum": newColNum
        });
    };
    // args:
    // noLog: boolean, if true, no sql will be logged
    ColManager.execCol = function(operation, usrStr, tableId, colNum, args) {
        var deferred = jQuery.Deferred();
        var progCol;
        var table = gTables[tableId];

        switch (operation) {
            case ("pull"):
                var origCol = table.tableCols[colNum - 1];
                var origType = origCol.type;
                var origFunc = xcHelper.deepCopy(origCol.func);
                var origUsrStr = origCol.userStr;
                var backName = origCol.backName;
                var frontName = origCol.name;
                progCol = ColManager.parseFunc(usrStr, colNum, table, true);
                if ((!args || !args.undo) && !parsePullColArgs(progCol) ) {
                    console.error("Arg parsing failed");
                    progCol.func = xcHelper.deepCopy(origFunc);
                    deferred.reject("Arg parsing failed");
                    break;
                }
                var wasNewCol = progCol.isNewCol;
                if (wasNewCol) {
                    progCol.isNewCol = false;
                }
                if (args && args.undo) {
                    progCol.backName = args.backName;
                } else {
                    progCol.backName = progCol.func.args[0];
                }

                pullColHelper(progCol.backName, colNum, tableId);

                if (!args || !args.noLog) {
                    var sqlOptions = {
                        "operation"     : SQLOps.PullCol,
                        "tableName"     : table.tableName,
                        "tableId"       : tableId,
                        "colName"       : frontName,
                        "colNum"        : colNum,
                        "usrStr"        : usrStr,
                        "origUsrStr"    : origUsrStr,
                        "wasNewCol"     : wasNewCol,
                        "func"          : origFunc,
                        "type"          : origType,
                        "backName"      : backName,
                        "pullColOptions": {"source": "fnBar"},
                        "htmlExclude"   : ["pullColOptions", "usrStr",
                                            "origUsrStr", "wasNewCol", "func",
                                            "type", "backName"]
                    };
                    SQL.add("Pull Column", sqlOptions);
                }
                deferred.resolve("update");
                break;
            case ("raw"):
                console.log("Raw data");
                deferred.resolve();
                break;
            case ("map"):
                var fieldName = table.tableCols[colNum - 1].name;
                var mapString = usrStr.substring(usrStr.indexOf("=" + 1))
                                      .trim();
                mapString = mapString.substring(mapString.indexOf("(") + 1,
                                                mapString.lastIndexOf(")"));

                var options = {replaceColumn: true};
                xcFunction.map(colNum, tableId, fieldName,
                                mapString, options)
                .then(deferred.resolve)
                .fail(function(error) {
                    console.error("execCol fails!", error);
                    deferred.reject(error);
                });
                break;
            case ("filter"):
                var fltString = usrStr.substring(usrStr.indexOf("=" + 1))
                                      .trim();
                fltString = fltString.substring(fltString.indexOf("(") + 1,
                                                fltString.lastIndexOf(")"));

                xcFunction.filter(colNum, tableId, {
                    "filterString": fltString
                })
                .then(deferred.resolve)
                .fail(function(error) {
                    console.error("execCol fails!", error);
                    deferred.reject(error);
                });
                break;
            case ("search"):
                searchColNames(args.value, args.searchBar, args.initialTableId);
                deferred.resolve();
                break;
            case (undefined):
                console.warn("Blank col?");
                deferred.resolve();
                break;
            default:
                console.warn("No such function yet!", progCol);
                deferred.resolve();
                break;
        }

        return (deferred.promise());
    };

    // @$inputs: check $input against the names of $inputs
    // @tableId: check $input against back column names.
    // You do not need both $inputs and tableId
    ColManager.checkColDup = function ($input, $inputs, tableId, parseCol,
                                       colNum) {

        var name = $input.val().trim();
        var isDuplicate = false;
        var title = ErrTStr.ColumnConfilct;

        if (parseCol) {
            name = name.replace(/^\$/, '');
        }

        $(".tooltip").hide();
        // temporarily use, will be removed when backend allow name with space
        if (/^ | $|[,\(\)'"]/.test(name) === true) {
            title = ColTStr.RenamSpecialChar;
            isDuplicate = true;
        } else if (name === 'DATA') {
            title = ErrTStr.PreservedName;
            isDuplicate = true;
        }

        if (!isDuplicate && $inputs) {
            $inputs.each(function() {
                var $checkedInput = $(this);
                if (name === $checkedInput.val() &&
                    $checkedInput[0] !== $input[0])
                {
                    isDuplicate = true;
                    return (false);
                }
            });
        }

        if (!isDuplicate && tableId != null) {
            var tableCols = gTables[tableId].tableCols;
            var numCols = tableCols.length;
            for (var i = 0; i < numCols; i++) {
                if (colNum != null && colNum - 1 === i) {
                    continue;
                }

                // check both backend name and front name
                if (tableCols[i].name === name ||
                    (!tableCols[i].isDATACol() &&
                     tableCols[i].getBackColName() === name))
                {
                    title = ErrTStr.ColumnConfilct;
                    isDuplicate = true;
                    break;
                }
            }
        }

        if (isDuplicate) {
            var container = $input.closest('.mainPanel').attr('id');
            var $toolTipTarget = $input.parent();

            $toolTipTarget.tooltip({
                "title"    : title,
                "placement": "top",
                "trigger"  : "manual",
                "container": "#" + container,
                "template" : TooltipTemplate.Error
            });

            $toolTipTarget.tooltip('show');
            $input.click(hideTooltip);

            var timeout = setTimeout(function() {
                hideTooltip();
            }, 5000);
        }

        function hideTooltip() {
            $toolTipTarget.tooltip('destroy');
            $input.off('click', hideTooltip);
            clearTimeout(timeout);
        }

        return (isDuplicate);
    };

    ColManager.dupCol = function(colNum, tableId) {
        var deferred = jQuery.Deferred();

        var $table = $("#xcTable-" + tableId);
        var table  = gTables[tableId];
        var tableCols = table.tableCols;

        var progCol  = tableCols[colNum - 1];
        var width    = progCol.width;
        var isNewCol = $table.find('th.col' + colNum).hasClass('newColumn');
        var decimals = progCol.decimals;
        var format   = progCol.format;
        var name = progCol.getFronColName();

        name = xcHelper.getUniqColName(tableId, name);

        ColManager.addCol(colNum, tableId, name, {
            "width"   : width,
            "isNewCol": isNewCol,
            "isHidden": progCol.isHidden,
            "decimals": decimals,
            "format"  : format
        });
        // add sql
        SQL.add("Duplicate Column", {
            "operation" : SQLOps.DupCol,
            "tableName" : table.tableName,
            "tableId"   : tableId,
            "colName"   : progCol.getFronColName(),
            "newColName": name,
            "colNum"    : colNum
        });

        tableCols[colNum].func.func = progCol.func.func;
        tableCols[colNum].func.args = progCol.func.args;
        tableCols[colNum].userStr = progCol.userStr;
        tableCols[colNum].backName = progCol.backName;

        pullColHelper(progCol.backName, colNum + 1, tableId);

        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
        deferred.resolve();

        return (deferred.promise());
    };

    ColManager.delDupCols = function(colNum, tableId) {
        // col Name will change after delete the col
        var table = gTables[tableId];
        var $tableWrap = $('#xcTableWrap-' + tableId);
        var tableWidth = $tableWrap.width();
        var colName = table.tableCols[colNum - 1].name;
        var colInfo = delDupColHelper(colNum, tableId);
        var colWidths = colInfo.colWidths;
        var colNums = colInfo.colNums;
        var progCols = colInfo.progCols;

        if (gMinModeOn) {
            matchHeaderSizes($tableWrap.find('.xcTable'));
        } else {
            moveTableTitlesAnimated(tableId, tableWidth, colWidths, 200);
            setTimeout(function() {
                matchHeaderSizes($tableWrap.find('.xcTable'));
            }, 200);
        }

        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);

        SQL.add("Delete Duplicate Columns", {
            "operation"  : SQLOps.DelDupCol,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colNum"     : colNum,
            "colName"    : colName,
            "colNums"    : colNums,
            "progCols"   : progCols,
            "htmlExclude": ["progCols"]
        });
    };

    ColManager.delAllDupCols = function(tableId) {
        var table   = gTables[tableId];
        var columns = table.tableCols;
        var forwardCheck = true;
        var $table = $('#xcTable-' + tableId);
        var progCols = [];
        var colNums = [];
        var colInfo;
        var allCols = [];
        // var originalNumCols = columns.length - 1;
        var numColsRemoved = 0;
        for (var i = 0; i < columns.length; i++) {
            if (columns[i].func.func && columns[i].func.func === "raw") {
                continue;
            } else {
                colInfo = null;
                colInfo = delDupColHelper(i + 1, tableId, forwardCheck);
                if (colInfo && colInfo.colNums.length) {
                    colNums = colInfo.colNums;
                    for (var j = 0; j < colNums.length; j++) {
                        allCols.push(colNums[j] + numColsRemoved);
                        progCols.push(colInfo.progCols[j]);
                    }
                    numColsRemoved += colNums.length;
                }
            }
        }

        matchHeaderSizes($table);
        moveFirstColumn();
        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);

        SQL.add("Delete All Duplicate Columns", {
            "operation"  : SQLOps.DelAllDupCols,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colNums"    : allCols,
            "progCols"   : progCols,
            "htmlExclude": ["progCols"]
        });
    };

    ColManager.hideCols = function(colNums, tableId) {
        // for multiple columns
        var $table   = $('#xcTable-' + tableId);
        var numCols  = colNums.length;
        var table    = gTables[tableId];
        var tableCols = table.tableCols;
        var colNames = [];
        var widthDiff = 0;
        var tableWidth = $table.width();
        var tdSelectors = "";
        var $ths = $();

        for (var i = 0; i < numCols; i++) {
            var colNum = colNums[i];
            tdSelectors += "td.col" + colNum + ",";
            var col = tableCols[colNum - 1];
            var $th = $table.find('th.col' + colNum);
            $ths = $ths.add($th);
            var $thWidth = $th.width() + 5;
            var originalColWidth = $thWidth;

            widthDiff += (originalColWidth - 15);
            col.isHidden = true;
            colNames.push(col.name);
        }

        tdSelectors = tdSelectors.slice(0, tdSelectors.length - 1);
        var $tds = $table.find(tdSelectors);

        if (!gMinModeOn) {
            $ths.animate({width: 15}, 250, "linear", function() {
                $ths.addClass("userHidden");
                $tds.addClass("userHidden");
            });

            moveTableTitlesAnimated(tableId, tableWidth, widthDiff, 250);
        } else {
            $ths.width(10);
            $ths.addClass("userHidden");
            $tds.addClass("userHidden");
            matchHeaderSizes($table);
            moveTableTitles();
        }

        xcHelper.removeSelectionRange();

        SQL.add("Hide Columns", {
            "operation": SQLOps.HideCols,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colNames" : colNames,
            "colNums"  : colNums
        });
    };

    ColManager.unhideCols = function(colNums, tableId) {
        var $table     = $('#xcTable-' + tableId);
        var tableWidth = $table.width();
        var table      = gTables[tableId];
        var tableCols = table.tableCols;
        var numCols    = colNums.length;
        var colNames   = [];
        var widthDiff = 0;
        // var thSelectors = "";
        // var tdSelectors = "";
        var promises = [];
        for (var i = 0; i < numCols; i++) {
            var colNum = colNums[i];
            var $th = $table.find(".th.col" + colNum);

            var col = tableCols[colNum - 1];
            var originalColWidth = col.width;
            widthDiff += (originalColWidth - 15);
            col.isHidden = false;
            colNames.push(col.name);

            if (!gMinModeOn) {
                promises.push(jQuery.Deferred());
                var count = 0;
                $th.animate({width: col.width}, 250, "linear", function() {
                    promises[count].resolve();
                    count++;
                });
            } else {
                $th.css("width", col.width);
            }

            $table.find("th.col" + colNum + ",td.col" + colNum)
                  .removeClass("userHidden");
        }

        if (!gMinModeOn) {
            jQuery.when.apply($, promises).done(function() {
                matchHeaderSizes($table);
            });
            moveTableTitlesAnimated(tableId, tableWidth, -widthDiff);
        } else {
            matchHeaderSizes($table);
        }

        SQL.add("Unhide Columns", {
            "operation": SQLOps.UnHideCols,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colNames" : colNames,
            "colNums"  : colNums
        });
    };

    ColManager.textAlign = function(colNums, tableId, alignment) {
        var cachedAlignment = alignment;
        if (alignment.indexOf("leftAlign") > -1) {
            alignment = "Left";
        } else if (alignment.indexOf("rightAlign") > -1) {
            alignment = "Right";
        } else if (alignment.indexOf("centerAlign") > -1) {
            alignment = "Center";
        } else {
            alignment = "Wrap";
        }
        var table  = gTables[tableId];
        var $table = $('#xcTable-' + tableId);
        var colNames = [];
        var numCols = colNums.length;
        var prevAlignments = [];

        for (var i = 0; i < numCols; i++) {
            var curCol = table.tableCols[colNums[i] - 1];
            prevAlignments.push(curCol.textAlign);
            $table.find('td.col' + colNums[i])
                .removeClass('textAlignLeft')
                .removeClass('textAlignRight')
                .removeClass('textAlignCenter')
                .removeClass('textAlignWrap')
                .addClass('textAlign' + alignment);
            curCol.textAlign = alignment;
            colNames.push(curCol.name);
        }

        SQL.add("Text Align", {
            "operation"      : SQLOps.TextAlign,
            "tableName"      : table.tableName,
            "tableId"        : tableId,
            "colNames"       : colNames,
            "colNums"        : colNums,
            "alignment"      : alignment,
            "prevAlignments" : prevAlignments,
            "cachedAlignment": cachedAlignment,
            "htmlExclude"    : ["prevAlignments", "cachedAlignment"]
        });
    };

    ColManager.pullAllCols = function(startIndex, jsonObj, dataIndex,
                                      tableId, direction, rowToPrependTo)
    {
        var table     = gTables[tableId];
        var tableCols = table.tableCols;
        var numCols   = tableCols.length;
        // jsonData based on if it's indexed on array or not
        var secondPull = table.isSortedArray || false;
        var jsonData   = secondPull ? jsonObj.withKey : jsonObj.normal;
        var indexedColNums = [];
        var nestedVals     = [];
        var columnTypes    = []; // track column type
        var childArrayVals = new Array(numCols);

        var $table    = $('#xcTable-' + tableId);
        var tBodyHTML = "";
        var knf = false;
        var dataValue;
        var rowNum;
        var childOfArray;
        var col;
        var tdValue;
        var parsedVal;
        var i;
        var row;
        var numRows;
        var backColName;
        var nested;
        var nestedLength;
        var $input;
        var key;
        var tdClass;
        var originalVal;
        var formatVal;
        var decimals;
        var format;
        var jsonTdVal;
        var jsonTdLen;
        var jsonTdTruncated = false;
        var truncPossible = false; // true if data td exceeds colTruncLimit
        var truncLimit = 1000; // the character limit for the data td
        var colTruncLimit = 500; // the character limit for other tds
        var truncClass = "";
        var originalDataClass = "";
        var displayedVal;
        var truncLen;
        var colTruncLen;
        var tdValLen;
        var isColTruncated = false;

        startIndex = startIndex || 0;

        for (i = 0; i < numCols; i++) {
            if (i === dataIndex) {
                // this is the data Column
                nestedVals.push([""]);
            } else if (tableCols[i].isNewCol) {
                // new col
                nestedVals.push("");
            } else {
                backColName = tableCols[i].getBackColName();
                nested = parseColFuncArgs(backColName);
                if (backColName !== "" && backColName != null)
                {
                    if (/\\.([0-9])/.test(backColName)) {
                        // slash followed by dot followed by number is ok
                        // fall through
                    } else if (/\.([0-9])/.test(backColName)) {
                        // dot followed by number is invalid
                        nested = [""];
                    }
                }

                nestedVals.push(nested);
                // get the column number of the column the table was indexed on
                if (backColName === table.keyName) {
                    indexedColNums.push(i);
                }
            }

            // initial type
            if (secondPull && tableCols[i].isSortedArray) {
                columnTypes.push(null);
            } else {
                columnTypes.push(tableCols[i].type);
            }
        }
        // loop through table tr and start building html
        for (row = 0, numRows = jsonData.length; row < numRows; row++) {
            jsonTdVal = jsonData[row];
            dataValue = parseRowJSON(jsonData[row]);
            rowNum = row + startIndex;

            jsonTdLen = jsonTdVal.length;
            if (jsonTdLen > truncLimit) {
                jsonTdTruncated = true;
                truncPossible = true;
                truncLen = jsonTdLen - truncLimit;
            } else {
                jsonTdTruncated = false;
                if (jsonTdLen > colTruncLimit) {
                    truncPossible = true;
                } else {
                    truncPossible = false;
                }
            }

            tBodyHTML += '<tr class="row' + rowNum + '">';

            // add bookmark
            if (table.bookmarks.indexOf(rowNum) > -1) {
                tBodyHTML += '<td align="center" class="col0 rowBookmarked">';
            } else {
                tBodyHTML += '<td align="center" class="col0">';
            }

            // Line Marker Column
            tBodyHTML += '<div class="idWrap">' +
                            '<span class="idSpan" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="click to add bookmark">' +
                                    (rowNum + 1) +
                            '</span>' +
                            '<div class="rowGrab"></div>' +
                          '</div></td>';

            // loop through table tr's tds
            for (col = 0; col < numCols; col++) {
                nested = nestedVals[col];
                tdValue = dataValue;
                childOfArray = childArrayVals[col];
                knf = false;

                if (col !== dataIndex) {
                    if (nested == null) {
                        console.error('Error this value should not be empty');
                    } else if (nested === "") {
                        tdValue = "";
                    }

                    nestedLength = nested.length;
                    for (i = 0; i < nestedLength; i++) {
                        if (tdValue[nested[i]] === null) {
                            tdValue = tdValue[nested[i]];
                            break;
                        } else if (jQuery.isEmptyObject(tdValue) ||
                            tdValue[nested[i]] == null)
                        {
                            knf = true;
                            tdValue = null;
                            break;
                        }

                        tdValue = tdValue[nested[i]];

                        if (!childOfArray && i < nestedLength - 1 &&
                            (tdValue instanceof Array))
                        {
                            childArrayVals[col] = true;
                        }
                    }

                    // if it's the index array field, pull indexed one instead
                    if (secondPull && tableCols[col].isSortedArray) {
                        $input = $table.find('th.col' + (col + 1) +
                                          '> .header input');
                        key = table.keyName + "_indexed";
                        $input.val(key);
                        tdValue = dataValue[key];

                        // this is a indexed column, should change the ProCol
                        // XXX this part might buggy
                        tableCols[col].backName = key;
                        tableCols[col].name = key;
                        tableCols[col].userStr = '"' + key + '" = pull(' + key + ')';
                        tableCols[col].func.args[0] = key;
                    }

                    tdClass = "col" + (col + 1);
                    // class for indexed col
                    if (indexedColNums.indexOf(col) > -1) {
                        tdClass += " indexedColumn";
                    }
                    // class for textAlign
                    if (tableCols[col].textAlign === "Left") {
                        tdClass += " textAlignLeft";
                    } else if (tableCols[col].textAlign === "Right") {
                        tdClass += " textAlignRight";
                    } else if (tableCols[col].textAlign === "Wrap") {
                        tdClass += " textAlignWrap";
                    }

                    //define type of the column
                    columnTypes[col] = xcHelper.parseColType(tdValue, columnTypes[col]);
                    originalVal = tdValue;
                    parsedVal = xcHelper.parseJsonValue(tdValue, knf);

                    if (!knf && originalVal != null) {
                        originalVal = parsedVal;
                    } else {
                        // case that should not append data-val
                        originalVal = null;
                    }
                    formatVal = parsedVal;
                    decimals = tableCols[col].decimals;
                    format = tableCols[col].format;
                    if (originalVal != null && (decimals > -1 || format != null)) {
                        formatVal = formatColumnCell(parsedVal, format, decimals);
                    }

                    displayedVal = formatVal;
                    truncClass = "";
                    if (truncPossible) {
                        tdValLen = formatVal.length;
                        if (tdValLen > colTruncLimit) {
                            colTruncLen = tdValLen - colTruncLimit;
                            displayedVal = formatVal.substr(0, colTruncLimit) +
                                    "...(" + (colTruncLen.toLocaleString("en")) +
                                    " " + TblTStr.Truncate + ")";
                            truncClass = " truncated";
                            isColTruncated = true;
                        } else {
                            isColTruncated = false;
                        }
                    } else {
                        isColTruncated = false;
                    }

                    // XXX now only allow number in case weird string mess up html
                    if (originalVal != null &&
                        (columnTypes[col] === "integer" ||
                        columnTypes[col] === "float"))
                    {
                        isColTruncated = true;
                        formatVal = originalVal;
                    }

                    tBodyHTML += '<td class="' + tdClass + truncClass +
                                    ' clickable">' +
                                    getTableCellHtml(displayedVal, isColTruncated, formatVal);
                    tBodyHTML += '</td>';
                } else {
                    // make data td;
                    tdValue = jsonTdVal;
                    columnTypes[col] = "mixed";
                    parsedVal = xcHelper.parseJsonValue(tdValue);
                    displayedVal = parsedVal;
                    if (jsonTdTruncated) {
                        truncClass = " truncated";
                        originalDataClass = "";
                        displayedVal = parsedVal.substr(0, truncLimit) +
                                    "...(" + (truncLen.toLocaleString("en")) +
                                    " " + TblTStr.Truncate + ")";
                    } else {
                        truncClass = "";
                        originalDataClass = " originalData";
                    }

                    tBodyHTML +=
                        '<td class="col' + (col + 1) + ' jsonElement' +
                            truncClass + '">' +
                            '<div class="dataColText displayedData' +
                                originalDataClass + truncClass +
                                '" data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="double-click to view">' +
                                    displayedVal +
                            '</div>';
                    if (jsonTdTruncated) {
                        tBodyHTML += '<div class="dataColText originalData">' +
                                     parsedVal + '</div>';
                    }

                    tBodyHTML += '</td>';
                }
            }
            // end of loop through table tr's tds
            tBodyHTML += '</tr>';
        }
        // end of loop through table tr and start building html

        // assign column type class to header menus

        // This only run once,  check if it's a indexed array, mark on gTables
        // and redo the pull column thing
        if (!secondPull && columnTypes[indexedColNums[0]] === "array") {
            table.isSortedArray = true;

            for (var i = 0; i < indexedColNums.length; i++) {
                tableCols[indexedColNums[i]].isSortedArray = true;
            }
            return ColManager.pullAllCols(startIndex, jsonObj,
                                          dataIndex, tableId, direction);
        }

        var $tBody = $(tBodyHTML);
        if (direction === 1) {
            if (rowToPrependTo > -1) {
                $table.find('.row' + rowToPrependTo).before($tBody);
            } else {
                $table.find('tbody').prepend($tBody);
            }
        } else {
            $table.find('tbody').append($tBody);
        }

        var $currentTh;
        var $header;
        var columnType;
        var adjustedColType;

        for (i = 0; i < numCols; i++) {
            $currentTh = $table.find('th.col' + (i + 1));
            $header = $currentTh.find('> .header');
            columnType = columnTypes[i] || "undefined";

            // DATA column is type-object
            if (tableCols[i].backName === "DATA") {
                columnType = "object";
            } else if (tableCols[i].isNewCol) {
                columnType = "newColumn";
            }
            tableCols[i].type = columnType;

            $header.removeClass("type-mixed")
                    .removeClass("type-string")
                    .removeClass("type-integer")
                    .removeClass("type-float")
                    .removeClass("type-object")
                    .removeClass("type-array")
                    .removeClass("type-undefined")
                    .removeClass("type-boolean")
                    .removeClass("recordNum")
                    .removeClass("childOfArray");

            $header.addClass('type-' + columnType);
            adjustedColType = columnType;
            if (columnType === "integer" || columnType === "float") {
                adjustedColType = "number";
            }
            $header.find('.iconHelper').attr('title', adjustedColType);

            if (tableCols[i].backName === "recordNum") {
                $header.addClass('recordNum');
            }

            if (tableCols[i].isHidden) {
                $table.find('td.col' + (i + 1)).addClass('userHidden');
            }
            if (childArrayVals[i]) {
                $header.addClass('childOfArray');
            }
            if (tableCols[i].isSortedArray) {
                $header.addClass('sortedArray');
            }
            if ($currentTh.hasClass('selectedCell') ||
                $currentTh.hasClass('modalHighlighted')) {
                highlightColumn($currentTh);
            }
        }

        return ($tBody);
    };

    ColManager.unnest = function(tableId, colNum, rowNum, isArray, options) {
        var $jsonTd = $('#xcTable-' + tableId).find('.row' + rowNum)
                                              .find('td.col' + colNum);
        var text = $jsonTd.find('.originalData').text();
        var jsonTdObj;
        options = options || {};

        try {
            jsonTdObj = jQuery.parseJSON(text);
        } catch (error) {
            console.error(error, text);
            return;
        }

        // var colNum = xcHelper.parseColNum($jsonTd);
        // var jsonRowNum = xcHelper.parseRowNum($jsonTd.closest('tr'));
        var jsonRowNum = rowNum;
        var $table = $jsonTd.closest('table');
        var table = gTables[tableId];
        var cols = table.tableCols;
        var numCols = cols.length;
        var colNames = [];
        var escapedColNames = [];
        var colName;
        var escapedColName;
        var openSymbol;
        var closingSymbol;
        var colNums = [];
        // var tempName;

        for (var arrayKey in jsonTdObj) {
            if (options.isDataTd) {
                colName = arrayKey;
                escapedColName = xcHelper.escapeColName(arrayKey);
            } else {
                openSymbol = "";
                closingSymbol = "";
                if (!isArray) {
                    openSymbol = ".";
                } else {
                    openSymbol = "[";
                    closingSymbol = "]";
                }

                colName = cols[colNum - 1].getBackColName().replace(/\\./g, ".") +
                          openSymbol + arrayKey + closingSymbol;
                escapedColName = cols[colNum - 1].getBackColName() + openSymbol +
                                xcHelper.escapeColName(arrayKey) + closingSymbol;
            }

            if (!table.hasColWithBackName(escapedColName)) {
                colNames.push(colName);
                escapedColNames.push(escapedColName);
            }
        }

        if (colNames.length === 0) {
            return;
        }
        var numKeys = colNames.length;
        var newColNum = colNum - 1;
        var columnClass = "";
        var color = "";
        var ths = "";
        var widthOptions = {
            defaultHeaderStyle: true
        };
        var width;

        for (var i = 0; i < numKeys; i++) {
            var key = colNames[i];
            var escapedKey = escapedColNames[i];
            var usrStr = '"' + key + '" = pull(' + escapedKey + ')';

            width = getTextWidth($(), key, widthOptions);

            var newCol = ColManager.newCol({
                "backName": escapedKey,
                "name"    : key,
                "width"   : width,
                "userStr" : usrStr,
                "func"    : {
                    "name": "pull",
                    "args": [escapedKey]
                },
                "isNewCol": false
            });
            if (options.isDataTd) {
                cols.splice(newColNum, 0, newCol);
            } else {
                cols.splice(newColNum + 1, 0, newCol);
            }

            if (key === table.key) {
                columnClass += " indexedColumn";
            }
            newColNum++;
            var colHeadNum = newColNum;
            if (!options.isDataTd) {
                colHeadNum++;
            }
            colNums.push(colHeadNum);
            ths += TblManager.generateColumnHeadHTML(columnClass, color, colHeadNum,
                                          {name: key, width: width});
        }
        var rowNum = xcHelper.parseRowNum($table.find('tbody').find('tr:eq(0)'));
        var origDataIndex = xcHelper.parseColNum($table.find('th.dataCol'));
        var jsonObj = {normal: []};
        $table.find('tbody').find('.col' + origDataIndex).each(function() {
            jsonObj.normal.push($(this).find('.originalData').text());
        });
        $table.find('tbody').empty(); // remove tbody contents for pullrowsbulk
        var endIndex;
        if (options.isDataTd) {
            endIndex = colNum;
        } else {
            endIndex = colNum + 1;
        }

        for (var i = numCols; i >= endIndex; i--) {
            $table.find('.col' + i )
                  .removeClass('col' + i)
                  .addClass('col' + (numKeys + i));
        }

        if (options.isDataTd) {
            $table.find('.th.col' + (newColNum + 1)).before(ths);
        } else {
            $table.find('.th.col' + colNum).after(ths);
        }

        var dataIndex = xcHelper.parseColNum($table.find('th.dataCol')) - 1;

        TblManager.pullRowsBulk(tableId, jsonObj, rowNum, dataIndex,
                                RowDirection.Bottom);
        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
        matchHeaderSizes($table);
        moveFirstColumn();

        SQL.add("Pull All Columns", {
            "operation": SQLOps.PullAllCols,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colNum"   : colNum,
            "colNums"  : colNums,
            "rowNum"   : jsonRowNum,
            "isArray"  : isArray,
            "options"  : options
        });
    };

    ColManager.parseFunc = function(funcString, colNum, table, modifyCol) {
        // Everything must be in a "name" = function(args) format
        var open   = funcString.indexOf("\"");
        var close  = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
        var name   = funcString.substring(open + 1, close);
        var funcSt = funcString.substring(funcString.indexOf("=") + 1);
        var progCol;

        if (modifyCol) {
            progCol = table.tableCols[colNum - 1];
        } else {
            progCol = ColManager.newCol();
            progCol.name = name;
            progCol.backName = name;
        }

        var colName;
        if (!progCol.backName && progCol.func.name === "pull") {
            colName = progCol.func.args[0];
        } else {
            colName = name;
        }

        // progCol.func = cleanseFunc(funcSt, name);

        var func = {args: []};
        parseFuncString(funcSt, func);
        progCol.func = new ColFunc(func.args[0]);
        progCol.userStr = '"' + colName + '" =' + funcSt;

        return (progCol);
    };

    function parseFuncString(funcString, func) {
        // assumes we are sending in a valid func ex. map(add(3,2))
        var tempString = "";
        var newFunc;
        var inQuotes = false;
        var singleQuote = false;
        var hasComma = false;
        var isEscaped = false;

        for (var i = 0; i < funcString.length; i++) {
            if (isEscaped) {
                tempString += funcString[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((funcString[i] === "\"" && !singleQuote) ||
                    (funcString[i] === "'" && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (funcString[i] === "\"") {
                    inQuotes = true;
                    singleQuote = false;
                } else if (funcString[i] === "'") {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (funcString[i] === "\\") {
                isEscaped = true;
                tempString += funcString[i];
            } else if (inQuotes) {
                tempString += funcString[i];
            } else {
                if (funcString[i] === "(") {
                    newFunc = new ColFunc({name: tempString.trim()});
                    func.args.push(newFunc);
                    tempString = "";
                    i += parseFuncString(funcString.substring(i + 1), newFunc);
                } else if (funcString[i] === "," || funcString[i] === ")") {
                    // tempString could be blank if funcString[i] is a comma
                    // after a )
                    if (tempString !== "") {
                        tempString = tempString.trim();

                        if (funcString[i] !== ")" || hasComma ||
                            tempString !== "") {

                        // true if it's an int or decimal, false if its anything
                        // else such as 0xff 1e2 or 023 -- we will keep these as
                        // strings to retain the formatting
                            if (/^[0-9.]+$/.test(tempString) &&
                            tempString[0] !== "0") {
                                tempString = parseFloat(tempString);
                            }
                            func.args.push(tempString);
                        }
                        tempString = "";
                    }
                    if (funcString[i] === ")") {
                        break;
                    } else {
                        hasComma = true;
                    }
                } else {
                    tempString += funcString[i];
                }
            }
        }
        return (i + 1);
    }

    function pullColHelper(key, newColid, tableId, startIndex, numberOfRows) {
        if (key === "") {
            return;
        } else if (key != null) {
            if (/\\.([0-9])/.test(key)) {
                // slash followed by dot followed by number is ok
            } else if (/\.([0-9])/.test(key)) {
                // dot followed by number is invalid
                return;
            }
        }
        var colTruncLimit = 500;
        var truncHtml;
        var colTruncLen;
        var tdValLen;
        var displayedVal;

        var table    = gTables[tableId];
        var tableCol = table.tableCols[newColid - 1];
        var $table   = $("#xcTable-" + tableId);
        var $dataCol = $table.find("tr:first th").filter(function() {
            return ($(this).find("input").val() === "DATA");
        });

        var colid = xcHelper.parseColNum($dataCol);

        var numRow        = -1;
        var startingIndex = -1;
        var endingIndex   = -1;
        var decimals = tableCol.decimals;
        var format   = tableCol.format;

        if (!startIndex) {
            startingIndex = parseInt($table.find("tbody tr:first")
                                           .attr('class').substring(3));
            numRow = $table.find("tbody tr").length;
            endingIndex = parseInt($table.find("tbody tr:last")
                                           .attr('class').substring(3)) + 1;
        } else {
            startingIndex = startIndex;
            numRow = numberOfRows || gNumEntriesPerPage;
            endingIndex = startIndex + numRow;
        }

        var nested = parseColFuncArgs(key);
        var childOfArray = false;
        var columnType;  // track column type, initial is undefined
        var knf = false;
        var $jsonTd;
        var jsonTdTruncated = false;
        var jsonStr;
        for (var i = startingIndex; i < endingIndex; i++) {
            $jsonTd = $table.find('.row' + i + ' .col' + colid);
            jsonStr = $jsonTd.find('.originalData').text();
            if ($jsonTd.hasClass('truncated')) {
                jsonTdTruncated = true;
            } else {
                jsonTdTruncated = false;
            }
            var value = parseRowJSON(jsonStr);
            knf = false;

            for (var j = 0; j < nested.length; j++) {
                if (value[nested[j]] === null) {
                    value = value[nested[j]];
                    break;
                } else if (jQuery.isEmptyObject(value) ||
                    value[nested[j]] == null)
                {
                    knf = true;
                    value = null;
                    break;
                }
                value = value[nested[j]];

                if (!childOfArray && j < nested.length - 1 &&
                    (value instanceof Array)) {
                    childOfArray = true;
                }
            }

            //define type of the column
            columnType = xcHelper.parseColType(value, columnType);

            var originalVal = value;
            value = xcHelper.parseJsonValue(value, knf);

            if (!knf && originalVal != null) {
                originalVal = value;
            } else {
                // case that should not append data-val
                originalVal = null;
            }
            var formatVal = value;
            if (originalVal != null && (decimals > -1 || format != null)) {
                formatVal = formatColumnCell(value, format, decimals);
            }

            var $td = $table.find('.row' + i + ' .col' + newColid);

            displayedVal = formatVal;
            if (jsonTdTruncated) {
                tdValLen = formatVal.length;
                if (tdValLen > colTruncLimit) {
                    colTruncLen = tdValLen - colTruncLimit;
                    displayedVal = formatVal.substr(0, colTruncLimit) +
                            "...(" + (colTruncLen.toLocaleString("en")) +
                            " " + TblTStr.Truncate + ")";
                    isColTruncated = true;
                } else {
                    isColTruncated = false;
                }
            } else {
                isColTruncated = false;
            }
            var formattedValSaved = false;
            if (originalVal != null &&
                (columnType === "integer" || columnType === "float"))
            {
                isColTruncated = true;
                formatVal = originalVal;
                formattedValSaved = true;
            }

            truncHtml = getTableCellHtml(displayedVal, isColTruncated, formatVal);
            if (isColTruncated && !formattedValSaved) {
                $td.addClass('truncated');
            }
            $td.html(truncHtml).addClass('clickable');
            // XXX now only allow number in case weird string mess up html

        }

        if (columnType == null) {
            columnType = "undefined";
        }

        tableCol.type = columnType;

        // add class to th
        var $header = $table.find('th.col' + newColid + ' div.header');

        $header.removeClass("type-mixed")
               .removeClass("type-string")
               .removeClass("type-integer")
               .removeClass("type-float")
               .removeClass("type-object")
               .removeClass("type-array")
               .removeClass("type-boolean")
               .removeClass("type-undefined")
               .removeClass("recordNum")
               .removeClass("childOfArray");

        $header.addClass('type-' + columnType);
        $header.find('.iconHelper').attr('title', "")
                                   .attr('data-original-title', columnType);

        if (key === "recordNum") {
            $header.addClass('recordNum');
        }
        if (childOfArray) {
            $header.addClass('childOfArray');
        }

        if (table.isSortedArray &&
            tableCol.getBackColName() === table.keyName + "_indexed")
        {
            // XXX this method to detect it's sortedArray is not reliable
            tableCol.isSortedArray = true;
            $header.addClass('sortedArray');
        }

        $table.find('th.col' + newColid).removeClass('newColumn');
        if (tableCol.isHidden) {
            $table.find('td.col' + newColid).addClass('userHidden');
        }
    }

    //  returns {colWidths: colWidths, colNums: colNums, progCOls: progCols};
    function delDupColHelper(colNum, tableId, forwardCheck) {
        var index   = colNum - 1;
        var columns = gTables[tableId].tableCols;
        var numCols = columns.length;
        var backName = columns[index].backName;
        var start   = forwardCheck ? index : 0;

        var thNum = start;
        var numColsDeleted = 0;
        var colWidths = 0;
        var colNums = [];
        var progCols = [];

        for (var i = start; i < numCols; i++) {
            if (i === index) {
                thNum++;
                continue;
            }
            if (columns[i].backName === backName) {
                delColAndAdjustLoop();
            }
            thNum++;
        }


        function delColAndAdjustLoop() {
            var currThNum;
            if (gMinModeOn || forwardCheck) {
                currThNum = i + 1;
            } else {
                currThNum = thNum + 1;
            }
            if (columns[i].isHidden) {
                colWidths += 15;
            } else {
                colWidths += columns[i].width;
            }
            progCols.push(columns[i]);
            delColHelper(currThNum, i + 1, tableId, null, null, forwardCheck);
            if (i < index) {
                index--;
            }
            numCols--;
            i--;
            numColsDeleted++;
            colNums.push(thNum);
        }
        return ({colWidths: colWidths, colNums: colNums, progCols: progCols});
    }

    // Help Functon for pullAllCols and pullCOlHelper
    // parse tableCol.func.args
    // assumes legal syntax ie. votes[funny] and not votes[funny]blah
    function parseColFuncArgs(key) {
        if (key == null) {
            return ("");
        }

        // replace votes[funny] with votes.funny but votes\[funny\] will remain
        var isEscaped = false;
        var bracketOpen = false;
        for (var i = 0; i < key.length; i++) {
            if (isEscaped) {
                isEscaped = false;
            } else {
                if (key[i] === "[") {
                    key = key.substr(0, i) + "." + key.substr(i + 1);
                    bracketOpen = true;
                } else if (key[i] === "]") {
                    if (bracketOpen) {
                        key = key.substr(0, i) + key.substr(i + 1);
                        i--;
                        bracketOpen = false;
                    }
                } else if (key[i] === "\\") {
                    isEscaped = true;
                }
            }
        }

        var nested = key.match(/([^\\.]|\\.)+/g);

        if (nested == null) {
            return ("");
        }
        for (var i = 0; i < nested.length; i++) {
            nested[i] = xcHelper.unescapeColName(nested[i]);
        }

        return (nested);
    }

    // function parseBracket(key) {
    //     for (var i = 0; i < key.length; i++) {
    //         if (key[i] === "[") {
    //             key[i] = ".";
    //         }
    //     }
    //     return (key);
    // }

    // parse json string of a table row
    function parseRowJSON(jsonStr) {
        var value;

        if (jsonStr === "") {
            // console.error("Error in pullCol, jsonStr is empty");
            value = "";
        } else {
            try {
                value = jQuery.parseJSON(jsonStr);
            } catch (err) {
                // XXX may need extra handlers to handle the error
                console.error(err, jsonStr);
                value = "";
            }
        }

        return (value);
    }
    // End Of Help Functon for pullAllCols and pullCOlHelper

    function insertColHelper(index, tableId, progCol) {
         // tableCols is an array of ProgCol obj
        var tableCols = gTables[tableId].tableCols;
        tableCols.splice(index, 0, progCol);
    }

    function removeColHelper(index, tableId) {
        var tableCols = gTables[tableId].tableCols;
        var removed   = tableCols[index];
        tableCols.splice(index, 1);

        return (removed);
    }

    function delColHelper(cellNum, colNum, tableId, multipleCols, colId, noAnim) {
        // cellNum is the th's colnumber, colNum refers to gTables colNum
        var deferred = jQuery.Deferred();
        var table      = gTables[tableId];
        var numCols    = table.tableCols.length;
        var $tableWrap = $("#xcTableWrap-" + tableId);

        // temporarily no animation when deleting multiple duplicate cols
        if (gMinModeOn || noAnim) {
            $tableWrap.find(".col" + cellNum).remove();
            if (!multipleCols) {
                removeColHelper(colNum - 1, tableId);


                for (var i = colNum + 1; i <= numCols; i++) {
                    $tableWrap.find(".col" + i)
                              .removeClass("col" + i)
                              .addClass("col" + (i - 1));
                }

                var $table = $('#xcTable-' + tableId);
                matchHeaderSizes($table);
            } else {
                removeColHelper(colId - 1, tableId);
            }

            deferred.resolve();
            return (deferred.promise());
        }

        $tableWrap.find("th.col" + cellNum).animate({width: 0}, 200, function() {
            var currColNum = xcHelper.parseColNum($(this));
            $tableWrap.find(".col" + currColNum).remove();
            if (!multipleCols) {
                for (var j = currColNum + 1; j <= numCols; j++) {
                    $tableWrap.find(".col" + j)
                              .removeClass("col" + j)
                              .addClass("col" + (j - 1));
                }
                deferred.resolve();
            } else {
                deferred.resolve();
            }
        });

        if (!multipleCols) {
            removeColHelper(colNum - 1, tableId);
        } else {
            removeColHelper(colId - 1, tableId);
        }

        return (deferred.promise());
    }

    // checks to make sure func.name is "pull" and that pull has
    // exactly one argument
    function parsePullColArgs(progCol) {
        if (progCol.func.name !== "pull") {
            console.warn("Wrong function!");
            return (false);
        }

        if (progCol.func.args.length !== 1) {
            console.warn("Wrong number of arguments!");
            return (false);
        }

        var type = typeof progCol.func.args[0];
        if (type !== "string" && type !== "number") {
            console.warn("argument is not a string or number!");
            return (false);
        }
        return (true);
    }

    function getTableCellHtml(value, isTruncated, fullValue) {
        var originalDataClass = "";
        if (!isTruncated) {
            originalDataClass = " originalData";
        }
        var html = '<div class="tdText displayedData' + originalDataClass +
                    ' clickable">' +
                        value +
                   '</div>';
        if (isTruncated) {
            html += '<div class="tdText originalData">' + fullValue + '</div>';
        }
        return (html);
    }

    function searchColNames(val, searchBar, initialTableId) {
        val = val.toLowerCase();
        var $functionArea = $('#functionArea');
        var $headerInputs = $('.xcTable:visible').find('.editableHead');
        var $searchableFields = $headerInputs.add($('.tableTitle:visible')
                                             .find('.text'));
        if (val === "") {
            searchBar.clearSearch(function() {
                $('.xcTable:visible').find('.selectedCell')
                                     .removeClass('selectedCell')
                                     .end()
                                     .closest('.xcTableWrap')
                                     .find('.tblTitleSelected')
                                     .removeClass('tblTitleSelected');
                $('.dagWrap.selected').removeClass('selected')
                                      .addClass('notSelected');
                if (initialTableId && initialTableId === gActiveTableId) {
                    focusTable(initialTableId, true);
                } else {
                    RowScroller.empty();
                }
                $functionArea.removeClass('searching');
            });
            return;
        }

        var $matchedInputs = $searchableFields.filter(function() {
            if ($(this).is('.editableHead')) {
                return ($(this).val().toLowerCase().indexOf(val) !== -1);
            } else if ($(this).is('.text')) {
                return ($(this).data('title').toLowerCase().indexOf(val) !== -1);
            }

        });
        var numMatches = $matchedInputs.length;
        var position = Math.min(1, numMatches);
        var $matches = $matchedInputs.closest('th')
                                     .add($matchedInputs
                                     .closest('.tableTitle'));
        searchBar.$matches = $matches;
        searchBar.numMatches = numMatches;
        $functionArea.find('.position').html(position);
        $functionArea.find('.total').html('of ' + numMatches);
        $('.xcTable:visible').find('.selectedCell')
                             .removeClass('selectedCell')
                             .end()
                             .closest('.xcTableWrap')
                             .find('.tblTitleSelected')
                             .removeClass('tblTitleSelected');
        $('.dagWrap.selected').removeClass('selected')
                              .addClass('notSelected');

        RowScroller.empty();
        if (numMatches !== 0) {
            searchBar.scrollMatchIntoView($matches.eq(0));
            searchBar.highlightSelected($matches.eq(0));
        }
    }

    /*
    *@property {string} val: Text that would be in a table td
    *@property {string} format: "percent" or null which defaults to decimal rounding
    *@property {integer} decimals: Number of decimal places to show, -1 for default
    */
    function formatColumnCell(val, format, decimals) {
        var cachedVal = val;
        val = parseFloat(val);

        if (isNaN(val)) {
            return cachedVal;
        }

        // round it first
        var pow;
        if (decimals > -1) {
            // when no roundToFixed, only percent
            pow = Math.pow(10, decimals);
            val = Math.round(val * pow) / pow;
        }

        switch (format) {
            case "percent":
                // there is a case that 2009.877 * 100 =  200987.69999999998
                // so must round it
                var newVal = val * 100;
                var decimalPartLen;

                if (decimals === -1) {
                    // when no roundToFixed
                    var decimalPart = (val + "").split(".")[1];
                    if (decimalPart != null) {
                        decimalPartLen = decimalPart.length;
                        decimalPartLen = Math.max(0, decimalPartLen - 2);
                        pow = Math.pow(10, decimalPartLen);
                    } else {
                        pow = 1;
                    }
                } else {
                    // when has roundToFixed
                    decimalPartLen = Math.max(0, decimals - 2);
                    pow = Math.pow(10, decimalPartLen);
                }

                newVal = Math.round(newVal * pow) / pow;

                if (decimals > -1) {
                    // when has roundToFixed, need to fix the decimal digits
                    newVal = newVal.toFixed(decimalPartLen);
                }
                return newVal + "%";
            default:
                if (decimals > -1) {
                    val = val.toFixed(decimals);
                } else {
                    val = val + ""; // change to type string
                }
                return val;
        }
    }

    // parse pullcolargs

    /* Unit Test Only */
    if (window.unitTestMode) {
        ColManager.__testOnly__ = {};
        ColManager.__testOnly__.parsePullColArgs = parsePullColArgs;
        ColManager.__testOnly__.parseFuncString = parseFuncString;
        ColManager.__testOnly__.parseColFuncArgs = parseColFuncArgs;
        ColManager.__testOnly__.formatColumnCell = formatColumnCell;
    }
    /* End Of Unit Test Only */

    return (ColManager);
}(jQuery, {}));
