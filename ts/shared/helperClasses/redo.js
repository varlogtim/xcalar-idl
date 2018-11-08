window.Redo = (function($, Redo) {
    var redoFuncs = {};

    Redo.run = function(xcLog) {
        xcAssert((xcLog != null), "invalid log");

        var deferred = PromiseHelper.deferred();

        var options = xcLog.getOptions();
        var operation = xcLog.getOperation();

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

    redoFuncs[SQLOps.ExecSQL] = redoFuncs[SQLOps.IndexDS];

    redoFuncs[SQLOps.RefreshTables] = function(options) {
        var deferred = PromiseHelper.deferred();
        var promises = [];
        for (var i = 0; i < options.tableNames.length; i++) {
            promises.push(TblManager.refreshTable.bind(this, [options.tableNames[i]], null, [],
                options.worksheet));
        }
        PromiseHelper.chain(promises)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    redoFuncs[SQLOps.Sort] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet));
    };

    redoFuncs[SQLOps.Filter] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        var oldTables = [];
        if (!options.fltOptions.complement) {
            oldTables = [options.tableName];
        } else {
            worksheet = options.fltOptions.worksheet;
        }
        return (TblManager.refreshTable([options.newTableName], null,
                                            oldTables,
                                            worksheet));
    };

    redoFuncs[SQLOps.Query] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        oldTables = [options.tableName];
        return (TblManager.refreshTable([options.newTableName], null,
                                            oldTables,
                                            worksheet));
    };

    redoFuncs[SQLOps.Map] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        var oldTables = [];
        if (!options.mapOptions || !options.mapOptions.createNewTable) {
            oldTables = [options.tableName];
        }
        return (TblManager.refreshTable([options.newTableName], null,
                                            oldTables, worksheet));
    };

    redoFuncs[SQLOps.Join] = function(options) {
        var deferred = PromiseHelper.deferred();
        var tablesToReplace = [];
        var joinOptions = options.options || {};
        if (!joinOptions.keepTables) {
            tablesToReplace = [options.lTableName, options.rTableName];
        }
        TblManager.refreshTable([options.newTableName], null,
                                tablesToReplace, options.worksheet)
        .then(deferred.resolve)
        .fail(deferred.fail);

        return (deferred.promise());
    };

    redoFuncs[SQLOps.Union] = function(options) {
        var unionOptions = options.options || {};
        var promises = [];
        if (!unionOptions.keepTables) {
            // in case one table is used serveral times
            var tableMap = {};
            options.tableNames.forEach(function(tableName) {
                if (!tableMap.hasOwnProperty(tableName)) {
                    var tableId = xcHelper.getTableId(tableName);
                    promises.push(TblManager.sendTableToOrphaned.bind(window, tableId,
                                                        {"remove": true}));
                    tableMap[tableName] = true;
                }
            });
        }

        promises.push(TblManager.refreshTable.bind(window, [options.newTableName],
                                                    null, [], options.worksheet));

        return PromiseHelper.chain(promises);
    };

    redoFuncs[SQLOps.GroupBy] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        var oldTables = [];
        if (options.options && (options.options.isJoin ||
            !options.options.isKeepOriginal)) {
            oldTables = [options.tableName];
        }
        return (TblManager.refreshTable([options.newTableName], null, oldTables,
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

    redoFuncs[SQLOps.DFRerun] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return TblManager.refreshTable([options.newTableName], null,
                                [options.tableName], worksheet);
    };

    redoFuncs[SQLOps.Finalize] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                        [options.tableName],
                                        worksheet));
    };

    redoFuncs[SQLOps.Ext] = function(options) {
        // XXX As extension can do anything, it may need fix
        // as we add more extensions and some break the current code

        // Tested: Window, hPartition, genRowNum, union
        var replace = options.replace || {};
        var newTables = options.newTables || [];

        var promises = [];

        // first replace tables
        for (var table in replace) {
            var tablesToReplace = replace[table];
            promises.push(TblManager.refreshTable.bind(window,
                                                    [table], null,
                                                    tablesToReplace,
                                                    options.worksheet));
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

    /* Dag operations */

    redoFuncs[SQLOps.DisconnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ConnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        var isReconnect = options.prevParentNodeId != null;
        DagView.connectNodes(options.parentNodeId, options.childNodeId,
                            options.connectorIndex, isReconnect);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RemoveOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.removeNodes(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.AddOperation] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.addBackNodes([options.nodeId], options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.CopyOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.addBackNodes(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.MoveOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.moveNodes(options.nodeInfos);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.NewDagTab] = function() {
        DagTabManager.Instance.newTab();
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditDescription] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.editDescription(options.nodeId, options.newDescription);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditNodeTitle] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.editTitle(options.nodeId, options.newTitle);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.NewComment] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.addBackNodes([options.commentId], options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditComment] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagComment.Instance.updateText(options.commentId, options.newComment);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DagBulkOperation] = function(options) {
        let tasks = PromiseHelper.resolve();
        if (options.actions != null) {
            for (const action of options.actions) {
                const operation = action.operation;
                if (operation == null || !redoFuncs.hasOwnProperty(operation)) {
                    console.error(`Redo function for ${operation} not supported`);
                    continue;
                }
                const redoFunc = redoFuncs[operation];
                tasks = tasks.then(() => redoFunc(action));
            }
        }
        return tasks;
    }

    redoFuncs[SQLOps.DrawNodesAndConnections] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.drawNodesAndConnections(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EraseNodesAndConnections] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.eraseNodesAndConnections(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    }

    /* USER STYLING/FORMATING OPERATIONS */

    redoFuncs[SQLOps.MinimizeCols] = function(options) {
        focusTableHelper(options);
        return ColManager.minimizeCols(options.colNums, options.tableId);
    };

    redoFuncs[SQLOps.MaximizeCols] = function(options) {
        focusTableHelper(options);
        return ColManager.maximizeCols(options.colNums, options.tableId);
    };

    redoFuncs[SQLOps.AddNewCol] = function(options) {
        focusTableHelper(options);
        ColManager.addNewCol(options.colNum, options.tableId, options.direction);

        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.HideCol] = function(options) {
        focusTableHelper(options);
        return (ColManager.hideCol(options.colNums, options.tableId));
    };

    redoFuncs[SQLOps.PullCol] = function(options) {
        focusTableHelper(options);
        if (options.pullColOptions.source === "fnBar") {
            return (ColManager.execCol("pull", options.usrStr, options.tableId,
                                        options.colNum));
        } else {
            return (ColManager.pullCol(options.colNum, options.tableId,
                                        options.pullColOptions));
        }
    };

    redoFuncs[SQLOps.PullMultipleCols] = function(options) {
        focusTableHelper(options);
        ColManager.unnest(options.tableId, options.colNum, options.rowNum,
                          options.colNames);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ReorderCol] = function(options) {
        focusTableHelper(options);
        ColManager.reorderCol(options.tableId, options.oldColNum,
                              options.newColNum, {"undoRedo": true});
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.SortTableCols] = function(options) {
        focusTableHelper(options);
        TblManager.sortColumns(options.tableId, options.sortKey, options.direction);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ResizeTableCols] = function(options) {
        focusTableHelper(options);
        var sizeTo = [];
        for (var i = 0; i < options.newColumnWidths.length; i++) {
            sizeTo.push(options.sizeTo);
        }
        TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                     options.newColumnWidths, sizeTo);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DragResizeTableCol] = function(options) {
        focusTableHelper(options);
        TblAnim.resizeColumn(options.tableId, options.colNum, options.fromWidth,
                             options.toWidth, options.sizedTo);
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
        var $th = $('#xcTable-' + options.tableId)
                    .find('th.col' + options.colNum);
        TblManager.highlightColumn($th);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.TextAlign] = function(options) {
        focusTableHelper(options);
        ColManager.textAlign(options.colNums, options.tableId,
                             options.cachedAlignment);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ChangeFormat] = function(options) {
        focusTableHelper(options);
        ColManager.format(options.colNums, options.tableId, options.formats);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.Round] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet);
    };

    /* END USER STYLING/FORMATING OPERATIONS */

    /* Table Operations */
    redoFuncs[SQLOps.RenameTable] = function(options) {
        focusTableHelper(options);
        var tableId = options.tableId;
        var newTableName = options.newTableName;

        return xcFunction.rename(tableId, newTableName);
    };

    redoFuncs[SQLOps.RevertTable] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.tableName], null,
                                [options.oldTableName], worksheet, null,
                            {isUndo: true}));
    };


    redoFuncs[SQLOps.MakeTemp] = function(options) {
        return TblManager.moveTableToTempList(options.tableIds);
    };

    redoFuncs[SQLOps.ActiveTables] = function(options) {
        // redo sent to worksheet
        var deferred = PromiseHelper.deferred();
        var tableNames = options.tableNames;
        var $tableList;
        var tableType = options.tableType;

        TableList.refreshOrphanList()
        .then(function() {
            if (tableType === TableType.Orphan) {
                $tableList = $('#orphanedTableListSection');
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

            return TableList.activeTables(tableType, options.ws);
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
        TblFunc.reorderAfterTableDrop(options.tableId, options.srcIndex,
                                      options.desIndex, {moveHtml: true});
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

    redoFuncs[SQLOps.MarkPrefix] = function(options) {
        TableComponent.getPrefixManager().markColor(options.prefix, options.newColor);
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

    redoFuncs[SQLOps.MoveTemporaryTableToWS] = function(options) {
        var tableId = options.tableId;
        var tableType = options.tableType;
        var newWSId = options.newWorksheetId;

        return WSManager.moveTemporaryTable(tableId, newWSId, tableType);
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
            TblFunc.focusTable(options.tableId, true);
        }
    }

    return (Redo);
}(jQuery, {}));
