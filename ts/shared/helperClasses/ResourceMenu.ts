class ResourceMenu {
    private _container: string;
    private _event: XcEvent;

    constructor(container: string) {
        this._container = container;
        this._event = new XcEvent();
        this._setupActionMenu();
        this._addEventListeners();
        this._getContainer().find(".tableList").addClass("active");
    }

    public render(): void {
        try {
            this._renderTableList();
            this._renderTableFuncList();
            this._renderUDFList();
            this._renderDataflowList();
        } catch (e) {
            console.error(e);
        }
    }

    public on(event: string, callback: Function): ResourceMenu {
        this._event.addEventListener(event, callback);
        return this;
    }

    public getContainer(): JQuery {
        return this._getContainer();
    }

    public getMenu(): JQuery {
        return this._getMenu();
    }

    public getListHTML(
        name: string,
        listClassNames: string[],
        iconClassNames: string[],
        id: string = ""
    ): HTML {
        return this._getListHTML(name, listClassNames, iconClassNames, id);
    }

    private _getContainer(): JQuery {
        return $(`#${this._container}`);
    }

    private _getMenu(): JQuery {
        return this._getContainer().find(".menu");
    }


    private _renderTableFuncList(): void {
        const html = this._event.dispatchEvent("getTableFuncList") || "";
        this._getContainer().find(".tableFunc ul").html(html);
    }

    private _renderUDFList(): void {
        const html = this._event.dispatchEvent("getUDFList") || "";
        this._getContainer().find(".udf ul").html(html);
    }

    private _renderDataflowList(): void {
        const html = this._event.dispatchEvent("getDFList") || "";
        this._getContainer().find(".dfModuleList ul").html(html);
    }

    private _getListHTML(
        name: string,
        listClassNames: string[],
        iconClassNames: string[],
        id: string = "",
    ): HTML {
        const iconClasses = ["gridIcon", "icon", ...iconClassNames];
        return `<li class="${listClassNames.join(" ")}" data-id="${id}">` +
                    `<i class="${iconClasses.join(" ")}"></i>` +
                    '<div class="name tooltipOverflow textOverflowOneLine" ' +
                    xcTooltip.Attrs +
                    ' data-title="' + name + '"' +
                    '>' + name + '</div>' +
                    '<button class=" btn-secondary dropDown">' +
                        '<i class="icon xi-ellipsis-h xc-action"></i>' +
                    '</div>' +
                '</li>';
    }

    private _renderTableList(): void {
        const tables: PbTblInfo[] = SQLResultSpace.Instance.getAvailableTables();
        const listClassNames: string[] = ["table", "selectable"];
        const iconClassNames: string[] = ["xi-table-2"];
        const html: HTML = tables.map((table) => {
            return this._getListHTML(table.name, listClassNames, iconClassNames);
        }).join("");
        this._getContainer().find(".tableList ul").html(html);
    }

    private _openDropdown(event: JQueryEventObject): void {
        const $dropDownLocation: JQuery = $(event.currentTarget);
        const $li = $dropDownLocation.closest("li");
        const $menu: JQuery = this._getMenu();
        $menu.data("name", $li.find(".name").text());
        $menu.data("id", $li.data("id"));

        $menu.find("li").hide();
        if ($li.hasClass("table")) {
            $menu.find("li.table").show();
        } else if ($li.hasClass("tableFunc")) {
            $menu.find("li.tableFunc").show();
        } else if ($li.hasClass("udf")) {
            $menu.find("li.udf").show();
        } else if ($li.hasClass("dagListDetail")) {
            $menu.find("li.dag").show();

            const $openOnlyOption = $menu.find("li.duplicateDataflow, li.downloadDataflow");
            if ($li.hasClass("open")) {
                $openOnlyOption.removeClass("xc-disabled");
            } else {
                $openOnlyOption.addClass("xc-disabled");
            }
        }

        MenuHelper.dropdownOpen($dropDownLocation, $menu, {
            "mouseCoors": this._getDropdownPosition($dropDownLocation, $menu),
            "floating": true
        });
    }

    private _getDropdownPosition(
        $dropDownLocation: JQuery,
        $menu: JQuery
    ): {x: number, y: number} {
        const rect = $dropDownLocation[0].getBoundingClientRect();
        const x: number = rect.right - $menu.outerWidth();
        const y: number = rect.bottom;
        return {
            x,
            y
        };
    }

    private _tableQuery(tableName: string): void {
        const sql: string = `select * from ${tableName};`;
        SQLWorkSpace.Instance.newSQL(sql);
    }

    private _tableModule(tableName: string): void {
        const tableInfo = PTblManager.Instance.getTableByName(tableName);
        if (tableInfo == null) {
            const msg = `Cannot find table ${tableName}`;
            Alert.error(ErrTStr.Error, msg);
        } else {
            DagView.newTabFromSource(DagNodeType.IMDTable, {
                source: tableName,
                schema: tableInfo.getSchema()
            });
        }
    }

    private async _tableFuncQuery(name: string): Promise<void> {
        try {
            const numInput = await DagTabSQLFunc.getFuncInputNum(name);
            const inputSignature = new Array(numInput).fill(null)
            .map((_v, i) => `Input${i + 1}`).join(", ");
            const sql: string = `select * from ${name}(${inputSignature});`;
            SQLWorkSpace.Instance.newSQL(sql);
        } catch (e) {
            console.error(e);
            Alert.error(ErrTStr.Error, "Error occurred when compose query from table function.");
        }
    }

    private _udfQuery(name: string): void {
        try {
            const fn = UDFFileManager.Instance.listSQLUDFFuncs().find((fn) => fn.name === name);
            const inputSignature = new Array(fn.numArg).fill(null)
            .map((_v, i) => `Column${i + 1}`).join(", ");
            const sql: string = `select ${fn.name}(${inputSignature}) from`;
            SQLWorkSpace.Instance.newSQL(sql);
        } catch (e) {
            console.error(e);
            Alert.error(ErrTStr.Error, "Error occurred when compose query from table function.");
        }
    }

    // XXX TODO: copy the whole behavior of TblSource.ts
    // XXX TODO: move into XcPbTableViewer
    private async _focusOnTable(tableName: string): Promise<void> {
        const tableInfo: PbTblInfo = PTblManager.Instance.getTableByName(tableName);
        try {
            const resultName: string = await PTblManager.Instance.selectTable(tableInfo, 100);
            let tableId = xcHelper.getTableId(resultName);
            if (!tableId) {
                // invalid case
                Alert.show({
                    title: SQLErrTStr.Err,
                    msg: SQLErrTStr.NoResult,
                    isAlert: true
                });
                return;
            }
            const table = new TableMeta({
                tableId: tableId,
                tableName: resultName
            });
            this._event.dispatchEvent("viewTable", {
                table,
                schema: tableInfo.getSchema()
            });
        } catch (e) {
            console.error(e);
        }
    }

    private _setupActionMenu(): void {
        const $menu: JQuery = this._getMenu();
        xcMenu.add($menu);

        $menu.on("click", ".tableQuery", () => {
            const name: string = $menu.data("name");
            this._tableQuery(name);
        });

        $menu.on("click", ".tableModule", () => {
            const name: string = $menu.data("name");
            this._tableModule(name);
        });

        $menu.on("click", ".tableFuncQuery", () => {
            const name: string = $menu.data("name");
            this._tableFuncQuery(name);
        });

        $menu.on("click", ".udfQuery", () => {
            const name: string = $menu.data("name");
            this._udfQuery(name);
        });
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._getContainer();
        // expand/collapse the section
        $container.on("click", ".listWrap .listInfo", (event) => {
            $(event.currentTarget).closest(".listWrap").toggleClass("active");
        });

        $container.on("click", ".addTable", (event) => {
            event.stopPropagation();
            $("#dataStoresTab").click();
            DataSourceManager.startImport(true);
        });

        $container.on("click", ".addTableFunc", (event) => {
            event.stopPropagation();
            DagViewManager.Instance.createSQLFunc(true);
        });


        $container.on("click", ".tableList .table", (event) => {
            const $li = $(event.currentTarget);
            if ($li.hasClass("active")) {
                return;
            }
            $li.siblings(".active").removeClass("active");
            $li.addClass("active");
            this._focusOnTable($li.find(".name").text());
        });

        $container.on("click", ".dropDown", (event) => {
            event.stopPropagation();
            this._openDropdown(event);
        });

        $container.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    }
}