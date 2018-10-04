class DagNodeAggregate extends DagNode {
    protected input: DagNodeAggregateInput;
    private aggVal: string | number; // non-persistent

    public constructor(options: DagNodeAggregateInfo) {
        super(options);
        this.type = DagNodeType.Aggregate;
        this.allowAggNode = true;
        this.aggVal = options.aggVal || null;
        this.minParents = 1;
        this.display.icon = "&#xe939;";
    }

    /**
     * @returns {DagNodeAggregateInput} Aggregate node parameters
     */
    public getParam(): DagNodeAggregateInput {
        return {
            evalString: this.input.evalString || "",
            dest: this.input.dest || ""
        };
    }

    /**
     * Set aggregate node's parameters
     * @param input {DagNodeAggregateInput}
     * @param input.evalString {string} The aggregatte eval string
     */
    public setParam(input: DagNodeAggregateInput = <DagNodeAggregateInput>{}) {
        this.input = {
            evalString: input.evalString,
            dest: input.dest
        }
        super.setParam();
    }

    /**
     *
     * @param aggVal {string | number} Set the aggregate result
     */
    public setAggVal(aggVal: string | number): void {
        this.aggVal = aggVal;
    }

    /**
     * @returns {string | number} Return the aggreate result
     */
    public getAggVal(): string | number {
        return this.aggVal;
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [],
            changes: []
        };
    }

    public applyColumnMapping(renameMap): void {
        try {
            this.input.evalString = this._replaceColumnInEvalStr(this.input.evalString,
                                                            renameMap.columns);
        } catch(err) {
            console.error(err);
        }
        super.setParam();
    }

    protected _clearConnectionMeta(): void {
        super._clearConnectionMeta();
        this.setAggVal(null);
    }

    protected _getSerializeInfo():DagNodeAggregateInfo {
        const serializedInfo: DagNodeAggregateInfo = <DagNodeAggregateInfo>super._getSerializeInfo();
        if (this.aggVal != null) {
            serializedInfo.aggVal = this.aggVal;
        }
        return serializedInfo;
    }
}