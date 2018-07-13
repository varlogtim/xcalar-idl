(function($) {
    console.log("dynamic patch 1.4.0 loaded");

    // hot patch sup ticket modal
    SupTicketModal.fetchLicenseInfo = function() {
        var deferred = PromiseHelper.deferred();
        adminTools.getLicense()
        .then(function(data) {
            var key = data.logs || "";
            jQuery.ajax({
                "type": "GET",
                "url": "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/keyinfo/"
                        + adminTools.compressLicenseKey(key),
                success: function(data) {
                    if (data.hasOwnProperty("ExpirationDate")) {
                        deferred.resolve({"key": key,
                                          "expiration": data.ExpirationDate,
                                          "organization": data.LicensedTo});
                    } else {
                        deferred.reject();
                    }
                },
                error: function(error) {
                    deferred.reject(error);
                }
            });
        })
        .fail(function(err) {
            deferred.reject(err);
        });
        return deferred.promise();
    };

    // hot patch workbook preview
    (function (WorkbookPreview) {
        let $workbookPreview; // $("#workbookPreview")
        let modalHelper;
        let curTableList = [];
        let id;
        let curWorkbookId;
        /**
         * WorkbookPreview.setup
         * initalize variables and add event handlers
         */
        function setup() {
            $workbookPreview = $("#workbookPreview");
            modalHelper = new ModalHelper($workbookPreview);
            addEvents();
        }
        WorkbookPreview.setup = setup;
        ;
        /**
         * WorkbookPreview.show
         * Show the workbook preview modal
         * @param workbookId - id of the workbook to be shown
         */
        function show(workbookId) {
            id = xcHelper.randName("worbookPreview");
            curWorkbookId = workbookId;
            modalHelper.setup();
            reset();
            showWorkbookInfo(workbookId);
            return showTableInfo(workbookId);
        }
        WorkbookPreview.show = show;
        ;
        function addEvents() {
            // Temporary until delete tables is ready
            $workbookPreview.on("click", ".listSection .grid-unit", function () {
                // $workbookPreview.on("click", ".listSection .view, .listSection .name", function() {
                const tableName = getTableNameFromEle(this);
                const workbookName = WorkbookManager.getWorkbook(curWorkbookId).getName();
                showDag(tableName, workbookName);
            });
            $workbookPreview.on("click", ".title .label, .title .xi-sort", function () {
                const $title = $(this).closest(".title");
                const sortKey = $title.data("sortkey");
                const $section = $title.closest(".titleSection");
                let tableList;
                if ($title.hasClass("active")) {
                    tableList = reverseTableList(curTableList);
                }
                else {
                    $section.find(".title.active").removeClass("active");
                    $title.addClass("active");
                    tableList = sortTableList(curTableList, sortKey);
                }
                updateTableList(tableList);
            });
            // $workbookPreview.on("click", ".delete", function() {
            //     var tableName = getTableNameFromEle(this);
            //     deleteTable(tableName);
            // });
            $workbookPreview.on("click", ".back", function () {
                closeDag();
            });
            $workbookPreview.on("click", ".close, .cancel", function () {
                closeModal();
            });
            $workbookPreview.on("mouseenter", ".tooltipOverflow", function () {
                xcTooltip.auto(this);
            });
        }
        function getTableNameFromEle(ele) {
            return $(ele).closest(".grid-unit").find(".name").data("title");
        }
        function reset() {
            curTableList = [];
            $workbookPreview.find(".title.active").removeClass("active");
            updateTotalSize("--");
        }
        function closeModal() {
            modalHelper.clear();
            $workbookPreview.removeClass("loading error");
            $workbookPreview.find(".errorSection").empty();
            $workbookPreview.find(".listSection").empty();
            closeDag();
            curWorkbookId = null;
        }
        function updateTotalSize(size) {
            $workbookPreview.find(".infoSection .size .text").text(size);
        }
        function showWorkbookInfo(workbookId) {
            const $section = $workbookPreview.find(".infoSection");
            const workbook = WorkbookManager.getWorkbook(workbookId);
            $section.find(".name .text").text(workbook.getName());
        }
        function showTableInfo(workbookId) {
            const deferred = PromiseHelper.deferred();
            let nodeInfo;
            const curId = id;
            const workbookName = WorkbookManager.getWorkbook(workbookId).getName();
            const currentSession = sessionName;
            $workbookPreview.addClass("loading");
            setSessionName(workbookName);
            XcalarGetTables("*")
                .then(function (res) {
                nodeInfo = res.nodeInfo;
                return getTableKVStoreMeta(workbookName);
            })
                .then(function (tableMeta, wsInfo) {
                if (curId === id) {
                    curTableList = getTableList(nodeInfo, tableMeta, wsInfo);
                    // sort by status
                    const tableList = sortTableList(curTableList, "status");
                    updateTableList(tableList);
                }
                deferred.resolve();
            })
                .fail(function (error) {
                if (curId === id) {
                    handleError(error);
                }
                deferred.reject(error);
            })
                .always(function () {
                if (curId === id) {
                    $workbookPreview.removeClass("loading");
                }
            });
            setSessionName(currentSession);
            return deferred.promise();
        }
        function handleError(error) {
            const errorMsg = xcHelper.parseError(error);
            $workbookPreview.find(".errorSection").text(errorMsg);
            $workbookPreview.addClass("error");
        }
        function getTableKVStoreMeta(workbookName) {
            const deferred = PromiseHelper.deferred();
            const currentSession = sessionName;
            if (workbookName === currentSession) {
                deferred.resolve(gTables, getWSInfo(WSManager.getAllMeta()));
                return deferred.promise();
            }
            const key = WorkbookManager.getStorageKey();
            const kvStore = new KVStore(key, gKVScope.WKBK);
            setSessionName(workbookName);
            kvStore.getAndParse()
                .then(function (res) {
                try {
                    const metaInfos = new METAConstructor(res);
                    const wsInfo = getWSInfo(metaInfos.getWSMeta());
                    deferred.resolve(metaInfos.getTableMeta(), wsInfo);
                }
                catch (e) {
                    console.error(e);
                    deferred.resolve({}); // still resolve
                }
            })
                .fail(function (error) {
                console.error(error);
                deferred.resolve({}); // still resolve
            });
            setSessionName(currentSession);
            return deferred.promise();
        }
        function getWSInfo(wsMeta) {
            const res = {};
            try {
                const worksheets = wsMeta.wsInfos;
                for (let wsId in worksheets) {
                    const wsName = worksheets[wsId].name;
                    const tables = worksheets[wsId].tables;
                    for (let i = 0; i < tables.length; i++) {
                        const tableId = tables[i];
                        res[tableId] = wsName;
                    }
                }
                return res;
            }
            catch (e) {
                console.error(e);
                return res;
            }
        }
        function getTableList(nodeInfo, tableMeta, wsInfo) {
            return nodeInfo.map(function (node) {
                const tableName = node.name;
                const size = xcHelper.sizeTranslator(node.size);
                const tableId = xcHelper.getTableId(tableName);
                const status = tableMeta.hasOwnProperty(tableId)
                    ? tableMeta[tableId].status
                    : TableType.Orphan;
                const worksheet = (wsInfo && wsInfo.hasOwnProperty(tableId))
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
                tableList.sort(function (a, b) {
                    const sizeA = a.sizeInNum;
                    const sizeB = b.sizeInNum;
                    if (sizeA === sizeB) {
                        return a.name.localeCompare(b.name);
                    }
                    else if (sizeA > sizeB) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                });
            }
            else if (key === "status") {
                // sort on status
                tableList.sort(function (a, b) {
                    if (a.status === b.status) {
                        return a.name.localeCompare(b.name);
                    }
                    else {
                        return a.status.localeCompare(b.status);
                    }
                });
            }
            else if (key === "worksheet") {
                // sort on worksheet
                tableList.sort(function (a, b) {
                    if (a.worksheet === b.worksheet) {
                        return a.name.localeCompare(b.name);
                    }
                    else {
                        return a.worksheet.localeCompare(b.worksheet);
                    }
                });
            }
            else {
                // sort by name
                tableList.sort(function (a, b) {
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
            let totalSize = 0;
            let html = tableList.map(function (tableInfo) {
                totalSize += tableInfo.sizeInNum;
                return '<div class="grid-unit">' +
                    '<div class="name tooltipOverflow"' +
                    ' data-toggle="tooltip" data-container="body"' +
                    ' data-placement="top"' +
                    ' data-title="' + tableInfo.name + '"' +
                    '>' +
                    '<i class="view icon xi-dfg2 fa-15"></i>' +
                    '<span class="text">' + tableInfo.name + '</span>' +
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
                    ' data-title="' + xcTooltip.escapeHTML(tableInfo.worksheet) + '"' +
                    '>' +
                    xcHelper.escapeHTMLSpecialChar(tableInfo.worksheet) +
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
            updateTotalSize(xcHelper.sizeTranslator(totalSize));
        }
        function showDag(tableName, workbookName) {
            const deferred = PromiseHelper.deferred();
            const curId = id;
            const html = '<div class="dagWrap clearfix">' +
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
            const $dagWrap = $(html);
            $workbookPreview.addClass("dagMode")
                .find(".dagSection").append($dagWrap);
            const currentSession = sessionName;
            setSessionName(workbookName);
            XcalarGetDag(tableName, workbookName)
                .then(function (dagObj) {
                if (curId === id) {
                    DagDraw.createDagImage(dagObj.node, $dagWrap);
                    // remove "click to see options" tooltips
                    const $tooltipTables = $dagWrap.find('.dagTableIcon, ' +
                        '.dataStoreIcon');
                    xcTooltip.disable($tooltipTables);
                    Dag.addEventListeners($dagWrap);
                }
                deferred.resolve();
            })
                .fail(function (error) {
                console.error(error);
                if (curId === id) {
                    $dagWrap.html('<div class="errorMsg">' +
                        DFTStr.DFDrawError +
                        '</div>');
                }
                deferred.reject(error);
            });
            setSessionName(currentSession);
            return deferred.promise();
        }
        function closeDag() {
            $workbookPreview.removeClass("dagMode")
                .find(".dagSection").empty();
        }
    })(WorkbookPreview || (WorkbookPreview = {}));
}(jQuery));