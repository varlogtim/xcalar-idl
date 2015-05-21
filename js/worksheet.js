window.WSManager = (function($, WSManager) {
    var worksheets     = [];
    var tabLookUp      = {}; // use it to find worksheet tab from table name
    var wsNameLookUp   = {}; // find wsIndex by name
    var activeWorsheet = 0;
    // var for name worksheet automatically
    var defaultName    = "Sheet ";
    var nameSuffix     = 1;

    var $workSheetTabSection = $("#worksheetTabs");

    WSManager.setup = function() {
        // set up workhseet meta
        $("#workspaceDate").text("Created on " + xcHelper.getDate());

        setupWorksheetListener();
        initializeWorksheet();
    }

    WSManager.getWorksheets = function() {
        return (worksheets);
    }

    WSManager.getWorksheetLen = function() {
        var len = 0;

        for (var i = 0; i < worksheets.length; i++) {
            if (worksheets[i] != null) {
                ++len;
            }
        }

        return len;
    }

    WSManager.restoreWorksheets = function(oldSheets) {
        for (var i = 0, j = 0; i < oldSheets.length; i ++) {
            // remove the deleted worksheets
            var sheet = oldSheets[i];

            if (sheet != null) {
                worksheets[j] = sheet;
                wsNameLookUp[sheet.name] = j;
                ++j;
            }
        }

        for (var i = 0; i < worksheets.length; i++) {
            var tables = worksheets[i].tables;

            for (var j = 0; j < tables.length; j ++) {
                tabLookUp[tables[j]] = i;
            }
        }
    }

    WSManager.getWorksheetIndex = function(tableName) {
        return tabLookUp[tableName];
    }

    WSManager.getWorksheetByName = function(wsName) {
        return (wsNameLookUp[wsName]);
    }

    WSManager.getWorksheetName = function(wsIndex) {
        return worksheets[wsIndex].name;
    }

    WSManager.clear = function() {
        worksheets = [];
        tabLookUp = {};
        wsNameLookUp = {};
        activeWorsheet = 0;
        nameSuffix = 1;
        initializeWorksheet();
    }

    WSManager.addTable = function(tableName, wsIndex) {
        if (wsIndex == undefined) {
            wsIndex = activeWorsheet;
        }

        if (tableName in tabLookUp) {
            return (tabLookUp[tableName]);
        } else {
            setWorksheet(wsIndex, {"tables": tableName});

            return (wsIndex);
        }
    }

    WSManager.moveTable = function(tableNum, newIndex) {
        var tableName = gTables[tableNum].frontTableName;
        var oldIndex = WSManager.removeTable(tableName);

        setWorksheet(newIndex, {"tables": tableName});

        $("#xcTableWrap" + tableNum).removeClass("worksheet-" + oldIndex)
                                    .addClass("worksheet-" + newIndex);
        // refresh right side bar
        $("#activeTablesList .tableInfo").each(function() {
            var $li = $(this);
            if ($li.data("tablename") === tableName) {
                var $workhseetInfo = $li.find(".worksheetInfo");

                $workhseetInfo.removeClass("worksheet-" + oldIndex)
                                .addClass("worksheet-" + newIndex);
                $workhseetInfo.text(WSManager.getWorksheetName(newIndex));
            }
        });

        // refresh dag
        $("#dagPanel .dagWrap.worksheet-" + oldIndex).each(function() {
            var $dagWrap = $(this);

            if ($dagWrap.find(".tableName").text() === tableName) {
                $dagWrap.removeClass("worksheet-" + oldIndex)
                        .addClass("worksheet-" + newIndex);
            }
        });

        WSManager.focusOnWorksheet(newIndex, false, tableNum);
        commitToStorage();
    }

    WSManager.copyTable = function(srcTableName, newTableName, wsIndex) {
        var tableNum = gTables.length;
        // do a deep copy
        var srcTable  = gTableIndicesLookup[srcTableName];
        var tableCopy = JSON.parse(JSON.stringify(srcTable));

        activeWorsheet = wsIndex;
        gTableIndicesLookup[newTableName] = tableCopy;
        // XXX for sample table, should sync frontName with backName since
        // there both src sample and the copied can change to real table using
        // its backTableName
        if (!tableCopy.isTable) {
            tableCopy.backTableName  = newTableName;
        }

        addTable(tableCopy.backTableName, tableNum, 
                 AfterStartup.After, undefined, newTableName)
        .then(function() {
            WSManager.focusOnWorksheet(wsIndex, false, tableNum);
        })
        .fail(function(error) {
            delete gTableIndicesLookup[newTableName];
            Alert.error(error);
        });
    }

    WSManager.removeTable = function(tableName) {
        var wsIndex = tabLookUp[tableName];

        if (wsIndex == undefined) {
            console.error("Table not exist in worksheet");
            return;
        }

        var tables = worksheets[wsIndex].tables;
        var tableIndex = tables.indexOf(tableName);

        tables.splice(tableIndex, 1);

        delete tabLookUp[tableName];

        return (wsIndex);
    }

    WSManager.focusOnWorksheet = function(wsIndex, notfocusTable, tableNum) {
        if (wsIndex == undefined) {
            wsIndex = activeWorsheet;
        }

        activeWorsheet = wsIndex;

        var $tables = $("#mainFrame .xcTableWrap");
        var $tabs = $workSheetTabSection.find(".worksheetTab");
        var $dags = $("#dagPanel .dagWrap");

        // refresh worksheet tabe
        xcHelper.removeSelectionRange();

        $tabs.find(".text").blur();
        $tabs.addClass("inActive");
        $("#worksheetTab-" + wsIndex).removeClass("inActive");

        // refresh mainFrame
        var $curActiveTable = $tables.filter(".worksheet-" + wsIndex);

        $tables.addClass("inActive");
        $tables.filter(".worksheet-" + wsIndex).removeClass("inActive");

        // refresh dag
        $dags.addClass("inActive");
        $dags.filter(".worksheet-" + wsIndex).removeClass("inActive");

        // refresh table and scrollbar
        if ($curActiveTable.length === 0 || notfocusTable) {
            emptyScroller();

            if ($curActiveTable.length > 0) {
                for (var i = 0; i < gTables.length; i++) {
                    // update table width and height
                    adjustColGrabHeight(i);
                    matchHeaderSizes(null, $("#xcTable" + i));
                }
            }
        } else {
            var isFocus = false;

            if (tableNum != undefined) {
                isFocus = true;
                focusTable(tableNum);
            }
            
            for (var i = 0; i < gTables.length; i++) {
                // update table width and height
                adjustColGrabHeight(i);
                matchHeaderSizes(null, $("#xcTable" + i));
                // update table focus and horizontal scrollbar
                if (!isFocus) {
                    var wsIndex = tabLookUp[gTables[i].frontTableName];

                    if (wsIndex === activeWorsheet) {
                        isFocus = true;
                        focusTable(i);
                    }
                }
            }
        }
    }

    WSManager.focusOnLastTable = function() {
        var $mainFrame = $('#mainFrame');

        for (var i = gTables.length - 1; i >= 0; i--) {
            var tableName = gTables[i].frontTableName;

            if (WSManager.getWorksheetIndex(tableName) === activeWorsheet) {
                var index = i;
                var leftPos = $('#xcTableWrap' + index).position().left +
                                $mainFrame.scrollLeft();
                $mainFrame.animate({scrollLeft: leftPos})
                          .promise()
                           .then(function(){
                                focusTable(index);
                            });
                break;
            }
        }
    }

    WSManager.getWorksheetLists = function(isAll) {
        var html = "";

        for (var i = 0; i < worksheets.length; i ++) {
            if (!isAll && (i == activeWorsheet)) {
                continue;
            }

            if (worksheets[i] == null) {
                continue;
            }

            var name = worksheets[i].name;

            html += '<li data-worksheet="' + i + '">' + name + '</li>';
        }

        return (html);
    }

    function initializeWorksheet() {
        // remove the placeholder in html
        $workSheetTabSection.empty();

        if (worksheets.length === 0) {
            newWorksheet();
        } else {
            for (var i = 0; i < worksheets.length; i ++) {
                 makeWorksheet(worksheets[i].name, i);
            }
        }

        WSManager.focusOnWorksheet(0);
    }

    function setupWorksheetListener() {
        // click to add new worksheet
        $("#addWorksheet").click(function() {
            newWorksheet();
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
                var wsIndex = Number($tab.attr("id").split("worksheetTab-")[1]);

                WSManager.focusOnWorksheet(wsIndex);
            }
        });
        // delete worksheet
        $workSheetTabSection.on("click", ".delete", function (event) {
            event.stopPropagation();
            var $tab = $(this).closest(".worksheetTab");
            var wsIndex = Number($tab.attr("id").split("worksheetTab-")[1]);

            deleteWorksheetAction(wsIndex);
        });
    }

    function newWorksheet() {
        var wsIndex = worksheets.length;
        var name = defaultName + (nameSuffix++);

        while (wsNameLookUp[name] != undefined) {
            name = defaultName + (nameSuffix++);

        }

        setWorksheet(wsIndex, {"name": name});

        makeWorksheet(name, wsIndex);
    }

    function makeWorksheet(name, wsIndex) {
        $workSheetTabSection.append(getWorksheetTabHTML(name, wsIndex));
    }

    function renameWorksheet($text) {
        var name = jQuery.trim($text.text());
        // name confilct
        if (wsNameLookUp[name] != undefined) {
            $text.blur();
            return;
        }

        var $label = $text.closest(".label");
        var $tab = $text.closest(".worksheetTab");
        var wsIndex = Number($tab.attr("id").split("worksheetTab-")[1]);

        delete wsNameLookUp[name];
        setWorksheet(wsIndex, {"name": name});

        $text.data("title", name);
        $label.attr("data-original-title", name);
        $text.blur();
        // use worksheet class to find table lists in right side bar
        $("#tableListSections .worksheetInfo.worksheet-" + wsIndex).text(name);

        commitToStorage();
    }

    function removeWorksheet(wsIndex) {
        worksheets[wsIndex].tables.forEach(function(table) {
            delete tabLookUp[table];
        });

        delete wsNameLookUp[worksheets[wsIndex].name];
        worksheets[wsIndex] = null;

        $("#worksheetTab-" + wsIndex).remove();
        commitToStorage();
        // switch to another worksheet
        if (activeWorsheet === wsIndex) {
            for (var i = 0; i < worksheets.length; i ++) {
                if (worksheets[i] != null) {
                   WSManager.focusOnWorksheet(i, true);
                   break;
                }
            }
        }
    }

    function setWorksheet(wsIndex, options) {
        if (worksheets[wsIndex] == undefined) {
            worksheets[wsIndex] = {"tables": []};
        }

        for (key in options) {
            var val = options[key];

            if (key === "tables") {
                if (key in tabLookUp) {
                    console.error(val, "already in worksheets!");
                    return;
                }

                worksheets[wsIndex][key].push(val);
                tabLookUp[val] = wsIndex;
            } else {
                worksheets[wsIndex][key] = val;

                if (key === "name") {
                    wsNameLookUp[val] = wsIndex;
                }
            }
        }
    }

    function deleteWorksheetAction(wsIndex) {
        var title       = "DELETE WORKSHEET";
        var curWorsheet = worksheets[wsIndex];

        // delete empty worksheet
        if (curWorsheet.tables.length === 0) {
            var msg = "Are you sure you want to delete the worksheet?";

            Alert.show({
                "title"     : title,
                "msg"       : msg,
                "isCheckBox": true,
                "confirm"   : function() {
                    removeWorksheet(wsIndex);
                }
            });

            return;
        }

        var msg = "There are tables in worksheet, " +
                  "how would you deal with them?";

        Alert.show({
            "title"  : title,
            "msg"    : msg,
            "buttons": [
                {
                    "name"     : "Delete Tables",
                    "className": "deleteTale",
                    "func"     : function() {
                        tableDeleteHelper(curWorsheet, wsIndex);
                    }
                },
                {
                    "name"     : "Archive Tables",
                    "className": "archiveTable",
                    "func"     : function() {
                        archiveTableHelper(curWorsheet, wsIndex);
                    }
                }
            ]
        });
    }

    function tableDeleteHelper(worsheet, wsIndex) {
        var promises    = [];
        var tables      = worsheet.tables;
        var $tableLists = $("#inactiveTablesList");

        // click all inactive table in this worksheet
        $tableLists.find(".addArchivedBtn.selected").click();
        $tableLists.find(".worksheet-" + wsIndex)
                    .closest(".tableInfo")
                    .find(".addArchivedBtn").click();

        // as delete table will change tables array,
        // so should delete from last
        for (var i = gTables.length - 1; i >= 0; i --) {
            var tableName = gTables[i].frontTableName;

            if (WSManager.getWorksheetIndex(tableName) === wsIndex) {
                promises.push(deleteActiveTable.bind(this, i));
            }
        }

        chain(promises)
        .then(function() {
            return (RightSideBar.tableBulkAction("delete"));
        })
        .then(function() {
            removeWorksheet(wsIndex);
        })
        .fail(function(error) {
            Alert.error("Delete Table Fails", error);
        });
    }

    function archiveTableHelper(worsheet, wsIndex) {
        // archive all active tables first
        for (var i = gTables.length - 1; i >= 0; i --) {
            var tableName = gTables[i].frontTableName;

            if (WSManager.getWorksheetIndex(tableName) === wsIndex) {
                archiveTable(i, DeleteTable.Keep);
            }
        }

        $("#inactiveTablesList").find(".worksheetInfo.worksheet-" + wsIndex)
                                .addClass("inactive").text("No Sheet");
        removeWorksheet(wsIndex);
    }

    function getWorksheetTabHTML(name, wsIndex) {
        var id = "worksheetTab-" + wsIndex;
        var dagTabId =  wsIndex == 0 ? "compSwitch" : "compSwitch-" + wsIndex;
        var tabTooltip = 
            'data-original-title="' + name + '"' + 
            'data-toggle="tooltip" data-placement="top"' + 
            'data-container="#' + id + ':not(.focus) .label"';

        var dagTooltip = 
            'data-toggle="tooltip" ' + 
            'data-placement="top" ' + 
            'data-title="click to view DAG" data-container="body"';

        // var deleteTooltip =
        //     'title="click to delete worksheet"' + 
        //     'data-toggle="tooltip" ' + 
        //     'data-placement="top" ' + 
        //     'data-container="body"';
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