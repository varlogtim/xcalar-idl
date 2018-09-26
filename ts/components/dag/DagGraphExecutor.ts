class DagGraphExecutor {
    private nodes: DagNode[];
    private graph: DagGraph;

    public constructor(nodes: DagNode[], graph: DagGraph) {
        this.nodes = nodes;
        this.graph = graph;
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

        for (let i = 0; i < this.nodes.length; i++) {
            let node: DagNode = this.nodes[i];
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
                const res = this._checkLinkInResult(<DagNodeDFIn>node);
                if (res.hasError) {
                    errorResult = res;
                    break;
                }
            }
        }

        return errorResult;
    }

    /**
     * Execute nodes
     */
    public run(): XDPromise<string> {
        const nodes: DagNode[] = this.nodes.filter((node) => {
            return node.getState() !== DagNodeState.Complete;
        });
        const promises: XDDeferred<void>[] = [];
        const nodesToRun: {node: DagNode, executable: boolean}[] = nodes.map((node) => {
           return {
                node: node,
                executable: true
            }
        });

        for (let i = 0; i < nodesToRun.length; i++) {
            promises.push(this._stepExecute.bind(this, nodesToRun, i));
        }

        return PromiseHelper.chain(promises);
    }

    public getBatchQuery(): XDPromise<string> {
        // get rid of link of node to get the correct query and destTable
        const nodes: DagNode[] = this.nodes.filter((node) => {
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
            const query: string = Transaction.done(simulateId, {
                noNotification: true,
                noSql: true,
                noCommit: true
            });
            deferred.resolve(query, destTable);
        })
        .fail(deferred.reject);

        return deferred.reject();
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
        const txId: number = Transaction.start({
            operation: node.getType(),
            track: true,
            nodeId: node.getId()
        });
        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId);
        dagNodeExecutor.run()
        .then(() => {
            Transaction.done(txId, {});
            deferred.resolve();
        })
        .fail((error) => {
            // remove all the children that depends on the failed node
            const set: Set<DagNode> = this.graph.traverseGetChildren(node);
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
        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId);
        return dagNodeExecutor.run();
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
            if (graph === this.graph) {
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