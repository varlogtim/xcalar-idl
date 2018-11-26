class DagNodeInfoPanel {
    private static _instance: DagNodeInfoPanel;
    private _$panel: JQuery;
    private _isShowing: boolean;
    private _activeNode: DagNode;

    public static get Instance() {
        return this._instance || (this._instance = new DagNodeInfoPanel());
    }

    private constructor() {
        this._$panel = $("#dagNodeInfoPanel");
        this._isShowing = false;
        this._addEventListeners();
    }

    public show(node: DagNode): boolean {
        this._activeNode = node;
        this._isShowing = true;
        $("#dataflowMenu").find(".menuSection").addClass("xc-hidden");
        this._$panel.removeClass("xc-hidden");

        this._$panel.find(".nodeType").text(node.getDisplayNodeType());

        this._updateTitleSection();
        this._updateConfigSection();
        this._updateStatusSection();
        this._updateStatsSection();
        this._updateAggregatesSection();
        this._updateDescriptionSection();
        this._updateLock();

        return true;
    }

    public hide(): boolean {
        if (!this._isShowing) {
            return false;
        }
        this._isShowing = false;
        this._$panel.addClass("xc-hidden");
        xcTooltip.hideAll();
        if (!MainMenu.isFormOpen()) {
            $("#dagList").removeClass("xc-hidden");
        }
        return true;
    }

    public isOpen(): boolean {
        return this._isShowing;
    }

    public getActiveNode(): DagNode {
        if (!this._isShowing) {
            return null;
        }
        return this._activeNode;
    }

    public update(nodeId: DagNodeId, attribute: string): boolean {
        if (nodeId !== this._activeNode.getId()) {
            return false;
        }
        switch (attribute) {
            case ("lock"):
                this._updateLock();
                break;
            case ("title"):
                this._updateTitleSection();
                break;
            case ("params"):
                this._updateConfigSection();
                break;
            case ("status"):
                this._updateStatusSection();
                break;
            case ("stats"):
                this._updateStatsSection();
            case ("aggregates"):
                this._updateAggregatesSection();
                break;
            case ("description"):
                this._updateDescriptionSection();
                break;
            default:
                console.warn(attribute, "attribute not found");
                break;
        }
        return true;
    }

    private _addEventListeners(): void {
        const self = this;

        this._$panel.on("click", ".collapsible .rowHeading", function(event) {
            if ($(event.target).closest(".editConfig").length) {
                return;
            }
            $(this).closest(".row").toggleClass("collapsed");
        });

        this._$panel.find(".editConfig").click(function() {
            if ($(this).hasClass("unavailable")) {
                return;
            }
            DagNodeMenu.execute("configureNode", {
                node: self._activeNode
            });
        });
    }

    private _updateLock(): void {
        const dagNodeType: DagNodeType = this._activeNode.getType();
        const uneditable = (dagNodeType === DagNodeType.CustomInput ||
            dagNodeType === DagNodeType.CustomOutput ||
            dagNodeType === DagNodeType.SQLSubInput ||
            dagNodeType === DagNodeType.SQLSubOutput);
        if (uneditable || DagView.isNodeLocked(this._activeNode.getId())) {
            xcHelper.disableElement(this._$panel.find(".editConfig"));
        } else {
            xcHelper.enableElement(this._$panel.find(".editConfig"));
        }
    }

    private _updateTitleSection(): void {
        if (this._activeNode.getTitle()) {
            this._$panel.find(".nodeTitle").removeClass("xc-hidden");
            this._$panel.find(".nodeTitle").text(this._activeNode.getTitle());
        } else {
            this._$panel.find(".nodeTitle").addClass("xc-hidden");
        }
    }

    private _updateConfigSection(): void {
        let params = xcHelper.escapeHTMLSpecialChar(JSON.stringify(this._activeNode.getParam(), null, 4));
        this._$panel.find(".configSection").text(params);
    }

    private _updateStatusSection(): void {
        this._$panel.find(".statusSection").text(this._activeNode.getState());
        if (this._activeNode.getState() === DagNodeState.Error && this._activeNode.getError()) {
            this._$panel.find(".errorSection").text(this._activeNode.getError());
            this._$panel.find(".errorRow").removeClass("xc-hidden");
        } else {
            this._$panel.find(".errorRow").addClass("xc-hidden");
        }
    }

    private _updateStatsSection(): void {
        const node = this._activeNode;
        const overallStats = node.getOverallStats();
        if (overallStats.started) {
            this._$panel.find(".progressRow").removeClass("xc-hidden");
            this._$panel.find(".progressSection").text(overallStats.pct + "%");
            this._$panel.find(".statsRow").removeClass("xc-hidden");
            const operationsStats = node.getIndividualStats(true);
            let statsHtml: HTML = "";
            operationsStats.forEach((stats) => {
                let operationName = stats.type.substr("XcalarApi".length);
                let skewText = DagView.getSkewText(stats.skewValue);
                let skewColor = DagView.getSkewColor(skewText);
                if (skewColor) {
                    skewColor = "color:" + skewColor;
                }
                statsHtml += `<div class="operationStats">
                    <div class="statsRow">
                        <div class="label">Operation: </div>
                        <div class="value"><b>${operationName}</b></div>
                    </div>
                    <div class="statsRow">
                        <div class="label">Progress: </div>
                        <div class="value">${stats.pct}%</div>
                    </div>
                    <div class="statsRow">
                        <div class="label">State: </div>
                        <div class="value">${stats.state}</div>
                    </div>
                    <div class="statsRow">
                        <div class="label">Rows: </div>
                        <div class="value">${xcHelper.numToStr(stats.numRowsTotal)}</div>
                    </div>
                    <div class="statsRow">
                        <div class="label">Skew: </div>
                        <div class="value" style="${skewColor}">${skewText}</div>
                    </div>
                    <div class="statsRow">
                        <div class="label">Elapsed Time: </div>
                        <div class="value">${xcHelper.getElapsedTimeStr(stats.elapsedTime)}</div>
                    </div>
                </div>`;

            });
            this._$panel.find(".statsSection").html(statsHtml);
        } else {
            this._$panel.find(".progressRow").addClass("xc-hidden");
            this._$panel.find(".statsRow").addClass("xc-hidden");
        }
    }

    private _updateAggregatesSection(): void {
        if (this._activeNode.getAggregates && this._activeNode.getAggregates().length) {
            this._$panel.find(".aggsSection").text(this._activeNode.getAggregates().join(", "));
            this._$panel.find(".aggsRow").removeClass("xc-hidden");
        } else {
            this._$panel.find(".aggsRow").addClass("xc-hidden");
        }
    }

    private _updateDescriptionSection(): void {
        if (this._activeNode.getDescription()) {
            this._$panel.find(".descriptionRow").removeClass("xc-hidden");
            this._$panel.find(".descriptionSection").text(this._activeNode.getDescription());
        } else {
            this._$panel.find(".descriptionRow").addClass("xc-hidden");
        }
    }

}
