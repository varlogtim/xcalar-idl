// Warning, this class should only be used in the DagGraph.
// To interact with DagNode, use the public API in DagGraph.
abstract class DagNode {
    private static idCount: number = 0;
    private static idPrefix: string;

    private id: DagNodeId;
    private parents: DagNode[];
    private children: DagNode[];
    private description: string;
    private table: string;
    private state: DagNodeState;
    private display: Coordinate;
    private error: string;
    private numParent: number; // non-persisent
    private events: {_events: object, trigger: Function}; // non-persistent;

    protected type: DagNodeType;
    protected subType: DagNodeType;
    protected lineage: DagLineage; // XXX persist or not TBD
    protected input: object; // will be overridden by subClasses
    protected minParents: number; // non-persistent
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
        this.subType = options.subType || null;

        this.parents = [];
        this.children = [];

        this.description = options.description || "";
        this.table = options.table;
        this.state = options.state || DagNodeState.Unused;
        this.display = options.display || {x: -1, y: -1};
        this.input = options.input || {};
        this.error = options.error;

        this.numParent = 0;
        this.maxParents = 1;
        this.maxChildren = -1;
        this.allowAggNode = false;
        this.lineage = new DagLineage(this);
        this._setupEvents();
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    abstract lineageChange(columns: ProgCol[]): DagLineageChange;

    /**
     * add events to the dag node
     * @param event {string} event name
     * @param callback {Function} call back of the event
     */
    public registerEvents(event, callback): DagNode {
        this.events._events[event] = callback;
        return this;
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
     * @returns {DagNodeSubType} node's subtype
     */
    public getSubType(): DagNodeSubType {
        return this.subType;
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
     * @returns {number} return the minimum number of parents the node is required to have
     */
    public getMinParents(): number {
        return this.minParents;
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
     * @returns {string} return user's description
     */
    public getDescription(): string {
        return this.description;
    }

    /**
     *
     * @param description user description for the node
     */
    public setDescription(description: string): void {
        this.description = description;
    }

    /**
     * remove description
     */
    public removeDescription(): void {
        delete this.description;
    }

    /**
     * @return {string} get error string
     */
    public getError(): string {
        return this.error
    }

    /**
     *
     * @returns {DagNodeState} return the state of the node
     */
    public getState(): DagNodeState {
        return this.state;
    }

    /**
     * switch from configured/complete/error state to other configured/error state
     */
    public switchState(): void {
        if (!this.isConfigured()) {
            // it's in unsed state, but it may still has caches of lineage
            this._clearConnectionMeta();
            return;
        }
        const error: {error: string} = this._validateParents();
        if (error != null) {
            // when it's not source node but no parents, it's in error state
            this.beErrorState(error.error);
        } else if (this._validateParam() == null) {
            this.beConfiguredState();
        } else {
            this.beErrorState("Invalid Configuration");
        }
    }

     /**
     * Change node to configured state
     */
    public beConfiguredState(): void {
        this._setState(DagNodeState.Configured);
        this._clearConnectionMeta();
        this.events.trigger(DagNodeEvents.SubGraphConfigured, {
            id: this.getId()
        });
    }

    /**
     * Change node to running state
     */
    public beRunningState(): void {
        this._setState(DagNodeState.Running);
        this._removeTable();
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
    public beErrorState(error?: string): void {
        this.error = error || this.error;
        this._setState(DagNodeState.Error);
        this._clearConnectionMeta();
        this.events.trigger(DagNodeEvents.SubGraphError, {
            id: this.getId(),
            error: this.error
        });
    }

    /**
     * Get Param
     */
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
            // We use delete in order to preserve left/right parent for a Join node.
            // The undefined shows up in serialization, but it is not connected to
            // upon deserialization.
            delete this.parents[pos];
        }

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

    /**
     * Generates string representing this node, for use in serializing a dagGraph.
     * @returns {string}
     */
    public serialize(): string {
        const parents: DagNodeId[] = this.parents.map((parent) => parent.getId());
        const seriazliedInfo = this._getSerializeInfo();
        seriazliedInfo["parents"] = parents;
        return JSON.stringify(seriazliedInfo);
    }

    /**
     * @returns {boolean} return true if allow connect aggregate node,
     * return false otherwise
     */
    public isAllowAggNode(): boolean {
        return this.allowAggNode;
    }

    /**
     * @returns {boolean} return true if it's a source node (datasets/IMD)
     * return false otherwise
     */
    public isSourceNode(): boolean {
        return this.numParent === 0;
    }

    /**
     * @return {number} finds the first parent index that is empty
     */
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

    /**
     * @returns {DagLineage} return dag lineage information
     */
    public getLineage(): DagLineage {
        return this.lineage;
    }

    public setParam(_param?: any): void {
        this.events.trigger(DagNodeEvents.ParamChange, {
            id: this.getId(),
            params: this.getParam()
        });
    }

    /**
     * Get a list of index of the given parent node
     * @param parentNode 
     * @returns A list of index(Empty list if the node is not a parent)
     */
    public findParentIndices(parentNode: DagNode): number[] {
        const result: number[] = [];
        const parents = this.getParents();
        for (let i = 0; i < parents.length; i ++) {
            if (parents[i] === parentNode) {
                result.push(i);
            }
        }
        return result;
    }

    protected _clearConnectionMeta(): void {
        this._removeTable();
        this.lineage.reset(); // lineage will change
    }

    // Custom dagNodes will have their own serialize/deserialize for
    // Their dagGraphs
    protected _getSerializeInfo(): DagNodeInfo {
        return {
            type: this.type,
            subType: this.subType,
            table: this.table,
            display: this.display,
            description: this.description,
            input: this.input,
            id: this.id,
            state: this.state,
            error: this.error
        }
    }

    protected _validateParam(): {error: string} {
        return null;
    }

    private _getNonAggParents(): DagNode[] {
        return this.parents.filter((parent) => parent.getType() !== DagNodeType.Aggregate);
    }

    private _canHaveMultiParents() {
        return this.maxParents === -1;
    }

    private _setState(state: DagNodeState): void {
        const oldState: DagNodeState = this.state;
        this.state = state;
        this.events.trigger(DagNodeEvents.StateChange, {
            id: this.getId(),
            oldState: oldState,
            state: state,
            node: this
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

    private _removeTable(): void {
        if (this.table) {
            this.events.trigger(DagNodeEvents.TableRemove, {
                table: this.table,
                nodeId: this.getId()
            });
            delete this.table;
        }
    }


    private _validateParents(): {error: string} {
        const maxParents = this.getMaxParents();
        const numParent = this.getNumParent();
        if (maxParents === -1) {
            const minParents = this.getMinParents();
            if (numParent < minParents) {
                let error: string = "Require at least " + minParents + " parents";
                return {error: error};
            }
        } else if (numParent !== this.getMaxParents()) {
            let error: string = "Require " + numParent + " parents";
            return {error: error};
        }
        return null;
    }

    public isConfigured(): boolean {
        return Object.keys(this.input).length > 0;
    }

    public applyColumnMapping(_map, _index: number): void {
        if (this.isConfigured()) {
            return;
        }
        this.setParam();
    }

    protected _replaceColumnInEvalStr(evalStr: string, columnMap): string {
        const parsedEval: ParsedEval = XDParser.XEvalParser.parseEvalStr(evalStr);
        if (parsedEval.error) {
            return evalStr;
        }
        recursiveTraverse(parsedEval);
        return xcHelper.stringifyEval(parsedEval);

        function recursiveTraverse(evalStruct) {
            evalStruct.args.forEach((arg: ParsedEvalArg) => {
                if (arg.type === "columnArg") {
                    if (columnMap[arg.value]) {
                        arg.value = columnMap[arg.value];
                    }
                } else if (arg.type === "fn") {
                    recursiveTraverse(arg);
                }
            });
        }
    }
}