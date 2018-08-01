class DagNodeJoin extends DagNode {
    protected input: DagNodeJoinInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Join;
        this.maxParents = 2;
        this.minParents = 2;
    }

    /**
     * @returns {DagNodeJoinInput} Join node parameters
     */
    public getParam(): DagNodeJoinInput {
        return {
            joinType: this.input.joinType || JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: this.input.left || this._getDefaultTableInfo(),
            right: this.input.right || this._getDefaultTableInfo(),
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
            left: input.left,
            right: input.right,
            evalString: input.evalString
        }
    }

    private _getDefaultTableInfo(): DagNodeJoinTableInput {
        return {
            columns: [""],
            casts: [null],
            rename: [{sourceColumn: "", destColumn: "", prefix: false}]
        }
    }
}