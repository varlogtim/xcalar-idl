class DagNodeDFInInput extends DagNodeInput {
    protected input: DagNodeDFInInputStruct;

    public getInput() {
        return {
            dataflowId: this.input.dataflowId || "",
            linkOutName: this.input.linkOutName || ""
        };
    }
}