// this module support column related functions
window.ColManager = (function($, ColManager) {
    // new ProgCol obj
    ColManager.newCol = function(options) {
        var progCol = new ProgCol(options);
        return (progCol);
    };

    // special case, specifically for DATA col
    ColManager.newDATACol = function(index) {
        var width;
        var winWidth = $(window).width();
        if (winWidth > 1400) {
            width = 700;
        } else if (winWidth > 1100) {
            width = 600;
        } else {
            width = 500;
        }
        var progCol = ColManager.newCol({
            "index"  : index,
            "name"   : "DATA",
            "type"   : "object",
            "width"  : width,    // copy from CSS
            "userStr": "DATA = raw()",
            "func"   : {
                "func": "raw",
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
            "index"  : 1,
            "name"   : keyName,
            "width"  : gNewCellWidth,
            "userStr": '"' + keyName + '" = pull(' + keyName + ')',
            "func"   : {
                "func": "pull",
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
                "index"   : newColid,
                "name"    : name,
                "width"   : width,
                "userStr" : '"' + name + '" = ',
                "isNewCol": isNewCol,
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

        var $th = $(generateColumnHeadHTML(columnClass, color, newColid, options));
        $tableWrap.find('.th.col' + (newColid - 1)).after($th);

        if (isNewCol) {
            $th.find(".flexContainer").mousedown()
                .find(".editableHead").focus();
        }

        if (gMinModeOn || noAnimate) {
            updateTableHeader(tableId);
            RightSideBar.updateTableInfo(tableId);
            $table.find('.rowGrab').width($table.width());
        } else {
            // var $th = $tableWrap.find('.th.col' + newColid);
            $th.width(10);
            if (!isHidden) {
                $th.animate({width: width}, 300, function() {
                        updateTableHeader(tableId);
                        RightSideBar.updateTableInfo(tableId);
                        matchHeaderSizes($table);
                    });
                moveTableTitlesAnimated(tableId, $tableWrap.width(),
                                    10 - width, 300);
            } else {
                updateTableHeader(tableId);
                RightSideBar.updateTableInfo(tableId);
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
                          ' col' + newColid + '">' +
                            '&nbsp;' +
                          '</td>';

        var i = startingIndex;
        while (i <= endingIndex) {
            $table.find(".row" + i + " .col" + (newColid - 1))
                  .after(newCellHTML);
            i++;
        }

        if (inFocus) {
            $table.find('tr:first .editableHead.col' + newColid).focus();
        }
    };

    ColManager.delCol = function(colNums, tableId) {
        // deletes an array of columns
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

        for (var i = 0; i < numCols; i++) {
            colNum = colNums[i];
            colIndex = colNum - i;
            var col = table.tableCols[colIndex - 1];
            colNames.push(col.name);
            if (col.isHidden) {
                colWidths += 15;
            } else {
                colWidths += table.tableCols[colIndex - 1].width;
            }
            promises.push(delColHelper(colNum, colNum, tableId, true, colIndex));
        }

        moveTableTitlesAnimated(tableId, tableWidth, colWidths, 200);

        jQuery.when.apply($, promises).done(function() {
            var numAllCols = table.tableCols.length;
            updateTableHeader(tableId);
            RightSideBar.updateTableInfo(tableId);
            for (var j = colNums[0]; j <= numAllCols; j++) {
                var oldColNum = xcHelper.parseColNum($table.find('th').eq(j));
                $table.find(".col" + oldColNum)
                      .removeClass('col' + oldColNum)
                      .addClass('col' + j);
            }
                
            matchHeaderSizes($table);
            xcHelper.removeSelectionRange();
            gFnBarOrigin = undefined;
            $('#fnBar').val("").removeClass('active');

             // add SQL
            SQL.add("Delete Column", {
                "operation": SQLOps.DeleteCol,
                "tableName": tableName,
                "tableId"  : tableId,
                "colNames" : colNames,
                "colNums"  : colNums
            });
        });
    };

    // specifically used for json modal
    ColManager.pullCol = function(colNum, tableId, nameInfo, pullColOptions) {
        var deferred = jQuery.Deferred();

        pullColOptions = pullColOptions || {};

        var isDataTd = pullColOptions.isDataTd || false;
        var isArray  = pullColOptions.isArray || false;
        var noAnimate = pullColOptions.noAnimate || false;

        var $table   = $("#xcTable-" + tableId);
        var table    = gTables[tableId];
        var tableCols = table.tableCols;
        var col      = tableCols[colNum - 1];
        var fullName = nameInfo.name;
        var escapedName = nameInfo.escapedName;

        if (!isDataTd) {
            var symbol = "";
            if (!isArray) {
                symbol = ".";
            }
            escapedName = col.func.args[0] + symbol + escapedName;
            fullName = col.func.args[0] + symbol + fullName;
        }
        var usrStr = '"' + fullName + '" = pull(' + escapedName + ')';
        
        var tableName   = table.tableName;
        var siblColName = table.tableCols[colNum - 1].name;
        var newColName  = xcHelper.getUniqColName(fullName, tableCols);   
        var direction;
        if (isDataTd) {
            direction = "L";
        } else {
            direction = "R";
        }
        ColManager.addCol(colNum, tableId, newColName, {
            "direction": direction,
            "select"   : true,
            "noAnimate": noAnimate
        });

        if (direction === "R") {
            colNum++;
        }

        // now the column is different as we add a new column
        var newCol = table.tableCols[colNum - 1];
        newCol.func.func = "pull";
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
            "pullColOptions": pullColOptions
        };

        ColManager.execCol(newCol, tableId)
        .then(function() {
            updateTableHeader(tableId);
            RightSideBar.updateTableInfo(tableId);

            autosizeCol($table.find("th.col" + colNum), {
                "includeHeader" : true,
                "resizeFirstRow": true
            });

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
        function mapStrHelper(colName, colType) {
            var mapStr = "";
            switch (colType) {
                case ("boolean"):
                    mapStr += "bool(";
                    break;
                case ("float"):
                    mapStr += "float(";
                    break;
                case ("integer"):
                    mapStr += "int(";
                    break;
                case ("string"):
                    mapStr += "string(";
                    break;
                default:
                    console.warn("XXX no such operator! Will guess");
                    mapStr += colType + "(";
                    break;
            }

            mapStr += colName + ")";

            return (mapStr);
        }

        function setTableHelper(curTableName, curTableCols, curWS, srcTable, archive) {
            var innerDeferred = jQuery.Deferred();
            var curTableId = xcHelper.getTableId(curTableName);
            var srcTableId = srcTable.tableId;
            var tableProperties = {
                "bookmarks" : xcHelper.deepCopy(srcTable.bookmarks),
                "rowHeights": xcHelper.deepCopy(srcTable.rowHeights)
            };

            setgTable(curTableName, curTableCols, null, tableProperties)
            .then(function() {
                // map do not change groupby stats of the table
                Profile.copy(srcTableId, curTableId);
                WSManager.addTable(curTableId, curWS);
                if (archive) {
                    archiveTable(curTableId, ArchiveTable.Keep);
                }
            })
            .then(innerDeferred.resolve)
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }

        var deferred = jQuery.Deferred();

        var numColInfos = colTypeInfos.length;
        var table       = gTables[tableId];
        var tableName   = table.tableName;
        var tableCols   = table.tableCols;
        var currentWS   = WSManager.getActiveWS();

        var tableNamePart = tableName.split("#")[0];
        var tableNames = [];
        var fieldNames = [];
        var mapStrings = [];
        var query = "";
        var finalTable = "";
        var finalTableId;
        var msgId;
        var sqlOptions;

        getUnsortedTableName(tableName)
        .then(function(unsortedTableName) {
            var srctable = unsortedTableName;

            for (var i = 0; i < numColInfos; i++) {
                var colInfo = colTypeInfos[i];
                var col = tableCols[colInfo.colNum - 1];

                tableNames[i] = tableNamePart + Authentication.getHashId();
                // here use front col name to generate newColName
                fieldNames[i] = col.name + "_" + colInfo.type;
                mapStrings[i] = mapStrHelper(col.func.args[0], colInfo.type);

                query += 'map --eval "' + mapStrings[i] +
                        '" --srctable "' + srctable +
                        '" --fieldName "' + fieldNames[i] +
                        '" --dsttable "' + tableNames[i] + '"';

                if (i !== numColInfos - 1) {
                    query += ';';
                }

                srctable = tableNames[i];
            }

            finalTable = tableNames[numColInfos - 1];
            finalTableId = xcHelper.getTableId(finalTable);

            var msg = StatusMessageTStr.ChangeType;
            var msgObj = {
                "msg"      : msg,
                "operation": SQLOps.ChangeType
            };
            msgId = StatusMessage.addMsg(msgObj);
            xcHelper.lockTable(tableId);
            WSManager.addTable(finalTableId);

            sqlOptions = {
                "operation"   : SQLOps.ChangeType,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "newTableName": finalTable,
                "colTypeInfos": colTypeInfos
            };
            var queryName = xcHelper.randName("changeType");

            return (XcalarQueryWithCheck(queryName, query));
        })
        .then(function() {
            var mapOptions = { "replaceColumn": true };
            var curTableCols = tableCols;
            var promises = [];

            for (var j = 0; j < numColInfos; j++) {
                var curColNum = colTypeInfos[j].colNum;
                var curTable  = tableNames[j];
                var archive   = (j === numColInfos - 1) ? false : true;

                curTableCols = xcHelper.mapColGenerate(curColNum, fieldNames[j],
                                    mapStrings[j], curTableCols, mapOptions);
                promises.push(setTableHelper.bind(this, curTable, curTableCols,
                                                  currentWS, table, archive));
            }

            return (chain(promises));
        })
        .then(function() {
            return (refreshTable(finalTable, tableName));
        })
        .then(function() {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, finalTableId);

            SQL.add("Change Data Type", sqlOptions, query);
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);
            WSManager.removeTable(finalTableId);

            Alert.error("Change Data Type Fails", error);
            StatusMessage.fail(StatusMessageTStr.ChangeTypeFailed, msgId);
            SQL.errorLog("Change Data Type", sqlOptions, query, error);
            deferred.reject(error);
        });

        return (deferred.promise());

    };

    ColManager.splitCol = function(colNum, tableId, delimiter, numColToGet, isAlertOn) {
        // isAlertOn is a flag to alert too many column will generate
        // when do replay, this flag is null, so no alert
        // since we assume user want to replay it.
        var deferred = jQuery.Deferred();
        var cancelError = "cancel splitCol";

        var currentWS   = WSManager.getActiveWS();
        var table       = gTables[tableId];
        var tableName   = table.tableName;
        var tableCols   = table.tableCols;
        var numCols     = tableCols.length;
        var colName     = tableCols[colNum - 1].name;
        var backColName = tableCols[colNum - 1].func.args[0];
        var colNumTracker = colNum;

        var msg = StatusMessageTStr.SplitColumn;
        var msgObj = {
            "msg"      : msg,
            "operation": SQLOps.SplitCol
        };
        var msgId;
        var tableNamePart = tableName.split("#")[0];
        var newTableNames = [];
        var newFieldNames = [];

        xcHelper.lockTable(tableId);

        getSplitNumHelper()
        .then(function(colToSplit) {
            // Note: add msg here because user may cancel it
            // and that case should not show success message
            msgId = StatusMessage.addMsg(msgObj);
            numColToGet = colToSplit;

            var i;
            for (i = numColToGet; i >= 1; i--) {
                newTableNames[i] = tableNamePart + Authentication.getHashId();
            }

            // this makes it easy to get previous table name
            // when index === numColToGet
            newTableNames[numColToGet + 1] = tableName;

            // Check duplication
            var tryCount  = 0;
            var colPrefix = colName + "-split";
            var isDup;

            i = numColToGet;
            while (i > 0 && tryCount <= 50) {
                isDup = false;
                ++tryCount;

                for (i = numColToGet; i >= 1; i--) {
                    newFieldNames[i] = colPrefix + "-" + i;

                    for (var j = 0; j < numCols; j++) {
                        if (tableCols[j].func.args) {
                            if (newFieldNames[i] === tableCols[j].func.args[0]) {
                                isDup = true;
                                break;
                            }
                        }
                    }

                    if (isDup) {
                        newFieldNames = [];
                        colPrefix = colName + "-split-" + tryCount;
                        break;
                    }
                }
            }

            if (tryCount > 50) {
                console.warn("Too much try, overwrite origin col name!");
                for (i = numColToGet; i >= 1; i--) {
                    newFieldNames[i] = colName + "-split" + i;
                }
            }

            var promises = [];
            for (i = 1; i <= numColToGet; i++) {
                promises.push(splitColHelper.bind(this, i, newTableNames[(numColToGet + 2) - i],
                                                    newTableNames[(numColToGet+ 1) - i]));
            }
            
            return (chain(promises));
        })
        .then(function(newTableId) {
            xcHelper.unlockTable(tableId, true);
            StatusMessage.success(msgId, false, newTableId);

            SQL.add("Split Column", {
                "operation"   : SQLOps.SplitCol,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "newTableName": newTableNames[1],
                "colNum"      : colNum,
                "delimiter"   : delimiter,
                "numColToGet" : numColToGet
            });

            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            if (error === cancelError) {
                deferred.resolve();
            } else {
                Alert.error("Split Column fails", error);
                if (msgId != null) {
                    StatusMessage.fail(StatusMessageTStr.SplitColumnFailed, msgId);   
                }

                deferred.reject(error);
            }

        });

        return (deferred.promise());

        function splitColHelper(index, curTableName, newTableName) {
            var innerDeferred = jQuery.Deferred();

            var mapString  = 'cut(' + backColName + ', ' + index + ', "' +
                            delimiter + '")';
            var fieldName  = newFieldNames[index];
            var newTableId = xcHelper.getTableId(newTableName);
            var sqlOptions =  {
                "operation"   : SQLOps.SplitColMap,
                "action"      : "map",
                "tableName"   : curTableName,
                "newTableName": newTableName,
                "fieldName"   : fieldName,
                "mapString"   : mapString
            };

            WSManager.addTable(newTableId, currentWS);

            XcalarMap(fieldName, mapString, curTableName, newTableName, sqlOptions)
            .then(function() {
                var mapOptions   = { "isOnRight": true };
                var curTableId   = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;
                var newTablCols  = xcHelper.mapColGenerate(++colNum,
                                        fieldName, mapString, curTableCols,
                                        mapOptions);
                var tableProperties = {
                    "bookmarks" : xcHelper.deepCopy(table.bookmarks),
                    "rowHeights": xcHelper.deepCopy(table.rowHeights)
                };

                // map do not change groupby stats of the table
                Profile.copy(curTableId, newTableId);

                return (setgTable(newTableName, newTablCols, null, tableProperties));
            })
            .then(function() {
                var refreshOptions = {};
                if (index < numColToGet) {
                    refreshOptions = { "lockTable": true };
                }
                return (refreshTable(newTableName, curTableName, refreshOptions));
            })
            .then(function() {
                innerDeferred.resolve(newTableId);
            })
            .fail(function(error) {
                WSManager.removeTable(newTableId);
                innerDeferred.reject(error);
            });

            return (innerDeferred.promise());
        }

        function getSplitNumHelper() {
            var innerDeferred = jQuery.Deferred();

            if (numColToGet != null) {
                alertHelper(numColToGet, innerDeferred);
                return (innerDeferred.promise());
            }

            var mapString    = 'countChar(' + backColName + ', "' +
                                delimiter + '")';
            var fieldName    = xcHelper.randName("mappedCol");
            var curTableName = tableName;
            var newTableName = xcHelper.randName(".tempMap") + "." + curTableName;
            var sqlOptions   =  {
                "operation"   : SQLOps.SplitColMap,
                "action"      : "map",
                "tableName"   : curTableName,
                "newTableName": newTableName,
                "fieldName"   : fieldName,
                "mapString"   : mapString
            };

            XcalarMap(fieldName, mapString, curTableName, newTableName, sqlOptions)
            .then(function() {
                var op = AggrOp.MaxInteger;
                sqlOptions = {
                    "operation": SQLOps.SplitColMap,
                    "action"   : "aggregate",
                    "tableName": newTableName,
                    "colName"  : fieldName,
                    "aggrOp"   : op
                };

                return XcalarAggregate(fieldName, newTableName, op, sqlOptions);
            })
            .then(function(value) {
                try {
                    var val = JSON.parse(value);
                    // Note that the splitColNum should be charCountNum + 1
                    alertHelper(val.Value + 1, innerDeferred);
                } catch (error) {
                    innerDeferred.reject(error);
                }
            })
            .fail(function(error) {
                innerDeferred.reject(error);
            });

            return (innerDeferred.promise());
        }

        function alertHelper(res, curDeferred) {
            if (isAlertOn && res > 15) {
                var text = "About " + res + " columns will be generated, " +
                            "do you still want to continue the operation?";
                Alert.show({
                    "title"     : "Many Columns will generate",
                    "msg"       : text,
                    "isCheckBox": false,
                    "confirm"   : function () {
                        curDeferred.resolve(res);
                    },
                    "cancel": function() {
                        curDeferred.reject(cancelError);
                    }
                });
            } else {
                curDeferred.resolve(res);
            }
        }
    };

    ColManager.renameCol = function(colNum, tableId, newName) {
        var table   = gTables[tableId];
        var $table  = $("#xcTable-" + tableId);
        var curCol  = table.tableCols[colNum - 1];
        var oldName = curCol.name;

        curCol.name = newName;
        $table.find('.editableHead.col' + colNum).val(newName)
                                                .attr("value", newName)
                                                .prop("readonly", true);

        // adjust rightsidebar column name
        $('#activeTablesList').find('.tableInfo[data-id=' + tableId + ']')
                              .find('.column').eq(colNum - 1)
                              .text(newName);

        SQL.add("Rename Column", {
            "operation": SQLOps.RenameCol,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colName"  : oldName,
            "colNum"   : colNum,
            "newName"  : newName
        });

        commitToStorage();
    };

    ColManager.format = function(colNum, tableId, format) {
        var table = gTables[tableId];
        var tableCol = table.tableCols[colNum - 1];
        var oldFormat = tableCol.format;
        var decimals = tableCol.decimals;

        if (format === "default") {
            format = null;
        }

        if (oldFormat === format) {
            return;
        }

        $('#xcTableWrap-' + tableId).find('td.col' + colNum).each(function() {
            var $td = $(this);
            var oldVal = $td.data("val");
            if (oldVal != null) {
                // not knf
                var newVal = formatColumnCell(oldVal, format, decimals);
                $td.children(".addedBarTextWrap").text(newVal);
            }
        });

        tableCol.format = format;

        SQL.add("Change Format", {
            "operation": SQLOps.ChangeFormat,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colName"  : tableCol.name,
            "colNum"   : colNum,
            "format"   : format
        });
    };

    ColManager.roundToFixed = function(colNum, tableId, decimals) {
        var table = gTables[tableId];
        var tableCol = table.tableCols[colNum - 1];
        var format = tableCol.format;

        $('#xcTableWrap-' + tableId).find('td.col' + colNum).each(function() {
            var $td = $(this);
            var oldVal = $td.data("val");
            if (oldVal != null) {
                // not knf
                var newVal = formatColumnCell(oldVal, format, decimals);
                $td.children(".addedBarTextWrap").text(newVal);
            }
        });
        tableCol.decimals = decimals;

        SQL.add("Round To Fixed", {
            "operation": SQLOps.RoundToFixed,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colName"  : tableCol.name,
            "colNum"   : colNum,
            "decimals" : decimals
        });
    };

    ColManager.reorderCol = function(tableId, oldColNum, newColNum) {
        var oldIndex = oldColNum - 1;
        var newIndex = newColNum - 1;
        var $table   = $("#xcTable-" + tableId);
        var table    = gTables[tableId];
        var colName  = table.tableCols[oldIndex].name;

        var progCol = removeColHelper(oldIndex, tableId);

        insertColHelper(newIndex, tableId, progCol);
        progCol.index = newIndex + 1;

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

        $table.find('.colNumToChange')
            .addClass('col' + newColNum)
            .removeClass('colNumToChange');

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

    ColManager.execCol = function(progCol, tableId, args) {
        var deferred = jQuery.Deferred();
        var userStr;
        var regex;
        var matches;
        var fieldName;

        switch (progCol.func.func) {
            case ("pull"):
                if (!parsePullColArgs(progCol)) {
                    console.error("Arg parsing failed");
                    deferred.reject("Arg parsing failed");
                    break;
                }

                var startIndex;
                var numberOfRows;

                if (args) {
                    if (args.index) {
                        progCol.index = args.index;
                    }
                    if (args.startIndex) {
                        startIndex = args.startIndex;
                    }
                    if (args.numberOfRows) {
                        numberOfRows = args.numberOfRows;
                    }
                }
                if (progCol.isNewCol) {
                    progCol.isNewCol = false;
                }

                pullColHelper(progCol.func.args[0], progCol.index,
                              tableId, startIndex, numberOfRows);

                deferred.resolve();
                break;
            case ("raw"):
                console.log("Raw data");
                deferred.resolve();
                break;
            case ("map"):
                userStr = progCol.userStr;
                regex = new RegExp(' *" *(.*) *" *= *map *[(] *(.*) *[)]',
                                       "g");
                matches = regex.exec(userStr);
                var mapString = matches[2];
                fieldName = matches[1];

                progCol.func.func = "pull";
                progCol.func.args[0] = fieldName;
                progCol.func.args.splice(1, progCol.func.args.length - 1);
                progCol.isNewCol = false;
                // progCol.userStr = '"' + progCol.name + '"' + " = pull(" +
                //                   fieldName + ")";
                var options = {replaceColumn: true};
                xcFunction.map(progCol.index, tableId, fieldName,
                                mapString, options)
                .then(deferred.resolve)
                .fail(function(error) {
                    console.error("execCol fails!", error);
                    deferred.reject(error);
                });
                break;
            case ("filter"):
                userStr = progCol.userStr;
                regex = new RegExp(' *" *(.*) *" *= *filter *[(] *(.*) *[)]',
                                   "g");
                matches = regex.exec(userStr);
                var fltString = matches[2];
                fieldName = matches[1];

                progCol.func.func = "pull";
                progCol.func.args[0] = fieldName;
                progCol.func.args.splice(1, progCol.func.args.length - 1);
                progCol.isNewCol = false;
                // progCol.userStr = '"' + progCol.name + '"' + " = pull(" +
                //                   fieldName + ")";
                xcFunction.filter(progCol.index, tableId, {
                    "filterString": fltString
                })
                .then(deferred.resolve)
                .fail(function(error) {
                    console.error("execCol fails!", error);
                    deferred.reject(error);
                });
                break;
            case ("search"):
                searchColNames(args.value, args.searchBar);
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

    ColManager.checkColDup = function ($input, $inputs, tableId, parseCol,
                                       colNum) {
        // $inputs checks the names of $inputs, tableId is used to check
        // back column names. You do not need both
        var name        = $input.val().trim();
        var isDuplicate = false;
        var title       = "Name already exists, please use another name.";
        
        if (parseCol) {
            name = name.replace(/^\$/, '');
        }

        $(".tooltip").hide();
        // temporarily use, will be removed when backend allow name with space
        if (/^ | $|[,\(\)'"]/.test(name) === true) {
            title = "Invalid name, cannot contain '\"() or starting or ending " +
                    "spaces";
            isDuplicate = true;
        } else if (name === 'DATA') {
            title = "The name \'DATA\' is reserved.";
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
                    (tableCols[i].func.args && tableCols[i].func.args[0] === name))
                {
                    title = "A column is already using this name, " +
                                "please use another name.";
                    isDuplicate = true;
                    break;
                }
            }
        }
        
        if (isDuplicate) {
            var container      = $input.closest('.mainPanel').attr('id');
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

        var width    = tableCols[colNum - 1].width;
        var isNewCol = $table.find('th.col' + colNum).hasClass('unusedCell');
        var decimals = tableCols[colNum - 1].decimals;
        var format   = tableCols[colNum - 1].format;

        var name;
        if (tableCols[colNum - 1].func.args) {
            name = tableCols[colNum - 1].func.args[0];
        } else {
            name = tableCols[colNum - 1].name;
        }

        name = xcHelper.getUniqColName(name, tableCols);

        ColManager.addCol(colNum, tableId, name, {
            "width"   : width,
            "isNewCol": isNewCol,
            "isHidden": tableCols[colNum - 1].isHidden,
            "decimals": decimals,
            "format"  : format
        });
        // add sql
        SQL.add("Duplicate Column", {
            "operation" : SQLOps.DupCol,
            "tableName" : table.tableName,
            "tableId"   : tableId,
            "colName"   : tableCols[colNum - 1].name,
            "newColName": name,
            "colNum"    : colNum
        });

        tableCols[colNum].func.func = tableCols[colNum - 1].func.func;
        tableCols[colNum].func.args = tableCols[colNum - 1].func.args;
        tableCols[colNum].userStr = tableCols[colNum - 1].userStr;

        ColManager.execCol(tableCols[colNum], tableId)
        .then(function() {
            updateTableHeader(tableId);
            RightSideBar.updateTableInfo(tableId);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    ColManager.delDupCols = function(colNum, tableId) {
        // col Name will change after delete the col
        var table = gTables[tableId];
        var $tableWrap = $('#xcTableWrap-' + tableId);
        var tableWidth = $tableWrap.width();
        var colName = table.tableCols[colNum - 1].name;
        var colWidths = delDupColHelper(colNum, tableId);
        
        if (gMinModeOn) {
            matchHeaderSizes($tableWrap.find('.xcTable'));
        } else {
            moveTableTitlesAnimated(tableId, tableWidth, colWidths, 200);
            setTimeout(function() {
                matchHeaderSizes($tableWrap.find('.xcTable'));
            }, 200);
        }

        updateTableHeader(tableId);
        RightSideBar.updateTableInfo(tableId);

        SQL.add("Delete Duplicate Columns", {
            "operation": SQLOps.DelDupCol,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colNum"   : colNum,
            "colName"  : colName
        });
    };

    ColManager.delAllDupCols = function(tableId) {
        var table   = gTables[tableId];
        var columns = table.tableCols;
        var forwardCheck = true;
        var $table = $('#xcTable-' + tableId);
        for (var i = 0; i < columns.length; i++) {
            if (columns[i].func.func && columns[i].func.func === "raw") {
                continue;
            } else {
                delDupColHelper(i + 1, tableId, forwardCheck);
            }    
        }

        matchHeaderSizes($table);
        updateTableHeader(tableId);
        RightSideBar.updateTableInfo(tableId);

        SQL.add("Delete All Duplicate Columns", {
            "operation": SQLOps.DelAllDupCols,
            "tableName": table.tableName,
            "tableId"  : tableId
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

    ColManager.unhideCols = function(colNums, tableId, hideOptions) {
        var $table     = $('#xcTable-' + tableId);
        var tableWidth = $table.width();
        var table      = gTables[tableId];
        var tableCols = table.tableCols;
        var numCols    = colNums.length;
        var colNames   = [];
        var autoResize = hideOptions && hideOptions.autoResize;
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

            if (autoResize) {
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
            }
            $table.find("th.col" + colNum + ",td.col" + colNum)
                  .removeClass("userHidden");
        }

        if (autoResize) {
            if (!gMinModeOn) {
                jQuery.when.apply($, promises).done(function() {
                    matchHeaderSizes($table);
                });
                moveTableTitlesAnimated(tableId, tableWidth, -widthDiff);
            } else {
                matchHeaderSizes($table);
            }
        }

        SQL.add("Unhide Columns", {
            "operation"  : SQLOps.UnHideCols,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colNames"   : colNames,
            "colNums"    : colNums,
            "hideOptions": hideOptions
        });
    };

    ColManager.textAlign = function(colNum, tableId, alignment) {
        if (alignment.indexOf("leftAlign") > -1) {
            alignment = "Left";
        } else if (alignment.indexOf("rightAlign") > -1) {
            alignment = "Right";
        } else {
            alignment = "Center";
        }
        var table  = gTables[tableId];
        var $table = $('#xcTable-' + tableId);
        var colNums = [];
        var colNames = [];
        if (typeof colNum !== "object") {
            colNums.push(colNum);
        } else {
            colNums = colNum;
        }
        var numCols = colNums.length;
        
        for (var i = 0; i < numCols; i++) {
            var curCol = table.tableCols[colNums[i] - 1];
            $table.find('td.col' + colNums[i])
                .removeClass('textAlignLeft')
                .removeClass('textAlignRight')
                .removeClass('textAlignCenter')
                .addClass('textAlign' + alignment);
            curCol.textAlign = alignment;
            colNames.push(curCol.name);
        }

        if (numCols === 1) {
            SQL.add("Text Align", {
                "operation": "textAlign",
                "tableName": table.tableName,
                "tableId"  : tableId,
                "colName"  : colNames[0],
                "colNum"   : colNums[0],
                "alignment": alignment
            });
        } else {
            SQL.add("Text Align", {
                "operation": "textAlign",
                "tableName": table.tableName,
                "tableId"  : tableId,
                "colNames" : colNames,
                "colNums"  : colNums,
                "alignment": alignment
            });
        }
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

        startIndex = startIndex || 0;

        for (var i = 0; i < numCols; i++) {
            if ((i !== dataIndex) &&
                tableCols[i].func.args &&
                tableCols[i].func.args !== "")
            {
                var nested = parseColFuncArgs(tableCols[i].func.args[0]);
                if (tableCols[i].func.args[0] !== "" &&
                    tableCols[i].func.args[0] != null)
                {
                    if (/\\.([0-9])/.test(tableCols[i].func.args[0])) {
                        // slash followed by dot followed by number is ok
                        // fall through
                    } else if (/\.([0-9])/.test(tableCols[i].func.args[0])) {
                        // dot followed by number is invalid
                        nested = [""];
                    }
                }

                nestedVals.push(nested);
                // get the column number of the column the table was indexed on
                if (tableCols[i].func.args &&
                    (tableCols[i].func.args[0] === table.keyName)) {
                    indexedColNums.push(i);
                }
            } else { // this is the data Column
                nestedVals.push([""]);
            }

            // initial type
            if (secondPull && tableCols[i].isSortedArray) {
                columnTypes.push(null);
            } else {
                columnTypes.push(tableCols[i].type);
            }
        }
        // loop through table tr and start building html
        for (var row = 0, numRows = jsonData.length; row < numRows; row++) {
            var dataValue = parseRowJSON(jsonData[row]);
            var rowNum    = row + startIndex;

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
            for (var col = 0; col < numCols; col++) {
                var nested = nestedVals[col];
                var tdValue = dataValue;
                var childOfArray = childArrayVals[col];
                var parsedVal;
                knf = false;

                if (col !== dataIndex) {
                    if (nested == null) {
                        console.error('Error this value should not be empty');
                    } else if (nested === "") {
                        tdValue = "";
                    }

                    var nestedLength = nested.length;
                    for (var i = 0; i < nestedLength; i++) {
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
                            xcHelper.isArray(tdValue))
                        {
                            childArrayVals[col] = true;
                        }
                    }
                    
                    // if it's the index array field, pull indexed one instead
                    if (secondPull && tableCols[col].isSortedArray) {
                        var $input = $table.find('th.col' + (col + 1) +
                                          '> .header input');
                        var key = table.keyName + "_indexed";
                        $input.val(key);
                        tdValue = dataValue[key];

                        // this is a indexed column, should change the ProCol
                        // XXX this part might buggy
                        tableCols[col].name = key;
                        tableCols[col].userStr = '"' + key + '" = pull(' + key + ')';
                        tableCols[col].func.args[0] = key;
                    }

                    var tdClass = "col" + (col + 1);
                    // class for indexed col
                    if (indexedColNums.indexOf(col) > -1) {
                        tdClass += " indexedColumn";
                    }
                    // class for textAlign
                    if (tableCols[col].textAlign === "Left") {
                        tdClass += " textAlignLeft";
                    } else if (tableCols[col].textAlign === "Right") {
                        tdClass += " textAlignRight";
                    }

                    //define type of the column
                    columnTypes[col] = xcHelper.parseColType(tdValue, columnTypes[col]);
                    var originalVal = tdValue;
                    parsedVal = xcHelper.parseJsonValue(tdValue, knf);
                    if (!knf && originalVal != null) {
                        originalVal = parsedVal;
                    } else {
                        // case that should not append data-val
                        originalVal = null;
                    }
                    var formatVal = parsedVal;
                    var decimals = tableCols[col].decimals;
                    var format = tableCols[col].format;
                    if (originalVal != null && (decimals > -1 || format != null)) {
                        formatVal = formatColumnCell(parsedVal, format, decimals);
                    }

                    var dataVal = "";
                    // XXX now only allow number in case weird string mess up html
                    if (originalVal != null &&
                        (columnTypes[col] === "integer" ||
                        columnTypes[col] === "float"))
                    {
                        dataVal = 'data-val="' + originalVal + '"';
                    }
                    tBodyHTML += '<td class="' + tdClass + ' clickable" ' +
                                    dataVal + '>' +
                                    getTableCellHtml(formatVal) +
                                '</td>';
                } else {
                    // make data td;
                    tdValue = jsonData[row];
                    //define type of the column
                    columnTypes[col] = xcHelper.parseColType(tdValue, columnTypes[col]);
                    parsedVal = xcHelper.parseJsonValue(tdValue);
                    tBodyHTML +=
                        '<td class="col' + (col + 1) + ' jsonElement">' +
                            '<div class="elementText" data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="double-click to view">' +
                                    parsedVal +
                            '</div>' +
                        '</td>';
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

        for (var i = 0; i < numCols; i++) {
            var $currentTh = $table.find('th.col' + (i + 1));
            var $header    = $currentTh.find('> .header');
            var columnType = columnTypes[i] || "undefined";

            // DATA column is type-object
            if (tableCols[i].name === "DATA") {
                columnType = "object";
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
            var adjustedColType = columnType;
            if (columnType === "integer" || columnType === "float") {
                adjustedColType = "number";
            }
            $header.find('.iconHelper').attr('title', adjustedColType);

            if (tableCols[i].name === "recordNum") {
                $header.addClass('recordNum');
            }
            
            if (tableCols[i].isHidden) {
                $table.find('td.col' + (i + 1)).addClass('userHidden');
            }
            if (childArrayVals[i]) {
                $header.addClass('childOfArray');
            }
            if ($currentTh.hasClass('selectedCell') ||
                $currentTh.hasClass('modalHighlighted')) {
                highlightColumn($currentTh);
            }
        }

        return ($tBody);
    };

    function pullColHelper(key, newColid, tableId, startIndex, numberOfRows) {
        if (key !== "" & key != null) {
            if (/\\.([0-9])/.test(key)) {
                // slash followed by dot followed by number is ok
            } else if (/\.([0-9])/.test(key)) {
                // dot followed by number is invalid
                return;
            }
        }
        var tableCols = gTables[tableId].tableCols;
        var $table    = $("#xcTable-" + tableId);
        var $dataCol  = $table.find("tr:first th").filter(function() {
            return ($(this).find("input").val() === "DATA");
        });

        var colid = xcHelper.parseColNum($dataCol);

        var numRow        = -1;
        var startingIndex = -1;
        var endingIndex   = -1;
        var decimals = tableCols[newColid - 1].decimals;
        var format   = tableCols[newColid - 1].format;
                
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

        var nested       = parseColFuncArgs(key);
        var childOfArray = false;
        var columnType;  // track column type, initial is undefined
        var knf = false;

        for (var i = startingIndex; i < endingIndex; i++) {
            var jsonStr = $table.find('.row' + i + ' .col' +
                                     colid + ' .elementText').text();
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
                    xcHelper.isArray(value)) {
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
            $td.html(getTableCellHtml(formatVal))
                .addClass('clickable');
            // XXX now only allow number in case weird string mess up html
            if (originalVal != null &&
                (columnType === "integer" || columnType === "float"))
            {
                $td.attr("data-val", originalVal);
            }
        }

        if (columnType == null) {
            columnType = "undefined";
        }

        var table = gTables[tableId];
        table.tableCols[newColid - 1].type = columnType;

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
        $header.find('.iconHelper').attr('title', columnType);

        if (key === "recordNum") {
            $header.addClass('recordNum');
        }
        if (childOfArray) {
            $header.addClass('childOfArray');
        }

        $table.find('th.col' + newColid).removeClass('newColumn');
        if (tableCols[newColid - 1].isHidden) {
            $table.find('td.col' + newColid).addClass('userHidden');
        }
    }

    function delDupColHelper(colNum, tableId, forwardCheck) {
        var index   = colNum - 1;
        var columns = gTables[tableId].tableCols;
        var numCols = columns.length;
        var args    = columns[index].func.args;
        var start   = forwardCheck ? index : 0;
        var operation;
        // var thNum = start + (thsDeleted || 0);
        var thNum = start;
        var numColsDeleted = 0;
        var colWidths = 0;

        if (args) {
            operation = args[0];
        }

        for (var i = start; i < numCols; i++) {
            if (i === index) {
                thNum++;
                continue;
            }
            if (columns[i].func.args) {
                if (columns[i].func.args[0] === operation &&
                    columns[i].func.func !== "raw")
                {
                    delColAndAdjustLoop();
                }
            } else if (operation == null) {
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
           
            delColHelper(currThNum, i + 1, tableId, null, null, forwardCheck);
            if (i < index) {
                index--;
            }
            numCols--;
            i--;
            numColsDeleted++;
        }
        return (colWidths);
    }

    // Help Functon for pullAllCols and pullCOlHelper
    // parse tableCol.func.args
    function parseColFuncArgs(key) {
        if (key == null) {
            return ("");
        }
        var nested = key.replace(/\]/g, "")
                        .replace(/\[/g, ".")
                        .match(/([^\\.]|\\.)+/g);
        if (nested == null) {
            return ("");
        }
        for (var i = 0; i < nested.length; i++) {
            nested[i] = nested[i].replace(/\\./g, "\.");
        }

        return (nested);
    }
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

        for (var i = tableCols.length - 1; i >= index; i--) {
            tableCols[i].index += 1;
            tableCols[i + 1] = tableCols[i];
        }

        tableCols[index] = progCol;
    }

    function removeColHelper(index, tableId) {
        var tableCols = gTables[tableId].tableCols;
        var removed   = tableCols[index];

        for (var i = index + 1; i < tableCols.length; i++) {
            tableCols[i].index -= 1;
        }

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

    function parsePullColArgs(progCol) {
        if (progCol.func.func !== "pull") {
            console.warn("Wrong function!");
            return (false);
        }

        if (progCol.func.args.length !== 1) {
            console.warn("Wrong number of arguments!");
            return (false);
        }
        return (true);
    }

    function getTableCellHtml(value) {
        var html =
            '<div class="addedBarTextWrap clickable">' +
                value +   
            '</div>';
        return (html);
    }

    function searchColNames(val, searchBar) {
        val = val.toLowerCase();
        var $functionArea = $('#functionArea');
        var $headerInputs = $('.xcTable:visible').find('.editableHead');
        if (val === "") {
            searchBar.clearSearch(function() {
                $('.xcTable:visible').find('.selectedCell')
                                     .removeClass('selectedCell');
                $functionArea.removeClass('searching');
            });
            return;
        }
       
        var $matchedInputs = $headerInputs.filter(function() {
            return ($(this).val().toLowerCase().indexOf(val) !== -1);
        });
        var numMatches = $matchedInputs.length;
        var position = Math.min(1, numMatches);
        searchBar.$matches = $matchedInputs.closest('th');
        searchBar.numMatches = numMatches;
        $functionArea.find('.position').html(position);
        $functionArea.find('.total').html('of ' + numMatches);
        $('.xcTable:visible').find('.selectedCell').removeClass('selectedCell');

        if (numMatches !== 0) {
            searchBar.scrollMatchIntoView(searchBar.$matches.eq(0));
            searchBar.highlightSelected(searchBar.$matches.eq(0));
        }
    }

    function clearColSearch($headerInputs, searchBar) {
        $headerInputs.closest('th').removeClass('selectedCell');
        $('#functionArea').find('.position, .total').html("");
        searchBar.matchIndex = 0;
        searchBar.$matches = [];
        searchBar.numMatches = 0;
    }

    function formatColumnCell(val, format, decimals) {
        val = parseFloat(val);

        if (isNaN(val)) {
            return val;
        }

        // round it first
        var pow;
        if (decimals > -1) {
            pow = Math.pow(10, decimals);
            val = Math.round(val * pow) / pow;
        }

        switch (format) {
            case "percent":
                // there is a case that 2009.877 * 100 =  200987.69999999998
                // so must round it
                var newVal = val * 100;

                if (decimals === -1) {
                    // when no roundToFixed
                    var decimalPart = (val + "").split(".")[1];
                    if (decimalPart != null) {
                        var decimalPartLen = decimalPart.length;
                        decimalPartLen = Math.max(0, decimalPartLen - 2);
                        pow = Math.pow(10, decimalPartLen);
                    } else {
                        pow = 1;
                    }
                } else if (decimals >= 2) {
                    pow = Math.pow(10, decimals - 2);
                } else {
                    pow = 1;
                }

                newVal = Math.round(newVal * pow) / pow;
                return newVal + "%";
            default:
                return val + ""; // change type to string
        }
    }

    return (ColManager);
}(jQuery, {}));
