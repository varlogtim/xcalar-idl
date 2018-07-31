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
            case DagNodeType.SQL:
                return new DagNodeSQL(options);
            case DagNodeType.Extension:
                return new DagNodeExtension(options);
            default:
                throw new Error("node type " + options.type + " not supported");
        }
    }

        /**
         * Deserializes the dagNode represented by dagNode
         * Note that parents and children are not restored- that must
         * be done by the DagGraph.
         * @param dagNode The dagNode we want to restore.
         * @returns {DeserializedNode}
         */
    public static deserialize(dagNode: string): DeserializedNode  {
        // TODO add fail case.
        let nodeJSON = null;
        try {
            nodeJSON = JSON.parse(dagNode);
        } catch (error) {
            console.error("Could not parse JSON of dagNode: " + error)
            return null;
        }
        const parents: DagNodeId[] = nodeJSON.parents;
        let newNode: DagNode = DagNodeFactory.create(nodeJSON);
        return {
            node: newNode,
            parents: parents
        }
    }

    // Define this so you can't do new DagNodeFactory
    private constructor() {

    }
}