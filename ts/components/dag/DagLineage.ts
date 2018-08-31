class DagLineage {
    /**
     * Example:
     * Add New column: {, from: null, to: progCol}
     * Remove columns: {from: progCol, to: null}
     * Change of columns(name/type): {from: oldProgCol, to: newProgCol}
     */
    private changes: {from: ProgCol, to: ProgCol}[];
    private node: DagNode;
    private columns: ProgCol[];
    private columnHistory;

    public constructor(node: DagNode) {
        this.node = node;
        this.columns = undefined;
        this.changes = [];
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

    /**
     * Reset when disconnect from parent, update params
     * or column meta from table is dropped
     */
    public reset(): void {
        this.columns = undefined;
    }

    /**
     * @return {ProgCol[]} get a list of columns
     */
    public getColumns(): ProgCol[] {
        if (this.columns == null) {
            this._update();
        }
        return this.columns;
    }

    /**
     * @returns {{from: ProgCol, to: ProgCol}[]}
     */
    public getChanges(): {from: ProgCol, to: ProgCol}[] {
        // if no columns, then no changes, so update
        if (this.columns == null) {
            this._update();
        }
        return this.changes;
    }

    /**
     * @return {string[]} Get A list of devired columns names
     */
    public getDerivedColumns(): string[] {
        const derivedColumns: string[] = [];
        this.columns.forEach((progCol) => {
            const colName: string = progCol.getBackColName();
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            if (!parsed.prefix) {
                derivedColumns.push(parsed.name);
            }
        });
        return derivedColumns;
    }

    private _update(): void {
        if (this.node.isSourceNode()) {
            // source node
            this._applyChanges();
        } else if (this.node.getType() === DagNodeType.Aggregate) {
            this.columns = []; // aggregate has no columns. just a value
        } else {
            this.columns = [];
            this.node.getParents().forEach((parentNode) => {
                this.columns = this.columns.concat(parentNode.getLineage().getColumns());
            });
            this._applyChanges();
        }
    }

    /**
     * @returns {object[]} // returns an array. Each element in an array
     * corresponds to 1 node the column is present in.
     * @param colName
     * @param childId
     */
    public getColumnHistory(colName: string, childId?: DagNodeId): {
        id: DagNodeId,
        childId: DagNodeId,
        change: {from: ProgCol, to: ProgCol},
        type: string,
        colName: string
    }[] {
        const nodeId = this.node.getId();
        const changeInfo = {
            id: nodeId,
            childId: childId || null,
            change: null,
            type: null,
            colName: colName
        };
        this.columnHistory = [changeInfo];
        // populate change information
        for (let i = 0; i < this.changes.length; i++) {
            const change = this.changes[i];
            if (change.to && change.to.getBackColName() === colName) {
                changeInfo.change = change;
                if (change.from) {
                    colName = change.from.getBackColName();
                    changeInfo.type = "rename";
                    break;
                } else {
                    changeInfo.type = "add";
                    return this.columnHistory;
                }
            } else if (change.from && change.from.getBackColName() === colName) {
                changeInfo.change = change;
                changeInfo.type = "remove";
                break;
            }
        }
        // recursively call getColumnHistory on parents
        const parents = this.node.getParents();
        const numParents = this.node.getNumParent();
        for (let i = 0; i < parents.length; i++) {
            const parentNode = parents[i];
            if (!parentNode) {
                continue;
            }
            const parentLineage = parentNode.getLineage();
            if (numParents > 1) {
                // if it's join or union, we only want to traverse the parent
                // that contains the column, searching for the column won't work
                // if it's renamed in the parent so search the renames first
                for (let j = 0; j < parentLineage.changes.length; j++) {
                    const change = parentLineage.changes[j];
                    if (change.from && change.to && change.to.getBackColName() === colName) {
                        this.columnHistory = this.columnHistory.concat(parentLineage.getColumnHistory(colName, nodeId));
                        break;
                    }
                }
                // if not found in the rename, search the columns
                const columns = parentLineage.getColumns();
                const match = columns.find((progCol) => {
                    return progCol.getBackColName() === colName;
                });
                if (match) {
                    this.columnHistory = this.columnHistory.concat(parentLineage.getColumnHistory(colName, nodeId));
                    break;
                }
            } else {
                this.columnHistory = this.columnHistory.concat(parentLineage.getColumnHistory(colName, nodeId));
            }
        }

        return this.columnHistory;
    }

    private _applyChanges(): void {
        try {
            const lineageChange: DagLineageChange = this.node.lineageChange(this.columns);
            console.log("change", lineageChange)
            this.columns = lineageChange.columns;
            this.changes = lineageChange.changes;
        } catch (e) {
            console.error(e);
        }
    }
}