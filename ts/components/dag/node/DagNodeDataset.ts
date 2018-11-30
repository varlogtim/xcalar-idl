class DagNodeDataset extends DagNodeIn {
    protected input: DagNodeDatasetInput;

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.type = DagNodeType.Dataset;
        this.display.icon = "&#xe90f";
        this.input = new DagNodeDatasetInput(options.input);
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodeDatasetInputStruct}
     * @param input.source {string} Dataset source path
     * @param intpu.prefix {string} Prefix for the created table
     */
    public setParam(
        input: DagNodeDatasetInputStruct = <DagNodeDatasetInputStruct>{},
        noAutoExecute?: boolean
    ): void {
        const source: string = input.source;
        const prefix: string = input.prefix;
        const synthesize: boolean = input.synthesize;
        const loadArgs: string = input.loadArgs;
        this.input.setInput({
            source: source,
            prefix: prefix,
            synthesize: synthesize,
            loadArgs: loadArgs
        });
        super.setParam(null, noAutoExecute);
    }

    public confirmSetParam(): void {
        // this is just to trigger param change event
        // so auto execution can be triggered
        super.setParam();
    }

    /**
     * Get the dataset name
     */
    public getDSName(): string {
        return this.input.getInput().source || null;
    }

    public getLoadArgs(): string {
        return this.input.getInput().loadArgs || null;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDatasetInputStruct = this.getParam();
        if (input.source) {
            const dsName: string = xcHelper.parseDSName(input.source).dsName;
            hint += `Source: ${dsName}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null
    }
}