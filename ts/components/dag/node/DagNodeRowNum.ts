class DagNodeRowNum extends DagNode {
    protected input: DagNodeRowNumInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.RowNum;
        this.maxParents = 1;
        this.minParents = 1;
        this.display.icon = "&#xe957;";
        this.input = new DagNodeRowNumInput(options.input);
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
        const rowNumColumn = ColManager.newPullCol(inputStruct.newField,
                                                   inputStruct.newField,
                                                   ColumnType.integer);
        changes.push({
            from: null,
            to: rowNumColumn
        });
        finalCols.push(rowNumColumn);

        return {
            columns: finalCols,
            changes: changes
        };
    }

    // XXX only for testing purpose. Remove when panel is done
    public setTestField() {
        this.setParam({newField: xcHelper.randName("rn")});
    }

    protected _getSerializeInfo(): DagNodeInfo {
        const nodeInfo = super._getSerializeInfo();
        return nodeInfo;
    }
}