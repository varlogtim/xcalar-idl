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
        this._addEventListeners();
    }

    public refresh(): void {
        this._sqlEditorSpace.refresh();
        this._sqlHistorySpace.refresh();
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

        // deslect nodes when clicking outside dataflow area or dataflow
        // related divs
        $("#container").on("mousedown.sqlPanelMouseDown", (event) => {
            const $target = $(event.target);
            if ($target.closest("#sqlWorkSpacePanel").length &&
                !$target.closest("#dagView").length &&
                !$target.closest("#dataflowMenu").length &&
                !$target.closest("#dagNodeMenu").length &&
                !$target.closest("#dagTableNodeMenu").length &&
                !$target.closest(".dagSchemaPopup").length &&
                !$target.closest("#dagTabView").length &&
                !$target.closest("#configNodeModal").length
            ) {
                DagViewManager.Instance.deselectNodes();
                DagNodeInfoPanel.Instance.hide();
            }
        });

        // $(window).off(".sqlPanelResize");
        // let resizeTimer;
        // $(window).on("resize.sqlPanelResize", () => {
        //     clearTimeout(resizeTimer);
        //     resizeTimer = setTimeout(() => {
        //         this._sqlEditorSpace.resize();
        //     }, 300);
        // });
    }

    public unfocus(): void {
        $(window).off(".sqlPanelResize");
        $("#container").off(".sqlPanelMouseDown");
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

     /**
     * SQLWorkSpace.Instance.tableFuncQuery
     * @param name
     */
    public async tableFuncQuery(name: string): Promise<void> {
        try {
            const numInput = await DagTabSQLFunc.getFuncInputNum(name);
            const inputSignature = new Array(numInput).fill(null)
            .map((_v, i) => `Input${i + 1}`).join(", ");
            const sql: string = `select * from ${name}(${inputSignature});`;
            SQLWorkSpace.Instance.newSQL(sql);
        } catch (e) {
            console.error(e);
            Alert.error(ErrTStr.Error, "Error occurred when compose query from table function.");
        }
    }

    private _getPanel(): JQuery {
        return $('#sqlWorkSpacePanel');
    }

    private _getBottomPart(): JQuery {
        return this._getPanel().find(".bottomPart");
    }

    private _resizeEvents(): void {
        this._resizeTopAndBottomPart();
        this._resizeTopPartSection();
        this._resizeDataflowAndResultSection();
    }

    private _resizeTopAndBottomPart(): void {
        let $panel: JQuery = this._getPanel();
        let $bottomPart: JQuery = this._getBottomPart();
        let $topPart: JQuery = $panel.find(".topPart");
        let bottomHeight: number;
        let topHeight: number;
        let totalHeight: number;
        let lastTop: number = 0;

        // resizable top/bottom result/history sections
        $bottomPart.resizable({
            handles: "n",
            start: function(_event, ui) {
                $panel.addClass("resizing");
                bottomHeight = $bottomPart.outerHeight();
                topHeight = $topPart.outerHeight();
                totalHeight = topHeight + bottomHeight;
                lastTop = ui.position.top;
            },
            resize: function(_event, ui) {
                const top: number = ui.position.top;
                const delta: number = top - lastTop;
                let pct = (bottomHeight - delta) / totalHeight;
                pct = Math.min(pct, 0.98);
                pct = Math.max(0.02, pct);
                $bottomPart.css("height", `${pct * 100}%`);
                $bottomPart.css("top", "0");
            },
            stop: function() {               
                $panel.removeClass("resizing");
                SQLEditorSpace.Instance.refresh();
                UDFPanel.Instance.getEditor().refresh();
            }
        });
    }

    private _resizeTopPartSection(): void {
        const $topPart: JQuery = this._getPanel().find(".topPart");
        const $sections = $topPart.find(".section");
        const $prevSection: JQuery = $sections.eq(0);
        const $resizableSection: JQuery = $sections.eq(1);
        let prevWidth: number;
        let resizableWidth: number;
        let totalWidth: number;
        let lastLeft: number = 0;

        // resizable top/bottom result/history sections
        $resizableSection.resizable({
            handles: "w",
            start: function(_event, ui) {
                prevWidth = $prevSection.outerHeight();
                resizableWidth = $resizableSection.outerHeight();
                totalWidth = prevWidth + resizableWidth;
                lastLeft = ui.position.left;
            },
            resize: function(_event, ui) {
                const left: number = ui.position.left;
                const delta: number = left - lastLeft;
                let pct = (resizableWidth - delta) / totalWidth;
                pct = Math.min(pct, 0.98);
                pct = Math.max(0.02, pct);
                $resizableSection.css("width", `${pct * 100}%`);
                $resizableSection.css("left", "0");
            }
        });
    }

    private _resizeDataflowAndResultSection(): void {
        const $bottomPart = $("#sqlWorkSpacePanel").find(".rightSection .bottomPart");
        const $bottomLeftPart = $bottomPart.find(".bottomLeftPart");
        const $bottomRightPart = $bottomPart.find(".bottomRightPart");
        let bottomPartWidth: number = null;

        $bottomRightPart.resizable({
            handles: "w",
            start: () => {
                bottomPartWidth = $bottomPart.outerWidth();
            },
            resize: (_event, ui) => {
                let pct = ui.size.width / bottomPartWidth;
                pct = Math.min(pct, 0.98);
                pct = Math.max(0.02, pct);
                let pctLeft = 1 - pct;
                $bottomRightPart.css("left", 100 * pctLeft + "%")
                        .outerWidth(100 * pct + "%");
                $bottomLeftPart.outerWidth(100 * pctLeft + "%");
            }
        });
    }

    private _addEventListeners(): void {
        const $tabViewSwitcher = $("#tabViewSwitcher");
        $tabViewSwitcher.find(".showSQL").click((event) => {
            const $button = $(event.currentTarget);
            const $bottomPart = this._getBottomPart();
            if ($button.hasClass("active")) {
                $button.removeClass("active");
                $bottomPart.addClass("noSQL");
            } else {
                $button.addClass("active");
                $bottomPart.removeClass("noSQL");
            }
        });

        $tabViewSwitcher.find(".showDataflow").click((event) => {
            const $button = $(event.currentTarget);
            const $bottomPart = this._getBottomPart();
            if ($button.hasClass("active")) {
                $button.removeClass("active");
                $bottomPart.addClass("noDataflow");
            } else {
                $button.addClass("active");
                $bottomPart.removeClass("noDataflow");
            }
        });
    }
}