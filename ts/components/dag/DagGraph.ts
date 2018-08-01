class DagGraph {
    private nodesMap: Map<DagNodeId, DagNode>;
    private removedNodesMap: Map<DagNodeId,{}>;
    private display: Dimensions;
    private innerEvents: object;
    public events: { on: Function, trigger: Function}; // example: dagGraph.events.on(DagNodeEvents.StateChange, console.log)

    public constructor() {
        this.nodesMap = new Map();
        this.removedNodesMap = new Map();
        this.display = {
            width: -1,
            height: -1
        };
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
        return JSON.stringify({
            nodes: nodes,
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
        let graphJSON: {nodes:string[], display: Dimensions} = null;
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
        return true;
    }

    private fakeDag(): object[] {
        // XXX Only Sample Code
        // ds1 -> filter1 -> join -> export1
        // ds2 -> filter2 /
        //          |
        //          -> export2
        //
        // ds3 -> filter3 -> export3

        const ds1: DagNode = DagNodeFactory.create({
            type: DagNodeType.Dataset,
        });
        this.addNode(ds1);
        const ds1Id: DagNodeId = ds1.getId();

        const ds2: DagNode = DagNodeFactory.create({
            type: DagNodeType.Dataset,
        });
        this.addNode(ds2);
        const ds2Id: DagNodeId = ds2.getId();

        const ds3: DagNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        this.addNode(ds3);
        const ds3Id: DagNodeId = ds3.getId();

        const filter1: DagNode = DagNodeFactory.create({
            type: DagNodeType.Filter
        });
        this.addNode(filter1);
        const filter1Id: DagNodeId = filter1.getId();

        const filter2: DagNode = DagNodeFactory.create({
            type: DagNodeType.Filter
        });
        this.addNode(filter2);
        const filter2Id: DagNodeId = filter2.getId();

        const filter3: DagNode = DagNodeFactory.create({
            type: DagNodeType.Filter
        });
        this.addNode(filter3);
        const filter3Id: DagNodeId = filter3.getId();

        const join: DagNode = DagNodeFactory.create({
            type: DagNodeType.Join
        });
        this.addNode(join);
        const joinId: DagNodeId = join.getId();

        this.connect(ds1Id, filter1Id);
        this.connect(ds2Id, filter2Id);
        this.connect(ds3Id, filter3Id);
        this.connect(filter1Id, joinId, 0);
        this.connect(filter2Id, joinId, 1);


        const exportNode1: DagNode = new DagNode({
            type: DagNodeType.Export
        });
        this.addNode(exportNode1)
        const exportNode2: DagNode = new DagNode({
            type: DagNodeType.Export
        });
        this.addNode(exportNode2);
        const exportNode3: DagNode = new DagNode({
            type: DagNodeType.Export
        });
        this.addNode(exportNode3);

        this.connect(joinId, exportNode1.getId());
        this.connect(filter2Id, exportNode2.getId());
        this.connect(filter3Id, exportNode3.getId());
        return [{endPoints: [exportNode1, exportNode2]}, {endPoints: [exportNode3]}];
    }

    // example: new DagGraph().fakeExecute("cheng.25132.gdelt", "prefix")
    public fakeExecute(dsName, prefix) {
        // XXX Only Sample Code
        // ds1 -> filter1

        const ds1: DagNodeDataset = <DagNodeDataset>DagNodeFactory.create({
            type: DagNodeType.Dataset,
        });
        this.addNode(ds1);
        const ds1Id: DagNodeId = ds1.getId();

        const filter1: DagNodeFilter = <DagNodeFilter>DagNodeFactory.create({
            type: DagNodeType.Filter
        });
        this.addNode(filter1);
        const filter1Id: DagNodeId = filter1.getId();

        this.connect(ds1Id, filter1Id);

        ds1.setParam({
            source: dsName,
            prefix: prefix
        });


        filter1.setParam({
            evalString: `eq(${prefix}::column0, 254487263)`
        });

        return this.executeNodes([filter1Id]);
    }

    // XXX TODO
    public construct(): object[] {
        console.warn("to be implemented!");
        return this.fakeDag();
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
        return node;
    }

    /**
     * copy a node, type, comment, and input get copied but child/parents do not
     * @param nodeId
     */
    public cloneNode(nodeId: DagNodeId): DagNode {
        const node: DagNode = this._getNodeFromId(nodeId);
        return this.newNode({
            type: node.getType(),
            input: xcHelper.deepCopy(node.getParam()),
            comment: node.getComment(), // XXX DO we want to clone comment or not?
        });
    }

    /**
     * add a new node
     * @param dagNode node to add
     */
    public addNode(dagNode: DagNode): void {
        this.nodesMap.set(dagNode.getId(), dagNode);
        dagNode.registerEvents(DagNodeEvents.StateChange, (changeInfo) => {
            this.events.trigger(DagNodeEvents.StateChange, changeInfo);
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
            this.connect(fromNodeId, toNodeId, toPos, allowCyclic);
        } catch (e) {
            canConnect = false;
        }
        if (canConnect) {
            this.disconnect(fromNodeId, toNodeId, toPos);
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
        allowCyclic?: boolean
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
                this.connect(edge.parentId, edge.childId, edge.pos)
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
        toPos: number = 0
    ): void {
        const fromNode: DagNode = this._getNodeFromId(fromNodeId);
        const toNode: DagNode = this._getNodeFromId(toNodeId);
        toNode.disconnectFromParent(fromNode, toPos);
        fromNode.disconnectFromChild(toNode);
    }

    // XXX TODO
    public getSubGraph(nodeIds: DagNodeId[]): DagGraph {
        return new DagGraph();
    }

    // XXX TODO
    public addSubGraph(seralizedGraph: string): boolean {
        return true;
    }

   /**
    * remove the whole graph
    */
    public remove(): void {
        const values: IterableIterator<DagNode> = this.nodesMap.values();
        for (let dagNode of values) {
            this._removeNode(dagNode);
        }
    }

    /**
     * exectue some nodes in graph
     * @param nodeIds nodes that need to execute
     * @returns {JQueryDeferred}
     */
    public executeNodes(nodeIds: DagNodeId[]): XDPromise<void> {
        // get subGraph from nodes and execute
        const subGraph: DagGraph = this._backTraverseNodes(nodeIds);
        return subGraph._executeGraph();
    }

    /**
     * execute the whole graph
     * @returns {JQueryDeferred}
     */
    public executeAll(): XDPromise<void> {
        return this._executeGraph();
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

    public getAllNodes(): Map<DagNodeId, DagNode> {
        return this.nodesMap;
    }

    /**
     * returns a topologically sorted array of dag nodes
     * @returns {DagNode[]}
     */
    public getSortedNodes(): DagNode[] {
        return this._topologicalSort();
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
    private _executeGraph(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const orderedNodes: DagNode[] = this._topologicalSort();

        const checkResult = this._checkCanExecuteAll(orderedNodes);
        if (checkResult["hasError"]) {
            return PromiseHelper.reject(checkResult);
        }

        const txId = Transaction.start({});

        const promises: XDPromise<void>[] = [];
        orderedNodes.forEach((node) => {
            if (node.getState() !== DagNodeState.Complete) {
                const dagExecute: DagExecute = new DagExecute(node, txId);
                promises.push(dagExecute.run.bind(dagExecute));
            }
        });

        PromiseHelper.chain(promises)
        .then(() => {
            console.log("finish running", orderedNodes);
            Transaction.done(txId, {});
            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _checkCanExecuteAll(orderedNodes: DagNode[]): object {
        let errorResult = {
            hasError: false
        };

        for (let i = 0; i < orderedNodes.length; i++) {
            let node: DagNode = orderedNodes[i];
            if (node.getState() !== DagNodeState.Configured &&
                node.getState() !== DagNodeState.Complete) {
                errorResult["hasError"] = true;
                errorResult["type"] = DagNodeErrorType.Unconfigured;
                errorResult["node"] = node;
                break;
            } else if (node.getNumParent() < node.getMinParents()) {
                // check if nodes do not have enough parents
                errorResult["hasError"] = true;
                errorResult["type"] = DagNodeErrorType.MissingSource;
                errorResult["node"] = node;
                break;
            }
        }

        if (errorResult.hasError) {
            return errorResult;
        }

        return errorResult;
    }

    private _backTraverseNodes(nodeIds: DagNodeId[]) {
        const subGraph: DagGraph = new DagGraph();
        let nodeStack: DagNode[] = nodeIds.map((nodeId) => this._getNodeFromId(nodeId));
        while (nodeStack.length > 0) {
            const node: DagNode = nodeStack.pop();
            if (node != null && !subGraph.hasNode(node.getId())) {
                subGraph.addNode(node);
                const parents: any = node.getParents();
                nodeStack = nodeStack.concat(parents);
            }
        }
        return subGraph;
    }

    private _topologicalSort(): DagNode[] {
        const orderedNodes: DagNode[] = [];
        const zeroInputNodes: DagNode[] = [];
        const nodeInputMap: Map<DagNodeId, number> = new Map();

        for (let [nodeId, node] of this.nodesMap) {
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
                    const numParent = nodeInputMap.get(childId) - 1;
                    nodeInputMap.set(childId, numParent);
                    if (numParent === 0) {
                        zeroInputNodes.push(childNode);
                    }
                }
            });
        }
        if (nodeInputMap.size > 0) {
            throw new Error("Error Sort!");
        }

        return orderedNodes;
    }

    private _removeNode(node: DagNode): void {
        const parents: DagNode[] = node.getParents();
        const children: DagNode[] = node.getChildren();

        parents.forEach((parent) => {
            if (parent != null) {
                parent.disconnectFromChild(node);
            }
        });

        // go through all the children and remove completed state
        // XXX we might want to change to error state instead of configured
        this._traverseChildren(node, removeCompleteState);

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
        });

        node.removeTable();
        removeCompleteState(node);
        this.removedNodesMap.set(node.getId(), {
            childIndices: childIndices,
            node: node
        });
        this.nodesMap.delete(node.getId());

        function removeCompleteState(node: DagNode) {
            if (node.getState() === DagNodeState.Complete) {
                node.beConfiguredState();
            }
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

    // traverses children and applies callback function to each node
    private _traverseChildren(node: DagNode, callback: Function) {
        let seen = {};
        recursiveTraverse(node);

        function recursiveTraverse(node) {
            const children: DagNode[] = node.getChildren();
            children.forEach((child: DagNode) => {
                const nodeId: DagNodeId = child.getId();
                if (seen[nodeId]) {
                    return;
                } else {
                    seen[nodeId] = true;
                }

                callback(child);
                recursiveTraverse(child);
            });
        }
    }
}