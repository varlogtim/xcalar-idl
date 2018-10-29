class DagOptimizedGraph extends DagGraph {
    private startTime: number;
    private nodeInfoMap: Map<DagNodeId, any>;
    private isComplete: boolean = false;
    private elapsedTime: number;
    private state: DgDagStateT;

    public constructor() {
        super();
        this.startTime = Date.now();
    }

    public initializeProgress() {
        this.nodeInfoMap = new Map();

        this.nodesMap.forEach((_value: DagNode, nodeId: DagNodeId) => {
            this.nodeInfoMap.set(nodeId, {
                startTime: null,
                elapsedTime: 0,
                state: DgDagStateT.DgDagStateQueued,
                pct: 0
            });
        });
    }

    public updateNodeProgress(nodeId, pct, elapsedTime, state): void {
        const nodeInfo = this.nodeInfoMap.get(nodeId);
        if (state === DgDagStateT.DgDagStateProcessing &&
            nodeInfo.state !== DgDagStateT.DgDagStateProcessing) {
            nodeInfo.startTime = Date.now();
        }
        nodeInfo.state = state;
        nodeInfo.elapsedTime = elapsedTime;
        nodeInfo.pct = pct;
    }

    public getNodeElapsedTime(nodeId): number {
        const nodeInfo = this.nodeInfoMap.get(nodeId);
        if (nodeInfo.state === DgDagStateT.DgDagStateProcessing) {
            return Date.now() - nodeInfo.startTime;
        } else {
            return nodeInfo.elapsedTime;
        }
    }

    public getElapsedTime(): number {
        if (this.isComplete) {
            this.elapsedTime;
        } else {
            return Date.now() - this.startTime;
        }
    }

    public endProgress(state, time) {
        this.elapsedTime = time;
        this.isComplete = true;
        this.state = state;
    }
}