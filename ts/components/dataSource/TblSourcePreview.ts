class TblSourcePreview {
    private static _instance: TblSourcePreview;
    
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
    
    private readonly _container: string = "pTblView";
    private _schemaSection: PTblSchema;

    private constructor() {
        this._initializeSchemaSection();
    }

    public show(tableInfo: PbTblInfo, isLoading: boolean): void {
        DSForm.hide();
        this._getContainer().removeClass("xc-hidden");
        this._updateTableInfos(tableInfo);

        if (isLoading) {
            this._setupLoadingView();
        } else {
            this._renderSchema(tableInfo);
        }
    }

    public close(): void {
        const $container = this._getContainer();
        $container.addClass("xc-hidden");
        $container.find(".infoSection").empty();
        this._schemaSection.clear();
        TblSource.Instance.clear();
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _initializeSchemaSection(): void {
        const $section = this._getContainer().find(".schemaSection");
        this._schemaSection = new PTblSchema($section);
    }

    private _setupLoadingView(): void {
        const $section = this._getContainer().find(".schemaSection");
        const html: HTML =
        '<div class="loading animatedEllipsisWrapper">' +
            '<div class="text">' +
                TblTStr.Creating +
            '</div>' +
            '<div class="animatedEllipsis">' +
                '<div>.</div>' +
                '<div>.</div>' +
                '<div>.</div>' +
            '</div>' +
        '</div>';
        $section.find(".content").html(html);
    }

    private _renderSchema(tableInfo: PbTblInfo): void {
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
}