class DagNodeFactory {
    public static create(options: DagNodeInfo = <DagNodeInfo>{}): DagNode {
        switch (options.type) {
            case DagNodeType.Aggregate:
                return new DagNodeAggregate(options);
            case DagNodeType.Dataset:
                return new DagNodeDataset(options);
            case DagNodeType.Export:
                return new DagNodeExport(options);
            case DagNodeType.Filter:
                return new DagNodeFilter(options);
            case DagNodeType.GroupBy:
                return new DagNodeGroupBy(options);
            case DagNodeType.Join:
                return new DagNodeJoin(options);
            case DagNodeType.Map:
                return new DagNodeMap(options);
            case DagNodeType.Project:
                return new DagNodeProject(options);
            case DagNodeType.Set:
                return new DagNodeSet(options);
            default:
                throw new Error("node type " + options.type + " not supported");
        }
    }

    // Define this so you can't do new DagNodeFactory
    private constructor() {

    }
}