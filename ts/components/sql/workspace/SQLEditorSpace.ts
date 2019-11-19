class SQLEditorSpace {
    private static _instance: SQLEditorSpace;

    private _sqlEditor: SQLEditor;
    private _isDocked: boolean;
    private _minWidth: number;
    private _currentFile: string;
    private _executers: SQLDagExecutor[];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._isDocked = true;
        this._minWidth = 200;
        this._executers = [];
        this._updateExecutor();
    }

    public setup(): void {
        this._setupSQLEditor();
        this._addEventListeners();
    }

    public refresh(): void {
        this._adjustResize();
        this._refreshSnippet();
    }

    public resize(): void {
        this._adjustResize();
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

    public clearSQL(): void {
        this._sqlEditor.setValue("");
    }

    public newSQL(sql: string): void {
        let val: string = this._sqlEditor.getValue();
        if (val) {
            if (!val.endsWith(";")) {
                val += ";";
            }
            val += "\n" + sql;
        } else {
            val = sql;
        }
        this._sqlEditor.setValue(val);
    }

    /**
     * SQLEditorSpace.Instance.execute
     * @param sqls
     */
    public execute(sqls: string): void {
        if (!DagPanel.hasSetup()) {
            Alert.error(AlertTStr.Error, DFTStr.NotSetup);
            return;
        }
        return this._executeSQL(sqls);
    }

    public cancelExecution(): void {
        this._executers.forEach((executor, i) => {
            if (executor.getStatus() != SQLStatus.Done &&
                executor.getStatus() != SQLStatus.Cancelled &&
                executor.getStatus() != SQLStatus.Failed
            ) {
                this._executers[i] = null;
                executor.setStatus(SQLStatus.Cancelled);
            }
        });

        this._executers = this._executers.filter((executor) => {
            return executor != null;
        });
    }

    public setSnippet(name: string): void {
        SQLSnippet.Instance.setLastOpenedSnippet(name);
        this._setFileName(name);
        let snippet = SQLSnippet.Instance.getSnippet(name);
        this._sqlEditor.setValue(snippet);
        this._sqlEditor.refresh();
    }

    private _setupSQLEditor(): void {
        const self = this;
        const callbacks = {
            onExecute: () => {
                this._getEditorSpaceEl().find(".execute").click();
            },
            onCancelExecute: () => {
                // XXX need to unfreeze execute button in the future
                this.cancelExecution();
            },
            onAutoComplete: (editor: CodeMirror.Editor) => {
                editor.execCommand("autocompleteSQLInVDW");
            }
        }
        this._sqlEditor = new SQLEditor("sqlEditorSpace-editor", callbacks);

        SQLSnippet.Instance.showLastOpenedSnippet();

        CodeMirror.commands.autocompleteSQLInVDW = function(cmeditor) {
            let acTables = self._getAutoCompleteHint();
            CodeMirror.showHint(cmeditor, CodeMirror.hint.sql, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true,
                tables: acTables
            });
        }
        this._setExecuteBtnTooltip();
    }

    private _setExecuteBtnTooltip(): void {
        let $btn: JQuery = this._getEditorSpaceEl().find(".bottomSection .execute");
        let title: string = "Execute Query" + "<br/> (";
        if (isSystemMac) {
            title += "Cmd + E";
        } else {
            title += "Ctrl + E";
        }
        title += ")";
        xcTooltip.add($btn, {
            title: title
        });
    }

    private _onLoadMode(promise: XDPromise<any>): any {
        let timer = setTimeout(() => {
            let $section = this._getEditorSpaceEl();
            $section.addClass("loading");
            xcUIHelper.showRefreshIcon($section, true, promise);
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
            this.setSnippet(this._currentFile || CommonTxtTstr.Untitled);
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
            let tables: PbTblInfo[] = SQLResultSpace.Instance.getAvailableTables();
            tables.forEach((table) => {
                arcTables[table.name] = [];
                table.columns.forEach((col) => {
                    const upperName = col.name.toUpperCase();
                    if (col.name != "DATA" &&
                        !upperName.startsWith("XCALARRANKOVER") &&
                        !upperName.startsWith("XCALAROPCODE") &&
                        !upperName.startsWith("XCALARBATCHID") &&
                        !upperName.startsWith("XCALARROWNUMPK")) {
                        arcTables[table.name].push(col.name);
                        arcTables[col.name] = [];
                    }
                });
            });
            const sqlFuncs = DagTabSQLFunc.listFuncs();
            sqlFuncs.forEach((sqlFunc) => {
                arcTables[sqlFunc + "()"] = [];
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

    private _getFileNameEl(): JQuery {
        return this._getEditorSpaceEl().find("header .fileName");
    }

    private _executeAction(): void {
        if (this._executers.length === 0) {
            SQLWorkSpace.Instance.save();
            let sqls: string = this._sqlEditor.getSelection() ||
                               this._sqlEditor.getValue();
            this._executeSQL(sqls);
        } else {
            Alert.show({
                "title": SQLTStr.Execute,
                "msg": SQLTStr.InExecute,
                "isAlert": true
            });
        }
    }

    private _dropTable(tableName: string, queryString: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const historyObj =  {
            queryId: xcHelper.randName("sql", 8) + Date.now(),
            status: SQLStatus.Running,
            queryString: queryString,
            startTime: new Date()
        }
        let found = false;
        let tableInfos: PbTblInfo[] = PTblManager.Instance.getTables();
        for (let i = 0; i < tableInfos.length; i++) {
            if (tableInfos[i].name === tableName) {
                found = true;
                break;
            }
        }
        if (!found) {
            // Table not found
            historyObj["status"] = SQLStatus.Failed;
            historyObj["errorMsg"] = "Table not found: " + tableName;
            SQLHistorySpace.Instance.update(historyObj);
            return PromiseHelper.resolve();
        }
        SQLHistorySpace.Instance.update(historyObj);
        PTblManager.Instance.deleteTablesOnConfirm([tableName])
        .then(() => {
            historyObj["status"] = SQLStatus.Done;
            historyObj["endTime"] = new Date();
        })
        .fail((error) => {
            historyObj["status"] = SQLStatus.Failed;
            historyObj["errorMsg"] = error;
        })
        .always(() => {
            SQLHistorySpace.Instance.update(historyObj);
            // always resolve
            deferred.resolve();
        });
        return deferred.promise();
    }

    private _executeSQL(sqls: string): void {
        if (!sqls || !sqls.trim()) return;
        try {
            let selectArray: SQLParserStruct[] = [];
            let lastShow: any = {type: "select"};
            let executorArray: SQLDagExecutor[] = [];
            let compilePromiseArray: XDPromise<any>[] = [];
            let executePromiseArray: XDPromise<any>[] = [];
            const struct = {
                sqlQuery: sqls,
                ops: ["identifier", "sqlfunc", "parameters"],
                isMulti: (sqls.indexOf(";") > -1)
            };
            SQLUtil.sendToPlanner("", "parse", struct)
            .then((ret) => {
                const sqlStructArray: [SQLParserStruct] = JSON.parse(ret).ret;
                if (!struct.isMulti && sqlStructArray.length === 1 &&
                    Object.keys(sqlStructArray[0].functions).length === 0 &&
                    sqlStructArray[0].command.type !== "createTable") {
                    // when it's single statement and doesn't have SQL function
                    // use original sql which contains newline characters
                    sqlStructArray[0].sql = sqlStructArray[0].newSql = sqls;
                }
                for (let sqlStruct of sqlStructArray) {
                    if (sqlStruct.command.type === "dropTable") {
                        const tableName: string = sqlStruct.command.args[0];
                        executePromiseArray.push(this._dropTable.bind(this,
                                                     tableName, sqlStruct.sql));
                    } else if (sqlStruct.command.type === "createTable") {
                        return PromiseHelper.reject(SQLErrTStr.NoSupport + sqlStruct.command.type);
                        // if (sqlStructArray.length > 1) {
                        //     return PromiseHelper.reject(SQLErrTStr.MultiCreate);
                        // }
                        // selectArray.push(sqlStruct);
                    } else if (sqlStruct.command.type === "showTables"
                               || sqlStruct.command.type === "describeTable") {
                        lastShow = sqlStruct.command;
                    } else if (sqlStruct.nonQuery) {
                        return PromiseHelper.reject(SQLErrTStr.NoSupport + sqlStruct.sql);
                    } else {
                        selectArray.push(sqlStruct);
                    }
                }
                // Basic show tables and describe table
                // If there are multiple queries they are ignored
                if (sqlStructArray.length === 1 && lastShow.type === "showTables") {
                    SQLResultSpace.Instance.showTables(true);
                } else if (sqlStructArray.length === 1 &&
                           lastShow.type === "describeTable") {
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
                    SQLResultSpace.Instance.showSchemaError("Table not found: "
                                                            + targetTableName);
                }
                for (let i = 0; i < selectArray.length; i++) {
                    const sqlStruct: SQLParserStruct = selectArray[i];
                    let executor: SQLDagExecutor;
                    try {
                        executor = new SQLDagExecutor(sqlStruct);
                    } catch (e) {
                        console.error(e);
                        return PromiseHelper.reject(e);
                    }
                    executorArray.push(executor);
                }
                for (let i = 0; i< executorArray.length; i++) {
                    this._addExecutor(executorArray[i]);
                    compilePromiseArray.push(this._compileStatement(executorArray[i]));
                    executePromiseArray.push(this._executeStatement.bind(this,
                                      executorArray[i], i, selectArray.length));
                }
                return PromiseHelper.when.apply(this, compilePromiseArray);
            })
            .then(() => {
                PromiseHelper.chain(executePromiseArray)
                .then(() => {
                    SQLResultSpace.Instance.refreshTables();
                });
            })
            .fail((e) => {
                this._throwError(e);
            });
        } catch (e) {
            this._throwError(e);
        }
    }
    private _throwError(error: any): void {
        let errorMsg: string;
        if (error instanceof Error) {
            errorMsg = error.message;
        } else if (typeof error === "string") {
            errorMsg = error;
        } else {
            errorMsg = JSON.stringify(error);
        }
        Alert.show({
            title: SQLErrTStr.Err,
            msg: errorMsg,
            isAlert: true,
            align: "left",
            preSpace: true,
            sizeToText: true
        });
    }
    private _compileStatement(curExecutor: SQLDagExecutor) {
        try {
            let callback = null;
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            callback = () => {
                this._removeExecutor(curExecutor);
            };
            curExecutor.compile(callback)
            .always(deferred.resolve);
            return deferred.promise();
        } catch (e) {
            this._throwError(e);
        }
    }

    private _executeStatement(curExecutor: SQLDagExecutor,
                              i: number, statementCount: number) {
        try {
            let callback = null;
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            if (i === statementCount - 1) {
                callback = (tableName, succeed, options) => {
                    this._removeExecutor(curExecutor);
                    if (succeed) {
                        this._showTable(tableName, options);
                    }
                };
            } else {
                callback = () => {
                    this._removeExecutor(curExecutor);
                };
            }
            curExecutor.execute(callback)
            .always(deferred.resolve);
            return deferred.promise();
        } catch (e) {
            this._throwError(e);
        }
    }

    private _addExecutor(executor: SQLDagExecutor): void {
        this._executers.push(executor);
        this._updateExecutor();
    }

    private _removeExecutor(executor: SQLDagExecutor): void {
        for (let i = 0; i< this._executers.length; i++) {
            if (this._executers[i] === executor) {
                this._executers.splice(i, 1);
                break;
            }
        }
        this._updateExecutor();
    }

    private _updateExecutor() {
        let $cancelButton = $("#sqlWorkSpacePanel .selQueryHistCard .selCancelQueryHist").addClass("xc-disabled");
        if (this._executers.length === 0) {
            $cancelButton.addClass("xc-disabled");
        } else {
            $cancelButton.removeClass("xc-disabled");
        }
    }

    private _showTable(tableName: string, options?: any): void {
        let tableId = xcHelper.getTableId(tableName);
        if (!tableId) {
            // invalid case
            Alert.show({
                title: SQLErrTStr.Err,
                msg: SQLErrTStr.NoResult,
                isAlert: true
            });
            return;
        }
        let table = new TableMeta({
            tableId: tableId,
            tableName: tableName
        });
        let columns = null;
        if (options && options.columns) {
            columns = options.columns;
        }
        gTables[tableId] = table;
        SQLResultSpace.Instance.viewTable(table, columns);
    }

    private _setFileName(name: string): void {
        let $el: JQuery = this._getFileNameEl();
        $el.text(name);
        xcTooltip.add($el, {
            title: name
        });
        if (name == CommonTxtTstr.Untitled) {
            $el.addClass("untitled");
        } else {
            $el.removeClass("untitled");
        }
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

    private _newSnippet(): void {
        this._renameWarning()
        .then(() => {
            this.setSnippet(CommonTxtTstr.Untitled);
        })
        .fail(() => {
            // We decided not to discard the change
            return;
        });
    }

    private _openSnippet(): void {
        SQLSnippetListModal.Instance.show((name) => {
            this._renameWarning()
            .then(() => {
                if (this._currentFile == CommonTxtTstr.Untitled) {
                    // We don't want to save the untitled file if we just deleted it
                    return PromiseHelper.resolve();
                }
                return this._saveSnippet()
            })
            .then(() => {
                this.setSnippet(name)
            })
            .fail(() => {
                // We decided not to discard the change
                return;
            })
        });
    }

    private _saveSnippet(): XDPromise<void> {
        let snippet = this._sqlEditor.getValue();
        return SQLSnippet.Instance.writeSnippet(this._currentFile, snippet, true);
    }

    private _saveAsSnippet(): void {
        SQLSnippetSaveModal.Instance.show(this._currentFile, (newName) => {
            let snippet = this._sqlEditor.getValue();
            let oldName = this._currentFile;
            SQLSnippet.Instance.writeSnippet(newName, snippet, true);
            this._setFileName(newName);
            xcUIHelper.showSuccess(SuccessTStr.Saved);
            if (oldName == CommonTxtTstr.Untitled) {
                SQLSnippet.Instance.deleteSnippet(oldName);
            }
        });
    }

    private _deleteSnippet(): void {
        let name: string = this._currentFile;
        let msg = xcStringHelper.replaceMsg(SQLTStr.DeleteSnippetMsg, {
            name: name
        });
        Alert.show({
            title: SQLTStr.DeleteSnippet,
            msg: msg,
            onConfirm: () => {
                SQLSnippet.Instance.deleteSnippet(name);
                this.setSnippet(CommonTxtTstr.Untitled);
                xcUIHelper.showSuccess(SuccessTStr.Saved);
            }
        });
    }

    private _downlodSnippet(): void {
        let fileName: string = this._getFileName() + ".sql";
        let content: string = this._sqlEditor.getValue();
        xcHelper.downloadAsFile(fileName, content);
    }

    private _renameSnippet($nameInput: JQuery): void {
        let $snippetName: JQuery = $nameInput.closest(".fileName");
        let newName: string = $nameInput.text().trim();
        let oldName: string = $snippetName.attr("data-original-title");
        let setName = (name) => {
            $nameInput.remove();
            this._setFileName(name);
        };

        if (newName == oldName) {
            setName(oldName);
            return;
        }

        let isValid = xcHelper.validate([{
            $ele: $nameInput
        }, {
            $ele: $nameInput,
            error: SQLTStr.NoUntitledSnippet,
            check: () => {
                return newName === CommonTxtTstr.Untitled;
            }
        }, {
            $ele: $nameInput,
            error: SQLTStr.NoDupSnippetName,
            check: () => {
                return SQLSnippet.Instance.hasSnippet(newName);
            }
        }]);

        if (!isValid) {
            $nameInput.text(oldName);
            return;
        }

        $snippetName.data("original-title", newName);
        let snippet = this._sqlEditor.getValue();
        SQLSnippet.Instance.writeSnippet(newName, snippet, true)
        .then(() => {
            SQLSnippet.Instance.deleteSnippet(oldName);
        })
        .fail((err) => {
            // Since we still have the old version, we can just report an error
            console.error(err);
        });
        setName(newName);
    }

    private _goToSQLFunc(): void {
        XVM.setMode(XVM.Mode.Advanced)
        .then(function() {
            $("#modelingDataflowTab").click();
            DagViewManager.Instance.createSQLFunc(true);
        });
    }

    private _addEventListeners(): void {
        const $container = this._getEditorSpaceEl();
        const $bottomSection = $container.find(".bottomSection");
        $bottomSection.on("click", ".execute", (event) => {
            $(event.currentTarget).blur();
            this._executeAction();
        });

        $container.on("click", ".undock", () => {
            if ($container.closest(".leftSection").hasClass("undocked")) {
                this._dock();
            } else {
                this._undock();
            }
        });

        this._setupResize();
        this._setupTopBar();
    }

    private _toggleDraggable(isDraggable: boolean): void {
        const $header: JQuery = this._getEditorSpaceEl().closest(".leftSection");
        if (isDraggable) {
            $header.draggable({
                "handle": "header.draggable",
                "cursor": "-webkit-grabbing",
                "containment": "#sqlWorkSpacePanel",
                "disabled": false
            });
        } else {
            $header.draggable({disabled: true});
        }
    }

    private _setupTopBar(): void {
        const $topBar = this._getTopBarEl();
        $topBar.on("click", ".showTables", (event) => {
            $(event.currentTarget).blur();
            SQLResultSpace.Instance.showTables(true);
        });

        $topBar.on("click", ".sqlFunc", (event) => {
            $(event.currentTarget).blur();
            this._goToSQLFunc();
        });

        let $fileName = this._getFileNameEl();
        $fileName.on("click", (event) => {
            let $snippet_name: JQuery = $(event.currentTarget);
            $snippet_name.removeClass("untitled");
            let editingName = $snippet_name.attr("data-original-title");
            $snippet_name.text("");
            let inputArea: string =
                "<span contentEditable='true' class='xc-input nameInput'></span>";
            $(inputArea).appendTo($snippet_name);
            let $input: JQuery = $snippet_name.find('.xc-input');
            $input.text(editingName);
            $input.focus();
            document.execCommand('selectAll', false, null);
        });

        $fileName.on("keypress", ".xc-input", (event) => {
            if (event.which === keyCode.Enter || event.which === 10) {
                event.preventDefault();
                $(event.currentTarget).blur();
            }
        });

       $fileName.on("focusout", ".xc-input", (event) => {
            let $nameInput: JQuery = $(event.currentTarget);
            this._renameSnippet($nameInput);
            xcUIHelper.removeSelectionRange();
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

        this._getEditorSpaceEl().find("header").on("mouseenter", ".tooltipOverflow", (event) => {
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
                TblFunc.moveFirstColumn();
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
        this._toggleDraggable(true);
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
        this._toggleDraggable(false);
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

    private _renameWarning(): XDPromise<void> {
        if (this._currentFile != CommonTxtTstr.Untitled) {
            return PromiseHelper.resolve();
        }
        const snippet = this._sqlEditor.getValue();
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (snippet == "") {
            return PromiseHelper.resolve();
        } else {
            let saveCallback = (newName) => {
                SQLSnippet.Instance.writeSnippet(newName, snippet, true)
                .then(() => {
                    xcUIHelper.showSuccess(SuccessTStr.Saved);
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
            SQLSnippetRenameModal.Instance.show(saveCallback, deferred);
            SQLSnippet.Instance.deleteSnippet(this._currentFile);
            return deferred.promise();
        }
    }
}