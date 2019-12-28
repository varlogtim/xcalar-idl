class TblSource {
    private static _instance: TblSource;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tables: Map<string, PbTblInfo>;
    private _sortKey: string;
    private _dataMarts: DataMarts;

    public constructor() {
        this._tables = new Map();
        this._dataMarts = new DataMarts();
        this._addEventListeners();
        this._setupGridMenu();
        this._setUpView();
        this._updateSourceTitle();
    }

    /**
     * TblSource.Instance.refresh
     */
    public refresh(): XDPromise<void> {
        return PromiseHelper.convertToJQuery(this._refresh(false));
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
    public hasTable(tableName: string): boolean {
        if (tableName == null) {
            return false;
        }
        tableName = tableName.toUpperCase();
        for (let name of this._tables.keys()) {
            if (name && name.toUpperCase() === tableName) {
                return true;
            }
        }
        return false;
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
        if (this._tables.has(tableName)) {
            throw {
                error: "Table: " + tableName + " already exists"
            }
        }

        try {
            if (XVM.isDataMart()) {
                let dataMartName: string = args.dataMartName;
                // XXX TODO: use a dataMartName from function args
                console.warn("use fake data mart, need to remove this piece of code");
                const dataMarts = this._dataMarts.getAllList();
                if (dataMarts.length === 0) {
                    await this.newDataMart();
                    dataMartName = this._dataMarts.getAllList()[0].name;
                } else {
                    dataMartName = dataMartName || dataMarts[0].name;
                }
                await this._dataMarts.addTable(dataMartName, tableName);
            }

            let tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
            this._tables.set(tableName, tableInfo);
            this._renderView();

            let $grid: JQuery = this._getGridByName(tableName);
            this._addLoadingIcon($grid);
            this._focusOnTable($grid);
            await PTblManager.Instance.createTableFromSource(tableInfo, args);
        } catch (e) {
            console.error("create table failed", e);
        } finally {
            this._refresh(false);
        }
    }

    /**
     * TblSource.Instance.createTableFromDataset
     * @param tableInfo
     * @param schema
     */
    public createTableFromDataset(
        tableInfo: PbTblInfo,
        schema: ColSchema[],
        primaryKeys: string[]
    ): void {
        let tableName = tableInfo.name;
        if (!this._tables.has(tableName)) {
            this._tables.set(tableName, tableInfo);
            this._renderView();
        }
        let $grid: JQuery = this._getGridByName(tableName);
        this._addLoadingIcon($grid);
        this._focusOnTable($grid);

        let dsName = tableInfo.dsName;
        PTblManager.Instance.createTableFromDataset(dsName, tableName, schema, primaryKeys)
        .then(() => {
            this._refresh(false);
        })
        .fail((error) => {
            Alert.error(TblTStr.CreateFail, error);
            this._refresh(false);
        });
    }

    /**
     * TblSource.Instance.tableName
     * @param tableName
     */
    public markActivating(tableName: string): void {
        return this._markActivating(tableName);
    }

    /**
     * TblSource.Instance.newDataMart
     * returns newName or "" if not created
     */
    public async newDataMart(): Promise<any> {
        let promise = new Promise((res, rej) => {
            const onSubmit = async (name) => {
                if (!name) {
                    res("");
                    return;
                }
                try {
                    await this._dataMarts.create(name);
                    this._renderView();
                    res(name);
                } catch (e) {
                    Alert.error(ErrTStr.Error, e.message);
                    res("");
                }
            };
            NewDataMartModal.Instance.show(this._dataMarts, onSubmit);
        });

        return promise;
    }

    public getDataMarts(): DataMarts {
        return this._dataMarts;
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

    private async _refresh(forceRefresh: boolean): Promise<void> {
        const $focusedGrid: JQuery = this._getGridView().find(".grid-unit.active");
        let focusTable: string = null;
        if ($focusedGrid.length) {
            focusTable = $focusedGrid.data("id");
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        xcUIHelper.showRefreshIcon(this._getGridView(), false, deferred.promise());

        const tables = await PTblManager.Instance.getTablesAsync(forceRefresh)
        this._setTables(tables);
        if (XVM.isDataMart()) {
            await this._dataMarts.restore(forceRefresh);
            this._dataMarts.sync(tables);
        }
        deferred.resolve();
        this._renderView();
        this._updateTablsInAction();
        this._reFocusOnTable(focusTable);
    }

    private _setTables(tables: PbTblInfo[]): void {
        this._tables = new Map();
        tables.forEach((table) => {
            if (table.name) {
                this._tables.set(table.name, table);
            }
        });
    }

    private _setSortKey(key: string): void {
        if (key === this._sortKey) {
            return;
        }
        if (key === "none") {
            this._sortKey = null;
        } else {
            this._sortKey = key;
            this._renderView();
        }
        this._highlighSortKey();
    }

    private _highlighSortKey(): void {
        let key: string = this._sortKey || "none";
        let $sortOptions = this._getMenuSection().find(".sortSection .sortOption");
        $sortOptions.removeClass("key");
        $sortOptions.filter((_index, el) => {
            return $(el).data("key") === key;
        }).addClass("key");
    }

    private _sortTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = [];
        this._tables.forEach((table) => {
            tables.push(table);
        });

        // sort by name first
        tables.sort(function(tbl1, tbl2) {
            let name1 = tbl1.name || "";
            name1 = name1.toLowerCase();
            let name2 = tbl2.name || "";
            name2 = name2.toLowerCase();
            return (name1 < name2 ? -1 : (name1 > name2 ? 1 : 0));
        });

        if (this._sortKey === "size") {
            tables.sort(function(tbl1, tbl2) {
                let size1 = tbl1.size;
                let size2 = tbl2.size;
                return (size1 < size2 ? -1 : (size1 > size2 ? 1 : 0));
            });
        } else if (this._sortKey === "date") {
            tables.sort(function(tbl1, tbl2) {
                let time1 = tbl1.createTime;
                let time2 = tbl2.createTime;
                return (time1 < time2 ? -1 : (time1 > time2 ? 1 : 0));
            });
        }

        return tables;
    }

    private _updateSourceTitle(): void {
        let text: string = "";
        if (XVM.isDataMart()) {
            text = DataMartTStr.Title;
        } else {
            text = TblTStr.Tables + " (" + this._tables.size + ")";
        }
        this._getMenuSection().find(".titleSection").text(text);
    }

    private _renderView(): void {
        try {
            if (XVM.isDataMart()) {
                this._renderHierarchicalView();
            } else {
                this._renderGridView();
            }
        } catch (e) {
            console.error(e);
        }
        this._updateSourceTitle();
    }

    private _renderHierarchicalView(): void {
        const dataMarts: DataMart[] = this._dataMarts.getAllList();
        let html: HTML = dataMarts.map((mart) => this._getDataMartHTML(mart)).join("");
        this._getGridView().html(html);
    }

    private _renderGridView(): void {
        let tables = this._sortTables();
        let html: HTML = tables.map(this._getTableHTML).join("");
        this._getGridView().html(html);
    }

    private _getDataMartHTML(dataMart: DataMart): HTML {
        let tableHTML: HTML = dataMart.tables.map((tableName) => {
            let table: PbTblInfo = this._tables.get(tableName);
            return this._getTableHTML(table);
        }).join("");
        let classNames: string[] = ["dataMartGroup", "xc-expand-list"];
        if (dataMart.active) {
            classNames.push("expanded");
        }
        let html: HTML = '<div class="' + classNames.join(" ") +
                        '" data-name="' + dataMart.name + '">' +
                            '<div class="grid-unit dataMart">' +
                                '<span class="expand">' +
                                    '<i class="icon xi-arrow-down fa-10"></i>' +
                                '</span>' +
                                '<i class="gridIcon icon xi-datamart"></i>' +
                                '<div class="label">' +
                                    dataMart.name +
                                '</div>' +
                            '</div>' +
                            '<ul>' +
                                tableHTML +
                            '</ul>' +
                         '</div>';
        return html;
    }

    private _getTableHTML(table: PbTblInfo): HTML {
        if (!table) {
            // error case
            return "";
        }
        const name: string = table.name;
        const title: string = name;
        let dsTableIcon: string = "";
        let extraClass = "";
        let tooltip = "";
        if (!table.active) {
            extraClass += " inActivated";
        }
        if (table.state === PbTblState.BeDataset) {
            extraClass += " beDataset";
            dsTableIcon = '<i class="infoIcon icon xi-info-no-bg"></i>';
            let title = xcStringHelper.replaceMsg(TblTStr.MultipleSchema, {
                name: name
            });
            tooltip = 'data-toggle="tooltip" data-container="body"' +
            ' data-title="' + title + '"';
        }
        // when it's a dataset
        const html: HTML =
        '<div class="ds grid-unit' + extraClass + '"' +
        ' data-id="' + name + '" ' + tooltip + '>' +
            '<i class="gridIcon icon xi-table-2"></i>' +
            dsTableIcon +
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

    private _toggleDataMart($dataMartGroup: JQuery): void {
        const name: string = $dataMartGroup.data("name");
        const dataMart: DataMart = this._dataMarts.get(name);
        if (dataMart) {
            dataMart.active = !dataMart.active;
            $dataMartGroup.toggleClass("expanded");
        }
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
            let loadMsg: string = null;
            if ($grid.hasClass("deactivating")) {
                loadMsg = DSTStr.DSDeactivating;
            } else if ($grid.hasClass("activating")) {
                loadMsg = DSTStr.DSActivating;
            } else if ($grid.hasClass("loading")) {
                loadMsg = tableInfo.loadMsg || TblTStr.Creating;
            }
            TblSourcePreview.Instance.show(tableInfo, loadMsg);
        }

        if (XVM.isDataMart()) {
            // expand data mart list when focus on the tale
            const $dataMartGroup = $grid.closest(".dataMartGroup");
            if (!$dataMartGroup.hasClass("expanded")) {
                this._toggleDataMart($dataMartGroup);
            }
        }
    }

    private _focusOnForm(): void {
        DataSourceManager.startImport(true);
    }

    private _reFocusOnTable(tableName: string): void {
        if (!TblSourcePreview.Instance.isOnTable(tableName)) {
            return;
        }

        if (tableName && this._tables.has(tableName)) {
            this._focusOnTable(this._getGridByName(tableName));
        } else {
            this._focusOnForm();
        }
    }

    private _activateTables(tableNames: string[]): void {
        tableNames = tableNames.filter((name) => {
            let tableInfo: PbTblInfo = this._tables.get(name);
            return (tableInfo && !tableInfo.active);
        });

        tableNames.forEach((name) => {
            this._markActivating(name);
        });
        PTblManager.Instance.activateTables(tableNames)
        .always(() => {
            this._refresh(false);
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
        tableNames = tableNames.filter((name) => {
            let tableInfo: PbTblInfo = this._tables.get(name);
            return (tableInfo && tableInfo.active);
        });

        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addDeactivateIcon($grid);
            this._addLoadingIcon($grid);
        });
        PTblManager.Instance.deactivateTables(tableNames)
        .always(() => {
            // update UI
            this._refresh(false);
        });
    }

    private async _deletTables(
        tableNames: string[],
        dataMartName?: string
    ): Promise<void> {
        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addDeactivateIcon($grid);
            this._addLoadingIcon($grid);
            $grid.addClass("deleting");
        });

        try {
            await PTblManager.Instance.deleteTables(tableNames);
            if (XVM.isDataMart()) {
                await this._dataMarts.deleteTable(dataMartName, tableNames[0]);
            }
        } catch (e) {
            console.error("delete table from failed", e);
        } finally {
            // update UI
            this._refresh(false);
        }
    }

    private _deleteDataMart(name: string): void {
        const deleteAction = async () => {
            try {
                await this._dataMarts.delete(name);
                this._renderView();
            } catch (e) {
                Alert.error(ErrTStr.Error, e.message);
            }
        };

        const msg = xcStringHelper.replaceMsg(DataMartTStr.DeleteConfirm, {name});
        Alert.show({
            title: DataMartTStr.Delete,
            msg,
            onConfirm: () => {
                deleteAction();
            }
        });
    }

    private _cancelTable(tableName: string): void {
        let tableInfo = this._tables.get(tableName);
        if (tableInfo != null) {
            tableInfo.cancel()
            .fail((error) => {
                error = error || ErrTStr.CannotCancel;
                Alert.error(StatusMessageTStr.CancelFail, error);
            });
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
        $grid.addClass('inactive').append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);
        $grid.addClass('loading');
    }

    private _updateTablsInAction(): void {
        this._tables.forEach((tableInfo, tableName) => {
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

    private _createRectSelection(startX: number, startY: number): RectSelection {
        let $gridMenu: JQuery = this._getGridMenu();
        $gridMenu.hide();
        let $scrollContainer = this._getTableListSection().find(".gridViewWrapper");
        return new RectSelection(startX, startY, {
            "id": "tblGridView-rectSelection",
            "$container": this._getGridView(),
            "$scrollContainer": $scrollContainer,
            "onStart": () => {
                let $gridView = this._getGridView();
                $gridView.addClass("drawing");
            },
            "onDraw": (...args) => {
                return this._drawRect.apply(this, args);
            },
            "onEnd": (...args) => {
                return this._endDrawRect.apply(this, args);
            }
        });
    }

    private _drawRect(
        bound: ClientRect,
        rectTop: number,
        rectRight: number,
        rectBottom: number,
        rectLeft: number
    ) {
        let $gridView = this._getGridView();
        $gridView.find(".grid-unit:visible").each((_index, el) => {
            let grid = el;
            let $grid = $(grid);
            if ($grid.hasClass("noAction")) {
                return;
            }

            let gridBound: ClientRect = grid.getBoundingClientRect();
            let gridTop: number = gridBound.top - bound.top;
            let gridLeft: number = gridBound.left - bound.left;
            let gridRight: number = gridBound.right - bound.left;
            let gridBottom: number = gridBound.bottom - bound.top;

            if (gridTop > rectBottom || gridLeft > rectRight ||
                gridRight < rectLeft || gridBottom < rectTop)
            {
                $grid.removeClass("selecting");
            } else {
                $grid.addClass("selecting");
            }
        });
    }

    private _endDrawRect() {
        let $gridView = this._getGridView();
        $gridView.removeClass("drawing");
        let $grids = $gridView.find(".grid-unit.selecting");
        if ($grids.length === 0) {
            $gridView.find(".grid-unit.selected").removeClass("selected");
        } else {
            $grids.each((_index, el) => {
                let $grid = $(el);
                $grid.removeClass("selecting")
                     .addClass("selected");
            });
        }
    }

    private _addEventListeners(): void {
        const $menuSection: JQuery = this._getMenuSection();
        $menuSection.find(".iconSection .refresh").click(() => {
            this._refresh(true);
        });

        $menuSection.find(".iconSection .imd").click(() => {
            $("#imdTab").click();
        });

        $menuSection.find(".sortSection").on("click", ".sortOption", (event) => {
            let key: string = $(event.currentTarget).data("key");
            this._setSortKey(key);
        });

        const $gridView: JQuery = this._getGridView();
        $gridView.on("click", ".grid-unit", (event) => {
            this._cleanGridSelect();
            let $target: JQuery = $(event.currentTarget);
            if (XVM.isDataMart() && $target.hasClass("dataMart")) {
                this._toggleDataMart($target.closest(".dataMartGroup"));
            } else {
                this._focusOnTable($target);
            }
        });

        const $gridViewWrapper: JQuery = this._getTableListSection().find(".gridViewWrapper");
        $gridViewWrapper.on("mousedown", (event) => {
            if (event.which !== 1|| (isSystemMac && event.ctrlKey)) {
                return;
            }

            // Disable the multi selection for data mart
            // as it's not in the plan for the stage 1 chagne
            if (XVM.isDataMart()) {
                return;
            }

            let $target = $(event.target);
            if ($target.closest(".gridIcon").length ||
                $target.closest(".label").length
            ) {
                // this part is for drag and drop
                return;
            }

            this._createRectSelection(event.pageX, event.pageY);
        });

        if (XVM.isDataMart()) {
            this._addDataMartEvents();
        }
    }

    private _addDataMartEvents(): void {
        $("#addDataMartBtn").click((event) => {
            $(event.currentTarget).blur();
            this.newDataMart();
        });
    }

    private _setUpView(): void {
        if (XVM.isDataMart()) {
            this._getMenuSection().addClass("dataMart");
            this._getGridView().removeClass("gridView listView")
                                .addClass("hierarchicalView listView");
        } else {
            $("#addDataMartBtn").remove();
        }
    }

    private _setupGridMenu(): void {
        let $gridMenu: JQuery = this._getGridMenu();
        xcMenu.add($gridMenu);
        // set up click right menu
        let $gridView = this._getGridView();
        let self = this;
        let el: any = <any>$gridView.parent()[0];
        el.oncontextmenu = function(event) {
            let $target: JQuery = $(event.target);
            let $grid: JQuery = $target.closest(".grid-unit");
            let classes: string = " noBorder";
            let totalSelected: number = $gridView.find(".grid-unit.selected").length;

            if ($grid.length && totalSelected > 1) {
                // multi selection
                $gridMenu.removeData("id");
                classes += " multiOpts";

                $gridMenu.find(".multiActivate, .multiDeactivate").show();
                let numTable: number = $gridView.find(".grid-unit.selected.ds").length;
                let numInActivatedTable: number = $gridView.find(".grid-unit.selected.inActivated").length;
                if (numTable === 0) {
                    // when no table
                    $gridMenu.find(".multiActivate, .multiDeactivate").hide();
                } else if (numInActivatedTable === 0) {
                    // when all tables are activated
                    $gridMenu.find(".multiActivate").hide();
                } else if (numTable === numInActivatedTable) {
                    // when all ds are inactivated
                    $gridMenu.find(".multiDeactivate").hide();
                }
            } else {
                self._cleanGridSelect();
                $gridMenu.find(".multiActivate, .multiDeactivate").hide();
                if ($grid.length) {
                    $grid.addClass("selected");

                    if (XVM.isDataMart()) {
                        let dataMartName = $grid.closest(".dataMartGroup").data("name");
                        $gridMenu.data("dataMartName", dataMartName);
                    }

                    if ($grid.hasClass("dataMart")) {
                        // options for data mart
                        classes += " dataMartOpts";
                    } else {
                        // options for a single table
                        let id = $grid.data("id");
                        $gridMenu.data("id", id);
                        let tableInfo = self._tables.get(id);
                        classes += " tblOpts dsOpts";

                        if (tableInfo && tableInfo.active) {
                            classes += " dsActivated";
                        }

                        if (tableInfo && tableInfo.state === PbTblState.BeDataset) {
                            classes += " dsInCreate";
                        }

                        if ($grid.hasClass("loading")) {
                            classes += " loading cancelable";
                        }

                        if ($grid.hasClass("activating")) {
                            classes += " activating cancelable";
                        }
                    }
                } else {
                    classes += " bgOpts";
                    $gridMenu.removeData("id");
                }
            }

            MenuHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes,
                "floating": true
            });
            return false;
        };

        self._setupMenuActions();
    }

    private _setupMenuActions(): void {
        let $gridMenu = this._getGridMenu();
        let $subMenu = $("#tableGridViewSubMenu");
        // bg opeartion

        $gridMenu.on("mouseup", ".refresh", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._refresh(true);
        });

        $gridMenu.on("mouseup", ".preview", (event) => {
            if (event.which !== 1) {
                return;
            }
            let $grid = this._getGridByName($gridMenu.data("id"));
            this._focusOnTable($grid);
            this._cleanGridSelect();
        });

        $gridMenu.on("mouseup", ".delete", (event) => {
            if (event.which !== 1) {
                return;
            }
            let dataMartName: string = "";
            if (XVM.isDataMart()) {
                dataMartName = $gridMenu.data("dataMartName");
            }

            if (XVM.isDataMart() && $gridMenu.hasClass("dataMartOpts")) {
                this._deleteDataMart(dataMartName);
            } else {
                this._deletTables([$gridMenu.data("id")], dataMartName);
            }
        });

        $gridMenu.on("mouseup", ".multiDelete", (event) => {
            if (event.which !== 1) {
                return;
            }
            let ids = this._getIdsFromSelectedGrid();
            this._deletTables(ids);
        });

        $gridMenu.on("mouseup", ".activate", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._activateTables([$gridMenu.data("id")]);
        });

        $gridMenu.on("mouseup", ".multiActivate", (event) => {
            if (event.which !== 1) {
                return;
            }
            let ids = this._getIdsFromSelectedGrid();
            this._activateTables(ids);
        });

        $gridMenu.on("mouseup", ".deactivate", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._deactivateTables([$gridMenu.data("id")]);
        });

        $gridMenu.on("mouseup", ".multiDeactivate", (event) => {
            if (event.which !== 1) {
                return;
            }
            let ids = this._getIdsFromSelectedGrid();
            this._deactivateTables(ids);
        });

        $gridMenu.on("mouseup", ".cancel", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._cancelTable($gridMenu.data("id"));
        });

        $gridMenu.on("mouseenter", ".sort", () => {
            let key: string = this._sortKey || "none";
            let $lis = $subMenu.find(".sort li");
            $lis.removeClass("select");
            $lis.filter((_index, el) => {
                return $(el).attr("name") === key;
            }).addClass("select");
        });

        $subMenu.on("mouseup", ".sort li", (event) => {
            if (event.which !== 1) {
                return;
            }
            let key: string = $(event.currentTarget).attr("name");
            this._setSortKey(key);
        });
    }

    private _getIdsFromSelectedGrid(): string[] {
        let $gridView = this._getGridView();
        let ids: string[] = [];
        $gridView.find(".grid-unit.selected").each((_index, el) => {
            let id = $(el).data("id");
            ids.push(id);
        });
        return ids;
    }
}