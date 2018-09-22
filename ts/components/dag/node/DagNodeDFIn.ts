class DagNodeDFIn extends DagNodeIn {
    protected input: DagNodeDFInInput;

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.type = DagNodeType.DFIn;
    }

    public getParam(): DagNodeDFInInput {
        return {
            dataflowId: this.input.dataflowId || "",
            linkOutName: this.input.linkOutName || ""
        };
    }

    public setParam(input: DagNodeDFInInput = <DagNodeDFInInput>{}): void {
        this.input = {
            dataflowId: input.dataflowId,
            linkOutName: input.linkOutName,
        };
        super.setParam();
    }
}