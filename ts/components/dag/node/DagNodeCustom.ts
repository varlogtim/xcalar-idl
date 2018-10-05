class DagNodeCustom extends DagNode {
    protected _subGraph: DagSubGraph;
    protected _input: DagNodeCustomInput[]; // _input is supposed to have the same length as parents
    protected _output: DagNodeCustomOutput[];
    protected _customName: string = 'Custom';

    public constructor(
        options?: DagNodeCustomInfo
    ) {
        super(options);

        this.type = DagNodeType.Custom;
        this._subGraph = new DagSubGraph();
        this._input = [];
        this._output = [];
        this.maxParents = -1;
        this.minParents = 0;
        // XXX TODO: uncomment & make UI change to support export customOp
        // this.maxChildren = 0;
        this.display.icon = "&#xea5e;";

        if (options != null && options.subGraph != null
            && options.outPorts != null && options.outPorts != null
            && options.customName != null
        ) {
            // Deserialize sub graph
            const subGraph = this.getSubGraph();
            const nodeIdMap = subGraph.initFromJSON(options.subGraph);

            // Setup inputs
            for (const connection of options.inPorts) {
                const inputNodeId = nodeIdMap.has(connection.parentId)
                    ? nodeIdMap.get(connection.parentId)
                    : connection.parentId;
                const inputNode: DagNodeCustomInput
                    = <DagNodeCustomInput>subGraph.getNode(inputNodeId);
                this._setInputPort(inputNode, connection.pos);
            }

            // Setup outputs
            for (const connection of options.outPorts) {
                const outputNodeId = nodeIdMap.has(connection.childId)
                    ? nodeIdMap.get(connection.childId)
                    : connection.childId;
                const outputNode: DagNodeCustomOutput
                    = <DagNodeCustomOutput>this._subGraph.getNode(outputNodeId);
                this._setOutputPort(outputNode, connection.pos);
            }

            // Setup name
            this.setCustomName(options.customName);
        }

        this._setupSubgraphEvents();
    }

    /**
     * Link an input node(in the sub graph) to a custom node's inPort. Call this method when expanding the input ports.
     * @param inNodePort The node & port to link
     * @param inPortIdx The index of the input port. If not specified, a new inPort will be assigned
     * @returns index of the inPort
     * @description
     * 1. Create a new DagNodeCustomInput node, if it doesn't exist
     * 2. Add the DagNodeCustomInput node to _input list
     * 3. Connect DagNodeCustomInput node to the acutal DagNode in subGraph
     */
    public addInputNode(inNodePort: NodeIOPort, inPortIdx?: number): number {
        if (inPortIdx == null || inPortIdx >= this._input.length) {
            inPortIdx = this._input.length;
        }

        const subGraph = this.getSubGraph();

        // Create a new input node if it doesn't exist
        const inputNode = this._getInputPort(inPortIdx) || new DagNodeCustomInput();
        this._setInputPort(inputNode, inPortIdx);

        // Link the node in sub graph with input node
        if (inNodePort.node != null) {
            const inputNode = this._input[inPortIdx];
            subGraph.connect(inputNode.getId(), inNodePort.node.getId(), inNodePort.portIdx);
        }
        return inPortIdx;
    }

    /**
     * Link an output node(in the sub graph) to a custom node's outPort. Call this method when expanding the output ports.
     * @param outNode The node to link
     * @param outPortIdx The index of the output port. If not specified, a new outPort will be assigned
     * @returns index of the outPort
     * @description
     * 1. Create a new DagNodeCustomOutput node, if it doesn't exist
     * 2. Add the DagNodeCustomOutput node to _output list
     * 3. Connect DagNodeCustomOutput node to the acutal DagNode in subGraph
     */
    public addOutputNode(outNode: DagNode, outPortIdx?: number): number {
        if (outPortIdx == null || outPortIdx >= this._output.length) {
            outPortIdx = this._output.length;
        }

        // Create a new output node if it doesn't exist
        const outputNode = this._getOutputPort(outPortIdx) || new DagNodeCustomOutput();
        this._setOutputPort(outputNode, outPortIdx);

        // Link the node in sub graph with output node
        if (outNode != null) {
            this.getSubGraph().connect(
                outNode.getId(),
                outputNode.getId(),
                0 // output node has only one parent
            );
        }
        return outPortIdx;
    }

    /**
     * Get the list of input nodes
     */
    public getInputNodes(): DagNodeCustomInput[] {
        return this._input;
    }

    /**
     * Get the list of output nodes
     */
    public getOutputNodes(): DagNodeCustomOutput[] {
        return this._output;
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
     * Get the positions of all the nodes in the sub graph
     */
    public getSubNodePositions(): Coordinate[] {
        const posList: Coordinate[] = [];
        this.getSubGraph().getAllNodes().forEach((node) => {
            posList.push(node.getPosition());
        });
        return posList;
    }

    /**
     * Modify the postion of all the node in sub graph with a certain value
     * @param delta The value to be added to the position
     */
    public changeSubNodePostions(delta: Coordinate): void {
        this.getSubGraph().getAllNodes().forEach((node) => {
            const pos = node.getPosition();
            pos.x += delta.x;
            pos.y += delta.y;
            node.setPosition(pos);
        });
    }

    /**
     * @override
     * @param parentNode
     * @param pos
     */
    public connectToParent(parentNode: DagNode, pos: number = 0): void {
        if (this._getInputPort(pos) == null) {
            throw new Error("No avaliable input port");
        }
        super.connectToParent(parentNode, pos);
    }

    /**
     * @override
     * Get output node's table
     * @returns {Table} return id of the table of output node
     * @description We support only one output for now, so always set portIdx to 0
     */
    public getTable(portIdx: number = 0): string {
        // XXX TODO: Uncomment the following line, when we support multiple outputs
        portIdx = 0; // Hardcoded to 0 for now

        if (portIdx >= this._output.length) {
            console.error('DagNodeCustom.getTable: output out of range');
            return null;
        }

        return this._getOutputPort(portIdx).getTable();
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    public lineageChange(_: ProgCol[]): DagLineageChange {
        const columns = [];
        for (const outputNode of this._output) {
            const lineage = outputNode.getLineage();
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
        // XXX TODO: Compare parent's columns with the result columns to find out changes
        return {
            columns: columns,
            changes: []
        };
    }

    /**
     * Get the nested sub graph
     */
    public getSubGraph(): DagSubGraph {
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

    /**
     * Get the count of input/output ports
     */
    public getNumIOPorts(): { input: number, output: number } {
        return {
            input: this._input.length,
            output: this._output.length
        };
    }

    /**
     * @override
     * Check if the sub graph is configured
     */
    public isConfigured(): boolean {
        for (const outputNode of this._output) {
            if (!outputNode.isConfigured()) {
                return false;
            }
        }
        return true;
    }

    /**
     * @override
     * Generates JSON representing this node
     * @returns JSON object
     */
    public getNodeInfo(): DagNodeCustomInfo {
        const nodeInfo = <DagNodeCustomInfo>super.getNodeInfo();
        nodeInfo.subGraph = this._subGraph.getGraphInfo();
        return nodeInfo;
    }

    /**
     * @override
     * Generate JSON representing this node(w/o ids), for use in copying a node
     */
    public getNodeCopyInfo(): DagNodeCustomInfo {
        const copyInfo = <DagNodeCustomInfo>super.getNodeCopyInfo();
        copyInfo.subGraph = this._subGraph.getGraphCopyInfo();
        return copyInfo;
    }

    protected _getSerializeInfo(): DagNodeCustomInfo {
        const nodeInfo = super._getSerializeInfo() as DagNodeCustomInfo;
        // Input ports
        nodeInfo.inPorts = this._input.map((inputNode, portIdx) => {
            return {
                parentId: (inputNode == null ? null : inputNode.getId()),
                pos: portIdx
            }
        });
        // Output port
        nodeInfo.outPorts = this._output.map((outputNode, portIdx) => ({
            childId: (outputNode == null ? null : outputNode.getId()),
            pos: portIdx
        }));
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

        const inputLen = this._input.length;
        this.maxParents = inputLen;
        this.minParents = inputLen;

        return inPortIdx;
    }

    private _setOutputPort(outputNode: DagNodeCustomOutput, outPortIdx?: number): number {
        if (outPortIdx == null || outPortIdx >= this._output.length) {
            outPortIdx = this._output.length;
        }
        if (this._output[outPortIdx] == null) {
            this._output[outPortIdx] = outputNode;
            if (!this.getSubGraph().hasNode(outputNode.getId())) {
                this.getSubGraph().addNode(outputNode);
            }
        }

        // This is not an export node, because it has output ports
        this.maxChildren = -1;

        return outPortIdx;
    }

    private _getInputPort(inPortIdx): DagNodeCustomInput {
        return this._input[inPortIdx];
    }

    private _getOutputPort(outPortIdx: number): DagNodeCustomOutput {
        return this._output[outPortIdx];
    }

    private _setupSubgraphEvents() {
        // Listen to sub graph changes
        const subGraph = this.getSubGraph();
        subGraph.events.on(DagNodeEvents.SubGraphConfigured, ({id: nodeId}) => {
            if (this.isConfigured()) {
                this.beConfiguredState();
            }
        });
        subGraph.events.on(DagNodeEvents.SubGraphError, ({id: nodeId, error}) => {
            this.beErrorState(error);
        })
    }
}