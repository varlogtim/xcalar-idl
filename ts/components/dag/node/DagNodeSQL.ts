class DagNodeSQL extends DagNode {
    protected input: DagNodeSQLInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.SQL;
        this.allowAggNode = true;
    }

    /**
     * @returns {DagNodeSQLInput} Sql node parameters
     */
    public getParam(): DagNodeSQLInput {
        return {
            evalString: this.input.evalString || ""
        };
    }

    /**
     * Set sql node's parameters
     * @param input {DagNodeSQLInput}
     * @param input.evalString {string}
     */
    public setParam(input: DagNodeSQLInput = <DagNodeSQLInput>{}) {
        this.input = {
            evalString: input.evalString
        }
        this.beConfiguredState();
    }
}