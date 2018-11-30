class DagNodeDFIn extends DagNodeIn {
    protected input: DagNodeDFInInput;

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.type = DagNodeType.DFIn;
        this.display.icon = "&#xe952;"; // XXX TODO: UI design
        this.input = new DagNodeDFInInput(options.input);
    }

    public setParam(input: DagNodeDFInInputStruct = <DagNodeDFInInputStruct>{}): void {
        this.input.setInput({
            dataflowId: input.dataflowId,
            linkOutName: input.linkOutName
        });
        super.setParam();
    }

    // XXX TODO: This function used DagTabManager now, which is against
    // our design to make DagNode in low level. Should use
    // other ways to do it (for example, the Angluar JS service way)
    public getLinedNodeAndGraph(): {graph: DagGraph, node: DagNodeDFOut} {
        const param: DagNodeDFInInputStruct = this.input.getInput();
        const dataflowId: string = param.dataflowId;
        const linkOutName: string = param.linkOutName;
        const dagTab: DagTab = DagTabManager.Instance.getTabById(dataflowId);
        if (dagTab == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const graph: DagGraph = dagTab.getGraph();
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
        const colums: ProgCol[] = this.getSchema().map((col) => {
            const fontName: string = xcHelper.parsePrefixColName(col.name).name;
            return ColManager.newPullCol(fontName, col.name, col.type);
        });
        return {
            columns: colums,
            changes: []
        };
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDFInInputStruct = this.getParam();
        if (input.linkOutName) {
            hint = `Link to: ${input.linkOutName}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}