// Warning, this class should only be used in the DagGraph.
// To interact with DagNode, use the public API in DagGraph.
class DagNode {
    private static idCount: number = 0;
    private static idPrefix: string;

    private id: DagNodeId;
    private parents: DagNode[];
    private children: DagNode[];
    private comment: string;
    private table: string;
    private state: DagNodeState;
    private display: Coordinate;
    private numParent: number; // non-persisent
    private events: {_events: object, trigger: Function}; // non-persistent;

    protected type: DagNodeType;
    protected input: object; // will be overridden by subClasses
    protected maxParents: number; // non-persistent
    protected maxChildren: number; // non-persistent
    protected allowAggNode: boolean; // non-persistent

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

        this.comment = options.comment;
        this.table = options.table;
        this.state = options.state || DagNodeState.Unused;
        this.display = options.display || {x: -1, y: -1};
        this.input = options.input || {};

        this.numParent = 0;
        this.maxParents = 1;
        this.maxChildren = -1;
        this.allowAggNode = false;
        this._setupEvents();
    }

    /**
     * add events to the dag node
     * @param event {string} event name
     * @param callback {Function} call back of the event
     */
    public registerEvents(event, callback): void {
        this.events._events[event] = callback;
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
     * Change node to unused state
     */
    public beUnusedState(): void {
        this._setState(DagNodeState.Unused);
    }

    /**
     * Change node to connected state
     */
    public beConnectedState(): void {
        this._setState(DagNodeState.Connected);
    }

    /**
     * Change node to running state
     */
    public beRunningState(): void {
        this._setState(DagNodeState.Running)
    }

    /**
     * Change node to complete state
     */
    public beCompleteState(): void {
        this._setState(DagNodeState.Complete);
    }

    /**
     * Change to error state
     */
    public beErrorState(): void {
        this._setState(DagNodeState.Error);
    }

    public getParam(): object {
        return this.input;
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
            if (!this._canHaveMultiParents() && this._getNonAggParents().length >= maxParents) {
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
    public connectToChild(childNode: DagNode): void {
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

        // XXX Rudy - I think it should retain params
        this._removeParam(pos);
        this.numParent--;
    }

    /**
     * Disconnect from children, if node connect to the same children more than
     * once (e.g. self-join, union...), remove the first occurred one
     * @param pos the index of the child node that will be disconnected
     */
    public disconnectFromChild(childNode: DagNode): void {
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] === childNode) {
                this.children.splice(i, 1);
                return;
            }
        }
        throw new Error("Dag " + childNode.getId() + " is not child of " + this.getId());
    }

    // XXX TODO - generates string that gets saved in kv store
    public serialize(): string {
        // console.warn("to be implemented!");
        // const parents = this.parents.map(function(parent) {
        //     return parent.getId()
        // });
        // const children = this.children.map(function(child) {
        //     return child.getId()
        // });

        // return JSON.stringify({
        //     parents: parents,
        //     children: children,
        //     type: this.type,
        //     comment: this.comment,
        //     input: this.input,
        //     id: this.id
        // });

        return "";
    }

    public isAllowAggNode(): boolean {
        return this.allowAggNode;
    }

    // finds the first parent index that is empty
    public getNextOpenConnectionIndex(): number {
        let limit;
        if (this.allowAggNode || this._canHaveMultiParents()) {
            limit = this.parents.length + 1;
        } else {
            limit = this.maxParents;
        }
        for (let i = 0; i < limit; i++) {
            if (this.parents[i] == null) {
                return i;
            }
        }
        return -1;
    }

    private _getNonAggParents(): DagNode[] {
        return this.parents.filter((parent) => parent.getType() !== DagNodeType.Aggregate);
    }

    private _canHaveMultiParents() {
        return this.maxParents === -1;
    }

    private _setState(state: DagNodeState): void {
        this.state = state;
        this.events.trigger(DagNodeEvents.StateChange, {
            id: this.getId(),
            state: state
        });
    }

    private _setupEvents(): void {
        this.events = {
            _events: {},
            trigger: (event, ...args) => {
                if (typeof this.events._events[event] === 'function') {
                    this.events._events[event].apply(this, args);
                }
            }
        };
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