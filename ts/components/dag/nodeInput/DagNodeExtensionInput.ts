class DagNodeExtensionInput extends DagNodeInput {
    protected input: DagNodeExtensionInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeExtensionInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            moduleName: input.moduleName || "",
            functName: input.functName || "",
            args: input.args || {}
        };
    }
}