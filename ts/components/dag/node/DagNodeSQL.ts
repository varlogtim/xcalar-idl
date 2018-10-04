// XXX this has not been implemented and is simply a clone of Filter
class DagNodeSQL extends DagNode {
    protected input: DagNodeSQLInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.SQL;
        this.allowAggNode = true;
        this.minParents = 1;
        this.display.icon = "&#xe957;";
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

    // XXX TODO
    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: [],
            changes: []
        };
    }
}