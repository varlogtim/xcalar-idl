class SQLDataflowPreview {
    private static _instance: SQLDataflowPreview;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

    }

    public show() {
        $("#sqlDataflowArea").removeClass("xc-hidden");
    }

    public close() {
        $("#sqlDataflowArea").addClass("xc-hidden");
    }
}