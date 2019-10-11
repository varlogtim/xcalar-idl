class DataflowInfoPanel {
    private static _instance: DataflowInfoPanel;
    private _$panel: JQuery;
    private _isShowing: boolean;
    private _activeNode: DagNode;


    public static get Instance() {
        return this._instance || (this._instance = new DataflowInfoPanel());
    }

    private constructor() {
        this._$panel = $("#dataflowInfoPanel");
        this._isShowing = false;
        this._addEventListeners();
    }

    public show(): boolean {
        $("#dataflowMenu").addClass("dagStats");


        this._isShowing = true;
        return true;
    }

    public hide(): boolean {
        if (!this._isShowing) {
            return false;
        }
        this._isShowing = false;
        this._activeNode = null;

        $("#dataflowMenu").removeClass("dagStats");

        return true;
    }

    public isOpen(): boolean {
        return this._isShowing;
    }

    public getActiveNode(): DagNode {
        if (!this._isShowing) {
            return null;
        }
        return this._activeNode;
    }

    public update(): boolean {
        let activeDag = DagViewManager.Instance.getActiveDag();
        let hasInfo = false;
        if (activeDag) {
            let tabId = activeDag.getTabId();
            let dagTab = DagTabManager.Instance.getTabById(tabId);
            if (dagTab && dagTab.getDataflowStats) {
                hasInfo = true;
                let stats = dagTab.getDataflowStats();
                stats.total_time_elapsed = xcTimeHelper.getElapsedTimeStr(stats.total_time_elapsed_millisecs);
                delete stats.total_time_elapsed_millisecs;
                stats.job_start_time = moment(stats.job_start_timestamp_microsecs / 1000).format("HH:mm:ss MM/DD/YYYY");
                stats.job_end_time = moment(stats.job_end_timestamp_microsecs / 1000).format("HH:mm:ss MM/DD/YYYY");
                delete stats.job_start_timestamp_microsecs;
                delete stats.job_end_timestamp_microsecs;
                delete stats.node_execution_times_sorted;
                delete stats.job_status;
                stats.job_state = stats.job_state.slice(2);
                stats.dataflow_name = dagTab.getName();
                let html = xcUIHelper.prettifyJson(stats);
                this._$panel.find(".overallSection").html(html);
                this._$panel.find(".dataflowName").text(dagTab.getName());
            }
        }
        if (!hasInfo) {
            this._$panel.find(".overallSection").empty();
        }

        return true;
    }

    private _addEventListeners(): void {
        const self = this;

    }

}
