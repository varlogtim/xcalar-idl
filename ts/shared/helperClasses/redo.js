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
    redoFuncs[SQLOps.ExecSQL] = function(options) {
        return TblManager.refreshTable([options.tableName], null, []);
    };

    redoFuncs[SQLOps.RefreshTables] = function(options) {
        var deferred = PromiseHelper.deferred();
        var promises = [];
        for (var i = 0; i < options.tableNames.length; i++) {
            promises.push(TblManager.refreshTable.bind(this, [options.tableNames[i]], null, []));
        }
        PromiseHelper.chain(promises)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    redoFuncs[SQLOps.Sort] = function(options) {
        return TblManager.refreshTable([options.newTableName], null, [options.tableName]);
    };

    redoFuncs[SQLOps.DFRerun] = function(options) {
        return TblManager.refreshTable([options.newTableName], null, [options.tableName]);
    };

    redoFuncs[SQLOps.Finalize] = function(options) {
        return TblManager.refreshTable([options.newTableName], null, [options.tableName]);
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
                                                    tablesToReplace));
        }

        // next append new tables

        var tableId = options.tableId;
        for (var i = 0, len = newTables.length; i < len; i++) {
            var newTable = newTables[i];
            promises.push(TblManager.refreshTable.bind(window,
                                                    [newTable], null,
                                                    []));
        }

        return PromiseHelper.chain(promises);
    };

    /* END BACKEND OPERATIONS */

    /* Dag operations */

    redoFuncs[SQLOps.DisconnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ConnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        var isReconnect = options.prevParentNodeId != null;
        DagView.connectNodes(options.parentNodeId, options.childNodeId,
                            options.connectorIndex, options.dataflowId, isReconnect);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RemoveOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagView.removeNodes(options.nodeIds, options.dataflowId);
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
        DagView.moveNodes(options.dataflowId, options.nodeInfos);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.NewDagTab] = function() {
        DagTabManager.Instance.newTab();
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DupDagTab] = function(options) {
        var tab = DagTabManager.Instance.getTabById(options.dataflowId);
        if (tab != null) {
            DagTabManager.Instance.duplicateTab(tab);
        }
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditDescription] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.editDescription(options.nodeId, options.newDescription);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditNodeTitle] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.editNodeTitle(options.nodeId, options.dataflowId, options.newTitle);
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
        const dagTab = DagTabManager.Instance.getTabById(options.dataflowId);
        dagTab.turnOffSave();
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
        tasks = tasks.then(() => {
            dagTab.turnOnSave();
            return dagTab.save();
        })
        .fail((err) => {
            dagTab.turnOnSave();
            return PromiseHelper.reject(err);
        });
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
        return ColManager.pullCol(options.colNum, options.tableId,
                                        options.pullColOptions);
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

    /* END USER STYLING/FORMATING OPERATIONS */

    /* Table Operations */
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

    function focusTableHelper(options) {
        if (options.tableId !== gActiveTableId) {
            TblFunc.focusTable(options.tableId);
        }
    }

    return (Redo);
}(jQuery, {}));
