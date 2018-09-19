class DagNodeCustom extends DagNode {
    protected _subGraph: DagGraph = new DagGraph();
    protected _input: DagNodeCustomInput[];
    protected _output: { outputNode: NodeIOPort }[];
    protected _customName: string = 'Custom';

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
            const subGraph = this.getSubGraph();
            if (options.subGraph != null) {
                subGraph.deserializeDagGraph(options.subGraph);
            }
            if (options.inPorts != null) {
                options.inPorts.forEach( (portNodes, portIdx) => {
                    for (const connection of portNodes) {
                        const inputNode: DagNodeCustomInput
                            = <DagNodeCustomInput>subGraph.getNode(connection.parentId);
                        this._setInputPort(inputNode, portIdx);
                    }
                });
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
            if (options.customName != null) {
                this.setCustomName(options.customName);
            }
        }

        this._setupSubgraphEvents();
    }

    /**
     * Link an input node(in the sub graph) to a custom node's inPort
     * @param inNodePort The node & port to link
     * @param inPortIdx The index of the input port. If not specified, a new inPort will be assigned
     * @returns index of the inPort
     */
    public addInputNode(inNodePort: NodeIOPort, inPortIdx?: number): number {
        if (inPortIdx == null || inPortIdx >= this._input.length) {
            inPortIdx = this._input.length;
        }

        const subGraph = this.getSubGraph();
        const inputNode = new DagNodeCustomInput();
        this._setInputPort(inputNode, inPortIdx);

        if (inNodePort.node != null) {
            const inputNode = this._input[inPortIdx];
            subGraph.connect(inputNode.getId(), inNodePort.node.getId(), inNodePort.portIdx);
        }
        return inPortIdx;
    }

    /**
     * Find the index of input port associated to a given input node
     * @param inputNode 
     */
    public getInputIndex(inputNode: DagNodeCustomInput): number {
        for (let i = 0; i < this._input.length; i ++) {
            if (this._input[i] === inputNode) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Find the parent node of a input port
     * @param inputNode 
     */
    public getInputParent(inputNode: DagNodeCustomInput): DagNode {
        const inPortIdx = this.getInputIndex(inputNode);
        if (inPortIdx < 0) {
            return null;
        }
        const parents = this.getParents();
        if (inPortIdx >= parents.length) {
            return null;
        }
        return parents[inPortIdx];
    }

    /**
     * Link an output node(in the sub graph) to a custom node's outPort
     * @param outNodePort The node & port to link
     * @param outPortIdx The index of the output port
     * @description We don't support multiple outPorts for now, so always set outPortIdx=0
     */
    public setOutputNode(outNodePort: NodeIOPort, outPortIdx: number = 0): void {
        if (this._output[outPortIdx] == null) {
            this._output[outPortIdx] = {
                outputNode: null
            };
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
        this.addInputNode({ node: null, portIdx: 0 }, pos);
        this.getSubGraph().reset();
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    public lineageChange(_: ProgCol[]): DagLineageChange {
        const columns = [];
        for (const { outputNode: { node, portIdx } } of this._output) {
            const lineage = node.getLineage();
            if (lineage != null) {
                for (const col of lineage.getColumns()) {
                    const newCol = ColManager.newPullCol(
                        col.getFrontColName(),
                        col.getBackColName(),
                        col.getType()
                    );
                    columns.push(newCol);
                }    
            }
            break; // We support only one output for now
        }
        // TODO: Compare parent's columns with the result columns to find out changes
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

    /**
     * Set the custom operator's name, which will be displayed on UI
     * @param name 
     */
    public setCustomName(name: string): void {
        this._customName = name;
    }

    /**
     * Get the custom operator's name, which will be displayed on UI
     */
    public getCustomName(): string {
        return this._customName;
    }

    protected _getSerializeInfo(): DagNodeCustomInfo {
        const nodeInfo = super._getSerializeInfo() as DagNodeCustomInfo;
        // SubGraph
        nodeInfo.subGraph = this._subGraph.serialize();
        // Input ports
        nodeInfo.inPorts = [];
        for (const inputNode of this._input) {
            const portNodes: NodeConnection[] = [];

            const inNodeMap = new Map<string, boolean>();
            for (const inNode of inputNode.getChildren()) {
                const inNodeId = inNode.getId();
                if (inNodeMap.has(inNodeId)) {
                    continue;
                }
                inNodeMap.set(inNodeId, true);
                const posList = inNode.findParentIndices(inputNode);
                for (const portIdx of posList) {
                    portNodes.push({
                        parentId: inputNode.getId(),
                        childId: inNodeId,
                        pos: portIdx
                    });
                }
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
        // name
        nodeInfo.customName = this.getCustomName();

        return nodeInfo;
    }

    private _setInputPort(inputNode: DagNodeCustomInput, inPortIdx?: number): number {
        if (inPortIdx == null || inPortIdx >= this._input.length) {
            inPortIdx = this._input.length;
        }

        if (this._input[inPortIdx] == null) {
            inputNode.setContainer(this);
            this._input[inPortIdx] = inputNode;
            if (!this.getSubGraph().hasNode(inputNode.getId())) {
                this.getSubGraph().addNode(inputNode);
            }
        }
        return inPortIdx;
    }

    private _getOutputNode(outPortIdx: number): NodeIOPort {
        if (outPortIdx >= this._output.length) {
            return null;
        }
        return this._output[outPortIdx].outputNode;
    }

    private _setupSubgraphEvents() {
        // Listen to sub graph changes
        const subGraph = this.getSubGraph();
        subGraph.events.on(DagNodeEvents.SubGraphConfigured, ({id: nodeId}) => {
            // Set configured only if the node is output node
            const outNode = this._getOutputNode(0); // We support only one output for now
            if (outNode != null && outNode.node.getId() === nodeId) {
                this.beConfiguredState();
            } 
        });
        subGraph.events.on(DagNodeEvents.SubGraphError, ({id: nodeId, error}) => {
            this.beErrorState(error);
        })
    }
}