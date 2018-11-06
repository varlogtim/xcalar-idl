class DagNodeRowNum extends DagNode {
    protected input: DagNodeRowNumInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.RowNum;
        this.maxParents = 1;
        this.minParents = 1;
        this.display.icon = "&#xea16;";
        this.input = new DagNodeRowNumInput(<DagNodeRowNumInputStruct>options.input);
    }

    /**
     * Set sql node's parameters
     * @param input {DagNodeProjectSQLStruct}
     * @param input.evalString {string}
     */
    public setParam(input: DagNodeRowNumInputStruct = <DagNodeRowNumInputStruct>{}) {
        this.input.setInput({
            newField: input.newField
        });
        super.setParam();
    }

    public lineageChange(): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const finalCols: ProgCol[] = [];
        const parents: DagNode[] = this.getParents();
        parents.forEach((parent) => {
            parent.getLineage().getColumns().forEach((parentCol) => {
                finalCols.push(parentCol);
            });
        });

        const inputStruct: DagNodeRowNumInputStruct = this.input.getInput();
        if (inputStruct != null) {
            const newField = inputStruct.newField;
            if (newField != null && newField.length > 0) {
                const rowNumColumn = ColManager.newPullCol(
                    newField, newField, ColumnType.integer);
                changes.push({ from: null, to: rowNumColumn });
                finalCols.push(rowNumColumn);
            }
        }

        return {
            columns: finalCols,
            changes: changes
        };
    }
}