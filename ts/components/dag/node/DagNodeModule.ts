class DagNodeModule extends DagNode {
    public linkIns: Map<DagNodeId, DagNodeDFIn>;
    public linkOuts: Map<DagNodeId, DagNodeDFOut>;
    public headNode: DagNodeIn;
    public tab: DagTabUser;

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Module;
        this.maxParents = -1;
        this.minParents = 0;
        this.linkIns = new Map();
        this.linkOuts = new Map();
    }

    public getMaxParents(): number {
        for (let [_nodeId, node] of this.linkIns) {
            if (!node.hasSource()) {
                return -1; // has linking
            }
        }
        return 0; // no linking
    }

    public lineageChange() {
        return null;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        return null;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        try {
            hint = this.tab.getName() + "." + this.headNode.getHead();
        } catch (e) {
            console.error(e);
        }
        return hint;
    }
}