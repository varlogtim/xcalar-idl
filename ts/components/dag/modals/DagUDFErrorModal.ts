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
        this._$modal.height(400);
        if (this._$modal.find(".errorList").height() > this._$modal.find(".modalMain").height() * 2) {
            const height: number = Math.min(600, $(window).height());
            this._$modal.height(height);
        }

        this._modalHelper.center();
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
        let hasErrStr = false;
        let curColumnName = "";
        if (errorInfo.opFailureSummary) {
            errorInfo.opFailureSummary.forEach(err => {
                if (err && err.failureSummInfo) {
                    if (hasErrStr) {
                        hasErrStr = false;
                    }

                    curColumnName = err.failureSummName;

                    err.failureSummInfo.forEach(innerErr => {
                        html += getRowHtml(innerErr);
                    });
                    if (hasErrStr) {
                        html += `</div>`; // closes group
                    }
                }
            });
        }

        this._$modal.find(".errorList").html(html);


        if (count < errorInfo.numRowsFailedTotal) {
            this._$modal.addClass("hasExtraErrors");
        } else {
            this._$modal.removeClass("hasExtraErrors");
        }
        let $group = this._$modal.find(".evalGroup")
        if ($group.length === 1) {
            $group.addClass("expanded");
            this._$modal.find(".collapseAll").show();
            this._$modal.find(".expandAll").hide();
        } else {
            this._$modal.find(".collapseAll").hide();
            this._$modal.find(".expandAll").show();
        }

        if (count === 0) {
            this._$modal.find(".errorList").html(`<div class="noErrors">N/A</div>`);
            this._$modal.find(".modalTop").hide();
        } else {
            this._$modal.find(".modalTop").show();
        }

        function getRowHtml(err) {
            if (!err.numRowsFailed) {
                return "";
            }
            let html = "";
            if (!hasErrStr) {
                html += `<div class="evalGroup">
                            <div class="groupHeader">
                                <span class="text">${curColumnName}</span>
                                <i class="icon xi-minus"></i>
                                <i class="icon xi-plus"></i>
                            </div>`;
            }

            count += err.numRowsFailed;
            let numFails = xcStringHelper.numToStr(err.numRowsFailed);
            let desc = xcStringHelper.escapeHTMLSpecialChar(err.failureDesc);
            html += `<div class="errorRow">
                <div class="count">${numFails} failures</div>
                <div class="errorText">${desc}</div>
            </div>`;

            hasErrStr = true;
            return html;
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
            xcUIHelper.disableElement(this._$modal.find(".genErrorTable"), "Parent node does not have a table");
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
        this._$modal.on("click", ".groupHeader", function() {
            const $group = $(this).closest(".evalGroup");
            if ($group.hasClass("expanded")) {
                $group.removeClass("expanded");
            } else {
                $group.addClass("expanded");
            }
            let $groups = self._$modal.find(".evalGroup");
            if ($groups.filter(":not(.expanded)").length) {
                self._$modal.find(".expandAll").show();
                self._$modal.find(".collapseAll").hide();
            } else {
                self._$modal.find(".expandAll").hide();
                self._$modal.find(".collapseAll").show();
            }
        });

        this._$modal.on("click", ".toggleAll", function() {
            let $option = $(this);
            $option.hide();
            if ($option.hasClass("collapseAll")) {
                self._$modal.find(".expandAll").show();
                self._$modal.find(".evalGroup").removeClass("expanded");
            } else {
                $option.hide();
                self._$modal.find(".collapseAll").show();
                self._$modal.find(".evalGroup").addClass("expanded");
            }
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
