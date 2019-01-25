class DagNodeFactory {
    public static create(
        options: DagNodeInfo = <DagNodeInfo>{}
    ): DagNode {
        switch (options.type) {
            case DagNodeType.Aggregate:
                return new DagNodeAggregate(<DagNodeAggregateInfo>options);
            case DagNodeType.Dataset:
                return new DagNodeDataset(<DagNodeInInfo>options);
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
                return new DagNodeIMDTable(<DagNodeInInfo>options);
            case DagNodeType.PublishIMD:
                return new DagNodePublishIMD(options);
            case DagNodeType.UpdateIMD:
                return new DagNodeUpdateIMD(options);
            case DagNodeType.DFIn:
                return new DagNodeDFIn(<DagNodeInInfo>options);
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
                return new DagNodePlaceholder(<DagNodePlaceholderInfo>options);
            case DagNodeType.Synthesize:
                return new DagNodeSynthesize(options);
            case DagNodeType.SQLFuncIn:
                return new DagNodeSQLFuncIn(<DagNodeInInfo>options);
            case DagNodeType.SQLFuncOut:
                return new DagNodeSQLFuncOut(options);
            default:
                throw new Error("node type " + options.type + " not supported");
        }
    }

    public static getNodeClass(
        options: DagNodeInfo = <DagNodeInfo>{}
    ): typeof DagNode {
        switch (options.type) {
            case DagNodeType.Aggregate:
                return DagNodeAggregate;
            case DagNodeType.Dataset:
                return DagNodeDataset;
            case DagNodeType.Export:
                return DagNodeExport;
            case DagNodeType.Filter:
                return DagNodeFilter;
            case DagNodeType.GroupBy:
                return DagNodeGroupBy;
            case DagNodeType.Join:
                return DagNodeJoin;
            case DagNodeType.Map:
                return DagNodeMap;
            case DagNodeType.Project:
                return DagNodeProject;
            case DagNodeType.Explode:
                return DagNodeExplode;
            case DagNodeType.Set:
                return DagNodeSet;
            case DagNodeType.SQL:
                return DagNodeSQL;
            case DagNodeType.SQLSubInput:
                return DagNodeSQLSubInput;
            case DagNodeType.SQLSubOutput:
                return DagNodeSQLSubOutput;
            case DagNodeType.RowNum:
                return DagNodeRowNum;
            case DagNodeType.Extension:
                return DagNodeExtension;
            case DagNodeType.Custom:
                return DagNodeCustom;
            case DagNodeType.CustomInput:
                return DagNodeCustomInput;
            case DagNodeType.CustomOutput:
                return DagNodeCustomOutput;
            case DagNodeType.IMDTable:
                return DagNodeIMDTable;
            case DagNodeType.PublishIMD:
                return DagNodePublishIMD;
            case DagNodeType.UpdateIMD:
                return DagNodeUpdateIMD;
            case DagNodeType.DFIn:
                return DagNodeDFIn;
            case DagNodeType.DFOut:
                return DagNodeDFOut;
            case DagNodeType.Jupyter:
                return DagNodeJupyter;
            case DagNodeType.Split:
                return DagNodeSplit;
            case DagNodeType.Round:
                return DagNodeRound;
            case DagNodeType.Index:
                return DagNodeIndex;
            case DagNodeType.Sort:
                return DagNodeSort;
            case DagNodeType.Placeholder:
                return DagNodePlaceholder;
            case DagNodeType.Synthesize:
                return DagNodeSynthesize;
            case DagNodeType.SQLFuncIn:
                return DagNodeSQLFuncIn;
            case DagNodeType.SQLFuncOut:
                return DagNodeSQLFuncOut;
            default:
                throw new Error("node type " + options.type + " not supported");
        }
    }

    // Define this so you can't do new DagNodeFactory
    private constructor() {

    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeFactory = DagNodeFactory;
}
