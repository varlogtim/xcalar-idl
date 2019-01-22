class TblSourcePreview {
    private static _instance: TblSourcePreview;
    
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
    
    private readonly _container: string = "pTblView";
    private _tableInfo: PbTblInfo;
    private _viewer: XcViewer;
    private _schemaSection: PTblSchema;

    private constructor() {
        this._initializeSchemaSection();
        this._addEventListeners();
    }

    /**
     * TblSourcePreview.Instance.show
     * @param tableInfo
     * @param msg
     */
    public show(tableInfo: PbTblInfo, msg: string): void {
        this._tableInfo = tableInfo;
        DSForm.hide();
        let $container = this._getContainer();
        $container.removeClass("xc-hidden")
                .removeClass("dataset")
                .removeClass("table")
                .removeClass("loading");

        let isLoading = msg != null;
        this._updateInstruction(tableInfo);
        this._updateTableInfos(tableInfo, isLoading);
        if (msg) {
            $container.addClass("loading");
            this._setupLoadingView(msg);
        } else if (tableInfo.state === PbTblState.BeDataset) {
            $container.addClass("dataset");
            this._viewDatasetTable(tableInfo);
        } else {
            $container.addClass("table");
            this._viewSchema(tableInfo);
        }
    }

    public refresh(tableInfo: PbTblInfo): void {
        if (!this.isOnTable(tableInfo.name)) {
            return;
        }
        this.show(tableInfo, tableInfo.loadMsg);
    }

    /**
     * TblSourcePreview.Instance.close
     */
    public close(): void {
        const $container = this._getContainer();
        $container.addClass("xc-hidden");
        $container.find(".infoSection").empty();
        this._schemaSection.clear();
        this._closeTable();
        TblSource.Instance.clear();

        this._tableInfo = null;
    }

    /**
     * TblSourcePreview.Instance.isOnTable
     * @param tableName
     */
    public isOnTable(tableName: string): boolean {
        const $container = this._getContainer();
        if ($container.is(":visible") &&
            this._tableInfo != null &&
            this._tableInfo.name === tableName
        ) {
            return true;
        } else {
            return false;
        }
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getSchemaSection(): JQuery {
        return this._getContainer().find(".schemaSection");;
    }

    private _getTableArea(): JQuery {
        return this._getContainer().find(".tableArea");
    }

    private _initializeSchemaSection(): void {
        const $section = this._getContainer().find(".schemaSection");
        this._schemaSection = new PTblSchema($section);
    }

    private _setupLoadingView(msg: string): void {
        this._showSchemaSection();
        const $section = this._getSchemaSection();
        const html: HTML = this._loadHTMLTemplate(msg);
        $section.find(".content").html(html);
    }

    private _loadHTMLTemplate(text: string): HTML {
        const html: HTML =
        '<div class="loading animatedEllipsisWrapper">' +
            '<div class="text">' +
            text +
            '</div>' +
            '<div class="animatedEllipsis">' +
                '<div>.</div>' +
                '<div>.</div>' +
                '<div>.</div>' +
            '</div>' +
        '</div>';
        return html;
    }

    private _updateInstruction(tableInfo: PbTblInfo): void {
        const $instr: JQuery = this._getContainer().find(".cardInstruction .text span");
        let instr: string;
        if (tableInfo.state === PbTblState.BeDataset) {
            instr = xcHelper.replaceMsg(TblTStr.MultipleSchema, {
                name: tableInfo.name
            });
        } else {
            instr = TblTStr.PreviewInstr;
        }
        $instr.text(instr);
    }

    private _updateTableInfos(
        tableInfo: PbTblInfo,
        isLoading: boolean
    ): void {
        let divider: HTML = '<span class="divider">|</span>';
        let infos: {key: string, text: string}[] = [{
            key: "name",
            text: CommonTxtTstr.Name
        }, {
            key: "createTime",
            text: CommonTxtTstr.CreateTime,
        }, {
            key: "rows",
            text: CommonTxtTstr.Rows
        }, {
            key: "size",
            text: CommonTxtTstr.Size
        }]
        let tableDisplayInfo = PTblManager.Instance.getTableDisplayInfo(tableInfo);
        let html: HTML = infos.map((info) => {
            let key: string = info.key;
            let value: string = tableDisplayInfo[key];
            let content: HTML =
            `<span class="label ${key}">` +
                info.text + ":" +
            '</span>' +
            '<span class="value">' +
                value +
            '</span>';

            return content;
        }).join(divider);

        let $container = this._getContainer();
        if (!isLoading &&
            tableInfo.state == null &&
            tableInfo.active === true
        ) {
            // when it's a normal table
            html += '<span class="action xc-action"></span>';
        }

        $container.find(".infoSection").html(html);
    }

    private _updateTableAction(toViewTable: boolean): void {
        let $action = this._getContainer().find(".infoSection .action");
        if (toViewTable) {
            $action.removeClass("viewSchema")
                    .addClass("viewTable")
                    .text(TblTStr.Viewdata);
        } else {
            $action.addClass("viewSchema")
                    .removeClass("viewTable")
                    .text(TblTStr.Viewschema);
        }
    }

    private _showSchemaSection(): void {
        this._closeTable();
        this._getSchemaSection().removeClass("xc-hidden");
    }

    private _showTableSection(): void {
        this._getTableArea().removeClass("xc-hidden");
        this._getSchemaSection().addClass("xc-hidden");
    }

    private _viewSchema(tableInfo: PbTblInfo): void {
        this._updateTableAction(true);
        this._showSchemaSection();
        const columns: PbTblColSchema[] = PTblManager.Instance.getTableSchema(tableInfo);
        this._schemaSection.render(columns);
    }

    private _viewTableResult(tableInfo: PbTblInfo): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._updateTableAction(false);
        this._showTableSection();
        let $tableArea = this._getTableArea();
        $tableArea.addClass("loading").removeClass("error");

        let loadingHTML = this._loadHTMLTemplate(StatusMessageTStr.Loading);
        $tableArea.find(".loadingSection").html(loadingHTML);

        let hasSelectTable: boolean = false;
        PTblManager.Instance.selectTable(tableInfo)
        .then((resultName) => {
            hasSelectTable = true;
            if (tableInfo == this._tableInfo) {
                $tableArea.removeClass("loading");
                let schema: ColSchema[] = PTblManager.Instance.getTableSchema(tableInfo);
                let table: TableMeta = this._getResultMeta(resultName, schema);
                let viewer = new XcTableViewer(table);
                return this._showTable(viewer);
            }
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (tableInfo === this._tableInfo && !hasSelectTable) {
                $tableArea.removeClass("loading")
                        .addClass("error");
                let errorMsg = xcHelper.parseError(error);
                $tableArea.find(".errorSection").text(errorMsg);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _viewDatasetTable(tableInfo: PbTblInfo): XDPromise<void> {
        let dsName: string = tableInfo.dsName;
        let dsObj: DSObj = new DSObj({
            fullName: dsName
        });
        let $tableArea = this._getTableArea();
        $tableArea.removeClass("error").removeClass("loading");
        let viewer = new XcDatasetViewer(dsObj);
        return this._showTable(viewer);
    }

    private _getResultMeta(name: string, schema: ColSchema[]): TableMeta {
        let progCols: ProgCol[] = schema.map((colInfo) => {
            return ColManager.newPullCol(colInfo.name, colInfo.name, colInfo.type);
        });
        progCols.push(ColManager.newDATACol());
        let tableId = xcHelper.getTableId(name);
        let table = new TableMeta({
            tableId: tableId,
            tableName: name,
            tableCols: progCols
        });
        gTables[tableId] = table;
        return table;
    }

    // XXX TODO: combine show table related logic with SQLTable, DagTable...
    private _showTable(viewer: XcViewer): XDPromise<void> {
        this._showTableSection();

        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }

        this._clearViewer();
        this._viewer = viewer;
        return this._showViewer();
    }

    private _showViewer(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $container: JQuery = this._getTableArea();
        $container.removeClass("xc-hidden").addClass("loading");
        const viewer = this._viewer;
        const $tableSection: JQuery = $container.find(".tableSection");
        viewer.render($tableSection)
        .then(() => {
            if (viewer === this._viewer) {
                $container.removeClass("loading");
                TblFunc.alignScrollBar($container.find(".dataTable").eq(0));
            }
            deferred.resolve();
        })
        .fail((error) => {
            if (viewer === this._viewer) {
                this._showTableViewError(error);
            }
            deferred.reject(error);
        });

        const promise = deferred.promise();
        xcHelper.showRefreshIcon($tableSection, true, promise);
        return promise;
    }

    private _closeTable(): void {
        this._getContainer().removeClass("datast");
        this._getTableArea().addClass("xc-hidden");
        this._clearViewer();
    }

    private _isSameViewer(viewer: XcViewer): boolean {
        const currentViewer = this._viewer;
        if (currentViewer == null) {
            return false;
        }
        if (currentViewer.getId() != viewer.getId()) {
            return false;
        }
        return true;
    }

    private _clearViewer(): void {
        if (this._viewer != null) {
            this._viewer.clear();
            this._viewer = null;
        }
        let $tableArea: JQuery = this._getTableArea();
        $tableArea.removeClass("loading").removeClass("error");
        $tableArea.find(".errorSection").empty();
    }

    private _showTableViewError(error: any): void {
        const $container: JQuery = this._getTableArea();
        $container.removeClass("loading").addClass("error");
        const errStr: string = (typeof error === "string") ?
        error : JSON.stringify(error);
        $container.find(".errorSection").text(errStr);
    }

    private _schemaWizard(schemaArray: ColSchema[][]): void {
        let initialSchema: ColSchema[] = [];
        let schemaToSelect: ColSchema[] = [];
        let validTyes: ColumnType[] = BaseOpPanel.getBasicColTypes();
        schemaArray.forEach((schemas) => {
            if (schemas.length === 1) {
                let schema = schemas[0];
                if (validTyes.includes(schema.type)) {
                    initialSchema.push(schema);
                    schemaToSelect.push(schema);
                }
            } else {
                schemaToSelect.push({
                    name: schemas[0].name,
                    type: null
                });
            }
        });
        SchemaSelectionModal.Instance.setInitialSchema(initialSchema);
        SchemaSelectionModal.Instance.show(schemaToSelect, (colSchema) => {
            this._populateSchema(colSchema);
        });
    }

    private _populateSchema(colSchema: ColSchema[]) {
        let $textArea = this._getContainer().find(".bottomSection textArea");
        $textArea.val(JSON.stringify(colSchema));
    }

    private _createTable(tableInfo: PbTblInfo): void {
        let $textArea = this._getContainer().find(".bottomSection textArea");
        let schema: {schema: ColSchema[]} = xcHelper.validateSchemaFromTextArea($textArea);
        if (schema == null) {
            // error case
            return;
        }
        TblSource.Instance.createTableFromDataset(tableInfo, schema.schema); 
    }

    private _addEventListeners(): void {
        let $container = this._getContainer();
        let $infoSection = $container.find(".infoSection");
        $infoSection.on("click", ".viewTable", () => {
            this._viewTableResult(this._tableInfo);
        });

        $infoSection.on("click", ".viewSchema", () => {
            this._viewSchema(this._tableInfo);
        });

        let $bottomSection = $container.find(".bottomSection");
        $bottomSection.find(".schemaWizard").click(() => {
            if (this._viewer instanceof XcDatasetViewer) {
                let schemaArray = this._viewer.getSchemaArray();
                this._schemaWizard(schemaArray);
            }   
        });

        $bottomSection.find(".createTable").click(() => {
            if (this._viewer instanceof XcDatasetViewer) {
                this._createTable(this._tableInfo);
            }   
        });
    }
}