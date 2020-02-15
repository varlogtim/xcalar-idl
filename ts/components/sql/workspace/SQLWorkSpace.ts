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
        TableTabManager.Instance.setup();
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
        PopupManager.checkAllContentUndocked();
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
                !$target.closest("#configNodeContainer").length
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
        this._resizeNodeConfigSection();
        this._resizeDataflowAndResultSection();
        this._resizeDebugPart();
    }

    private _resizeTopAndBottomPart(): void {
        let $panel: JQuery = this._getPanel();
        let $bottomPart: JQuery = this._getBottomPart();
        let $topPart: JQuery = $panel.find(".topPart");
        let bottomHeight: number;
        let siblingHeight: number;
        let totalHeight: number;
        let lastTop: number = 0;

        // resizable top/bottom result/history sections
        $bottomPart.resizable({
            handles: "n",
            start: function(_event, ui) {
                $panel.addClass("resizing");
                bottomHeight = $bottomPart.outerHeight();
                siblingHeight = $topPart[0].getBoundingClientRect().height;
                totalHeight = siblingHeight + bottomHeight;
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
                UDFPanel.Instance.refresh();
            }
        });
    }

    private _resizeTopPartSection(): void {
        const $topPart: JQuery = this._getPanel().find(".topPart");
        const $sections = $topPart.children(".topLeftPart").children(".section");
        const $prevSection: JQuery = $sections.eq(0);
        const $resizableSection: JQuery = $sections.eq(1);
        let prevWidth: number;
        let resizableWidth: number;
        let totalWidth: number;
        let lastLeft: number = 0;

        // resizable sql/udf area
        $resizableSection.resizable({
            handles: "w",
            start: function(_event, ui) {
                prevWidth = $prevSection.outerWidth();
                resizableWidth = $resizableSection.outerWidth();
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

    private _resizeNodeConfigSection(): void {
        const $topPart: JQuery = this._getPanel().find(".topPart");
        const $sections = $topPart.children(".section");
        const $prevSection: JQuery = $sections.eq(0);
        const $resizableSection: JQuery = $sections.eq(1);
        let prevWidth: number;
        let resizableWidth: number;
        let totalWidth: number;
        let lastLeft: number = 0;

        // resizable sql/udf area
        $resizableSection.resizable({
            handles: "w",
            start: function(_event, ui) {
                prevWidth = $prevSection.outerWidth();
                resizableWidth = $resizableSection.outerWidth();
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

    // handles vertical and horizontal resizing
    private _resizeDataflowAndResultSection(): void {
        const $bottomPart = $("#sqlWorkSpacePanel").find(".rightSection .bottomPart");
        const $bottomRightPart = $bottomPart.find(".bottomRightPart");
        const $bottomLeftPart = $bottomPart.find(".bottomLeftPart");
        let bottomPartWidth: number = null;
        let vertically: boolean = false;
        let bottomRightHeight: number;
        let bottomLeftHeight: number;
        let totalHeight: number;
        let lastTop: number = 0;
        let $panel: JQuery = this._getPanel();

        $bottomRightPart.resizable({
            handles: "n, w",
            start: (event, ui) => {
                $panel.addClass("resizing");
                vertically = $(event.originalEvent.target).hasClass("ui-resizable-n");
                bottomPartWidth = $bottomPart.outerWidth();

                bottomRightHeight = $bottomRightPart.outerHeight();
                bottomLeftHeight = $bottomLeftPart.outerHeight();
                totalHeight = bottomRightHeight + bottomLeftHeight;
                lastTop = ui.position.top;
            },
            resize: (_event, ui) => {
                if (vertically) {
                    const top: number = ui.position.top;
                    const delta: number = top - lastTop;
                    let pct = (bottomRightHeight - delta) / totalHeight;
                    pct = Math.min(pct, 0.98);
                    pct = Math.max(0.02, pct);
                    $bottomRightPart.css("height", `${pct * 100}%`);
                    $bottomRightPart.css("top", "0");
                } else {
                    let pct = ui.size.width / bottomPartWidth;
                    pct = Math.min(pct, 0.98);
                    pct = Math.max(0.02, pct);
                    $bottomRightPart.css("width", `${pct * 100}%`);
                    $bottomRightPart.css("left", "0");
                }
            },
            stop: () => {
                $panel.removeClass("resizing");
            }
        });
    }

    private _resizeDebugPart(): void {
        let $panel: JQuery = this._getPanel();
        let $bottomPart: JQuery = this._getBottomPart();
        let $topPart: JQuery = $panel.find(".topPart");
        let $debugPart: JQuery = $panel.find(".debugPart");
        let debugHeight: number;
        let siblingHeight: number;
        let totalHeight: number;
        let lastTop: number = 0;

        // resizable debug secton
        $debugPart.resizable({
            handles: "n",
            start: function(_event, ui) {
                $panel.addClass("resizing");
                debugHeight = $debugPart.outerHeight();
                const bottomHeight = $bottomPart[0].getBoundingClientRect().height
                siblingHeight = $topPart.outerHeight() + bottomHeight;
                totalHeight = siblingHeight + debugHeight;
                lastTop = ui.position.top;
            },
            resize: function(_event, ui) {
                const top: number = ui.position.top;
                const delta: number = top - lastTop;
                let pct = (debugHeight - delta) / totalHeight;
                pct = Math.min(pct, 0.98);
                pct = Math.max(0.02, pct);

                $debugPart.css("height", `${pct * 100}%`);
                $debugPart.css("top", "0");
            },
            stop: function() {
                $panel.removeClass("resizing");
                SQLEditorSpace.Instance.refresh();
                UDFPanel.Instance.refresh();
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