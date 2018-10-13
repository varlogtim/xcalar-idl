class DagNodeExtensionInput extends DagNodeInput {
    protected input: DagNodeExtensionInputStruct;

    public getInput() {
        return {
            moduleName: this.input.moduleName || "",
            functName: this.input.functName || "",
            args: this.input.args || {}
        };
    }
}