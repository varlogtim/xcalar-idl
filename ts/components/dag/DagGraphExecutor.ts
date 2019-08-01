class DagGraphExecutor {
    private _nodes: DagNode[];
    private _graph: DagGraph;
    private _optimizedExecuteInProgress = false;
    private _isOptimized: boolean;
    private _isOptimizedActiveSession: boolean;
    private _allowNonOptimizedOut: boolean;
    private _optimizedLinkOutNode: DagNodeDFOut;
    private _optimizedExportNodes: DagNodeExport[];
    private _isNoReplaceParam: boolean;
    private _currentTxId: number;
    private _isCanceled: boolean;
    private _queryName: string; // for retinas
    private _parentTxId: number;
    private _sqlNodes: Map<string, DagNodeSQL>;
    private _hasProgressGraph: boolean; // has a separate graph in different tab
    private _dagIdToDestTableMap: Map<DagNodeId, string>;
    private _currentNode: DagNode; // current node in progress if stepExecute
    private _finishedNodeIds: Set<DagNodeId>;
    private _isRestoredExecution: boolean; // if restored after browser refresh
    private _internalAggNames: Set<string>; // aggs created in this graph.

    public static readonly stepThroughTypes = new Set([DagNodeType.PublishIMD,
        DagNodeType.IMDTable, DagNodeType.UpdateIMD, DagNodeType.Extension,
        DagNodeType.Custom, DagNodeType.CustomInput, DagNodeType.CustomOutput]);

    public constructor(
        nodes: DagNode[],
        graph: DagGraph,
        options: {
            optimized?: boolean,
            noReplaceParam?: boolean,
            queryName?: string,
            parentTxId?: number,
            allowNonOptimizedOut?: boolean,
            sqlNodes?: Map<string, DagNodeSQL>,
            hasProgressGraph?: boolean,
            isRestoredExecution?: boolean
        } = {}
    ) {
        this._nodes = nodes;
        this._graph = graph;
        this._isOptimized = options.optimized || false;
        this._allowNonOptimizedOut = options.allowNonOptimizedOut || false;
        this._isNoReplaceParam = options.noReplaceParam || false;
        this._isCanceled = false;
        this._queryName = options.queryName;
        this._parentTxId = options.parentTxId;
        this._sqlNodes = options.sqlNodes;
        this._hasProgressGraph = this._isOptimized || options.hasProgressGraph;
        this._dagIdToDestTableMap = new Map();
        this._finishedNodeIds = new Set();
        this._isRestoredExecution = options.isRestoredExecution || false;
        this._internalAggNames = new Set();
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
            if (node == null) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.NoNode;
                break;
            }
            if (node.getType() === DagNodeType.CustomInput) {
                continue;
            }
            let aggs = node.getAggregates();
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
                if (linkInNode.hasSource()) {
                    // skip check if has source
                    break;
                }
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
                } else if (this._isOptimized && node.hasNoChildren()) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
                    errorResult.node = node;
                }
            } else if (node.getType() === DagNodeType.Dataset) {
                const error: DagNodeErrorType = this._validateDataset(<DagNodeDataset>node);
                if (error != null) {
                    errorResult.hasError = true;
                    errorResult.type = error;
                    errorResult.node = node;
                    break;
                } else if (this._isOptimized && node.hasNoChildren()) {
                    // if this is just a dataset node, we need to error
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
                    errorResult.node = node;
                }
            } else if (this._isOptimized && node.hasNoChildren()) {
                if (!node.isOutNode() ||
                    (node.getSubType() !== DagNodeSubType.ExportOptimized &&
                    node.getSubType() !== DagNodeSubType.DFOutOptimized &&
                    node.getType() !== DagNodeType.CustomOutput &&
                    node.getType() !== DagNodeType.Aggregate) &&
                    !this._allowNonOptimizedOut
                ) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
                    errorResult.node = node;
                    break;
                }
            } else if (aggs.length > 0) {
                const error: DagNodeErrorType = this._validateAggregates(aggs);
                if (error != null) {
                    errorResult.hasError = true;
                    errorResult.type = error;
                    errorResult.node = node;
                    break;
                }
            }
        }

        return errorResult;
    }

    private _validateAggregates(aggs: string[]): DagNodeErrorType {
        for(let i = 0; i < aggs.length; i++) {
            let agg: string = aggs[i];
            let aggNode: DagNodeAggregate =
                <DagNodeAggregate>this._nodes.find((node) => {return node.getParam().dest == agg})
            if (aggNode == null) {
                let aggInfo = DagAggManager.Instance.getAgg(agg);
                if (aggInfo && aggInfo.value != null) {
                    // It has a value, we're alright.
                    continue
                }
                return DagNodeErrorType.NoAggNode;
            }
        }
        return null;
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
        let linkOutNode: DagNodeDFOut;
        let exportNodes: DagNodeExport[] = [];
        let exportNodesSources = new Set();
        for (let i = 0; i < this._nodes.length; i++) {
            const node: DagNode = this._nodes[i];
            if (node.getType() === DagNodeType.Export) {
                exportNodes.push(<DagNodeExport>node);
                let sourceId = node.getParents()[0].getId();
                if (exportNodesSources.has(sourceId)) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedDuplicateExport;
                    errorResult.node = node;
                    break;
                } else {
                    exportNodesSources.add(sourceId);
                }
                numExportNodes++;
            }
            if (node.getType() === DagNodeType.DFOut) {
                numLinkOutNodes++;
                linkOutNode = <DagNodeDFOut>node;
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
            } else if (numLinkOutNodes === 0 && numExportNodes === 0) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
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
        let aggregateNodes: Set<DagNodeAggregate> = new Set();
        let nodes: Map<DagNodeId, DagNode> = new Map();
        // 1. add all nodes to nodes map, add aggregate nodes to it's own set
        this._nodes.forEach(node => {
            nodes.set(node.getId(), node);
            if (node instanceof DagNodeAggregate) {
                aggregateNodes.add(node);
            }
        });
        // 2. remove all aggregate nodes and their parents from the nodes map
        // so we can ignore these nodes when checking for disjoint dataflows
        aggregateNodes.forEach((node) => {
            nodes.delete(node.getId());
            self._graph.traverseParents(node, (parentNode)=> {
                nodes.delete(parentNode.getId());
            });
        })
        nodes.forEach(node => {
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

        if (this._isCanceled) {
            deferred.reject(DFTStr.Cancel);
        } else if (this._isOptimized) {
            this.getRetinaArgs()
            .then((retinaParams) => {
                if (this._isCanceled) {
                    return PromiseHelper.reject(DFTStr.Cancel);
                }
                return this._executeOptimizedDataflow(retinaParams);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            const nodes: DagNode[] = this._nodes.filter((node) => {
                if (node instanceof DagNodePublishIMD && node.getState() === DagNodeState.Complete) {
                    return !PTblManager.Instance.hasTable(node.getParam(true).pubTableName);
                }
                return (node.getState() !== DagNodeState.Complete || !DagTblManager.Instance.hasTable(node.getTable()));
            });

            if (nodes.length === 0 && this._nodes.length !== 0) {
                return PromiseHelper.reject(DFTStr.AllExecuted);
            }
            let nodeIds = nodes.map(node => node.getId());

            let operation = "Dataflow execution";
            let queryMeta: string = null;
            if (nodes.length === 1) {
                operation = nodes[0].getType();
                if (nodes[0] instanceof DagNodeSQL) {
                    let node = <DagNodeSQL>nodes[0];
                    let sqlQuery = node.getSQLQuery();
                    if (sqlQuery) {
                        queryMeta = sqlQuery.queryString;
                    }
                }
            }

            const tabId: string = this._graph.getTabId();
            const udfContext = this._getUDFContext();
            const txId: number = Transaction.start({
                operation: operation,
                trackDataflow: true,
                sql: {operation: operation},
                track: true,
                tabId: tabId,
                nodeIds: nodeIds,
                parentTxId: this._parentTxId,
                udfUserName: udfContext.udfUserName,
                udfSessionName: udfContext.udfSessionName,
                queryMeta: queryMeta
            });
            this._currentTxId = txId;
            this._getAndExecuteBatchQuery(txId, nodes)
            .then((_res) => {
                self._optimizedExecuteInProgress = false;
                nodes.forEach((node) => {
                    if (node instanceof DagNodeDFOut) {
                        let destTable;
                        if (node.getNumParent() === 1) {
                            destTable = node.getParents()[0].getTable();
                        }
                        if (destTable) {
                            node.setTable(destTable, true);
                            DagTblManager.Instance.addTable(destTable);
                        }
                        node.beCompleteState();
                    } else if (node instanceof DagNodeDFIn) {
                        let destTable: string;
                        if (node.hasSource()) {
                            destTable = node.getSource();
                        } else {
                            const res = node.getLinkedNodeAndGraph();
                            const linkOutNode: DagNodeDFOut = res.node;
                            destTable = linkOutNode.getTable();
                        }
                        if (destTable) {
                            node.setTable(destTable, true);
                            DagTblManager.Instance.addTable(destTable);
                        }
                    }
                });

                Transaction.done(txId, {
                    noSql: true,
                });
                return PromiseHelper.alwaysResolve(MemoryAlert.Instance.check());
            })
            .then(() => deferred.resolve())
            .fail((error) => {
                let transactionError = error;
                if (error && error.node) {
                    // remove node from transaction.log due to cyclical error
                    const node = error.node;
                    delete error.node;
                    transactionError = xcHelper.deepCopy(error);
                    error.node = node;

                }
                this._nodes.forEach((node) => {
                    if (node.getState() === DagNodeState.Running) {
                        node.beConfiguredState();
                    }
                });
                Transaction.fail(txId, {
                    error: transactionError,
                    noAlert: true
                });
                deferred.reject(error);
            });
        }
        return deferred.promise();
    }

    // cancel execution
    public cancel(): void {
        this._isCanceled = true;
        if (this._hasProgressGraph) {
            XcalarQueryCancel(this._queryName)
            .then(() => {
                if (this._queryName.startsWith(gRetinaPrefix)) {
                    // delete non-private retinas
                    this._retinaDeleteLoop();
                }
            });
        } else {
            QueryManager.cancelQuery(this._currentTxId);
        }
    }

    // returns a query string representing all the operations needed to run
    // the dataflow
    // also stores a map of new table names to their corresponding nodes
    public getBatchQuery(forExecution: boolean = false): XDPromise<{queryStr: string, destTables: string[]}> {
        // get rid of link out node to get the correct query and destTable
        const nodes: DagNode[] = this._nodes.filter((node) => {
            return node.getType() !== DagNodeType.DFOut;
        });
        const deferred: XDDeferred<{queryStr: string, destTables: string[]}> = PromiseHelper.deferred();
        const promises = [];
        const udfContext = this._getUDFContext();
        // chain batchExecute calls while storing their destTable results
        const destTables: string[] = []; // accumulates tables
        let allQueries = []; // accumulates queries
        for (let i = 0; i < nodes.length; i++) {
            promises.push(this._getQueryFromNode.bind(this, udfContext, nodes[i], allQueries, destTables, forExecution));
        }

        PromiseHelper.chain(promises)
        .then(() => {
            nodes.forEach((node) => {
                node.setTable(null); // these table are only fake names
            });
            deferred.resolve({
                queryStr: JSON.stringify(allQueries),
                destTables: destTables
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public restoreExecution(queryName): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarQueryState(queryName)
        .then((queryStateOutput: XcalarApiQueryStateOutputT) => {
            let nodeIdsSet: Set<DagNodeId> = new Set();
            queryStateOutput.queryGraph.node.forEach((queryNode) => {
                let nodeIdCandidates = queryNode.tag.split(",");
                nodeIdCandidates.forEach((nodeId) => {
                    if (nodeId) {
                        nodeIdsSet.add(nodeId);
                    }
                });
            });
            const nodeIds: DagNodeId[] = [...nodeIdsSet];
            this._graph.lockGraph(nodeIds, this);
            const txId: number = Transaction.start({
                operation: "Dataflow execution",
                trackDataflow: true,
                sql: {operation: "Dataflow execution"},
                track: true,
                tabId: this._graph.getTabId(),
                nodeIds: nodeIds
            });
            this._currentTxId = txId;
            let queryStr = JSON.stringify(queryStateOutput.queryGraph.node);
            Transaction.startSubQuery(txId, queryName, null, queryStr);
            Transaction.update(txId, queryStateOutput);

            XcalarQueryCheck(queryName, false, txId)
            .then((ret) => {
                const timeElapsed = ret.elapsed.milliseconds;
                Transaction.log(txId, queryStr, undefined, timeElapsed, {
                    queryName: queryName
                });
                Transaction.done(txId, { noSql: true});
                MemoryAlert.Instance.check();
                deferred.resolve();
            })
            .fail((err) => {
                Transaction.fail(txId, {
                    error: err,
                    noAlert: true
                });
                deferred.reject();
            })
            .always(() => {
                this._graph.unlockGraph(nodeIds);
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * go through each node, if it can be executed as part of a query, add to larger query
     * if not, execute previous built up query, execute as a step, then create new query array
     * should have [queryFn, queryFn query], op, [query , query]
     */
    private _getAndExecuteBatchQuery(txId: number, nodes: DagNode[]): XDPromise<{queryStr: string, destTables: string[]}> {
        // get rid of link out node to get the correct query and destTable
        nodes = nodes.filter((node) => {
            return node.getType() !== DagNodeType.DFOut;
        });

        const promises = [];
        const udfContext = this._getUDFContext();
        // chain batchExecute calls while storing their destTable results
        let destTables = [];
        let partialQueries: {operation: string, args: any}[] = [];
        let queryPromises = [];
        let partialNodes = [];
        nodes.forEach(node => {
            if (DagGraphExecutor.stepThroughTypes.has(node.getType())) {
                if (queryPromises.length) {
                    promises.push(this._executeQueryPromises.bind(this, txId, queryPromises, partialNodes, destTables, partialQueries));
                    queryPromises = [];
                    partialQueries = [];
                    partialNodes = [];
                    destTables = [];
                }
                promises.push(this._stepExecute.bind(this, txId, node));
            } else {
                partialNodes.push(node);
                queryPromises.push(this._getQueryFromNode.bind(this, udfContext, node, partialQueries, destTables, true));
            }
        });
        if (queryPromises.length) {
            promises.push(this._executeQueryPromises.bind(this, txId, queryPromises, partialNodes, destTables, partialQueries));
        }
        setTimeout(() => {
            // save node running statuses, ok if not saved at correct time
            this._graph.save();
        }, 1000);

        return PromiseHelper.chain(promises);
    }

    // query promises are
    private _executeQueryPromises(txId, queryPromises, nodes, destTables, allQueries) {
        const deferred: XDDeferred<{queryStr: string, destTables: string[]}> = PromiseHelper.deferred();

        PromiseHelper.chain(queryPromises)
        .then(() => {
            nodes.forEach((node) => {
                node.setTable(null); // these table are only fake names
            });

            let queryStr = JSON.stringify(allQueries);
            if (queryStr === "[]") { // can be empty if link out node
                return PromiseHelper.resolve();
            } else {
                let queryName = destTables[destTables.length - 1];
                if (queryName.startsWith("DF2_")) {
                    queryName = "table_" + queryName;
                }
                if (!queryName.includes("#t_")) {
                    queryName += "#t_" + Date.now() + "_0";
                }
                return XIApi.query(txId, queryName, queryStr);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getQueryFromNode(udfContext: {
            udfUserName: string;
            udfSessionName: string;
        },
        node: DagNode,
        allQueries: any[],
        destTables: string[],
        forExecution?: boolean
    ): XDPromise<void> {
        const simulateId: number = Transaction.start({
            operation: "Simulate",
            simulate: true,
            tabId: this._graph.getTabId(),
            parentTxId: this._parentTxId,
            udfUserName: udfContext.udfUserName,
            udfSessionName: udfContext.udfSessionName,
        });

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._beforeSimulateExecute(node, forExecution)
        .then(() => {
            return this._simulateExecute(simulateId, node, forExecution);
        })
        .then((destTable) => {
            let queryStr: string = Transaction.done(simulateId, {
                noNotification: true,
                noSql: true,
                noCommit: true
            });
            let queries: {operation: string, args: any, tag?: string}[];
            try {
                if (!queryStr.startsWith("[")) {
                    // when query is not in the form of JSON array
                    if (queryStr.endsWith(",")) {
                        queryStr = queryStr.substring(0, queryStr.length - 1);
                    }
                    queryStr = "[" + queryStr + "]";
                }
                queries = JSON.parse(queryStr);
            } catch (e) {
                return PromiseHelper.reject(e);
            }

            let tagNodeIds = [];
            this._getParentNodeIds(tagNodeIds, this._currentTxId);
            queries.forEach((query) => {
                if (query.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                    tagNodeIds.push(node.getId());
                    let curTags = [];
                    if (query.tag) {
                        curTags = query.tag.split(",");
                    }
                    let finalTagNodeIds = tagNodeIds.concat(curTags);
                    query.tag = finalTagNodeIds.join(",");
                    tagNodeIds.pop();
                }

                allQueries.push(query);
            });
            if (destTable != null) {
                this._dagIdToDestTableMap.set(node.getId(), destTable);
            }

            destTables.push(destTable);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _getParentNodeIds(parentNodeIds, txId) {
        const txLog = Transaction.get(txId);
        if (!txLog) return;
        if (txLog.parentNodeId) {
            parentNodeIds.unshift(txLog.parentNodeId);
        }
        if (txLog.parentTxId) {
            this._getParentNodeIds(parentNodeIds, txLog.parentTxId);
        }
    }


    // for extensions, dfout
    private _stepExecute(
        txId: number,
        node: DagNode
    ): XDPromise<void> | void {
        if (this._isCanceled) {
            return PromiseHelper.reject(DFTStr.Cancel);
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const tabId: string = this._graph.getTabId();

        let sqlNode: DagNodeSQL;
        if (node instanceof DagNodeSQL && this._sqlNodes) {
            // send copy and original sql node to executor because we
            // may need to modify the original
            sqlNode = this._sqlNodes.get(node.getId());
        } else if (node instanceof DagNodeAggregate) {
            // It was created in this graph so we note it.
            this._internalAggNames.add(node.getParam().dest);
        }

        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId, tabId, false, sqlNode, false, this._internalAggNames);
        this._currentNode = node;
        dagNodeExecutor.run()
        .then((_destTable) => {
            this._currentNode = null;
            if (node.getType() === DagNodeType.IMDTable) {
                return this._updateIMDProgress(node);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            return MemoryAlert.Instance.check();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _updateIMDProgress(node) {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarGetTableMeta(node.getTable())
        .then((res: XcalarApiGetTableMetaOutputT) => {
            node.updateStepThroughProgress(res.metas);
        })
        .always(deferred.resolve);
        return deferred.promise();
    }

    public updateProgress(queryNodes: XcalarApiDagNodeT[]) {
        const nodeIdInfos: Map<DagNodeId, object> = new Map();
        // GROUP THE QUERY NODES BY THEIR CORRESPONDING DAG NODE
        queryNodes.forEach((queryNodeInfo: XcalarApiDagNodeT) => {
            if (queryNodeInfo["operation"] === XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects] ||
                queryNodeInfo.api === XcalarApisT.XcalarApiDeleteObjects) {
                return;
            }
            let tableName: string = queryNodeInfo.name.name;
            let nodeIdCandidates = queryNodeInfo.tag.split(",");
            let nodeId: DagNodeId;
            let nodeFound = false;
            for (let i = 0; i < nodeIdCandidates.length; i++) {
                nodeId = nodeIdCandidates[i];
                if (this._graph.hasNode(nodeId)) {
                    nodeFound = true;
                    if (this._finishedNodeIds.has(nodeId)) {
                        return;
                    }
                    break;
                }
            }
            if (!nodeFound) {
                return;
            }
            let nodeIdInfo = nodeIdInfos.get(nodeId);
            if (!nodeIdInfo) {
                nodeIdInfo = {};
                nodeIdInfos.set(nodeId, nodeIdInfo);
            }
            nodeIdInfo[tableName] = queryNodeInfo;
            queryNodeInfo["index"] = parseInt(queryNodeInfo.dagNodeId);
        });

        for (let [nodeId, queryNodesBelongingToDagNode] of nodeIdInfos) {
            let node: DagNode = this._graph.getNode(nodeId);
            if (node != null) {
                // DO THE ACTUAL PROGRESS UPDATE HERE
                node.updateProgress(queryNodesBelongingToDagNode, this._currentNode == null, this._currentNode == null);
                if (node instanceof DagNodeSQL) {
                    node.updateSQLQueryHistory(true);
                }

                if (node.getState() === DagNodeState.Complete) {
                    let destTable: string;
                    if (this._dagIdToDestTableMap.has(nodeId)) {
                        destTable = this._dagIdToDestTableMap.get(nodeId);
                    } else if (this._isRestoredExecution) {
                        let lastNode;
                        let latestId = -1;
                        // find the last queryNode belonging to a dagNode
                        // that is not a deleteNode and get it's destTable
                        for (let tableName in queryNodesBelongingToDagNode) {
                            let queryNode = queryNodesBelongingToDagNode[tableName];
                            let curId = parseInt(queryNode.dagNodeId);
                            if (curId > latestId) {
                                latestId = curId;
                                lastNode = queryNode;
                            }
                        }
                        if (lastNode) {
                            destTable = lastNode.name.name;
                        }
                    }

                    if (node instanceof DagNodeAggregate) {
                        this._resolveAggregates(this._currentTxId, node, Object.keys(queryNodesBelongingToDagNode)[0]);
                    }

                    if (destTable) {
                        node.setTable(destTable, true);
                        DagTblManager.Instance.addTable(destTable);
                        const tabId: string = this._graph.getTabId();
                        const tab: DagTab = DagServiceFactory.getDagListService().getDagTabById(tabId);
                        if (tab != null) {
                            tab.save(); // save destTable to node
                        }
                    }
                }

                if (node.getState() === DagNodeState.Complete ||
                    node.getState() === DagNodeState.Error) {
                    // log completed nodes so we no longer update them
                    this._finishedNodeIds.add(nodeId);
                    this._dagIdToDestTableMap.delete(nodeId);
                    if (node.getType() === DagNodeType.Map) {
                        let nodeInfo = Object.values(queryNodesBelongingToDagNode)[0];
                        if (nodeInfo && nodeInfo.opFailureInfo && nodeInfo.opFailureInfo.failureDescArr.length) {
                            (<DagNodeMap>node).setUDFError(nodeInfo.opFailureInfo);
                        }
                    }
                }
            }
        }
    }

    private _simulateExecute(
        txId: number,
        node: DagNode,
        forExecution: boolean = false
    ): XDPromise<string> {
        let sqlNode: DagNodeSQL;
        if (node instanceof DagNodeSQL && this._sqlNodes) {
            // send copy and original sql node to executor because we
            // may need to modify the original
            sqlNode = this._sqlNodes.get(node.getId());
        } else if (node instanceof DagNodeAggregate) {
            // It was created in this graph so we note it.
            this._internalAggNames.add(node.getParam().dest);
        }
        const dagNodeExecutor: DagNodeExecutor = this.getRuntime().accessible(
            new DagNodeExecutor(node, txId, this._graph.getTabId(), this._isNoReplaceParam, sqlNode, forExecution, this._internalAggNames)
        );
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
            if (this._isOptimized) {
                // optimized dataflow don't need to do this check
                return null;
            }

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
        const tab: DagTab = DagServiceFactory.getDagListService().getDagTabById(tabId);
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
        .then((ret) => {
            try {
                let { queryStr, destTables } = ret;
                // retina name will be graph id + outNode Id, prefixed by gRetinaPrefix
                const parentTabId: string = this._graph.getTabId();
                let outNodeId: DagNodeId;
                if (this._isOptimizedActiveSession) {
                    outNodeId = this._optimizedLinkOutNode.getId();
                } else {
                    // XXX arbitrarily storing retina in the last export nodes
                    outNodeId = this._optimizedExportNodes[this._optimizedExportNodes.length - 1].getId();
                }
                const retinaName = gRetinaPrefix + parentTabId + "_" + outNodeId;
                this._queryName = retinaName;
                const retinaParameters = this._getImportRetinaParameters(retinaName, queryStr, destTables);
                if (retinaParameters == null) {
                    deferred.reject('Invalid retina args');
                } else {
                    deferred.resolve(retinaParameters);
                }
            } catch (e) {
                console.error(e);
                deferred.reject(e.message);
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    // given retinaParameters, we create the retina, then create a tab which
    // becomes focused and checks and updates node progress
    private _executeOptimizedDataflow(retinaParameters: {
        retinaName: string,
        retina: string,
        sessionName: string,
        userName: string
    }): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        // retina name will be the same as the graph/tab's ID
        let retinaName: string = retinaParameters.retinaName;
        let subGraph: DagSubGraph;
        const udfContext = this._getUDFContext();
        const tabName: string = this._getOptimizedDataflowTabName();
        let tab: DagTabOptimized;

        let txId: number = Transaction.start({
            operation: "optimized df",
            sql: {operation: "Optimized Dataflow", retName: tabName},
            track: true,
            udfUserName: udfContext.udfUserName,
            udfSessionName: udfContext.udfSessionName
        });

        const parentTabId: string = this._graph.getTabId();
        let outputTableName: string = this._isOptimizedActiveSession ?
                                "table_" + parentTabId + "_" +
                                this._optimizedLinkOutNode.getId() +
                                Authentication.getHashId() : "";
        if (this._isOptimizedActiveSession) {
            this._storeOutputTableNameInNode(outputTableName, retinaParameters);
        }

        this._currentTxId = txId;
        this._createRetina(retinaParameters)
        .then((retina) => {
            // remove any existing tab if it exists (tabs can remain open even
            // if the retina was deleted
            DagTabManager.Instance.removeTab(retinaName);

             // create tab and pass in nodes to store for progress updates

            tab = DagTabManager.Instance.newOptimizedTab(retinaName,
                                                tabName, retina.query, this);
            subGraph = tab.getGraph();

            this._optimizedExecuteInProgress = true;
            const udfContext = this._getUDFContext();
            return XcalarExecuteRetina(retinaName, [], {
                activeSession: this._isOptimizedActiveSession,
                newTableName: outputTableName,
                udfUserName: udfContext.udfUserName || userIdName,
                udfSessionName: udfContext.udfSessionName || sessionName
            }, this._currentTxId);
        })
        .then((_res) => {
            this._optimizedExecuteInProgress = false;
            // get final stats on each node
            tab.endStatusCheck()
            .always(() => {
                deferred.resolve(outputTableName);
            });

            if (this._isOptimizedActiveSession) {
                this._optimizedLinkOutNode.setTable(outputTableName, true);
                DagTblManager.Instance.addTable(outputTableName);
                this._optimizedLinkOutNode.beCompleteState();
            } else {
                this._optimizedExportNodes.forEach((node) => {
                    node.beCompleteState();
                });
            }

            Transaction.done(txId, {
                noNotification: true,
                noSql: true,
                noCommit: true
            });
        })
        .fail((error) => {
            if (txId != null) {
                if (error &&
                    error.status === StatusT.StatusRetinaAlreadyExists) {
                    error.error = "The optimized dataflow already exists\nReset the optimized node and select " +
                        "Execute Optimized to re-execute";
                }
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.ProfileFailed,
                    "error": error,
                    "noAlert": true
                });
            }

            if (this._optimizedExecuteInProgress) {
                this._optimizedExecuteInProgress = false;
                tab.endStatusCheck()
                .always(() => {
                    let msg = "";
                    if (error) {
                        msg = error.error;
                    }
                    if (this._isOptimizedActiveSession) {
                        this._optimizedLinkOutNode.beErrorState(msg, true);
                    } else {
                        this._optimizedExportNodes.forEach((node) => {
                            node.beErrorState(msg, true);
                        });
                    }
                    if (error && error.status === StatusT.StatusCanceled) {
                        XcalarDeleteRetina(retinaName);
                    }
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

    private _getOptimizedDataflowTabName() {
        const parentTabId: string = this._graph.getTabId();
        const parentTab: DagTab = DagTabManager.Instance.getTabById(parentTabId);
        let dfOutName: string = this._isOptimizedActiveSession ?
                        this._optimizedLinkOutNode.getParam().name : "export";
        let tabName: string = parentTab.getName() + " " + dfOutName + " optimized";
        return tabName;
    }

    private _dedupLoads(operations: any[]): any[] {
        let res = [];
        let dsNameSet: Set<string> = new Set();
        try {
            operations.forEach((op) => {
                let isDup: boolean = false;
                if (op.operation === "XcalarApiBulkLoad") {
                    let dest: string = op.args.dest;
                    if (dsNameSet.has(dest)) {
                        isDup = true;
                    } else {
                        dsNameSet.add(dest);
                    }
                }
                if (!isDup) {
                    res.push(op);
                }
            });
            return res;
        } catch(e) {
            console.error(e);
            return operations;
        }
    }

    private _getImportRetinaParameters(
        retinaName: string,
        queryStr: string,
        destTables: string[]
    ): {
        retinaName: string,
        retina: string,
        userName: string,
        sessionName: string
    } {
        let operations;
        try {
            operations = JSON.parse(queryStr);
        } catch(e) {
            console.error(e);
            return null;
        }
        operations = this._dedupLoads(operations);
        const realDestTables: string[] = [];
        let outNodes;
        // create tablename and columns property in retina for each outnode
        if (this._isOptimizedActiveSession) {
            realDestTables.push(destTables[destTables.length - 1]);
            outNodes = [this._nodes[this._nodes.length - 1]];
        } else {
            outNodes = this._nodes.filter((node, i) => {
                if (node.getType() === DagNodeType.Export) {
                    realDestTables.push(destTables[i]);
                    return true;
                }
            });
        }

        const tables: {
            name: string,
            columns: {
                columnName: string,
                headerAlias: string
            }
        } = outNodes.map((outNode, i) => {
            const destTable = realDestTables[i];
            return {
                name: destTable,
                columns: outNode.getParam().columns.map((col) => {
                    if (col.sourceColumn) { // export node
                        return {
                            columnName: col.sourceColumn,
                            headerAlias: col.destColumn
                        }
                    } else {  // df out node
                        return {
                            columnName: col.sourceName,
                            headerAlias: col.destName
                        }
                    }
                })
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
            sessionName: sessName
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

    // called after canceling a query, may take a while to cancel so keep trying
    private _retinaDeleteLoop(count = 0): void {
        const self = this;
        setTimeout(() => {
            XcalarDeleteRetina(self._queryName)
            .fail((error) => {
                if (error && error.status === StatusT.StatusRetinaInUse && count < 5) {
                    count++;
                    self._retinaDeleteLoop(count);
                }
            });
        }, 2000);
    }

    protected getRuntime(): DagRuntime {
        return DagRuntime.getDefaultRuntime();
    }

    private _beforeSimulateExecute(node: DagNode, forExecution: boolean) {
        if (forExecution) {
            if (node instanceof DagNodeAggregate) {
                return PromiseHelper.alwaysResolve((<DagNodeAggregate>node).resetAgg());
            } else {
                node.beRunningState();
                return PromiseHelper.resolve();
            }
        } else {
            return PromiseHelper.resolve();
        }
    }

    private async _resolveAggregates(txId, node, dstAggName) {
        if (node.getState() !== DagNodeState.Complete) {
            return Promise.resolve();
        }
        if (!dstAggName) {
            return Promise.reject();
        }
        let value;
        try {
            value = await XIApi.getAggValue(txId, dstAggName);
        } catch (e) {
            return Promise.resolve();
        }
        node.setAggVal(value);
        if (value) {
            let unwrappedName = node.getParam(true).dest;
            const tableName: string = node.getParents()[0].getTable();
            const aggRes: AggregateInfo = {
                value: value,
                dagName: dstAggName,
                aggName: unwrappedName,
                tableId: tableName,
                backColName: null,
                op: null,
                node: node.getId(),
                graph: this._graph.getTabId()
            };
            try {
                await this.getRuntime().getDagAggService().addAgg(unwrappedName, aggRes);
            } catch (e) {
                return Promise.resolve();
            }
        }
    }

    // for retinas, we store the outputTableName as a comment in the last
    // operator of the retina query so that we can use it later to perform a result
    // set preview
    private _storeOutputTableNameInNode(outputTableName: string, retinaParameters: {
        retinaName: string,
        retina: string,
        sessionName: string,
        userName: string
    }) {
        try {
            // store outputTableName in last operator
            const retinaStruct = JSON.parse(retinaParameters.retina);
            const operators = JSON.parse(retinaStruct.query);
            let lastNode; // get last node that is not a Delete operation
            for (let i = operators.length - 1; i >= 0; i--) {
                lastNode = operators[i];
                if (lastNode.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                    break;
                }
            }
            lastNode.comment = JSON.stringify({outputTableName: outputTableName});
            retinaStruct.query = JSON.stringify(operators);
            retinaParameters.retina = JSON.stringify(retinaStruct);
        } catch (e) {
            // ok to fail
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagGraphExecutor = DagGraphExecutor;
};