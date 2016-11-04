window.DeleteTableModal = (function(DeleteTableModal, $) {
    var $modal;    // $("#deleteTableModal")
    var $modalBg;  // $("#modalBackground")
    var modalHelper;
    var tableList = {};
    var tableSizeMap = {};
    var sortKeyList = {};
    var reverseList = {};
    // constant
    var unknown = "--";

    DeleteTableModal.setup = function() {
        $modal = $("#deleteTableModal");
        $modalBg = $("#modalBackground");
        reset();

        var minWidth = 520;
        var minHeight = 500;

        modalHelper = new ModalHelper($modal, {
            "minWidth" : minWidth,
            "minHeight": minHeight
        });

        $modal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".confirm", function() {
            $(this).blur();
            if (!hasCheckedTables()) {
                return;
            }
            var msg = SideBarTStr.DelTablesMsg;
            $modal.addClass('lowZindex');
            Alert.show({
                "title"     : TblTStr.Del,
                "msg"       : msg,
                "highZindex": true,
                "onCancel"  : function() {
                    $modal.removeClass('lowZindex');
                    $('#modalBackground').hide();
                    // by default background won't hide because modalHelper
                    // detects more than 1 modal open
                },
                "onConfirm": function() {
                    $modal.removeClass('lowZindex');
                    $('#modalBackground').hide();
                    submitForm();
                }
            });
        });

        // click checkbox
        $modal.on("click", ".listSection .grid-unit", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        // click checkbox on title
        $modal.on("click", ".titleSection .checkboxSection", function() {
            var $checkboxSection = $(this);
            if ($checkboxSection.find(".checkbox").hasClass("checked")) {
                // uncheck
                $checkboxSection.closest(".section")
                                .find(".checkbox").removeClass("checked");
            } else {
                $checkboxSection.closest(".section")
                                .find(".checkbox").addClass("checked");
            }
        });

        // click title to sort
        $modal.on("click", ".title .label, .title .xi-sort", function() {
            var $title = $(this).closest(".title");
            var sortKey = $title.data("sortkey");
            var $section = $title.closest(".section");
            $section.find(".title.active").removeClass("active");
            $title.addClass("active");

            var tableType = null;

            if ($section.hasClass("orphan")) {
                tableType = TableType.Orphan;
            } else if ($section.hasClass("inactive")) {
                tableType = TableType.Archived;
            } else {
                tableType = TableType.Active;
            }

            var cachedTables = cacheCheckedTables(tableType);
            sortTableList(tableList[tableType], tableType, sortKey);
            restoreCheckedTables(cachedTables, tableType);
        });

        // click don't show
        $("#deleteTableModal-dontShow").click(function() {
            $(this).find(".checkbox").toggleClass("checked");
        });
    };

    DeleteTableModal.show = function(autoTrigger) {
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return;
        }

        modalHelper.setup({
            "open": function() {
                // instead of show modalBg, add locked class
                // so it can overlap upon other modals
                // and close without any problem
                $modalBg.addClass("locked");
                if (autoTrigger) {
                    $modal.addClass("autoTrigger");
                } else {
                    $modal.removeClass("autoTrigger");
                }

                if (gMinModeOn) {
                    $modal.show();
                } else {
                    $modal.fadeIn();
                }
            }
        });

        // if it's too slow, show timer
        $modal.addClass("load");
        $modal.find(".loadingSection .text").text(StatusMessageTStr.Loading);

        getTableSizeMap()
        .then(function() {
            return TableList.refreshOrphanList(false);
        })
        .always(function() {
            $modal.removeClass("load");
            populateTableLists();
        });
    };

    function closeModal() {
        var memCheck = !$("#deleteTableModal-dontShow .checkbox").hasClass("checked");
        modalHelper.clear({
            "close": function() {
                $modalBg.removeClass("locked");
                if (gMinModeOn) {
                    $modal.hide();
                } else {
                    $modal.fadeOut(180);
                }
            }
        });
        reset();
        Support.config({
            "memoryCheck": memCheck
        });
    }

    function reset() {
        tableList[TableType.Orphan] = [];
        tableList[TableType.Archived] = [];
        tableList[TableType.Active] = [];

        sortKeyList[TableType.Orphan] = null;
        sortKeyList[TableType.Archived] = null;
        sortKeyList[TableType.Active] = null;

        reverseList[TableType.Orphan] = false;
        reverseList[TableType.Archived] = false;
        reverseList[TableType.Active] = false;

        $modal.find('.grid-unit.failed').removeClass('failed');
    }

    function submitForm() {
        var orphanDef = deleteTableHelper(TableType.Orphan);
        var archivedDef = deleteTableHelper(TableType.Archived);
        var activeDef = deleteTableHelper(TableType.Active);
        var failed = false;

        var timer = setTimeout(function() {
            // if delete takes too long, show the loading section
            $modal.addClass("load");
            $modal.find(".loadingSection .text").text(StatusMessageTStr.DeleteTable);
        }, 500);

        modalHelper.disableSubmit();

        PromiseHelper.when(orphanDef, archivedDef, activeDef)
        .then(function() {
            xcHelper.showRefreshIcon($modal);
        })
        .fail(function(error1, error2, error3) {
            failed = true;
            var error = error1 || error2 || error3;
            console.error(error);
        })
        .always(function() {
            clearTimeout(timer);
            $modal.removeClass("load");
            populateTableLists();
            if (failed) {
                failHandler(arguments);
            }
            modalHelper.enableSubmit();
        });
    }

    function deleteTableHelper(type) {
        var $container = getListSection(type);
        var isOrphan = (type === TableType.Orphan);
        var tablesToDel = [];

        var list = tableList[type];
        $container.find(".grid-unit").each(function(index) {
            var $grid = $(this);
            if ($grid.find(".checkbox").hasClass("checked")) {
                if (isOrphan) {
                    var tableName = list[index].getName();
                    tablesToDel.push(tableName);
                } else {
                    var tableId = list[index].getId();
                    tablesToDel.push(tableId);
                }
            }
        });
        if (tablesToDel.length === 0) {
            return PromiseHelper.resolve();
        }
        var noAlert = true;
        return TblManager.deleteTables(tablesToDel, type, noAlert);
    }

    function hasCheckedTables() {
        return $modal.find('.grid-unit .checkbox.checked').length > 0;
    }

    function getTableSizeMap() {
        var deferred = jQuery.Deferred();
        XcalarGetTables("*")
        .then(function(result) {
            tableSizeMap = {};
            var numNodes = result.numNodes;
            var nodeInfo = result.nodeInfo;
            for (var i = 0; i < numNodes; i++) {
                var node = nodeInfo[i];
                tableSizeMap[node.name] = node.size;
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function populateTableLists() {
        tableList[TableType.Orphan] = [];
        tableList[TableType.Archived] = [];
        tableList[TableType.Active] = [];

        var orphanList = tableList[TableType.Orphan];
        var archivedList = tableList[TableType.Archived];
        var activeList = tableList[TableType.Active];

        for (var i = 0, len = gOrphanTables.length; i < len; i++) {
            var orphanTable = gOrphanTables[i];
            var orphanTableId = xcHelper.getTableId(orphanTable);
            if (orphanTableId != null && gTables.hasOwnProperty(orphanTableId)) {
                orphanList.push(gTables[orphanTableId]);
            } else {
                orphanList.push(new TableMeta({
                    "tableId"  : orphanTableId,
                    "tableName": orphanTable,
                    "timeStamp": unknown
                }));
            }
        }

        for (var tableId in gTables) {
            var table = gTables[tableId];
            var tableType = table.getType();

            if (tableType === TableType.Orphan) {
                // already handled
                continue;
            } else if (tableType === TableType.Archived) {
                archivedList.push(table);
            } else if (tableType === TableType.Active) {
                activeList.push(table);
            } else {
                console.info("Unhandled type", tableType, tableId);
            }
        }

        sortTableList(orphanList, TableType.Orphan);
        sortTableList(archivedList, TableType.Archived);
        sortTableList(activeList, TableType.Active);

        $modal.find('.modalMain').find('.checkbox').removeClass('checked');
    }

    function sortTableList(tableList, type, sortKey) {
        if (sortKey == null) {
            sortKey = sortKeyList[type];
            if (sortKey == null) {
                // when no key to sort
                getTableList(tableList, type);
                return;
            }
        } else if (sortKey === "size" && $.isEmptyObject(tableSizeMap)) {
            console.warn("not ready to sort on size");
            return;
        }

        if (sortKeyList[type] === sortKey) {
            // when it's reverse sort
            reverseList[type] = !reverseList[type];
        }

        // cache the new sortKey
        sortKeyList[type] = sortKey;

        // sort by name first, no matter what case
        tableList.sort(function(a, b) {
            return a.getName().localeCompare(b.getName());
        });

        // temoprarily not support sort on size
        if (sortKey === "size") {
            tableList.sort(function(a, b) {
                var nameA = a.getName();
                var nameB = b.getName();
                var sizeA = tableSizeMap[nameA];
                var sizeB = tableSizeMap[nameB];
                if (sizeA === unknown) {
                    sizeA = null;
                }

                if (sizeB === unknown) {
                    sizeB = null;
                }

                if (sizeA == null && sizeB == null) {
                    return 0;
                } else if (sizeA == null) {
                    return -1;
                } else if (sizeB == null) {
                    return 1;
                } else {
                    return sizeA > sizeB;
                }
            });
        } else if (sortKey === "date") {
            tableList.sort(function(a, b) {
                var tA = a.getTimeStamp();
                var tB = b.getTimeStamp();
                if (tA === unknown) {
                    tA = null;
                }

                if (tB === unknown) {
                    tB = null;
                }

                if (tA == null && tB == null) {
                    return 0;
                } else if (tA == null) {
                    return -1;
                } else if (tB == null) {
                    return 1;
                } else {
                    return tA > tB;
                }
            });
        }

        if (reverseList[type]) {
            tableList.reverse();
        }

        getTableList(tableList, type);
    }

    function cacheCheckedTables(tableType) {
        var list = tableList[tableType];
        var $container = getListSection(tableType);
        var tables = [];

        $container.find(".grid-unit").each(function(index) {
            var $grid = $(this);
            if ($grid.find(".checkbox").hasClass("checked")) {
                var tableName = list[index].getName();
                tables.push(tableName);
            }
        });

        return tables;
    }

    function restoreCheckedTables(tables, tableType) {
        var list = tableList[tableType];
        var $container = getListSection(tableType);
        var nameMap = {};

        tables.forEach(function(tableName) {
            nameMap[tableName] = true;
        });

        $container.find(".grid-unit").each(function(index) {
            var $grid = $(this);
            var tableName = list[index].getName();
            if (nameMap.hasOwnProperty(tableName)) {
                $grid.find(".checkbox").addClass("checked");
            }
        });
    }

    function getTableList(tables, type) {
        var $container = getListSection(type);
        var html = "";

        for (var i = 0, len = tables.length; i < len; i++) {
            var table = tables[i];
            var date = table.getTimeStamp();
            var tableName = table.getName();
            if (date !== unknown) {
                date = xcHelper.getTime(null, date) + " " +
                        xcHelper.getDate(null, null, date);
            }
            var size = unknown;
            if (tableSizeMap.hasOwnProperty(tableName)) {
                size = xcHelper.sizeTranslator(tableSizeMap[tableName]);
            }

            html += '<div class="grid-unit">' +
                        '<div class="checkboxSection">' +
                            '<div class="checkbox">' +
                                '<i class="icon xi-ckbox-empty"></i>' +
                                '<i class="icon xi-ckbox-selected"></i>' +
                            '</div>' +
                        '</div>' +
                        '<div class="name">' + tableName + '</div>' +
                        '<div>' + size + '</div>' +
                        '<div>' + date + '</div>' +
                    '</div>';
        }

        $container.find(".listSection").html(html);
    }

    function getListSection(type) {
        var $container;
        if (type === TableType.Orphan) {
            $container = $("#deleteTableModal-orphan");
        } else if (type === TableType.Archived) {
            $container = $("#deleteTableModal-archived");
        } else {
            $container = $("#deleteTableModal-active");
        }
        return $container;
    }

    function failHandler(args) {
        var $containers = $("#deleteTableModal-orphan, " +
                            "#deleteTableModal-archived, " +
                            "#deleteTableModal-active");
        var errorMsg = "";
        var hasSuccess = false;
        // var failedTablesStr = "";
        var failedTables = [];
        var failedMsgs = [];
        for (var i = 0; i < args.length; i++) {
            if (args[i] && args[i].fails) {
                if (args[i].hasSuccess) {
                    hasSuccess = true;
                }
                for (var j = 0; j < args[i].fails.length; j++) {
                    var tableName = args[i].fails[j].tables;
                    failedTables.push(tableName);
                    failedMsgs.push(args[i].fails[j].error);
                    var $gridUnit = $containers.find('.grid-unit')
                    .filter(function() {
                        $grid = $(this);
                        return ($grid.find('.name').text() === tableName);
                    });
                    $gridUnit.addClass('failed');
                }
            }
        }
        if (hasSuccess) {
            if (failedTables.length === 1) {
                errorMsg = failedMsgs[0] + ". " +
                xcHelper.replaceMsg(ErrWRepTStr.TableNotDeleted, {
                    "name": failedTables[0]
                });
            } else {
                errorMsg = failedMsgs[0] + ". " +
                           StatusMessageTStr.PartialDeleteTableFail;
            }
        } else {
            errorMsg = failedMsgs[0] + ". " + ErrTStr.NoTablesDeleted;
        }
     
        var $firstGrid = $containers.find('.grid-unit.failed').eq(0);
        StatusBox.show(errorMsg, $firstGrid, false, {
            "side"      : "left",
            "highZindex": true
        });
    }

    return DeleteTableModal;
}({}, jQuery));
