class DagTabCustom extends DagTab {
    private _customNode: DagNodeCustom;

    constructor(options: {
        name: string,
        customNode: DagNodeCustom,
    }) {
        const { name, customNode } = options;
        super(name, name, name, null);
        this._customNode = customNode;
    }

    /**
     * initializeTab is used to load up the kvstore and
     * dataflow
     * @param _dagKey Key for this dag's kvstore. (not used now)
     */
    public initializeTab(_dagKey: string) {
        return null;
    }

    /**
     * Returns the JSON representing this tab.
     * @returns {DagTabJSON}
     */
    public getJSON(): DagTabJSON {
        return null;
    }

    /**
     * Saves this Tab in the kvStore
     */
    public saveTab(): XDPromise<void> {
        return DagTabManager.Instance.saveParentTab(this.getKey());
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagGraph {
        return this._customNode.getSubGraph();
    }
}