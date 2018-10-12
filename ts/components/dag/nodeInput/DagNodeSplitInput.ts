class DagNodeSplitInput extends DagNodeInput {
    protected input: DagNodeSplitInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeSplitInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            source: input.source || "",
            delimiter: input.delimiter || "",
            dest: input.dest.map((v) => v)
        };
    }
}