class DagConfigNodeModal {
    private static _instance: DagConfigNodeModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private modalHelper: ModalHelper;

    private constructor() {
        const $modal: JQuery = this._getModal();
        $modal.find("header").addClass("opPanelHeader");
        this.modalHelper = new ModalHelper($modal, {
            noBackground: true,
            minHeight: 300,
            minWidth: 300,
            dragHandle: ".opPanelHeader"
        });
    }

    private _getModal(): JQuery {
        return $("#configNodeModal");
    }

    public show(node: DagNode, tabId: string, $node: JQuery, options): void {
        const type: DagNodeType = node.getType();
        const subType: DagNodeSubType = node.getSubType();

        this.modalHelper.setup();
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
            default:
                this.close();
                this._unlock(node, tabId);
                StatusBox.show("No panels available. To edit, copy node and paste into a text editor. Then copy the edited JSON and paste it here.",
                                $node);
                return;
        }
        const $modal = this._getModal();
        const nodeRect = $node[0].getBoundingClientRect();
        const modalRect = $modal[0].getBoundingClientRect();
        let newLeft = Math.max(1, nodeRect.left - modalRect.width);
        $modal.css("left", newLeft);
    }

    public close(): void {
        this.modalHelper.clear();
    }

    private _unlock(node, tabId: string) {
        DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
        Log.unlockUndoRedo();
        DagGraphBar.Instance.unlock();
        DagTabManager.Instance.unlockTab(tabId);
    }
}