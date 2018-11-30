window.Undo = (function($, Undo) {
    var undoFuncs = {};

    // isMostRecent - boolean, true if it's the most recent operation performed
    Undo.run = function(xcLog, isMostRecent) {
        xcAssert((xcLog != null), "invalid log");

        var deferred = PromiseHelper.deferred();

        var options = xcLog.getOptions();
        var operation = xcLog.getOperation();

        if (undoFuncs.hasOwnProperty(operation)) {
            var minModeCache = gMinModeOn;
            // do not use any animation
            gMinModeOn = true;
            undoFuncs[operation](options, isMostRecent)
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
    undoFuncs[SQLOps.RefreshTables] = function(options) {
        var deferred = PromiseHelper.deferred();
        var promises = [];
        for (var i = 0; i < options.tableNames.length; i++) {
            var tableId = xcHelper.getTableId(options.tableNames[i]);
            promises.push(TblManager.sendTableToUndone.bind(this, tableId, {'remove': true}))
        }
        PromiseHelper.chain(promises)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    undoFuncs[SQLOps.ExecSQL] = function(options) {
        var deferred = PromiseHelper.deferred();
        var opStruct;
        try {
            qStruct = JSON.parse(options.query);
        } catch (e) {
            deferred.reject(e);
        }
        var promises = [];
        for (var i = 0; i < qStruct.length; i++) {
            var tableId = xcHelper.getTableId(qStruct[i].args.dest);
            promises.push(TblManager.sendTableToUndone.bind(this, tableId, {'remove': true}));
        }
        PromiseHelper.chain(promises)
        .then(deferred.resolve)
        .fail(deferred.reject)

        return deferred.promise();
    };

    undoFuncs[SQLOps.Sort] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var newTableId = xcHelper.getTableId(options.newTableName);
        var sortOptions = options.options || {};
        return TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName]);
    };

    undoFuncs[SQLOps.DFRerun] = function(options) {
        var newTableId = xcHelper.getTableId(options.newTableName);
        return TblManager.refreshTable([options.tableName], null,
                                [options.newTableName]);
    };

    undoFuncs[SQLOps.Finalize] = function(options) {
        var newTableId = xcHelper.getTableId(options.newTableName);
        return TblManager.refreshTable([options.tableName], null,
                                        [options.newTableName]);
    };

    undoFuncs[SQLOps.Ext] = function(options, isMostRecent) {
        // XXX As extension can do anything, it may need fix
        // as we add more extensions and some break the current code

        // Tested: Window, hPartition, genRowNum, union

        // var tableId = options.tableId;
        var newTables = options.newTables || [];
        var replace = options.replace || {};
        var extOptions = options.options || {};
        // undo new append table, just hide newTables
        var promises = [];
        var deferred = PromiseHelper.deferred();

        newTables.forEach(function(newTableName) {
            var newTableId = xcHelper.getTableId(newTableName);
            promises.push(TblManager.sendTableToUndone.bind(window, newTableId,
                                                            {'remove': true}));
        });

        for (var table in replace) {
            var oldTables = replace[table];
            for (var i = 0; i < oldTables.length; i++) {
                var oldTable = oldTables[i];
                if (i === 0) {
                    promises.push(TblManager.refreshTable.bind(window,
                                                            [oldTable], null,
                                                            [table]));
                } else {
                    promises.push(TblManager.refreshTable.bind(window,
                                                            [oldTable], null,
                                                            []));
                }
            }
        }

        PromiseHelper.chain(promises)
        .then(function() {
            if (isMostRecent) {
                ExtensionManager.openView(null, null, {
                    "restoreTime": extOptions.formOpenTime
                });
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };
    /* END BACKEND OPERATIONS */

    /* Dataflow operations */
    undoFuncs[SQLOps.DisconnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.connectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex, options.dataflowId, false, options.wasSpliced);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ConnectOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex, options.dataflowId);
        if (options.prevParentNodeId) {
            DagView.connectNodes(options.prevParentNodeId, options.childNodeId,
                                 options.connectorIndex, options.dataflowId);
        }
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.RemoveOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.addBackNodes(options.nodeIds, options.dataflowId, options.spliceInfo);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.AddOperation] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.removeNodes([options.nodeId], options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.CopyOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.removeNodes(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.MoveOperations] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        const nodeInfos = [];
        options.nodeInfos.forEach(function(nodeInfo) {
            nodeInfos.push({
                type: nodeInfo.type,
                position: nodeInfo.oldPosition,
                id: nodeInfo.id
            });
        })
        DagView.moveNodes(options.dataflowId, nodeInfos);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.NewDagTab] = function() {
        return DagList.Instance.deleteDataflow($("#dagListSection .dagListDetail").last());
    };

    undoFuncs[SQLOps.EditDescription] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.editDescription(options.nodeId, options.oldDescription);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.EditNodeTitle] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.editNodeTitle(options.nodeId, options.dataflowId, options.oldTitle);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.NewComment] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.removeNodes([options.commentId], options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.EditComment] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagComment.Instance.updateText(options.commentId, options.oldComment);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.DagBulkOperation] = function(options) {
        const dagTab = DagTabManager.Instance.getTabById(options.dataflowId);
        dagTab.turnOffSave();
        let tasks = PromiseHelper.resolve();
        if (options.actions != null) {
            for (let i = options.actions.length - 1; i >= 0; i --) {
                const action = options.actions[i];
                const operation = action.operation;
                if (operation == null || !undoFuncs.hasOwnProperty(operation)) {
                    console.error(`Undo function for ${operation} not supported`);
                    continue;
                }
                const undoFunc = undoFuncs[operation];
                tasks = tasks.then(() => undoFunc(action));
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

    undoFuncs[SQLOps.DrawNodesAndConnections] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.eraseNodesAndConnections(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    }

    undoFuncs[SQLOps.EraseNodesAndConnections] = function(options) {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagView.drawNodesAndConnections(options.nodeIds, options.dataflowId);
        return PromiseHelper.resolve(null);
    }
    /* USER STYLING/FORMATING OPERATIONS */

    undoFuncs[SQLOps.MinimizeCols] = function(options) {
        focusTableHelper(options);
        return ColManager.maximizeCols(options.colNums, options.tableId);
    };

    undoFuncs[SQLOps.MaximizeCols] = function(options) {
        focusTableHelper(options);
        return ColManager.minimizeCols(options.colNums, options.tableId);
    };

    undoFuncs[SQLOps.AddNewCol] = function(options) {
        focusTableHelper(options);
        var colNum = options.colNum;
        if (options.direction === ColDir.Right) {
            colNum++;
        }
        return ColManager.hideCol([colNum], options.tableId);
    };

    undoFuncs[SQLOps.HideCol] = function(options) {
        undoDeleteHelper(options, -1);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.PullCol] = function(options) {
        focusTableHelper(options);
        var colNum = options.colNum;
        if (options.direction === ColDir.Right) {
            colNum++;
        }
        return (ColManager.hideCol([colNum], options.tableId));
    };

    undoFuncs[SQLOps.PullMultipleCols] = function(options) {
        focusTableHelper(options);
        return (ColManager.hideCol(options.colNums, options.tableId,
                                 {"noAnimate": true}));
    };

    undoFuncs[SQLOps.ReorderCol] = function(options) {
        focusTableHelper(options);
        ColManager.reorderCol(options.tableId, options.newColNum,
                              options.oldColNum, {"undoRedo": true});
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.SortTableCols] = function(options) {
        focusTableHelper(options);
        TblManager.orderAllColumns(options.tableId, options.originalOrder);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ResizeTableCols] = function(options) {
        focusTableHelper(options);
        TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                     options.oldColumnWidths,
                                     options.oldSizedTo, options.wasHidden);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.DragResizeTableCol] = function(options) {
        focusTableHelper(options);
        TblAnim.resizeColumn(options.tableId, options.colNum, options.toWidth,
                             options.fromWidth, options.oldSizedTo);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.DragResizeRow] = function(options) {
        focusTableHelper(options);
        TblAnim.resizeRow(options.rowNum, options.tableId, options.toHeight,
                          options.fromHeight);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.RenameCol] = function(options) {
        focusTableHelper(options);
        ColManager.renameCol(options.colNum, options.tableId, options.colName, {
            "keepEditable": options.wasNew,
            "prevWidth": options.prevWidth
        });
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.TextAlign] = function(options) {
        focusTableHelper(options);
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
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ChangeFormat] = function(options) {
        focusTableHelper(options);
        ColManager.format(options.colNums, options.tableId, options.oldFormats);
        return PromiseHelper.resolve(null);
    };
    /* END USER STYLING/FORMATING OPERATIONS */


    /* Table Operations */
    undoFuncs[SQLOps.HideTable] = function(options) {
        focusTableHelper(options);
        TblManager.unHideTable(options.tableId);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.UnhideTable] = function(options) {
        focusTableHelper(options);
        TblManager.hideTable(options.tableId);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.MarkPrefix] = function(options) {
        TableComponent.getPrefixManager().markColor(options.prefix, options.oldColor);
        return PromiseHelper.resolve(null);
    };
    /* End of Table Operations */
   
    // for undoing deleted table columns
    function undoDeleteHelper(options, shift) {
        focusTableHelper(options);
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

        var jsonData = [];
        $table.find('tbody').find('.col' + dataIndex).each(function() {
            jsonData.push($(this).find('.originalData').text());
        });

        var tableHtml = TblManager.generateTheadTbody(tableId);
        var rowNum = xcHelper.parseRowNum($table.find('tbody').find('tr:eq(0)'));

        $table.html(tableHtml);

        TblManager.pullRowsBulk(tableId, jsonData, rowNum, RowDirection.Bottom);
        TblManager.addColListeners($table, tableId);
        TblManager.updateHeaderAndListInfo(tableId);
        TblFunc.moveFirstColumn();
    }

    function focusTableHelper(options) {
        if (options.tableId !== gActiveTableId) {
            TblFunc.focusTable(options.tableId);
        }
    }

    return (Undo);
}(jQuery, {}));

