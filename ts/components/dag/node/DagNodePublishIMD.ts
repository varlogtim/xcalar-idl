class DagNodePublishIMD extends DagNode {
    protected input: DagNodePublishIMDInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.PublishIMD;
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xea55;";
        this.input = new DagNodePublishIMDInput(options.input);
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodePublishIMDInputStruct}

     */
    public setParam(input: DagNodePublishIMDInputStruct): void {
        this.input.setInput({
            pubTableName: input.pubTableName,
            primaryKeys: input.primaryKeys,
            operator: input.operator
        });
        super.setParam();
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [], // export node no need to know lineage
            changes: []
        }
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}