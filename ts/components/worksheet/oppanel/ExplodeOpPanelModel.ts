class ExplodeOpPanelModel {
    private _title: string = '';
    private _instrStr: string = '';
    private _sourceColumn: string = '';
    private _destColumn: string = '';
    private _delimiter: string = '';
    private _allColMap: Map<string, ProgCol> = new Map();

    /**
     * Create data model instance from DagNode
     * @param dagNode
     */
    public static fromDag(dagNode: DagNodeExplode): ExplodeOpPanelModel {
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
        colMap: Map<string, ProgCol>, dagInput: DagNodeExplodeInputStruct
    ): ExplodeOpPanelModel {
        // input validation
        if (dagInput.sourceColumn == null) {
            throw new Error('Source column cannot be null');
        }
        if (dagInput.destColumn == null) {
            throw new Error('Dest column cannot be null');
        }
        if (dagInput.delimiter == null) {
            throw new Error('Delimiter cannot be null');
        }

        const model = new this();

        model._title = OpPanelTStr.ExplodePanelTitle;
        model._instrStr = OpPanelTStr.ExplodePanelInstr;
        model._allColMap = colMap;

        model._sourceColumn = dagInput.sourceColumn;
        model._delimiter = dagInput.delimiter;
        model._destColumn = dagInput.destColumn;

        return model;
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeExplodeInputStruct {
        const param: DagNodeExplodeInputStruct = {
            sourceColumn: this.getSourceColumn(),
            delimiter: this.getDelimiter(),
            destColumn: this.getDestColumn()
        };

        return param;
    }

    public autofillEmptyDestColumn(): void {
        if (this.getSourceColumn().length === 0 || this.getDestColumn().length > 0) {
            return
        }

        const colPrefix = xcHelper.parsePrefixColName(this.getSourceColumn()).name;
        const autoName = this._genColName(colPrefix);
        this.setDestColumn(autoName);
    }

    /**
     * Validate the data fields related to the DagNodeInput
     */
    public validateInputData(): void {
        // source column
        const sourceColumn = this.getSourceColumn();
        if (sourceColumn == null || sourceColumn.length === 0) {
            throw new Error('Source column cannot be empty');
        }
        if (!this.getColNameSet().has(sourceColumn)) {
            throw new Error('Source column does not exist');
        }

        // Dest columns
        const destColumn = this.getDestColumn();
        if (destColumn == null || destColumn.length === 0) {
            throw new Error('Dest column cannot be empty');
        }
        if (xcHelper.parsePrefixColName(destColumn).prefix.length > 0) {
            throw new Error('Dest column cannot have prefix');
        }
        if (this.getColNameSet().has(destColumn)) {
            throw new Error(`Duplicate column "${destColumn}"`);
        }

        // Delimiter
        const delimiter = this.getDelimiter();
        if (delimiter == null || delimiter.length === 0) {
            throw new Error('Delimiter cannot be empty');
        }
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

    public getSourceColumn(): string {
        return this._sourceColumn;
    }

    public setSourceColumn(colName: string): void {
        this._sourceColumn = colName;
    }

    public getDestColumn(): string {
        return this._destColumn;
    }

    public setDestColumn(colName: string): void {
        this._destColumn = colName;
    }

    public getDelimiter(): string {
        return this._delimiter;
    }

    public setDelimiter(delim: string): void {
        this._delimiter = delim;
    }

    public getColumnMap(): Map<string, ProgCol> {
        return this._allColMap;
    }

    private _genColName(prefix: string) {
        const allCols = this.getColNameSet();

        let result: string = '';
        for (let retry = 1; retry <= 50; retry ++) {
            result = `${prefix}-explode-${retry}`;
            if (!allCols.has(result)) {
                break;
            }
        }

        return result;
    }
}