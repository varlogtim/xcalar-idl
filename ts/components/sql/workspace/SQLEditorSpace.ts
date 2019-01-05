class SQLEditorSpace {
    private static _instance: SQLEditorSpace;

    private _sqlEditor: SQLEditor;

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
    }
}