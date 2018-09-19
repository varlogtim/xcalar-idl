class DagNodePublishIMD extends DagNode {
    protected input: DagNodePublishIMDInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.PublishIMD;
        this.maxChildren = 0;
        this.minParents = 1;
    }

    /**
     * @returns {DagNodePublishIMDInput} Dataset input params
     */
    public getParam(): DagNodePublishIMDInput {
        return {
            name: this.input.name || "",
            key: this.input.key || "",
            operator: this.input.operator || ""
        };
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodePublishIMDInput}

     */
    public setParam(input: DagNodePublishIMDInput = <DagNodePublishIMDInput>{}): void {
        this.input = {
            name: input.name,
            key: input.key,
            operator: input.operator
        }
        super.setParam();
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [], // export node no need to know lineage
            changes: []
        }
    }
}