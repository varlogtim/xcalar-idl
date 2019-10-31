abstract class DagTabProgress extends DagTab {
    public static readonly progressCheckInterval = 2000;
    protected _dagGraph: DagSubGraph;
    protected _isDoneExecuting: boolean;
    protected _isFocused: boolean;
    protected _isDeleted: boolean;
    protected _queryCheckId: number;
    protected _queryName: string;
    protected _hasQueryStateGraph: boolean;
    protected _inProgress: boolean; // will be true if tab is created when executeRetina
    // is called. If this flag is true, we don't stop checking progress until
    // executeRetina turns it off
    protected _state: string;

    constructor(options: {
        id: string,
        name: string
    }) {
        super(options);
        this._isDoneExecuting = false;
        this._isFocused = false;
        this._queryCheckId = 0;
        this._hasQueryStateGraph = false;
        this._inProgress = false;
        this._isDeleted = false;

        if (this._id.startsWith(DagTabOptimized.KEY)) {
            this._queryName = this._id;
        } else {
            this._queryName = this._name;
        }
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagSubGraph {
        return this._dagGraph;
    }

    /**
     * @returns string queryName
     */
    public getQueryName(): string {
        return this._queryName;
    }


    public abstract getPath(): string;

    /**
     * Do not save this Tab in the kvStore
     */
    public save(): XDPromise<void> {
        return PromiseHelper.resolve();
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
    public upload(): XDPromise<{tabUploaded: DagTab, alertOption: Alert.AlertOptions}> {
        return PromiseHelper.resolve();
    }

    // usually don't status check if done executing, but if restartStatusCheck
    // is true then it's because user refreshed dag list and wants an updated
    // graph
    public focus(restartStatusCheck?: boolean) {
        if (this._isFocused) {
            return;
        }
        this._isFocused = true;
        if (this._isDoneExecuting && !restartStatusCheck) {
            return;
        }
        if (restartStatusCheck) {
            this._isDoneExecuting = false;
            this._queryCheckId++;
            this._hasQueryStateGraph = false;
            this._inProgress = true;
            this._isDeleted = false;
        }
        this._statusCheck();
    }

    public unfocus() {
        this._queryCheckId++;
        this._isFocused = false;
    }

    public isFocused() {
        return this._isFocused;
    }

    protected _constructGraphFromQuery(queryNodes: any[]): DagSubGraph {
        const nameIdMap = {};
        const idToNamesMap = {};
        const retStruct = DagGraph.convertQueryToDataflowGraph(queryNodes);
        const nodeJsons = retStruct.dagInfoList;
        const nodeInfos = [];
        nodeJsons.forEach((nodeJson) => {
            idToNamesMap[nodeJson.id] = [];
            nameIdMap[nodeJson.table] = nodeJson.id;
            if (nodeJson.subGraphNodes) {
                // map the index nodes to the containing dagNodeId
                nodeJson.subGraphNodes.forEach((subGraphNodeJson) => {
                    nameIdMap[subGraphNodeJson.table] = nodeJson.id;
                    idToNamesMap[nodeJson.id].push(subGraphNodeJson.table);
                });
            }

            idToNamesMap[nodeJson.id].push(nodeJson.table);
            nodeInfos.push({
                node: DagNodeFactory.create(nodeJson),
                parents: nodeJson.parents
            });
        });
        const comments: CommentInfo[] = [];
        const graphInfo = {
            comments: comments,
            display: <Dimensions>{scale: 1},
            nodes: nodeInfos,
            operationTime: null
        };

        const graph: DagSubGraph = new DagSubGraph(retStruct.tableNewDagIdMap, retStruct.dagIdToTableNamesMap);
        graph.setNoTableDelete();
        graph.rebuildGraph(graphInfo);
        graph.initializeProgress();
        this._dagGraph = graph;
        const positionInfo = DagView.getAutoAlignPositions(this._dagGraph);
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

    private _statusCheck() {
        const checkId = this._queryCheckId;
        let numFails = 0;
        const self = this;

        // shorter timeout on the first call
        _statusCheckInterval(0);

        function _statusCheckInterval(checkTime): void {
            setTimeout(() => {
                if (checkId !== self._queryCheckId) {
                    return;
                }
                statusCheckHelper();
            }, checkTime);
        }

        function statusCheckHelper() {
            if (self._isDoneExecuting || !self._isFocused || self._isDeleted) {
                return; // query is finished or unfocused, no more checking
            }

            self._getAndUpdateStatuses(numFails >= 10)
            .always((ret) => {
                if (self._isDoneExecuting || !self._isFocused || self._isDeleted) {
                    return; // query is finished or unfocused, no more checking
                }
                let nextCheckTime = DagTabProgress.progressCheckInterval;
                if (ret && ret.status === StatusT.StatusQrQueryNotExist) {
                    numFails++;
                    nextCheckTime *= numFails;
                } else {
                    numFails = 0;
                }
                _statusCheckInterval(nextCheckTime);
            });
        }
    }



    protected _getAndUpdateStatuses(isLastTry?: boolean): XDPromise<any> {
        const deferred = PromiseHelper.deferred();

        const checkId = this._queryCheckId;
        XcalarQueryState(this._queryName)
        .then((queryStateOutput) => {
            this._state = QueryStateTStr[queryStateOutput.queryState];
            DagList.Instance.updateDagState(this._id);
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
                this._inProgress = false;
                DagViewManager.Instance.endOptimizedDFProgress(this._id, queryStateOutput);
                // set table for last node in optimized dataflow
                if (this instanceof DagTabOptimized) {
                    let sortedNodes = this._dagGraph.getSortedNodes();
                    let lastNode = sortedNodes[sortedNodes.length - 1];
                    if (!(lastNode instanceof DagNodeExport) && !lastNode.getTable()) {
                        let tableName = DagTabOptimized.getOutputTableName(this._queryName);
                        lastNode.setTable(tableName, true);
                    }
                }
                this._dagGraph.setExecutor(null);
                if (this._isFocused) {
                    DagTopBar.Instance.setState(this);
                }
            } else {
                if (!this._dagGraph.getExecutor()) {
                    this._dagGraph.setExecutor(new DagGraphExecutor(null, this._dagGraph, {
                        optimized: true,
                        hasProgressGraph: true,
                        queryName: this._queryName
                    }));
                    if (this._isFocused) {
                        DagTopBar.Instance.setState(this);
                    }
                }
                DagViewManager.Instance.updateProgressDataflow(this._id, queryStateOutput);
            }
            deferred.resolve();
        })
        .fail((error) => {
            if (!isLastTry && error && (error.status === StatusT.StatusQrQueryNotExist ||
                error.status === StatusT.StatusQrJobNonExist)) {
                // ok to fail if query doesn't exist yet
                deferred.resolve({status: StatusT.StatusQrQueryNotExist});
            } else {
                this._isDoneExecuting = true;
                this._dagGraph.stopExecution();
                if (this._isFocused) {
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
        DagViewManager.Instance.cleanupClosedTab(this._dagGraph);
        this._dagGraph = this._constructGraphFromQuery(queryStateOutput.queryGraph.node);
        this._dagGraph.startExecution(queryStateOutput.queryGraph.node, null);
        this.setGraph(this._dagGraph);
        this._trigger("rerender");
    }
}

if (typeof exports !== 'undefined') {
    exports.DagTabProgress = DagTabProgress;
}