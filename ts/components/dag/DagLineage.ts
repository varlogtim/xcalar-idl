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
    private columnsWithParamsReplaced: ProgCol[];
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
        this.columnsWithParamsReplaced = undefined;
    }

    /**
     * If getting columns with parameters replaced with values, get columns
     * without caching them so we don't overwrite the parameterized version of
     * the columns
     * @param {boolean} replaceParameters
     * @return {ProgCol[]} get a list of columns
     */
    public getColumns(replaceParameters?): ProgCol[] {
        if (replaceParameters) {
            if (this.columnsWithParamsReplaced == null) {
                const updateRes = this._update(replaceParameters);
                this.columnsWithParamsReplaced = updateRes.columns;
            }
            return this.columnsWithParamsReplaced;
        } else {
            if (this.columns == null) {
                const updateRes = this._update(replaceParameters);
                this.columns = updateRes.columns;
                this.changes = updateRes.changes;
            }
            return this.columns;
        }
    }

    /**
     * @return {string[]} Get A list of prefix columns names
     */
    public getPrefixColumns(): string[] {
        const prefixColumns: string[] = [];
        this.getColumns().forEach((progCol) => {
            const colName: string = progCol.getBackColName();
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            if (parsed.prefix) {
                prefixColumns.push(colName);
            }
        });
        return prefixColumns;
    }

    /**
     * @return {string[]} Get A list of devired columns names
     */
    public getDerivedColumns(): string[] {
        const derivedColumns: string[] = [];
        this.getColumns().forEach((progCol) => {
            const colName: string = progCol.getBackColName();
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            if (!parsed.prefix) {
                derivedColumns.push(parsed.name);
            }
        });
        return derivedColumns;
    }

    /**
     * @returns {{from: ProgCol, to: ProgCol}[]}
     */
    public getChanges(): {from: ProgCol, to: ProgCol}[] {
        // if no columns, then no changes, so update
        if (this.columns == null) {
            const updateRes = this._update();
            this.columns = updateRes.columns;
            this.changes = updateRes.changes;
        }
        return this.changes;
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
                // If it's join or union, we only want to traverse the parent
                // that contains the column. Searching for the column won't work
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

    private _update(replaceParameters?: boolean): DagLineageChange {
        let colInfo: DagLineageChange;
        if (this.node.isSourceNode()) {
            // source node
            colInfo = this._applyChanges(replaceParameters);
        } else if (this.node.getType() === DagNodeType.Aggregate) {
            colInfo = {columns:[], changes:[]}; // aggregate has no columns. just a value
        } else {
            let columns = [];
            this.node.getParents().forEach((parentNode) => {
                columns = columns.concat(parentNode.getLineage().getColumns(replaceParameters));
            });
            colInfo = this._applyChanges(replaceParameters, columns);
        }
        return colInfo;
    }

    private _applyChanges(replaceParameters?: boolean, columns?: ProgCol[]): DagLineageChange {
        let lineageChange: DagLineageChange;
        columns = columns || this.columns;
        try {
            lineageChange = this.node.lineageChange(columns, replaceParameters);
        } catch (e) {
            console.error("get lineage error", e);
            lineageChange = {
                columns: [],
                changes: []
            };
        }
        return lineageChange;
    }
}