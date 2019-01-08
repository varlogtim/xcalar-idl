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
        this._setupBottomSection();
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
            var acTables = self._getAutoCompleteHint();
            CodeMirror.showHint(cmeditor, CodeMirror.hint.sql, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true,
                tables: acTables
            });
        }
    }

    // XXX TODO
    private _getAutoCompleteHint() {
        var arcTables = {"a": "b", "c": "d"};
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

    private _setupBottomSection(): void {
        const $section = this._getEditorSpaceEl().find(".bottomSection");
        $section.on("click", ".execute", () => {
            this._executeAllSQL();
        });
    }
}