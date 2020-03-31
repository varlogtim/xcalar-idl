class TblSource {
    private static _instance: TblSource;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    // private _sortKey: string;

    public constructor() {
        // this._addEventListeners();
        // this._setupGridMenu();
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
        let dsName = tableInfo.dsName;
        PTblManager.Instance.createTableFromDataset(dsName, tableName, schema, primaryKeys)
        .fail((error) => {
            Alert.error(TblTStr.CreateFail, error);
            this._refresh();
        });
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

    // private _getMenuSection(): JQuery {
    //     return $("#datastoreMenu .menuSection.table");
    // }

    // private _getTableListSection(): JQuery {
    //     return $("#sourceTableListSection");
    // }

    // private _getGridView(): JQuery {
    //     return this._getTableListSection().find(".gridItems");
    // }

    // private _getGridMenu(): JQuery {
    //     return $("#tableGridViewMenu");
    // }

    private _getGridByName(name): JQuery {
        return $("#dagListSection .tableList .table").filter((_index, el) => $(el).find(".name").text() === name);
    }

    private _refresh(): void {
        ResourceMenu.Instance.render(ResourceMenu.KEY.Table);
        this._updateTablsInAction();
    }

    // private _setSortKey(key: string): void {
    //     if (key === this._sortKey) {
    //         return;
    //     }
    //     if (key === "none") {
    //         this._sortKey = null;
    //     } else {
    //         this._sortKey = key;
    //         // this._renderView();
    //     }
    //     this._highlighSortKey();
    // }

    // private _highlighSortKey(): void {
    //     let key: string = this._sortKey || "none";
    //     let $sortOptions = this._getMenuSection().find(".sortSection .sortOption");
    //     $sortOptions.removeClass("key");
    //     $sortOptions.filter((_index, el) => {
    //         return $(el).data("key") === key;
    //     }).addClass("key");
    // }

    // private _sortTables(): PbTblInfo[] {
    //     let tables: PbTblInfo[] = [];
    //     this._tables.forEach((table) => {
    //         tables.push(table);
    //     });

    //     // sort by name first
    //     tables.sort(function(tbl1, tbl2) {
    //         let name1 = tbl1.name || "";
    //         name1 = name1.toLowerCase();
    //         let name2 = tbl2.name || "";
    //         name2 = name2.toLowerCase();
    //         return (name1 < name2 ? -1 : (name1 > name2 ? 1 : 0));
    //     });

    //     if (this._sortKey === "size") {
    //         tables.sort(function(tbl1, tbl2) {
    //             let size1 = tbl1.size;
    //             let size2 = tbl2.size;
    //             return (size1 < size2 ? -1 : (size1 > size2 ? 1 : 0));
    //         });
    //     } else if (this._sortKey === "date") {
    //         tables.sort(function(tbl1, tbl2) {
    //             let time1 = tbl1.createTime;
    //             let time2 = tbl2.createTime;
    //             return (time1 < time2 ? -1 : (time1 > time2 ? 1 : 0));
    //         });
    //     }

    //     return tables;
    // }

    // private _cleanGridSelect(): void {
    //     this._getGridView().find(".selected").removeClass("selected");
    // }

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

    // private _cancelTable(tableName: string): void {
    //     let tableInfo = PTblManager.Instance.getTableByName(tableName);
    //     if (tableInfo != null) {
    //         tableInfo.cancel()
    //         .fail((error) => {
    //             error = error || ErrTStr.CannotCancel;
    //             Alert.error(StatusMessageTStr.CancelFail, error);
    //         });
    //     }
    // }

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

    // private _createRectSelection(startX: number, startY: number): RectSelection {
    //     let $gridMenu: JQuery = this._getGridMenu();
    //     $gridMenu.hide();
    //     let $scrollContainer = this._getTableListSection().find(".gridViewWrapper");
    //     return new RectSelection(startX, startY, {
    //         "id": "tblGridView-rectSelection",
    //         "$container": this._getGridView(),
    //         "$scrollContainer": $scrollContainer,
    //         "onStart": () => {
    //             let $gridView = this._getGridView();
    //             $gridView.addClass("drawing");
    //         },
    //         "onDraw": (...args) => {
    //             return this._drawRect.apply(this, args);
    //         },
    //         "onEnd": (...args) => {
    //             return this._endDrawRect.apply(this, args);
    //         }
    //     });
    // }

    // private _drawRect(
    //     bound: ClientRect,
    //     rectTop: number,
    //     rectRight: number,
    //     rectBottom: number,
    //     rectLeft: number
    // ) {
    //     let $gridView = this._getGridView();
    //     $gridView.find(".grid-unit:visible").each((_index, el) => {
    //         let grid = el;
    //         let $grid = $(grid);
    //         if ($grid.hasClass("noAction")) {
    //             return;
    //         }

    //         let gridBound: ClientRect = grid.getBoundingClientRect();
    //         let gridTop: number = gridBound.top - bound.top;
    //         let gridLeft: number = gridBound.left - bound.left;
    //         let gridRight: number = gridBound.right - bound.left;
    //         let gridBottom: number = gridBound.bottom - bound.top;

    //         if (gridTop > rectBottom || gridLeft > rectRight ||
    //             gridRight < rectLeft || gridBottom < rectTop)
    //         {
    //             $grid.removeClass("selecting");
    //         } else {
    //             $grid.addClass("selecting");
    //         }
    //     });
    // }

    // private _endDrawRect() {
    //     let $gridView = this._getGridView();
    //     $gridView.removeClass("drawing");
    //     let $grids = $gridView.find(".grid-unit.selecting");
    //     if ($grids.length === 0) {
    //         $gridView.find(".grid-unit.selected").removeClass("selected");
    //     } else {
    //         $grids.each((_index, el) => {
    //             let $grid = $(el);
    //             $grid.removeClass("selecting")
    //                  .addClass("selected");
    //         });
    //     }
    // }

    // private _addEventListeners(): void {
    //     const $menuSection: JQuery = this._getMenuSection();
    //     $menuSection.find(".sortSection").on("click", ".sortOption", (event) => {
    //         let key: string = $(event.currentTarget).data("key");
    //         this._setSortKey(key);
    //     });

    //     const $gridViewWrapper: JQuery = this._getTableListSection().find(".gridViewWrapper");
    //     $gridViewWrapper.on("mousedown", (event) => {
    //         if (event.which !== 1|| (isSystemMac && event.ctrlKey)) {
    //             return;
    //         }

    //         let $target = $(event.target);
    //         if ($target.closest(".gridIcon").length ||
    //             $target.closest(".label").length
    //         ) {
    //             // this part is for drag and drop
    //             return;
    //         }

    //         this._createRectSelection(event.pageX, event.pageY);
    //     });
    // }

    // private _setupGridMenu(): void {
    //     let $gridMenu: JQuery = this._getGridMenu();
    //     xcMenu.add($gridMenu);
    //     // set up click right menu
    //     let $gridView = this._getGridView();
    //     let self = this;
    //     let el: any = <any>$gridView.parent()[0];
    //     el.oncontextmenu = function(event) {
    //         let $target: JQuery = $(event.target);
    //         let $grid: JQuery = $target.closest(".grid-unit");
    //         let classes: string = " noBorder";
    //         let totalSelected: number = $gridView.find(".grid-unit.selected").length;

    //         if ($grid.length && totalSelected > 1) {
    //             // multi selection
    //             $gridMenu.removeData("id");
    //             classes += " multiOpts";

    //             $gridMenu.find(".multiActivate, .multiDeactivate").show();
    //             let numTable: number = $gridView.find(".grid-unit.selected.ds").length;
    //             let numInActivatedTable: number = $gridView.find(".grid-unit.selected.inActivated").length;
    //             if (numTable === 0) {
    //                 // when no table
    //                 $gridMenu.find(".multiActivate, .multiDeactivate").hide();
    //             } else if (numInActivatedTable === 0) {
    //                 // when all tables are activated
    //                 $gridMenu.find(".multiActivate").hide();
    //             } else if (numTable === numInActivatedTable) {
    //                 // when all ds are inactivated
    //                 $gridMenu.find(".multiDeactivate").hide();
    //             }
    //         } else {
    //             self._cleanGridSelect();
    //             $gridMenu.find(".multiActivate, .multiDeactivate").hide();
    //             if ($grid.length) {
    //                 $grid.addClass("selected");

    //                 // options for a single table
    //                 let id = $grid.data("id");
    //                 $gridMenu.data("id", id);
    //                 let tableInfo = PTblManager.Instance.getTableByName(id);
    //                 classes += " tblOpts dsOpts";

    //                 if (tableInfo && tableInfo.active) {
    //                     classes += " dsActivated";
    //                 }

    //                 if (tableInfo && tableInfo.state === PbTblState.BeDataset) {
    //                     classes += " dsInCreate";
    //                 }

    //                 if ($grid.hasClass("loading")) {
    //                     classes += " loading cancelable";
    //                 }

    //                 if ($grid.hasClass("activating")) {
    //                     classes += " activating cancelable";
    //                 }
    //             } else {
    //                 classes += " bgOpts";
    //                 $gridMenu.removeData("id");
    //             }
    //         }

    //         MenuHelper.dropdownOpen($target, $gridMenu, {
    //             "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
    //             "classes": classes,
    //             "floating": true
    //         });
    //         return false;
    //     };

    //     self._setupMenuActions();
    // }

    // private _setupMenuActions(): void {
    //     let $gridMenu = this._getGridMenu();
    //     let $subMenu = $("#tableGridViewSubMenu");
    //     // bg opeartion
    //     $gridMenu.on("mouseup", ".delete", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         this._deletTables([$gridMenu.data("id")]);
    //     });

    //     $gridMenu.on("mouseup", ".multiDelete", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         let ids = this._getIdsFromSelectedGrid();
    //         this._deletTables(ids);
    //     });

    //     $gridMenu.on("mouseup", ".activate", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         this._activateTables([$gridMenu.data("id")]);
    //     });

    //     $gridMenu.on("mouseup", ".multiActivate", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         let ids = this._getIdsFromSelectedGrid();
    //         this._activateTables(ids);
    //     });

    //     $gridMenu.on("mouseup", ".deactivate", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         this._deactivateTables([$gridMenu.data("id")]);
    //     });

    //     $gridMenu.on("mouseup", ".multiDeactivate", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         let ids = this._getIdsFromSelectedGrid();
    //         this._deactivateTables(ids);
    //     });

    //     $gridMenu.on("mouseup", ".cancel", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         this._cancelTable($gridMenu.data("id"));
    //     });

    //     $gridMenu.on("mouseenter", ".sort", () => {
    //         let key: string = this._sortKey || "none";
    //         let $lis = $subMenu.find(".sort li");
    //         $lis.removeClass("select");
    //         $lis.filter((_index, el) => {
    //             return $(el).attr("name") === key;
    //         }).addClass("select");
    //     });

    //     $subMenu.on("mouseup", ".sort li", (event) => {
    //         if (event.which !== 1) {
    //             return;
    //         }
    //         let key: string = $(event.currentTarget).attr("name");
    //         this._setSortKey(key);
    //     });
    // }

    // private _getIdsFromSelectedGrid(): string[] {
    //     let $gridView = this._getGridView();
    //     let ids: string[] = [];
    //     $gridView.find(".grid-unit.selected").each((_index, el) => {
    //         let id = $(el).data("id");
    //         ids.push(id);
    //     });
    //     return ids;
    // }
}