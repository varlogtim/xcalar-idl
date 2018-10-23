class RoundOpPanelModel {
    private _title: string = '';
    private _instrStr: string = '';
    private _sourceColumn: string = '';
    private _destColumn: string = '';
    private _numDecimals: number = 0;
    private _allColMap: Map<string, ProgCol> = new Map();

    /**
     * Create data model instance from DagNode
     * @param dagNode 
     */
    public static fromDag(dagNode: DagNodeRound): RoundOpPanelModel {
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
        colMap: Map<string, ProgCol>, dagInput: DagNodeRoundInputStruct
    ): RoundOpPanelModel {
        // input validation
        if (dagInput.sourceColumn == null) {
            throw new Error('Source column cannot be null');
        }
        if (dagInput.numDecimals == null) {
            throw new Error('Num decimals cannot be null');
        }
        if (dagInput.destColumn == null) {
            throw new Error('Dest column cannot be null');
        }

        const model = new this();

        model._title = OpPanelTStr.RoundPanelTitle;
        model._instrStr = OpPanelTStr.RoundPanelInstr;
        model._allColMap = colMap;

        model._sourceColumn = dagInput.sourceColumn;
        model._numDecimals = dagInput.numDecimals;
        model._destColumn = dagInput.destColumn;

        return model;
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeRoundInputStruct {
        const param: DagNodeRoundInputStruct = {
            sourceColumn: this.getSourceColumn(),
            numDecimals: this.getNumDecimals(),
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

    public getNumDecimals(): number {
        return this._numDecimals;
    }

    public setNumDecimals(num: number): void {
        this._numDecimals = num;
    }

    public getColumnMap(): Map<string, ProgCol> {
        return this._allColMap;
    }

    private _genColName(prefix: string) {
        const allCols = this.getColNameSet();

        let result: string = '';
        for (let retry = 1; retry <= 50; retry ++) {
            result = `${prefix}-round-${retry}`;
            if (!allCols.has(result)) {
                break;
            }
        }

        return result;
    }
}