class DagNodeFactory {
    public static create(
        options: DagNodeInfo = <DagNodeInfo>{}
    ): DagNode {
        switch (options.type) {
            case DagNodeType.Aggregate:
                return new DagNodeAggregate(<DagNodeAggregateInfo>options);
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
            case DagNodeType.Explode:
                return new DagNodeExplode(options);
            case DagNodeType.Set:
                return new DagNodeSet(options);
            case DagNodeType.SQL:
                return new DagNodeSQL(<DagNodeSQLInfo>options);
            case DagNodeType.SQLSubInput:
                return new DagNodeSQLSubInput(options);
            case DagNodeType.SQLSubOutput:
                return new DagNodeSQLSubOutput(options);
            case DagNodeType.RowNum:
                return new DagNodeRowNum(options);
            case DagNodeType.Extension:
                return new DagNodeExtension(<DagNodeExtensionInfo>options);
            case DagNodeType.Custom:
                return new DagNodeCustom(<DagNodeCustomInfo>options);
            case DagNodeType.CustomInput:
                return new DagNodeCustomInput(options);
            case DagNodeType.CustomOutput:
                return new DagNodeCustomOutput(options);
            case DagNodeType.IMDTable:
                return new DagNodeIMDTable(options);
            case DagNodeType.PublishIMD:
                return new DagNodePublishIMD(options);
            case DagNodeType.DFIn:
                return new DagNodeDFIn(options);
            case DagNodeType.DFOut:
                return new DagNodeDFOut(options);
            case DagNodeType.Jupyter:
                return new DagNodeJupyter(options);
            case DagNodeType.Split:
                return new DagNodeSplit(options);
            case DagNodeType.Round:
                return new DagNodeRound(options);
            case DagNodeType.Index:
                return new DagNodeIndex(options);
            case DagNodeType.Sort:
                return new DagNodeSort(options);
            case DagNodeType.Placeholder:
                return new DagNodePlaceholder(options);
            default:
                throw new Error("node type " + options.type + " not supported");
        }
    }

    // Define this so you can't do new DagNodeFactory
    private constructor() {

    }
}