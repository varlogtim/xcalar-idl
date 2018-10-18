class DagNodeRoundInput extends DagNodeInput {
    protected input: DagNodeRoundInputStruct;

    public getInput() {
        return {
            sourceColumn: this.input.sourceColumn || "",
            numDecimals: this.input.numDecimals || 0,
            destColumn: this.input.destColumn || ""
        };
    }
}