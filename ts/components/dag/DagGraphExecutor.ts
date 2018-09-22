class DagGraphExecutor {
    private nodes: DagNode[];
    private graph: DagGraph;
    private batchMode: boolean;

    public constructor(
        nodes: DagNode[],
        graph: DagGraph,
        batchMode: boolean = false
    ) {
        this.nodes = nodes;
        this.graph = graph;
        this.batchMode = batchMode;
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
            let graph: DagGraph;
            let dfOutNode: DagNodeDFOut;
            [graph, dfOutNode] = this._findLinedNodeAndGraph(currentNode);
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

    private _findLinedNodeAndGraph(node: DagNodeDFIn): [DagGraph, DagNodeDFOut] {
        const param: DagNodeDFInInput = node.getParam();
        const dataflowId: string = param.dataflowId;
        const linkOutName: string = param.linkOutName;
        const graph: DagGraph = DagTabManager.Instance.getGraphById(dataflowId);
        if (graph == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const dfOutNodes: DagNode[] = graph.filterNode((node) => {
            if (node.getType() === DagNodeType.DFOut) {
                const dfOutNode = <DagNodeDFOut>node;
                if (dfOutNode.getParam().name === linkOutName) {
                    return true;
                }
            } else {
                return false;
            }
        });
        if (dfOutNodes.length !== 1) {
            throw new Error(DagNodeErrorType.NoLinkInGraph);
        }
        return [graph, <DagNodeDFOut>dfOutNodes[0]];
    }

    /**
     * Execute nodes
     */
    public run(): XDPromise<string> {
        const promises: XDPromise<void>[] = [];
        const nodesToRun: {node: DagNode, executable: boolean}[] = [];
        this.nodes.forEach((node) => {
            if (node.getState() !== DagNodeState.Complete) {
                nodesToRun.push({
                    node: node,
                    executable: true
                });
            }
        });

        for (let i = 0; i <= nodesToRun.length; i++) {
            promises.push(this._executeHelper.bind(this, nodesToRun, i));
        }

        return PromiseHelper.chain(promises);
    }

    private _executeHelper(
        nodesToRun: {node: DagNode, executable: boolean}[],
        index: number
    ): XDPromise<void> {
        if (nodesToRun[index] == null || !nodesToRun[index].executable) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const node: DagNode = nodesToRun[index].node;
        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node);
        dagNodeExecutor.run()
        .then(() => {
            deferred.resolve();
        })
        .fail(() => {
            // remove all the children that depends on the failed node
            const set: Set<DagNode> = this.graph.traverseGetChildren(node);
            for (let i = index; i < nodesToRun.length; i++) {
                if (set.has(nodesToRun[i].node)) {
                    nodesToRun[i].executable = false;
                }
            }
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }
}