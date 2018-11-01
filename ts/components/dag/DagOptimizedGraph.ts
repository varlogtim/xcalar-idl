class DagOptimizedGraph extends DagGraph {
    private startTime: number;
    private _nameIdMap;
    private isComplete: boolean = false;
    private elapsedTime: number;
    private state: DgDagStateT;

    public constructor(nameIdMap) {
        super();
        this.startTime = Date.now();
        this._nameIdMap = nameIdMap;
    }

    public startExecution(nodes): void {
        nodes.forEach((node) => {
            const nodeId = this._nameIdMap[node.args.dest];
            this.getNode(nodeId).beRunningState();
        });
    }

    public getNameIdMap(): {name: string} {
        return this._nameIdMap;
    }

    // loop through all tables, update all tables in the node ids
    // then loop through all the tables

    public initializeProgress() {
        const nodeIdToTableNamesMap = new Map();

        for (let tableName in this._nameIdMap) {
            const nodeId = this._nameIdMap[tableName];
            if (!nodeIdToTableNamesMap.has(nodeId)) {
                nodeIdToTableNamesMap.set(nodeId, [])
            }
            const tableNames: string[] = nodeIdToTableNamesMap.get(nodeId);
            tableNames.push(tableName);
        }
        nodeIdToTableNamesMap.forEach((tableNames, nodeId) => {
            this.getNode(nodeId).initializeProgress(tableNames);
        });
    }

    // we either update all the tables , and then loop through all the nodes
    // and the node results
    // or we group all the tables, and send to table to update

    public updateProgress(nodeInfos) {
        const nodeIdInfos = {};

        nodeInfos.forEach((nodeInfo) => {
            const tableName = nodeInfo.name.name;
            const nodeId = this._nameIdMap[tableName];
            if (!nodeIdInfos.hasOwnProperty(nodeId)) {
                nodeIdInfos[nodeId] = {}
            }
            const nodeIdInfo = nodeIdInfos[nodeId];
            nodeIdInfo[tableName] = nodeInfo;
        });

        for (let nodeId in nodeIdInfos) {
            this.getNode(nodeId).updateProgress(nodeIdInfos[nodeId]);
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