class SQLEditorSpace {
    private static _instance: SQLEditorSpace;

    private _sqlEditor: SQLEditor;
    public static minWidth: number = 200;
    private _executers: SQLDagExecutor[];
    private _loadTimer;
    private _dagTab: DagTab;
    private _popup: PopupPanel;


    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._executers = [];
        this._updateExecutor();
        this._setupPopup();
    }

    public setup(): void {
        this._setupSQLEditor();
        this._setupResize();
        this._addEventListeners();
    }

    /**
     * SQLEditorSpace.Instance.refresh
     */
    public refresh(): void {
        this._sqlEditor.refresh();
    }

    public clearSQL(): void {
        this._sqlEditor.setValue("");
        this._saveSnippetChange();
    }

    /**
     * SQLEditorSpace.Instance.newSQL
     * @param sql
     */
    public newSQL(sql: string): void {
        if (this._isReadOnlyTab(this._dagTab)) {
            DagTabManager.Instance.newTab();
        }
        let val: string = this._sqlEditor.getValue();
        if (val) {
            if (!val.trim().endsWith(";")) {
                val += ";";
            }
            const delim: string = val.endsWith("\n") ? "" : "\n";
            val += delim + sql;
        } else {
            val = sql;
        }
        this._sqlEditor.setValue(val);
        this._saveSnippetChange();
    }

    /**
     * SQLEditorSpace.Instance.execute
     * @param sqls
     */
    public execute(sqls: string): void {
        if (!DagPanel.Instance.hasSetup()) {
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

    /**
     * SQLEditorSpace.Instance.setTab
     * @param dagTab
     */
    public setTab(dagTab: DagTab): void {
        let oldSnippet: string = "";
        if (this._dagTab == null && this._sqlEditor) {
            oldSnippet = this._sqlEditor.getValue();
        }
        this._dagTab = dagTab;
        this._setEditorMode(oldSnippet);
    }

    /**
     * SQLEditorSpace.Instance.openSnippet
     * @param name
     */
    public openSnippet(name: string): boolean {
        if (this._isReadOnlyTab(this._dagTab)) {
            return false;
        }
        const snippet = SQLSnippet.Instance.getSnippet(name) || "";
        this._setSnippet(snippet);
        return true;
    }

    public startLoad(promise: XDPromise<any>): void {
        this._loadTimer = setTimeout(() => {
            let $section = this._getEditorSpaceEl();
            $section.addClass("loading");
            xcUIHelper.showRefreshIcon($section, true, promise);
        }, 500);
    }

    public stopLoad(): void {
        let $section = this._getEditorSpaceEl();
        clearTimeout(this._loadTimer);
        $section.removeClass("loading");
    }

    private _setSnippet(snippet: string): void {
        this._sqlEditor.setValue(snippet || "");
        this._sqlEditor.refresh();
    }

    private _setPlaceholder(placeholder: string): void {
        this._sqlEditor.setPlaceholder(placeholder);
        this._sqlEditor.refresh();
    }

    private _setupSQLEditor(): void {
        const self = this;
        this._sqlEditor = new SQLEditor("sqlEditorSpace-editor");
        this._sqlEditor
        .on("execute", () => {
            this._getEditorSpaceEl().find(".execute").click();
        })
        .on("cancelExecute", () => {
            // XXX need to unfreeze execute button in the future
            this.cancelExecution();
        })
        .on("autoComplete", (editor: CodeMirror.Editor) => {
            const hasHint = this._sqlEditor.showHintMenu(editor);
            if (!hasHint) {
                editor.execCommand("autocompleteSQLInVDW");
            }
        })
        .on("change", () => {
            this._saveSnippetChange();
        });

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

    private _executeAction(): void {
        if (this._executers.length === 0) {
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
            startTime: new Date(),
            statementType: SQLStatementType.Drop
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
                        if (sqlStructArray.length > 1) {
                            return PromiseHelper.reject(SQLErrTStr.MultiCreate);
                        }
                        selectArray.push(sqlStruct);
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
                return PromiseHelper.chain(executePromiseArray)
            })
            .then((ret) => {
                console.log(ret);
                SQLResultSpace.Instance.refreshTables();
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
            .then(deferred.resolve)
            .fail((err) => {
                if (curExecutor.getPublishName()) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(err);
                }
            });
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
                callback = (outputNode: DagNode, tabId: string, succeed, options) => {
                    this._removeExecutor(curExecutor);
                    if (succeed && options.show === "resultTable") {
                        DagViewManager.Instance.viewResult(outputNode, tabId);
                    } else if (succeed && options.show === "tableList") {
                        SQLResultSpace.Instance.showTables(true);
                    }
                };
            } else {
                callback = () => {
                    this._removeExecutor(curExecutor);
                };
            }
            curExecutor.execute(callback)
            .then(deferred.resolve)
            .fail((err) => {
                if (curExecutor.getPublishName()) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(err);
                }
            });
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


    private _fileOption(action: string): void {
        switch (action) {
            case "download":
                this._downlodSnippet();
                break;
            case "showTables":
                SQLResultSpace.Instance.showTables(false);
                break;
            case "addUDF":
                UDFPanel.Instance.openEditor(true);
                break;
            case "save":
                this._saveSnippet();
                break;
            case "savedQueries":
                SQLResultSpace.Instance.switchTab("query");
                break;
            case "history":
                SQLResultSpace.Instance.switchTab("history");
                break;
            default:
                break;
        }
    }

    private _saveSnippet(): void {
        const snippet = this._sqlEditor.getValue();
        const callback = (name) => {
            SQLSnippet.Instance.writeSnippet(name, snippet, true);
            xcUIHelper.showSuccess(SuccessTStr.Saved);
        }
        SQLSnippetSaveModal.Instance.show(CommonTxtTstr.Untitled, callback);
    }

    private _downlodSnippet(): void {
        const fileName: string = "snippet.sql";
        const content = this._sqlEditor.getValue();
        xcHelper.downloadAsFile(fileName, content);
    }

    private _setupPopup(): void {
        this._popup = new PopupPanel("sqlEditorSpace", {});
        this._popup
        .on("Undock", () => {
            this._undock();
        })
        .on("Dock", () => {
            this._dock();
        });
    }

    private _addEventListeners(): void {
        const $container = this._getEditorSpaceEl();
        const $header = $container.find("header");
        $header.on("click", ".execute", (event) => {
            $(event.currentTarget).blur();
            this._executeAction();
        });

        $header.on("click", ".showTables", (event) => {
            $(event.currentTarget).blur();
            SQLResultSpace.Instance.showTables(true);
        });

        $header.on("click", ".save", (event) => {
            $(event.currentTarget).blur();
            this._fileOption("save");
        });

        let selector: string = `#${this._getEditorSpaceEl().attr("id")}`;
        new MenuHelper($header.find(".btn.more"), {
            onSelect: ($li) => {
                this._fileOption($li.data("action"));
            },
            container: selector,
            bounds: selector
        }).setupListeners();
    }

    private _toggleDraggable(isDraggable: boolean): void {
        const $section: JQuery = this._popup.getPanel();
        if (isDraggable) {
            this._popup.setDraggable("header.draggable");
        } else {
            $section.draggable({disabled: true});
        }
    }

    private _undock(): void {
        let $dockableSection = this._popup.getPanel();
        let rect = $dockableSection[0].getBoundingClientRect();
        let height = Math.min(500, Math.max(300, $(window).height() - rect.top));
        $dockableSection.css({
            "left": rect.left + 5,
            "top": rect.top - 5,
            "width": "300px", "height": height
        });

        $("#sqlWorkSpacePanel").addClass("sqlEditorUndocked")
                               .removeClass("sqlEditorDocked");

        this._toggleDraggable(true);
        this.refresh();
        DagCategoryBar.Instance.showOrHideArrows();
    }

    private _dock(): void {
        // reset to default
        $("#sqlWorkSpacePanel").removeClass("sqlEditorUndocked")
                                .addClass("sqlEditorDocked")
                                .find(".rightSection .bottomPart")
                                .css({"top": "", "height": ""});

        if (PopupManager.isDocked("dagView")) {
            $("#dagView").css({"left": "", "width": ""});
        }

        $("#sqlWorkSpacePanel").find(".rightSection .topPart")
                                .css({"height": ""});
        this.refresh();
        this._toggleDraggable(false);
        DagCategoryBar.Instance.showOrHideArrows();
    }

    private _setupResize(): void {
        let self = this;
        this._getEditorSpaceEl().resizable({
            handles: "w, e, s, n, nw, ne, sw, se",
            minWidth: SQLEditorSpace.minWidth,
            minHeight: 300,
            containment: "#sqlWorkSpacePanel",
            stop: function () {
                self._sqlEditor.refresh();
            }
        });
    }

    private _saveSnippetChange(): void {
        try {
            if (this._dagTab == null || this._isReadOnlyTab(this._dagTab)) {
                return;
            }
            const dagTab = <DagTabUser>this._dagTab;
            const snippet: string = this._sqlEditor.getValue() || "";
            const lastSnippet: string = dagTab.getSnippet() || "";
            if (snippet !== lastSnippet) {
                dagTab.setSnippet(snippet);
                dagTab.save();
            }
        } catch (e) {
            console.error("save snippet change failed", e);
        }
    }

    private _isReadOnlyTab(dagTab: DagTab): boolean {
        return (dagTab != null) &&
                (!(dagTab instanceof DagTabUser) ||
                dagTab instanceof DagTabSQLFunc);
    }

    private _setEditorMode(oldSnippet: string): void {
        let readOnly: boolean | string;
        let snippet: string;
        let placeholder: string = "";
        let mode: string = "text/x-sql";
        const $buttons = this._getEditorSpaceEl().find(".execute, .save");
        $buttons.removeClass("xc-disabled");

        if (this._dagTab == null) {
            readOnly = false;
            snippet = "";
        } else if (this._isReadOnlyTab(this._dagTab)) {
            readOnly = "nocursor";
            snippet  ="";
            placeholder = SQLTStr.ReadOnly;
            mode = null;
            $buttons.addClass("xc-disabled");
        } else {
            const dagTab = <DagTabUser>this._dagTab;
            readOnly = false;
            snippet = dagTab.getSnippet() || oldSnippet;
            if (!snippet) {
                snippet = "";
                placeholder = SQLTStr.SnippetHint;
            }
        }
        this._setPlaceholder(placeholder);
        this._setSnippet(snippet);
        this._saveSnippetChange();
        const editor = this._sqlEditor.getEditor();
        editor.setOption("readOnly", readOnly);
        editor.setOption("mode", mode);
    }
}