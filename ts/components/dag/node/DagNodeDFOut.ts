class DagNodeDFOut extends DagNodeOut {
    protected input: DagNodeDFOutInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.DFOut;
        this.display.icon = "&#xe955;"; // XXX TODO: UI design
        this.input = new DagNodeDFOutInput(options.input);
    }

    public setParam(input: DagNodeDFOutInputStruct = <DagNodeDFOutInputStruct>{}): void {
        this.input.setInput({
            name: input.name,
            linkAfterExecution: input.linkAfterExecution,
            columns: input.columns
        });
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {

        if (this.subType === DagNodeSubType.DFOutOptimized) {
            const allCols = [];
            const changes = [];
            const selectedCols = this.input.getInput(replaceParameters).columns;
            columns.forEach((col) => {
                const colName = col.getBackColName();
                const selectedCol = selectedCols.find((selCol) => {
                    return selCol.sourceName === colName;
                });
                if (selectedCol != null) {
                    if (selectedCol.destName !== col.getBackColName()) {
                        const progCol = ColManager.newPullCol(selectedCol.destName, selectedCol.destName, col.getType());
                        allCols.push(progCol);
                        changes.push({
                            from: col,
                            to: progCol
                        });
                    } else {
                        allCols.push(col);
                    }
                } else {
                    changes.push({
                        from: col,
                        to: null
                    });
                }
            });
            return {
                columns: allCols,
                changes: changes
            }
        } else {
            return {
                columns: columns,
                changes: []
            };
        }
    }

    public shouldLinkAfterExecuition(): boolean {
        return this.input.getInput().linkAfterExecution;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDFOutInputStruct = this.getParam();
        if (input.name) {
            hint = `Name: ${input.name}`;
        }
        return hint;
    }
}