class DagNodeAggregate extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Aggregate;
        this.allowAggNode = true;
    }
}