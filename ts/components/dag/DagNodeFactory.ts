class DagNodeFactory {
    public static create(
        options: DagNodeInfo = <DagNodeInfo>{}, runtime?: DagRuntime
    ): DagNode {
        let node;
        switch (options.type) {
            case DagNodeType.Aggregate:
                node = new DagNodeAggregate(<DagNodeAggregateInfo>options);
                break;
            case DagNodeType.Dataset:
                node = new DagNodeDataset(<DagNodeInInfo>options);
                break;
            case DagNodeType.Export:
                node = new DagNodeExport(options);
                break;
            case DagNodeType.Filter:
                node = new DagNodeFilter(options);
                break;
            case DagNodeType.GroupBy:
                node = new DagNodeGroupBy(options);
                break;
            case DagNodeType.Join:
                node = new DagNodeJoin(options);
                break;
            case DagNodeType.Map:
                node = new DagNodeMap(options);
                break;
            case DagNodeType.Project:
                node = new DagNodeProject(options);
                break;
            case DagNodeType.Explode:
                node = new DagNodeExplode(options);
                break;
            case DagNodeType.Set:
                node = new DagNodeSet(options);
                break;
            case DagNodeType.SQL:
                node = new DagNodeSQL(<DagNodeSQLInfo>options);
                break;
            case DagNodeType.SQLSubInput:
                node = new DagNodeSQLSubInput(options);
                break;
            case DagNodeType.SQLSubOutput:
                node = new DagNodeSQLSubOutput(options);
                break;
            case DagNodeType.RowNum:
                node = new DagNodeRowNum(options);
                break;
            case DagNodeType.Extension:
                node = new DagNodeExtension(<DagNodeExtensionInfo>options);
                break;
            case DagNodeType.Custom:
                node = new DagNodeCustom(<DagNodeCustomInfo>options, runtime);
                break;
            case DagNodeType.CustomInput:
                node = new DagNodeCustomInput(options);
                break;
            case DagNodeType.CustomOutput:
                node = new DagNodeCustomOutput(options);
                break;
            case DagNodeType.IMDTable:
                node = new DagNodeIMDTable(<DagNodeInInfo>options);
                break;
            case DagNodeType.PublishIMD:
                node = new DagNodePublishIMD(options);
                break;
            case DagNodeType.UpdateIMD:
                node = new DagNodeUpdateIMD(options);
                break;
            case DagNodeType.DFIn:
                node = new DagNodeDFIn(<DagNodeInInfo>options);
                break;
            case DagNodeType.DFOut:
                node = new DagNodeDFOut(options);
                break;
            case DagNodeType.Jupyter:
                node = new DagNodeJupyter(options);
                break;
            case DagNodeType.Split:
                node = new DagNodeSplit(options);
                break;
            case DagNodeType.Round:
                node = new DagNodeRound(options);
                break;
            case DagNodeType.Index:
                node = new DagNodeIndex(options);
                break;
            case DagNodeType.Sort:
                node = new DagNodeSort(options);
                break;
            case DagNodeType.Placeholder:
                node = new DagNodePlaceholder(<DagNodePlaceholderInfo>options);
                break;
            case DagNodeType.Synthesize:
                node = new DagNodeSynthesize(options);
                break;
            case DagNodeType.SQLFuncIn:
                node = new DagNodeSQLFuncIn(<DagNodeSQLFuncInInfo>options);
                break;
            case DagNodeType.SQLFuncOut:
                node = new DagNodeSQLFuncOut(options);
                break;
            default:
                throw new Error("node type " + options.type + " not supported");
        }
        if (runtime != null) {
            runtime.accessible(node);
        }
        return node;
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
