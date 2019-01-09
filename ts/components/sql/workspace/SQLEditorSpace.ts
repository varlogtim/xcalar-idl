class SQLEditorSpace {
    private static _instance: SQLEditorSpace;

    private _sqlEditor: SQLEditor;
    private _isDocked: boolean = true;
    private _minWidth: number = 200;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

    }

    public setup(): void {
        this._setupSQLEditor();
        this._addEventListeners();
    }

    public refresh(): void {
        this._adjustResize();
        this._sqlEditor.refresh();
    }

    private _setupSQLEditor(): void {
        const self = this;
        const callbacks = {
            onExecute: () => {
                console.log("execute")
                // $("#sqlExecute").click();
            },
            onCalcelExecute: () => {
                // XXX TODO
            },
            onAutoComplete: (editor: CodeMirror.Editor) => {
                editor.execCommand("autocompleteSQLInVDW");
            }
        }
        this._sqlEditor = new SQLEditor("sqlEditorSpace-editor", callbacks);

        CodeMirror.commands.autocompleteSQLInVDW = function(cmeditor) {
            let acTables = self._getAutoCompleteHint();
            CodeMirror.showHint(cmeditor, CodeMirror.hint.sql, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true,
                tables: acTables
            });
        }
    }

    private _getAutoCompleteHint() {
        let arcTables = {};
        try {
            let tables: PbTblInfo[] = PTblManager.Instance.getTables();
            tables.forEach((table) => {
                arcTables[table.name] = [];
                table.columns.forEach((col) => {
                    arcTables[table.name].push(col.name);
                    arcTables[col.name] = [];
                });
            });
        } catch (e) {
            console.error(e);
        }
        return arcTables;
    }

    private _getEditorSpaceEl(): JQuery {
        return $("#sqlEditorSpace");
    }

    private _executeAllSQL(): void {
        try {
            let sqls: string = this._sqlEditor.getSelection() || this._sqlEditor.getValue();
            let sqlArray: string[] = XDParser.SqlParser.getMultipleQueriesViaParser(sqls);
            sqlArray.forEach((sql) => {
                this._executeSQL(sql);
            });
        } catch (e) {
            console.error(e);
            // XXX TODO: display some error in XD
        }
    }

    private _executeSQL(sql): XDPromise<void> {
        return new SQLExecutor(sql).execute();
    }

    private _addEventListeners(): void {
        const $container = this._getEditorSpaceEl();
        const $bottomSection = $container.find(".bottomSection");
        $bottomSection.on("click", ".execute", () => {
            this._executeAllSQL();
        });

        const $topBar = $container.find(".topBarSection");
        $topBar.on("click", ".showTables", () => {
            SQLResultSpace.Instance.showTables(true);
        });

        $container.on("click", ".undock", () => {
            if ($container.closest(".leftSection").hasClass("undocked")) {
                this._dock();
            } else {
                this._undock();
            }
        });

        this._getEditorSpaceEl().closest(".leftSection").draggable({
            "handle": "header.draggable",
            "cursor": "-webkit-grabbing",
            "containment": "#sqlWorkSpacePanel"
        });
        this._setupResize();
    }

    private _setupResize() {
        let $panel: JQuery = $('#sqlWorkSpacePanel');
        let $mainContent: JQuery = $panel.children(".mainContent");
        let $leftSection: JQuery = $panel.find(".leftSection");
        let $rightSection: JQuery = $panel.find(".rightSection");
        let mainContentWidth: number;

        let rightSectionMin: number = 650;
        let self = this;

        // resizable left and right sections
        $leftSection.resizable({
            handles: "e, s, se",
            containment: 'parent',
            minWidth: self._minWidth,
            minHeight: 300,
            start: function () {
                $panel.addClass("resizing");
                mainContentWidth = $mainContent.width();
            },
            resize: function (_event, ui) {
                if (!self._isDocked) {
                    return;
                }
                let width = ui.size.width;
                if (mainContentWidth - width <= rightSectionMin) {
                    width = Math.max(self._minWidth, mainContentWidth - rightSectionMin);
                    $leftSection.outerWidth(width);
                }
                $rightSection.width("calc(100% - " + width + "px)");
            },
            stop: function (_event, ui) {
                let width = ui.size.width;
                let rect: ClientRect = $leftSection[0].getBoundingClientRect();
                let diffRight = rect.right - $(window).width();
                if (diffRight > 0) {
                    width -= (diffRight + 5);
                    $leftSection.outerWidth(width);
                }

                if (self._isDocked) {
                    if (mainContentWidth - width <= rightSectionMin) {
                        width = Math.max(self._minWidth, mainContentWidth - rightSectionMin);
                        $leftSection.outerWidth(width);
                    }
                    $rightSection.width("calc(100% - " + width + "px)");
                }

                $panel.removeClass("resizing");
            }
        });
    }

    private _undock(): void {
        this._isDocked = false;
        const $container = this._getEditorSpaceEl()
        $container.closest(".leftSection")
                  .addClass("undocked")
                  .css({"left": 10, "top": -10});
        $("#sqlWorkSpacePanel").find(".rightSection").outerWidth("100%");
        const $icon = $container.find(".undock");
        xcTooltip.changeText($icon, SideBarTStr.PopBack);
        $icon.removeClass("xi_popout").addClass("xi_popin");
    }

    private _dock(): void {
        this._isDocked = true;
        const $container = this._getEditorSpaceEl();
        $container.closest(".leftSection")
                    .removeClass("undocked")
                    .css({"left": 0, "top": 0, "height": "100%"})
        const width = $container.outerWidth() + 1; // weird issue where border takes up 1px
        $("#sqlWorkSpacePanel").find(".rightSection").outerWidth("calc(100% - " + width + "px)");
        this.refresh();
        const $icon = $container.find(".undock");
        xcTooltip.changeText($icon, SideBarTStr.PopOut);
        $icon.removeClass("xi_popin").addClass("xi_popout");
    }

    // if window is shrunk, guarantees that leftSection shrinks so that
    // rightSection retains a minimum width
    private _adjustResize() {
        if (!this._isDocked) {
            return;
        }
        let $panel: JQuery = $('#sqlWorkSpacePanel');
        let $leftSection: JQuery = $panel.find(".leftSection");
        let $rightSection: JQuery = $panel.find(".rightSection");
        let $mainContent: JQuery = $panel.children(".mainContent");
        let rightSectionMin: number = 650;

        let mainContentWidth: number = $mainContent.width();
        let width = $leftSection.outerWidth();
        if (mainContentWidth - width <= rightSectionMin) {
            width = Math.max(this._minWidth, mainContentWidth - rightSectionMin);
            $leftSection.outerWidth(width);
            $rightSection.width("calc(100% - " + width + "px)");
        }
    }
}