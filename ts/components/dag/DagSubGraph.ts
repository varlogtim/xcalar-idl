class DagSubGraph extends DagGraph {
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