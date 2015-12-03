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
            hashTag = Authentication.getCurrentUser().hashTag;
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
        var tab  = tabMap[operation];

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
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function execSql(operation, options) {
        var deferred = jQuery.Deferred();

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
            case SQLOps.Join:
                return replayJoin(options);
            case SQLOps.GroupBy:
                return replayGroupBy(options);
            case SQLOps.RenameTable:
                return replayRename(options);
            case SQLOps.DeleteTable:
                return replayDeleteTable(options);
            case SQLOps.DestroyDS:
                return replayDestroyDS(options);
            case SQLOps.ExportTable:
                return replayExportTable(options);
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
            case SQLOps.ReorderWS:
                return replayReorderWS(options);
            case SQLOps.DelWS:
                return replayDelWS(options);
            case SQLOps.MoveTableToWS:
                return replayMoveTableToWS(options);
            case SQLOps.AddNoSheetTables:
                return replayAddNoSheetTables(options);
            case SQLOps.MoveInactiveTableToWS:
                return replayMoveInactiveTableToWS(options);
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
            case SQLOps.Profile:
                return replayProfile(options);
            case SQLOps.ProfileSort:
                return replayProfileSort(options);
            case SQLOps.ProfileBucketing:
                return replayProfileBucketing(options);
            case SQLOps.QuickAgg:
                return replayQuickAgg(options);
            case SQLOps.AddDS:
                return replayAddDS(options);
            case SQLOps.SplitCol:
                return replaySplitCol(options);
            case SQLOps.ChangeType:
                return replayChangeType(options);
            default:
                console.error("Unknown operation", operation);
                deferred.reject("Unknown operation");
                break;
        }

        console.error(operation, "get into invalid area!");
        deferred.reject("invalid area!");
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

        argsMap[SQLOps.DSRename] = ["dsId", "newName"];
        argsMap[SQLOps.DSToDir] = ["folderId"];
        argsMap[SQLOps.Profile] = ["tableId", "colNum"];
        argsMap[SQLOps.QuickAgg] = ["tableId", "type"];
        argsMap[SQLOps.AddDS] = ["name", "format", "path"];
        argsMap[SQLOps.ExportTable] = ["tableName", "exportName", "targetName", "numCols", "columns"];
        argsMap[SQLOps.SplitCol] = ["colNum", "tableId",
                                    "delimiter", "numColToGet"];
        argsMap[SQLOps.ChangeType] = ["colTypeInfos", "tableId"];
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
        tabMap[SQLOps.ExportTable] = Tab.WS;
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
        tabMap[SQLOps.AddDS] = Tab.DS;
        tabMap[SQLOps.SplitCol] = Tab.WS;
        tabMap[SQLOps.ChangeType] = Tab.WS;
    }

    function sqlFilter(sql) {
        var options = sql.options || {};
        var sqlType = options.sqlType;

        if (sqlType === SQLType.Fail || sqlType === SQLType.Error) {
            return false;
        }

        switch (options.operation) {
            case SQLOps.JoinMap:
            case SQLOps.GroupbyMap:
            case SQLOps.CheckIndex:
            case SQLOps.GroupByIndex:
            case SQLOps.RenameOrphanTable:
            case SQLOps.PreviewDS:
            case SQLOps.DestroyPreviewDS:
            case SQLOps.ProfileAction:
            case SQLOps.QuickAggAction:
            case SQLOps.SplitColMap:
            case SQLOps.ChangeTypeMap:
                return false;
            default:
                return true;
        }
    }

    function replayLoadDS(options) {
        var args = getArgs(options);
        return (DS.load.apply(window, args));
    }

    function replayCreatWorksheet(options) {
        var deferred = jQuery.Deferred();
        // this is a UI simulation replay
        var dsName     = options.dsName;
        var columns    = options.columns;
        var tableName  = options.tableName;
        var $mainFrame = $("#mainFrame");
        var $grid      = DS.getGridByName(dsName);
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
            var callback = function() {
                $("#alertModal .close").click();
            };
            return (delayAction(callback, "Show alert modal"));
        })
        .then(deferred.resolve)
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
        // XXX this is tricky that if we do not call Authentication.getHashId(),
        // the id cursor cannt sync will original one.
        // Better way is to append hashId to newTableName in xcFunction.join()
        options.newTableName = xcHelper.getTableName(options.newTableName) +
                                Authentication.getHashId();

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
        var $gridView = $("#exploreView").find(".gridItems");
        var $ds = DS.getGridByName(options.dsName);

        if (options.isOrphaned === true) {
            // delete orphenaed ds
            DS.remove($ds, true);
            deferred.resolve();
            return (deferred.promise());
        }

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
    }

    function replayAddNewCol(options) {
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
        var $li = $("#tableMenu .hideTable");

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
    }

    function replayUnhideTable(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var tableId = getTableId(options.tableId);
        var $li = $("#tableMenu .unhideTable");

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
    }

    function replayAddWS() {
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
    }

    function replayRenameWS(options) {
        var wsIndex = options.worksheetIndex;
        var newName = options.newName;
        var wsId = WSManager.getOrders()[wsIndex];
        $("#worksheetTab-" + wsId + " .text").text(newName)
                                            .trigger(fakeEvent.enter);
        return (promiseWrapper(null));
    }

    function replaySwitchWS(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var wsIndex  = options.newWorksheetIndex;
        var wsId = WSManager.getOrders()[wsIndex];

        $("#worksheetTab-" + wsId).click();

        delayAction(null, "Wait", 2000)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function replayReorderWS(options) {
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
    }

    function replayDelWS(options) {
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
    }

    function replayMoveTableToWS(options) {
        var tableId = getTableId(options.tableId);
        var wsIndex = options.newWorksheetIndex;
        var wsId    = WSManager.getOrders()[wsIndex];

        WSManager.moveTable(tableId, wsId);
        return (promiseWrapper(null));
    }

    function replayMoveInactiveTableToWS(options) {
        var tableId = getTableId(options.tableId);
        var wsIndex = options.newWorksheetIndex;
        var wsId    = WSManager.getOrders()[wsIndex];
        WSManager.moveInactiveTable(tableId, wsId);
        return (promiseWrapper(null));
    }

    function replayAddNoSheetTables(options) {
        var tableIds = options.tableIds;
        for (var i = 0, len = tableIds.length; i < len; i++) {
            tableIds[i] = getTableId(tableIds[i]);
        }

        var wsIndex = options.worksheetIndex;
        var wsId    = WSManager.getOrders()[wsIndex];

        WSManager.addNoSheetTables(tableIds, wsId);
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

    function replayProfile(options, keepOpen) {
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
    }

    function replayProfileSort(options, keepOpen) {
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
                return replayProfile(options, true);
            } else {
                return replayProfileBucketing(options, true);
            }
        }

        return (deferred.promise());
    }

    function replayProfileBucketing(options, keepOpen) {
        var deferred = jQuery.Deferred();
        var bucketSize = options.bucketSize;

        options = $.extend(options, {
            "operation": SQLOps.Profile
        });

        if (!keepOpen) {
            keepOpen = profileKeepOpenCheck(options);
        }

        replayProfile(options, true)
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
    }

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

    function replayQuickAgg(options) {
        var deferred = jQuery.Deferred();
        var args = getArgs(options);

        AggModal.show.apply(window, args)
        .then(function() {
            var callback = function() {
                $("#closeAgg").click();
            };
            return delayAction(callback, "Show Quick Agg");
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function replayAddDS(options) {
        var args = getArgs(options);
        DS.addDS.apply(window, args);
        return (promiseWrapper(null));
    }

    function replayExportTable(options) {
        var deferred = jQuery.Deferred();
        
        options.tableName = changeTableName(options.tableName);

        var args = getArgs(options);
        var callback = function() {
            $("#alertHeader .close").click();
        };

        // XXX a potential here is that if exportName exists in
        // backend, it fails to export because of name confilict
        xcFunction.exportTable.apply(window, args)
        .then(function() {
            return delayAction(callback, "Show alert modal");
        })
        .then(deferred.resolve)
        .fail(deferred.resolve); // still resolve even fail!

        return (deferred.promise());
    }

    function replaySplitCol(options) {
        var args = getArgs(options);
        return (ColManager.splitCol.apply(window, args));
    }

    function replayChangeType(options) {
        // XXX not test yet!
        var args = getArgs(options);
        return (ColManager.changeType.apply(window, args));
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
