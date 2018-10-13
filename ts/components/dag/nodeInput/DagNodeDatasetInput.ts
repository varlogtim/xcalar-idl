class DagNodeDatasetInput extends DagNodeInput {
    protected input: DagNodeDatasetInputStruct;

    public getInput() {
        return {
            source: this.input.source || "",
            prefix: this.input.prefix || ""
        };
    }
}