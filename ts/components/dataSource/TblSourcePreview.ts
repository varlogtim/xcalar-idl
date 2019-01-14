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
        this._getContainer().removeClass("xc-hidden");
        this._updateTableInfos(tableInfo);

        if (msg) {
            this._setupLoadingView(msg);
        } else if (tableInfo.state === PbTblState.BeDataset) {
            this._viewDatasetTable(tableInfo);
        } else {
            this._renderSchema(tableInfo);
        }
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
        this._showSchemaSection
        const $section = this._getSchemaSection();
        const html: HTML =
        '<div class="loading animatedEllipsisWrapper">' +
            '<div class="text">' +
                msg +
            '</div>' +
            '<div class="animatedEllipsis">' +
                '<div>.</div>' +
                '<div>.</div>' +
                '<div>.</div>' +
            '</div>' +
        '</div>';
        $section.find(".content").html(html);
    }

    private _showSchemaSection(): void {
        this._closeTable();
        this._getSchemaSection().removeClass("xc-hidden");
    }

    private _renderSchema(tableInfo: PbTblInfo): void {
        this._showSchemaSection();
        const columns: PbTblColSchema[] = PTblManager.Instance.getTableSchema(tableInfo);
        this._schemaSection.render(columns);
    }

    private _updateTableInfos(tableInfo: PbTblInfo): void {
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
        this._getContainer().find(".infoSection").html(html);
    }

    private _viewDatasetTable(tableInfo: PbTblInfo): XDPromise<void> {
        let dsName: string = tableInfo.dsName;
        let dsObj: DSObj = new DSObj({
            fullName: dsName
        });
        let viewer = new XcDatasetViewer(dsObj);
        return this._showTable(viewer);
    }

    // XXX TODO: combine show table related logic with SQLTable, DagTable...
    private _showTable(viewer: XcViewer): XDPromise<void> {
        this._getTableArea().removeClass("xc-hidden");
        this._getSchemaSection().addClass("xc-hidden");
        this._getContainer().addClass("dataset");

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
            $container.removeClass("loading");
            TblFunc.alignScrollBar($container.find(".dataTable").eq(0));
            deferred.resolve();
        })
        .fail((error) => {
            this._showTableViewError(error);
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