class DagNodeIndex extends DagNode {
    protected columns: ProgCol[];

    public constructor(options: DagNodeInfo) {
        super(options);
        this.minParents = 1;
        this.input = new DagNodeIndexInput(options.input);
        this.display.icon = "&#xe936;";
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    protected _getSerializeInfo():DagNodeIndexInfo {
        const serializedInfo: DagNodeIndexInfo = <DagNodeIndexInfo>super._getSerializeInfo();
        if (this.columns) {
            const columns = this.columns.map((progCol) => {
                return {name: progCol.getBackColName(), type: progCol.getType()};
            });
            serializedInfo.columns = columns;
        }
        return serializedInfo;
    }
}