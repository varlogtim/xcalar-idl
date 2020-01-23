class SQLResultSpace {
    private static _instance: SQLResultSpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _sqlTable: SQLTable;
    private _tableLister: SQLTableLister;
    private _sqlTableSchema: SQLTableSchema;
    private _sqlDataflowPreview: SQLDataflowPreview;
    private _sqlResultQueryLister: SQLResultQueryLister;
    private _sqlResultFuncLister: SQLResultFuncLister;
    private _sqlResultUDFLister: SQLResultUDFLister;

    private constructor() {
        this._sqlTable = new SQLTable("sqlTableArea");
        this._tableLister = new SQLTableLister("sqlTableListerArea");
        this._sqlTableSchema = new SQLTableSchema("sqlTableSchemaArea");
        this._sqlDataflowPreview = new SQLDataflowPreview("sqlDataflowArea");
        this._sqlResultQueryLister = new SQLResultQueryLister("sqlResultQueryListArea");
        this._sqlResultFuncLister = new SQLResultFuncLister("sqlResultFuncListArea");
        this._sqlResultUDFLister = new SQLResultUDFLister("sqlResultUDFListArea");
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

        this._getTabSection().on("click", ".tab", (el) => {
            const $tab = $(el.currentTarget);
            this._switchTab($tab.data("tab"));
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
        this._sqlResultQueryLister.show();
        this._sqlResultFuncLister.show();
        this._sqlResultUDFLister.show();
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
        this._switchTab("result");
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
        this._switchTab("result");
    }

    // XXX TODO: move the whole DagTable functionality there
    /**
     * SQLResultSpace.Instance.showDagTable
     */
    public showDagTable(): void {
        this._sqlTable.close();
        this._sqlTableSchema.close();
        this._sqlDataflowPreview.close();
        this._tableLister.close()
        this._switchTab("result");
    }

    public refreshTables(): void {
        this._tableLister.refresh();
    }

    public showSchema(tableInfo: PbTblInfo): void {
        this._sqlTable.close();
        this._tableLister.close();
        this._sqlTableSchema.show(tableInfo);
        this._switchTab("result");
    }

    public showSchemaError(errorString: string): void {
        this._sqlTable.close();
        this._tableLister.close();
        this._sqlDataflowPreview.close();
        this._sqlTableSchema.showError(errorString);
        this._switchTab("result");
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
        this._switchTab("result");
    }

    /**
     * SQLResultSpace.Instance.getAvailableTables
     */
    public getAvailableTables(): PbTblInfo[] {
        return this._tableLister.getAvailableTables();
    }

    /**
     * SQLResultSpace.Instance.getShownResultID
     * returns the ID of the table being shown, or null if none
     */
    public getShownResultID(): string {
        return this._sqlTable.getTable();
    }

    private _switchTab(tab): void {
        const $tabSection: JQuery = this._getTabSection();
        $tabSection.find(".tab.active").removeClass("active");
        $tabSection.find('.tab[data-tab="' + tab + '"]').addClass("active");

        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".section").addClass("xc-hidden");
        $contentSection.find(".section" + "." + tab).removeClass("xc-hidden");

        switch (tab) {
            case "query":
                this._sqlResultQueryLister.show();
                break;
            case "udf":
                this._sqlResultUDFLister.show();
                break;
            case "sqlFunc":
                this._sqlResultFuncLister.show();
                break;
            case "result":
                if ($("#sqlTableArea").hasClass("xc-hidden") &&
                    $("#sqlDataflowArea").hasClass("xc-hidden")
                ) {
                    $contentSection.find(".section.result .hintArea").removeClass("xc-hidden");
                } else {
                    $contentSection.find(".section.result .hintArea").addClass("xc-hidden");
                }
                break;
            default:
                break;
        }
    }

    private _getResultSection(): JQuery {
        return $("#sqlWorkSpacePanel .resultSection");
    }

    private _getTabSection(): JQuery {
        return this._getResultSection().find(".tabSection");
    }

    private _getContentSection(): JQuery {
        return this._getResultSection().find(".contentSection");
    }
}