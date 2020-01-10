class SQLWorkSpace {
    private static _instance: SQLWorkSpace;

    private _sqlEditorSpace: SQLEditorSpace;
    private _sqlResultSpace: SQLResultSpace;
    private _sqlHistorySpace: SQLHistorySpace;
    private _firstTouch: boolean;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._sqlEditorSpace = SQLEditorSpace.Instance;
        this._sqlResultSpace = SQLResultSpace.Instance;
        this._sqlHistorySpace = SQLHistorySpace.Instance;
        this._firstTouch = true;
    }

    public setup(): void {
        this._sqlEditorSpace.setup();
        this._sqlResultSpace.setup();
        this._sqlHistorySpace.setup();
        this._resizeEvents();
    }

    public refresh(): void {
        this._sqlEditorSpace.refresh();
        this._sqlHistorySpace.refresh();
    }

    /**
     * SQLWorkSpace.Instance.focus
     */
    public focus(): void {
        this.refresh();
        DagViewManager.Instance.toggleSqlPreview(true);

        if (this._firstTouch) {
            SQLResultSpace.Instance.showTables(true);
            this._firstTouch = false;
        } else {
            SQLResultSpace.Instance.refresh();
        }
        TblFunc.moveFirstColumn();

        $(window).off(".sqlPanelResize");
        let resizeTimer;
        $(window).on("resize.sqlPanelResize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this._sqlEditorSpace.resize();
            }, 300);
        });
    }

    public unfocus(): void {
        $(window).off(".sqlPanelResize");
    }

    /**
     * SQLWorkSpace.Instance.newSQL
     * @param sql
     */
    public newSQL(sql: string): void {
        try {
            MainMenu.openPanel("sqlPanel");
            SQLEditorSpace.Instance.newSQL(sql);
        } catch (e) {
            console.error(e);
        }
    }

    private _resizeEvents() {
        let $panel: JQuery = $('#sqlWorkSpacePanel');
        let $rightSection: JQuery = $panel.find(".rightSection");
        let $histSection: JQuery = $panel.find(".historySection");
        let $resultSection: JQuery = $panel.find(".resultSection");
        let rightSectionHeight: number;

        // resizable top/bottom result/history sections
        $histSection.resizable({
            handles: "n",
            containment: 'parent',
            minHeight: 36,
            start: function () {
                $panel.addClass("resizing");
                rightSectionHeight = $rightSection.outerHeight();
            },
            resize: function (_event, ui) {
                let pct = ui.size.height / rightSectionHeight;
                if (ui.position.top <= 100) {
                    pct = (rightSectionHeight - 100) / rightSectionHeight;
                    $histSection.outerHeight(rightSectionHeight - 100)
                             .css("top", 100);
                }
                $resultSection.outerHeight(100 * (1 - pct) + "%");
            },
            stop: function (_event, ui) {
                let pct = ui.size.height / rightSectionHeight;
                if (ui.position.top <= 100) {
                    ui.position.top = 100;
                    pct = (rightSectionHeight - 100) / rightSectionHeight;
                }
                let pctTop = 1 - pct;
                $histSection.css("top", 100 * pctTop + "%")
                         .outerHeight(100 * pct + "%");
                $resultSection.outerHeight(100 * pctTop + "%");
                $panel.removeClass("resizing");
            }
        });
    }
}