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
            console.error("Unknown operation", operation);
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
        // TblManager.archiveTable(tableId, {"del": ArchiveTable.Keep});
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

    /* Archive and UnArchive */
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
            console.error(tableType, "not support redo!")''
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
    /* End of Archive and UnArchive */

    return (Redo);
}(jQuery, {}));
