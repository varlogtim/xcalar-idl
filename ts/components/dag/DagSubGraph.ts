class DagSubGraph extends DagGraph {
    private startTime: number;
    private _nameIdMap;
    private _dagIdToTableNamesMap;// id to tableName map stores all the tables related to the dag node
    // in topological order
    private isComplete: boolean = false;
    private elapsedTime: number;
    private state: DgDagStateT;

    public constructor(nameIdMap?, dagIdToTableNamesMap?) {
        super();
        this.startTime = Date.now();
        this._nameIdMap = nameIdMap;
        this._dagIdToTableNamesMap = dagIdToTableNamesMap;
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
            const node = DagNodeFactory.create(nodeInfo, this.getRuntime());
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

    public setDagIdToTableNamesMap(dagIdToTableNamesMap) {
        this._dagIdToTableNamesMap = dagIdToTableNamesMap;
    }

    // should be called right before the xcalarQuery gets executed
    // sets the nodes to be in running state
    public startExecution(queryNodes, executor: DagGraphExecutor): void {
        this.currentExecutor = executor;
        this.startTime = Date.now();
        queryNodes.forEach((queryNode) => {
            let args;
            if (queryNode.args) {
                args = queryNode.args;
            } else {
                args = xcHelper.getXcalarInputFromNode(queryNode);
            }
            if (queryNode.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects] &&
                queryNode.api !== XcalarApisT.XcalarApiDeleteObjects) {
                let nodeId: DagNodeId = this._nameIdMap[args.dest];
                let node: DagNode = this.getNode(nodeId);
                if (node != null) { // could be a drop table node
                    node.beRunningState();
                }
            }
        });
    }

    public stopExecution(): void {
        this.currentExecutor = null;
    }

    /**
     * Should be called after nameIdMap is set but
     * before xcalarQuery gets executed.
     * Loop through all tables, update all tables in the node ids
     * then loop through all the tables
     */
    public initializeProgress(): void {
        const nodeIdToTableNamesMap = new Map();

        for (let tableName in this._nameIdMap) {
            const nodeId = this._nameIdMap[tableName];
            if (!nodeIdToTableNamesMap.has(nodeId)) {
                nodeIdToTableNamesMap.set(nodeId, [])
            }
            const nodeTableNames: string[] = nodeIdToTableNamesMap.get(nodeId);
            nodeTableNames.push(tableName);
        }
        nodeIdToTableNamesMap.forEach((tableNames, nodeId) => {
            let node: DagNode = this.getNode(nodeId);
            if (node != null) {
                node.initializeProgress(tableNames);
            }
        });
    }


    /**
     *
     * @param nodeInfos queryState info
    */
    public updateProgress(nodeInfos: any[]) {
        const nodeIdInfos = {};

        nodeInfos.forEach((nodeInfo) => {
            let tableName: string = nodeInfo.name.name;
            let nodeId = this._nameIdMap[tableName];

            // optimized datasets name gets prefixed with xcalarlrq and an id
            // so we strip this to find the corresponding UI dataset name
            if (!nodeId && nodeInfo.api === XcalarApisT.XcalarApiBulkLoad &&
                tableName.startsWith(".XcalarLRQ.") &&
                tableName.indexOf(gDSPrefix) > -1) {
                tableName = tableName.slice(tableName.indexOf(gDSPrefix));
                nodeId = this._nameIdMap[tableName];
            }

            if (!nodeId) {// could be a drop table node
                return;
            }
            if (!nodeIdInfos.hasOwnProperty(nodeId)) {
                nodeIdInfos[nodeId] = {}
            }
            const nodeIdInfo = nodeIdInfos[nodeId];
            nodeIdInfo[tableName] = nodeInfo;
            // _dagIdToTableNamesMap has operations in the correct order
            nodeInfo.index = this._dagIdToTableNamesMap[nodeId].indexOf(tableName);
        });

        for (let nodeId in nodeIdInfos) {
            let node: DagNode = this.getNode(nodeId);
            if (node != null) {
                node.updateProgress(nodeIdInfos[nodeId], true, true);
            }
        }
    }

    public getElapsedTime(): number {
        if (this.isComplete) {
            return this.elapsedTime;
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
            display: this.getDimensions(),
            operationTime: this.operationTime
        };
    }

    private _isNodeCopyInfo(nodeInfo: DagNodeInfo): nodeInfo is DagNodeCopyInfo {
        return (nodeInfo.id == null);
    }
}

if (typeof exports !== 'undefined') {
    exports.DagSubGraph = DagSubGraph;
}