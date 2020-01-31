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
                !$target.closest("#dagTabView").length
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
        let $panel: JQuery = this._getPanel();
        let $rightSection: JQuery = $panel.find(".rightSection");
        let $bottomPart: JQuery = this._getBottomPart();
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
                SQLEditorSpace.Instance.refresh();
            }
        });

        const $bottomLeftPart = $bottomPart.find(".bottomLeftPart");
        const $bottomRightPart = $bottomPart.find(".bottomRightPart");
        let bottomPartWidth: number = null;
        let maxWidth;

        $bottomRightPart.resizable({
            handles: "w",
            containment: 'parent',
            minWidth: 36,
            start: function () {
                bottomPartWidth = $bottomPart.outerWidth();
                maxWidth = bottomPartWidth - SQLEditorSpace.minWidth;
            },
            resize: function (_event, ui) {
                let width = Math.min(ui.size.width, maxWidth);
                let pct = width / bottomPartWidth;

                if (pct > 0.98) {
                    pct = 0.98;
                    $bottomRightPart.css("left", "2%");
                } else {
                    $bottomRightPart.css("left", bottomPartWidth - width)
                         .css("width", width);
                }

                $bottomLeftPart.outerWidth(100 * (1 - pct) + "%");
            },
            stop: function (_event, ui) {
                let width = Math.min(ui.size.width, maxWidth);
                let pct = Math.min(width / bottomPartWidth, 0.98);
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