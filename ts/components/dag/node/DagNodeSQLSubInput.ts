class DagNodeSQLSubInput extends DagNode {
    private _container: DagNodeSQL;

    public constructor(options?: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.SQLSubInput;
        this.maxParents = 0;
        this.minParents = 0;
        this.display.icon = "&#xea5e;";
    }

    /**
     * Set the container node, which the input belongs to
     * @param dagNode
     */
    public setContainer(dagNode: DagNodeSQL) {
        this._container = dagNode;
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     * @description
     * The input node doesn't change any columns, and is only a bridge between sub graph and parents
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

    /**
     * @override
     * Get input parent's table
     * @returns {Table} return id of the table of input parent
     */
    public getTable(): string {
        if (this._container == null) {
            console.error('DagNodeSubGraphInput.getTable: No container');
            return null;
        }
        const inputParent =  this._container.getInputParent(this);
        if (inputParent == null) {
            return null;
        }
        return inputParent.getTable();
    }

    /**
     * @override
     * Get input parent's state
     * @returns {DagNodeState} the state of input parent
     */
    public getState(): DagNodeState {
        if (this._container == null) {
            console.error('DagNodeSubGraphInput.getState: No container');
            return DagNodeState.Unused;
        }
        const inputParent =  this._container.getInputParent(this);
        if (inputParent == null) {
            return DagNodeState.Unused;
        }
        return inputParent.getState();
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}