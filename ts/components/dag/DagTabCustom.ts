class DagTabCustom extends DagTab {
    private _customNode: DagNodeCustom;

    constructor(options: {
        name: string,
        customNode: DagNodeCustom,
    }) {
        const { name, customNode } = options;
        super(name, name, null);
        this._customNode = customNode;
    }

    /**
     * Saves this Tab in the kvStore
     */
    public saveTab(): XDPromise<void> {
        return DagTabManager.Instance.saveParentTab(this.getId());
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagGraph {
        return this._customNode.getSubGraph();
    }
}