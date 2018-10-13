class DagNodeFilterInput extends DagNodeInput {
    protected input: DagNodeFilterInputStruct;

    public getInput() {
        return {
            evalString: this.input.evalString || "",
        };
    }
}