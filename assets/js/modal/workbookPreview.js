window.WorkbookPreview = (function(WorkbookPreview, $) {
    var $workbookPreview; // $("#workbookPreview")
    var modalHelper;
    var curTableList = [];
    var id;
    var curWorkbookId;

    WorkbookPreview.setup = function() {
        $workbookPreview = $("#workbookPreview");
        modalHelper = new ModalHelper($workbookPreview);

        addEvents();
    };

    WorkbookPreview.show = function(workbookId) {
        id = xcHelper.randName("worbookPreview");
        curWorkbookId = workbookId;
        modalHelper.setup();
        reset();
        showWorkbookInfo(workbookId);
        return showTableInfo(workbookId);
    };

    function addEvents() {
        $workbookPreview.on("click", ".listSection .view, .listSection .name", function() {
            var tableName = getTableNameFromEle(this);
            var workbookName = WorkbookManager.getWorkbook(curWorkbookId).getName();
            showDag(tableName, workbookName);
        });

        $workbookPreview.on("click", ".title .label, .title .xi-sort", function() {
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

        $workbookPreview.on("click", ".back", function() {
            closeDag();
        });

        $workbookPreview.on("click", ".close, .cancel", function() {
            closeModal();
        });

        $workbookPreview.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    }

    function getTableNameFromEle(ele) {
        return $(ele).closest(".grid-unit").find(".name").text();
    }

    function reset() {
        curTableList = [];
        $workbookPreview.find(".title.active").removeClass("active");
    }

    function closeModal() {
        modalHelper.clear();
        $workbookPreview.removeClass("loading error");
        $workbookPreview.find(".errorSection").empty();
        $workbookPreview.find(".listSection").empty();
        closeDag();
        curWorkbookId = null;
    }

    function showWorkbookInfo(workbookId) {
        var $section = $workbookPreview.find(".infoSection");
        var workbook = WorkbookManager.getWorkbook(workbookId);
        $section.find(".name .text").text(workbook.getName());
    }

    function showTableInfo(workbookId) {
        var deferred = jQuery.Deferred();
        var nodeInfo;
        var curId = id;
        var workbookName = WorkbookManager.getWorkbook(workbookId).getName();

        $workbookPreview.addClass("loading");

        XcalarGetTables("*", workbookName)
        .then(function(res) {
            nodeInfo = res.nodeInfo;
            return getTableKVStoreMeta(workbookId);
        })
        .then(function(tableMeta, wsInfo) {
            if (curId === id) {
                curTableList = getTableList(nodeInfo, tableMeta, wsInfo);
                // sort by status
                var tableList = sortTableList(curTableList, "status");
                updateTableList(tableList);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (curId === id) {
                handleError(error);
            }
            deferred.reject(error);
        })
        .always(function() {
            if (curId === id) {
                $workbookPreview.removeClass("loading");
            }
        });
        return deferred.promise();
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
                var wsInfo = getWSInfo(metaInfos.getWSMeta());
                deferred.resolve(metaInfos.getTableMeta(), wsInfo);
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

    function getWSInfo(wsMeta) {
        var res = {};
        try {
            var worksheets = wsMeta.wsInfos;
            for (var wsId in worksheets) {
                var wsName = worksheets[wsId].name;
                var tables = worksheets[wsId].tables;
                for (var i = 0; i < tables.length; i++) {
                    var tableId = tables[i];
                    res[tableId] = wsName;
                }
            }
            return res;
        } catch (e) {
            console.error(e);
            return res;
        }
    }

    function getTableList(nodeInfo, tableMeta, wsInfo) {
        return nodeInfo.map(function(node) {
            var tableName = node.name;
            var size = xcHelper.sizeTranslator(node.size);
            var tableId = xcHelper.getTableId(tableName);
            var status = tableMeta.hasOwnProperty(tableId)
                        ? tableMeta[tableId].status
                        : TableType.Orphan;
            var worksheet = (wsInfo && wsInfo.hasOwnProperty(tableId))
                            ? wsInfo[tableId]
                            : "--";
            return {
                name: tableName,
                size: size,
                status: status,
                sizeInNum: node.size,
                worksheet: worksheet
            };
        });
    }

    function sortTableList(tableList, key) {
        if (key === "size") {
            // sort on size
            tableList.sort(function(a, b) {
                var sizeA = a.sizeInNum;
                var sizeB = b.sizeInNum;
                if (sizeA === sizeB) {
                    return a.name.localeCompare(b.name);
                } else if (sizeA > sizeB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        } else if (key === "status") {
            // sort on status
            tableList.sort(function(a, b) {
                if (a.status === b.status) {
                    return a.name.localeCompare(b.name);
                } else {
                    return a.status.localeCompare(b.status);
                }
            });
        } else if (key === "worksheet"){
            // sort on worksheet
            tableList.sort(function(a, b) {
                if (a.worksheet === b.worksheet) {
                    return a.name.localeCompare(b.name);
                } else {
                    return a.worksheet.localeCompare(b.worksheet);
                }
            });
        } else {
            // sort by name
            tableList.sort(function(a, b) {
                return a.name.localeCompare(b.name);
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
                        '<div class="view">' +
                            '<i class="view icon xc-action xi-dfg2 fa-15"' +
                            ' data-toggle="tooltip" data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + TooltipTStr.OpenQG + '"' +
                            '></i>' +
                        '</div>' +
                        '<div class="name xc-action tooltipOverflow"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + tableInfo.name + '"' +
                        '>' +
                            tableInfo.name +
                        '</div>' +
                        '<div class="size">' +
                            tableInfo.size +
                        '</div>' +
                        '<div class="status">' +
                            (tableInfo.status === TableType.Active
                            ? TblTStr.ActiveStatus
                            : TblTStr.TempStatus) +
                        '</div>' +
                        '<div class="worksheet tooltipOverflow"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + tableInfo.worksheet + '"' +
                        '>' +
                            tableInfo.worksheet +
                        '</div>' +
                        '<div class="action">' +
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
            xcHelper.showRefreshIcon($workbookPreview.find(".listSection"));
            updateTableList(curTableList);
        })
        .fail(function(error) {
            if (curId !== id) {
                return;
            }
            Alert.error(StatusMessageTStr.DeleteTableFailed, error);
        });
    }

    function showDag(tableName, workbookName) {
        var deferred = jQuery.Deferred();
        var curId = id;
        var html = '<div class="dagWrap clearfix">' +
                    '<div class="header clearfix">' +
                        '<div class="btn infoIcon">' +
                            '<i class="icon xi-info-rectangle"></i>' +
                        '</div>' +
                        '<div class="tableTitleArea">' +
                            '<span>Table: </span>' +
                            '<span class="tableName">' +
                                tableName +
                            '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        var $dagWrap = $(html);
        $workbookPreview.addClass("dagMode")
                        .find(".dagSection").append($dagWrap);

        XcalarGetDag(tableName, workbookName)
        .then(function(dagObj) {
            if (curId === id) {
                DagDraw.createDagImage(dagObj.node, $dagWrap);
                // remove "click to see options" tooltips
                var $tooltipTables = $dagWrap.find('.dagTableIcon, ' +
                                                    '.dataStoreIcon');
                xcTooltip.disable($tooltipTables);
                Dag.addEventListeners($dagWrap);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error(error);
            if (curId === id) {
                $dagWrap.html('<div class="errorMsg">' +
                                DFTStr.DFDrawError +
                              '</div>');
            }
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function closeDag() {
        $workbookPreview.removeClass("dagMode")
                        .find(".dagSection").empty();
    }

    return WorkbookPreview;
}({}, jQuery));