class DagTopBar {
    private static _instance: DagTopBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $dagView: JQuery;
    private $topBar: JQuery;

    public setup(): void {
        this.$dagView = $("#dagView");
        this.$topBar = this.$dagView.find(".topBar");
        this._addEventListeners();
    }

    private _addEventListeners(): void {
        this.$topBar.find(".run").click(function() {
            const dagId = 0;
            DagView.run(dagId);
        });

        this.$topBar.find(".stop").click(function() {
            const dagId = 0;
            DagView.cancel(dagId);
        });

        this.$topBar.find(".undo").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            // XXX need to remove original undo buttons first
            // Log.undo();
        });

        this.$topBar.find(".redo").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            // Log.redo();
        });
    }
  
}