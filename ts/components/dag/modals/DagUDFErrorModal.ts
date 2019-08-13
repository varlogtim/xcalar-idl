class DagUDFErrorModal {
    private static _instance: DagUDFErrorModal;
    private _$modal: JQuery;
    private _modalHelper: ModalHelper;
    private _node: DagNodeMap;
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
        this._node = <DagNodeMap>DagViewManager.Instance.getActiveDag().getNode(nodeId);
        if (this._node == null) {
            // error case
            return false;
        }

        this._modalHelper.setup();
        this._listErrors();
        this._updateErrorNum();
        this._updateGenErrorTableButton();
        return true;
    }


    public close(): void {
        this._modalHelper.clear();
        this._reset();
    }

    public getNode(): DagNodeMap {
        return this._node;
    }

    public isOpen() {
        return this._node != null;
    }

    private _listErrors(): void {
        let errorInfo = this._node.getUDFError();
        let html: HTML = "";
        let count = 0;
        errorInfo.failureDescArr.forEach(err => {
            if (!err.numRowsFailed) {
                return;
            }
            count += err.numRowsFailed;
            let numFails = xcStringHelper.numToStr(err.numRowsFailed);
            let desc = xcStringHelper.escapeHTMLSpecialChar(err.failureDesc);
            html += `<div class="errorRow">
                <div class="count">Count: <span class="value">${numFails}</span></div>
                <div class="errorText">${desc}</div>
            </div>`;
        });
        this._$modal.find(".errorList").html(html);
        if (count === 0) {
            this._$modal.find(".errorList").html(`<div class="noErrors">N/A</div>`);
        }
        if (count < errorInfo.numRowsFailedTotal) {
            this._$modal.addClass("hasExtraErrors");
            this._$modal.find(".extraErrors").removeClass("xc-hidden");
        } else {
            this._$modal.removeClass("hasExtraErrors");
            this._$modal.find(".extraErrors").addClass("xc-hidden");
        }
    }

    private _updateErrorNum(): void {
        let errorInfo = this._node.getUDFError();
        this._$modal.find(".numErrors").text(xcStringHelper.numToStr(errorInfo.numRowsFailedTotal));
    }

    private _updateGenErrorTableButton(): void {
        let parentNode = this._node.getParents()[0];
        if (!parentNode) {
            xcUIHelper.disableElement(this._$modal.find(".genErrorTable"), "Parent node does not exist");
        } else if (!parentNode.getTable()) {
            xcUIHelper.disableElement(this._$modal.find(".genErrorTable"), "Parent node does not have a result set");
        } else {
            xcUIHelper.enableElement(this._$modal.find(".genErrorTable"));
        }
    }

    private _addEventListeners(): void {
        const self = this;
        this._$modal.on("click", ".close, .cancel", function() {
            self.close();
        });

        this._$modal.on("click", ".genErrorTable", function() {
            if ($(this).hasClass("unavailable")) {
                return;
            }
            self._genErrorTable();
        });
    }

    private _reset(): void {
        this._node = null;
        this._tabId = null;
    }

    private _genErrorTable() {
        let node = this._node;
        this.close();

        let parentNode = node.getParents()[0];

        let oldTitle = node.getTitle().trim();
        let newTitle = oldTitle.length ? (oldTitle + "- Failed Rows") : "Failed Rows";
        let input = node.getParam();
        input.icv = true;

        let newNode = DagViewManager.Instance.autoAddNode(DagNodeType.Map, null, parentNode.getId(), null, null, null, {
            nodeTitle: newTitle
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
