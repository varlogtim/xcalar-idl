class DagNodeDFIn extends DagNodeIn {
    protected input: DagNodeDFInInput;

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.type = DagNodeType.DFIn;
    }

    public getParam(): DagNodeDFInInput {
        return {
            dataflowId: this.input.dataflowId || "",
            linkOutName: this.input.linkOutName || ""
        };
    }

    public setParam(input: DagNodeDFInInput = <DagNodeDFInInput>{}): void {
        this.input = {
            dataflowId: input.dataflowId,
            linkOutName: input.linkOutName,
        };
        super.setParam();
    }

    // XXX TODO: This function used DagTabManager now, which is against
    // our design to make DagNode in low level. Should use
    // other ways to do it (for example, the Angluar JS service way)
    public getLinedNodeAndGraph(): {graph: DagGraph, node: DagNodeDFOut} {
        const param: DagNodeDFInInput = this.getParam();
        const dataflowId: string = param.dataflowId;
        const linkOutName: string = param.linkOutName;
        const graph: DagGraph = DagTabManager.Instance.getGraphById(dataflowId);
        if (graph == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const dfOutNodes: DagNode[] = graph.filterNode((node) => {
            if (node.getType() === DagNodeType.DFOut) {
                const dfOutNode = <DagNodeDFOut>node;
                if (dfOutNode.getParam().name === linkOutName) {
                    return true;
                }
            } else {
                return false;
            }
        });
        if (dfOutNodes.length !== 1) {
            throw new Error(DagNodeErrorType.NoLinkInGraph);
        }
        return {
            graph: graph,
            node: <DagNodeDFOut>dfOutNodes[0]
        };
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        try {
            const dfOutNode: DagNodeDFOut = this.getLinedNodeAndGraph().node;
            const lineage: DagLineage = dfOutNode.getLineage();
            return {
                columns: lineage.getColumns(),
                changes: []
            };
        } catch (e) {
            console.error("lineage error", e);
            return {
                columns: [],
                changes: []
            };
        }
    }
}