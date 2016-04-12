window.Redo = (function($, Redo) {
    var redoFuncs = {};

    Redo.run = function(sql) {
        xcHelper.assert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var options = sql.getOptions();
        var operation = sql.getOperation();

        if (redoFuncs.hasOwnProperty(operation)) {
            var minModeCache = gMinModeOn;
            // do not use any animation
            gMinModeOn = true;

            redoFuncs[operation](options)
            .then(deferred.resolve)
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("redo failed");
            })
            .always(function() {
                gMinModeOn = minModeCache;
            });
        } else {
            console.warn("Unknown operation cannot redo", operation);
            deferred.reject("Unknown operation");

        }

        return (deferred.promise());
    };

    /* START BACKEND OPERATIONS */
    redoFuncs[SQLOps.IndexDS] = function(options) {
        return (TblManager.refreshTable([options.tableName], null, [],
                                        options.worksheet));
    };

    redoFuncs[SQLOps.Sort] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet));
    };

    redoFuncs[SQLOps.Filter] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet));
    };

    redoFuncs[SQLOps.Map] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet));
    };

    redoFuncs[SQLOps.Join] = function(options) {
        var deferred = jQuery.Deferred();
        TblManager.refreshTable([options.newTableName], null,
                                [options.lTableName, options.rTableName],
                                    options.worksheet)
        .then(deferred.resolve)
        .fail(deferred.fail);

        return (deferred.promise());
    };

    redoFuncs[SQLOps.GroupBy] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null, [],
                                         worksheet));
    };

    redoFuncs[SQLOps.SplitCol] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet));
    };

    redoFuncs[SQLOps.ChangeType] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet));
    };

    /* END BACKEND OPERATIONS */

    /* USER STYLING/FORMATING OPERATIONS */

    redoFuncs[SQLOps.HideCols] = function(options) {
        ColManager.hideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.UnHideCols] = function(options) {
        ColManager.unhideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.AddNewCol] = function(options) {
        var addColOptions = {
            "direction": options.direction,
            "isNewCol" : true,
            "inFocus"  : true
        };

        ColManager.addCol(options.siblColNum, options.tableId, null,
                          addColOptions);

        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.DeleteCol] = function(options) {
        return (ColManager.delCol(options.colNums, options.tableId));
    };

    redoFuncs[SQLOps.PullCol] = function(options) {
        if (options.pullColOptions.source === "fnBar") {
            return (ColManager.execCol("pull", options.usrStr, options.tableId,
                                        options.colNum));
        } else {
            return (ColManager.pullCol(options.colNum, options.tableId,
                                  options.nameInfo, options.pullColOptions));
        }
    };

    redoFuncs[SQLOps.PullAllCols] = function(options) {
        var $table = $('#xcTable-' + options.tableId);
        var $row = $table.find('tr.row' + options.rowNum);
        var $td = $row.find('td.col' + options.colNum);

        ColManager.unnest($td, options.isArray, options.options);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.DupCol] = function(options) {
        return (ColManager.dupCol(options.colNum, options.tableId));
    };

    redoFuncs[SQLOps.DelDupCol] = function(options) {
        // delCol is 1 indexed;
        var colNums = options.colNums;
        var newColNums = [];
        for (var i = 0; i < colNums.length; i++) {
            newColNums.push(colNums[i] + 1);
        }
        return (ColManager.delCol(newColNums, options.tableId));
    };

    redoFuncs[SQLOps.DelAllDupCols] = function(options) {
        // delCol is 1 indexed;
        var colNums = options.colNums;
        var newColNums = [];
        for (var i = 0; i < colNums.length; i++) {
            newColNums.push(colNums[i] + 1);
        }
        return (ColManager.delCol(newColNums, options.tableId));
    };

    redoFuncs[SQLOps.ReorderCol] = function(options) {
        ColManager.reorderCol(options.tableId, options.oldColNum,
                              options.newColNum, {"undoRedo": true});
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.SortTableCols] = function(options) {
        TblManager.sortColumns(options.tableId, options.direction);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.ResizeTableCols] = function(options) {
        TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                     options.newColumnWidths);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.DragResizeTableCol] = function(options) {
        TblAnim.resizeColumn(options.tableId, options.colNum, options.fromWidth,
                             options.toWidth);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.DragResizeRow] = function(options) {
        TblAnim.resizeRow(options.rowNum, options.tableId, options.fromHeight,
                          options.toHeight);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.RenameCol] = function(options) {
        ColManager.renameCol(options.colNum, options.tableId, options.newName);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.ChangeFormat] = function(options) {
        var format = options.format;
        if (format == null) {
            format = "default";
        }
        ColManager.format(options.colNum, options.tableId, format);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.RoundToFixed] = function(options) {
        ColManager.roundToFixed(options.colNum, options.tableId,
                                options.decimals);
        return (promiseWrapper(null));
    };

    /* END USER STYLING/FORMATING OPERATIONS */

    /* Table Operations */
    redoFuncs[SQLOps.RenameTable] = function(options) {
        var tableId = options.tableId;
        var newTableName = options.newTableName;

        return xcFunction.rename(tableId, newTableName);
    };

    redoFuncs[SQLOps.ArchiveTable] = function(options) {
        TblManager.archiveTables(options.tableIds);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.RevertTable] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                [options.oldTableName], worksheet,
                            {isUndo: true}));
    };

    redoFuncs[SQLOps.ActiveTables] = function(options) {
        // redo sent to worksheet
        var tableNames = options.tableNames;
        var $tableList;
        var tableType = options.tableType;

        if (tableType === TableType.Archived) {
            $tableList = $('#archivedTableList');
        } else if (tableType === TableType.Orphan) {
            $tableList = $('#orphanedTableList');
        } else if (tableType === TableType.Agg) {
            $tableList = $("#aggregateTableList");
        } else {
            console.error(tableType, "not support redo!");
        }

        var tableIds = [];
        for (var i = 0, len = tableNames.length; i < len; i++) {
            var tableId = xcHelper.getTableId(tableNames[i]);
            tableIds.push(tableId);
        }

        $tableList.find(".tableInfo").each(function() {
            var $li = $(this);
            var id = $li.data("id");
            if (tableIds.indexOf(id) >= 0) {
                $li.find(".addTableBtn").click();
            }
        });

        return TableList.activeTables(tableType,
                                      options.noSheetTables, options.wsToSent);
    };

    redoFuncs[SQLOps.ReorderTable] = function(options) {
        // ColManager.reorderCol(options.tableId, options.oldColNum,
        //                       options.newColNum, {"undoRedo": true});
        reorderAfterTableDrop(options.tableId, options.srcIndex, options.desIndex,
                                {undoRedo: true});
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.BookmarkRow] = function(options) {
        bookmarkRow(options.rowNum, options.tableId);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.RemoveBookmark] = function(options) {
        unbookmarkRow(options.rowNum, options.tableId);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.TextAlign] = function(options) {
        // var numCols = options.colNums.length;
        ColManager.textAlign(options.colNums, options.tableId,
                             options.cachedAlignment);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.HideTable] = function(options) {
        TblManager.hideTable(options.tableId);
        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.UnhideTable] = function(options) {
        TblManager.unHideTable(options.tableId);
        return promiseWrapper(null);
    };
    /* End of Table Operations */

    /* Worksheet Opeartion */
    redoFuncs[SQLOps.AddWS] = function(options) {
        WSManager.addWS(options.worksheetId, options.worksheetName);
        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.RenameWS] = function(options) {
        WSManager.renameWS(options.worksheetId, options.newName);
        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.ReorderWS] = function(options) {
        var oldWSIndex = options.oldWorksheetIndex;
        var newWSIndex = options.newWorksheetIndex;

        WSManager.reorderWS(oldWSIndex, newWSIndex);
        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.MoveTableToWS] = function(options) {
        WSManager.moveTable(options.tableId, options.newWorksheetId);
        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.MoveInactiveTableToWS] = function(options) {
        var tableId = options.tableId;
        var tableType = options.tableType;
        var newWSId = options.newWorksheetId;

        return WSManager.moveInactiveTable(tableId, newWSId, tableType);
    };

    redoFuncs[SQLOps.HideWS] = function(options) {
        var wsId = options.worksheetId;
        WSManager.hideWS(wsId);

        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.UnHideWS] = function(options) {
        var wsIds = options.worksheetIds;
        WSManager.unhideWS(wsIds);
        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.SwitchWS] = function(options) {
        var wsId = options.newWorksheetId;
        $("#worksheetTab-" + wsId).trigger(fakeEvent.mousedown);

        return promiseWrapper(null);
    };

    redoFuncs[SQLOps.DelWS] = function(options) {
        var delType = options.delType;
        var wsId = options.worksheetId;
        WSManager.delWS(wsId, delType);
        return promiseWrapper(null);
    };
    /* End of Worksheet Operation */

    return (Redo);
}(jQuery, {}));
