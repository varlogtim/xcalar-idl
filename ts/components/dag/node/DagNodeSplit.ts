class DagNodeSplit extends DagNode {
    protected input: DagNodeSplitInput = {
        source: '', delimiter: '', dest: []
    };

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Split;
        this.minParents = 1;
        this.maxParents = 1;
        this.display.icon = "&#xe9da;"
    }

    public getParam(): DagNodeSplitInput {
        // return {
        //     source: 'test::MonthDayYear',
        //     delimiter: '/',
        //     dest: ['month','day','year']
        // };
        return {
            source: this.input.source || "",
            delimiter: this.input.delimiter || "",
            dest: this.input.dest.map((v) => v)
        };
    }

    public setParam(param: DagNodeSplitInput): void {
        const parentNodes = this.getParents();
        const allCols = (parentNodes == null || parentNodes.length === 0)
            ? []
            : parentNodes[0].getLineage().getColumns().map((col)=>col.getBackColName());

        this.input = {
            source: param.source || '',
            delimiter: param.delimiter || '',
            dest: this._getColumnNames(param.source, allCols, param.dest)
        }
        super.setParam();
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        const resultCols: ProgCol[] = [];
        for (const col of columns) {
            resultCols.push(ColManager.newPullCol(
                col.getFrontColName(),
                col.getBackColName(),
                col.getType()));
        }
        const newCols: ProgCol[] = [];
        for (const colName of this.getParam().dest) {
            const col = ColManager.newPullCol(colName, colName, ColumnType.string);
            resultCols.push(col);
            newCols.push(col);
        }
        return {
            columns: resultCols,
            changes: newCols.map((col) => ({from: null, to: col}))
        };
    }

    private _getColumnNames(
        colToSplit: string, allCols: string[], splitCols: string[]
    ): string[] {
        // Remove the prefix
        colToSplit = xcHelper.parsePrefixColName(colToSplit).name;

        // Create a set for existing columns
        const allColSet: Set<string> = allCols.reduce(
            (res, col) => (res.add(col)), new Set());

        // Check dup inbetween new names
        // Generate all names in case any duplication
        let newColNames;
        let retry;
        if (this._hasDupInList(splitCols)) {
            newColNames = splitCols.map(
                (_, i) => this._genColumnName(colToSplit, i + 1));
            retry = 1;
        } else {
            newColNames = splitCols.map((v) => v);
            retry = 0;
        }

        // Try to auto-generate column names
        const newNameLen = newColNames.length;
        while(retry < 50 && this._hasDupInAllCols(allColSet, newColNames)) {
            for (let i = 1; i <= newNameLen; i ++) {
                newColNames[i - 1] = this._genColumnName(
                    colToSplit,
                    retry * newNameLen + i);
            }
            retry ++;
        }

        return newColNames;
    }

    private _genColumnName(prefix: string, index: number): string {
        return `${prefix}-split-${index}`;
    }

    private _hasDupInList(colNames: string[]): boolean {
        const colSet = new Set<string>();
        for (const colName of colNames) {
            if (colSet.has(colName)) {
                return true;
            }
            colSet.add(colName);
        }
        return false;
    }

    private _hasDupInAllCols(allColSet: Set<string>, colNames: string[]): boolean {
        for (const colName of colNames) {
            if (allColSet.has(colName)) {
                return true;
            }
        }
        return false;
    }
}