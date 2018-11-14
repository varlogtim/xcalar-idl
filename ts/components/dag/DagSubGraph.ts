class DagSubGraph extends DagGraph {
    private startTime: number;
    private _nameIdMap;
    private isComplete: boolean = false;
    private elapsedTime: number;
    private state: DgDagStateT;

    public constructor(nameIdMap?) {
        super();
        this.startTime = Date.now();
        this._nameIdMap = nameIdMap;
    }
    /**
     * Get the JSON representing the graph(without all the ids), for copying a graph
     */
    public getGraphCopyInfo(): DagGraphInfo {
        return this._getGraphJSON(true);
    }

    /**
     * Get the JSON representing the graph, for cloning/serializing a graph
     */
    public getGraphInfo(): DagGraphInfo {
        return this._getGraphJSON(false);
    }

    /**
     * Initialize the graph from JSON
     * @param graphInfo
     * @description This method supports both JSON w/ or w/o ids
     */
    public initFromJSON(graphInfo: DagGraphInfo): Map<string, DagNodeId> {
        if (graphInfo == null) {
            return null;
        }

        // Create & Add dag nodes
        const connections: NodeConnection[] = [];
        const nodeIdMap = new Map<string, DagNodeId>();
        graphInfo.nodes.forEach((nodeInfo) => {
            // Create dag node
            const node = DagNodeFactory.create(nodeInfo);
            if (this._isNodeCopyInfo(nodeInfo)) {
                nodeIdMap.set(nodeInfo.nodeId, node.getId());
            }
            // Figure out connections
            const childId = node.getId();
            nodeInfo['parents'].forEach((parentId: DagNodeId, i) => {
                connections.push({
                    parentId: parentId, childId: childId, pos: i
                });
            });
            // Add node to graph
            this.addNode(node);
        })

        // Update the node ids in the connection
        let newConnections: NodeConnection[] = [];
        if (nodeIdMap.size > 0) {
            for (const oldConnection of connections) {
                newConnections.push({
                    parentId: nodeIdMap.has(oldConnection.parentId)
                        ? nodeIdMap.get(oldConnection.parentId)
                        : oldConnection.parentId,
                    childId: nodeIdMap.has(oldConnection.childId)
                        ? nodeIdMap.get(oldConnection.childId)
                        : oldConnection.childId,
                    pos: oldConnection.pos
                });
            }
        } else {
            newConnections = connections;
        }

        // Cleanup the connections whose node is not in the graph
        for (const connection of newConnections) {
            if (!this.hasNode(connection.parentId)) {
                connection.parentId = null;
            }
            if (!this.hasNode(connection.childId)) {
                connection.childId = null;
            }
        }

        // restore edges
        this.restoreConnections(newConnections);

        // XXX TODO: create comments

        // Set graph dimensions
        this.setDimensions(graphInfo.display.width, graphInfo.display.height);

        return nodeIdMap;
    }

    public setTableDagIdMap(nameIdMap) {
        this._nameIdMap = nameIdMap;
    }

    // should be called right before the xcalarQuery gets executed
    public startExecution(queryNodes): void {
        this.startTime = Date.now();
        queryNodes.forEach((queryNode) => {
            const nodeId = this._nameIdMap[queryNode.args.dest];
            if (nodeId) { // could be a drop table node
                this.getNode(nodeId).beRunningState();
            }
        });
    }

    // should be called after nameIdMap is set but
    // before xcalarQuery gets executed
    // loop through all tables, update all tables in the node ids
    // then loop through all the tables
    public initializeProgress() {
        const nodeIdToTableNamesMap = new Map();

        for (let tableName in this._nameIdMap) {
            const nodeId = this._nameIdMap[tableName];
            if (!nodeIdToTableNamesMap.has(nodeId)) {
                nodeIdToTableNamesMap.set(nodeId, [])
            }
            const tableNames: string[] = nodeIdToTableNamesMap.get(nodeId);
            tableNames.push(tableName);
        }
        nodeIdToTableNamesMap.forEach((tableNames, nodeId) => {
            this.getNode(nodeId).initializeProgress(tableNames);
        });
    }

    public updateProgress(nodeInfos) {
        const nodeIdInfos = {};

        nodeInfos.forEach((nodeInfo) => {
            const tableName = nodeInfo.name.name;
            const nodeId = this._nameIdMap[tableName];
            if (!nodeId) {// could be a drop table node
                return;
            }
            if (!nodeIdInfos.hasOwnProperty(nodeId)) {
                nodeIdInfos[nodeId] = {}
            }
            const nodeIdInfo = nodeIdInfos[nodeId];
            nodeIdInfo[tableName] = nodeInfo;
        });

        for (let nodeId in nodeIdInfos) {
            this.getNode(nodeId).updateProgress(nodeIdInfos[nodeId]);
        }
    }

    public getElapsedTime(): number {
        if (this.isComplete) {
            this.elapsedTime;
        } else {
            return Date.now() - this.startTime;
        }
    }

    public endProgress(state, time) {
        this.elapsedTime = time;
        this.isComplete = true;
        this.state = state;
    }

    private _getGraphJSON(
        isCopyInfo: boolean = false
    ): DagGraphInfo {
        const nodes: DagNodeInfo[] = [];
        this.getAllNodes().forEach((node: DagNode, _key: DagNodeId) => {
            nodes.push(isCopyInfo ? node.getNodeCopyInfo() : node.getNodeInfo());
        });
        // XXX TODO: comment.getInfo()
        return {
            nodes: nodes,
            comments: [],
            display: this.getDimensions()
        };
    }

    private _isNodeCopyInfo(nodeInfo: DagNodeInfo): nodeInfo is DagNodeCopyInfo {
        return (nodeInfo.id == null);
    }
}