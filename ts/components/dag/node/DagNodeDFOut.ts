class DagNodeDFOut extends DagNodeOut {
    protected input: DagNodeDFOutInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.DFOut;
        this.display.icon = "&#xe955;"; // XXX TODO: UI design
        this.input = new DagNodeDFOutInput(options.input);
    }

    public setParam(input: DagNodeDFOutInputStruct = <DagNodeDFOutInputStruct>{}): void {
        this.input.setInput({
            name: input.name,
            linkAfterExecution: input.linkAfterExecution
        });
        super.setParam();
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    public shouldLinkAfterExecuition(): boolean {
        return this.input.getInput().linkAfterExecution;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDFOutInputStruct = this.getParam();
        if (input.name) {
            hint = `Name: ${input.name}`;
        }
        return hint;
    }
}