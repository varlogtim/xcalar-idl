class DagNodeSet extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Set;
        this.maxParents = -1;
    }
}