class DFLinkOutOpPanelModel {
    protected dagNode: DagNode;
    protected tableColumns: ProgCol[];
    protected columnList: ExportOpPanelModelColumnInfo[];
    protected event: Function;
    private readonly validTypes: ColumnType[] = [];

    public constructor(dagNode: DagNode, event: Function) {
        this.dagNode = dagNode;
        this.event = event;
        [ColumnType.string, ColumnType.integer, ColumnType.float,
            ColumnType.boolean, ColumnType.mixed].forEach((type) => {
                this.validTypes.push(type);
        });
        this.tableColumns = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0] || [];

        this.tableColumns = this.tableColumns.filter((col) => {
            const colType = col.getType();
            return (this.validTypes.includes(colType));
        });
        const param: DagNodeDFOutInputStruct = this.dagNode.getParam();
        const columns = param.columns;
        this.columnList = this.tableColumns.map(col => {
            return {
                name: col.getBackColName(),
                isSelected: columns.indexOf(col.getBackColName()) > -1,
                type: col.getType()
            }
        });
    }

    public getColumns(): ProgCol[] {
        return this.tableColumns;
    }

    public getColumnList() {
        return this.columnList;
    }


    /**
     * Sets all columns to be selected or not
     * @param selected
     */
    public setAllCol(selected: boolean): void {
        this.columnList.forEach((column: ExportOpPanelModelColumnInfo) => {
            column.isSelected = selected;
        });
    }

    /**
     * Toggles the column at the index to be selected or not
     * @param colIndex
     */
    public toggleCol(colIndex: number): void {
        let col: ExportOpPanelModelColumnInfo = this.columnList[colIndex];
        col.isSelected = !col.isSelected;
        return;
    }
}