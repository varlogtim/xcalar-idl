window.WSManager = (function($, WSManager) {
    var wsLookUp = {}; // {id, date, tables, hiddenTables}
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

    var $workSheetTabSection = $("#worksheetTabs");

    var maxWSLen = 260; // 26 letters * 10 nums
    var $tabMenu = $('#worksheetTabMenu');

    // Setup function for WSManager Module
    WSManager.setup = function() {
        addWSEvents();
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
        initializeWorksheet();
        initializeHiddenWorksheets();
    };

    // Restore worksheet structure from backend
    WSManager.restore = function(sheetInfos) {
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

            var hiddenTables = ws.hiddenTables;

            for (var j = 0; j < hiddenTables.length; j++) {
                tableIdToWSIdMap[hiddenTables[j]] = wsId;
            }

            var tempHiddenTables = ws.tempHiddenTables;

            for (var i = 0; i < tempHiddenTables.length; i++) {
                tableIdToWSIdMap[tempHiddenTables[i]] = wsId;
            }
        }
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

    // For reorder table use
    WSManager.reorderTable = function(tableId, srcIndex, desIndex) {
        var wsId   = tableIdToWSIdMap[tableId];
        var tables = wsLookUp[wsId].tables;

        var t = tables[srcIndex];
        tables.splice(srcIndex, 1);
        tables.splice(desIndex, 0, t);
    };

    // For reorder worksheet
    WSManager.reorderWS = function(oldIndex, newIndex) {
        // reorder wsOrder
        var wsId = wsOrder.splice(oldIndex, 1)[0];
        wsOrder.splice(newIndex, 0, wsId);
        SQL.add("Reorder Worksheet", {
            "operation"        : SQLOps.ReorderWS,
            "worksheetName"    : wsLookUp[wsId].name,
            "oldWorksheetIndex": oldIndex,
            "newWorksheetIndex": newIndex
        });
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
            desTables = ws.hiddenTables;
        }

        toggleTableArchive(tableId, srcTables, desTables);
    };

    // For inArchive table use
    WSManager.activeTable = function(tableId) {
        var wsId = tableIdToWSIdMap[tableId];
        var ws   = wsLookUp[wsId];

        var srcTables = ws.hiddenTables;
        var desTables = ws.tables;

        toggleTableArchive(tableId, srcTables, desTables);
    };

    // Get a table's position in the worksheet
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
        // it only add to hiddenTables first, since later we
        // need to call WSManager.replaceTable()
        if (tableId in tableIdToWSIdMap) {
            return (tableIdToWSIdMap[tableId]);
        } else {
            if (wsId == null) {
                wsId = activeWorksheet;
            }

            setWorksheet(wsId, {"hiddenTables": tableId});

            return (wsId);
        }
    };

    // replace a table and put tablesToRm to arcived list
    WSManager.replaceTable = function(tableId, locationId, tablesToRm) {
        var ws;

        // append table to the last of active tables
        if (locationId == null) {
            ws = wsLookUp[tableIdToWSIdMap[tableId]];
            var srcTables;
            if (!ws || !ws.tempHiddenTables) {
                return;
            }
            if (ws.tempHiddenTables.indexOf(tableId) !== -1) {
                srcTables = ws.tempHiddenTables;
            } else {
                srcTables = ws.hiddenTables;
            }
            toggleTableArchive(tableId, srcTables, ws.tables);
            return;
        }

        // replace with locationId and put other tables into hiddenTables
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
            toggleTableArchive(rmTableId, ws.tables, ws.hiddenTables);
        }
    };

    // Move table to another worksheet
    WSManager.moveTable = function(tableId, newWSId) {
        var oldWSId = WSManager.removeTable(tableId);
        var wsName  = wsLookUp[newWSId].name;

        setWorksheet(newWSId, {"tables": tableId});

        var $xcTablewrap = $('#xcTableWrap-' + tableId);
        $xcTablewrap.removeClass("worksheet-" + oldWSId)
                    .addClass("worksheet-" + newWSId);
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

        // refresh dag
        $("#dagPanel .dagWrap.worksheet-" + oldWSId).each(function() {
            var $dagWrap = $(this);

            if ($dagWrap.data("id") === tableId) {
                $dagWrap.removeClass("worksheet-" + oldWSId)
                        .addClass("worksheet-" + newWSId);
            }
        });

        WSManager.focusOnWorksheet(newWSId, false, tableId);
        SQL.add("Move Table to worksheet", {
            "operation"        : SQLOps.MoveTableToWS,
            "tableName"        : gTables[tableId].tableName,
            "tableId"          : tableId,
            "oldWorksheetIndex": WSManager.getWSOrder(oldWSId),
            "oldWorksheetName" : wsLookUp[oldWSId].name,
            "newWorksheetIndex": WSManager.getWSOrder(newWSId),
            "worksheetName"    : wsName
        });
    };

    // Move inactive table to another worksheet
    WSManager.moveInactiveTable = function(tableId, newWSId) {
        function addFromOrphanList() {
            // This happens when an orphaned table has been added to the
            // worksheet and we try to pull its ancestor which doesn't exist in
            // the meta either
            // It's really a pull not a move
            // 1) Refresh Orphan List
            // 2) Trigger Add from Orphan list
            RightSideBar.refreshOrphanList()
            .then(function() {
                $("#orphanedTablesList span:contains(" + tableId + ")")
                .parent().find('.addTableBtn').click();
                $("#submitOrphanedTablesBtn").click();
            })
            .fail(function(error) {
                Alert.error("Add Orphaned Table Failed", error);
            });
        }

        var oldWSId = tableIdToWSIdMap[tableId];
        if (oldWSId == null) {
            // when it's from Orphan table
            addFromOrphanList();
            return;
        }

        // move inactive table to another worksheet
        tableIdToWSIdMap[tableId] = newWSId;

        var oldWS = wsLookUp[oldWSId];
        var tables = oldWS.hiddenTables;
        var tableIndex = tables.indexOf(tableId);
        var wsTable = tables.splice(tableIndex, 1)[0];
        var newWS = wsLookUp[newWSId];
        newWS.hiddenTables.push(wsTable);

        var wsName = newWS.name;

        // refresh right side bar
        $("#inactiveTablesList .tableInfo").each(function() {
            var $li = $(this);
            if ($li.data("id") === tableId) {
                var $worksheetInfo = $li.find(".worksheetInfo");

                $worksheetInfo.removeClass("worksheet-" + oldWSId)
                                .addClass("worksheet-" + newWSId);
                $worksheetInfo.text(wsName);
            }
        });

        SQL.add("Move Inactive Table to worksheet", {
            "operation"        : SQLOps.MoveInactiveTableToWS,
            "tableName"        : gTables[tableId].tableName,
            "tableId"          : tableId,
            "oldWorksheetIndex": WSManager.getWSOrder(oldWSId),
            "oldWorksheetName" : oldWS.name,
            "newWorksheetIndex": WSManager.getWSOrder(newWSId),
            "worksheetName"    : wsName
        });
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
            tables = ws.hiddenTables;
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
        $tabs.addClass("inActive")
            .find(".text").blur();
        $("#worksheetTab-" + wsId).removeClass("inActive");

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
                matchHeaderSizes($table);
                $table.find('.rowGrab').width($table.width());
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
            $mainFrame.animate({scrollLeft: leftPos})
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

        SQL.add("Add no sheet tables", {
            "operation"     : SQLOps.AddNoSheetTables,
            "tableIds"      : tableIds,
            "worksheetName" : wsLookUp[wsId].name,
            "worksheetIndex": WSManager.getWSOrder(wsId)
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
        gTables[tableId].isAggTable = true;
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
                Alert.error("CANNOT CREATE WORKSHEEt",
                            "There are too many worksheets in the panel");
                return;
            }
            var wsId = newWorksheet();

            SQL.add("Create Worksheet", {
                "operation"    : SQLOps.AddWS,
                "worksheetName": WSManager.getWSName(wsId)
            });
        });

        $workSheetTabSection.on({
            "focus": function() {
                var $text = $(this);
                var $tab = $text.closest(".worksheetTab");

                $tab.addClass("focus");
                // $tab.css('pointer-events','none');
                // $text.css('pointer-events', 'initial');
                $tab.find(".label").mouseenter();  // close tooltip
                $workSheetTabSection.sortable( "disable" );
            },
            "blur": function() {
                var $text = $(this);

                $text.text($text.data("title"));
                $text.scrollLeft(0);
                $text.closest(".worksheetTab").removeClass("focus");
                $workSheetTabSection.sortable( "enable" );
            },
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    renameWorksheet($(this));
                }
            },
            "click": function() {
                $(this).focus();
            }
        }, ".worksheetTab .text");

        // switch worksheet
        // $workSheetTabSection.on("click", ".worksheetTab", function () {
        $workSheetTabSection.on("mousedown", ".worksheetTab", function (e) {
            if (e.which !== 1) {
                return;
            }
            if ($(e.target).hasClass('wsIconWrap') ||
                $(e.target).parent('.wsIconWrap').length) {
                return;
            }
            var $tab = $(this);

            if ($tab.hasClass("inActive")) {
                var wsId = $tab.data("ws");
                switchWSHelper(wsId);
            }
        });

        $workSheetTabSection.on("click", ".wsIconWrap", function (event) {
            var wsId = $(this).closest(".worksheetTab").data("ws");
            var numTabs = $workSheetTabSection.find('.worksheetTab').length;
            var $wsIconWrap = $(this);
            if ($tabMenu.is(':visible') && $tabMenu.data('ws') === wsId) {
                $tabMenu.hide();
            }
            dropdownClick($wsIconWrap, {
                type: "tabMenu",
                offsetX: -7,
                ignoreSideBar: true,
                callback: function() {
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
            "distance": 4,
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
                    WSManager.reorderWS(initialIndex, newIndex);
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
                    var numWs = wsIds.length;
                    for (var i = 0; i < numWs; i++) {
                        unhideWorksheet(wsIds[i]);
                    }
                } else {
                    unhideWorksheet(wsId);
                }
            },
            "container": "#bottomTabArea"
        });

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
                hideWorksheet(wsId);
            } else if ($li.hasClass('delete')) {
                delWSHelper(wsId);
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

    function initializeWorksheet() {
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
        // focus on the first worksheet
        activeWorksheet = wsOrder[0];
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
    function newWorksheet() {
        var wsId = renderWSId();
        var name = defaultName + (nameSuffix++);
        var date = xcHelper.getDate();

        while (wsNameToIdMap[name] != null) {
            name = defaultName + (nameSuffix++);
        }

        setWorksheet(wsId, {
            "name"        : name,
            "date"        : date,
            "lockedTables": []
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
    }

    // Rename a worksheet
    function renameWorksheet($text) {
        var name = $text.text().trim();
        // name empty or confilct
        if (name === "" || wsNameToIdMap.hasOwnProperty(name)) {
            $text.blur();
            return;
        }

        var $label = $text.closest(".label");
        var $tab = $text.closest(".worksheetTab");
        var wsId = $tab.data("ws");
        var ws = wsLookUp[wsId];
        var oldName = ws.name;

        delete wsNameToIdMap[oldName];
        ws.name = name;
        wsNameToIdMap[name] = wsId;

        $text.data("title", name);
        $label.attr("data-original-title", name);
        $text.blur();
        // use worksheet class to find table lists in right side bar
        $("#tableListSections .worksheetInfo.worksheet-" + wsId).text(name);

        SQL.add("Rename Worksheet", {
            "operation"     : SQLOps.RenameWS,
            "worksheetIndex": WSManager.getWSOrder(wsId),
            "oldName"       : oldName,
            "newName"       : name
        });
    }

    // Remove worksheet
    function rmWorksheet(wsId) {
        var ws = wsLookUp[wsId];

        ws.tables.forEach(function(tableId) {
            delete tableIdToWSIdMap[tableId];
        });

        ws.hiddenTables.forEach(function(tableId) {
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
        commitToStorage();
        // switch to another worksheet
        if (activeWorksheet === wsId) {
            if (wsOrder[index - 1]) {
                WSManager.focusOnWorksheet(wsOrder[index - 1]);
            } else {
                WSManager.focusOnWorksheet(wsOrder[0]);
            }
        }
    }

    // Set worksheet
    function setWorksheet(wsId, options) {
        if (!wsLookUp.hasOwnProperty(wsId)) {
            wsLookUp[wsId] = {
                "id"              : wsId,
                "tables"          : [],
                "hiddenTables"    : [],
                "tempHiddenTables": []
            };
            wsOrder.push(wsId);
        }

        var ws = wsLookUp[wsId];

        for (var key in options) {
            var val = options[key];

            if (key === "tables" || key === "hiddenTables") {
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

    function hideWorksheet(wsId) {
        var index = wsOrder.indexOf(wsId);
        wsOrder.splice(index, 1);
        hiddenWS.push(wsId);
        $('#bottomTabArea').addClass('hasHiddenWS');

        var hiddenWSHTML = getHiddenWSHTML(wsId);
        var $hiddenWorksheetsTab = $('#hiddenWorksheetsTab');
        $hiddenWorksheetsTab.find('ul').prepend(hiddenWSHTML);
        $hiddenWorksheetsTab.find('.mainTab')
                            .html('...(' + hiddenWS.length + ')');
        // sqlOptions.tableAction = "archive";
        // SQL.add("Hide Worksheet", sqlOptions);


        var tableIds = [];
        var tables   = wsLookUp[wsId].tables;
        var hiddenTables = wsLookUp[wsId].tempHiddenTables;
        var archivedTables = wsLookUp[wsId].hiddenTables;

        for (var i = 0, len = tables.length; i < len; i++) {
            tableIds[i] = tables[i];
        }

        for (var i = 0, len = tableIds.length; i < len; i++) {
            var tableId = tableIds[i];
            // archiveTable(tableId, ArchiveTable.Keep, null, true);

            toggleTableArchive(tableId, tables, hiddenTables);
            hideWorksheetTable(tableId);
        }

        RightSideBar.tablesToHiddenWS(wsId);

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

    function getHiddenWSHTML(wsId) {
        var name = wsLookUp[wsId].name;
        var id = "worksheetTab-" + wsId;
        var li = '<li id="' + id + '" data-ws="' + wsId + '">' +
                 '<span class="icon"></span>' +
                 name + '</li>';
        return (li);
    }

    // Helper function to delete worksheet
    function delWSHelper(wsId) {
        var ws = wsLookUp[wsId];
        var msg;
        var sqlOptions = {
            "operation"     : SQLOps.DelWS,
            "worksheetIndex": WSManager.getWSOrder(wsId),
            "worksheetName" : ws.name
        };

        if (ws.tables.length === 0 && ws.hiddenTables.length === 0 &&
            ws.tempHiddenTables.length === 0) {
            // delete empty worksheet
            rmWorksheet(wsId);

            SQL.add("Delete Worksheet", sqlOptions);
            return;
        } else {
            // delete worksheet with tables
            msg = "There are active tables in this worksheet. " +
                  "How would you like to handle them?";
            Alert.show({
                "title"  : "DELETE WORKSHEET",
                "msg"    : msg,
                "buttons": [
                    // {
                    //     "name"     : "Delete Tables",
                    //     "className": "deleteTale",
                    //     "func"     : function() {
                    //         delTableHelper(wsId)
                    //         .then(function() {
                    //             sqlOptions.tableAction = "delete";
                    //             SQL.add("Delete Worksheet", sqlOptions);
                    //         });
                    //     }
                    // },
                    // XXX temporarily hiding ability to delete tables
                    {
                        "name"     : "Archive Tables",
                        "className": "archiveTable",
                        "func"     : function() {
                            archiveTableHelper(wsId);
                            sqlOptions.tableAction = "archive";
                            SQL.add("Delete Worksheet", sqlOptions);
                        }
                    }
                ]
            });
        }
    }

    // Helper function to delete tables in a worksheet
    function delTableHelper(wsId) {
        var deferred    = jQuery.Deferred();
        var promises    = [];
        var $tableLists = $("#inactiveTablesList");

        // click all inactive table in this worksheet
        $tableLists.find(".addTableBtn.selected").click();
        $tableLists.find(".worksheet-" + wsId)
                    .closest(".tableInfo")
                    .find(".addTableBtn").click();


        // for active table, use this to delete
        var activeTables = wsLookUp[wsId].tables;
        for (var i = 0, len = activeTables.length; i < len; i++) {
            var tableId = activeTables[i];
            promises.push(deleteTable.bind(this, tableId, TableType.Active));
        }

        chain(promises)
        .then(function() {
            return (RightSideBar.tableBulkAction("delete", TableType.InActive));
        })
        .then(function() {
            rmWorksheet(wsId);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Delete Table Fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    // Helper function to archive tables in a worksheet
    function archiveTableHelper(wsId) {
        // archive all active tables (save it in a temp array because
        // archiveTable will change the structure of worksheets[].tables)
        var tableIds = [];
        var tables   = wsLookUp[wsId].tables;

        for (var i = 0, len = tables.length; i < len; i++) {
            tableIds[i] = tables[i];
        }

        for (var i = 0, len = tableIds.length; i < len; i++) {
            var tableId = tableIds[i];
            archiveTable(tableId, ArchiveTable.Keep);
            noSheetTables.push(tableId);
        }

        $("#inactiveTablesList").find(".worksheetInfo.worksheet-" + wsId)
                .addClass("inactive").text("No Sheet");

        $("#aggTablesList").find(".worksheetInfo.worksheet-" + wsId)
                .removeClass("worksheet-" + wsId).text("No Sheet");
        rmWorksheet(wsId);
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

        SQL.add("Switch Worksheet", {
            "operation"        : SQLOps.SwitchWS,
            "oldWorksheetIndex": WSManager.getWSOrder(curWS),
            "oldWorksheetName" : WSManager.getWSName(curWS),
            "newWorksheetIndex": WSManager.getWSOrder(wsId),
            "newWorksheetName" : WSManager.getWSName(wsId)
        });
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
                '<div class="label" ' + tabTooltip + '>' +
                    '<div class="iconWrapper wsIconWrap" ' +
                    'data-title="worksheet options" data-toggle="tooltip" ' +
                    'data-container="body">' +
                        '<span class="wsIcon"></span>' +
                    '</div>' +
                    '<div class="draggableArea">' +
                        // '<span class="wsIcon"></span>' +
                        '<div class="text textOverflow" ' +
                            'data-title="' + name + '" contenteditable>' +
                            name +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div id="' + dagTabId + '"class="dagTab"' + dagTooltip + '>' +
                    '<span class="icon"></span>' +
                '</div>' +
            '</section>';

        return (html);
    }

    function unhideWorksheet(wsId) {
        var tempHiddenTables = wsLookUp[wsId].tempHiddenTables;
        var numHiddenTables = tempHiddenTables.length;
        var wsIndex = hiddenWS.indexOf(wsId);
        var tables = wsLookUp[wsId].tables;
        hiddenWS.splice(wsIndex, 1);
        wsOrder.push(wsId);
        var len = hiddenWS.length;

        var tableIds = [];

        for (var i = 0; i < numHiddenTables; i++) {
            tableIds.push(tempHiddenTables[i]);
        }

        for (var i = 0; i < numHiddenTables; i++) {
            var tableId = tableIds[i];
            // archiveTable(tableId, ArchiveTable.Keep, null, true);
            toggleTableArchive(tableId, tempHiddenTables, tables);
        }

        $('#hiddenWorksheetsTab').find('#worksheetTab-' + wsId).remove();
        $('#hiddenWorksheetsTab').find('.mainTab').html('...(' + len + ')');

        if (len === 0) {
            $('#bottomTabArea').removeClass('hasHiddenWS');
        }

        makeWorksheet(wsId, true);
        WSManager.focusOnWorksheet(wsId);

        RightSideBar.tableBulkAction("add", TableType.WSHidden, wsId);

        // XX code if we're archiving hidden tables

        // $('#activeTablesList').find('.worksheet-' + wsId)
        //                       .closest('.tableInfo')
        //                       .removeClass('hiddenWS');


        // var $inactiveTablesList = $("#inactiveTablesList");
        // $inactiveTablesList.find('.addTableBtn').removeClass('selected');
        // // XX should add back those that were actually selected
        // for (var i = 0; i < numHiddenTables; i++) {
        //     $inactiveTablesList.find('[data-id=' + tempHiddenTables[i] + ']')
        //                        .find('.addTableBtn').addClass('selected');
        // }
        // if ($inactiveTablesList.find('.selected').length) {
        //     $('#submitTablesBtn').click();
        // }
    }

    return (WSManager);
}(jQuery, {}));
