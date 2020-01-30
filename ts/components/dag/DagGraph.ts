class DagGraph extends Durable {
    protected nodesMap: Map<DagNodeId, DagNode>;
    private removedNodesMap: Map<DagNodeId,{}>;
    private commentsMap: Map<CommentNodeId, CommentNode>;
    private removedCommentsMap: Map<CommentNodeId, CommentNode>;
    private display: Dimensions;
    private innerEvents: object;
    private lock: boolean;
    private noDelete: boolean;
    private parentTabId: string;
    private _isBulkStateSwitch: boolean;
    private _stateSwitchSet: Set<DagNode>;
    private _noTableDelete: boolean = false;
    private nodeTitlesMap: Map<string, DagNodeId>;

    protected operationTime: number;
    protected currentExecutor: DagGraphExecutor
    public events: { on: Function, off: Function, trigger: Function}; // example: dagGraph.events.on(DagNodeEvents.StateChange, console.log)

    public constructor() {
        super(null);
        this.nodesMap = new Map();
        this.removedNodesMap = new Map();
        this.commentsMap = new Map();
        this.removedCommentsMap = new Map();
        this.nodeTitlesMap = new Map();
        this.display = {
            width: -1,
            height: -1,
            scale: 1
        };
        this.lock = false;
        this.operationTime = 0;
        this._isBulkStateSwitch = false;
        this._stateSwitchSet = new Set();
        this._setupEvents();
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "required": [
            "nodes",
            "comments",
            "display"
        ],
        "properties": {
            "nodes": {
            "$id": "#/properties/nodes",
            "type": "array"
            },
            "comments": {
            "$id": "#/properties/comments",
            "type": "array"
            },
            "display": {
            "$id": "#/properties/display",
            "type": "object",
            "required": [
            ],
            "properties": {
                "width": {
                "$id": "#/properties/display/properties/width",
                "type": "integer"
                },
                "height": {
                "$id": "#/properties/display/properties/height",
                "type": "integer"
                },
                "scale": {
                "$id": "#/properties/display/properties/scale",
                "type": "integer"
                }
            }
            }
        }
    };

    /**
     * Generates the serializable version of this graph.
     */
    public getSerializableObj(includeStats?: boolean, clearTables?: boolean): DagGraphInfo {
        return this._getDurable(includeStats, clearTables);
    }

    public rebuildGraph(graphJSON: {
        nodes: {node: DagNode, parents: DagNodeId[]}[],
        comments: CommentInfo[],
        display: Dimensions,
        operationTime: number
    }): void {
        let connections: NodeConnection[] = [];
        this.display = xcHelper.deepCopy(graphJSON.display);
        this.operationTime = graphJSON.operationTime || 0;

        graphJSON.nodes.forEach((desNode) => {
            const node: DagNode = desNode.node;
            if (node instanceof DagNodeSQL && node.isHidden()) {
                return;
            }
            const childId: string = node.getId();
            const parents: string[] = desNode.parents;
            for (let i = 0; i < parents.length; i++) {
                connections.push({
                    parentId:parents[i],
                    childId:childId,
                    pos: i
                });
            }
            this.addNode(node);
        });
        // restore edges
        this.restoreConnections(connections);

        if (graphJSON.comments && Array.isArray(graphJSON.comments)) {
            let ajv = new Ajv();
            let validate = ajv.compile(CommentNode.schema);
            graphJSON.comments.forEach((comment) => {
                let valid = validate(comment);
                if (!valid) {
                    console.error(validate.errors);
                    // don't show invalid comments
                    return;
                }
                const commentNode = new CommentNode(xcHelper.deepCopy(comment));
                this.commentsMap.set(commentNode.getId(), commentNode);
            });
        }
    }

    /**
     * Create graph from DagGraphInfo
     * @param {DagGraphInfo} serializableGraph
     */
    public create(serializableGraph: DagGraphInfo): void {
        this.version = serializableGraph.version || Durable.Version;
        const nodes: {node: DagNode, parents: DagNodeId[]}[] = [];
        serializableGraph.nodes.forEach((nodeInfo: DagNodeInfo) => {
            nodeInfo["graph"] = this;
            const node: DagNode = DagNodeFactory.create(nodeInfo, this.getRuntime());
            const parents: DagNodeId[] = nodeInfo.parents;
            nodes.push({
                node: node,
                parents: parents
            });
        });

        this.rebuildGraph({
            nodes: nodes,
            comments: serializableGraph.comments,
            display: serializableGraph.display,
            operationTime: serializableGraph.operationTime
        });
    }

    public createWithValidate(serializableGraph: DagGraphInfo): void {
        // comments may not exist, so create a new comments array
        let comments: CommentInfo[] = serializableGraph.comments;
        if (!comments || !Array.isArray(comments)) {
            comments = [];
        }

        // if nodes doesn't exist, or invalid, then skip and build empty graph
        const nodes: {node: DagNode, parents: DagNodeId[]}[] = [];
        if (!serializableGraph.nodes || !Array.isArray(nodes)) {
            // add a comment explaining the error
            const text = "Invalid nodes" + "\n" + JSON.stringify(nodes, null, 2);
            const dupeComment = comments.find((comment) => {
                return comment.text.startsWith("Invalid nodes");
            });
            if (!dupeComment) {
                comments.push({
                    id: CommentNode.generateId(),
                    text: text,
                    display: {
                        x: 20,
                        y: 20,
                        width: 160,
                        height: 80
                    }
                });
            }
            // this.hasError = true;
            this.rebuildGraph({
                nodes: nodes,
                comments: comments,
                display: serializableGraph.display,
                operationTime: 0
            });
            return;
        }
        let errorNodes = [];
        let dagNodeValidate;
        let autoXCoor = 20;
        let autoYCoor = 20;
        serializableGraph.nodes.forEach((nodeInfo: DagNodeInfo) => {
            nodeInfo["graph"] = this;
            try {
                if (nodeInfo.type === DagNodeType.Dataset) {
                    this._restoreEmptySchema(<DagNodeInInfo>nodeInfo);
                }
                // validate before creating the node
                let ajv;
                if (!dagNodeValidate) {
                    ajv = new Ajv();
                    dagNodeValidate = ajv.compile(DagNode.schema);
                }
                if (nodeInfo.display) {
                    if (nodeInfo.display.x < 20) {
                        nodeInfo.display.x = autoXCoor;
                        autoXCoor++;
                    }
                    if (nodeInfo.display.y < 20) {
                        nodeInfo.display.y = autoYCoor;
                        autoYCoor++;
                    }
                    nodeInfo.display.x = Math.round(nodeInfo.display.x) || autoXCoor++;
                    nodeInfo.display.y = Math.round(nodeInfo.display.y) || autoYCoor++;
                }
                let valid = dagNodeValidate(nodeInfo);
                if (!valid) {
                    // only saving first error message
                    const msg = DagNode.parseValidationErrMsg(nodeInfo, dagNodeValidate.errors[0]);
                    throw (msg);
                }
                const nodeClass = DagNodeFactory.getNodeClass(nodeInfo);
                const nodeSpecificSchema = nodeClass.specificSchema;
                ajv = new Ajv();
                let validate = ajv.compile(nodeSpecificSchema);
                valid = validate(nodeInfo);
                if (!valid) {
                    // only saving first error message
                    const msg = DagNode.parseValidationErrMsg(nodeInfo, validate.errors[0]);
                    throw (msg);
                }
                const node: DagNode = DagNodeFactory.create(nodeInfo);
                const parents: DagNodeId[] = nodeInfo.parents;
                nodes.push({
                    node: node,
                    parents: parents
                });
            } catch (e) {
                if (typeof e === "string") {
                    nodeInfo.error = e;
                } else {
                    nodeInfo.error = xcHelper.parseJSONError(e).error;
                }
                // convert invalid nodes into comments
                const text = nodeInfo.error + "\n" + JSON.stringify(nodeInfo, null, 2);
                const dupeComment = comments.find((comment) => {
                    return comment.text.startsWith(nodeInfo.error);
                });
                if (!dupeComment) {
                    errorNodes.push(nodeInfo);
                    comments.push({
                        id: CommentNode.generateId(),
                        text: text,
                        display: {
                            x: 20,
                            y: 20 + (100 * (errorNodes.length - 1)),
                            width: 160,
                            height: 80
                        }
                    });
                }
            }
        });

        this.rebuildGraph({
            nodes: nodes,
            comments: comments,
            display: serializableGraph.display,
            operationTime: 0
        });
        this.clear();
    }

    public clone(): DagGraph {
        const serializableGraph: DagGraphInfo = this.getSerializableObj();
        const graph: DagGraph = this.getRuntime().accessible(new DagGraph());
        graph.create(serializableGraph);
        graph.clear();
        return graph;
    }

    public clear(): void {
        this.resetOperationTime();
        this.getAllNodes().forEach((node) => {
            const state: DagNodeState = node.getState();
            if (state === DagNodeState.Complete) {
                // set table to empty first so it will not ulock that table
                node.setTable("");
                node.beConfiguredState();
            }
            if (node instanceof DagNodeSQL) {
                node.resetSubGraphNodeIds();
            }
        });
    }

    public setNoTableDelete() {
        this._noTableDelete = true;
    }

    /**
     * Filter node based on the callback
     * @param callback return true for valid case
     */
    public filterNode(callback: Function): DagNode[] {
        const nodes: DagNode[] = [];
        for (const [nodeId, node] of this.nodesMap) {
            if (callback(node, nodeId)) {
                nodes.push(node);
            }
        }
        return nodes;
    }

    /**
     * get node from id
     * @param nodeId node's id
     * @returns {DagNode} dag node
     */
    public getNode(nodeId: DagNodeId): DagNode | null {
        return this._getNodeFromId(nodeId);
    }

    public getNodesByType(type: DagNodeType) {
        const matches: DagNode[] = [];
        for (let node of this.nodesMap.values()) {
            if (node.getType() === type) {
                matches.push(node);
            }
        }
        return matches;
    }

    /**
     * create a new node
     * @param nodeInfo
     * @returns {DagNode} dag node created
     */
    public newNode(nodeInfo: DagNodeInfo): DagNode {
        nodeInfo["graph"] = this;
        const dagNode: DagNode = DagNodeFactory.create(nodeInfo);
        if (!dagNode.getTitle()) {
            const title = this.generateNodeTitle();
            dagNode.setTitle(title);
        }
        this.addNode(dagNode);
        this.events.trigger(DagGraphEvents.NewNode, {
            tabId: this.parentTabId,
            node: dagNode
        });
        return dagNode;
    }

    /**
     * Generate node title with format "Label {number}"
     */
    public generateNodeTitle(): string {
        return `Label ${this.nodesMap.size + 1}`;
    }

    /**
     * adds back a removed node
     * @param nodeId
     */
    public addBackNode(nodeId: DagNodeId, spliceMap?): DagNode {
        const nodeInfo = this._getRemovedNodeInfoFromId(nodeId);
        const node = nodeInfo["node"]
        const parents: DagNode[] = node.getParents();
        const children: DagNode[] = node.getChildren();

        parents.forEach((parent) => {
            if (parent != null) {
                parent.connectToChild(node);
            }
        });

        // go through the children of the node we're adding back, but don't
        // repeat the same children twice.
        // Add back the connections in nodeInfo["childIndices"] in reverse
        // order i.e. if 0, 1, and 2 was removed, add back 2, 1, and then 0
        const seen = {};
        children.forEach((child) => {
            const childId = child.getId();
            if (seen[childId]) {
                return;
            }
            seen[childId] = true;
            const connectionIndices = nodeInfo["childIndices"][childId];
            // add back connections in reverse order to
            // match how they were removed
            for (let i = connectionIndices.length - 1; i >= 0; i--) {
                let spliceIn = false;
                if (spliceMap && spliceMap[childId] && spliceMap[childId][i]) {
                    spliceIn = true;
                }
                child.connectToParent(node, connectionIndices[i], spliceIn);
            }
        })

        if (node instanceof DagNodeSQLFuncIn) {
            // update before the node added
            this.events.trigger(DagGraphEvents.AddBackSQLFuncInput, {
                tabId: this.parentTabId,
                order: node.getOrder()
            });
        }
        this.nodesMap.set(node.getId(), node);
        this.removedNodesMap.delete(node.getId());
        this.nodeTitlesMap.set(node.getTitle(), node.getId());
        const set = this._traverseSwitchState(node);

        this.events.trigger(DagNodeEvents.ConnectionChange, {
            type: "add",
            descendents: [...set],
            addInfo: {
                childIndices: nodeInfo["childIndices"],
                node: node
            },
            tabId: this.parentTabId
        });
        this.events.trigger(DagGraphEvents.NewNode, {
            tabId: this.parentTabId,
            node: node
        });
        return node;
    }

    /**
     * @returns {CommentNode}
     * @param commentId
     */
    public addBackComment(commentId): CommentNode {
        const comment = this.removedCommentsMap.get(commentId);
        this.commentsMap.set(commentId, comment);
        this.removedCommentsMap.delete(commentId);
        return comment;
    }

    /**
     * add a new node
     * @param dagNode node to add
     */
    public addNode(dagNode: DagNode): void {
        this.nodesMap.set(dagNode.getId(), dagNode);
        let origTitle = dagNode.getTitle();
        if (origTitle) {
            let title = origTitle;
            let count = 1;
            while (this.nodeTitlesMap.has(title)) {
                title = origTitle + "(" + (count++) + ")";
            }
            dagNode.setTitle(title);
            this.nodeTitlesMap.set(title, dagNode.getId());
        }

        if (dagNode instanceof DagNodeSQLFuncIn) {
            this.events.trigger(DagGraphEvents.AddSQLFuncInput, {
                tabId: this.parentTabId,
                node: dagNode
            });
        }
        dagNode.registerEvents(DagNodeEvents.StateChange, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.StateChange, info);
            if (info.state === DagNodeState.Configured) {
                this.events.trigger(DagNodeEvents.SubGraphConfigured, {
                    id: info.id,
                    tabId: this.parentTabId
                });
            } else if (info.state === DagNodeState.Error) {
                this.events.trigger(DagNodeEvents.SubGraphError, {
                    id: info.id,
                    tabId: this.parentTabId,
                    error: info.node.getError()
                });
            }
        })
        .registerEvents(DagNodeEvents.ParamChange, (info) => {
            this.events.trigger(DagGraphEvents.TurnOffSave, {
                tabId: this.parentTabId
            });
            const node = this.getNode(info.id);
            this._traverseSwitchState(node);
            this.events.trigger(DagGraphEvents.TurnOnSave, {
                tabId: this.parentTabId
            });

            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.ParamChange, info);
        })
        .registerEvents(DagNodeEvents.ProgressChange, (info) => {
            this.events.trigger(DagNodeEvents.ProgressChange, info);
        })
        .registerEvents(DagNodeEvents.TableRemove, (info) => {
            if (this._noTableDelete) {
                return;
            }
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.TableRemove, info);
            const tableName: string = info.table;
            const node: DagNode = info.node;
            const nodeType: DagNodeType = node.getType();
            if (nodeType !== DagNodeType.DFIn &&
                nodeType !== DagNodeType.DFOut &&
                nodeType !== DagNodeType.CustomInput
            ) {
                DagUtil.deleteTable(tableName);
            }
        })
        .registerEvents(DagNodeEvents.ResultSetChange, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.ResultSetChange, info);
        })
        .registerEvents(DagNodeEvents.AggregateChange, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.AggregateChange, info);
        })
        .registerEvents(DagNodeEvents.PreTablePin, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.PreTablePin, info);
        })
        .registerEvents(DagNodeEvents.PostTablePin, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.PostTablePin, info);
        })
        .registerEvents(DagNodeEvents.PreTableUnpin, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.PreTableUnpin, info);
        })
        .registerEvents(DagNodeEvents.PostTableUnpin, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.PostTableUnpin, info);
        })
        .registerEvents(DagNodeEvents.LineageSourceChange, (info) => {
            this._traverseResetLineage(info.node);
            const tabId: string = this.getTabId();
            info = $.extend({}, info, {
                tabId: tabId
            });
            this.events.trigger(DagNodeEvents.LineageSourceChange, info);
        })
        .registerEvents(DagNodeEvents.LineageChange, (info) => {
            this._traverseResetLineage(info.node);
            this.events.trigger(DagNodeEvents.LineageChange, info);
        })
        .registerEvents(DagNodeEvents.TitleChange, (info) => {
            this.nodeTitlesMap.delete(info.oldTitle);
            this.nodeTitlesMap.set(info.title, dagNode.getId());
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.TitleChange, info);
        })
        .registerEvents(DagNodeEvents.DescriptionChange, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.DescriptionChange, info);
        })
        .registerEvents(DagNodeEvents.RetinaRemove, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.RetinaRemove, info);
        })
        .registerEvents(DagNodeEvents.AutoExecute, (info) => {
            this.events.trigger(DagNodeEvents.AutoExecute, info);
        })
        .registerEvents(DagNodeEvents.StartSQLCompile, (info) => {
            this.events.trigger(DagNodeEvents.StartSQLCompile, info);
        })
        .registerEvents(DagNodeEvents.EndSQLCompile, (info) => {
            this.events.trigger(DagNodeEvents.EndSQLCompile, info);
        })
        .registerEvents(DagNodeEvents.UDFErrorChange, (info) => {
            this.events.trigger(DagNodeEvents.UDFErrorChange, info);
            this.events.trigger(DagGraphEvents.Save, {tabId: this.parentTabId});
        })
        .registerEvents(DagNodeEvents.Hide, info => {
            this.events.trigger(DagNodeEvents.Hide, info);
        });


    }

    /**
     * remove a node
     * @param nodeId node's id
     */
    public removeNode(
        nodeId: DagNodeId,
        switchState: boolean = true,
        clearMeta: boolean = true
    ): {dagNodeId: boolean[]} {
        const node: DagNode = this._getNodeFromId(nodeId);
        return this._removeNode(node, switchState, clearMeta);
    }

    /**
     * check if has the node or not
     * @param nodeId node'id
     * @returns {boolean} true if has the node, false otherwise
     */
    public hasNode(nodeId: DagNodeId): boolean {
        return this.nodesMap.has(nodeId);
    }

    /**
     * move a node
     * @param nodeId node's id
     * @param position new position of the node
     */
    public moveNode(nodeId: DagNodeId, position: Coordinate): void {
        const node: DagNode = this._getNodeFromId(nodeId);
        node.setPosition(position);
    }

    /**
     * DagGraph.canConnect
     * @param parentNodeId
     * @param childNodeId
     * @param childPos
     */
    public canConnect(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        childPos: number,
        allowCyclic?: boolean
    ): boolean {
        let canConnect: boolean = this.connect(parentNodeId, childNodeId, childPos, allowCyclic, false, false, false);
        if (canConnect) {
            this.disconnect(parentNodeId, childNodeId, childPos, false, false);
        }

        return canConnect;
    }

    /**
     * connect two nodes
     * @param parentNodeId parent node
     * @param childNodeId child node
     * @param childPos 0 based position of the  child node's input
     */
    public connect(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        childPos: number = 0,
        allowCyclic: boolean = false,
        switchState: boolean = true,
        spliceIn: boolean = false,
        updateConfig: boolean = true // control whether SQL node connection should setParam
    ): boolean {
        let connectedToParent = false;
        let parentNode: DagNode;
        let childNode: DagNode;
        try {
            parentNode = this._getNodeFromId(parentNodeId);
            childNode = this._getNodeFromId(childNodeId);
            if (childNode instanceof DagNodeSQL) {
                childNode.connectToParent(parentNode, childPos, spliceIn, updateConfig);
            } else {
                childNode.connectToParent(parentNode, childPos, spliceIn);
            }
            connectedToParent = true;
            parentNode.connectToChild(childNode);

            if (!allowCyclic && this._isCyclic(parentNode)) {
                parentNode.disconnectFromChild(childNode);
                if (childNode instanceof DagNodeSQL) {
                    childNode.disconnectFromParent(parentNode, childPos, updateConfig);
                } else {
                    childNode.disconnectFromParent(parentNode, childPos);
                }
                connectedToParent = false;
                throw new Error(DagTStr.CycleConnection);
            }
            if (switchState) {
                const descendentSets = this._traverseSwitchState(childNode);
                const childIndices = {};
                childIndices[childNodeId] = childPos;
                this.events.trigger(DagNodeEvents.ConnectionChange, {
                    type: "add",
                    descendents:[...descendentSets],
                    addInfo: {
                        childIndices: childIndices,
                        node: parentNode
                    },
                    tabId: this.parentTabId
                });
            }
            return true;
        } catch (e) {
            if (connectedToParent) {
                // error handler
                childNode.disconnectFromParent(parentNode, childPos);
            }
            return false;
        }
    }

    /**
     * Mass adds the connections specified in connections
     * @param connections The connections we want to restore.
     */
    public restoreConnections(connections: NodeConnection[]): void {
        connections.forEach((edge: NodeConnection) => {
            if (edge.parentId != null && edge.childId != null) {
                this.connect(edge.parentId, edge.childId, edge.pos, false, false);
            }
        });
    }

    /**
     * disconnect two nodes
     * @param parentNodeId from node
     * @param childNodeId to node
     * @param toPos 0 based position of the  child node's input
     */
    public disconnect(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        toPos: number = 0,
        switchState: boolean = true,
        updateConfig: boolean = true
    ): boolean {
        const parentNode: DagNode = this._getNodeFromId(parentNodeId);
        const childNode: DagNode = this._getNodeFromId(childNodeId);
        let wasSpliced;
        if (childNode instanceof DagNodeSQL) {
            wasSpliced = childNode.disconnectFromParent(parentNode, toPos, updateConfig);
        } else {
            wasSpliced = childNode.disconnectFromParent(parentNode, toPos);
        }
        parentNode.disconnectFromChild(childNode);
        if (switchState) {
            const descendentSets = this._traverseSwitchState(childNode);
            const childIndices = {};
            childIndices[childNodeId] = toPos;
            this.events.trigger(DagNodeEvents.ConnectionChange, {
                type: "remove",
                descendents: [...descendentSets],
                removeInfo: {
                    childIndices: childIndices,
                    node: parentNode
                },
                tabId: this.parentTabId
            });
        }
        return wasSpliced;
    }

   /**
    * remove the whole graph
    */
    public remove(): void {
        const values: IterableIterator<DagNode> = this.nodesMap.values();
        for (let dagNode of values) {
            this._removeNode(dagNode, false);
        }
    }

    /**
     * execute the whole graph or some nodes in graph
     *  @param nodeIds nodes that need to execute
     * @returns {JQueryDeferred}
     */
    public execute(
        nodeIds?: DagNodeId[],
        optimized?: boolean,
        parentTxId?: number,
        generateOptimizedDataflow?: boolean
    ): XDPromise<void> {
        this.resetOperationTime();
        // If optimized and nodeIds not specified, then look for 1 optimized node.
        // If more than 1 optimized node is found, we fail,
        // If exactly 1 is found, we assign it to nodeIds so we can
        // back traverse the nodes and get all the nodes we need rather than
        // every node in the dataflow, where some unneeded nodes may be disjoint
        // and cause the validation precheck test to fail

        // XXX Deprecated, this should not happen in 2.1
        if (!nodeIds && optimized && parentTxId == null) {
            let ret = <any>this._getExecutingOptimizedNodeIds();
            if (ret && ret.hasError) {
                return PromiseHelper.reject(ret);
            } else if (ret && ret.length) {
                nodeIds = ret;
            }
        }
        if (nodeIds == null) {
            return this._executeGraph(null, optimized, null, parentTxId, generateOptimizedDataflow);
        } else {
            // get subGraph from nodes and execute
            // we want to stop at the next node with a table unless we're
            // executing optimized in which case we want the entire query
            const backTrack: BackTraceInfo = this.backTraverseNodes(nodeIds, !optimized);
            if (backTrack.error != null) {
                return PromiseHelper.reject(backTrack.error);
            }
            const nodesMap: Map<DagNodeId, DagNode> = backTrack.map;
            const startingNodes: DagNodeId[] = backTrack.startingNodes;
            return this._executeGraph(nodesMap, optimized, startingNodes, parentTxId, generateOptimizedDataflow);
        }
    }

    public cancelExecute(): void {
        if (this.currentExecutor != null) {
            this.currentExecutor.cancel();
        }
    }

    public getExecutor(): DagGraphExecutor {
        return this.currentExecutor;
    }

    public setExecutor(executor: DagGraphExecutor): void {
        this.currentExecutor = executor;
    }

    public restoreExecution(queryName: string): void {
        const executor: DagGraphExecutor = new DagGraphExecutor([], this, {isRestoredExecution: true});
        executor.restoreExecution(queryName);
    }

    /**
     * @description gets query from multiple nodes, only used to create retinas
     * assumes nodes passed in were already validated
     * @param nodeIds
     * @param noReplaceParam
     * @param parentExecutor used to pass down to next executor so we can
     * track the chain of txIds
     */
    public getOptimizedQuery(
        nodeIds: DagNodeId[],
        noReplaceParam?: boolean,
        parentTxId?: number
    ): XDPromise<{queryStr: string, destTables: string[]}> {
         // clone graph because we will be changing each node's table and we don't
        // want this to effect the actual graph
        const clonedGraph = this.clone();
        clonedGraph.setTabId(this.getTabId());
        this._normalizeSelfLinkingInOptimzedQuery(clonedGraph, nodeIds);
        let orderedNodes: DagNode[] = nodeIds.map((nodeId) => clonedGraph._getNodeFromId(nodeId));
        // save original sql nodes so we can cache query compilation
        let sqlNodes: Map<string, DagNodeSQL> = new Map();
        nodeIds.forEach((nodeId) => {
            let node: DagNode = this._getNodeFromId(nodeId);
            if (node instanceof DagNodeSQL) {
                sqlNodes.set(node.getId(), node);
            }
        });
        const executor: DagGraphExecutor = this.getRuntime().accessible(
            new DagGraphExecutor(orderedNodes, clonedGraph, {
                optimized: true,
                noReplaceParam: noReplaceParam,
                sqlNodes: sqlNodes,
                synthesizeDFOut: true,
                parentTxId: parentTxId
            })
        );
        return executor.getBatchQuery();
    }

    private _normalizeSelfLinkingInOptimzedQuery(clondeGraph: DagGraph, nodeIds: DagNodeId[]): void {
        let dataflowId = this.getTabId();
        nodeIds.forEach((nodeId) => {
            try {
                let node = this.getNode(nodeId);
                if (node instanceof DagNodeDFIn) {
                    let param: DagNodeDFInInputStruct = node.getParam();
                    if (param.dataflowId === DagNodeDFIn.SELF_ID) {
                        // if the link in link to link out in current datflow,
                        // need to reuse the link out in the non-cloned graph
                        // to reuse the result
                        let clonedNode = clondeGraph.getNode(nodeId);
                        clonedNode.setParam({
                            dataflowId: dataflowId,
                            linkOutName: param.linkOutName,
                            source: param.source
                        }, true);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        });
    }

    // for SDK use only
    public getRetinaArgs(nodeIds?: DagNodeId[], noReplaceParam: boolean = true): XDPromise<void> {
        let nodesMap: Map<DagNodeId, DagNode>;
        let startingNodes: DagNodeId[];
        // If optimized and nodeIds not specified, then look for 1 optimized node.
        // If more than 1 optimized node is found, we fail,
        // If exactly 1 is found, we assign it to nodeIds so we can
        // back traverse the nodes and get all the nodes we need rather than
        // every node in the dataflow, where some unneeded nodes may be disjoint
        // and cause the validation precheck test to fail
        if (nodeIds == null) {
            let ret = <any>this._getExecutingOptimizedNodeIds();
            if (ret && ret.hasError) {
                return PromiseHelper.reject(ret);
            } else if (ret && ret.length) {
                nodeIds = ret;
            }
        }
        if (nodeIds != null) {
            // get subGraph from nodes and execute
            // we want to stop at the next node with a table unless we're
            // executing optimized in which case we want the entire query
            const backTrack: BackTraceInfo = this.backTraverseNodes(nodeIds, false);
            nodesMap = backTrack.map;
            startingNodes = backTrack.startingNodes;
        }

        let orderedNodes: DagNode[] = [];
        try {
            orderedNodes = this._topologicalSort(nodesMap, startingNodes);
        } catch (error) {
            return PromiseHelper.reject({
                "status": "Error",
                "hasError": true,
                "node": error.node,
                "type": error.error
            });
        }
        const executor: DagGraphExecutor = this.getRuntime().accessible(
            new DagGraphExecutor(orderedNodes, this, {
                optimized: true,
                noReplaceParam: noReplaceParam
            })
        );
        let checkResult = executor.validateAll();
        if (checkResult.hasError) {
            return PromiseHelper.reject(checkResult);
        }
        return executor.getRetinaArgs(true);
    }

    /**
     * @description gets query from the lineage of 1 node, includes validation
     * @param nodeId
     * @param optimized
     * @param isCloneGraph
     * @param reuseCompletedNodes when true, reuse aggregates if they exist
     */
    public getQuery(
        nodeId?: DagNodeId,
        optimized?: boolean,
        isCloneGraph: boolean = true,
        allowNonOptimizedOut: boolean = false,
        parentTxId?: number,
        reuseCompletedNodes: boolean = false,
        isLinkInBatch: boolean = false
    ): XDPromise<{queryStr: string, destTables: string[]}> {
        // clone graph because we will be changing each node's table and we don't
        // want this to effect the actual graph
        const graph = isCloneGraph ? this.clone() : this;
        graph.setTabId(this.getTabId());

        const nodesMap: Map<DagNodeId, DagNode> = nodeId != null
            ? graph.backTraverseNodes([nodeId], reuseCompletedNodes).map
            : graph.getAllNodes();

        const orderedNodes: DagNode[] = graph._topologicalSort(nodesMap);

        // save original sql nodes so we can cache query compilation
        let sqlNodes: Map<string, DagNodeSQL> = new Map();
        orderedNodes.forEach((clonedNode) => {
            let node: DagNode = this._getNodeFromId(clonedNode.getId());
            if (node instanceof DagNodeSQL) {
                sqlNodes.set(node.getId(), node);
            }
        });
        const executor: DagGraphExecutor = this.getRuntime().accessible(
            new DagGraphExecutor(orderedNodes, graph, {
                optimized: optimized,
                allowNonOptimizedOut: allowNonOptimizedOut,
                sqlNodes: sqlNodes,
                parentTxId: parentTxId,
                isLinkInBatch: isLinkInBatch
            })
        );

        const checkResult = executor.checkCanExecuteAll();
        if (checkResult.hasError) {
            return PromiseHelper.reject(checkResult);
        }
        return executor.getBatchQuery(reuseCompletedNodes);
    }

    /**
     * Recursively replace linkIn's source with corresponding linkOut's resultant table,
     * to avoid executing a dataflow when converting dataflows to xcalar query.
     * This is called in expServer(SDK)
     */
    // XXX TODO: Split the linkIn-linkOut chain into multiple phases, to support executing DF from file
    public processLinkedNodes() {
        const graphList: DagGraph[] = [this]; // DFS task stack
        const visited: DagGraph[] = [];

        while (graphList.length > 0) {
            const graph = graphList.pop();
            if (visited.indexOf(graph) >= 0) {
                continue;
            }

            // Go through every linkIn nodes in the current graph
            const linkInNodes = <DagNodeDFIn[]>graph.getNodesByType(DagNodeType.DFIn);
            for (const linkInNode of linkInNodes) {
                // Skip any linkIn nodes already have a source
                if (linkInNode.hasSource()) {
                    continue;
                }
                // Get the corresponding linkOut node and the graph it's in
                const { graph: linkGraph, node: linkOutNode } = linkInNode.getLinkedNodeAndGraph();
                const sourceTable = linkOutNode.getTable();
                if (linkOutNode.shouldLinkAfterExecution() && sourceTable != null) {
                    // Replace the source with linkOut's table
                    linkInNode.setSource(sourceTable);
                } else {
                    // Keep exploring graphs
                    graphList.push(linkGraph);
                }
            }

            visited.push(graph);
        }
    }

    /**
     *
     * @param nodeIds
     */
    public reset(nodeIds?: DagNodeId[]): void {
        let nodes: DagNode[] = [];
        if (nodeIds == null) {
            this.nodesMap.forEach((node: DagNode) => {
                nodes.push(node);
            });
        } else {
            nodeIds.forEach((nodeId) => {
                let node = this.getNode(nodeId);
                if (node != null) {
                    nodes.push(node);
                }
            });
        }
        let travsesedSet: Set<DagNode> = new Set();
        nodes.forEach((node) => {
            if (!travsesedSet.has(node)) {
                if (node instanceof DagNodeSQL) {
                    if (node.getState() === DagNodeState.Complete ||
                        node.getState() === DagNodeState.Error) {
                        node.setXcQueryString(null);
                        node.setRawXcQueryString(null);
                    }
                    node.updateSubGraph();
                }
                const set: Set<DagNode> = this._traverseSwitchState(node);
                travsesedSet = new Set([...travsesedSet, ...set]);
            }
        });
    }

    public setDimensions(width: number, height: number): void  {
        this.display.width = width;
        this.display.height = height;
    }

    public getDimensions(): Dimensions {
        return {
            width: this.display.width,
            height: this.display.height
        }
    }

    public setScale(scale: number): void {
        this.display.scale = scale
    }

    public getScale(): number {
        return this.display.scale || 1;
    }

    public getAllNodes(): Map<DagNodeId, DagNode> {
        return this.nodesMap;
    }

    /**
     * @returns {Map<CommentNodeId, CommentNode>}
     */
    public getAllComments(): Map<CommentNodeId, CommentNode> {
        return this.commentsMap;
    }

    /**
     * returns a topologically sorted array of dag nodes
     * @returns {DagNode[]}
     */
    public getSortedNodes(): DagNode[] {
        return this._topologicalSort();
    }

    /**
     * Retrieve the connection(edge) information of a sub graph
     * @param nodeIds NodeId list of a sub graph
     * @returns
     * inner: inner connection(both nodes are in the sub graph);
     * in: input connection(parent node is outside);
     * out: output connection(child node is outside);
     * openNodes: list of node ids, which are required to complete the sub graph
     */
    public getSubGraphConnection(
        nodeIds: DagNodeId[]
    ): DagSubGraphConnectionInfo {
        const subGraphMap = new Map<DagNodeId, DagNode>();
        for (const nodeId of nodeIds) {
            let node = this.getNode(nodeId);
            if (node != null) {
                subGraphMap.set(nodeId, node);
            }
        }

        const innerEdges: NodeConnection[] = [];
        const inputEdges: NodeConnection[] = [];
        const outputEdges: NodeConnection[] = [];
        const inEnds: Set<DagNodeId> = new Set(); // Potential input nodes(no parent)
        const outEnds: Set<DagNodeId> = new Set(); // Potential output nodes(no child)
        const sourceNodes: Set<DagNodeId> = new Set(); // DF input nodes(ex.: dataset)
        const destNodes: Set<DagNodeId> = new Set(); // DF export nodes(ex.: export)
        let noViewOutput: boolean = false; // if output node produces a table that can be previewed
        for (const [subNodeId, subNode] of subGraphMap.entries()) {
            // Find inputs
            // Node with unlimited parents: maxParent = -1; numParent >=0
            const leastParentsExpected = 1;
            let numParentNotLink: number = Math.max(
                subNode.getMaxParents(), subNode.getNumParent(), leastParentsExpected);
            subNode.getParents().forEach( (parent, parentIndex) => {
                if (parent != null) {
                    numParentNotLink --;
                }

                const parentId = parent == null ? null : parent.getId();
                const edge: NodeConnection = {
                    parentId: parentId,
                    childId: subNodeId,
                    pos: parentIndex
                };
                if (subGraphMap.has(parentId)) {
                    // Internal connection
                    innerEdges.push(edge);
                } else {
                    // Input connection
                    inputEdges.push(edge);
                }
            });
            // Check if the node is an inputEnd or sourceNode
            if (this._isSourceNode(subNode)) {
                sourceNodes.add(subNodeId);
            } else if (numParentNotLink > 0) {
                inEnds.add(subNodeId);
            }

            // Find outputs
            const childMap = new Map<DagNodeId, DagNode>(); // Children not in the sub graph
            for (const child of subNode.getChildren()) {
                if (!subGraphMap.has(child.getId())) {
                    childMap.set(child.getId(), child);
                }
            }
            for (const [childId, child] of childMap.entries()) {
                const parentIndices = child.findParentIndices(subNode);
                for (const parentIndex of parentIndices) {
                    outputEdges.push({
                        parentId: subNodeId,
                        childId: childId,
                        pos: parentIndex
                    });
                }
            }
            // Check if the node is an outputEnd or exportNode
            if (subNode.getChildren().length === 0) {
                if (this._isDestNode(subNode)) {
                    destNodes.add(subNodeId);
                    if ((subNode instanceof DagNodeExport) || (subNode instanceof DagNodePublishIMD)) {
                        noViewOutput = true;
                    }
                } else {
                    outEnds.add(subNodeId);
                }
            }
        }

        // Check open graph
        // Considering the subgraph as an unity, an open graph is such a
        // subgraph that there exists a path starting from one of its children
        // and ending with one of its parents,
        // which means the subgraph links to itself through this path.
        const inputNodeIdSet = new Set<DagNodeId>();
        for (const { parentId } of inputEdges) {
            inputNodeIdSet.add(parentId);
        }
        const outputNodeIdSet = new Set<DagNodeId>();
        for (const { childId } of outputEdges) {
            outputNodeIdSet.add(childId);
        }
        // For performance consideration, we only find one open node
        const openNodeId = this._findReachable(outputNodeIdSet, inputNodeIdSet);

        return {
            inner: innerEdges,
            in: inputEdges,
            out: outputEdges,
            openNodes: openNodeId == null ? [] : [openNodeId],
            endSets: { in: inEnds, out: outEnds },
            dfIOSets: { in: sourceNodes, out: destNodes },
            noViewOutput: noViewOutput
        };
    }

    /**
     * Sets the tab id this graph resides in
     * @param id
     */
    public setTabId(id: string) {
        this.parentTabId = id;
    }

    /**
     * Returns the Tab ID this graph resides in.
     */
    public getTabId(): string {
        return this.parentTabId;
    }

    /**
     * Locks the graph from modification.
     * Used primarily in execution.
     */
    public lockGraph(nodeIds: DagNodeId[], executor: DagGraphExecutor): void {
        this.lock = true;
        this.currentExecutor = executor;
        if (!this.parentTabId) {
            return;
        };
        this.events.trigger(DagGraphEvents.LockChange, {
            lock: true,
            tabId: this.parentTabId,
            nodeIds: nodeIds
        });
    }

    /**
     * Unlocks the graph for modification.
     */
    public unlockGraph(nodeIds?: DagNodeId[]): void {
        this.lock = false;
        this.currentExecutor = null;
        if (!this.parentTabId) return;
        this.events.trigger(DagGraphEvents.LockChange, {
            lock: false,
            tabId: this.parentTabId,
            nodeIds: nodeIds
        });
    }

    /**
     * Returns if this graph is currently locked.
     * @returns {boolean}
     */
    public isLocked(): boolean {
        return this.lock;
    }

    public setGraphNoDelete(): void {
        this.noDelete = true;
    }

    public unsetGraphNoDelete(): void {
        this.noDelete = false;
    }

    public isNoDelete(): boolean {
        return this.noDelete;
    }

    /**
     * Resets ran nodes to go back to configured.
     */
    public resetStates() {
        this.nodesMap.forEach((node) => {
            if (node.getState() == DagNodeState.Complete || node.getState() == DagNodeState.Running) {
                node.beConfiguredState();
            }
        });
    }

     /**
     * create a new comment
     * @param commentInfo
     * @returns {CommentNode} dag node created
     */
    public newComment(commentInfo: CommentInfo): CommentNode {
        const commentNode: CommentNode = new CommentNode(commentInfo);
        this.commentsMap.set(commentNode.getId(), commentNode);
        return commentNode;
    }

    /**
     * @returns {CommentNode}
     * @param commentId
     */
    public getComment(commentId) {
        return this.commentsMap.get(commentId);
    }

    /**
     *
     * @param commentId
     */
    public removeComment(commentId) {
        const comment = this.commentsMap.get(commentId);
        this.removedCommentsMap.set(commentId, comment);
        this.commentsMap.delete(commentId);
    }

    /**
     *
     * @param node
     */
    public traverseGetChildren(node: DagNode): Set<DagNode> {
        const traversedSet: Set<DagNode> = new Set();
        this._traverseChildren(node, (node: DagNode) => {
            traversedSet.add(node);
        });
        return traversedSet;
    }

    /**
     * This function, when given a node, returns any nodes within the current graph that it relies
     * on execution from.
     * If a node is a map, filter, or DFIn, we need to consider adding its "source"
     * (for any aggregates or the literal source for dfIN) to its parents
     * @param node
     * @returns {{sources: DagNode[], error: string}}
     */
    public findNodeNeededSources(
        node: DagNode,
        aggMap?: Map<string, DagNode>
    ): {sources: DagNode[], error: string} {
        let error: string;
        let sources: DagNode[] = [];
        const aggregates: string[] = node.getAggregates();
        if (aggregates.length > 0) {
            for (let i = 0; i < aggregates.length; i++) {
                let agg: string = aggregates[i];
                if (aggMap != null && aggMap.has(agg)) {
                    // Within aggMap
                    let aggNode = aggMap.get(agg);
                    sources.push(aggNode);
                } else {
                    // If we don't have the aggMap, we have to look at the manager
                    let aggInfo: AggregateInfo = this.getRuntime().getDagAggService().getAgg(agg);

                    if (aggInfo == null) {
                        error = xcStringHelper.replaceMsg(AggTStr.AggNotExistError, {
                            "aggName": agg
                        });
                        break;
                    } else if (aggInfo.value) {
                        // If it already has a value, that's fine and we can reuse it.
                        continue;
                    } else if (aggInfo.graph == null) {
                        // Doesnt have a graph, this aggregate can't be found.
                        error = xcStringHelper.replaceMsg(AggTStr.AggNodeNotExistError, {
                            "aggName": agg
                        });
                    } else if (aggInfo.node == null) {
                        // Node either doesnt exist or is not in this graph
                        error = xcStringHelper.replaceMsg(AggTStr.AggNodeNotExistError, {
                            "aggName": agg
                        });
                    } else if (aggInfo.graph != this.getTabId() || !this.hasNode(aggInfo.node)) {
                        // Created in a different graph and not executed
                        error = xcStringHelper.replaceMsg(AggTStr.AggNodeMustExecuteError, {
                            "aggName": agg
                        });
                    } else {
                        // It's within this graph and the node exists
                        sources.push(this.getNode(aggInfo.node));
                    }
                }
            }
        } else if (node.getType() == DagNodeType.DFIn) {
            const inNode: DagNodeDFIn = <DagNodeDFIn>node;
            try {
                if (!inNode.hasSource()) {
                    let inSource: {graph: DagGraph, node: DagNodeDFOut} =
                    inNode.getLinkedNodeAndGraph();
                    if (!DagTblManager.Instance.hasTable(inSource.node.getTable())) {
                        // The needed table doesnt exist so we need to generate it, if we can
                        if (inSource.node.shouldLinkAfterExecution() &&
                            inSource.graph.getTabId() != this.getTabId()
                        ) {
                            error = xcStringHelper.replaceMsg(AlertTStr.DFLinkGraphError, {
                                "inName": inNode.getParam().linkOutName,
                                "graphName": this.getRuntime().getDagTabService().getTabById(inSource.graph.getTabId())
                                    .getName()
                            });
                        } else if (inSource.node.shouldLinkAfterExecution()) {
                            if (inSource.node.getState() == DagNodeState.Complete) {
                                // The dfOut node's table was deleted by the auto table manager,
                                // we're gonna need it if we can.
                                sources.push(inSource.node);
                            } else {
                                error = xcStringHelper.replaceMsg(AlertTStr.DFLinkShouldLinkError, {
                                    "inName": inNode.getParam().linkOutName,
                                });
                            }
                        }
                        // Otherwise this is a link in using a query, so the node itself is the source
                        inSource.node.deleteStoredQuery(this.getTabId());
                    }
                }
            } catch (e) {
                error = (e instanceof Error ? e.message : e);
            }
        }
        return {
            sources: sources,
            error: error
        };
    }

    /**
     *
     * @param nodeIds
     * @param shortened specifies if the back traversal ends at nodes that are complete and have a table
     */
    public backTraverseNodes(nodeIds: DagNodeId[], shortened?: boolean): BackTraceInfo {
        const nodesMap: Map<DagNodeId, DagNode> = new Map();
        const startingNodes: DagNodeId[] = [];
        let error: string;
        let nodeStack: DagNode[] = nodeIds.map((nodeId) => this._getNodeFromId(nodeId));
        let aggMap: Map<string, DagNode> = this._constructCurrentAggMap();
        let isStarting = false;
        while (nodeStack.length > 0) {
            isStarting = false;
            const node: DagNode = nodeStack.pop();
            if (node != null && !nodesMap.has(node.getId())) {
                nodesMap.set(node.getId(), node);
                let parents: DagNode[] = node.getParents();
                const foundSources: {sources: DagNode[], error: string} = this.findNodeNeededSources(node, aggMap);
                parents = parents.concat(foundSources.sources);
                error = foundSources.error;
                if (parents.length == 0 || node.getType() == DagNodeType.DFIn) {
                    isStarting = true;
                    startingNodes.push(node.getId());
                }
                else if (shortened) {
                    isStarting = true;
                    // Check if we need to run any of the parents
                    for (let i = 0; i < parents.length; i++) {
                        let parent = parents[i];
                        if (!parent) {
                            continue;
                        }
                        // parent can be null in join - left parent
                        if (parent.getState() != DagNodeState.Complete ||
                            (!DagTblManager.Instance.hasTable(parent.getTable()) &&
                            parent.getType() != DagNodeType.Aggregate)
                        ) {
                            isStarting = false;
                            break;
                        }
                    }
                    if (isStarting) {
                        startingNodes.push(node.getId());
                        continue;
                    }
                }
                if (!isStarting || node.getType() == DagNodeType.DFIn) {
                    nodeStack = nodeStack.concat(parents);
                }
            }
        }
        return {
            map: nodesMap,
            startingNodes: startingNodes,
            error: error
        }
    }

    // XXX TODO, change to only get the local one
    /**
     * Get the used local UDF modules in the graph
     */
    public getUsedUDFModules(): Set<string> {
        let udfSet: Set<string> = new Set();
        this.nodesMap.forEach((node) => {
            if (node.getType() === DagNodeType.Map) {
                const set: Set<string> = (<DagNodeMap>node).getUsedUDFModules();
                udfSet = new Set([...set, ...udfSet]);
            }
        });
        return udfSet;
    }

    /**
     * Get the used dataset name in the graph
     * @param deepSearch when set true, will search the source of link in node
     */
    public getUsedDSNames(deepSearch: boolean = false): Set<string> {
        const set: Set<string> = new Set();
        this.nodesMap.forEach((node) => {
            const nodeType: DagNodeType = node.getType();
            if (nodeType === DagNodeType.Dataset) {
                const dsName: string = (<DagNodeDataset>node).getDSName();
                if (dsName != null) {
                    set.add(dsName);
                }
            } else if (nodeType === DagNodeType.DFIn && deepSearch) {
                // Note: be cafure of this path for circular case
                try {
                    const linkInNode: DagNodeDFIn = <DagNodeDFIn>node;
                    if (!linkInNode.hasSource()) {
                        const res: {graph: DagGraph, node: DagNodeDFOut} = linkInNode.getLinkedNodeAndGraph();
                        const graph = res.graph;
                        if (graph !== this) {
                            const dsSet: Set<string> = graph.getUsedDSNames(true);
                            dsSet.forEach((dsName) => {
                                set.add(dsName);
                            });
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        });
        return set;
    }

    /** Scans down the children of nodes looking to see if any have locks.
     * @param nodes The nodes we're checking
     */
    public checkForChildLocks(nodes: DagNodeId[]): boolean {
        return this._checkApplicableChild(nodes, ((node) => {
            return DagTblManager.Instance.hasLock(node.getTable());
        }));
    }

    public getStatsJson() {
        const stats = [];
        this.nodesMap.forEach((node: DagNode) => {
            const overallStats = node.getOverallStats(true);
            overallStats.state = <any>node.getState();

            const nodeStats: {
                name: string,
                type: string,
                description: string,
                hint: string,
                tag?: string
                overallStats?: any,
                operations?: any[]
            } = {
                name: node.getTitle(),
                type: node.getDisplayNodeType(),
                description: node.getDescription(),
                hint: node.getParamHint().fullHint
            }
            if (node.getTag()) {
                nodeStats.tag = node.getTag();
            }
            nodeStats.overallStats =  overallStats,
            nodeStats.operations = node.getIndividualStats(true)

            stats.push(nodeStats);
        });
        return stats;
    }

    public getOperationTime(): number {
        return this.operationTime;
    }

    public resetOperationTime(): void {
        this.operationTime = 0;
    }

    public updateOperationTime(time: number): void {
        if (isNaN(time)) {
            return;
        }
        this.operationTime += time;
    }

    // takes in a map of nodes, topologically sorts them and then does an error check
    // on each node via switchState
    public checkNodesState(nodesMap: Map<DagNodeId, DagNode>): void {
        let orderedNodes: DagNode[];
        try {
            orderedNodes = this._topologicalSort(nodesMap);
        } catch (error) {
            console.error(error);
            // nodes do not get checked for errors, not a deal breaker
        }
        if (orderedNodes) {
            this.events.trigger(DagGraphEvents.TurnOffSave, {
                tabId: this.parentTabId
            });
            orderedNodes.forEach((node) => {
                node.switchState();
            });
            this.events.trigger(DagGraphEvents.TurnOnSave, {
                tabId: this.parentTabId
            });
            this.events.trigger(DagGraphEvents.Save, {
                tabId: this.parentTabId
            });
        }
    }

    /**
     * Reconfigured dataset nodes so that they have the correct user in their source
     * Only to be used by tutorial workbooks.
     * @param names: names to look for
     */
    public reConfigureDatasetNodes(names: Set<string>) {
        let datasetNodes: DagNodeDataset[] = <DagNodeDataset[]>this.getNodesByType(DagNodeType.Dataset);

        for (let i = 0; i < datasetNodes.length; i++) {
            let dataNode: DagNodeDataset = datasetNodes[i];
            let datasetParam = dataNode.getParam();
            if (datasetParam.source == "") {
                continue;
            }
            let parsedName = xcHelper.parseDSName(datasetParam.source);
            if (parsedName.user != xcHelper.getUserPrefix() &&
                    names.has(parsedName.randId + '.' + parsedName.dsName)) {
                parsedName.randId = parsedName.randId || "";
                datasetParam.source = xcHelper.wrapDSName(parsedName.dsName, parsedName.randId);
                dataNode.setParam(datasetParam, true);
            }
        }
    }

    // a check that is done right before execution to allow users to confirm
    // and continue if an error is found - one case is if a parameter with no
    // value is found -- we can prompt the user to continue or abandon the execution
    public executionPreCheck(nodeIds: DagNodeId[], optimized: boolean): {
        status: string,
        hasError: boolean,
        type?: string,
        node?: DagNode,
        msg?: string,
        error?: string
    } {
        let nodesMap: Map<DagNodeId, DagNode> = null;
        let startingNodes: DagNodeId[] = null;
        if (nodeIds != null) {
            // get subGraph from nodes and execute
            // we want to stop at the next node with a table unless we're
            // executing optimized in which case we want the entire query
            const backTrack: BackTraceInfo = this.backTraverseNodes(nodeIds, !optimized);
            if (backTrack.error != null) {
                return {
                    status: "error",
                    hasError: true,
                    error: backTrack.error
                };
            }
            nodesMap = backTrack.map;
            startingNodes = backTrack.startingNodes;
        }

        try {
            const allParameters = DagParamManager.Instance.getParamMap();
            let orderedNodes = this._topologicalSort(nodesMap, startingNodes);
            const noValues = [];
            const seen = new Set();
            orderedNodes.forEach((node) => {
                const parameters = node.getParameters();
                for (const parameter of parameters) {
                    if (seen.has(parameter)) {
                        continue;
                    }
                    if (!allParameters[parameter]) {
                        noValues.push(parameter);
                    }
                    seen.add(parameter);
                }
            });
            if (noValues.length) {
                return {
                    "status": "confirm",
                    "hasError": false,
                    "type": "parameters",
                    "msg": `The following parameters do not have a value: ${noValues.join(", ")}.`
                }
            }
        } catch (error) {
            console.error(error);
            return {
                "status": "Error",
                "hasError": true,
                "node": error.node,
                "type": error.error
            };
        }
    }

    /**
     * Given aggregate nodes within this graph, checks if their current aggregates belongs to them
     * If not, renames them.
     * @param aggregateNodes
     */
    public resolveAggConflict(aggregateNodes: DagNodeAggregate[]): DagNodeAggregate[] {
        let changedNodes = [];
        aggregateNodes.forEach((newNode) => {
            let validFunc = (name) => {
                return !this.getRuntime().getDagAggService().hasAggregate(name);
            };
            let param = newNode.getParam();
            let agg = this.getRuntime().getDagAggService().getAgg(param.dest);
            if (!agg) {
                // This aggregate has been removed for some reason, so we'll ignore it.
                return;
            }
            if (agg.node != newNode.getId()) {
                // A different node than this one created this agg, so we need to rename it.
                param.dest = xcHelper.uniqueName(param.dest, validFunc, null);
                newNode.setParam(param, true);
                changedNodes.push(newNode);
            }
        });

        return changedNodes;
    }

    public resolveNodeConflict(linkOutNodes: DagNodeDFOut[]): DagNodeDFOut[] {
        let nodeSet: Set<DagNodeId> = new Set();
        let nameSet: Set<string> = new Set();

        linkOutNodes.forEach((node) => {
            nodeSet.add(node.getId());
        });

        for (let node of this.nodesMap.values()) {
            // find the link out node that are in the graph before paste
            if (node instanceof DagNodeDFOut && !nodeSet.has(node.getId())) {
                let input: DagNodeDFOutInputStruct = node.getParam();
                if (input.name) {
                    nameSet.add(input.name);
                }
            }
        }

        let updatedNodes: DagNodeDFOut[] = [];
        let validFunc = (name) => {
            return !nameSet.has(name);
        };
        linkOutNodes.forEach((node) => {
            let input: DagNodeDFOutInputStruct = node.getParam();
            let name = input.name;
            if (name) {
                if (nameSet.has(name)) {
                    name = xcHelper.uniqueName(name, validFunc, null)
                    node.setParam({
                        name: name,
                        linkAfterExecution: input.linkAfterExecution,
                        columns: input.columns
                    }, true);
                    updatedNodes.push(node);
                }
                nameSet.add(name);
            }
        });

        return updatedNodes;
    }
    /**
     *
     * @param nodeInfos queryState info
    */
    public updateProgress(queryStateOutput: XcalarApiDagNodeT[]) {
        if (this.currentExecutor != null) {
            this.currentExecutor.updateProgress(queryStateOutput);
        }
    }

    // not used
    public serialize(): string {
        return null;
    }

    public hasNodeTitle(title: string): boolean {
        return this.nodeTitlesMap.has(title);
    }

    protected _getDurable(includeStats?: boolean): DagGraphInfo {
        let nodes: DagNodeInfo[] = [];
        // Assemble node list
        this.nodesMap.forEach((node: DagNode) => {
            let nodeInfo = node.getSerializableObj(includeStats);
            nodes.push(nodeInfo);
        });
        let comments: CommentInfo[] = [];
        this.commentsMap.forEach((comment) => {
            comments.push(comment.getSerializableObj());
        });

        return {
            version: this.version,
            nodes: nodes,
            comments: comments,
            display: this.display,
            operationTime: this.operationTime
        };
    }

    protected getRuntime(): DagRuntime {
        // In expServer execution, this function is overridden by DagRuntime.accessible() and should never be invoked.
        // In XD execution, this will be invoked in case the DagNode instance
        // is not decorated by DagRuntime.accessible(). Even the decoration happens,
        // the return object will always be DagRuntime._defaultRuntime, which is the same
        // object as we return in this function.
        return DagRuntime.getDefaultRuntime();
    }

    private _constructCurrentAggMap(): Map<string, DagNode> {
        let aggNodesInThisGraph: DagNodeAggregate[] = <DagNodeAggregate[]>this.getNodesByType(DagNodeType.Aggregate);
        let aggMap: Map<string, DagNode> = new Map<string, DagNode>();
        for (let i = 0; i < aggNodesInThisGraph.length; i++) {
            let node: DagNodeAggregate = aggNodesInThisGraph[i];
            let key = node.getParam().dest;
            if (key != "") {
                aggMap.set(key, node);
            }
        }
        return aggMap;
    }

    private _setupEvents(): void {
        const defaultNamespace = 'defaultNS';
        this.innerEvents = {}; // Example: { 'LockChange': {'defaultNS': <handler1>, 'DagView': <handler2>, ... }, ... }
        this.events = {
            on: (event, callback) => {
                const { eventName, namespace = defaultNamespace } = parseEvent(event);
                if (eventName.length === 0) {
                    return;
                }
                if (this.innerEvents[eventName] == null) {
                    this.innerEvents[eventName] = {};
                }
                this.innerEvents[eventName][namespace] = callback;
            },
            off: (event) => {
                const { eventName, namespace } = parseEvent(event);
                if (namespace == null || namespace.length === 0) {
                    // event = '<eventName>' || '<eventName>.'
                    delete this.innerEvents[eventName];
                } else {
                    if (eventName.length === 0) {
                        // event = '.<namespace>'
                        for (const innerEventName of Object.keys(this.innerEvents)) {
                            delete this.innerEvents[innerEventName][namespace];
                        }
                    } else {
                        // event = '<eventName>.<namespace>'
                        if (this.innerEvents[eventName] != null) {
                            delete this.innerEvents[eventName][namespace];
                        }
                    }
                }
            },
            trigger: (event, ...args) => {
                if (this.innerEvents[event] != null) {
                    for (const namespace of Object.keys(this.innerEvents[event])) {
                        const eventHandler = this.innerEvents[event][namespace];
                        if (typeof eventHandler === 'function') {
                            eventHandler.apply(this, args)
                        }
                    }
                }
            }
        };

        function parseEvent(event) {
            const sep = '.';
            const idx = event.lastIndexOf(sep);
            return {
                eventName: idx >= 0 ? event.substring(0, idx) : event,
                namespace: idx >= 0 ? event.substring(idx + 1) : undefined
            };
        }
    }

    private _executeGraph(
        nodesMap?: Map<DagNodeId, DagNode>,
        optimized?: boolean,
        startingNodes?: DagNodeId[],
        parentTxId?: number,
        generateOptimizedDataflow?: boolean
    ): XDPromise<void> {
        if (this.currentExecutor != null) {
            return PromiseHelper.reject(ErrTStr.DFInExecution);
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let orderedNodes: DagNode[] = [];
        try {
            let ignoreOptimizedNodes = !nodesMap && !optimized && parentTxId == null;
            orderedNodes = this._topologicalSort(nodesMap, startingNodes, ignoreOptimizedNodes);
        } catch (error) {
            return PromiseHelper.reject({
                "status": "Error",
                "hasError": true,
                "node": error.node,
                "type": error.error
            });
        }
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, this, {
            optimized: optimized,
            parentTxId: parentTxId
        });
        let checkResult = executor.validateAll();
        if (checkResult.hasError) {
            return PromiseHelper.reject(checkResult);
        }
        const nodeIds: DagNodeId[] = orderedNodes.map(node => node.getId());
        this.lockGraph(nodeIds, executor);
        let def;
        if (generateOptimizedDataflow) {
            def = executor.generateOptimizedDataflow();
        } else {
            def = executor.run();
        }

        def
        .then((...args) => {
            this.unlockGraph(nodeIds);
            deferred.resolve(...args);
        })
        .fail((error) => {
            this.unlockGraph(nodeIds);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _isSourceNode(dagNode: DagNode): boolean {
        return dagNode.getMaxParents() === 0;
    }

    private _isDestNode(dagNode: DagNode): boolean {
        return dagNode.getMaxChildren() === 0;
    }

    private _topologicalSort(
        nodesMap?: Map<DagNodeId, DagNode>,
        startingNodes?: DagNodeId[],
        ignoreOptimizedNodes?: boolean
    ): DagNode[] {
        const orderedNodes: DagNode[] = [];
        let zeroInputNodes: DagNode[] = [];
        const nodeInputMap: Map<DagNodeId, number> = new Map();
        const needLinkNodes: Map<string, DagNode[]> = new Map();
        const needAggNodes: Map<string, DagNode[]> = new Map();
        let nodePushedBack: boolean = false;
        let affNodes: DagNode[] = [];
        let aggExists: Set<string> = new Set();
        let linkOutExists: Set<string> = new Set();
        let flowAggNames: Set<string> = new Set();
        let flowOutIds: Set<string> = new Set();

        nodesMap = nodesMap || this.nodesMap;

        let linkOutOptimizedIdsToRemove: Set<DagNodeId> = new Set();
        if (ignoreOptimizedNodes) {
            // do not execute optimized nodes if no linked in nodes point to
            // them and not executing graph in optimized mode.
            let linkOutPointers: Set<DagNodeId> = new Set();
            let linkOutOptimizedIds: Set<DagNodeId> = new Set();
            nodesMap.forEach((node: DagNode) => {
                if (node.getType() === DagNodeType.DFIn) {
                    let link: {graph: DagGraph, node: DagNodeDFOut};
                    try {
                        link = (<DagNodeDFIn>node).getLinkedNodeAndGraph();
                    } catch (e) {
                        return;
                    }
                    linkOutPointers.add(link.node.getId());
                } else if (node.getType() === DagNodeType.DFOut &&
                    node.getSubType() === DagNodeSubType.DFOutOptimized) {
                        linkOutOptimizedIds.add(node.getId());
                }
            });
            linkOutOptimizedIds.forEach((nodeId: DagNodeId) => {
                if (!linkOutPointers.has(nodeId)) {
                    linkOutOptimizedIdsToRemove.add(nodeId);
                }
            });
        }
        // Construct the aggregates and linkOut names this map creates
        nodesMap.forEach((node: DagNode) => {
            if (node.getType() === DagNodeType.Aggregate) {
                flowAggNames.add(node.getParam().dest)
            } else if (node.getType() === DagNodeType.DFOut &&
                        !linkOutOptimizedIdsToRemove.has(node.getId())) {
                flowOutIds.add(node.getId());
            }
        });
        // Construct starting nodes.
        for (let [nodeId, node] of nodesMap) {
            if (linkOutOptimizedIdsToRemove.has(nodeId)) {
                continue;
            }
            const numParent = node.getNumParent();
            nodeInputMap.set(nodeId, numParent);
            if (numParent === 0) {
                zeroInputNodes.push(node);
            }
        }

        if (startingNodes) {
            zeroInputNodes = startingNodes.map((id: DagNodeId) => {
                return nodesMap.get(id);
            });
        }

        while (zeroInputNodes.length > 0) {
            nodePushedBack = false;
            const node: DagNode = zeroInputNodes.shift();
            // Process aggregate and linkin/out dependent nodes first
            if (node.getState() != DagNodeState.Unused) {
                switch (node.getType()) {
                    case (DagNodeType.Aggregate):
                        // any nodes waiting on this aggregate can be finished
                        let aggName: string = node.getParam().dest;
                        if (!aggExists.has(aggName)) {
                            aggExists.add(aggName);
                        }
                        affNodes = needAggNodes.get(aggName);
                        if (affNodes) {
                            zeroInputNodes = zeroInputNodes.concat(affNodes);
                            needAggNodes.delete(aggName);
                        }
                        break;
                    case (DagNodeType.DFOut):
                        // any nodes waiting on this linkout can be finished
                        linkOutExists.add(node.getId());
                        affNodes = needLinkNodes.get(node.getId());
                        if (affNodes) {
                            zeroInputNodes = zeroInputNodes.concat(affNodes);
                            needLinkNodes.delete(node.getId());
                        }
                        break;
                    case (DagNodeType.DFIn):
                        const inNode = <DagNodeDFIn>node;
                        if (inNode.hasSource()) {
                            // skip link in check if have source
                            break;
                        }
                        let link: {graph: DagGraph, node: DagNodeDFOut};
                        try {
                            link = inNode.getLinkedNodeAndGraph();
                        } catch (e) {
                            // Node can still be ordered even if we don't know about its parents
                            break;
                        }
                        if (link.graph.getTabId() != this.getTabId()) {
                            break;
                        }
                        let linkId = link.node.getId();
                        // Check these
                        if (!linkOutExists.has(linkId) && flowOutIds.has(linkId)) {
                            needLinkNodes.set(linkId, needLinkNodes.get(linkId) || [])
                            needLinkNodes.get(linkId).push(node);
                            nodePushedBack = true;
                        }
                        break;
                    default:
                        break;
                }
                const aggNames: string[] = node.getAggregates();
                if (aggNames.length > 0) {
                    for (let i = 0; i < aggNames.length; i++) {
                        let name: string = aggNames[i];
                        // Check if we either know the aggregate already exists
                        // and it is created here
                        if (!aggExists.has(name) && flowAggNames.has(name)) {
                            needAggNodes.set(name, needAggNodes.get(name) || [])
                            needAggNodes.get(name).push(node);
                            nodePushedBack = true;
                            break;
                        }
                    }
                }
                if (nodePushedBack) {
                    continue;
                }
            }
            nodeInputMap.delete(node.getId());
            // Process children since the node can run at this time
            orderedNodes.push(node);
            node.getChildren().forEach((childNode) => {
                if (childNode != null) {
                    const childId: DagNodeId = childNode.getId();
                    if (nodeInputMap.has(childId)) {
                        // if it's a subGraph, child may not in it
                        const numParent = nodeInputMap.get(childId) - 1;
                        nodeInputMap.set(childId, numParent);
                        if (numParent === 0) {
                            zeroInputNodes.push(childNode);
                        }
                    }
                }
            });
            if (zeroInputNodes.length === 0 && nodeInputMap.size > 0) {
                // a case is if map node has no connections so numParents = 0,
                // but uses an aggregate
                nodeInputMap.forEach((numParent, nodeId) => {
                    if (numParent === 0 && nodesMap.has(nodeId)) {
                        zeroInputNodes.push(nodesMap.get(nodeId));
                    }
                });
            }
        }

        if (needAggNodes.size != 0) {
            // These two errors should only show up if an aggregate/linkout is made within this
            // dataflow, but theres a circular dependency.
            let node: DagNode = needAggNodes.values().next().value[0];
            throw ({
                "error": "Map/Filter node is dependent on aggregate made after it.",
                "node": node
            });
        } else if (needLinkNodes.size != 0) {
            let node: DagNode = needLinkNodes.values().next().value[0];
            throw ({
                "error": "Link In Node is dependent on link out made after it.",
                "node": node
            });
        } else if (nodeInputMap.size > 0) {
            let nodeId: DagNodeId = nodeInputMap.keys().next().value;
            throw ({
                "error": "Parent could not be found.",
                "node": nodesMap.get(nodeId)
            });
        }

        return orderedNodes;
    }

    private _removeNode(
        node: DagNode,
        switchState: boolean = true,
        clearMeta: boolean = true
    ):  {dagNodeId: boolean[]} {

        const parents: DagNode[] = node.getParents();
        const children: DagNode[] = node.getChildren();

        parents.forEach((parent) => {
            if (parent != null) {
                parent.disconnectFromChild(node);
            }
        });
        const descendents = [];
        const childIndices = {};
        const spliceFlags: any = {}; // whether connection index was spliced
        children.forEach((child) => {
            const childId = child.getId();
            const parents = child.getParents();
            let numParents = parents.length;
            for (let i = 0; i < numParents; i++) {
                const parent = parents[i];
                if (parent === node) {
                    if (!childIndices[childId]) {
                        childIndices[childId] = [];
                        spliceFlags[childId] = [];
                    }

                    const wasSpliced = child.disconnectFromParent(node, i);
                    childIndices[childId].push(i);
                    spliceFlags[childId].push(wasSpliced);
                    if (wasSpliced) {
                        i--;
                        numParents--;
                    }
                }
            }
            if (switchState) {
                const set: Set<DagNode> = this._traverseSwitchState(child);
                descendents.push(...set);
            }
        });

        if (clearMeta && node.getState() === DagNodeState.Complete) {
            if (node instanceof DagNodeSQL) {
                node.setXcQueryString(null);
                node.setRawXcQueryString(null);
            }
            node.beConfiguredState();
        }
        this.removedNodesMap.set(node.getId(), {
            childIndices: childIndices,
            node: node
        });
        let order: number = null;
        if (node instanceof DagNodeSQLFuncIn) {
            order = node.getOrder();
        }
        this.nodesMap.delete(node.getId());
        this.nodeTitlesMap.delete(node.getTitle());
        if (switchState) {
            this.events.trigger(DagNodeEvents.ConnectionChange, {
                type: "remove",
                descendents: descendents,
                removeInfo: {childIndices: childIndices, node: node},
                tabId: this.parentTabId
            });
            this.events.trigger(DagGraphEvents.RemoveNode, {
                tabId: this.parentTabId,
                node: node
            });
        }
        if (node instanceof DagNodeSQLFuncIn) {
            this.events.trigger(DagGraphEvents.RemoveSQLFucInput, {
                tabId: this.parentTabId,
                order: order
            });
        }
        return spliceFlags;
    }

    private _getNodeFromId(nodeId: DagNodeId): DagNode | null {
        const node: DagNode = this.nodesMap.get(nodeId);
        if (node == null) {
            console.error("Dag Node " + nodeId + " not exists");
            return null;
        } else {
            return node;
        }
    }

    private _getRemovedNodeInfoFromId(nodeId: DagNodeId) {
        const nodeInfo = this.removedNodesMap.get(nodeId);
        if (nodeInfo == null) {
            throw new Error("Dag Node " + nodeId + " not exists");
        }
        return nodeInfo;
    }

    /**
     * DFS to find a node in endNodeSet, which is reachable by traveling from anyone of start nodes
     * @param startNodeIds
     * @param endNodeIds
     * @returns The reachable node id. Null if not found
     */
    private _findReachable(startNodeIds: Set<string>, endNodeIds: Set<string>): string {
        const visited = new Set<string>();

        // Sanity check
        if (startNodeIds == null || endNodeIds == null) {
            return null;
        }
        if (startNodeIds.size === 0 || endNodeIds.size === 0) {
            return null;
        }

        const nodesToExam: DagNode[] = [];
        // Initialize the stack with start nodes
        for (const startNodeId of startNodeIds) {
            nodesToExam.push(this.getNode(startNodeId));
        }
        // Keep iterating through the stack to visit nodes
        while (nodesToExam.length > 0) {
            // Popup a node from the stack to exam
            const currentNode = nodesToExam.pop();
            if (currentNode == null) {
                continue;
            }
            const currentNodeId = currentNode.getId();
            // Skip visited nodes for better performance
            // and also avoiding infinite loop in case of cyclic graph
            if (visited.has(currentNodeId)) {
                continue;
            }
            // Check if the current node is in the end node set
            if (endNodeIds.has(currentNodeId)) {
                // Yes, there is a path from startNode to this node
                // even we didn't track the path
                return currentNodeId;
            }
            // Explore child nodes
            for (const childNode of currentNode.getChildren()) {
                nodesToExam.push(childNode);
            }
            // Finish examining this node
            visited.add(currentNodeId);
        }

        return null;
    }

    private _isCyclic(startNode: DagNode): boolean {
        const visited: Set<DagNodeId> = new Set();
        const stack: DagNode[] = [];
        if (isCyclicHelper(startNode, visited, stack)) {
            return true;
        }
        return false;

        function isCyclicHelper(node, visited, stack) {
            const nodeId: DagNodeId = node.getId();
            if (stack.indexOf(node) > -1) {
                return true;
            }
            if (visited.has(nodeId)) {
                return false;
            }
            visited.add(nodeId);
            stack.push(node);

            const children = node.getChildren();
            for (let i = 0; i < children.length; i++) {
                if (isCyclicHelper(children[i], visited, stack)) {
                    return true;
                }
            }
            stack.pop();
            return false;
        }
    }

    private _restoreEmptySchema(nodeInfo: DagNodeInInfo): void {
        let schema: ColSchema[] = nodeInfo.schema;
        if (!schema || schema.length == 0) {
            // an upgrade case
            const input: any = nodeInfo.input;
            const source: string = input.source;
            if (typeof DS !== "undefined" && source) {
                let res = DS.getSchema(source);
                if (res.error) {
                   nodeInfo.error = "Schema error: "  + res.error;
                   nodeInfo.state = DagNodeState.Error;
                } else {
                    nodeInfo.schema = res.schema;
                }
            }
        }
    }

    private _traverseSwitchState(node: DagNode): Set<DagNode> {
        if (node == null) {
            return;
        }
        const traversedSet: Set<DagNode> = new Set();
        if (this._hasTraversedInBulk(node)) {
            return traversedSet;
        }
        this.events.trigger(DagGraphEvents.TurnOffSave, {
            tabId: this.parentTabId
        });
        if (!this._isBulkStateSwitch) {
            node.switchState();
        }
        traversedSet.add(node);
        this._traverseChildren(node, (node: DagNode) => {
            if (traversedSet.has(node) ||
                this._hasTraversedInBulk(node)
            ) {
                return false;
            }
            if (node instanceof DagNodeSQL) {
                // clear compiled result
                node.setXcQueryString(null);
                node.setRawXcQueryString(null);
            }
            if (node instanceof DagNodeSQLFuncOut) {
                // auto update schema for sql func output
                node.updateSchema();
            }
            if (!this._isBulkStateSwitch) {
                node.switchState();
            }
            traversedSet.add(node);
        });
        this.events.trigger(DagGraphEvents.TurnOnSave, {
            tabId: this.parentTabId
        });
        this.events.trigger(DagGraphEvents.Save, {
            tabId: this.parentTabId
        });
        return traversedSet;
    }

    private _traverseResetLineage(node: DagNode): Set<DagNode> {
        const traversedSet: Set<DagNode> = new Set();
        node.resetLineage();
        traversedSet.add(node);
        this._traverseChildren(node, (node: DagNode) => {
            node.resetLineage();
            traversedSet.add(node);
        });
        return traversedSet;
    }

    /**
     * traverses children ala BFS in order to determine if any children satisfy a callback function
     * @param nodes Starting node IDs to search
     * @param callback {Function} Must return true or false
     */
    private _checkApplicableChild(nodes: DagNodeId[], callback: Function) {
        let seen: Set<string> = new Set();
        let nodeStack: DagNode[] = nodes.map((nodeId: string) => {
            return this.getNode(nodeId);
        })
        let node: DagNode;
        let currId: DagNodeId;
        while (nodeStack.length != 0) {
            node = nodeStack.pop();
            if (node == null) {
                continue;
            }
            currId = node.getId();
            if (!seen.has(currId)) {
                if (callback(node)) {
                    return true;
                }
                seen.add(currId);
                let children: DagNode[] = node.getChildren();
                children.forEach((child: DagNode) => {
                    nodeStack.push(child);
                });
            }
        }
        return false;
    }

    /**
     * traverses children and applies callback function to each node
     * @param callback Function to call for each child
     */
    private _traverseChildren(node: DagNode, callback: Function) {
        const seen: Set<string> = new Set();
        const recursiveTraverse = (node: DagNode): void => {
            const children: DagNode[] = node.getChildren();
            children.forEach((child: DagNode) => {
                const nodeId: DagNodeId = child.getId();
                if (seen.has(nodeId)) {
                    return;
                } else {
                    seen.add(nodeId);
                }
                let res = callback(child);
                if (res === false) {
                    // stop traverse
                    return;
                }
                recursiveTraverse(child);
            });
        };

        recursiveTraverse(node);
    }

    public traverseParents(node: DagNode, callback: Function) {
        const seen: Set<string> = new Set();
        const recursiveTraverse = (node: DagNode): void => {
            const parents: DagNode[] = node.getParents();
            parents.forEach((parent: DagNode) => {
                const nodeId: DagNodeId = parent.getId();
                if (seen.has(nodeId)) {
                    return;
                } else {
                    seen.add(nodeId);
                }
                const res = callback(parent);
                if (res !== false) {
                    recursiveTraverse(parent);
                }
            });
        };

        recursiveTraverse(node);
    }

    public save(): void {
        this.events.trigger(DagGraphEvents.Save, {
            tabId: this.parentTabId
        });
    }

    public applyColumnMapping(nodeId: DagNodeId, renameMap) {
        this.events.trigger(DagGraphEvents.TurnOffSave, {
            tabId: this.parentTabId
        });
        const dagNode: DagNode = this.getNode(nodeId);
        recursiveTraverse(dagNode, renameMap);
        this.events.trigger(DagGraphEvents.TurnOnSave, {
            tabId: this.parentTabId
        });
        this.events.trigger(DagGraphEvents.Save, {
            tabId: this.parentTabId
        });

        function recursiveTraverse(node: DagNode, renameMap): void {
            if (node == null) {
                return;
            }
            const children: DagNode[] = node.getChildren();
            const parentNodeId = node.getId();
            const nodeChildMap = {};
            children.forEach((child: DagNode) => {
                const nodeId: DagNodeId = child.getId();
                const parents = child.getParents();
                let index;
                for (let i = 0; i < parents.length; i++) {
                    if (parents[i].getId() === parentNodeId) {
                        // find the correct child index in relation to the parent
                        // example: if self-join, determines if looking at
                        // the left table (index == 0) or right table (index == 1)
                        if (!nodeChildMap.hasOwnProperty(nodeId)) {
                            nodeChildMap[nodeId] = 0;
                        } else {
                            nodeChildMap[nodeId]++;
                        }
                        index = i + nodeChildMap[nodeId];
                        break;
                    }
                }
                let newRenameMap;
                if (child.isConfigured()) {
                    // TODO terminate early if no column matches
                    newRenameMap = child.applyColumnMapping(renameMap, index);
                }
                if (!newRenameMap) {
                    newRenameMap = renameMap;
                }

                recursiveTraverse(child, newRenameMap);
            });
        };
    }

    /**
     *
     * @param query array of xcalarQueries
     * @param globalState optional state to assign to all nodes
     * @param tableSrcMap
     * @param finalTableName
     */
    public static convertQueryToDataflowGraph(
        query: any[],
        globalState?: DagNodeState,
        tableSrcMap?,
        finalTableName?
    ) {
        let converter = new DagQueryConverter({query: query}, null, globalState, tableSrcMap, finalTableName);
        return converter.getResult();
    }

    public static convertStatsToQueryNodes(nodes) {
        let queryNodes = nodes.map((node) => {
            // let inputName = xcHelper.getXcalarInputNameFromApiString(node.operater_name);
            // let input = JSON.parse(node.input_parameters)[inputName];
            let numRowsPerNode = node.rows_per_node_in_cluster.split(":");
            numRowsPerNode = numRowsPerNode.map(rows => parseInt(rows));
            let numRowsTotal = numRowsPerNode.reduce((total, curr) => {
                return total + curr;
            });
            let queryNode = {
                // operation: node.operator_name,
                name: {name: node.node_name},
                api: XcalarApisT[node.operator_name],
                input: JSON.parse(node.input_parameters),
                comment: node.user_comment,
                tag: node.tag,
                numNodes: node.total_node_count_in_cluster,
                numWorkCompleted: numRowsTotal,
                numWorkTotal: numRowsTotal,
                numRowsTotal: numRowsTotal,
                numRowsPerNode: numRowsPerNode,
                state: DgDagStateT[node.operator_state],
                status: StatusT[node.operator_status],
                elapsed: {milliseconds: node.node_time_elapsed_millisecs},
                sequence_num: node.sequence_num
            }
            return queryNode;
        });
        return queryNodes;
    }

    public turnOnBulkStateSwitch(): void {
        this._isBulkStateSwitch = true;
        this._stateSwitchSet.clear();
    }

    public turnOffBulkStateSwitch(): void {
        this._isBulkStateSwitch = false;
        // switch node state in bulk
        this._stateSwitchSet.forEach((node) => {
            if (this.hasNode(node.getId())) {
                node.switchState();
            }
        });
        this._stateSwitchSet.clear();
    }

    private _hasTraversedInBulk(node: DagNode): boolean {
        if (!this._isBulkStateSwitch) {
            return false;
        } else if (this._stateSwitchSet.has(node)) {
            return true;
        } else {
            this._stateSwitchSet.add(node);
            return false;
        }
    }

    private _getExecutingOptimizedNodeIds() {
        let optimizedNodeIds = [];
        let hasLinkOutOptimized = false;
        let hasExportOptimized = false;
        for (let [_nodeId, node] of this.nodesMap) {
            if (node.getType() === DagNodeType.DFOut &&
                node.getSubType() === DagNodeSubType.DFOutOptimized) {
                if (hasLinkOutOptimized) {
                    return {
                        "status": "Error",
                        "hasError": true,
                        "node": node,
                        "type": DagNodeErrorType.InvalidOptimizedLinkOutOptimizedCount
                    };
                } else if (hasExportOptimized) {
                    return {
                        "status": "Error",
                        "hasError": true,
                        "node": node,
                        "type": DagNodeErrorType.InvalidOptimizedOutNodeCombo
                    };
                }
                hasLinkOutOptimized = true;
                optimizedNodeIds.push(node.getId());
            } else if (node.getType() === DagNodeType.Export &&
                node.getSubType() === DagNodeSubType.ExportOptimized) {
                    if (hasLinkOutOptimized) {
                        return {
                            "status": "Error",
                            "hasError": true,
                            "node": node,
                            "type": DagNodeErrorType.InvalidOptimizedOutNodeCombo
                        };
                    }
                    hasExportOptimized = true;
                    optimizedNodeIds.push(node.getId());
            }
        }
        return optimizedNodeIds;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagGraph = DagGraph;
}
