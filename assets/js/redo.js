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


    var redoFuncs = {

        sort: function(options) {

        },

        filter: function(options) {
            var worksheet = WSManager.getWSFromTable(options.tableId);
            return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet, {isRedo: true}));
        },

        aggregate: function(options) {

        },

        map: function(options) {
            var worksheet = WSManager.getWSFromTable(options.tableId);
            return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet, {isRedo: true}));
        },

        join: function(options) {
            var deferred = jQuery.Deferred();
            TblManager.refreshTable([options.newTableName], null,
                                    [options.lTableName, options.rTableName],
                                     options.worksheet,
                                     {isRedo: true})
            .then(deferred.resolve)
            .fail(deferred.fail);

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
            // UI simulation
            var deferred  = jQuery.Deferred();
            var tableId   = getTableId(options.tableId);
            var $mainMenu = $("#colMenu .addColumn.parentMenu");
            var $subMenu  = $("#colSubMenu");
            var $li;

            $("#xcTable-" + tableId + " .th.col" + options.siblColNum +
                                                    " .dropdownBox").click();
            if (options.direction === "L") {
                $li = $subMenu.find(".addColumn .addColLeft");
            } else {
                $li = $subMenu.find(".addColumn .addColRight");
            }

            $mainMenu.trigger(fakeEvent.mouseenter);

            var callback = function() {
                $li.trigger(fakeEvent.mouseup);
            };

            delayAction(callback, "Show Col Menu", 2000)
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        deleteCol: function(options) {
            var args = getArgs(options);
            ColManager.delCol.apply(window, args);

            return (promiseWrapper(null));
        },

        hideCols: function(options) {
            ColManager.hideCols(options.colNums, options.tableId);
            return (promiseWrapper(null));
        },

        unHideCols: function(options) {
            ColManager.unhideCols(options.colNums, options.tableId);
            return (promiseWrapper(null));
        },

        duplicateCol: function(options) {
            var args = getArgs(options);
            return (ColManager.dupCol.apply(window, args));
        },

        delDupCol: function(options) {
            var args = getArgs(options);
            ColManager.delDupCols.apply(window, args);
            return (promiseWrapper(null));
        },

        delAllDupCols: function(options) {
            var args = getArgs(options);
            ColManager.delAllDupCols.apply(window, args);
            return (promiseWrapper(null));
        },

        textAlign: function(options) {
            var args = getArgs(options);
            ColManager.textAlign.apply(window, args);

            return (promiseWrapper(null));
        },

        reorderTable: function(options) {
            var args = getArgs(options);

            var tableId  = getTableId(options.tableId);
            var srcIndex = options.srcIndex;
            var desIndex = options.desIndex;

            var wsIndex = WSManager.getWSFromTable(tableId);

            var $tables = $(".xcTableWrap.worksheet-" + wsIndex);
            var $table  = $tables.eq(srcIndex);
            var $targetTable = $tables.eq(desIndex);

            if (desIndex > srcIndex) {
                $table.insertAfter($targetTable);
            } else {
                $table.insertBefore($targetTable);
            }

            reorderAfterTableDrop.apply(window, args);

            return (promiseWrapper(null));
        },

        reorderCol: function(options) {
            var args = getArgs(options);

            var tableId = getTableId(options.tableId);
            var oldColNum = options.oldColNum;
            var newColNum = options.newColNum;

            var $table = $("#xcTable-" + tableId);

            if (newColNum > oldColNum) {
                $table.find('tr').each(function() {
                    var $tr = $(this);
                    $tr.children(':eq(' + oldColNum + ')').insertAfter(
                        $tr.children(':eq(' + newColNum + ')')
                    );
                });
            } else {
                $table.find('tr').each(function() {
                    var $tr = $(this);
                    $tr.children(':eq(' + oldColNum + ')').insertBefore(
                        $tr.children(':eq(' + newColNum + ')')
                    );
                });
            }

            // HACK: weird hack, otherwise .header won't reposition itself
            $table.find('.header').css('height', '39px');
            setTimeout(function() {
                $table.find('.header').css('height', '40px');
            }, 0);

            ColManager.reorderCol.apply(window, args);

            return (promiseWrapper(null));
        },

        renameCol: function(options) {
            var args = getArgs(options);
            ColManager.renameCol.apply(window, args);
            return (promiseWrapper(null));
        },

        pullCol: function(options) {
            var args = getArgs(options);
            return (ColManager.pullCol.apply(window, args));
        },

        archiveTable: function(options) {
            // UI simulation
            var deferred = jQuery.Deferred();
            var tableId = getTableId(options.tableId);
            var $li = $("#tableMenu .archiveTable");

            $("#xcTheadWrap-" + tableId + " .dropdownBox").click();

            $li.mouseenter();

            var callback = function() {
                $li.mouseleave();
                $li.trigger(fakeEvent.mouseup);
            };
            delayAction(callback, "Show Table Menu", 2000)
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
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
            var args = getArgs(options);
            TblManager.sortColumns.apply(window, args);
            return (promiseWrapper(null));
        },

        resizeTableCols: function(options) {
            var args = getArgs(options);
            TblManager.resizeColumns.apply(window, args);

            return promiseWrapper(null);
        },

        dragResizeTableCol: function(options, isReverse) {
            var args = getArgs(options);
            console.log('resized replay');
            TblAnim.resizeColumn.apply(window, args);

            return promiseWrapper(null);
        },

        hideTable: function(options) {
            var args = getArgs(options);
            TblManager.hideTable.apply(window, args);
            return promiseWrapper(null);
        },

        unhideTable: function(options) {
            var args = getArgs(options);
            TblManager.unHideTable.apply(window, args);
            return promiseWrapper(null);
        },

        addWorksheet: function(options) {
            // UI simulation
            var deferred    = jQuery.Deferred();
            var originWSLen = WSManager.getWSLen();

            $("#addWorksheet").click();

            var checkFunc = function() {
                var wsLenDiff = WSManager.getWSLen() - originWSLen;
                if (wsLenDiff === 1) {
                    // when worksheet is added, pass check
                    return true;
                } else if (wsLenDiff === 0) {
                    // when worksheet not craeted yet, keep checking
                    return false;
                } else {
                    // invalid case, fail check
                    return null;
                }
            };

            checkHelper(checkFunc, "Worksheet added")
            .then(deferred.resolve)
            .fail(deferred.reject);


            return (deferred.promise());
        },

        renameWorksheet: function(options) {
            var wsIndex = options.worksheetIndex;
            var newName = options.newName;
            var wsId = WSManager.getOrders()[wsIndex];
            $("#worksheetTab-" + wsId + " .text").text(newName)
                                                .trigger(fakeEvent.enter);
            return (promiseWrapper(null));
        },

        switchWorksheet: function(options) {
            // UI simulation
            var deferred = jQuery.Deferred();
            var wsIndex  = options.newWorksheetIndex;
            var wsId = WSManager.getOrders()[wsIndex];

            $("#worksheetTab-" + wsId).click();

            delayAction(null, "Wait", 2000)
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        reorderWorksheet: function(options) {
            var oldWSIndex = options.oldWorksheetIndex;
            var newWSIndex = options.newWorksheetIndex;

            var $tabs = $("#worksheetTabs .worksheetTab");
            var $dragTab = $tabs.eq(oldWSIndex);
            var $targetTab = $tabs.eq(newWSIndex);

            if (newWSIndex > oldWSIndex) {
                $targetTab.after($dragTab);
            } else if (newWSIndex < oldWSIndex) {
                $targetTab.before($dragTab);
            } else {
                console.error("Reorder error, same worksheet index!");
            }

            WSManager.reorderWS(oldWSIndex, newWSIndex);

            return promiseWrapper(null);
        },

        deleteWorksheet: function(options) {
            // UI simulation
            var deferred    = jQuery.Deferred();
            var originWSLen = WSManager.getWSLen();
            var wsIndex     = options.worksheetIndex;
            var tableAction = options.tableAction;
            var wsId        = WSManager.getOrders()[wsIndex];

            if (originWSLen === 1) {
                // invalid deletion
                console.error("This worksheet should not be deleted!");
                deferred.reject("This worksheet should not be deleted!");
            }

            $("#worksheetTab-" + wsId + " .delete").click();

            var callback = function() {
                if ($("#alertModal").is(":visible")) {
                    if (tableAction === "delete") {
                        $("#alertActions .deleteTale").click();
                    } else if (tableAction === "archive") {
                        $("#alertActions .archiveTable").click();
                    }
                }
            };

            delayAction(callback, "Wait", 2000)
            .then(function() {
                var checkFunc = function() {
                    var wsLenDiff = WSManager.getWSLen() - originWSLen;
                    if (wsLenDiff === -1) {
                        // when worksheet is deleted, pass check
                        return true;
                    } else if (wsLenDiff === 0) {
                        // when worksheet not delet yet, keep checking
                        return false;
                    } else {
                        // invalid case, fail check
                        return null;
                    }
                };

                return checkHelper(checkFunc, "Woksheet is deleted");
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        moveTableToWorkSheet: function(options) {
            var tableId = getTableId(options.tableId);
            var wsIndex = options.newWorksheetIndex;
            var wsId    = WSManager.getOrders()[wsIndex];

            WSManager.moveTable(tableId, wsId);
            return (promiseWrapper(null));
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
            var tableId = getTableId(options.tableId);
            var wsIndex = options.newWorksheetIndex;
            var wsId    = WSManager.getOrders()[wsIndex];
            WSManager.moveInactiveTable(tableId, wsId);
            return (promiseWrapper(null));
        },

        createFolder: function(options) {
            DS.newFolder();
            return (promiseWrapper(null));
        },

        profile: function(options, keepOpen) {
            var deferred = jQuery.Deferred();
            var tableId  = getTableId(options.tableId);
            var colNum   = options.colNum;

            if (!keepOpen) {
                keepOpen = profileKeepOpenCheck(options);
            }

            Profile.show(tableId, colNum)
            .then(function() {
                var checkFunc = function() {
                    return ($("#profileModal .groupbyChart .barArea").length > 0);
                };

                return (checkHelper(checkFunc));
            })
            .then(function() {
                if (keepOpen) {
                    return promiseWrapper(null);
                } else {
                    var callback = function() {
                        $("#profileModal .close").click();
                    };
                    return (delayAction(callback, "Show Profile"));
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        profileSort: function(options, keepOpen) {
            // UI simulation
            var deferred   = jQuery.Deferred();
            var order      = options.order;
            var bucketSize = options.bucketSize;

            if (!keepOpen) {
                keepOpen = profileKeepOpenCheck(options);
            }

            profileSortHelper()
            .then(function() {
                var $icon = $("#profileModal .sortSection ." + order + " .iconWrapper");
                $icon.click();

                var checkFunc = function() {
                    return ($icon.hasClass("active"));
                };

                return (checkHelper(checkFunc));
            })
            .then(function() {
                if (keepOpen) {
                    return promiseWrapper(null);
                } else {
                    var callback = function() {
                        $("#profileModal .close").click();
                    };
                    return delayAction(callback, "Show Profile Sort");
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            function profileSortHelper() {
                if (bucketSize === 0) {
                    options = $.extend(options, {
                        "operation": SQLOps.Profile
                    });
                    return replayFuncs.profile(options, true);
                } else {
                    return replayFuncs.profileBucketing(options, true);
                }
            }

            return (deferred.promise());
        },

        profileBucketing: function(options, keepOpen) {
            var deferred = jQuery.Deferred();
            var bucketSize = options.bucketSize;

            options = $.extend(options, {
                "operation": SQLOps.Profile
            });

            if (!keepOpen) {
                keepOpen = profileKeepOpenCheck(options);
            }

            replayFuncs.profile(options, true)
            .then(function() {
                var $modal = $("#profileModal");
                var $rangeSection = $modal.find(".rangeSection");
                var $input = $("#stats-step");
                $rangeSection.find(".text.range").click();
                $input.val(bucketSize);
                $input.trigger(fakeEvent.enter);

                var checkFunc = function() {
                    return ($modal.find(".loadingSection").hasClass("hidden"));
                };

                return (checkHelper(checkFunc));
            })
            .then(function() {
                if (keepOpen) {
                    return promiseWrapper(null);
                } else {
                    var callback = function() {
                        $("#profileModal .close").click();
                    };
                    return delayAction(callback, "Show Profile Bucketing");
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        quickAgg: function(options) {
            var deferred = jQuery.Deferred();
            var args = getArgs(options);

            AggModal.quickAgg.apply(window, args)
            .then(function() {
                var callback = function() {
                    $("#aggModal .close").click();
                };
                return delayAction(callback, "Show Quick Agg");
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        correlation: function(options) {
            var deferred = jQuery.Deferred();
            var args = getArgs(options);

            AggModal.corr.apply(window, args)
            .then(function() {
                var callback = function() {
                    $("#aggModal .close").click();
                };
                return delayAction(callback, "Show Correlation");
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        addOtherUserDS: function(options) {
            var args = getArgs(options);
            DS.addOtherUserDS.apply(window, args);
            return (promiseWrapper(null));
        },

        splitCol: function(options) {
            var args = getArgs(options);
            return (ColManager.splitCol.apply(window, args));
        },

        changeType: function(options) {
            var args = getArgs(options);
            return (ColManager.changeType.apply(window, args));
        },

        changeFormat: function(options) {
            var args = getArgs(options);
            ColManager.format.apply(window, args);
            return promiseWrapper(null);
        },

        roundToFixed: function(options) {
            var args = getArgs(options);
            ColManager.roundToFixed.apply(window, args);
            return promiseWrapper(null);
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


    return (Redo);
}(jQuery, {}));
