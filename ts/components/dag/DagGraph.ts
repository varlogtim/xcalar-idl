class DagGraph {
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

    protected operationTime: number;
    protected currentExecutor: DagGraphExecutor
    public events: { on: Function, off: Function, trigger: Function}; // example: dagGraph.events.on(DagNodeEvents.StateChange, console.log)

    public constructor() {
        this.nodesMap = new Map();
        this.removedNodesMap = new Map();
        this.commentsMap = new Map();
        this.removedCommentsMap = new Map();
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
    public getSerializableObj(includeStats?: boolean): DagGraphInfo {
        let nodes: DagNodeInfo[] = [];
        // Assemble node list
        this.nodesMap.forEach((node: DagNode) => {
            nodes.push(node.getSerializableObj(includeStats));
        });
        let comments: CommentInfo[] = [];
        this.commentsMap.forEach((comment) => {
            comments.push(comment.getSerializableObj());
        });

        return {
            nodes: nodes,
            comments: comments,
            display: this.display,
            operationTime: this.operationTime
        };
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
        const nodes: {node: DagNode, parents: DagNodeId[]}[] = [];
        serializableGraph.nodes.forEach((nodeInfo: DagNodeInfo) => {
            if (nodeInfo.type == DagNodeType.Aggregate ||
                nodeInfo.type === DagNodeType.DFIn
            ) {
                nodeInfo["graph"] = this;
            }
            const node: DagNode = DagNodeFactory.create(nodeInfo);
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
            if (nodeInfo.type == DagNodeType.Aggregate ||
                nodeInfo.type === DagNodeType.DFIn
            ) {
                nodeInfo["graph"] = this;
            }
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
        const graph: DagGraph = new DagGraph();
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
        });
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
        if (nodeInfo.type == DagNodeType.Aggregate) {
            nodeInfo["graph"] = this;
        }
        const dagNode: DagNode = DagNodeFactory.create(nodeInfo);
        if (!dagNode.getTitle()) {
            dagNode.setTitle("Node " + (this.nodesMap.size + 1));
        }
        this.addNode(dagNode);
        return dagNode;
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
        .registerEvents(DagNodeEvents.TableRemove, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.TableRemove, info);
        })
        .registerEvents(DagNodeEvents.AggregateChange, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.AggregateChange, info);
        })
        .registerEvents(DagNodeEvents.TableLockChange, (info) => {
            info.tabId = this.parentTabId;
            this.events.trigger(DagNodeEvents.TableLockChange, info);
        })
        .registerEvents(DagNodeEvents.LineageSourceChange, (info) => {
            this._traverseResetLineage(info.node);
            const tabId: string = this.getTabId();
            info = $.extend({}, info, {
                tabId: tabId
            });
            this.events.trigger(DagNodeEvents.LineageSourceChange, info);
        })
        .registerEvents(DagNodeEvents.TitleChange, (info) => {
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
        });
    }

    /**
     * remove a node
     * @param nodeId node's id
     */
    public removeNode(
        nodeId: DagNodeId,
        switchState: boolean = true
    ): {dagNodeId: boolean[]} {
        const node: DagNode = this._getNodeFromId(nodeId);
        return this._removeNode(node, switchState);
    }

    public removeRetinas(nodeIds: DagNodeId[]): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const promises = [];
        nodeIds.forEach((nodeId) => {
            const node: DagNode = this._getNodeFromId(nodeId);
            if (node instanceof DagNodeOutOptimizable && node.getState() !==
                DagNodeState.Unused) {
                promises.push(this._removeRetina(node));
            }
        });

        PromiseHelper.when(...promises)
        .always((...rets) => {
            const errorNodeIds = [];
            rets.forEach((error) => {
                if (error && error.error && error.error.status === StatusT.StatusRetinaInUse) {
                    errorNodeIds.push(error.dagNode.getId());
                }
            });
            deferred.resolve({hasRetinasInUse: errorNodeIds.length > 0, errorNodeIds: errorNodeIds});
        });

        return deferred.promise();
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
        let canConnect: boolean = this.connect(parentNodeId, childNodeId, childPos, allowCyclic, false);
        if (canConnect) {
            this.disconnect(parentNodeId, childNodeId, childPos, false);
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
        spliceIn: boolean = false
    ): boolean {
        let connectedToParent = false;
        let parentNode: DagNode;
        let childNode: DagNode;
        try {
            parentNode = this._getNodeFromId(parentNodeId);
            childNode = this._getNodeFromId(childNodeId);
            childNode.connectToParent(parentNode, childPos, spliceIn);
            connectedToParent = true;
            parentNode.connectToChild(childNode);

            if (!allowCyclic && this._isCyclic(parentNode)) {
                parentNode.disconnectFromChild(childNode);
                childNode.disconnectFromParent(parentNode, childPos);
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
        switchState: boolean = true
    ): boolean {
        const parentNode: DagNode = this._getNodeFromId(parentNodeId);
        const childNode: DagNode = this._getNodeFromId(childNodeId);
        const wasSpliced = childNode.disconnectFromParent(parentNode, toPos);
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
        parentTxId?: number
    ): XDPromise<void> {
        this.resetOperationTime();
        if (nodeIds == null) {
            return this._executeGraph(null, optimized, null, parentTxId);
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
            return this._executeGraph(nodesMap, optimized, startingNodes, parentTxId);
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

    /**
     * @description gets query from multiple nodes, only used to create retinas
     * assumes nodes passed in were already validated
     * @param nodeIds
     */
    public getOptimizedQuery(
        nodeIds: DagNodeId[],
        noReplaceParam?: boolean
    ): XDPromise<string> {
         // clone graph because we will be changing each node's table and we don't
        // want this to effect the actual graph
        const clonedGraph = this.clone();
        clonedGraph.setTabId(DagTab.generateId());
        let orderedNodes: DagNode[] = nodeIds.map((nodeId) => clonedGraph._getNodeFromId(nodeId));
        // save original sql nodes so we can cache query compilation
        let sqlNodes: Map<string, DagNodeSQL> = new Map();
        nodeIds.forEach((nodeId) => {
            let node: DagNode = this._getNodeFromId(nodeId);
            if (node instanceof DagNodeSQL) {
                sqlNodes.set(node.getId(), node);
            }
        });
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, clonedGraph, {
            optimized: true,
            noReplaceParam: noReplaceParam,
            sqlNodes: sqlNodes
        });
        return executor.getBatchQuery();
    }

    public getRetinaArgs(nodeIds?: DagNodeId[]): XDPromise<void> {
        let nodesMap: Map<DagNodeId, DagNode>;
        let startingNodes: DagNodeId[];
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
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, this, {
            optimized: true,
            noReplaceParam: true
        });
        let checkResult = executor.validateAll();
        if (checkResult.hasError) {
            return PromiseHelper.reject(checkResult);
        }
        return executor.getRetinaArgs();
    }

    /**
     * @description gets query from the lineage of 1 node, includes validation
     * @param nodeId
     * @param optimized
     * @param isCloneGraph
     */
    public getQuery(
        nodeId?: DagNodeId,
        optimized?: boolean,
        isCloneGraph: boolean = true,
        allowNonOptimizedOut: boolean = false
    ): XDPromise<string> {
        // clone graph because we will be changing each node's table and we don't
        // want this to effect the actual graph
        const clonedGraph = isCloneGraph ? this.clone() : this;
        clonedGraph.setTabId(DagTab.generateId());
        const nodesMap:  Map<DagNodeId, DagNode> = nodeId != null
            ? clonedGraph.backTraverseNodes([nodeId], false).map
            : clonedGraph.getAllNodes();
        const orderedNodes: DagNode[] = clonedGraph._topologicalSort(nodesMap);
        // save original sql nodes so we can cache query compilation
        let sqlNodes: Map<string, DagNodeSQL> = new Map();
        orderedNodes.forEach((clonedNode) => {
            let node: DagNode = this._getNodeFromId(clonedNode.getId());
            if (node instanceof DagNodeSQL) {
                sqlNodes.set(node.getId(), node);
            }
        });
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, clonedGraph, {
            optimized: optimized,
            allowNonOptimizedOut: allowNonOptimizedOut,
            sqlNodes: sqlNodes
        });
        const checkResult = executor.checkCanExecuteAll();
        if (checkResult.hasError) {
            return PromiseHelper.reject(checkResult);
        }
        return executor.getBatchQuery();
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
                } else {
                    outEnds.add(subNodeId);
                }
            }
        }

        // Check open graph
        const inputNodeIdSet = new Set<DagNodeId>();
        for (const { parentId } of inputEdges) {
            inputNodeIdSet.add(parentId);
        }
        const openNodeIdSet = new Set<DagNodeId>();
        for (const { childId } of outputEdges) {
            if (inputNodeIdSet.has(childId)) {
                openNodeIdSet.add(childId);
            }
        }
        const openNodeIds: DagNodeId[] = [];
        for (const nodeId of openNodeIdSet) {
            openNodeIds.push[nodeId];
        }

        return {
            inner: innerEdges,
            in: inputEdges,
            out: outputEdges,
            openNodes: openNodeIds,
            endSets: { in: inEnds, out: outEnds },
            dfIOSets: { in: sourceNodes, out: destNodes }
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
    public findNodeNeededSources(node: DagNode, optimized?: boolean,
            aggMap?: Map<string, DagNode>): {sources: DagNode[], error: string} {
        let error: string;
        let sources: DagNode[] = [];
        const aggregates: string[] = node.getAggregates();
        if (aggregates.length > 0) {
            for (let i = 0; i < aggregates.length; i++) {
                let agg: string = aggregates[i];
                let aggInfo: AggregateInfo = DagAggManager.Instance.getAgg(agg);
                if (aggInfo == null) {
                    error = xcHelper.replaceMsg(AggTStr.AggNotExistError, {
                        "aggName": agg
                    });
                    break;
                }
                if (aggInfo.value == null || optimized) {
                    if (aggMap != null && aggMap.has(agg)) {
                        // Within aggMap
                        let aggNode = aggMap.get(agg);
                        if (aggNode.getParam().mustExecute) {
                            error = xcHelper.replaceMsg(AggTStr.AggNodeMustExecuteError, {
                                "aggName": agg
                            });
                            continue;
                        }
                        sources.push(aggNode);
                    }
                    else if (aggInfo.graph != this.getTabId() &&
                            (aggInfo.graph != null || !this.hasNode(aggInfo.node))) {
                        // Outside of this graph or aggMap not specified
                        let tab: DagTab = DagTabManager.Instance.getTabById(aggInfo.graph);
                        let name: string = "";
                        if (tab != null) {
                            name = tab.getName();
                        }
                        error = xcHelper.replaceMsg(AggTStr.AggGraphError, {
                            "aggName": agg,
                            "graphName": name
                        });
                    } else {
                        // doesnt exist
                        error = xcHelper.replaceMsg(AggTStr.AggNodeNotExistError, {
                            "aggName": agg
                        });
                    }
                }
            }
        } else if (node.getType() == DagNodeType.DFIn) {
            const inNode: DagNodeDFIn = <DagNodeDFIn>node;
            try {
                let inSource: {graph: DagGraph, node: DagNodeDFOut} =
                    inNode.getLinkedNodeAndGraph();
                if (!DagTblManager.Instance.hasTable(inSource.node.getTable())) {
                    // The needed table doesnt exist so we need to generate it, if we can
                    if (inSource.node.shouldLinkAfterExecuition() &&
                        inSource.graph.getTabId() != this.getTabId()
                    ) {
                        error = xcHelper.replaceMsg(AlertTStr.DFLinkGraphError, {
                            "inName": inNode.getParam().linkOutName,
                            "graphName": DagTabManager.Instance.getTabById(inSource.graph.getTabId())
                                .getName()
                        });
                    } else if (inSource.node.shouldLinkAfterExecuition()) {
                        if (inSource.node.getState() == DagNodeState.Complete) {
                            // The dfOut node's table was deleted by the auto table manager,
                            // we're gonna need it if we can.
                            sources.push(inSource.node);
                        } else {
                            error = xcHelper.replaceMsg(AlertTStr.DFLinkShouldLinkError, {
                                "inName": inNode.getParam().linkOutName,
                            });
                        }
                    }
                    // Otherwise this is a link in using a query, so the node itself is the source
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
                const foundSources: {sources: DagNode[], error: string} = this.findNodeNeededSources(node, !shortened, aggMap);
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
                            !DagTblManager.Instance.hasTable(parent.getTable())
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
                    const res: {graph: DagGraph, node: DagNodeDFOut} = linkInNode.getLinkedNodeAndGraph();
                    const graph = res.graph;
                    if (graph !== this) {
                        const dsSet: Set<string> = graph.getUsedDSNames(true);
                        dsSet.forEach((dsName) => {
                            set.add(dsName);
                        });
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
            overallStats.state = node.getState();

            const nodeStats = {
                name: node.getTitle(),
                type: node.getDisplayNodeType(),
                description: node.getDescription(),
                hint: node.getParamHint().fullHint,
                overallStats: overallStats,
                operations: node.getIndividualStats(true)
            }
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
    public checkNodesState(nodesMap): void {
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
            return {
                "status": "Error",
                "hasError": true,
                "node": error.node,
                "type": error.error
            };
        }
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
        parentTxId?: number
    ): XDPromise<void> {
        if (this.currentExecutor != null) {
            return PromiseHelper.reject(ErrTStr.DFInExecution);
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
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
        executor.run()
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

    private _topologicalSort(nodesMap?: Map<DagNodeId, DagNode>, startingNodes?: DagNodeId[]): DagNode[] {
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
        // Construct the aggregates and linkOut names this map creates
        nodesMap.forEach((node: DagNode) => {
            if (node.getType() === DagNodeType.Aggregate) {
                flowAggNames.add(node.getParam().dest)
            } else if (node.getType() === DagNodeType.DFOut) {
                flowOutIds.add(node.getId());
            }
        });
        // Construct starting nodes.
        for (let [nodeId, node] of nodesMap) {
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
            throw new Error("Error Sort!");
        }

        return orderedNodes;
    }

    private _removeNode(
        node: DagNode,
        switchState: boolean = true
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

        if (node.getState() === DagNodeState.Complete) {
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
        if (switchState) {
            this.events.trigger(DagNodeEvents.ConnectionChange, {
                type: "remove",
                descendents: descendents,
                removeInfo: {childIndices: childIndices, node: node},
                tabId: this.parentTabId
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
        node.getLineage().reset();
        traversedSet.add(node);
        this._traverseChildren(node, (node: DagNode) => {
            node.getLineage().reset();
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

    private _removeRetina(dagNode: DagNodeOutOptimizable): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const retinaId = gRetinaPrefix + this.parentTabId + "_" + dagNode.getId();
        XcalarDeleteRetina(retinaId)
        .then(deferred.resolve)
        .fail((error) => {
            if (error && error.status === StatusT.StatusRetinaInUse) {
                deferred.reject({
                    error: error,
                    dagNode: dagNode
                });
            } else {
                deferred.resolve();
            }
        });

        return deferred.promise();
    }

    // TODO: Combine with expServer/queryConverter.js

    /**
     *
     * @param query array of xcalarQueries
     * @param globalState optional state to assign to all nodes
     * @param tableSrcMap
     * @param finalTableName
     */
    public static convertQueryToDataflowGraph(
        query,
        globalState?: DagNodeState,
        tableSrcMap?,
        finalTableName?) {
        const nodes = new Map();
        const destSrcMap = {}; // {dest: [{srcTableName: ..., sourceId: ...], ...} in xc query
        const dagIdParentMap = {}; // {DagNodeId: [{index(parentIdx): ..., srcId(sourceId)}], ...}
        const tableNewDagIdMap = {}; // {oldTableName: newDagId}
        const dagIdToTableNamesMap = {}; // {newDagId: [oldTableName1, oldTableName2]} stores the topological order of the tables per dagNode
        let outputDagId: string;

        for (let rawNode of query) {
            let args;
            let api: number;
            if (rawNode.args) {
                args = rawNode.args;
                api = XcalarApisTFromStr[rawNode.operation];
            } else {
                args = xcHelper.getXcalarInputFromNode(rawNode);
                api = rawNode.api;
            }

            const node: {
                parents: string[],
                children: string[],
                name: string,
                api: number,
                args: any,
                rawNode: any,
                aggregates?: string[]
            } = {
                name: args.dest,
                parents: [],
                children: [],
                rawNode: rawNode,
                args: args,
                api: api
            };
            let isIgnoredApi = false;
            switch (node.api) {
                case (XcalarApisT.XcalarApiIndex):
                case (XcalarApisT.XcalarApiProject):
                case (XcalarApisT.XcalarApiGetRowNum):
                case (XcalarApisT.XcalarApiExport):
                case (XcalarApisT.XcalarApiSynthesize):
                    node.parents = [args.source];
                    break;
                case (XcalarApisT.XcalarApiAggregate):
                    node.args.dest = "^" + args.dest;
                    node.parents = [args.source];
                    node.aggregates = getAggsFromEvalStrs(args.eval);
                    break;
                case (XcalarApisT.XcalarApiFilter):
                case (XcalarApisT.XcalarApiMap):
                case (XcalarApisT.XcalarApiGroupBy):
                    node.parents = [args.source];
                    node.aggregates = getAggsFromEvalStrs(args.eval);
                    break;
                case (XcalarApisT.XcalarApiJoin):
                    node.parents = xcHelper.deepCopy(args.source);
                    node.aggregates = getAggsFromEvalStrs([args]);
                    break;
                case (XcalarApisT.XcalarApiUnion):
                    node.parents = xcHelper.deepCopy(args.source);
                    break;
                case (XcalarApisT.XcalarApiSelect):
                case (XcalarApisT.XcalarApiBulkLoad):
                case (XcalarApisT.XcalarApiExecuteRetina):
                    node.parents = [];
                    break;
                default:
                    isIgnoredApi = true;
                    break;
            }
            if (!isIgnoredApi) {
               nodes.set(node.name, node);
            }
        }


        //  connect into tree by matching nodes with parents
        for (let [_name, node] of nodes) {
            setParents(node);
        }

        // splice out index nodes
        for (let [_name, node] of nodes) {
            setIndexedFields(node);
        }

        for (let [_name, node] of nodes) {
            collapseIndexNodes(node);
        }

        // turn nodeMeta into dagNodeInfo structure expected by DagGraph
        const retSruct = {
            dagInfoList: finalConvertIntoDagNodeInfoArray(nodes),
            dagIdParentMap: dagIdParentMap,
            outputDagId: outputDagId,
            tableNewDagIdMap: tableNewDagIdMap,
            dagIdToTableNamesMap: dagIdToTableNamesMap
        }
        return retSruct;

        function finalConvertIntoDagNodeInfoArray(nodes) {
            const endNodes = [];
            for (let [_name, node] of nodes) {
                if (node.children.length === 0) {
                    endNodes.push(node);
                }
            }

            const finalNodeInfos = [];
            const dagNodeInfos = {};
            const endDagNodeInfos = [];
            endNodes.forEach(node => {
                endDagNodeInfos.push(recursiveGetDagNodeInfo(node, dagNodeInfos));
            });

            for (var i in dagNodeInfos) {
                finalNodeInfos.push(dagNodeInfos[i]);
            }

            return finalNodeInfos;
        }

        function recursiveGetDagNodeInfo(node, dagNodeInfos) {
            if (dagNodeInfos[node.name]) {
                return dagNodeInfos[node.name];
            }
            const dagNodeInfo = getDagNodeInfo(node);
            dagNodeInfos[node.name] = dagNodeInfo;

            node.parents.forEach(child => {
                let childInfoId;
                if (child) {
                    const childInfo = recursiveGetDagNodeInfo(child, dagNodeInfos);
                    childInfoId = childInfo.id;
                }
                dagNodeInfo.parents.push(childInfoId);
            });
            return dagNodeInfo;
        }

        function getDagNodeInfo(node, hiddenSubGraphNode?: boolean) {
            let dagNodeInfo: DagNodeInfo;
            if (node.subGraphNodes) {
                const subGraphNodes = [];
                node.subGraphNodes.forEach((subGraphNode) => {
                    subGraphNodes.push(getDagNodeInfo(subGraphNode, true));
                });
                node.subGraphNodes = subGraphNodes;
            }
            switch (node.api) {
                case (XcalarApisT.XcalarApiIndex):
                    if (node.createTableInput) {
                        dagNodeInfo = {
                            type: DagNodeType.Dataset,
                            input: node.createTableInput
                        }; // need to get columns
                    } else {
                        // probably a sort node
                        dagNodeInfo = {
                            type: DagNodeType.Sort,
                            input: {
                                columns: node.args.key.map((key) => {
                                    return {columnName: key.name, ordering: key.ordering}
                                }),
                                newKeys: node.args.key.map((key) => {
                                    return key.keyFieldName
                                })
                            }
                        }
                    }
                    break;
                case (XcalarApisT.XcalarApiAggregate):
                    dagNodeInfo = {
                        type: DagNodeType.Aggregate,
                        input: {
                            evalString: node.args.eval[0].evalString,
                            dest: node.args.dest
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiProject):
                    dagNodeInfo = {
                        type: DagNodeType.Project,
                        input: {
                            columns: node.args.columns
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiGroupBy):
                    const aggs = node.args.eval.map((evalStruct) => {
                        const evalStr = evalStruct.evalString;
                        const parenIndex = evalStr.indexOf("(");
                        return {
                            operator: evalStr.substring(0, parenIndex),
                            sourceColumn: evalStr.substring(parenIndex + 1, evalStr.length - 1),
                            destColumn: evalStruct.newField,
                            distinct: false,
                            cast: null
                        }
                    });
                    const groupBy = node.indexedFields[0].map(key => {
                        return key.name;
                    });
                    const newKeys = node.indexedFields[0].map(key => {
                        return key.keyFieldName;
                    });
                    dagNodeInfo = {
                        type: DagNodeType.GroupBy,
                        input: {
                            groupBy: groupBy,
                            newKeys: newKeys,
                            aggregate: aggs,
                            includeSample: node.args.includeSample,
                            icv: node.args.icv,
                            groupAll: node.args.groupAll
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiGetRowNum):
                    dagNodeInfo = {
                        type: DagNodeType.RowNum,
                        input: {
                            newField: node.args.newField
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiFilter):
                    dagNodeInfo = {
                        type: DagNodeType.Filter,
                        input: {
                            evalString: node.args.eval[0].evalString
                        },
                    };
                    break;
                case (XcalarApisT.XcalarApiMap):
                    dagNodeInfo = {
                        type: DagNodeType.Map,
                        input: {
                            eval: node.args.eval,
                            icv: node.args.icv
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiJoin):
                    const leftRenames = node.args.columns[0].map(colInfo => {
                        return {
                            sourceColumn: colInfo.sourceColumn,
                            destColumn: colInfo.destColumn,
                            prefix: colInfo.columnType === DfFieldTypeTStr[DfFieldTypeTFromStr.DfFatptr]
                        }
                    });
                    const rightRenames = node.args.columns[1].map(colInfo => {
                        return {
                            sourceColumn: colInfo.sourceColumn,
                            destColumn: colInfo.destColumn,
                            prefix: colInfo.columnType === DfFieldTypeTStr[DfFieldTypeTFromStr.DfFatptr]
                        }
                    });
                    dagNodeInfo = {
                        type: DagNodeType.Join,
                        input: {
                            joinType: node.args.joinType,
                            "left": {
                                "columns": node.indexedFields[0].map(key => {
                                    return key.name;
                                }),
                                "casts": node.indexedFields[0].filter(key => {
                                    if (DfFieldTypeTFromStr[key.type] ===
                                        DfFieldTypeT.DfUnknown) {
                                        return false;
                                    }
                                    return true;
                                }).map(key => {
                                    return xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[key.type]);
                                }),
                                "rename": leftRenames
                            },
                            "right": {
                                "columns": node.indexedFields[1].map(key => {
                                    return key.name;
                                }),
                                "casts": node.indexedFields[1].filter(key => {
                                    if (DfFieldTypeTFromStr[key.type] ===
                                        DfFieldTypeT.DfUnknown) {
                                        return false;
                                    }
                                    return true;
                                }).map(key => {
                                    return xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[key.type]);
                                }),
                                "rename": rightRenames
                            },
                            evalString: node.args.evalString
                        },
                    };
                    break;
                case (XcalarApisT.XcalarApiUnion):
                    const setType = <DagNodeSubType>xcHelper.unionTypeToXD(node.args.unionType);
                    const columns = _getUnionColumns(node.args.columns);
                    dagNodeInfo = {
                        type: DagNodeType.Set,
                        subType: <DagNodeSubType>xcHelper.capitalize(setType),
                        input: {
                            columns: columns,
                            dedup: node.args.dedup
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiExport):
                    dagNodeInfo = {
                        type: DagNodeType.Export,
                        input: {
                            columns: [],
                            driver: "",
                            driverArgs: {}
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiSynthesize):
                    dagNodeInfo = {
                        type: DagNodeType.Synthesize,
                        input: {
                            colsInfo: node.args.columns
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiSelect):
                    dagNodeInfo = {
                        type: DagNodeType.IMDTable,
                        input: {
                            source: node.args.source,
                            version: node.args.minBatchId,
                            filterString: node.args.filterString || node.args.evalString,
                            columns: node.args.columns
                        }
                    };
                    break;
                case (XcalarApisT.XcalarApiExecuteRetina):
                case (XcalarApisT.XcalarApiBulkLoad):
                default:
                    dagNodeInfo = {
                        type: DagNodeType.Placeholder,
                        name: XcalarApisTStr[node.api],
                        title: XcalarApisTStr[node.api],
                        input: {
                            args: node.args
                        }
                    };
                    break;
            }

            dagNodeInfo.table = node.name;
            dagNodeInfo.id = DagNode.generateId();
            dagNodeInfo.parents = [];
            dagNodeInfo.aggregates = node.aggregates;
            dagNodeInfo.description = JSON.stringify(node.args, null, 4);
            dagNodeInfo.subGraphNodes = node.subGraphNodes;
            dagNodeInfo.display = {x: 0, y: 0};
            dagNodeInfo.configured = true;
            if (globalState) {
                dagNodeInfo.state = globalState;
            }
            // create dagIdParentMap so that we can add input nodes later
            const srcTables = destSrcMap[node.name];
            if (srcTables) {
                srcTables.forEach((srcTable) => {
                    const srcTableName = srcTable.srcTableName;
                    const obj = {
                        index: srcTable.index,
                        srcId: tableSrcMap[srcTableName]
                    }
                    if (!dagIdParentMap[dagNodeInfo.id]) {
                        dagIdParentMap[dagNodeInfo.id] = [];
                    }
                    dagIdParentMap[dagNodeInfo.id].push(obj);
                });
            }
            if(node.name === finalTableName) {
                outputDagId = dagNodeInfo.id;
            }
            if (!hiddenSubGraphNode) {
                tableNewDagIdMap[dagNodeInfo.table] = dagNodeInfo.id;
                dagIdToTableNamesMap[dagNodeInfo.id] = [];
            }

            if (node.subGraphNodes) {
                node.subGraphNodes.forEach(subGraphNode => {
                    tableNewDagIdMap[subGraphNode.table] = dagNodeInfo.id;
                    dagIdToTableNamesMap[dagNodeInfo.id].push(subGraphNode.table);
                });
            }
            if (!hiddenSubGraphNode) {
                dagIdToTableNamesMap[dagNodeInfo.id].push(dagNodeInfo.table);
            }
            return dagNodeInfo;
        }

        function setParents(node) {
            const newParents = [];
            for (let i = 0; i < node.parents.length; i++) {
                const parent = nodes.get(node.parents[i]);
                if (parent) {
                    parent.children.push(node);
                    node.parents[i] = parent;
                    newParents.push(node.parents[i]);
                } else {
                    if (tableSrcMap) {
                        // This is a starting node in the sub graph, store it bc
                        // later we'll create the dagNodeId -> srcId(parentIdx) map
                        const obj = {
                            srcTableName: node.parents[i],
                            index: i
                        }
                        if (!destSrcMap[node.name]) {
                            destSrcMap[node.name] = [];
                        }
                        destSrcMap[node.name].push(obj);
                    }
                }
            }
            node.parents = newParents;
        }

        // turns    filter->index->join    into   filter->join
        // and setups up a "create table" node to be a dataset node
        function collapseIndexNodes(node) {
            if (node.api === XcalarApisT.XcalarApiIndex) {
                const parent = node.parents[0];
                if (parent && parent.api === XcalarApisT.XcalarApiBulkLoad &&
                    !node.createTableInput) {
                    node.createTableInput = {
                        source: node.args.source,
                        prefix: node.args.prefix
                    }
                    node.parents = [];
                    node.subGraphNodes = [parent];
                }
                return;
            }
            for (let i = 0; i < node.parents.length; i++) {
                const parent = node.parents[i];
                if (parent.api !== XcalarApisT.XcalarApiIndex) {
                    continue;
                }
                if (parent.createTableInput) {
                    // index parent belongs to dataset
                    continue;
                }

                if (parent.parents[0] &&
                    parent.parents[0].api === XcalarApisT.XcalarApiBulkLoad) {
                    if (parent.args.source.startsWith(gDSPrefix)) {
                        // if index resulted from dataset
                        // then that index needs to take the role of the dataset node
                        parent.createTableInput = {
                            source: parent.args.source,
                            prefix: parent.args.prefix
                        }

                        parent.subGraphNodes = [parent.parents[0]];
                        parent.parents = [];
                    }
                    continue;
                }

                const subGraphNodes = [parent];
                const nonIndexParent = getNonIndexParent(parent, subGraphNodes);
                if (!nonIndexParent && node.api !== XcalarApisT.XcalarApiJoin) {
                    node.parents.splice(i, 1);
                    i--;
                    continue;
                }
                if (!node.subGraphNodes) {
                    node.subGraphNodes = subGraphNodes;
                } else {
                    node.subGraphNodes = node.subGraphNodes.concat(subGraphNodes);
                }
                // change the node's parent to be the nonIndex node
                node.parents[i] = nonIndexParent;

                // remove indexed children and push node
                if (nonIndexParent) {
                    nonIndexParent.children = nonIndexParent.children.filter((child) => {
                        return child.api !== XcalarApisT.XcalarApiIndex;
                    });
                    nonIndexParent.children.push(node);
                } else if (tableSrcMap && node.api === XcalarApisT.XcalarApiJoin) {
                    // since index no longer exists, assign it's destSrcMap
                    // to the current node
                    if (destSrcMap[parent.name]) {
                        if (!destSrcMap[node.name]) {
                            destSrcMap[node.name] = [];
                        }
                        const destSrcObj = destSrcMap[parent.name][0]
                        destSrcMap[node.name].push(destSrcObj);
                        destSrcObj.index = i;
                        delete destSrcMap[parent.name];
                    }
                }
            }

            function getNonIndexParent(node, subGraphNodes) {
                const parentOfIndex = node.parents[0];
                if (!parentOfIndex) {
                    return null;
                } else if (parentOfIndex.api === XcalarApisT.XcalarApiIndex) {
                    // if source is index but that index resulted from dataset
                    // then that index needs to take the role of the dataset node
                    if (parentOfIndex.args.source.includes(gDSPrefix)) {
                        return parentOfIndex;
                    }

                    subGraphNodes.unshift(parentOfIndex);
                    return getNonIndexParent(parentOfIndex, subGraphNodes);
                } else {
                    return parentOfIndex;
                }
            }
        }

        function setIndexedFields(node) {
            if (node.api === XcalarApisT.XcalarApiGroupBy) {
                node.indexedFields = getIndexedFields(node);
            } else if (node.api === XcalarApisT.XcalarApiJoin) {
                node.indexedFields = getJoinSrcCols(node);
            } else {
                return;
            }

            function getJoinSrcCols(node) {
                let lSrcCols = [];
                let rSrcCols = [];
                let parents = node.parents;

                if (node.args.joinType === JoinOperatorTStr[JoinOperatorT.CrossJoin]) {
                    return [lSrcCols, rSrcCols];
                }

                for (let i = 0; i < parents.length; i++) {
                    if (i === 0) {
                        lSrcCols = getSrcIndex(parents[i]);
                    } else {
                        rSrcCols = getSrcIndex(parents[i]);
                    }
                }

                return [lSrcCols, rSrcCols];

                function getSrcIndex(node) {
                    if (node.api === XcalarApisT.XcalarApiIndex) {
                        return node.args.key;
                    } else {
                        if (!node.parents.length) {
                            // one case is when we reach a retina project node
                            return [];
                        }
                        return getSrcIndex(node.parents[0]);
                    }
                }
            }
        }

        function getIndexedFields(node) {
            var cols = [];
            search(node);
            function search(node) {
                // if parent node is join, it's indexed by left parent, ignore right
                var numParents = Math.min(node.parents.length, 1);
                for (var i = 0; i < numParents; i++) {
                    var parentNode = node.parents[i];
                    if (parentNode.api === XcalarApisT.XcalarApiIndex) {
                        cols = parentNode.args.key;
                    } else {
                        search(parentNode);
                    }
                }
            }

            return [cols];
        }

        function getAggsFromEvalStrs(evalStrs) {
            const aggs = [];
            for (let i = 0; i < evalStrs.length; i++) {
                const parsedEval = XDParser.XEvalParser.parseEvalStr(evalStrs[i].evalString);
                if (!parsedEval.args) {
                    parsedEval.args = [];
                }
                getAggs(parsedEval);
            }
            function getAggs(parsedEval) {
                for (let i = 0; i < parsedEval.args.length; i++) {
                    if (parsedEval.args[i].type === "aggValue") {
                        aggs.push(parsedEval.args[i].value);
                    } else if (parsedEval.args[i].type === "fn") {
                        getAggs(parsedEval.args[i]);
                    }
                }
            }
            return aggs;
        }

        function _getUnionColumns(columns) {
            let maxLength = 0;
            let maxColSet;
            const newCols = columns.map((colSet) => {
                const newColSet = colSet.map((col) => {
                    return {
                        "sourceColumn": col.sourceColumn,
                        "destColumn": col.destColumn,
                        "cast": false,
                        "columnType": xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[col.columnType])
                    }
                });
                if (newColSet.length > maxLength) {
                    maxLength = newColSet.length;
                    maxColSet = newColSet;
                }
                return newColSet;
            });

            newCols.forEach((colSet) => {
                const currLen = colSet.length;
                const diff = maxLength - currLen;
                if (diff > 0) {
                    for (let i = 0; i < diff; i++) {
                        colSet.push({
                            "sourceColumn": null,
                            "destColumn": maxColSet[currLen + i].destColumn,
                            "cast": false,
                            "columnType": maxColSet[currLen + i].columnType
                        });
                    }
                }
            })

            return newCols;
        }
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
}

if (typeof exports !== 'undefined') {
    exports.DagGraph = DagGraph;
}
