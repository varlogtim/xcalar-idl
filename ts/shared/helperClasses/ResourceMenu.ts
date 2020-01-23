class ResourceMenu {
    public static KEY = {
        Table: "Table",
        TableFunc: "TableFunc",
        UDF: "UDF",
        DF: "DF"
    };

    private _container: string;
    private _stateOrder = {};

    constructor(container: string) {
        this._container = container;
        this._setupActionMenu();
        this._addEventListeners();
        this._getContainer().find(".tableList").addClass("active");

        this._stateOrder[QueryStateTStr[QueryStateT.qrCancelled]] = 2;
        this._stateOrder[QueryStateTStr[QueryStateT.qrNotStarted]] = 3;
        this._stateOrder[QueryStateTStr[QueryStateT.qrProcessing]] = 4;
        this._stateOrder[QueryStateTStr[QueryStateT.qrFinished]] = 0;
        this._stateOrder[QueryStateTStr[QueryStateT.qrError]] = 1;
    }

    public render(key?: string): void {
        try {
            if (!key) {
                this._renderTableList();
                this._renderTableFuncList();
                this._renderUDFList();
                this._renderDataflowList();
            } else if (key === ResourceMenu.KEY.Table) {
                this._renderTableList();
            } else if (key === ResourceMenu.KEY.TableFunc) {
                this._renderTableFuncList();
            } else if (key === ResourceMenu.KEY.UDF) {
                this._renderUDFList();
            } else if (key === ResourceMenu.KEY.DF) {
                this._renderDataflowList();
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _getContainer(): JQuery {
        return $(`#${this._container}`);
    }

    private _getMenu(): JQuery {
        return this._getContainer().find(".menu");
    }

    private _renderTableList(): void {
        const tables: PbTblInfo[] = SQLResultSpace.Instance.getAvailableTables();
        tables.sort((a, b) => xcHelper.sortVals(a.name, b.name));
        const iconClassNames: string[] = ["xi-table-2"];
        const html: HTML = tables.map((table) => {
            const listClassNames: string[] = ["table", "selectable"];
            if (!table.active) {
                listClassNames.push("inActive");
            }
            return this._getListHTML(table.name, listClassNames, iconClassNames);
        }).join("");
        this._getContainer().find(".tableList ul").html(html);
    }

    private _renderTableFuncList(): void {
        const listClassNames: string[] = ["tableFunc", "dagListDetail", "selectable"];
        const iconClassNames: string[] = ["xi-SQLfunction"];
        const dagTabs = DagList.Instance.getAllDags();
        let html: HTML = "";
        dagTabs.forEach((dagTab) => {
            if (dagTab instanceof DagTabSQLFunc) {
                const name = dagTab.getName();
                const id = dagTab.getId();
                html += this._getListHTML(name, listClassNames, iconClassNames, id);
            }
        });
        this._getContainer().find(".tableFunc ul").html(html);
    }

    private _renderUDFList(): void {
        const udfs = UDFPanel.Instance.listUDFs();
        const listClassNames: string[] = ["udf"];
        const iconClassNames: string[] = ["xi-menu-udf"];
        let html: HTML = udfs.map((udf) => {
            return this._getListHTML(udf.displayName, listClassNames, iconClassNames);
        }).join("");
        html = this._getSQLUDFList() + html;
        this._getContainer().find(".udf ul").html(html);
    }

    private _getSQLUDFList(): HTML {
        const udfs = UDFFileManager.Instance.listSQLUDFFuncs();
        const listClassNames: string[] = ["udf", "sqlUDF"];
        const iconClassNames: string[] = ["xi-menu-udf"];
        const html: HTML = udfs.map((udf) => {
            return this._getListHTML(udf.name, listClassNames, iconClassNames);
        }).join("");

        return this._getNestedListWrapHTML("SQL UDFs", html);
    }

    private _renderDataflowList(): void {
        const html = this._getDFList();
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

    private _getDFList(): HTML {
        const normalDagList: DagTab[] = [];
        const optimizedDagList: DagTabOptimized[] = [];
        const optimizedSDKDagList: DagTabOptimized[] = [];
        const queryDagList: DagTabQuery[] = [];
        const querySDKDagList: DagTabQuery[] = [];

        DagList.Instance.getAllDags().forEach((dagTab) => {
            if (dagTab instanceof DagTabOptimized) {
                if (dagTab.isFromSDK()) {
                    optimizedSDKDagList.push(dagTab);
                } else {
                    optimizedDagList.push(dagTab);
                }
            } else if (dagTab instanceof DagTabQuery) {
                if (dagTab.isSDK()) {
                    querySDKDagList.push(dagTab);
                } else {
                    queryDagList.push(dagTab);
                }
            } else if (dagTab instanceof DagTabPublished) {
                // ingore it
            } else if (dagTab instanceof DagTabSQLFunc) {
                // ingore it, is handled in _getTableFuncList
            } else {
                normalDagList.push(dagTab);
            }
        });

        normalDagList.sort(this._sortDagTab);
        optimizedDagList.sort(this._sortDagTab);
        optimizedSDKDagList.sort(this._sortDagTab);
        querySDKDagList.sort(this._sortDagTab);
        queryDagList.sort((a, b) => this._sortAbandonedQueryTab(a, b));

        const html: HTML =
        this._getNestedDagListHTML(optimizedDagList) +
        this._getNestedDagListHTML(optimizedSDKDagList) +
        this._getNestedDagListHTML(queryDagList) +
        this._getNestedDagListHTML(querySDKDagList) +
        this._getDagListHTML(normalDagList);
        return html;
    }

    private _sortDagTab(dagTabA: DagTab, dagTabB: DagTab): number {
        const aName = dagTabA.getName().toLowerCase();
        const bName = dagTabB.getName().toLowerCase();
        return (aName < bName ? -1 : (aName > bName ? 1 : 0));
    }

    private _sortAbandonedQueryTab(dagTabA: DagTabQuery, dagTabB: DagTabQuery): number {
        // both abandoned queries
        const aState = dagTabA.getState();
        const bState = dagTabB.getState();
        if (aState === bState) {
            const aTime = dagTabA.getCreatedTime();
            const bTime = dagTabB.getCreatedTime();
            return (aTime < bTime ? -1 : (aTime > bTime ? 1 : 0));
        } else {
            return (this._stateOrder[aState] > this._stateOrder[bState] ? -1 : 1);
        }
    }

    private _getDagListHTML(dagTabs: DagTab[]): HTML {
        return dagTabs.map((dagTab) => {
            const id = dagTab.getId();
            const name = dagTab.getName();
            const listClassNames: string[] = ["dagListDetail", "selectable"];
            const iconClassNames: string[] = ["gridIcon", "icon", "xi-dfg2"];
            let tooltip: string = ""
            let stateIcon: string = "";
            if (dagTab.isOpen()) {
                listClassNames.push("open");
            }
            if (dagTab instanceof DagTabOptimized) {
                listClassNames.push("optimized");
            } else if (dagTab instanceof DagTabQuery) {
                listClassNames.push("abandonedQuery");
                const state = dagTab.getState();
                stateIcon = '<div class="statusIcon state-' + state +
                            '" ' + xcTooltip.Attrs + ' data-original-title="' +
                            xcStringHelper.camelCaseToRegular(state.slice(2)) + '"></div>';
                const createdTime = dagTab.getCreatedTime();
                if (createdTime) {
                    tooltip = xcTimeHelper.getDateTip(dagTab.getCreatedTime(), {prefix: "Created: "});
                }
            }
            // XXX TODO: combine with _getListHTML
            return `<li class="${listClassNames.join(" ")}" data-id="${id}">` +
                        `<i class="${iconClassNames.join(" ")}"></i>` +
                        stateIcon +
                        '<div class="name tooltipOverflow textOverflowOneLine" ' + tooltip + '>' +
                            name +
                        '</div>' +
                        '<button class=" btn-secondary dropDown">' +
                            '<i class="icon xi-ellipsis-h xc-action"></i>' +
                        '</div>' +
                    '</li>';
        }).join("");
    }

    private _getNestedDagListHTML(dagTabs: DagTab[]): HTML {
        if (dagTabs.length === 0) {
            return "";
        }
        try {
            const html = this._getDagListHTML(dagTabs);
            const dagTab = dagTabs[0];
            const path: string = dagTab.getPath();
            const folderName = path.split("/")[0];
            return this._getNestedListWrapHTML(folderName, html);
        } catch (e) {
            console.error(e);
            return "";
        }

    }

    private _getNestedListWrapHTML(name: string, content: HTML): HTML {
        return '<div class="nested listWrap xc-expand-list">' +
                '<div class="listInfo">' +
                    '<span class="expand">' +
                        '<i class="icon xi-down fa-13"></i>' +
                    '</span>' +
                    '<span class="text">' + name + '</span>' +
                '</div>' +
                '<ul>' +
                    content +
                '</ul>' +
            '</div>';
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
            if ($li.hasClass("inActive")) {
                $menu.find("li.tableActivate").show();
                $menu.find("li.tableDeactivate").hide();
            } else {
                $menu.find("li.tableActivate").hide();
                $menu.find("li.tableDeactivate").show();
            }
        } else if ($li.hasClass("tableFunc")) {
            $menu.find("li.tableFunc").show();
        } else if ($li.hasClass("udf")) {
            $menu.find("li.udf").show();

            if ($li.hasClass("sqlUDF")) {
                $menu.find("li.udfQuery").removeClass("xc-disabled");
            } else {
                $menu.find("li.udfQuery").addClass("xc-disabled");
            }
        }
        // sql func can also have this class
        if ($li.hasClass("dagListDetail")) {
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
            DagViewManager.Instance.toggleSqlPreview(false);
            if (DagTabManager.Instance.getNumTabs() === 0) {
                DagTabManager.Instance.newTab();
            }
            const input = {
                source: tableName,
                schema: tableInfo.getSchema()
            };
            let node: DagNode = DagViewManager.Instance.autoAddNode(DagNodeType.IMDTable,
                null, null, input, undefined, undefined, {
                    configured: true,
                    forceAdd: true
            });

            DagNodeMenu.execute("configureNode", {
                node: node,
                exitCallback: () => {
                    node.setParam({}, true);
                }
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
            const schema = tableInfo.getSchema();
            const columns = schema.map((col) => {
                return {
                    name: col.name,
                    backName: col.name,
                    type: col.type
                };
            });
            gTables[table.getId()] = table;
            SQLResultSpace.Instance.viewTable(table, columns);
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

        $menu.on("click", ".tableActivate", () => {
            const name: string = $menu.data("name");
            TblSource.Instance.activateTable(name);
        });

        $menu.on("click", ".tableDeactivate", () => {
            const name: string = $menu.data("name");
            TblSource.Instance.deactivateTable(name);
        });

        $menu.on("click", ".tableDelete", () => {
            const name: string = $menu.data("name");
            TblSource.Instance.deleteTable(name);
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