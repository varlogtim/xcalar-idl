window.Undo = (function($, Undo) {
    var undoFuncs = {};

    Undo.run = function(sql) {
        xcHelper.assert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var options = sql.getOptions();
        var operation = sql.getOperation();

        if (undoFuncs.hasOwnProperty(operation)) {
            var minModeCache = gMinModeOn;
            // do not use any animation
            gMinModeOn = true;

            undoFuncs[operation](options)
            .then(deferred.resolve)
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("undo failed");
            })
            .always(function() {
                gMinModeOn = minModeCache;
            });
        } else {
            console.warn("Unknown operation cannot undo", operation);
            deferred.reject("Unknown operation");
        }

        return (deferred.promise());
    };

    /* START BACKEND OPERATIONS */

    undoFuncs[SQLOps.IndexDS] = function(options) {
        var tableId = xcHelper.getTableId(options.tableName);
        TblManager.sendTableToOrphaned(tableId, {'remove': true});
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.Sort] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, {isUndo: true}));
    };

    undoFuncs[SQLOps.Filter] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, {isUndo: true}));
    };

    undoFuncs[SQLOps.Map] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, {isUndo: true}));
    };

    undoFuncs[SQLOps.Join] = function(options) {
        var deferred = jQuery.Deferred();

        var currTableId = xcHelper.getTableId(options.newTableName);
        var currTableWorksheet = WSManager.getWSFromTable(currTableId);

        var lTableWorksheet = WSManager.getWSFromTable(options.lTableId);
        var rTableWorksheet = WSManager.getWSFromTable(options.rTableId);

        var leftTable = {
            name     : options.lTableName,
            id       : options.lTableId,
            position : options.lTablePos,
            worksheet: lTableWorksheet
        };

        var rightTable = {
            name     : options.rTableName,
            id       : options.rTableId,
            position : options.rTablePos,
            worksheet: rTableWorksheet
        };

        var isSelfJoin = false;
        if (leftTable.id === rightTable.id) {
            isSelfJoin = true;
        }

        var firstTable = {};
        var secondTable = {};

        if (!isSelfJoin) {
            if (leftTable.worksheet === rightTable.worksheet) {
                if (leftTable.position > rightTable.position) {
                    var temp = rightTable;
                    rightTable = leftTable;
                    leftTable = temp;
                }
            }
        }

        if (currTableWorksheet !== leftTable.worksheet &&
            currTableWorksheet !== rightTable.worksheet) {
            firstTable = leftTable;
            secondTable = rightTable;
        } else if (currTableWorksheet === leftTable.worksheet) {
            firstTable = leftTable;
            firstTable.position = null; // we will rely on newTable's position
            secondTable = rightTable;
        } else if (!isSelfJoin && currTableWorksheet === rightTable.worksheet) {
            firstTable = rightTable;
            firstTable.position = null; // we will rely on newTable's position
            secondTable = leftTable;
        }

        // var tableId = xcHelper.getTableId(firstTable.name);
        // WSManager.removeTable(tableId);
        TblManager.refreshTable([firstTable.name], null,
                                [options.newTableName],
                                firstTable.worksheet, {
            "isUndo"  : true,
            "position": firstTable.position
        })
        .then(function() {
            if (isSelfJoin) {
                deferred.resolve();
            } else {
                TblManager.refreshTable([secondTable.name], null, [],
                                         secondTable.worksheet, {
                    "isUndo"  : true,
                    "position": secondTable.position
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    undoFuncs[SQLOps.GroupBy] = function(options) {
        // TblManager.archiveTable(tableId, {"del": ArchiveTable.Keep});
        // var tableId = xcHelper.getTableId(options.newTableName);
        // TblManager.sendTableToOrphaned(tableId, {'remove': true});
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.SplitCol] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, {isUndo: true}));
    };

    undoFuncs[SQLOps.ChangeType] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, {isUndo: true}));
    };

    /* END BACKEND OPERATIONS */


    /* USER STYLING/FORMATING OPERATIONS */

    undoFuncs[SQLOps.HideCols] = function(options) {
        ColManager.unhideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.UnHideCols] = function(options) {
        ColManager.hideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.AddNewCol] = function(options) {
        var colNum = options.siblColNum;
        if (options.direction === "R") {
            colNum++;
        }
        return (ColManager.delCol([colNum], options.tableId));
    };

    undoFuncs[SQLOps.DeleteCol] = function(options) {
        undoDeleteHelper(options, -1);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.PullCol] = function(options) {
        if (options.pullColOptions.source === "fnBar") {
            if (options.wasNewCol) {
                var col = gTables[options.tableId].tableCols[options.colNum - 1];
                col.userStr = options.origUsrStr;
                col.backName = options.backName;
                col.type = options.type;
                col.func = options.func;
                $('#xcTable-' + options.tableId)
                        .find('td.col' + options.colNum).empty();
                $('#xcTable-' + options.tableId).find('th.col' + options.colNum)
                                                .addClass('newColumn')
                                                .find('.header')
                                                .attr('class', 'header')
                                                .find('.iconHelper')
                                                .attr('title', '');
                return (promiseWrapper(null));
            } else {
                return (ColManager.execCol("pull", options.origUsrStr,
                                       options.tableId, options.colNum,
                                        {undo: true, backName: options.backName}));
            }
        } else {
            var colNum = options.colNum;
            if (options.direction === "R") {
                colNum++;
            }
            return (ColManager.delCol([colNum], options.tableId));
        }
    };

    undoFuncs[SQLOps.PullAllCols] = function(options) {
        return (ColManager.delCol(options.colNums, options.tableId,
                                 {"noAnimate": true}));
    };

    undoFuncs[SQLOps.DupCol] = function(options) {
        return (ColManager.delCol([options.colNum + 1], options.tableId));
    };

    undoFuncs[SQLOps.DelDupCol] = function(options) {
        undoDeleteHelper(options);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.DelAllDupCols] = function(options) {
        undoDeleteHelper(options);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.ReorderCol] = function(options) {
        ColManager.reorderCol(options.tableId, options.newColNum,
                              options.oldColNum, {"undoRedo": true});
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.SortTableCols] = function(options) {
        TblManager.orderAllColumns(options.tableId, options.originalOrder);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.ResizeTableCols] = function(options) {
        TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                     options.oldColumnWidths);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.DragResizeTableCol] = function(options) {
        TblAnim.resizeColumn(options.tableId, options.colNum, options.toWidth,
                             options.fromWidth);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.DragResizeRow] = function(options) {
        TblAnim.resizeRow(options.rowNum, options.tableId, options.toHeight,
                          options.fromHeight);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.RenameCol] = function(options) {
        ColManager.renameCol(options.colNum, options.tableId, options.colName,
                             {keepEditable: options.wasNew});
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.TextAlign] = function(options) {
        var numCols = options.colNums.length;
        var alignment;
        for (var i = 0; i < numCols; i++) {
            alignment = options.prevAlignments[i];
            if (alignment === "Left") {
                alignment = "leftAlign";
            } else if (alignment === "Right"){
                alignment = "rightAlign";
            } else if (alignment === "Center") {
                alignment = "centerAlign";
            } else {
                alignment = "wrapAlign";
            }
            ColManager.textAlign([options.colNums[i]], options.tableId,
                                 alignment);
        }
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.ChangeFormat] = function(options) {
        var format = options.oldFormat;
        if (format == null) {
            format = "default";
        }
        ColManager.format(options.colNum, options.tableId, format);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.RoundToFixed] = function(options) {
        ColManager.roundToFixed(options.colNum, options.tableId,
                                option.prevDecimals);
        return (promiseWrapper(null));
    };


    /* END USER STYLING/FORMATING OPERATIONS */


    /* Table Operations */
    undoFuncs[SQLOps.RenameTable] = function(options) {
        var tableId = options.tableId;
        var oldTableName = options.oldTableName;

        return xcFunction.rename(tableId, oldTableName);
    };

    undoFuncs[SQLOps.ArchiveTable] = function(options) {
        // archived table should in inActive list

        options = options || {};
        var tableIds = options.tableIds || [];
        var tableNames = options.tableNames || [];
        var tablePos = options.tablePos || [];
        var promises = [];

        for (var i = 0, len = tableIds.length; i < len; i++) {
            var tableName = tableNames[i];
            promises.push(TblManager.refreshTable.bind(this, [tableName], null,
                                                      [], null, {
                "isUndo"  : true,
                "position": tablePos[i]
            }));
        }

        return chain(promises);
    };

    undoFuncs[SQLOps.RevertTable] = function(options) {
        var deferred = jQuery.Deferred();

        var worksheet = WSManager.getWSFromTable(options.tableId);
        TblManager.refreshTable([options.oldTableName], null,
                                [options.tableName], worksheet,
                            {isUndo: true, from: options.tableType})
        .then(function() {
            if (worksheet !== options.worksheet) {
                var status = gTables[options.tableId].status;
                var type;
                if (status === TableType.Archived) {
                    type = "archivedTables";
                } else if (status === TableType.Orphan) {
                    type = "orphanedTables";
                }
                WSManager.moveTable(options.tableId, options.worksheet, type);
                var hiddenWS = WSManager.getHiddenWS();
                TableList.tablesToHiddenWS(hiddenWS);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    undoFuncs[SQLOps.ActiveTables] = function(options) {
        // undo sent to worksheet, that is archive
        var tableType = options.tableType;
        var tableNames = options.tableNames;
        var tableIds = [];

        for (var i = 0, len = tableNames.length; i < len; i++) {
            var tableId = xcHelper.getTableId(tableNames[i]);
            tableIds.push(tableId);
        }

        if (tableType === TableType.Archived) {
            TblManager.archiveTables(tableIds);
            if (options.noSheetTables != null) {
                var $tableList = $("#inactiveTablesList");
                var noSheetTables = WSManager.getNoSheetTables();
                options.noSheetTables.forEach(function(tId) {
                    WSManager.removeTable(tId);
                    noSheetTables.push(tId);

                    $tableList.find('.tableInfo[data-id="' + tId + '"] .worksheetInfo')
                    .addClass("inactive").text(SideBarTStr.NoSheet);
                });
            }
            return promiseWrapper(null);
        } else if (tableType === TableType.Orphan) {
            tableIds.forEach(function(tId) {
                TblManager.sendTableToOrphaned(tId, {"remove": true});
            });
            return TableList.refreshOrphanList();
        } else if (tableType === TableType.Agg) {
            console.error("Not support agg table undo!");
        } else {
            console.error(tableType, "not support undo!");
            return promiseWrapper(null);
        }
    };

    undoFuncs[SQLOps.ReorderTable] = function(options) {
        // ColManager.reorderCol(options.tableId, options.newColNum,
        //                       options.oldColNum, {"undoRedo": true});
        reorderAfterTableDrop(options.tableId, options.desIndex, options.srcIndex,
                                {undoRedo: true});
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.BookmarkRow] = function(options) {
        unbookmarkRow(options.rowNum, options.tableId);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.RemoveBookmark] = function(options) {
        bookmarkRow(options.rowNum, options.tableId);
        return (promiseWrapper(null));
    };

    /* End of Table Operations */


    /* Worksheet Opeartion */
    undoFuncs[SQLOps.AddWS] = function(options) {
        WSManager.delWS(options.worksheetId, DelWSType.Empty);
        WSManager.focusOnWorksheet(options.currentWorksheet);

        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.RenameWS] = function(options) {
        WSManager.renameWS(options.worksheetId, options.oldName);
        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.RenameWS] = function(options) {
        WSManager.renameWS(options.worksheetId, options.oldName);
        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.ReorderWS] = function(options) {
        var oldWSIndex = options.oldWorksheetIndex;
        var newWSIndex = options.newWorksheetIndex;

        WSManager.reorderWS(newWSIndex, oldWSIndex);
        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.MoveTableToWS] = function(options) {
        var deferred = jQuery.Deferred();

        var tableId = options.tableId;
        var tableName = gTables[tableId].tableName;
        var oldWS = options.oldWorksheetId;
        var tablePos = options.oldTablePos;
        // the idead is:
        // 1. archive this table
        // 2, remove it from current worksheet
        // 3, refresh back to the old worksheet
        // XXXX fix it if you have better idea
        TblManager.inActiveTables([tableId]);
        WSManager.removeTable(tableId);

        TblManager.refreshTable([tableName], null, [], oldWS, {
            "isUndo"  : true,
            "position": tablePos
        })
        .then(function() {
            WSManager.focusOnWorksheet(oldWS, false, tableId);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    undoFuncs[SQLOps.MoveInactiveTableToWS] = function(options) {
        var tableId = options.tableId;
        var tableType = options.tableType;

        if (tableType === TableType.Archived) {
            // change worksheet
            var oldWSId = options.oldWorksheetId;
            WSManager.removeTable(tableId);
            WSManager.addTable(tableId, oldWSId);
            TblManager.inActiveTables([tableId]);
        } else if (tableType === TableType.Orphan) {
            TblManager.sendTableToOrphaned(tableId, {"remove": true});
        } else {
            console.error(tableType, "cannot undo!");
        }

        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.HideWS] = function(options) {
        var wsId = options.worksheetId;
        WSManager.unhideWS(wsId);

        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.UnHideWS] = function(options) {
        var wsIds = options.worksheetIds;

        for (var i = 0, len = wsIds.length; i < len; i++) {
            WSManager.hideWS(wsIds[i]);
        }

        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.SwitchWS] = function(options) {
        var wsId = options.oldWoksheetId;
        $("#worksheetTab-" + wsId).trigger(fakeEvent.mousedown);

        return promiseWrapper(null);
    };

    undoFuncs[SQLOps.DelWS] = function(options) {
        var delType = options.delType;
        var wsId = options.worksheetId;
        var wsName = options.worksheetName;
        var wsIndex = options.worksheetIndex;
        var tables = options.tables;
        var archivedTables = options.archivedTables;
        var promises = [];

        if (delType === DelWSType.Empty) {
            makeWorksheetHelper();
            return promiseWrapper(null);
        } else if (delType === DelWSType.Del) {
            makeWorksheetHelper();

            tables.forEach(function(tableId) {
                promises.push(WSManager.moveInactiveTable.bind(this,
                    tableId, wsId, TableType.Orphan));
            });

            archivedTables.forEach(function(tableId) {
                WSManager.addTable(tableId, wsId);
                gTables[tableId].status = TableType.Archived;
                TblManager.archiveTable(tableId);
            });

            promises.push(TableList.refreshOrphanList.bind(this));

            return chain(promises);
        } else if (delType === DelWSType.Archive) {
            makeWorksheetHelper();
            WSManager.addNoSheetTables(tables, wsId);
            WSManager.addNoSheetTables(archivedTables, wsId);

            tables.forEach(function(tableId) {
                WSManager.addTable(tableId);
                var tableName = gTables[tableId].tableName;
                promises.push(TblManager.refreshTable.bind(this, [tableName], null,
                                                [], null, {"isUndo": true}));
            });

            var $lists = $("#archivedTableList .tableInfo");
            archivedTables.forEach(function(tableId) {
                // reArchive the table
                $lists.filter(function() {
                    return $(this).data("id") === tableId;
                }).remove();

                TblManager.archiveTable(tableId);
            });

            return chain(promises);
        } else {
            console.error("Unexpected delete worksheet type");
            return promiseWrapper(null);
        }

        function makeWorksheetHelper() {
            WSManager.addWS(wsId, wsName);
            var $tabs = $("#worksheetTabs .worksheetTab");
            var $tab = $tabs.eq(wsIndex);
            if (($tab.data("ws") !== wsId)) {
                $("#worksheetTab-" + wsId).insertBefore($tab);
            }

        }
    };
    /* End of Worksheet Operation */

    function undoDeleteHelper(options, shift) {
        var progCols = options.progCols;
        var tableId = options.tableId;
        var currProgCols = gTables[tableId].tableCols;
        var colNums = options.colNums;
        var $table = $('#xcTable-' + tableId);
        var dataIndex = xcHelper.parseColNum($table.find('th.dataCol'));
        var newProgCol;
        shift = shift || 0;

        for (var i = 0, len = progCols.length; i < len; i++) {
            newProgCol = ColManager.newCol(progCols[i]);
            currProgCols.splice(colNums[i] + shift, 0, newProgCol);
        }

        var jsonObj = {normal: []};
        $table.find('tbody').find('.col' + dataIndex).each(function() {
            jsonObj.normal.push($(this).text());
        });

        var tHeadBodyInfo = TblManager.generateTheadTbody(currProgCols, tableId);
        var newDataIndex = tHeadBodyInfo.dataIndex;
        var rowNum = xcHelper.parseRowNum($table.find('tbody').find('tr:eq(0)'));

        var tableHtml = tHeadBodyInfo.html;
        $table.html(tableHtml);

        TblManager.pullRowsBulk(tableId, jsonObj, rowNum, newDataIndex,
                                RowDirection.Bottom);
        TblManager.addColListeners($table, tableId);
        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
        moveFirstColumn();
    }

    return (Undo);
}(jQuery, {}));

