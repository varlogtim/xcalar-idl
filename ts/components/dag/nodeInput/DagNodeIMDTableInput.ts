class DagNodeIMDTableInput extends DagNodeInput {
    protected input: DagNodeIMDTableInputStruct;

    public getInput() {
        return {
            source: this.input.source || "",
            version: this.input.version || -1,
            filterString: this.input.filterString || "",
            columns: this.input.columns || [],
        };
    }
}