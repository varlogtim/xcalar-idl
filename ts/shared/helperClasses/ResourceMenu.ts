class ResourceMenu {
    private static _instance: ResourceMenu;

    public static KEY = {
        Table: "Table",
        UDF: "UDF",
        App: "App",
        TableFunc: "TableFunc",
        DF: "DF",
        SQL: "SQL"
    };

    private _container: string;
    private _stateOrder = {};

    public static get Instance() {
        return this._instance || (this._instance = new ResourceMenu("dagListSection"));
    }

    private constructor(container: string) {
        this._container = container;
        this._setupActionMenu();
        this._addEventListeners();
        const $container = this._getContainer();
        $container.find(".tableList").addClass("active");

        this._stateOrder[QueryStateTStr[QueryStateT.qrCancelled]] = 2;
        this._stateOrder[QueryStateTStr[QueryStateT.qrNotStarted]] = 3;
        this._stateOrder[QueryStateTStr[QueryStateT.qrProcessing]] = 4;
        this._stateOrder[QueryStateTStr[QueryStateT.qrFinished]] = 0;
        this._stateOrder[QueryStateTStr[QueryStateT.qrError]] = 1;
    }

    public getContainer(): JQuery {
        return this._getContainer();
    }

    public render(key?: string): void {
        try {
            if (!key) {
                this._renderTableList();
                this._renderUDFList();
                this._renderApps();
            } else if (key === ResourceMenu.KEY.Table) {
                this._renderTableList();
            } else if (key === ResourceMenu.KEY.TableFunc) {
                this._renderTableFuncList();
            } else if (key === ResourceMenu.KEY.UDF) {
                this._renderUDFList();
            } else if (key === ResourceMenu.KEY.SQL) {
                this._renderSQList();
            } else if (key === ResourceMenu.KEY.DF) {
                this._renderDataflowList();
            } else if (key === ResourceMenu.KEY.App) {
                this._renderApps();
            }
        } catch (e) {
            console.error(e);
        }
    }

    public focusOnList($li: JQuery): void {
        try {
            let $listWrap = $li.closest(".listWrap");
            $listWrap.addClass("active");
            if ($listWrap.hasClass("nested")) {
                $listWrap = $listWrap.closest(".listWrap:not(.nested)");
                $listWrap.addClass("active");
            }
            const $container = this._getContainer();
            DagUtil.scrollIntoView($listWrap, $container);
            $li.scrollintoview({duration: 0});
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

    private _getList(selector: string, appId: string): JQuery {
        const $section = appId ? this._getAppSection(appId) : this._getContainer();
        if (appId == null) {
            selector = `${selector}.main`; // select the one not in the app
        }
        return $section.find(`${selector} ul`);
    }

    private _getAppSection(appId: string): JQuery {
        return this._getContainer().find(`.app[data-id=${appId}]`);
    }

    private _renderTableList(): void {
        const tables: PbTblInfo[] = SQLResultSpace.Instance.getAvailableTables();
        tables.sort((a, b) => xcHelper.sortVals(a.name, b.name));
        const iconClassNames: string[] = ["xi-table-outline"];
        const html: HTML = tables.map((table) => {
            const listClassNames: string[] = ["table", "selectable"];
            if (!table.active) {
                listClassNames.push("inActive");
            }
            return this._getListHTML(table.name, listClassNames, iconClassNames);
        }).join("");
        this._getContainer().find(".tableList ul").html(html);
    }

    private _renderApps(): void {
        this._renderAppList();
        this._renderTableFuncList();
        this._renderSQList();
        this._renderDataflowList();
    }

    private _renderAppList(): void {
        const classNames: string[] = ["app"];
        const apps = AppList.Instance.list();
        const $container = this._getContainer();
        const template = $container.find(".appTemplate").html();
        let html: HTML = "";
        apps.forEach((app) => {
            html += this._getNestedListWrapHTML(app.name, template, classNames, app.id, true);
        });

        html = html + this._getSpecialAppList();
        this._getContainer().find(".apps ul").html(html);
    }

    private _renderTableFuncList(): void {
        const iconClassNames: string[] = ["xi-SQLfunction"];
        const dagTabs = DagList.Instance.getAllDags();
        const map: Map<string, HTML> = new Map(); // appId to html map
        dagTabs.forEach((dagTab) => {
            if (dagTab.getType() === DagTabType.SQLFunc) {
                const listClassNames: string[] = ["tableFunc", "dagListDetail", "selectable"];
                const name = dagTab.getName();
                const id = dagTab.getId();
                if (dagTab.isOpen()) {
                    listClassNames.push("open");
                }
                const appId: string = dagTab.getApp();
                let html: string = map.get(appId) || "";
                html += this._getListHTML(name, listClassNames, iconClassNames, id);
                map.set(appId, html);
            }
        });

        for (let [appId, html] of map) {
            this._getList(".tableFunc", appId).html(html);
        }
    }

    private _renderUDFList(): void {
        const udfs = UDFPanel.Instance.listUDFs();
        const iconClassNames: string[] = ["xi-menu-udf"];
        const defaultUDF = UDFFileManager.Instance.getDefaultUDFPath() + ".py";
        let html: HTML = udfs.map((udf) => {
            const displayName: string = udf.displayName;
            const listClassNames: string[] = ["udf"];
            const shortName: string = UDFPanel.parseModuleNameFromFileName(displayName);
            if (UDFTabManager.Instance.isOpen(shortName)) {
                listClassNames.push("open");
            }
            if (displayName === defaultUDF) {
                listClassNames.push("defaultUDF");
            }
            return this._getListHTML(displayName, listClassNames, iconClassNames);
        }).join("");
        // html = this._getSQLUDFList() + html;
        this._getContainer().find(".udf ul").html(html);
    }

    private _getSQLUDFList(): HTML {
        const udfs = UDFFileManager.Instance.listSQLUDFFuncs();
        const listClassNames: string[] = ["udf", "sqlUDF"];
        const iconClassNames: string[] = ["xi-menu-udf"];
        const html: HTML = udfs.map((udf) => {
            return this._getListHTML(udf.name, listClassNames, iconClassNames);
        }).join("");

        return this._getNestedListWrapHTML("SQL Scalar Functions", html);
    }

    private _renderSQList(): void {
        const snippets: SQLSnippetDurable[] = SQLSnippet.Instance.list();
        const iconClassNames: string[] = ["xi-menu-sql"];
        const map: Map<string, HTML> = new Map(); // appId to html map
        snippets.forEach((snippet) => {
            const name = snippet.name;
            const id = snippet.id;
            const listClassNames: string[] = ["sqlSnippet"];
            if (SQLTabManager.Instance.isOpen(id)) {
                listClassNames.push("open");
            }
            const appId: string = snippet.app;
            let html: string = map.get(appId) || "";
            html += this._getListHTML(name, listClassNames, iconClassNames, id);
            map.set(appId, html);
        });

        for (let [appId, html] of map) {
            this._getList(".sqlList", appId).html(html);
        }
    }

    private _renderDataflowList(): void {
        const map: Map<string, HTML> = new Map(); // appId to html map
        const mainMap: Map<string, HTML> = new Map();
        DagList.Instance.getAllDags().forEach((dagTab) => {
            const type: DagTabType = dagTab.getType();
            if (type === DagTabType.User ||
                type === DagTabType.Main
            ) {
                const appId: string = dagTab.getApp();
                const list = this._getDagListHTML([dagTab]);
                if (type === DagTabType.Main) {
                    mainMap.set(appId, list);
                } else {
                    let html: string = map.get(appId) || "";
                    html += list;
                    map.set(appId, html);
                }
            }
        });

        for (let [appId, html] of map) {
            this._getList(".dfModuleList", appId).html(html);
            if (appId != null) {
                // append main tab to the first
               this._getAppSection(appId).find(".overView").html(mainMap.get(appId));
            }
        }
    }

    private _getListHTML(
        name: string,
        listClassNames: string[],
        iconClassNames: string[],
        id: string = "",
    ): HTML {
        const iconClasses = ["gridIcon", "icon", ...iconClassNames];
        return `<li class="${listClassNames.join(" ")}" data-id="${id}" data-name="${name}">` +
                    `<i class="${iconClasses.join(" ")}"></i>` +
                    '<div class="name tooltipOverflow textOverflowOneLine" ' +
                    xcTooltip.Attrs +
                    ' data-title="' + name + '"' +
                    '>' + name + '</div>' +
                    this._getDropdownHTML() +
                '</li>';
    }

    private _getDropdownHTML(): HTML {
        return '<button class=" btn-secondary dropDown">' +
                    '<i class="icon xi-ellipsis-h xc-action"></i>' +
                '</button>'
    }

    private _getSpecialAppList(): HTML {
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
            }
        });

        optimizedDagList.sort(this._sortDagTab);
        optimizedSDKDagList.sort(this._sortDagTab);
        querySDKDagList.sort(this._sortDagTab);
        queryDagList.sort((a, b) => this._sortAbandonedQueryTab(a, b));

        const html: HTML =
        this._getNestedDagListHTML(optimizedDagList) +
        this._getNestedDagListHTML(optimizedSDKDagList) +
        this._getNestedDagListHTML(queryDagList) +
        this._getNestedDagListHTML(querySDKDagList)
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
            const iconClassNames: string[] = ["gridIcon", "icon", "xi-dataflow-thin"];
            let tooltip: string = ""
            let stateIcon: string = "";
            if (dagTab.isOpen()) {
                listClassNames.push("open");
            }
            if (dagTab instanceof DagTabMain) {
                listClassNames.push("main");
            } else if (dagTab instanceof DagTabOptimized) {
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
                        '</button>' +
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

    private _getNestedListWrapHTML(
        name: string,
        content: HTML,
        classNames: string[] = [],
        id: string = "",
        hasDropdown: boolean = false
    ): HTML {
        const sectionClasses: string[] = ["nested", "listWrap", "xc-expand-list", ...classNames];
        return `<div class="${sectionClasses.join(" ")}" data-id="${id}">` +
                '<div class="listInfo">' +
                    '<span class="expand">' +
                        '<i class="icon xi-down fa-12"></i>' +
                    '</span>' +
                    '<span class="text">' + name + '</span>' +
                    (hasDropdown ? this._getDropdownHTML() : '') +
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

        if ($dropDownLocation.closest(".listInfo").length &&
            $dropDownLocation.closest(".app").length
        ) {
            // app option
            $menu.find("li.app").show();
            $menu.data("id", $dropDownLocation.closest(".app").data("id"));
        } else if ($li.hasClass("table")) {
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

            if ($li.hasClass("defaultUDF")) {
                $menu.find("li.udfDelete").addClass("xc-disabled");
            } else {
                $menu.find("li.udfDelete").removeClass("xc-disabled");
            }

        } else if ($li.hasClass("sqlSnippet")) {
            $menu.find("li.sql").show();
        }
        // sql func can also have this class
        if ($li.hasClass("dagListDetail")) {
            $menu.find("li.dag").show();

            const $openOnlyOption = $menu.find("li.duplicateDataflow, li.downloadDataflow");
            const $deleteOption = $menu.find("li.deleteDataflow");
            if ($li.hasClass("open")) {
                $openOnlyOption.removeClass("xc-disabled");
            } else {
                $openOnlyOption.addClass("xc-disabled");
            }
            if ($li.hasClass("main")) {
                $deleteOption.hide();
            } else {
                $deleteOption.show();
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

    private async _tableModule(tableName: string): Promise<void> {
        const tableInfo = PTblManager.Instance.getTableByName(tableName);
        if (tableInfo == null) {
            const msg = `Cannot find table ${tableName}`;
            Alert.error(ErrTStr.Error, msg);
        } else {
            if (DagTabManager.Instance.getNumTabs() === 0) {
                DagTabManager.Instance.newTab();
            }
            const input = {
                source: tableName,
                schema: tableInfo.getSchema()
            };
            let node: DagNode = await DagViewManager.Instance.autoAddNode(DagNodeType.IMDTable,
                null, null, input, undefined, undefined, {
                    configured: true,
                    forceAdd: true
            });
            if (node != null) {
                DagNodeMenu.execute("configureNode", {
                    node: node,
                    exitCallback: () => {
                        node.setParam({}, true);
                    }
                });
            }
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

    private _focusOnTable(tableName: string): void {
        TableTabManager.Instance.openTab(tableName, TableTabType.PbTable);
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

        $menu.on("click", ".appDelete", () => {
            const app: string = $menu.data("id");
            AppList.Instance.delete(app);
        });

        $menu.on("click", ".appDownload", () => {
            const app: string = $menu.data("id");
            AppList.Instance.download(app);
        });

        $menu.on("click", ".tableFuncQuery", () => {
            const name: string = $menu.data("name");
            SQLWorkSpace.Instance.tableFuncQuery(name);
        });

        $menu.on("click", ".udfQuery", () => {
            const name: string = $menu.data("name");
            this._udfQuery(name);
        });

        $menu.on("click", ".udfDelete", () => {
            const name: string = UDFPanel.parseModuleNameFromFileName($menu.data("name"));
            UDFPanel.Instance.deleteUDF(name);
        });

        $menu.on("click", ".sqlDownload", () => {
            const id: string = $menu.data("id");
            SQLSnippet.Instance.download(id);
        });

        $menu.on("click", ".sqlDelete", () => {
            const id: string = $menu.data("id");
            SQLEditorSpace.Instance.deleteSnippet(id);
        });
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._getContainer();
        // expand/collapse the section
        $container.on("click", ".listWrap .listInfo", (event) => {
            const $list = $(event.currentTarget).closest(".listWrap");
            $list.toggleClass("active");
            if ($list.hasClass("active")) {
                // $list.parent().closest(".listWrap").scrollintoview({duration: 0, padding: 0});
                $list.scrollintoview({duration: 0, padding: 0});
            }
        });

        $container.on("click", ".addTable", (event) => {
            event.stopPropagation();
            $("#dataStoresTab").click();
            DataSourceManager.startImport(true);
        });

        $container.on("click", ".searchTable", (event) => {
            event.stopPropagation();
            TableSearchPanel.Instance.show();
        });

        $container.on("click", ".addApp", (event) => {
            event.stopPropagation();
            CreateAppModal.Instance.show();
        });

        $container.on("click", ".addUDF", (event) => {
            event.stopPropagation();
            UDFPanel.Instance.newUDF();
        });

        $container.on("click", ".addDFModule", (event) => {
            event.stopPropagation();
            DagTabManager.Instance.newTab(true);
        });

        $container.on("click", ".addSQL", (event) => {
            event.stopPropagation();
            SQLTabManager.Instance.newTab();
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

        $container.on("click", ".sqlList .sqlSnippet", (event) => {
            const $li = $(event.currentTarget);
            if ($li.hasClass("active")) {
                return;
            }
            const id: string = $li.data("id");
            SQLTabManager.Instance.openTab(id);
        });

        $container.on("click", ".udf.listWrap .udf", (event) => {
            const $li = $(event.currentTarget);
            if ($li.hasClass("active")) {
                return;
            }
            if ($li.hasClass("sqlUDF")) {
                UDFPanel.Instance.loadSQLUDF();
            } else {
                let name: string = $li.find(".name").text();
                name = UDFPanel.parseModuleNameFromFileName(name);
                UDFPanel.Instance.loadUDF(name);
            }
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