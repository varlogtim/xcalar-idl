class DagNodeFilter extends DagNode {
    protected input: DagNodeFilterInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Filter;
        this.allowAggNode = true;
    }

    /**
     * @returns {DagNodeFilterInput} Filter node parameters
     */
    public getParam(): DagNodeFilterInput {
        return {
            evalString: this.input.evalString || ""
        };
    }

    /**
     * Set filter node's parameters
     * @param input {DagNodeFilterInput}
     * @param input.evalString {string} The filter eval string
     */
    public setParam(input: DagNodeFilterInput = <DagNodeFilterInput>{}) {
        this.input = {
            evalString: input.evalString
        }
    }
}