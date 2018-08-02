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
            groupBy: this.input.groupBy || [""],
            aggregate: this.input.aggregate || [{operator: "", sourceColumn: "", destColumn: "", distinct: false}],
            includeSample: this.input.includeSample || false,
            icv: this.input.icv || false,
            groupAll: this.input.groupAll || false,
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
            groupBy: input.groupBy,
            aggregate: input.aggregate,
            includeSample: input.includeSample,
            icv: input.icv,
            groupAll: input.groupAll
        }
    }
}