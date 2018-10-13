class DagNodeProjectInput extends DagNodeInput {
    protected input: DagNodeProjectInputStruct;

    public getInput() {
        return {
            columns: this.input.columns || [""]
        };
    }
}