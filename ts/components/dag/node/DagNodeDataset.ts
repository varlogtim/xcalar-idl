class DagNodeDataset extends DagNodeIn {
    protected input: DagNodeDatasetInput;
    private loadArgs: string;

    public constructor(options: DagNodeDatasetInfo) {
        super(options);
        this.type = DagNodeType.Dataset;
        this.display.icon = "&#xe90f";
        this.loadArgs = options.loadArgs || null;
        this.input = new DagNodeDatasetInput(options.input);
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodeDatasetInputStruct}
     * @param input.source {string} Dataset source path
     * @param intpu.prefix {string} Prefix for the created table
     */
    public setParam(input: DagNodeDatasetInputStruct = <DagNodeDatasetInputStruct>{}): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const source: string = input.source;
        const prefix: string = input.prefix;
        const synthesize: boolean = input.synthesize;
        PromiseHelper.alwaysResolve(this._fetchLoadArgs(source))
        .then(() => {
            this.input.setInput({
                source: source,
                prefix: prefix,
                synthesize: synthesize
            });
            super.setParam();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Get the dataset name
     */
    public getDSName(): string {
        return this.input.getInput().source || null;
    }

    public getLoadArgs(): string {
        return this.loadArgs;
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

    protected _getSerializeInfo():DagNodeDatasetInfo {
        const serializedInfo: DagNodeDatasetInfo = <DagNodeDatasetInfo>super._getSerializeInfo();
        if (this.loadArgs) {
            serializedInfo.loadArgs = this.loadArgs;
        }
        return serializedInfo;
    }

    private _fetchLoadArgs(dsName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarDatasetGetLoadArgs(dsName)
        .then((loadArgs) => {
            this.loadArgs = loadArgs;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}