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
    private configured: boolean;
    private numParent: number; // non-persisent


    protected events: {_events: object, trigger: Function}; // non-persistent;
    protected type: DagNodeType;
    protected subType: DagNodeSubType;
    protected lineage: DagLineage; // XXX persist or not TBD
    protected input: DagNodeInput; // will be overwritten by subClasses
    protected minParents: number; // non-persistent
    protected maxParents: number; // non-persistent
    protected maxChildren: number; // non-persistent
    protected aggregates: string[];
    protected allowAggNode: boolean; // non-persistent
    protected display: DagNodeDisplayInfo; // coordinates are persistent
    protected runStats: {
        nodes: {[key: string]: TableRunStats},
        hasRun: boolean
    };

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
        if (this.state === DagNodeState.Running) {
            // cannot be running state when create
            this.state = DagNodeState.Configured;
        }
        const coordinates = options.display || {x: -1, y: -1};
        this.display = {coordinates: coordinates, icon: "", description: ""};
        this.input = new DagNodeInput({});
        this.error = options.error;
        this.aggregates = options.aggregates || [];

        this.numParent = 0;
        this.maxParents = 1;
        this.maxChildren = -1;
        this.allowAggNode = false;
        this.lineage = new DagLineage(this);
        this._setupEvents();

        const displayType = this.subType || this.type; // XXX temporary
        this.display.description = "Description for the " + displayType + " operation";
        this.runStats = {
            hasRun: false,
            nodes: {}
        };
        if (options.stats && !$.isEmptyObject(options.stats)) {
            this.runStats.nodes = options.stats;
            this.runStats.hasRun = true;
        }
        this.configured = this.configured || options.configured || false;
        if (this.configured && this.state === DagNodeState.Unused) {
            this.state = DagNodeState.Configured;
        } else if (this.state !== DagNodeState.Unused &&
                this.state !== DagNodeState.Error) {
            this.configured = true;
        }
        if (this.aggregates.length > 0) {
            const namedAggs = DagAggManager.Instance.getAggMap();
            const self = this;
            let errorAggs = [];
            this.aggregates.forEach((aggregateName: string) => {
                if (!namedAggs[aggregateName]) {
                    errorAggs.push(aggregateName);
                }
            });
            if (errorAggs.length) {
                self.beErrorState(StatusMessageTStr.AggregateNotExist + errorAggs);
            }
        }
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    abstract lineageChange(columns: ProgCol[], replaceParameters?: boolean): DagLineageChange;

    protected abstract _getColumnsUsedInInput(): Set<string>;

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
        this.events.trigger(DagNodeEvents.DescriptionChange, {
            id: this.getId(),
            text: this.description
        });
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
    public setTitle(title: string, isChange?: boolean): void {
        this.title = title;
        if (isChange) { // prevents event from firing when title is set when
            // new node is created
            this.events.trigger(DagNodeEvents.TitleChange, {
                id: this.getId(),
                node: this,
                title: title
            });
        }
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
        let error: {error: string} = this._validateConfiguration();
        if (error != null) {
            // when it's not source node but no parents, it's in error state
            this.beErrorState(error.error);
        } else {
            this.beConfiguredState();
        }
    }

     /**
     * Change node to configured state
     */
    public beConfiguredState(): void {
        this.configured = true;
        this._setState(DagNodeState.Configured);
        this._clearConnectionMeta();
    }

    /**
     * Change node to running state
     */
    public beRunningState(): void {
        this.configured = true;
        this._setState(DagNodeState.Running);
        this._removeTable();
    }

    /**
     * Change node to complete state
     */
    public beCompleteState(): void {
        this.configured = true;
        this._setState(DagNodeState.Complete);
    }

    /**
     * Change to error state
     */
    public beErrorState(error?: string): void {
        this.error = error || this.error;
        this._setState(DagNodeState.Error);
        this._clearConnectionMeta();
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
    public getParamHint(): {hint: string, fullHint: string} {
        const hint: string = this._genParamHint();
        const maxLen: number = 20;
        // each line cannot be more than maxLen
        const ellipsis: string[] = hint.split("\n").map((str) => {
            if (str.length > maxLen) {
                str = str.substring(0, maxLen) + "...";
            }
            return str;
        });
        return {
            hint: ellipsis.join("\n"),
            fullHint: hint
        };
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
    public connectToParent(
        parentNode: DagNode,
        pos: number = 0,
        spliceIn?: boolean
    ): void {
        if (this.parents[pos] != null && !spliceIn) {
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
        if (spliceIn) {
            this.parents.splice(pos, 0, parentNode);
        } else {
            this.parents[pos] = parentNode;
        }

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
     * @returns whether the index was spliced
     */
    public disconnectFromParent(parentNode: DagNode, pos: number): boolean {
        if (this.parents[pos] == null) {
            throw new Error("Parent in pos " + pos + " is empty");
        }
        if (this.parents[pos] !== parentNode) {
            throw new Error("Parent in pos " + pos + " is not " + parentNode.getId());
        }

        let spliced = false;
        if (this._canHaveMultiParents()) {
            this.parents.splice(pos, 1);
            spliced = true;
        } else if (this.minParents === 1 && this.maxParents === 1) {
            this.parents.splice(pos, 1);
            // no need to track if spiced;
        } else {
            // We use delete in order to preserve left/right parent for a Join node.
            // The undefined shows up in serialization, but it is not connected to
            // upon deserialization.
            delete this.parents[pos];
        }

        this.numParent--;
        return spliced;
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

    public getSerializableObj(includeStats?: boolean): DagNodeInfo {
        return this.getNodeInfo(includeStats);
    }

    /**
     * Generates JSON representing this node
     * @returns JSON object
     */
    public getNodeInfo(includeStats?: boolean): DagNodeInfo {
        return this._getNodeInfoWithParents(includeStats);
    }

    /**
     * Generate JSON representing this node(w/o ids), for use in copying a node
     * @param clearState used when copying table to remove table reference
     * and ensure copy does't have a running or complete state
     */
    public getNodeCopyInfo(clearState: boolean = false): DagNodeCopyInfo {
        const nodeInfo = <DagNodeCopyInfo>this._getNodeInfoWithParents();
        nodeInfo.nodeId = nodeInfo.id;
        delete nodeInfo.id;
        if (clearState) {
            delete nodeInfo.table;
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
     * @returns {boolean} return true if out Node (export/ link out / publishIMD / updateIMD)
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
        if (this._canHaveMultiParents()) {
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

    public setParam(_param?: any, noAutoExecute?: boolean): void {
        if (!this.input.hasParametersChanges() && this.configured) {
            // when there is no change
            return;
        }
        this.configured = true;
        this.events.trigger(DagNodeEvents.ParamChange, {
            id: this.getId(),
            params: this.getParam(),
            type: this.getType(),
            node: this,
            hasParameters: this.input.hasParameters(),
            noAutoExecute: noAutoExecute
        });
    }

    public hasParameters(): boolean {
        return this.input.hasParameters();
    }

    /**
     * @returns {string[]} used aggregates
     */
    public getAggregates(): string[] {
        return this.aggregates;
    }

    /**
     * Triggers an event to update this node's aggregates.
     * Primarily used by Map and Filter Nodes
     * @param aggregates: string[]
     */
    public setAggregates(aggregates: string[]): void {
        let aggSet: Set<string> = new Set();
        let finalAggs: string[] = [];
        for(let i = 0; i < aggregates.length; i++) {
            let agg: string = aggregates[i];
            if (aggSet.has(agg)) {
                continue;
            } else {
                finalAggs.push(agg);
                aggSet.add(agg);
            }
        }
        this.aggregates = finalAggs;
        this.events.trigger(DagNodeEvents.AggregateChange, {
            id: this.getId(),
            aggregates: finalAggs
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
        const nodes: {[key: string]: TableRunStats} = {};
        tableNames.forEach((tableName: string) => {
            const tableRunStats: TableRunStats = {
                startTime: null,
                pct: 0,
                state: DgDagStateT.DgDagStateQueued,
                numRowsTotal: 0,
                numWorkCompleted: 0,
                numWorkTotal: 0,
                skewValue: 0,
                elapsedTime: 0,
                size: 0,
                rows: [],
                hasStats: false
            }
            nodes[tableName] = tableRunStats;
        });
        this.runStats.nodes = nodes;
    }

    /**
     *
     * @param tableNameMap
     * @param includesAllTables in the case of optimized dataflows and other subGraphs(SQL),
     * we know tableNameMap has the progress information for every node/table in the execution
     * but for regular execution, the tableNameMap may only contain 1 of the operations
     * in a multi-operation node - includesAllTables would be false in this case so that we
     * don't set the node to completed if there are other operations that will occur for that node
     */
    public updateProgress(tableNameMap, includesAllTables?: boolean) {
        const errorStates = [DgDagStateT.DgDagStateUnknown, DgDagStateT.DgDagStateError, DgDagStateT.DgDagStateArchiveError];
        let isComplete = true;
        let errorState = null;
        this.runStats.hasRun = true;
        let tableCount = Object.keys(this.runStats.nodes).length;
        for (let tableName in tableNameMap) {
            let tableRunStats = this.runStats.nodes[tableName];
            if (!tableRunStats) {
                tableRunStats = {
                    startTime: null,
                    pct: 0,
                    state: DgDagStateT.DgDagStateQueued,
                    numRowsTotal: 0,
                    numWorkCompleted: 0,
                    numWorkTotal: 0,
                    skewValue: 0,
                    elapsedTime: 0,
                    size: 0,
                    rows: [],
                    index: tableCount,
                    hasStats: true
                };
                this.runStats.nodes[tableName] = tableRunStats;
                tableCount++;
            }

            const nodeInfo = tableNameMap[tableName];
            if (nodeInfo.state === DgDagStateT.DgDagStateProcessing &&
                tableRunStats.state !== DgDagStateT.DgDagStateProcessing) {
                tableRunStats.startTime = Date.now();
            }
            tableRunStats.name = tableName;
            tableRunStats.type = nodeInfo.api;
            tableRunStats.state = nodeInfo.state;
            tableRunStats.hasStats = true;
            if (tableRunStats.index == null) {
                // if tableRunStats already has index, then the one it has
                // is more reliable
                tableRunStats.index = nodeInfo.index;
            }

            let elapsedTime;
            if (tableRunStats.state === DgDagStateT.DgDagStateProcessing) {
                elapsedTime = Date.now() - tableRunStats.startTime;
            } else {
                elapsedTime = nodeInfo.elapsed.milliseconds;
            }

            tableRunStats.numWorkTotal = nodeInfo.numWorkTotal;
            if (nodeInfo.state === DgDagStateT.DgDagStateReady) {
                // if node is finished, numWorkCompleted should be equal
                // to numWorkTotal even if backend doesn't return the correct value
                tableRunStats.numWorkCompleted = nodeInfo.numWorkTotal;
            } else {
                tableRunStats.numWorkCompleted = nodeInfo.numWorkCompleted;
            }

            tableRunStats.elapsedTime = elapsedTime;
            let progress: number = 0;
            if (nodeInfo.state === DgDagStateT.DgDagStateProcessing ||
                nodeInfo.state === DgDagStateT.DgDagStateReady) {
                progress = tableRunStats.numWorkCompleted / tableRunStats.numWorkTotal;
            }
            if (isNaN(progress)) {
                progress = 0;
            }
            const pct: number = Math.round(100 * progress);
            tableRunStats.pct = pct;
            let rows = nodeInfo.numRowsPerNode.map(numRows => numRows);
            tableRunStats.skewValue = this._getSkewValue(rows);
            tableRunStats.numRowsTotal = nodeInfo.numRowsTotal;

            tableRunStats.rows = rows;
            tableRunStats.size = nodeInfo.inputSize;

            if (errorStates.indexOf(nodeInfo.state) > -1 ) {
                errorState = nodeInfo.state;
                isComplete = false;
            } else if (progress !== 1) {
                isComplete = false;
            }
        }
        if (errorState != null) {
            this.beErrorState(DgDagStateTStr[errorState]);
        } else if (isComplete && includesAllTables) {
            this.beCompleteState();
        }
    }

    // XXX returning the average of all the queryNodes,
    // skew and rows is incorrect as
    // we're ony returning skew info of one of the queryNodes
    public getOverallStats(): {
        pct: number,
        time: number,
        rows: number[],
        skewValue: number,
        totalRows: number,
        size: number,
        started: boolean
    } {
        let numWorkCompleted: number = 0;
        let numWorkTotal: number = 0
        let numRowsTotal: number = 0;
        let rows, skew, size;
        for (let tableName in this.runStats.nodes) {
            const node = this.runStats.nodes[tableName];
            if (node.state === DgDagStateT.DgDagStateProcessing ||
                node.state === DgDagStateT.DgDagStateReady) {
                numWorkCompleted += node.numWorkCompleted;
                numWorkTotal += node.numWorkTotal;
                numRowsTotal += node.numRowsTotal;
            }
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
            size: size,
            started: Object.keys(this.runStats.nodes).length > 0
        };

        return stats;
    }


    public getIndividualStats(formatted?: boolean): any[] {
        const nodesArray = [];
        if (formatted) {
            const nodes = xcHelper.deepCopy(this.runStats.nodes);
            for (let name in nodes) {
                const node = nodes[name];
                delete node.startTime;
                node.state = DgDagStateTStr[node.state];
                node.type = XcalarApisTStr[node.type];
                if (node.hasStats) {
                    nodesArray.push(node);
                }
            }
        } else {
            for (let name in this.runStats.nodes) {
                const node = this.runStats.nodes[name];
                if (node.hasStats) {
                    nodesArray.push(node);
                }
            }
        }
        nodesArray.sort((a,b) => {
            if (a.index > b.index) {
                return 1;
            } else {
                return -1;
            }
        });
        return nodesArray;
    }

    /**
     * Check if number of parents is unlimited
     */
    public canHaveMultiParents(): boolean {
        return this._canHaveMultiParents();
    }

    /**
     * @returns the text displayed in the center of the node
     */
    public getDisplayNodeType(): string {
        const nodeType: string = this.type;
        let displayNodeType = xcHelper.capitalize(nodeType);
        if (displayNodeType === "Sql") {
            displayNodeType = "SQL";
        }
        if (this instanceof DagNodeCustom) {
            displayNodeType = this.getCustomName();
        } else if (this instanceof DagNodeCustomInput) {
            displayNodeType = this.getPortName();
        }
        if (this.subType) {
            let nodeSubType: string = this.getSubType() || "";
            nodeSubType = xcHelper.capitalize(nodeSubType);
            if (nodeSubType) {
                displayNodeType = nodeSubType;
            }
        }
        return displayNodeType;
    }



    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": true,
        "required": [
          "type",
          "input",
          "nodeId",
          "parents",
          "configured"
        ],
        "properties": {
          "type": {
            "$id": "#/properties/type",
            "type": "string",
            "title": "The Type Schema",
            "default": "",
            "examples": [
              "join"
            ],
            "pattern": "^(.*)$"
          },
          "subType": {
            "$id": "#/properties/subType",
            "type": ["string", "null"],
            "title": "The Subtype Schema",
            "default": "",
            "examples": [
              "something"
            ],
            "pattern": "^(.*)$"
          },
          "table": {
            "$id": "#/properties/table",
            "type": ["string", "null"],
            "title": "The Table Schema",
            "default": "",
            "examples": [
              "something"
            ],
            "pattern": "^(.*)$"
          },
          "display": {
            "$id": "#/properties/display",
            "type": ["object", "null"],
            "title": "The Display Schema",
            "additionalProperties": true,
            "required": [
              "x",
              "y"
            ],
            "properties": {
              "x": {
                "$id": "#/properties/display/properties/x",
                "type": "integer",
                "title": "The X Schema",
                "default": 0,
                "examples": [
                  460
                ]
              },
              "y": {
                "$id": "#/properties/display/properties/y",
                "type": "integer",
                "title": "The Y Schema",
                "default": 0,
                "examples": [
                  100
                ]
              }
            }
          },
          "description": {
            "$id": "#/properties/description",
            "type": "string",
            "title": "The Description Schema",
            "default": "",
            "examples": [
              "something"
            ]
          },
          "title": {
            "$id": "#/properties/title",
            "type": "string",
            "title": "The Title Schema",
            "default": "",
            "examples": [
              "Node 5"
            ]
          },
          "input": {
            "$id": "#/properties/input",
            "type": "object",
            "title": "The Input Schema",
            "additionalProperties": true
          },
          "state": {
            "$id": "#/properties/state",
            "type": "string",
            "title": "The State Schema",
            "default": "",
            "examples": [
              "Configured"
            ],
            "pattern": "^(.*)$"
          },
          "error": {
            "$id": "#/properties/error",
            "type": "string",
            "title": "The Error Schema",
            "default": "",
            "examples": [
              "something"
            ]
          },
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "title": "The Parents Schema",
            "items": {
              "$id": "#/properties/parents/items",
              "type": ["string", "null"],
              "title": "The Items Schema",
              "default": "",
              "examples": [
                "dag_5BEF114C1C1DB6DA_1543440502156_56",
                "dag_5BEF114C1C1DB6DA_1543440508632_58"
              ],
              "pattern": "^(.*)$"
            }
          },
          "nodeId": {
            "$id": "#/properties/nodeId",
            "type": "string",
            "title": "The Nodeid Schema",
            "default": "",
            "examples": [
              "dag_5BEF114C1C1DB6DA_1543440508929_59"
            ],
            "pattern": "^(.*)$"
          },
          "configured": {
            "$id": "#/properties/configured",
            "type": "boolean",
            "title": "The Configured Schema",
            "default": false,
            "examples": [
              false
            ]
          },
          "aggregates": {
            "$id": "#/properties/aggregates",
            "type": "array",
            "title": "The Aggregates Schema",
            "items": {
              "$id": "#/properties/aggregates/items",
              "type": "string",
              "title": "The Items Schema",
              "default": "",
              "examples": [
                "sdf"
              ],
              "pattern": "^(.*)$"
            }
          },
          "schema": {
            "$id": "#/properties/schema",
            "type": "array",
            "title": "The Schema Schema",
            "items": {
              "$id": "#/properties/schema/items",
              "type": "object",
              "title": "The Items Schema",
              "additionalProperties": true,
              "required": [
                "name",
                "type"
              ],
              "properties": {
                "name": {
                  "$id": "#/properties/schema/items/properties/name",
                  "type": "string",
                  "title": "The Name Schema",
                  "default": "",
                  "examples": [
                    "airlines1::MonthDayYear"
                  ],
                  "pattern": "^(.*)$"
                },
                "type": {
                  "$id": "#/properties/schema/items/properties/type",
                  "type": "string",
                  "title": "The Type Schema",
                  "default": "",
                  "examples": [
                    "string"
                  ],
                  "pattern": "^(.*)$"
                }
              }
            }
          }
        }
    };



    private _getElapsedTime(): number {
        let cummulativeTime = 0;
        let curTime = Date.now();
        for (let i in this.runStats.nodes) {
            const tableRunStats = this.runStats.nodes[i];
            if (tableRunStats.state === DgDagStateT.DgDagStateProcessing) {
                cummulativeTime += curTime - tableRunStats.startTime;
            } else {
                cummulativeTime += tableRunStats.elapsedTime;
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
    protected _getSerializeInfo(includeStats?: boolean): DagNodeInfo {
        const info = {
            type: this.type,
            subType: this.subType,
            table: this.table,
            display: xcHelper.deepCopy(this.display.coordinates),
            description: this.description,
            title: this.title,
            input: xcHelper.deepCopy(this.input.getInput()),
            id: this.id,
            state: this.state,
            error: this.error,
            configured: this.configured,
            aggregates: this.aggregates
        };
        if (includeStats) {
            if (this.runStats.hasRun) {
                info.stats = this.runStats.nodes;
            } else {
                info.stats = {};
            }
        }
        return info;
    }

    protected _genParamHint(): string {
        return "";
    }

    // validates a given input, if no input given, will validate
    // it's own input
    public validateParam(input?: any): {error: string} {
        return this.input.validate(input);
    }

    private _getNodeInfoWithParents(includeStats?: boolean): DagNodeInfo {
        const parents: DagNodeId[] = this.parents.map((parent) => parent.getId());
        const seriazliedInfo = this._getSerializeInfo(includeStats);
        seriazliedInfo["parents"] = parents;
        return seriazliedInfo;
    }

    private _getNonAggParents(): DagNode[] {
        return this.parents.filter((parent) => parent.getType() !== DagNodeType.Aggregate);
    }

    // set can have multi parents (unlimited), join cannot (limited to 2)
    private _canHaveMultiParents() {
        return this.maxParents === -1;
    }

    private _setState(state: DagNodeState): void {
        const oldState: DagNodeState = this.state;
        this.state = state;
        if (state !== DagNodeState.Complete &&
            state !== DagNodeState.Running &&
            !(state === DagNodeState.Error && oldState === DagNodeState.Running)) {
            // only keep tableRunStats if state is completed, running, or
            // if it was running but switched to error
            this.runStats.hasRun = false;
            this.runStats.nodes = {};
        }
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
        } else if (this.getType() == DagNodeType.Aggregate) {
            DagAggManager.Instance.removeValue(this.getParam().dest);
        }
    }

    private _validateConfiguration(): {error: string} {
        try {
            let error: {error: string} = this._validateParents();
            if (error == null) {
                error = this.validateParam();
            }
            if (error == null) {
                error = this._validateLineage();
            }
            return error;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    private _validateParents(): {error: string} {
        const maxParents = this.getMaxParents();
        const numParent = this.getNumParent();
        if (maxParents === -1) {
            const minParents = this.getMinParents();
            if (numParent < minParents) {
                let error: string = "Requires at least " + minParents + " parents";
                return {error: error};
            }
        } else if (numParent !== this.getMaxParents()) {
            let error: string = "Requires " + maxParents + " parents";
            return {error: error};
        }
        return null;
    }

    private _validateLineage(): {error: string} {
        const colMaps: {[key: string]: ProgCol} = {};
        this.getParents().forEach((parentNode) => {
            parentNode.lineage.getColumns().forEach((progCol) => {
                colMaps[progCol.getBackColName()] = progCol;
            });
        });

        const colNameSet: Set<string> = this._getColumnsUsedInInput();
        const invalidColNames: string[] = [];
        if (colNameSet != null) {
            // there is check of brack validation before this check
            // so here we just check if has <, then it's paramters and skip it
            colNameSet.forEach((colName) => {
                if (colName &&
                    !colName.includes("<") &&
                    !colMaps.hasOwnProperty(colName)) {
                    invalidColNames.push(colName);
                }
            });
        }
        if (invalidColNames.length > 0) {
            const error: string = (invalidColNames.length === 1) ?
            DagNodeErrorType.NoColumn : DagNodeErrorType.NoColumns
            return {
                error: error + invalidColNames.join(", ")
            };
        }
        return null;
    }

    public isConfigured(): boolean {
        return this.configured && this.input.isConfigured();
    }

    public applyColumnMapping(_map, _index: number): void {
        if (this.isConfigured()) {
            return;
        }
        this.setParam(null, true);
    }

    // helper function
    protected _getColumnFromEvalArg(arg: object, set: Set<string>) {
        if (arg["args"] != null) {
            arg["args"].forEach((subArg) => {
                if (subArg.type === "fn") {
                    // recusrive check the arg
                    this._getColumnFromEvalArg(subArg, set);
                } else if (subArg.type === "columnArg") {
                    set.add(subArg.value)
                }
            });
        }
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

    static _convertOp(op: string): string {
        if (op && op.length) {
            op = op.slice(0, 1).toLowerCase() + op.slice(1);
        }
        return op;
    }

    /**
     * Creates evalString for groupby aggregate
     * @param aggArg the groupy aggregate argument we want to make the string of.
     */
    static getGroupByAggEvalStr(aggArg: AggColInfo): string {
        let evalStr = null;
        const op: string = this._convertOp(aggArg.operator);
        const colName = aggArg.aggColName;
        // XXX currently don't support Multi-operation in multi-evalgroupBy
        if (op === "stdevp") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName})))`;
        } else if (op === "stdev") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1)))`;
        } else if (op === "varp") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName}))`;
        } else if (op === "var") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1))`;
        } else {
            evalStr = `${op}(${colName})`;
        }
        return evalStr;
    }

    static getAggsFromEvalStrs(evalStrs) {
        const aggs = [];
        for (let i = 0; i < evalStrs.length; i++) {
            const parsedEval = XDParser.XEvalParser.parseEvalStr(evalStrs[i].evalString);
            if (!parsedEval.args) {
                parsedEval.args = [];
            }
            getAggs(parsedEval);
        }
        function getAggs(parsedEval) {
            for (let i = 0; i < parsedEval.args.length; i++) {
                if (parsedEval.args[i].type === "aggValue") {
                    aggs.push(parsedEval.args[i].value);
                } else if (parsedEval.args[i].type === "fn") {
                    getAggs(parsedEval.args[i]);
                }
            }
        }
        return aggs;
    }
}