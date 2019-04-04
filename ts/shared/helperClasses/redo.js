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
    redoFuncs[SQLOps.Sort] = function(options) {
        return TblManager.refreshTable([options.newTableName], null, [options.tableName]);
    };

    redoFuncs[SQLOps.DFRerun] = function(options) {
        return TblManager.refreshTable([options.newTableName], null, [options.tableName]);
    };

    redoFuncs[SQLOps.Finalize] = function(options) {
        return TblManager.refreshTable([options.newTableName], null, [options.tableName]);
    };

    /* END BACKEND OPERATIONS */

    /* Dag operations */

    redoFuncs[SQLOps.DisconnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ConnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        var isReconnect = options.prevParentNodeId != null;
        DagViewManager.Instance.connectNodes(options.parentNodeId, options.childNodeId,
                            options.connectorIndex, options.dataflowId, isReconnect, options.spliceIn);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RemoveOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.removeNodes(options.nodeIds, options.dataflowId);
    };

    redoFuncs[SQLOps.AddOperation] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.addBackNodes([options.nodeId], options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.CopyOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.addBackNodes(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.MoveOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.moveNodes(options.dataflowId, options.nodeInfos);
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
        DagViewManager.Instance.editDescription(options.nodeId, options.newDescription);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditNodeTitle] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.editNodeTitle(options.nodeId, options.dataflowId, options.newTitle);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.NewComment] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.addBackNodes([options.commentId], options.dataflowId);
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
