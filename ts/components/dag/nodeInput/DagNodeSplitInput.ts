class DagNodeSplitInput extends DagNodeInput {
    protected input: DagNodeSplitInputStruct;

    public getInput() {
        return {
            source: this.input.source || "",
            delimiter: this.input.delimiter || "",
            dest: this.input.dest.map((v) => v)
        };
    }
}