namespace WorkbookPreview {
    let $workbookPreview: JQuery; // $("#workbookPreview")
    let modalHelper: ModalHelper;
    let curTableList: object[] = [];
    let id: string;
    let curWorkbookId: string;

    /**
     * WorkbookPreview.setup
     * initalize variables and add event handlers
     */
    export function setup(): void {
        $workbookPreview = $("#workbookPreview");
        modalHelper = new ModalHelper($workbookPreview);

        addEvents();
    };

    /**
     * WorkbookPreview.show
     * Show the workbook preview modal
     * @param workbookId - id of the workbook to be shown
     */
    export function show(workbookId: string): XDPromise<void> {
        id = xcHelper.randName("worbookPreview");
        curWorkbookId = workbookId;
        modalHelper.setup();
        reset();
        showWorkbookInfo(workbookId);
        return showTableInfo(workbookId);
    };

    function addEvents(): void {
        // Temporary until delete tables is ready
        $workbookPreview.on("click", ".listSection .grid-unit", function() {
        // $workbookPreview.on("click", ".listSection .view, .listSection .name", function() {
            const tableName: string = getTableNameFromEle(this);
            const workbookName: string = WorkbookManager.getWorkbook(curWorkbookId).getName();
            showDag(tableName, workbookName);
        });

        $workbookPreview.on("click", ".title .label, .title .xi-sort", function() {
            const $title: JQuery = $(this).closest(".title");
            const sortKey: string = $title.data("sortkey");
            const $section: JQuery = $title.closest(".titleSection");
            let tableList: object[];

            if ($title.hasClass("active")) {
                tableList = reverseTableList(curTableList);
            } else {
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

    function getTableNameFromEle(ele: JQuery): string {
        return $(ele).closest(".grid-unit").find(".name").data("title");
    }

    function reset(): void {
        curTableList = [];
        $workbookPreview.find(".title.active").removeClass("active");
        updateTotalSize("--");
    }

    function closeModal(): void {
        modalHelper.clear();
        $workbookPreview.removeClass("loading error");
        $workbookPreview.find(".errorSection").empty();
        $workbookPreview.find(".listSection").empty();
        closeDag();
        curWorkbookId = null;
    }

    function updateTotalSize(size: string): void {
        $workbookPreview.find(".infoSection .size .text").text(size);
    }

    function showWorkbookInfo(workbookId: string): void {
        const $section: JQuery = $workbookPreview.find(".infoSection");
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        $section.find(".name .text").text(workbook.getName());
    }

    function showTableInfo(workbookId: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let nodeInfo: any[];
        const curId: string = id;
        const workbookName: string = WorkbookManager.getWorkbook(workbookId).getName();
        const currentSession: string = sessionName;
        $workbookPreview.addClass("loading");
        setSessionName(workbookName);

        XcalarGetTables("*")
        .then(function(res) {
            nodeInfo = res.nodeInfo;
            return getTableKVStoreMeta(workbookName);
        })
        .then(function(tableMeta, wsInfo) {
            if (curId === id) {
                curTableList = getTableList(nodeInfo, tableMeta, wsInfo);
                // sort by status
                const tableList: object[] = sortTableList(curTableList, "status");
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

        setSessionName(currentSession);
        return deferred.promise();
    }

    function handleError(error: string|object): void {
        const errorMsg: string = xcHelper.parseError(error);
        $workbookPreview.find(".errorSection").text(errorMsg);
        $workbookPreview.addClass("error");
    }

    function getTableKVStoreMeta(workbookName: string): XDPromise<{}> {
        const deferred: XDDeferred<{}> = PromiseHelper.deferred();
        const currentSession: string = sessionName;

        if (workbookName === currentSession) {
            deferred.resolve(gTables, getWSInfo(WSManager.getAllMeta()));
            return deferred.promise();
        }

        const key: string = WorkbookManager.getStorageKey();
        const kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        setSessionName(workbookName);

        kvStore.getAndParse()
        .then(function(res) {
            try {
                const metaInfos: METAConstructor = new METAConstructor(res);
                const wsInfo: object = getWSInfo(metaInfos.getWSMeta());
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

        setSessionName(currentSession);
        return deferred.promise();
    }

    function getWSInfo(wsMeta: WSMETA): object {
        const res: object = {};
        try {
            const worksheets: Set<WorksheetObj> = wsMeta.wsInfos;
            for (let wsId in worksheets) {
                const wsName: string = worksheets[wsId].name;
                const tables: string[] = worksheets[wsId].tables;
                for (let i: number = 0; i < tables.length; i++) {
                    const tableId: string = tables[i];
                    res[tableId] = wsName;
                }
            }
            return res;
        } catch (e) {
            console.error(e);
            return res;
        }
    }

    function getTableList(nodeInfo: any[], tableMeta: object, wsInfo: WorksheetObj): object[] {
        return nodeInfo.map(function(node) {
            const tableName: string = node.name;
            const size: string = <string>xcHelper.sizeTranslator(node.size);
            const tableId: string|number = xcHelper.getTableId(tableName);
            const status: string = tableMeta.hasOwnProperty(tableId)
                        ? tableMeta[tableId].status
                        : TableType.Orphan;
            const worksheet: WorksheetObj = (wsInfo && wsInfo.hasOwnProperty(tableId))
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

    function sortTableList(tableList: any[], key: string) {
        if (key === "size") {
            // sort on size
            tableList.sort(function(a, b) {
                const sizeA: number = a.sizeInNum;
                const sizeB: number = b.sizeInNum;
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

    function reverseTableList(tableList: object[]) {
        tableList.reverse();
        return tableList;
    }

    function updateTableList(tableList): void {
        let totalSize: number = 0;
        let html: string = tableList.map(function(tableInfo) {
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
        updateTotalSize(<string>xcHelper.sizeTranslator(totalSize));
    }

    // function deleteTable(tableName) {
    //     Alert.show({
    //         title: TblTStr.DropTbl,
    //         msg: SideBarTStr.DelTablesMsg,
    //         onConfirm: function() {
    //             submitDropTable(tableName);
    //         }
    //     });
    // }

    // function submitDropTable(tableName) {
    //     var tableList = curTableList;
    //     var curId = id;

    //     XcalarDeleteTable(tableName)
    //     .then(function() {
    //         if (curId !== id) {
    //             return;
    //         }
    //         curTableList = tableList.filter(function(tableInfo) {
    //             return tableInfo.name !== tableName;
    //         });
    //         xcHelper.showRefreshIcon($workbookPreview.find(".listSection"));
    //         updateTableList(curTableList);
    //     })
    //     .fail(function(error) {
    //         if (curId !== id) {
    //             return;
    //         }
    //         Alert.error(StatusMessageTStr.DeleteTableFailed, error);
    //     });
    // }

    function showDag(tableName: string, workbookName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const curId: string = id;
        const html: string = '<div class="dagWrap clearfix">' +
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
        const $dagWrap: JQuery = $(html);
        $workbookPreview.addClass("dagMode")
                        .find(".dagSection").append($dagWrap);
        const currentSession: string = sessionName;
        setSessionName(workbookName);

        XcalarGetDag(tableName, workbookName)
        .then(function(dagObj) {
            if (curId === id) {
                DagDraw.createDagImage(dagObj.node, $dagWrap);
                // remove "click to see options" tooltips
                const $tooltipTables: JQuery = $dagWrap.find('.dagTableIcon, ' +
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

        setSessionName(currentSession);
        return deferred.promise();
    }

    function closeDag(): void {
        $workbookPreview.removeClass("dagMode")
                        .find(".dagSection").empty();
    }
}