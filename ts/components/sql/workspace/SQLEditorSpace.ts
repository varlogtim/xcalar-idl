class SQLEditorSpace {
    private static _instance: SQLEditorSpace;

    private _sqlEditor: SQLEditor;
    public static minWidth: number = 200;
    private _executers: SQLDagExecutor[];
    private _currentSnippetId: string;
    private _popup: PopupPanel;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._executers = [];
        this._updateExecutor();
    }

    public setup(): void {
        this._setupSQLEditor();
        this._addEventListeners();
        this._loadSnippet();
        this.toggleSyntaxHighlight(!UserSettings.getPref("hideSyntaxHiglight"));
    }

    /**
     * SQLEditorSpace.Instance.refresh
     */
    public refresh(): void {
        if (this._sqlEditor) { // may not exist if called on startup
            this._sqlEditor.refresh();
        }
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
     * SQLEditorSpace.Instance.deleteSnippet
     * @param sqls
     */
    public deleteSnippet(id: string): void {
        const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
        if (snippetObj == null) {
            return;
        }
        let msg = xcStringHelper.replaceMsg(SQLTStr.DeleteSnippetMsg, {
            name: snippetObj.name
        });
        Alert.show({
            title: SQLTStr.DeleteSnippet,
            msg: msg,
            onConfirm: () => {
                SQLSnippet.Instance.delete(id);
            }
        });
    }

    /**
     * SQLEditorSpace.Instance.openSnippet
     * @param name
     */
    public openSnippet(id: string): boolean {
        const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
        if (snippetObj == null) {
            return false;
        }
        const snippet = snippetObj.snippet || "";
        this._currentSnippetId = snippetObj.id;
        this._setSnippet(snippet);
        return true;
    }

    /**
     * SQLEditorSpace.Instance.toggleSyntaxHighlight
     * @param on
     */
    public toggleSyntaxHighlight(on: boolean): void {
        if (this._sqlEditor != null) {
            this._sqlEditor.toggleSyntaxHighlight(on);
        }
    }

    private _setSnippet(snippet: string): void {
        if (!snippet) {
            this._setPlaceholder(SQLTStr.SnippetHint);
        }
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
            SQLOpPanel.Instance.updateSnippet(this._currentSnippetId);
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

    private async _loadSnippet(): Promise<void> {
        const deferred = PromiseHelper.deferred();
        const timer = this._startLoad(deferred.promise());
        const loadRes = await SQLSnippet.Instance.load();
        await SQLTabManager.Instance.setup();
        deferred.resolve();
        this._stopLoad(timer);
        ResourceMenu.Instance.render(ResourceMenu.KEY.SQL);
        if (loadRes === false) {
            // when it's the new workbook
            SQLTabManager.Instance.newTab();
        }
    }

    private _startLoad(promise: XDPromise<any>): any {
        const timer = setTimeout(() => {
            let $section = this._getEditorSpaceEl();
            $section.addClass("loading");
            xcUIHelper.showRefreshIcon($section, true, promise);
        }, 500);
        return timer;
    }

    private _stopLoad(timer: any): void {
        let $section = this._getEditorSpaceEl();
        clearTimeout(timer);
        $section.removeClass("loading");
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

    private async _compileSingleSQL(sql: string): Promise<SQLDagExecutor | null> {
        if (!sql || !sql.trim()) {
            return null;
        }

        try {
            const struct = {
                sqlQuery: sql,
                ops: ["identifier", "sqlfunc", "parameters"],
                isMulti: false
            };
            const ret = await SQLUtil.sendToPlanner("", "parse", struct)
            const sqlParseRet = JSON.parse(ret).ret;
            let sqlStructArray: SQLParserStruct[];
            if (!(sqlParseRet instanceof Array)) { // Remove this after parser change in
                if (sqlParseRet.errorMsg) {
                    throw new Error(sqlParseRet.errorMsg);
                }
                sqlStructArray = sqlParseRet.parseStructs;
            } else {
                sqlStructArray = sqlParseRet;
            }

            const sqlStruct: SQLParserStruct = sqlStructArray[0];
            if (sqlStruct.nonQuery) {
                throw new Error(SQLErrTStr.NoSupport + sqlStruct.sql);
            }
            const executor: SQLDagExecutor = new SQLDagExecutor(sqlStruct, {compileOnly: true});
            await executor.compile(null);
            return executor;
        } catch (e) {
            this._throwError(e);
            return null;
        }
    }

    private _executeSQL(sqls: string): void {
        if (!sqls || !sqls.trim()) {
            return
        }

        try {
            const numStatemsnts = sqls.split(";").filter((sql) => sql.trim() !== "").length;
            if (numStatemsnts > 1) {
                // disallow multiple sql statement
                throw new Error("Cannot have multiple statement in the SQL, please selected one statement and execute.");
            }

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
                const sqlParseRet = JSON.parse(ret).ret;
                let sqlStructArray: SQLParserStruct[];
                if (!(sqlParseRet instanceof Array)) { // Remove this after parser change in
                    if (sqlParseRet.errorMsg) {
                        return PromiseHelper.reject(sqlParseRet.errorMsg);
                    }
                    sqlStructArray = sqlParseRet.parseStructs;
                } else {
                    sqlStructArray = sqlParseRet;
                }
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
        if (error instanceof Array) {
            let errorMsg = null;
            for (let i = 0; i < error.length; i++) {
                if (error[i] != null) {
                    errorMsg = error[i];
                    break;
                }
            }
            error = errorMsg;
        }
        if (!error) {
            // if error is null, it should have an alert in sql node
            return;
        }
        console.error(error);
        let errorMsg: string;
        let detail: string;
        try {
            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "string") {
                errorMsg = error;
            } else if (error.status != null) {
                errorMsg = error.error;
                detail = error.log;
                if (error.status === StatusT.StatusAstNoSuchFunction) {
                    errorMsg = error.error + "\n If there is any scalar function used in the SQL, please make sure it's defined in sql.py.";
                }
            } else {
                errorMsg = JSON.stringify(error);
            }
        } catch (e) {
            console.error(e);
            errorMsg = JSON.stringify(error);
        }
        Alert.show({
            title: SQLErrTStr.Err,
            msg: errorMsg,
            detail: detail,
            isAlert: true,
            align: "left",
            preSpace: true,
            sizeToText: true
        });
    }
    private _compileStatement(curExecutor: SQLDagExecutor) {
        try {
            let callback = null;
            let deferred: XDDeferred<any> = PromiseHelper.deferred();
            callback = () => {
                this._removeExecutor(curExecutor);
            };
            curExecutor.compile(callback)
            .then(deferred.resolve)
            .fail((err) => {
                deferred.reject(err);
                // XXX not sure why we were resolving sometimes
                // if (curExecutor.getPublishName()) {
                //     deferred.reject(err);
                // } else {
                //     deferred.resolve(err);
                // }
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
                deferred.reject(err);
                 // XXX not sure why we were resolving sometimes
                // if (curExecutor.getPublishName()) {
                //     deferred.reject(err);
                // } else {
                //     deferred.resolve(err);
                // }
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
                UDFPanel.Instance.loadSQLUDF();
                break;
            case "history":
                DebugPanel.Instance.toggleDisplay(true);
                DebugPanel.Instance.switchTab("sqlHistory");
                break;
            case "convertToSQLFuc":
                this._convertToSQLFunc();
                break;
            default:
                break;
        }
    }

    private _saveSnippet(id: string, snippet: string): void {
        SQLSnippet.Instance.update(id, snippet);
    }

    private _downlodSnippet(): void {
        const fileName: string = "snippet.sql";
        const content = this._sqlEditor.getValue();
        xcHelper.downloadAsFile(fileName, content);
    }

    public setupPopup(): void {
        this._popup = new PopupPanel("sqlViewContainer", {
            draggableHeader: ".draggableHeader"
        });
        this._popup
        .on("Undock", () => {
            this._undock();
        })
        .on("Dock", () => {
            this._dock();
        })
        .on("Resize", () => {
            this.refresh();
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

        let selector: string = `#${this._getEditorSpaceEl().attr("id")}`;
        new MenuHelper($header.find(".btn.more"), {
            onOpen: ($dropdown) => {
                this._onDropdownOpen($dropdown);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("unavailable")) {
                    this._fileOption($li.data("action"));
                }
            },
            container: selector,
            bounds: selector,
            fixedPosition: {selector: ".xc-action", float: true}

        }).setupListeners();
    }

    private _onDropdownOpen($dropdown: JQuery): void {
        const $li = $dropdown.find('li[data-action="convertToSQLFuc"]');
        if (this._sqlEditor.getSelection().length) {
            $li.removeClass("unavailable");
            xcTooltip.remove($li);
        } else {
            $li.addClass("unavailable");
            xcTooltip.add($li, {
                title: SQLTStr.CreateFuncHint
            });
        }
    }

    private _undock(): void {
        this.refresh();
    }

    private _dock(): void {
        this.refresh();
    }

    private _saveSnippetChange(): void {
        try {
            const snippet: string = this._sqlEditor.getValue() || "";
            const snippetObj: SQLSnippetDurable = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
            const lastSnippet: string = snippetObj.snippet || "";
            if (snippet !== lastSnippet) {
                this._saveSnippet(this._currentSnippetId, snippet);
            }
        } catch (e) {
            console.error("save snippet change failed", e);
        }
    }

    private async _convertToSQLFunc(): Promise<void> {
        const snippetObj = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
        if (snippetObj == null) {
            return;
        }
        const sql = this._sqlEditor.getSelection();
        const executor: SQLDagExecutor = await this._compileSingleSQL(sql);
        if (executor == null) {
            // error case
            return;
        }
        const {graph, numInput, sqlNode} = executor.convertToSQLFunc();
        const onSubmit = (name) => {
            DagTabManager.Instance.newSQLFunc(name, graph);
            DagViewManager.Instance.getActiveDagView().autoAlign({isNoLog: true});
            // XXX uncomment it if need to expand the sql node
            // DagViewManager.Instance.expandSQLNode(sqlNode.getId());
        };
        SQLFuncSettingModal.Instance.show(onSubmit, () => {}, numInput);
    }
}