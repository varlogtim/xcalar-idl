// this module support column related functions
window.ColManager = (function($, ColManager) {
    // new ProgCol obj
    ColManager.newCol = function(options) {
        return new ProgCol(options);
    };

    ColManager.newPullCol = function(colName, backColName, type) {
        if (backColName == null) {
            backColName = colName;
        }

        var prefix = xcHelper.parsePrefixColName(backColName).prefix;
        var width = xcHelper.getDefaultColWidth(colName, prefix);

        return ColManager.newCol({
            "backName": backColName,
            "name"    : colName,
            "type"    : type || null,
            "width"   : width,
            "isNewCol": false,
            "userStr" : '"' + colName + '" = pull(' + backColName + ')',
            "func"    : {
                "name": "pull",
                "args": [backColName]
            }
        });
    };

    // special case, specifically for DATA col
    ColManager.newDATACol = function() {
        return ColManager.newCol({
            "backName": "DATA",
            "name"    : "DATA",
            "type"    : ColumnType.object,
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

    ColManager.addNewCol = function(colNum, tableId, direction, colOptions) {
        var defaultOptions = {
            "isNewCol": true,
            "width"   : xcHelper.getDefaultColWidth("")
        };
        var actulColOptoins = $.extend(defaultOptions, colOptions);
        var progCol = ColManager.newCol(actulColOptoins);
        addColHelper(colNum, tableId, progCol, {
            "direction": direction
        });

        SQL.add("Add New Column", {
            "operation": SQLOps.AddNewCol,
            "tableName": gTables[tableId].getName(),
            "tableId"  : tableId,
            "colNum"   : colNum,
            "direction": direction,
            "options"  : colOptions
        });
    };

    //options
    // noAnimate: boolean, if true, no animation is applied
    ColManager.delCol = function(colNums, tableId, options) {
        options = options || {};
        // deletes an array of columns
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var $table = $('#xcTable-' + tableId);
        var colNames = [];
        var promises = [];
        var colWidths = 0;
        var tableWidth = $table.closest('.xcTableWrap').width();
        var progCols = [];
        var noAnimate = options.noAnimate || false;

        for (var i = 0, len = colNums.length; i < len; i++) {
            var colNum = colNums[i];
            var colIndex = colNum - i;
            var progCol = table.getCol(colIndex);

            colNames.push(progCol.getFrontColName(true));
            progCols.push(progCol);

            colWidths += progCol.getDisplayWidth();
            promises.push(delColHelper(colNum, tableId, true, colIndex,
                                       noAnimate));
        }
        if (gMinModeOn || noAnimate) {
            moveTableTitles($table.closest('.xcTableWrap'));
        } else {
            moveTableTitlesAnimated(tableId, tableWidth, colWidths, 200);
        }

        FnBar.clear(true);

        jQuery.when.apply($, promises)
        .done(function() {
            var numCols = table.getNumCols();
            for (var j = colNums[0]; j <= numCols; j++) {
                var oldColNum = xcHelper.parseColNum($table.find('th').eq(j));
                $table.find(".col" + oldColNum)
                      .removeClass('col' + oldColNum)
                      .addClass('col' + j);
            }

            TblManager.updateHeaderAndListInfo(tableId);
            xcHelper.removeSelectionRange();

             // add SQL
            SQL.add("Delete Column", {
                "operation"  : SQLOps.DeleteCol,
                "tableName"  : table.getName(),
                "tableId"    : tableId,
                "colNames"   : colNames,
                "colNums"    : colNums,
                "progCols"   : progCols,
                "htmlExclude": ["progCols"]
            });
            deferred.resolve();
        });

        return deferred.promise();
    };

    // specifically used for json modal
    ColManager.pullCol = function(colNum, tableId, options) {
        var deferred = jQuery.Deferred();

        options = options || {};

        var backName = options.escapedName;
        var direction = options.direction;

        var table = gTables[tableId];
        var newColName = xcHelper.getUniqColName(tableId, options.fullName, true);

        var progCol = ColManager.newPullCol(newColName, backName);
        var usrStr = progCol.userStr;

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
            TblManager.updateHeaderAndListInfo(tableId);
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
        var worksheet = WSManager.getWSFromTable(tableId);
        var table = gTables[tableId];
        var tableName = table.getName();
        var curTableName = tableName;

        var sql = {
            "operation"   : SQLOps.ChangeType,
            "tableName"   : tableName,
            "tableId"     : tableId,
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
        for (var i = 0; i < numColInfos; i++) {
            promises.push(changeTypeHelper.bind(this, i));
        }

        PromiseHelper.chain(promises)
        .then(function(newTableName) {
            sql.newTableName = newTableName;
            var newTableId = xcHelper.getTableId(newTableName);
            // map do not change stats of the table
            Profile.copy(tableId, newTableId);
            xcHelper.unlockTable(tableId);
            Transaction.done(txId, {
                "msgTable": newTableId,
                "sql"     : sql
            });
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

        return deferred.promise();

        function changeTypeHelper(index) {
            var innerDeferred = jQuery.Deferred();

            var srcTable = curTableName;
            var newTable;

            var colInfo = colTypeInfos[index];
            var colNum = colInfo.colNum;
            var colType = colInfo.type;

            var progCol = table.getCol(colNum);
            var frontName = progCol.getFrontColName();
            var backName = progCol.getBackColName();

            var mapStr = xcHelper.castStrHelper(backName, colType);
            var fieldName = xcHelper.stripeColName(frontName) + "_" + colType;
            // here use front col name to generate newColName
            fieldName = xcHelper.getUniqColName(tableId, fieldName);

            XIApi.map(txId, mapStr, srcTable, fieldName)
            .then(function(tableAfterMap) {
                newTable = tableAfterMap;

                var mapOptions = {
                    "replaceColumn": true,
                    "resize"       : true
                };
                var srcTableId = xcHelper.getTableId(srcTable);
                var srcTableCols = gTables[srcTableId].tableCols;

                var newTablCols = xcHelper.mapColGenerate(colNum, fieldName,
                                        mapStr, srcTableCols, mapOptions);

                if (index !== numColInfos - 1) {
                    TblManager.setOrphanTableMeta(newTable, newTablCols);
                    return;
                } else {
                    var colNums = colTypeInfos.map(function(info) {
                        return info.colNum;
                    });
                    var options = {
                        "selectCol": colNums
                    };

                    return TblManager.refreshTable([newTable], newTablCols,
                                                [tableName], worksheet, txId,
                                                options);
                }
            })
            .then(function() {
                curTableName = newTable;
                innerDeferred.resolve(newTable);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
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

                    if (table.hasCol(newFieldNames[i], "")) {
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
            // resolve will be used in testing
            deferred.resolve(newTableId);
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

        return deferred.promise();

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
                XcalarDeleteTable(newTableName, txId);
                // Note that the splitColNum should be charCountNum + 1
                alertHelper(value + 1, null, innerDeferred);
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
        options = options || {};

        var table = gTables[tableId];
        var $table = $("#xcTable-" + tableId);
        var $th = $table.find('th.col' + colNum);
        var curCol  = table.getCol(colNum);
        var oldName = curCol.getFrontColName();
        var keepEditable = options.keepEditable || false;
        var prevWidth = curCol.width;

        curCol.name = newName;
        var wasEditable = $th.find('.flexWrap.editable').length;
        var $editableHead = $th.find('.editableHead');
        if (keepEditable) {
            // used when undoing a rename on a new column
            $th.find('.flexWrap.flex-mid').addClass('editable');
            $th.find('.header').addClass('editable');
            $editableHead.prop("disabled", false);
            var newWidth;
            if (options.prevWidth == null) {
                newWidth = gNewCellWidth;
            } else {
                newWidth = options.prevWidth;
            }
            $th.width(newWidth);
            curCol.setWidth(newWidth);
        } else {
            $th.find('.editable').removeClass('editable');
            $editableHead.prop("disabled", true);
            FnBar.focusOnCol($editableHead, tableId, colNum, true);
            FnBar.focusCursor();
        }

        $editableHead.val(newName).attr("value", newName);
        if (!keepEditable && curCol.sizedToHeader) {
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
            "prevWidth"  : prevWidth,
            "htmlExclude": ["wasNew", "prevWidth"]
        });

        KVStore.commit();
    };

    ColManager.format = function(colNums, tableId, formats) {
        // pass in array of format is for undo to bring back origin formats
        var table = gTables[tableId];
        var oldFormats = [];
        var colNames = [];
        var filteredColNums = [];
        var filteredFormats = [];

        colNums.forEach(function(colNum, i) {
            var progCol = table.getCol(colNum);
            var format = formats[i];
            var colFormat = progCol.getFormat();
            if (format === colFormat) {
                return;
            }

            filteredColNums.push(colNum);
            filteredFormats.push(format);
            oldFormats.push(colFormat);
            colNames.push(progCol.getFrontColName(true));

            progCol.setFormat(format);
            updateFormatAndDecimal(tableId, colNum);
        });

        if (!filteredColNums.length) {
            return;
        }

        SQL.add("Change Format", {
            "operation"  : SQLOps.ChangeFormat,
            "tableName"  : table.getName(),
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
        var prevDecimals = [];
        var colNames = [];

        colNums.forEach(function(colNum, i) {
            var progCol = table.getCol(colNum);
            var newDecimal = decimals[i];

            prevDecimals.push(progCol.getDecimal());
            colNames.push(progCol.getFrontColName(true));
            progCol.setDecimal(newDecimal);

            updateFormatAndDecimal(tableId, colNums);
        });

        SQL.add("Round To Fixed", {
            "operation"   : SQLOps.RoundToFixed,
            "tableName"   : table.getName(),
            "tableId"     : tableId,
            "colNames"    : colNames,
            "colNums"     : colNums,
            "decimals"    : decimals,
            "prevDecimals": prevDecimals,
            "htmlExclude" : ["prevDecimals"]
        });
    };

    // currently only being used by drag and drop (and undo/redo)
    // options {
    //      undoRedo: boolean, if true change html of columns
    // }
    ColManager.reorderCol = function(tableId, oldColNum, newColNum, options) {
        var $table = $("#xcTable-" + tableId);
        var table = gTables[tableId];
        var colName = table.getCol(oldColNum).getFrontColName(true);

        var progCol = table.removeCol(oldColNum);
        table.addCol(newColNum, progCol);

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
                    progCol.setBackColName(args.backName);
                } else {
                    progCol.setBackColName(progCol.func.args[0]);
                }

                table.tableCols[colNum - 1] = progCol;
                pullColHelper(colNum, tableId);
                TPrefix.updateColor(tableId, colNum);

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

    ColManager.checkColName = function($colInput, tableId, colNum) {
        var columnName = $colInput.val().trim();
        var isInvalid = false;
        var error = ErrTStr.ColumnConflict;
        var table = gTables[tableId];
        var firstrChar = columnName.charAt(0);

        $(".tooltip").hide();
        // temporarily use, will be removed when backend allow name with space
        if (xcHelper.hasInvalidCharInCol(columnName)) {
            error = ColTStr.RenameSpecialChar;
            isInvalid = true;
        } else if (columnName === "DATA") {
            error = ErrTStr.PreservedName;
            isInvalid = true;
        } else if (firstrChar >= "0" && firstrChar <= "9") {
            error = ColTStr.RenameStartNum;
            isInvalid = true;
        } else if (table.getImmediateNames().includes(columnName)) {
            error = ColTStr.ImmediateClash;
            isInvalid = true;
        } else {
            var numCols = table.getNumCols();
            for (var curColNum = 1; curColNum <= numCols; curColNum++) {
                if (colNum != null && colNum === curColNum) {
                    continue;
                }

                var progCol = table.getCol(curColNum);
                // check both backend name and front name
                if (progCol.getFrontColName() === columnName ||
                    (!progCol.isDATACol() &&
                     progCol.getBackColName() === columnName))
                {
                    error = ErrTStr.ColumnConflict;
                    isInvalid = true;
                    break;
                }
            }
        }

        if (isInvalid) {
            var $toolTipTarget = $colInput.parent();
            xcTooltip.transient($toolTipTarget, {
                "title"   : error,
                "template": xcTooltip.Template.Error
            });

            $colInput.click(hideTooltip);

            var timeout = setTimeout(function() {
                hideTooltip();
            }, 5000);
        }

        function hideTooltip() {
            $toolTipTarget.tooltip('destroy');
            $colInput.off('click', hideTooltip);
            clearTimeout(timeout);
        }

        return isInvalid;
    };

    ColManager.dupCol = function(colNum, tableId) {
        var table = gTables[tableId];

        var oldCol = table.getCol(colNum);
        var oldName = oldCol.getFrontColName(true);
        var prefix = oldCol.getPrefix();
        // need to pass in prefix to check
        var newName = xcHelper.getUniqColName(tableId, oldName);

        var progCol = ColManager.newCol(oldCol);
        var cellWidth = xcHelper.getDefaultColWidth(newName, prefix);

        progCol.setFrontColName(newName);
        progCol.setWidth(cellWidth);

        var newColNum = addColHelper(colNum, tableId, progCol, {
            "direction": ColDir.Right
        });

        pullColHelper(newColNum, tableId);
        TblManager.updateHeaderAndListInfo(tableId);

        SQL.add("Duplicate Column", {
            "operation" : SQLOps.DupCol,
            "tableName" : table.getName(),
            "tableId"   : tableId,
            "colName"   : oldName,
            "newColName": newName,
            "colNum"    : colNum
        });
    };

    ColManager.delDupCols = function(colNum, tableId) {
        // col Name will change after delete the col
        var table = gTables[tableId];
        var $tableWrap = $('#xcTableWrap-' + tableId);
        var tableWidth = $tableWrap.width();
        var colName = table.getCol(colNum).getFrontColName(true);
        var colInfo = delDupColHelper(colNum, tableId);
        var colWidths = colInfo.colWidths;
        var colNums = colInfo.colNums;
        var progCols = colInfo.progCols;

        if (gMinModeOn) {
            TblManager.updateHeaderAndListInfo(tableId);
        } else {
            moveTableTitlesAnimated(tableId, tableWidth, colWidths, 200);
            setTimeout(function() {
                TblManager.updateHeaderAndListInfo(tableId);
            }, 200);
        }

        SQL.add("Delete Duplicate Columns", {
            "operation"  : SQLOps.DelDupCol,
            "tableName"  : table.getName(),
            "tableId"    : tableId,
            "colNum"     : colNum,
            "colName"    : colName,
            "colNums"    : colNums,
            "progCols"   : progCols,
            "htmlExclude": ["progCols"]
        });
    };

    ColManager.delAllDupCols = function(tableId) {
        var table = gTables[tableId];
        var numCols = table.getNumCols();
        var $table = $('#xcTable-' + tableId);
        var removedCols = [];
        var removedColNums = [];

        var dupMap = {};
        var colNumsToDel = [];
        for (var col = 1; col <= numCols; col++) {
            var progCol = table.getCol(col);

            if (progCol.isDATACol() || progCol.isEmptyCol()) {
                continue;
            }

            var backName = progCol.getBackColName();
            if (dupMap.hasOwnProperty(backName)) {
                colNumsToDel.push(col);
                removedColNums.push(col - 1);
                removedCols.push(progCol);
            } else {
                dupMap[backName] = true;
            }
        }

        // table.remveCol will change colNum, so remove from end to start
        colNumsToDel.reverse().forEach(function(colNum) {
            table.removeCol(colNum);
            $table.find('th.col' + colNum).remove();
        });

        pullRowsBulkHelper(tableId);

        SQL.add("Delete All Duplicate Columns", {
            "operation"  : SQLOps.DelAllDupCols,
            "tableName"  : table.getName(),
            "tableId"    : tableId,
            "colNums"    : removedColNums,
            "progCols"   : removedCols,
            "htmlExclude": ["progCols"]
        });
    };

    ColManager.hideCols = function(colNums, tableId) {
        // for multiple columns
        var deferred = jQuery.Deferred();
        var $table = $("#xcTable-" + tableId);
        var table = gTables[tableId];
        var colNames = [];
        var widthDiff = 0;
        var tableWidth = $table.width();
        var promises = [];
        var animOpt = {"width": gHiddenColumnWidth};

        colNums.forEach(function(colNum) {
            var progCol = table.getCol(colNum);

            var $th = $table.find("th.col" + colNum);
            var originalColWidth = $th.outerWidth();
            var columnName = progCol.getFrontColName();

            widthDiff += (originalColWidth - gHiddenColumnWidth);
            progCol.hide();
            colNames.push(columnName);
            // change tooltip to show name
            xcTooltip.changeText($th.find(".dropdownBox"), columnName);

            var $cells = $table.find("th.col" + colNum + ",td.col" + colNum);
            if (!gMinModeOn) {
                var innerDeferred = jQuery.Deferred();

                $cells.addClass("animating");
                $th.animate(animOpt, 250, "linear", function() {
                    $cells.removeClass("animating");
                    $cells.addClass("userHidden");
                    innerDeferred.resolve();
                });

                promises.push(innerDeferred.promise());
            } else {
                $th.outerWidth(gHiddenColumnWidth);
                $cells.addClass("userHidden");
            }
        });

        if (!gMinModeOn) {
            moveTableTitlesAnimated(tableId, tableWidth, widthDiff, 250);
        }

        xcHelper.removeSelectionRange();

        PromiseHelper.when.apply(window, promises)
        .done(function() {
            matchHeaderSizes($table);
            SQL.add("Hide Columns", {
                "operation": SQLOps.HideCols,
                "tableName": table.getName(),
                "tableId"  : tableId,
                "colNames" : colNames,
                "colNums"  : colNums
            });

            deferred.resolve();
        });

        return deferred.promise();
    };

    ColManager.unhideCols = function(colNums, tableId, noAnim) {
        var deferred = jQuery.Deferred();
        var $table = $("#xcTable-" + tableId);
        var tableWidth = $table.width();
        var table = gTables[tableId];
        var widthDiff = 0;
        var colNames = [];
        var promises = [];

        colNums.forEach(function(colNum) {
            var progCol = table.getCol(colNum);
            var originalColWidth = progCol.getWidth();

            widthDiff += (originalColWidth - gHiddenColumnWidth);
            progCol.unhide();
            colNames.push(progCol.getFrontColName());

            var $th = $table.find(".th.col" + colNum);
            var $cell = $table.find("th.col" + colNum + ",td.col" + colNum);

            if (!gMinModeOn && !noAnim) {
                var innerDeferred = jQuery.Deferred();
                var animOpt = {"width": originalColWidth};

                $cell.addClass("animating");
                $th.animate(animOpt, 250, "linear", function() {
                    $cell.removeClass('animating');
                    innerDeferred.resolve();
                });

                promises.push(innerDeferred.promise());
            } else {
                $th.css("width", originalColWidth);
            }

            $cell.removeClass("userHidden");

            // change tooltip to show column options
            xcTooltip.changeText($th.find(".dropdownBox"),
                                TooltipTStr.ViewColumnOptions);
        });

        if (!gMinModeOn && !noAnim) {
            moveTableTitlesAnimated(tableId, tableWidth, -widthDiff);
        }

        PromiseHelper.when.apply(window, promises)
        .done(function() {
            matchHeaderSizes($table);
            SQL.add("Unhide Columns", {
                "operation": SQLOps.UnHideCols,
                "tableName": table.getName(),
                "tableId"  : tableId,
                "colNames" : colNames,
                "colNums"  : colNums
            });

            deferred.resolve();
        });

        return deferred.promise();
    };

    ColManager.textAlign = function(colNums, tableId, alignment) {
        var cachedAlignment = alignment;
        if (alignment.indexOf("leftAlign") > -1) {
            alignment = ColTextAlign.Left;
        } else if (alignment.indexOf("rightAlign") > -1) {
            alignment = ColTextAlign.Right;
        } else if (alignment.indexOf("centerAlign") > -1) {
            alignment = ColTextAlign.Center;
        } else {
            alignment = ColTextAlign.Wrap;
        }
        var table = gTables[tableId];
        var $table = $("#xcTable-" + tableId);
        var colNames = [];
        var prevAlignments = [];

        for (var i = 0, numCols = colNums.length; i < numCols; i++) {
            var colNum = colNums[i];
            var progCol = table.getCol(colNum);
            prevAlignments.push(progCol.getTextAlign());
            colNames.push(progCol.getFrontColName());
            var $tds = $table.find("td.col" + colNum);

            for (var key in ColTextAlign) {
                $tds.removeClass("textAlign" + ColTextAlign[key]);
            }

            $tds.addClass("textAlign" + alignment);
            progCol.setTextAlign(alignment);
        }

        SQL.add("Text Align", {
            "operation"      : SQLOps.TextAlign,
            "tableName"      : table.getName(),
            "tableId"        : tableId,
            "colNames"       : colNames,
            "colNums"        : colNums,
            "alignment"      : alignment,
            "prevAlignments" : prevAlignments,
            "cachedAlignment": cachedAlignment,
            "htmlExclude"    : ["prevAlignments", "cachedAlignment"]
        });
    };

    // jsonData is an array of stringified json with each array item
    // representing a row
    ColManager.pullAllCols = function(startIndex, jsonData, tableId,
                                        direction, rowToPrependTo)
    {
        var table = gTables[tableId];
        var tableCols = table.tableCols;
        var numCols = table.getNumCols();
        var indexedColNums = [];
        var nestedVals = [];
        if (typeof jsonData !== "object" || !(jsonData instanceof Array)) {
            jsonData = [""];
        }

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
                if (backColName === table.getKeyName()) {
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

        for (var colNum = 1; colNum <= numCols; colNum++) {
            styleColHeadHelper(colNum, tableId);
        }

        return $tBody;
    };

    ColManager.unnest = function(tableId, colNum, rowNum) {
        var $table = $('#xcTable-' + tableId);
        var $jsonTd = $table.find('.row' + rowNum).find('td.col' + colNum);
        var jsonTdObj = parseRowJSON($jsonTd.find('.originalData').text());

        if (jsonTdObj == null) {
            return;
        }

        var table = gTables[tableId];
        var progCol = table.getCol(colNum);
        var isDATACol = progCol.isDATACol();
        var colNums = [];

        var pasedCols = parseUnnestTd(table, progCol, jsonTdObj);
        var numKeys = pasedCols.length;

        if (numKeys === 0) {
            return;
        }

        var ths = "";
        pasedCols.forEach(function(parsedCol, index) {
            var colName = xcHelper.parsePrefixColName(parsedCol.colName).name;
            var backColName = parsedCol.escapedColName;
            var newProgCol = ColManager.newPullCol(colName, backColName);
            var newColNum = isDATACol ? colNum + index : colNum + index + 1;

            table.addCol(newColNum, newProgCol);
            ths += TblManager.getColHeadHTML(newColNum, tableId);
            colNums.push(newColNum);
        });

        var $colToUnnest = $table.find('.th.col' + colNum);
        if (isDATACol) {
            $colToUnnest.before(ths);
        } else {
            $colToUnnest.after(ths);
        }
        pullRowsBulkHelper(tableId);

        SQL.add("Pull All Columns", {
            "operation": SQLOps.PullAllCols,
            "tableName": table.getName(),
            "tableId"  : tableId,
            "colNum"   : colNum,
            "colNums"  : colNums,
            "rowNum"   : rowNum
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
        } else if (tdValue === null) {
            knf = true;
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
        var decimal = progCol.getDecimal();
        var format = progCol.getFormat();

        if (!knf && tdValue != null && (decimal > -1 ||
            format !== ColFormat.Default))
        {
            formatVal = formatColumnCell(parsedVal, format, decimal);
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
        if (!progCol.isKnownType() && progCol.isNumberCol()) {
            adjustedColType = "number";
        }
        adjustedColType = xcHelper.capitalize(adjustedColType);
        $header.find(".iconHelper").attr("title", adjustedColType);

        if (progCol.hasHidden()) {
            $table.find("td.col" + colNum).addClass("userHidden");
        }
        if (progCol.isChildOfArray()) {
            $header.addClass("childOfArray");
        }
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
            var tdValue = parseRowJSON(jsonStr) || "";
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

        if (options.direction !== ColDir.Left) {
            newColNum += 1;
        }

        if (isNewCol) {
            select = true;
        }

        if (select) {
            columnClass += " selectedCell";
            $(".selectedCell").removeClass("selectedCell");
        }

        table.addCol(newColNum, progCol);

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
            TblManager.updateHeaderAndListInfo(tableId);
            moveFirstColumn();
        } else {
            $th.width(10);
            if (!isHidden) {
                columnClass += " animating";
                $th.animate({width: width}, 300, function() {
                    TblManager.updateHeaderAndListInfo(tableId);
                    $table.find('.col' + newColNum).removeClass('animating');
                });
                moveTableTitlesAnimated(tableId, $tableWrap.width(),
                                    10 - width, 300);
            } else {
                TblManager.updateHeaderAndListInfo(tableId);
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

    //  returns {
    //    colWidths: colWidths,
    //    colNums  : colNums,
    //    progCols : progCols
    //  };
    function delDupColHelper(colNum, tableId) {
        var table = gTables[tableId];
        var backName = table.getCol(colNum).getBackColName();

        var colWidths = 0;
        var colNums = [];
        var progCols = [];

        // because del col with anim will dealy the col num change,
        // and del col with no anim change col num immediates
        // so remove from end to start
        var numCols = table.getNumCols();
        for (var delColNum = numCols; delColNum >= 1; delColNum--) {
            if (delColNum === colNum) {
                continue;
            }

            var progCol = table.getCol(delColNum);
            if (progCol.getBackColName() === backName) {
                delColAndAdjustLoop(delColNum, progCol);
            }
        }

        function delColAndAdjustLoop(curColNum, col) {
            colWidths += progCol.getDisplayWidth();
            // progCols and colNums short have asc order for undo/redo
            progCols.unshift(col);
            colNums.unshift(curColNum - 1);
            delColHelper(curColNum, tableId);
        }

        return {
            "colWidths": colWidths,
            "colNums"  : colNums,
            "progCols" : progCols
        };
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

    // parse json string of a table row
    function parseRowJSON(jsonStr) {
        if (!jsonStr) {
            return "";
        }

        var value;

        try {
            value = jQuery.parseJSON(jsonStr);
        } catch (err) {
            // XXX may need extra handlers to handle the error
            console.error(err, jsonStr);
            value = null;
        }

        return value;
    }
    // End Of Help Functon for pullAllCols and pullCOlHelper

    function parseUnnestTd(table, progCol, jsonTd) {
        var parsedCols = [];
        var isArray = (progCol.getType() === ColumnType.array);

        for (var tdKey in jsonTd) {
            var colName = tdKey;
            // var escapedColName = xcHelper.escapeColName(tdKey);
            var escapedColName = tdKey;

            if (!progCol.isDATACol()) {
                var openSymbol = isArray ? "[" : ".";
                var closingSymbol = isArray ? "]" : "";
                var unnestColName = progCol.getBackColName();

                // colName = unnestColName.replace(/\\./g, ".") +
                //           openSymbol + tdKey + closingSymbol;
                colName = unnestColName + openSymbol +
                            colName + closingSymbol;
                escapedColName = unnestColName + openSymbol +
                                escapedColName + closingSymbol;
            }

            if (!table.hasColWithBackName(escapedColName)) {
                parsedCols.push({
                    "colName"       : colName,
                    "escapedColName": escapedColName
                });
            }
        }

        return parsedCols;
    }

    function pullRowsBulkHelper(tableId) {
        var $table = $("#xcTable-" + tableId);
        // will change colNum in the follwing, so should
        // get datColNum here
        var dataColNum = xcHelper.parseColNum($table.find("th.dataCol"));
        $table.find("th").each(function(newColNum) {
            var $th = $(this);
            if (!$th.hasClass("rowNumHead")) {
                var colNum = xcHelper.parseColNum($th);
                $th.removeClass("col" + colNum).addClass("col" + newColNum);
                $th.find(".col" + colNum).removeClass("col" + colNum)
                                            .addClass("col" + newColNum);
            }
        });

        var $tbody = $table.find("tbody");
        var rowNum = xcHelper.parseRowNum($tbody.find("tr:eq(0)"));
        var jsonData = [];
        $tbody.find(".col" + dataColNum).each(function() {
            jsonData.push($(this).find(".originalData").text());
        });
        $tbody.empty(); // remove tbody contents for pullrowsbulk

        TblManager.pullRowsBulk(tableId, jsonData, rowNum, RowDirection.Bottom);
        TblManager.updateHeaderAndListInfo(tableId);
        moveFirstColumn();
    }

    function delColHelper(colNum, tableId, multipleCols, colId, noAnim) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var numCols = table.getNumCols();
        var $tableWrap = $("#xcTableWrap-" + tableId);

        // temporarily no animation when deleting multiple duplicate cols
        if (gMinModeOn || noAnim) {
            $tableWrap.find(".col" + colNum).remove();
            if (!multipleCols) {
                table.removeCol(colNum);

                for (var i = colNum + 1; i <= numCols; i++) {
                    $tableWrap.find(".col" + i)
                              .removeClass("col" + i)
                              .addClass("col" + (i - 1));
                }

                var $table = $('#xcTable-' + tableId);
                matchHeaderSizes($table);
            } else {
                table.removeCol(colId);
            }

            deferred.resolve();
            return (deferred.promise());
        }
        $tableWrap.find('.col' + colNum).addClass('animating');
        $tableWrap.find("th.col" + colNum).animate({width: 0}, 200, function() {
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
            table.removeCol(colNum);
        } else {
            table.removeCol(colId);
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

    function updateFormatAndDecimal(tableId, colNum) {
        var $table = $("#xcTable-" + tableId);
        var progCol = gTables[tableId].getCol(colNum);
        var format = progCol.getFormat();
        var decimal = progCol.getDecimal();

        $table.find("td.col" + colNum).each(function() {
            var $td = $(this);
            var oldVal = $td.find(".originalData").text();
            if (oldVal != null) {
                // not knf
                var newVal = formatColumnCell(oldVal, format, decimal);
                $td.children(".displayedData").text(newVal);
            }
        });
    }

    /*
    *@property {string} val: Text that would be in a table td
    *@property {string} format: "percent" or null which defaults to decimal rounding
    *@property {integer} decimal: Number of decimal places to show, -1 for default
    */
    function formatColumnCell(val, format, decimal) {
        var cachedVal = val;
        val = parseFloat(val);

        if (isNaN(val)) {
            return cachedVal;
        }

        // round it first
        var pow;
        if (decimal > -1) {
            // when no roundToFixed, only percent
            pow = Math.pow(10, decimal);
            val = Math.round(val * pow) / pow;
        }

        switch (format) {
            case ColFormat.Percent:
                // there is a case that 2009.877 * 100 =  200987.69999999998
                // so must round it
                var newVal = val * 100;
                var decimalPartLen;

                if (decimal === -1) {
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
                    decimalPartLen = Math.max(0, decimal - 2);
                    pow = Math.pow(10, decimalPartLen);
                }

                newVal = Math.round(newVal * pow) / pow;

                if (decimal > -1) {
                    // when has roundToFixed, need to fix the decimal digits
                    newVal = newVal.toFixed(decimalPartLen);
                }
                return newVal + "%";
            default:
                if (decimal > -1) {
                    val = val.toFixed(decimal);
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
