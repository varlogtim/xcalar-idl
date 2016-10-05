// this module support column related functions
window.ColManager = (function($, ColManager) {
    // new ProgCol obj
    ColManager.newCol = function(options) {
        return new ProgCol(options);
    };

    ColManager.newPullCol = function(colName, type) {
        return ColManager.newCol({
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
        });
    };

    // special case, specifically for DATA col
    ColManager.newDATACol = function() {
        return ColManager.newCol({
            "backName": "DATA",
            "name"    : "DATA",
            "type"    : "object",
            "width"   : "auto",// to be determined when building table
            "userStr" : "DATA = raw()",
            "func"    : {
                "name": "raw",
                "args": []
            },
            "isNewCol": false,
            "isHidden": UserSettings.getPref('hideDataCol')
        });
    };

    ColManager.addNewCol = function(colNum, tableId, direction) {
        var table = gTables[tableId];
        var progCol = ColManager.newCol({
            "isNewCol": true
        });

        addColHelper(colNum, tableId, progCol, {
            "direction": direction
        });

        SQL.add("Add New Column", {
            "operation": SQLOps.AddNewCol,
            "tableName": table.getName(),
            "tableId"  : tableId,
            "colNum"   : colNum,
            "direction": direction
        });
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
    ColManager.pullCol = function(colNum, tableId, options) {

        var deferred = jQuery.Deferred();

        options = options || {};

        var backName = options.escapedName;
        var direction = options.direction;

        var table = gTables[tableId];
        var newColName = xcHelper.getUniqColName(tableId, options.fullName);
        var usrStr = '"' + newColName + '" = pull(' + backName + ')';
        var width = getTextWidth($(), newColName, {
            "defaultHeaderStyle": true
        });

        var progCol = ColManager.newCol({
            "backName": backName,
            "name"    : newColName,
            "width"   : width,
            "isNewCol": false,
            "userStr" : usrStr,
            "func"    : {
                "name": "pull",
                "args": [backName]
            }
        });

        var newColNum = addColHelper(colNum, tableId, progCol, {
            "direction": direction,
            "select"   : true,
            "noAnimate": true
        });

        var sqlOptions = {
            "operation"     : SQLOps.PullCol,
            "tableName"     : table.getName(),
            "tableId"       : tableId,
            "newColName"    : newColName,
            "colNum"        : colNum,
            "direction"     : direction,
            "pullColOptions": options,
            "htmlExclude"   : ["pullColOptions"]
        };

        ColManager.execCol("pull", usrStr, tableId, newColNum, {noLog: true})
        .then(function() {
            updateTableHeader(tableId);
            TableList.updateTableInfo(tableId);
            // add sql
            SQL.add("Pull Column", sqlOptions);
            deferred.resolve(newColNum);
        })
        .fail(function(error) {
            SQL.errorLog("Pull Column", sqlOptions, null, error);
            // still resolve the newColNum
            deferred.resolve(newColNum);
        });

        return deferred.promise();
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
        var resizeHeaders = []; // booleans for whether to resize col header

        var i;
        for (i = numColInfos - 1; i >= 0; i--) {
            newTableNames[i] = tableNamePart + Authentication.getHashId();
            var colInfo = colTypeInfos[i];
            var col = tableCols[colInfo.colNum - 1];
            var colName = xcHelper.stripeColName(col.getFrontColName()) +
                            "_" + colInfo.type;
            // here use front col name to generate newColName
            newFieldNames[i] = xcHelper.getUniqColName(tableId, colName);
            mapStrings[i] = xcHelper.castStrHelper(col.getBackColName(), colInfo.type);
            resizeHeaders[i] = col.sizedToHeader;
        }

        // this makes it easy to get previous table name
        // when index === numColInfos
        newTableNames[numColInfos] = tableName;

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
            "sql"      : sql,
            "steps"    : numColInfos
        });

        xcHelper.lockTable(tableId, txId);

        var promises = [];
        for (i = numColInfos - 1; i >= 0; i--) {
            promises.push(changeTypeHelper.bind(this, i));
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

        function changeTypeHelper(index) {
            var innerDeferred = jQuery.Deferred();

            var curTableName = newTableNames[index + 1];
            var newTableName = newTableNames[index];
            var fieldName = newFieldNames[index];
            var mapString = mapStrings[index];
            var curColNum = colTypeInfos[index].colNum;
            var resize = resizeHeaders[index];

            XIApi.map(txId, mapString, curTableName, fieldName, newTableName)
            .then(function() {
                var mapOptions = {"replaceColumn": true, "resize": resize};
                var curTableId = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;

                var newTablCols = xcHelper.mapColGenerate(curColNum, fieldName,
                                        mapString, curTableCols, mapOptions);

                if (index > 0) {
                    TblManager.setOrphanTableMeta(newTableName, newTablCols);
                    return PromiseHelper.resolve(null);
                } else {
                    var colNums = [];
                    for (var i = 0; i < colTypeInfos.length; i++) {
                        colNums.push(colTypeInfos[i].colNum);
                    }
                    var options = {
                        selectCol: colNums
                    };

                    return TblManager.refreshTable([newTableName], newTablCols,
                                               [tableName], worksheet, txId,
                                               options);
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

        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.SplitColumn,
            "operation": SQLOps.SplitCol,
            "steps"    : -1
        });

        xcHelper.lockTable(tableId, txId);

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
                                                [tableName], worksheet, txId);
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
                return XIApi.aggregate(txId, AggrOp.MaxInteger, fieldName, newTableName);
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
                    "title"    : ColTStr.SplitColWarn,
                    "msg"      : msg,
                    "onConfirm": function() {
                        curDeferred.resolve(numToSplit, numDelim);
                    },
                    "onCancel": function() {
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
        if (options.keepEditable) {
            // used when undoing a rename on a new column
            $th.find('.flexWrap.flex-mid').addClass('editable');
            $th.find('.header').addClass('editable');
            $th.find('.editableHead').prop("disabled", false);
            $th.width(gNewCellWidth);
            curCol.width = gNewCellWidth;
        } else {
            $th.find('.editable').removeClass('editable');
            $editableHead.prop("disabled", true);
            FnBar.focusOnCol($editableHead, tableId, colNum, true);
        }

        $editableHead.val(newName).attr("value", newName);
        if (!options.keepEditable && curCol.sizedToHeader) {
            autosizeCol($th, {
                "dblClick"     : true,
                "minWidth"     : 17,
                "includeHeader": true
            });
        }

        // adjust tablelist column name
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
        var table = gTables[tableId];

        switch (operation) {
            case ("pull"):
                var origCol = table.tableCols[colNum - 1];
                var origType = origCol.type;
                var origFunc = xcHelper.deepCopy(origCol.func);
                var origUsrStr = origCol.userStr;
                var backName = origCol.backName;
                var frontName = origCol.name;
                var wasNewCol = origCol.isNewCol;
                var progCol = ColManager.newCol({
                    "name"         : frontName,
                    "width"        : origCol.width,
                    "userStr"      : usrStr,
                    "isNewCol"     : false,
                    "sizedToHeader": origCol.sizedToHeader
                });
                progCol.parseFunc();
                if ((!args || !args.undo) && !parsePullColArgs(progCol) ) {
                    console.error("Arg parsing failed");
                    progCol.func = xcHelper.deepCopy(origFunc);
                    deferred.reject("Arg parsing failed");
                    break;
                }

                if (args && args.undo) {
                    progCol.backName = args.backName;
                } else {
                    progCol.backName = progCol.func.args[0];
                }

                table.tableCols[colNum - 1] = progCol;
                pullColHelper(colNum, tableId);

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
                                mapString, options, gIcvMode)
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
                console.warn("No such function yet!");
                deferred.resolve();
                break;
        }

        return deferred.promise();
    };

    // @$inputs: check $input against the names of $inputs
    // @tableId: check $input against back column names.
    // You do not need both $inputs and tableId
    ColManager.checkColDup = function ($input, $inputs, tableId, parseCol,
                                       colNum) {

        var name = $input.val().trim();
        var isDuplicate = false;
        var title = ErrTStr.ColumnConflict;

        if (parseCol) {
            name = name.replace(/^\$/, '');
        }

        $(".tooltip").hide();
        // temporarily use, will be removed when backend allow name with space
        if (/^ | $|[,\(\)\[\]'"\.\\]|::/.test(name) === true) {
            title = ColTStr.RenamSpecialChar;
            isDuplicate = true;
        } else if (name === 'DATA') {
            title = ErrTStr.PreservedName;
            isDuplicate = true;
        } else {
            var c = name.charAt(0);
            if (c >= '0' && c <= '9') {
                title = ColTStr.RenamStartNum;
                isDuplicate = true;
            }
        }

        if (gTables[tableId].getImmediateNames().indexOf(name) !== -1) {
            title = ColTStr.ImmediateClash;
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
                    title = ErrTStr.ColumnConflict;
                    isDuplicate = true;
                    break;
                }
            }
        }

        if (isDuplicate) {
            // var container = $input.closest('.mainPanel').attr('id');
            // xx xi2.0 changing container to body because op view doesn't have
            // a mainPanel parent. Not sure if this will cause tooltip placement
            // bugs
            var $toolTipTarget = $input.parent();

            $toolTipTarget.tooltip({
                "title"    : title,
                "placement": "top",
                "trigger"  : "manual",
                "container": "body",
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
        var table = gTables[tableId];

        var oldCol = table.getCol(colNum);
        var oldName = oldCol.getFrontColName();
        var newName = xcHelper.getUniqColName(tableId, oldName);

        var progCol = ColManager.newCol(oldCol);
        progCol.setFrontColName(newName);
        var cellWidth = getTextWidth(null, newName, {
            defaultHeaderStyle: true
        });
        progCol.setWidth(cellWidth);

        var newColNum = addColHelper(colNum, tableId, progCol, {
            "direction": "R"
        });
        // add sql
        SQL.add("Duplicate Column", {
            "operation" : SQLOps.DupCol,
            "tableName" : table.getName(),
            "tableId"   : tableId,
            "colName"   : oldName,
            "newColName": newName,
            "colNum"    : colNum
        });

        pullColHelper(newColNum, tableId);

        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
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
        var $table = $('#xcTable-' + tableId);
        var colNumsList = [];
        var removedCols = [];
        var removedColsWithIndex = [];
        var removedColNums = [];
        for (var i = 0; i < columns.length; i++) {
            colNumsList.push(i);
        }
        // XX could change this to use a map to store duplicates and make this
        // O(2n) instead of O(n^2)
        for (i = 0; i < columns.length; i++) {
            var backName = columns[i].backName;
            if (columns[i].func.func && columns[i].func.func === "raw") {
                continue;
            } else {
                for (var j = i + 1; j < columns.length; j++) {
                    if (backName === columns[j].backName) {
                        var removedCol = removeColHelper(j, tableId);
                        removedCols.push();
                        var removedColNum = colNumsList.splice(j, 1)[0];
                        removedColsWithIndex.push({
                            "removedCol": removedCol,
                            "index"     : removedColNum
                        });
                        removedColNums.push(removedColNum);
                        $table.find('th.col' + (removedColNum + 1)).remove();
                        j--;
                    }
                }
            }
        }

        var dataIndex = xcHelper.parseColNum($table.find('th.dataCol'));
        $table.find('th').each(function(i) {
            var colNum;
            var $th = $(this);
            if (!$th.hasClass('rowNumHead') && !$th.hasClass('dataCol')) {
                colNum = xcHelper.parseColNum($th);
                $th.removeClass('col' + colNum).addClass('col' + i);
                $th.find('.col' + colNum).removeClass('col' + colNum)
                                            .addClass('col' + i);
            } else if ($th.hasClass('dataCol')) {
                colNum = xcHelper.parseColNum($th);
                $th.removeClass('col' + colNum).addClass('col' + i);
                $th.find('.col' + colNum).removeClass('col' + colNum)
                                            .addClass('col' + i);
            }
        });
        var rowNum = xcHelper.parseRowNum($table.find('tbody').find('tr:eq(0)'));

        var jsonData = [];
        $table.find('tbody').find('.col' + dataIndex).each(function() {
            jsonData.push($(this).find('.originalData').text());
        });
        $table.find('tbody').empty(); // remove tbody contents for pullrowsbulk

        TblManager.pullRowsBulk(tableId, jsonData, rowNum, RowDirection.Bottom);
        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
        matchHeaderSizes($table);
        moveFirstColumn();

        // ordering the column nums improves the sql display and helps the undo
        removedColsWithIndex.sort(function(a, b) {
            return (a.index - b.index);
        });
        removedColNums.sort(function(a, b) {
            return (a - b);
        });
        for (var i = 0; i < removedColsWithIndex.length; i++) {
            removedCols.push(removedColsWithIndex[i].removedCol);
        }

        SQL.add("Delete All Duplicate Columns", {
            "operation"  : SQLOps.DelAllDupCols,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colNums"    : removedColNums,
            "progCols"   : removedCols,
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
        var $th;

        for (var i = 0; i < numCols; i++) {
            var colNum = colNums[i];
            tdSelectors += "td.col" + colNum + ",";
            var col = tableCols[colNum - 1];
            $th = $table.find('th.col' + colNum);
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
            $tds.addClass('animating');
            $ths.animate({width: 15}, 250, "linear", function() {
                $ths.addClass("userHidden");
                $tds.addClass("userHidden");
                $tds.removeClass('animating');
                matchHeaderSizes($table); // needed to resize rowgrabs
            });

            moveTableTitlesAnimated(tableId, tableWidth, widthDiff, 250);
        } else {
            $ths.width(10);
            $ths.addClass("userHidden");
            $tds.addClass("userHidden");
            matchHeaderSizes($table);
        }

        // change tooltip to show name
        $ths.each(function(i) {
            $th = $(this);
            $th.find('.dropdownBox').attr({
                "title"              : "",
                "data-original-title": colNames[i]
            });
        });

        xcHelper.removeSelectionRange();

        SQL.add("Hide Columns", {
            "operation": SQLOps.HideCols,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colNames" : colNames,
            "colNums"  : colNums
        });
    };

    ColManager.unhideCols = function(colNums, tableId, noAnim) {
        var $table     = $('#xcTable-' + tableId);
        var tableWidth = $table.width();
        var table      = gTables[tableId];
        var tableCols = table.tableCols;
        var numCols    = colNums.length;
        var colNames   = [];
        var widthDiff = 0;
        var $ths = $();
        var promises = [];
        var $th;

        for (var i = 0; i < numCols; i++) {
            var colNum = colNums[i];
            $th = $table.find(".th.col" + colNum);
            $ths = $ths.add($th);

            var col = tableCols[colNum - 1];
            var originalColWidth = col.width;
            widthDiff += (originalColWidth - 15);
            col.isHidden = false;
            colNames.push(col.name);

            if (!gMinModeOn && !noAnim) {
                $table.find('.col' + colNum).addClass('animating');
                promises.push(jQuery.Deferred());
                var count = 0;

                $th.animate({width: col.width}, 250, "linear", function() {
                    var colNum = xcHelper.parseColNum($(this));
                    $table.find('.col' + colNum).removeClass('animating');
                    promises[count].resolve();
                    count++;
                });
            } else {
                $th.css("width", col.width);
            }

            $table.find("th.col" + colNum + ",td.col" + colNum)
                  .removeClass("userHidden");
        }

        if (!gMinModeOn && !noAnim) {
            jQuery.when.apply($, promises).done(function() {
                matchHeaderSizes($table);
            });
            moveTableTitlesAnimated(tableId, tableWidth, -widthDiff);
        } else {
            matchHeaderSizes($table);
        }


        // change tooltip to show column options
        $ths.each(function() {
            $(this).find('.dropdownBox').attr({
                "title"              : "",
                "data-original-title": TooltipTStr.ViewColumnOptions
            });
        });

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

    ColManager.pullAllCols = function(startIndex, jsonData, tableId,
                                        direction, rowToPrependTo)
    {
        var table = gTables[tableId];
        var tableCols = table.tableCols;
        var numCols = tableCols.length;
        var indexedColNums = [];
        var nestedVals = [];

        var $table = $('#xcTable-' + tableId);
        var tBodyHTML = "";
        var nested;
        var hasIndexStyle = table.showIndexStyle();

        startIndex = startIndex || 0;

        for (var i = 0; i < numCols; i++) {
            var progCol = tableCols[i];
            if (progCol.isDATACol() || progCol.isEmptyCol()) {
                // this is the data Column
                nestedVals.push([""]);
            } else {
                var backColName = progCol.getBackColName();
                nested = parseColFuncArgs(backColName);
                if (!isValidColToPull(backColName)) {
                    nested = [""];
                }

                nestedVals.push(nested);
                // get the column number of the column the table was indexed on
                if (backColName === table.keyName) {
                    indexedColNums.push(i);
                }
            }
        }

        // loop through table tr and start building html
        for (var row = 0, numRows = jsonData.length; row < numRows; row++) {
            var tdValue = parseRowJSON(jsonData[row]);
            var rowNum = row + startIndex;
            var idTitle = "";

            tBodyHTML += '<tr class="row' + rowNum + '">';

            // add bookmark
            if (table.bookmarks.indexOf(rowNum) > -1) {
                tBodyHTML += '<td align="center" class="col0 rowBookmarked">';
                idTitle = TooltipTStr.Bookmarked;
            } else {
                tBodyHTML += '<td align="center" class="col0">';
                idTitle = TooltipTStr.Bookmark;
            }

            // Line Marker Column
            tBodyHTML += '<div class="idWrap">' +
                            '<span class="idSpan"' +
                            ' data-toggle="tooltip"' +
                            ' data-placement="bottom"' +
                            ' data-container="body"' +
                            ' data-original-title="' + idTitle + '">' +
                                (rowNum + 1) +
                            '</span>' +
                            '<div class="rowGrab"></div>' +
                          '</div>' +
                        '</td>';

            // loop through table tr's tds
            for (var col = 0; col < numCols; col++) {
                nested = nestedVals[col];

                var indexed = (indexedColNums.indexOf(col) > -1);
                var parseOptions = {
                    "hasIndexStyle": hasIndexStyle,
                    "indexed"      : indexed
                };
                var res = parseTdHelper(tdValue, nested,
                                        tableCols[col], parseOptions);
                var tdClass = "col" + (col + 1);

                if (res.tdClass !== "") {
                    tdClass += " " + res.tdClass;
                }

                tBodyHTML += '<td class="' + tdClass + '">' +
                                res.td +
                            '</td>';
            }
            // end of loop through table tr's tds
            tBodyHTML += '</tr>';
        }
        // end of loop through table tr and start building html

        // assign column type class to header menus
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

        for (var i = 0; i < numCols; i++) {
            styleColHeadHelper(i + 1, tableId);
        }

        return $tBody;
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

        for (var arrayKey in jsonTdObj) {
            if (options.isDataTd) {
                colName = arrayKey;
                // escapedColName = xcHelper.escapeColName(arrayKey);
                escapedColName = arrayKey;
            } else {
                openSymbol = "";
                closingSymbol = "";
                if (!isArray) {
                    openSymbol = ".";
                } else {
                    openSymbol = "[";
                    closingSymbol = "]";
                }

                // colName = cols[colNum - 1].getBackColName().replace(/\\./g, ".") +
                //           openSymbol + arrayKey + closingSymbol;
                colName = cols[colNum - 1].getBackColName() +
                          openSymbol + arrayKey + closingSymbol;
                // escapedColName = cols[colNum - 1].getBackColName() + openSymbol +
                //                 xcHelper.escapeColName(arrayKey) + closingSymbol;
                escapedColName = cols[colNum - 1].getBackColName() + openSymbol +
                                arrayKey + closingSymbol;
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
        var ths = "";
        var widthOptions = {
            defaultHeaderStyle: true
        };

        for (var i = 0; i < numKeys; i++) {
            var key = colNames[i];
            var escapedKey = escapedColNames[i];
            var usrStr = '"' + key + '" = pull(' + escapedKey + ')';
            var width = getTextWidth($(), key, widthOptions);

            var newCol = ColManager.newCol({
                "backName": key,
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

            newColNum++;
            var colHeadNum = newColNum;
            if (!options.isDataTd) {
                colHeadNum++;
            }
            colNums.push(colHeadNum);
            ths += TblManager.getColHeadHTML(colHeadNum, tableId);
        }

        var rowNum = xcHelper.parseRowNum($table.find('tbody').find('tr:eq(0)'));
        var origDataIndex = xcHelper.parseColNum($table.find('th.dataCol'));
        var jsonData = [];
        $table.find('tbody').find('.col' + origDataIndex).each(function() {
            jsonData.push($(this).find('.originalData').text());
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

        TblManager.pullRowsBulk(tableId, jsonData, rowNum, RowDirection.Bottom);
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


    ColManager.parseFuncString = function (funcString, func) {
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
                    i += ColManager.parseFuncString(funcString.substring(i + 1),
                                                    newFunc);
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
    };

    function isValidColToPull(colName) {
        if (colName === "" || colName == null) {
            return false;
        }

        if (/\\.([0-9])/.test(colName)) {
            // slash followed by dot followed by number is ok
            // fall through
        } else if (/\.([0-9])/.test(colName)) {
            // dot followed by number is invalid
            return false;
        }

        return true;
    }

    function parseTdHelper(tdValue, nested, progCol, options) {
        options = options || {};

        var knf = false;
        var truncLimit = 1000; // the character limit for the data td
        var colTruncLimit = 500; // the character limit for other tds

        var tdClass = "clickable";
        var isDATACol = false;

        if (progCol.isDATACol()) {
            isDATACol = true;
            tdClass += " jsonElement";
        } else if (progCol.isEmptyCol()) {
            tdValue = "";
        } else {
            if (!nested) {
                console.error('Error this value should not be empty');
                tdValue = "";
            } else {
                var nestedLength = nested.length;
                for (var i = 0; i < nestedLength; i++) {
                    if (tdValue[nested[i]] === null) {
                        // when tdValue is null (not undefined)
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

                    if (!progCol.isChildOfArray() &&
                        i < nestedLength - 1 &&
                        (tdValue instanceof Array))
                    {
                        progCol.beChidOfArray();
                    }
                }
            }

            // define type of the column
            progCol.updateType(tdValue);

            // class for textAlign
            if (progCol.textAlign === "Left") {
                tdClass += " textAlignLeft";
            } else if (progCol.textAlign === "Right") {
                tdClass += " textAlignRight";
            } else if (progCol.textAlign === "Wrap") {
                tdClass += " textAlignWrap";
            }
        }

        if (options.indexed) {
            tdClass += " indexedColumn";

            if (!options.hasIndexStyle) {
                tdClass += " noIndexStyle";
            }
        }

        // formatting
        var parsedVal = xcHelper.parseJsonValue(tdValue, knf);
        var formatVal = parsedVal;
        var decimals = progCol.decimals;
        var format = progCol.format;

        if (!knf && tdValue != null && (decimals > -1 || format != null)) {
            formatVal = formatColumnCell(parsedVal, format, decimals);
        }

        var limit = isDATACol ? truncLimit : colTruncLimit;
        var tdValLen = formatVal.length;
        var truncated = (tdValLen > limit);

        if (truncated) {
            var truncLen = tdValLen - limit;
            formatVal = formatVal.substr(0, limit) +
                        "...(" + (truncLen.toLocaleString("en")) +
                        " " + TblTStr.Truncate + ")";
            tdClass += " truncated";
        }

        // For formated number, need seprate display of formatVal
        // and original val
        if (!knf && tdValue != null && progCol.isNumberCol()) {
            truncated = true;
        }

        var td = getTableCellHtml(formatVal, truncated, parsedVal, isDATACol);
        return {
            "td"     : td,
            "tdClass": tdClass.trim(),
        };
    }

    function styleColHeadHelper(colNum, tableId) {
        var $table = $("#xcTable-" + tableId);
        var progCol = gTables[tableId].getCol(colNum);
        var $th = $table.find("th.col" + colNum);
        var $header = $th.find("> .header");
        var colType = progCol.getType();

        $header.removeClass("type-mixed")
                .removeClass("type-string")
                .removeClass("type-integer")
                .removeClass("type-float")
                .removeClass("type-object")
                .removeClass("type-array")
                .removeClass("type-undefined")
                .removeClass("type-boolean")
                .removeClass("recordNum")
                .removeClass("childOfArray")
                .addClass("type-" + colType);

        // for integer or float, if we cannot distinct (if no info from backend)
        // then we say it's a number
        var adjustedColType = colType;
        if (!progCol.isImmediate() && progCol.isNumberCol()) {
            adjustedColType = "number";
        }
        adjustedColType = xcHelper.capitalize(adjustedColType);
        $header.find(".iconHelper").attr("title", adjustedColType);

        // XXX May not need it any more
        // if (progCol.getBackColName() === "recordNum") {
        //     $header.addClass("recordNum");
        // }

        if (progCol.hasHidden()) {
            $table.find("td.col" + colNum).addClass("userHidden");
        }
        if (progCol.isChildOfArray()) {
            $header.addClass("childOfArray");
        }
        // if (options.notNewCol) {
        //     $th.removeClass("newColumn");
        // }
        if ($th.hasClass("selectedCell") ||
            $th.hasClass("modalHighlighted")) {
            highlightColumn($th, true);
        }
    }

    function pullColHelper(colNum, tableId) {
        var table = gTables[tableId];
        var progCol = table.getCol(colNum);
        var backColName = progCol.getBackColName();

        if (!isValidColToPull(backColName)) {
            return;
        }

        var $table = $("#xcTable-" + tableId);
        var $dataCol = $table.find("tr:first th").filter(function() {
            return ($(this).find("input").val() === "DATA");
        });

        var dataColNum = xcHelper.parseColNum($dataCol);


        var startingIndex = parseInt($table.find("tbody tr:first")
                                           .attr('class').substring(3));
        var endingIndex = parseInt($table.find("tbody tr:last")
                                           .attr('class').substring(3)) + 1;

        var nested = parseColFuncArgs(backColName);
        var indexed = (progCol.getBackColName() === table.getKeyName());
        var hasIndexStyle = table.showIndexStyle();

        for (var i = startingIndex; i < endingIndex; i++) {
            var $jsonTd = $table.find('.row' + i + ' .col' + dataColNum);
            var jsonStr = $jsonTd.find('.originalData').text();
            var tdValue = parseRowJSON(jsonStr);
            var res = parseTdHelper(tdValue, nested, progCol, {
                "indexed"      : indexed,
                "hasIndexStyle": hasIndexStyle
            });

            var $td = $table.find('.row' + i + ' .col' + colNum);
            $td.html(res.td);
            if (res.tdClass !== "") {
                $td.addClass(res.tdClass);
            }
        }

        styleColHeadHelper(colNum, tableId);
    }

    function addColHelper(colNum, tableId, progCol, options) {
        var $tableWrap = $("#xcTableWrap-" + tableId);
        var $table = $tableWrap.find(".xcTable");
        var table = gTables[tableId];
        var numCols = table.tableCols.length;
        var newColNum = colNum;

        // options
        options = options || {};
        var select = options.select || false;
        var noAnimate = options.noAnimate || false;

        var width = progCol.getWidth();
        var isNewCol = progCol.isEmptyCol();
        var isHidden = progCol.hasHidden();
        var columnClass = "";

        if (options.direction !== "L") {
            newColNum += 1;
        }

        if (isNewCol) {
            select = true;
        }

        if (select) {
            columnClass += " selectedCell";
            $(".selectedCell").removeClass("selectedCell");
        }

        table.addCol(newColNum - 1, progCol);

        // change table class before insert a new column
        for (var i = numCols; i >= newColNum; i--) {
            $tableWrap.find('.col' + i)
                      .removeClass('col' + i)
                      .addClass('col' + (i + 1));
        }
        // insert new th column
        var $th = $(TblManager.getColHeadHTML(newColNum, tableId, {
            "columnClass": columnClass
        }));
        $tableWrap.find('.th.col' + (newColNum - 1)).after($th);

        if (gMinModeOn || noAnimate) {
            updateTableHeader(tableId);
            TableList.updateTableInfo(tableId);
            $tableWrap.find('.rowGrab').width($table.width());
            matchHeaderSizes($table);
            moveFirstColumn();
        } else {
            $th.width(10);
            if (!isHidden) {
                columnClass += " animating";
                $th.animate({width: width}, 300, function() {
                    updateTableHeader(tableId);
                    TableList.updateTableInfo(tableId);
                    matchHeaderSizes($table);
                    $table.find('.col' + newColNum).removeClass('animating');
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
        var idOfFirstRow = $table.find("tbody tr:first").attr("class");
        var idOfLastRow = $table.find("tbody tr:last").attr("class");
        var startingIndex = idOfFirstRow ?
                                parseInt(idOfFirstRow.substring(3)) : 1;
        var endingIndex = parseInt(idOfLastRow.substring(3));
        var newCellHTML = '<td ' + 'class="' + columnClass.trim() +
                          ' col' + newColNum + '"></td>';

        var i = startingIndex;
        while (i <= endingIndex) {
            $table.find(".row" + i + " .col" + (newColNum - 1))
                  .after(newCellHTML);
            i++;
        }

        if (isNewCol) {
            // Without doing this, the lastTarget will still be a div
            // even we focus on the input, so press space will make table scroll
            $th.find(".flexContainer").mousedown();
            var $input = $th.find(".editableHead").focus();
            gMouseEvents.setMouseDownTarget($input);
            gMouseEvents.setClickTarget($input);
        }

        return newColNum;
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
            return "";
        }
        key += ""; // if number, convert to string

        // replace votes[funny] with votes.funny but votes\[funny\] will remain
        // XXX this is waiting for backend to fix, after that
        // we should not have votes\[fuuny\]
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
            return "";
        }
        // for (var i = 0; i < nested.length; i++) {
        //     nested[i] = xcHelper.unescapeColName(nested[i]);
        // }
        return nested;
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
        $tableWrap.find('.col' + cellNum).addClass('animating');
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

    function getTableCellHtml(value, isTruncated, fullValue, isDATACol) {
        var tdClass;
        var html;

        if (isDATACol) {
            tdClass = isTruncated ? " truncated" : " originalData";
            html = '<i class="pop icon xi_popout fa-15 xc-action"></i>' +
                    '<div class="dataColText clickable displayedData' +
                        tdClass + '">' +
                            value +
                    '</div>';
            if (isTruncated) {
                html += '<div class="dataColText originalData">' +
                            fullValue +
                        '</div>';
            }

        } else {
            tdClass = isTruncated ? "" : " originalData";

            html =
                '<div class="tdText displayedData clickable' + tdClass + '">' +
                    value +
                '</div>';
            if (isTruncated) {
                html += '<div class="tdText originalData">' +
                            fullValue +
                        '</div>';
            }
        }
        return (html);
    }

    function searchColNames(val, searchBar, initialTableId) {
        val = val.toLowerCase();
        var $functionArea = $('#functionArea');
        var $headerInputs = $('.xcTableWrap:visible:not(.tableOpSection)')
                            .find('.editableHead');
        var $tableTitles = $('.xcTableWrap:visible:not(.tableOpSection)')
                            .find('.tableTitle .text');
        var $searchableFields = $headerInputs.add($tableTitles);
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
            });
            $functionArea.find('.position').hide();
            $functionArea.find('.counter').hide();
            $functionArea.find('.arrows').hide();
            return;
        }

        $functionArea.find('.position').show();
        $functionArea.find('.counter').show();
        $functionArea.find('.arrows').show();

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
        ColManager.__testOnly__.parseColFuncArgs = parseColFuncArgs;
        ColManager.__testOnly__.formatColumnCell = formatColumnCell;
    }
    /* End Of Unit Test Only */

    return (ColManager);
}(jQuery, {}));
