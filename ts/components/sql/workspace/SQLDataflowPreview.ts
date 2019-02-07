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
        const $dfArea = $("#sqlDataflowArea").find(".dataflowArea");
        if ($dfArea.length) {
            DagViewManager.Instance.cleanupClosedTab(null, $dfArea.data("id"));
        }
        $("#sqlDataflowArea").addClass("xc-hidden");
    }
}