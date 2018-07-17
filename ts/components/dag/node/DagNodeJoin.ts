class DagNodeJoin extends DagNode {
    protected input: DagNodeJoinInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Join;
        this.maxParents = 2;
    }

    /**
     * @returns {DagNodeJoinInput} Join node parameters
     */
    public getParam(): DagNodeJoinInput {
        return {
            joinType: this.input.joinType || JoinOperatorTStr[JoinOperatorT.InnerJoin],
            columns: this.input.columns || [[{sourceColumn: "", destColumn: "", columnType: ""}]],
            evalString: this.input.evalString || ""
        };
    }

    /**
     * Set join node's parameters
     * @param input {DagNodeJoinInput}
     * @param input.joinType {string} Join type
     * @param input.columns column infos from left table and right table
     * @param input.evalString {string} Optional, eavlString in join
     */
    public setParam(input: DagNodeJoinInput = <DagNodeJoinInput>{}) {
        this.input = {
            joinType: input.joinType,
            columns: input.columns,
            evalString: input.evalString
        }
    }
}