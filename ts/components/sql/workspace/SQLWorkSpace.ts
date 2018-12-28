class SQLWorkSpace {
    private static _instance: SQLWorkSpace;

    private _sqlEditorSpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._sqlEditorSpace = SQLEditorSpace.Instance;
    }

    public setup(): void {
        this._sqlEditorSpace.setup();
    }
}