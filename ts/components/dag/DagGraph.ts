class DagGraph {
    private nodesMap: Map<DagNodeId, DagNode>;
    private removedNodesMap: Map<DagNodeId,{}>;
    private commentsMap: Map<CommentNodeId, CommentNode>;
    private removedCommentsMap: Map<CommentNodeId, CommentNode>;
    private display: Dimensions;
    private innerEvents: object;
    private lock: boolean;
    private noDelete: boolean;
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
     * Outputs the serialized version of this graph.
     */
    public serialize(): string {
        let nodes: string[] = [];
        // Assemble node list
        this.nodesMap.forEach((value: DagNode, _key: DagNodeId) => {
            nodes.push(value.serialize());
        });
        let comments: string[] = [];
        this.commentsMap.forEach((comment) => {
            comments.push(comment.serialize());
        });
        return JSON.stringify({
            nodes: nodes,
            comments: comments,
            display: this.display
        });
    }

    /**
     * Deserializes the graph represented by serializedGraph
     * @param serializedGraph The serialized graph we want to restore.
     * @returns {boolean}
     * TODO: Update for metaNodes
     */
    public deserializeDagGraph(serializedGraph: string): boolean {
        if (serializedGraph == null) {
            return false;
        }
        let graphJSON: {nodes:string[], comments:string[], display: Dimensions} = null;
        try {
            graphJSON = JSON.parse(serializedGraph);
        } catch(error) {
            console.error("Could not parse JSON of dagGraph: " + error)
            return false;
        }
        let connections: NodeConnection[] = [];
        this.display = graphJSON.display;
        graphJSON.nodes.forEach((ele) => {
            const desNode: DeserializedNode = DagNodeFactory.deserialize(ele);
            if (desNode == null) {
                return false;
            }
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
                const commentNode = CommentNode.deserialize(comment);
                this.commentsMap.set(commentNode.getId(), commentNode);
            });
        }
        return true;
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
        const dagNode: DagNode = DagNodeFactory.create(nodeInfo);
        this.addNode(dagNode);
        return dagNode;
    }

    /**
     * adds back a removed node
     * @param nodeId
     */
    public addBackNode(nodeId): DagNode {
        const nodeInfo = this._getRemovedNodeInfoFromId(nodeId);
        const node = nodeInfo["node"]
        const parents: DagNode[] = node.getParents();
        const children: DagNode[] = node.getChildren();

        parents.forEach((parent) => {
            if (parent != null) {
                parent.connectToChild(node);
            }
        });
        children.forEach((child) => {
            const childId = child.getId();
            nodeInfo["childIndices"][childId].forEach((index) => {
                child.connectToParent(node, index);
            });
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
            }
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
            this.events.trigger(DagNodeEvents.StateChange, info);
            if (info.state === DagNodeState.Configured) {
                this.events.trigger(DagNodeEvents.SubGraphConfigured, {
                    id: info.id
                });
            } else if (info.state === DagNodeState.Error) {
                this.events.trigger(DagNodeEvents.SubGraphError, {
                    id: info.id,
                    error: info.node.getError()
                });
            }
        })
        .registerEvents(DagNodeEvents.ParamChange, (info) => {
            const node = this.getNode(info.id);
            this._traverseSwitchState(node);
            this.events.trigger(DagNodeEvents.ParamChange, info);
        })
        .registerEvents(DagNodeEvents.TableRemove, (info) => {
            this.events.trigger(DagNodeEvents.TableRemove, info);
        })
        .registerEvents(DagNodeEvents.AggregateChange, (info) => {
            this.events.trigger(DagNodeEvents.AggregateChange, info);
        });
    }

    /**
     * remove a node
     * @param nodeId node's id
     */
    public removeNode(nodeId: DagNodeId): void {
        const node: DagNode = this._getNodeFromId(nodeId);
        return this._removeNode(node);
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
        let canConnect: boolean = true;
        try {
            this.connect(fromNodeId, toNodeId, toPos, allowCyclic, false);
        } catch (e) {
            canConnect = false;
        }
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
        switchState: boolean = true
    ): void {
        let connectedToParent = false;
        let fromNode: DagNode;
        let toNode: DagNode;
        try {
            fromNode = this._getNodeFromId(fromNodeId);
            toNode = this._getNodeFromId(toNodeId);
            toNode.connectToParent(fromNode, toPos);
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
                    }
                });
            }
        } catch (e) {
            if (connectedToParent) {
                // error handler
                toNode.disconnectFromParent(fromNode, toPos);
            }
            throw e;
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
    ): void {
        const fromNode: DagNode = this._getNodeFromId(fromNodeId);
        const toNode: DagNode = this._getNodeFromId(toNodeId);
        toNode.disconnectFromParent(fromNode, toPos);
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
                }
            });
        }
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
    public execute(nodeIds?: DagNodeId[]): XDPromise<void> {
        if (nodeIds == null) {
            return this._executeGraph();
        } else {
            // get subGraph from nodes and execute
            const nodesMap:  Map<DagNodeId, DagNode> = this._backTraverseNodes(nodeIds);
            return this._executeGraph(nodesMap);
        }
    }

    public getQuery(nodeId: DagNodeId): XDPromise<string> {
        const nodesMap:  Map<DagNodeId, DagNode> = this._backTraverseNodes([nodeId]);
        const orderedNodes: DagNode[] = this._topologicalSort(nodesMap);
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, this);
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
        return this.display.scale;
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
     * Locks the graph from modification.
     * Used primarily in execution.
     */
    public lockGraph(): void {
        $("#dagView .operatorBar").addClass("xc-disabled half-visible");
        $("#dagView .dataflowWrap").addClass("xc-disabled visible");
        $("#dagView #dagNodeMenu").addClass("xc-disabled visible");
        this.lock = true;
    }

    /**
     * Unlocks the graph for modification.
     */
    public unlockGraph(): void {
        $("#dagView .operatorBar").removeClass("xc-disabled half-visible");
        $("#dagView .dataflowWrap").removeClass("xc-disabled visible");
        $("#dagView #dagNodeMenu").removeClass("xc-disabled visible");
        this.lock = false;
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
    public resetRunningStates() {
        this.nodesMap.forEach((node) => {
            if (node.getState() == DagNodeState.Complete || node.getState() == DagNodeState.Error) {
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

    // XXX TODO, Idea is to do a topological sort first, then get the
    // ordere, then get the query, and run it one by one.
    private _executeGraph(nodesMap?: Map<DagNodeId, DagNode>): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const orderedNodes: DagNode[] = this._topologicalSort(nodesMap);
        const executor: DagGraphExecutor = new DagGraphExecutor(orderedNodes, this);
        const checkResult = executor.checkCanExecuteAll();
        if (checkResult.hasError) {
            return PromiseHelper.reject(checkResult);
        }

        this.lockGraph();
        executor.run()
        .then(() => {
            // console.log("finish running", orderedNodes);
            this.unlockGraph();
            deferred.resolve();
        })
        .fail((error) => {
            this.unlockGraph();
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

    private _backTraverseNodes(nodeIds: DagNodeId[]) {
        const nodesMap: Map<DagNodeId, DagNode> = new Map();
        let nodeStack: DagNode[] = nodeIds.map((nodeId) => this._getNodeFromId(nodeId));
        while (nodeStack.length > 0) {
            const node: DagNode = nodeStack.pop();
            if (node != null && !nodesMap.has(node.getId())) {
                nodesMap.set(node.getId(), node);
                const parents: any = node.getParents();
                nodeStack = nodeStack.concat(parents);
            }
        }
        return nodesMap;
    }

    private _topologicalSort(nodesMap?: Map<DagNodeId, DagNode>): DagNode[] {
        const orderedNodes: DagNode[] = [];
        const zeroInputNodes: DagNode[] = [];
        const nodeInputMap: Map<DagNodeId, number> = new Map();

        nodesMap = nodesMap || this.nodesMap;
        for (let [nodeId, node] of nodesMap) {
            const numParent = node.getNumParent();
            nodeInputMap.set(nodeId, numParent);
            if (numParent === 0) {
                zeroInputNodes.push(node);
            }
        }
        while (zeroInputNodes.length > 0) {
            const node: DagNode = zeroInputNodes.shift();
            nodeInputMap.delete(node.getId());
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
        if (nodeInputMap.size > 0) {
            throw new Error("Error Sort!");
        }

        return orderedNodes;
    }

    private _removeNode(node: DagNode, switchState: boolean = true): void {
        const parents: DagNode[] = node.getParents();
        const children: DagNode[] = node.getChildren();

        parents.forEach((parent) => {
            if (parent != null) {
                parent.disconnectFromChild(node);
            }
        });
        const descendents = [];
        const childIndices = {};
        children.forEach((child) => {
            const childId = child.getId();
            child.getParents().forEach((parent, index) => {
                if (parent === node) {
                    if (!childIndices[childId]) {
                        childIndices[childId] = [];
                    }
                    childIndices[childId].push(index);
                    child.disconnectFromParent(node, index);
                }
            });
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
                removeInfo: {childIndices: childIndices, node: node}
            });
        }
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
}