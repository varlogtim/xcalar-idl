class SetOpPanelModel {
    private dagNode: DagNodeSet;
    private dedup: boolean;
    private unionType: UnionType;
    private resultCols: ProgCol[];
    private selectedColsList: ProgCol[][];
    private candidateColsList: ProgCol[][];
    private allColsList: ProgCol[][];
    private event: Function;

    public constructor(dagNode: DagNodeSet, event: Function) {
        this.dagNode = dagNode;
        this.event = event;
        const params: DagNodeSetInput = this.dagNode.getParam();
        this._initialize(params);
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        dedup: boolean,
        unionType: UnionType,
        result: ProgCol[],
        selected: ProgCol[][],
        candidate: ProgCol[][],
        all: ProgCol[][];
    } {
        return {
            dedup: this.dedup,
            unionType: this.unionType,
            result: this.resultCols,
            selected: this.selectedColsList,
            candidate: this.candidateColsList,
            all: this.allColsList
        }
    }

    /**
     * @returns {number} get the number of lists in the model
     */
    public getNumList(): number {
        return this.allColsList.length;
    }

    /**
     *
     * @param dedup {boolean} Specify shuld dedup rows or not
     */
    public setDedup(dedup: boolean) {
        this.dedup = dedup || false;
    }

    /**
     *
     * @param type {UnionType} Set the set operation's type
     */
    public setType(type: UnionType) {
        this.unionType = type || UnionType.Union;
    }

    /**
     * Add a column from candidate list to selected list
     * @param listIndex {number} index of which node
     * @param colIndex {number} index of which column
     */
    public addColumn(listIndex: number, colIndex: number): void {
        const progCol: ProgCol = this.candidateColsList[listIndex][colIndex];
        this.resultCols.push(new ProgCol({
            name: this._normalizeColName(progCol.getBackColName()),
            type: null
        }));
        this.selectedColsList.forEach((selectedCols, index) => {
            if (index === listIndex) {
                selectedCols.push(progCol);
            } else {
                selectedCols.push(null);
            }
        });
        this._update();
    }

    /**
     * Remove a column in all nodes
     * @param colIndex {number} the index of the column
     */
    public removeColumnForAll(colIndex: number): void {
        this.resultCols.splice(colIndex, 1);
        this.selectedColsList.forEach((selectedCols) => {
            selectedCols.splice(colIndex, 1);
        });
        this._update();
    }

    /**
     * Remove a column
     * @param listIndex {number} index of the node list
     * @param colIndex {number} index of the column
     */
    public removeColumn(listIndex: number, colIndex: number): void {
        this.selectedColsList[listIndex][colIndex] = null;
        let allNullCol: boolean = this.selectedColsList.filter((selectedCols) => {
            return selectedCols[colIndex] != null;
        }).length === 0;

        if (allNullCol) {
            this.removeColumnForAll(colIndex);
        } else {
            this.resultCols[colIndex].type = null; // reset result type
        }
        this._update();
    }

    /**
     * Select a column
     * @param listIndex {number} index of the node list
     * @param colIndex {number} index of the column
     * @param indexToSelect {number} index in the all columns to select
     */
    public selectColumn(
        listIndex: number,
        colIndex: number,
        indexToSelect: number
    ): void {
        const colToSelect: ProgCol = this.allColsList[listIndex][indexToSelect];
        const colName: string = colToSelect.getBackColName();
        let usedIndex: number;
        this.selectedColsList[listIndex].forEach((col, index) => {
            if (col != null && index !== colIndex &&
                col.getBackColName() === colName
            ) {
                usedIndex = index;
                return false; // stop loop
            }
        });
        this.selectedColsList[listIndex][colIndex] = colToSelect;
        this.resultCols[colIndex].type = null; // when select, reset result type to null
        // same column is used in other col, remove that
        if (usedIndex != null) {
            this.removeColumn(listIndex, usedIndex);
        }
        this._update();
    }

    /**
     * Set result column's name or type
     * @param colIndex {number} column index
     * @param name {string} name to set
     * @param type {ColumnType} column type to set
     */
    public setResult(colIndex: number, name: string, type: ColumnType): void {
        const resultCol: ProgCol = this.resultCols[colIndex];
        if (name != null) {
            resultCol.setBackColName(name);
        }
        if (type != null) {
            resultCol.type = type;
        }
    }

    /**
     * Validate if the num of parent is valid,
     * @return {error: string} Return error string if invalid
     */
    public validateNodes(): {error: string} {
        if (this.allColsList.length <= 1 &&
            this.unionType === UnionType.Union &&
            this.dedup === true
        ) {
            return {error: UnionTStr.OneTableToUnion2};
        } else {
            return null;
        }
    }

    /**
     * @return {object} Return error when no result col or col name is invalid
     */
    public validateResult(advancedMode: boolean = false): {index: number, error: string} {
        if (this.resultCols.length === 0) {
            return {index: null, error: UnionTStr.SelectCol};
        }

        for (let i = 0; i < this.resultCols.length; i++) {
            let error: string;
            const colName: string = this.resultCols[i].getBackColName();
            if (colName.length === 0) {
                error = advancedMode ? UnionTStr.FillDestCol : ErrTStr.NoEmpty;
            } else {
                error = xcHelper.validateColName(colName, false);
            }

            if (error != null) {
                return {
                    index: i,
                    error: error
                }
            }
        }
        return null;
    }

    /**
     * @return {object} Return error type is not match
     */
    public validateCast(): {index: number, error: string} {
        for (let colIndex = 0; colIndex < this.resultCols.length; colIndex++) {
            const resultCol: ProgCol = this.resultCols[colIndex];
            if (resultCol.getType() != null) {
                continue;
            }
            // check if all selected cols has the same time
            let firstSelectedType: ColumnType = null;
            for (let listIndex = 0; listIndex < this.selectedColsList.length; listIndex++) {
                const selectedCol: ProgCol = this.selectedColsList[listIndex][colIndex];
                if (selectedCol == null) {
                    continue;
                } else if (selectedCol.type === ColumnType.mixed) {
                    return {
                        index: colIndex,
                        error: UnionTStr.MixType
                    }
                } else if (firstSelectedType == null) {
                    firstSelectedType = <ColumnType>selectedCol.getType();
                } else if (firstSelectedType !== selectedCol.getType()) {
                    return {
                        index: colIndex,
                        error: UnionTStr.Cast
                    }
                }
            }
        }
        return null;
    }

    public validateAdvancedMode(paramStr: string): {error: string} {
        try {
            return null;
        } catch (e) {
            console.error(e);
            return {error: "invalid configuration"};
        }
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeSetInput = this._getParam();
        this.dagNode.setParam(param);
    }

    public switchMode(
        toAdvancedMode: boolean,
        editor: CodeMirror.EditorFromTextArea
    ): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeSetInput = this._getParam();
            editor.setValue(JSON.stringify(param, null, 4));
        } else {
            try {
                const param: DagNodeSetInput = <DagNodeSetInput>JSON.parse(editor.getValue());
                this._initialize(param);
                this._update();
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _initialize(params: DagNodeSetInput) {
        this.resultCols = [];
        this.selectedColsList = [];
        this.candidateColsList = [];
        this.allColsList = [];

        this.dedup = params.dedup;
        this.unionType = params.unionType;

        // initialize all columns
        this.allColsList = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        });

        // initialize select cols list
        this.selectedColsList = this.allColsList.map(() => []);

        // restore selected columns
        const hasCast: boolean[] = [];
        for (let listIndex = 0; listIndex < params.columns.length; listIndex++) {
            const cols = params.columns[listIndex];
            const colMap: Map<string, ProgCol> = this._getNameMap(this.allColsList[listIndex]);
            for (let colIndex = 0; colIndex < cols.length; colIndex++) {
                const col = cols[colIndex];
                const colName: string = col.sourceColumn;
                this.selectedColsList[listIndex][colIndex] = (colName == null) ?
                null : colMap.get(colName);
                hasCast[colIndex] = hasCast[colIndex] || col.cast;
            }
        }

        // intialize result list
        if (params.columns[0] != null) {
            this.resultCols = params.columns[0].map((col, colIndex) => {
                return new ProgCol({
                    backName: col.destColumn,
                    type: hasCast[colIndex] ? col.columnType : null
                });
            });
        }

        // initialize candidate list
        this.allColsList.forEach((_col, listIndex) => {
            this.candidateColsList[listIndex] = this._getCandidateCols(listIndex);
        });
    }

    private _getCandidateCols(listIndex: number): ProgCol[] {
        const map: Map<string, ProgCol> = this._getNameMap(this.selectedColsList[listIndex]);
        return this.allColsList[listIndex].filter((col) => {
            return !map.has(col.getBackColName());
        });
    }

    private _normalizeColName(name: string): string {
        const map: Map<string, ProgCol> = this._getNameMap(this.resultCols);
        let checkName = (name: string) => !map.has(name);
        name = xcHelper.parsePrefixColName(name).name;
        return xcHelper.uniqueName(name, checkName, null);
    }

    private _getNameMap(progCols: ProgCol[]): Map<string, ProgCol> {
        const progColMap: Map<string, ProgCol> = new Map();
        if (progCols == null) {
            return progColMap;
        }
        progCols.forEach((progCol) => {
            if (progCol != null) {
                progColMap.set(progCol.getBackColName(), progCol);
            }
        });
        return progColMap;
    }

    private _getParam(): DagNodeSetInput {
        const colTypes: ColumnType[] = <ColumnType[]>this.resultCols.map((col) => col.getType());
        for (let colIndex = 0; colIndex < colTypes.length; colIndex++) {
            if (colTypes[colIndex] != null) {
                continue;
            }

            for (let listIndex = 0; listIndex < this.selectedColsList.length; listIndex++) {
                const progCol: ProgCol = this.selectedColsList[listIndex][colIndex];
                if (progCol != null) {
                    colTypes[colIndex] = progCol.getType();
                    break;
                }
            }
        }

        const columns = this.selectedColsList.map((selectedCols) => {
            return selectedCols.map((progCol, i) => {
                const resultCol: ProgCol = this.resultCols[i];
                if (progCol == null) {
                    return {
                        sourceColumn: null,
                        destColumn: resultCol.getBackColName(),
                        columnType: colTypes[i],
                        cast: false
                    }
                } else {
                    return {
                        sourceColumn: progCol.getBackColName(),
                        destColumn: resultCol.getBackColName(),
                        columnType: colTypes[i],
                        cast: (colTypes[i] !== progCol.getType())
                    }
                }
            });
        });

        return {
            unionType: this.unionType,
            dedup: this.dedup,
            columns: columns
        }
    }

    private _update(): void {
        this.allColsList.forEach((_col, listIndex) => {
            this.candidateColsList[listIndex] = this._getCandidateCols(listIndex);
        });

        if (this.event != null) {
            this.event();
        }
    }
}