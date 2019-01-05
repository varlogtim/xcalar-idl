class SQLTableSchema {
    private static _instance: SQLTableSchema;
    
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
    
    private readonly _container: string = "sqlTableSchemaArea";
    private _schemaSection: PTblSchema;

    private constructor() {
        this._initializeMainSection();
        this._addEventListeners();
    }

    public show(tableInfo: PbTblInfo): void {
        this._getContainer().removeClass("xc-hidden");
        this._updateTableName(tableInfo.name);
        this._render(tableInfo);
    }

    public close(): void {
        this._getContainer().addClass("xc-hidden");
        this._schemaSection.clear();
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getMainSection(): JQuery {
        return this._getContainer().find(".mainSection");
    }

    private _initializeMainSection(): void {
        const $section = this._getMainSection();
        this._schemaSection = new PTblSchema($section);
    }

    private _render(tableInfo: PbTblInfo): void {
        let columns: PbTblColSchema[] = PTblManager.Instance.getTableSchema(tableInfo);
        this._schemaSection.render(columns);
    }

    private _updateTableName(tableName: string): void {
        this._getContainer().find(".topSection .name").text(tableName);
    }

    private _addEventListeners(): void {
        const $bottomSection = this._getContainer().find(".bottomSection");
        $bottomSection.find(".back").click(() => {
            SQLResultSpace.Instance.showTables(false);
        });
    }
}