window.Replay = (function($, Replay) {
    var argsMap = null;
    var tabMap  = null;
    var hashId  = null;

    var Tab = {
        "DS": "#dataStoresTab",
        "WS": "#workspaceTab"
    };

    var fakeMouseup = {type: "mouseup", which: 1};
    var fakeEnter   = {type: "keypress", which: 13};
    // var fakeClick = {type: "click", which: 1};
    // var fakeMousedown = {type: "mousedown", which: 1};

    var outTime = 60000; // 1min for time out
    var checkTime = 500; // time interval of 500ms

    Replay.run = function(sqls) {
        // call it here instead of start up time
        // to lower the overhead of start up.
        if (argsMap == null) {
            createFuncArgsMap();
        }

        if (tabMap == null) {
            createTabMap();
        }

        if (hashId == null) {
            hashId = Authentication.getUsers().hashId;
        }

        // assume the usernode is empty
        var promises = [];

        for (var i = 0; i < sqls.length; i++) {
            promises.push(Replay.execSql.bind(this, sqls[i]));
        }

        return (chain(promises));
    };

    Replay.execSql = function(sql) {
        var deferred = jQuery.Deferred();
        var options = sql.options;

        if (options == null) {
            console.error("Invalid sql", sql);
            deferred.reject("Invalid sql");
            return (deferred.promise());
        }

        var operation = options.operation;
        var tab  = tabMap[operation];

        console.log("replay:", sql);

        if (tab != null) {
            $(tab).click();
        }

        execSql(operation, options)
        .then(function() {
            console.log("Replay", operation, "finished!");
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Replay", operation, "fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function execSql(operation, options) {
        var deferred = jQuery.Deferred();

        if (options.sqlType === SQLType.Fail) {
            console.log(operation, "is a fail handler, will be auto-triggered");
            deferred.resolve();
            return (deferred.promise());
        }

        switch (operation) {
            case SQLOps.DSLoad:
                return replayLoadDS(options);
            case SQLOps.IndexDS:
                return replayCreatWorksheet(options);
            case SQLOps.Sort:
                return replaySort(options);
            case SQLOps.Filter:
                return replayFilter(options);
            case SQLOps.Aggr:
                return replayAggregate(options);
            case SQLOps.Map:
                return replayMap(options);
            case SQLOps.JoinMap:
                break;
            case SQLOps.GroupbyMap:
                break;
            case SQLOps.CheckIndex:
                break;
            case SQLOps.Join:
                return replayJoin(options);
            case SQLOps.GroupBy:
                return replayGroupBy(options);
            case SQLOps.GroupByIndex:
                break;
            case SQLOps.RenameTable:
                return replayRename(options);
            case SQLOps.RenameOrphanTable:
                break;
            case SQLOps.DeleteTable:
                return replayDeleteTable(options);
            case SQLOps.PreviewDS:
                break;
            case SQLOps.DestroyPreviewDS:
                break;
            case SQLOps.DestroyDS:
                return replayDestroyDS(options);
            case SQLOps.AddNewCol:
                return replayAddNewCol(options);
            case SQLOps.DeleteCol:
                return replayDeleteCol(options);
            case SQLOps.HideCols:
                return replayHideCols(options);
            case SQLOps.UnHideCols:
                return replayUnHideCols(options);
            case SQLOps.DupCol:
                return replayDupCol(options);
            case SQLOps.DelDupCol:
                return replayDelDupCol(options);
            case SQLOps.DelAllDupCols:
                return replayDelAllDupCols(options);
            case SQLOps.TextAlign:
                return replayTextAligh(options);
            case SQLOps.ReorderTable:
                return replayReorderTable(options);
            case SQLOps.ReorderCol:
                return replayReorderCol(options);
            case SQLOps.RenameCol:
                return replayRenameCol(options);
            case SQLOps.PullCol:
                return replayPullCol(options);
            case SQLOps.ArchiveTable:
                return replayArchiveTable(options);
            case SQLOps.TableBulkActions:
                return replayTableBulkAction(options);
            case SQLOps.SortTableCols:
                return replaySortTableCols(options);
            case SQLOps.HideTable:
                return replayHideTable(options);
            case SQLOps.UnhideTable:
                return replayUnhideTable(options);
            case SQLOps.AddWS:
                return replayAddWS();
            case SQLOps.RenameWS:
                return replayRenameWS(options);
            case SQLOps.SwitchWS:
                return replaySwitchWS(options);
            case SQLOps.DelWS:
                return replayDelWS(options);
            case SQLOps.MoveTableToWS:
                return replayMoveTableToWS(options);
            case SQLOps.AddNoSheetTables:
                return replayAddNoSheetTables(options);
            case SQLOps.CreateFolder:
                return replayCreateFolder();
            case SQLOps.DSRename:
                return replayDSRename(options);
            case SQLOps.DSDropIn:
                return replayDSDropIn(options);
            case SQLOps.DSInsert:
                return replayDSInsert(options);
            case SQLOps.DSToDir:
                return replayGoToDir(options);
            case SQLOps.DSDropBack:
                return replayDSDropBack(options);
            case SQLOps.DelFolder:
                return replayDelFolder(options);
            case SQLOps.ProfileAction:
                break;
            case SQLOps.Profile:
                return replayProfile(options);
            case SQLOps.ProfileSort:
                return replayProfileSort(options);
            case SQLOps.ProfileClose:
                return replayProfileClose();
            case SQLOps.QuickAgg:
                return replayQuickAgg(options);
            case SQLOps.QuickAggAction:
                break;
            default:
                console.error("Unknown operation", operation);
                deferred.reject("Unknown operation");
                break;
        }

        console.log(operation, "will be auto-triggered");
        deferred.resolve();
        return (deferred.promise());
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

    // need to use the pointer, but the hasId is different
    function getTableId(oldId) {
        var pointer = oldId.substring(2);
        return (hashId + pointer);
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
        argsMap[SQLOps.GroupBy] = ["operator", "tableId", "indexedColName",
                                    "aggColName", "isIncSample", "newColName"];
        argsMap[SQLOps.RenameTable] = ["tableId", "newTableName"];
        argsMap[SQLOps.DeleteTable] = ["tableId", "tableType"];
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
        argsMap[SQLOps.MoveTableToWS] = ["tableId", "newIndex"];
        argsMap[SQLOps.AddNoSheetTables] = ["tableIds", "wsIndex"];
        argsMap[SQLOps.DSRename] = ["dsId", "newName"];
        argsMap[SQLOps.DSToDir] = ["folderId"];
        argsMap[SQLOps.Profile] = ["tableId", "colNum"];
        argsMap[SQLOps.QuickAgg] = ["tableId", "type"];
    }

    function createTabMap() {
        tabMap = {};

        tabMap[SQLOps.DSLoad] = Tab.DS;
        tabMap[SQLOps.IndexDS] = Tab.DS;
        tabMap[SQLOps.Sort] = Tab.WS;
        tabMap[SQLOps.Filter] = Tab.WS;
        tabMap[SQLOps.Aggr] = Tab.WS;
        tabMap[SQLOps.Map] = Tab.WS;
        tabMap[SQLOps.Join] = Tab.WS;
        tabMap[SQLOps.GroupBy] = Tab.WS;
        tabMap[SQLOps.RenameTable] = Tab.WS;
        tabMap[SQLOps.DeleteTable] = Tab.WS;
        tabMap[SQLOps.DestroyDS] = Tab.DS;
        tabMap[SQLOps.AddNewCol] = Tab.WS;
        tabMap[SQLOps.DeleteCol] = Tab.WS;
        tabMap[SQLOps.HideCols] = Tab.WS;
        tabMap[SQLOps.UnHideCols] = Tab.WS;
        tabMap[SQLOps.TextAlign] = Tab.WS;
        tabMap[SQLOps.DupCol] = Tab.WS;
        tabMap[SQLOps.DelDupCol] = Tab.WS;
        tabMap[SQLOps.DelAllDupCols] = Tab.WS;
        tabMap[SQLOps.ReorderTable] = Tab.WS;
        tabMap[SQLOps.ReorderCol] = Tab.WS;
        tabMap[SQLOps.RenameCol] = Tab.WS;
        tabMap[SQLOps.PullCol] = Tab.WS;
        tabMap[SQLOps.ArchiveTable] = Tab.WS;
        tabMap[SQLOps.TableBulkActions] = Tab.WS;
        tabMap[SQLOps.SortTableCols] = Tab.WS;
        tabMap[SQLOps.HideTable] = Tab.WS;
        tabMap[SQLOps.UnhideTable] = Tab.WS;
        tabMap[SQLOps.AddWS] = Tab.WS;
        tabMap[SQLOps.MoveTableToWS] = Tab.WS;
        tabMap[SQLOps.AddNoSheetTables] = Tab.WS;
        tabMap[SQLOps.CreateFolder] = Tab.DS;
        tabMap[SQLOps.DSRename] = Tab.DS;
        tabMap[SQLOps.DSDropIn] = Tab.DS;
        tabMap[SQLOps.DSInsert] = Tab.DS;
        tabMap[SQLOps.DSToDir] = Tab.DS;
        tabMap[SQLOps.DSDropBack] = Tab.DS;
        tabMap[SQLOps.DelFolder] = Tab.DS;
        tabMap[SQLOps.Profile] = Tab.WS;
        tabMap[SQLOps.QuickAgg] = Tab.WS;
    }

    function replayLoadDS(options) {
        var args = getArgs(options);
        return (DS.load.apply(window, args));
    }

    function replayCreatWorksheet(options) {
        var deferred = jQuery.Deferred();
        // this is a UI simulation replay
        var dsName    = options.dsName;
        var columns   = options.columns;
        var tableName = options.tableName;

        var timer;
        var timer2;

        var timeCnt;
        var timeCnt2;

        var $grid = DS.getGridByName(dsName);
        $grid.click();

        timer = setInterval(function() {
            if ($grid.find('.waitingIcon').length === 0) {
                // when sample table is loaded
                clearInterval(timer);

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

                var $mainFrame = $("#mainFrame");
                var originTableLen = $mainFrame.find(".xcTableWrap").length;

                // delay 2 seconds to show UI
                console.log("Show Data Cart for 2s...");
                setTimeout(function() {
                    $("#submitDSTablesBtn").click();

                    timer2 = setInterval(function() {
                        var tableLenDiff = $mainFrame.find(".xcTableWrap").length -
                                            originTableLen;

                        if (tableLenDiff === 1) {
                            // when new table created
                            clearInterval(timer2);
                            deferred.resolve();
                        } else if (tableLenDiff === 0) {
                            // when table not craeted yet
                            console.info("table not ready!");

                            timeCnt2 += checkTime;
                            if (timeCnt2 > outTime) {
                                clearInterval(timer2);
                                console.error("Time out!");
                                deferred.reject("Time out");
                            }

                        } else {
                            clearInterval(timer2);
                            console.error("replay load table error!");
                            deferred.reject();
                        }
                    }, checkTime);
                }, 2000);
            } else {
                console.info("data sample table not ready!");
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

    function replaySort(options) {
        var args = getArgs(options);
        return (xcFunction.sort.apply(window, args));
    }

    function replayFilter(options) {
        var args = getArgs(options);
        return (xcFunction.filter.apply(window, args));
    }

    function replayAggregate(options) {
        var deferred = jQuery.Deferred();
        var args = getArgs(options);
        // this is a UI simulation replay
        xcFunction.aggregate.apply(window, args)
        .then(function() {
            // delay 2 seconds to show Alert Modal
            console.log("Show alert modal for 5s...");
            setTimeout(function() {
                $("#alertModal").find(".close").click();
                deferred.resolve();
            }, 5000);
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function replayMap(options) {
        var args = getArgs(options);
        return (xcFunction.map.apply(window, args));
    }

    function replayJoin(options){
        // change tableId
        options.lTableId = getTableId(options.lTableId);
        options.rTableId = getTableId(options.rTableId);
        // XXX this is tricky that if we do not call Authentication.fetchHashTag(),
        // the id cursor cannt sync will original one.
        // Better way is to append hashId to newTableName in xcFunction.join()
        options.newTableName = xcHelper.getTableName(options.newTableName) +
                                Authentication.fetchHashTag();

        var args = getArgs(options);
        return (xcFunction.join.apply(window, args));
    }

    function replayGroupBy(options) {
        var args = getArgs(options);
        return (xcFunction.groupBy.apply(window, args));
    }

    function replayRename(options) {
        options.newTableName = changeTableName(options.newTableName);
        var args = getArgs(options);
        return (xcFunction.rename.apply(window, args));
    }

    function replayDeleteTable(options) {
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
    }

    function replayDestroyDS(options) {
        // UI simulation replay
        var deferred = jQuery.Deferred();
        var $gridView = $("#gridView");
        var $ds = DS.getGridByName(options.dsName);
        var dSLen = $gridView.find(".ds").length;
        var timer;
        var timeCnt;

        DS.remove($ds);

        console.log("Show alert modal for 5s...");
        setTimeout(function() {
            $("#alertModal").find(".confirm").click();

            timer = setInterval(function() {
                var dsLenDiff = $gridView.find(".ds").length - dSLen;

                if (dsLenDiff === -1) {
                    // when ds is deleted
                    clearInterval(timer);
                    deferred.resolve();
                } else if (dsLenDiff === 0) {
                    // when table not craeted yet
                    console.info("destroy dataset not finished!");

                    timeCnt += checkTime;
                    if (timeCnt > outTime) {
                        clearInterval(timer);
                        console.error("Time out!");
                        deferred.reject("Time out");
                    }
                } else {
                    clearInterval(timer);
                    console.error("replay destroy dataset error!");
                    deferred.reject();
                }
            }, checkTime);
        }, 5000);

        return (deferred.promise());
    }

    function replayAddNewCol(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var tableId = getTableId(options.tableId);
        var $colMenu = $("#colMenu-" + tableId);
        var $li;

        $("#xcTable-" + tableId + " .th.col" + options.siblColNum +
                                                " .dropdownBox").click();
        if (options.direction === "L") {
            $li = $colMenu.find(".addColumns.addColLeft");
        } else {
            $li = $colMenu.find(".addColumns.addColRight");
        }

        $li.mouseenter();

        console.log("Show col menu for 2s...");

        setTimeout(function() {
            $li.mouseleave();
            $li.trigger(fakeMouseup);
            deferred.resolve();
        }, 2000);

        return (deferred.promise());
    }

    function replayDeleteCol(options) {
        var args = getArgs(options);
        ColManager.delCol.apply(window, args);

        return (promiseWrapper(null));
    }

    function replayHideCols(options) {
        var args = getArgs(options);
        ColManager.hideCols.apply(window, args);

        return (promiseWrapper(null));
    }

    function replayUnHideCols(options) {
        var args = getArgs(options);
        ColManager.unhideCols.apply(window, args);

        return (promiseWrapper(null));
    }

    function replayTextAligh(options) {
        var args = getArgs(options);
        ColManager.textAlign.apply(window, args);

        return (promiseWrapper(null));
    }

    function replayDupCol(options) {
        var args = getArgs(options);
        return (ColManager.dupCol.apply(window, args));
    }

    function replayDelDupCol(options) {
        var args = getArgs(options);
        ColManager.delDupCols.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayDelAllDupCols(options) {
        var args = getArgs(options);
        ColManager.delAllDupCols.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayReorderTable(options) {
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
    }

    function replayReorderCol(options) {
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

        // XXX weird hack hide show or else .header won't reposition itself
        $table.find('.header').css('height', '39px');
        setTimeout(function() {
            $table.find('.header').css('height', '40px');
        }, 0);

        ColManager.reorderCol.apply(window, args);

        return (promiseWrapper(null));
    }

    function replayRenameCol(options) {
        var args = getArgs(options);
        ColManager.renameCol.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayPullCol(options) {
        var args = getArgs(options);
        return (ColManager.pullCol.apply(window, args));
    }

    function replayArchiveTable(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var tableId = getTableId(options.tableId);
        var $li = $("#tableMenu-" + tableId + " .archiveTable");

        $("#xcTheadWrap-" + tableId + " .dropdownBox").click();

        $li.mouseenter();

        console.log("Show table menu for 2s...");

        setTimeout(function() {
            $li.mouseleave();
            $li.trigger(fakeMouseup);
            deferred.resolve();
        }, 2000);

        return (deferred.promise());
    }

    function replayTableBulkAction(options) {
        var action = options.action;
        var tableType = options.tableType;
        var tableName = options.tableName;
        var tableId;

        if (tableType === TableType.InActive) {
            tableId = getTableId(xcHelper.getTableId(tableName));
            $('#inactiveTablesList .tableInfo[data-id="' +
                    tableId + '"] .addTableBtn').click();
        } else if (tableType === TableType.Orphan) {
            $('#orphanedTableList .tableInfo[data-tablename="' +
                    tableName + '"] .addTableBtn').click();
        } else {
            console.error("Invalid table bulk action");
            return (promiseWrapper(null));
        }

        return (RightSideBar.tableBulkAction(action, tableType));
    }

    function replaySortTableCols(options) {
        var args = getArgs(options);
        sortAllTableColumns.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayHideTable(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var tableId = getTableId(options.tableId);
        var $li = $("#tableMenu-" + tableId + " .hideTable");

        $("#xcTheadWrap-" + tableId + " .dropdownBox").click();

        $li.mouseenter();

        console.log("Show table menu for 2s...");

        setTimeout(function() {
            $li.mouseleave();
            $li.trigger(fakeMouseup);
            deferred.resolve();
        }, 2000);

        return (deferred.promise());
    }

    function replayUnhideTable(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var tableId = getTableId(options.tableId);
        var $li = $("#tableMenu-" + tableId + " .unhideTable");

        $("#xcTheadWrap-" + tableId + " .dropdownBox").click();

        $li.mouseenter();

        console.log("Show table menu for 2s...");

        setTimeout(function() {
            $li.mouseleave();
            $li.trigger(fakeMouseup);
            deferred.resolve();
        }, 2000);

        return (deferred.promise());
    }

    function replayAddWS() {
        // UI simulation
        var deferred    = jQuery.Deferred();
        var originWSLen = WSManager.getWSLen();

        $("#addWorksheet").click();

        var timeCnt;

        var timer = setInterval(function() {
            var wsLenDiff = WSManager.getWSLen() - originWSLen;

            if (wsLenDiff === 1) {
                // when ds is deleted
                clearInterval(timer);
                deferred.resolve();
            } else if (wsLenDiff === 0) {
                // when table not craeted yet
                console.info("add worksheet not finished!");

                timeCnt += checkTime;
                if (timeCnt > outTime) {
                    clearInterval(timer);
                    console.error("Time out!");
                    deferred.reject("Time out");
                }
            } else {
                clearInterval(timer);
                console.error("add worksheet error!");
                deferred.reject();
            }
        }, checkTime);

        return (deferred.promise());
    }

    function replayRenameWS(options) {
        var wsIndex = options.worksheetIndex;
        var newName = options.newName;
        $("#worksheetTab-" + wsIndex + " .text").text(newName)
                                                .trigger(fakeEnter);
        return (promiseWrapper(null));
    }

    function replaySwitchWS(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var wsIndex  = options.newWorksheetIndex;

        $("#worksheetTab-" + wsIndex).click();

        console.log("Wait for 2s...");
        setTimeout(function() {
            deferred.resolve();
        }, 2000);

        return (deferred.promise());
    }

    function replayDelWS(options) {
        // UI simulation
        var deferred    = jQuery.Deferred();
        var originWSLen = WSManager.getWSLen();
        var wsIndex     = options.worksheetIndex;
        var tableAction = options.tableAction;
        var timer;
        var timeCnt;

        var $wsTab = $("#worksheetTab-" + wsIndex);

        if (originWSLen === 1 || $wsTab.hasClass("inActive")) {
            // invalid deletion
            console.error("This worksheet should not be deleted!");
            deferred.reject();
        }

        $("#worksheetTab-" + wsIndex + " .delete").click();

        console.log("Show alert modal for  2s...");
        setTimeout(function() {
            if (tableAction === "delete") {
                $("#alertActions").find(".deleteTale").click();
            } else if (tableAction === "archive") {
                $("#alertActions").find(".archiveTable").click();
            }

            timer = setInterval(function() {
                var wsLenDiff = WSManager.getWSLen() - originWSLen;

                if (wsLenDiff === -1) {
                    // when ds is deleted
                    clearInterval(timer);
                    deferred.resolve();
                } else if (wsLenDiff === 0) {
                    // when table not craeted yet
                    console.info("delete worksheet not finished!");

                    timeCnt += checkTime;
                    if (timeCnt > outTime) {
                        clearInterval(timer);
                        console.error("Time out!");
                        deferred.reject("Time out");
                    }
                } else {
                    clearInterval(timer);
                    console.error("delete worksheet error!");
                    deferred.reject();
                }
            }, checkTime);
        }, 2000);

        return (deferred.promise());
    }

    function replayMoveTableToWS(options) {
        var args = getArgs(options);
        WSManager.moveTable.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayAddNoSheetTables(options) {
        var tableIds = options.tableIds;
        for (var i = 0, len = tableIds.length; i < len; i++) {
            tableIds[i] = getTableId(tableIds[i]);
        }

        var args = getArgs(options);
        WSManager.addNoSheetTables.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayCreateFolder() {
        DS.newFolder();
        return (promiseWrapper(null));
    }

    function replayDSRename(options) {
        var args = getArgs(options);
        DS.rename.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayDSDropIn(options) {
        var $grid   = DS.getGrid(options.dsId);
        var $target = DS.getGrid(options.targetDSId);
        dsDropIn($grid, $target);
        return (promiseWrapper(null));
    }

    function replayDSInsert(options) {
        var $grid    = DS.getGrid(options.dsId);
        var $sibling = DS.getGrid(options.siblingDSId);
        var isBefore = options.isBefore;
        dsInsert($grid, $sibling, isBefore);
        return (promiseWrapper(null));
    }

    function replayGoToDir(options) {
        var args = getArgs(options);
        DS.goToDir.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayDSDropBack(options) {
        var $grid = DS.getGrid(options.dsId);
        dsBack($grid);
        return (promiseWrapper(null));
    }

    function replayDelFolder(options) {
        var $grid = DS.getGrid(options.dsId);
        DS.remove($grid);
        return (promiseWrapper(null));
    }

    function replayProfile(options) {
        var args = getArgs(options);
        return (STATSManager.run.apply(window, args));
    }

    function replayProfileSort(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var order = options.order;

        var $icon = $("#statsModal .sortSection ." + order + " .iconWrapper");
        $icon.click();

        var timeCnt;
        var timer = setInterval(function() {
            if ($icon.hasClass("active")) {
                // when ds is deleted
                clearInterval(timer);
                deferred.resolve();
            } else {
                // when table not craeted yet
                console.info("profile sort not finished!");
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

    function replayProfileClose() {
        $("#statsModal .modalHeader .close").click();
        return (promiseWrapper(null));
    }

    function replayQuickAgg(options) {
        var deferred = jQuery.Deferred();
        var args     = getArgs(options);

        AggModal.show.apply(window, args)
        .then(function() {
            console.log("Show quickAgg modal for 5s");
            setTimeout(function() {
                $("#closeAgg").click();
                deferred.resolve();
            }, 5000);
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    return (Replay);
}(jQuery, {}));
