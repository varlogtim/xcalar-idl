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
            .then(function(){
                deferred.resolve();
            })
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
        var tablesToReplace = [];
        if (!options.keepTables) {
            tablesToReplace = [options.lTableName, options.rTableName];
        }
        TblManager.refreshTable([options.newTableName], null,
                                tablesToReplace, options.worksheet)
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

    redoFuncs[SQLOps.Project] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                        [options.tableName],
                                        worksheet));
    };

    redoFuncs[SQLOps.Ext] = function(options) {
        // XXX As extension can do anything, it may need fix
        // as we add more extensions and some break the current code

        // Tested: Window, hPartition, genRowNum
        var replace = options.replace || {};
        var newTables = options.newTables || [];

        var promises = [];

        // first replace tables
        for (var table in replace) {
            var tablesToReplace = replace[table];
            promises.push(TblManager.refreshTable.bind(window,
                                                    [table], null,
                                                    tablesToReplace));
        }

        // next append new tables

        var tableId = options.tableId;
        var worksheet = WSManager.getWSFromTable(tableId);

        for (var i = 0, len = newTables.length; i < len; i++) {
            var newTable = newTables[i];
            promises.push(TblManager.refreshTable.bind(window,
                                                    [newTable], null,
                                                    [], worksheet));
        }

        return PromiseHelper.chain(promises);
    };

    /* END BACKEND OPERATIONS */

    /* USER STYLING/FORMATING OPERATIONS */

    redoFuncs[SQLOps.HideCols] = function(options) {
        focusTableHelper(options);
        ColManager.hideCols(options.colNums, options.tableId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.UnHideCols] = function(options) {
        focusTableHelper(options);
        ColManager.unhideCols(options.colNums, options.tableId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.AddNewCol] = function(options) {
        focusTableHelper(options);
        var addColOptions = {
            "direction": options.direction,
            "isNewCol" : true,
            "inFocus"  : true
        };

        ColManager.addCol(options.siblColNum, options.tableId, null,
                          addColOptions);

        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DeleteCol] = function(options) {
        focusTableHelper(options);
        return (ColManager.delCol(options.colNums, options.tableId));
    };

    redoFuncs[SQLOps.PullCol] = function(options) {
        focusTableHelper(options);
        if (options.pullColOptions.source === "fnBar") {
            return (ColManager.execCol("pull", options.usrStr, options.tableId,
                                        options.colNum));
        } else {
            return (ColManager.pullCol(options.colNum, options.tableId,
                                  options.nameInfo, options.pullColOptions));
        }
    };

    redoFuncs[SQLOps.PullAllCols] = function(options) {
        focusTableHelper(options);
        ColManager.unnest(options.tableId, options.colNum, options.rowNum,
                            options.isArray, options.options);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DupCol] = function(options) {
        focusTableHelper(options);
        return (ColManager.dupCol(options.colNum, options.tableId));
    };

    redoFuncs[SQLOps.DelDupCol] = function(options) {
        focusTableHelper(options);
        // delCol is 1 indexed;
        var colNums = options.colNums;
        var newColNums = [];
        for (var i = 0; i < colNums.length; i++) {
            newColNums.push(colNums[i] + 1);
        }
        return (ColManager.delCol(newColNums, options.tableId));
    };

    redoFuncs[SQLOps.DelAllDupCols] = function(options) {
        focusTableHelper(options);
        // delCol is 1 indexed;
        var colNums = options.colNums;
        var newColNums = [];
        for (var i = 0; i < colNums.length; i++) {
            newColNums.push(colNums[i] + 1);
        }
        return (ColManager.delCol(newColNums, options.tableId));
    };

    redoFuncs[SQLOps.ReorderCol] = function(options) {
        focusTableHelper(options);
        ColManager.reorderCol(options.tableId, options.oldColNum,
                              options.newColNum, {"undoRedo": true});
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.SortTableCols] = function(options) {
        focusTableHelper(options);
        TblManager.sortColumns(options.tableId, options.direction);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ResizeTableCols] = function(options) {
        focusTableHelper(options);
        TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                     options.newColumnWidths,
                                     options.newWidthStates);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DragResizeTableCol] = function(options) {
        focusTableHelper(options);
        TblAnim.resizeColumn(options.tableId, options.colNum, options.fromWidth,
                             options.toWidth, options.newWidthState);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DragResizeRow] = function(options) {
        focusTableHelper(options);
        TblAnim.resizeRow(options.rowNum, options.tableId, options.fromHeight,
                          options.toHeight);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RenameCol] = function(options) {
        focusTableHelper(options);
        ColManager.renameCol(options.colNum, options.tableId, options.newName);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ChangeFormat] = function(options) {
        focusTableHelper(options);

        var formats = options.formats;
        for (var i = 0; i < formats; i++) {
            if (formats[i] == null) {
                formats[i] = "default";
            }
        }
        ColManager.format(options.colNums, options.tableId, formats);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RoundToFixed] = function(options) {
        focusTableHelper(options);
        ColManager.roundToFixed(options.colNums, options.tableId,
                                options.decimals);
        return PromiseHelper.resolve(null);
    };

    /* END USER STYLING/FORMATING OPERATIONS */

    /* Table Operations */
    redoFuncs[SQLOps.RenameTable] = function(options) {
        focusTableHelper(options);
        var tableId = options.tableId;
        var newTableName = options.newTableName;

        return xcFunction.rename(tableId, newTableName);
    };

    redoFuncs[SQLOps.ArchiveTable] = function(options) {
        var wsId = WSManager.getWSFromTable(options.tableIds[0]);
        TblManager.archiveTables(options.tableIds);
        WSManager.focusOnWorksheet(wsId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RevertTable] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                [options.oldTableName], worksheet,
                            {isUndo: true}));
    };

    redoFuncs[SQLOps.ActiveTables] = function(options) {
        // redo sent to worksheet
        var deferred = jQuery.Deferred();
        var tableNames = options.tableNames;
        var $tableList;
        var tableType = options.tableType;

        TableList.refreshOrphanList()
        .then(function() {
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

            return TableList.activeTables(tableType, options.noSheetTables,
                                            options.wsToSent);
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });

        return deferred.promise();
    };

    redoFuncs[SQLOps.ReorderTable] = function(options) {
        focusTableHelper(options);
        reorderAfterTableDrop(options.tableId, options.srcIndex, options.desIndex,
                                {undoRedo: true});
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.BookmarkRow] = function(options) {
        focusTableHelper(options);
        bookmarkRow(options.rowNum, options.tableId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RemoveBookmark] = function(options) {
        focusTableHelper(options);
        unbookmarkRow(options.rowNum, options.tableId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.TextAlign] = function(options) {
        focusTableHelper(options);
        ColManager.textAlign(options.colNums, options.tableId,
                             options.cachedAlignment);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.HideTable] = function(options) {
        focusTableHelper(options);
        TblManager.hideTable(options.tableId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.UnhideTable] = function(options) {
        focusTableHelper(options);
        TblManager.unHideTable(options.tableId);
        return PromiseHelper.resolve(null);
    };
    /* End of Table Operations */

    /* Worksheet Opeartion */
    redoFuncs[SQLOps.AddWS] = function(options) {
        WSManager.addWS(options.worksheetId, options.worksheetName);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RenameWS] = function(options) {
        WSManager.renameWS(options.worksheetId, options.newName);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ReorderWS] = function(options) {
        var oldWSIndex = options.oldWorksheetIndex;
        var newWSIndex = options.newWorksheetIndex;

        WSManager.reorderWS(oldWSIndex, newWSIndex);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.MoveTableToWS] = function(options) {
        WSManager.moveTable(options.tableId, options.newWorksheetId);
        return PromiseHelper.resolve(null);
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

        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.UnHideWS] = function(options) {
        var wsIds = options.worksheetIds;
        return WSManager.unhideWS(wsIds);
    };

    redoFuncs[SQLOps.DelWS] = function(options) {
        var delType = options.delType;
        var wsId = options.worksheetId;
        WSManager.delWS(wsId, delType);
        return PromiseHelper.resolve(null);
    };
    /* End of Worksheet Operation */

    function focusTableHelper(options) {
        if (options.tableId !== gActiveTableId) {
            focusTable(options.tableId, true);
        }
    }

    return (Redo);
}(jQuery, {}));
