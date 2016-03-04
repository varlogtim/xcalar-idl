window.TableList = (function($, TableList) {

    TableList.setup = function() {
        initializeTableList();

        // setup table list section listeners
        var $tabsSection       = $("#tableListSectionTabs");
        var $tableListSections = $("#tableListSections .tableListSection");
        var $selectBtns        = $('#archivedTableList .secondButtonWrap,' +
                                   '#orphanedTableList .secondButtonWrap,' +
                                   '#aggregateTableList .secondButtonWrap');

        $tabsSection.on("click", ".tableListSectionTab", function() {
            var $tab  = $(this);
            var index = $(this).index();

            $tabsSection.find(".active").removeClass("active");
            $tab.addClass('active');

            $tableListSections.hide();
            $tableListSections.eq(index).show();
        });

        // toggle table list box
        $("#tableListSections").on("click", ".tableListBox", function() {
            var $box = $(this);
            var $ol  = $box.next();

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

        $selectBtns.find('.selectAll').click(function() {
            var $tableListSection = $(this).closest('.tableListSection');
            var $listBtns = $tableListSection.find('.buttonWrap')
                                             .find('.btnLarge');
            $listBtns.removeClass('btnInactive');
            var $tables = $tableListSection.find('.tableInfo:not(.hiddenWS)')
                                           .find('.addTableBtn');
            $tables.addClass('selected');
        });

        $selectBtns.find('.clearAll').click(function() {
            var $tableListSection = $(this).closest('.tableListSection');
            var $listBtns = $tableListSection.find('.buttonWrap')
                                             .find('.btnLarge');
            $listBtns.addClass('btnInactive');
            $tableListSection.find('.addTableBtn').removeClass("selected");
        });

        $selectBtns.find('.refresh').click(function() {
            clearTableListFilter($("#orphanedTableList"), null);
            TableList.refreshOrphanList(true);
        });

        $("#inactiveTablesList, #orphanedTablesList, #aggregateTableList")
        .on("click", ".addTableBtn", function() {
            var $btn = $(this);

            if ($btn.closest('.tableInfo').hasClass('hiddenWS')) {
                return true;
            }

            $btn.toggleClass("selected");
            var $tableListSection = $btn.closest('.tableListSection');
            var $listBtns = $tableListSection.find('.buttonWrap')
                                             .find('.btnLarge');

            if ($tableListSection.find(".addTableBtn.selected").length === 0) {
                $listBtns.addClass('btnInactive');
            } else {
                $listBtns.removeClass('btnInactive');
            }
            // stop propogation
            return false;
        });

        $('#tableListSections').find(".tableListSection").on("mouseenter",
                                        ".tableName, .aggStrWrap", function(){
            xcHelper.autoTooltip(this);
        });

        $("#submitTablesBtn").click(function() {
            addBulkTableHelper(TableType.InActive);
        });

        $('#submitOrphanedTablesBtn').click(function() {
            addBulkTable(TableType.Orphan);
        });

        $("#submitAggTablesBtn").click(function() {
            addBulkTableHelper(TableType.Agg);
        });

        $("#deleteTablesBtn, #deleteOrphanedTablesBtn").click(function() {
            var tableType;
            if ($(this).is('#deleteTablesBtn')) {
                tableType = TableType.InActive;
            } else {
                tableType = TableType.Orphan;
            }

            Alert.show({
                "title": TblTStr.Del,
                "msg"  : SideBarTStr.DelTablesMsg,
                "isCheckBox": true,
                "confirm"   : function() {
                    TableList.tableBulkAction("delete", tableType)
                    .then(function() {
                        KVStore.commit();
                    })
                    .fail(function(error) {
                        Alert.error(TblTStr.DelFail, error);
                    });
                }
            });
        });

        $('#activeTablesList').on("click", ".column", function() {
            if ($(this).closest('.tableInfo').hasClass('hiddenWS')) {
                return;
            }
            focusOnTableColumn($(this));
        });

        $("#orphanedTableList-search").on("input", "input", function() {
            var keyWord = $(this).val();
            filterTableList($("#orphanedTableList"), keyWord);
        });

        $("#orphanedTableList-search").on("click", ".clear", function() {
            clearTableListFilter($("#orphanedTableList"), null);
        });
    };

    TableList.clear = function() {
        $("#activeTablesList").empty();
        $("#submitTablesBtn").addClass('btnInactive');
        $("#deleteTablesBtn").addClass('btnInactive');
        $('#archivedTableList .secondButtonWrap').hide();
        $('#inactiveTablesList').empty();
        $("#aggTablesList").empty();
        $("#aggregateTableList").find('.clearAll, .selectAll').hide();
        $("#orphanedTablesList").empty();
        $("#orphanedTableList").find('.clearAll, .selectAll').hide();
    };

    TableList.addTables = function(tables, active, options) {
        // tables is an array of metaTables;
        generateTableLists(tables, active, options);

        if (!active) {
            $('#archivedTableList').find('.btnLarge').show();
        }
    };

    TableList.refreshAggTables = function() {
        var aggInfo = WSManager.getAggInfos();
        var tables = [];

        for (var key in aggInfo) {
            // extract tableId, colName, and aggOps from key
            var keySplits = key.split("#");
            var tableId = keySplits[0];
            var aggStr  = generateAggregateString(keySplits[1], keySplits[2]);

            tables.push({
                "key"      : key,
                "tableName": gTables[tableId].tableName,
                "aggStr"   : aggStr,
                "value"    : aggInfo[key]
            });
        }

        // sort by table Name
        tables.sort(function(a, b) {
            var compareRes = a.tableName.localeCompare(b.tableName);
            if (compareRes === 0) {
                // if table name is the same, compare aggStr
                return (a.aggStr.localeCompare(b.aggStr));
            } else {
                return compareRes;
            }
        });

        generateAggTableList(tables);
    };

    TableList.removeAggTable = function(tableId) {
        var $list = $('#aggTablesList .tableInfo[data-id="' + tableId + '"]');
        if ($list.length > 0) {
            var key = $list.data("key");
            WSManager.removeAggInfo(key);
            $list.remove();
        }
    };

    // move table to inactive list
    TableList.moveTable = function(tableId) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
        var $timeLine = $tableList.closest(".timeLine");
        var table = gTables[tableId];

        TableList.addTables([table], IsActive.Inactive);

        $tableList.find(".tableListBox")
                  .removeClass('active')
                  .next()
                  .slideUp(0)
                  .removeClass('open');

        $tableList.remove();

        // clear time line
        if ($timeLine.find(".tableInfo").length === 0) {
            $timeLine.remove();
        }
    };

    TableList.renameTable = function(tableId, newTableName) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
        $tableList.find(".tableName").text(newTableName);

        // refresh agg list
        TableList.refreshAggTables();
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
        TableList.addTables([table], IsActive.Active, {noAnimate: true,
                                                       position: position});
        
        if (wasOpen) {
            $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
            $box = $tableList.find('.tableListBox');
            $ol  = $box.next();
            if ($ol.children().length) {
                $box.addClass("active");
                $ol.addClass("open").show();
            }
        }
    };

    TableList.tableBulkAction = function(action, tableType, wsId) {
        var deferred    = jQuery.Deferred();
        var validAction = ["add", "delete"];

        // validation check
        xcHelper.assert(validAction.indexOf(action) >= 0);

        var $tableList;
        var hiddenWS = false;

        if (tableType === TableType.InActive) {
            $tableList = $('#archivedTableList');
        } else if (tableType === TableType.WSHidden) {
            $tableList = $('#activeTablesList');
            hiddenWS = true;
        } else if (tableType === TableType.Orphan) {
            $tableList = $('#orphanedTableList');
        } else if (tableType === TableType.Agg) {
            $tableList = $("#aggregateTableList");
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
        
        var $buttons = $tableList.find('.btnLarge');
        var promises = [];
        var failures = [];
        var tableNames = [];

        $buttons.addClass('btnInactive');

        $tablesSelected.each(function(index, ele) {
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

                if (tableType === TableType.Orphan ||
                    tableType === TableType.Agg)
                {
                    tableName = $li.data("tablename");
                } else {
                    if (table == null) {
                        innerDeferred.reject("Error: do not find the table");
                        return (innerDeferred.promise());
                    }

                    tableName = table.tableName;
                }

                tableNames.push(tableName);

                if (action === "add") {
                    if (tableType === TableType.Orphan) {
                        addOrphanedTable(tableName)
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
                    } else if (tableType === TableType.Agg) {
                        var key = $li.data("key");

                        addOrphanedTable(tableName)
                        .then(function(finalTableName){
                            var finalTableId = xcHelper.getTableId(finalTableName);
                            WSManager.activeAggInfo(key, finalTableId);
                            // TableList.refreshAggTables() is called after
                            // all promises done
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            failHandler($li, tableName, error);
                            innerDeferred.resolve(error);
                        });
                    } else {
                        table.beActive();
                        table.updateTimeStamp();

                        var tblCols = table.tableCols;
                        var tableProperties = {
                            "bookmarks" : table.bookmarks,
                            "rowHeights": table.rowHeights
                        };

                        TblManager.refreshTable([tableName], tblCols, [], null,
                                        {"tableProperties": tableProperties})
                        .then(function() {
                            doneHandler($li, tableName, hiddenWS);
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            failHandler($li, tableName, error);
                            innerDeferred.resolve(error);
                        });
                    }
                } else if (action === "delete") {
                    var tableIdOrName;

                    if (tableType === TableType.Orphan) {
                        tableIdOrName = tableName;
                    } else {
                        tableIdOrName = tableId;
                    }

                    TblManager.deleteTable(tableIdOrName, tableType)
                    .then(function() {
                        doneHandler($li, tableName);
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        failHandler($li, tableName, error);
                        innerDeferred.resolve(error);
                    });
                }

                return (innerDeferred.promise());

            }).bind(this));
        });

        chain(promises)
        .then(function() {
            // anything faile to alert
            if (failures.length > 0) {
                deferred.reject(failures.join("\n"));
            } else {
                deferred.resolve(tableNames);
            }
        })
        .always(function() {
            // update
            TableList.refreshAggTables();
        });

        return (deferred.promise());

        function doneHandler($li, tableName, isHiddenWS) {
            var $timeLine = $li.closest(".timeLine");

            if (isHiddenWS) {
                var $archivedList = $('#archivedTableList');
                if ($archivedList.find('.tableInfo:not(.hiddenWS)').length === 0) {
                    $archivedList.find('.secondButtonWrap').hide();
                } else {
                    $archivedList.find('.secondButtonWrap').show();
                }
            } else {
                if (gMinModeOn) {
                    handlerCallback();
                } else {
                    $li.addClass("transition").slideUp(150, function() {
                        handlerCallback();
                    });
                }
            }

            // Should add table id/tableName!
            SQL.add("RightSideBar Table Actions", {
                "operation": SQLOps.TableBulkActions,
                "action"   : action,
                "tableName": tableName,
                "tableType": tableType
            });

            function handlerCallback() {
                $li.remove();
                if ($timeLine.find('.tableInfo').length === 0) {
                    $timeLine.remove();
                    if ($tableList.find('.tableInfo:not(.hiddenWS)').length === 0 ) {
                        if ($tableList.closest('#orphanedTableList').length !== 0) {
                            $tableList.find('.selectAll, .clearAll').hide();
                            $("#orphanedTableList-search").hide();
                        } else {
                            $tableList.find('.secondButtonWrap').hide();
                        }
                    } else {
                        $tableList.siblings('.secondButtonWrap').show();
                    }
                }
            }
        }

        function failHandler($li, tableName, error) {
            $li.find(".addTableBtn.selected")
                    .removeClass("selected");
            failures.push(tableName + ": {" + error.error + "}");
            SQL.errorLog("RightSideBar Table Actions", {
                "operation": SQLOps.TableBulkActions,
                "action"   : action,
                "tableName": tableName,
                "tableType": tableType
            }, null, error);
        }
    };

    TableList.tablesToHiddenWS = function(wsIds) {
        var $activeList = $('#activeTablesList');
        var $inactiveList = $('#inactiveTablesList');
        var $archivedTableList = $('#archivedTableList');

        for (var i = 0, len = wsIds.length; i < len; i++) {
            var wsId = wsIds[i];

            $activeList.find('.worksheet-' + wsId)
                      .closest('.tableInfo')
                      .addClass('hiddenWS')
                      .attr({
                        'data-toggle'        : 'tooltip',
                        'data-container'     : 'body',
                        'data-original-title': WSTStr.WSHidden
                      });
            $inactiveList.find('.worksheet-' + wsId)
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

        if ($archivedTableList.find('.tableInfo:not(.hiddenWS)').length === 0) {
            $archivedTableList.find('.secondButtonWrap').hide();
        } else {
            $archivedTableList.find('.secondButtonWrap').show();
        }
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
                if (!table.isOrphaned &&
                    tableMap.hasOwnProperty(table.tableName))
                {
                    delete tableMap[table.tableName];
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

    function addOrphanedTable(tableName) {
        var deferred = jQuery.Deferred();

        var tableId = xcHelper.getTableId(tableName);
        var newTableCols = [];
        // get workshett before async call
        var worksheet = WSManager.getActiveWS();

        if (tableId != null && gTables[tableId] != null) {
            // when meta is in gTables
            var table = gTables[tableId];
            if (!table.isOrphaned) {
                throw "Error, table is not orphaned!";
            }
            newTableCols = table.tableCols;
            var tableProperties = {
                "bookmarks" : table.bookmarks,
                "rowHeights": table.rowHeights
            };
            TblManager.refreshTable([tableName], newTableCols, [], worksheet,
                                    {"tableProperties": tableProperties})
            .then(function() {
                deferred.resolve(tableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

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

        function renameOrphanIfNeeded() {
            var innerDeferred = jQuery.Deferred();
            var newTableName;
            if (tableId == null) {
                newTableName = tableName + Authentication.getHashId();
                var sqlOptions = {
                    "operation": SQLOps.RenameOrphanTable,
                    "oldName"  : tableName,
                    "newName"  : newTableName
                };
                XcalarRenameTable(tableName, newTableName, sqlOptions)
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

    function addBulkTableHelper(tableType) {
        var $tableList;

        if (tableType === TableType.InActive) {
            $tableList = $('#archivedTableList');
        } else if (tableType === TableType.Agg) {
            $tableList = $("#aggregateTableList");
        }

        var $tables = $tableList.find(".addTableBtn.selected")
                                .closest(".tableInfo");

        var $noSheetTables = $tables.filter(function() {
            return $(this).find(".worksheetInfo").hasClass("inactive");
        });

        if ($noSheetTables.length > 0) {
            $noSheetTables.addClass("highlight");
            // must get highlight class  from source
            var $clone = $("#rightSideBar").clone();

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
                "confirm": function() {
                    $noSheetTables.removeClass("highlight");
                    $("#rightSideBar.faux").remove();

                    var wsName = Alert.getOptionVal();
                    var wsId = WSManager.getWSIdByName(wsName);

                    if (wsId == null) {
                        Alert.error(WSTStr.InvalidWSName, WSTStr.InvalidWSNameErr);
                    } else {
                        var tableIds = [];
                        $noSheetTables.each(function() {
                            var tableId = $(this).data("id");
                            tableIds.push(tableId);
                        });

                        WSManager.addNoSheetTables(tableIds, wsId);

                        addBulkTable(tableType);
                    }
                },
                "cancel": function() {
                    $noSheetTables.removeClass("highlight");
                    $("#rightSideBar.faux").remove();
                }
            });

        } else {
            addBulkTable(tableType);
        }
    }

    function addBulkTable(tableType) {
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
            
            KVStore.commit();
        })
        .fail(function(error) {
            var type;
            if (tableType === TableType.InActive) {
                type = 'Archived';
            } else if (tableType === TableType.Orphan) {
                type = 'Orphaned';
            }
            Alert.error("Error In Adding " + type + " Table", error);
        });
    }

    function generateTableLists(tables, active, options) {
        var options = options || {};
        var sortedTables = sortTableByTime(tables); // from oldest to newest
        var dates = xcHelper.getTwoWeeksDate();
        var p     = dates.length - 1;    // the length should be 8
        var days  = [DaysTStr.Sunday, DaysTStr.Monday, DaysTStr.Tuesday,
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

            var tableName = table.tableName;
            var tableId   = table.tableId;
            var wsId      = WSManager.getWSFromTable(tableId);
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

            var addTableBtn = (active === true) ? "" :
                '<span class="addTableBtn" title="' + SideBarTStr.SelectTable + '"></span>';
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
                        '<div class="iconWrap">' +
                            '<span class="icon"></span>' +
                        '</div>' +
                        '<span class="tableName textOverflowOneLine" title="' +
                            tableName + '">' +
                            tableName +
                        '</span>' +
                        '<span class="numCols" data-toggle="tooltip" ' +
                        'data-container="body" title="' + CommonTxtTstr.NumCol + '">' +
                             (numCols - 1) + // skip DATA col
                        '</span>' +
                        addTableBtn +
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

    function generateAggTableList(tables) {
        var numTables = tables.length;
        var html = "";

        for (var i = 0; i < numTables; i++) {
            var table      = tables[i];
            var tableName  = table.tableName;
            var aggStr     = table.aggStr;
            var aggVal     = table.value.value;
            var isActive   = table.value.isActive;
            var dstTable   = table.value.dagName;
            var dstTableId = xcHelper.getTableId(dstTable);
            var wsInfo;
            var addTableBtn;

            if (isActive) {
                var wsId = WSManager.getWSFromTable(dstTableId);

                if (wsId == null) {
                    // case that worksheet is deleted
                    wsInfo =
                        '<div class="worksheetInfo" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + dstTable + '">' +
                            'No sheet' +
                        '</div>';
                } else {
                    wsInfo =
                        '<div class="worksheetInfo worksheet-' + wsId +
                        '" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + dstTable + '">' +
                            WSManager.getWSName(wsId) +
                        '</div>';
                }

                addTableBtn = "";
            } else {
                wsInfo = '<div class="worksheetInfo inactive"></div>';
                addTableBtn = '<span class="addTableBtn"></span>';
                // XXX temporary disable it
                addTableBtn = '';
            }

            html += '<li class="clearfix tableInfo" ' +
                     'data-id="' + dstTableId + '"' +
                     'data-tablename="' + dstTable + '"' +
                     'data-key="' + table.key + '">' +
                        '<span class="tableNameWrap textOverflow" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + tableName + '">' +
                            tableName +
                        '</span>' +
                        '<span class="aggStrWrap textOverflow" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + aggStr + '">' +
                            aggStr +
                        '</span>' +
                        '<div class="tableListBox">' +
                            '<span class="aggVal">' + aggVal + '</span>' +
                            wsInfo +
                            addTableBtn +
                        '</div>' +
                     '</li>';
        }

        var $aggregateTableList = $('#aggregateTableList');
        $('#aggTablesList').html(html);

        if (numTables > 0) {
            $aggregateTableList.find('.btnLarge').show();
            $aggregateTableList.find('.selectAll, .clearAll').show();
        }
        $aggregateTableList.find('.secondButtonWrap').show();
    }

    function generateOrphanList(tables) {
        var numTables = tables.length;
        var html = "";
        for (var i = 0; i < numTables; i++) {
            var tableName = tables[i];
            var tableId   = xcHelper.getTableId(tableName);
            html += '<li class="clearfix tableInfo" ' +
                    'data-id="' + tableId + '"' +
                    'data-tablename="' + tableName + '">' +
                        '<div class="tableListBox">' +
                            '<div class="iconWrap">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                            '<span title="' + tableName + '" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" data-container="body" ' +
                                'class="tableName textOverflow">' +
                                tableName +
                            '</span>' +
                            '<span class="addTableBtn"></span>' +
                        '</div>' +
                     '</li>';
        }
        var $orphanedTableList = $('#orphanedTableList');
        $('#orphanedTablesList').html(html);
        if (numTables > 0) {
            $orphanedTableList.find('.btnLarge').show();
            $orphanedTableList.find('.selectAll, .clearAll').show();
            $("#orphanedTableList-search").show();
        } else {
            $orphanedTableList.find('.selectAll, .clearAll').hide();
            $("#orphanedTableList-search").hide();
        }
        $orphanedTableList.find('.secondButtonWrap').show();
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
        }
    }

    function clearTableListFilter($section) {
        $section.find(".searchArea input").val("");
        filterTableList($section, null);
    }

    function sortTableByTime(tables) {
        var sortedTables = [];

        tables.forEach(function(table) {
            var tableId = table.tableId;
            var timeStamp;
            if (gTables[tableId]) {
                timeStamp = gTables[tableId].timeStamp;
            }
            if (timeStamp == null) {
                console.error("Time Stamp undefined");
                timeStamp = xcHelper.getTimeInMS(null, "2014-02-14");
                timeStamp = "";
            }

            sortedTables.push([table, timeStamp]);
        });

        // sort by time, from the oldest to newset
        sortedTables.sort(function(a, b) {
            return (a[1] - b[1]);
        });

        return (sortedTables);
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
        var hiddenTables = [];

        for (var tableId in gTables) {
            var table = gTables[tableId];
            if (table.isOrphaned) {
                continue;
            }

            if (table.active) {
                activeTables.push(table);
            } else {
                hiddenTables.push(table);
            }
        }

        TableList.addTables(activeTables, IsActive.Active);
        TableList.addTables(hiddenTables, IsActive.Inactive);

        generateOrphanList(gOrphanTables);
        TableList.refreshAggTables();
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
