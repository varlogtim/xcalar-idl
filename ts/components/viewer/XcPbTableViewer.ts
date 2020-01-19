class XcPbTableViewer extends XcTableViewer {
    public getTitle(): string {
        const tableName: string = this.table.getName();
        return xcHelper.getTableName(tableName);
    }

    /**
     * @override
     */
    public clear(): XDPromise<void> {
        DagList.Instance.clearFocusedTable();
        return super.clear();
    }
}