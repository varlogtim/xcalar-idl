class DagLineage {
    /**
     * Example:
     * Add New column: {, from: null, to: progCol}
     * Remove columns: {from: progCol, to: null}
     * Change of columns(name/type): {from: oldProgCol, to: newProgCol}
     */
    private changes: {from: ProgCol, to: ProgCol, parentIndex?: number}[];
    private node: DagNode;
    private columns: ProgCol[];
    private columnsWithParamsReplaced: ProgCol[];
    private hiddenColumns: Map<string, ColumnType>; // name: type
    private columnHistory;
    private columnParentMaps: {
        sourceColMap: {
            removed: Map<string, number[]>, // source columns removed
            renamed: Map<string, Map<string, number>> // source columns renamed
        },
        destColMap: {
            added: Set<string>, // New columns
            renamed: Map<string, {from: string, parentIndex: number}>, // Dest columns renamed
            kept: Map<string, number> // Dest columns kept
        }
    };

    public constructor(node: DagNode) {
        this.node = node;
        this.columns = undefined;
        this.changes = [];
        this.hiddenColumns = undefined;
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
        this.hiddenColumns = undefined;
        this.columnsWithParamsReplaced = undefined;
        this.columnParentMaps = undefined;
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

    public getHiddenColumns(): Map<string, ColumnType> {
        if (this.hiddenColumns == null) {
            const columnDeltas: Map<string, any> = this.node.getColumnDeltas();
            let hiddenColumns: Map<string, ColumnType> = new Map();
            let pulledColumns: Set<string> = new Set();
            columnDeltas.forEach((colInfo, colName) => {
                if (colInfo.isHidden) {
                    hiddenColumns.set(colName, colInfo.type);
                } else if (colInfo.isPulled) {
                    pulledColumns.add(colName);
                }
            });
            if (!this.node.isSourceNode() && this.node.getType() !== DagNodeType.Aggregate) {
                // aggregate has no columns. just a value
                this.node.getParents().forEach((parentNode) => {
                    const parentHiddenColumns = parentNode.getLineage().getHiddenColumns();
                    pulledColumns.forEach(colName => {
                        if (parentHiddenColumns.has(colName)) {
                            parentHiddenColumns.delete(colName);
                        }
                    })
                    hiddenColumns = new Map([...parentHiddenColumns, ...hiddenColumns]);
                });
            }
            this.hiddenColumns = hiddenColumns;
        }
        return this.hiddenColumns;
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
    public getChanges(): {from: ProgCol, to: ProgCol, parentIndex?: number}[] {
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
     * @param colName sourceColumn or destColumn
     * @param childId
     * @param destColName must be specified if colName is sourceColumn
     */
    public getColumnHistory(colName: string, childId?: DagNodeId, destColName?: string): {
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

        const { sourceColMap, destColMap } = this._getColumnMaps();

        // populate change information
        let parentIndexList: number[];
        if (destColName == null) { // We are looking for a dest column
            if (destColMap.added.has(colName)) {
                changeInfo.type = 'add';
            } else if (destColMap.renamed.has(colName)) {
                const colRenameInfo = destColMap.renamed.get(colName);
                changeInfo.type = 'rename';
                parentIndexList = [colRenameInfo.parentIndex];
                colName = colRenameInfo.from;
            } else if (destColMap.kept.has(colName)) {
                parentIndexList = [destColMap.kept.get(colName)];
            } else {
                // This should never happen
                console.error(`Source column not found: ${colName}`);
            }
        } else { // We are looking for a source column
            if (sourceColMap.removed.has(colName)) {
                changeInfo.type = 'remove';
                parentIndexList = sourceColMap.removed.get(colName).map((v) => v); // XXX TODO: How to distinguish?
            }
            if (sourceColMap.renamed.has(colName)) {
                changeInfo.type = 'rename';
                const parentIndex = sourceColMap.renamed.get(colName).get(destColName);
                if (parentIndex != null) {
                    parentIndexList = [parentIndex];
                } else {
                    // This should never happen
                    console.error(`Dest column not found: ${destColName}`);
                }
            }
        }
        if (parentIndexList == null) {
            return this.columnHistory;
        }
        // recursively call getColumnHistory on parents
        const parents = this.node.getParents();
        for (const i of parentIndexList) {
            const parentNode = parents[i];
            if (!parentNode) {
                continue;
            }
            this.columnHistory = this.columnHistory.concat(parentNode.getLineage().getColumnHistory(colName, nodeId));
        }

        return this.columnHistory;
    }

    /**
     * Figure out the parent of each columns in this.changes and this.columns
     */
    private _getColumnMaps(): {
        sourceColMap: {
            removed: Map<string, number[]>, // source columns removed
            renamed: Map<string, Map<string, number>> // source columns renamed
        },
        destColMap: {
            added: Set<string>, // New columns
            renamed: Map<string, {from: string, parentIndex: number}>, // Dest columns renamed
            kept: Map<string, number> // Dest columns kept
        }
    } {
        if (this.columnParentMaps != null) {
            return this.columnParentMaps;
        }

        const sourceColMap = {
            removed: new Map<string, number[]>(), // source columns removed
            renamed: new Map<string, Map<string, number>>() // source columns renamed
        };
        const destColMap = {
            added: new Set<string>(), // New columns
            renamed: new Map<string, {from: string, parentIndex: number}>(), // Dest columns renamed
            kept: new Map<string, number>() // Dest columns kept
        }
        // Columns changed by this node
        for (const {from, to, parentIndex = 0} of this.getChanges()) {
            if (to) {
                const destColName = to.getBackColName();
                if (from) { // to != null && from != null: renamed columns
                    const sourceColName = from.getBackColName();
                    destColMap.renamed.set(destColName, { from: sourceColName, parentIndex: parentIndex });

                    if (!sourceColMap.renamed.has(sourceColName)) {
                        sourceColMap.renamed.set(sourceColName, new Map());
                    }
                    sourceColMap.renamed.get(sourceColName).set(destColName, parentIndex);
                } else { // to != null && from == null: new columns
                    destColMap.added.add(destColName);
                }
            }
            else if (from) { // to == null && from != null: removed columns
                const sourceColName = from.getBackColName();
                if (!sourceColMap.removed.has(sourceColName)) {
                    sourceColMap.removed.set(sourceColName, []);
                }
                sourceColMap.removed.get(sourceColName).push(parentIndex);
            }
        }

        // Columns kept from parents
        // Where all the source columns come from. The map could be empty if it's a input node.
        const sourceParentMap = new Map<string, Set<number>>();
        const parents = this.node.getParents();
        for (let i = 0; i < parents.length; i ++) {
            const parent = parents[i];
            if (parent == null) {
                continue;
            }
            for (const progCol of parent.getLineage().getColumns()) {
                const colName = progCol.getBackColName();
                if (!sourceParentMap.has(colName)) {
                    sourceParentMap.set(colName, new Set<number>());
                }
                sourceParentMap.get(colName).add(i);
            }
        }
        // Columns = add + rename + keep
        for (const col of this.getColumns()) {
            const colName = col.getBackColName();
            if (!destColMap.added.has(colName) && !destColMap.renamed.has(colName)) {
                // This column is kept from one of the parents.
                // There might be more than one parents having columns with the same name,
                // but other columns must have been renamed or removed except this one.
                // So the parent where this column comes from is: parents expose this column - (parents renamed + removed)
                const parentsRemoved = sourceColMap.removed.get(colName) || [];
                const parentsRenamed = [];
                if (sourceColMap.renamed.has(colName)) {
                    sourceColMap.renamed.get(colName).forEach((parentIndex) => {
                        parentsRenamed.push(parentIndex);
                    });
                }

                const potentialParents = sourceParentMap.get(colName);
                if (potentialParents == null) {
                    // Nodes w/o parents(ex. dataset) will go here
                    destColMap.added.add(colName);
                } else {
                    // Remove the parents renamed/removed
                    for (const changedParentIndex of parentsRemoved.concat(parentsRenamed)) {
                        potentialParents.delete(changedParentIndex);
                    }
                    // The parent remaining in the set is the one where the column comes from
                    if (potentialParents.size === 1) {
                        destColMap.kept.set(colName, potentialParents.values().next().value);
                    } else {
                        // Should never happen!
                        console.error(`Column ${colName} comes from ${potentialParents.size} parents`);
                    }
                }
            }
        }

        this.columnParentMaps = {
            sourceColMap: sourceColMap,
            destColMap: destColMap
        };
        return this.columnParentMaps;
    }

    private _update(replaceParameters?: boolean): DagLineageChange {
        let colInfo: DagLineageChange;
        // Step 1. get columns based off of parents and node input
        if (this.node.isSourceNode()) {
            // source node
            colInfo = this._applyChanges(replaceParameters);
        } else if (this.node.getType() === DagNodeType.Aggregate) {
            colInfo = {columns:[], changes:[]}; // aggregate has no columns. just a value
        } else {
            let columns: ProgCol[] = [];
            this.node.getParents().forEach((parentNode) => {
                columns = columns.concat(parentNode.getLineage().getColumns(replaceParameters));
            });

            colInfo = this._applyChanges(replaceParameters, columns);
        }

        // Step 2. add Pulled columns
        const columnDeltas: Map<string, any> = this.node.getColumnDeltas();
        // check if node has "pulled columns" action and add these to
        // colInfo.columns if they aren't already there
        const colNames: Set<string> = new Set(colInfo.columns.map(col => col.getBackColName()));
        columnDeltas.forEach((colInf, colName) => {
            if (colInf.isPulled && !colNames.has(colName)) {
                let frontName = xcHelper.parsePrefixColName(colName);
                const hiddenCols: Map<string, ColumnType> = this.getHiddenColumns();
                let type;
                if (hiddenCols.has(colName)) {
                    type = hiddenCols.get(colName);
                } else {
                    type = colInf.type;
                }
                colInfo.columns.push(ColManager.newCol({name: frontName.name, backName: colName, type: type}));
            }
        });

        // Step 3. modify column deltas and remove hidden columns
        // replace "colInfo.columns" with "updatedColumns" that contain
        // updated widths and text alignment
        let updatedColumns: ProgCol[] = [];
        let updatedChanges: {from: ProgCol, to: ProgCol}[] = [];
        colInfo.columns.forEach((column) => {
            if (columnDeltas.has(column.getBackColName())) {
                let columnInfo = columnDeltas.get(column.getBackColName());
                if (!columnInfo.isHidden) {
                    let colReplaced = false;
                    if (columnInfo.widthChange) {
                        // do not change original column width, create a new column
                        // and change that width instead
                        if (!colReplaced) {
                            column = new ProgCol(<any>column);
                            colReplaced = true;
                        }

                        column.width = columnInfo.widthChange.width;
                        column.sizedTo = columnInfo.widthChange.sizedTo;
                        column.isMinimized = columnInfo.widthChange.isMinimized;
                    }
                    if (columnInfo.textAlign) {
                        if (!colReplaced) {
                            column = new ProgCol(<any>column);
                            colReplaced = true;
                        }
                        column.setTextAlign(columnInfo.textAlign);
                    }
                    updatedColumns.push(column);
                }
            } else {
                updatedColumns.push(column);
            }
        });

        // Step 4. adjust changes.from/to due to hidden columns
        // for hidden columns, remove changes.from and changes.to
        colInfo.changes.forEach((change) => {
            if (change.from && columnDeltas.has(change.from.getBackColName())) {
                let columnInfo = columnDeltas.get(change.from.getBackColName());
                if (columnInfo.isHidden) {
                    change.from = null
                }
            }
            if (change.to && columnDeltas.has(change.to.getBackColName())) {
                let columnInfo = columnDeltas.get(change.to.getBackColName());
                if (columnInfo.isHidden) {
                    change.to = null
                }
            }
            if (!(change.from == null && change.to == null)) {
                updatedChanges.push(change);
            }
        });

        // Step 5. reorder columns if necessary
        // if columns are reordered, create map of colName:progCol so that we
        // can rebuild the correctly ordered array of progCols
        let columnOrdering = this.node.getColumnOrdering();
        if (columnOrdering.length) {
            let reorderedCols: ProgCol[] = [];
            let colNameMap: Map<string, ProgCol> = new Map();
            updatedColumns.forEach(col => colNameMap.set(col.getBackColName(), col));

            columnOrdering.forEach((colName) => {
                if (colNameMap.has(colName)) {
                    reorderedCols.push(colNameMap.get(colName));
                    colNameMap.delete(colName);
                }
            });
            // left over columns not found in columnOrdering array
            colNameMap.forEach(col => {
                reorderedCols.push(col);
            });
            updatedColumns = reorderedCols;
        }

        colInfo.columns = updatedColumns;
        colInfo.changes = updatedChanges;
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

if (typeof exports !== 'undefined') {
    exports.DagLineage = DagLineage;
};
