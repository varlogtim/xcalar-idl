class DagGraphExecutor {
    private _nodes: DagNode[];
    private _graph: DagGraph;

    public constructor(nodes: DagNode[], graph: DagGraph) {
        this._nodes = nodes;
        this._graph = graph;
    }

    /**
     * Static check if the nodes to run are executable
     */
    public checkCanExecuteAll(optimized?: boolean): {
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
                const linkoutNode: DagNodeDFOut = linkInNode.getLinedNodeAndGraph().node;
                if (linkoutNode.shouldLinkAfterExecuition() &&
                    linkoutNode.getState() !== DagNodeState.Complete
                ) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.LinkOutNotExecute;
                    errorResult.node = node;
                }
            } else if (optimized && node.hasNoChildren()) {
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

    // first traverses all the ancestors of the endNode and puts them into a tree
    // then traverses all the nodes left out and puts them into a new tree
    // while doing the traversing, if we encounter a node that already belongs to
    // another tree, we later combine the 2 trees into the first and delete the latter
    // if the result ends in more than 1 tree, we return an error
    public checkDisjoint(): {
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
        /**
     * Execute nodes
     */
    public run(optimized?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (optimized) {
            let txId: number;
            let dstTable;
            this.getBatchQuery()
            .then((query, destTable) => {
                dstTable = destTable;
                txId = Transaction.start({
                    operation: "optimized df",
                    track: true,
                    optimizedQueryName: destTable
                });

                if (!query.startsWith("[")) {
                    // when query is not in the form of JSON array
                    if (query.endsWith(",")) {
                        query = query.substring(0, query.length - 1);
                    }
                    query = "[" + query + "]";
                }

                const nodes = JSON.parse(query);
                const tab = DagTabManager.Instance.newOptimizedTab(destTable, nodes);
                const graph: DagSubGraph = tab.getGraph();
                graph.startExecution(nodes);
                return XIApi.query(txId, destTable, query);
            })
            .then((res) => {
                Transaction.done(txId, {
                    noNotification: true,
                    noSql: true,
                    noCommit: true,
                    queryStateOutput: res
                });
                deferred.resolve(dstTable);
            })
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
            return PromiseHelper.chain(promises);
        }
        return deferred.promise();
    }

    public getBatchQuery(): XDPromise<string> {
        // get rid of link of node to get the correct query and destTable
        const nodes: DagNode[] = this._nodes.filter((node) => {
            return node.getType() !== DagNodeType.DFOut;
        });
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const promises: XDDeferred<string>[] = [];
        const simulateId: number = Transaction.start({
            operation: "Simulate",
            simulate: true
        });
        for (let i = 0; i < nodes.length; i++) {
            promises.push(this._batchExecute.bind(this, simulateId, nodes[i]));
        }

        PromiseHelper.chain(promises)
        .then((destTable) => {
            nodes.forEach((node) => {
                node.setTable(null); // these table are only fake names
            });
            const query: string = Transaction.done(simulateId, {
                noNotification: true,
                noSql: true,
                noCommit: true
            });
            deferred.resolve(query, destTable);
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
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const node: DagNode = nodesToRun[index].node;
        const tabId: string = this._graph.getTabId();
        const txId: number = Transaction.start({
            operation: node.getType(),
            track: true,
            nodeId: node.getId(),
            tabId: tabId
        });
        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId, tabId);
        dagNodeExecutor.run()
        .then((_destTable, res) => {
            Transaction.done(txId, {
                queryStateOutput: res
            });
            MemoryAlert.Instance.check();
            deferred.resolve();
        })
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
                noAlert: true,
            });
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _batchExecute(
        txId: number,
        node: DagNode,
        optimized?: boolean
    ): XDPromise<string> {
        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId, this._graph.getTabId());
        return dagNodeExecutor.run(optimized);
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
            const res = currentNode.getLinedNodeAndGraph();
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
}