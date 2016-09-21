window.Replay = (function($, Replay) {
    var argsMap = null;
    var tabMap  = null;
    var hashTag = null;
    var replayFuncs;

    Replay.log = [];

    var Tab = {
        "DS": "#dataStoresTab",
        "WS": "#workspaceTab"
    };

    var outTime = 60000; // 1min for time out
    var checkTime = 500; // time interval of 500ms

    Replay.runWithSql = function(sqls, noAlert) {
        var deferred = jQuery.Deferred();
        var isArray = (sqls instanceof Array);

        if (typeof sqls === "object" && !isArray) {
            // when pass in the whole sqls (logs + errors)
            if (sqls.hasOwnProperty("logs")) {
                sqls = sqls.logs;
            } else {
                alert("Cannot replay the arg passed in");
                deferred.reject("Cannot replay the arg passed in");
                return (deferred.promise());
            }
        } else if (!isArray) {
            // when pass in logs array
            alert("Wrong Type of args");
            deferred.reject("Wrong Type of args");
            return deferred.promise();
        }

        var mindModeCache = gMinModeOn;

        gMinModeOn = true;

        var cli = "";
        var steps = 0;
        sqls.forEach(function(sql) {
            if (sql.hasOwnProperty("cli") && sql.cli != null) {
                if (!sql.cli.endsWith(";")) {
                    sql.cli += ";";
                }
                cli += sql.cli;
                steps++;
            }
        });

        var sql = {
            "operation": SQLOps.Replay,
            "cli"      : cli
        };
        var txId = Transaction.start({
            "operation": SQLOps.Replay,
            "sql"      : sql,
            "steps"    : steps
        });

        var queryName = xcHelper.randName("replay");
        XcalarQueryWithCheck(queryName, cli, txId)
        .then(function() {
            $("#refreshDS").click();
            TableList.refreshOrphanList(false);
            if (!noAlert) {
                alert("Replay Finished!");
            }
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Replay Fails!", error);
            Transaction.fail(txId, {
                "error": error
            });

            deferred.reject(error);
        })
        .always(function() {
            gMinModeOn = mindModeCache;
        });

        return deferred.promise();
    };

    Replay.run = function(sqls, noAlert) {
        var deferred = jQuery.Deferred();
        var isArray = (sqls instanceof Array);

        if (typeof sqls === "object" && !isArray) {
            // when pass in the whole sqls (logs + errors)
            if (sqls.hasOwnProperty("logs")) {
                sqls = sqls.logs;
            } else {
                alert("Cannot replay the arg passed in");
                deferred.reject("Cannot replay the arg passed in");
                return (deferred.promise());
            }
        } else if (!isArray) {
            // when pass in logs array
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

        PromiseHelper.chain(promises)
        .then(function() {
            if (!noAlert) {
                alert("Replay Finished!");
            }
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

            var activeTables = xcHelper.deepCopy(getActiveTables());
            for (var i = 0; i < activeTables.length; i++) {
                delete activeTables[i].timeStamp;
                delete activeTables[i].resultSetId;
            }

            var wsMeta = xcHelper.deepCopy(WSManager.getAllMeta());
            $.each(wsMeta.wsInfos, function(key, ws){
                ws.orphanedTables.sort();
            });

            var tableListText = $('#activeTablesList').find('.tableListBox').text() +
                               $('#activeTablesList').find('.columnList').text() +
                               $('#inactiveTablesList').find('.tableListBox').text() +
                               $('#inactiveTablesList').find('.columnList').text();
            tableListText = tableListText.split("").sort().join("");
            // not checking for table list order, just for content

            var info = {
                "tables"       : activeTables,
                "wsMeta"       : wsMeta,
                "firstRowText" : $('.xcTable tbody').find('tr:first').text(),
                "tableListText": tableListText,
                "dagText"      : $('#dagPanel .dagWrap:not(.inActive)').text().replace(/\s\s/g, ""),
                "lastAction"   : SQL.viewLastAction()
            };

            function getActiveTables() {
                var activeTables = [];
                for (var table in gTables) {
                    if (gTables[table].status === "active") {
                        activeTables.push(gTables[table]);
                    }
                }
                return (activeTables);
            }

            Replay.log.push(info);

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
            replayFuncs[operation](options)
            .then(function() {
                // if (!options.hasOwnProperty("newTableName")) {
                //     return;
                // }
                // var tableId = xcHelper.getTableId(options.newTableName);
                // var curId = updateIdCount(tableId, true);

                // if (curId != null) {
                //     // need to rename the table
                //     return renameTable(curId, options.newTableName);
                // }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        } else {
            console.error("Unknown operation", operation);
            deferred.reject("Unknown operation");
        }

        return deferred.promise();
    }

    // function clearTable() {
    //     var promises = [];

    //     for (var id in gTables) {
    //         promises.push(delTable.bind(this, gTables[id]));
    //     }

    //     return PromiseHelper.chain(promises);

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

    function updateIdCount(tableId, isAfterNewTable) {
        var idCount = Number(tableId.substring(2));
        var authInfo = Authentication.getInfo();
        var diff = isAfterNewTable ? 1 : 0;

        if (authInfo.idCount < idCount + diff) {
            var curId = authInfo.hashTag + (authInfo.idCount - diff);
            console.info("update id count to", idCount + diff);
            
            authInfo.idCount = idCount + diff;
            return curId;
        } else {
            return null;
        }
    }

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

    function renameTable(tableId, newTableName) {
        // XXX TODO: fix the idCount mismatch issue
        return PromiseHelper.reject("Temporary not support");

        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var oldTableName = table.getName();

        newTableName = changeTableName(newTableName);
        var newId = xcHelper.getTableId(newTableName);

        XcalarRenameTable(oldTableName, newTableName, null)
        .then(function() {
            table.tableName = newTableName;

            TableList.renameTable(tableId, newTableName);
            Dag.renameAllOccurrences(oldTableName, newTableName);

            updateTableHeader(tableId);

            // XXX not finish yet
            table.tableId = newId;
            gTables[newId] = table;

            console.info("Rename", oldTableName, "to", newTableName);
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function createFuncArgsMap() {
        argsMap = {};
        // DS.load()
        argsMap[SQLOps.DSLoad] = ["dsName", "dsFormat", "loadURL",
                                    "fieldDelim", "lineDelim", "hasHeader",
                                    "moduleName", "funcName",
                                    "isRecur", "previewSize", "quoteChar",
                                    "skipRows", "isRegex", "colsToPull"];
        argsMap[SQLOps.Sort] = ["colNum", "tableId", "order", "typeToCast"];
        argsMap[SQLOps.Filter] = ["colNum", "tableId", "fltOptions"];
        argsMap[SQLOps.Aggr] = ["colNum", "tableId", "aggrOp", "aggStr"];
        argsMap[SQLOps.Map] = ["colNum", "tableId", "fieldName",
                                "mapString", "mapOptions"];
        argsMap[SQLOps.Join] = ["lColNums", "lTableId", "rColNums", "rTableId",
                                "joinStr", "newTableName", "lRename", "rRename"
                                ];
        argsMap[SQLOps.GroupBy] = ["operator", "tableId", "indexedCols",
                                    "aggColName", "newColName", "options"];
        argsMap[SQLOps.Project] = ["colNames", "tableId"];
        argsMap[SQLOps.RenameTable] = ["tableId", "newTableName"];
        argsMap[SQLOps.HideTable] = ["tableId"];
        argsMap[SQLOps.UnhideTable] = ["tableId"];
        argsMap[SQLOps.DeleteTable] = ["tables", "tableType"];
        argsMap[SQLOps.RevertTable] = [];
        argsMap[SQLOps.DeleteCol] = ["colNums", "tableId"];
        argsMap[SQLOps.HideCols] = ["colNums", "tableId"];
        argsMap[SQLOps.UnHideCols] = ["colNums", "tableId"];
        argsMap[SQLOps.TextAlign] = ["colNums", "tableId", "alignment"];
        argsMap[SQLOps.DupCol] = ["colNum", "tableId"];
        argsMap[SQLOps.DelDupCol] = ["colNum", "tableId"];
        argsMap[SQLOps.DelAllDupCols] = ["tableId"];
        argsMap[SQLOps.ReorderTable] = ["tableId", "srcIndex", "desIndex"];
        argsMap[SQLOps.ReorderCol] = ["tableId", "oldColNum", "newColNum"];
        argsMap[SQLOps.RenameCol] = ["colNum", "tableId", "newName"];
        argsMap[SQLOps.PullCol] = ["colNum", "tableId", "pullColOptions"];
        argsMap[SQLOps.PullAllCols] = ["tableId", "colNum", "rowNum", "isArray",
                                        "options"];
        argsMap[SQLOps.SortTableCols] = ["tableId", "direction"];
        argsMap[SQLOps.ResizeTableCols] = ["tableId", "resizeTo", "columnNums"];
        argsMap[SQLOps.DragResizeTableCol] = ["tableId", "colNum", "fromWidth",
                                               "toWidth"];
        argsMap[SQLOps.DragResizeRow] = ["rowNum", "tableId", "fromHeight",
                                         "toHeight"];
        argsMap[SQLOps.BookmarkRow] = ["rowNum", "tableId"];
        argsMap[SQLOps.RemoveBookmark] = ["rowNum", "tableId"];
        argsMap[SQLOps.DSRename] = ["dsId", "newName"];
        argsMap[SQLOps.DSToDir] = ["folderId"];
        argsMap[SQLOps.Profile] = ["tableId", "colNum"];
        argsMap[SQLOps.QuickAgg] = ["tableId"];
        argsMap[SQLOps.Corr] = ["tableId"];
        argsMap[SQLOps.AddOtherUserDS] = ["name", "format", "path"];
        argsMap[SQLOps.ExportTable] = ["tableName", "exportName", "targetName", "numCols", "columns"];
        argsMap[SQLOps.SplitCol] = ["colNum", "tableId",
                                    "delimiter", "numColToGet"];
        argsMap[SQLOps.ChangeType] = ["colTypeInfos", "tableId"];
        argsMap[SQLOps.ChangeFormat] = ["colNums", "tableId", "formats"];
        argsMap[SQLOps.RoundToFixed] = ["colNums", "tableId", "decimals"];
        argsMap[SQLOps.Ext] = ["tableId", "modName", "funcName", "argList"];
        argsMap[SQLOps.MarkPrefix] = ["tableId", "prefix", "newColor"];
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
        tabMap[SQLOps.AddOtherUserDS] = Tab.DS;
    }

    function sqlFilter(sql) {
        var options = sql.options || {};
        var sqlType = options.sqlType;

        if (sqlType === SQLType.Fail) {
            return false;
        } else {
            return true;
        }

        return true;
    }

    /* REPLAYFUNCS HOLDS ALL THE REPLAY FUNCTIONS */
    replayFuncs = {};

    replayFuncs[SQLOps.DSLoad] = function(options) {
        if (options.isRetry) {
            var $grid = DS.getGridByName(options.dsName);
            var dsId = $grid.data("dsid");

            if (dsId == null) {
                return PromiseHelper.reject("wrong args");
            }

            return DS.reload(dsId, options.previewSize);
        } else {
            var args = getArgs(options);
            return DS.load.apply(window, args);
        }
    };

    replayFuncs[SQLOps.IndexDS] = function(options) {
        var deferred = jQuery.Deferred();
        // this is a UI simulation replay
        var dsId = options.dsId;
        // XXX TODO: fix this temporary fix
        var index = dsId.indexOf(".");
        dsId = Support.getUser() + dsId.substring(index);

        var columns = options.columns;
        var tableName = options.tableName;

        // keep idCount Sync Here!!!
        updateIdCount(xcHelper.getTableId(tableName));

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
            var $inputs = $("#dsTable .editableHead");
            // make sure only have this cart
            DSCart.clear();

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
            $("#dataCart .tableNameEdit").val(name);

            originTableLen = $mainFrame.find(".xcTableWrap").length;

            var callback = function() {
                $("#dataCart-submit").click();
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
        .then(function() {
            // table may not be completely finished
            setTimeout(function() {
                deferred.resolve();
            }, 500);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    replayFuncs[SQLOps.Sort] = function(options) {
        var args = getArgs(options);
        return xcFunction.sort.apply(window, args);
    };

    replayFuncs[SQLOps.Filter] = function(options) {
        var args = getArgs(options);
        return xcFunction.filter.apply(window, args);
    };

    replayFuncs[SQLOps.Aggr] = function(options) {
        var deferred = jQuery.Deferred();
        var args = getArgs(options);
        // this is a UI simulation replay
        xcFunction.aggregate.apply(window, args)
        .then(function() {
            var callback = function() {
                $("#alertModal .close").click();
            };
            return delayAction(callback, "Show alert modal");
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    replayFuncs[SQLOps.Map] = function(options) {
        var args = getArgs(options);
        return xcFunction.map.apply(window, args);
    };

    replayFuncs[SQLOps.Join] = function(options) {
        // change tableId
        options.lTableId = getTableId(options.lTableId);
        options.rTableId = getTableId(options.rTableId);
        // HACK: this is tricky that if we do not call Authentication.getHashId(),
        // the id cursor cannot sync with the original one.
        // Better way is to append hashId to newTableName in xcFunction.join()
        options.newTableName = xcHelper.getTableName(options.newTableName) +
                                Authentication.getHashId();

        var args = getArgs(options);
        return xcFunction.join.apply(window, args);
    };

    replayFuncs[SQLOps.GroupBy] = function(options) {
        var args = getArgs(options);
        return xcFunction.groupBy.apply(window, args);
    };

    replayFuncs[SQLOps.Project] = function(options) {
        var args = getArgs(options);
        return xcFunction.project.apply(window, args);
    };

    replayFuncs[SQLOps.RenameTable] = function(options) {
        options.newTableName = changeTableName(options.newTableName);
        var args = getArgs(options);
        return xcFunction.rename.apply(window, args);
    };

    replayFuncs[SQLOps.DeleteTable] = function(options) {
        // XXX TODO: test it when delete table is enabled
        var tableType = options.tableType;

        // XXX lack of delete some intermediate table (in stats modal)
        // and delete unknown source table
        if (tableType === TableType.Active) {
            var args = getArgs(options);
            return deleteTable.apply(window, args);
        } else if (tableType === TableType.Unknown){
            // XXX not sure if it's good
            // XXX not test yet
            var deferred = jQuery.Deferred();
            var tableName = changeTableName(options.tableName);

            XcalarDeleteTable(tableName, options)
            .then(function() {
                Dag.makeInactive(tableName, true);
                deferred.resolve();
            })
            .fail(deferred.reject);
            return (deferred.promise());
        } else {
            return PromiseHelper.resolve(null);
        }
    };

    replayFuncs[SQLOps.DestroyDS] = function(options) {
        // UI simulation replay
        var deferred = jQuery.Deferred();
        var $gridView = $("#dsListSection").find(".gridItems");
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

        return deferred.promise();
    };

    replayFuncs[SQLOps.ExportTable] = function(options) {
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

        return deferred.promise();
    };

    replayFuncs[SQLOps.AddNewCol] = function(options) {
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

        delayAction(callback, "Show Col Menu", 1000)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    replayFuncs[SQLOps.DeleteCol] = function(options) {
        var args = getArgs(options);
        ColManager.delCol.apply(window, args);

        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.HideCols] = function(options) {
        var args = getArgs(options);
        ColManager.hideCols.apply(window, args);

        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.UnHideCols] = function(options) {
        var args = getArgs(options);
        ColManager.unhideCols.apply(window, args);

        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DupCol] = function(options) {
        var args = getArgs(options);
        ColManager.dupCol.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DelDupCol] = function(options) {
        var args = getArgs(options);
        ColManager.delDupCols.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DelAllDupCols] = function(options) {
        var args = getArgs(options);
        ColManager.delAllDupCols.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.TextAlign] = function(options) {
        var args = getArgs(options);
        ColManager.textAlign.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.ReorderTable] = function(options) {
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

        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.ReorderCol] = function(options) {
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
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.RenameCol] = function(options) {
        var args = getArgs(options);
        ColManager.renameCol.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.PullCol] = function(options) {
        var args = getArgs(options);
        if (options.pullColOptions &&
            options.pullColOptions.source === "fnBar") {

            return ColManager("pull", options.usrStr, options.tableId,
                               options.colNum);
        } else {
            return ColManager.pullCol.apply(window, args);
        }

    };

    replayFuncs[SQLOps.PullAllCols] = function(options) {
        var args = getArgs(options);
        ColManager.unnest.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.ArchiveTable] = function(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        // XX will not work with multiple tables
        var tableId = getTableId(options.tableIds[0]);
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

        return deferred.promise();
    };

    replayFuncs[SQLOps.RevertTable] = function(options) {
        var deferred = jQuery.Deferred();
        var newTableId = getTableId(options.tableId);
        var newTableName = gTables[newTableId].tableName;
        var oldTableId = getTableId(options.oldTableId);
        var oldTableName = gTables[oldTableId].tableName;
        var wsIndex = options.worksheetIndex;
        var wsId = WSManager.getOrders()[wsIndex];

        TblManager.refreshTable([newTableName], null, [oldTableName],
                                wsId, null, {isUndo: true})
        .then(function() {
            SQL.add("Revert Table", {
                "operation"     : SQLOps.RevertTable,
                "tableName"     : newTableName,
                "oldTableName"  : oldTableName,
                "tableId"       : newTableId,
                "oldTableId"    : oldTableId,
                "tableType"     : options.tableType,
                "worksheet"     : wsId,
                "worksheetIndex": options.worksheetIndex,
                "htmlExclude"   : ["tableType", "oldTableName"]
            });
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return deferred.promise();
    };

    replayFuncs[SQLOps.SortTableCols] = function(options) {
        var args = getArgs(options);
        TblManager.sortColumns.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.ResizeTableCols] = function(options) {
        var args = getArgs(options);
        TblManager.resizeColumns.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DragResizeTableCol] = function(options) {
        var args = getArgs(options);
        console.log('resized replay');
        TblAnim.resizeColumn.apply(window, args);

        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DragResizeRow] = function(options) {
        var args = getArgs(options);
        TblAnim.resizeRow.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.BookmarkRow] = function(options) {
        var args = getArgs(options);
        bookmarkRow.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.RemoveBookmark] = function(options) {
        var args = getArgs(options);
        unbookmarkRow.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.HideTable] = function(options) {
        var args = getArgs(options);
        TblManager.hideTable.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.UnhideTable] = function(options) {
        var args = getArgs(options);
        TblManager.unHideTable.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.AddWS] = function() {
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
    };

    replayFuncs[SQLOps.RenameWS] = function(options) {
        var wsIndex = options.worksheetIndex;
        var newName = options.newName;
        var wsId = WSManager.getOrders()[wsIndex];
        $("#worksheetTab-" + wsId + " .text").val(newName)
                                            .trigger(fakeEvent.enter);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.SwitchWS] = function(options) {
        // UI simulation
        var deferred = jQuery.Deferred();
        var wsIndex  = options.newWorksheetIndex;
        var wsId = WSManager.getOrders()[wsIndex];

        $("#worksheetTab-" + wsId).trigger(fakeEvent.mousedown);

        delayAction(null, "Wait", 1000)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    replayFuncs[SQLOps.ReorderWS] = function(options) {
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

        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DelWS] = function(options) {
        // UI simulation
        var deferred    = jQuery.Deferred();
        var originWSLen = WSManager.getWSLen();
        var wsIndex     = options.worksheetIndex;
        var delType     = options.delType;
        var wsId        = WSManager.getOrders()[wsIndex];

        if (originWSLen === 1) {
            // invalid deletion
            console.error("This worksheet should not be deleted!");
            deferred.reject("This worksheet should not be deleted!");
        }

        $("#worksheetTab-" + wsId + " .wsMenu").click();
        $('#worksheetTabMenu').find('li.delete').click();

        var callback = function() {
            if ($("#alertModal").is(":visible")) {
                if (delType === DelWSType.Del) {
                    $("#alertActions .deleteTale").click();
                } else if (delType === DelWSType.Archive) {
                    $("#alertActions .archiveTable").click();
                }
            }
        };

        delayAction(callback, "Wait", 1000)
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

            return checkHelper(checkFunc, "Worksheet is deleted");
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    replayFuncs[SQLOps.HideWS] = function(options) {
        var wsIndex = options.worksheetIndex;
        var wsId = WSManager.getOrders()[wsIndex];
        WSManager.hideWS(wsId);

        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.UnHideWS] = function(options) {
        var wsOrders = options.worksheetOrders;
        var wsIds = [];
        for (var i = 0; i < wsOrders.length; i++) {
            wsIds.push(WSManager.getHiddenWS()[wsOrders[i]]);
        }
        return WSManager.unhideWS(wsIds);
    };

    replayFuncs[SQLOps.MoveTableToWS] = function(options) {
        var tableId = getTableId(options.tableId);
        var wsIndex = options.newWorksheetIndex;
        var wsId = WSManager.getOrders()[wsIndex];

        WSManager.moveTable(tableId, wsId);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.ActiveTables] = function(options) {
         // redo sent to worksheet
        var deferred = jQuery.Deferred();

        var tableNames = options.tableNames;
        var tableIds = [];
        var tableId;
        for (var i = 0; i < tableNames.length; i++) {
            tableId = xcHelper.getTableId(tableNames[i]);
            tableIds.push(getTableId(tableId));
        }
        var $tableList;
        var tableType = options.tableType;

        TableList.refreshOrphanList()
        .then(function() {
            if (tableType === TableType.Archived) {
                $tableList = $('#archivedTableList');
            } else if (tableType === TableType.Orphan) {
                $tableList = $('#orphanedTableList');
            } else {
                console.error(tableType, "not support redo!");
            }

            var $lis = [];
            $tableList.find(".tableInfo").each(function() {
                var $li = $(this);
                var id = $li.data("id");
                if (tableIds.indexOf(id) >= 0) {
                    $li.find(".addTableBtn").click();
                    $lis.push($li);
                }
            });

            return TableList.activeTables(tableType, options.noSheetTables,
                                        options.wsToSent);
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });

        return deferred.promise();
    };

    // addNoSheetTables: function(options) {
    //     var tableIds = options.tableIds;
    //     for (var i = 0, len = tableIds.length; i < len; i++) {
    //         tableIds[i] = getTableId(tableIds[i]);
    //     }

    //     var wsIndex = options.worksheetIndex;
    //     var wsId    = WSManager.getOrders()[wsIndex];

    //     WSManager.addNoSheetTables(tableIds, wsId);
    //     return PromiseHelper.resolve(null);
    // },

    // when adding inactive/orphaned table from dag
    replayFuncs[SQLOps.MoveInactiveTableToWS] = function(options) {
        var tableId = getTableId(options.tableId);
        var wsIndex = options.newWorksheetIndex;
        var wsId = WSManager.getOrders()[wsIndex];
        return WSManager.moveInactiveTable(tableId, wsId,
                                            options.tableType);
    };

    replayFuncs[SQLOps.CreateFolder] = function() {
        DS.newFolder();
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DSRename] = function(options) {
        var args = getArgs(options);
        DS.rename.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DSDropIn] = function(options) {
        var $grid   = DS.getGrid(options.dsId);
        var $target = DS.getGrid(options.targetDSId);
        DS.dropToFolder($grid, $target);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DSInsert] = function(options) {
        var $grid    = DS.getGrid(options.dsId);
        var $sibling = DS.getGrid(options.siblingDSId);
        var isBefore = options.isBefore;
        DS.insert($grid, $sibling, isBefore);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DSToDir] = function(options) {
        var args = getArgs(options);
        DS.goToDir.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DSDropBack] = function(options) {
        var $grid = DS.getGrid(options.dsId);
        DS.dropToParent($grid);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.DelFolder] = function(options) {
        var $grid = DS.getGrid(options.dsId);
        DS.remove($grid);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.Profile] = function(options, keepOpen) {
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
                return PromiseHelper.resolve(null);
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
    };

    replayFuncs[SQLOps.ProfileSort] = function(options, keepOpen) {
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
                return PromiseHelper.resolve(null);
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

        return deferred.promise();
    };

    replayFuncs[SQLOps.ProfileBucketing] = function(options, keepOpen) {
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
            var $input = $("#profile-range");
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
                return PromiseHelper.resolve(null);
            } else {
                var callback = function() {
                    $("#profileModal .close").click();
                };
                return delayAction(callback, "Show Profile Bucketing");
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    replayFuncs[SQLOps.QuickAgg] = function(options) {
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

        return deferred.promise();
    };

    replayFuncs[SQLOps.Corr] = function(options) {
        var deferred = jQuery.Deferred();
        var args = getArgs(options);

        AggModal.corrAgg.apply(window, args)
        .then(function() {
            var callback = function() {
                $("#aggModal .close").click();
            };
            return delayAction(callback, "Show Correlation");
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    replayFuncs[SQLOps.AddOtherUserDS] = function(options) {
        var args = getArgs(options);
        DS.addOtherUserDS.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.SplitCol] = function(options) {
        var args = getArgs(options);
        return ColManager.splitCol.apply(window, args);
    };

    replayFuncs[SQLOps.ChangeType] = function(options) {
        var args = getArgs(options);
        return ColManager.changeType.apply(window, args);
    };

    replayFuncs[SQLOps.ChangeFormat] = function(options) {
        var args = getArgs(options);
        ColManager.format.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.RoundToFixed] = function(options) {
        var args = getArgs(options);
        ColManager.roundToFixed.apply(window, args);
        return PromiseHelper.resolve(null);
    };

    replayFuncs[SQLOps.Ext] = function(options) {
        var argList = options.argList;
        for (var key in argList) {
            var val = argList[key];
            if (val instanceof Object) {
                argList[key] = new XcSDK.Column(val.colName, val.colType);
            }
        }
        var args = getArgs(options);

        return ExtensionManager.trigger.apply(window, args);
    };

    replayFuncs[SQLOps.MarkPrefix] = function(options) {
        var args = getArgs(options);
        TblManager.markPrefix.apply(window, args);
        return PromiseHelper.resolve(null);
    }

    // renameOrphanTable: function(options) {

    // },

    // addDataset: function(options) {

    // },

    // previewDataSet: function(options) {

    // },

    // destroyPreviewDataSet: function(options) {

    // },

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
                clearInterval(timer);
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
        if (time === null) {
            time = 5000;
        }

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
