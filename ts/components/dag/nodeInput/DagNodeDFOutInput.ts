class DagNodeDFOutInput extends DagNodeInput {
    protected input: DagNodeDFOutInputStruct;

    public getInput() {
        return {
            name: this.input.name || ""
        };
    }
}