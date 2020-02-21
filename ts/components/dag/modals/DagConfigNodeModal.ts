class DagConfigNodeModal {
    private static _instance: DagConfigNodeModal;
    private _popup: PopupPanel;
    private _formPanels: BaseOpPanel[] = [];
    private _isFormOpen = false;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const $modal: JQuery = this._getModal();
        $modal.find("header").addClass("opPanelHeader");
    }

    public setupPopup() {
        this._popup = new PopupPanel("configNodeContainer", {
            draggableHeader: ".opPanelHeader"
        });
        this._popup
        .on("Undock", () => {
            this._refreshEditor();
        })
        .on("Dock", () => {
            this._refreshEditor();
        })
        .on("Resize", () => {
            this._refreshEditor();
        })
        .on("ResizeDocked", (state) => {
            $("#configNodeContainer").parent().css("width", `${state.dockedWidth}%`);
        });
    }

    public getPopup(): PopupPanel {
        return this._popup;
    }

    public setFormOpen(): boolean {
        this._isFormOpen = true;
        return this._isFormOpen;
    };

    public setFormClose(): boolean {
        this._isFormOpen = false;
        return this._isFormOpen;
    };

    public closeForms(): void {
        if (this._isFormOpen) {
            this._formPanels.forEach((panel) => {
                if (panel["close"]) {
                    panel["close"]();
                }
            });
            this.close();
        }
    };

    public registerPanels(panel): void {
        this._formPanels.push(panel);
    };

    private _getModal(): JQuery {
        return $("#configNodeContainer").parent();
    }

    public show(node: DagNode, tabId: string, $node: JQuery, options): void {
        const type: DagNodeType = node.getType();
        const subType: DagNodeSubType = node.getSubType();
        const tab = DagTabManager.Instance.getTabById(tabId);
        this._getModal().removeClass("xc-hidden");
        options = {
            ...options,
            app: tab ? tab.getApp() : null
        };
        switch (type) {
            case (DagNodeType.Dataset):
                DatasetOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Aggregate):
                AggOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Export):
                ExportOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Filter):
                FilterOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Join):
                JoinOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Map):
                if (subType === DagNodeSubType.Cast) {
                    CastOpPanel.Instance.show(node, options);
                } else {
                    MapOpPanel.Instance.show(node, options);
                }
                break;
            case (DagNodeType.Split):
                SplitOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Round):
                RoundOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.GroupBy):
                GroupByOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Project):
                ProjectOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Explode):
                ExplodeOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Set):
                SetOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.DFIn):
                DFLinkInOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.DFOut):
                DFLinkOutOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.PublishIMD):
                PublishIMDOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.UpdateIMD):
                UpdateIMDOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Jupyter):
                JupyterOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.IMDTable):
                IMDTableOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.SQL):
                SQLOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.RowNum):
                RowNumOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Sort):
                SortOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.SQLFuncIn):
                SQLFuncInOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Synthesize):
                SynthesizeOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Deskew):
                DeskewOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Main):
                MainOpPanel.Instance.show(node, options);
                break;
            default:
                this.close();
                this._unlock(node, tabId);
                StatusBox.show("No panels available. To edit, copy node and paste into a text editor. Then copy the edited JSON and paste it here.",
                                $node);
                return;
        }

        PopupManager.checkAllContentUndocked();
    }

    public close(): void {
        this._getModal().addClass("xc-hidden");
        PopupManager.checkAllContentUndocked();
    }

    private _unlock(node, tabId: string) {
        DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
        Log.unlockUndoRedo();
        DagGraphBar.Instance.unlock();
        DagTabManager.Instance.unlockTab(tabId);
    }

    private _refreshEditor() {
        this._formPanels.forEach(function(panel) {
            if (panel.isOpen()) {
                if (panel.getEditor && panel.getEditor()) {
                    panel.getEditor().refresh();
                }
                if (panel["getSQLEditor"] && panel["getSQLEditor"]()) {
                    panel["getSQLEditor"]().refresh();
                }
                if (panel.panelResize) {
                    panel.panelResize();
                }
            }
        });
    }
}