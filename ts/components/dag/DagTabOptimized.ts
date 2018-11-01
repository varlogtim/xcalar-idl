class DagTabOptimized extends DagTab {
    private graph;

    constructor(options: {
        id: string,
        name: string,
        queryNodes: any[],
    }) {
        const { id, name, queryNodes } = options;
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
    public getGraph(): DagOptimizedGraph {
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

    private _constructGraphFromQuery(queryNodes) {
        const nameIdMap = {};
        const retStruct = DagGraph.convertQueryToDataflowGraph(queryNodes);
        const nodeJsons = retStruct.dagInfoList;
        const nodeInfos = [];
        nodeJsons.forEach((nodeJson) => {
            nameIdMap[nodeJson.table] = nodeJson.id;
            if (nodeJson.indexParents) {
                // map the index nodes to the containing dagNodeId
                nodeJson.indexParents.forEach((indexNodeJson) => {
                    nameIdMap[indexNodeJson.table] = nodeJson.id;
                });
            }
            nodeInfos.push({
                node: DagNodeFactory.create(nodeJson),
                parents: nodeJson.parents
            });
        });
        const graphInfo = {
            comments: <string[]>[],
            display: <Dimensions>{},
            nodes: nodeInfos
        };

        const graph: DagOptimizedGraph = new DagOptimizedGraph(nameIdMap);
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
        graph.setDimensions(positionInfo.maxX + DagView.horzPadding,
                            positionInfo.maxY + DagView.vertPadding);
    }
}