class DagNodeAggregate extends DagNode {
    protected input: DagNodeAggregateInput;
    private aggVal: string | number; // non-persistent

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Aggregate;
        this.allowAggNode = true;
        this.aggVal = null;
        this.minParents = 1;
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

    protected _clearConnectionMeta(): void {
        super._clearConnectionMeta();
        this.setAggVal(null);
    }
}