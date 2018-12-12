namespace WorkbookPreview {
    let $workbookPreview: JQuery; // $("#workbookPreview")
    let modalHelper: ModalHelper;
    let curDagList: {name: string, id: string}[] = [];
    let id: string;
    let curWorkbookId: string;

    /**
     * WorkbookPreview.setup
     * initalize variables and add event handlers
     */
    export function setup(): void {
        $workbookPreview = $("#workbookPreview");
        modalHelper = new ModalHelper($workbookPreview);
        addEventListeners();
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
        showWorkbookBasicInfo(workbookId);
        return showWorkbookInfo(workbookId);
    };

    function addEventListeners(): void {
        // Temporary until delete tables is ready
        $workbookPreview.on("click", ".listSection .grid-unit", function() {
            const dag: {name: string, id: string} = getDagInfoFromEle(this);
            const workbookName: string = WorkbookManager.getWorkbook(curWorkbookId).getName();
            showDag(dag, workbookName);
        });

        $workbookPreview.on("click", ".title .label, .title .xi-sort", function() {
            const $title: JQuery = $(this).closest(".title");
            const $section: JQuery = $title.closest(".titleSection");
            let dagList: {name: string, id: string}[];

            if ($title.hasClass("active")) {
                dagList = reverseDagList(curDagList);
            } else {
                $section.find(".title.active").removeClass("active");
                $title.addClass("active");
                dagList = sortDagList(curDagList);
            }
            updateDagList(dagList);
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

    function getDagInfoFromEle(ele: JQuery): {name: string, id: string} {
        if (curDagList == null) {
            return null;
        }
        const id: string =  $(ele).closest(".grid-unit").data("id");
        const dagList = curDagList.filter((dagInfo) => {
            return dagInfo.id === id;
        });
        return dagList[0];
    }

    function reset(): void {
        curDagList = [];
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

    function showWorkbookBasicInfo(workbookId: string): void {
        const $section: JQuery = $workbookPreview.find(".infoSection");
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        $section.find(".name .text").text(workbook.getName());
    }

    function showWorkbookInfo(workbookId: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const curId: string = id;
        const workbookName: string = WorkbookManager.getWorkbook(workbookId).getName();
        let totalSize: number;
        $workbookPreview.addClass("loading");

        getTotalTableSize(workbookName)
        .then((res) => {
            totalSize = res;
            return getDagListAsync(workbookName);
        })
        .then(function(dagRes) {
            if (curId === id) {
                updateTotalSize(<string>xcHelper.sizeTranslator(totalSize));
                curDagList = dagRes ? dagRes.dags : null;
                updateDagList(curDagList);
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

    function handleError(error: string|object): void {
        const errorMsg: string = xcHelper.parseError(error);
        $workbookPreview.find(".errorSection").text(errorMsg);
        $workbookPreview.addClass("error");
    }

    function getDagListAsync(workbookName: string): XDPromise<{dags: {name: string, id: string}[]}> {
        const currentSession: string = sessionName;
        setSessionName(workbookName);
        const promise = DagList.Instance.listUserDagAsync();
        setSessionName(currentSession);
        return promise;
    }

    function sortDagList(dagList: {name: string, id: string}[]): {name: string, id: string}[] {
        // sort by name
        dagList.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
        return dagList;
    }

    function reverseDagList(dagList: {name: string, id: string}[]) {
        dagList.reverse();
        return dagList;
    }

    function updateDagList(dagList: {name: string, id: string}[]): void {
        dagList = dagList || [];
        let html: HTML = dagList.map(function(dagInfo) {
            return '<div class="grid-unit" data-id="' + dagInfo.id + '">' +
                        '<div class="name tooltipOverflow"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + dagInfo.name + '"' +
                        '>' +
                            '<i class="view icon xi-dfg2 fa-15"></i>' +
                            '<span class="text">' + dagInfo.name + '</span>' +
                        '</div>' +
                    '</div>';
        }).join("");
        $workbookPreview.find(".listSection").html(html);
    }

    function getTotalTableSize(workbookName: string): XDPromise<number> {
        const deferred: XDDeferred<number> = PromiseHelper.deferred();
        const currentSession: string = sessionName;
        setSessionName(workbookName);
        const def = XcalarGetTables("*");
        setSessionName(currentSession);

        def
        .then((res) => {
            const nodeInfo: {size: number}[] = res.nodeInfo;
            const totalSize: number = nodeInfo.reduce((accumulator, node) => {
                return accumulator + node.size;
            }, 0);
            deferred.resolve(totalSize);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX Will not support in Dio
    function showDag(dagInfo: {name: string, id: string}, workbookName: string): XDPromise<void> {
        return PromiseHelper.resolve();
        
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const curId: string = id;
        const html: HTML = '<div class="dataflowArea clearfix"></div>';
        const $dfArea: JQuery = $(html);
        $workbookPreview.addClass("dagMode")
                        .find(".dagSection").append($dfArea);
        
        const dagTab: DagTabUser = new DagTabUser(dagInfo.name, dagInfo.id);
        loadDag(dagTab, workbookName)
        .then(() => {
            if (curId === id) {
                // DagView.draw($dfArea, dagTab.getGraph());
                // // remove "click to see options" tooltips
                // const $tooltipTables: JQuery = $dagWrap.find('.dagTableIcon, ' +
                //                                     '.dataStoreIcon');
                // xcTooltip.disable($tooltipTables);
                // // Dag.addEventListeners($dagWrap);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error(error);
            if (curId === id) {
                $dfArea.html('<div class="errorMsg">' +
                                DFTStr.DFDrawError +
                              '</div>');
            }
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function loadDag(dag: DagTabUser, workbookName: string): XDPromise<void> {
        const currentSession: string = sessionName;
        setSessionName(workbookName);
        const promise = dag.load();
        setSessionName(currentSession);
        return promise;

    }

    function closeDag(): void {
        $workbookPreview.removeClass("dagMode")
                        .find(".dagSection").empty();
    }
}