window.WorkbookPreview = (function(WorkbookPreview, $) {
    var $workbookPanel; // $("#workbookPanel")
    var $workbookPreview; // $("#workBookPreview")
    var curTableList = [];
    var id;
    var curWorkbookId;

    WorkbookPreview.setup = function() {
        $workbookPanel = $("#workbookPanel");
        $workbookPreview = $("#workbookPreview");
        addEvents();
    };

    WorkbookPreview.show = function(workbookId) {
        id = xcHelper.randName("worbookPreview");
        curWorkbookId = workbookId;

        $workbookPanel.addClass("previewMode");
        reset();
        showWorkbookInfo(workbookId);
        showTableInfo(workbookId);
    };

    WorkbookPreview.close = function() {
        $workbookPanel.removeClass("previewMode");
        $workbookPreview.removeClass("loading error");
        $workbookPreview.find(".errorSection").empty();
        $workbookPreview.find(".listSection").empty();

        curWorkbookId = null;
    };

    function addEvents() {
        $workbookPanel.on("click", ".backToWB", function() {
            WorkbookPreview.close();
        });

        $workbookPanel.on("click", ".view", function() {
            var tableName = getTableNameFromEle(this);
            var workbookName = WorkbookManager.getWorkbook(curWorkbookId).getName();
            DfPreviewModal.show(tableName, workbookName);
        });

        $workbookPanel.on("click", ".title .label, .title .xi-sort", function() {
            var $title = $(this).closest(".title");
            var sortKey = $title.data("sortkey");
            var $section = $title.closest(".titleSection");
            var tableList;

            if ($title.hasClass("active")) {
                tableList = reverseTableList(curTableList);
            } else {
                $section.find(".title.active").removeClass("active");
                $title.addClass("active");
                tableList = sortTableList(curTableList, sortKey);
            }
            updateTableList(tableList);
        });

        $workbookPreview.on("click", ".delete", function() {
            var tableName = getTableNameFromEle(this);
            deleteTable(tableName);
        });
    }

    function getTableNameFromEle(ele) {
        return $(ele).closest(".grid-unit").find(".name").text();
    }

    function reset() {
        curTableList = [];
        $workbookPanel.find(".title.active").removeClass("active");
    }

    function showWorkbookInfo(workbookId) {
        var $section = $workbookPreview.find(".cardTopMain");
        var workbook = WorkbookManager.getWorkbook(workbookId);
        $section.find(".name .text").text(workbook.getName());
    }

    function showTableInfo(workbookId) {
        var nodeInfo;
        var curId = id;
        var workbookName = WorkbookManager.getWorkbook(workbookId).getName();

        $workbookPreview.addClass("loading");

        XcalarGetTables("*", workbookName)
        .then(function(res) {
            nodeInfo = res.nodeInfo;
            return getTableKVStoreMeta(workbookId);
        })
        .then(function(tableMeta) {
            if (curId === id) {
                curTableList = getTableList(nodeInfo, tableMeta);
                // sort by name
                $workbookPanel.find(".title.name .label").click();
            }
        })
        .fail(function(error) {
            if (curId === id) {
                handleError(error);
            }
        })
        .always(function() {
            if (curId === id) {
                $workbookPreview.removeClass("loading");
            }
        });
    }

    function handleError(error) {
        var errorMsg = xcHelper.parseError(error);
        $workbookPreview.find(".errorSection").text(errorMsg);
        $workbookPreview.addClass("error");
    }

    function getTableKVStoreMeta(workbookId) {
        var deferred = jQuery.Deferred();
        var key = WorkbookManager.getStorageKey(workbookId);
        KVStore.getAndParse(key, gKVScope.META)
        .then(function(res) {
            try {
                var metaInfos = new METAConstructor(res);
                deferred.resolve(metaInfos.getTableMeta());
            } catch (e) {
                console.error(e);
                deferred.resolve({}); // still resolve
            }
        })
        .fail(function(error) {
            console.error(error);
            deferred.resolve({}); // still resolve
        });

        return deferred.promise();
    }

    function getTableList(nodeInfo, tableMeta) {
        return nodeInfo.map(function(node) {
            var tableName = node.name;
            var size = xcHelper.sizeTranslator(node.size);
            var tableId = xcHelper.getTableId(tableName);
            var status = tableMeta.hasOwnProperty(tableId)
                        ? tableMeta[tableId].status
                        : TableType.Orphan;
            return {
                name: tableName,
                size: size,
                status: status,
                sizeInNum: node.size
            };
        });
    }

    function sortTableList(tableList, key) {
        // sort by name first, no matter what case
        tableList.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });

        // temoprarily not support sort on size
        if (key === "size") {
            tableList.sort(function(a, b) {
                var sizeA = a.sizeInNum;
                var sizeB = b.sizeInNum;
                if (sizeA === sizeB) {
                    return 0;
                } else if (sizeA > sizeB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        } else if (key === "status") {
            tableList.sort(function(a, b) {
                return a.status.localeCompare(b.status);
            });
        }
        return tableList;
    }

    function reverseTableList(tableList) {
        tableList.reverse();
        return tableList;
    }

    function updateTableList(tableList) {
        var html = tableList.map(function(tableInfo) {
            return '<div class="grid-unit">' +
                        '<div class="name tooltipOverflow">' +
                            tableInfo.name +
                        '</div>' +
                        '<div class="size">' +
                            tableInfo.size +
                        '</div>' +
                        '<div class="status">' +
                            tableInfo.status +
                        '</div>' +
                        '<div class="action">' +
                            '<i class="view icon xc-action xi-dfg2 fa-15"' +
                            ' data-toggle="tooltip" data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + TooltipTStr.OpenQG + '"' +
                            '></i>' +
                            // '<i class="delete icon xc-action xi-trash fa-15"' +
                            // ' data-toggle="tooltip" data-container="body"' +
                            // ' data-placement="top"' +
                            // ' data-title="' + TblTStr.DropTbl + '"' +
                            // '></i>' +
                        '</div>' +
                    '</div>';
        }).join("");
        $workbookPreview.find(".listSection").html(html);
    }

    function deleteTable(tableName) {
        Alert.show({
            title: TblTStr.DropTbl,
            msg: SideBarTStr.DelTablesMsg,
            onConfirm: function() {
                submitDropTable(tableName);
            }
        });
    }

    function submitDropTable(tableName) {
        var tableList = curTableList;
        var curId = id;

        XcalarDeleteTable(tableName)
        .then(function() {
            if (curId !== id) {
                return;
            }
            curTableList = tableList.filter(function(tableInfo) {
                return tableInfo.name !== tableName;
            });
            xcHelper.showRefreshIcon($workbookPanel.find(".listSection"));
            updateTableList(curTableList);
        })
        .fail(function(error) {
            if (curId !== id) {
                return;
            }
            Alert.error(StatusMessageTStr.DeleteTableFailed, error);
        });
    }

    return WorkbookPreview;
}({}, jQuery));