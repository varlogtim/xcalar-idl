class SQLResultSpace {
    private static _instance: SQLResultSpace;
    private _popup: PopupPanel;
    private _preventShow: boolean = false;

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
        this._getResultSection().find(".closeResult").click(() => {
            this._toggleDisplay(false);
        });

        $("#dagView .openResult").click(() => {
            const $resultSection = this._getResultSection();
            const $container = $resultSection.parent();
            this._toggleDisplay(true);
        });

        $("#dagView .stackResult").click(() => {
            this._toggleDisplayExpanded(true);
        });

        $("#dagView .collapseResult").click(() => {
            this._toggleDisplayExpanded(false);
        });

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
     * SQLResultSpace.Instance.switchTab
     * @param tab
     */
    public switchTab(tab: string): void {
        return this._switchTab(tab);
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
        DagTable.Instance.close();
        this._sqlTable.show(table, columns, callback);
        this._sqlDataflowPreview.close();
    }

    /**
     * SQLResultSpace.Instance.viewPublishedTable
     * @param tableName
     */
    public async viewPublishedTable(tableName: string): Promise<void> {
        DagTable.Instance.close();
        this._sqlTable.showPublishedTable(tableName);
        this._sqlDataflowPreview.close();
    }

    /**
     * SQLResultSpace.Instance.showTables
     * @param reset
     */
    public showTables(reset: boolean, firstTouch?: boolean): void {
        this._sqlTableSchema.close();
        this._tableLister.show(reset);
        if (firstTouch && this._preventShow) {
            // if trying to show for the first time but prevented because
            // user had the panel closed last time, don't show this time but
            // allow afterwards
            this._preventShow = false;
            return;
        }
        TableTabManager.Instance.openSQLTab();
    }

    // XXX TODO: move the whole DagTable functionality there
    /**
     * SQLResultSpace.Instance.showDagTable
     */
    public showDagTable(): void {
        this._sqlTable.close();
        this._sqlDataflowPreview.close();
    }

    public refreshTables(): void {
        this._tableLister.refresh();
    }

    public showSchema(tableInfo: PbTblInfo): void {
        this._tableLister.close();
        this._sqlTableSchema.show(tableInfo);
        TableTabManager.Instance.openSQLTab();
    }

    public showSchemaError(errorString: string): void {
        this._tableLister.close();
        this._sqlTableSchema.showError(errorString);
        TableTabManager.Instance.openSQLTab();
    }

    /**
     * SQLResultSpace.Instance.showError
     * @param error
     */
    public showError(error: string): void {
        this.switchTab("error");
        this._getContentSection().find(".section.error").text(error);
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

    public getSQLTable(): SQLTable {
        return this._sqlTable;
    }

    public setupPopup(): void {
        this._popup = new PopupPanel("tableViewContainer", {
            noUndock: true
        });
        this._popup
        .on("Hide", (info: {restoring: boolean}) => {
            this._toggleDisplay(false);
            if (info && info.restoring) {
                this._preventShow = true;
            }
        })
        .on("ResizeDocked", (state) => {
            if (state.dockedWidth != null) {
                $("#tableViewContainer").parent().css("width", `${state.dockedWidth}%`);
            }
            if (state.dockedHeight != null) {
                $("#tableViewContainer").parent().css("height", `${state.dockedHeight}%`);
            }
        })
        .on("VertStack", () => {
            this._toggleDisplayExpanded(true);
        });
    }

    public getPopup(): PopupPanel {
        return this._popup;
    }

    private _switchTab(tab): void {
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".section").addClass("xc-hidden");
        $contentSection.find(".section" + "." + tab).removeClass("xc-hidden");

        switch (tab) {
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
        this._toggleDisplay(true);
    }

    private _getResultSection(): JQuery {
        return $("#sqlWorkSpacePanel .resultSection");
    }

    private _getContentSection(): JQuery {
        return this._getResultSection().find(".contentSection");
    }

    private _toggleDisplay(display: boolean): void {
        if (display && this._preventShow) {
            return;
        }
        const $resultSection = this._getResultSection();
        const $container = $resultSection.parent();
        if (display) {
            $container.removeClass("noResult");
            $resultSection.removeClass("xc-hidden");
            this._popup.trigger("Show_BroadCast");
        } else {
            $container.addClass("noResult");
            $resultSection.addClass("xc-hidden");
            this._toggleDisplayExpanded(false);
            this._popup.trigger("Hide_BroadCast");
        }
        PopupManager.checkAllContentUndocked();
    }

    private _toggleDisplayExpanded(expand: boolean) {
        const $resultSection = this._getResultSection();
        const $container = $resultSection.parent();
        if (expand) {
            $container.addClass("flexColumn");
            this._popup.trigger("VertStack_BroadCast");
        } else {
            $container.removeClass("flexColumn");
            this._popup.trigger("HorzStack_BroadCast");
        }
        TblFunc.moveFirstColumn();
        DagCategoryBar.Instance.showOrHideArrows();
    }
}