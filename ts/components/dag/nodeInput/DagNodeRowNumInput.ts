class DagNodeRowNumInput extends DagNodeInput {
    protected input: DagNodeRowNumInputStruct;

    public getInput() {
        return {
            newField: this.input.newField,
        };
    }
}