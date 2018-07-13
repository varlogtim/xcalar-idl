class DagNodeMap extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Map;
        this.allowAggNode = true;
    }
}