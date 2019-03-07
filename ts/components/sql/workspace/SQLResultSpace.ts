class SQLResultSpace {
    private static _instance: SQLResultSpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tableLister: SQLTableLister;

    private constructor() {
        this._tableLister = new SQLTableLister("sqlTableListerArea");
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

        $("#sqlTableArea").on("click", ".btn-export", function() {
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
                ExportSQLTableModal.Instance.show(tableName, progCols);
            } catch (e) {
                console.error(e);
            }
        });
    }

    public setup(): void {
        SQLTable.Instance.close();
        this._tableLister.close();
        SQLTableSchema.Instance.close();
        SQLDataflowPreview.Instance.close();

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
        SQLTable.Instance.show(table, columns, callback);
        this._tableLister.close();
        SQLTableSchema.Instance.close();
        SQLDataflowPreview.Instance.close();
    }

    /**
     * SQLResultSpace.Instance.showTables
     * @param reset
     */
    public showTables(reset: boolean): void {
        SQLTable.Instance.close();
        SQLTableSchema.Instance.close();
        SQLDataflowPreview.Instance.close();
        this._tableLister.show(reset);
    }

    public showSchema(tableInfo: PbTblInfo): void {
        SQLTable.Instance.close();
        this._tableLister.close();
        SQLDataflowPreview.Instance.close();
        SQLTableSchema.Instance.show(tableInfo);
    }

    public showSchemaError(errorString: string): void {
        SQLTable.Instance.close();
        this._tableLister.close();
        SQLDataflowPreview.Instance.close();
        SQLTableSchema.Instance.showError(errorString);
    }

    /**
     *
     * @param inProgress - set to true if previewing dataflow while it's running
     */
    public showProgressDataflow(inProgress: boolean, sql?: string): void {
        SQLTable.Instance.close();
        SQLTableSchema.Instance.close();
        this._tableLister.close();
        SQLDataflowPreview.Instance.show(inProgress, sql);
    }

    /**
     * SQLResultSpace.Instance.getAvailableTables
     */
    public getAvailableTables(): PbTblInfo[] {
        return this._tableLister.getAvailableTables();
    }
}