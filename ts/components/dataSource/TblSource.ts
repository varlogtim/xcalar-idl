class TblSource {
    private static _instance: TblSource;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * TblSource.Instance.refresh
     */
    public refresh(): void {
        return this._refresh();
    }

    /**
     * TblSource.Instance.import
     * @param args
     * @param schema
     */
    public async import(
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
            udfQuery: object,
            schema: ColSchema[],
            newNames: string[],
            primaryKeys: string[],
            dataMartName: string
        }
    ): Promise<void> {
        if (PTblManager.Instance.hasTable(tableName)) {
            throw {
                error: "Table: " + tableName + " already exists"
            }
        }

        try {
            const tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
            this._focusOnTable(tableInfo, true);
            await PTblManager.Instance.createTableFromSource(tableInfo, args);
        } catch (e) {
            console.error("create table failed", e);
            this._refresh(); // update to remove loading icon
        } finally {
            const tableInfo: PbTblInfo = PTblManager.Instance.getTableByName(tableName);
            this._focusOnTable(tableInfo, false);
        }
    }

    /**
     * TblSource.Instance.markActivating
     * @param tableName
     */
    public markActivating(tableName: string): void {
        return this._markActivating(tableName);
    }

    public activateTable(tableName: string): void {
        return this._activateTables([tableName]);
    }

    public deactivateTable(tableName: string): void {
        return this._deactivateTables([tableName]);
    }

    public async deleteTable(tableName: string): Promise<void> {
        return this._deletTables([tableName]);
    }

    private _getGridByName(name): JQuery {
        return $("#dagListSection .tableList .table").filter((_index, el) => $(el).find(".name").text() === name);
    }

    private _refresh(): void {
        ResourceMenu.Instance.render(ResourceMenu.KEY.Table);
        this._updateTablsInAction();
    }

    private _focusOnTable(tableInfo: PbTblInfo, isLoading: boolean): void {
        if (tableInfo) {
            let loadMsg: string = null;
            if (isLoading) {
                tableInfo.loadMsg || TblTStr.Creating;
            }
            TblSourcePreview.Instance.show(tableInfo, loadMsg);
        }
    }

    private _activateTables(tableNames: string[]): void {
        tableNames.forEach((name) => {
            this._markActivating(name);
        });
        PTblManager.Instance.activateTables(tableNames)
        .fail(() => {
            this._refresh();
        });
    }

    private _markActivating(tableName: string): void {
        let $grid: JQuery = this._getGridByName(tableName);
        if (!$grid.hasClass("activating")) {
            this._addLoadingIcon($grid);
            $grid.addClass("activating");
        }
    }

    private _deactivateTables(tableNames: string[]): void {
        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addDeactivateIcon($grid);
            this._addLoadingIcon($grid);
        });
        PTblManager.Instance.deactivateTables(tableNames)
        .fail(() => {
            // update UI
            this._refresh();
        });
    }

    private async _deletTables(
        tableNames: string[]
    ): Promise<void> {
        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addDeactivateIcon($grid);
            this._addLoadingIcon($grid);
            $grid.addClass("deleting");
        });

        try {
            await PTblManager.Instance.deleteTables(tableNames);
        } catch (e) {
            console.error("delete table from failed", e);
            this._refresh(); // update to remove loading/deleting icon
        }
    }

    private _addDeactivateIcon($grid: JQuery): void {
        let deactivateIcon: HTML =
        '<div class="deactivatingIcon" >' +
            '<i class="icon xi-forbid deactivating fa-15" ' +
            ' data-toggle="tooltip"' +
            ' data-container="body"' +
            ' data-title="' + DSTStr.DSDeactivating + '">' +
            '</i>' +
        '</div>';
        $grid.append(deactivateIcon);
        $grid.addClass("deactivating");
    }

    private _addLoadingIcon($grid: JQuery): void {
        $grid.addClass('inactive')
        .append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);
        $grid.addClass('loading');
    }

    private _updateTablsInAction(): void {
        PTblManager.Instance.getAvailableTables().forEach((tableInfo, tableName) => {
            if (tableInfo.state === PbTblState.Activating ||
                tableInfo.state === PbTblState.Deactivating ||
                tableInfo.state === PbTblState.Loading
            ) {
                let $grid = this._getGridByName(tableName);
                this._addLoadingIcon($grid);

                if (tableInfo.state === PbTblState.Deactivating) {
                    this._addDeactivateIcon($grid);
                }
            }
        });
    }
}