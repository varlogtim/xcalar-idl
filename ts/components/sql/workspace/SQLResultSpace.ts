class SQLResultSpace {
    private static _instance: SQLResultSpace;
    private _resultTable: TableMeta;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

    }

    private _setupListeners() {
        const self = this;
        $("#sqlTableArea").on("click", ".btn-create", function() {
            CreatePublishTableModal.Instance.show(self._resultTable.getName(),
                self._resultTable.getAllCols());
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

    public test(): void {
        for (let tableId in gTables) {
            let table: TableMeta = gTables[tableId];
            console.info("test, preview", tableId);
            this._resultTable = table;
            SQLTable.Instance.show(table);
            break;
        }
    }
}