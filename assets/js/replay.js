window.Replay = (function($, Replay) {
    var argsMap = null;
    var tabMap  = null;
    var hashTag = null;

    var Tab = {
        "DS": "#dataStoresTab",
        "WS": "#workspaceTab"
    };

    var outTime = 60000; // 1min for time out
    var checkTime = 500; // time interval of 500ms

    Replay.run = function(sqls) {
        var deferred = jQuery.Deferred();
        if (!(sqls instanceof Array)) {
            alert("Wrong Type of args");
            deferred.reject("Wrong Type of args");
            return (deferred.promise());
        }

        var mindModeCache = gMinModeOn;

        gMinModeOn = true;
        // call it here instead of start up time
        // to lower the overhead of start up.
        if (argsMap == null) {
            createFuncArgsMap();
        }

        if (tabMap == null) {
            createTabMap();
        }

        if (hashTag == null) {
            hashTag = Authentication.getInfo().hashTag;
        }

        // filter out auto-triggered sql
        sqls = sqls.filter(sqlFilter);
        // assume the usernode is empty
        var promises = [];

        for (var i = 0, len = sqls.length; i < len; i++) {
            var prevSql = (i === 0) ? null : sqls[i - 1];
            var nextSql = (i === len - 1) ? null : sqls[i + 1];
            promises.push(Replay.execSql.bind(this, sqls[i], prevSql, nextSql));
        }

        chain(promises)
        .then(function() {
            alert("Replay Finished!");
            deferred.resolve();
        })
        .fail(function(error) {
            alert("Replay Fails!");
            deferred.reject(error);
        })
        .always(function() {
            gMinModeOn = mindModeCache;
        });

        return (deferred.promise());
    };

    Replay.execSql = function(sql, prevSql, nextSql) {
        var deferred = jQuery.Deferred();
        var options = sql.options;

        if (options == null) {
            console.error("Invalid sql", sql);
            deferred.reject("Invalid sql");
            return (deferred.promise());
        }

        var operation = options.operation;
        var tab  = tabMap[operation] || Tab.WS; // default is in worksheet

        console.log("replay:", sql);

        if (tab != null) {
            $(tab).click();
        }

        options = $.extend(options, {
            "prevReplay": prevSql,
            "nextReplay": nextSql
        });

        execSql(operation, options)
        .then(function() {
            console.log("Replay", operation, "finished!");
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Replay", operation, "fails!", error);

            if (sql.sqlType === SQLType.Error && isValidError(error)) {
                if ($("#alertModal").is(":visible")) {
                    var callback = function() {
                        $("#alertModal .close").click();
                        deferred.resolve();
                    };

                    delayAction(callback, "Show alert modal");
                } else {
                    console.log("This conitnue to replay after", operation);
                    deferred.resolve();
                }
            } else {
                deferred.reject(error);
            }
        });

        return (deferred.promise());
    };

    function isValidError(status) {
        switch (status) {
            case StatusT.StatusConnReset:
            case StatusT.StatusNoMem:
                return false;
            default:
                return true;
        }
    }

    function execSql(operation, options) {
        var deferred = jQuery.Deferred();
        if (replayFuncs.hasOwnProperty(operation)) {
            return (replayFuncs[operation](options));
        } else {
            console.error("Unknown operation", operation);
            deferred.reject("Unknown operation");
            return (deferred.promise());
        }
    }

    // function clearTable() {
    //     var promises = [];

    //     for (var id in gTables) {
    //         promises.push(delTable.bind(this, gTables[id]));
    //     }

    //     return chain(promises);

    //     function delTable(table) {
    //         var deferred = jQuery.Deferred();
    //         var resultSetId = table.resultSetId;
    //         var tableName = table.tableName;

    //         XcalarSetFree(resultSetId)
    //         .then(function() {
    //             return (XcalarDeleteTable(tableName));
    //         })
    //         .then(deferred.resolve)
    //         .fail(deferred.reject);

    //         return (deferred.promise());
    //     }
    // }

    function getArgs(options) {
        var neededArgs = argsMap[options.operation];

        if (neededArgs == null) {
            return (null);
        }

        var args = [];
        var argKey;
        var arg;

        for (var i = 0, len = neededArgs.length; i < len; i++) {
            argKey = neededArgs[i];
            arg = options[argKey];

            if (argKey === "tableId") {
                arg = getTableId(arg);
            }
            args.push(arg);
        }

        return (args);
    }

    // need to use the idCount, but the hasId is different
    function getTableId(oldId) {
        var idCount = oldId.substring(2);
        return (hashTag + idCount);
    }

    function changeTableName(tableName) {
        var name = xcHelper.getTableName(tableName);
        var id = xcHelper.getTableId(tableName);

        return (name + "#" + getTableId(id));
    }

    function createFuncArgsMap() {
        argsMap = {};
        // DS.load()
        argsMap[SQLOps.DSLoad] = ["dsName", "dsFormat", "loadURL",
                                    "fieldDelim", "lineDelim", "hasHeader",
                                    "moduleName", "funcName"];
        argsMap[SQLOps.Sort] = ["colNum", "tableId", "order"];
        argsMap[SQLOps.Filter] = ["colNum", "tableId", "fltOptions"];
        argsMap[SQLOps.Aggr] = ["colNum", "tableId", "aggrOp"];
        argsMap[SQLOps.Map] = ["colNum", "tableId", "fieldName",
                                "mapString", "mapOptions"];
        argsMap[SQLOps.Join] = ["lColNums", "lTableId", "rColNums", "rTableId",
                                "joinStr", "newTableName"];
        argsMap[SQLOps.GroupBy] = ["operator", "tableId", "indexedCols",
                                    "aggColName", "isIncSample", "newColName"];
        argsMap[SQLOps.RenameTable] = ["tableId", "newTableName"];
        argsMap[SQLOps.HideTable] = ["tableId"];
        argsMap[SQLOps.UnhideTable] = ["tableId"];
        argsMap[SQLOps.DeleteTable] = ["tables", "tableType"];
        argsMap[SQLOps.DeleteCol] = ["colNums", "tableId"];
        argsMap[SQLOps.HideCols] = ["colNums", "tableId"];
        argsMap[SQLOps.UnHideCols] = ["colNums", "tableId", "hideOptions"];
        argsMap[SQLOps.TextAlign] = ["colNum", "tableId", "alignment"];
        argsMap[SQLOps.DupCol] = ["colNum", "tableId"];
        argsMap[SQLOps.DelDupCol] = ["colNum", "tableId"];
        argsMap[SQLOps.DelAllDupCols] = ["tableId"];
        argsMap[SQLOps.ReorderTable] = ["tableId", "srcIndex", "desIndex"];
        argsMap[SQLOps.ReorderCol] = ["tableId", "oldColNum", "newColNum"];
        argsMap[SQLOps.RenameCol] = ["colNum", "tableId", "newName"];
        argsMap[SQLOps.PullCol] = ["colNum", "tableId",
                                    "nameInfo", "pullColOptions"];
        argsMap[SQLOps.SortTableCols] = ["tableId", "direction"];
        argsMap[SQLOps.ResizeTableCols] = ["tableId", "resizeTo"];

        argsMap[SQLOps.DSRename] = ["dsId", "newName"];
        argsMap[SQLOps.DSToDir] = ["folderId"];
        argsMap[SQLOps.Profile] = ["tableId", "colNum"];
        argsMap[SQLOps.QuickAgg] = ["tableId"];
        argsMap[SQLOps.Corr] = ["tableId"];
        argsMap[SQLOps.AddOhterUserDS] = ["name", "format", "path"];
        argsMap[SQLOps.ExportTable] = ["tableName", "exportName", "targetName", "numCols", "columns"];
        argsMap[SQLOps.SplitCol] = ["colNum", "tableId",
                                    "delimiter", "numColToGet"];
        argsMap[SQLOps.ChangeType] = ["colTypeInfos", "tableId"];
        argsMap[SQLOps.ChangeFormat] = ["colNum", "tableId", "format"];
        argsMap[SQLOps.RoundToFixed] = ["colNum", "tableId", "decimals"];
    }

    function createTabMap() {
        tabMap = {};

        tabMap[SQLOps.DSLoad] = Tab.DS;
        tabMap[SQLOps.IndexDS] = Tab.DS;
        tabMap[SQLOps.CreateFolder] = Tab.DS;
        tabMap[SQLOps.DSRename] = Tab.DS;
        tabMap[SQLOps.DSDropIn] = Tab.DS;
        tabMap[SQLOps.DSInsert] = Tab.DS;
        tabMap[SQLOps.DSToDir] = Tab.DS;
        tabMap[SQLOps.DSDropBack] = Tab.DS;
        tabMap[SQLOps.DelFolder] = Tab.DS;
        tabMap[SQLOps.AddOhterUserDS] = Tab.DS;
    }

    function sqlFilter(sql) {
        var options = sql.options || {};
        var sqlType = options.sqlType;

        if (sqlType === SQLType.Fail) {
            return false;
        }

        return true;
    }

    /* REPLAYFUNCS HOLDS ALL THE REPLAY FUNCTIONS */

    var replayFuncs = {
        loadDataSet : function(options) {
            var args = getArgs(options);
            return (DS.load.apply(window, args));
        },

        indexFromDataset: function(options) {
            var deferred = jQuery.Deferred();
            // this is a UI simulation replay
            var dsName     = options.dsName;
            var dsId       = options.dsId;
            var columns    = options.columns;
            var tableName  = options.tableName;
            var $mainFrame = $("#mainFrame");

            var $grid = DS.getGrid(dsId);
            var originTableLen;

            $grid.click();
            var chekFunc = function() {
                return ($grid.find('.waitingIcon').length === 0);
            };

            checkHelper(chekFunc, "data sample table is ready")
            .then(function() {
                // when sample table is loaded
                var $inputs = $("#worksheetTable .editableHead");
                // make sure only have this cart
                DataCart.clear();

                // add to data cart
                for (var i = 0, len = columns.length; i < len; i++) {
                    var colName = columns[i];
                    // skip DATA column
                    if (colName === "DATA") {
                        continue;
                    }

                    $inputs.filter(function() {
                        return $(this).val() === colName;
                    }).click();
                }

                var name = xcHelper.getTableName(tableName);
                $("#DataCart .tableNameEdit").val(name);

                originTableLen = $mainFrame.find(".xcTableWrap").length;

                var callback = function() {
                    $("#submitDSTablesBtn").click();
                };
                // delay 2 seconds to show UI
                return delayAction(callback, "Show Data Cart", 2000);
            })
            .then(function() {
                var checkFunc2 = function() {
                    var tableLenDiff = $mainFrame.find(".xcTableWrap").length -
                                        originTableLen;
                    if (tableLenDiff === 1) {
                        return true; // pass check
                    } else if (tableLenDiff === 0) {
                        return false; // keep checking
                    } else {
                        return null; // error case, fail check
                    }
                };
                return checkHelper(checkFunc2, "xc table is ready");
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        sort: function(options) {
            var args = getArgs(options);
            return (xcFunction.sort.apply(window, args));
        },

        filter: function(options) {
            var args = getArgs(options);
            return (xcFunction.filter.apply(window, args));
        },

        aggregate: function(options) {
            var deferred = jQuery.Deferred();
            var args = getArgs(options);
            // this is a UI simulation replay
            xcFunction.aggregate.apply(window, args)
            .then(function() {
                var callback = function() {
                    $("#alertModal .close").click();
                };
                return (delayAction(callback, "Show alert modal"));
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        map: function(options) {
            var args = getArgs(options);
            return (xcFunction.map.apply(window, args));
        },

        join: function(options) {
            // change tableId
            options.lTableId = getTableId(options.lTableId);
            options.rTableId = getTableId(options.rTableId);
            // HACK: this is tricky that if we do not call Authentication.getHashId(),
            // the id cursor cannot sync with the original one.
            // Better way is to append hashId to newTableName in xcFunction.join()
            options.newTableName = xcHelper.getTableName(options.newTableName) +
                                    Authentication.getHashId();

            var args = getArgs(options);
            return (xcFunction.join.apply(window, args));
        },

        groupBy: function(options) {
            var args = getArgs(options);
            return (xcFunction.groupBy.apply(window, args));
        },

        renameTable: function(options) {
            options.newTableName = changeTableName(options.newTableName);
            var args = getArgs(options);
            return (xcFunction.rename.apply(window, args));
        },

        deleteTable: function(options) {
            // XXX TODO: test it when delete table is enabled
            var tableType = options.tableType;

            // XXX lack of delete some intermediate table (in stats modal)
            // and delete unknown source table
            if (tableType === TableType.Active) {
                var args = getArgs(options);
                return (deleteTable.apply(window, args));
            } else if (tableType === TableType.Unknown){
                // XXX not sure if it's good
                // XXX not test yet
                var deferred = jQuery.Deferred();
                var tableName = changeTableName(tableName);

                XcalarDeleteTable(tableName, options)
                .then(function() {
                    Dag.makeInactive(tableName, true);
                    deferred.resolve();
                })
                .fail(deferred.reject);
                return (deferred.promise());
            } else {
                return (promiseWrapper(null));
            }
        },

        destroyDataSet: function(options) {
            // UI simulation replay
            var deferred = jQuery.Deferred();
            var $gridView = $("#exploreView").find(".gridItems");
            var $ds = DS.getGrid(options.dsId);

            var dSLen = $gridView.find(".ds").length;

            DS.remove($ds);

            var callback = function() {
                $("#alertModal .confirm").click();
            };

            delayAction(callback, "Show alert modal")
            .then(function() {
                var checkFunc = function() {
                    var dsLenDiff = $gridView.find(".ds").length - dSLen;

                    if (dsLenDiff === -1) {
                        // when ds is deleted, pass check
                        return true;
                    } else if (dsLenDiff === 0) {
                        // when table not craeted yet, keep checking
                        return false;
                    } else {
                        // error case, fail check
                        return null;
                    }
                };
                return checkHelper(checkFunc, "DataSet is deleted");
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return (deferred.promise());
        },

        exportTable: function(options) {
            var deferred = jQuery.Deferred();

            options.tableName = changeTableName(options.tableName);

            var args = getArgs(options);
            var callback = function() {
                $("#alertHeader .close").click();
            };

            // XXX a potential issue here is that if exportName exists in
            // backend, it fails to export because of name confilict
            xcFunction.exportTable.apply(window, args)
            .then(function() {
                return delayAction(callback, "Show alert modal");
            })
            .then(deferred.resolve)
            .fail(deferred.resolve); // still resolve even fail!

            return (deferred.promise());
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
            var args = getArgs(options);
            ColManager.hideCols.apply(window, args);

            return (promiseWrapper(null));
        },

        unHideCols: function(options) {
            var args = getArgs(options);
            ColManager.unhideCols.apply(window, args);

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

        dsRename: function(options) {
            var args = getArgs(options);
            DS.rename.apply(window, args);
            return (promiseWrapper(null));
        },

        dsDropIn: function(options) {
            var $grid   = DS.getGrid(options.dsId);
            var $target = DS.getGrid(options.targetDSId);
            DS.dropToFolder($grid, $target);
            return (promiseWrapper(null));
        },

        dsInsert: function(options) {
            var $grid    = DS.getGrid(options.dsId);
            var $sibling = DS.getGrid(options.siblingDSId);
            var isBefore = options.isBefore;
            DS.insert($grid, $sibling, isBefore);
            return (promiseWrapper(null));
        },

        goToDir: function(options) {
             var args = getArgs(options);
            DS.goToDir.apply(window, args);
            return (promiseWrapper(null));
        },

        dsBack: function(options) {
            var $grid = DS.getGrid(options.dsId);
            DS.dropToParent($grid);
            return (promiseWrapper(null));
        },

        deleteFolder: function(options) {
            var $grid = DS.getGrid(options.dsId);
            DS.remove($grid);
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

    function profileKeepOpenCheck(options) {
        var nextSql = options.nextReplay || {};
        var nextOptions = nextSql.options || {};
        if (nextOptions.operation === SQLOps.ProfileSort ||
            nextOptions.operation === SQLOps.ProfileBucketing)
        {
            if (options.modalId === nextOptions.modalId) {
                return true;
            }
        }

        return false;
    }

    function checkHelper(checkFunc, msg) {
        var deferred = jQuery.Deferred();
        var timeCnt = 0;
        var timer = setInterval(function() {
            if (msg != null) {
                console.log("Check:", msg, "Timer:", timeCnt);
            }

            var res = checkFunc();
            if (res === true) {
                // make sure graphisc shows up
                clearInterval(timer);
                deferred.resolve();
            } else if (res === null) {
                deferred.reject("Check Error!");
            } else {
                console.info("check not pass yet!");
                timeCnt += checkTime;
                if (timeCnt > outTime) {
                    clearInterval(timer);
                    console.error("Time out!");
                    deferred.reject("Time out");
                }
            }
        }, checkTime);

        return (deferred.promise());
    }

    function delayAction(callback, msg, time) {
        var deferred = jQuery.Deferred();

        time = time || 5000;

        if (msg != null) {
            console.log(msg, "dealy time:", time, "ms");
        }

        setTimeout(function() {
            if (callback != null) {
                callback();
            }
            deferred.resolve();
        }, time);

        return (deferred.promise());
    }

    return (Replay);
}(jQuery, {}));
