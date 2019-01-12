class TblSource {
    private static _instance: TblSource;
    
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tables: Map<string, PbTblInfo>;
    private _sortKey: string;

    public constructor() {
        this._tables = new Map();
        this._addEventListeners();
        this._setupGridMenu();
    }

    /**
     * TblSource.Instance.initialize
     */
    public initialize(): XDPromise<void> {
        return this._refresh(false);
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
            udfQuery: object,
            schema: ColSchema[]
        }
    ): XDPromise<string> {
        if (this._tables.has(tableName)) {
            return PromiseHelper.reject({
                error: "Table: " + tableName + " already exists"
            });
        }

        let tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
        this._tables.set(tableName, tableInfo);
        this._renderGridView();

        let $grid: JQuery = this._getGridByName(tableName);
        this._addLoadingIcon($grid);
        this._focusOnTable($grid);

        PTblManager.Instance.createTableFromSource(tableName, args, null)
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

    private _refresh(forceRefresh: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $focusedGrid: JQuery = this._getGridView().find(".grid-unit.active");
        let focusTable: string = null;
        if ($focusedGrid.length) {
            focusTable = $focusedGrid.data("id");
        }

        let timer = null;
        timer = setTimeout(() => {
            xcHelper.showRefreshIcon(this._getGridView(), false, deferred.promise());
        }, 500);

        PTblManager.Instance.getTablesAsync(forceRefresh)
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
        .fail(deferred.reject)
        .always(() => {
            clearTimeout(timer);
        });

        return deferred.promise();
    }

    private _setTables(tables: PbTblInfo[]): void {
        this._tables = new Map();
        tables.forEach((table) => {
            this._tables.set(table.name, table);
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
            this._renderGridView();
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
            let name1 = tbl1.name.toLowerCase();
            let name2 = tbl2.name.toLowerCase();
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
            let loadMsg: string = null;
            if ($grid.hasClass("deactivating")) {
                loadMsg = DSTStr.DSDeactivating;
            } else if ($grid.hasClass("activating")) {
                loadMsg = DSTStr.DSActivating;
            } else if ($grid.hasClass("loading")) {
                loadMsg = TblTStr.Creating;
            }
            TblSourcePreview.Instance.show(tableInfo, loadMsg);
        }
    }

    private _focusOnForm(): void {
        DSForm.show(true);
    }

    private _activateTables(tableNames: string[]): void {
        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addLoadingIcon($grid);
            $grid.addClass("activating");
        });
        PTblManager.Instance.activateTables(tableNames)
        .always(() => {
            this._refresh(false);
        });
    }

    private _deactivateTables(tableNames: string[]): void {
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

    private _deletTables(tableNames: string[]): void {
        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addDeactivateIcon($grid);
            this._addLoadingIcon($grid);
            $grid.addClass("deleting");
        });

        PTblManager.Instance.deleteTables(tableNames)
        .always(() => {
            // update UI
            this._refresh(false);
        });
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
            this._focusOnTable($(event.currentTarget));
        });
    }

    private _setupGridMenu(): void {
        let $gridMenu: JQuery = this._getGridMenu();
        xcMenu.add($gridMenu);
        // set up click right menu
        let $gridView = this._getGridView();
        let self = this;
        $gridView.parent()[0].oncontextmenu = function(event) {
            let $target: JQuery = $(event.target);
            let $grid: JQuery = $target.closest(".grid-unit");
            let classes: string = "";
            let totalSelected: number = $gridView.find(".grid-unit.selected").length;

            if ($grid.length && totalSelected > 1) {
                // multi selection
                $gridMenu.removeData("id");
                classes += " multiOpts";

                $gridMenu.find(".multiActivate, .multiDeactivate").show();
                $gridMenu.find(".multiDelete").removeClass("disabled");
                let numTable: number = $gridView.find(".grid-unit.selected.ds").length;
                let numInActivatedTable: number = $gridView.find(".grid-unit.selected.inActivated").length;
                if (numTable === 0) {
                    // when no table
                    $gridMenu.find(".multiActivate, .multiDeactivate").hide();
                } else if (numInActivatedTable === 0) {
                    // when all tables are activated
                    $gridMenu.find(".multiActivate").hide();
                    if (numTable === totalSelected) {
                        // when only have tables
                        $gridMenu.find(".multiDelete").addClass("disabled");
                    }
                } else if (numTable === numInActivatedTable) {
                    // when all ds are inactivated
                    $gridMenu.find(".multiDeactivate").hide();
                }
            } else {
                self._cleanGridSelect();
                $gridMenu.find(".multiActivate, .multiDeactivate").hide();
                if ($grid.length) {
                    $grid.addClass("selected");
                    let id = $grid.data("id");
                    $gridMenu.data("id", id);
                    let tableInfo = self._tables.get(id);
                    classes += " tblOpts dsOpts";

                    if (tableInfo && tableInfo.active) {
                        classes += " dsActivated";
                    }

                    if ($grid.hasClass("loading")) {
                        classes += " loading";
                    }
                } else {
                    classes += " bgOpts";
                    $gridMenu.removeData("id");
                }
            }

            xcHelper.dropdownOpen($target, $gridMenu, {
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
            this._deletTables([$gridMenu.data("id")]);
        });

        // $gridMenu.on("mouseup", ".multiDelete", (event) => {
        //     if (event.which !== 1) {
        //         return;
        //     }
        //     DS.remove($gridView.find(".grid-unit.selected"));
        // });

        // $gridMenu.on("mouseup", ".getInfo", function(event) {
        //     if (event.which !== 1) {
        //         return;
        //     }
        //     DSInfoModal.Instance.show($gridMenu.data("id"));
        // });

        $gridMenu.on("mouseup", ".activate", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._activateTables([$gridMenu.data("id")]);
        });

        // $gridMenu.on("mouseup", ".multiActivate", (event) => {
        //     if (event.which !== 1) {
        //         return;
        //     }
        //     var ids = [];
        //     $gridView.find(".grid-unit.selected.table").each(function() {
        //         ids.push($(this).data("id"));
        //     });
        //     activateDSAction(ids);
        // });

        $gridMenu.on("mouseup", ".deactivate", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._deactivateTables([$gridMenu.data("id")]);
        });

        // $gridMenu.on("mouseup", ".multiDeactivate", (event) => {
        //     if (event.which !== 1) {
        //         return;
        //     }
        //     var ids = [];
        //     $gridView.find(".grid-unit.selected.table").each(function() {
        //         ids.push($(this).data("id"));
        //     });
        //     deactivateDSAction(ids);
        // });

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
}