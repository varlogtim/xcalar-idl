class SQLEditorSpace {
    private static _instance: SQLEditorSpace;

    private _sqlEditor: SQLEditor;
    private _isDocked: boolean;
    private _minWidth: number;
    private _currentFile: string;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._isDocked = true;
        this._minWidth = 200;
    }

    public setup(): void {
        this._setupSQLEditor();
        this._addEventListeners();
    }

    public refresh(): void {
        this._adjustResize();
        this._refreshSnippet();
    }

    public switchMode(): void {
        if (XVM.isAdvancedMode()) {
            this._saveSnippet();
        }
    }

    public save(): XDPromise<void> {
        if (this._sqlEditor == null) {
            return PromiseHelper.resolve();
        }
        return this._saveSnippet();
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

    private _onLoadMode(promise: XDPromise<any>): any {
        let timer = setTimeout(() => {
            let $section = this._getEditorSpaceEl();
            $section.addClass("loading");
            xcHelper.showRefreshIcon($section, true, promise);
        }, 500);
        return timer;
    }

    private _offLoadMode(timer: any): void {
        let $section = this._getEditorSpaceEl();
        clearTimeout(timer);
        $section.removeClass("loading");
    }

    private _refreshSnippet(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let timer = this._onLoadMode(deferred.promise());
        SQLSnippet.Instance.listSnippetsAsync()
        .then(() => {
            this._setSnippet(this._currentFile || CommonTxtTstr.Untitled);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            this._offLoadMode(timer);
        });

        return deferred.promise();
    }

    private _getAutoCompleteHint(): any {
        let arcTables = {};
        try {
            let tables: PbTblInfo[] = SQLTableLister.Instance.getAvailableTables();
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

    private _getTopBarEl(): JQuery {
        return this._getEditorSpaceEl().find(".topBarSection");
    }

    private _executeAllSQL(): void {
        try {
            SQLWorkSpace.Instance.save();
            let sqls: string = this._sqlEditor.getSelection() || this._sqlEditor.getValue();
            let sqlArray: string[] = XDParser.SqlParser.getMultipleQueriesViaParser(sqls);
            let selectArray: string[] = [];
            let lastShow: any = {type: "select"};
            sqlArray.forEach((sql) => {
                let retStruct: any = XDParser.SqlParser.getPreStatements(sql);
                if (retStruct.type != "select") {
                    lastShow = retStruct;
                } else {
                    selectArray.push(sql);
                }
            });
            // Basic show tables and describe table
            // If there are multiple queries they are ignored
            if (sqlArray.length === 1 && lastShow.type === "showTables") {
                SQLResultSpace.Instance.showTables(true);
            } else if (sqlArray.length === 1 && lastShow.type === "describeTable") {
                let tableInfos: PbTblInfo[] = PTblManager.Instance.getTables();
                const targetTableName: string = lastShow.args[0];
                for (let i = 0; i < tableInfos.length; i++) {
                    if (tableInfos[i].name === targetTableName) {
                        SQLResultSpace.Instance.showSchema(tableInfos[i]);
                        return;
                    }
                }
                // Table not found
                console.error("Table not found: " + targetTableName);
                SQLResultSpace.Instance.showSchemaError("Table not found: " + targetTableName);
            }
            selectArray.forEach((sql) => {
                this._executeSQL(sql);
            });
        } catch (e) {
            console.error(e);
            let error: string;
            if (e instanceof Error) {
                error = e.message;
            } else if (typeof e === "string") {
                error = e;
            } else {
                error = JSON.stringify(e);
            }
            let $btn = this._getEditorSpaceEl().find(".bottomSection .execute");
            StatusBox.show(error, $btn);
        }
    }

    private _executeSQL(sql): XDPromise<void> {
        return new SQLExecutor(sql).execute();
    }

    private _setFileName(name: string): void {
        let $el: JQuery = this._getTopBarEl().find(".fileName");
        $el.text(name);
        xcTooltip.add($el, {
            title: name
        });
        this._currentFile = name;
    }

    private _getFileName(): string {
        return this._currentFile;
    }

    private _fileOption(action: string): void {
        switch (action) {
            case "new":
                this._saveSnippet();
                this._newSnippet();
                break;
            case "open":
                this._openSnippet();
                break;
            case "save":
                this._saveSnippet();
                xcHelper.showSuccess(SuccessTStr.Saved);
                break;
            case "saveAs":
                this._saveAsSnippet();
                break;
            case "delete":
                this._deleteSnippet();
                break;
            case "download":
                this._downlodSnippet();
                break;
            default:
                break;
        }
    }

    private _setSnippet(name: string): void {
        this._setFileName(name);
        let snippet = SQLSnippet.Instance.getSnippet(name);
        this._sqlEditor.setValue(snippet);
        this._sqlEditor.refresh();
    }

    private _newSnippet(): void {
        let validFunc = (name) => {
            return !SQLSnippet.Instance.hasSnippet(name);
        };
        let name = xcHelper.uniqueName(CommonTxtTstr.Untitled, validFunc, null, 100);
        this._setSnippet(name);
    }

    private _openSnippet(): void {
        SQLSnippetListModal.Instance.show((name) => {
            this._saveSnippet();
            this._setSnippet(name)
        });
    }

    private _saveSnippet(): XDPromise<void> {
        let snippet = this._sqlEditor.getValue();
        return SQLSnippet.Instance.writeSnippet(this._currentFile, snippet, true);
    }

    private _saveAsSnippet(): void {
        SQLSnippetSaveModal.Instance.show(this._currentFile, (newName) => {
            let snippet = this._sqlEditor.getValue();
            SQLSnippet.Instance.writeSnippet(newName, snippet, true);
            this._setFileName(newName);
            xcHelper.showSuccess(SuccessTStr.Saved);
        });
    }

    private _deleteSnippet(): void {
        let name: string = this._currentFile;
        let msg = xcHelper.replaceMsg(SQLTStr.DeleteSnippetMsg, {
            name: name
        });
        Alert.show({
            title: SQLTStr.DeleteSnippet,
            msg: msg,
            onConfirm: () => {
                SQLSnippet.Instance.deleteSnippet(name);
                this._newSnippet();
                xcHelper.showSuccess(SuccessTStr.Saved);
            }
        });
    }

    private _downlodSnippet(): void {
        let fileName: string = this._getFileName() + ".sql";
        let content: string = this._sqlEditor.getValue();
        xcHelper.downloadAsFile(fileName, content, false);
    }

    private _addEventListeners(): void {
        const $container = this._getEditorSpaceEl();
        const $bottomSection = $container.find(".bottomSection");
        $bottomSection.on("click", ".execute", (event) => {
            $(event.currentTarget).blur();
            this._executeAllSQL();
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
        this._setupTopBar();
    }

    private _setupTopBar(): void {
        const $topBar = this._getTopBarEl();
        $topBar.on("click", ".showTables", (event) => {
            $(event.currentTarget).blur();
            SQLResultSpace.Instance.showTables(true);
        });

        let selector: string = `#${this._getEditorSpaceEl().attr("id")}`;
        new MenuHelper($topBar.find(".fileOption"), {
            onOpen: () => {
                let $deletLi: JQuery = $topBar.find('.fileOption li[data-action="delete"]');
                if (SQLSnippet.Instance.hasSnippet(this._currentFile)) {
                    $deletLi.removeClass("xc-disabled");
                } else {
                    $deletLi.addClass("xc-disabled");
                }
            },
            onSelect: ($li) => {
                this._fileOption($li.data("action"));
            },
            container: selector,
            bounds: selector
        }).setupListeners();

        $topBar.on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<any>event.currentTarget);
        });
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