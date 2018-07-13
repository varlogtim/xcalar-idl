class DagNodeJoin extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Join;
        this.maxParents = 2;
    }
}