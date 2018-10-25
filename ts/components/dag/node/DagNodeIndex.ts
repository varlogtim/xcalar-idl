class DagNodeIndex extends DagNode {
    protected columns: ProgCol[];

    public constructor(options: DagNodeInfo) {
        super(options);
        this.minParents = 1;
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: this.columns,
            changes: []
        };
    }

    protected _getSerializeInfo():DagNodeInInfo {
        const serializedInfo: DagNodeInInfo = super._getSerializeInfo();
        if (this.columns) {
            const columns = this.columns.map((progCol) => {
                return {name: progCol.getBackColName(), type: progCol.getType()};
            });
            serializedInfo.columns = columns;
        }
        return serializedInfo;
    }
}