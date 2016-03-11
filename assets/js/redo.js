window.Redo = (function($, Redo) {


    Redo.run = function(sql) {
        xcHelper.assert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var options = sql.getOptions();
        var operation = sql.getOperation();

        if (redoFuncs.hasOwnProperty(operation)) {
            redoFuncs[operation](options)
            .then(deferred.resolve)
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("redo failed");
            });
        } else {
            console.warn("Unknown operation cannot redo", operation);
            deferred.reject("Unknown operation");

        }

        return (deferred.promise());
    };

    var redoFuncs = {};

    /* START BACKEND OPERATIONS */

    redoFuncs[SQLOps.Sort] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet, {isRedo: true}));
    };

    redoFuncs[SQLOps.Filter] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet, {isRedo: true}));
    };

    redoFuncs[SQLOps.Map] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet, {isRedo: true}));
    };

    redoFuncs[SQLOps.Join] = function(options) {
        var deferred = jQuery.Deferred();
            TblManager.refreshTable([options.newTableName], null,
                                    [options.lTableName, options.rTableName],
                                     options.worksheet,
                                     {isRedo: true})
            .then(deferred.resolve)
            .fail(deferred.fail);

        return (deferred.promise());
    };

    redoFuncs[SQLOps.GroupBy] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return(TblManager.refreshTable([options.newTableName], null, [],
                                         worksheet, {isRedo: true}));
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
        return (ColManager.pullCol(options.colNum, options.tableId,
                                  options.nameInfo, options.pullColOptions));
    };

    redoFuncs[SQLOps.PullAllCols] = function(options) {
        var $table = $('#xcTable-' + options.tableId);
        var $row = $table.find('tr.row' + options.rowNum);
        var $td = $table.find('.jsonElement');

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

    /* END USER STYLING/FORMATING OPERATIONS */

    /* Table Operations */
    redoFuncs[SQLOps.RenameTable] = function(options) {
        var tableId = options.tableId;
        var newTableName = options.newTableName;

        return xcFunction.rename(tableId, newTableName);
    };

    redoFuncs[SQLOps.ArchiveTable] = function(options) {
        TblManager.inActiveTables(options.tableIds);
        return (promiseWrapper(null));
    }

    redoFuncs[SQLOps.ActiveTables] = function(options) {
        // redo sent to worksheet
        var tableNames = options.tableNames;
        var $tableList;
        var tableType = options.tableType;

        if (tableType === TableType.InActive) {
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
    /* End of Worksheet Operation */

    return (Redo);
}(jQuery, {}));
