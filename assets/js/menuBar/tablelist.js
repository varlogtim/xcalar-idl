window.TableList = (function($, TableList) {
    var searchHelper;
    TableList.setup = function() {
        // setup table list section listeners
        var $tableListSections = $("#tableListSections");

        // toggle table sections
        $("#tableListSectionTabs").on("click", ".tableListSectionTab", function() {
            var $tab = $(this);
            var index = $tab.index();

            $("#tableListSectionTabs .active").removeClass("active");
            $tab.addClass("active");

            var $sections = $("#tableListSections .tableListSection").hide();
            $sections.eq(index).show();
        });

        // toggle table list box
        $tableListSections.on("click", ".tableListBox", function() {
            var $box = $(this);
            var $ol = $box.next();

            if ($ol.hasClass("open") && $box.hasClass("active")) {
                $box.removeClass("active");
                $ol.slideUp(200).removeClass("open");
            } else {
                if ($ol.children().length === 0) {
                    return;
                }
                $box.addClass("active");
                $ol.slideDown(200).addClass("open");
            }
        });

        // select a table list
        $tableListSections.on("click", ".addTableBtn", function() {
            var $btn = $(this);

            if ($btn.closest(".tableInfo").hasClass("hiddenWS")) {
                return true;
            }

            $btn.toggleClass("selected");
            var $section = $btn.closest(".tableListSection");
            var $submitBtns = $section.find(".submit");

            if ($section.find(".addTableBtn.selected").length === 0) {
                $submitBtns.addClass("xc-hidden");
            } else {
                $submitBtns.removeClass("xc-hidden");
            }
            // stop propogation
            return false;
        });

        $tableListSections.on("click", ".selectAll", function() {
            var $section = $(this).closest(".tableListSection");
            $section.find(".submit").removeClass("xc-hidden")
                    .end()
                    .find(".tableInfo:not(.hiddenWS) .addTableBtn")
                    .addClass("selected");
        });

        $tableListSections.on("click", ".clearAll", function() {
            var $section = $(this).closest(".tableListSection");
            $section.find(".submit").addClass("xc-hidden")
                    .end()
                    .find(".addTableBtn").removeClass("selected");
        });

        $("#orphanedTableList .refresh").click(function() {
            searchHelper.clearSearch(function() {
                clearTableListFilter($("#orphanedTableList"), null);
            });
            TableList.refreshOrphanList(true);
        });

        $tableListSections.on("mouseenter", ".tableName", function(){
            xcHelper.autoTooltip(this);
        });

        $tableListSections.on("click", ".submit.archive", function() {
            var tableIds = [];
            $("#activeTableList").find(".addTableBtn.selected").each(function() {
                tableIds.push($(this).closest('.tableInfo').data("id"));
            });
            if (tableIds.length) {
                TblManager.archiveTables(tableIds);
            }
        });

        $tableListSections.on("click", ".submit.active", function() {
            var $section = $(this).closest(".tableListSection");
            if ($section.is("#archivedTableList")) {
                activeTableAlert(TableType.Archived);
            } else if ($section.is("#orphanedTableList")) {
                TableList.activeTables(TableType.Orphan);
                searchHelper.clearSearch(function() {
                    clearTableListFilter($("#orphanedTableList"), null);
                });
            } else {
                console.error("Error Case!");
            }
        });

        $tableListSections.on("click", ".submit.delete", function() {
            var $section = $(this).closest(".tableListSection");
            var tableType;
            if ($section.is("#archivedTableList")) {
                tableType = TableType.Archived;
            } else if ($section.is("#orphanedTableList")) {
                tableType = TableType.Orphan;
            } else {
                console.error("Error Case!");
            }

            Alert.show({
                "title"    : TblTStr.Del,
                "msg"      : SideBarTStr.DelTablesMsg,
                "onConfirm": function() {
                    if (tableType === TableType.Orphan) {
                        searchHelper.clearSearch(function() {
                            clearTableListFilter($("#orphanedTableList"), null);
                        });
                    }
                    TableList.tableBulkAction("delete", tableType);
                }
            });
        });

        $("#activeTablesList").on("click", ".column", function() {
            var $col = $(this);
            if ($(this).closest(".tableInfo").hasClass("hiddenWS")) {
                return;
            }
            focusOnTableColumn($col);
        });


        searchHelper = new SearchBar($("#orphanedTableList-search"), {
            "removeSelected": function() {
                $("#orphanedTableList").find(".selected").removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            },
            "scrollMatchIntoView": function($match) {
                scrollMatchIntoView($("#orphanedTableList"), $match);
            }
        });

        searchHelper.setup();
        searchHelper.$arrows.hide();

        $("#orphanedTableList-search").on("input", "input", function() {
            var keyWord = $(this).val();
            filterTableList($("#orphanedTableList"), keyWord);
        });

        $("#orphanedTableList-search").on("click", ".clear", function() {
            searchHelper.clearSearch(function() {
                clearTableListFilter($("#orphanedTableList"), null);
                searchHelper.$arrows.hide();
            });
        });
    };

    TableList.initialize = function() {
        initializeTableList();
    };

    TableList.clear = function() {
        $("tableListSections").find(".submit").addClass("xc-hidden")
                            .end()
                            .find(".tableLists").empty();
    };

    TableList.addTables = function(tables, active, options) {
        // tables is an array of metaTables;
        generateTableLists(tables, active, options);
    };

    // move table to inactive list
    TableList.moveTable = function(tableId) {
        var $activeTableList = $('#activeTableList');
        var $tableList = $activeTableList.find('.tableInfo[data-id="' +
                                        tableId + '"]');
        var $timeLine = $tableList.closest(".timeLine");
        var table = gTables[tableId];

        TableList.addTables([table], IsActive.Inactive);

        $tableList.find(".tableListBox")
                  .removeClass('active')
                  .next()
                  .slideUp(0)
                  .removeClass('open');

        $tableList.addClass("transition").slideUp(150, function() {
            $tableList.remove();
            // clear time line & select boxes
            if ($timeLine.find(".tableInfo").length === 0) {
                $timeLine.remove();
            }
        });

        $activeTableList.find(".submit").addClass("xc-hidden")
                        .end()
                        .find(".addTableBtn").removeClass("selected");
    };

    TableList.renameTable = function(tableId, newTableName) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
        $tableList.find(".tableName").text(newTableName);
    };

    TableList.updateColName = function(tableId, colNum, newColName) {
        $('#activeTablesList').find(".tableInfo[data-id=" + tableId + "]")
                              .find(".column").eq(colNum - 1)
                              .find(".text")
                              .text(colNum + ". " + newColName);
    };

    TableList.updateTableInfo = function(tableId) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
        var $box = $tableList.find('.tableListBox');
        var $ol  = $box.next();
        var wasOpen = false;

        if ($ol.hasClass('open')) {
            wasOpen = true;
        }
        var position = $tableList.index();

        $tableList.remove();

        var table = gTables[tableId];
        TableList.addTables([table], IsActive.Active, {
            noAnimate: true,
            position : position
        });

        if (wasOpen) {
            $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
            $box = $tableList.find('.tableListBox');
            $ol = $box.next();
            if ($ol.children().length) {
                $box.addClass("active");
                $ol.addClass("open").show();
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
            if (!$("#workspaceTab").hasClass("active")) {
                $("#workspaceTab").click();
            }
            tableIsInActiveWS = true;
            if (tableNames) {
                tableIsInActiveWS = checkIfTablesInActiveWS(tableNames);
            }
            if (tableIsInActiveWS) {
                WSManager.focusOnLastTable();
            }

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
        xcHelper.assert(validAction.indexOf(action) >= 0);

        var $tableList;
        var hiddenWS = false;

        if (tableType === TableType.Archived) {
            $tableList = $('#archivedTableList');
        } else if (tableType === TableType.WSHidden) {
            $tableList = $('#activeTablesList');
            hiddenWS = true;
        } else if (tableType === TableType.Orphan) {
            $tableList = $('#orphanedTableList');
        }

        var $tablesSelected;
        var tableIds;
        if (hiddenWS) {
            $tablesSelected = $();
            tableIds = WSManager.getWorksheets()[wsId].tables;
            $tablesSelected = $tableList.find(".worksheet-" + wsId)
                                        .closest(".tableInfo");
            $('#archivedTableList').find('.worksheet-' + wsId)
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

        return (deferred.promise());

        function doneHandler($li, tableName, isHiddenWS) {
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
                if ($timeLine.find('.tableInfo').length === 0) {
                    $timeLine.remove();
                    if ($tableList.find('.tableInfo:not(.hiddenWS)').length === 0 ) {
                        if ($tableList.closest('#orphanedTableList').length !== 0) {
                            $("#orphanedTableList-search").hide();
                        }
                    }
                }
            }
        }

        function failHandler($li, tableName, error) {
            $li.find(".addTableBtn.selected").removeClass("selected");
            failures.push(tableName + ": {" + error.error + "}");
        }
    };

    TableList.tablesToHiddenWS = function(wsIds) {
        var $activeList = $('#activeTableList');
        var $inactiveList = $('#archivedTableList');
        var $bothLists = $activeList.add($inactiveList);

        for (var i = 0, len = wsIds.length; i < len; i++) {
            var wsId = wsIds[i];
            $bothLists.find('.worksheet-' + wsId)
                        .closest('.tableInfo')
                        .addClass('hiddenWS')
                        .attr({
                            'data-toggle'        : 'tooltip',
                            'data-container'     : 'body',
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
                    $list.find(".submit").addClass("xc-hidde");
                }
            }
        });
    };

    TableList.refreshOrphanList = function(prettyPrint) {
        var deferred = jQuery.Deferred();

        XcalarGetTables()
        .then(function(backEndTables) {
            var backTables = backEndTables.nodeInfo;
            var tableMap = {};
            for (var i = 0, len = backEndTables.numNodes; i < len; i++) {
                tableMap[backTables[i].name] = true;
            }

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
            xcHelper.showRefreshIcon($('#orphanedTableList'));

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

    TableList.removeTable = function(tableId, type) {
        var tableType;
        var $li = $();
        var $listWrap;
        if (type) {
            tableType = type;
        } else {
            var table = gTables[tableId];
            if (!table) {
                tableType = TableType.Orphan;
            } else {
                tableType = table.getType();
            }
        }

        if (tableType === "active") {
            $listWrap = $("#activeTableList");
            $li = $listWrap.find('.tableInfo[data-id="' + tableId + '"]');
        } else if (tableType === TableType.Orphan) {
            // if orphan, tableId is actually tableName
            $listWrap = $('#orphanedTableList');
            $li = $listWrap.find('.tableInfo[data-tablename="' +
                                                    tableId + '"]');
        } else {
            $listWrap = $('#archivedTableList');
            $li = $listWrap.find('.tableInfo[data-id="' + tableId + '"]');
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

        $tableList.find('.addTableBtn').removeClass('selected');
    };


    function addOrphanedTable(tableName, wsId) {
        var deferred = jQuery.Deferred();

        var tableId = xcHelper.getTableId(tableName);
        var newTableCols = [];
        // get workshett before async call
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

            TblManager.refreshTable([tableName], null, [], worksheet)
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
                                                [], worksheet);
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

    function generateTableLists(tables, active, options) {
        options = options || {};
        var sortedTables = sortTableByTime(tables); // from oldest to newest
        var dates = getTwoWeeksDate();
        var p = dates.length - 1;    // the length should be 8
        var days = [DaysTStr.Sunday, DaysTStr.Monday, DaysTStr.Tuesday,
                    DaysTStr.Wednesday, DaysTStr.Thursday, DaysTStr.Friday,
                    DaysTStr.Saturday];

        var $tableList = (active === true) ? $("#activeTablesList") :
                                             $("#inactiveTablesList");

        for (var i = 0; i < sortedTables.length; i++) {
            var table     = sortedTables[i][0];
            var timeStamp = sortedTables[i][1];

            // pointer to a day after at 0:00 am
            while (p >= 0 && (timeStamp >= dates[p].getTime())) {
                --p;
            }

            var dateIndex = p + 1;

            // when no such date exists
            if ($tableList.find("> li.date" + p).length === 0) {
                var date = "";
                var d;

                switch (dateIndex) {
                    case 0:
                        d = dates[dateIndex];
                        date = DaysTStr.Today + " " + xcHelper.getDate("/", d);
                        break;
                    case 1:
                        d = dates[dateIndex];
                        date = DaysTStr.Yesterday + " " + xcHelper.getDate("/", d);
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

                var timeLineHTML =
                    '<li class="clearfix timeLine date' + p + '">' +
                        '<div class="timeStamp">' + date + '</div>' +
                        '<ul class="tableList"></ul>' +
                    '</li>';
                $tableList.prepend(timeLineHTML);
            }

            var $dateDivider = $tableList.find(".date" + p + " .tableList");
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
                    '<div class="tableListBox">' +
                        '<span class="expand"></span>' +
                        '<span class="addTableBtn"></span>' +
                        '<span class="tableName textOverflowOneLine" title="' +
                            tableName + '">' +
                            tableName +
                        '</span>' +
                        '<span class="numCols" data-toggle="tooltip" ' +
                        'data-container="body" title="' + CommonTxtTstr.NumCol + '">' +
                            '(' + (numCols - 1) + ')' +// skip DATA col
                        '</span>' +
                    '</div>' +
                    generateColumnList(table.tableCols, numCols) +
                '</li>';


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

        // set hiddenWS class to tables belonging to hidden worksheets
        var hiddenWS = WSManager.getHiddenWS();
        TableList.tablesToHiddenWS(hiddenWS);
    }

    function generateColumnList(tableCols, numCols) {
        var html = '<ul class="columnList">';
        for (var i = 0, no = 1; i < numCols; i++, no++) {
            var progCol = tableCols[i];
            if (progCol.isDATACol()) {
                continue; // skip DATA col
            }
            var typeClass = "typeList type-" + progCol.getType();

            html += '<li class="column ' + typeClass + '">' +
                        '<div class="iconWrap">' +
                            '<span class="type icon"></span>' +
                        '</div>' +
                        '<span class="text">' +
                            no + ". " + progCol.getFronColName() +
                        '</span>' +
                    '</li>';
        }

        html += '</ul>';

        return html;
    }

    function generateOrphanList(tables) {
        var numTables = tables.length;
        var html = "";
        for (var i = 0; i < numTables; i++) {
            var tableName = tables[i];
            var tableId = xcHelper.getTableId(tableName);
            html += '<li class="clearfix tableInfo" ' +
                    'data-id="' + tableId + '"' +
                    'data-tablename="' + tableName + '">' +
                        '<div class="tableListBox">' +
                            '<span class="addTableBtn"></span>' +
                            '<span title="' + tableName + '" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" data-container="body" ' +
                                'class="tableName textOverflow">' +
                                tableName +
                            '</span>' +
                        '</div>' +
                     '</li>';
        }
        var $orphanedTableList = $("#orphanedTableList");
        $("#orphanedTablesList").html(html);
        if (numTables > 0) {
            $("#orphanedTableList-search").show();
        } else {
            $("#orphanedTableList-search").hide();
        }
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
            }
        });

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
                }
            });
            searchHelper.updateResults($section.find('.highlightedText'));
            var counterWidth = $section.find('.counter').width();
            $section.find('input').css("padding-right", counterWidth + 30);

            if (searchHelper.numMatches !== 0) {
                scrollMatchIntoView($section, searchHelper.$matches.eq(0));
                searchHelper.$arrows.show();
            } else {
                searchHelper.$arrows.hide();
            }
        }
    }

    function scrollMatchIntoView($section, $match) {
        var $list = $section.find('.tableLists');
        var listHeight = $list.height();
        var scrollTop = $list.scrollTop();
        var matchOffsetTop = $match.position().top;
        if (matchOffsetTop > (listHeight - 25)) {
            $list.scrollTop(matchOffsetTop + scrollTop - (listHeight / 2) + 30);
        } else if (matchOffsetTop < -5) {
            $list.scrollTop(scrollTop + matchOffsetTop - (listHeight / 2));
        }
    }

    function activeTableAlert(tableType) {
        var $tableList;

        if (tableType === TableType.Archived) {
            $tableList = $('#archivedTableList');
        }

        var $noSheetTables = $tableList.find(".addTableBtn.selected").closest(".tableInfo").filter(function() {
            return $(this).find(".worksheetInfo").hasClass("inactive");
        });

        if ($noSheetTables.length > 0) {
            $noSheetTables.addClass("highlight");
            // must get highlight class from source
            var $clone = $("#bottomMenu").clone();
            var noSheetTables = [];
            var wsToSent;

            $clone.addClass("faux");
            $("#modalBackground").after($clone);

            $clone.css({"z-index": "initial"});

            Alert.show({
                "title"  : SideBarTStr.SendToWS,
                "instr"  : SideBarTStr.NoSheetTableInstr,
                "optList": {
                    "label": SideBarTStr.WSTOSend + ":",
                    "list" : WSManager.getWSLists(true)
                },
                "onConfirm": function() {
                    $noSheetTables.removeClass("highlight");
                    $("#bottomMenu.faux").remove();

                    var wsName = Alert.getOptionVal();
                    var wsId = WSManager.getWSIdByName(wsName);

                    if (wsId == null) {
                        Alert.error(WSTStr.InvalidWSName, WSTStr.InvalidWSNameErr);
                    } else {
                        wsToSent = wsId;
                        $noSheetTables.each(function() {
                            var tableId = $(this).data("id");
                            noSheetTables.push(tableId);
                        });

                        TableList.activeTables(tableType, noSheetTables, wsToSent);
                    }
                },
                "cancel": function() {
                    $noSheetTables.removeClass("highlight");
                    $("#bottomMenu.faux").remove();
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

    function sortTableByTime(tables) {
        var sortedTables = [];

        tables.forEach(function(table) {
            sortedTables.push([table, table.getTimeStamp()]);
        });

        // sort by time, from the oldest to newset
        sortedTables.sort(function(a, b) {
            return (a[1] - b[1]);
        });

        return sortedTables;
    }

    function focusOnTableColumn($listCol) {
        // var colName = $listCol.text();
        var colNum = $listCol.index();
        var tableId = $listCol.closest('.tableInfo').data('id');
        var tableCols = gTables[tableId].tableCols;
        // var numTableCols = tableCols.length;
        for (var i = 0; i <= colNum; i++) {
            if (tableCols[i].name === "DATA") {
                colNum++;
                break;
            }
        }

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

    function initializeTableList() {
        var activeTables = [];
        var archivedTables = [];

        for (var tableId in gTables) {
            var table = gTables[tableId];
            var tableType = table.getType();
            if (tableType === TableType.Orphan ||
                tableType === TableType.Trash) {
                continue;
            }

            if (tableType === TableType.Active) {
                activeTables.push(table);
            } else {
                archivedTables.push(table);
            }
        }

        TableList.addTables(activeTables, IsActive.Active);
        TableList.addTables(archivedTables, IsActive.Inactive);

        generateOrphanList(gOrphanTables);
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
