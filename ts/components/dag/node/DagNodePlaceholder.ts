class DagNodePlaceholder extends DagNode {
    protected columns: ProgCol[];
    protected name: string;

    public constructor(options: DagNodeInfo) {
        super(options);
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

    protected _getSerializeInfo(): DagNodeInfo {
        const serializedInfo: DagNodeInfo = super._getSerializeInfo();
        return serializedInfo;
    }
}