// Warning, this class should only be used in the DagGraph.
// To interact with DagNode, use the public API in DagGraph.
type DagNodeId = string;

interface DagDisplyInfo {

}

interface DagStateInfo {
    state: DagNodeState;
}

interface DagNodeInfo {
    type: DagNodeType;
    id?: string;
    tableId?: string;
    display? : DagDisplyInfo;
    state? : DagStateInfo;
    input? : object;
}


class DagNode {
    private static idCount: number = 0;
    private static idPrefix: string;

    private id: DagNodeId;
    private parents: DagNode[];
    private children: DagNode[];
    private type: DagNodeType;
    private maxParents: number; // non-persistent
    private maxChildren: number: // non-persistent
    private comment: string;
    private input: object;
    private tableId: TableId;
    private display: DagDisplyInfo;
    private state: DagStateInfo;

    public static setIdPrefix(idPrefix: string): void {
        DagNode.idPrefix = idPrefix;
    }

    public static generateId(): DagNodeId {
        return DagNode.idPrefix + "." +
                new Date().getTime() + "." +
                (DagNode.idCount++);
    }

    public constructor(options: DagNodeInfo = <DagNodeInfo>{}) {
        this.id = options.id || DagNode.generateId();
        this.type = options.type;

        this.parents = [];
        this.children = [];
        this.input = options.input || {};
        this.tableId = options.tableId || null;
        this.display = options.display || {};
        this.state = options.state || {state: DagNodeState.Unused};
    }

    public getId(): DagNodeId {
        return this.id;
    }

    public getMaxParents(): number {
        if (this.maxParents == null) {
            if (this.isSourceNode()) {
                this.maxParents = 0;
            } else if (this.isTwoInputNode()) {
                this.maxParents = 2;
            } else if (this.isMultiInputNode()) {
                this.maxParents = -1;
            } else {
                // single input case
                this.maxParents = 1;
            }
        }
        
        return this.maxParents;
    }

    public getMaxChildren(): number {
        if (this.maxChildren == null) {
            this.maxChildren = this.isDestNode() ? 0 : -1;
        }
        return this.maxChildren;
    }

    // XXX TODO
    public move(xDiff: number, yDiff: number): boolean {
        return true;
    }

    /**
     *
     * @param parentNode<DagNode>
     * @param pos<number>, 0 based, the position where to connect with parentNode
     */
    public connectToParent(parentNode: DagNode, pos: number = 0): boolean {
        if (pos >= this.maxParents || this.parents[pos] != null) {
            throw "Cannot connect to parent";
        }
        this.parents[pos] = parentNode;
        return true;
    }

    public connectToChidren(childNode: DagNode): boolean {
        if (this.getMaxChildren() === 0) {
            throw "Cannot connect to children";
        }

        this.children.push(childNode);
        return true;
    }

    // XXX TODO
    public disconnectFromParent(pos: number): boolean {
        return true;
    }

    // XXX TODO
    public disconnectFromChildren(childNode: DagNode): boolean {
        return true;
    }

    // XXX TODO
    public remove(): boolean {
        return true;
    }

    public addComment(comment: string): void {
        this.comment = comment;
    }

    public removeComment(): void {
        delete this.comment;
    }

    // XXX TODO
    public geQuery(): string {
        // XXX TODO: reutrn a fake query string
        return '[{}]';
    }

    public setTableId(tableId: TableId) {
        this.tableId = tableId;
    }

    public getTableId() {
        return this.tableId;
    }

    private isSourceNode() {
        const sourceType = [DagNodeType.Dataset];
        return sourceType.includes(this.type);
    }

    private isTwoInputNode() {
        const twoInputNodes = [DagNodeType.Join];
        return twoInputNodes.includes(this.type);
    }

    private isMultiInputNode() {
        const multiInputNode = [DagNodeType.Union];
        return multiInputNode.includes(this.type);
    }

    private isDestNode() {
        const destNodes = [DagNodeType.Export];
        return destNodes.includes(this.type);
    }
}