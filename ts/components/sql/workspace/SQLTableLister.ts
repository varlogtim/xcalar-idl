class SQLTableLister {
    private static _instance: SQLTableLister;
    
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private readonly _container: string = "sqlTableListerArea";
    private _attributes: {key: string, text: string}[];
    private _tableInfos: PbTblInfo[];

    private constructor() {
        this._tableInfos = [];
        this._setupArrtibutes();
        this._initializeMainSection();
        this._addEventListeners();
    }

    /**
     * SQLTableLister.Instance.show
     * @param reset
     */
    public show(reset: boolean): void {
        const $container = this._getContainer();
        if (!$container.hasClass("xc-hidden")) {
            // already show
            if (reset) {
                this._getSearchInput().val("");
                this._filterTables();
            }
            return;
        }
        this._getContainer().removeClass("xc-hidden");
        if (reset) {
            this._reset();
            this._listTables();
        }
    }

    /**
     * SQLTableLister.Instance.close
     */
    public close(): void {
        this._getContainer().addClass("xc-hidden");
    }

    /**
     * SQLTableLister.Instance.getAvailableTables
     */
    public getAvailableTables(): PbTblInfo[] {
        return this._getAvailableTables();
    }

    private _reset(): void {
        this._getSearchInput().val("");
        this._getMainContent().empty();
        this._tableInfos = [];
    }

    private _setupArrtibutes(): void {
        this._attributes = [{
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
        }, {
            key: "status",
            text: CommonTxtTstr.Status
        }];
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getTopSection(): JQuery {
        return this._getContainer().find(".topSection");
    }

    private _getMainSection(): JQuery {
        return this._getContainer().find(".mainSection");
    }

    private _getMainContent(): JQuery {
        return this._getMainSection().find(".content");
    }

    private _getSearchInput(): JQuery {
        return this._getTopSection().find(".searchbarArea input");
    }

    private _getAvailableTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = PTblManager.Instance.getTables();
        tables = tables.filter((table) => {
            if (table.state === PbTblState.BeDataset) {
                return false;
            }
            if (table.name.toUpperCase() !== table.name) {
                return false;
            }
            return true;
        });
        return tables;
    }

    private _getTableInfoFromIndex(index: number): PbTblInfo {
        for (let i = 0; i < this._tableInfos.length; i++) {
            let table = this._tableInfos[i];
            if (table.index === index) {
                return table;
            }
        }
        return null;
    }

    private _listTables(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._onLoadingMode();
        const $content = this._getMainSection().find(".content");

        PTblManager.Instance.getTablesAsync(true)
        .then(() => {
            this._tableInfos = this._getAvailableTables();
            this._render();
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            this._offLoadingMode();
        });

        const promise = deferred.promise();
        xcHelper.showRefreshIcon($content, true, promise);
        return promise;
    }

    private _onLoadingMode(): void {
        this._getContainer().addClass("loading");
    }

    private _offLoadingMode(): void {
        this._getContainer().removeClass("loading");
    }

    private _initializeMainSection(): void {
        let header: HTML = this._attributes.map((attr) => {
            return `<div class="${attr.key}">${attr.text}</div>`
        }).join("");
        const html: HTML =
        '<div class="header">' +
            '<div class="row">' +
                header +
            '</div>' +
        '</div>' +
        '<div class="content"></div>';
        this._getMainSection().html(html);
    }

    private _render(): void {
        let tableDisplayInfos = this._tableInfos.map(PTblManager.Instance.getTableDisplayInfo);
        let html: HTML = tableDisplayInfos.map((tableDisplayInfo) => {
            let row: HTML = 
            `<div class="row" data-index="${tableDisplayInfo.index}">` +
                this._renderRowContent(tableDisplayInfo) +
            '</div>';
            return row;
        }).join("");

        this._getMainContent().html(html);
        this._filterTables();
        this._updateActions(null);
    }

    private _renderRowContent(displayInfo): HTML {
        let html: HTML = this._attributes.map((attr) => {
            let key: string = xcHelper.escapeHTMLSpecialChar(attr.key);
            let text: string = xcHelper.escapeHTMLSpecialChar(displayInfo[key]);
            let tooltip: string =
            'data-toggle="tooltip" ' +
            'data-container="body" ' +
            'data-title="' + text + '"';
            return `<div class="${key} tooltipOverflow" ${tooltip}>${text}</div>`;
        }).join("");
        return html;
    }

    private _unSelectTableList(): void {
        this._getMainContent().find(".row.selected").removeClass("selected");
    }

    private _selectTableList($row: JQuery): void {
        if ($row.hasClass("selected")) {
            return;
        }
        this._unSelectTableList();
        $row.addClass("selected");

        let index = Number($row.data("index"));
        this._updateActions(this._getTableInfoFromIndex(index));
    }

    private _updateActions(tableOnFocus: {active: boolean}): void {
        const $section = this._getTopSection();
        const $btnForActive = $section.find(".viewSchema")
        .add($section.find(".deactivate"));
        const $btnForInactive = $section.find(".activate");

        if (!tableOnFocus) {
            // no table
            $btnForActive.addClass("xc-disabled");
            $btnForInactive.addClass("xc-disabled");
        } else if (tableOnFocus.active) {
            // table is active
            $btnForActive.removeClass("xc-disabled");
            $btnForInactive.addClass("xc-disabled");
        } else {
            // table is inactive
            $btnForActive.addClass("xc-disabled");
            $btnForInactive.removeClass("xc-disabled");
        }
    }

    private _filterTables(): void {
        const $input = this._getSearchInput();
        const $rows = this._getMainContent().find(".row");
        let keyword: string = $input.val().trim();
        if (!keyword) {
            $rows.removeClass("xc-hidden");
            return;
        }

        keyword = keyword.toLowerCase();
        $rows.each((_index, el) => {
            const $row = $(el);
            if ($row.find(".name").text().toLowerCase().includes(keyword)) {
                $row.removeClass("xc-hidden");
            } else {
                $row.addClass("xc-hidden");
            }
        });
    }

    private _showSchema(): void {
        const $row = this._getMainContent().find(".row.selected");
        if ($row.length === 0) {
            return;
        }
        const index: number = Number($row.data("index"));
        const tableInfo = this._getTableInfoFromIndex(index);
        SQLResultSpace.Instance.showSchema(tableInfo);
    }

    private _addEventListeners(): void {
        const $mainContent = this._getMainContent();
        $mainContent.on("click", ".row", (event) => {
            this._selectTableList($(event.currentTarget));
        });

        $mainContent.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        const $topSection = this._getTopSection();
        $topSection.find(".refresh").click(() => {
            this._listTables();
        });

        $topSection.find(".searchbarArea input").on("input", () => {
            this._filterTables();
        });

        $topSection.find(".viewSchema").click(() => {
            this._showSchema();
        });
    }
}