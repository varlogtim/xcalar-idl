window.Undo = (function($, Undo) {
    var undoFuncs = {};

    Undo.run = function(sql) {
        xcHelper.assert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var options = sql.getOptions();
        var operation = sql.getOperation();

        if (undoFuncs.hasOwnProperty(operation)) {
            undoFuncs[operation](options)
            .then(deferred.resolve)
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("undo failed");
            });
        } else {
            console.warn("Unknown operation cannot undo", operation);
            deferred.reject("Unknown operation");
        }

        return (deferred.promise());
    };

    Undo.setup = function() {
        $('#undo').click(function() {
            SQL.undo();
        });
        $('#redo').click(function() {
            SQL.redo();
        });
    };

    /* START BACKEND OPERATIONS */

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


        TblManager.refreshTable([firstTable.name], null,
                                [options.newTableName],
                                firstTable.worksheet,
                                {isUndo: true,
                                 position: firstTable.position})
        .then(function() {
            if (isSelfJoin) {
                deferred.resolve();
            } else {
                TblManager.refreshTable([secondTable.name], null, [],
                                         secondTable.worksheet,
                                         {isUndo: true,
                                          position: secondTable.position})
                .then(deferred.resolve)
                .fail(deferred.reject);
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    undoFuncs[SQLOps.GroupBy] = function(options) {
        // TblManager.archiveTable(tableId, {"del": ArchiveTable.Keep});
        var tableId = xcHelper.getTableId(options.newTableName);
        TblManager.sendTableToOrphaned(tableId, {'remove': true});
        return (promiseWrapper(null));
    };

    /* END BACKEND OPERATIONS */

    /* TABLE OPERATIONS */

    undoFuncs[SQLOps.ArchiveTable] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return(TblManager.refreshTable([options.tableName], null, [],
                                         null,
                                         {isUndo: true,
                                          position: 0}));
    };

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
        var colNum = options.colNum;
        if (options.direction === "R") {
            colNum++;
        }
        return (ColManager.delCol([colNum], options.tableId));
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
            var options = {
                "isUndo"  : true,
                "position": tablePos[i]
            };
            promises.push(TblManager.refreshTable.bind(this, [tableName], null,
                                                      [], null, options));
        }

        return chain(promises);
    };

    undoFuncs[SQLOps.ActiveTables] = function(options) {
        // undo sent to worksheet, that is archive
        var tableType = options.tableType;
        var tableNames = options.tableNames;
        var tableIds = [];
        var promises = [];

        for (var i = 0, len = tableNames.length; i < len; i++) {
            var tableId = xcHelper.getTableId(tableNames[i]);
            tableIds.push(tableId);
        }

        if (tableType === TableType.InActive) {
            TblManager.inActiveTables(tableIds);
            if (options.noSheetTables != null) {
                var $tableList = $("#inactiveTablesList");
                options.noSheetTables.forEach(function(tId) {
                    WSManager.removeTable(tId);

                    $tableList.find('.tableInfo[data-id="' + tId + '"] .worksheetInfo')
                    .addClass("inactive").text(SideBarTStr.NoSheet);
                });
            }
            return promiseWrapper(null);
        } else if (tableType === TableType.Orphan) {
            tableIds.forEach(function(tId) {
                TblManager.sendTableToOrphaned(tId, {"remove": true});
            });
            TableList.refreshOrphanList();
            return promiseWrapper(null);
        } else if (tableType === TableType.Agg) {
            console.error("Not support agg table undo!");
        } else {
            console.error(tableType, "not support undo!");
            return promiseWrapper(null);
        }
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

        if (tableType === TableType.InActive) {
            // change worksheet
            var oldWSId = options.oldWorksheetId;
            WSManager.removeTable(tableId);
            WSManager.addTable(tableId, oldWSId);
            TblManager.inActiveTables([tableId]);
        } else if (tableType == TableType.Orphan) {
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
    /* End of Worksheet Operation */

    function undoDeleteHelper(options, shift) {
        var progCols = options.progCols;
        var tableId = options.tableId;
        var currProgCols = gTables[tableId].tableCols;
        var colNums = options.colNums;
        var nameInfo;
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
        moveFirstColumn();
    }

    return (Undo);
}(jQuery, {}));

