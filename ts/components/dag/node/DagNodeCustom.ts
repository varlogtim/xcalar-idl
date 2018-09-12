class DagNodeCustom extends DagNode {
    protected _subGraph: DagGraph = new DagGraph();
    protected _input: { inputNodes: NodeIOPort[] }[];
    protected _output: { outputNode: NodeIOPort }[];

    public constructor(
        options?: DagNodeCustomInfo
    ) {
        super(options);

        this.type = DagNodeType.Custom;
        this._subGraph = new DagGraph();
        this._input = [];
        this._output = [];
        this.maxParents = -1;

        if (options != null) {
            if (options.subGraph != null) {
                this._subGraph.deserializeDagGraph(options.subGraph);
            }
            if (options.inPorts != null) {
                for (const portNodes of options.inPorts) {
                    this._input.push({
                        inputNodes: portNodes.map( (connection) => {
                            const inNode = connection.childId == null
                                ? null : this._subGraph.getNode(connection.childId);
                            return {
                                node: inNode,
                                portIdx: connection.pos
                            }
                        })
                    });
                }
            }
            if (options.outPorts != null) {
                for (const connection of options.outPorts) {
                    const outNode = connection.parentId == null
                        ? null : this._subGraph.getNode(connection.parentId);
                    this._output.push({ outputNode:
                        { node: outNode, portIdx: connection.pos }
                    });
                }
            }
        }
    }

    /**
     * Link an input node(in the sub graph) to a custom node's inPort
     * @param inNodePort The node & port to link
     * @param inPortIdx The index of the input port. If not specified, a new inPort will be assigned
     * @returns index of the inPort
     */
    public addInputNode(inNodePort: NodeIOPort, inPortIdx?: number): number {
        if (inPortIdx == null) {
            const len = this._input.push({ inputNodes: [inNodePort] });
            return len - 1;
        } else {
            this._input[inPortIdx].inputNodes.push(inNodePort);
            return inPortIdx;
        }
    }

    /**
     * Link an output node(in the sub graph) to a custom node's outPort
     * @param outNodePort The node & port to link
     * @param outPortIdx The index of the output port
     * @description We don't support multiple outPorts for now, so always set outPortIdx=0
     */
    public setOutputNode(outNodePort: NodeIOPort, outPortIdx: number = 0): void {
        if (outPortIdx >= this._output.length) {
            console.error(`DagNodeCustom.setOutputNode: outPortIdx(${outPortIdx} out of range)`);
            return;
        }
        this._output[outPortIdx].outputNode = {
            node: outNodePort.node,
            portIdx: outNodePort.portIdx
        };
    }
    
    /**
     * @override
     * @param parentNode 
     * @param pos 
     */
    public connectToParent(parentNode: DagNode, pos: number = 0): void {
        super.connectToParent(parentNode, pos);
        if (this._input[pos] == null) {
            this._input[pos] = { inputNodes: [] };
        }
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    public lineageChange(columns: ProgCol[]): DagLineageChange {
        // TODO: Not implemented yet
        return {
            columns: columns,
            changes: []
        };
    }

    /**
     * Get the nested sub graph
     */
    public getSubGraph(): DagGraph {
        return this._subGraph;
    }

    protected _getSerializeInfo(): DagNodeCustomInfo {
        const nodeInfo = super._getSerializeInfo() as DagNodeCustomInfo;
        // SubGraph
        nodeInfo.subGraph = this._subGraph.serialize();
        // Input ports
        nodeInfo.inPorts = [];
        for (const inputPort of this._input) {
            const portNodes: NodeConnection[] = [];
            for (const { node, portIdx } of inputPort.inputNodes) {
                const inNodeId = node == null? null: node.getId();
                portNodes.push({
                    childId: inNodeId,
                    pos: portIdx
                });
            }
            nodeInfo.inPorts.push(portNodes);
        }
        // Output port
        nodeInfo.outPorts = [];
        for (const outPort of this._output) {
            const { node, portIdx } = outPort.outputNode;
            const outNodeId = node == null? null: node.getId();
            nodeInfo.outPorts.push({
                parentId: outNodeId,
                pos: portIdx
            });
        }

        return nodeInfo;
    }
}