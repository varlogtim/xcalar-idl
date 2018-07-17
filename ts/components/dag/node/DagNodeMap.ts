class DagNodeMap extends DagNode {
    protected input: DagNodeMapInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Map;
        this.allowAggNode = true;
    }

    /**
     * @returns {DagNodeMapInput} Map node parameters
     */
    public getParam(): DagNodeMapInput {
        return {
            eval: this.input.eval || [{evalString: "", newFieldName: ""}]
        };
    }

    /**
     * Set map node's parameters
     * @param input {DagNodeMapInput}
     * @param input.eval {Array} array of {evalString, newFieldName}
     */
    public setParam(input: DagNodeMapInput = <DagNodeMapInput>{}) {
        this.input = {
            eval: input.eval
        }
    }
}