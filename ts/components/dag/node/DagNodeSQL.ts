// XXX this has not been implemented and is simply a clone of Filter
class DagNodeSQL extends DagNode {
    protected input: DagNodeSQLInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.SQL;
        this.allowAggNode = true;
        this.minParents = 1;
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
        super.setParam();
    }
}