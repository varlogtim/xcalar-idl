window.Undo = (function($, Undo) {

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
            console.error("Unknown operation", operation);
            deferred.reject("Unknown operation");

        }

        return (deferred.promise());
    };


    var undoFuncs = {
        sort: function(options) {

        },

        filter: function(options) {
            var worksheet = WSManager.getWSFromTable(options.tableId);
            return(TblManager.refreshTable([options.tableName], null,
                                           [options.newTableName],
                                           worksheet, {isUndo: true}));
        },

        aggregate: function(options) {

        },

        map: function(options) {
            var worksheet = WSManager.getWSFromTable(options.tableId);
            return(TblManager.refreshTable([options.tableName], null,
                                           [options.newTableName],
                                           worksheet, {isUndo: true}));
        },

        join: function(options) {
            var deferred = jQuery.Deferred();

            var currTableId = xcHelper.getTableId(options.newTableName);
            var currTableWorksheet = WSManager.getWSFromTable(currTableId);

            var lTableWorksheet = WSManager.getWSFromTable(options.lTableId);
            var rTableWorksheet = WSManager.getWSFromTable(options.rTableId);

            var leftTable = {
                name: options.lTableName,
                id: options.lTableId,
                position: options.lTablePos,
                worksheet: lTableWorksheet
            };

            var rightTable = {
                name: options.rTableName,
                id: options.rTableId,
                position: options.rTablePos,
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

            if (currTableWorksheet !== leftTable.worksheet  &&
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
        },

        groupBy: function(options) {

        },

        renameTable: function(options) {

        },

        deleteTable: function(options) {

        },

        destroyDataSet: function(options) {

        },

        exportTable: function(options) {

        },

        addNewCol: function(options) {

        },

        deleteCol: function(options) {

        },

        hideCols: function(options) {
            ColManager.unhideCols(options.colNums, options.tableId);
            return (promiseWrapper(null));
        },

        unHideCols: function(options) {
            ColManager.hideCols(options.colNums, options.tableId);
            return (promiseWrapper(null));
        },

        duplicateCol: function(options) {

        },

        delDupCol: function(options) {

        },

        delAllDupCols: function(options) {

        },

        textAlign: function(options) {

        },

        reorderTable: function(options) {

        },

        reorderCol: function(options) {

        },

        renameCol: function(options) {

        },

        pullCol: function(options) {

        },

        archiveTable: function(options) {

        },

        // tableBulkActions: function(options) {
        //     var action = options.action;
        //     var tableType = options.tableType;
        //     var tableName = options.tableName;
        //     var tableId;

        //     if (tableType === TableType.InActive) {
        //         tableId = getTableId(xcHelper.getTableId(tableName));
        //         $('#inactiveTablesList .tableInfo[data-id="' +
        //                 tableId + '"] .addTableBtn').click();
        //     } else if (tableType === TableType.Orphan) {
        //         $('#orphanedTableList .tableInfo[data-tablename="' +
        //                 tableName + '"] .addTableBtn').click();
        //     } else {
        //         console.error("Invalid table bulk action");
        //         return (promiseWrapper(null));
        //     }

        //     return (TableList.tableBulkAction(action, tableType));
        // },

        sortTableCols: function(options) {

        },

        resizeTableCols: function(options) {

        },

        dragResizeTableCol: function(options, isReverse) {

        },

        hideTable: function(options) {

        },

        unhideTable: function(options) {

        },

        addWorksheet: function(options) {

        },

        renameWorksheet: function(options) {

        },

        switchWorksheet: function(options) {

        },

        reorderWorksheet: function(options) {

        },

        deleteWorksheet: function(options) {

        },

        moveTableToWorkSheet: function(options) {

        },

        // addNoSheetTables: function(options) {
        //     var tableIds = options.tableIds;
        //     for (var i = 0, len = tableIds.length; i < len; i++) {
        //         tableIds[i] = getTableId(tableIds[i]);
        //     }

        //     var wsIndex = options.worksheetIndex;
        //     var wsId    = WSManager.getOrders()[wsIndex];

        //     WSManager.addNoSheetTables(tableIds, wsId);
        //     return (promiseWrapper(null));
        // },

        moveInactiveTableToWorksheet: function(options) {

        },

        createFolder: function(options) {

        },

        dsRename: function(options) {

        },

        profile: function(options, keepOpen) {

        },

        profileSort: function(options, keepOpen) {

        },

        profileBucketing: function(options, keepOpen) {

        },

        quickAgg: function(options) {

        },

        correlation: function(options) {

        },

        addOtherUserDS: function(options) {

        },

        splitCol: function(options) {

        },

        changeType: function(options) {

        },

        changeFormat: function(options) {

        },

        roundToFixed: function(options) {

        },

        // correlationAction: function(options) {

        // },

        // groupByAction: function(options) {

        // },

        // renameOrphanTable: function(options) {

        // },

        // addDataset: function(options) {

        // },
        // horizontalPartitionAction: function(options) {

        // },

        // changeTypeMap: function(options) {

        // },

        // profileAction: function(options) {

        // },
        // spltColMap: function(options) {

        // },

        // previewDataSet: function(options) {

        // },

        // multiJoinMap: function(options) {

        // },

        // window: function(options) {

        // },

        // horizontalPartition: function(options) {

        // },

        // destroyPreviewDataSet: function(options) {

        // },

        // quickAggAction: function(options) {

        // },

        // checkIndex: function(options) {

        // },

        // windowAction: function(options) {

        // },
    };

    return (Undo);
}(jQuery, {}));

