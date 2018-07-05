class DagGraph {
    private nodesMap: Map<DagNodeId, DagNode>;

    public constructor() {
        this.nodesMap = new Map();
    }

    // XXX TODO
    public restore(seralizedGraph: string): boolean {
        return true;
    }

    // XXX TODO
    public serialize(): string {
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
        return this.fakeDag();
    }

    public getNode(nodeId: DagNodeId): DagNode {
        return this.nodesMap.get(nodeId);
    }

    public addNode(nodeInfo: DagNodeInfo): DagNode {
        const dagNode: DagNode = new DagNode(nodeInfo);
        const id = dagNode.getId();
        this.nodesMap.set(id, dagNode);
        return dagNode;
    }

    // XXX TODO
    public removeNode(nodeIds: DagNodeId[]): boolean {
        return true;
    }

    // XXX TODO
    public moveNode(nodeId: DagNodeId, x: number, y: number): boolean {
        return true;
    }

    // XXX TODO
    public connect(
        fromNodeId: DagNodeId,
        toNodeId: DagNodeId,
        toPos?: number
    ): boolean {
        const fromNode: DagNode = this.nodesMap.get(fromNodeId);
        const toNode: DagNode = this.nodesMap.get(toNodeId);
        if (fromNode == null || toNode == null) {
            return false;
        }

        let connetedToParent = false;
        try {
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
        return true;
    }

    // XXX TODO
    public disconnect(fromNodeId: DagNodeId, toNodeId: DagNodeId): boolean {
        return true;
    }

    // XXX TODO
    public getSubGraph(nodeIds: DagNodeId[]): DagGraph {
        return new DagGraph();
    }

    // XXX TODO
    public addGraph(seralizedGraph: string): boolean {
        return true;
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
}