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
    }

    public refresh(): void {
        this._sqlEditor.refresh();
    }

    private _setupSQLEditor(): void {
        const self = this;
        const callbacks = {
            onExecute: () => {
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
}