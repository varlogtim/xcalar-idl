class DagNodePublishIMDInput extends DagNodeInput {
    protected input: DagNodePublishIMDInputStruct;

    public getInput() {
        return {
            pubTableName: this.input.pubTableName || "",
            primaryKey: this.input.primaryKey || "",
            operator: this.input.operator || ""
        };
    }
}