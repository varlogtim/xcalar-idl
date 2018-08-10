class DagLineage {
    private columns: ProgCol[];
    // depned on how we define the change, it may needed or not
    /**
     * Example:
     * Add New column: {event: LineageEvent.Add, from: null, to: "newCol", type: ColumnType.string}
     * Remove prefix: {event: LineageEvent.Remove, from: "prefix::", to: null}
     * Remove derived column: {event: LineageEvent.Remove, from: "derived", to: null}
     * Remname prefix: {event: LineageEvent.Rename, from: "prefix::", to: "newPrefix::"}
     * Rename derived column: {event: LineageEvent.Rename, from: "derived", to: "newDerived"}
     * Rename column and change type: {event: LineageEvent.Rename, from: "prefix:col", to: "newCol", type: ColumnType.integer}
     */
    private LineageEvent = {
        "Add": "add",
        "Remove": "remove",
        "Rename": "rename"
    }
    // depned on how we define the change, it may needed or not
    private change: {event: string, from: string, to: string, type?: ColumnType}[];
    private node: DagNode;
    /* possible use: stop the delta change of parents
     * like add a column, remove a column, ect.
     */
    // private changes: object[];

    // XXX TODO REMOVE IT
    private static test(dsName) {
        const a: DagNodeDataset = DagNodeFactory.create({type: DagNodeType.Dataset});
        const b = DagNodeFactory.create({type: DagNodeType.Filter});
        a.connectToChild(b);
        b.connectToParent(a);
        a.setParam({source: dsName, prefix: "test"})
        .then(() => {
            console.log(b.getLineage().getColumns());
        });
    }

    // XXX persist or not TBD
    public constructor(node: DagNode) {
        this.node = node;
        this._defineChange();
        this.columns = undefined;
    }

    /**
     * Be called when has the column meta
     * For example, if it's a source node,
     * or it has executed and has the table meta
     * @param columns
     */
    public setColumns(columns: ProgCol[]): void {
        this.columns = columns;
    }

    public update(): void {
        if (this._isSource()) {
            // source node
            this.columns = this.columns || [];
        } else if (this._isAgg()) {
            this.columns = []; // aggregate has no columns. just a value
        } else {
            this.columns = [];
            this.node.getParents().forEach((parentNode) => {
                this.columns = this.columns.concat(parentNode.getLineage().getColumns());
            });
            this._applyChange();
        }
    }

    /**
     * Reset when disconnect from parent, update params
     * or column meta from table is dropped
     */
    public reset(): void {
        this.columns = undefined;
        if (!this._isAgg()) {
            this.node.getChildren().forEach((childNode) => {
                childNode.getLineage().reset();
            });
        }
    }

    public getColumns(): ProgCol[] {
        if (this.columns == null) {
            this.update();
        }
        return this.columns;
    }

    // XXX TODO
    public getDerivedColumns(): string[] {
        return [];
    }

    /** XXX TODO
     * Define change option 1, each subClass of DagNode define how the change
     * of columns should be
     * @param changeFunc
     */
    public defineChange(changeFunc: Function) {

    }

    /** XXX TODO
     * Define change option 2: all type of nodes define how it should change here
     */
    private _defineChange(): void {
        if (this._isSource()) {
            // souce is the starting point
            return;
        }

        switch (this.node.getType()) {
            default:
                break;
        }
    }

    // XXX TODO, this will change the column based on how the node define the chagne
    private _applyChange(): void {

    }

    private _isSource(): boolean {
        return this.node.getNumParent() === 0;
    }

    private _isAgg(): boolean {
        return this.node.getType() === DagNodeType.Aggregate;
    }
}