class DagNodeCustomInput extends DagNode {
    private _container: DagNodeCustom;

    public constructor(options?: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.CustomInput;
        this.maxParents = 0;
        this.minParents = 0;
    }

    /**
     * Set the custom node, which the input belongs to
     * @param dagNode 
     */
    public setContainer(dagNode: DagNodeCustom) {
        this._container = dagNode;
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     * @description
     * The input node doesn't change any columns, and is only a bridge between custom operator's sub graph and parents
     */
    public lineageChange(_: ProgCol[]): DagLineageChange {
        const inputParent = this._container.getInputParent(this);
        if (inputParent == null || inputParent.getLineage() == null) {
            return { columns: [], changes: [] };
        }
        return {
            columns: inputParent.getLineage().getColumns(),
            changes: []
        };
    }

    /**
     * Get input node's name for display
     */
    public getPortName(): string {
        if (this._container == null) {
            return 'Input';
        }
        return `Input#${this._container.getInputIndex(this) + 1}`;
    }
}