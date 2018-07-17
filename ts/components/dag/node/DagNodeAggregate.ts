class DagNodeAggregate extends DagNode {
    protected input: DagNodeAggregateInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Aggregate;
        this.allowAggNode = true;
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
}