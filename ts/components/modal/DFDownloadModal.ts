class DFDownloadModal {
    private static _instance: DFDownloadModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _downloadType: string;
    private _dagTab: DagTab;
    private _selectedNodes: DagNodeId[];
    private _modalHelper: ModalHelper;
    private _model: {type: string, text: string, suffix: string}[];
    private readonly _DownloadTypeEnum = {
        DF: "DF",
        OptimziedDF: "OptimizedDF",
        Image: "Image",
        OperationStats: "Operation Statistics"
    };

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
        this._setupModel();
        this._renderDropdown();
    }

    public show(dagTab: DagTab, nodeIds?: DagNodeId[]): void {
        if (nodeIds != null) {
            this._selectedNodes = nodeIds;
        }

        this._dagTab = dagTab;
        this._modalHelper.setup();
        this._initialize();
    }

    private _close() {
        const $modal: JQuery = this._getModal();
        this._modalHelper.clear();
        this._dagTab = null;
        this._selectedNodes = null;
        this._downloadType = null;
        $modal.find("input").val("");
    }

    private _getModal(): JQuery {
        return $("#dfDownloadModal");
    }

    private _getDownloadTypeList(): JQuery {
        return this._getModal().find(".format .dropDownList");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find(".name input");
    }

    private _setupModel(): void {
        this._model = [{
            type: this._DownloadTypeEnum.DF,
            text: DFTStr.DF,
            suffix: gDFSuffix
        }, {
            type: this._DownloadTypeEnum.OptimziedDF,
            text: DFTStr.OptimizedDF,
            suffix: gDFSuffix
        }, {
            type: this._DownloadTypeEnum.Image,
            text: "Image",
            suffix: ".png"
        },
        {
            type: this._DownloadTypeEnum.OperationStats,
            text: "Operation Statistics",
            suffix: ".json"
        }];
    }

    private _renderDropdown(): void {
        const lis: HTML = this._model.map((typeInfo) => {
            return `<li data-type="${typeInfo.type}">${typeInfo.text} (${typeInfo.suffix})`;
        }).join("");
        const $dropdown: JQuery = this._getDownloadTypeList();
        $dropdown.find("ul").html(lis);
    }

    private _initialize(): void {
        const $dropdown: JQuery = this._getDownloadTypeList();
        const $lis: JQuery = $dropdown.find("li");
        $lis.removeClass("xc-disabled");
        if (this._dagTab instanceof DagTabCustom ||
            this._dagTab instanceof DagTabSQL
        ) {
            $lis.filter((_index, el) => {
                return $(el).data("type") !== this._DownloadTypeEnum.Image;
            }).addClass("xc-disabled");
        }

        // XXX TODO: support download parial dataflow as image
        if (this._selectedNodes != null) {
            // when selecte parital nodes, disable download as image
            $lis.filter((_index, el) => {
                return $(el).data("type") === this._DownloadTypeEnum.Image;
            }).addClass("xc-disabled");
        }
        // select the first valid option by default
        $dropdown.find("li:not(.xc-disabled)").eq(0).trigger(fakeEvent.mouseup);
        this._getNameInput().val(this._dagTab.getName().replace(/\//g, "_"));
    }

    private _validate(): {name: string} {
        const $nameInput: JQuery = this._getNameInput();
        const name: string = $nameInput.val().trim();
        const isValid: boolean = xcHelper.validate([{
            $ele: this._getDownloadTypeList().find(".text")
        }, {
            $ele: $nameInput
        }]);

        if (!isValid) {
            return null;
        }
        return {
            name: name
        };
    }

    private _submitForm(): XDPromise<void> {
        const res: {name: string} = this._validate();
        if (res == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $confirmBtn: JQuery = this._getModal().find(".confirm");
        xcHelper.toggleBtnInProgress($confirmBtn, false);
        this._lock();

        this._downloadHelper(res.name)
        .then(() => {
            this._close();
            deferred.resolve();
        })
        .fail((error) => {
            const errMsg: string = error.error || ErrTStr.Unknown;
            StatusBox.show(errMsg, $confirmBtn, false, {
                detail: error.log
            });
            deferred.reject(error);
        })
        .always(() => {
            this._unlock();
            xcHelper.toggleBtnInProgress($confirmBtn, false);
        });

        return deferred.promise();
    }

    private _lock() {
        this._getModal().addClass("locked");
    }

    private _unlock() {
        this._getModal().removeClass("locked");
    }

    private _downloadHelper(name): XDPromise<void> {
        switch (this._downloadType) {
            case this._DownloadTypeEnum.DF:
                return this._downloadDataflow(name, false);
            case this._DownloadTypeEnum.OptimziedDF:
                return this._downloadDataflow(name, true);
            case this._DownloadTypeEnum.Image:
                return this._downloadImage(name);
            case this._DownloadTypeEnum.OperationStats:
                return this._downloadStats(name);
            default:
                return PromiseHelper.reject("Invalid download type");
        }
    }

    private _downloadDataflow(name: string, optimized: boolean): XDPromise<void> {
        const tab: DagTab = this._dagTab;
        if (tab instanceof DagTabUser) {
            return this._downloadUserDataflow(name, optimized);
        } else if (tab instanceof DagTabPublished) {
            return this._downloadSharedDataflow(name, optimized);
        } else {
            return PromiseHelper.reject({error: ErrTStr.InvalidDFDownload});
        }
    }

    private _downloadUserDataflow(
        name: string,
        optimized: boolean
    ): XDPromise<void> {
        const tab: DagTabUser = <DagTabUser>this._dagTab;
        const clonedTab: DagTabUser = tab.clone();
        this._cleanupNodes(clonedTab.getGraph(), this._selectedNodes);
        return clonedTab.download(name, optimized);
    }

    private _downloadSharedDataflow(
        name: string,
        optimized: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const tab: DagTabPublished = <DagTabPublished>this._dagTab;
        const tempName = xcHelper.randName(".temp" + tab.getShortName());
        const clonedTab: DagTabPublished = new DagTabPublished(tempName);
        let hasClone: boolean = false;

        tab.clone(tempName)
        .then(() => {
            hasClone = true;
            return clonedTab.load();
        })
        .then(() => {
            this._cleanupNodes(clonedTab.getGraph(), this._selectedNodes);
            return clonedTab.save();
        })
        .then(() => {
            return clonedTab.download(name, optimized);
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            if (hasClone) {
                clonedTab.delete();
            }
        });

        return deferred.promise();

    }

    private _cleanupNodes(graph: DagGraph, selectedNodes: DagNodeId[]): void {
        let partialSelection = (selectedNodes != null);
        let nodeToInclude: Map<DagNodeId, DagNode>;
        if (partialSelection) {
            nodeToInclude = graph.backTraverseNodes(selectedNodes).map;
        }

        graph.getAllNodes().forEach((node, nodeId) => {
            if (partialSelection && !nodeToInclude.has(nodeId)) {
                graph.removeNode(nodeId);
            }

            if (node instanceof DagNodeOutOptimizable &&
                node.getState() === DagNodeState.Complete) {
                node.beConfiguredState();
            }
        });
    }

    private _downloadImage(name: string): XDPromise<void> {
        const $dataflowArea: JQuery = DagView.getAreaByTab(this._dagTab.getId());
        if ($dataflowArea.length === 0) {
            return PromiseHelper.reject(ErrTStr.InvalidDFDownload);
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // this is necessory for correct image rendering
        const $svg: JQuery = $("#cut-off-right").closest("svg").clone();
        $dataflowArea.prepend($svg);
        domtoimage.toPng($dataflowArea.get(0), {
            width: $dataflowArea.width(),
            height: $dataflowArea.height(),
            style: {
                left: 0,
                top: 0
            }
        })
        .then((dataUrl) => {
            const fileName: string = `${name}.png`;
            const download = document.createElement("a");
            download.href = dataUrl;
            download.download = fileName;
            download.click();
            deferred.resolve();
        })
        .catch((error) => {
            if (typeof error !== "string") {
                error = JSON.stringify(error);
            }
            deferred.reject({error: error});
        })
        .finally(() => {
            $svg.remove();
        });

        return deferred.promise();
    }

    private _downloadStats(name: string): XDPromise<void> {
        const tab: DagTabUser = <DagTabUser>this._dagTab;
        return tab.downloadStats(name);
    }

    private _addEventListeners() {
        const $modal: JQuery = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close();
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        const $downloadTypeDropdown: JQuery = this._getDownloadTypeList();
        new MenuHelper($downloadTypeDropdown, {
            onSelect: ($li) => {
                $downloadTypeDropdown.find(".text").text($li.text());
                this._downloadType = $li.data("type");
            }
        }).setupListeners();
    }
}