window.TableList = (function($, TableList) {
    var searchHelper;
    var focusedListNum;
    var pendingCount = 0; // number of pending refreshTable calls
    var canceledTables = {}; // stores tables that are canceled and should not
                            // appear in the orphaned list
    var lockedTables = {}; // stores tables that are locked
    var days = [DaysTStr.Sunday, DaysTStr.Monday, DaysTStr.Tuesday,
            DaysTStr.Wednesday, DaysTStr.Thursday, DaysTStr.Friday,
            DaysTStr.Saturday];

    TableList.setup = function() {
        // setup table list section listeners
        var $tableListSections = $("#tableListSections");

        // toggle table sections
        $("#tableListSectionTabs").on("click", ".tableListSectionTab", function() {
            var $tab = $(this);
            var index = $tab.index();

            $("#tableListSectionTabs .active").removeClass("active");
            $tab.addClass("active");

            var $sections = $tableListSections.find(".tableListSection").hide();
            $sections.eq(index).show();
            focusedListNum = null;
            if (index === 2 && $tab.hasClass("firstTouch")) {
                $tab.removeClass("firstTouch");
                TableList.refreshConstantList(true);
            }
        });

        // toggle table list box
        $tableListSections.on("click", ".tableListBox", function() {
            var $li = $(this).closest(".tableInfo");
            var $ul = $li.find(".columnList");

            if ($li.hasClass("active")) {
                $li.removeClass("active");
                $ul.slideUp(200);
            } else {
                if ($ul.children().length === 0) {
                    return;
                }
                $li.addClass("active");
                $ul.slideDown(200);
            }
        });

        // focus on table
        var $activeLists = $("#activeTableListSection");
        $activeLists.on("click", ".tableListBox .tableName", function() {
            if ($(this).closest('.hiddenWS').length) {
                return;
            }
            var tableId = $(this).closest('.tableInfo').data("id");
            var animate = true;
            xcHelper.centerFocusedTable(tableId, animate);
            Dag.focusDagForActiveTable(null, false, animate);

            // stop propogation
            return false;
        });

        // focus on temp table
        $("#orphanedTableListSection").on("click", ".tableListBox .tableName",
        function() {
            var tableName = $(this).closest('.tableInfo').data("tablename");
            var found = Dag.focusTempTable(tableName);
            if (!found) {
                var options = {
                    "title": TooltipTStr.TempTableNotFound
                };
                var displayTime = 2000;
                xcTooltip.transient($(this).parent(), options, displayTime);
            }
        });

        // select a table list
        $tableListSections.on("click", ".addTableBtn", function(event) {
            var $btn = $(this);

            if ($btn.closest(".tableInfo").hasClass("hiddenWS")) {
                return true;
            }
            var toSelect = !$btn.hasClass('selected');
            var curListNum = $btn.closest('li').index();
            var $lists = $btn.closest('li').siblings().andSelf();
            if (event.shiftKey && focusedListNum !== null) {
                var start = Math.min(focusedListNum, curListNum);
                var end = Math.max(focusedListNum, curListNum);
                for (var i = start; i <= end; i++) {
                    if (toSelect) {
                        $lists.eq(i).find('.addTableBtn').addClass('selected');
                    } else {
                        $lists.eq(i).find('.addTableBtn').removeClass('selected');
                    }
                }
            } else {
                $btn.toggleClass('selected');
            }

            var $section = $btn.closest(".tableListSection");
            var $submitBtns = $section.find(".submit");

            if ($section.find(".addTableBtn.selected").length === 0) {
                $submitBtns.addClass("xc-hidden");
            } else {
                $submitBtns.removeClass("xc-hidden");
                var $activateBtn = $section.find(".submit.active");
                if ($section.find(".undone .addTableBtn.selected").length) {
                    $activateBtn.addClass('xc-unavailable');
                    xcTooltip.changeText($activateBtn,
                                         TooltipTStr.NoActiveUndone);
                } else {
                    $activateBtn.removeClass('xc-unavailable');
                    xcTooltip.changeText($activateBtn,
                                         TooltipTStr.AddToWorksheet);
                }
            }
            focusedListNum = curListNum;
            // stop propogation
            return false;
        });

        // select all table checkboxes
        $tableListSections.on("click", ".selectAll", function() {
            var $section = $(this).closest(".tableListSection");
            var $btns = $section.find(".tableInfo:not(.hiddenWS):not(.locked)" +
                                " .addTableBtn:visible").addClass("selected");
            if ($btns.length > 0) {
                $section.find(".submit").removeClass("xc-hidden");
                var $activateBtn = $section.find(".submit.active");
                if ($btns.closest(".undone").length) {
                    $activateBtn.addClass('xc-unavailable');
                    xcTooltip.changeText($activateBtn,
                                         TooltipTStr.NoActiveUndone);
                } else {
                    $activateBtn.removeClass('xc-unavailable');
                    xcTooltip.changeText($activateBtn,
                                         TooltipTStr.AddToWorksheet);
                }
            }
            focusedListNum = null;
        });

        // clear all table checkboxes
        $tableListSections.on("click", ".clearAll", function() {
            clearAll($(this).closest(".tableListSection"));
        });

        // refresh orphan list
        $("#orphanedTableListSection .refresh").click(function() {
            TableList.refreshOrphanList(true);
        });

        // refresh constants list
        $("#constantsListSection .refresh").click(function() {
            TableList.refreshConstantList(true);
        });

        // overflow tooltip
        $tableListSections.on("mouseenter", ".tableName", function() {
            if (!$(this).closest("." + TableType.Undone).length) {
                xcTooltip.auto(this);
            }
        });

        // overflow tooltip
        $tableListSections.on("mouseenter", ".constName", function() {
            xcTooltip.auto(this);
        });

        // submit selected tables to active
        $tableListSections.on("click", ".submit.active", function() {
            if ($(this).hasClass('xc-unavailable')) {
                return;
            }
            TableList.activeTables(TableType.Orphan);
            focusedListNum = null;
        });

        // delete selected tables
        $tableListSections.on("click", ".submit.delete", function() {
            var $section = $(this).closest(".tableListSection");
            var tableType;
            var title = TblTStr.Del;
            var msg = SideBarTStr.DelTablesMsg;
            if ($section.is("#activeTableListSection")) {
                tableType = TableType.Active;
                if ($('#activeTablesList').find(".addTableBtn.selected")
                    .closest(".tableInfo").find(".lockIcon").length) {
                    msg = SideBarTStr.DelLockedTablesMsg;
                }
            } else if ($section.is("#orphanedTableListSection")) {
                tableType = TableType.Orphan;
            } else if ($section.is("#constantsListSection")) {
                title = SideBarTStr.DropConsts;
                msg = SideBarTStr.DropConstsMsg;
                tableType = "constant";
            }

            Alert.show({
                "title": title,
                "msgTemplate": msg,
                "onConfirm": function() {
                    deleteFromList($section, tableType);
                }
            });
            focusedListNum = null;
        });

        // sort
        $tableListSections.on("click", ".sortOption", function() {
            var type = $(this).data("sort");
            var $section = $(this).closest(".tableListSection");
            if ($section.data("sort") === type) {
                return;
            } else {
                $section.data("sort", type);
            }
            if (type === "name") {
                $section.addClass("sortedByName")
                        .removeClass("sortedByDate sortedByWS");
            } else if (type === "ws") {
                $section.addClass("sortedByWS")
                        .removeClass("sortedByDate sortedByName");
            } else { // sort by date
                $section.addClass("sortedByDate")
                        .removeClass("sortedByName sortedByWS");
            }

            var isActive = false;
            if ($section.is("#activeTableListSection")) {
                isActive = true;
            }

            $section.find(".tableLists").empty();

            var tables = getAllTables();
            var options = {noAnimate: true,
                           sortType: type,
                           bulkAdd: true};
            generateTableList(tables, isActive, options);
        });

        // XXX make this public in case we need to reuse elsewhere
        function getAllTables() {
            var tables = [];
            WSManager.getWSList().forEach(function(wsId) {
                var ws = WSManager.getWSById(wsId);
                var wsTables = ws.tables;
                for (var j = 0; j < wsTables.length; j++) {
                    tables.push(gTables[wsTables[j]]);
                }
            });

            WSManager.getHiddenWSList().forEach(function(wsId) {
                var ws = WSManager.getWSById(wsId);
                var wsTables = ws.tempHiddenTables;
                for (var j = 0; j < wsTables.length; j++) {
                    tables.push(gTables[wsTables[j]]);
                }
            });
            return tables;
        }

        $("#activeTablesList").on("mousedown", ".column", function() {
            var $col = $(this);
            if ($(this).closest(".tableInfo").hasClass("hiddenWS")) {
                return;
            }
            focusOnTableColumn($col);
        });

        searchHelper = new SearchBar($("#orphanedTableList-search"), {
            "$list": $("#orphanedTableListSection").find('.tableLists'),
            "removeSelected": function() {
                $("#orphanedTableListSection").find(".selected")
                                              .removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            },
            "onInput": function(val) {
                filterTableList(val);
            }
        });

        searchHelper.$arrows.hide();

        $("#orphanedTableList-search").on("click", ".clear", function() {
            searchHelper.clearSearch(function() {
                clearTableListFilter($("#orphanedTableListSection"), null);
                searchHelper.$arrows.hide();
            });
        });
    };

    TableList.initialize = function() {
        var activeTables = [];

        for (var tableId in gTables) {
            var table = gTables[tableId];
            var tableType = table.getType();
            if (tableType === TableType.Orphan ||
                tableType === TableType.Trash) {
                continue;
            }

            if (tableType === TableType.Active) {
                activeTables.push(table);
            }
        }
        TableList.addTables(activeTables, IsActive.Active, {bulkAdd: true});

        generateOrphanList(gOrphanTables);

        return generateConstList(true);
    };

    TableList.clear = function() {
        $("#tableListSections").find(".submit").addClass("xc-hidden")
                            .end()
                            .find(".tableLists").empty();
        searchHelper.clearSearch(function() {
            clearTableListFilter($("#orphanedTableListSection"));
        });
    };

    TableList.addTables = function(tables, active, options) {
        // tables is an array of metaTables;
        generateTableList(tables, active, options);
    };

    TableList.updateColName = function(tableId, colNum, newColName) {
        $('#activeTablesList').find(".tableInfo[data-id=" + tableId + "]")
                              .find(".column").eq(colNum - 1)
                              .find(".text")
                              .text(colNum + ". " + newColName);
    };

    // used to refresh table name and columns
    TableList.updateTableInfo = function(tableId) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
        var wasOpen = $tableList.hasClass("active");
        var position = $tableList.index();
        $tableList.remove();

        var table = gTables[tableId];
        TableList.addTables([table], IsActive.Active, {
            noAnimate: true,
            position: position
        });

        if (wasOpen) {
            $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
            var $ul = $tableList.find(".columnList");
            if ($ul.children().length > 0) {
                $tableList.addClass("active");
                $ul.show();
            }
        }
    };

    TableList.activeTables = function(tableType, noSheetTables, wsToSent,
                                      destWS) {
        var deferred = jQuery.Deferred();
        var sql = {
            "operation": SQLOps.ActiveTables,
            "tableType": tableType
        };

        TableList.tableBulkAction("add", tableType, null, destWS)
        .then(function(tableNames, ws) {
            sql.tableNames = tableNames;
            if (ws) {
                sql.ws = ws;
            }
            Log.add(TblTStr.Active, sql);

            deferred.resolve();
        })
        .fail(function(error) {
            if (error !== "canceled") {
                Alert.error(TblTStr.ActiveFail, error);
                deferred.reject(error);
            }
        });

        return deferred.promise();
    };

    // adding or deleting tables from different lists
    TableList.tableBulkAction = function(action, tableType, wsId, destWS,
        resolveAfterAnim, noAnim) {
        var deferred = jQuery.Deferred();
        var validAction = ["add", "delete"];

        // validation check
        xcAssert(validAction.indexOf(action) >= 0);
        focusedListNum = null;
        var $tableList;
        var hiddenWS = false;

        if (tableType === TableType.WSHidden) {
            $tableList = $('#activeTablesList');
            hiddenWS = true;
        } else if (tableType === TableType.Orphan) {
            $tableList = $('#orphanedTableListSection');
        } else if (tableType === TableType.Active) {
            $tableList = $('#activeTablesList');
        }

        var $tablesSelected;
        var tableIds;
        if (hiddenWS) {
            $tablesSelected = $();
            tableIds = WSManager.getWorksheets()[wsId].tables;
            $tablesSelected = $tableList.find(".worksheet-" + wsId)
                                        .closest(".tableInfo");
            var $activeList = $('#activeTableListSection');

            $activeList.find(".tableGroup.ws" + wsId)
                       .removeClass("hiddenWSGroup");
        } else {
            $tablesSelected = $tableList.find(".addTableBtn.selected")
                                        .closest(".tableInfo");
        }

        var promises = [];
        var failures = [];
        var tablesAndLis = getSelectedTablesAndLis($tablesSelected, tableType,
                                                    action, hiddenWS, tableIds);
        var tables = tablesAndLis.tables;
        var lis = tablesAndLis.lis;
        if (!tables.length) {
            deferred.resolve();
            return deferred.promise();
        }

        var tableRenameMap = {}; // for orphaned tables without tableId

        tooManyColAlertHelper(tables, tableType, action, destWS)
        .then(function() {
            $tableList.find(".submit").addClass("xc-hidden");
            searchHelper.clearSearch(function() {
                clearTableListFilter($("#orphanedTableListSection"), null);
            });
            if (action === "add") {
                tables.forEach(function(tableName, index) {
                    var $li = lis[index];
                    promises.push((function() {
                        var innerDeferred = jQuery.Deferred();

                        if (tableType === TableType.Orphan) {
                            TableList.lockTable(xcHelper.getTableId(tableName));
                            addOrphanedTable(tableName, destWS)
                            .then(function(ws, newTableName){
                                if (newTableName !== tableName) {
                                    tableRenameMap[tableName] = newTableName;
                                }
                                doneHandler($li, tableName);
                                var tableIndex = gOrphanTables.indexOf(tableName);
                                gOrphanTables.splice(tableIndex, 1);
                                innerDeferred.resolve(ws);
                            })
                            .fail(function(error) {
                                failHandler($li, tableName, error);
                                innerDeferred.resolve(error);
                            })
                            .always(function() {
                                TableList.unlockTable(xcHelper.getTableId(
                                                                    tableName));
                            });
                        } else { //  hidden
                            var tableId = xcHelper.getTableId(tableName);
                            var table = gTables[tableId];
                            TableList.lockTable(tableId);
                            table.updateTimeStamp();

                            TblManager.refreshTable([tableName], null, [], null)
                            .then(function() {
                                doneHandler($li, tableName, hiddenWS);
                                TableList.unlockTable(tableId);
                                innerDeferred.resolve();
                            })
                            .fail(function(error) {
                                failHandler($li, tableName, error);
                                TableList.unlockTable(tableId);
                                innerDeferred.resolve(error);
                            });
                        }

                        return innerDeferred.promise();
                    }).bind(this));
                });

                PromiseHelper.chain(promises)
                .then(function(ws) {
                    // anything faile to alert
                    if (failures.length > 0) {
                        deferred.reject(failures.join("\n"));
                    } else {
                        if (tableType !== TableType.WSHidden) {
                            if (resolveAfterAnim) {
                                focusOnLastTable(tables, noAnim)
                                .then(function() {
                                    deferred.resolve();
                                });
                            } else {
                                focusOnLastTable(tables, noAnim);
                                deferred.resolve(tables, ws);
                            }
                        } else {
                            deferred.resolve(tables, ws);
                        }
                        var finalTables = tables.map(function(name) {
                            if (tableRenameMap[name]) {
                                return tableRenameMap[name];
                            } else {
                                return name;
                            }
                        });
                        deferred.resolve(finalTables, ws);
                    }
                })
                .fail(deferred.reject);
            } else if (action === "delete") {
                var delOptions = {};
                if (tableType === TableType.Active) {
                    delOptions.lockedToTemp = true;
                }
                TblManager.deleteTables(tables, tableType, null, null, delOptions)
                .then(function() {
                    XcSupport.memoryCheck(true);
                    deferred.resolve();
                })
                .fail(deferred.reject)
                .always(function() {
                    $tableList.find('.addTableBtn').removeClass('selected');
                });
            }
        })
        .fail(deferred.reject);

        return deferred.promise();

        function doneHandler($li, tableName, hiddenWS) {
            if (hiddenWS) {
                return;
            }
            var $timeLine = $li.closest(".tableGroup");
            if (gMinModeOn) {
                handlerCallback();
            } else {
                $li.addClass("transition").slideUp(150, function() {
                    handlerCallback();
                });
            }

            function handlerCallback() {
                $li.remove();
                if (!$timeLine.find('.tableInfo').length) {
                    $timeLine.remove();
                    if (!$tableList.find('.tableInfo:not(.hiddenWS)').length) {
                        if (!$tableList.closest('#orphanedTableListSection').length) {
                            $("#orphanedTableList-search").hide();
                        }
                    }
                }
                if ($tableList.find('li').length === 0) {
                    $tableList.addClass('empty');
                } else {
                    $tableList.removeClass('empty');
                }
            }
        }

        function failHandler($li, tableName, error) {
            $li.find(".addTableBtn.selected").removeClass("selected");
            failures.push(tableName + ": {" + xcHelper.parseError(error) + "}");
        }
    };

    TableList.reorderTable = function(tableId) {
        // currently just reprinting whole list
        if ($("#activeTableListSection").hasClass("sortedByWS")) {
            TableList.addTables([gTables[tableId]], IsActive.Active);
        }
    };

    function getSelectedTablesAndLis($tablesSelected, tableType, action,
                                     hiddenWS, tableIds) {
        var tables = [];
        var lis = [];
        $tablesSelected.each(function(index, ele) {
            var $li = $(ele);
            if (action === "delete") {
                var tableIdOrName;

                if (tableType === TableType.Orphan) {
                    tableIdOrName = $li.data('tablename');
                } else {
                    tableIdOrName = $li.data('id');
                }

                tables.push(tableIdOrName);
                lis.push($li);
            } else if (action === "add") {
                var tableId = $(ele).data("id");
                var table = gTables[tableId];
                var tableName;
                // no adding back undone tables
                if (table && table.getType() === TableType.Undone) {
                    return;
                }
                if (lockedTables[tableId]) {
                    return;
                }

                if (hiddenWS) {
                    tableId = tableIds[index];
                } else {
                    tableId = $li.data("id");
                }

                table = gTables[tableId];

                if (tableType === TableType.Orphan){
                    tableName = $li.data("tablename");
                } else {
                    if (table == null) {
                        tables = [];
                        return false;
                    }

                    tableName = table.getName();
                }

                tables.push(tableName);
                lis.push($li);
            }
        });

        return {tables: tables, lis: lis};
    }

    // checks number of calls and prompts for new ws if too many found
    function tooManyColAlertHelper(tableNames, tableType, action, destWS) {

        if (tableType === TableType.Orphan && action === "add" && !destWS) {
            var deferred = jQuery.Deferred();
            var worksheet = WSManager.getActiveWS();
            var numWsCols = WSManager.getNumCols(worksheet);
            var numTableCols = 0;
            tableNames.forEach(function(tableName) {
                var tableId = xcHelper.getTableId(tableName);
                if (!gTables[tableId]) {
                    numTableCols++;
                } else {
                    numTableCols += gTables[tableId].getNumCols();
                }
            });
            var totalCols = numWsCols + numTableCols;
            // only show alert if columns are present in ws

            if (numWsCols && totalCols > gMaxColToPull) {
                Alert.show({
                    "title": DSFormTStr.CreateWarn,
                    "msg": SideBarTStr.WSColsMsg,
                    "onCancel": function() {
                        deferred.reject("canceled");
                    },
                    "buttons": [
                        {
                            "name": CommonTxtTstr.Ignore.toUpperCase(),
                            "func": function() {
                                deferred.resolve();
                            }
                        },
                        {
                            "name": WSTStr.NewWS.toUpperCase(),
                            "func": function() {
                                WSManager.addWS(null, null);
                                deferred.resolve("xc-new");
                            },
                            "className": "larger"
                        }
                    ]
                });
            } else {
                deferred.resolve();
            }

            return deferred.promise();
        } else {
            return PromiseHelper.resolve();
        }
    }

    TableList.tablesToHiddenWS = function(wsIds) {
        var $activeList = $('#activeTableListSection');

        for (var i = 0, len = wsIds.length; i < len; i++) {
            var wsId = wsIds[i];
            $activeList.find('.worksheet-' + wsId)
                        .closest('.tableInfo')
                        .addClass('hiddenWS')
                        .attr({
                            'data-toggle': 'tooltip',
                            'data-container': 'body',
                            'data-original-title': WSTStr.WSHidden
                        })
                        .find('.addTableBtn')
                        .removeClass('selected');
            $activeList.find(".tableGroup.ws" + wsId).addClass("hiddenWSGroup");
        }

        $activeList.each(function() {
            var $list = $(this);
            if ($list.find(".tableInfo:not(.hiddenWS)").length === 0) {
                $list.find(".submit").addClass("xc-hidden");
            } else {
                if (!$list.find(".addTableBtn.selected").length) {
                    $list.find(".submit").addClass("xc-hidden");
                }
            }
        });
    };

    TableList.refreshOrphanList = function(prettyPrint) {
        var deferred = jQuery.Deferred();
        focusedListNum = null;

        var $section = $("#orphanedTableListSection");
        // clear the search bar
        searchHelper.clearSearch(function() {
            clearTableListFilter($section);
        });
        // deselect tables
        clearAll($section);

        xcHelper.getBackTableSet()
        .then(function(backTableSet) {
            var tableMap = backTableSet;

            for (var tableId in gTables) {
                var table = gTables[tableId];
                var tableName = table.getName();
                var tableType = table.getType();
                if (tableType === TableType.Active) {
                    delete tableMap[tableName];
                }
            }
            TblManager.setOrphanedList(tableMap);
            xcHelper.showRefreshIcon($('#orphanedTableListSection'));

            if (prettyPrint) {
                setTimeout(function() {
                    generateOrphanList(gOrphanTables);
                    deferred.resolve();
                }, 400);
            } else {
                generateOrphanList(gOrphanTables);
                deferred.resolve();
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    // removes from list, no backend call
    TableList.removeTable = function(tableIdOrName, type, lock) {
        var tableType;
        var $li = $();
        var $listWrap;
        if (type) {
            tableType = type;
        } else {
            var table = gTables[tableIdOrName];
            if (table) {
                tableType = table.getType();
            } else {
                tableType = TableType.Orphan;
            }
        }
        $listWrap = getListWrap(tableType);

        if (tableType === TableType.Orphan) {
            var id = xcHelper.getTableId(tableIdOrName);
            if (id) {
                $li = $listWrap.find('.tableInfo[data-id="' + id + '"]');
            } else {
                $li = $listWrap.find('.tableInfo[data-tablename="' +
                                                    tableIdOrName + '"]');
            }
        } else {
            $li = $listWrap.find('.tableInfo[data-id="' + tableIdOrName + '"]');
        }

        var $timeLine = $li.closest(".tableGroup");
        if (lock) {
            $li.addClass("locked").find(".addTableBtn").removeClass("selected");
        } else {
            $li.remove();
        }

        var $tableList = $listWrap.find('.tableLists');

        if ($timeLine.find('.tableInfo').length === 0) {
            $timeLine.remove();
        }
        if (tableType === TableType.Orphan) {
            if ($tableList.find('li').length === 0) {
                $listWrap.find('.searchbarArea').hide();
            }
        } else if ($tableList.find('ul').length === 0) {
            $listWrap.find('.searchbarArea').hide();
        }

        if ($listWrap.find('li').length === 0) {
            $listWrap.addClass('empty');
        }

        var $submitBtns = $listWrap.find(".submit");
        if ($listWrap.find(".addTableBtn.selected").length === 0) {
            $submitBtns.addClass("xc-hidden");
        } else {
            $submitBtns.removeClass("xc-hidden");
            var $activateBtn = $submitBtns.filter(".active");
            if ($listWrap.find(".undone .addTableBtn.selected").length) {
                $activateBtn.addClass('xc-unavailable');
                xcTooltip.changeText($activateBtn, TooltipTStr.NoActiveUndone);
            } else {
                $activateBtn.removeClass('xc-unavailable');
                xcTooltip.changeText($activateBtn, TooltipTStr.AddToWorksheet);
            }
        }
        focusedListNum = null;
    };

    TableList.makeTableNoDelete = function(tableId) {
        var tableType;
        var $li;
        var $listWrap;

        var table = gTables[tableId];
        if (table) {
            tableType = table.getType();
        } else {
            tableType = TableType.Orphan;
        }

        $listWrap = getListWrap(tableType);
        $li = $listWrap.find('.tableInfo[data-id="' + tableId + '"]');
        if (!$li.find(".lockIcon").length) {
            $li.append('<i class="lockIcon icon xi-lockwithkeyhole"></i>');
        }
    };

    TableList.removeTableNoDelete = function(tableId) {
        var tableType;
        var $li;
        var $listWrap;

        var table = gTables[tableId];
        if (table) {
            tableType = table.getType();
        } else {
            tableType = TableType.Orphan;
        }

        $listWrap = getListWrap(tableType);
        $li = $listWrap.find('.tableInfo[data-id="' + tableId + '"]');
        $li.find(".lockIcon").remove();
    };

    TableList.addToCanceledList = function(tableName) {
        canceledTables[tableName] = true;
        TableList.removeTable(tableName, TableType.Orphan);
    };

    TableList.removeFromCanceledList = function(tableName) {
        delete canceledTables[tableName];
    };

    // affects the display of the activeTableListSection instruction msg
    // pendingCount will have a positive value during TblManager.refreshTables
    // and will hide the instruction msg and will unhide when count returns to 0
    TableList.updatePendingState = function(increaseCount) {
        if (increaseCount) {
            pendingCount++;
        } else {
            pendingCount--;
        }
        var $listWrap = $("#activeTableListSection");
        if (pendingCount > 0) {
            $listWrap.addClass('pending');
        } else {
            $listWrap.removeClass('pending');
        }
    };

    TableList.lockTable = function(tableId) {
        lockedTables[tableId] = true;
        TableList.removeTable(tableId, null, true);
    };

    TableList.unlockTable = function(tableId) {
        var table = gTables[tableId];
        var tableType;
        if (table) {
            tableType = table.getType();
        } else {
            tableType = TableType.Orphan;
        }

        var $listWrap = getListWrap(tableType);
        var $li = $listWrap.find('.tableInfo[data-id="' + tableId + '"]');
        $li.removeClass("locked");
        delete lockedTables[tableId];
    };

    TableList.checkTableInList = function(tableIdOrName, type) {
        // If type === orphaned, then it's name. Else it's id
        var tableType = TableType.Active; // Default
        var $li;
        var $listWrap;
        if (type) {
            tableType = type;
        }
        if (tableType === TableType.Active) {
            $listWrap = $("#activeTableListSection");
            $li = $listWrap.find('.tableInfo[data-id="' + tableIdOrName + '"]');
        } else if (tableType === TableType.Orphan) {
            // if orphan, tableIdOrName is actually tableName
            $listWrap = $('#orphanedTableListSection');
            $li = $listWrap.find('.tableInfo[data-tablename="' +
                                                    tableIdOrName + '"]');
        }

        if (typeof($li) === "object") {
            return ($li.length > 0);
        } else {
            return false;
        }
    };

    TableList.refreshConstantList = function(waitIcon) {
        var deferred = jQuery.Deferred();
        var promise = generateConstList();

        focusedListNum = null;
        clearAll($('#constantsListSection'));

        if (waitIcon) {
            xcHelper.showRefreshIcon($('#constantsListSection'), false, promise);
        }

        promise
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    TableList.addToOrphanList = function(tableName) {
        focusedListNum = null;
        // clear the search bar
        searchHelper.clearSearch(function() {
            clearTableListFilter($("#orphanedTableListSection"));
        });
        if (gOrphanTables.indexOf(tableName) === -1) {
            gOrphanTables.push(tableName);
        }
        var $list = $("#orphanedTablesList");
        var html = getOrphanListLiHtml(tableName);
        var $lis = $list.find("li");
        var $tables = $lis.filter(function() {
            return $(this).data("tablename") === tableName;
        });
        if ($tables.length) {
            return;
        }
        var found = false;
        $($lis.get().reverse()).each(function() {
            var curTableName = $(this).data("tablename");
            if (xcHelper.sortVals(tableName, curTableName) > 0) {
                $(this).after(html);
                found = true;
                return false;
            }
        });
        if (!found) {
            $list.prepend(html);
        }

        $("#orphanedTableList-search").show();
        $("#orphanedTableListSection").removeClass('empty');
    };

    function getListWrap(tableType) {
        var $listWrap;
        if (tableType === TableType.Orphan) {
            $listWrap = $('#orphanedTableListSection');
        } else {
            if (tableType === TableType.Active) {
                $listWrap = $("#activeTableListSection");
            } else if (tableType === TableType.Aggregate) {
                $listWrap = $('#constantsListSection');
            } else {
                $listWrap = $('#orphanedTableListSection');
            }
        }
        return $listWrap;
    }

    function clearAll($section) {
        $section.find(".submit").addClass("xc-hidden")
                .end()
                .find(".addTableBtn").removeClass("selected");
        focusedListNum = null;
    }

    // moves orphaned table from temp list to worksheet
    function addOrphanedTable(tableName, destWS) {
        var deferred = jQuery.Deferred();

        var tableId = xcHelper.getTableId(tableName);
        var newTableCols = [];
        // get worksheet before async call
        var worksheet = WSManager.getActiveWS();

        if (tableId != null && gTables.hasOwnProperty(tableId)) {
            // when meta is in gTables
            if (gTables[tableId].getType() !== TableType.Orphan) {
                throw "Error, table is not orphaned!";
            } else {
                var oldWS = WSManager.getWSFromTable(tableId);
                if (oldWS) {
                    if (destWS) {
                        worksheet = destWS;
                    }
                    WSManager.removeTable(tableId);
                }
            }
            TblManager.refreshTable([tableName], null, [], worksheet, null)
            .then(function() {
                deferred.resolve(worksheet, tableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            renameOrphanIfNeeded()
            .then(function(newTableName) {
                tableName = newTableName;
                newTableCols.push(ColManager.newDATACol());
                worksheet = WSManager.getActiveWS();
                return TblManager.refreshTable([tableName], newTableCols,
                                                [], worksheet, null);
            })
            .then(function() {
                deferred.resolve(worksheet, tableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        function renameOrphanIfNeeded() {
            var innerDeferred = jQuery.Deferred();
            var newTableName;
            if (tableId == null) {
                newTableName = tableName + Authentication.getHashId();

                // Buggy transaction!!!
                XcalarRenameTable(tableName, newTableName, null)
                .then(function() {
                    innerDeferred.resolve(newTableName);
                })
                .fail(innerDeferred.reject);
            } else {
                innerDeferred.resolve(tableName);
            }

            return innerDeferred.promise();
        }
    }

    function getTwoWeeksDate() {
        var res = [];
        var d = new Date();
        var day = d.getDate();
        var date;

        d.setHours(0, 0, 0, 0);

        // date from today to lastweek, all dates' time is 0:00 am
        for (var i = 0; i < 7; i++) {
            date = new Date(d);
            date.setDate(day - i);
            res.push(date);
        }

        // older than one week
        date = new Date(d);
        date.setDate(day - 13);
        res.push(date);

        return res;
    }

    // for active tables only
    function generateTableList(tables, active, options) {
        options = options || {};

        var $listSection = $("#activeTableListSection");
        var $tableList = $("#activeTablesList");
        var sortType;
        if (!options.sortType) {
            sortType = $listSection.data("sort");
        } else {
            sortType = options.sortType;
        }
        // if sorted by WS, we'll just replace the list
        if (sortType === "ws" && !options.hasOwnProperty("position")) {
            options.bulkAdd = true;
            options.noAnimate = true;
            $tableList.empty();
        }

        var sortedTables = sortTables(tables, active, sortType, options);
        var dates = getTwoWeeksDate();
        var p = dates.length - 1;    // the length should be 8

        if (sortedTables.length === 0) {
            $listSection.addClass('empty');
        } else {
            $listSection.removeClass('empty');
        }

        moment.updateLocale('en', {
            calendar: {
                lastDay: '[Yesterday<br/>]LT',
                sameDay: '[Today<br/>]LT',
                nextDay: '[Tomorrow<br/>] LT',
                lastWeek: 'dddd[<br/>]LT',
                sameElse: 'll[<br/>]LT'
            }
        });

        var totalHtml = "";

        for (var i = 0; i < sortedTables.length; i++) {
            var table = sortedTables[i].table;
            var timeStamp = sortedTables[i].time;
            var wsId = sortedTables[i].ws;

            // pointer to a day after at 0:00 am
            while (p >= 0 && (timeStamp >= dates[p].getTime())) {
                --p;
            }

            var dateIndex = p + 1;
            var $divider;

            if (sortType === "date") {
                // when no such date exists
                if ($tableList.find("> li.date" + p).length === 0) {
                    var date = formatDate(dates, dateIndex);
                    var timeLineHTML =
                    '<li class="clearfix tableGroup date' + p + '">' +
                        '<div class="timeStamp">' + date + '</div>' +
                        '<ul class="tableList"></ul>' +
                    '</li>';
                    $tableList.prepend(timeLineHTML);
                }
                $divider = $tableList.find(".date" + p + " .tableList");
            } else if (sortType === "ws") {
                if ($tableList.find("> li.ws" + wsId).length === 0) {
                    var wsName = WSManager.getWSName(wsId);
                    var groupHTML =
                    '<li class="clearfix tableGroup ws' + wsId + '">' +
                        '<div class="timeStamp wsName" >' + xcHelper.escapeHTMLSpecialChar(wsName) + '</div>' +
                        '<ul class="tableList"></ul>' +
                    '</li>';
                    $tableList.prepend(groupHTML);
                }
                $divider = $tableList.find(".ws" + wsId + " .tableList");
            }

            var numCols;
            if (table.tableCols) {
                numCols = table.tableCols.length;
            } else {
                numCols = 0;
            }
            var time;
            var timeTip = xcTimeHelper.getDateTip(timeStamp);
            if (sortType === "date") {
                if (dateIndex >= 7) {
                    time = moment(timeStamp).calendar();
                } else {
                    time = moment(timeStamp).format("h:mm A");
                }
            } else if (sortType === "ws") {
                time = moment(timeStamp).calendar();
            } else {
                time = moment(timeStamp).format("h:mm A M-D-Y");
            }


            var tableName = table.getName();
            var tableId = table.getId();

            wsId = WSManager.getWSFromTable(tableId);
            var wsInfo;

            if (wsId == null) {
                wsInfo = '<div class="worksheetInfo inactive">' +
                            SideBarTStr.NoSheet +
                         '</div>';
            } else {
                wsInfo = '<div class="worksheetInfo worksheet-' + wsId + '">' +
                            xcHelper.escapeHTMLSpecialChar(WSManager.getWSName(wsId)) +
                        '</div>';
            }

            var lockIcon = "";
            if (table.isNoDelete()) {
                lockIcon = '<i class="lockIcon icon xi-lockwithkeyhole"></i>';
            }

            var html =
                '<li class="clearfix tableInfo" ' +
                    'data-id="' + tableId + '">' +
                    '<div class="timeStampWrap">' +
                        '<div class="timeStamp">' +
                            '<span class="time" ' + timeTip + '>' + time +
                            '</span>' +
                        '</div>' +
                        wsInfo +
                    '</div>' +
                    '<div class="tableListBox xc-expand-list">' +
                        '<span class="expand">' +
                            '<i class="icon xi-arrow-down fa-7"></i>' +
                        '</span>' +
                        '<span class="addTableBtn" data-toggle="tooltip" ' +
                        ' data-container="body"' +
                        ' data-original-title="' + CommonTxtTstr.ClickSelect +
                        '">' +
                            '<i class="icon xi_table fa-18"></i>' +
                            '<i class="icon xi-ckbox-empty fa-18"></i>' +
                            '<i class="icon xi-tick fa-11"></i>' +
                        '</span>' +
                        '<span class="tableName textOverflowOneLine" ' +
                        'data-original-title="' +
                            tableName + '">' +
                            tableName +
                        '</span>' +
                        '<span>(</span>' +
                        '<span class="numCols" data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'title="' + CommonTxtTstr.NumCol + '">' +
                            (numCols - 1) + // skip DATA col
                        '</span>' +
                        '<span>)</span>' +
                    '</div>' +
                    generateColumnList(table.tableCols, numCols) +
                    lockIcon +
                '</li>';
            totalHtml += html;

            if (sortType === "date" || sortType === "ws") {
                if (gMinModeOn || options.noAnimate) {
                    if (options.hasOwnProperty('position') &&
                        options.position > 0) {
                        $divider.children().eq(options.position - 1)
                                               .after(html);
                    } else {
                        $divider.prepend(html);
                    }

                } else {
                    var $li = $(html).hide();

                    $li.addClass("transition");

                    if (options.hasOwnProperty('position') &&
                        options.position > 0) {
                        $divider.children().eq(options.position - 1)
                                               .after($li);
                    } else {
                        $li.prependTo($divider);
                    }

                    $li.slideDown(150, function() {
                        $li.removeClass("transition");
                    });
                }
            }
        }
        if (sortType === "name") {
            if (options.bulkAdd) {
                $tableList.html(totalHtml);
            } else {
                // find where to append table to keep in name order
                var tableName = tables[0].getName();
                var $tableNames = $tableList.find(".tableName");
                if ($tableNames.length === 0) {
                    $tableList.append(totalHtml);
                } else {
                    var prependIndex;
                    $tableNames.each(function(i) {
                        if (xcHelper.sortVals($(this).text(), tableName) > -1) {
                            prependIndex = i;
                            return false;
                        }
                    });

                    if (prependIndex == null) {
                        $tableList.append(totalHtml);
                    } else {
                        $tableList.find('.tableInfo').eq(prependIndex)
                                  .before(totalHtml);
                    }
                }
            }
        }

        xcTimeHelper.resetMoment();
        // set hiddenWS class to tables belonging to hidden worksheets
        var hiddenWS = WSManager.getHiddenWSList();
        TableList.tablesToHiddenWS(hiddenWS);
    }

    function generateOrphanList(tables) {
        tables.sort(xcHelper.sortVals);
        var numTables = tables.length;
        var html = "";
        for (var i = 0; i < tables.length; i++) {
            var tableName = tables[i];
            html += getOrphanListLiHtml(tableName);
            if (canceledTables[tableName]) { // do not show canceled tables
                numTables--;
            }
        }

        $("#orphanedTablesList").html(html);
        if (numTables > 0) {
            $("#orphanedTableList-search").show();
            $("#orphanedTableListSection").removeClass('empty');
        } else {
            $("#orphanedTableList-search").hide();
            $("#orphanedTableListSection").addClass('empty');
        }
    }

    function getOrphanListLiHtml(tableName) {
        var html = "";
        if (canceledTables[tableName]) { // do not show canceled tables
            return html;
        }
        var liClass = "";
        var tableId = xcHelper.getTableId(tableName);
        var tableNameTip = tableName;
        if (gTables[tableId] &&
            gTables[tableId].getType() === TableType.Undone) {
            liClass += TableType.Undone;
            tableNameTip = xcHelper.replaceMsg(TooltipTStr.UndoTableTip, {
                "name": tableName
            });
        }
        if (lockedTables[tableId]) {
            liClass += " locked";
        }
        var lockIcon = "";
        if (gTables[tableId] && gTables[tableId].isNoDelete()) {
            lockIcon = '<i class="lockIcon icon xi-lockwithkeyhole"></i>';
        }
        html += '<li class="clearfix tableInfo ' + liClass + '" ' +
                'data-id="' + tableId + '"' +
                'data-tablename="' + tableName + '">' +
                    '<div class="tableListBox xc-expand-list">' +
                        '<span class="addTableBtn" data-toggle="tooltip" ' +
                    ' data-container="body"' +
                    ' data-original-title="' + CommonTxtTstr.ClickSelect +
                    '">' +
                            '<i class="icon xi_table fa-18"></i>' +
                            '<i class="icon xi-ckbox-empty fa-18"></i>' +
                            '<i class="icon xi-tick fa-11"></i>' +
                        '</span>' +
                        '<span data-original-title="' + tableNameTip + '" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" data-container="body" ' +
                            'class="tableName textOverflow">' +
                            tableName +
                        '</span>' +
                    '</div>' +
                    lockIcon +
                 '</li>';
        return html;
    }

    function generateConstList(firstTime) {
        var deferred = jQuery.Deferred();
        var frontConsts = Aggregates.getAggs();
        var backConstsList = [];
        var allConsts = [];
        var aggConst;
        var backConstsMap = {};

        XcalarGetConstants('*')
        .then(function(backConsts) {
            var promises = [];

            for (var i = 0; i < backConsts.length; i++) {
                aggConst = backConsts[i];
                if (!frontConsts[aggConst.name]) {
                    if (firstTime) {
                        aggConst.backColName = null;
                        var aggName = aggConst.name;
                        if (aggName[0] !== gAggVarPrefix) {
                            aggName = gAggVarPrefix + aggName;
                        }
                        aggConst.dagName = aggConst.name;
                        aggConst.aggName = aggName;
                        aggConst.op = null;
                        aggConst.tableId = null;
                        aggConst.value = null;
                        backConstsList.push(aggConst);
                        Aggregates.addAgg(aggConst, true);
                    } else {
                        promises.push(XcalarGetDag(aggConst.name));
                    }
                }
                backConstsMap[aggConst.name] = aggConst;
            }

            // remove any constants that the front end has but the backend
            // doesn't
            for (var name in frontConsts) {
                if (!backConstsMap.hasOwnProperty(name)) {
                    Aggregates.removeAgg(name);
                }
            }

            return PromiseHelper.when.apply(null, promises);
        })
        .then(function() {
            var rets = arguments;
            var node;
            if (!firstTime && rets[0] != null) {
                var tempAggs = Aggregates.getTempAggs();
                for (var i = 0; i < rets.length; i++) {
                    node = rets[i].node[0];
                    aggConst = backConstsMap[node.name.name];
                    aggConst.dagName = node.name.name;
                    aggConst.aggName = node.name.name;
                    aggConst.backColName = null;
                    aggConst.op = node.input.aggregateInput.eval[0].evalString;
                    aggConst.tableName = node.input.aggregateInput.source;
                    aggConst.value = null;
                    aggConst.backOnly = true;
                    backConstsList.push(aggConst);
                    if (!tempAggs[node.name.name]) {
                        Aggregates.addAgg(aggConst, true);
                    }
                }
            }

            backConstsList.sort(sortConst);

            for (var constantName in frontConsts) {
                allConsts.push(frontConsts[constantName]);
            }
            allConsts.sort(sortConst);
            allConsts = allConsts.concat(backConstsList);

            var numConsts = allConsts.length;
            var html = "";
            for (var i = 0; i < numConsts; i++) {
                aggConst = allConsts[i];
                var name = aggConst.aggName;
                var dagName = aggConst.dagName;
                var tableName;
                var op;
                var value;
                if (aggConst.op) {
                    if (aggConst.backOnly) {
                        op = aggConst.op;
                    } else {
                        op = aggConst.op + "(" + aggConst.backColName + ")";
                    }
                } else {
                    op = CommonTxtTstr.NA;
                }
                if (aggConst.tableId && gTables[aggConst.tableId]) {
                    tableName = gTables[aggConst.tableId].tableName;
                } else if (aggConst.tableName) {
                    tableName = aggConst.tableName;
                } else {
                    tableName = CommonTxtTstr.NA;
                }
                if (aggConst.value != null) {
                    value = xcHelper.numToStr(aggConst.value);
                } else {
                    value = CommonTxtTstr.NA;
                }
                html +=
                '<li class="clearfix tableInfo" ' +
                    'data-id="' + dagName + '">' +
                    '<div class="constInfoWrap" data-toggle="tooltip" ' +
                    'data-container="body" title="' + op + '</br>' +
                        tableName + '">' +
                        '<div class="op">' +
                            op +
                        '</div>' +
                        '<div class="srcName">' + tableName + '</div>' +
                    '</div>' +
                    '<div class="tableListBox xc-expand-list">' +
                        '<span class="addTableBtn" data-toggle="tooltip" ' +
                        ' data-container="body"' +
                        ' data-original-title="' + CommonTxtTstr.ClickSelect +
                        '"' +
                            '<i class="icon xi-aggregate fa-18"></i>' +
                            '<i class="icon xi-ckbox-empty fa-18"></i>' +
                            '<i class="icon xi-tick fa-11"></i>' +
                        '</span>' +
                        '<span class="constName textOverflowOneLine" ' +
                            'data-original-title="' + name + '">' +
                            name +
                        '</span>' +
                        '<span class="value" data-toggle="tooltip" ' +
                        'data-container="body" title="' +
                            CommonTxtTstr.Value + ': ' + value + '">(' +
                            value +
                        ')</span>' +
                    '</div>' +
                '</li>';
            }

            if (numConsts === 0) {
                $('#constantsListSection').addClass('empty');
            } else {
                $('#constantsListSection').removeClass('empty');
            }

            $("#constantList").html(html);
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });

        return (deferred.promise());
    }

    function generateColumnList(tableCols, numCols) {
        var html = '<ul class="columnList">';
        for (var i = 0, no = 1; i < numCols; i++, no++) {
            var progCol = tableCols[i];
            if (progCol.isDATACol()) {
                continue; // skip DATA col
            }
            var typeClass = "xi-" + progCol.getType();

            html += '<li class="column">' +
                        '<div class="iconWrap">' +
                            '<i class="icon center fa-16 ' + typeClass + '">' +
                            '</i>' +
                        '</div>' +
                        '<span class="text">' +
                            no + ". " + xcHelper.escapeHTMLSpecialChar(
                                                progCol.getFrontColName(true)) +
                        '</span>' +
                    '</li>';
        }

        html += '</ul>';

        return html;
    }

    // used if table list is sorted by last updated
    function formatDate(dates, dateIndex) {
        var date = "";
        var d;

        switch (dateIndex) {
            case 0:
                d = dates[dateIndex];
                date = DaysTStr.Today;
                break;
            case 1:
                d = dates[dateIndex];
                date = DaysTStr.Yesterday + " " + moment(d).format("L");
                break;
            // Other days in the week
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
                d = dates[dateIndex];
                date = days[d.getDay()] + " " + moment(d).format("L");
                break;
            case 7:
                date = DaysTStr.LastWeek;
                break;
            case 8:
                date = DaysTStr.Older;
                break;
            default:
                break;
        }
        return date;
    }

    function sortConst(a, b) {
        var order = ColumnSortOrder.ascending;
        return xcHelper.sortVals(a.dagName, b.dagName, order);
    }

    function deleteConstants() {
        var deferred = jQuery.Deferred();
        var constNames = [];
        var constName;
        var $constSection = $('#constantsListSection');
        $constSection.find('.addTableBtn.selected').each(function() {
            constName = $(this).closest('.tableInfo').data('id');
            constNames.push(constName);
        });
        var constsToRemove = constNames;

        Aggregates.deleteAggs(constNames)
        .fail(function(successConsts) {
            constsToRemove = successConsts;
        })
        .always(function() {
            for (var i = 0; i < constsToRemove.length; i++) {
                $constSection.find('.tableInfo[data-id="' +
                                        constsToRemove[i] + '"]').remove();
            }
            var $submitBtns = $constSection.find(".submit");

            if ($constSection.find(".addTableBtn.selected").length === 0) {
                $submitBtns.addClass("xc-hidden");
            } else {
                $submitBtns.removeClass("xc-hidden");
            }

            if ($constSection.find('li').length === 0) {
                $constSection.addClass('empty');
            } else {
                $constSection.removeClass('empty');
            }
            deferred.resolve();
        });

        return deferred.promise();
    }

    function filterTableList(keyWord) {
        var $section = $("#orphanedTableListSection");
        var $lis = $section.find(".tableInfo");
        // $lis.find('.highlightedText').contents().unwrap();
        $lis.each(function() {
            var $li = $(this);
            if ($li.hasClass("highlighted")) {
                var $span = $li.find(".tableName");
                // Not use $lis.find('.highlightedText').contents().unwrap()
                // because it change <span>"a"</span>"b" to "ab" instead of "ab"
                $span.html($span.text());
                $li.removeClass("highlighted");
            } else if ($li.hasClass('nonMatch')) {
                // hidden lis that are filtered out
                $li.removeClass('nonMatch xc-hidden');
            }
        });

        clearAll($section);

        if (keyWord == null || keyWord === "") {
            searchHelper.clearSearch(function() {
                searchHelper.$arrows.hide();
            });
            $section.find('input').css("padding-right", 30);
            return;
        } else {
            keyword = xcHelper.escapeRegExp(keyWord);
            var regex = new RegExp(keyword, "gi");
            $lis.each(function() {
                var $li = $(this);
                var tableName = $li.data("tablename");
                if (regex.test(tableName)) {
                    $li.addClass("highlighted");
                    var $span = $li.find(".tableName");
                    var text = $span.text();
                    text = text.replace(regex, function (match) {
                        return ('<span class="highlightedText">' + match +
                                '</span>');
                    });

                    $span.html(text);
                } else {
                    // we will hide any lis that do not match
                    $li.addClass('nonMatch xc-hidden');
                }
            });
            searchHelper.updateResults($section.find('.highlightedText'));
            var counterWidth = $section.find('.counter').width();
            $section.find('input').css("padding-right", counterWidth + 30);

            if (searchHelper.numMatches !== 0) {
                searchHelper.scrollMatchIntoView(searchHelper.$matches.eq(0));
                searchHelper.$arrows.show();
            } else {
                searchHelper.$arrows.hide();
            }
        }
    }

    function deleteFromList($section, tableType) {
        $section.addClass('locked');

        var promise;
        if (tableType === "constant") {
            promise = deleteConstants();
        } else {
            promise = TableList.tableBulkAction("delete", tableType);
        }

        xcHelper.showRefreshIcon($section, true, promise);

        promise
        .always(function() {
            $section.removeClass('locked');
        });
    }

    function clearTableListFilter($section) {
        $section.find(".searchbarArea input").val("");
        filterTableList(null);
    }

    // default by name
    function sortTables(tables, active, type, options) {
        var sortedTables = [];

        if (type !== "ws") {
            tables.forEach(function(table) {
                sortedTables.push({
                    table: table,
                    time: table.getTimeStamp(),
                    ws: WSManager.getWSFromTable(table.tableId)
                });
            });
        }

        var sortFn;
        if (type === "date") {
            // sort by time, from the oldest to newset
            sortFn = function(a, b) {
                return (a.time - b.time);
            };
        } else if (type === "ws") {
            if (tables.length > 1 || options.bulkAdd) {
                // sheet tables will get appended in reverse
                var sheets = WSManager.getWorksheets();
                var sheetOrder = WSManager.getWSList();
                var tableType ="tables";
                for (var i = sheetOrder.length - 1; i >= 0; i--) {
                    var sheet = sheets[sheetOrder[i]];
                    var sheetTableIds = sheet[tableType];
                    for (var j = sheetTableIds.length - 1; j >= 0; j--) {
                        var table = gTables[sheetTableIds[j]];
                        sortedTables.push({
                            table: table,
                            time: table.getTimeStamp(),
                            ws: sheetOrder[i]
                        });
                    }
                }

                WSManager.getHiddenWSList().forEach(function(wsId) {
                    var ws = WSManager.getWSById(wsId);
                    var wsTables = ws.tempHiddenTables;
                    for (var j = 0; j < wsTables.length; j++) {
                        var table = gTables[wsTables[j]];
                        sortedTables.push({
                            table: table,
                            time: table.getTimeStamp(),
                            ws: wsId
                        });
                    }
                });
            } else {
                tables.forEach(function(table) {
                    sortedTables.push({
                        table: table,
                        time: table.getTimeStamp(),
                        ws: WSManager.getWSFromTable(table.tableId)
                    });
                });
            }
        } else {
            sortFn = function(a, b) {
                return xcHelper.sortVals(a.table.getName(), b.table.getName());
            };
        }
        sortedTables.sort(sortFn);

        return sortedTables;
    }

    function focusOnTableColumn($listCol) {
        var colNum = $listCol.index();
        var tableId = $listCol.closest('.tableInfo').data('id');
        var tableCols = gTables[tableId].getAllCols();

        // if dataCol is found before colNum, increment colNum by 1 and exit
        for (var i = 0; i <= colNum; i++) {
            if (tableCols[i].isDATACol()) {
                colNum++;
                break;
            }
        }
        colNum = colNum + 1;

        var wsId = WSManager.getWSFromTable(tableId);
        $('#worksheetTab-' + wsId).trigger(fakeEvent.mousedown);
        var animation;

        if (gMinModeOn) {
            animation = false;
        } else {
            animation = true;
        }


        xcHelper.centerFocusedColumn(tableId, colNum, animation);
    }

    function focusOnLastTable(tableNames, noAnim) {

        if (!$("#workspaceTab").hasClass("active")) {
            $("#workspaceTab").click();
        }

        var tableIsInActiveWS = true;
        if (tableNames) {
            tableIsInActiveWS = checkIfTablesInActiveWS(tableNames);
        }
        if (tableIsInActiveWS) {
            var $lastTable = $('.xcTableWrap:not(.inActive)').last();
            if ($lastTable.length > 0) {
                var deferred = jQuery.Deferred();
                xcHelper.centerFocusedTable($lastTable.data("id"), !noAnim)
                .then(function() {
                    deferred.resolve();
                });
                return deferred.promise();
            }
        }
        return PromiseHelper.resolve();
    }

    function checkIfTablesInActiveWS(tableNames) {
        var tableIsInActiveWS = false;
        var numTables = tableNames.length;
        var tableId;
        var tablesWs;
        var activeWS = WSManager.getActiveWS();

        for (var i = 0; i < numTables; i++) {
            tableId = xcHelper.getTableId(tableNames[i]);
            tablesWs = WSManager.getWSFromTable(tableId);
            if (tablesWs === activeWS) {
                tableIsInActiveWS = true;
                break;
            }
        }
        return (tableIsInActiveWS);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        TableList.__testOnly__ = {};
        TableList.__testOnly__.tooManyColAlertHelper = tooManyColAlertHelper;

    }
    /* End Of Unit Test Only */

    return (TableList);
}(jQuery, {}));
