class DagNodePlaceholder extends DagNode {
    protected columns: ProgCol[];
    protected name: string;

    public constructor(options: DagNodePlaceholderInfo) {
        super(options);
        this.maxParents = -1;
        this.minParents = 1;
        this.input = new DagNodePlaceholderInput(options.input);
        this.name = options.name || DagNodeType.Placeholder;
        // this.display.icon = "&#xe936;";
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    protected _getSerializeInfo(includeStats?: boolean): DagNodeInfo {
        const serializedInfo: DagNodePlaceholderInfo = <DagNodePlaceholderInfo>super._getSerializeInfo(includeStats);
        serializedInfo.name = this.name;
        return serializedInfo;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}