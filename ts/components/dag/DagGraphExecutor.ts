class DagGraphExecutor {
    private _nodes: DagNode[];
    private _graph: DagGraph;
    private _executeInProgress = false;
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
    private _hasProgressGraph: boolean;
    private _tableNameToDagIdMap; // {destTableName: dagNodeId}
    private _dagIdToTableNamesMap;// id to tableName map stores all the tables related to the dag node
    // in topological order {dagNodeId: [tableName1, tableName2]}
    private _dagIdToDestTableMap;
    private _aggIdToDestTableMap;
    private _currentNode: DagNode; // current node in progress if stepExecute

    public static readonly stepThroughTypes = new Set([DagNodeType.PublishIMD,
        DagNodeType.IMDTable, DagNodeType.UpdateIMD, DagNodeType.Extension,
        DagNodeType.Custom, DagNodeType.CustomInput, DagNodeType.CustomOutput]);

    public constructor(
        nodes: DagNode[],
        graph: DagGraph,
        options: {
            optimized?: boolean
            noReplaceParam?: boolean
            queryName?: string
            parentTxId?: number
            allowNonOptimizedOut?: boolean,
            sqlNodes?: Map<string, DagNodeSQL>,
            hasProgressGraph?: boolean
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
        this._tableNameToDagIdMap = {};
        this._dagIdToTableNamesMap = {};
        this._dagIdToDestTableMap = {};
        this._aggIdToDestTableMap = {};
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
                    // if this is just a dataset node, we need to error
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
                let aggInfo = DagAggManager.Instance.getAgg(this._graph.getTabId(), agg);
                if (aggInfo && aggInfo.value != null) {
                    // It has a value, we're alright.
                    continue
                }
                return DagNodeErrorType.NoAggNode;
            } else if  (aggNode.getParam().mustExecute) {
                // Case where we must execute the aggregate manually
                return DagNodeErrorType.AggNotExecute;
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
            //XXX TODO: Remove nodes that have had their table deleted but arent necessary for this execution
            const nodesToRun: {node: DagNode, executable: boolean}[] = nodes.map((node) => {
                return {
                    node: node,
                    executable: true
                }
            });

            if (nodesToRun.length === 0 && this._nodes.length !== 0) {
                return PromiseHelper.reject(DFTStr.AllExecuted);
            }
            let nodeIds = nodes.map(node => node.getId());

            let operation = "Dataflow execution";
            if (nodes.length === 1) {
                operation = nodes[0].getType();
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
                udfSessionName: udfContext.udfSessionName
            });
            this._currentTxId = txId;
            this.getBatchQueryPromises(txId)
            .then((_res) => {
                let promises = [];
                self._executeInProgress = false;
                nodes.forEach((node, i) => {
                    if (node instanceof DagNodeDFOut) {
                        let destTable;
                        if (node.getNumParent() === 1) {
                            destTable = node.getParents()[0].getTable();
                        }
                        if (destTable) {
                            node.setTable(destTable);
                            DagTblManager.Instance.addTable(destTable);
                        }
                        node.beCompleteState();
                    } else if (node instanceof DagNodeDFIn) {
                        const res = node.getLinkedNodeAndGraph();
                        const linkOutNode: DagNodeDFOut = res.node;
                        const destTable: string = linkOutNode.getTable();
                        if (destTable) {
                            node.setTable(destTable);
                            DagTblManager.Instance.addTable(destTable);
                        }
                    } else if (node instanceof DagNodeAggregate) {
                        promises.push(this._resolveAggregates(txId, node));
                    }
                });
                return PromiseHelper.when(...promises);
            })
            .then(() => {
                Transaction.done(txId, {
                    noSql: true,
                });
                return PromiseHelper.alwaysResolve(MemoryAlert.Instance.check());
            })
            .then(() => deferred.resolve())
            .fail(function(error) {
                let transactionError = error;
                if (error && error.node) {
                    // remove node from transaction.log due to cyclical error
                    const node = error.node;
                    delete error.node;
                    transactionError = xcHelper.deepCopy(error);
                    error.node = node;

                }
                nodes.forEach((node) => {
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
        const destTables = [];
        let allQueries = [];
        for (let i = 0; i < nodes.length; i++) {
            promises.push(() => {
                const simulateId: number = Transaction.start({
                    operation: "Simulate",
                    simulate: true,
                    udfUserName: udfContext.udfUserName,
                    udfSessionName: udfContext.udfSessionName
                });

                let node = nodes[i];
                const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
                this._beforeBatchExecute(node, forExecution)
                .then(() => {
                    return this._batchExecute(simulateId, node, forExecution);
                })
                .then((destTable) => {
                    let queryStr: string = Transaction.done(simulateId, {
                        noNotification: true,
                        noSql: true,
                        noCommit: true
                    });
                    let queries;
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

                    this._dagIdToTableNamesMap[node.getId()] = [];
                    queries.forEach((query) => {
                        allQueries.push(query);
                        if (query.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                            this._dagIdToTableNamesMap[node.getId()].push(query.args.dest);
                            this._tableNameToDagIdMap[query.args.dest] = node.getId();
                        }
                    });
                    if (destTable != null) {
                        this._dagIdToDestTableMap[node.getId()] = destTable;
                        if (node.getType() === DagNodeType.Aggregate) {
                            this._aggIdToDestTableMap[node.getId()] = destTable;
                        }
                    }

                    destTables.push(destTable);
                    innerDeferred.resolve();
                })
                .fail(innerDeferred.reject);
                return innerDeferred.promise();
            });
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


    /**
     * go through each node, if query add to query
     * if not query, execute previous query, execute step, then create new query array
     * should have [queryFn, queryFn query], op, [query , query]
     *
     */

    public getBatchQueryPromises(txId: number): XDPromise<{queryStr: string, destTables: string[]}> {
        // get rid of link out node to get the correct query and destTable
        const nodes: DagNode[] = this._nodes.filter((node) => {
            return node.getType() !== DagNodeType.DFOut;
        });

        const promises = [];
        const udfContext = this._getUDFContext();
        // chain batchExecute calls while storing their destTable results
        let destTables = [];
        let partialQueries = [];
        let queries = [];
        let partialNodes = [];
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            if (DagGraphExecutor.stepThroughTypes.has(node.getType())) {
                if (queries.length) {
                    promises.push(this.executeQueryChain.bind(this, txId, queries, partialNodes, destTables, partialQueries));
                    queries = [];
                    partialQueries = [];
                    partialNodes = [];
                    destTables = [];
                }
                promises.push(this._stepExecute.bind(this, txId, node));
            } else {
                partialNodes.push(nodes[i]);
                queries.push(this._getBatchQueryPromise(udfContext, nodes[i], partialQueries, destTables));
            }
        }
        if (queries.length) {
            promises.push(this.executeQueryChain.bind(this, txId, queries, partialNodes, destTables, partialQueries));
        }
        return PromiseHelper.chain(promises);
    }

    private executeQueryChain(txId, queries, nodes, destTables, allQueries) {
        const deferred: XDDeferred<{queryStr: string, destTables: string[]}> = PromiseHelper.deferred();

        PromiseHelper.chain(queries)
        .then(() => {
            nodes.forEach((node) => {
                node.setTable(null); // these table are only fake names
            });
            let queryStr = JSON.stringify(allQueries);
            if (queryStr === "[]") { // can be empty if link out node
                return PromiseHelper.resolve();
            } else {
                return XIApi.query(txId, destTables[destTables.length - 1], queryStr);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getBatchQueryPromise(udfContext, node, allQueries, destTables) {
        return () => {
            const simulateId: number = Transaction.start({
                operation: "Simulate",
                simulate: true,
                udfUserName: udfContext.udfUserName,
                udfSessionName: udfContext.udfSessionName
            });

            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            this._beforeBatchExecute(node, true)
            .then(() => {
                return this._batchExecute(simulateId, node, true);
            })
            .then((destTable) => {
                let queryStr: string = Transaction.done(simulateId, {
                    noNotification: true,
                    noSql: true,
                    noCommit: true
                });
                let queries;
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

                this._dagIdToTableNamesMap[node.getId()] = [];
                queries.forEach((query) => {
                    allQueries.push(query);
                    if (query.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                        this._dagIdToTableNamesMap[node.getId()].push(query.args.dest);
                        this._tableNameToDagIdMap[query.args.dest] = node.getId();
                    }
                });
                if (destTable != null) {
                    this._dagIdToDestTableMap[node.getId()] = destTable;
                    if (node.getType() === DagNodeType.Aggregate) {
                        this._aggIdToDestTableMap[node.getId()] = destTable;
                    }
                }

                destTables.push(destTable);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
            return innerDeferred.promise();
        }
    }

    // for extensions, dfout
    private _stepExecute(
        txId: number,
        node
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
        }

        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId, tabId, false, sqlNode);
        this._currentNode = node;
        dagNodeExecutor.run()
        .then((_destTable) => {
            this._currentNode = null;
            return MemoryAlert.Instance.check();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();

    }

    public updateProgress(queryNodes: any[]) {
        const nodeIdInfos = {};
        if (this._currentNode) {
            // STEP EXECUTE MODE
            let nodeId = this._currentNode.getId();
            nodeIdInfos[nodeId] = {};
            const nodeIdInfo = nodeIdInfos[nodeId];
            queryNodes.forEach((queryNodeInfo, i) => {
                let tableName: string = queryNodeInfo.name.name;
                // optimized datasets name gets prefixed with xcalarlrq and an id
                // so we strip this to find the corresponding UI dataset name
                if (!nodeId && queryNodeInfo.api === XcalarApisT.XcalarApiBulkLoad &&
                    tableName.startsWith(".XcalarLRQ.") &&
                    tableName.indexOf(gDSPrefix) > -1) {
                    tableName = tableName.slice(tableName.indexOf(gDSPrefix));
                }
                if (queryNodeInfo.index == null) {
                    queryNodeInfo.index = i;
                }
                nodeIdInfo[tableName] = queryNodeInfo;
            });
        } else {
            // GROUP THE QUERY NODES BY THEIR CORRESPONDING DAG NODE
            queryNodes.forEach((queryNodeInfo) => {
                let tableName: string = queryNodeInfo.name.name;
                let nodeId = this._tableNameToDagIdMap[tableName];

                // optimized datasets name gets prefixed with xcalarlrq and an id
                // so we strip this to find the corresponding UI dataset name
                if (!nodeId && queryNodeInfo.api === XcalarApisT.XcalarApiBulkLoad &&
                    tableName.startsWith(".XcalarLRQ.") &&
                    tableName.indexOf(gDSPrefix) > -1) {
                    tableName = tableName.slice(tableName.indexOf(gDSPrefix));
                    nodeId = this._tableNameToDagIdMap[tableName];
                }

                if (!nodeId) {// could be a drop table node or node is finished
                    return;
                }

                if (!nodeIdInfos.hasOwnProperty(nodeId)) {
                    nodeIdInfos[nodeId] = {}
                }
                const nodeIdInfo = nodeIdInfos[nodeId];
                nodeIdInfo[tableName] = queryNodeInfo;
                // _dagIdToTableNamesMap has operations in the correct order
                queryNodeInfo.index = this._dagIdToTableNamesMap[nodeId].indexOf(tableName);
            });
        }


        for (let nodeId in nodeIdInfos) {
            let node: DagNode = this._graph.getNode(nodeId);
            if (node != null) {
                // DO THE ACTUAL PROGRESS UPDATE HERE
                node.updateProgress(nodeIdInfos[nodeId], this._currentNode == null, this._currentNode == null);
                if (node instanceof DagNodeSQL) {
                    node.updateSQLQueryHistory(true);
                }

                // remove completed nodes so we no longer update them
                if (node.getState() === DagNodeState.Complete ||
                    node.getState() === DagNodeState.Error) {
                    if (node.getState() === DagNodeState.Complete &&
                        this._dagIdToDestTableMap[nodeId]) {
                        let destTable: string = this._dagIdToDestTableMap[nodeId];
                        node.setTable(destTable);
                        DagTblManager.Instance.addTable(destTable);
                    }
                     // step execute mode does not have dagIdToTableNamesMap
                    if (this._dagIdToTableNamesMap[nodeId]) {
                        this._dagIdToTableNamesMap[nodeId].forEach((tableName) => {
                            delete this._tableNameToDagIdMap[tableName];
                        });
                        delete this._dagIdToTableNamesMap[nodeId];
                    }
                    delete this._dagIdToDestTableMap[nodeId];
                }
            }
        }
    }

    private _batchExecute(
        txId: number,
        node: DagNode,
        forExecution: boolean = false
    ): XDPromise<string> {
        let sqlNode: DagNodeSQL;
        if (node instanceof DagNodeSQL && this._sqlNodes) {
            // send copy and original sql node to executor because we
            // may need to modify the original
            sqlNode = this._sqlNodes.get(node.getId());
        }
        const dagNodeExecutor: DagNodeExecutor = this.getRuntime().accessible(
            new DagNodeExecutor(node, txId, this._graph.getTabId(), this._isNoReplaceParam, sqlNode, forExecution)
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
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    // given retinaParameters, we create the retina, then create a tab which
    // becomes focused and checks and updates node progress
    private _executeOptimizedDataflow(retinaParameters): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let outputTableName: string = "";
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

        this._currentTxId = txId;
        this._createRetina(retinaParameters)
        .then((retina) => {
            // remove any existing tab if it exists (tabs can remain open even
            // if the retina was deleted
            DagTabManager.Instance.removeTab(retinaName);

             // create tab and pass in nodes to store for progress updates
            const parentTabId: string = this._graph.getTabId();
            tab = DagTabManager.Instance.newOptimizedTab(retinaName,
                                                tabName, retina.query, this);
            subGraph = tab.getGraph();
            outputTableName = this._isOptimizedActiveSession ?
                                "table_" + parentTabId + "_" +
                                this._optimizedLinkOutNode.getId() +
                                Authentication.getHashId() : "";

            this._executeInProgress = true;
            const udfContext = this._getUDFContext();
            return XcalarExecuteRetina(retinaName, [], {
                activeSession: this._isOptimizedActiveSession,
                newTableName: outputTableName,
                udfUserName: udfContext.udfUserName || userIdName,
                udfSessionName: udfContext.udfSessionName || sessionName
            }, this._currentTxId);
        })
        .then((_res) => {
            this._executeInProgress = false;
            // get final stats on each node
            tab.endStatusCheck()
            .always(() => {
                deferred.resolve(outputTableName);
            });

            if (this._isOptimizedActiveSession) {
                this._optimizedLinkOutNode.setTable(outputTableName);
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

            if (this._executeInProgress) {
                this._executeInProgress = false;
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
        destTables: {nodeId: DagNodeId, tableName: string}[]
    } {
        let operations;
        try {
            operations = JSON.parse(queryStr);
        } catch(e) {
            console.error(e);
            return null;
        }
        operations = this._dedupLoads(operations);
        const realDestTables = [];
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

        const destInfo: {nodeId: DagNodeId, tableName: string}[] = [];
        const tables = outNodes.map((outNode, i) => {
            const destTable = realDestTables[i];
            const columns = outNode.getParam().columns.map((col) => {
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

    private _beforeBatchExecute(node: DagNode, forExecution: boolean) {
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

    private async _resolveAggregates(txId, node) {
        if (node.getState() !== DagNodeState.Complete) {
            return Promise.resolve();
        }
        let dstAggName = this._aggIdToDestTableMap[node.getId()];
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
                await this.getRuntime().getDagAggService().addAgg(dstAggName, aggRes);
            } catch (e) {
                return Promise.resolve();
            }
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagGraphExecutor = DagGraphExecutor;
};
