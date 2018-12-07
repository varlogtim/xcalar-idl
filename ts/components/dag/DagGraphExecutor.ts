class DagGraphExecutor {
    private _nodes: DagNode[];
    private _graph: DagGraph;
    private _retinaCheckInterval = 2000;
    private _executeInProgress = false;
    private _isOptimized: boolean;
    private _isOptimizedActiveSession: boolean;
    private _optimizedLinkOutNode: DagNodeDFOut;
    private _optimizedExportNodes: DagNodeExport[];
    private _isNoReplaceParam: boolean;
    private _currentTxId: number;
    private _isCanceld: boolean;

    public constructor(
        nodes: DagNode[],
        graph: DagGraph,
        options: {
            optimized?: boolean,
            noReplaceParam?: boolean
        } = {}
    ) {
        this._nodes = nodes;
        this._graph = graph;
        this._isOptimized = options.optimized || false;
        this._isNoReplaceParam = options.noReplaceParam || false;
        this._isCanceld = false;
    }

    public validateAll(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let validateResult = this.checkCanExecuteAll();

        if (!validateResult.hasError && this._isOptimized) {
            validateResult = this._checkDisjoint();
        }
        if (!validateResult.hasError && this._isOptimized) {
            validateResult = this._checkValidOptimizedDataflow();
        }

        return validateResult;
    }

    /**
     * Static check if the nodes to run are executable
     */
    public checkCanExecuteAll(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };

        for (let i = 0; i < this._nodes.length; i++) {
            let node: DagNode = this._nodes[i];
            if (node.getState() === DagNodeState.Unused) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.Unconfigured;
                errorResult.node = node;
                break;
            } else if (node.getNumParent() < node.getMinParents()) {
                // check if nodes do not have enough parents
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.MissingSource;
                errorResult.node = node;
                break;
            } else if (node.getType() === DagNodeType.DFIn) {
                const linkInNode: DagNodeDFIn = <DagNodeDFIn>node;
                const res = this._checkLinkInResult(linkInNode);
                if (res.hasError) {
                    errorResult = res;
                    break;
                }
                // check if the linked node has executed
                const linkoutNode: DagNodeDFOut = linkInNode.getLinkedNodeAndGraph().node;
                if (linkoutNode.shouldLinkAfterExecuition() &&
                    linkoutNode.getState() !== DagNodeState.Complete
                ) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.LinkOutNotExecute;
                    errorResult.node = node;
                    break;
                }
            } else if (node.getType() === DagNodeType.Dataset) {
                const error: DagNodeErrorType = this._validateDataset(<DagNodeDataset>node);
                if (error != null) {
                    errorResult.hasError = true;
                    errorResult.type = error;
                    errorResult.node = node;
                    break;
                }
            } else if (this._isOptimized && node.hasNoChildren()) {
                if (!node.isOutNode() ||
                    (node.getSubType() !== DagNodeSubType.ExportOptimized &&
                    node.getSubType() !== DagNodeSubType.DFOutOptimized)) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
                    errorResult.node = node;
                    break;
                }
            }
        }

        return errorResult;
    }

    // checks to see if dataflow is invalid due to export node + link out node
    // or multiple link out nodes and sets
    private _checkValidOptimizedDataflow(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };
        let numExportNodes = 0;
        let numLinkOutNodes = 0;
        let linkOutNode;
        let exportNodes = [];
        for (let i = 0; i < this._nodes.length; i++) {
            const node: DagNode = this._nodes[i];
            if (node.getType() === DagNodeType.Export) {
                exportNodes.push(node);
                numExportNodes++;
            }
            if (node.getType() === DagNodeType.DFOut) {
                numLinkOutNodes++;
                linkOutNode = node;
            }
            if (numLinkOutNodes > 0 && numExportNodes > 0) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.InvalidOptimizedOutNodeCombo;
                errorResult.node = node;
                break;
            }
            if (numLinkOutNodes > 1) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.InvalidOptimizedLinkOutCount;
                errorResult.node = node;
                break;
            }
        }
        if (!errorResult.hasError) {
            if (numLinkOutNodes === 1) {
                this._isOptimizedActiveSession = true;
                this._optimizedLinkOutNode = linkOutNode;
            } else {
                this._isOptimizedActiveSession = false;
                this._optimizedExportNodes = exportNodes;
            }
        }
        return errorResult;
    }

    // first traverses all the ancestors of the endNode and puts them into a tree
    // then traverses all the nodes left out and puts them into a new tree
    // while doing the traversing, if we encounter a node that already belongs to
    // another tree, we later combine the 2 trees into the first and delete the latter
    // if the result ends in more than 1 tree, we return an error
    private _checkDisjoint(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };
        const self = this;
        let count = 0;
        let treeIndex = count;
        const notSeen = {};
        const allSeen = {};
        const trees = {};
        let currentTree = {};
        this._nodes.forEach(node => {
            notSeen[node.getId()] = node;
        });
        const endNode = this._nodes[this._nodes.length - 1];
        currentTree[endNode.getId()] = true;
        // mark traversed nodes as seen
        createFirstTree();

        // for any notSeen nodes, traverse and they should intersect
        // seen nodes
        for (let i in notSeen) {
            count++;
            currentTree = {};
            treeIndex = count;
            const seen = {};
            const seenTreeIndexes = {};
            currentTree[notSeen[i].getId()] = true;
            const curNode = notSeen[i];

            this._graph.traverseParents(curNode, (parent) => {
                const id = parent.getId();
                delete notSeen[id];
                if (seen[id]) {
                    return false;
                } else {
                    if (allSeen[id] != null) {
                        seenTreeIndexes[allSeen[id]] = true;
                        treeIndex = Math.min(allSeen[id], treeIndex);
                    }
                    seen[id] = true;
                    currentTree[id] = true;
                }
            });
            allSeen[curNode.getId()] = treeIndex;
            delete notSeen[i];
            trees[count] = currentTree; // add to trees
            for (let i in currentTree) {
                allSeen[i] = treeIndex;
            }
            // if this tree is connected with another tree, combine them both
            // and delete the current tree
            if (treeIndex !== count) {
                trees[treeIndex] = $.extend(currentTree[treeIndex], currentTree);
                delete trees[count];
            }

            // go through other trees and connect them to other trees if they
            // qualify
            for (let i in seenTreeIndexes) {
                if (parseInt(i) === 0) {
                    continue;
                }
                const tree = trees[i];
                for (let j in tree) {
                    allSeen[j] = treeIndex;
                }
                if (parseInt(i) !== treeIndex) {
                    tree[treeIndex] = $.extend(tree[treeIndex], tree);
                    delete trees[i];
                }
            }
        }

        function createFirstTree() {
            self._graph.traverseParents(endNode, (parent) => {
                delete notSeen[parent.getId()];
                if (allSeen[parent.getId()] == null) {
                    currentTree[parent.getId()] = true;
                    allSeen[parent.getId()] = treeIndex;
                }
            });
            allSeen[endNode.getId()] = treeIndex;
            delete notSeen[endNode.getId()];
            trees[count] = currentTree;
        }

          // if there's more than 1 tree, return an error
        if (Object.keys(trees).length > 1) {
            return {hasError: true, type: DagNodeErrorType.Disjoint, node: endNode};
        } else {
            return errorResult;
        }
    }

    /**
     * Execute nodes
     */
    public run(): XDPromise<any> {
        const self: DagGraphExecutor = this;
        const deferred = PromiseHelper.deferred();

        if (this._isCanceld) {
            deferred.reject(DFTStr.Cancel);
        } else if (this._isOptimized) {
            this.getRetinaArgs()
            .then((retinaParams) => {
                if (this._isCanceld) {
                    return PromiseHelper.reject(DFTStr.Cancel);
                }
                return this._executeOptimizedDataflow(retinaParams);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            const nodes: DagNode[] = this._nodes.filter((node) => {
                return ((node.getState() !== DagNodeState.Complete) || (!DagTblManager.Instance.hasTable(node.getTable())));
            });
            //XXX TODO: Remove nodes that have had their table deleted but arent necessary for this execution
            const nodesToRun: {node: DagNode, executable: boolean}[] = nodes.map((node) => {
                return {
                    node: node,
                    executable: true
                }
            });

            const promises: XDDeferred<void>[] = [];
            for (let i = 0; i < nodesToRun.length; i++) {
                promises.push(this._stepExecute.bind(this, nodesToRun, i));
            }
            self._executeInProgress = true;
            PromiseHelper.chain(promises)
            .then((...args) => {
                self._executeInProgress = false;
                deferred.resolve(...args);
            })
            .fail((...args) => {
                self._executeInProgress = false;
                deferred.reject(...args);
            });
        }
        return deferred.promise();
    }

    // cancel execution
    public cancel(): void {
        this._isCanceld = true;
        QueryManager.cancelQuery(this._currentTxId);
        // XXX TODO, if it's optimized, need to call XcalarQueryCanel with retName
    }

    // returns a query string representing all the operations needed to run
    // the dataflow
    public getBatchQuery(): XDPromise<string> {
        // get rid of link of node to get the correct query and destTable
        const nodes: DagNode[] = this._nodes.filter((node) => {
            return node.getType() !== DagNodeType.DFOut;
        });
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const promises: XDDeferred<string>[] = [];
        const udfContext = this._getUDFContext();
        const simulateId: number = Transaction.start({
            operation: "Simulate",
            simulate: true,
            udfUserName: udfContext.udfUserName,
            udfSessionName: udfContext.udfSessionName
        });
        for (let i = 0; i < nodes.length; i++) {
            promises.push(this._batchExecute.bind(this, simulateId, nodes[i]));
        }

        PromiseHelper.chain(promises)
        .then((destTable) => {
            nodes.forEach((node) => {
                node.setTable(null); // these table are only fake names
            });

            let query: string = Transaction.done(simulateId, {
                noNotification: true,
                noSql: true,
                noCommit: true
            });
            try {
               if (!query.startsWith("[")) {
                    // when query is not in the form of JSON array
                    if (query.endsWith(",")) {
                        query = query.substring(0, query.length - 1);
                    }
                    query = "[" + query + "]";
                }
                deferred.resolve(query, destTable);
            } catch (e) {
                console.error(e);
                deferred.reject(e);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _stepExecute(
        nodesToRun: {node: DagNode, executable: boolean}[],
        index: number
    ): XDPromise<void> {
        if (nodesToRun[index] == null || !nodesToRun[index].executable) {
            return PromiseHelper.resolve();
        }
        if (this._isCanceld) {
            return PromiseHelper.reject(DFTStr.Cancel);
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const node: DagNode = nodesToRun[index].node;
        const tabId: string = this._graph.getTabId();
        const udfContext = this._getUDFContext();
        const txId: number = Transaction.start({
            operation: node.getType(),
            track: true,
            nodeId: node.getId(),
            tabId: tabId,
            udfUserName: udfContext.udfUserName,
            udfSessionName: udfContext.udfSessionName
        });
        this._currentTxId = txId;
        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId, tabId);
        dagNodeExecutor.run()
        .then((_destTable) => {
            Transaction.done(txId, {
                noSql: true,
            });
            return MemoryAlert.Instance.check();
        })
        .then(deferred.resolve)
        .fail((error) => {
            // remove all the children that depends on the failed node
            const set: Set<DagNode> = this._graph.traverseGetChildren(node);
            for (let i = index; i < nodesToRun.length; i++) {
                if (set.has(nodesToRun[i].node)) {
                    nodesToRun[i].executable = false;
                }
            }
            Transaction.fail(txId, {
                error: error,
                noAlert: true
            });
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _batchExecute(
        txId: number,
        node: DagNode
    ): XDPromise<string> {
        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId, this._graph.getTabId(), this._isNoReplaceParam);
        return dagNodeExecutor.run(this._isOptimized);
    }

    private _checkLinkInResult(node: DagNodeDFIn): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };
        try {
            const linkOutNodes = this._findRelatedLinkOutNodesInGraph(node);
            const visited: Set<DagNodeId> = new Set();
            linkOutNodes.forEach((linkOutNode) => {
                visited.add(linkOutNode.getId());
            });
            let stack: DagNode[] = [node];
            while (stack.length > 0) {
                const currentNode: DagNode = stack.pop();
                if (currentNode.getType() === DagNodeType.DFOut) {
                    if (visited.has(currentNode.getId())) {
                        errorResult.hasError = true;
                        errorResult.type = DagNodeErrorType.CycleInLink
                        errorResult.node = node;
                        break;
                    }
                } else {
                    stack = stack.concat(currentNode.getChildren());
                }
            }
        } catch (e) {
            errorResult.hasError = true;
            errorResult.type = e.message;
            errorResult.node = node;

        }

        return errorResult;
    }

    private _validateDataset(node: DagNodeDataset): DagNodeErrorType {
        try {
            const source: string = node.getDSName();
            if (typeof DS !== "undefined" && !DS.isAccessible(source)) {
                return DagNodeErrorType.NoAccessToSource;
            } else {
                return null;
            }
        } catch (e) {
            return e.message;
        }
    }

    /**
     * It's a recusive search to find the linked out nodes that assiciate with
     * the linked in node.
     * If the link out the node is in another graph, search that graph's source
     * to check if it reference any node from current graph.
     * @param node
     */
    private _findRelatedLinkOutNodesInGraph(node: DagNodeDFIn): DagNodeDFOut[] {
        const linkOutNodes: DagNodeDFOut[] = [];
        let stack: DagNodeDFIn[] = [node];

        while (stack.length > 0) {
            const currentNode: DagNodeDFIn = stack.pop();
            const res = currentNode.getLinkedNodeAndGraph();
            let graph: DagGraph = res.graph;
            let dfOutNode: DagNodeDFOut = res.node;
            if (graph === this._graph) {
                linkOutNodes.push(dfOutNode);
            } else {
                const dfInNodes: DagNodeDFIn[] = this._getLinkedInSourceFromLinkOutNode(dfOutNode);
                stack = stack.concat(dfInNodes);
            }
        }
        return linkOutNodes;
    }

    private _getLinkedInSourceFromLinkOutNode(node: DagNodeDFOut): DagNodeDFIn[] {
        const linkInNodes: DagNodeDFIn[] = [];
        const stack: DagNode[] = [node];
        while (stack.length > 0) {
            const currentNode: DagNode = stack.pop();
            if (currentNode.getType() === DagNodeType.DFIn) {
                linkInNodes.push(<DagNodeDFIn>currentNode);
            } else {
                currentNode.getParents().forEach((parentNode) => {
                    stack.push(parentNode);
                });
            }
        }
        return linkInNodes;
    }

    private _getUDFContext(): {
        udfUserName: string,
        udfSessionName: string
    } {
        const tabId: string = this._graph.getTabId();
        const tab: DagTab = DagList.Instance.getDagTabById(tabId);
        if (tab != null && tab instanceof DagTabPublished) {
            return tab.getUDFContext();
        } else {
            return {
                udfUserName: undefined,
                udfSessionName: undefined
            };
        }
    }

    public getRetinaArgs(): any {
        const deferred = PromiseHelper.deferred();
        const nodeIds: DagNodeId[] = this._nodes.map(node => node.getId());

        this._graph.getOptimizedQuery(nodeIds, this._isNoReplaceParam)
        .then((queryStr: string, destTable: string) => {
            // retina name will be the same as the graph/tab's ID
            const retinaName = DagTab.generateId();
            const retinaParameters = this._getImportRetinaParameters(retinaName, queryStr, destTable);
            deferred.resolve(retinaParameters);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _executeOptimizedDataflow(retinaParameters): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let outputTableName: string = "";
        // retina name will be the same as the graph/tab's ID
        let retinaName: string = retinaParameters.retinaName;
        let subGraph: DagSubGraph;
        const udfContext = this._getUDFContext();
        let txId: number = Transaction.start({
            operation: "optimized df",
            track: true,
            udfUserName: udfContext.udfUserName,
            udfSessionName: udfContext.udfSessionName
        });

        this._currentTxId = txId;
        this._createRetina(retinaParameters)
        .then((retina) => {
             // create tab and pass in nodes to store for progress updates
            const parentTabId: string = this._graph.getTabId();
            const parentTab: DagTab = DagTabManager.Instance.getTabById(parentTabId);
            // name will be {dataflowName} {linkOutName} optimized
            let dfOutName: string = this._isOptimizedActiveSession ?
                            this._optimizedLinkOutNode.getParam().name : "export";
            let tabName: string = parentTab.getName() + " " + dfOutName + " optimized";
            const tab: DagTabOptimized = DagTabManager.Instance.newOptimizedTab(retinaName,
                                                tabName, retina.query);
            subGraph = tab.getGraph();
            subGraph.startExecution(retina.query, this);
            outputTableName = this._isOptimizedActiveSession ?
                                "table_" + parentTabId + "_" +
                                this._optimizedLinkOutNode.getId() +
                                Authentication.getHashId() : "";

            this._executeInProgress = true;
            this._statusCheckInterval(retinaName, true);
            const udfContext = this._getUDFContext();
            return XcalarExecuteRetina(retinaName, [], {
                activeSession: this._isOptimizedActiveSession,
                newTableName: outputTableName,
                udfUserName: udfContext.udfUserName || userIdName,
                udfSessionName: udfContext.udfSessionName || sessionName
            });
        })
        .then((_res) => {
            this._executeInProgress = false;
            this._getAndUpdateRetinaStatuses(retinaName, true)
            .always(() => {
                deferred.resolve(outputTableName);
            });

            this._nodes.forEach((node) => {
                if (node.getType() === DagNodeType.DFOut ||
                    node.getType() === DagNodeType.Export) {
                    node.beCompleteState();
                }
            });

            if (this._isOptimizedActiveSession) {
                this._optimizedLinkOutNode.setTable(outputTableName);
                this._optimizedLinkOutNode.setRetina(retinaName);
                DagTblManager.Instance.addTable(outputTableName);
            } else {
                // arbitrarily storing retina in the last export nodeß
                this._optimizedExportNodes[this._optimizedExportNodes.length - 1].setRetina(retinaName);
            }

            Transaction.done(txId, {
                noNotification: true,
                noSql: true,
                noCommit: true
            });
        })
        .fail((error) => {
            if (txId != null) {
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.ProfileFailed,
                    "error": error,
                    "noAlert": true
                });
            }

            if (this._executeInProgress) {
                this._executeInProgress = false;
                this._getAndUpdateRetinaStatuses(retinaName, false)
                .always(() => {
                    XcalarDeleteRetina(retinaName);
                    deferred.reject(error);
                });
            } else {
                deferred.reject(error);
            }
        })
        .always(() => {
            if (subGraph != null) {
                subGraph.stopExecution();
            }
        });

        return deferred.promise();
    }

    private _getImportRetinaParameters(
        retinaName: string,
        queryStr: string,
        destTable: string
    ): {
        retinaName: string,
        retina: string,
        userName: string,
        sessionName: string
        destTables: {nodeId: DagNodeId, tableName: string}[]
    } {
        const operations = JSON.parse(queryStr);

        // create tablename and columns property in retina for each outnode
        const outNodes = this._nodes.filter((node) => {
            return node.getType() === DagNodeType.DFOut ||
                   node.getType() === DagNodeType.Export;
        });
        // XXX check for name conflict when creating headeralias
        const destInfo: {nodeId: DagNodeId, tableName: string}[] = [];
        const tables = outNodes.map((outNode) => {
            const columns = outNode.getParam().columns.map((col) => {
                if (typeof col === "string") { // export node
                    return {
                        columnName: col,
                        headerAlias: col
                    }
                } else { // df out node
                    return {
                        columnName: col.sourceName,
                        headerAlias: col.destName
                    }
                }

            });
            destInfo.push({
                nodeId: outNode.getId(),
                tableName: destTable
            });
            return {
                name: destTable,
                columns: columns
            };
        });

        const retina = JSON.stringify({
            tables: tables,
            query: JSON.stringify(operations)
        });
        const udfContext = this._getUDFContext();
        const uName = udfContext.udfUserName || userIdName;
        const sessName = udfContext.udfSessionName || sessionName;
        return {
            retinaName: retinaName,
            retina: retina,
            userName: uName,
            sessionName: sessName,
            destTables: destInfo
        }
    }

    private _createRetina(
        params: {
            retinaName: string,
            retina: string,
            userName: string,
            sessionName: string
        }
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();

        XcalarImportRetina(params.retinaName, true, null, params.retina, params.userName, params.sessionName)
        .then((_res) => {
            return XcalarGetRetinaJson(params.retinaName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _statusCheckInterval(retName: string, firstRun?: boolean): void {
        // shorter timeout on the first call
        let checkTime = firstRun ? 1000 : this._retinaCheckInterval;

        setTimeout(() => {
            if (!this._executeInProgress) {
                return; // retina is finished, no more checking
            }

            this._getAndUpdateRetinaStatuses(retName, false)
            .always((_ret) => {
                this._statusCheckInterval(retName, false);
            });

        }, checkTime);
    }

    private _getAndUpdateRetinaStatuses(
        retName: string,
        isComplete?: boolean
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();

        XcalarQueryState(retName)
        .then((queryStateOutput) => {
            if (isComplete) {
                DagView.endOptimizedDFProgress(retName, queryStateOutput);
            } else {
                DagView.updateOptimizedDFProgress(retName, queryStateOutput);
            }
            deferred.resolve(queryStateOutput);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}