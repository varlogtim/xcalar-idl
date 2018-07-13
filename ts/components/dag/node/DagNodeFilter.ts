class DagNodeFilter extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Filter;
        this.allowAggNode = true;
    }
}