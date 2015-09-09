window.WSManager = (function($, WSManager) {
    var worksheets    = []; // {id, date, tables, hiddenTables}
    var noSheetTables = [];

    var wsIndexLookUp = {};  // find wsIndex by table name
    var wsNameLookUp  = {};  // find wsIndex by wsName

    var activeWorsheet = 0;
    // var for naming worksheet automatically
    var defaultName = "Sheet ";
    var nameSuffix  = 1;

    var $workSheetTabSection = $("#worksheetTabs");

    // Setup function for WSManager Module
    WSManager.setup = function() {
        addWSEvents();
        initializeWorksheet();
    };

    // Get all worksheets
    WSManager.getWorksheets = function() {
        return (worksheets);
    };

    // Get tables that are not in any worksheets
    WSManager.getNoSheetTables = function() {
        return (noSheetTables);
    };

    // Get number of worksheets that is not null
    WSManager.getWSLen = function() {
        var len = 0;

        for (var i = 0; i < worksheets.length; i++) {
            // null is the worksheet that is deleted
            if (worksheets[i] != null) {
                ++len;
            }
        }

        return (len);
    };

    // Restore worksheet structure from backend
    WSManager.restoreWS = function(sheetInfos) {
        noSheetTables = sheetInfos.noSheetTables || [];

        var oldSheets = sheetInfos.wsInfos || [];

        for (var i = 0, j = 0; i < oldSheets.length; i++) {
            // remove the deleted worksheets
            var sheet = oldSheets[i];
            if (sheet != null) {
                sheet.lockedTables = [];
                worksheets[j] = sheet;
                wsNameLookUp[sheet.name] = j;
                ++j;
            } else {
                // XXX Still restore the deleted worksheet as null, otherwise
                // wsIndex will change on refresh
                // may have better to do it
                worksheets[j] = null;
                ++j;
            }
        }

        for (var i = 0; i < worksheets.length; i++) {
            if (worksheets[i] == null) {
                continue;
            }

            var tables = worksheets[i].tables;

            for (var j = 0; j < tables.length; j++) {
                wsIndexLookUp[tables[j]] = i;
            }

            var hiddenTables = worksheets[i].hiddenTables;

            for (var j = 0; j < hiddenTables.length; j++) {
                wsIndexLookUp[hiddenTables[j]] = i;
            }
        }
    };

    // For reorder table use
    WSManager.reorderTable = function(tableId, srcIndex, desIndex) {
        var wsIndex = WSManager.getWSFromTable(tableId);
        var tables  = worksheets[wsIndex].tables;

        var t = tables[srcIndex];
        tables.splice(srcIndex, 1);
        tables.splice(desIndex, 0, t);
    };

    // For archive table use
    WSManager.archiveTable = function(tableId) {
        var wsIndex   = WSManager.getWSFromTable(tableId);
        var worksheet = worksheets[wsIndex];

        var srcTables = worksheet.tables;
        var desTables = worksheet.hiddenTables;

        toggleTableArchieve(tableId, srcTables, desTables);
    };

    // For inArchive table use
    WSManager.activeTable = function(tableId) {
        var wsIndex   = WSManager.getWSFromTable(tableId);
        var worksheet = worksheets[wsIndex];

        var srcTables = worksheet.hiddenTables;
        var desTables = worksheet.tables;

        toggleTableArchieve(tableId, srcTables, desTables);
    };

    // Get a table's position in the worksheet
    WSManager.getTablePosition = function(tableId) {
        var wsIndex    = wsIndexLookUp[tableId];
        var tableIndex = worksheets[wsIndex].tables.indexOf(tableId);

        if (tableIndex < 0) {
            console.error("Table is not in active tables array!");
            return (-1);
        }

        var position = 0;
        for (var i = 0; i < wsIndex; i++) {
            if (worksheets[i] == null) {
                // this worksheet is deleted
                continue;
            } else {
                position += worksheets[i].tables.length;
            }
        }

        position += tableIndex;

        return (position);
    };

    // Get worksheet index from table id
    WSManager.getWSFromTable = function(taleId) {
        return (wsIndexLookUp[taleId]);
    };

    // Get worksheet index by worksheet name
    WSManager.getWSByName = function(wsName) {
        return (wsNameLookUp[wsName]);
    };

    // Get worksheet's name from its index
    WSManager.getWSName = function(wsIndex) {
        return (worksheets[wsIndex].name);
    };

    // Get current active worksheet
    WSManager.getActiveWS = function() {
        return (activeWorsheet);
    };

    // Clear all data in WSManager
    WSManager.clear = function() {
        worksheets = [];
        noSheetTables = [];
        wsIndexLookUp = {};
        wsNameLookUp = {};

        activeWorsheet = 0;
        nameSuffix = 1;

        initializeWorksheet();
    };

    // Add table to worksheet
    WSManager.addTable = function(tableId, wsIndex) {
        // it only add to hiddenTables first, since later we
        // need to call WSManager.replaceTable()
        if (tableId in wsIndexLookUp) {
            return (wsIndexLookUp[tableId]);
        } else {
            if (wsIndex == null) {
                wsIndex = activeWorsheet;
            }

            setWorksheet(wsIndex, {"hiddenTables": tableId});

            return (wsIndex);
        }
    };

    // replace a table and put tablesToRm to arcived list
    WSManager.replaceTable = function(tableId, locationId, tablesToRm) {
        var ws;

        // append table to the last of active tables
        if (locationId == null) {
            ws = worksheets[wsIndexLookUp[tableId]];
            toggleTableArchieve(tableId, ws.hiddenTables, ws.tables);
            return;
        }

        // replace with locationId and put other tables into hiddenTables
        var wsIndex = wsIndexLookUp[locationId];
        var tables  = worksheets[wsIndex].tables;
        var insertIndex = tables.indexOf(locationId);
        var rmTableId;

        // XXX remove from original table, may have better way
        WSManager.removeTable(tableId);
        tables.splice(insertIndex, 0, tableId);
        wsIndexLookUp[tableId] = wsIndex;

        if (tablesToRm == null) {
            tablesToRm = [locationId];
        }

        for (var i = 0, len = tablesToRm.length; i < len; i++) {
            rmTableId = tablesToRm[i];
            ws = worksheets[wsIndexLookUp[rmTableId]];
            toggleTableArchieve(rmTableId, ws.tables, ws.hiddenTables);
        }
    };

    // Move table to another worksheet
    WSManager.moveTable = function(tableId, newIndex) {
        var oldIndex = WSManager.removeTable(tableId);
        var wsName   = WSManager.getWSName(newIndex);

        setWorksheet(newIndex, {"tables": tableId});

        var $xcTablewrap = $('#xcTableWrap-' + tableId);
        $xcTablewrap.removeClass("worksheet-" + oldIndex)
                    .addClass("worksheet-" + newIndex);
        // refresh right side bar
        $("#activeTablesList .tableInfo").each(function() {
            var $li = $(this);
            if ($li.data("id") === tableId) {
                var $workhseetInfo = $li.find(".worksheetInfo");

                $workhseetInfo.removeClass("worksheet-" + oldIndex)
                                .addClass("worksheet-" + newIndex);
                $workhseetInfo.text(wsName);
            }
        });

        // refresh dag
        $("#dagPanel .dagWrap.worksheet-" + oldIndex).each(function() {
            var $dagWrap = $(this);

            if ($dagWrap.data("id") === tableId) {
                $dagWrap.removeClass("worksheet-" + oldIndex)
                        .addClass("worksheet-" + newIndex);
            }
        });

        WSManager.focusOnWorksheet(newIndex, false, tableId);
        SQL.add("Move Table to worksheet", {
            "operation"        : SQLOps.MoveTableToWS,
            "tableName"        : gTables[tableId].tableName,
            "tableId"          : tableId,
            "oldWorksheetIndex": oldIndex,
            "oldWorksheetName" : worksheets[oldIndex].name,
            "newIndex"         : newIndex,
            "worksheetName"    : wsName
        });

        commitToStorage();
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

    /**
     * Copy one table to a worksheet
     * @param {string} srcTableName The name of source table
     * @param {string} newTableName The name of new table
     * @param {number} wsIndex The index of worksheet that new table belongs to
     */
     // XX THIS IS CURRENTLY DISABLED , tablename/tableId needs to be fixed
    // WSManager.copyTable = function(srcTableName, newTableName, wsIndex) {
    //     var tableNum   = gTables.length;
    //     var tableId = xcHelper.getTableId(srcTableName);
    //     // do a deep copy
    //     var srcTable   = gTables[tableId];
    //     var tableCopy  = xcHelper.deepCopy(srcTable);
    //     var newTableId = xcHelper.getTableId(newTableName);

    //     activeWorsheet = wsIndex;
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
        var wsIndex = wsIndexLookUp[tableId];
        var tableIndex;

        if (wsIndex == null) {
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

        var tables = worksheets[wsIndex].tables;
        tableIndex = tables.indexOf(tableId);

        if (tableIndex < 0) {
            tables = worksheets[wsIndex].hiddenTables;
            tableIndex = tables.indexOf(tableId);
        }

        if (tableIndex < 0) {
            console.error("Not find the table!");
            return (null);
        }

        tables.splice(tableIndex, 1);
        delete wsIndexLookUp[tableId];

        return (wsIndex);
    };

    // Refresh Worksheet space to focus on one worksheet
    WSManager.focusOnWorksheet = function(wsIndex, notfocusTable, tableId) {
        // update activeWorksheet first
        if (wsIndex == null) {
            wsIndex = activeWorsheet;
        }
        activeWorsheet = wsIndex;

        var $tabs   = $workSheetTabSection.find(".worksheetTab");
        var $tables = $("#mainFrame .xcTableWrap");
        var $dags   = $("#dagPanel .dagWrap");

        // refresh worksheet tab
        xcHelper.removeSelectionRange();
        $tabs.find(".text").blur();
        $tabs.addClass("inActive");
        $("#worksheetTab-" + wsIndex).removeClass("inActive");

        // refresh mainFrame
        $tables.addClass("inActive");
        $tables.filter(".worksheet-" + wsIndex).removeClass("inActive");

        // refresh dag
        $dags.addClass("inActive");
        $dags.filter(".worksheet-" + wsIndex).removeClass("inActive");

        // position sticky row column
        moveFirstColumn();

        //vertically align any locked table icons
        var mainFrameHeight = $('#mainFrame').height();
        $('.tableLocked:visible').each(function() {
            var $tableWrap = $(this);
            var tableHeight = $tableWrap.find('.xcTbodyWrap').height();
            var topPos = 100 * ((tableHeight / mainFrameHeight) / 2);
            topPos = Math.min(topPos, 40);
            $tableWrap.find('.lockedIcon').css('top', topPos + '%');
            $tableWrap.find('.tableCover').height(tableHeight - 40);
        });

        checkTableDraggable();

        // refresh table and scrollbar
        var $curActiveTable = $tables.filter(".worksheet-" + wsIndex);
        if (notfocusTable || $curActiveTable.length === 0) {
            // no table to focus
            RowScroller.empty();

            if ($curActiveTable.length > 0) {
                for (var tbl in gTables) {
                    if (!gTables[tbl].active) {
                        continue;
                    }
                    var $table = $('#xcTable-' + tbl);
                    matchHeaderSizes(null, $("#xcTable-" + tbl));
                }
            }
        } else {
            var isFocus = false;

            if (tableId != null) {
                isFocus = true;
                focusTable(tableId);
            }

            for (var tbl in gTables) {
                if (!gTables[tbl].active) {
                    continue;
                }
                var $table = $('#xcTable-' + tbl);
                matchHeaderSizes(null, $table);
                $table.find('.rowGrab').width($table.width());
                // update table focus and horizontal scrollbar
                if (!isFocus) {
                    var index = WSManager.getWSFromTable(tbl);

                    if (index === activeWorsheet) {
                        isFocus = true;
                        focusTable(tbl);
                    }
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

        for (var i = 0; i < worksheets.length; i++) {
            if (!isAll && (i === activeWorsheet)) {
                continue;
            }

            if (worksheets[i] == null) {
                continue;
            }

            html += '<li data-worksheet="' + i + '">' +
                        worksheets[i].name +
                    '</li>';
        }

        return (html);
    };


    WSManager.lockTable = function(tableId) {
        var worksheetNum = WSManager.getWSFromTable(tableId);
        var worksheet = worksheets[worksheetNum];
        if (worksheet) {
            if (worksheet.lockedTables.indexOf(tableId) === -1) {
                worksheet.lockedTables.push(tableId);
            }
            $('#worksheetTab-' + worksheetNum).addClass('locked');
        }
    };

    WSManager.unlockTable = function(tableId) {
        var worksheetNum = WSManager.getWSFromTable(tableId);
        var worksheet = worksheets[worksheetNum];
        if (worksheet && worksheet.lockedTables.length > 0) {
            var tableIndex = worksheet.lockedTables.indexOf(tableId);
            worksheet.lockedTables.splice(tableIndex, 1);
            if (worksheet.lockedTables.length === 0) {
                $('#worksheetTab-' + worksheetNum).removeClass('locked');
            }
        }
    };

    WSManager.addNoSheetTables = function(tableIds, wsIndex) {
        for (var i = 0, len = tableIds.length; i < len; i++) {
            var tableId = tableIds[i];
            WSManager.rmNoSheetTable(tableId);
            WSManager.addTable(tableId, wsIndex);
        }

        SQL.add("Add no sheet tables", {
            "operation"    : SQLOps.AddNoSheetTables,
            "tableIds"     : tableIds,
            "worksheetName": worksheets[wsIndex].name,
            "wsIndex"      : wsIndex
        });
    };

    // Initialize worksheet, helper function for WSManager.setup()
    function initializeWorksheet() {
        var len = worksheets.length;
        // remove the placeholder in html
        $workSheetTabSection.empty();

        if (len === 0) {
            newWorksheet();
        } else {
            for (var i = 0; i < len; i++) {
                if (worksheets[i] != null) {
                    makeWorksheet(i);
                }
            }
        }
        // focus on the first worksheet that is not null
        for (var i = 0; i < len; i++) {
            if (worksheets[i] != null) {
                WSManager.focusOnWorksheet(i);
                break;
            }
        }
    }

    // Add worksheet events, helper function for WSManager.setup()
    function addWSEvents() {
        // click to add new worksheet
        $("#addWorksheet").click(function() {
            var wsIndex = newWorksheet();

            SQL.add("Create Worksheet", {
                "operation"     : SQLOps.AddWS,
                "worksheetName" : worksheets[wsIndex].name,
                "worksheetIndex": wsIndex
            });
        });

        $workSheetTabSection.on({
            "focus": function() {
                var $text = $(this);
                var $tab = $text.closest(".worksheetTab");

                $tab.addClass("focus");
                $tab.find(".label").mouseenter();  // close tooltip
            },
            "blur": function() {
                var $text = $(this);

                $text.text($text.data("title"));
                $text.scrollLeft(0);
                $text.closest(".worksheetTab").removeClass("focus");
            },
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    renameWorksheet($(this));
                }
            }
        }, ".worksheetTab .text");

        // switch worksheet
        $workSheetTabSection.on("click", ".worksheetTab", function () {
            var $tab = $(this);

            if ($tab.hasClass("inActive")) {
                var curWS   = activeWorsheet;
                var wsIndex = Number($tab.attr("id").split("worksheetTab-")[1]);

                WSManager.focusOnWorksheet(wsIndex);

                SQL.add("Switch Worksheet", {
                    "operation"        : SQLOps.SwitchWS,
                    "oldWorksheetIndex": curWS,
                    "oldWorksheetName" : worksheets[curWS].name,
                    "newWorksheetIndex": wsIndex,
                    "newWorksheetName" : worksheets[wsIndex].name
                });
            }
        });
        // delete worksheet
        $workSheetTabSection.on("click", ".delete", function (event) {
            var $tab = $(this).closest(".worksheetTab");
            var wsIndex = Number($tab.attr("id").split("worksheetTab-")[1]);

            event.stopPropagation();
            delWSHelper(wsIndex);
        });
    }

    // Create a new worksheet
    function newWorksheet() {
        var wsIndex = worksheets.length;
        var name    = defaultName + (nameSuffix++);
        var date    = xcHelper.getDate();

        while (wsNameLookUp[name] != null) {
            name = defaultName + (nameSuffix++);
        }

        setWorksheet(wsIndex, {
            "name"        : name,
            "date"        : date,
            "lockedTables": []
        });

        makeWorksheet(wsIndex);
        // focus on new worksheet
        WSManager.focusOnWorksheet(wsIndex);

        return (wsIndex);
    }

    // Make a worksheet
    function makeWorksheet(wsIndex) {
        $workSheetTabSection.append(getWSTabHTML(wsIndex));
    }

    // Rename a worksheet
    function renameWorksheet($text) {
        var name = $text.text().trim();
        // name confilct
        if (wsNameLookUp[name] != null) {
            $text.blur();
            return;
        }

        var $label = $text.closest(".label");
        var $tab = $text.closest(".worksheetTab");
        var wsIndex = Number($tab.attr("id").split("worksheetTab-")[1]);
        var oldName = worksheets[wsIndex].name;

        delete wsNameLookUp[oldName];
        setWorksheet(wsIndex, {"name": name});

        $text.data("title", name);
        $label.attr("data-original-title", name);
        $text.blur();
        // use worksheet class to find table lists in right side bar
        $("#tableListSections .worksheetInfo.worksheet-" + wsIndex).text(name);

        SQL.add("Rename Worksheet", {
            "operation"     : SQLOps.RenameWS,
            "worksheetIndex": wsIndex,
            "oldName"       : oldName,
            "newName"       : name
        });

        commitToStorage();
    }

    // Remove worksheet
    function rmWorksheet(wsIndex) {
        worksheets[wsIndex].tables.forEach(function(tableId) {
            delete wsIndexLookUp[tableId];
        });

        worksheets[wsIndex].hiddenTables.forEach(function(tableId) {
            delete wsIndexLookUp[tableId];
        });

        delete wsNameLookUp[worksheets[wsIndex].name];
        worksheets[wsIndex] = null;

        $("#worksheetTab-" + wsIndex).remove();
        commitToStorage();
        // switch to another worksheet
        if (activeWorsheet === wsIndex) {
            for (var i = 0; i < worksheets.length; i++) {
                if (worksheets[i] != null) {
                    WSManager.focusOnWorksheet(i, true);
                    break;
                }
            }
        }
    }

    // Set worksheet
    function setWorksheet(wsIndex, options) {
        if (worksheets[wsIndex] == null) {
            worksheets[wsIndex] = {
                "tables"      : [],
                "hiddenTables": []
            };
        }

        for (var key in options) {
            var val = options[key];

            if (key === "tables" || key === "hiddenTables") {
                if (val in wsIndexLookUp) {
                    console.error(val, "already in worksheets!");
                    return;
                }

                worksheets[wsIndex][key].push(val);
                wsIndexLookUp[val] = wsIndex;
            } else {
                worksheets[wsIndex][key] = val;

                if (key === "name") {
                    wsNameLookUp[val] = wsIndex;
                }
            }
        }
    }

    // Helper function to delete worksheet
    function delWSHelper(wsIndex) {
        var title    = "DELETE WORKSHEET";
        var worsheet = worksheets[wsIndex];
        var msg;
        var sqlOptions = {
            "operation"     : SQLOps.DelWS,
            "worksheetIndex": wsIndex,
            "worksheetName" : worsheet.name
        };

        if (worsheet.tables.length === 0 &&
            worsheet.hiddenTables.length === 0)
        {
            // delete empty worksheet
            rmWorksheet(wsIndex);

            SQL.add("Delete Worksheet", sqlOptions);
            return;
        } else {
            // delete worksheet with tables
            msg = "There are tables in worksheet, " +
                  "how would you deal with them?";
            Alert.show({
                "title"  : title,
                "msg"    : msg,
                "buttons": [
                    {
                        "name"     : "Delete Tables",
                        "className": "deleteTale",
                        "func"     : function() {
                            delTableHelper(wsIndex)
                            .then(function() {
                                sqlOptions.tableAction = "delete";
                                SQL.add("Delete Worksheet", sqlOptions);
                            });
                        }
                    },
                    {
                        "name"     : "Archive Tables",
                        "className": "archiveTable",
                        "func"     : function() {
                            archiveTableHelper(wsIndex);
                            sqlOptions.tableAction = "archive";
                            SQL.add("Delete Worksheet", sqlOptions);
                        }
                    }
                ]
            });
        }
    }

    // Helper function to delete tables in a worksheet
    function delTableHelper(wsIndex) {
        var deferred    = jQuery.Deferred();
        var promises    = [];
        var $tableLists = $("#inactiveTablesList");

        // click all inactive table in this worksheet
        $tableLists.find(".addTableBtn.selected").click();
        $tableLists.find(".worksheet-" + wsIndex)
                    .closest(".tableInfo")
                    .find(".addTableBtn").click();


        // for active table, use this to delete
        var activeTables = worksheets[wsIndex].tables;
        for (var i = 0, len = activeTables.length; i < len; i++) {
            var tableId = activeTables[i];
            promises.push(deleteTable.bind(this, tableId, TableType.Active));
        }

        chain(promises)
        .then(function() {
            return (RightSideBar.tableBulkAction("delete", TableType.InActive));
        })
        .then(function() {
            rmWorksheet(wsIndex);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Delete Table Fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    // Helper function to archive tables in a worksheet
    function archiveTableHelper(wsIndex) {
        // archive all active tables (save it in a temp array because
        // archiveTable will change the structure of worksheets[].tables)
        var tableIds = [];
        var tables   = worksheets[wsIndex].tables;

        for (var i = 0, len = tables.length; i < len; i++) {
            tableIds[i] = tables[i];
        }

        for (var i = 0, len = tableIds.length; i < len; i++) {
            var tableId = tableIds[i];
            archiveTable(tableId, ArchiveTable.Keep);
            noSheetTables.push(tableId);
        }

        $("#inactiveTablesList").find(".worksheetInfo.worksheet-" + wsIndex)
                                .addClass("inactive").text("No Sheet");
        rmWorksheet(wsIndex);
    }

    function toggleTableArchieve(tableId, srcTables, desTables, index) {
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

    // HTML of worksheet tab, helper function for makeWorksheet()
    function getWSTabHTML(wsIndex) {
        var name     = worksheets[wsIndex].name;
        var id       = "worksheetTab-" + wsIndex;
        var dagTabId =  (wsIndex === 0) ? "compSwitch" :
                                          "compSwitch-" + wsIndex;
        var tabTooltip =
            'data-original-title="' + name + '"' +
            'data-toggle="tooltip" data-placement="top"' +
            'data-container="#' + id + ':not(.focus) .label"';

        var dagTooltip =
            'data-toggle="tooltip" ' +
            'data-placement="top" ' +
            'data-title="click to view DAG" data-container="body"';

        var html =
            '<section id="' + id + '"class="worksheetTab inActive">' +
                '<div class="label" ' + tabTooltip + '>' +
                    '<div class="iconWrapper delete">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                    '<span class="wsIcon"></span>' +
                    '<div class="text" data-title="' + name + '" ' +
                        'contenteditable>' +
                        name +
                    '</div>' +
                '</div>' +
                '<div id="' + dagTabId + '"class="dagTab"' + dagTooltip + '>' +
                    '<span class="icon"></span>' +
                '</div>' +
            '</section>';

        return (html);
    }

    return (WSManager);
}(jQuery, {}));
