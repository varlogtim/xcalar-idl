// General Class for Source Node
abstract class DagNodeIn extends DagNode {
    protected columns: ProgCol[];

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.maxParents = 0;
        this.minParents = 0;
        if (options && options.columns) {
            this.columns = options.columns.map((column) => {
                const name: string = xcHelper.parsePrefixColName(column.name).name;
                return ColManager.newPullCol(name, column.name, column.type);
            });
        } else {
            this.columns = [];
        }
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