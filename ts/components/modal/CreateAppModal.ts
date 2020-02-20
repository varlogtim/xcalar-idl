class CreateAppModal {
    private static _instance: CreateAppModal;
    private _modalHelper: ModalHelper;
    private _graphMap: Map<number, Set<DagNodeModule>>
    private _isOpen =false;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            noBackground: true,
            offscreenDraggable: true
        });
        this._addEventListeners();
    }

    private _getModal() {
        return $("#createAppModal");
    }

    public show() {
        if (this._isOpen) {
            return;
        }
        const {graph, disjointGraphs} = DagViewManager.Instance.getDisjointGraphs();
        this._renderGraphList(disjointGraphs);
        let index = 0;
        this._graphMap = new Map();
        disjointGraphs.forEach((moduleNodes) => {
            this._graphMap.set(index, moduleNodes);
            index++;
        });
        this._modalHelper.setup();
        this._isOpen = true;
    }

    private _close() {
        this._reset();
        this._modalHelper.clear();
        this._isOpen = false;
    }

    private _reset() {
        let $modal = this._getModal();
        $modal.find(".graphList").empty();
        $modal.find(".newName").val("");
        this._graphMap = null;
    }

    private _addEventListeners() {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".listWrap .listInfo", (event) => {
            const $list = $(event.currentTarget).closest(".listWrap");
            $list.toggleClass("active");
        });

        $modal.on("click", ".graphList .checkbox", (event) => {
            const $checkbox = $(event.target).closest(".checkbox");
            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
            } else {
                $modal.find(".graphList .checkbox").removeClass("checked");
                $checkbox.addClass("checked");
            }
        });

        $modal.on("click", ".confirm", () => {
            this._submit();
        })
    }

    private _renderGraphList(disjointGraphs) {
        let html: HTML = "";
        let index = 0;
        disjointGraphs.forEach((moduleNodes) => {
            html += `<div class="row" data-index=${index}>
                        <div class="checkbox">
                            <i class="icon xi-ckbox-empty"></i>
                            <i class="icon xi-ckbox-selected"></i>
                        </div>
                        <div class="graphInfo listWrap xc-expand-list active">
                            <div class="graphName listInfo">
                                <span class="text">Execution Plan ${index + 1}</span>
                                <span class="expand">
                                    <i class="icon xi-down fa-12"></i>
                                </span>
                            </div>
                            <ul class="graphSubList">`;

            // list all modules that are part of the disjointGraph
            moduleNodes.forEach((moduleNode) => {
                const fnName = moduleNode.getFnName();
                html += `<li><div class="name">${fnName}<div></li>`;
            });
            html += `</ul></div></div>`;
            index++;
        });
        if (!html) {
            html = `<div class="emptyMsg">No module functions found.</div>`;
        }
        this._getModal().find(".graphList").html(html);
    }

    private _submit() {
        const $modal = this._getModal();
        const $input = $modal.find(".newName");
        const $checkbox = $modal.find(".graphList .checkbox.checked");
        if (!$checkbox.length) {
            StatusBox.show("No execution plan selected.", $modal.find(".modalMain"));
            return false;
        }

        const newName: string = $input.val().trim();

        const error: string = DagList.Instance.validateName(newName, false);
        if (error) {
            StatusBox.show(error, $input);
            return false;
        }
        const moduleNodes = this._graphMap.get($checkbox.closest(".row").data("index"));
        const moduleMap: Map<string, DagNodeModule[]> = new Map();
        moduleNodes.forEach(moduleNode => {
            let dagTab = moduleNode.getTab();
            if (!moduleMap.get(dagTab.getId())) {
                moduleMap.set(dagTab.getId(), []);
            }
            moduleMap.get(dagTab.getId()).push(moduleNode);
        });
        const graph = DagViewManager.Instance.buildModuleGraph(moduleMap);

        AppList.Instance.createApp(newName, graph);
        setTimeout(() => {
            xcUIHelper.showSuccess("App Created.");
        }, 300);

        this._close();
        return true;
    }
}