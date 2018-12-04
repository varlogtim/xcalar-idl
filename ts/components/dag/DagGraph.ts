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
    protected currentExecutor: DagGraphExecutor
    public events: { on: Function, trigger: Function}; // example: dagGraph.events.on(DagNodeEvents.StateChange, console.log)

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
        this._setupEvents();
    }

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
            display: this.display
        };
    }

    public rebuildGraph(graphJSON: {
        nodes: {node: DagNode, parents: DagNodeId[]}[],
        comments: CommentInfo[],
        display: Dimensions
    }): void {
        let connections: NodeConnection[] = [];
        this.display = xcHelper.deepCopy(graphJSON.display);
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

        if (graphJSON.comments) {
            graphJSON.comments.forEach((comment) => {
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
            if (nodeInfo.type == DagNodeType.Aggregate) {
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
            display: serializableGraph.display
        });
    }

    public clone(): DagGraph {
        const serializableGraph: DagGraphInfo = this.getSerializableObj();
        const graph: DagGraph = new DagGraph();
        graph.create(serializableGraph);
        return graph;
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
    public getNode(nodeId: DagNodeId): DagNode {
        return this._getNodeFromId(nodeId);
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
            const node = this.getNode(info.id);
            this._traverseSwitchState(node);
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
     * @param fromNodeId
     * @param toNodeId
     * @param toPos
     */
    public canConnect(
        fromNodeId: DagNodeId,
        toNodeId: DagNodeId,
        toPos: number,
        allowCyclic?: boolean
    ): boolean {
        let canConnect: boolean = this.connect(fromNodeId, toNodeId, toPos, allowCyclic, false);
        if (canConnect) {
            this.disconnect(fromNodeId, toNodeId, toPos, false);
        }

        return canConnect;
    }

    /**
     * connect two nodes
     * @param fromNodeId parent node
     * @param toNodeId child node
     * @param toPos 0 based position of the  child node's input
     */
    public connect(
        fromNodeId: DagNodeId,
        toNodeId: DagNodeId,
        toPos: number = 0,
        allowCyclic: boolean = false,
        switchState: boolean = true,
        spliceIn: boolean = false
    ): boolean {
        let connectedToParent = false;
        let fromNode: DagNode;
        let toNode: DagNode;
        try {
            fromNode = this._getNodeFromId(fromNodeId);
            toNode = this._getNodeFromId(toNodeId);
            toNode.connectToParent(fromNode, toPos, spliceIn);
            connectedToParent = true;
            fromNode.connectToChild(toNode);

            if (!allowCyclic && this._isCyclic(fromNode)) {
                fromNode.disconnectFromChild(toNode);
                toNode.disconnectFromParent(fromNode, toPos);
                throw new Error("has cycle in the dataflow");
            }
            if (switchState) {
                const descendentSets = this._traverseSwitchState(toNode);
                const childIndices = {};
                childIndices[toNodeId] = toPos;
                this.events.trigger(DagNodeEvents.ConnectionChange, {
                    type: "add",
                    descendents:[...descendentSets],
                    addInfo: {
                        childIndices: childIndices,
                        node: fromNode
                    },
                    tabId: this.parentTabId
                });
            }
            return true;
        } catch (e) {
            if (connectedToParent) {
                // error handler
                toNode.disconnectFromParent(fromNode, toPos);
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
     * @param fromNodeId parent node
     * @param toNodeId child node
     * @param toPos 0 based position of the  child node's input
     */
    public disconnect(
        fromNodeId: DagNodeId,
        toNodeId: DagNodeId,
        toPos: number = 0,
        switchState: boolean = true
    ): boolean {
        const fromNode: DagNode = this._getNodeFromId(fromNodeId);
        const toNode: DagNode = this._getNodeFromId(toNodeId);
        const wasSpliced = toNode.disconnectFromParent(fromNode, toPos);
        fromNode.disconnectFromChild(toNode);
        if (switchState) {
            const descendentSets = this._traverseSwitchState(toNode);
            const childIndices = {};
            childIndices[toNodeId] = toPos;
            this.events.trigger(DagNodeEvents.ConnectionChange, {
                type: "remove",
                descendents: [...descendentSets],
                removeInfo: {
                    childIndices: childIndices,
                    node: fromNode
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
    public execute(nodeIds?: DagNodeId[], optimized?: boolean): XDPromise<void> {
        if (nodeIds == null) {
            return this._executeGraph(null, optimized);
        } else {
            // get subGraph from nodes and execute
            // we want to stop at the next node with a table unless we're
            // executing optimized in which case we want the entire query
            const backTrack: BackTraceInfo = this.backTraverseNodes(nodeIds, !optimized);
            if (backTrack.error != null) {
                return PromiseHelper.reject(backTrack.error);
            }
            const nodesMap:  Map<DagNodeId, DagNode> = backTrack.map;
            const startingNodes: DagNodeId[] = backTrack.startingNodes;
            return this._executeGraph(nodesMap, optimized, startingNodes);
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
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, clonedGraph, {
            optimized: true,
            noReplaceParam: noReplaceParam
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
        return executor.getRetinaArgs()
    }

    /**
     * @description gets query from the lineage of 1 node, includes validation
     * @param nodeId
     * @param optimized
     */
    public getQuery(nodeId: DagNodeId, optimized?: boolean): XDPromise<string> {
        // clone graph because we will be changing each node's table and we don't
        // want this to effect the actual graph
        const clonedGraph = this.clone();
        clonedGraph.setTabId(DagTab.generateId());
        const nodesMap:  Map<DagNodeId, DagNode> = clonedGraph.backTraverseNodes([nodeId], false).map;
        const orderedNodes: DagNode[] = clonedGraph._topologicalSort(nodesMap);
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, clonedGraph, {
            optimized: optimized
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
                nodes.push(this.getNode(nodeId));
            });
        }
        let travsesedSet: Set<DagNode> = new Set();
        nodes.forEach((node) => {
            if (!travsesedSet.has(node)) {
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
            subGraphMap.set(nodeId, this.getNode(nodeId));
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
        if (!this.parentTabId) return;
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
    public findNodeNeededSources(node: DagNode): {sources: DagNode[], error: string} {
        let error: string;
        let sources: DagNode[] = [];
        if (node.getType() == DagNodeType.Map || node.getType() == DagNodeType.Filter) {
            const genNode: DagNodeMap = <DagNodeMap>node;
            const aggregates: string[] = genNode.getAggregates();
            for (let i = 0; i < aggregates.length; i++) {
                let agg: string = aggregates[i];
                let aggInfo: AggregateInfo = DagAggManager.Instance.getAgg(agg);
                if (aggInfo.value == null) {
                    if (aggInfo.graph != this.getTabId()) {
                        error = xcHelper.replaceMsg(AggTStr.AggGraphError, {
                            "aggName": agg,
                            "graphName": DagTabManager.Instance.getTabById(aggInfo.graph).getName()
                        });
                        continue;
                    }
                    let aggNode: DagNode = this.getNode(aggInfo.node);
                    if (aggNode == null) {
                        error = xcHelper.replaceMsg(AggTStr.AggNodeNotExistError, {
                            "aggName": agg
                        });
                        continue;
                    }
                    if (aggNode.getParam().mustExecute) {
                        error = xcHelper.replaceMsg(AggTStr.AggNodeMustExecuteError, {
                            "aggName": agg
                        });
                        continue;
                    }
                    sources.push(aggNode);
                }
            }
        } else if (node.getType() == DagNodeType.DFIn) {
            const inNode: DagNodeDFIn = <DagNodeDFIn>node;
            try {
                let inSource: {graph: DagGraph, node: DagNodeDFOut} =
                    inNode.getLinedNodeAndGraph();
                if (!DagTblManager.Instance.hasTable(inSource.node.getTable())) {
                    // The needed table doesnt exist so we need to generate it, if we can
                    if (inSource.graph.getTabId() != this.getTabId()) {
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
                error = e;
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
        let isStarting = false;
        while (nodeStack.length > 0) {
            isStarting = false;
            const node: DagNode = nodeStack.pop();
            if (node != null && !nodesMap.has(node.getId())) {
                nodesMap.set(node.getId(), node);
                let parents: DagNode[] = node.getParents();
                const foundSources: {sources: DagNode[], error: string} = this.findNodeNeededSources(node);
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
                        // parent can be null in join - left parent
                        if (parent && parent.getState() != DagNodeState.Complete ||
                                !DagTblManager.Instance.hasTable(parent.getTable())) {
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
                    const res: {graph: DagGraph, node: DagNodeDFOut} = linkInNode.getLinedNodeAndGraph();
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
            const overallStats = node.getOverallStats();
            delete overallStats.rows;
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

    public updateProgress(nodeId, nodeInfos) {
        const nodeIdInfos = {};

        nodeInfos.forEach((nodeInfo, i) => {
            const tableName = nodeInfo.name.name;
            if (!nodeIdInfos.hasOwnProperty(nodeId)) {
                nodeIdInfos[nodeId] = {}
            }
            const nodeIdInfo = nodeIdInfos[nodeId];
            nodeIdInfo[tableName] = nodeInfo;
            nodeInfo.index = i;
        });

        for (let nodeId in nodeIdInfos) {
            this.getNode(nodeId).updateProgress(nodeIdInfos[nodeId]);
        }
    }

    private _setupEvents(): void {
        this.innerEvents = {};
        this.events = {
            on: (event, callback) => { this.innerEvents[event] = callback },
            trigger: (event, ...args) => {
                if (typeof this.innerEvents[event] === 'function') {
                    this.innerEvents[event].apply(this, args)
                }
            }
        };

    }

    private _executeGraph(nodesMap?: Map<DagNodeId, DagNode>, optimized?: boolean, startingNodes?: DagNodeId[]): XDPromise<void> {
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
            optimized: optimized
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
                            link = inNode.getLinedNodeAndGraph();
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
                    case (DagNodeType.Map):
                    case (DagNodeType.Filter):
                        // generalized use dagnodemap
                        let myNode: DagNodeMap = <DagNodeMap>node;
                        let aggNames: string[] = myNode.getAggregates();
                        if (aggNames.length == 0) {
                            break;
                        }
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
                        break;
                    default:
                        break;
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
    ): {dagNodeId: boolean[]} {
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
        this.nodesMap.delete(node.getId());
        if (switchState) {
            this.events.trigger(DagNodeEvents.ConnectionChange, {
                type: "remove",
                descendents: descendents,
                removeInfo: {childIndices: childIndices, node: node},
                tabId: this.parentTabId
            });
        }
        return spliceFlags;
    }

    private _getNodeFromId(nodeId: DagNodeId): DagNode {
        const node: DagNode = this.nodesMap.get(nodeId);
        if (node == null) {
            throw new Error("Dag Node " + nodeId + " not exists");
        }
        return node;
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

    private _traverseSwitchState(node: DagNode): Set<DagNode> {
        const traversedSet: Set<DagNode> = new Set();
        node.switchState();
        traversedSet.add(node);
        this._traverseChildren(node, (node: DagNode) => {
            node.switchState();
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
        let nodeStack: DagNode[] = nodes.map((nodeID: string) => {
            return this.getNode(nodeID);
        })
        let node: DagNode;
        let currId: DagNodeId;
        while (nodeStack.length != 0) {
            node = nodeStack.pop();
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
                callback(child);
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
        const dagNode: DagNode = this.getNode(nodeId);
        recursiveTraverse(dagNode, renameMap);

        function recursiveTraverse(node: DagNode, renameMap): void {
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

    // TODO: Combine with expServer/queryConverter.js
    public static convertQueryToDataflowGraph(query, tableSrcMap?, finalTableName?) {
        const nodes = new Map();
        const destSrcMap = {}; // {dest: source} in xc query
        const dagIdParentIdxMap = {}; // {DagNodeId: parentIdx}
        const tableNewDagIdMap = {}; // {oldTableName: newDagId}
        let outputDagId: string;

        for (let rawNode of query) {
            const args = rawNode.args;

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
                api: XcalarApisTFromStr[rawNode.operation]
            };
            let isIgnoredApi = false;
            switch (node.api) {
                case (XcalarApisT.XcalarApiIndex):
                case (XcalarApisT.XcalarApiAggregate):
                case (XcalarApisT.XcalarApiProject):
                case (XcalarApisT.XcalarApiGroupBy):
                case (XcalarApisT.XcalarApiGetRowNum):
                case (XcalarApisT.XcalarApiExport):
                case (XcalarApisT.XcalarApiSynthesize):
                    node.parents = [args.source];
                    break;
                case (XcalarApisT.XcalarApiFilter):
                case (XcalarApisT.XcalarApiMap):
                    node.parents = [args.source];
                    node.aggregates = getAggsFromEvalStrs(args.eval);
                    break;
                case (XcalarApisT.XcalarApiJoin):
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
            dagIdParentIdxMap: dagIdParentIdxMap,
            outputDagId: outputDagId,
            tableNewDagIdMap: tableNewDagIdMap
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

            endNodes.forEach(node => {
                recursiveGetDagNodeInfo(node, dagNodeInfos);
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
                const childInfo = recursiveGetDagNodeInfo(child, dagNodeInfos);
                dagNodeInfo.parents.push(childInfo.id);
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
                            type: DagNodeType.Index,
                            input: {columns: []}
                        }
                        // need to use real columns
                    }
                    break;
                case (XcalarApisT.XcalarApiAggregate):
                    dagNodeInfo = {
                        type: DagNodeType.Aggregate,
                        input: {
                            evalString: node.args.eval[0].evalString,
                            dest: node.name
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
                        aggregates: node.aggregates
                    };
                    break;
                case (XcalarApisT.XcalarApiMap):
                    dagNodeInfo = {
                        type: DagNodeType.Map,
                        input: {
                            eval: node.args.eval,
                            icv: node.args.icv
                        },
                        aggregates: node.aggregates
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
                    dagNodeInfo = {
                        type: DagNodeType.Set,
                        subType: <DagNodeSubType>xcHelper.capitalize(setType),
                        input: {
                            columns: node.args.columns,
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
            dagNodeInfo.description = JSON.stringify(node.args, null, 4);
            dagNodeInfo.subGraphNodes = node.subGraphNodes;
            // create dagIdParentIdxMap so that we can add input nodes later
            const srcTableName = destSrcMap[node.name];
            if (srcTableName) {
                dagIdParentIdxMap[dagNodeInfo.id] = tableSrcMap[srcTableName];
            }
            if(node.name === finalTableName) {
                outputDagId = dagNodeInfo.id;
            }
            if (!hiddenSubGraphNode) {
                tableNewDagIdMap[dagNodeInfo.table] = dagNodeInfo.id;
            }

            if (node.subGraphNodes) {
                node.subGraphNodes.forEach(subGraphNode => {
                    tableNewDagIdMap[subGraphNode.table] = dagNodeInfo.id;
                });
            }
            return dagNodeInfo;
        }

        function setParents(node) {
            for (let i = 0; i < node.parents.length; i++) {
                const parent = nodes.get(node.parents[i]);
                if (parent) {
                    parent.children.push(node);
                    node.parents[i] = parent;
                } else {
                    if (tableSrcMap) {
                        // This is a starting node in the sub graph, store it bc
                        // later we'll create the dagNodeId -> srcId(parentIdx) map
                        destSrcMap[node.name] = node.parents[i];
                    }
                    // parent doesn't exist, remove it
                    node.parents.splice(i, 1);
                    i--;
                }
            }
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
                if (!parent.parents.length ||
                    parent.parents[0].api === XcalarApisT.XcalarApiBulkLoad) {
                    if (parent.args.source.startsWith(gDSPrefix) && !parent.createTableInput) {
                        // if index resulted from dataset
                        // then that index needs to take the role of the dataset node
                        parent.createTableInput = {
                            source: parent.args.source,
                            prefix: parent.args.prefix
                        }
                        if (parent.parents[0]) {
                            parent.subGraphNodes = [parent.parents[0]];
                        }

                        parent.parents = [];
                    }
                    continue;
                }

                const subGraphNodes = [parent];
                const nonIndexParent = getNonIndexParent(parent, subGraphNodes);
                if (!nonIndexParent) {
                    node.parents.splice(i, 1);
                    i--;
                    continue;
                }
                if (!node.subGraphNodes) {
                    node.subGraphNodes = subGraphNodes;
                } else {
                    node.subGraphNodes = node.subGraphNodes.concat(subGraphNodes);
                }
                node.parents[i] = nonIndexParent;

                // remove indexed children and push node
                nonIndexParent.children = nonIndexParent.children.filter((child) => {
                    return child.api !== XcalarApisT.XcalarApiIndex;
                });
                nonIndexParent.children.push(node);
            }

            function getNonIndexParent(node, subGraphNodes) {
                const parentOfIndex = node.parents[0];
                if (!parentOfIndex) {
                    return null;
                } else if (parentOfIndex.api === XcalarApisT.XcalarApiIndex) {
                    // if source is index but that index resulted from dataset
                    // then that index needs to take the role of the dataset node
                    if (parentOfIndex.args.source.startsWith(gDSPrefix)) {
                        return parentOfIndex;
                    }

                    subGraphNodes.push(parentOfIndex);
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
    }
}