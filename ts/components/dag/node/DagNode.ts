// Warning, this class should only be used in the DagGraph.
// To interact with DagNode, use the public API in DagGraph.
abstract class DagNode {
    private static uid: XcUID;

    private id: DagNodeId;
    private parents: DagNode[];
    private children: DagNode[];
    private description: string;
    private title: string;
    private table: string;
    private state: DagNodeState;
    private error: string;
    private numParent: number; // non-persisent
    private events: {_events: object, trigger: Function}; // non-persistent;

    protected type: DagNodeType;
    protected subType: DagNodeSubType;
    protected lineage: DagLineage; // XXX persist or not TBD
    protected input: DagNodeInput; // will be overwritten by subClasses
    protected minParents: number; // non-persistent
    protected maxParents: number; // non-persistent
    protected maxChildren: number; // non-persistent
    protected allowAggNode: boolean; // non-persistent
    protected display: DagNodeDisplayInfo; // coordinates are persistent
    protected progressInfo: {nodes: {[key: string]: TableProgressInfo}};

    public static setup(): void {
        this.uid = new XcUID("dag");
    }

    public static generateId(): string {
        return this.uid.gen();
    }

    public constructor(options: DagNodeInfo = <DagNodeInfo>{}) {
        this.id = options.id || DagNode.generateId();
        this.type = options.type;
        this.subType = options.subType || null;

        this.parents = [];
        this.children = [];

        this.description = options.description || "";
        this.title = options.title || "";
        this.table = options.table;
        this.state = options.state || DagNodeState.Unused;
        const coordinates = options.display || {x: -1, y: -1};
        this.display = {coordinates: coordinates, icon: "", description: ""};
        this.input = new DagNodeInput({});
        this.error = options.error;

        this.numParent = 0;
        this.maxParents = 1;
        this.maxChildren = -1;
        this.allowAggNode = false;
        this.lineage = new DagLineage(this);
        this._setupEvents();

        const displayType = this.subType || this.type; // XXX temporary
        this.display.description = "Description for the " + displayType + " operation";
        this.progressInfo = {nodes: {}};
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    abstract lineageChange(columns: ProgCol[], replaceParameters?: boolean): DagLineageChange;

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
        return this.display.coordinates;
    }

    /**
     *
     * @param position new position of the node in canvas
     */
    public setPosition(position: Coordinate): void {
        this.display.coordinates.x = position.x;
        this.display.coordinates.y = position.y;
    }

    /**
     * @return {string}
     */
    public getIcon(): string {
        return this.display.icon;
    }

    /**
     * @return {string}
     */
    public getNodeDescription(): string {
        return this.display.description;
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
     * @param title
     */
    public setTitle(title: string): void {
        this.title = title;
    }

    public getTitle(): string {
        return this.title;
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
        } else if (this.validateParam() == null) {
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
    public getParam(replaceParameters?: boolean) {
        return this.input.getInput(replaceParameters);
    }

    /**
     * Return a short hint of the param, it should be one line long
     */
    public getParamHint(): string {
        const hint: string = this._genParamHint();
        const maxLen: number = 20;
        // each line cannot be more than maxLen
        const ellipsis: string[] = hint.split("\n").map((str) => {
            if (str.length > maxLen) {
                str = str.substring(0, maxLen) + "...";
            }
            return str;
        });
        return ellipsis.join("\n");
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
        return JSON.stringify(this.getNodeInfo());
    }

    /**
     * Generates JSON representing this node
     * @returns JSON object
     */
    public getNodeInfo(): DagNodeInfo {
        return this._getNodeInfoWithParents();
    }

    /**
     * Generate JSON representing this node(w/o ids), for use in copying a node
     */
    public getNodeCopyInfo(clearState: boolean = false): DagNodeCopyInfo {
        const nodeInfo = <DagNodeCopyInfo>this._getNodeInfoWithParents();
        nodeInfo.nodeId = nodeInfo.id;
        delete nodeInfo.id;
        if (clearState) {
            nodeInfo.table = null;
            if (nodeInfo.state === DagNodeState.Complete ||
                nodeInfo.state === DagNodeState.Running
            ) {
                nodeInfo.state = DagNodeState.Configured;
            }
        }
        return nodeInfo;
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
        return this.maxParents === 0;
    }

     /**
     * @returns {boolean} return true if out Node (export/ link out / publishIMD)
     * return false otherwise
     */
    public isOutNode(): boolean {
        return this.maxChildren === 0;
    }

    /**
     * @returns {boolean} return true if has no children
     * return false otherwise
     */
    public hasNoChildren(): boolean {
        return this.children.length === 0;
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
            params: this.getParam(),
            type: this.getType(),
            node: this,
            hasParameters: this.input.hasParameters()
        });
    }

    public hasParameters(): boolean {
        return this.input.hasParameters();
    }

    /**
     * Triggers an event to update this node's aggregates.
     * Primarily used by Map and Filter Nodes
     * @param aggregates: string[]
     */
    public setAggregates(aggregates: string[]): void {
        this.events.trigger(DagNodeEvents.AggregateChange, {
            id: this.getId(),
            aggregates: aggregates
        });
    }

    public setTableLock(): void {
        if (!DagTblManager.Instance.hasTable(this.table)) {
            return;
        }
        DagTblManager.Instance.toggleTableLock(this.table);
        this.events.trigger(DagNodeEvents.TableLockChange, {
            id: this.getId(),
            lock: DagTblManager.Instance.hasLock(this.table)
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

    public initializeProgress(tableNames) {
        const nodes: {[key: string]: TableProgressInfo} = {};
        tableNames.forEach((tableName: string) => {
            const tableProgressInfo: TableProgressInfo = {
                startTime: null,
                pct: 0,
                state: DgDagStateT.DgDagStateQueued,
                numRowsTotal: 0,
                numWorkCompleted: 0,
                numWorkTotal: 0,
                skewValue: 0,
                elapsedTime: 0,
                size: 0,
                rows: []
            }
            nodes[tableName] = tableProgressInfo;
        });
        this.progressInfo.nodes = nodes;
    }

    public updateProgress(tableNameMap) {
        const errorStates = [DgDagStateT.DgDagStateUnknown, DgDagStateT.DgDagStateError, DgDagStateT.DgDagStateArchiveError];
        let isComplete = true;
        let errorState = null;
        for (let tableName in tableNameMap) {
            const tableProgressInfo = this.progressInfo.nodes[tableName];
            const nodeInfo = tableNameMap[tableName];
            if (nodeInfo.state === DgDagStateT.DgDagStateProcessing &&
                tableProgressInfo.state !== DgDagStateT.DgDagStateProcessing) {
                tableProgressInfo.startTime = Date.now();

            }
            tableProgressInfo.state = nodeInfo.state;
            tableProgressInfo.elapsedTime = nodeInfo.elapsed.milliseconds;
            let progress: number = nodeInfo.numWorkCompleted / nodeInfo.numWorkTotal;
            if (isNaN(progress)) {
                progress = 0;
            }
            const pct: number = Math.round(100 * progress);
            tableProgressInfo.pct = pct;
            let rows = nodeInfo.numRowsPerNode.map(numRows => numRows);
            tableProgressInfo.skewValue = this._getSkewValue(rows);
            tableProgressInfo.numRowsTotal = nodeInfo.numRowsTotal;
            tableProgressInfo.numWorkCompleted = nodeInfo.numWorkCompleted;
            tableProgressInfo.numWorkTotal = nodeInfo.numWorkTotal;
            tableProgressInfo.rows = rows;
            tableProgressInfo.size = nodeInfo.inputSize;
            if (errorStates.indexOf(nodeInfo.state) > -1 ) {
                errorState = nodeInfo.state;
                isComplete = false;
            } else if (progress !== 1) {
                isComplete = false;
            }
        }
        if (errorState != null) {
            this.beErrorState(DgDagStateTStr[errorState]);
        } else if (isComplete) {
            this.beCompleteState();
        }
    }

    // XXX returning the average of all the queryNodes,
    // skew and rows is incorrect as
    // we're ony returning skew info of one of the queryNodes
    public getOverallStats(): {
        pct: number;
        time: number;
        rows: number[];
        skewValue: number;
        totalRows: number;
        size: number;
    } {
        let numWorkCompleted: number = 0;
        let numWorkTotal: number = 0
        let rows, skew, numRowsTotal, size;
        for (let tableName in this.progressInfo.nodes) {
            const node = this.progressInfo.nodes[tableName];
            numWorkCompleted += node.numWorkCompleted;
            numWorkTotal += node.numWorkTotal;
            rows = node.rows;
            skew = node.skewValue;
            size = node.size;
        }
        let progress: number = numWorkCompleted / numWorkTotal;
        if (isNaN(progress)) {
            progress = 0;
        }
        const pct: number = Math.round(100 * progress);
        const stats = {
            pct: pct,
            time: this._getElapsedTime(),
            rows: rows,
            skewValue: skew,
            totalRows: numRowsTotal,
            size: size
        }

        return stats;
    }

    private _getElapsedTime(): number {
        let cummulativeTime = 0;
        let curTime = Date.now();
        for (let i in this.progressInfo.nodes) {
            const tableProgressInfo = this.progressInfo.nodes[i];
            if (tableProgressInfo.state === DgDagStateT.DgDagStateProcessing) {
                cummulativeTime += curTime - tableProgressInfo.startTime;
            } else {
                cummulativeTime += tableProgressInfo.elapsedTime;
            }
        }
        return cummulativeTime;
    }

    private _getSkewValue(rows) {
        let skewness = null;
        const len = rows.length;
        const even = 1 / len;
        const total = rows.reduce(function(sum, value) {
            return sum + value;
        }, 0);
        if (total === 1) {
            // 1 row has no skewness
            skewness = 0;
        } else {
            // change to percentage
            rows = rows.map(function(row) {
                return row / total;
            });

            skewness = rows.reduce(function(sum, value) {
                return sum + Math.abs(value - even);
            }, 0);

            skewness = Math.floor(skewness * 100);
        }
        return skewness;
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
            display: xcHelper.deepCopy(this.display.coordinates),
            description: this.description,
            title: this.title,
            input: xcHelper.deepCopy(this.input.getInput()),
            id: this.id,
            state: this.state,
            error: this.error
        }
    }

    protected _genParamHint(): string {
        return "";
    }

    // validates a given input, if no input given, will validate
    // it's own input
    public validateParam(input?: any): {error: string} {
        return this.input.validate(input);
    }

    private _getNodeInfoWithParents(): DagNodeInfo {
        const parents: DagNodeId[] = this.parents.map((parent) => parent.getId());
        const seriazliedInfo = this._getSerializeInfo();
        seriazliedInfo["parents"] = parents;
        return seriazliedInfo;
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
            if (DagTblManager.Instance.hasLock(this.table)) {
                this.setTableLock();
            }
            this.events.trigger(DagNodeEvents.TableRemove, {
                table: this.table,
                nodeId: this.getId(),
                node: this
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
            let error: string = "Require " + maxParents + " parents";
            return {error: error};
        }
        return null;
    }

    public isConfigured(): boolean {
        return this.input.isConfigured();
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