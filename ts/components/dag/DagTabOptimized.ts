class DagTabOptimized extends DagTab {
    public static readonly PATH = "Optimized Dataflows/";
    public static readonly retinaCheckInterval = 2000;
    private graph: DagSubGraph;
    private _isDoneExecuting: boolean;
    private _isActive: boolean;
    private _isDeleted: boolean;
    private _queryCheckId: number;
    private _retinaName: string;
    private _hasQueryStateGraph: boolean;
    private _executor: DagGraphExecutor;

    constructor(options: {
        id: string,
        name: string,
        queryNodes?: any[],
        executor?: DagGraphExecutor
    }) {
        const {id, name, queryNodes, executor} = options;
        super(name, id, null);
        this._isDoneExecuting = false;
        this._isActive = false;
        this._queryCheckId = 0;
        this._hasQueryStateGraph = false;
        if (queryNodes) {
            const graph = this._constructGraphFromQuery(queryNodes);
            graph.startExecution(queryNodes, executor);
            this._executor = executor;
        }
        if (this._id.startsWith(gRetinaPrefix)) {
            this._retinaName = this._id;
        } else {
            this._retinaName = this._name;
        }
    }

    public setName(newName: string): void {
        super.setName(newName);
    }

    public getPath(): string {
        return DagTabOptimized.PATH + this.getName();
    }

    /**
     * Saves this Tab in the kvStore
     */
    public save(): XDPromise<void> {
        return PromiseHelper.resolve();
    }
    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagSubGraph {
        return this.graph;
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._isDoneExecuting = false;

        XcalarGetRetinaJson(this._retinaName)
        .then((retina) => {
            this.graph = this._constructGraphFromQuery(retina.query);
            this.graph.startExecution(retina.query, null);
            this.setGraph(this.graph);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // do nothing
    public discardUnsavedChange(): XDPromise<void> {
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

    public focus() {
        if (this._isActive) {
            return;
        }
        this._isActive = true;
        if (this._isDoneExecuting) {
            return;
        }

        this._statusCheckInterval(true);
    }

    public unfocus() {
        this._isActive = false;
        this._queryCheckId++;
    }

    public delete(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        this._isDoneExecuting = false;
        this._isActive = false;
        this._isDeleted = true;
        this._queryCheckId++;

        XcalarDeleteRetina(this._retinaName)
        .then(deferred.resolve)
        .fail((error) => {
            this._isDeleted = false;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public isInProgress(): boolean {
        return !this._isDoneExecuting;
    }

    private _constructGraphFromQuery(queryNodes): DagSubGraph {
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

        return graph;
    }

    private _statusCheckInterval(firstRun?: boolean): void {
        // shorter timeout on the first call
        let checkTime = firstRun ? 0 : DagTabOptimized.retinaCheckInterval;
        const checkId = this._queryCheckId
        setTimeout(() => {
            if (this._isDoneExecuting || !this._isActive || this._isDeleted ||
                checkId !== this._queryCheckId) {
                return; // retina is finished or unfocused, no more checking
            }

            this._getAndUpdateRetinaStatuses(firstRun)
            .always((_ret) => {
                if (this._isDoneExecuting || !this._isActive || this._isDeleted) {
                    return; // retina is finished or unfocused, no more checking
                }

                this._statusCheckInterval();
            });

        }, checkTime);
    }

    private _getAndUpdateRetinaStatuses(firstRun?: boolean): XDPromise<any> {
        const deferred = PromiseHelper.deferred();

        const checkId = this._queryCheckId;
        XcalarQueryState(this._retinaName)
        .then((queryStateOutput) => {
            if (this._isDeleted) {
                return deferred.reject();
            }
            if (!this._hasQueryStateGraph) {
                // change the graph from the xcalarGetRetina graph to the
                // xcalarQueryState graph
                this._hasQueryStateGraph = true;
                this._rerenderQueryStateGraph(queryStateOutput);
            }
            if (checkId !== this._queryCheckId) {
                return deferred.reject();
            }
            this._isDoneExecuting = queryStateOutput.queryState !== QueryStateT.qrProcessing;
            if (this._isDoneExecuting) {
                DagView.endOptimizedDFProgress(this._id, queryStateOutput);
                this.graph.setExecutor(null);
                if (this._isActive) {
                    DagTopBar.Instance.setState(this);
                }
            } else {
                if (!this.graph.getExecutor()) {
                    this.graph.setExecutor(new DagGraphExecutor(null, this.graph, {
                        optimized: true,
                        retinaName: this._retinaName
                    }));
                    if (this._isActive) {
                        DagTopBar.Instance.setState(this);
                    }
                }
                DagView.updateOptimizedDFProgress(this._id, queryStateOutput);
            }
            deferred.resolve(queryStateOutput);
        })
        .fail((error) => {
            if (firstRun) {
                // ok to fail on the first time if query doesn't exist yet
                deferred.resolve();
            } else {
                this._isDoneExecuting = true;
                this.graph.stopExecution();
                if (this._isActive) {
                    DagTopBar.Instance.setState(this);
                }
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    // change the graph from the xcalarGetRetina graph to the
    // xcalarQueryState graph
    private _rerenderQueryStateGraph(queryStateOutput) {
        DagView.cleanupClosedTab(this.graph);
        this.graph = this._constructGraphFromQuery(queryStateOutput.queryGraph.node);
        this.graph.startExecution(queryStateOutput.queryGraph.node, null);
        this.setGraph(this.graph);
        this._trigger("rerender");
    }
}