class SortOpPanelModel {
    private _title: string = '';
    private _instrStr: string = '';
    private _allColMap: Map<string, ProgCol> = new Map();
    private _sortedColumns: {columnName: string, ordering: string}[];
    private _newKeys: string[];

    /**
     * Create data model instance from DagNode
     * @param dagNode
     */
    public static fromDag(dagNode: DagNodeSort): SortOpPanelModel {
        try {
            const colMap: Map<string, ProgCol> = this._createColMap(dagNode);
            return this.fromDagInput(colMap, dagNode.getParam());
        } catch(e) {
            console.error(e);
            return new this();
        }
    }

    /**
     * Create data model instance from column list & DagNodeInput
     * @param colMap
     * @param dagInput
     * @description use case: advanced from
     */
    public static fromDagInput(
        colMap: Map<string, ProgCol>, dagInput: DagNodeSortInputStruct
    ): SortOpPanelModel {
        // input validation

        if (dagInput.columns == null) {
            throw new Error('Source column cannot be null');
        }

        const model = new this();

        model._title = OpPanelTStr.SortPanelTitle;
        model._instrStr = OpPanelTStr.SortPanelInstr;
        model._allColMap = colMap;
        model._newKeys = dagInput.newKeys;
        model._sortedColumns = xcHelper.deepCopy(dagInput.columns);
        if (!model._sortedColumns.length) {
            model.addColumn();
        }

        return model;
    }

    public static refreshColumns(oldModel, dagNode: DagNodeSort) {
        oldModel._allColMap = this._createColMap(dagNode);
        return oldModel;
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeSortInputStruct {
        const param: DagNodeSortInputStruct = {
            columns: this.getSortedColumns(),
            newKeys: this._newKeys
        };

        return param;
    }

     /**
     * Validate the data fields related to the DagNodeInput
     */
    public validateInputData(): void {
        // check duplicate column names
        let seen = {};
        this._sortedColumns.forEach((col) => {
            if (seen[col.columnName]) {
                throw new Error('Duplicate column names are not allowed: ' + col.columnName);
            } else {
                seen[col.columnName] = true;
            }
        });

        // check duplicate column names
        seen = {};
        this._newKeys.forEach((key) => {
            if (seen[key]) {
                throw new Error('Duplicate new key names are not allowed: ' + key);
            } else {
                seen[key] = true;
            }
        });
    }

    public getColNameSet(): Set<string> {
        return new Set(this.getColumnMap().keys());
    }

    public getTitle(): string {
        return this._title;
    }

    public getInstrStr(): string {
        return this._instrStr;
    }

    public getSortedColumns() {
        return this._sortedColumns;
    }

    public getSortedColumn(idx) {
        return this._sortedColumns[idx];
    }

    public setSortedColumn(idx: number, sortedColumn) {
        this._sortedColumns[idx] = sortedColumn;
    }

    public setColumName(idx: number, columnName: string) {
        this._sortedColumns[idx].columnName = columnName;
    }

    public setColumnOrdering(idx: number, ordering: string) {
        this._sortedColumns[idx].ordering = ordering;
    }

    public addColumn() {
        this._sortedColumns.push({columnName: "", ordering: XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending]});
    }

    public removeColumn(idx: number) {
        this._sortedColumns.splice(idx, 1);
    }

    public getColumnMap(): Map<string, ProgCol> {
        return this._allColMap;
    }

    private static _createColMap(dagNode: DagNodeSort): Map<string, ProgCol> {
        const colMap: Map<string, ProgCol> = new Map();
        const parents = dagNode.getParents();
        if (parents != null) {
            for (const parent of parents) {
                if (parent == null) {
                    continue;
                }
                for (const col of parent.getLineage().getColumns()) {
                    colMap.set(
                        col.getBackColName(),
                        ColManager.newPullCol(
                            col.getFrontColName(),
                            col.getBackColName(),
                            col.getType()
                        )
                    );
                }
            }
        }
        return colMap;
    }
}