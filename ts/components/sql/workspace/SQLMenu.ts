class SQLMenu {
    private _resourceMenu: ResourceMenu;

    constructor(container: string) {
        this._resourceMenu = new ResourceMenu(container);
        this._setupResourceMenuEvent();
        this._setupActionMenu();
        this._addEventListeners();
    }

    public render(key?: string): void {
        this._resourceMenu.render(key);
    }

    private _getTableFuncList(): HTML {
        const tableFuncs = DagTabSQLFunc.listFuncs();
        const listClassNames: string[] = ["tableFunc"];
        const iconClassNames: string[] = ["xi-SQLfunction"];
        const html: HTML = tableFuncs.map((name) => {
            return this._resourceMenu.getListHTML(name, listClassNames, iconClassNames);
        }).join("");
        return html;
    }

    protected _getUDFList(): HTML {
        const udfs = UDFFileManager.Instance.listSQLUDFFuncs();
        const listClassNames: string[] = ["udf"];
        const iconClassNames: string[] = ["xi-menu-udf"];
        const html: HTML = udfs.map((udf) => {
            return this._resourceMenu.getListHTML(udf.name, listClassNames, iconClassNames);
        }).join("");
        return html;
    }

    protected _viewTable(
        arg: {
            table: TableMeta,
            schema: ColSchema[]
        }
    ): void {
        const { table, schema } = arg;
        let columns = schema.map((col) => {
            return {
                name: col.name,
                backName: col.name,
                type: col.type
            };
        });
        gTables[table.getId()] = table;
        SQLResultSpace.Instance.viewTable(table, columns);
    }

    private _udfEdit(): void {
        UDFFileManager.Instance.open("sql.py");
    }

    private _tableFuncEdit(name: string): void {
        MainMenu.openPanel("dagPanel");
        const dagTab = DagTabSQLFunc.getFunc(name);
        DagTabManager.Instance.loadTab(dagTab);
    }

    private _setupResourceMenuEvent(): void {
        this._resourceMenu
        .on("getTableFuncList", () => this._getTableFuncList())
        .on("getUDFList", () => this._getUDFList())
        .on("viewTable", (arg) => this._viewTable(arg));
    }

    private _setupActionMenu(): void {
        const $menu: JQuery = this._resourceMenu.getMenu();
        $menu.on("click", ".tableFuncEdit", () => {
            const name: string = $menu.data("name");
            this._tableFuncEdit(name);
        });

        $menu.on("click", ".udfEdit", () => {
            this._udfEdit();
        });
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._resourceMenu.getContainer();
        $container.on("click", ".addUDF", (event) => {
            event.stopPropagation();
            UDFFileManager.Instance.open("sql.py");
        });
    }
}