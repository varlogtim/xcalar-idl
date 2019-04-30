class UserPref extends Durable {
    private datasetListView: boolean; // ds use list/grid view
    private browserListView: boolean; // browser use list/grid view
    private logCollapsed: boolean;
    public general: object; // holds general settings
    private dsSortKey: string; // ds grid view sort key
    private dfAutoExecute: boolean; // DF 2.0 settings
    private dfAutoPreview: boolean; // DF 2.0 settings
    private dfProgressTips: boolean; // DF 2.0 settings
    private dfConfigInfo: boolean; // DF 2.0 settings

    public constructor (options?: UserPrefDurable) {
        options = options || <UserPrefDurable>{};
        super(options.version);

        this.datasetListView = options.datasetListView || false;
        this.browserListView = options.browserListView || false;
        this.logCollapsed = options.logCollapsed || false;
        this.general = options.general || {}; // holds general settings that can
        // be set by user but if a setting is not set, will default to those in
        // GenSettings

        this.dsSortKey = options.dsSortKey;
        // dfAutoExecute and dfAutoPreview is true by default
        this.dfAutoExecute = (options.dfAutoExecute == null) ? true : options.dfAutoExecute;
        this.dfAutoPreview = (options.dfAutoPreview == null) ? true : options.dfAutoPreview;
        this.dfProgressTips = (options.dfProgressTips == null) ? true : options.dfProgressTips;
        this.dfConfigInfo = (options.dfConfigInfo == null) ? true : options.dfConfigInfo;
    }

    public update(): void {
        this.datasetListView = $("#dataViewBtn").hasClass("listView");
        this.browserListView = $("#fileBrowserGridView")
                                .hasClass("listView");
        this.dsSortKey = DS.getSortKey();
        this.logCollapsed = $("#log-TextArea").find(".expanded").length === 0 &&
                            $("#log-TextArea").find(".collapsed").length !== 0;
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used;
    protected _getDurable() {
        return null;
    }
}