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
    undoFuncs[SQLOps.IndexDS] = function(options) {
        var tableId = xcHelper.getTableId(options.tableName);
        return (TblManager.sendTableToUndone(tableId, {'remove': true}));
    };

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

    undoFuncs[SQLOps.ExecSQL] = undoFuncs[SQLOps.IndexDS];

    undoFuncs[SQLOps.Sort] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };
        var sortOptions = options.options || {};
        TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, null, refreshOptions)
        .then(function() {
            if (isMostRecent && sortOptions.formOpenTime) {
                // XXX need to change to colNums plural once multisort is ready
                SortView.show([options.colNum], options.tableId, {
                    "restore": true,
                    "restoreTime": sortOptions.formOpenTime
                });
            }
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    };

    undoFuncs[SQLOps.Filter] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };

        if (options.fltOptions.complement) {
            var tableId = xcHelper.getTableId(options.newTableName);
            promise = TblManager.sendTableToUndone(tableId, {'remove': true});
        } else {
            promise = TblManager.refreshTable([options.tableName], null,
                                [options.newTableName], worksheet, null,
                                refreshOptions);
        }

        promise
        .then(function() {
            // show filter form if filter was triggered from the form and was
            // the most recent operation
            if (isMostRecent && options.formOpenTime) {
                OperationsView.show(null, null, null, {
                    "restore": true,
                    "restoreTime": options.formOpenTime
                });
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return (deferred.promise());
    };

    undoFuncs[SQLOps.Query] =function(options) {
        var deferred = PromiseHelper.deferred();
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };


        TblManager.refreshTable([options.tableName], null,
                                [options.newTableName], worksheet, null,
                                refreshOptions)
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return (deferred.promise());
    };

    undoFuncs[SQLOps.Map] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };
        var mapOptions = options.mapOptions || {};
        var promise;
        if (mapOptions.createNewTable) {
            var tableId = xcHelper.getTableId(options.newTableName);
            promise = TblManager.sendTableToUndone(tableId, {'remove': true});
        } else {
            promise = TblManager.refreshTable([options.tableName], null,
                                [options.newTableName],
                                worksheet, null, refreshOptions);
        }

        promise.then(function() {
            // show map form if map was triggered from the form and was the
            // most recent operation
            if (isMostRecent && mapOptions.formOpenTime) {
                OperationsView.show(null, null, null, {
                    "restore": true,
                    "restoreTime": mapOptions.formOpenTime
                });
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return (deferred.promise());
    };

    undoFuncs[SQLOps.Join] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var joinOptions = options.options || {};
        if (joinOptions.keepTables) {
            var tableId = xcHelper.getTableId(options.newTableName);
            TblManager.sendTableToUndone(tableId, {'remove': true})
            .then(function() {
                if (isMostRecent && joinOptions.formOpenTime) {
                    var joinOpts = {
                        restore: true,
                        restoreTime: joinOptions.formOpenTime
                    };
                    JoinView.show(null, null, joinOpts);
                }
                deferred.resolve();
            })
            .fail(deferred.reject);
            return deferred.promise();
        }

        var currTableId = xcHelper.getTableId(options.newTableName);
        var currTableWorksheet = WSManager.getWSFromTable(currTableId);

        var lJoinInfo = options.lJoinInfo;
        var rJoinInfo = options.rJoinInfo;

        var lTableWorksheet = lJoinInfo.ws;
        var rTableWorksheet = rJoinInfo.ws;

        var leftTable = {
            name: options.lTableName,
            id: lJoinInfo.tableId,
            position: lJoinInfo.tablePos,
            worksheet: lTableWorksheet
        };

        var rightTable = {
            name: options.rTableName,
            id: rJoinInfo.tableId,
            position: rJoinInfo.tablePos,
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

        var refreshOptions = {
            "isUndo": true,
            "position": firstTable.position,
            "replacingDest": TableType.Undone
        };
        TblManager.refreshTable([firstTable.name], null, [options.newTableName],
                                firstTable.worksheet, null, refreshOptions)
        .then(function() {
            if (isSelfJoin) {
                if (isMostRecent && joinOptions.formOpenTime) {
                    var joinOpts = {
                        restore: true,
                        restoreTime: joinOptions.formOpenTime
                    };
                    JoinView.show(null, null, joinOpts);
                }
                deferred.resolve();
            } else {
                var secondRefreshOptions = {
                    "isUndo": true,
                    "position": secondTable.position,
                    "replacingDest": TableType.Undone
                };
                TblManager.refreshTable([secondTable.name], null, [],
                                        secondTable.worksheet, null,
                                        secondRefreshOptions)
                .then(function() {
                    if (isMostRecent && joinOptions.formOpenTime) {
                        var joinOpts = {
                            restore: true,
                            restoreTime: joinOptions.formOpenTime
                        };
                        JoinView.show(null, null, joinOpts);
                    }
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    undoFuncs[SQLOps.Union] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var unionOptions = options.options || {};
        var promises = [];
        var tableId = xcHelper.getTableId(options.newTableName);
        promises.push(TblManager.sendTableToUndone.bind(window, tableId,
                                                        {'remove': true}));

        if (!unionOptions.keepTables) {
            // in case one table is used serveral times
            var tableInfoMap = {};
            options.tableNames.forEach(function(tableName, index) {
                tableInfoMap[tableName] = options.tableInfos[index];
            });

            for (var tableName in tableInfoMap) {
                var tableInfo = tableInfoMap[tableName];
                var worksheet = tableInfo.ws;
                var refreshOptions = {
                    "isUndo": true,
                    "position": tableInfo.tablePos,
                    "replacingDest": TableType.Undone
                };
                promises.push(TblManager.refreshTable.bind(window, [tableName],
                                                        null, [], worksheet,
                                                        null, refreshOptions));
            }
        }

        PromiseHelper.chain(promises)
        .then(function() {
            if (isMostRecent && unionOptions.formOpenTime) {
                var options = {
                    restore: true,
                    restoreTime: unionOptions.formOpenTime
                };
                UnionView.show(null, null, options);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    undoFuncs[SQLOps.GroupBy] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var tableId = xcHelper.getTableId(options.newTableName);
        var promise;
        if (options.options && options.options.isJoin ||
            !options.options.isKeepOriginal) {
            var worksheet = WSManager.getWSFromTable(tableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            promise = TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, null, refreshOptions);
        } else {
            promise = TblManager.sendTableToUndone(tableId, {'remove': true});
        }
        promise.then(function() {
            if (isMostRecent &&
                (options.options && options.options.formOpenTime)) {
                OperationsView.show(null, null, null, {
                    "restore": true,
                    "restoreTime": options.options.formOpenTime
                });
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return (deferred.promise());
    };

    undoFuncs[SQLOps.SplitCol] = function(options) {
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };
        return TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, null, refreshOptions);
    };

    undoFuncs[SQLOps.ChangeType] = function(options) {
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };
        return TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, null, refreshOptions);
    };

    undoFuncs[SQLOps.Project] = function(options, isMostRecent) {
        var deferred = PromiseHelper.deferred();
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };
        TblManager.refreshTable([options.tableName], null,
                                        [options.newTableName], worksheet, null,
                                        refreshOptions)
        .then(function() {
            if (isMostRecent && options.formOpenTime) {
                ProjectView.show(null, null, {
                    "restore": true,
                    "restoreTime": options.formOpenTime
                });
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });

        return (deferred.promise());
    };

    undoFuncs[SQLOps.DFRerun] = function(options) {
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);

        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };

        return TblManager.refreshTable([options.tableName], null,
                                [options.newTableName], worksheet, null,
                                refreshOptions);
    };

    undoFuncs[SQLOps.Finalize] = function(options) {
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };
        return TblManager.refreshTable([options.tableName], null,
                                        [options.newTableName], worksheet, null,
                                        refreshOptions);
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
            var refreshOptions = {
                "isUndo": true,
                "replacingDest": TableType.Undone
            };
            var worksheet;
            for (var i = 0; i < oldTables.length; i++) {
                var oldTable = oldTables[i];
                if (i === 0) {
                    worksheet = WSManager.getWSFromTable(xcHelper.getTableId(table));
                    promises.push(TblManager.refreshTable.bind(window,
                                                            [oldTable], null,
                                                            [table], null, null,
                                                            refreshOptions));
                } else {
                    promises.push(TblManager.refreshTable.bind(window,
                                                            [oldTable], null,
                                                            [], worksheet, null,
                                                            refreshOptions));
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

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };
    /* END BACKEND OPERATIONS */

    /* Dataflow operations */

    undoFuncs[SQLOps.DisconnectOperation] = function(options) {
        DagTabManager.Instance.switchTabId(options.dataflowId);
        DagView.connectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ConnectOperations] = function(options) {
        DagTabManager.Instance.switchTabId(options.dataflowId);
        DagView.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.RemoveOperations] = function(options) {
        DagTabManager.Instance.switchTabId(options.dataflowId);
        DagView.addBackNodes(options.nodeIds);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.AddOperation] = function(options) {
        DagTabManager.Instance.switchTabId(options.dataflowId);
        DagView.removeNodes([options.nodeId])
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.CopyOperations] = function(options) {
        DagTabManager.Instance.switchTabId(options.dataflowId);
        DagView.removeNodes(options.nodeIds);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.MoveOperations] = function(options) {
        DagTabManager.Instance.switchTabId(options.dataflowId);
        DagView.moveNodes(options.nodeIds, options.oldPositions);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.NewDagTab] = function(options) {
        var deferred = PromiseHelper.deferred();
        DagList.Instance.deleteDataflow($("#dagListSection .dagListDetail").last())
        .then(() => {
            DagTabManager.Instance.decrementUID();
            return deferred.resolve();
        })
        .fail((error) => {
            return deferred.reject();
        });
        return deferred.promise();
    };

    undoFuncs[SQLOps.RemoveDagTab] = function(options) {
        DagTabManager.Instance.loadTab(options.key, options.index);
        return PromiseHelper.resolve(null);
    };

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
        if (options.pullColOptions.source === "fnBar") {
            if (options.wasNewCol) {
                var col = gTables[options.tableId].getCol(options.colNum);
                col.userStr = options.origUsrStr;
                col.setBackColName(options.backName);
                col.type = options.type;
                col.func = options.func;
                col.isNewCol = options.wasNewCol;
                var $table = $('#xcTable-' + options.tableId);
                $table.find('td.col' + options.colNum).empty();
                var $th = $table.find('th.col' + options.colNum);
                $th.addClass('newColumn')
                    .removeClass("sortable indexedColumn")
                    .find('.header').attr('class', 'header')
                    .find('.iconHelper').attr('title', '')
                    .end()
                    .find('.prefix').addClass('immediate');
                TPrefix.updateColor(options.tableId, options.colNum);
                return PromiseHelper.resolve(null);
            } else {
                return (ColManager.execCol("pull", options.origUsrStr,
                                       options.tableId, options.colNum,
                                        {undo: true, backName: options.backName}));
            }
        } else {
            var colNum = options.colNum;
            if (options.direction === ColDir.Right) {
                colNum++;
            }
            return (ColManager.hideCol([colNum], options.tableId));
        }
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

    undoFuncs[SQLOps.Round] = function(options) {
        var newTableId = xcHelper.getTableId(options.newTableName);
        var worksheet = WSManager.getWSFromTable(newTableId);
        var refreshOptions = {
            isUndo: true,
            replacingDest: TableType.Undone
        };
        return TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, null, refreshOptions);
    };
    /* END USER STYLING/FORMATING OPERATIONS */


    /* Table Operations */
    undoFuncs[SQLOps.RenameTable] = function(options) {
        focusTableHelper(options);
        var tableId = options.tableId;
        var oldTableName = options.oldTableName;

        return xcFunction.rename(tableId, oldTableName);
    };

    undoFuncs[SQLOps.RevertTable] = function(options) {
        var deferred = PromiseHelper.deferred();

        var worksheet = WSManager.getWSFromTable(options.tableId);
        TblManager.refreshTable([options.oldTableName], null,
                                [options.tableName], worksheet, null,
                            {isUndo: true, from: TableType.Orphan})
        .then(function() {
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
        // var hasTableInActiveWS = false;
        for (var i = 0, len = tableNames.length; i < len; i++) {
            var tableId = xcHelper.getTableId(tableNames[i]);
            tableIds.push(tableId);
        }

        if (tableType === TableType.Orphan) {
            tableIds.forEach(function(tId) {
                TblManager.sendTableToOrphaned(tId, {
                    "remove": true
                });
            });
            return TableList.refreshOrphanList();
        } else {
            console.error(tableType, "not support undo!");
            return PromiseHelper.resolve(null);
        }
    };

    undoFuncs[SQLOps.ReorderTable] = function(options) {
        focusTableHelper(options);
        TblFunc.reorderAfterTableDrop(options.tableId, options.desIndex,
                                      options.srcIndex, {moveHtml: true});
        return PromiseHelper.resolve(null);
    };

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
        TPrefix.markColor(options.prefix, options.oldColor);
        return PromiseHelper.resolve(null);
    };
    /* End of Table Operations */


    /* Worksheet Opeartion */
    undoFuncs[SQLOps.AddWS] = function(options) {
        WSManager.delWS(options.worksheetId, DelWSType.Empty);
        WSManager.focusOnWorksheet(options.currentWorksheet);

        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.RenameWS] = function(options) {
        WSManager.renameWS(options.worksheetId, options.oldName);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ReorderWS] = function(options) {
        var oldWSIndex = options.oldWorksheetIndex;
        var newWSIndex = options.newWorksheetIndex;

        WSManager.reorderWS(newWSIndex, oldWSIndex);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.MoveTableToWS] = function(options) {
        var tableId = options.tableId;
        var oldWS = options.oldWorksheetId;
        var tablePos = options.oldTablePos;
        WSManager.moveTable(tableId, oldWS, null, tablePos);
        WSManager.focusOnWorksheet(oldWS, false, tableId);
        return PromiseHelper.resolve();
    };

    undoFuncs[SQLOps.MoveTemporaryTableToWS] = function(options) {
        var deferred = PromiseHelper.deferred();
        var tableId = options.tableId;
        var tableType = options.tableType;

        if (tableType === TableType.Orphan) {
            TblManager.sendTableToOrphaned(tableId, {"remove": true})
            .then(function() {
                deferred.resolve();
            })
            .fail(function() {
                deferred.reject();
            });
        } else {
            console.error(tableType, "cannot undo!");
            deferred.resolve();
        }

        return deferred.promise();
    };

    undoFuncs[SQLOps.HideWS] = function(options) {
        var wsId = options.worksheetId;
        var wsIndex = options.worksheetIndex;
        return WSManager.unhideWS(wsId, wsIndex);
    };

    undoFuncs[SQLOps.UnHideWS] = function(options) {
        var wsIds = options.worksheetIds;

        for (var i = 0, len = wsIds.length; i < len; i++) {
            WSManager.hideWS(wsIds[i]);
        }

        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.MakeTemp] = function(options) {
        var deferred = PromiseHelper.deferred();

        var promises = [];
        var failures = [];
        options.tableNames.forEach(function(tableName, index) {
            promises.push((function() {
                var innerDeferred = PromiseHelper.deferred();

                var refreshOptions = {
                    "isUndo": true,
                    "position": options.tablePos[index]
                };

                TblManager.refreshTable([tableName], null, [], options.workSheets[index], null, refreshOptions)
                .then(function(){
                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    failures.push(tableName + ": {" + xcHelper.parseError(error) + "}");
                    innerDeferred.resolve(error);
                });

                return innerDeferred.promise();
            }).bind(this));
        });

        PromiseHelper.chain(promises)
        .then(function() {
            if (failures.length > 0) {
                deferred.reject(failures.join("\n"));
            } else {
                deferred.resolve();
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    undoFuncs[SQLOps.DelWS] = function(options) {
        var delType = options.delType;
        var wsId = options.worksheetId;
        var wsName = options.worksheetName;
        var wsIndex = options.worksheetIndex;
        var tables = options.tables;
        var promises = [];

        if (delType === DelWSType.Empty) {
            makeWorksheetHelper();

            return PromiseHelper.resolve(null);
        } else if (delType === DelWSType.Del) {
            makeWorksheetHelper();

            tables.forEach(function(tableId) {
                promises.push(WSManager.moveTemporaryTable.bind(this,
                    tableId, wsId, TableType.Orphan));
            });

            promises.push(TableList.refreshOrphanList.bind(this));

            return PromiseHelper.chain(promises);
        } else if (delType === DelWSType.Temp) {
            makeWorksheetHelper();
            tables.forEach(function(tableId) {
                promises.push(WSManager.moveTemporaryTable.bind(this,
                    tableId, wsId, TableType.Orphan));
            });
            promises.push(TableList.refreshOrphanList.bind(this));

            return PromiseHelper.chain(promises);
        } else {
            console.error("Unexpected delete worksheet type");
            return PromiseHelper.reject(null);
        }

        function makeWorksheetHelper() {
            WSManager.addWS(wsId, wsName, wsIndex);
            var $tabs = $("#worksheetTabs .worksheetTab");
            var $tab = $tabs.eq(wsIndex);
            if (($tab.data("ws") !== wsId)) {
                $("#worksheetTab-" + wsId).insertBefore($tab);
            }
        }
    };
    /* End of Worksheet Operation */
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
            TblFunc.focusTable(options.tableId, true);
        }
    }

    return (Undo);
}(jQuery, {}));

