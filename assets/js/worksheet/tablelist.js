window.TableList = (function($, TableList) {
    var searchHelper;
    var focusedListNum;
    var pendingCount = 0; // number of pending refreshTable calls
    var canceledTables = {}; // stores tables that are canceled and should not
                            // appear in the orphaned list
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
        $("#activeTableListSection").on("click", ".tableListBox .tableName",
        function() {
            if ($(this).closest('.hiddenWS').length) {
                return;
            }
            var tableId = $(this).closest('.tableInfo').data("id");
            xcHelper.centerFocusedTable(tableId, true);
            // stop propogation
            return false;
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
            }
            focusedListNum = curListNum;
            // stop propogation
            return false;
        });

        $tableListSections.on("click", ".selectAll", function() {
            var $section = $(this).closest(".tableListSection");
            var $btn = $section.find(".tableInfo:not(.hiddenWS) " +
                                ".addTableBtn:visible").addClass("selected");
            if ($btn.length > 0) {
                $section.find(".submit").removeClass("xc-hidden");
            }
            focusedListNum = null;
        });

        $tableListSections.on("click", ".clearAll", function() {
            clearAll($(this).closest(".tableListSection"));
        });

        $("#orphanedTableListSection .refresh").click(function() {
            TableList.refreshOrphanList(true);
        });

        $("#constantsListSection .refresh").click(function() {
            TableList.refreshConstantList(true);
        });

        $tableListSections.on("mouseenter", ".tableName", function(){
            xcTooltip.auto(this);
        });

        $tableListSections.on("mouseenter", ".constName", function(){
            xcTooltip.auto(this);
        });

        $tableListSections.on("click", ".submit.archive", function() {
            var tableIds = [];
            $("#activeTableListSection").find(".addTableBtn.selected")
            .each(function() {
                tableIds.push($(this).closest('.tableInfo').data("id"));
            });
            if (tableIds.length) {
                TblManager.archiveTables(tableIds);
            }
            focusedListNum = null;
        });

        $tableListSections.on("click", ".submit.active", function() {
            var $section = $(this).closest(".tableListSection");
            if ($section.is("#archivedTableListSection")) {
                activeTableAlert(TableType.Archived);
            } else if ($section.is("#orphanedTableListSection")) {
                TableList.activeTables(TableType.Orphan);
                searchHelper.clearSearch(function() {
                    clearTableListFilter($("#orphanedTableListSection"), null);
                });
            }
            focusedListNum = null;
        });

        $tableListSections.on("click", ".submit.delete", function() {
            var $section = $(this).closest(".tableListSection");
            var tableType;
            var title = TblTStr.Del;
            var msg = SideBarTStr.DelTablesMsg;
            if ($section.is("#archivedTableListSection")) {
                tableType = TableType.Archived;
            } else if ($section.is("#orphanedTableListSection")) {
                tableType = TableType.Orphan;
            } else if ($section.is("#constantsListSection")) {
                title = SideBarTStr.DropConsts;
                msg = SideBarTStr.DropConstsMsg;
                tableType = "constant";
            }

            Alert.show({
                "title": title,
                "msg": msg,
                "onConfirm": function() {
                    deleteFromList($section, tableType);
                }
            });
            focusedListNum = null;
        });

        $tableListSections.on("click", ".sortOption", function() {
            var sortByName = $(this).hasClass("sortName");
            var $section = $(this).closest(".tableListSection");
            if (sortByName) {
                if ($section.hasClass("sortedByName")) {
                    return;
                } else {
                    $section.addClass("sortedByName").removeClass("sortedByDate");
                }
            } else { // sort by date
                if ($section.hasClass("sortedByDate")) {
                    return;
                } else {
                    $section.addClass("sortedByDate").removeClass("sortedByName");
                }
            }
            
            var isActive = false;
            if ($section.is("#activeTableListSection")) {
                isActive = true;
            }

            $section.find(".tableLists").empty();

            var tables = getAllTables(isActive);
            generateTableLists(tables, isActive, {noAnimate: true, sortByName: sortByName, bulkAdd: true});
        });

        // XXX make this public in case we need to reuse elsewhere
        function getAllTables(isActive) {
            var wsheets = WSManager.getWSList();
            var tables = [];
            var wsTables;
            for (var i = 0; i < wsheets.length; i++) {
                var ws = WSManager.getWSById(wsheets[i]);
                if (isActive) {
                    wsTables = ws.tables;
                } else {
                    wsTables = ws.archivedTables;
                }
                for (var j = 0; j < wsTables.length; j++) {
                    tables.push(gTables[wsTables[j]]);
                }
            }
            var wsheets = WSManager.getHiddenWSList();
            var wsTables;
            for (var i = 0; i < wsheets.length; i++) {
                var ws = WSManager.getWSById(wsheets[i]);
                if (isActive) {
                    wsTables = ws.tempHiddenTables;
                } else {
                    wsTables = ws.archivedTables;
                }
                for (var j = 0; j < wsTables.length; j++) {
                    tables.push(gTables[wsTables[j]]);
                }
            }


            return tables;
        }

        $("#activeTablesList").on("click", ".column", function() {
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
            }
        });

        searchHelper.setup();
        searchHelper.$arrows.hide();

        $("#orphanedTableList-search").on("input", "input", function() {
            var keyWord = $(this).val();
            filterTableList($("#orphanedTableListSection"), keyWord);
        });

        $("#orphanedTableList-search").on("click", ".clear", function() {
            searchHelper.clearSearch(function() {
                clearTableListFilter($("#orphanedTableListSection"), null);
                searchHelper.$arrows.hide();
            });
        });
    };

    TableList.initialize = function() {
        var activeTables = [];
        var archivedTables = [];

        for (var tableId in gTables) {
            var table = gTables[tableId];
            var tableType = table.getType();
            if (tableType === TableType.Orphan ||
                tableType === TableType.Trash ||
                tableType === TableType.Undone) {
                continue;
            }

            if (tableType === TableType.Active) {
                activeTables.push(table);
            } else if (tableType === TableType.Archived) {
                archivedTables.push(table);
            }
        }

        TableList.addTables(activeTables, IsActive.Active, {bulkAdd: true});
        TableList.addTables(archivedTables, IsActive.Inactive, {bulkAdd: true});

        generateOrphanList(gOrphanTables);

        return generateConstList();
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
        generateTableLists(tables, active, options);
    };

    // move table to inactive list
    TableList.moveTable = function(tableId) {
        var $activeTableListSection = $('#activeTableListSection');
        var $tableList = $activeTableListSection.find('.tableInfo[data-id="' +
                                        tableId + '"]');
        var $timeLine = $tableList.closest(".timeLine");
        var table = gTables[tableId];

        TableList.addTables([table], IsActive.Inactive);

        $tableList.removeClass("active")
                  .find(".columnList")
                  .slideUp(0);
        if (gMinModeOn) {
            $tableList.remove();
            if ($timeLine.find(".tableInfo").length === 0) {
                $timeLine.remove();
            }
            if ($activeTableListSection.find('li').length === 0) {
                $activeTableListSection.addClass('empty');
            }
        } else {
            $tableList.addClass("transition").slideUp(150, function() {
                $tableList.remove();
                // clear time line & select boxes
                if ($timeLine.find(".tableInfo").length === 0) {
                    $timeLine.remove();
                }
                if ($activeTableListSection.find('li').length === 0) {
                    $activeTableListSection.addClass('empty');
                }
            });
        }
        

        $activeTableListSection.find(".submit").addClass("xc-hidden")
                        .end()
                        .find(".addTableBtn").removeClass("selected");
        focusedListNum = null;
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

    TableList.activeTables = function(tableType, noSheetTables, wsToSent) {
        var deferred = jQuery.Deferred();
        var sql = {
            "operation": SQLOps.ActiveTables,
            "tableType": tableType
        };

        if (wsToSent != null) {
            WSManager.addNoSheetTables(noSheetTables, wsToSent);

            sql.noSheetTables = noSheetTables;
            sql.wsToSent = wsToSent;
        }

        TableList.tableBulkAction("add", tableType)
        .then(function(tableNames) {
            sql.tableNames = tableNames;
            SQL.add(TblTStr.Active, sql);

            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(TblTStr.ActiveFail, error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    TableList.tableBulkAction = function(action, tableType, wsId) {
        var deferred = jQuery.Deferred();
        var validAction = ["add", "delete"];

        // validation check
        xcAssert(validAction.indexOf(action) >= 0);
        focusedListNum = null;
        var $tableList;
        var hiddenWS = false;

        if (tableType === TableType.Archived) {
            $tableList = $('#archivedTableListSection');
        } else if (tableType === TableType.WSHidden) {
            $tableList = $('#activeTablesList');
            hiddenWS = true;
        } else if (tableType === TableType.Orphan) {
            $tableList = $('#orphanedTableListSection');
        }

        var $tablesSelected;
        var tableIds;
        if (hiddenWS) {
            $tablesSelected = $();
            tableIds = WSManager.getWorksheets()[wsId].tables;
            $tablesSelected = $tableList.find(".worksheet-" + wsId)
                                        .closest(".tableInfo");
            $('#archivedTableListSection').find('.worksheet-' + wsId)
                                   .closest('.tableInfo')
                                   .removeAttr('data-toggle data-container ' +
                                               'title data-original-title')
                                   .removeClass('hiddenWS');
        } else {
            $tablesSelected = $tableList.find(".addTableBtn.selected")
                                        .closest(".tableInfo");
        }

        var promises = [];
        var failures = [];
        var tables = [];

        $tableList.find(".submit").addClass("xc-hidden");

        $tablesSelected.each(function(index, ele) {
            if (action === "delete") {
                var tableIdOrName;

                if (tableType === TableType.Orphan) {
                    tableIdOrName = $(ele).data('tablename');
                } else {
                    tableIdOrName = $(ele).data('id');
                }

                tables.push(tableIdOrName);
            } else if (action === "add") {
                promises.push((function() {
                    var innerDeferred = jQuery.Deferred();

                    var $li = $(ele);
                    var tableId;
                    if (hiddenWS) {
                        tableId = tableIds[index];
                    } else {
                        tableId = $li.data("id");
                    }

                    var table = gTables[tableId];
                    var tableName;

                    if (tableType === TableType.Orphan){
                        tableName = $li.data("tablename");
                    } else {
                        if (table == null) {
                            innerDeferred.reject("Error: do not find the table");
                            return innerDeferred.promise();
                        }

                        tableName = table.getName();
                    }

                    tables.push(tableName);

                    if (tableType === TableType.Orphan) {
                        addOrphanedTable(tableName, wsId)
                        .then(function(){
                            doneHandler($li, tableName);
                            var tableIndex = gOrphanTables.indexOf(tableName);
                            gOrphanTables.splice(tableIndex, 1);
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            failHandler($li, tableName, error);
                            innerDeferred.resolve(error);
                        });
                    } else {
                        table.beActive();
                        table.updateTimeStamp();

                        TblManager.refreshTable([tableName], null, [], null)
                        .then(function() {
                            doneHandler($li, tableName, hiddenWS);
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            failHandler($li, tableName, error);
                            innerDeferred.resolve(error);
                        });
                    }

                    return innerDeferred.promise();

                }).bind(this));
            }
        });

        if (action === "add") {
            PromiseHelper.chain(promises)
            .then(function() {
                // anything faile to alert
                if (failures.length > 0) {
                    deferred.reject(failures.join("\n"));
                } else {
                    if (tableType !== TableType.WSHidden) {
                        focusOnLastTable(tables);
                    }
                    deferred.resolve(tables);
                }
            });
        } else if (action === "delete") {
            TblManager.deleteTables(tables, tableType)
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                $tableList.find('.addTableBtn').removeClass('selected');
            });
        }

        return deferred.promise();

        function doneHandler($li) {
            var $timeLine = $li.closest(".timeLine");
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
            failures.push(tableName + ": {" + error.error + "}");
        }
    };

    TableList.tablesToHiddenWS = function(wsIds) {
        var $activeList = $('#activeTableListSection');
        var $inactiveList = $('#archivedTableListSection');
        var $bothLists = $activeList.add($inactiveList);

        for (var i = 0, len = wsIds.length; i < len; i++) {
            var wsId = wsIds[i];
            $bothLists.find('.worksheet-' + wsId)
                        .closest('.tableInfo')
                        .addClass('hiddenWS')
                        .attr({
                            'data-toggle': 'tooltip',
                            'data-container': 'body',
                            'data-original-title': WSTStr.WSHidden
                        })
                        .find('.addTableBtn')
                        .removeClass('selected');
        }

        $bothLists.each(function() {
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
                if (tableType !== TableType.Orphan &&
                    tableType !== TableType.Trash &&
                    tableMap.hasOwnProperty(tableName))
                {
                    delete tableMap[tableName];
                }
            }
            setupOrphanedList(tableMap);
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
    TableList.removeTable = function(tableIdOrName, type) {
        var tableType;
        var $li = $();
        var $listWrap;
        if (type) {
            tableType = type;
        } else {
            var table = gTables[tableIdOrName];
            if (!table) {
                tableType = TableType.Orphan;
            } else {
                tableType = table.getType();
            }
        }

        if (tableType === TableType.Active) {
            $listWrap = $("#activeTableListSection");
            $li = $listWrap.find('.tableInfo[data-id="' + tableIdOrName + '"]');
        } else if (tableType === TableType.Orphan) {
            // if orphan, tableIdOrName is actually tableName
            $listWrap = $('#orphanedTableListSection');
            $li = $listWrap.find('.tableInfo[data-tablename="' +
                                                    tableIdOrName + '"]');
        } else if (tableType === TableType.Aggregate) {
            $listWrap = $('#constantsListSection');
            $li = $listWrap.find('.tableInfo[data-id="' + tableIdOrName + '"]');
        } else {
            $listWrap = $('#archivedTableListSection');
            $li = $listWrap.find('.tableInfo[data-id="' + tableIdOrName + '"]');
        }

        var $timeLine = $li.closest(".timeLine");
        $li.remove();
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
        }
        focusedListNum = null;
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

    TableList.checkTableInList = function(tableIdOrName, type) {
        // If type === orphaned, then it's name. Else it's id
        var tableType = TableType.Active; // Default
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
        } else {
            $listWrap = $('#archivedTableListSection');
            $li = $listWrap.find('.tableInfo[data-id="' + tableIdOrName + '"]');
        }

        if (typeof($li) === "object") {
            return ($li.length > 0);
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

    function clearAll($section) {
        $section.find(".submit").addClass("xc-hidden")
                .end()
                .find(".addTableBtn").removeClass("selected");
        focusedListNum = null;
    }

    function addOrphanedTable(tableName, wsId) {
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
                    worksheet = oldWS;
                    WSManager.removeTable(tableId);
                } else if (wsId) {
                    worksheet = wsId;
                }
            }

            TblManager.refreshTable([tableName], null, [], worksheet, null)
            .then(function() {
                deferred.resolve(tableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            renameOrphanIfNeeded()
            .then(function(newTableName) {
                tableName = newTableName;
                newTableCols.push(ColManager.newDATACol());

                return TblManager.refreshTable([tableName], newTableCols,
                                                [], worksheet, null);
            })
            .then(function() {
                deferred.resolve(tableName);
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


    // for active and archived tables only
    function generateTableLists(tables, active, options) {
        options = options || {};

        var $listSection = (active === true) ? $("#activeTableListSection") :
                                               $("#archivedTableListSection");
        var $tableList = (active === true) ? $("#activeTablesList") :
                                             $("#inactiveTablesList");

        if ($listSection.hasClass('sortedByName')) {
            options.sortByName = true;
        }

        var sortedTables = sortTables(tables, !options.sortByName);
        var dates = getTwoWeeksDate();
        var p = dates.length - 1;    // the length should be 8

        if (sortedTables.length === 0) {
            $listSection.addClass('empty');
        } else {
            $listSection.removeClass('empty');
        }

        var totalHtml = "";
        for (var i = 0; i < sortedTables.length; i++) {
            var table     = sortedTables[i][0];
            var timeStamp = sortedTables[i][1];

            // pointer to a day after at 0:00 am
            while (p >= 0 && (timeStamp >= dates[p].getTime())) {
                --p;
            }

            var dateIndex = p + 1;

            if (!options.sortByName) {
                // when no such date exists
                if ($tableList.find("> li.date" + p).length === 0) {
                    var date = formatDate(dates, dateIndex);
                    var timeLineHTML =
                    '<li class="clearfix timeLine date' + p + '">' +
                        '<div class="timeStamp">' + date + '</div>' +
                        '<ul class="tableList"></ul>' +
                    '</li>';
                    $tableList.prepend(timeLineHTML);
                }
                var $dateDivider = $tableList.find(".date" + p + " .tableList");
            }

            var numCols;
            if (table.tableCols) {
                numCols = table.tableCols.length;
            } else {
                numCols = 0;
            }
            var time;

            if (dateIndex >= 7) {
                time = xcHelper.getDate("-", null, timeStamp);
            } else {
                time = xcHelper.getTime(null, timeStamp);
            }

            var tableName = table.getName();
            var tableId = table.getId();
            var wsId = WSManager.getWSFromTable(tableId);
            var wsInfo;

            if (wsId == null) {
                wsInfo = '<div class="worksheetInfo inactive">' +
                            SideBarTStr.NoSheet +
                         '</div>';
            } else {
                wsInfo = '<div class="worksheetInfo worksheet-' + wsId + '">' +
                            WSManager.getWSName(wsId) +
                        '</div>';
            }

            var html =
                '<li class="clearfix tableInfo" ' +
                    'data-id="' + tableId + '">' +
                    '<div class="timeStampWrap">' +
                        '<div class="timeStamp">' +
                            '<span class="time">' + time + '</span>' +
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
                '</li>';
            totalHtml += html;

            if (!options.sortByName) {
                if (gMinModeOn || options.noAnimate) {
                    if (options.hasOwnProperty('position') &&
                        options.position > 0) {
                        $dateDivider.children().eq(options.position - 1)
                                               .after(html);
                    } else {
                        $dateDivider.prepend(html);
                    }

                } else {
                    var $li = $(html).hide();

                    $li.addClass("transition");

                    if (options.hasOwnProperty('position') &&
                        options.position > 0) {
                        $dateDivider.children().eq(options.position - 1)
                                               .after($li);
                    } else {
                        $li.prependTo($dateDivider);
                    }

                    $li.slideDown(150, function() {
                        $li.removeClass("transition");
                    });
                }
            }
        }
        if (options.sortByName) {
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
            if (canceledTables[tableName]) { // do not show canceled tables
                numTables--;
                continue;
            }
            var tableId = xcHelper.getTableId(tableName);
            html += '<li class="clearfix tableInfo" ' +
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
                            '<span data-original-title="' + tableName + '" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" data-container="body" ' +
                                'class="tableName textOverflow">' +
                                tableName +
                            '</span>' +
                        '</div>' +
                     '</li>';
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

    function generateConstList() {
        var deferred = jQuery.Deferred();
        XcalarGetConstants('*')
        .then(function(backConsts) {
            var frontConsts = Aggregates.getAggs();
            var backConstsList = [];
            var allConsts = [];
            var aggConst;
            var backConstsMap = {};
            
            for (var i = 0; i < backConsts.length; i++) {
                aggConst = backConsts[i];
                if (!frontConsts[aggConst.name]) {
                    aggConst.backColName = null;
                    aggConst.dagName = aggConst.name;
                    aggConst.aggName = aggConst.name;
                    aggConst.op = null;
                    aggConst.tableId = null;
                    aggConst.value = null;
                    backConstsList.push(aggConst);
                }
                backConstsMap[aggConst.name] = true;
            }

            // remove any constants that the front end has but the backend
            // doesn't
            for (var name in frontConsts) {
                if (!backConstsMap.hasOwnProperty(name)) {
                    Aggregates.removeAgg(name);
                }
            }

            backConstsList.sort(sortConst);
            for (var name in frontConsts) {
                allConsts.push(frontConsts[name]);
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
                    op = aggConst.op + "(" + aggConst.backColName + ")";
                } else {
                    op = CommonTxtTstr.NA;
                }
                if (aggConst.tableId && gTables[aggConst.tableId]) {
                    tableName = gTables[aggConst.tableId].tableName;
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
                            no + ". " + progCol.getFrontColName(true) +
                        '</span>' +
                    '</li>';
        }

        html += '</ul>';

        return html;
    }

    function formatDate(dates, dateIndex) {
        var date = "";
        var d;

        switch (dateIndex) {
            case 0:
                d = dates[dateIndex];
                date = DaysTStr.Today + " " + xcHelper.getDate("/", d);
                break;
            case 1:
                d = dates[dateIndex];
                date = DaysTStr.Yesterday + " " +
                        xcHelper.getDate("/", d);
                break;
            // Other days in the week
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
                d = dates[dateIndex];
                date = days[d.getDay()] + " " +
                       xcHelper.getDate("/", d);
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

    function filterTableList($section, keyWord) {
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
            var regex = new RegExp(keyWord, "gi");
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

    function activeTableAlert(tableType) {
        var $tableList;

        if (tableType === TableType.Archived) {
            $tableList = $('#archivedTableListSection');
        }

        var $noSheetTables = $tableList.find(".addTableBtn.selected")
        .closest(".tableInfo").filter(function() {
            return $(this).find(".worksheetInfo").hasClass("inactive");
        });

        if ($noSheetTables.length > 0) {
            $noSheetTables.addClass("highlight");
            // must get highlight class from source
            var noSheetTables = [];
            var wsToSent;

            Alert.show({
                "title": SideBarTStr.SendToWS,
                "instr": SideBarTStr.NoSheetTableInstr,
                "optList": {
                    "label": SideBarTStr.WSTOSend,
                    "list": WSManager.getWSLists(true)
                },
                "onConfirm": function() {
                    $noSheetTables.removeClass("highlight");

                    var wsName = Alert.getOptionVal();
                    var wsId = WSManager.getWSIdByName(wsName);

                    if (wsId == null) {
                        Alert.error(WSTStr.InvalidWSName,
                                    WSTStr.InvalidWSNameErr);
                    } else {
                        wsToSent = wsId;
                        $noSheetTables.each(function() {
                            var tableId = $(this).data("id");
                            noSheetTables.push(tableId);
                        });

                        TableList.activeTables(tableType, noSheetTables,
                                                wsToSent);
                    }
                },
                "onCancel": function() {
                    $noSheetTables.removeClass("highlight");
                }
            });
        } else {
            TableList.activeTables(tableType);
        }
    }

    function clearTableListFilter($section) {
        $section.find(".searchbarArea input").val("");
        filterTableList($section, null);
    }

    // default by name
    function sortTables(tables, byTime) {
        var sortedTables = [];

        tables.forEach(function(table) {
            sortedTables.push([table, table.getTimeStamp()]);
        });

        var sortFn;
        if (byTime) {
            // sort by time, from the oldest to newset
            sortFn = function(a, b) {
                return (a[1] - b[1]);
            };
        } else {
            sortFn = function(a, b) {
                return xcHelper.sortVals(a[0].getName(), b[0].getName());
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

    function focusOnLastTable(tableNames) {
        if (!$("#workspaceTab").hasClass("active")) {
            $("#workspaceTab").click();
        }

        var tableIsInActiveWS = true;
        if (tableNames) {
            tableIsInActiveWS = checkIfTablesInActiveWS(tableNames);
        }
        if (tableIsInActiveWS) {
            var $mainFrame = $('#mainFrame');
            // XX temporary fix to find last table
            var $lastTable = $('.xcTableWrap:not(.inActive)').last();

            if ($lastTable.length > 0) {
                var leftPos = $lastTable.position().left +
                                $mainFrame.scrollLeft();
                var tableId = xcHelper.parseTableId($lastTable);
                $mainFrame.animate({scrollLeft: leftPos}, 500).promise()
                .then(function(){
                    focusTable(tableId);
                });
            }
        }
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

    return (TableList);
}(jQuery, {}));
