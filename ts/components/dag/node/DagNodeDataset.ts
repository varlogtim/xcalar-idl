class DagNodeDataset extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Dataset;
        this.maxParents = 0;
    }
}