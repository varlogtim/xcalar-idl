class DagNodeModule extends DagNode {
    public linkIns: Map<DagNodeId, DagNodeDFIn>;
    public linkOuts: Map<DagNodeId, DagNodeDFOut>;
    public headNode: DagNodeIn;
    public tab: DagTabUser;
    private _headNodeId?: DagNodeId;
    private _tabId?: DagNodeId;

    public constructor(options: DagNodeModuleInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Module;
        this.maxParents = -1;
        this.minParents = 0;
        this.input = this.getRuntime().accessible(new DagNodeModuleInput(options.input));
        this.linkIns = new Map();
        this.linkOuts = new Map();
        if (options.tabId) {
            this.tab = <DagTabUser>this._findTab(options.tabId);
            if (!this.tab) {
                this._tabId = options.tabId;
            }
        }
        if (options.headNodeId) {
            if (this.tab) {
                this.headNode = this._findHeadNodeFromTab(this.tab, options.headNodeId);
            }
            if (!this.headNode) {
                this._headNodeId = options.headNodeId;
            }
        }
    }

    public getMaxParents(): number {
        for (let [_nodeId, node] of this.linkIns) {
            if (!node.hasSource()) {
                return -1; // has linking
            }
        }
        return 0; // no linking
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    protected _getColumnsUsedInInput(): Set<string> {
        return null;
    }

    /**
     * @override
     */
    protected _genParamHint(withModuleName?: boolean): string {
        let hint: string = "";
        try {
            const tab = this.getTab();
            const headNode = this.getHeadNode();
            if (withModuleName) {
                hint = tab.getName() + "." + headNode.getHead();
            } else {
                hint = headNode.getHead();
            }
        } catch (e) {
            console.error(e);
        }
        return hint;
    }

    public getFnName(separate?: boolean): string | {moduleName: string, fnName: string} {
        if (separate) {
            let moduleName = "";
            let fnName = "";
            try {
                moduleName = this.getTab().getName() || "";
                fnName = this.getHeadNode().getHead() || "";
            } catch (e) {
                console.error(e);
            }
            return {
                moduleName,
                fnName
            };
        } else {
            return this._genParamHint(true) || "";
        }
    }

    // may not have tab if it was loaded before other tabs
    public getTab(): DagTabUser {
        if (!this.tab) {
            this.tab = <DagTabUser>this._findTab(this._tabId);
        }
        return this.tab;
    }

    public getTabId(): string {
        return this._tabId;
    }

    public getHeadNode(): DagNodeIn {
        const tab = this.getTab();
        if (tab && !this.headNode) {
            this.headNode = this._findHeadNodeFromTab(this.tab, this._headNodeId);
        }
        return this.headNode;
    }

     /**
     * @override
     */
    protected _getSerializeInfo(includeStats?: boolean): DagNodeModuleInfo {
        const serializedInfo = <DagNodeModuleInfo>super._getSerializeInfo(includeStats);
        serializedInfo.tabId = this.tab ? this.tab.getId() : null;
        serializedInfo.headNodeId = this.headNode ? this.headNode.getId() : null;
        return serializedInfo;
    }

    private _findTab(dataflowId: string): DagTab {
        const dagTabService = this.getRuntime().getDagTabService();
        if (dataflowId != null && dataflowId != "") {
            return dagTabService.getTabById(dataflowId);
        }
        return null;
    }

    private _findHeadNodeFromTab(dagTab: DagTabUser, nodeId: DagNodeId): DagNodeIn {
        const graph = dagTab.getGraph();
        if (graph) {
            return <DagNodeIn>graph.getNode(nodeId);
        }
        return null;
    }
}