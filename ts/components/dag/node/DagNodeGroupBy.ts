class DagNodeGroupBy extends DagNode {
    protected input: DagNodeGroupByInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.GroupBy;
    }

    /**
     * @returns {DagNodeGroupByInput} GroupBy node parameters
     */
    public getParam(): DagNodeGroupByInput {
        return {
            keys: this.input.keys || [""],
            eval: this.input.eval || [{evalString: "", newField: ""}],
            includeSample: this.input.includeSample || false
        };
    }

    /**
     * Set project node's parameters
     * @param input {DagNodeProjectInput}
     * @param input.keys {string[]} An array of column names to group on
     * @param input.eval an array of column eval info
     * @param includeSample {boolean} include sample columns or not
     */
    public setParam(input: DagNodeGroupByInput = <DagNodeGroupByInput>{}) {
        this.input = {
            keys: input.keys,
            eval: input.eval,
            includeSample: input.includeSample
        }
    }
}