class SQLResultSpace {
    private static _instance: SQLResultSpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

    }

    public setup(): void {
        
    }

    public test(): void {
        for (let tableId in gTables) {
            let table = gTables[tableId];
            console.info("test, preview", tableId);
            SQLTable.Instance.previewTable(table);
            break;
        }
    }
}