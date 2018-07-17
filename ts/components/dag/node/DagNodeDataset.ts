class DagNodeDataset extends DagNode {
    protected input: DagNodeDatasetInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Dataset;
        this.maxParents = 0;
        this.setParam(this.input);
    }

    /**
     * @returns {DagNodeDatasetInput} Dataset input params
     */
    public getParam(): DagNodeDatasetInput {
        return {
            source: this.input.source || "",
            prefix: this.input.prefix || ""
        };
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodeDatasetInput}
     * @param input.source {string} Dataset source path
     * @param intpu.prefix {string} Prefix for the created table
     */
    public setParam(input: DagNodeDatasetInput = <DagNodeDatasetInput>{}) {
        this.input = {
            source: input.source,
            prefix: input.prefix
        }
    }
}