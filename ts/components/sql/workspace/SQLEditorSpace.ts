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
        this._setupResize();
        this._addEventListeners();
        this._loadSnippet();
    }

    /**
     * SQLEditorSpace.Instance.refresh
     */
    public refresh(): void {
        this._adjustResize();
        this._sqlEditor.refresh();
    }

    public resize(): void {
        this._adjustResize();
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
        this._setFileName(name);
        const lasOpenedSnippet = SQLSnippet.Instance.getLastOpenSnippet();
        let text: string = "";
        if (lasOpenedSnippet &&
            lasOpenedSnippet.name === name &&
            lasOpenedSnippet.unsaved
        ) {
            text = lasOpenedSnippet.text;
        } else {
            text = SQLSnippet.Instance.getSnippet(name);
        }
        this._sqlEditor.setValue(text);
        this._sqlEditor.refresh();
    }

    /**
     * SQLEditorSpace.Instance.deleteSnippet
     * @param sqls
     */
    public deleteSnippet(name: string, callback: Function): void {
        let msg = xcStringHelper.replaceMsg(SQLTStr.DeleteSnippetMsg, {
            name: name
        });
        Alert.show({
            title: SQLTStr.DeleteSnippet,
            msg: msg,
            onConfirm: () => {
                SQLSnippet.Instance.deleteSnippet(name);
                if (name === this._currentFile) {
                    this._resetLastOpenedSnippet(CommonTxtTstr.Untitled, "");
                    this.setSnippet(CommonTxtTstr.Untitled);
                }
                if (typeof callback === "function") {
                    callback();
                }
            }
        });
    }

    public openSnippet(name: string): void {
        const callback = () => {
            this._resetLastOpenedSnippet(name, SQLSnippet.Instance.getSnippet(name));
            this.setSnippet(name);
        };
        if (this._hasEditedQuery()) {
            Alert.show({
                title: SQLTStr.OpenQuery,
                msg: SQLTStr.OpenQueryMsg,
                buttons: [{
                    name: SQLTStr.open,
                    func: callback
                }]
            });
        } else {
            callback();
        }
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
            this._checkQueryChangeFromSaved();
        })
        .on("afterChange", () => {
            this._saveLastSnippetChange();
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

    private async _loadSnippet(): Promise<void> {
        const deferred = PromiseHelper.deferred();
        const timer = this._startLoad(deferred.promise());
        const lastSnippetName: string = await SQLSnippet.Instance.load() || CommonTxtTstr.Untitled;
        deferred.resolve();
        this.setSnippet(lastSnippetName);
        this._checkQueryChangeFromSaved();
        this._stopLoad(timer);
    }

    private _startLoad(promise: XDPromise<any>): any {
        let timer = setTimeout(() => {
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

    private _getDockableSection(): JQuery {
        return this._getEditorSpaceEl();
    }

    private _getTopBarEl(): JQuery {
        return this._getEditorSpaceEl().find(".topBarSection");
    }

    private _getFileNameEl(): JQuery {
        return this._getEditorSpaceEl().find("header .fileName");
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
                callback = (tableName, succeed, options) => {
                    this._removeExecutor(curExecutor);
                    if (succeed && options.show === "resultTable") {
                        this._showTable(tableName, options);
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
        const $el: JQuery = this._getFileNameEl();
        const $save: JQuery = this._getTopBarEl().find(".save");
        $el.text(name);
        xcTooltip.add($el, {
            title: name
        });
        if (name == CommonTxtTstr.Untitled) {
            $el.addClass("untitled");
            $save.addClass("noOption");
        } else {
            $el.removeClass("untitled");
            $save.removeClass("noOption");
        }
        this._currentFile = name;
    }

    private _getFileName(): string {
        return this._currentFile;
    }

    private _fileOption(action: string): void {
        switch (action) {
            case "new":
                this._newSnippet();
                break;
            case "save":
                if (this._currentFile === CommonTxtTstr.Untitled) {
                    this._saveAsSnippet();
                } else {
                    this._saveSnippet(this._currentFile);
                }
                break;
            case "saveAs":
                this._saveAsSnippet();
                break;
            case "download":
                this._downlodSnippet();
                break;
            default:
                break;
        }
    }

    private _newSnippet(): void {
        const callback = () => {
            this._resetLastOpenedSnippet(CommonTxtTstr.Untitled, "");
            this.setSnippet(CommonTxtTstr.Untitled);
        };
        if (this._hasEditedQuery()) {
            Alert.show({
                title: SQLTStr.ComposeNew,
                msg: SQLTStr.ComposeNewMsg,
                buttons: [{
                    name: SQLTStr.NewQuery,
                    func: callback
                }]
            });
        } else {
            callback();
        }
    }

    private _saveSnippet(name: string): void {
        let snippet = this._sqlEditor.getValue();
        SQLSnippet.Instance.writeSnippet(name, snippet, true);
        this._resetLastOpenedSnippet(name, snippet);
        xcUIHelper.showSuccess(SuccessTStr.Saved);
    }

    private _saveAsSnippet(): void {
        let defaultName: string = this._currentFile;
        if (defaultName === CommonTxtTstr.Untitled) {
            defaultName = "New Query " + moment().format("YYYY-MM-DD hh:mm:ss");
        }
        SQLSnippetSaveModal.Instance.show(defaultName, (newName) => {
            this._saveSnippet(newName);
            this._setFileName(newName);
            SQLResultSpace.Instance.refresh();
        });
    }

    private _downlodSnippet(): void {
        const fileName: string = this._getFileName() + ".sql";
        const content = this._sqlEditor.getValue();
        xcHelper.downloadAsFile(fileName, content);
    }

    private _addEventListeners(): void {
        const $container = this._getEditorSpaceEl();
        $container.on("click", ".undock", () => {
            if (this._getDockableSection().hasClass("undocked")) {
                this._dock();
            } else {
                this._undock();
            }
        });

        this._setupHeader();
        this._setupTopBar();
    }

    private _toggleDraggable(isDraggable: boolean): void {
        const $section: JQuery = this._getDockableSection();
        let self = this;
        if (isDraggable) {
            $section.draggable({
                "handle": "header.draggable",
                "cursor": "-webkit-grabbing",
                "containment": "#sqlWorkSpacePanel",
                "disabled": false
            });
        } else {
            $section.draggable({disabled: true});
        }
    }

    private _setupHeader(): void {
        this._getEditorSpaceEl().find("header").on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<any>event.currentTarget);
        });
    }

    private _setupTopBar(): void {
        const $topBar = this._getTopBarEl();
        $topBar.on("click", ".execute", (event) => {
            $(event.currentTarget).blur();
            this._executeAction();
        });

        $topBar.on("click", ".saveAs", (event) => {
            $(event.currentTarget).blur();
            this._fileOption("saveAs");
        });

        $topBar.on("click", ".new", (event) => {
            $(event.currentTarget).blur();
            this._fileOption("new");
        });

        $topBar.on("click", ".showTables", (event) => {
            $(event.currentTarget).blur();
            SQLResultSpace.Instance.showTables(true);
        });

        $topBar.on("click", ".save span", (event) => {
            $(event.currentTarget).blur();
            this._fileOption("save");
        });

        let selector: string = `#${this._getEditorSpaceEl().attr("id")}`;
        new MenuHelper($topBar.find(".btn.save"), {
            onSelect: ($li) => {
                this._fileOption($li.data("action"));
            },
            onlyClickIcon: true,
            container: selector,
            bounds: selector
        }).setupListeners();

        new MenuHelper($topBar.find(".btn.more"), {
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

    private _undock(): void {
        this._isDocked = false;
        const $container = this._getEditorSpaceEl()
        this._getDockableSection()
                  .addClass("undocked")
                  .css({"left": -310, "top": -10, "width": "300px", "height": "500px"});
        $("#sqlWorkSpacePanel").find(".rightSection .bottomPart").addClass("undocked");
        const $icon = $container.find(".undock");
        xcTooltip.changeText($icon, SideBarTStr.PopBack);
        $icon.removeClass("xi_popout").addClass("xi_popin");
        this._toggleDraggable(true);
    }

    private _dock(): void {
        this._isDocked = true;
        const $container = this._getEditorSpaceEl();
        // reset to default
        this._getDockableSection()
                    .removeClass("undocked")
                    .css({"left": "", "top": "", "width": "", "height": ""});
        $("#sqlWorkSpacePanel").find(".rightSection .bottomPart")
                                .removeClass("undocked")
                                .css({"top": "", "height": ""});
        this.refresh();
        const $icon = $container.find(".undock");
        xcTooltip.changeText($icon, SideBarTStr.PopOut);
        $icon.removeClass("xi_popin").addClass("xi_popout");
        this._toggleDraggable(false);
    }

    // XXX TODO: remove it
    private _adjustResize() {
        return;
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

    private _setupResize(): void {
        let self = this;
        this._getEditorSpaceEl().resizable({
            handles: "w,e,se",
            minWidth: self._minWidth,
            minHeight: 300,
            stop: function () {
                self._sqlEditor.refresh();
            }
        });
    }


    private _hasEditedQuery(): boolean {
        const lastOpened = SQLSnippet.Instance.getLastOpenSnippet();
        return lastOpened && lastOpened.unsaved;
    }

    private _checkQueryChangeFromSaved(): boolean {
        const text: string = this._sqlEditor.getValue();
        const hasChange: boolean = (text !== SQLSnippet.Instance.getSnippet(this._currentFile));
        const $editMark = this._getEditorSpaceEl().find(".editMark");
        if (hasChange) {
            $editMark.removeClass("xc-hidden");
        } else {
            $editMark.addClass("xc-hidden");
        }
        return hasChange;
    }

    private _resetLastOpenedSnippet(name: string, text: string): void {
        SQLSnippet.Instance.setLastOpenedSnippet(name, text, false);
        this._checkQueryChangeFromSaved();
    }

    private _saveLastSnippetChange(): void {
        const hasChange: boolean = this._checkQueryChangeFromSaved();
        const fileName = this._getFileName();
        const text: string = this._sqlEditor.getValue();
        SQLSnippet.Instance.setLastOpenedSnippet(fileName, text, hasChange);
    }
}