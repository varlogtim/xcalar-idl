class DagUDFErrorModal {
    private static _instance: DagUDFErrorModal;
    private _$modal: JQuery;
    private _modalHelper: ModalHelper;
    private _node: DagNode;
    private _tabId: string;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._$modal = $("#dagUDFErrorModal");

        this._modalHelper = new ModalHelper(this._$modal, {
            noEnter: true,
            noBackground: true
        });
        this._addEventListeners();
    }

    /**
     * DagDescriptionModal.Instance.show
     * @returns {boolean}
     * @param nodeId
     */
    public show(nodeId: DagNodeId): boolean {
        if (this._$modal.is(":visible")) {
            return false;
        }
        this._tabId = DagViewManager.Instance.getActiveTab().getId();
        this._node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        if (this._node == null) {
            // error case
            return false;
        }

        this._modalHelper.setup();
        this._listErrors();
        return true;
    }

    private _listErrors() {
        let numErrors = 4;
        let html: HTML = "";
        for (let i = 0; i < numErrors; i++) {
            let count = 650;
            html += `<div class="errorRow">
                        <div class="count">${count}</div>
                        <div class="errorText">${JSON.stringify({"a": 2}, null, 4)}</div>
                    </div>`;
        }
        this._$modal.find(".errorList").html(html);
    }

    private _addEventListeners(): void {
        const self = this;
        this._$modal.on("click", ".close, .cancel", function() {
            self._closeModal();
        });

        this._$modal.on("click", ".genSummaryTable", function() {
            self._genSummaryTable();
        });

        this._$modal.on("click", ".genErrorTable", function() {
            self._genErrorTable();
        });
    }

    private _closeModal(): void {
        this._modalHelper.clear();
        this._reset();
    }

    private _reset(): void {
        this._node = null;
    }


    private _genSummaryTable() {
        let parentNode = this._node.getParents()[0];
        let input: DagNodeMapInputStruct = this._node.getParam();
        let mapColName = input.eval[0].newField;
        input.icv = true;
        let newMapNode = DagViewManager.Instance.autoAddNode(DagNodeType.Map, null, parentNode.getId(), null, null, null, {
            isTempDebugNode: true
        });
        newMapNode.setParam(input, true);
        let newGroupByNode = DagViewManager.Instance.autoAddNode(DagNodeType.GroupBy, null, newMapNode.getId(),  null, null, null, {
            isTempDebugNode: true
        });
        let groupByInput: DagNodeGroupByInputStruct = {
            "groupBy": [
                mapColName
            ],
            "aggregate": [
                {
                    "operator": "count",
                    "sourceColumn": mapColName,
                    "destColumn": "count",
                    "distinct": false,
                    "cast": null
                }
            ],
            "includeSample": false,
            "joinBack": false,
            "icv": false,
            "groupAll": false,
            "newKeys": [],
            "dhtName": "",
        };
        newGroupByNode.setParam(groupByInput, true);
        DagViewManager.Instance.run([newGroupByNode.getId()])
        .then(() => {
            if (!UserSettings.getPref("dfAutoPreview")) {
                DagViewManager.Instance.viewResult(newGroupByNode, this._tabId);
            }
        });
    }

    private _genErrorTable() {
        let parentNode = this._node.getParents()[0];
        let input = this._node.getParam();
        input.icv = true;
        let newNode = DagViewManager.Instance.autoAddNode(DagNodeType.Map, null, parentNode.getId(), null, null, null, {
            isTempDebugNode: true
        });
        newNode.setParam(input, true);
        DagViewManager.Instance.run([newNode.getId()])
        .then(() => {
            if (!UserSettings.getPref("dfAutoPreview")) {
                DagViewManager.Instance.viewResult(newNode, this._tabId);
            }
        });
    }
}
