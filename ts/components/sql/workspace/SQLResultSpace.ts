class SQLResultSpace {
    private static _instance: SQLResultSpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _sqlTable: SQLTable;
    private _tableLister: SQLTableLister;
    private _sqlTableSchema: SQLTableSchema;
    private _sqlDataflowPreview: SQLDataflowPreview;

    private constructor() {
        this._sqlTable = new SQLTable("sqlTableArea");
        this._tableLister = new SQLTableLister("sqlTableListerArea");
        this._sqlTableSchema = new SQLTableSchema("sqlTableSchemaArea");
        this._sqlDataflowPreview = new SQLDataflowPreview("sqlDataflowArea");
    }

    private _setupListeners() {
        $("#sqlTableArea").on("click", ".btn-create", () => {
            let tableName: string = this._sqlTable.getTable();
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

        $("#sqlTableArea").on("click", ".btn-export", () => {
            let tableName: string = this._sqlTable.getTable();
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
                ExportSQLTableModal.Instance.show(tableName, progCols);
            } catch (e) {
                console.error(e);
            }
        });
    }

    public setup(): void {
        this._sqlTable.close();
        this._tableLister.close();
        this._sqlTableSchema.close();
        this._sqlDataflowPreview.close();

        this._setupListeners();
    }

    /**
     * SQLResultSpace.Instance.refresh
     */
    public refresh(): void {
        this._tableLister.refresh();
    }

    /**
     * SQLResultSpace.Instance.viewTable
     * @param table
     * @param callback
     */
    public viewTable(
        table: TableMeta,
        columns: {name: string, backName: string, type: ColumnType}[], 
        callback?: Function
    ): void {
        this._sqlTable.show(table, columns, callback);
        this._tableLister.close();
        this._sqlTableSchema.close();
        this._sqlDataflowPreview.close();
    }

    /**
     * SQLResultSpace.Instance.showTables
     * @param reset
     */
    public showTables(reset: boolean): void {
        this._sqlTable.close();
        this._sqlTableSchema.close();
        this._sqlDataflowPreview.close();
        this._tableLister.show(reset);
    }

    public refreshTables(): void {
        this._tableLister.refresh();
    }

    public showSchema(tableInfo: PbTblInfo): void {
        this._sqlTable.close();
        this._tableLister.close();
        this._sqlDataflowPreview.close();
        this._sqlTableSchema.show(tableInfo);
    }

    public showSchemaError(errorString: string): void {
        this._sqlTable.close();
        this._tableLister.close();
        this._sqlDataflowPreview.close();
        this._sqlTableSchema.showError(errorString);
    }

    /**
     *
     * @param inProgress - set to true if previewing dataflow while it's running
     */
    public showProgressDataflow(inProgress: boolean, sql?: string): void {
        this._sqlTable.close();
        this._sqlTableSchema.close();
        this._tableLister.close();
        this._sqlDataflowPreview.show(inProgress, sql);
    }

    /**
     * SQLResultSpace.Instance.getAvailableTables
     */
    public getAvailableTables(): PbTblInfo[] {
        return this._tableLister.getAvailableTables();
    }
}