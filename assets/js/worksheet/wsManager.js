window.WSManager = (function($, WSManager) {
    var $workSheetTabSection; // $("#worksheetTabs");
    var $tabMenu;             // $('#worksheetTabMenu');

    var wsLookUp = {}; // {id, date, tables, archivedTables}
    var wsOrder = [];
    var hiddenWS = [];

    var noSheetTables = [];
    var aggInfos = {};

    var wsScollBarPosMap = {}; // only a front cache of scroll bar position

    var tableIdToWSIdMap = {};  // find wsId by table id
    var wsNameToIdMap  = {};  // find wsId by wsName

    var activeWorksheet = null;
    // var for naming worksheet automatically
    var defaultName = "Sheet ";
    var nameSuffix = 1;
    var maxWSLen = 260; // 26 letters * 10 nums

    // Setup function for WSManager Module
    WSManager.setup = function() {
        $workSheetTabSection = $("#worksheetTabs");
        $tabMenu = $('#worksheetTabMenu');
        addWSEvents();
    };

    // Restore worksheet structure from backend
    WSManager.restore = function(sheetInfos) {
        sheetInfos = sheetInfos || {};
        wsOrder = sheetInfos.wsOrder || [];
        hiddenWS = sheetInfos.hiddenWS || [];
        wsLookUp = sheetInfos.wsInfos || {};
        noSheetTables = sheetInfos.noSheetTables || [];
        aggInfos = sheetInfos.aggInfos || {};

        var wsId;
        for (wsId in wsLookUp) {
            // remove the deleted worksheets
            var ws = wsLookUp[wsId];

            ws.lockedTables = [];
            wsNameToIdMap[ws.name] = wsId;

            var tables = ws.tables;
            for (var i = 0; i < tables.length; i++) {
                tableIdToWSIdMap[tables[i]] = wsId;
            }

            var archivedTables = ws.archivedTables;
            for (var j = 0; j < archivedTables.length; j++) {
                tableIdToWSIdMap[archivedTables[j]] = wsId;
            }

            var tempHiddenTables = ws.tempHiddenTables;
            for (var i = 0; i < tempHiddenTables.length; i++) {
                tableIdToWSIdMap[tempHiddenTables[i]] = wsId;
            }

            var orphanedTables = ws.orphanedTables;
            for (var i = 0; i < orphanedTables.length; i++) {
                tableIdToWSIdMap[orphanedTables[i]] = wsId;
            }
        }

        initializeWorksheet();
        initializeHiddenWorksheets();
    };

    // Clear all data in WSManager
    WSManager.clear = function() {
        wsLookUp = {};
        wsOrder = [];
        noSheetTables = [];
        tableIdToWSIdMap = {};
        wsNameToIdMap = {};
        aggInfos = {};
        activeWorksheet = null;
        nameSuffix = 1;
        initializeWorksheet(true);
        initializeHiddenWorksheets();
    };

    WSManager.getAllMeta = function() {
        return new WSMETA({
            "wsInfos"      : wsLookUp,
            "wsOrder"      : wsOrder,
            "hiddenWS"     : hiddenWS,
            "noSheetTables": noSheetTables,
            "aggInfos"     : aggInfos
        });
    };

    // Get all worksheets
    WSManager.getWorksheets = function() {
        return (wsLookUp);
    };

    WSManager.getWSById = function(wsId) {
        return (wsLookUp[wsId]);
    };

    WSManager.getOrders = function() {
        return (wsOrder);
    };

    // returns an array of worksheet Ids
    WSManager.getHiddenWS = function() {
        return (hiddenWS);
    };

    // Get tables that are not in any worksheets
    WSManager.getNoSheetTables = function() {
        return (noSheetTables);
    };

    WSManager.getWSOrder = function(wsId) {
        return wsOrder.indexOf(wsId);
    };

    // Get number of worksheets that is not null
    WSManager.getWSLen = function() {
        return (wsOrder.length);
    };

    // add worksheet
    WSManager.addWS = function(wsId, wsName, wsIndex) {
        var currentWorksheet = activeWorksheet;

        if (SQL.isRedo() || SQL.isUndo()) {
            if (wsId == null) {
                console.error("Undo Add worksheet must have wsId!");
                return;
            }
            wsId = newWorksheet(wsId, wsName, wsIndex);
        } else {
            wsId = newWorksheet();
        }

        // after newWoksheet() called, activeWorksheet will change
        SQL.add("Create Worksheet", {
            "operation"       : SQLOps.AddWS,
            "worksheetName"   : WSManager.getWSName(wsId),
            "worksheetId"     : wsId,
            "currentWorksheet": currentWorksheet
        });
    };

    // delete worksheet
    WSManager.delWS = function(wsId, delType) {
        var ws = wsLookUp[wsId];
        var wsIndex = WSManager.getWSOrder(wsId);
        var sqlOptions = {
            "operation"     : SQLOps.DelWS,
            "worksheetId"   : wsId,
            "worksheetIndex": wsIndex,
            "worksheetName" : ws.name,
            "tables"        : xcHelper.deepCopy(ws.tables),
            "archivedTables": xcHelper.deepCopy(ws.archivedTables),
            "delType"       : delType
        };

        if (delType === DelWSType.Empty) {
            // this may be redundant, but it's safe to check again
            if (ws.tables.length === 0 && ws.archivedTables.length === 0 &&
                ws.tempHiddenTables.length === 0) {
                rmWorksheet(wsId);

                // for empty worksheet, no need for this two attr
                delete sqlOptions.tables;
                delete sqlOptions.archivedTables;
                SQL.add("Delete Worksheet", sqlOptions);
            } else {
                console.error("Not an empty worksheet!");
                return;
            }
        } else if (delType === DelWSType.Del) {
            delTableHelper(wsId);
            rmWorksheet(wsId);
            SQL.add("Delete Worksheet", sqlOptions);
        } else if (delType === DelWSType.Archive) {
            archiveTableHelper(wsId);
            rmWorksheet(wsId);
            SQL.add("Delete Worksheet", sqlOptions);
        } else {
            console.error("Unexpected delete worksheet type");
            return;
        }
    };

    // Rename a worksheet
    WSManager.renameWS = function(wsId, name) {
        var $tab = $("#worksheetTab-" + wsId);
        var $label = $tab.find(".label");
        var $text = $label.find(".text");
        var ws = wsLookUp[wsId];
        var oldName = ws.name;

        delete wsNameToIdMap[oldName];
        ws.name = name;
        wsNameToIdMap[name] = wsId;

        $label.attr("data-original-title", name);
        $text.data("title", name).blur();
        // use worksheet class to find table lists in right side bar
        $("#tableListSections .worksheetInfo.worksheet-" + wsId).text(name);

        SQL.add("Rename Worksheet", {
            "operation"     : SQLOps.RenameWS,
            "worksheetId"   : wsId,
            "worksheetIndex": WSManager.getWSOrder(wsId),
            "oldName"       : oldName,
            "newName"       : name
        });
    };

    // For reorder table use
    WSManager.reorderTable = function(tableId, srcIndex, desIndex) {
        var wsId   = tableIdToWSIdMap[tableId];
        var tables = wsLookUp[wsId].tables;

        var t = tables[srcIndex];
        tables.splice(srcIndex, 1);
        tables.splice(desIndex, 0, t);
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

    // For archive table use
    WSManager.archiveTable = function(tableId, tempHide) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws   = wsLookUp[wsId];

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
        var ws   = wsLookUp[wsId];

        var srcTables = ws.archivedTables;
        var desTables = ws.tables;

        toggleTableArchive(tableId, srcTables, desTables);
    };

    // WSManager.orphanTable = function(tableId) {
    //     var wsId = tableIdToWSIdMap[tableId];
    //     var ws   = wsLookUp[wsId];

    //     var status = gTables[tableId];

    //     var srcTables = ws.tables;
    //     var desTables;
    //     if (tempHide) {
    //         desTables = ws.tempHiddenTables;
    //     } else {
    //         desTables = ws.archivedTables;
    //     }

    //     toggleTableArchive(tableId, srcTables, desTables);
    // };

    WSManager.getTableRelativePosition = function(tableId) {
        var wsId  = tableIdToWSIdMap[tableId];
        var tableIndex = wsLookUp[wsId].tables.indexOf(tableId);
        return tableIndex;
    };

    // Get a table's position relative to all tables in every worksheet
    //ex. {ws1:[tableA, tableB], ws2:[tableC]} tableC's position is 2
    WSManager.getTablePosition = function(tableId) {
        var wsId  = tableIdToWSIdMap[tableId];
        var tableIndex = wsLookUp[wsId].tables.indexOf(tableId);

        if (tableIndex < 0) {
            console.error("Table is not in active tables array!");
            return (-1);
        }

        var position = 0;
        for (var i = 0, len = wsOrder.length; i < len; i++) {
            var curWS = wsOrder[i];
            if (curWS === wsId) {
                break;
            } else {
                position += wsLookUp[curWS].tables.length;
            }
        }

        position += tableIndex;

        return (position);
    };

    // Get worksheet index from table id
    WSManager.getWSFromTable = function(tableId) {
        return (tableIdToWSIdMap[tableId]);
    };

    // Get worksheet id by worksheet name
    WSManager.getWSIdByName = function(wsName) {
        return (wsNameToIdMap[wsName]);
    };

    // Get worksheet's name from its index
    WSManager.getWSName = function(wsId) {
        return (wsLookUp[wsId].name);
    };

    // Get current active worksheet
    WSManager.getActiveWS = function() {
        return (activeWorksheet);
    };

    // Add table to worksheet
    WSManager.addTable = function(tableId, wsId) {
        // it only add to orphanedTables first, since later we
        // need to call WSManager.replaceTable()
        if (tableId in tableIdToWSIdMap) {
            return tableIdToWSIdMap[tableId];
        } else {
            if (wsId == null) {
                wsId = activeWorksheet;
            }

            setWorksheet(wsId, {"orphanedTables": tableId});

            return wsId;
        }
    };

    // replace a table by putting tableId into active list
    // and removing tablesToRm from active list and putting it into orphaned list
    // options:
    // position: position to insert table
    WSManager.replaceTable = function(tableId, locationId, tablesToRm, options) {
        var ws;
        options = options || {};
        // append table to the last of active tables
        if (locationId == null) {
            ws = wsLookUp[tableIdToWSIdMap[tableId]];
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
        var tables = wsLookUp[wsId].tables;
        var insertIndex = tables.indexOf(locationId);
        var rmTableId;

        // XXX remove from original table, may have better way
        WSManager.removeTable(tableId);
        tables.splice(insertIndex, 0, tableId);
        tableIdToWSIdMap[tableId] = wsId;

        if (tablesToRm == null) {
            tablesToRm = [locationId];
        }

        for (var i = 0, len = tablesToRm.length; i < len; i++) {
            rmTableId = tablesToRm[i];
            ws = wsLookUp[tableIdToWSIdMap[rmTableId]];
            toggleTableArchive(rmTableId, ws.tables, ws.orphanedTables);
        }
    };

    // Move table to another worksheet
    WSManager.moveTable = function(tableId, newWSId, tableType) {
        var oldTablePos = WSManager.getTableRelativePosition(tableId);
        var oldWSId = WSManager.removeTable(tableId);
        var wsName = wsLookUp[newWSId].name;
        var wsOptions = {};
        tableType = tableType || "tables";
        wsOptions[tableType] = tableId;

        setWorksheet(newWSId, wsOptions);

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

        if (tableType !== "tables") {
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
        SQL.add("Move Table to worksheet", {
            "operation"        : SQLOps.MoveTableToWS,
            "tableName"        : gTables[tableId].tableName,
            "tableId"          : tableId,
            "oldWorksheetId"   : oldWSId,
            "oldWorksheetIndex": WSManager.getWSOrder(oldWSId),
            "oldWorksheetName" : wsLookUp[oldWSId].name,
            "oldTablePos"      : oldTablePos,
            "newWorksheetId"   : newWSId,
            "newWorksheetIndex": WSManager.getWSOrder(newWSId),
            "worksheetName"    : wsName
        });
    };

    // changes table status and moves it to the proper worksheet category
    WSManager.changeTableStatus = function(tableId, newStatus) {
        var srcTables;
        var destTables;
        var ws = wsLookUp[tableIdToWSIdMap[tableId]];
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
            default:
                console.error('invalid new status');
                destTables = ws.tables;
        }

        toggleTableArchive(tableId, srcTables, destTables);
    };

    // Move inactive table to another worksheet
    WSManager.moveInactiveTable = function(tableId, newWSId, tableType) {
        var deferred = jQuery.Deferred();
        var newWS = wsLookUp[newWSId];

        // this sql will be modified in findTableListHelper()
        var sql = {
            "operation"        : SQLOps.MoveInactiveTableToWS,
            "tableId"          : tableId,
            "tableType"        : tableType,
            "newWorksheetId"   : newWSId,
            "newWorksheetIndex": WSManager.getWSOrder(newWSId),
            "newWorksheetName" : newWS.name
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
            WSManager.focusOnLastTable();
            // this sql is modified in findTableListHelper()
            SQL.add("Move Inactive Table To Worksheet", sql);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Move inactive to worksheet failed", error);
            deferred.reject();
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
                    $("#orphanedTablesList span:contains(" + tableId + ")")
                    .parent().find('.addTableBtn').click();
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
                sql.oldWorksheetName = wsLookUp[oldWSId].name;

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

    WSManager.hideWS = function(wsId) {
        var index = wsOrder.indexOf(wsId);
        wsOrder.splice(index, 1);
        hiddenWS.push(wsId);
        $('#bottomTabArea').addClass('hasHiddenWS');

        var hiddenWSHTML = getHiddenWSHTML(wsId);
        var $hiddenWorksheetsTab = $('#hiddenWorksheetsTab');
        $hiddenWorksheetsTab.find('ul').prepend(hiddenWSHTML);
        $hiddenWorksheetsTab.find('.mainTab')
                            .html('...(' + hiddenWS.length + ')');

        var tableIds = [];
        var ws = wsLookUp[wsId];
        var tables = ws.tables;
        var tempHiddenTables = ws.tempHiddenTables;

        for (var i = 0, len = tables.length; i < len; i++) {
            tableIds[i] = tables[i];
        }

        for (var i = 0, len = tableIds.length; i < len; i++) {
            var tableId = tableIds[i];
            // archiveTable(tableId, ArchiveTable.Keep, null, true);

            toggleTableArchive(tableId, tables, tempHiddenTables);
            TblManager.hideWorksheetTable(tableId);
            gTables[tableId].freeResultset();
        }

        TableList.tablesToHiddenWS([wsId]);

        if (gMinModeOn) {
            $("#worksheetTab-" + wsId).remove();
            rmHandler(wsId, index);
        } else {
            $("#worksheetTab-" + wsId).addClass("transition").animate({
                "width": 0
            }, 180, function() {
                $("#worksheetTab-" + wsId).remove();
                rmHandler(wsId, index);
            });
        }

        SQL.add("Hide Worksheet", {
            "operation"     : SQLOps.HideWS,
            "worksheetId"   : wsId,
            "worksheetName" : ws.name,
            "worksheetIndex": index,
            "htmlExclude"   : ['worksheetIndex']
        });
    };

    WSManager.unhideWS = function(wsIds, prevWsIndex) {
        var deferred = jQuery.Deferred();
        if (!(wsIds instanceof Array)) {
            wsIds = [wsIds];
        }

        var wsNames = [];
        var curWSId;
        var hiddenWSOrder = [];
        var hiddenWSCopy = xcHelper.deepCopy(hiddenWS);
        var tableBulkActionPromises = [];
        wsIds.forEach(function(wsId) {
            curWSId = wsId;

            var ws = wsLookUp[wsId];
            var tempHiddenTables = ws.tempHiddenTables;
            var numHiddenTables = tempHiddenTables.length;
            var wsIndex = hiddenWS.indexOf(wsId);
            hiddenWSOrder.push(hiddenWSCopy.indexOf(wsId));
            var tables = ws.tables;

            hiddenWS.splice(wsIndex, 1);
            if (prevWsIndex == null) {
                wsOrder.push(wsId);
            } else {
                wsOrder.splice(prevWsIndex, 0, wsId);
            }


            var tableIds = [];

            wsNames.push(ws.name);

            for (var i = 0; i < numHiddenTables; i++) {
                tableIds.push(tempHiddenTables[i]);
            }

            for (var i = 0; i < numHiddenTables; i++) {
                var tableId = tableIds[i];
                // archiveTable(tableId, ArchiveTable.Keep, null, true);
                toggleTableArchive(tableId, tempHiddenTables, tables);
            }

            $('#hiddenWorksheetsTab').find('#worksheetTab-' + wsId).remove();

            makeWorksheet(wsId, true);
            tableBulkActionPromises.push(TableList.tableBulkAction.bind(this,
                                         "add", TableType.WSHidden, wsId));
        });

        var len = hiddenWS.length;
        $('#hiddenWorksheetsTab').find('.mainTab').html('...(' + len + ')');
        if (len === 0) {
            $('#bottomTabArea').removeClass('hasHiddenWS');
        }

        PromiseHelper.chain(tableBulkActionPromises)
        .then(function() {
            // focus on last that unhide
            WSManager.focusOnWorksheet(curWSId);
            SQL.add("Unhide Worksheet", {
                "operation"      : SQLOps.UnHideWS,
                "worksheetIds"   : wsIds,
                "worksheetNames" : wsNames,
                "worksheetOrders": hiddenWSOrder,
                "htmlExclude"    : ["worksheetOrders"]
            });
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });

        return (deferred.promise());
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

    // Copy one table to a worksheet

     // XX THIS IS CURRENTLY DISABLED , tablename/tableId needs to be fixed
    // WSManager.copyTable = function(srcTableName, newTableName, wsIndex) {
    //     var tableNum   = gTables.length;
    //     var tableId = xcHelper.getTableId(srcTableName);
    //     // do a deep copy
    //     var srcTable   = gTables[tableId];
    //     var tableCopy  = xcHelper.deepCopy(srcTable);
    //     var newTableId = xcHelper.getTableId(newTableName);

    //     activeWorksheet = wsIndex;
    //     gTables[newTableId] = tableCopy;
    //     // XXX for sample table, should sync frontName with backName since
    //     // there both src sample and the copied can change to real table using
    //     // its backTableName
    //     // if (!tableCopy.isTable) {
    //     //     tableCopy.tableName = newTableName;
    //     // }

    //     addTable(tableCopy.tableName, tableNum,
    //              AfterStartup.After, null, newTableName)
    //     .then(function() {
    //         WSManager.focusOnWorksheet(wsIndex, false, tableNum);
    //         // xx focusonworksheet expects tableid
    //     })
    //     .fail(function(error) {
    //         var newTableId =
    //         delete gTables[newTableId];
    //         Alert.error(error);
    //     });
    // };

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

        var ws = wsLookUp[wsId];
        var tables = ws.tables;
        tableIndex = tables.indexOf(tableId);

        if (tableIndex < 0) {
            tables = ws.archivedTables;
            tableIndex = tables.indexOf(tableId);
        }
        if (tableIndex < 0) {
            tables = ws.orphanedTables;
            tableIndex = tables.indexOf(tableId);
        }

        if (tableIndex < 0) {
            console.error("Not find the table!");
            return (null);
        }

        tables.splice(tableIndex, 1);
        delete tableIdToWSIdMap[tableId];

        return (wsId);
    };

    // Refresh Worksheet space to focus on one worksheet
    WSManager.focusOnWorksheet = function(wsId, notfocusTable, tableId) {
        // update activeWorksheet first
        if (wsId == null) {
            wsId = activeWorksheet;
        }
        activeWorksheet = wsId;

        var $tabs   = $workSheetTabSection.find(".worksheetTab");
        var $tables = $("#mainFrame .xcTableWrap");
        var $dags   = $("#dagPanel .dagWrap");

        // refresh worksheet tab
        xcHelper.removeSelectionRange();
        var $prevActiveTab = $tabs.find('.label:not(.inActive)');
        $prevActiveTab.addClass('noTransition')
                      .find('.wsIconWrap')
                      .addClass('noTransition');
        // we dont want transition when active tab goes to inactive
        setTimeout(function() {
            $tabs.find('.label')
                 .removeClass('noTransition')
                 .find('.wsIconWrap')
                 .removeClass('noTransition');
        }, 150);

        $tabs.addClass("inActive")
             .find('.text').blur();

        var $activeTab = $("#worksheetTab-" + wsId);
        $activeTab.removeClass("inActive");
        sizeTabInput($activeTab.find('input'));

        // refresh mainFrame
        $tables.addClass("inActive");
        var $curActiveTables = $tables.filter(".worksheet-" + wsId);
        $curActiveTables.removeClass("inActive");

        // refresh dag
        $dags.addClass("inActive");
        $dags.filter(".worksheet-" + wsId).removeClass("inActive");

        // position sticky row column on visible tables
        moveFirstColumn();

        //vertically align any locked table icons
        var mainFrameHeight = $('#mainFrame').height();
        $('.tableLocked:visible').each(function() {
            var $tableWrap = $(this);
            var tableHeight = $tableWrap.find('.xcTable').height();
            var tableWrapHeight = $tableWrap.find('.xcTbodyWrap').height();
            var topPos = 100 * ((tableWrapHeight / mainFrameHeight) / 2);
            topPos = Math.min(topPos, 40);
            $tableWrap.find('.lockedIcon').css('top', topPos + '%');
            $tableWrap.find('.tableCover').height(tableHeight - 40);
        });

        // make table undraggable if only one in worksheet
        checkTableDraggable();

        // refresh table and scrollbar
        if (notfocusTable || $curActiveTables.length === 0) {
            // no table to focus
            RowScroller.empty();
            if ($curActiveTables.length > 0) {
                $curActiveTables.find('.xcTable').each(function() {
                    matchHeaderSizes($(this));
                });
            }
        } else {
            var isFocus = false;

            if (tableId != null) {
                isFocus = true;
                focusTable(tableId);
            }
            $curActiveTables.find('.xcTable').each(function() {
                var $table = $(this);
                var $tableWrap = $table.closest('.xcTableWrap');
                matchHeaderSizes($table);
                $tableWrap.find('.rowGrab').width($table.width());
            });

            // if (!isFocus &&
            //     $curActiveTables.find('.tableTitle.tblTitleSelected')
            //                     .length === 0) {
            //     var tableId = $curActiveTables.eq(0).data('id');
            //     focusTable(tableId);
            // } else {
            //     var $focusedTable = $curActiveTables
            //                        .find('.tableTitle.tblTitleSelected')
            //                        .closest('.xcTableWrap');
            //     var focusedTableId = $focusedTable.data('id');
            //     gActiveTableId = focusedTableId;
            //     // focusTable(tableId);
            // }
            if (!isFocus) {
                var tableIdToFocus;
                if ($curActiveTables.find('.tblTitleSelected').length === 0) {
                    tableIdToFocus = $curActiveTables.eq(0).data('id');
                    focusTable(tableIdToFocus);
                } else {
                    var $focusedTable = $curActiveTables
                                         .find('.tblTitleSelected')
                                         .closest('.xcTableWrap');
                    tableIdToFocus = $focusedTable.data('id');
                    focusTable(tableIdToFocus);
                }
            }
        }
    };

    // Focus on the last table in the worksheet
    WSManager.focusOnLastTable = function() {
        var $mainFrame = $('#mainFrame');
        // XX temporary fix to find last table
        var $lastTable = $('.xcTableWrap:not(.inActive)').last();

        if ($lastTable.length > 0) {
            var leftPos = $lastTable.position().left + $mainFrame.scrollLeft();
            var tableId = xcHelper.parseTableId($lastTable);
            $mainFrame.animate({scrollLeft: leftPos}, 500)
                        .promise()
                        .then(function(){
                            focusTable(tableId);
                        });
        }
    };

    // Get html list of worksheets
    WSManager.getWSLists = function(isAll) {
        var html = "";

        for (var i = 0, len = wsOrder.length; i < len; i++) {
            var wsId = wsOrder[i];
            if (!isAll && (wsId === activeWorksheet)) {
                continue;
            }

            html += '<li data-ws="' + wsId + '">' +
                        wsLookUp[wsId].name +
                    '</li>';
        }

        return (html);
    };

    WSManager.lockTable = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws   = wsLookUp[wsId];
        if (ws) {
            if (ws.lockedTables.indexOf(tableId) === -1) {
                ws.lockedTables.push(tableId);
            }
            $('#worksheetTab-' + wsId).addClass('locked');
        }
    };

    WSManager.unlockTable = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws   = wsLookUp[wsId];
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

    // Get all aggreagte information
    WSManager.getAggInfos = function() {
        return (aggInfos);
    };

    WSManager.checkAggInfo = function(tableId, colName, aggOp) {
        var key = tableId + "#" + colName + "#" + aggOp;
        return (aggInfos[key]);
    };

    // add aggregate information
    WSManager.addAggInfo = function(tableId, colName, aggOp, aggRes) {
        // use this as key so that if later you want to sort,
        // write a sort function that split by "#" and
        // extract tableId/colNam/aggOp to sort by one of them
        var key = tableId + "#" + colName + "#" + aggOp;

        if (aggInfos.hasOwnProperty(key)) {
            // XXX now if this agg ops is exist, do not update it,
            // since update will make the old table info lost
            console.warn("Aggregate result already exists!");
        } else {
            aggInfos[key] = aggRes;

            var dstTableId = xcHelper.getTableId(aggRes.dagName);
            noSheetTables.push(dstTableId);
        }
    };

    // remove one entry of aggregate information
    WSManager.activeAggInfo = function(key, tableId) {
        aggInfos[key].isActive = true;
        gTables[tableId].status = TableType.Agg;
    };

    // remove one entry of aggregate information
    WSManager.removeAggInfo = function(key) {
        delete aggInfos[key];
    };

    // Add worksheet events, helper function for WSManager.setup()
    function addWSEvents() {
        // click to add new worksheet
        $("#addWorksheet").click(function() {
            if (wsOrder.length >= maxWSLen) {
                Alert.error(WSTStr.AddWSFail, WSTStr.AddWSFailMsg);
                return;
            }

            WSManager.addWS();
        });

        $workSheetTabSection.on({
            "focus": function() {
                var $text = $(this);
                var $tab = $text.closest(".worksheetTab");

                $tab.addClass("focus");
                $workSheetTabSection.sortable( "disable" );
            },
            "blur": function() {
                var $text = $(this);

                $text.val($text.data("title"));
                $text.scrollLeft(0);
                $text.closest(".worksheetTab").removeClass("focus");
                $workSheetTabSection.sortable( "enable" );
                sizeTabInput($text);
            },
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();

                    var $text = $(this);
                    var name = $text.val().trim();
                    // name empty or confilct
                    if (name === "" || wsNameToIdMap.hasOwnProperty(name)) {
                        $text.blur();
                        return;
                    }

                    var wsId = $text.closest(".worksheetTab").data("ws");
                    WSManager.renameWS(wsId, name);
                }
            },
            "click": function() {
                $(this).focus();
            }
        }, ".worksheetTab .text");

        // switch worksheet
        $workSheetTabSection.on("mousedown", ".worksheetTab", function(event) {
            if (event.which !== 1) {
                return;
            }
            if ($(event.target).hasClass('wsIconWrap') ||
                $(event.target).parent('.wsIconWrap').length) {
                return;
            }
            var $tab = $(this);

            if ($tab.hasClass("inActive")) {
                var wsId = $tab.data("ws");
                switchWSHelper(wsId);
            }
        });

        $workSheetTabSection[0].oncontextmenu = function(event) {
            var $target = $(event.target).closest('.wsIconWrap');
            if ($target.length) {
                $target.trigger('click');
                event.preventDefault();
            }
        };

        $workSheetTabSection.on("click", ".wsIconWrap", function() {
            var wsId = $(this).closest(".worksheetTab").data("ws");
            var numTabs = $workSheetTabSection.find('.worksheetTab').length;
            var $wsIconWrap = $(this);
            if ($tabMenu.is(':visible') && $tabMenu.data('ws') === wsId) {
                $tabMenu.hide();
            }
            xcHelper.dropdownOpen($wsIconWrap, $tabMenu, {
                "offsetX"      : -7,
                "ignoreSideBar": true,
                "floating"     : true,
                "callback"     : function() {
                    if (numTabs === 1) {
                        $tabMenu.find('.delete').addClass('unavailable');
                        $tabMenu.find('.hide').addClass('unavailable');
                    } else {
                        $tabMenu.find('.delete').removeClass('unavailable');
                        $tabMenu.find('.hide').removeClass('unavailable');
                    }
                    // Note: if we don't want to show rename option on inactive
                    // worksheet tabs

                    // if ($wsIconWrap.closest('.worksheetTab')
                    //                .hasClass('inActive')) {
                    //     $tabMenu.find('.rename').addClass('unavailable');
                    // } else {
                    //     $tabMenu.find('.rename').removeClass('unavailable');
                    // }
                    $tabMenu.data('ws', wsId);
                }
            });
        });

        var initialIndex;

        $workSheetTabSection.sortable({
            "revert"  : 200,
            "axis"    : "x",
            "distance": 2,
            "handle"  : ".draggableArea",
            "start"   : function(event, ui) {
                var $tab = $(ui.item).addClass('dragging');
                $tab.click();
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

        var $hiddenWorksheetsTab = $('#hiddenWorksheetsTab');
        // dropdown list for udf modules and function names
        xcHelper.dropdownList($hiddenWorksheetsTab, {
            "onSelect": function($li) {
                // var module = $li.text();
                var wsId = $li.data('ws');
                if (wsId === "all") {
                    var wsIds = [];
                    $('#hiddenWorksheetsTab').find('li:not(.unhideAll)')
                                             .each(function() {
                        wsId = $(this).data('ws');
                        wsIds.push(wsId);
                    });
                    wsIds = wsIds.reverse();
                    WSManager.unhideWS(wsIds);
                } else {
                    WSManager.unhideWS(wsId);
                }
            },
            "container": "#bottomTabArea"
        });

        $hiddenWorksheetsTab[0].oncontextmenu = function(e) {
            var $target = $(e.target).closest('.mainTab');
            if ($target.length) {
                $target.trigger('click');
                e.preventDefault();
            }
        };

        addMenuBehaviors($tabMenu);

        $tabMenu.find('li').click(function() {
            var $li = $(this);
            var wsId = $tabMenu.data('ws');
            if ($li.hasClass('unavailable')) {
                return;
            } else if ($li.hasClass('rename')) {
                if ($('#worksheetTab-' + wsId).hasClass("inActive")) {
                    switchWSHelper(wsId);
                }
                focusOnTabRename(wsId);
            } else if ($li.hasClass('hide')) {
                WSManager.hideWS(wsId);
            } else if ($li.hasClass('delete')) {
                delWSCheck(wsId);
            }
        });
    }

    function focusOnTabRename(wsId) {
        $("#worksheetTab-" + wsId).find('.text').focus();
    }

    function renderWSId() {
        var rand1 = Math.floor(Math.random() * 26) + 97; // [97, 123)
        var rand2 = Math.floor(Math.random() * 10); // [0, 10)

        var id = String.fromCharCode(rand1) + rand2; //[a-z][0-9]
        var tryCnt = 0;

        while (wsLookUp.hasOwnProperty(id) && tryCnt < maxWSLen) {
            rand1 = Math.floor(Math.random() * 26) + 97;
            rand2 = Math.floor(Math.random() * 10);
            id = String.fromCharCode(rand1) + rand2;
            tryCnt++;
        }

        if (tryCnt >= maxWSLen) {
            // code should never enter here!
            console.error("Worksheet id overflow!");
            id += Math.floor(Math.random() * 100); // temp fix when error
        }
        return (id);
    }

    function initializeWorksheet(clearing) {
        // remove the placeholder in html
        $workSheetTabSection.empty();

        var len = wsOrder.length;
        if (len === 0) {
            newWorksheet();
        } else {
            for (var i = 0; i < len; i++) {
                // true meanse no animation
                makeWorksheet(wsOrder[i], true);
            }
        }
        // focus on the saved or first worksheet
        var storedWS = UserSettings.getPreference().activeWorksheet;
        if (!clearing && wsOrder.indexOf(storedWS) > -1) {
            activeWorksheet = storedWS;
        } else {
            activeWorksheet = wsOrder[0];
        }

        WSManager.focusOnWorksheet(activeWorksheet);
    }

    function initializeHiddenWorksheets() {
        var $hiddenWorksheetsTab = $('#hiddenWorksheetsTab');
        $hiddenWorksheetsTab.find('li:not(.unhideAll)').remove();

        var len = hiddenWS.length;
        if (len === 0) {
            $('#bottomTabArea').removeClass('hasHiddenWS');
        } else {
            var listHtml = "";
            var wsId;
            for (var i = 0; i < len; i++) {
                wsId = hiddenWS[i];
                listHtml += getHiddenWSHTML(wsId);
            }
            $hiddenWorksheetsTab.find('ul').prepend(listHtml);
            $hiddenWorksheetsTab.find('.mainTab').html('...(' + len + ')');
            $('#bottomTabArea').addClass('hasHiddenWS');
        }
    }

    // Create a new worksheet
    function newWorksheet(wsId, wsName, wsIndex) {
        if (wsId == null) {
            wsId = renderWSId();
        }

        if (wsName == null) {
            wsName = defaultName + (nameSuffix++);
            while (wsNameToIdMap[wsName] != null) {
                wsName = defaultName + (nameSuffix++);
            }
        }

        var date = xcHelper.getDate();

        wsScollBarPosMap[activeWorksheet] = $('#mainFrame').scrollLeft();

        setWorksheet(wsId, {
            "name"        : wsName,
            "date"        : date,
            "lockedTables": [],
            "wsIndex"     : wsIndex
        });

        makeWorksheet(wsId);
        // focus on new worksheet
        WSManager.focusOnWorksheet(wsId);
        return (wsId);
    }

    // Make a worksheet
    function makeWorksheet(wsId, noAnimation) {
        var $tab = $(getWSTabHTML(wsId));

        if (noAnimation) {
            $tab.appendTo($workSheetTabSection);
        } else {
            if (gMinModeOn) {
                $tab.appendTo($workSheetTabSection);
            } else {
                $tab.hide().appendTo($workSheetTabSection).slideDown(180);
            }
        }
        sizeTabInput($tab.find('input'));
    }

    function reorderWSHelper(oldWSIndex, newWSIndex) {
        // reorder wsOrder
        var wsId = wsOrder.splice(oldWSIndex, 1)[0];
        wsOrder.splice(newWSIndex, 0, wsId);
        SQL.add("Reorder Worksheet", {
            "operation"        : SQLOps.ReorderWS,
            "worksheetName"    : wsLookUp[wsId].name,
            "oldWorksheetIndex": oldWSIndex,
            "newWorksheetIndex": newWSIndex
        });
    }

    // size the input in the worksheet tab to fit the input's text
    function sizeTabInput($input) {
        var maxSize = $input.closest('.draggableArea').width() - 6;
        var minSize = 30;
        var textWidth = getTextWidth($input, $input.val()) + 12;
        var newWidth = Math.min(maxSize, textWidth);
        newWidth = Math.max(newWidth, minSize);
        $input.outerWidth(newWidth); // .width() assigns incorrect value
    }

    // Remove worksheet
    function rmWorksheet(wsId) {
        var ws = wsLookUp[wsId];

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
        delete wsLookUp[wsId];

        var index = WSManager.getWSOrder(wsId);
        wsOrder.splice(index, 1);

        if (gMinModeOn) {
            $("#worksheetTab-" + wsId).remove();
            rmHandler(wsId, index);
        } else {
            $("#worksheetTab-" + wsId).addClass("transition").animate({
                "width": 0
            }, 180, function() {
                $("#worksheetTab-" + wsId).remove();
                rmHandler(wsId, index);
            });
        }
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
            // change to origin position
            var leftPos = wsScollBarPosMap[wsToFocus];
            if (leftPos != null) {
                $('#mainFrame').scrollLeft(leftPos);
            }
        }
    }

    // Set worksheet
    function setWorksheet(wsId, options) {
        if (!wsLookUp.hasOwnProperty(wsId)) {
            wsLookUp[wsId] = {
                "id"              : wsId,
                "tables"          : [],
                "archivedTables"  : [],
                "tempHiddenTables": [],
                "orphanedTables"  : []
            };
            if (options.wsIndex == null) {
                wsOrder.push(wsId);
            } else {
                wsOrder.splice(options.wsIndex, 0, wsId);
            }
        }

        var ws = wsLookUp[wsId];

        for (var key in options) {
            var val = options[key];
            if (key === "wsIndex") {
                continue;
            }

            if (key === "tables" || key === "orphanedTables" ||
                key === "archivedTables") {
                if (val in tableIdToWSIdMap) {
                    console.error(val, "already in worksheets!");
                    return;
                }

                ws[key].push(val);
                tableIdToWSIdMap[val] = wsId;
            } else {
                ws[key] = val;

                if (key === "name") {
                    wsNameToIdMap[val] = wsId;
                }
            }
        }
    }

    function delWSCheck(wsId) {
        var ws = wsLookUp[wsId];

        if (ws.tables.length === 0 && ws.archivedTables.length === 0 &&
            ws.tempHiddenTables.length === 0) {
            // delete empty worksheet
            WSManager.delWS(wsId, DelWSType.Empty);
        } else {
            // delete worksheet with tables
            Alert.show({
                "title"  : WSTStr.DelWS,
                "msg"    : WSTStr.DelWSMsg,
                "buttons": [
                    {
                        "name"     : TblTStr.Del,
                        "className": "deleteTale",
                        "func"     : function() {
                            WSManager.delWS(wsId, DelWSType.Del);
                        }
                    },
                    {
                        "name"     : TblTStr.Archive,
                        "className": "archiveTable",
                        "func"     : function() {
                            WSManager.delWS(wsId, DelWSType.Archive);
                        }
                    }
                ]
            });
        }
    }

    function getHiddenWSHTML(wsId) {
        var name = wsLookUp[wsId].name;
        var id = "worksheetTab-" + wsId;
        var li = '<li id="' + id + '" data-ws="' + wsId + '">' +
                 '<span class="icon"></span>' +
                 name + '</li>';
        return (li);
    }

    // Helper function to delete tables in a worksheet
    function delTableHelper(wsId) {
        var deferred    = jQuery.Deferred();
        // var promises    = [];
        var $tableLists = $("#inactiveTablesList");

        // click all inactive table in this worksheet
        $tableLists.find(".addTableBtn.selected").click();
        $tableLists.find(".worksheet-" + wsId)
                    .closest(".tableInfo")
                    .find(".addTableBtn").click();


        // for active table, use this to delete
        var activeTables = wsLookUp[wsId].tables;
        // for (var i = 0, len = activeTables.length; i < len; i++) {
        //     var tableId = activeTables[i];
        //     promises.push(deleteTable.bind(this, tableId, TableType.Active));
        // }

        // PromiseHelper.chain(promises)
        TblManager.deleteTables(activeTables, TableType.Active)
        .then(function() {
            return (TableList.tableBulkAction("delete", TableType.Archived));
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Delete Table Fails", error);
            deferred.reject(error);
        });
        // var options = {"remove": true};
        // var ws = wsLookUp[wsId];
        // var tableIds = [];

        // TblManager.sendTableToOrphaned will change ws structure
        // so need tableIds to cahce first
        // ws.tables.forEach(function(tableId) {
        //     tableIds.push(tableId);
        // });

        // ws.archivedTables.forEach(function(tableId) {
        //     tableIds.push(tableId);
        // });

        // tableIds.forEach(function(tableId) {
        //     TblManager.sendTableToOrphaned(tableId, options);
        // });
        TableList.refreshOrphanList();
        // return (deferred.promise());
    }

    // Helper function to archive tables in a worksheet
    function archiveTableHelper(wsId) {
        // archive all active tables (save it in a temp array because
        // archiveTable will change the structure of worksheets[].tables)
        var ws = wsLookUp[wsId];

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
                .addClass("inactive").text(SideBarTStr.NoSheet);

        $("#aggTablesList").find(".worksheetInfo.worksheet-" + wsId)
                .removeClass("worksheet-" + wsId).text(SideBarTStr.NoSheet);
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

    function switchWSHelper(wsId) {
        var curWS = activeWorksheet;
        var $mainFrame = $("#mainFrame");
        // cache current scroll bar position
        wsScollBarPosMap[curWS] = $mainFrame.scrollLeft();
        WSManager.focusOnWorksheet(wsId);

        // change to origin position
        var leftPos = wsScollBarPosMap[wsId];
        if (leftPos != null) {
            $mainFrame.scrollLeft(leftPos);
        }

        // SQL.add("Switch Worksheet", {
        //     "operation"        : SQLOps.SwitchWS,
        //     "oldWorksheetIndex": WSManager.getWSOrder(curWS),
        //     "oldWoksheetId"    : curWS,
        //     "oldWorksheetName" : WSManager.getWSName(curWS),
        //     "newWorksheetIndex": WSManager.getWSOrder(wsId),
        //     "newWorksheetName" : WSManager.getWSName(wsId),
        //     "newWorksheetId"   : wsId
        // });
    }

    // HTML of worksheet tab, helper function for makeWorksheet()
    function getWSTabHTML(wsId) {
        var name = wsLookUp[wsId].name;
        var id   = "worksheetTab-" + wsId;
        var dagTabId = (wsOrder[0] === wsId) ? "compSwitch" :
                                                "compSwitch-" + wsId;
        var tabTooltip =
            'data-original-title="' + name + '"' +
            'data-toggle="tooltip" data-placement="top"' +
            'data-container="#' + id + ':not(.focus) .label"';

        var dagTooltip =
            'data-toggle="tooltip" ' +
            'data-placement="top" ' +
            'data-title="click to view query graph" data-container="body"';

        var html =
            '<section id="' + id + '"class="worksheetTab inActive" ' +
                'data-ws="' + wsId + '">' +
                '<div class="label">' +
                    '<div class="iconWrapper wsIconWrap" ' +
                    'data-title="worksheet options" data-toggle="tooltip" ' +
                    'data-container="body">' +
                        '<span class="wsIcon"></span>' +
                    '</div>' +
                    '<div class="draggableArea" ' + tabTooltip + '>' +
                        '<input type="text" class="text textOverflow" ' +
                        'spellcheck="false" value="' + name + '" ' +
                        'data-title="' + name + '">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div id="' + dagTabId + '"class="dagTab"' + dagTooltip + '>' +
                    '<span class="icon"></span>' +
                '</div>' +
            '</section>';

        return (html);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        WSManager.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (WSManager);
}(jQuery, {}));
