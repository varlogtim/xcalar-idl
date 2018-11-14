class DagNodeSynthesize extends DagNode {
    protected columns: ProgCol[];

    public constructor(options: DagNodeInfo) {
        super(options);
        this.minParents = 0;
        this.maxParents = 0;
        this.input = new DagNodeSynthesizeInput(options.input);
        // this.display.icon = "&#xe936;";
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: this.columns,
            changes: []
        };
    }

    protected _getSerializeInfo(): DagNodeInfo {
        const serializedInfo: DagNodeInfo = super._getSerializeInfo();
        if (this.columns) {
            const columns = this.columns.map((progCol) => {
                return {name: progCol.getBackColName(), type: progCol.getType()};
            });
            serializedInfo.columns = columns;
        }
        return serializedInfo;
    }
}