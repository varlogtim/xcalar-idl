// Warning, this class should only be used in the DagGraph.
// To interact with DagNode, use the public API in DagGraph.
type DagNodeId = string;

interface DagNodeInfo {
    type: DagNodeType;
    id?: string;
    input? : DagNodeInput;
    comment?: string;
    table?: string;
    state?: DagNodeState;
    display? : Coordinate;
}

class DagNode {
    private static idCount: number = 0;
    private static idPrefix: string;

    private id: DagNodeId;
    private parents: DagNode[];
    private children: DagNode[];
    private type: DagNodeType;
    private maxParents: number; // non-persistent
    private maxChildren: number; // non-persistent
    private numParent: number; // non-persisent
    private allowAggNode: boolean; // non-persistent
    private comment: string;
    private input: DagNodeInput;
    private table: string;
    private state: DagNodeState;
    private display: Coordinate;

    public static setIdPrefix(idPrefix: string): void {
        DagNode.idPrefix = idPrefix;
    }

    public static generateId(): string {
        return "dag." + DagNode.idPrefix + "." +
                new Date().getTime() + "." + (DagNode.idCount++);
    }

    public constructor(options: DagNodeInfo = <DagNodeInfo>{}) {
        this.id = options.id || DagNode.generateId();
        this.type = options.type;

        this.parents = [];
        this.children = [];
        this.input = options.input || {};
        this.comment = options.comment;
        this.table = options.table;
        this.state = options.state || DagNodeState.Unused;
        this.display = options.display || {x: -1, y: -1};

        this.maxParents = this._maxParents();
        this.maxChildren = this._maxChildren();
        this.allowAggNode = this._allowAggNode();
        this.numParent = 0;
    }

    /**
     *
     * @returns {string} return the id of the dag node
     */
    public getId(): DagNodeId {
        return this.id;
    }

    /**
     * @returns {DagNodeType} node's type
     */
    public getType(): DagNodeType {
        return this.type;
    }

    /**
     *
     * @returns {number} return how many parents the node can have valid values are: 0, 1, 2, -1, where -1 means unlimited parents
     */
    public getMaxParents(): number {
        return this.maxParents;
    }

    /**
     *
     * @return {number} return how many children the node can have valid values are 0 and -1, where -1 means unlimited children
     */
    public getMaxChildren(): number {
        return this.maxChildren;
    }

    /**
     * @returns {DagNode[]} return all parent nodes
     */
    public getParents(): DagNode[] {
        return this.parents;
    }

    /**
     * @returns {number} current number of connected parent
     */
    public getNumParent(): number {
        return this.numParent;
    }

    /**
     * @returns {DagNode[]} return all child nodes
     */
    public getChildren(): DagNode[] {
        return this.children;
    }

    /**
     * @returns {Coordinate} the position of the node
     */
    public getPosition(): Coordinate {
        return this.display;
    }

    /**
     *
     * @param position new position of the node in canvas
     */
    public setPosition(position: Coordinate): void {
        this.display.x = position.x;
        this.display.y = position.y;
    }

    /**
     *
     * @returns {string} return user's comment
     */
    public getComment(): string {
        return this.comment;
    }

    /**
     *
     * @param comment user comment for the node
     */
    public setComment(comment: string): void {
        this.comment = comment;
    }

    /**
     * remove comment
     */
    public removeComment(): void {
        delete this.comment;
    }

    /**
     *
     * @returns {DagNodeState} return the state of the node
     */
    public getState(): DagNodeState {
        return this.state;
    }

    /**
     *
     * @param state set state of the node
     */
    public setState(state: DagNodeState): void {
        this.state = state;
    }

    /**
     * @returns {Table} return id of the table that associated with the node
     */
    public getTable(): string {
        return this.table;
    }

    /**
     * attach table to the node
     * @param tableName the name of the table associated with the node
     */
    public setTable(tableName: string) {
        this.table = tableName;
    }

    /**
     * deattach table from the node
     */
    public removeTable(): void {
        delete this.table;
    }

    /**
     * @returns {DagNodeInput}, return the parameters of the node
     */
    public getParams(): DagNodeInput {
        return this.input;
    }


    // XXX TODO
    public setParams(input: DagNodeInput) {
        console.warn("not fully implemented!");
        // XXXX this is only a sample
        this.input = input;
    }

    /**
     *
     * @param parentNode parent node to connected to
     * @param pos 0 based, the position where to connect with parentNode
     */
    public connectToParent(parentNode: DagNode, pos: number = 0): void {
        if (this.parents[pos] != null) {
            throw new Error("Pos " + pos + " already has parent")
        } else if (parentNode.getType() === DagNodeType.Aggregate) {
            if (!this.allowAggNode) {
                throw new Error("This node cannot connect with agg node");
            }
        } else {
            const maxParents: number = this.getMaxParents();
            if (maxParents >= 0 && this._getNonAggParents().length >= maxParents) {
                throw new Error("Node has maximum parents connected");
            }
        }

        this.parents[pos] = parentNode;
        this.numParent++;
    }

    /**
     *
     * @param childNode child node to connected to
     */
    public connectToChidren(childNode: DagNode): void {
        if (this.getMaxChildren() === 0) {
            throw new Error("Node has maximum children connected");
        }

        this.children.push(childNode);
    }

    /**
     *
     * @param pos the index of the parent node that will be disconnected
     */
    public disconnectFromParent(parentNode: DagNode, pos: number): void {
        if (this.parents[pos] == null) {
            throw new Error("Parent in pos " + pos + " is empty");
        }
        if (this.parents[pos] !== parentNode) {
            throw new Error("Parent in pos " + pos + " is not " + parentNode.getId());
        }

        if (this._canHaveMultiParents()) {
            this.parents.splice(pos, 1);
        } else {
            delete this.parents[pos];
        }

        this._removeParam(pos);
        this.numParent--;
    }

    /**
     * Disconnect from children, if node connect to the same children more than
     * once (e.g. self-join, union...), remove the first occurred one
     * @param pos the index of the child node that will be disconnected
     */
    public disconnectFromChildren(childNode: DagNode): void {
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] === childNode) {
                this.children.splice(i, 1);
                return;
            }
        }
        throw new Error("Dag " + childNode.getId() + " is not child of " + this.getId());
    }

    // XXX TODO
    public serialize(): string {
        console.warn("to be implemented!");
        return "";
    }

    private _isSourceNode(): boolean {
        const sourceType = [DagNodeType.Dataset];
        return sourceType.includes(this.type);
    }

    private _isTwoInputNode(): boolean {
        const twoInputNodes = [DagNodeType.Join];
        return twoInputNodes.includes(this.type);
    }

    private _isMultiInputNode(): boolean {
        const multiInputNode = [DagNodeType.Union];
        return multiInputNode.includes(this.type);
    }

    private _isDestNode(): boolean {
        const destNodes = [DagNodeType.Export];
        return destNodes.includes(this.type);
    }

    private _allowAggNode(): boolean {
        const allowedNodes = [DagNodeType.Map, DagNodeType.Filter,
            DagNodeType.Aggregate, DagNodeType.GroupBy];
        return allowedNodes.includes(this.type);
    }

    private _maxParents(): number {
        if (this._isSourceNode()) {
            return 0;
        } else if (this._isTwoInputNode()) {
            return 2;
        } else if (this._isMultiInputNode()) {
            return -1;
        } else {
            // single input case
            return 1;
        }
    }

    private _maxChildren(): number {
        return this._isDestNode() ? 0 : -1;
    }

    private _getNonAggParents(): DagNode[] {
        return this.parents.filter((parent) => parent.getType() !== DagNodeType.Aggregate);
    }

    private _canHaveMultiParents() {
        return this.maxParents === -1;
    }

    // XXX TODO
    private _initParam(): void {

    }

    // XXX TODO
    private _removeParam(pos: number): void {
        // const multiNode = this._canHaveMultiParents();

        // for (let key in this.input) {
        //     if (this.input[key] instanceof Array) {
        //         if (multiNode) {
        //             delete this.input[key][pos];
        //         } else {
        //             this.input[key].splice(pos);
        //         }
        //     }
        // }
    }
}