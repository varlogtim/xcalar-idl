class DagNodeDFInInput extends DagNodeInput {
    protected input: DagNodeDFInInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeDFInInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            dataflowId: input.dataflowId || "",
            linkOutName: input.linkOutName || ""
        };
    }
}