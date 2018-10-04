class DagNodePublishIMD extends DagNode {
    protected input: DagNodePublishIMDInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.PublishIMD;
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xea55;";
    }

    /**
     * @returns {DagNodePublishIMDInput} Dataset input params
     */
    public getParam(): DagNodePublishIMDInput {
        return {
            pubTableName: this.input.pubTableName || "",
            primaryKey: this.input.primaryKey || "",
            operator: this.input.operator || ""
        };
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodePublishIMDInput}

     */
    public setParam(input: DagNodePublishIMDInput): void {
        this.input = {
            pubTableName: input.pubTableName,
            primaryKey: input.primaryKey,
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