class DagGraph {
    private static idCount: number = 0;
    private static idPrefix: string;

    private nodesMap: Map<DagNodeId, DagNode>;

    public static setIdPrefix(idPrefix: string): void {
        DagGraph.idPrefix = idPrefix;
    }

    public static generateId(): string {
        return "dag." + DagGraph.idPrefix + "." + new Date().getTime() + "." + (DagGraph.idCount++);
    }

    public constructor() {
        this.nodesMap = new Map();
    }

    // XXX TODO
    public restore(seralizedGraph: string): boolean {
        console.warn("to be implemented!");
        return true;
    }

    // XXX TODO
    public serialize(): string {
        console.warn("to be implemented!");
        return "";
    }

    private fakeDag(): object[] {
        // XXX Only Sample Code
        // ds1 -> filter1 -> join -> export1
        // ds2 -> filter2 /
        //          |
        //          -> export2
        //
        // ds3 -> filter3 -> export3

        const ds1: DagNode = this.addNode({
            type: DagNodeType.Dataset,
        });
        const ds1Id: DagNodeId = ds1.getId();

        const ds2: DagNode = this.addNode({
            type: DagNodeType.Dataset,
        });
        const ds2Id: DagNodeId = ds2.getId();

        const ds3: DagNode = this.addNode({
            type: DagNodeType.Dataset
        });
        const ds3Id: DagNodeId = ds3.getId();

        const filter1: DagNode = this.addNode({
            type: DagNodeType.Filter
        });
        const filter1Id: DagNodeId = filter1.getId();
    
        const filter2: DagNode = this.addNode({
            type: DagNodeType.Filter
        });
        const filter2Id: DagNodeId = filter2.getId();

        const filter3: DagNode = this.addNode({
            type: DagNodeType.Filter
        });
        const filter3Id: DagNodeId = filter3.getId();

        const join: DagNode = this.addNode({
            type: DagNodeType.Join
        });
        const joinId: DagNodeId = join.getId();

        this.connect(ds1Id, filter1Id);
        this.connect(ds2Id, filter2Id);
        this.connect(ds3Id, filter3Id);
        this.connect(filter1Id, joinId, 0);
        this.connect(filter2Id, joinId, 1);


        const exportNode1: DagNode = this.addNode({
            type: DagNodeType.Export
        });
        const exportNode2: DagNode = this.addNode({
            type: DagNodeType.Export
        });
        const exportNode3: DagNode = this.addNode({
            type: DagNodeType.Export
        });

        this.connect(joinId, exportNode1.getId());
        this.connect(filter2Id, exportNode2.getId());
        this.connect(filter3Id, exportNode3.getId());
        return [{endPoints: [exportNode1, exportNode2]}, {endPoints: [exportNode3]}];
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
     * add a new node
     * @param nodeInfo node info
     * @returns {DagNode} the created node
     */
    public addNode(nodeInfo: DagNodeInfo): DagNode {
        const id: string = this._generateNodeId();
        nodeInfo.id = id;
        return this._newNode(nodeInfo);
    }

    /**
     * remove a node
     * @param nodeId node's id
     */
    public removeNode(nodeId: DagNode): void {
        const node: DagNode = this._getNodeFromId(nodeId);
        return this._removeNode(node);
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
     * connect two nodes
     * @param fromNodeId parent node
     * @param toNodeId child node
     * @param toPos 0 based position of the  child node's input
     */
    public connect(
        fromNodeId: DagNodeId,
        toNodeId: DagNodeId,
        toPos: number = 0
    ): void {
        let connetedToParent = false;
        let toNode: DagNode;
        try {
            const fromNode: DagNode = this._getNodeFromId(fromNodeId);
            toNode = this._getNodeFromId(toNodeId);
            toNode.connectToParent(fromNode, toPos);
            connetedToParent = true;
            fromNode.connectToChidren(toNode);
        } catch (e) {
            if (connetedToParent) {
                // error handler
                toNode.disconnectFromParent(toPos);
            }
            throw e;
        }
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
        fromNode.disconnectFromChildren(toNode);
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

    // XXX TODO
    public executeToNode(nodeId: DagNodeId): XDPromise<void> {
        // get the subGraph from sroucje to the node and execute
        const subGraph: DagGraph = new DagGraph();
        return subGraph.executeGraph(null);
    }

    // XXX TODO
    public executeNodes(nodeIds: DagNodeId[]): XDPromise<void> {
        // get subGraph from nodes and execute
        const subGraph: DagGraph = this.getSubGraph(nodeIds);
        return subGraph.executeGraph(null);
    }

    public executeAll(): XDPromise<void> {
        return this.executeGraph(this);
    }

    // XXX TODO, Idea is to do a topological sort first, then get the
    // ordere, then get the query, and run it one by one.
    private executeGraph(graph: DagGraph): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    private _newNode(nodeInfo: DagNodeInfo): DagNode {
        const dagNode: DagNode = new DagNode(nodeInfo);
        this.nodesMap.set(dagNode.getId(), dagNode);
        return dagNode;
    }

    private _removeNode(node: DagNode): void {
        const parents: DagNode[] = node.getParents();
        const children: DagNode[] = node.getChildren();

        parents.forEach((parent) => {
            if (parent != null) {
                parent.disconnectFromChildren(node);
            }
        });

        children.forEach((child) => {
            child.getParents().forEach((parent, index) => {
                if (parent === node) {
                    child.disconnectFromParent(node, index);
                }
            });
        });

        node.clearTable();
        this.nodesMap.delete(node.getId());
    }

    private _generateNodeId(): string {
        let idGen = () => "dag." + DagGraph.generateId();

        const tryCnt: number = 10000;
        let id: string = idGen();
        let cnt: number = 0;
        while (this.nodesMap.has(id) && cnt <= tryCnt) {
            id = idGen();
            cnt++;
        }
        if (cnt > tryCnt) {
            console.warn("too may tries");
            id += Math.round(Math.random() * 10000) + 1;
        }
        return id;
    }

    private _getNodeFromId(nodeId): DagNode {
        const node: DagNode = this.nodesMap.get(nodeId);
        if (node == null) {
            throw new Error("Dag Node " + nodeId + " not exists");
        }
        return node;
    }
}