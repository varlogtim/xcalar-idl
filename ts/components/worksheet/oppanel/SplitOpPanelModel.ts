class SplitOpPanelModel {
    private _title: string = '';
    private _instrStr: string = '';
    private _delimiter: string = '';
    private _sourceColName: string = '';
    private _destColNames: string[] = [];
    private _allColMap: Map<string, ProgCol> = new Map();

    /**
     * Create data model instance from DagNode
     * @param dagNode 
     */
    public static fromDag(dagNode: DagNodeSplit): SplitOpPanelModel {
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
        colMap: Map<string, ProgCol>, dagInput: DagNodeSplitInputStruct
    ): SplitOpPanelModel {
        const model = new this();

        model._title = OpPanelTStr.SplitPanelTitle;
        model._instrStr = OpPanelTStr.SplitPanelInstr;
        model._allColMap = colMap;

        model._sourceColName = dagInput.source;
        model._delimiter = dagInput.delimiter;
        model._destColNames = dagInput.dest.length === 0
            ? [''] : dagInput.dest.map((v) => v);

        return model;
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeSplitInputStruct {
        const param: DagNodeSplitInputStruct = {
            source: this.getSourceColName(),
            delimiter: this.getDelimiter(),
            dest: this.getDestColNames().map((v) => v)
        };
        
        return param;
    }

    public getColNameSetWithNew(excludeIndex: number): Set<string> {
        const nameSet = new Set(this.getColumnMap().keys());
        this.getDestColNames().forEach((name, i) => {
            if (i !== excludeIndex) {
                nameSet.add(name);
            }
        })
        return nameSet;
    }

    public getTitle(): string {
        return this._title;
    }

    public getInstrStr(): string {
        return this._instrStr;
    }

    public getDelimiter(): string {
        return this._delimiter;
    }

    public setDelimiter(dem: string): void {
        this._delimiter = dem;
    }

    public getColumnMap(): Map<string, ProgCol> {
        return this._allColMap;
    }

    public getSourceColName(): string {
        return this._sourceColName;
    }

    public setSourceColName(name: string): void {
        this._sourceColName = name;
    }

    public getNumDestCols(): number {
        return this._destColNames.length;
    }

    /**
     * Set number of dest columns
     * @param count
     * @description auto-generated column names if needed
     */
    public setNumDestCols(count: number): void {
        const namesCount = this._destColNames.length;
        if (count === namesCount) {
            return;
        }

        if (count < namesCount) {
            this._destColNames.splice(count);
        } else {
            const startIndex = namesCount;
            const genCount = count - namesCount;

            const autoNames = this._genColNames(
                xcHelper.parsePrefixColName(this.getSourceColName()).name,
                startIndex, genCount
            );
            for (const name of autoNames) {
                this._destColNames.push(name);
            }
        }
        this.autofillEmptyColNames();
    }

    public getDestColNameByIndex(index: number): string {
        return this._destColNames[index];
    }

    public getDestColNames(): string[] {
        return this._destColNames.map((v) => v);
    }

    public setDestColName(index: number, colName: string): void {
        if (index < this._destColNames.length) {
            this._destColNames[index] = colName;
        }
    }

    public autofillEmptyColNames(): void {
        if (this.getSourceColName().length === 0) {
            return
        }

        const colPrefix = xcHelper.parsePrefixColName(this.getSourceColName()).name;
        for (let colIndex = 0; colIndex < this.getNumDestCols(); colIndex ++) {
            if (this.getDestColNameByIndex(colIndex).length === 0) {
                const autoName = this._genColNames(colPrefix, colIndex, 1)[0];
                this.setDestColName(colIndex, autoName);
            }
        }
    }

    private _genColNames(prefix: string, colIndex: number, count: number): string[] {
        if (prefix.length === 0) {
            return new Array(count).fill('');
        }

        const allCols = this.getColNameSetWithNew(-1);

        let result: string[];
        for (let retry = 1; retry <= 50; retry ++) {
            result = [];
            const baseIndex = retry * count + colIndex;
            for (let i = 0; i < count; i ++) {
                const name = `${prefix}-split-${baseIndex + i}`;
                result.push(name);
            }

            let hasDup = false;
            for (const name of result) {
                if (allCols.has(name)) {
                    hasDup = true;
                    break;
                }
            }

            if (!hasDup) {
                break;
            }
        }
        
        return result;
    }
}