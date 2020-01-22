class SQLWorkSpace {
    private static _instance: SQLWorkSpace;

    private _sqlEditorSpace: SQLEditorSpace;
    private _sqlResultSpace: SQLResultSpace;
    private _sqlHistorySpace: SQLHistorySpace;
    private _sqlMenu: SQLMenu;
    private _firstTouch: boolean;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._sqlEditorSpace = SQLEditorSpace.Instance;
        this._sqlResultSpace = SQLResultSpace.Instance;
        this._sqlHistorySpace = SQLHistorySpace.Instance;
        this._sqlMenu = new SQLMenu("sqlMenu");
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
        this._sqlMenu.render();
    }

   /**
    * SQLWorkSpace.Instance.refreshMenuList
    */
    public refreshMenuList(key: string): void {
        this._sqlMenu.render(key);
    }

    /**
     * SQLWorkSpace.Instance.focus
     */
    public focus(): void {
        // XXX the refresh is quite slow and seems not needed
        // so commented out. Uncomment it if it's actually necessary
        // this.refresh();
        DagViewManager.Instance.toggleSqlPreview(true);

        if (this._firstTouch) {
            this.refresh();
            SQLResultSpace.Instance.showTables(true);
            this._firstTouch = false;
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
        let $bottomPart: JQuery = $panel.find(".bottomPart");
        let $topPart: JQuery = $panel.find(".topPart");
        let rightSectionHeight: number;

        // resizable top/bottom result/history sections
        $bottomPart.resizable({
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
                    $bottomPart.outerHeight(rightSectionHeight - 100)
                             .css("top", 100);
                }
                $topPart.outerHeight(100 * (1 - pct) + "%");
            },
            stop: function (_event, ui) {
                let pct = ui.size.height / rightSectionHeight;
                if (ui.position.top <= 100) {
                    ui.position.top = 100;
                    pct = (rightSectionHeight - 100) / rightSectionHeight;
                }
                let pctTop = 1 - pct;
                $bottomPart.css("top", 100 * pctTop + "%")
                         .outerHeight(100 * pct + "%");
                $topPart.outerHeight(100 * pctTop + "%");
                $panel.removeClass("resizing");
            }
        });
    }
}