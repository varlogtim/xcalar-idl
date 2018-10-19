class DagNodeDFOutInput extends DagNodeInput {
    protected input: DagNodeDFOutInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeDFOutInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            name: input.name || "",
            linkAfterExecution: input.linkAfterExecution || false,
        };
    }
}