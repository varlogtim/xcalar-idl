// this module support column related functions
window.ColManager = (function($, ColManager) {
    // new ProgCol obj
    ColManager.newCol = function(options) {
        var progCol = new ProgCol(options);
        return (progCol);
    };

    ColManager.newPullCol = function(colName, type) {
        return (ColManager.newCol({
            "name"    : colName,
            "type"    : type,
            "width"   : gNewCellWidth,
            "isNewCol": false,
            "userStr" : '"' + colName + '" = pull(' + colName + ')',
            "func"    : {
                "func": "pull",
                "args": [colName]
            }
        }));
    };

    // special case, specifically for DATA col
    ColManager.newDATACol = function() {
        var progCol = ColManager.newCol({
            "name"   : "DATA",
            "type"   : "object",
            "width"  : "auto",// to be determined when building table
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
        var options = options || {};
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
                "operation": SQLOps.DeleteCol,
                "tableName": tableName,
                "tableId"  : tableId,
                "colNames" : colNames,
                "colNums"  : colNums,
                "progCols" : progCols,
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
            fullName = col.getBackColName().replace(/\\./g, ".") + symbol +
                       fullName;
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

        ColManager.execCol(newCol, tableId, colNum)
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
            newFieldNames[i] = col.name + "_" + colInfo.type;
            mapStrings[i] = mapStrHelper(col.getBackColName(), colInfo.type);
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

        chain(promises)
        .then(function(newTableId) {
            // map do not change stats of the table
            Profile.copy(tableId, newTableId);
            xcHelper.unlockTable(tableId, true);

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
            var fieldName    = newFieldNames[index];
            var mapString    = mapStrings[index];
            var curColNum    = colTypeInfos[index].colNum;

            XcalarMap(fieldName, mapString, curTableName, newTableName, txId)
            .then(function() {
                var mapOptions = {"replaceColumn": true};
                var curTableId = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;

                var newTablCols = xcHelper.mapColGenerate(curColNum, fieldName,
                                        mapString, curTableCols, mapOptions);

                if (index > 0) {
                    TblManager.setOrphanTableMeta(newTableName, newTablCols);
                    return promiseWrapper(null);
                } else {
                    var options = {
                        selectCol: curColNum - 1
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

    //         return (chain(promises));
    //     })
    //     .then(function() {
    //         return (refreshTable(finalTable, tableName));
    //     })
    //     .then(function() {
    //         xcHelper.unlockTable(tableId, true);
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

    // Not call it ColManager.window because window is a keyWord
    ColManager.windowChain = function(colNum, tableId, lag, lead) {
        var deferred = jQuery.Deferred();
        // XXX: Fill in all the SQL stuff
        var worksheet = WSManager.getWSFromTable(tableId);

        var table = gTables[tableId];
        var tableCols = table.tableCols;
        var colName = tableCols[colNum - 1].name;
        var tableName = table.tableName;
        var tableNameRoot = tableName.split("#")[0];
        var finalTableName;

        var randNumber = Math.floor(Math.random() * 100);

        // constant to mark it's a lag table, lead table, or current table
        var WinState = {
            "lag" : "lag",
            "lead": "lead",
            "cur" : "cur"
        };

        // cache tableNames for lag, lead and cur table
        var tableNames = {
            "lag" : [],
            "lead": [],
            "cur" : ""
        };

        // cache renamed col of the colName in lag, lead and cur table
        var winColNames = {
            "lag" : [],
            "lead": [],
            "cur" : ""
        };

        // cache names of genUniq col in lag, lead and cur table
        var genUniqColNames = {
            "lag" : [],
            "lead": [],
            "cur" : ""
        };

        var type = "string"; // default
        var origSortedOnCol = "";
        var newOrigSortedOnCol;
        var direction = XcalarOrderingT.XcalarOrderingAscending; // default

        // Step -1. Figure out how the column is sorted before window, because
        // we have to resort by this ordering once the window is done
        var sortedStr = $("#dagWrap-" + tableId).find(".actionType:last")
                         .attr("data-info");
        if (sortedStr.indexOf("sort") === -1) {
            // This is not a sorted table! I can just check that this table is
            // sorted because of the way that the UI always uses the unsorted
            // table. But backend should technically return us some information
            // XXX: Potential trap with tables created in the backend and then
            // inducted into the front end
            Alert.error(StatusMessageTStr.WindowFailed, ErrTStr.InvalidWin);
            deferred.reject(ErrTStr.InvalidWin);
            return deferred.promise();
        } else {
            if (sortedStr.indexOf("desc") !== -1) {
                // Descending sort
                direction = XcalarOrderingT.XcalarOrderingDescending;
            } else {
                direction = XcalarOrderingT.XcalarOrderingAscending;
            }
        }

        xcHelper.lockTable(tableId);
        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.Window,
            "operation": SQLOps.Window
        });

        // Step 0. Figure out column type info from orig table. We need it in
        // step 5.5.
        XcalarMakeResultSetFromTable(tableName)
        .then(function(ret) {
            type = DfFieldTypeTStr[ret.keyAttrHeader.type];
            switch (type) {
                case ("DfString"):
                    type = "string";
                    break;
                case ("DfInt32"):
                case ("DfInt64"):
                case ("DfUInt32"):
                case ("DfUInt64"):
                    type = "int";
                    break;
                case ("DfFloat32"):
                case ("DfFloat64"):
                    type = "float";
                    break;
                case ("DfBoolean"):
                    type = "bool";
                    break;
                default:
                    type = "string";
                    break;
            }
            origSortedOnCol = ret.keyAttrHeader.name;
            newOrigSortedOnCol = "orig_" + origSortedOnCol + "_" + randNumber;
            return XcalarSetFree(ret.resultSetId);
        })
        .then(function() {
            // Step 1 Get Unique Column, on SORTED table. This goes against our
            // axiom, but is the only way to do it for now T____T
            return genUniqMap(tableName);
        })
        .then(function(tableWithUniqOrig, uniqColName) {
            // Step 2 Index by any column unsorted, if not our checks will prevent
            // us from sorting some columns later
            // we choose to index on the unqiColName
            return uniqTableIndex(tableWithUniqOrig, uniqColName);
        })
        .then(function(tableWithUniqIndex, uniqColName) {
            // Step 3 Generate the columns for lag and lead. We need to duplicate
            // current table to have a unique column name if not later we will
            // suffer when we self join
            var defArray = [];
            var i;
            for (i = 0; i < lag; i++) {
                defArray.push(ladLeadMap(WinState.lag, i,
                                         tableWithUniqIndex, uniqColName));
            }

            for (i = 0; i < lead; i++) {
                defArray.push(ladLeadMap(WinState.lead, i,
                                         tableWithUniqIndex, uniqColName));
            }

            defArray.push(ladLeadMap(WinState.cur, -1,
                                     tableWithUniqIndex, uniqColName));
            return xcHelper.when.apply(window, defArray);
        })
        .then(function() {
            // Step 4 Create unique col names for each of the tables
            // This is so that we don't suffer when we self join
            var defArray = [];
            var i;
            for (i = 0; i < lag; i++) {
                defArray.push(winColRename(WinState.lag, i, colName));
            }
            for (i = 0; i < lead; i++) {
                defArray.push(winColRename(WinState.lead, i, colName));
            }

            defArray.push(winColRename(WinState.cur, -1, colName));
            return xcHelper.when.apply(window, defArray);
        })
        .then(function() {
            // Step 5 Reindex!
            var defArray = [];
            var i;
            for (i = 0; i < lag; i++) {
                defArray.push(genUniqColIndex(WinState.lag, i));
            }
            for (i = 0; i < lead; i++) {
                defArray.push(genUniqColIndex(WinState.lead, i));
            }

            defArray.push(genUniqColIndex(WinState.cur, -1));
            return xcHelper.when.apply(window, defArray);
        })
        .then(function() {
            // Step 5.5 Need to recast the original sorted by column in cur
            // table to avoid name collisions
            var mapStr = type + "(" + origSortedOnCol + ")";
            return reCastCurTable(newOrigSortedOnCol, mapStr);
        })
        .then(function() {
            // Step 6 inner join funnesss!
            // Order: Take cur, join lags then join leads
            var defChain = [];
            var lTable = tableNames.cur;
            var rTable;
            var newTableName;
            var i;
            for (i = 0; i < lag; i++) {
                newTableName = tableNameRoot + "_chain_" +
                                Authentication.getHashId();
                rTable = tableNames.lag[i];
                finalTableName = newTableName;
                defChain.push(winJoin.bind(this, lTable, rTable,
                                           newTableName, i, WinState.lag));
                lTable = newTableName;
            }

            for (i = 0; i < lead; i++) {
                newTableName = tableNameRoot + "_chain_" +
                                Authentication.getHashId();
                rTable = tableNames.lead[i];
                finalTableName = newTableName;
                defChain.push(winJoin.bind(this, lTable, rTable,
                                           newTableName, i, WinState.lead));
                lTable = newTableName;
            }

            return chain(defChain);
        })
        .then(function() {
            // Step 7 Sort ascending or descending by the cur order number
            var oldTableName = finalTableName;
            var newTableName = oldTableName.split("#")[0] +
                               Authentication.getHashId();
            var indexCol = newOrigSortedOnCol;
            finalTableName = newTableName;
            return XcalarIndexFromTable(oldTableName, indexCol,
                                        newTableName, direction, txId);
        })
        .then(function() {
            // Step 8 YAY WE ARE FINALLY DONE! Just start picking out all
            // the columns now and do the sort and celebrate
            var colNames = [];
            var finalCols = [];
            // Don't pull cur. Instead pull the original sorted col which cur
            // was generated on.
            colNames.push(newOrigSortedOnCol);

            for (var i = lag - 1; i >= 0; i--) {
                colNames.push(winColNames.lag[i]);
            }

            colNames.push(winColNames.cur);

            for (var i = 0; i < lead; i++) {
                colNames.push(winColNames.lead[i]);
            }

            var colLen = colNames.length;
            for (var i = 0; i < colLen; i++) {
                var colType;

                if (colNames[i] !== newOrigSortedOnCol) {
                    colType = "float";
                } else {
                    switch (type) {
                        case ("int"):
                            colType = "integer";
                            break;
                        case ("bool"):
                            colType = "boolean";
                            break;
                        default:
                            colType = type;
                    }
                }

                finalCols[i] = ColManager.newCol({
                    "name"    : colNames[i],
                    "type"    : colType,
                    "width"   : gNewCellWidth,
                    "isNewCol": false,
                    "userStr" : '"' + colNames[i] + '" = pull(' + colNames[i] + ')',
                    "func"    : {
                        "func": "pull",
                        "args": [colNames[i]]
                    }
                });
            }

            finalCols.push(ColManager.newDATACol());

            return TblManager.refreshTable([finalTableName], finalCols,
                                            [], worksheet);
        })
        .then(function() {
            xcHelper.unlockTable(tableId, false);

            var sql = {
                "operation"   : SQLOps.Window,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "colNum"      : colNum,
                "colName"     : colName,
                "lag"         : lag,
                "lead"        : lead,
                "newTableName": finalTableName
            };

            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(finalTableName),
                "sql"     : sql
            });

            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId, false);

            var sql = {
                "operation"   : SQLOps.Window,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "colNum"      : colNum,
                "colName"     : colName,
                "lag"         : lag,
                "lead"        : lead,
                "newTableName": finalTableName
            };

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.WindowFailed,
                "error"  : error,
                "sql"    : sql
            });

            deferred.reject(error);
        });

        return deferred.promise();

        function genUniqMap(srcTable) {
            var innerDeferred = jQuery.Deferred();

            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "genUnique()";
            var newColName = "orig_order_" + randNumber;

            var doNotUnsort = true;
            XcalarMap(newColName, mapStr, srcTable, newTableName,
                      txId, doNotUnsort)
            .then(function() {
                TblManager.setOrphanTableMeta(newTableName, tableCols);
                innerDeferred.resolve(newTableName, newColName);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function uniqTableIndex(srcTable, indexCol) {
            var innerDeferred = jQuery.Deferred();

            var newTableName = tableNameRoot + Authentication.getHashId();
            var order = XcalarOrderingT.XcalarOrderingUnordered;

            XcalarIndexFromTable(srcTable, indexCol, newTableName,
                                 order, txId)
            .then(function() {
                TblManager.setOrphanTableMeta(newTableName, tableCols);
                innerDeferred.resolve(newTableName, indexCol);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function ladLeadMap(state, index, srcTable, uniqColName) {
            var innerDeferred = jQuery.Deferred();
            var newTableName;
            var newColName;
            var mapStr;
            var suffix = (index + 1);

            if (state === WinState.lag) {
                // lagMapString
                mapStr = "add(" + uniqColName + ", " + suffix + ")";
                newTableName = tableNameRoot + "_" + randNumber + "_lag_" +
                                suffix + Authentication.getHashId();
                newColName = "lag_" + suffix + "_" + randNumber;

            } else if (state === WinState.lead) {
                // leadMapString
                mapStr = "sub(" + uniqColName + ", " + suffix + ")";
                newTableName = tableNameRoot + "_" + randNumber + "_lead_" +
                                suffix + Authentication.getHashId();
                newColName = "lead_" + suffix + "_" + randNumber;
            } else if (state === WinState.cur) {
                // curMapString
                mapStr = "float(" + uniqColName + ")";
                newTableName = tableNameRoot + "_" + randNumber + "_cur" +
                               Authentication.getHashId();
                newColName = "cur_" + randNumber;
            } else {
                throw "Error Case!";
            }

            // cache tableName and colName for later user
            if (state === WinState.cur) {
                tableNames.cur = newTableName;
                genUniqColNames.cur = newColName;
            } else {
                tableNames[state][index] = newTableName;
                genUniqColNames[state][index] = newColName;
            }

            XcalarMap(newColName, mapStr, srcTable, newTableName, txId)
            .then(function() {
                TblManager.setOrphanTableMeta(newTableName, tableCols);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function winColRename(state, index, winCol) {
            var innerDeferred = jQuery.Deferred();
            var newColName;

            var srcTable;
            var mapStr = "float(" + winCol + ")";
            var suffix = (index + 1);

            if (state === WinState.lag) {
                // lag
                srcTable = tableNames.lag[index];
                newColName = "lag_" + suffix + "_" + colName;
            } else if (state === WinState.lead) {
                // lead
                srcTable = tableNames.lead[index];
                newColName = "lead_" + suffix + "_" + colName;
            } else if (state === WinState.cur) {
                // cur
                srcTable = tableNames.cur;
                newColName = "cur_" + colName;
            } else {
                throw "Error Case!";
            }

            var newTableName = srcTable.split("#")[0] +
                                Authentication.getHashId();
            // update tableName and cache colName
            if (state === WinState.cur) {
                tableNames.cur = newTableName;
                winColNames.cur = newColName;
            } else {
                tableNames[state][index] = newTableName;
                winColNames[state][index] = newColName;
            }

            XcalarMap(newColName, mapStr, srcTable, newTableName, txId)
            .then(function() {
                var newCols = [];
                newCols[0] = ColManager.newCol({
                    "name"    : newColName,
                    "type"    : "float",
                    "width"   : gNewCellWidth,
                    "isNewCol": false,
                    "userStr" : '"' + newColName + '" = pull(' + newColName + ')',
                    "func"    : {
                        "func": "pull",
                        "args": [newColName]
                    }
                });
                newCols.push(ColManager.newDATACol());
                TblManager.setOrphanTableMeta(newTableName, newCols);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function genUniqColIndex(state, index) {
            var innerDeferred = jQuery.Deferred();
            var indexCol;
            var srcTable;

            if (state === WinState.lag || state === WinState.lead) {
                // lag and lead
                srcTable = tableNames[state][index];
                indexCol = genUniqColNames[state][index];
            } else if (state === WinState.cur) {
                // cur
                srcTable = tableNames.cur;
                indexCol = genUniqColNames.cur;
            } else {
                throw "Error Case!";
            }

            var newTableName = srcTable.split("#")[0] +
                                Authentication.getHashId();
            // update tableName
            if (state === WinState.cur) {
                tableNames.cur = newTableName;
            } else {
                tableNames[state][index] = newTableName;
            }

            var order = XcalarOrderingT.XcalarOrderingUnordered;

            XcalarIndexFromTable(srcTable, indexCol, newTableName,
                                 order, txId)
            .then(function() {
                var srcTableId = xcHelper.getTableId(srcTable);
                var srcTableCols = gTables[srcTableId].tableCols;
                TblManager.setOrphanTableMeta(newTableName, srcTableCols);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function reCastCurTable(newMapCol, mapStr) {
            var innerDeferred = jQuery.Deferred();
            var srcTable = tableNames.cur;
            var newTableName = srcTable.split("#")[0] +
                               Authentication.getHashId();
            tableNames.cur = newTableName;

            XcalarMap(newMapCol, mapStr, srcTable, newTableName, txId)
            .then(function() {
                var srcTableId = xcHelper.getTableId(srcTable);
                var srcTableCols = gTables[srcTableId].tableCols;
                TblManager.setOrphanTableMeta(newTableName, srcTableCols);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function winJoin(lTable, rTable, newTableName, index, state) {
            var innerDeferred = jQuery.Deferred();
            var joinType = JoinOperatorT.InnerJoin;

            XcalarJoin(lTable, rTable, newTableName, joinType, txId)
            .then(function() {
                var lTableId = xcHelper.getTableId(lTable);
                var newCols = xcHelper.deepCopy(gTables[lTableId].tableCols);
                var newCol;
                if (state === WinState.lag) {
                    newCol = winColNames.lag[index];
                    newCols.unshift(ColManager.newCol({
                        "name"    : newCol,
                        "type"    : "float",
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + newCol + '" = pull(' + newCol + ')',
                        "func"    : {
                            "func": "pull",
                            "args": [newCol]
                        }
                    }));
                } else if (state === WinState.lead) {
                    newCol = winColNames.lead[index];
                    var dataCol = newCols.pop();
                    newCols.push(ColManager.newCol({
                        "name"    : newCol,
                        "type"    : "float",
                        "width"   : gNewCellWidth,
                        "isNewCol": false,
                        "userStr" : '"' + newCol + '" = pull(' + newCol + ')',
                        "func"    : {
                            "func": "pull",
                            "args": [newCol]
                        }
                    }));
                    newCols.push(dataCol);
                }

                TblManager.setOrphanTableMeta(newTableName, newCols);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }
    };

    // Horizontal Partition
    ColManager.hPartition = function(colNum, tableId, partitionNums) {
        var isValidParam = (colNum != null && tableId != null &&
                            partitionNums != null);
        xcHelper.assert(isValidParam, "Invalid Parameters");

        var deferred    = jQuery.Deferred();
        var worksheet   = WSManager.getWSFromTable(tableId);
        var table       = gTables[tableId];
        var tableName   = table.tableName;
        var tableCols   = table.tableCols;
        var colType     = tableCols[colNum - 1].type;
        var colName     = tableCols[colNum - 1].name;
        var backColName = tableCols[colNum - 1].getBackColName();
        var newTables = [];

        if (colType !== "integer" && colType !== "float" &&
            colType !== "string" && colType !== "boolean") {
            console.error("Invalid col type!");
            deferred.reject("Invalid col type!");
            return (deferred.promise());
        }

        var tableNamePart = tableName.split("#")[0];

        xcHelper.lockTable(tableId);

        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.HorizontalPartition,
            "operation": SQLOps.hPartition
        });

        getUniqueValues(partitionNums)
        .then(function(uniqueVals) {
            var len = uniqueVals.length;
            var promises = [];

            for (var i = 0; i < len; i++) {
                promises.push(hPartitionHelper.bind(this, uniqueVals[i],
                                                    i, colType));
            }

            return chain(promises);
        })
        .then(function(finalTableId) {
            xcHelper.unlockTable(tableId);

            var sql = {
                "operation"    : SQLOps.hPartition,
                "tableName"    : tableName,
                "tableId"      : tableId,
                "colNum"       : colNum,
                "colName"      : colName,
                "partitionNums": partitionNums,
                "newTableNames": newTables
            };

            Transaction.done(txId, {
                "msgTable": finalTableId,
                "sql"     : sql
            });
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            var sql = {
                "operation"    : SQLOps.hPartition,
                "tableName"    : tableName,
                "tableId"      : tableId,
                "colNum"       : colNum,
                "colName"      : colName,
                "partitionNums": partitionNums,
                "newTableNames": newTables
            };

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.HPartitionFailed,
                "error"  : error,
                "sql"    : sql
            });
            deferred.reject(error);
        });

        return (deferred.promise());

        function hPartitionHelper(fltVal, index, type) {
            var innerDeferred = jQuery.Deferred();

            var srcTable = tableName;
            var filterTable = tableNamePart + "-HP" + (index + 1) +
                                Authentication.getHashId();
            var filterTableId = xcHelper.getTableId(filterTable);
            var fltStr;

            newTables[index] = filterTable;

            switch (type) {
                case "string":
                    fltStr = "eq(" + backColName + ", \"" + fltVal + "\")";
                    break;
                default:
                    // integer, float and boolean
                    fltStr = "eq(" + backColName + ", " + fltVal + ")";
                    break;
            }

            XcalarFilter(fltStr, srcTable, filterTable, txId)
            .then(function() {
                var filterCols = xcHelper.deepCopy(tableCols);
                return TblManager.refreshTable([filterTable], filterCols,
                                                [], worksheet);
            })
            .then(function() {
                innerDeferred.resolve(filterTableId);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function getUniqueValues(rowsToFetch) {
            var innerDeferred = jQuery.Deferred();
            var keyCol = backColName;
            var srcTable = tableName;
            var data = [];

            var indexTable = ".tempIndex." + tableNamePart +
                             Authentication.getHashId();
            var groupbyTable;
            var groupByCol;
            var sortTable;

            // Step 1. Do groupby count($keyCol), GROUP BY ($keyCol)
            // aka, index on keyCol and then groupby count
            // this way we get the unique value of src table
            XcalarIndexFromTable(srcTable, keyCol, indexTable,
                XcalarOrderingT.XcalarOrderingUnordered, txId)
            .then(function() {
                groupbyTable = ".tempGB." + tableNamePart +
                                Authentication.getHashId();
                groupByCol = xcHelper.randName("randCol");

                var groupByOp = AggrOp.Count;
                var incSample = false;

                return XcalarGroupBy(groupByOp, groupByCol, keyCol, indexTable,
                                    groupbyTable, incSample, txId);
            })
            .then(function() {
                // Step 2. Sort on desc on groupby table by groupByCol
                // this way, the keyCol that has most count comes first
                sortTable = ".tempGB-Sort." + tableNamePart +
                            Authentication.getHashId();

                return XcalarIndexFromTable(groupbyTable, groupByCol, sortTable,
                            XcalarOrderingT.XcalarOrderingDescending, txId);
            })
            .then(function() {
                // Step 3, fetch data
                return getResultSet(sortTable);
            })
            .then(function(resultSet) {
                var resultSetId = resultSet.resultSetId;
                var totalRows = resultSet.numEntries;

                if (totalRows == null || totalRows === 0) {
                    return jQuery.Deferred().reject("No Data!").promise();
                } else {
                    rowsToFetch = Math.min(rowsToFetch, totalRows);
                    return fetchDataHelper(resultSetId, 0, rowsToFetch, data);
                }
            })
            .then(function() {
                var result = [];
                for (var i = 0, len = data.length; i < len; i++) {
                    result.push(data[i][keyCol]);
                }

                innerDeferred.resolve(result);
                // XXXX Should delete the interim tabke when delete is enabled
                // XXXX should free sortTable
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function fetchDataHelper(resultSetId, rowPosition, rowsToFetch, data) {
            var innerDeferred = jQuery.Deferred();

            XcalarSetAbsolute(resultSetId, rowPosition)
            .then(function() {
                return XcalarGetNextPage(resultSetId, rowsToFetch);
            })
            .then(function(tableOfEntries) {
                var kvPairs = tableOfEntries.kvPair;
                var numKvPairs = tableOfEntries.numKvPairs;
                var numStillNeeds = 0;

                if (numKvPairs < rowsToFetch) {
                    if (rowPosition + numKvPairs >= totalRows) {
                        numStillNeeds = 0;
                    } else {
                        numStillNeeds = rowsToFetch - numKvPairs;
                    }
                }

                var numRows = Math.min(rowsToFetch, numKvPairs);
                var value;

                for (var i = 0; i < numRows; i++) {
                    try {
                        value = $.parseJSON(kvPairs[i].value);
                        data.push(value);
                    } catch (error) {
                        console.error(error, kvPairs[i].value);
                        innerDeferred.reject(error);
                        return (null);
                    }
                }

                if (numStillNeeds > 0) {
                    var newPosition;
                    if (numStillNeeds === rowsToFetch) {
                        // fetch 0 this time
                        newPosition = rowPosition + 1;
                        console.warn("cannot fetch position", rowPosition);
                    } else {
                        newPosition = rowPosition + numRows;
                    }

                    return fetchDataHelper(resultSetId, newPosition,
                                            numStillNeeds, data);
                }
            })
            .then(innerDeferred.resolve)
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }
    };

    ColManager.splitCol = function(colNum, tableId, delimiter, numColToGet, isAlertOn) {
        // isAlertOn is a flag to alert too many column will generate
        // when do replay, this flag is null, so no alert
        // since we assume user want to replay it.
        var deferred = jQuery.Deferred();
        var cancelError = "cancel splitCol";
        var splitWithDelimIndex = null;

        var worksheet   = WSManager.getActiveWS();
        var table       = gTables[tableId];
        var tableName   = table.tableName;
        var tableCols   = table.tableCols;
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

            return chain(promises);
        })
        .then(function(newTableId) {
            // map do not change stats of the table
            Profile.copy(tableId, newTableId);
            xcHelper.unlockTable(tableId, true);

            var sql = {
                "operation"   : SQLOps.SplitCol,
                "tableName"   : tableName,
                "tableId"     : tableId,
                "newTableName": newTableNames[1],
                "colNum"      : colNum,
                "delimiter"   : delimiter,
                "numColToGet" : numColToGet
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
                "newTableName": newTableNames[1],
                "colNum"      : colNum,
                "delimiter"   : delimiter,
                "numColToGet" : numColToGet
            };

            if (error === cancelError) {
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

            XcalarMap(fieldName, mapString, curTableName, newTableName, txId)
            .then(function() {
                var curTableId   = xcHelper.getTableId(curTableName);
                var curTableCols = gTables[curTableId].tableCols;
                var newTableCols = xcHelper.mapColGenerate(++colNum,
                                        fieldName, mapString, curTableCols);
                if (index < numColToGet) {
                    TblManager.setOrphanTableMeta(newTableName, newTableCols);
                    return promiseWrapper(null);
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

            var mapString    = 'countChar(' + backColName + ', "' +
                                delimiter + '")';
            var fieldName    = xcHelper.randName("mappedCol");
            var curTableName = tableName;
            var newTableName = ".tempMap." + tableNamePart +
                                Authentication.getHashId();

            XcalarMap(fieldName, mapString, curTableName, newTableName, txId)
            .then(function() {
                var op = AggrOp.MaxInteger;
                return XcalarAggregate(fieldName, newTableName, op, txId);
            })
            .then(function(value) {
                try {
                    var val = JSON.parse(value);
                    // Note that the splitColNum should be charCountNum + 1
                    alertHelper(val.Value + 1, null, innerDeferred);
                } catch (error) {
                    innerDeferred.reject(error);
                }

                // XXXX Should delete the newTableName when delete is enabled
            })
            .fail(function(error) {
                innerDeferred.reject(error);
            });

            return (innerDeferred.promise());
        }

        function alertHelper(numToSplit, numDelim, curDeferred) {
            if (isAlertOn && numToSplit > 15) {
                var msg = xcHelper.replaceMsg(ColTStr.SplitColWarnMsg, {
                    "num": numToSplit
                });

                Alert.show({
                    "title"     : ColTStr.SplitColWarn,
                    "msg"       : msg,
                    "isCheckBox": false,
                    "confirm"   : function () {
                        curDeferred.resolve(numToSplit, numDelim);
                    },
                    "cancel": function() {
                        curDeferred.reject(cancelError);
                    }
                });
            } else {
                curDeferred.resolve(numToSplit, numDelim);
            }
        }
    };

    ColManager.extension = function(colNum, tableId, functionName) {
        var table = gTables[tableId];
        var colName = table.tableCols[colNum - 1].name;
        var tableName = table.tableName;
        var tableNameRoot = tableName.split("#")[0];
        switch (functionName) {
        case ("efunc-lastTouch"):
            // colName should be the string column Date in AuditTrail
            genLastTouch(colName, tableName);
            // This will generate a groupByTable with 2 cols and the a map
            break;
        case ("efunc-genFinalPT"):
            // TableName should be optyLineItem. We will look for pdt type or
            // line item pdt type
            genFinalPT(tableName);
            break;
        case ("efunc-genLineItemPT"):
            // TableName should be optyLineItem. We will look for the 3 columns
            genLineItemPT(tableName);
            // This will generate a groupby table
            break;
        case ("efunc-genNoOfDays"):
            // This must be run on the last_modified_latest col
            genNoOfDays(colName, tableName);
            break;
        default:
            break;
        }

        function genLastTouch(colName, tableName) {
            // Steps:
            // Step 1: We convert colName to UTS
            // Step 2: We do a groupBy on Record ID with max UTS
            // Step 3: We do a map on max UTS to convert back to %m/%d/%Y
            // Step 4: We add table to current worksheet
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "default:convertToUnixTS(Date, \"%m/%d/%Y\")";
            var newColName = "Date_UTS";
            var srcTable = tableName;
            var tableId = xcHelper.getTableId(tableName);
            var worksheet = WSManager.getWSFromTable(tableId);
            xcHelper.lockTable(tableId);
            XcalarMap(newColName, mapStr, srcTable, newTableName,
                      null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Date", tableId);
                newCols.splice(idx+1, 0, ColManager.newPullCol("Date_UTS"));

                return (TblManager.refreshTable([newTableName], newCols,
                                                [srcTable], worksheet));
            })
            .then(function() {
                xcHelper.unlockTable(tableId);
                srcTable = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                newColName = "Date_UTS_integer";
                mapStr = "int(Date_UTS)";
                return (XcalarMap(newColName, mapStr, srcTable, newTableName,
                                  null, false));
            })
            .then(function() {
                tableId = xcHelper.getTableId(srcTable);
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Date_UTS", tableId);
                newCols.splice(idx+1, 0,
                               ColManager.newPullCol("Date_UTS_integer"));

                return (TblManager.refreshTable([newTableName], newCols,
                                                [srcTable], worksheet));
            })
            .then(function() {
                srcTable = newTableName;
                tableId = xcHelper.getTableId(srcTable);
                return (xcFunction.groupBy(AggrOp.Max, tableId,
                                           "Record ID", "Date_UTS_integer",
                                           false, "Max_Date"));
            })
            .then(function(tn) {
                srcTable = tn;
                newTableName = tableNameRoot + Authentication.getHashId();
                newColName = "Final Touch";
                mapStr = "default:convertFromUnixTS(Max_Date, \"%m/%d/%Y\")";
                return (XcalarMap(newColName, mapStr, srcTable, newTableName,
                                  null, false)
                        .then(function() {
                            tableId = xcHelper.getTableId(srcTable);
                            var newCols = xcHelper.deepCopy(gTables[tableId].
                                                            tableCols);
                            var idx = getColNum("Max_Date", tableId);
                            newCols.splice(idx+1, 0,
                                          (ColManager.newPullCol("Final Touch",
                                                                 "string")));
                            return (TblManager.refreshTable([newTableName],
                                                            newCols,
                                                            [srcTable],
                                                            worksheet));
                        }));
            });
        }

        function genFinalPT(tableName) {
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "intel:genFinalPT(Product Type, Line Item Product Type)";
            var worksheet = WSManager.getWSFromTable(tableId);
            xcHelper.lockTable(tableId);
            XcalarMap("Final PT", mapStr, tableName, newTableName, null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Line Item Product Type", tableId);
                newCols.splice(idx+1, 0,
                               ColManager.newPullCol("Final PT", "string"));
                xcHelper.unlockTable(tableId);
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            });
        }

        function genLineItemPT(tableName) {
            // Step 1: Change Forecasted Detail Actual Dollar Amount to float
            // Step 2: xcFunction.groupBy(sum, tableId, indexedCols,
            // aggColName, false, newColName)
            // Step 3: single groupBy(max
            // Step 4: multi join ROW ID, max == forecasted_float
            // Step 5: GroupBy Row_ID count inc sample to randomly pick
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "float(Forecasted Detail Actual Dollar Amount)";
            var worksheet = WSManager.getWSFromTable(tableId);
            var tableNameStore = [];
            xcHelper.lockTable(tableId);
            XcalarMap("Forecasted_float", mapStr, tableName, newTableName,
                      null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Forecasted Detail Actual Dollar Amount",
                                    tableId);
                newCols.splice(idx+1, 0,
                               ColManager.newPullCol("Forecasted_float",
                                                     "float"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                xcHelper.unlockTable(tableId);
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                return (xcFunction.groupBy(AggrOp.Sum, tableId,
                                           "ROW_ID,Product Type",
                                        "Forecasted_float", false, "SumByPdt"));
            })
            .then(function(tn) {
                tableNameStore.push(tn);
                newTableName = tn;
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                return (xcFunction.groupBy(AggrOp.Max, tableId, "ROW_ID",
                                           "SumByPdt", false, "MaxForRow"));
            })
            .then(function(tn) {
                tableNameStore.push(tn);
                newTableName = tn;
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                // Let's get the column numbers for the left table
                var lId = xcHelper.getTableId(tableNameStore[0]);
                var rId = xcHelper.getTableId(tableNameStore[1]);
                tableNameStore.unshift(newTableName);
                var lColNums = [getColNum("ROW_ID", lId),
                                getColNum("SumByPdt", lId)];
                var rColNums = [getColNum("ROW_ID", rId),
                                getColNum("MaxForRow", rId)];
                return (xcFunction.join(lColNums, lId, rColNums, rId,
                                        "Inner Join", newTableName));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                return (xcFunction.groupBy(AggrOp.Count, tableId, "ROW_ID",
                                           "ROW_ID", true, "NumOccur"));
            })
            .then(function(tn) {
                // XXX Why is delCol 1-indexed? Leftover from last time?
                ColManager.delCol([1, 4, 5, 6], xcHelper.getTableId(tn));
                TblManager.archiveTable(xcHelper.getTableId(tableNameStore[0]));
            });
        }
        // TODO this should be in xcHelper
        function getColNum(colName, tableId) {
            var table = gTables[tableId];
            var cols = table.tableCols;
            for (var i = 0; i<cols.length; i++) {
                if (cols[i].name == colName) {
                    return (i);
                }
            }
            return (-1);
        }

        function genNoOfDays(colName, tableName) {
            // Step 1: Create column Modified No Blank
            // Step 2: Create column Last_Modified_Latest by doing ifelse on
            // Final Date and ModifiedNoBlank
            // Step 3: Create No Days since col
            // Step 4: Change col to float
            // Step 5: Map <= 60
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "intel:ifElse(Last Modified, Created Date)";
            var worksheet = WSManager.getWSFromTable(tableId);
            xcHelper.lockTable(tableId);
            XcalarMap("Last Modified_NoBlank", mapStr, tableName, newTableName,
                      null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("Last Modified_NoBlank",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                xcHelper.unlockTable(tableId);
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "intel:convertDateValueToUTS(Last Modified_NoBlank)";
                return (XcalarMap("LastModified_UTS", mapStr, tableName,
                                  newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("LastModified_UTS",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "default:convertFromUnixTS(LastModified_UTS,"+
                                                    "\"%m/%d/%Y %H:%S\")";
                return (XcalarMap("LastModified_readable", mapStr, tableName,
                                  newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("LastModified_readable",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                               [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "intel:ifElse(Final Touch, LastModified_readable)";
                return (XcalarMap("Last_Modified_Latest", mapStr, tableName,
                                  newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("Last_Modified_Latest",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "intel:noOfDays(Last_Modified_Latest)";
                return (XcalarMap("DaysSince",
                                  mapStr, tableName, newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("DaysSince", "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "float(DaysSince)";
                return (XcalarMap("No of Days since last modified", mapStr,
                                  tableName, newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol(
                "No of Days since last modified", "float"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                ColManager.delCol([2, 3, 4, 5, 6], tableId);
                $("#xcTable-"+tableId).find("th.col1 .flexContainer")
                                      .mousedown() ;
            });
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
                                                .prop("disabled", true);

        // adjust rightsidebar column name
        TableList.updateColName(tableId, colNum, newName);

        SQL.add("Rename Column", {
            "operation": SQLOps.RenameCol,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colName"  : oldName,
            "colNum"   : colNum,
            "newName"  : newName
        });

        KVStore.commit();
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

    ColManager.execCol = function(progCol, tableId, colNum, args) {
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

                if (progCol.isNewCol) {
                    progCol.isNewCol = false;
                }

                pullColHelper(progCol.getBackColName(), colNum, tableId);

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
                xcFunction.map(colNum, tableId, fieldName,
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

    ColManager.checkColDup = function ($input, $inputs, tableId, parseCol,
                                       colNum) {
        // $inputs checks the names of $inputs, tableId is used to check
        // back column names. You do not need both
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

        var name = progCol.getBackColName();
        if (name == null) {
            name = progCol.getFronColName();
        }

        name = xcHelper.getUniqColName(name, tableCols);

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

        ColManager.execCol(tableCols[colNum], tableId, colNum + 1)
        .then(function() {
            updateTableHeader(tableId);
            TableList.updateTableInfo(tableId);
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
            "operation": SQLOps.DelDupCol,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colNum"   : colNum,
            "colName"  : colName,
            "colNums"  : colNums,
            "progCols" : progCols,
            "htmlExclude"  : ["progCols"]
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
        var originalNumCols = columns.length - 1;
        var numColsRemoved = 0;
        for (var i = 0; i < columns.length; i++) {
            if (columns[i].func.func && columns[i].func.func === "raw") {
                continue;
            } else {
                colInfo = null;
                colInfo = delDupColHelper(i + 1, tableId, forwardCheck);
                console.log(colInfo);
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
            "operation": SQLOps.DelAllDupCols,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "colNums"  : allCols,
            "progCols" : progCols,
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
            "operation"  : SQLOps.UnHideCols,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colNames"   : colNames,
            "colNums"    : colNums
        });
    };

    ColManager.textAlign = function(colNum, tableId, alignment) {
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
                .removeClass('textAlignWrap')
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
        var dataValue;
        var rowNum;
        var dataVal;
        var childOfArray;
        var col;
        var nested;
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
            dataValue = parseRowJSON(jsonData[row]);
            rowNum = row + startIndex;

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
                            xcHelper.isArray(tdValue))
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

                    dataVal = "";
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
                    columnTypes[col] = "mixed";
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

        var $currentTh;
        var $header;
        var columnType;
        var adjustedColType;

        for (i = 0; i < numCols; i++) {
            $currentTh = $table.find('th.col' + (i + 1));
            $header = $currentTh.find('> .header');
            columnType = columnTypes[i] || "undefined";

            // DATA column is type-object
            if (tableCols[i].name === "DATA") {
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

            if (tableCols[i].name === "recordNum") {
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

    ColManager.unnest = function($jsonTd, isArray, options) {
        var text = $jsonTd.find("div").eq(0).text();
        var jsonTdObj;
        options = options || {};

        try {
            jsonTdObj = jQuery.parseJSON(text);
        } catch (error) {
            console.error(error, text);
            return;
        }

        var colNum = xcHelper.parseColNum($jsonTd);
        var jsonRowNum = xcHelper.parseRowNum($jsonTd.closest('tr'));
        var $table = $jsonTd.closest('table');
        var tableId  = $table.data('id');
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
                escapedColName = arrayKey.replace(/\./g, "\\\.");
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
                                arrayKey.replace(/\./g, "\\\.") + closingSymbol;
            }

            if (!table.hasBackCol(escapedColName)) {
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
                "name"   : key,
                "width"  : width,
                "userStr": usrStr,
                "func"   : {
                    "func": "pull",
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
            jsonObj.normal.push($(this).text());
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
            "operation"  : SQLOps.PullAllCols,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "colNum"     : colNum,
            "colNums"    : colNums,
            "rowNum"     : jsonRowNum,
            "isArray"    : isArray,
            "options"    : options
        });
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
        $header.find('.iconHelper').attr('title', columnType);

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
        var args    = columns[index].func.args;
        var start   = forwardCheck ? index : 0;
        var operation;

        var thNum = start;
        var numColsDeleted = 0;
        var colWidths = 0;
        var colNums = [];
        var progCols = [];

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
        var html = '<div class="addedBarTextWrap clickable">' +
                        value +
                   '</div>';
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
        RowScroller.empty();
        if (numMatches !== 0) {
            searchBar.scrollMatchIntoView($matches.eq(0));
            searchBar.highlightSelected($matches.eq(0));
        }
    }



    function formatColumnCell(val, format, decimals) {
        val = parseFloat(val);

        if (isNaN(val)) {
            return val;
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

    return (ColManager);
}(jQuery, {}));
