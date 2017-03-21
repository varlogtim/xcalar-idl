window.WSManager = (function($, WSManager) {
    var $workSheetTabs; // $("#worksheetTabs");
    var $hiddenWorksheetTabs;  // $("#hiddenWorksheetTabs");

    var worksheetGroup = new XcMap();
    var wsOrder = [];
    var hiddenWS = [];

    var noSheetTables = [];

    // only a front cache of scroll bar position
    var scrollTracker = new WorksheetScrollTracker();

    var tableIdToWSIdMap = {};  // find wsId by table id
    var wsNameToIdMap = {};  // find wsId by wsName

    var activeWorksheet = null;

    // constant
    var defaultName = "Sheet ";
    var nameSuffix = 1;
    var slideTime = 180;

    // Setup function for WSManager Module
    WSManager.setup = function() {
        $workSheetTabs = $("#worksheetTabs");
        $hiddenWorksheetTabs = $("#hiddenWorksheetTabs");
        addEventListeners();
        TableList.setup();
    };

    WSManager.initialize = function() {
        try {
            TableList.initialize();
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    // Restore worksheet structure from backend
    // should be called before drawing xcTables and data flow graphs
    WSManager.restore = function(sheetInfos) {
        wsOrder = sheetInfos.wsOrder || [];
        hiddenWS = sheetInfos.hiddenWS || [];
        noSheetTables = sheetInfos.noSheetTables || [];

        var oldWorksheetLookup = sheetInfos.wsInfos || {};

        for (var worksheetId in oldWorksheetLookup) {
            var worksheet = oldWorksheetLookup[worksheetId];
            cacheWorksheetInfo(worksheet);
            for (var key in WSTableType) {
                var tableType = WSTableType[key];
                worksheet[tableType].forEach(function(tableId) {
                    tableIdToWSIdMap[tableId] = worksheet.getId();
                });
            }
        }

        var oldActiveWS = sheetInfos.activeWS;
        if (oldActiveWS != null && wsOrder.includes(oldActiveWS)) {
            activeWorksheet = oldActiveWS;
        }

        initializeWorksheet();
        initializeHiddenWorksheets();
    };

    // Clear all data in WSManager
    WSManager.clear = function() {
        worksheetGroup.clear();
        wsOrder = [];
        noSheetTables = [];
        tableIdToWSIdMap = {};
        wsNameToIdMap = {};
        activeWorksheet = null;
        nameSuffix = 1;
        initializeWorksheet(true);
        initializeHiddenWorksheets();
        TableList.clear();
    };

    WSManager.getAllMeta = function() {
        return new WSMETA({
            "wsInfos": worksheetGroup.entries(),
            "wsOrder": wsOrder,
            "hiddenWS": hiddenWS,
            "noSheetTables": noSheetTables,
            "activeWS": activeWorksheet
        });
    };

    // Get all worksheets
    WSManager.getWorksheets = function() {
        return worksheetGroup.entries();
    };

    WSManager.getWSById = function(worksheetId) {
        return worksheetGroup.get(worksheetId);
    };

    // Get current active worksheet
    WSManager.getActiveWS = function() {
        return activeWorksheet;
    };

    // not including the hidden worksheets
    WSManager.getWSList = function() {
        return wsOrder;
    };

    WSManager.getWSByIndex = function(index) {
        return wsOrder[index];
    };

    WSManager.indexOfWS = function(wsId) {
        return wsOrder.indexOf(wsId);
    };

    WSManager.getNumOfWS = function() {
        return wsOrder.length;
    };

    // returns an array of worksheet Ids
    WSManager.getHiddenWSList = function() {
        return hiddenWS;
    };

    // Get tables that are not in any worksheets
    WSManager.getNoSheetTables = function() {
        return noSheetTables;
    };

    // Get worksheet id by worksheet name
    WSManager.getWSIdByName = function(wsName) {
        return wsNameToIdMap[wsName];
    };

    // Get worksheet's name from worksheet id
    WSManager.getWSName = function(worksheetId) {
        return worksheetGroup.get(worksheetId).getName();
    };

    // add worksheet
    WSManager.addWS = function(wsId, wsName, wsIndex) {
        var currentWorksheet = activeWorksheet;

        if (SQL.isRedo() || SQL.isUndo()) {
            if (wsId == null) {
                console.error("Undo Add worksheet must have wsId!");
                return null;
            }
            wsId = newWorksheet(wsId, wsName, wsIndex);
        } else {
            wsId = newWorksheet(wsId, wsName);
        }

        // after newWoksheet() called, activeWorksheet will change
        SQL.add(SQLTStr.AddWS, {
            "operation": SQLOps.AddWS,
            "worksheetName": WSManager.getWSName(wsId),
            "worksheetId": wsId,
            "currentWorksheet": currentWorksheet
        });

        // focus on new worksheet
        scrollTracker.cache(activeWorksheet);
        WSManager.focusOnWorksheet(wsId);
        WorkbookManager.updateWorksheet(wsOrder.length);

        return wsId;
    };

    // delete worksheet
    WSManager.delWS = function(wsId, delType) {
        var ws = worksheetGroup.get(wsId);
        var wsIndex = WSManager.indexOfWS(wsId);
        var sqlOptions = {
            "operation": SQLOps.DelWS,
            "worksheetId": wsId,
            "worksheetIndex": wsIndex,
            "worksheetName": ws.getName(),
            "tables": xcHelper.deepCopy(ws.tables),
            "archivedTables": xcHelper.deepCopy(ws.archivedTables),
            "delType": delType
        };

        if (delType === DelWSType.Empty) {
            // this may be redundant, but it's safe to check again
            if (!wsHasActiveTables(ws)) {
                archiveTableHelper(wsId);
                rmWorksheet(wsId);

                // for empty worksheet, no need for this attr
                delete sqlOptions.tables;
                SQL.add(SQLTStr.DelWS, sqlOptions);
            } else {
                console.error("Not an empty worksheet!");
                return;
            }
        } else if (delType === DelWSType.Del) {
            deleteTableHelper(wsId);
            rmWorksheet(wsId);
            SQL.add(SQLTStr.DelWS, sqlOptions);
        } else if (delType === DelWSType.Archive) {
            archiveTableHelper(wsId);
            rmWorksheet(wsId);
            SQL.add(SQLTStr.DelWS, sqlOptions);
        } else {
            console.error("Unexpected delete worksheet type");
            return;
        }
    };

    WSManager.renameWS = function(worksheetId, name) {
        var $tab = $("#worksheetTab-" + worksheetId);
        var $text = $tab.find(".text");
        var worksheet = worksheetGroup.get(worksheetId);
        var oldName = worksheet.getName();

        if (name == null || name === "" || wsNameToIdMap.hasOwnProperty(name)) {
            $text.val(oldName);
            return;
        }

        xcTooltip.disable($text);

        delete wsNameToIdMap[oldName];
        worksheet.setName(name);
        wsNameToIdMap[name] = worksheetId;

        $text.val(name);
        xcTooltip.changeText($text, name);
        xcTooltip.enable($text);
        // use worksheet class to find table lists in right side bar
        $("#tableListSections .worksheetInfo.worksheet-" + worksheetId)
        .text(name);

        SQL.add(SQLTStr.RenameWS, {
            "operation": SQLOps.RenameWS,
            "worksheetId": worksheetId,
            "worksheetIndex": WSManager.indexOfWS(worksheetId),
            "oldName": oldName,
            "newName": name
        });

        // for updating the bottom bar when rename worksheet
        StatusMessage.updateLocation();
    };

    // For reorder worksheet (undo/redo and replay use)
    WSManager.reorderWS = function(oldWSIndex, newWSIndex) {
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

        reorderWSHelper(oldWSIndex, newWSIndex);
    };

    WSManager.hideWS = function(wsId) {
        var index = wsOrder.indexOf(wsId);
        wsOrder.splice(index, 1);
        hiddenWS.push(wsId);

        var $hiddenTab = $(getHiddenWSHTML(wsId));
        var ws = worksheetGroup.get(wsId);
        var tables = ws.tables;
        var tempHiddenTables = ws.tempHiddenTables;

        // tables strcuture will change when archive, so copy the id first
        var tableIds = tables.map(function(tableId) {
            return tableId;
        });

        tableIds.forEach(function(tableId) {
            toggleTableArchive(tableId, tables, tempHiddenTables);
            TblManager.hideWorksheetTable(tableId);
            gTables[tableId].freeResultset();
        });

        TableList.tablesToHiddenWS([wsId]);

        $hiddenWorksheetTabs.removeClass("hint");

        var $tab = $workSheetTabs.find("#worksheetTab-" + wsId);
        if (gMinModeOn) {
            $hiddenWorksheetTabs.append($hiddenTab);
            $tab.remove();
            rmHandler(wsId, index);
        } else {
            $hiddenTab.appendTo($hiddenWorksheetTabs)
                    .hide().slideDown(slideTime);

            $tab.slideUp(slideTime, function() {
                $tab.remove();
                rmHandler(wsId, index);
            });
        }

        SQL.add(SQLTStr.HideWS, {
            "operation": SQLOps.HideWS,
            "worksheetId": wsId,
            "worksheetName": ws.name,
            "worksheetIndex": index,
            "htmlExclude": ['worksheetIndex']
        });
    };

    WSManager.unhideWS = function(wsIds, prevWsIndex) {
        var deferred = jQuery.Deferred();
        if (!(wsIds instanceof Array)) {
            wsIds = [wsIds];
        }

        $(".tooltip").hide();
        var wsNames = [];
        var curWSId;
        var hiddenWSOrder = [];
        var hiddenWSCopy = xcHelper.deepCopy(hiddenWS);
        var promises = [];
        wsIds.forEach(function(wsId) {
            curWSId = wsId;

            var ws = worksheetGroup.get(wsId);
            var tempHiddenTables = ws.tempHiddenTables;
            var wsIndex = hiddenWS.indexOf(wsId);
            hiddenWSOrder.push(hiddenWSCopy.indexOf(wsId));
            var tables = ws.tables;

            hiddenWS.splice(wsIndex, 1);
            if (prevWsIndex == null) {
                wsOrder.push(wsId);
            } else {
                wsOrder.splice(prevWsIndex, 0, wsId);
            }

            wsNames.push(ws.name);

            var tableIds = tempHiddenTables.map(function(tableId) {
                return tableId;
            });

            tableIds.forEach(function(tableId) {
                toggleTableArchive(tableId, tempHiddenTables, tables);
            });

            var $tab = $hiddenWorksheetTabs.find('#worksheetTab-' + wsId);
            if (gMinModeOn) {
                $tab.remove();
            } else {
                $tab.slideUp(slideTime, function() {
                    $tab.remove();
                });
            }

            makeWorksheet(wsId);
            promises.push(TableList.tableBulkAction.bind(this,
                                         "add", TableType.WSHidden, wsId));
        });

        if (hiddenWS.length === 0) {
            $hiddenWorksheetTabs.addClass("hint");
        }

        PromiseHelper.chain(promises)
        .then(function() {
            // focus on last that unhide
            WSManager.focusOnWorksheet(curWSId);
            SQL.add(SQLTStr.UnHideWS, {
                "operation": SQLOps.UnHideWS,
                "worksheetIds": wsIds,
                "worksheetNames": wsNames,
                "worksheetOrders": hiddenWSOrder,
                "htmlExclude": ["worksheetOrders"]
            });
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    // Get worksheet index from table id
    WSManager.getWSFromTable = function(tableId) {
        return (tableIdToWSIdMap[tableId]);
    };

    WSManager.isTableInActiveWS = function(tableId) {
        var tableWorksheet = WSManager.getWSFromTable(tableId);
        return (activeWorksheet === tableWorksheet);
    };

    // Add table to worksheet
    WSManager.addTable = function(tableId, worksheetId) {
        // it only add to orphanedTables first, since later we
        // need to call WSManager.replaceTable()
        if (tableId in tableIdToWSIdMap) {
            return tableIdToWSIdMap[tableId];
        } else {
            if (worksheetId == null) {
                worksheetId = activeWorksheet;
            }

            addTableToWorksheet(worksheetId, tableId, "orphanedTables");
            return worksheetId;
        }
    };

    // For reorder table use
    WSManager.reorderTable = function(tableId, srcIndex, desIndex) {
        var wsId = tableIdToWSIdMap[tableId];
        var tables = worksheetGroup.get(wsId).tables;

        var t = tables[srcIndex];
        tables.splice(srcIndex, 1);
        tables.splice(desIndex, 0, t);
    };

    // For archive table use
    WSManager.archiveTable = function(tableId, tempHide) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws = worksheetGroup.get(wsId);

        var srcTables = ws.tables;
        var desTables;
        if (tempHide) {
            desTables = ws.tempHiddenTables;
        } else {
            desTables = ws.archivedTables;
        }

        toggleTableArchive(tableId, srcTables, desTables);
    };

    // For inArchive table use
    WSManager.activeTable = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws = worksheetGroup.get(wsId);

        var srcTables = ws.archivedTables;
        var desTables = ws.tables;

        toggleTableArchive(tableId, srcTables, desTables);
    };

    // relative to only tables in it's worksheet, not other worksheets
    WSManager.getTableRelativePosition = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        if (wsId == null) {
            return -1;
        }

        var tableIndex = worksheetGroup.get(wsId).tables.indexOf(tableId);
        return tableIndex;
    };

    // Get a table's position relative to all tables in every worksheet
    //ex. {ws1:[tableA, tableB], ws2:[tableC]} tableC's position is 2
    WSManager.getTablePosition = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        if (wsId == null) {
            return -1;
        }

        var tableIndex = worksheetGroup.get(wsId).tables.indexOf(tableId);

        if (tableIndex < 0) {
            console.error("Table is not in active tables array!");
            return -1;
        }

        var position = 0;
        for (var i = 0, len = wsOrder.length; i < len; i++) {
            var curWS = wsOrder[i];
            if (curWS === wsId) {
                break;
            } else {
                position += worksheetGroup.get(curWS).tables.length;
            }
        }

        position += tableIndex;

        return position;
    };

    // replace a table by putting tableId into active list
    // and removing tablesToRm from active list and putting it into orphaned list
    // or a different list designated by options.removeToDest
    // options:
    //      position: position to insert table
    //      removeToDest: where to send tablesToRm
    WSManager.replaceTable = function(tableId, locationId, tablesToRm, options) {
        var ws;
        options = options || {};
        // append table to the last of active tables
        if (locationId == null) {
            ws = worksheetGroup.get(tableIdToWSIdMap[tableId]);
            var srcTables;
            if (!ws || !ws.tempHiddenTables) {
                return;
            }

            if (ws.tempHiddenTables.indexOf(tableId) !== -1) {
                srcTables = ws.tempHiddenTables;
            } else if (ws.archivedTables.indexOf(tableId) !== -1) {
                srcTables = ws.archivedTables;
            } else {
                srcTables = ws.orphanedTables;
            }
            if (options.position != null) {
                toggleTableArchive(tableId, srcTables, ws.tables,
                                    options.position);
            } else {
                toggleTableArchive(tableId, srcTables, ws.tables);
            }

            return;
        }

        // replace with locationId and put other tables into orphanedTables
        var wsId = tableIdToWSIdMap[locationId];
        var tables = worksheetGroup.get(wsId).tables;
        var insertIndex = tables.indexOf(locationId);
        var rmTableId;

        // XXX remove from original table, may have better way
        WSManager.removeTable(tableId);
        tables.splice(insertIndex, 0, tableId);
        tableIdToWSIdMap[tableId] = wsId;

        if (tablesToRm == null) {
            tablesToRm = [locationId];
        }

        var dest;
        for (var i = 0, len = tablesToRm.length; i < len; i++) {
            rmTableId = tablesToRm[i];
            ws = worksheetGroup.get(tableIdToWSIdMap[rmTableId]);
            // xx options.removeToDest currently only supports Undone table type
            if (options.removeToDest === TableType.Undone) {
                dest = ws.undoneTables;
            } else {
                dest = ws.orphanedTables;
            }
            toggleTableArchive(rmTableId, ws.tables, dest);
        }
    };

    // Move table to another worksheet
    WSManager.moveTable = function(tableId, newWSId, tableType) {
        var oldTablePos = WSManager.getTableRelativePosition(tableId);
        var oldWSId = WSManager.removeTable(tableId);
        var wsName = worksheetGroup.get(newWSId).name;
        tableType = tableType || WSTableType.Active;

        addTableToWorksheet(newWSId, tableId, tableType);

         // refresh right side bar
        $("#tableListSections .tableInfo").each(function() {
            var $li = $(this);
            if ($li.data("id") === tableId) {
                var $workhseetInfo = $li.find(".worksheetInfo");

                $workhseetInfo.removeClass("worksheet-" + oldWSId)
                                .addClass("worksheet-" + newWSId);
                $workhseetInfo.text(wsName);
            }
        });

        if (tableType !== WSTableType.Active) {
            return;
            // no need to move html tables when not an active table
        }

        var $xcTableWrap = $('#xcTableWrap-' + tableId);

        $xcTableWrap.removeClass("worksheet-" + oldWSId)
                    .addClass("worksheet-" + newWSId);
        $('#mainFrame').append($xcTableWrap);

        // refresh dag
        $("#dagPanel .dagWrap.worksheet-" + oldWSId).each(function() {
            var $dagWrap = $(this);

            if ($dagWrap.data("id") === tableId) {
                $dagWrap.removeClass("worksheet-" + oldWSId)
                        .addClass("worksheet-" + newWSId);
                $('#dagPanel').find('.dagArea').append($dagWrap);
            }
        });

        WSManager.focusOnWorksheet(newWSId, false, tableId);
        xcHelper.centerFocusedTable($xcTableWrap, false);
        SQL.add(SQLTStr.MoveTableToWS, {
            "operation": SQLOps.MoveTableToWS,
            "tableName": gTables[tableId].tableName,
            "tableId": tableId,
            "oldWorksheetId": oldWSId,
            "oldWorksheetIndex": WSManager.indexOfWS(oldWSId),
            "oldWorksheetName": worksheetGroup.get(oldWSId).name,
            "oldTablePos": oldTablePos,
            "newWorksheetId": newWSId,
            "newWorksheetIndex": WSManager.indexOfWS(newWSId),
            "worksheetName": wsName
        });
    };

    // XXX Cheng: I think WSManager.activeTable, WSManager,archiveTable
    // and WSManager.replaceTable can be generalized into this function
    // will refactor in 1.1
    //
    // changes table status and moves it to the proper worksheet category
    // newStatus: string, TableType.Active, TableType.Archived, TableType.Orphan
    WSManager.changeTableStatus = function(tableId, newStatus) {
        var srcTables;
        var destTables;
        var ws = worksheetGroup.get(tableIdToWSIdMap[tableId]);
        if (!ws) {
            console.error('No ws for table ' + tableId + ' found.');
            return;
        }

        if (ws.tempHiddenTables.indexOf(tableId) !== -1) {
            srcTables = ws.tempHiddenTables;
        } else if (ws.tables.indexOf(tableId) !== -1) {
            srcTables = ws.tables;
        } else if (ws.archivedTables.indexOf(tableId) !== -1) {
            srcTables = ws.archivedTables;
        } else if (ws.undoneTables.indexOf(tableId) !== -1) {
            srcTables = ws.undoneTables;
        } else {
            srcTables = ws.orphanedTables;
        }

        switch (newStatus) {
            case (TableType.Active):
                destTables = ws.tables;
                break;
            case (TableType.Archived):
                destTables = ws.archivedTables;
                break;
            case (TableType.Orphan):
                destTables = ws.orphanedTables;
                break;
            case (TableType.Undone):
                destTables = ws.undoneTables;
                break;
            default:
                console.error('invalid new status');
                destTables = ws.tables;
        }

        toggleTableArchive(tableId, srcTables, destTables);
    };

    // Move inactive table to another worksheet
    WSManager.moveInactiveTable = function(tableId, newWSId, tableType) {
        var deferred = jQuery.Deferred();
        var newWS = worksheetGroup.get(newWSId);

        // this sql will be modified in findTableListHelper()
        var sql = {
            "operation": SQLOps.MoveInactiveTableToWS,
            "tableId": tableId,
            "tableType": tableType,
            "newWorksheetId": newWSId,
            "newWorksheetIndex": WSManager.indexOfWS(newWSId),
            "newWorksheetName": newWS.name
        };

        findTableListHelper()
        .then(function() {
            var wsToSend = null;
            if (tableType === TableType.Orphan) {
                wsToSend = newWSId;
            }
            return TableList.tableBulkAction("add", tableType, wsToSend);
        })
        .then(function() {
            // this sql is modified in findTableListHelper()
            SQL.add(SQLTStr.MoveInactiveTableToWS, sql);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Move inactive to worksheet failed", error);
            deferred.reject(error);
        });

        return deferred.promise();

        function findTableListHelper() {
            var innerDeferrd = jQuery.Deferred();

            if (tableType === TableType.Orphan) {
                // when it's from Orphan table

                // This happens when an orphaned table has been added to the
                // worksheet and we try to pull its ancestor which doesn't exist in
                // the meta either
                // It's really a pull not a move
                // 1) Refresh Orphan List
                // 2) Trigger Add from Orphan list
                TableList.refreshOrphanList()
                .then(function() {
                    $('#orphanedTablesList .tableInfo[data-id="' +
                       tableId + '"]')
                        .find('.addTableBtn').click();
                    innerDeferrd.resolve();
                })
                .fail(function(error) {
                    Alert.error(WSTStr.AddOrphanFail, error);
                    innerDeferrd.reject(error);
                });
            } else if (tableType === TableType.Archived){
                $('#inactiveTablesList .tableInfo[data-id="' + tableId + '"]')
                    .find('.addTableBtn').click();

                // move inactive table to another worksheet
                var oldWSId = WSManager.removeTable(tableId);
                WSManager.addTable(tableId, newWSId);

                sql.oldWorksheetId = oldWSId;
                sql.oldWorksheetName = worksheetGroup.get(oldWSId).name;

                // var wsName = newWS.name;
                // refresh right side bar
                // $("#inactiveTablesList .tableInfo").each(function() {
                //     var $li = $(this);
                //     if ($li.data("id") === tableId) {
                //         var $worksheetInfo = $li.find(".worksheetInfo");

                //         $worksheetInfo.removeClass("worksheet-" + oldWSId)
                //                         .addClass("worksheet-" + newWSId);
                //         $worksheetInfo.text(wsName);
                //     }
                // });

                innerDeferrd.resolve();
            } else {
                console.error("Cannot support this table type");
                innerDeferrd.reject("Cannot support this table type");
            }


            return innerDeferrd.promise();
        }
    };

    // Remove table that are not in any worksheet
    WSManager.rmNoSheetTable = function(tableId) {
        var index = noSheetTables.indexOf(tableId);

        if (index < 0) {
            console.error("Not find table in no sheet tables");
            return;
        }

        noSheetTables.splice(index, 1);
    };

    // Remove table from worksheet
    // finds table where ever it is and leaves no trace of it
    WSManager.removeTable = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        var tableIndex;

        if (wsId == null) {
            // table that has no worksheet
            tableIndex = noSheetTables.indexOf(tableId);
            if (tableIndex > -1) {
                noSheetTables.splice(tableIndex, 1);
                return (null);
            }

            // that could be an orphaned
            console.warn("Table not exist in worksheet");
            return (null);
        }

        var ws = worksheetGroup.get(wsId);
        var tables = ws.tables;
        tableIndex = tables.indexOf(tableId);

        // find where the table is
        if (tableIndex < 0) {
            tables = ws.archivedTables;
            tableIndex = tables.indexOf(tableId);
        }
        if (tableIndex < 0) {
            tables = ws.orphanedTables;
            tableIndex = tables.indexOf(tableId);
        }
        if (tableIndex < 0) {
            tables = ws.tempHiddenTables;
            tableIndex = tables.indexOf(tableId);
        }
        if (tableIndex < 0) {
            tables = ws.undoneTables;
            tableIndex = tables.indexOf(tableId);
        }

        if (tableIndex < 0) {
            if (ws.lockedTables.indexOf(tableId) > -1) {
                WSManager.unlockTable(tableId);
                delete tableIdToWSIdMap[tableId];
                return (wsId);
            } else {
                console.error("Not find the table!");
                return (null);
            }
        }

        tables.splice(tableIndex, 1);
        delete tableIdToWSIdMap[tableId];

        return (wsId);
    };

    // Refresh Worksheet space to focus on one worksheet
    // tableId is optional and if provided, will focus on table
    WSManager.focusOnWorksheet = function(wsId, notfocusTable, tableId) {
        // update activeWorksheet first
        if (wsId == null) {
            wsId = activeWorksheet;
        }
        activeWorksheet = wsId;
        var $tabs = $workSheetTabs.find(".worksheetTab");
        var $tables = $("#mainFrame .xcTableWrap");

        // refresh worksheet tab
        xcHelper.removeSelectionRange();
        $tabs.removeClass("active");

        var $activeTab = $("#worksheetTab-" + wsId);
        $activeTab.addClass("active");

        // refresh mainFrame
        var $curActiveTables = $tables.filter(".worksheet-" + wsId);
        $tables.addClass("inActive");
        $curActiveTables.removeClass("inActive");

        // if WSManager.focusOnWorksheet is triggered through a panel switch,
        // offscreenTables were hidden for performance reasons. Use settimeout
        // so panel switch is smoother, then reveal offscreen tables
        setTimeout(function() {
            TblFunc.unhideOffScreenTables();
        },0);
        // position sticky row column on visible tables
        TblFunc.moveFirstColumn();

        //vertically align any locked table icons
        var mainFrameHeight = $('#mainFrame').height();
        $('.tableLocked:visible').each(function() {
            var $tableWrap = $(this);
            var tbodyHeight = $tableWrap.find('tbody').height() + 1;
            var tableWrapHeight = $tableWrap.find('.xcTbodyWrap').height();
            var $lockedIcon = $tableWrap.find('.lockedTableIcon');
            var iconHeight = $lockedIcon.height();
            var topPos = 50 * ((tableWrapHeight - (iconHeight / 2)) /
                                mainFrameHeight);
            topPos = Math.min(topPos, 40);
            $lockedIcon.css('top', topPos + '%');
            $tableWrap.find('.tableCover').height(tbodyHeight);
        });

        // make table undraggable if only one in worksheet
        TblFunc.checkTableDraggable();

        // show dataflow groups corresponding to current worksheet
        DagPanel.focusOnWorksheet(activeWorksheet);

        // refresh table and scrollbar
        if (notfocusTable || $curActiveTables.length === 0) {
            // no table to focus
            RowScroller.empty();
            $('#dagScrollBarWrap').hide();
            if ($curActiveTables.length > 0) {
                $curActiveTables.find('.xcTable:visible').each(function() {
                    TblFunc.matchHeaderSizes($(this));
                });
            }
        } else {
            var isFocus = false;

            if (tableId != null) {
                isFocus = true;
                TblFunc.focusTable(tableId);
            }
            $curActiveTables.find('.xcTable:visible').each(function() {
                var $table = $(this);
                TblFunc.matchHeaderSizes($table);
            });

            if (!isFocus) {
                var tableIdToFocus;
                if ($curActiveTables.find('.tblTitleSelected').length === 0) {
                    tableIdToFocus = $curActiveTables.eq(0).data('id');
                    TblFunc.focusTable(tableIdToFocus);
                } else {
                    var $focusedTable = $curActiveTables
                                         .find('.tblTitleSelected')
                                         .closest('.xcTableWrap');
                    tableIdToFocus = $focusedTable.data('id');
                    TblFunc.focusTable(tableIdToFocus);
                }
            }
        }

        StatusMessage.updateLocation();
    };

    // Get html list of worksheets
    WSManager.getWSLists = function(isAll) {
        var html = "";

        for (var i = 0, len = wsOrder.length; i < len; i++) {
            var wsId = wsOrder[i];
            if (!isAll && (wsId === activeWorksheet)) {
                continue;
            }
            var wsName = worksheetGroup.get(wsId).getName();
            if (wsId === activeWorksheet) {
                html += '<li class="activeWS" data-ws="' + wsId + '">' +
                            wsName +
                            '<i class="icon xi-show"></i>' +
                        '</li>';
            } else {
                html += '<li data-ws="' + wsId + '">' +
                            wsName +
                        '</li>';
            }
        }

        return html;
    };

    WSManager.getTableList = function() {
        var tableList = "";
        var hasMultipleWorksheet = (wsOrder.length > 1);
        // group table tab by worksheet (only show active table)
        wsOrder.forEach(function(worksheetId) {
            var worksheet = worksheetGroup.get(worksheetId);
            worksheet.tables.forEach(function(tableId, index) {
                var table = gTables[tableId];
                if (index === 0 && hasMultipleWorksheet) {
                    tableList += '<div class="sectionLabel">' +
                                    worksheet.getName() +
                                '</div>';
                }

                var tableName = table.getName();
                tableList +=
                    '<li class="tooltipOverflow"' +
                    ' data-original-title="' + tableName + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body" ' +
                    ' data-ws="' + worksheetId + '"' +
                    ' data-id="' + tableId + '">' +
                        tableName +
                    '</li>';
            });
        });

        return tableList;
    };

    WSManager.lockTable = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws = worksheetGroup.get(wsId);
        if (ws) {
            if (ws.lockedTables.indexOf(tableId) === -1) {
                ws.lockedTables.push(tableId);
            }
            $('#worksheetTab-' + wsId).addClass('locked');
        }
    };

    WSManager.unlockTable = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws = worksheetGroup.get(wsId);
        if (ws && ws.lockedTables.length > 0) {
            var tableIndex = ws.lockedTables.indexOf(tableId);
            ws.lockedTables.splice(tableIndex, 1);
            if (ws.lockedTables.length === 0) {
                $('#worksheetTab-' + wsId).removeClass('locked');
            }
        }
    };

    WSManager.addNoSheetTables = function(tableIds, wsId) {
        tableIds.forEach(function(tableId) {
            WSManager.rmNoSheetTable(tableId);
            WSManager.addTable(tableId, wsId);
        });
    };

    WSManager.switchWS = function(worksheetId) {
        // cache current scroll bar position
        scrollTracker.cache(activeWorksheet);
        $('#mainFrame').addClass('scrollLocked');
        WSManager.focusOnWorksheet(worksheetId);
        // change to origin position
        scrollTracker.restore(worksheetId);
        TblManager.alignTableEls();
        setTimeout(function() {
            // allow time for scrollbar to adjust before unlocking
            $('#mainFrame').removeClass('scrollLocked');
        }, 0);
      
    };

    // will not drop undone tables if isNoDelete, instead will change table
    // to orphaned
    WSManager.dropUndoneTables = function() {
        var deferred = jQuery.Deferred();
        var tables = [];
        var table;
        for (var tableId in gTables) {
            table = gTables[tableId];
            if (table.getType() === TableType.Undone) {
                if (table.isNoDelete()) {
                    WSManager.changeTableStatus(tableId, TableType.Orphan);
                    table.beOrphaned();
                } else {
                    tables.push(table.getId());
                }
            }
        }
        
        if (tables.length) {
            TblManager.deleteTables(tables, TableType.Undone, true, true)
            .always(function() {
                // just resolve even if it fails
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    };

    // Add worksheet events, helper function for WSManager.setup()
    function addEventListeners() {
        // switch to table list
        $("#tableListTab").click(function() {
            $("#workspaceMenu").find(".menuSection.worksheets")
                            .addClass("xc-hidden")
                            .end()
                            .find(".menuSection.tables")
                            .removeClass("xc-hidden");
        });

        // switch to worksheet list
        $("#worksheetListTab").click(function() {
            $("#workspaceMenu").find(".menuSection.tables")
                            .addClass("xc-hidden")
                            .end()
                            .find(".menuSection.worksheets")
                            .removeClass("xc-hidden");
        });

        // click to add new worksheet
        $("#addWorksheet").click(function() {
            WSManager.addWS();
        });

        var $section = $("#worksheetListSection");
        $("#worksheetListSection").on("click", ".listInfo", function() {
            $(this).closest(".listWrap").toggleClass("active");
        });

        $section.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        // rename
        $workSheetTabs.on({
            "focus": function() {
                $workSheetTabs.sortable("disable");
                $(this).select();
            },
            "blur": function() {
                var $text = $(this);
                var newName = $text.val().trim();
                var wsId = $text.closest(".worksheetTab").data("ws");
                WSManager.renameWS(wsId, newName);

                $text.prop("disabled", true);
                $text.scrollLeft(0);
                $workSheetTabs.sortable("enable");
            },
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    $(this).blur();
                }
            },
            "dblclick": function() {
                $(this).prop("disabled", false).focus();
            }
        }, ".worksheetTab .text");

        // switch worksheet
        $workSheetTabs.on("mousedown", ".worksheetTab", function(event) {
            if (event.which !== 1) {
                return;
            }

            var $target = $(event.target);
            if ($target.hasClass('wsMenu') ||
                $target.parent('.wsMenu').length) {
                return;
            }
            var $tab = $(this);

            if (!$tab.hasClass("active")) {
                var wsId = $tab.data("ws");
                WSManager.switchWS(wsId);
            }
        });

        var initialIndex;

        $workSheetTabs.sortable({
            "revert": 200,
            "axis": "y",
            "distance": 2,
            "handle": ".draggableArea",
            "containment": "#workspaceMenu",
            "start": function(event, ui) {
                var $tab = $(ui.item).addClass('dragging');
                initialIndex = $tab.index();
                var cursorStyle =
                '<style id="moveCursor" type="text/css">*' +
                    '{cursor:move !important; cursor: -webkit-grabbing !important;' +
                    'cursor: -moz-grabbing !important;}' +
                    '.tooltip{display: none !important;}' +
                '</style>';

                $(document.head).append(cursorStyle);
            },
            "stop": function(event, ui) {
                var $tab = $(ui.item).removeClass("dragging");
                var newIndex = $tab.index();
                if (initialIndex !== newIndex) {
                    reorderWSHelper(initialIndex, newIndex);
                }
                $('#moveCursor').remove();
            }
        });

        $hiddenWorksheetTabs.on("click", ".unhide", function() {
            var $tab = $(this).blur();
            var wsId = $tab .closest(".worksheetTab").data('ws');
            WSManager.unhideWS(wsId);
        });

        setupWorksheetMenu();
    }

    function setupWorksheetMenu() {
        var $tabMenu = $("#worksheetTabMenu");
        xcMenu.add($tabMenu);

        $workSheetTabs[0].oncontextmenu = function(event) {
            var $target = $(event.target).closest(".worksheetTab");
            if ($target.length) {
                $target.find(".wsMenu").trigger("click");
                event.preventDefault();
            }
        };

        $workSheetTabs.on("click", ".wsMenu", function() {
            var $wsMenu = $(this);
            var $tab = $wsMenu.closest(".worksheetTab");
            var wsId = $tab.data("ws");
            var numTabs = $workSheetTabs.find(".worksheetTab").length;

            // switch to that worksheet first
            if (!$tab.hasClass("active") && !$tab.hasClass("locked")) {
                WSManager.switchWS(wsId);
            }
            xcHelper.dropdownOpen($wsMenu, $tabMenu, {
                "offsetX": -7,
                "floating": true,
                "toClose": function() {
                    return ($tabMenu.is(":visible") &&
                            $tabMenu.data("ws") === wsId) ||
                            $tab.hasClass("locked");
                },
                "callback": function() {
                    if (numTabs === 1) {
                        $tabMenu.find(".delete").addClass("unavailable");
                        $tabMenu.find(".hide").addClass("unavailable");
                    } else {
                        $tabMenu.find(".delete").removeClass("unavailable");
                        $tabMenu.find(".hide").removeClass("unavailable");
                    }

                    if ($tab.prev().length === 0) {
                        $tabMenu.find(".moveUp").addClass("unavailable");
                    } else {
                        $tabMenu.find(".moveUp").removeClass("unavailable");
                    }

                    if ($tab.next().length === 0) {
                        $tabMenu.find(".moveDown").addClass("unavailable");
                    } else {
                        $tabMenu.find(".moveDown").removeClass("unavailable");
                    }

                    $tabMenu.data("ws", wsId);
                }
            });
        });

        $tabMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var wsId = $tabMenu.data("ws");
            if ($li.hasClass("unavailable")) {
                return;
            } else if ($li.hasClass("rename")) {
                $("#worksheetTab-" + wsId).find(".text").trigger("dblclick");
            } else if ($li.hasClass("hide")) {
                WSManager.hideWS(wsId);
            } else if ($li.hasClass("delete")) {
                delWSCheck(wsId);
            } else if ($li.hasClass("moveUp")) {
                moveTab(true);
            } else if ($li.hasClass("moveDown")) {
                moveTab(false);
            }

            function moveTab(isUp) {
                var $tab = $("#worksheetTab-" + wsId);
                var index = $tab.index();
                var newIndex;
                if (isUp) {
                    $tab.insertBefore($tab.prev().eq(0));
                    newIndex = index - 1;
                } else {
                    $tab.insertAfter($tab.next().eq(0));
                    newIndex = index + 1;
                }

                reorderWSHelper(index, newIndex);
            }
        });
    }

    function generateWorksheetId() {
        var id = getIdCode();
        var tryCnt = 0;
        var maxTry = 260; // 26 letters * 10 nums

        while (worksheetGroup.has(id) && tryCnt < maxTry) {
            id = getIdCode();
            tryCnt++;
        }

        if (tryCnt >= maxTry) {
            console.error("Worksheet id overflow!");
            // this is how we generate id if there is overflow
            id = new Date().getTime();
        }

        return id;

        function getIdCode() {
            // totally has 260 combination
            var rand1 = Math.floor(Math.random() * 26) + 97; // [97, 123)
            var rand2 = Math.floor(Math.random() * 10); // [0, 10)
            //[a-z][0-9]
            return String.fromCharCode(rand1) + rand2;
        }
    }

    function initializeWorksheet(clearing) {
        // remove the placeholder in html
        $workSheetTabs.empty();

        var len = wsOrder.length;
        if (len === 0) {
            newWorksheet();
        } else {
            for (var i = 0; i < len; i++) {
                makeWorksheet(wsOrder[i]);
            }
        }
        // focus on the saved or first worksheet
        if (clearing || activeWorksheet == null) {
            activeWorksheet = wsOrder[0];
        }
        WSManager.focusOnWorksheet(activeWorksheet);
    }

    function initializeHiddenWorksheets() {
        $hiddenWorksheetTabs.find(":not(.hint)").remove();

        var len = hiddenWS.length;
        if (len !== 0) {
            var html = "";
            var wsId;
            for (var i = 0; i < len; i++) {
                wsId = hiddenWS[i];
                html += getHiddenWSHTML(wsId);
            }
            $hiddenWorksheetTabs.removeClass("hint").append(html);
        } else {
            $hiddenWorksheetTabs.addClass("hint");
        }
    }

    // Create a new worksheet
    function newWorksheet(worksheetId, worksheetName, worksheetIndex) {
        if (worksheetId == null) {
            worksheetId = generateWorksheetId();
        }

        if (worksheetName == null) {
            worksheetName = defaultName + (nameSuffix++);
            while (wsNameToIdMap[worksheetName] != null) {
                worksheetName = defaultName + (nameSuffix++);
            }
        } else {
            var tryCnt = 1;
            var temp = worksheetName;
            while (wsNameToIdMap[worksheetName] != null && tryCnt < 50) {
                worksheetName = temp + (tryCnt++);
            }

            if (tryCnt >= 50) {
                console.error("Too many tries");
                worksheetName = xcHelper.randName(temp);
            }
        }

        createWorkshetObj(worksheetId, worksheetName, worksheetIndex);
        makeWorksheet(worksheetId);

        return worksheetId;
    }

    // Make a worksheet
    function makeWorksheet(worksheetId) {
        var $tab = $(getWorksheetTabHtml(worksheetId));
        if (gMinModeOn) {
            $workSheetTabs.append($tab);
        } else {
            $tab.appendTo($workSheetTabs)
                .hide().slideDown(slideTime);
        }
    }

    function reorderWSHelper(oldWSIndex, newWSIndex) {
        // reorder wsOrder
        var wsId = wsOrder.splice(oldWSIndex, 1)[0];
        wsOrder.splice(newWSIndex, 0, wsId);
        SQL.add(SQLTStr.ReorderWS, {
            "operation": SQLOps.ReorderWS,
            "worksheetName": worksheetGroup.get(wsId).name,
            "oldWorksheetIndex": oldWSIndex,
            "newWorksheetIndex": newWSIndex
        });
    }

    // Remove worksheet
    function rmWorksheet(wsId) {
        var ws = worksheetGroup.get(wsId);

        ws.tables.forEach(function(tableId) {
            delete tableIdToWSIdMap[tableId];
        });

        ws.archivedTables.forEach(function(tableId) {
            delete tableIdToWSIdMap[tableId];
        });

        ws.orphanedTables.forEach(function(tableId) {
            delete tableIdToWSIdMap[tableId];
        });

        delete wsNameToIdMap[ws.name];
        worksheetGroup.delete(wsId);

        var index = WSManager.indexOfWS(wsId);
        wsOrder.splice(index, 1);

        var $tab = $("#worksheetTab-" + wsId);
        if (gMinModeOn) {
            $tab.remove();
            rmHandler(wsId, index);
        } else {
            $tab.slideUp(slideTime, function() {
                $tab.remove();
                rmHandler(wsId, index);
            });
        }

        WorkbookManager.updateWorksheet(wsOrder.length);
    }

    function rmHandler(wsId, index) {
        // switch to another worksheet
        if (activeWorksheet === wsId) {
            var wsToFocus;
            if (wsOrder[index - 1]) {
                wsToFocus = wsOrder[index - 1];
            } else {
                wsToFocus = wsOrder[0];
            }

            WSManager.focusOnWorksheet(wsToFocus);
            scrollTracker.restore(wsToFocus);
        }
    }

    function createWorkshetObj(worksheetId, worsheetName, worksheetIndex) {
        if (worksheetGroup.has(worksheetId)) {
            console.error("Worksheet", ws, "already exists");
            return;
        }

        var worksheet = new WorksheetObj({
            "id": worksheetId,
            "name": worsheetName
        });

        if (worksheetIndex == null) {
            wsOrder.push(worksheetId);
        } else {
            wsOrder.splice(worksheetIndex, 0, worksheetId);
        }

        cacheWorksheetInfo(worksheet);

        return worksheet;
    }

    function cacheWorksheetInfo(worksheet) {
        if (worksheet == null) {
            return;
        }

        var worksheetId = worksheet.getId();
        var worksheetName = worksheet.getName();

        worksheetGroup.set(worksheetId, worksheet);
        wsNameToIdMap[worksheetName] = worksheetId;
    }

    function addTableToWorksheet(worksheetId, tableId, tableType) {
        var worksheet = worksheetGroup.get(worksheetId);
        var successfulAdd = worksheet.addTable(tableId, tableType);

        if (successfulAdd) {
            tableIdToWSIdMap[tableId] = worksheetId;
        }
    }

    function delWSCheck(wsId) {
        var worksheet = worksheetGroup.get(wsId);
        if (!wsHasActiveTables(worksheet)) {
            WSManager.delWS(wsId, DelWSType.Empty);
        } else {
            // delete worksheet with tables
            Alert.show({
                "title": WSTStr.DelWS,
                "msg": WSTStr.DelWSMsg,
                "buttons": [
                    {
                        "name": TblTStr.DEL,
                        "className": "deleteTable",
                        "tooltip": CommonTxtTstr.NoUndone,
                        "func": function() {
                            WSManager.delWS(wsId, DelWSType.Del);
                        }
                    },
                    {
                        "name": TblTStr.ARCHIVE,
                        "className": "archiveTable",
                        "func": function() {
                            WSManager.delWS(wsId, DelWSType.Archive);
                        }
                    }
                ]
            });
        }
    }

    function wsHasActiveTables(worksheet) {
        return (worksheet.tables.length > 0 || worksheet.tempHiddenTables > 0);
    }

    // Helper function to delete tables in a worksheet
    function deleteTableHelper(wsId) {
        var deferred = jQuery.Deferred();
        
        var ws = worksheetGroup.get(wsId);
        ws.archivedTables.forEach(function(tableId) {
            noSheetTables.push(tableId);
        });

        $("#inactiveTablesList").find(".worksheetInfo.worksheet-" + wsId)
                    .removeClass(".worksheet-" + wsId)
                    .addClass("inactive").text(SideBarTStr.NoSheet);

        var activeTables = worksheetGroup.get(wsId).tables;
        var errors;

        TblManager.deleteTables(activeTables, TableType.Active)
        .then(function(res) {
            if (res) {
                // could be errors, could be successful tables
                errors = arguments;
            }
            deferred.resolve();
        })
        .fail(function(error) {
            errors = arguments;
            deferred.reject(error);
        })
        .always(function() {
            if (errors) {
                deleteTableFailHandler(errors);
            }
            TableList.refreshOrphanList();
        });
    }

    function deleteTableFailHandler(errors) {
        var options = {
            "remove": true,
            "keepInWS": false,
            "noFocusWS": true
        };
        var tableName;
        var tableId;
        var failedMsg;
        var tableList = "";
        var failFound = false;
        for (var i = 0; i < errors.length; i++) {
            if (errors[i] && errors[i].fails) {
                failFound = true;
                for (var j = 0; j < errors[i].fails.length; j++) {
                    tableName = errors[i].fails[j].tables;
                    tableId = xcHelper.getTableId(tableName);
                    TblManager.sendTableToOrphaned(tableId, options);
                    tableList += tableName + ", ";
                    if (!failedMsg) {
                        failedMsg = errors[i].fails[j].error;
                    }
                }
            }
        }
        if (!failFound) { // only successful tables were found
            return;
        }
        if (!failedMsg) {
            failedMsg = TblTStr.DelFail;
        }
        if (tableList) {
            tableList = tableList.substr(0, tableList.length - 2);
            failedMsg += ". " + StatusMessageTStr.NotDeletedList + tableList;
        }
        
        Alert.error(TblTStr.DelFail, failedMsg);
    }

    // Helper function to archive tables in a worksheet
    function archiveTableHelper(wsId) {
        // archive all active tables (save it in a temp array because
        // archiveTable will change the structure of worksheet.tables)
        var ws = worksheetGroup.get(wsId);

        // put archivedTables first, becaues archive will change the meta
        ws.archivedTables.forEach(function(tableId) {
            noSheetTables.push(tableId);
        });

        ws.orphanedTables.forEach(function(tableId) {
            noSheetTables.push(tableId);
        });

        var tableIds = [];
        ws.tables.forEach(function(tableId) {
            noSheetTables.push(tableId);
            tableIds.push(tableId);
        });

        // use tableIds as a cache because TblManager.archiveTable
        // will change the structure of ws.tables
        tableIds.forEach(function(tableId) {
            TblManager.archiveTable(tableId, {"del": ArchiveTable.Keep});
        });

        $("#inactiveTablesList").find(".worksheetInfo.worksheet-" + wsId)
                .removeClass(".worksheet-" + wsId)
                .addClass("inactive").text(SideBarTStr.NoSheet);
    }

    function toggleTableArchive(tableId, srcTables, desTables, index) {
        var tableIndex = srcTables.indexOf(tableId);

        if (tableIndex < 0) {
            // console.warn("Do not find the table, add it to desTables");
            return;
        }

        if (index == null) {
            index = desTables.length;
        }

        // move from scrTables to desTables
        srcTables.splice(tableIndex, 1);
        desTables.splice(index, 0, tableId);
    }

    // html of worksheet tab, helper function for makeWorksheet()
    function getWorksheetTabHtml(worksheetId) {
        var worksheet = worksheetGroup.get(worksheetId);
        var worksheetName = worksheet.getName();
        var id = "worksheetTab-" + worksheetId;
        // need clickable class for .wsMenu to not trigger $(".menu").hide()
        var html =
            '<li id="' + id + '"class="worksheetTab"' +
            ' data-ws="' + worksheetId + '">' +
                '<span class="draggableArea"></span>' +
                '<i class="eye icon xi-show fa-15"></i>' +
                '<input data-original-title="' + worksheetName +
                '" data-container="body"' +
                ' data-toggle="tooltip" data-placement="top"' +
                ' type="text" class="text textOverflow tooltipOverflow"' +
                ' spellcheck="false" value="' + worksheetName + '" disabled>' +
                '<i class="wsMenu clickable icon xi-ellipsis-h fa-15"></i>' +
            '</li>';

        return html;
    }

    function getHiddenWSHTML(wsId) {
        var worksheet = worksheetGroup.get(wsId);
        if (!worksheet) {
            return "";
        }
        var name = worksheet.getName();
        var id = "worksheetTab-" + wsId;
        var html =
            '<li id="' + id + '"class="worksheetTab hiddenTab"' +
            ' data-ws="' + wsId + '">' +
                '<input data-original-title="' + name +
                '" data-container="body"' +
                ' data-toggle="tooltip" data-placement="top"' +
                ' type="text" class="text textOverflow tooltipOverflow"' +
                ' spellcheck="false" value="' + name + '" disabled>' +
                '<i title="' + TooltipTStr.UnhideWS + '" data-container="body"' +
                ' data-toggle="tooltip" data-placement="top"' +
                ' class="unhide icon xi-monitor fa-15"></i>' +
            '</li>';

        return html;
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        WSManager.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (WSManager);
}(jQuery, {}));
