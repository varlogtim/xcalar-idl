class DagTabOptimized extends DagTab {
    private graph;

    constructor(options: {
        id: string,
        name: string,
        queryNodes: any[],
    }) {
        const {id, name, queryNodes } = options;
        super(name, id, null);
        this._constructGraphFromQuery(queryNodes);
    }

    /**
     * Saves this Tab in the kvStore
     */
    public save(): XDPromise<void> {
        return DagTabManager.Instance.saveParentTab(this.getId());
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagSubGraph {
        return this.graph;
    }

    // do nothing
    public discardUnsavedChange(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public load(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public delete(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public download(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public upload(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    private _constructGraphFromQuery(queryNodes) {
        const nameIdMap = {};
        const retStruct = DagGraph.convertQueryToDataflowGraph(queryNodes);
        const nodeJsons = retStruct.dagInfoList;
        const nodeInfos = [];
        nodeJsons.forEach((nodeJson) => {
            nameIdMap[nodeJson.table] = nodeJson.id;
            if (nodeJson.subGraphNodes) {
                // map the index nodes to the containing dagNodeId
                nodeJson.subGraphNodes.forEach((subGraphNodeJson) => {
                    nameIdMap[subGraphNodeJson.table] = nodeJson.id;
                });
            }
            nodeInfos.push({
                node: DagNodeFactory.create(nodeJson),
                parents: nodeJson.parents
            });
        });
        const comments: CommentInfo[] = [];
        const graphInfo = {
            comments: comments,
            display: <Dimensions>{scale: 1},
            nodes: nodeInfos
        };

        const graph: DagSubGraph = new DagSubGraph(nameIdMap);
        graph.rebuildGraph(graphInfo);
        graph.initializeProgress();
        this.graph = graph;
        const positionInfo = DagView.getAutoAlignPositions(this.graph);
        positionInfo.nodeInfos.forEach((nodeInfo) => {
            graph.moveNode(nodeInfo.id, {
                x: nodeInfo.position.x + 100,
                y: nodeInfo.position.y + 100,
            });
        });
        graph.setDimensions(positionInfo.maxX + DagView.horzPadding + 100,
                            positionInfo.maxY + DagView.vertPadding + 100);

    }
}