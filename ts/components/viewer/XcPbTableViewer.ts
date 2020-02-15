class XcPbTableViewer extends XcTableViewer {
    public constructor(table: TableMeta) {
        super(table, {
            fromSQL: true
        });
    }
    
    public getTitle(): string {
        const tableName: string = this.table.getName();
        return xcHelper.getTableName(tableName);
    }

    public updateToalNumRows(totalRows: number): void {
        const displayRows: number = this.rowManager.getTotalRowNum();
        const displayRowsStr: string = xcStringHelper.numToStr(displayRows);
        const totalRowsStr: string = xcStringHelper.numToStr(totalRows);
        const text: string = `${totalRowsStr} (show first ${displayRowsStr} rows)`;
        this.rowInput.updateTotalRowsText(text);
    } 
}
