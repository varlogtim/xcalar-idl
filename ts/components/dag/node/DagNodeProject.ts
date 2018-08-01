class DagNodeProject extends DagNode {
    protected input: DagNodeProjectInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Project;
        this.minParents = 1;
    }

    /**
     * @returns {DagNodeProjectInput} Project node parameters
     */
    public getParam(): DagNodeProjectInput {
        return {
            columns: this.input.columns || [""]
        };
    }

    /**
     * Set project node's parameters
     * @param input {DagNodeProjectInput}
     * @param input.columns {string[]} An array of column names to project
     */
    public setParam(input: DagNodeProjectInput = <DagNodeProjectInput>{}) {
        this.input = {
            columns: input.columns
        }
    }
}