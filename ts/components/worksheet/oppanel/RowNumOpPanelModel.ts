class RowNumOpPanelModel {
    private _title: string = '';
    private _instrStr: string = '';
    private _destColumn: string = '';
    private _allColMap: Map<string, ProgCol> = new Map();

    /**
     * Create data model instance from DagNode
     * @param dagNode 
     */
    public static fromDag(dagNode: DagNodeRowNum): RowNumOpPanelModel {
        try {
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
        colMap: Map<string, ProgCol>, dagInput: DagNodeRowNumInputStruct
    ): RowNumOpPanelModel {
        // input validation
        if (dagInput.newField == null) {
            throw new Error('Dest column cannot be null');
        }

        const model = new this();

        model._title = OpPanelTStr.RowNumPanelTitle;
        model._instrStr = OpPanelTStr.RowNumPanelInstr;
        model._allColMap = colMap;

        model._destColumn = dagInput.newField;

        return model;
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeRowNumInputStruct {
        const param: DagNodeRowNumInputStruct = {
            newField: this.getDestColumn()
        };
        return param;
    }

    /**
     * Validate data fields related to DagNodeInput
     */
    public validateInputData(): void {
        const destColumn = this.getDestColumn();
        if (destColumn == null || destColumn.length === 0) {
            throw new Error('New column name cannot be empty');
        }
        if (xcHelper.parsePrefixColName(destColumn).prefix.length > 0) {
            throw new Error(`New column name cannot have prefix`);
        }
        if (this.getColNameSet().has(destColumn)) {
            throw new Error(`Duplicate column ${destColumn}`);
        }
    }

    public getTitle(): string {
        return this._title;
    }

    public getInstrStr(): string {
        return this._instrStr;
    }

    public getColNameSet(): Set<string> {
        return new Set(this._allColMap.keys());
    }

    public getColumnMap(): Map<string, ProgCol> {
        return this._allColMap;
    }

    public getDestColumn(): string {
        return this._destColumn;
    }

    public setDestColumn(colName: string): void {
        this._destColumn = colName;
    }
}