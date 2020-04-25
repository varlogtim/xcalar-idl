class UserPref extends Durable {
    public datasetListView: boolean; // ds use list/grid view
    public browserListView: boolean; // browser use list/grid view
    public general: object; // holds general settings
    public dsSortKey: string; // ds grid view sort key
    public dfAutoExecute: boolean; // DF 2.0 settings
    public dfAutoPreview: boolean; // DF 2.0 settings
    public dfProgressTips: boolean; // DF 2.0 settings
    public dfConfigInfo: boolean; // DF 2.0 settings
    public dfTableName: boolean;// DF 2.0 settings
    public dfLabel: boolean;// DF 2.0 settings
    public dfPinOperatorBar: boolean;

    public constructor (options?: UserPrefDurable) {
        options = options || <UserPrefDurable>{};
        super(options.version);

        this.datasetListView = options.datasetListView || false;
        this.browserListView = options.browserListView || false;
        this.general = options.general || {}; // holds general settings that can
        // be set by user but if a setting is not set, will default to those in
        // GenSettings

        this.dsSortKey = options.dsSortKey;
        // dfAutoExecute and dfAutoPreview is true by default
        this.dfAutoExecute = (options.dfAutoExecute == null) ? true : options.dfAutoExecute;
        this.dfAutoPreview = (options.dfAutoPreview == null) ? true : options.dfAutoPreview;
        this.dfProgressTips = (options.dfProgressTips == null) ? true : options.dfProgressTips;
        this.dfConfigInfo = (options.dfConfigInfo == null) ? true : options.dfConfigInfo;
        this.dfTableName = (options.dfTableName == null) ? true : options.dfTableName;
        this.dfLabel = (options.dfLabel == null) ? true : options.dfLabel;
        this.dfPinOperatorBar = (options.dfPinOperatorBar == null) ? false : options.dfPinOperatorBar;
    }

    public update(): void {
        this.datasetListView = $("#dataViewBtn").hasClass("listView");
        this.browserListView = $("#fileBrowserGridView")
                                .hasClass("listView");
        this.dsSortKey = DS.getSortKey();
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