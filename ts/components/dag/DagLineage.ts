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

    public constructor(node: DagNode) {
        this.node = node;
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