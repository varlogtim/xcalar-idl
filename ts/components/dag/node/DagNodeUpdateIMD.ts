class DagNodeUpdateIMD extends DagNodeOut {
    protected input: DagNodeUpdateIMDInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.UpdateIMD;
        this.display.icon = "&#xea55;";
        this.input = new DagNodeUpdateIMDInput(options.input);
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodeUpdateIMDInputStruct}

     */
    public setParam(input: DagNodeUpdateIMDInputStruct): void {
        this.input.setInput({
            pubTableName: input.pubTableName,
            operator: input.operator
        });
        super.setParam();
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}