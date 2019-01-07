class SQLWorkSpace {
    private static _instance: SQLWorkSpace;

    private _sqlEditorSpace: SQLEditorSpace;
    private _sqlResultSpace: SQLResultSpace;
    private _sqlHistorySpace: SQLHistorySpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._sqlEditorSpace = SQLEditorSpace.Instance;
        this._sqlResultSpace = SQLResultSpace.Instance;
        this._sqlHistorySpace = SQLHistorySpace.Instance;
    }

    public setup(): void {
        this._sqlEditorSpace.setup();
        this._sqlResultSpace.setup();
        this._sqlHistorySpace.setup();
    }

    public refresh(): void {
        this._sqlEditorSpace.refresh();
        this._sqlHistorySpace.refresh();
    }
}