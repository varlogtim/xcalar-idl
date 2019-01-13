class SQLResultSpace {
    private static _instance: SQLResultSpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

    }

    private _setupListeners() {
        $("#sqlTableArea").on("click", ".btn-create", () => {
            let tableName: string = SQLTable.Instance.getTable();
            try {
                if (tableName == null) {
                    return;
                }
                let tableId = xcHelper.getTableId(tableName);
                let table = gTables[tableId];
                if (table == null) {
                    return;
                }
                let progCols = table.getAllCols().filter((progCol: ProgCol) => {
                    return !progCol.isDATACol();
                });
                CreatePublishTableModal.Instance.show(tableName, progCols);
            } catch (e) {
                console.error(e);
            }
        });
    }

    public setup(): void {
        SQLTable.Instance.close();
        SQLTableLister.Instance.close();
        SQLTableSchema.Instance.close();

        this._setupListeners();
    }

    public viewTable(table: TableMeta): void {
        SQLTable.Instance.show(table);
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
}