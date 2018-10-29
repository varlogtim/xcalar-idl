class DagNodeCustomOutput extends DagNode {
    public constructor(options?: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.CustomOutput;
        this.maxParents = 1;
        this.minParents = 1;
        this.maxChildren = 0;
        this.display.icon = "&#xea5e;";
    }

    /**
     * @override
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     * @description
     * The output node doesn't change any columns
     */
    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    /**
     * Get output node's name for display
     */
    public getPortName(): string {
        return 'Output';
    }

    /**
     * @override
     * Get output parent's table
     * @returns {Table} return id of the table of input parent
     */
    public getTable(): string {
        // Output node has only one parent;
        const outputParent = this.getParents()[0];
        if (outputParent == null) {
            return null;
        }
        return outputParent.getTable();
    }

    /**
     * @override
     * Get input parent's state
     * @returns {DagNodeState} the state of input parent
     */
    public getState(): DagNodeState {
        // Output node has only one parent;
        const outputParent = this.getParents()[0];
        if (outputParent == null) {
            return DagNodeState.Unused;
        }
        return outputParent.getState();
    }

    /**
     * @override
     * Check if the output node's parent is configured
     */
    public isConfigured(): boolean {
        for (const parent of this.getParents()) {
            if (parent == null) {
                return false;
            }
            if (!parent.isConfigured()) {
                return false;
            }
        }
        return true;
    }
}