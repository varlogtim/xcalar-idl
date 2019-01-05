class TblSource {
    private static _instance: TblSource;
    
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tables: Map<string, PbTblInfo>;

    public constructor() {
        this._tables = new Map();
        this._addEventListeners();
    }

    /**
     * TblSource.Instance.initialize
     */
    public initialize(): XDPromise<void> {
        return this._refresh();
    }

    /**
     * TblSource.Instance.clear
     */
    public clear(): void {
        this._getGridView().find(".active").removeClass("active");
    }

    /**
     * TblSource.Instance.getUniuqName
     */
    public getUniuqName(name: string): string {
        var originalName = name;
        var tries = 1;
        var validNameFound = false;
        while (!validNameFound && tries < 20) {
            if (this.hasTable(name)) {
                validNameFound = false;
            } else {
                validNameFound = true;
            }

            if (!validNameFound) {
                name = originalName + tries;
                tries++;
            }
        }

        if (!validNameFound) {
            while (this.hasTable(name) && tries < 100) {
                name = xcHelper.randName(name, 4);
                tries++;
            }
        }
        return name;
    }

    /**
     * TblSource.Instance.hasTable
     * @param tableName
     */
    public hasTable(tableName): boolean {
        return this._tables.has(tableName);
    }

    /**
     * TblSource.Instance.import
     * @param args
     * @param schema
     */
    public import(
        tableName: string,
        args: {
            name: string,
            sources: {
                targetName: string,
                path: string,
                recursive: boolean,
                fileNamePattern: string
            }[],
            typedColumns: any[],
            moduleName: string,
            funcName: string,
            udfQuery: object
        },
        schema: ColSchema[]
    ): XDPromise<string> {
        if (this._tables.has(tableName)) {
            return PromiseHelper.reject({
                error: "Table: " + tableName + " already exists"
            });
        }

        schema = schema || [{
            name: "class_id",
            type: ColumnType.integer
        }];
        let tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
        this._tables.set(tableName, tableInfo);
        this._renderGridView();

        let $grid: JQuery = this._getGridByName(tableName);
        $grid.addClass('inactive').append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);
        $grid.addClass('loading');
        this._focusOnTable($grid);

        PTblManager.Instance.createTableFromSource(tableName, args, schema, null)
        .then(() => {
            // re-render
            this._refresh(true);
        })
        .fail((error) => {

        });
    }

    private _getMenuSection(): JQuery {
        return $("#datastoreMenu .menuSection.table");
    }

    private _getTableListSection(): JQuery {
        return $("#sourceTableListSection");
    }

    private _getGridView(): JQuery {
        return this._getTableListSection().find(".gridItems");
    }

    private _getGridMenu(): JQuery {
        return $("#tableGridViewMenu");
    }

    private _getGridByName(name): JQuery {
        return this._getGridView().find('.grid-unit[data-id="' + name + '"]');
    }

    private _refresh(refresh?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $focusedGrid: JQuery = this._getGridView().find(".grid-unit.active");
        let focusTable: string = null;
        if ($focusedGrid.length) {
            focusTable = $focusedGrid.data("id");
        }

        PTblManager.Instance.getTablesAsync(refresh)
        .then((tables) => {
            this._setTables(tables);
            this._renderGridView();

            if (focusTable && this._tables.has(focusTable)) {
                this._focusOnTable(this._getGridByName(focusTable));
            } else {
                this._focusOnForm();
            }

            deferred.resolve();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        const promise: XDPromise<void> = deferred.promise();
        xcHelper.showRefreshIcon(this._getGridView(), false, promise);
        return promise;
    }

    private _setTables(tables: PbTblInfo[]): void {
        this._tables = new Map();
        tables.forEach((table) => {
            this._tables.set(table.name, table);
        });
    }

    private _sortTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = [];
        this._tables.forEach((table) => {
            tables.push(table);
        })

        return tables;
    }

    private _updateNumTables(): void {
        this._getMenuSection().find(".numTables").text(this._tables.size);
    }

    private _renderGridView(): void {
        try {
            let tables = this._sortTables();
            let html: HTML = tables.map(this._getTableHTML).join("");
            this._getGridView().html(html);
        } catch (e) {
            console.error(e);
        }
        this._updateNumTables();
    }

    private _getTableHTML(table: PbTblInfo): HTML {
        // const checkMarkIcon: string = '<i class="gridIcon icon xi-table"></i>';
        const name: string = table.name;
        const title: string = name;
        // when it's a dataset
        const html: HTML =
        '<div class="ds grid-unit' + (table.active ? '' : ' inActivated') + '"' +
        ' data-id="' + name + '">' +
            '<i class="gridIcon icon xi-table-2"></i>' +
            // checkMarkIcon +
            '<div title="' + title + '" class="label"' +
                ' data-dsname="' + name + '">' +
                name +
            '</div>' +
            '<div class="size">' +
                xcHelper.sizeTranslator(table.size) +
            '</div>' +
        '</div>';

        return html;
    }

    private _cleanGridSelect(): void {
        this._getGridView().find(".selected").removeClass("selected");
    }

    private _focusOnTable($grid: JQuery): void {
        if ($grid == null ||
            $grid.hasClass("deleting")
        ) {
            return;
        }

        this.clear();
        $grid.addClass("active");
        let tableName: string = $grid.data("id");
        let tableInfo: PbTblInfo = this._tables.get(tableName);
        if (tableInfo) {
            let isLoading: boolean = $grid.hasClass("loading");
            TblSourcePreview.Instance.show(tableInfo, isLoading);
        }
    }

    private _focusOnForm(): void {
        DSForm.show(true);
    }

    private _addEventListeners(): void {
        const $menuSection: JQuery = this._getMenuSection();
        $menuSection.find(".iconSection .refresh").click(() => {
            this._refresh(true);
        });

        $menuSection.find(".iconSection .imd").click(() => {
            MainMenu.openPanel("imdPanel");
        });

        const $gridView: JQuery = this._getGridView();
        $gridView.on("click", ".grid-unit", (event) => {
            this._cleanGridSelect();
            this._focusOnTable($(event.currentTarget));
        });
    }
}