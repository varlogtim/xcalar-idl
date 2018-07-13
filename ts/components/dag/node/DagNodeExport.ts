class DagNodeExport extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Export;
        this.maxChildren = 0;
    }
}