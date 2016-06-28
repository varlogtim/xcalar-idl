window.DeleteTableModal = (function(DeleteTableModal, $) {
    var $modal;  // $("#deleteTableModal")
    var modalHelper;
    var tableList = {};
    var sortKeyList = {};
    var reverseList = {};
    // constant
    var unknown = "--";

    DeleteTableModal.setup = function() {
        $modal = $("#deleteTableModal");
        reset();

        var minWidth  = 520;
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
            submitForm();
        });

        // click checkbox
        $modal.on("click", ".listSection .checkboxSection", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

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
        $modal.on("click", ".title:not(.checkboxSection)", function() {
            var $title = $(this);
            var sortKey = $title.data("sortkey");
            var $section = $title.closest(".section");
            $section.find(".title.active").removeClass("active");
            $title.addClass("active");

            if ($section.hasClass("orphan")) {
                sortTableList(tableList[TableType.Orphan], TableType.Orphan, sortKey);
            } else if ($section.hasClass("inactive")) {
                sortTableList(tableList[TableType.Archived], TableType.Archived, sortKey);
            } else {
                sortTableList(tableList[TableType.Active], TableType.Active, sortKey);
            }
        });
    };

    DeleteTableModal.show = function() {
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return;
        }

        modalHelper.setup();

        // if it's too slow, show timer
        $modal.addClass("load");
        $modal.find(".loadingSection .text").text(StatusMessageTStr.Loading);

        TableList.refreshOrphanList(false)
        .always(function() {
            $modal.removeClass("load");
            populateTableLists();
        });
    };

    function closeModal() {
        modalHelper.clear();
        reset();
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
    }

    function submitForm() {
        var orphanDef = deleteTableHelper(TableType.Orphan);
        var archivedDef = deleteTableHelper(TableType.Archived);
        var activeDef = deleteTableHelper(TableType.Active);

        var timer = setTimeout(function() {
            // if delete takes too long, show the loading section
            $modal.addClass("load");
            $modal.find(".loadingSection .text").text(StatusMessageTStr.DeleteTable);
        }, 500);

        modalHelper.submit();
        PromiseHelper.when(orphanDef, archivedDef, activeDef)
        .fail(function(error1, error2, error3) {
            var error = error1 || error2 || error3;
            // XXX TODO: well handle the error
            console.error(error);
        })
        .always(function() {
            clearTimeout(timer);
            $modal.removeClass("load");
            populateTableLists();
            modalHelper.enableSubmit();
        });
    }

    function deleteTableHelper(type) {
        var $container;
        var isOrphan = (type === TableType.Orphan);
        var tablesToDel = [];

        if (isOrphan) {
            $container = $("#deleteTableModal-orphan");
        } else if (type === TableType.Archived) {
            $container = $("#deleteTableModal-archived");
        } else {
            $container = $("#deleteTableModal-active");
        }

        $container.find(".grid-unit").each(function() {
            var $grid = $(this);
            if ($grid.find(".checkbox").hasClass("checked")) {
                if (isOrphan) {
                    var tableName = $grid.find(".tableName").text();
                    tablesToDel.push(tableName);
                } else {
                    var tableId = $grid.data("id");
                    tablesToDel.push(tableId);
                }
            }
        });

        if (tablesToDel.length === 0) {
            return PromiseHelper.resolve();
        }

        return TblManager.deleteTables(tablesToDel, type);
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
    }

    function sortTableList(tableList, type, sortKey) {
        if (sortKey == null) {
            sortKey = sortKeyList[type];
            if (sortKey == null) {
                // when no key to sort
                getTableList(tableList, type);
                return;
            }
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

        } else if (sortKey === "date") {
            tableList.sort(function(a, b) {
                return a.getTimeStamp() > b.getTimeStamp();
            });
        }

        if (reverseList[type]) {
            tableList.reverse();
        }

        getTableList(tableList, type);
    }

    function getTableList(tables, type) {
        var $container;
        var html = "";

        if (type === TableType.Orphan) {
            $container = $("#deleteTableModal-orphan");
        } else if (type === TableType.Archived) {
            $container = $("#deleteTableModal-archived");
        } else {
            $container = $("#deleteTableModal-active");
        }

        for (var i = 0, len = tables.length; i < len; i++) {
            var table = tables[i];
            var date = table.getTimeStamp();
            var tableId = table.getId() || "";
            if (date !== unknown) {
                date = xcHelper.getTime(null, date);
            }

            html += '<div class="grid-unit" data-id="' + tableId + '">' +
                        '<div class="checkboxSection">' +
                            '<div class="checkbox iconWrapper"></div>' +
                        '</div>' +
                        '<div class="tableName">' + table.getName() + '</div>' +
                        '<div>' + unknown + '</div>' +
                        '<div>' + date + '</div>' +
                    '</div>';
        }

        $container.find(".listSection").html(html);
    }

    return DeleteTableModal;
}({}, jQuery));
