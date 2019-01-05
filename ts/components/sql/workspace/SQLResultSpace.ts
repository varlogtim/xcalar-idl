class SQLResultSpace {
    private static _instance: SQLResultSpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

    }

    public setup(): void {
        SQLTable.Instance.close();
        SQLTableLister.Instance.close();
        SQLTableSchema.Instance.close();
    }

    public showTables(reset: boolean): void {
        SQLTable.Instance.close();
        SQLTableSchema.Instance.close();
        SQLTableLister.Instance.show(reset);
    }

    public showSchema(tableInfo: PbTblInfo): void {
        SQLTable.Instance.close();
        SQLTableLister.Instance.close();
        SQLTableSchema.Instance.show(tableInfo);
    }

    public test(): void {
        for (let tableId in gTables) {
            let table = gTables[tableId];
            console.info("test, preview", tableId);
            SQLTable.Instance.show(table);
            break;
        }
    }
}