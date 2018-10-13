class DagNodeSQLInput extends DagNodeInput {
    protected input: DagNodeSQLInputStruct;

    public getInput() {
        return {
            evalString: this.input.evalString || ""
        };
    }
}