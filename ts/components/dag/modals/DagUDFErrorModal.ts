class DagUDFErrorModal {
    private static _instance: DagUDFErrorModal;
    private _$modal: JQuery;
    private _modalHelper: ModalHelper;
    private _node: DagNode;
    private _tabId: string;
    private _isOptimized: boolean;

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
        this._isOptimized = DagViewManager.Instance.getActiveTab() instanceof DagTabOptimized;
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

    public getNode(): DagNode {
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
                        html += getRowHtml.bind(this)(innerErr);
                    });
                    if (hasErrStr) {
                        html += `</div>`; // closes group
                    }
                }
            });
        }

        this._$modal.find(".errorList").html(html);

        this._$modal.removeClass("optimized");
        this._$modal.removeClass("hasExtraErrors");
        if (count < errorInfo.numRowsFailedTotal) {
            if (this._isOptimized && count === 0) {
                this._$modal.addClass("optimized");
            } else {
                this._$modal.addClass("hasExtraErrors");
            }
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
            this._$modal.addClass("noErrors");
        } else {
            this._$modal.removeClass("noErrors");
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
            let evalStr = "";
            const param = this._node.getParam();
            if (this._node instanceof DagNodeFilter) {
                evalStr = param.evalString;
            } else {
                const evalObj = param.eval.find((e) => {
                    return e.newField === curColumnName;
                });
                if (evalObj) {
                    evalStr = evalObj.evalString;
                }
            }
            console.log(err);
            html += `<div class="errorRow">
                <div class="subRow">
                    <div class="evalString">${evalStr}</div>
                    <div class="count">${numFails} failures</div>
                </div>

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
            xcUIHelper.disableElement(this._$modal.find(".genErrorTable"), TooltipTStr.UDFErrorModalNoParent);
        } else if (!parentNode.getTable()) {
            xcUIHelper.disableElement(this._$modal.find(".genErrorTable"), TooltipTStr.UDFErrorModalNoTable);
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
            self._genErrorTable.bind(self)();
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

    private async _genErrorTable(): Promise<void> {
        let node = this._node;
        let tabId = this._tabId;
        this.close();

        let parentNode = node.getParents()[0];

        let oldTitle = node.getTitle().trim();
        let input = node.getParam();
        if (node instanceof DagNodeFilter) {
            input.eval = [{
                evalString: input.evalString,
                newField: "OriginalFilterColumn"
            }];
            delete input.evalString;
        }

        input.icv = true;
        if ( node.getTable()) {
            input.outputTableName = node.getTable().replace(/#/g, "") + "_ERRORS";
        } else {
            if (input.outputTableName) {
                input.outputTableName += "_ERRORS";
            } else {
                input.outputTableName = "ERRORS";
            }
        }

        let icvNode: DagNodeMap;
        if (node.getComplementNodeId()) {
            let icvNodeId = node.getComplementNodeId();
            const tab = DagTabManager.Instance.getTabById(tabId);
            icvNode = tab.getGraph().getNode(icvNodeId) as DagNodeMap;
        }
        if (!icvNode) {
            let type;
            let subType;
            if (node instanceof DagNodeFilter) {
                type  = DagNodeType.Map;
            } else {
                type = node.getType();
                subType = node.getSubType();
            }
            icvNode = await DagViewManager.Instance.autoAddNode(type, subType, parentNode.getId(), null, {
                        nodeTitle: oldTitle,
                        byPassAlert: true
                    }) as DagNodeMap;
        }

        if (!icvNode) {
            return;
        }
        icvNode.beConfiguredState();
        icvNode.setParam(input, true);
        icvNode.setComplementNodeId(node.getId());
        node.setComplementNodeId(icvNode.getId());

        DagViewManager.Instance.run([icvNode.getId()], false, false, true)
        .then(() => {
            this._reorderColumns(icvNode);
            return DagViewManager.Instance.viewResult(icvNode, tabId);
        })
        .then(() => {
            TblManager.highlightColumn($("#sqlTableArea .xcTable th.col1"));
        });
    }

    private _reorderColumns(mapNode) {
        const columns = mapNode.getLineage().getColumns().map(c => c.getBackColName());
        if (!columns.length) return;
        const col = columns.pop();
        columns.unshift(col);
        mapNode.columnChange(DagColumnChangeType.Reorder, columns);
    }
}
