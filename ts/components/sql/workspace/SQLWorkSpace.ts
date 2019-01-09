class SQLWorkSpace {
    private static _instance: SQLWorkSpace;

    private _sqlEditorSpace: SQLEditorSpace;
    private _sqlResultSpace: SQLResultSpace;
    private _sqlHistorySpace: SQLHistorySpace;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._sqlEditorSpace = SQLEditorSpace.Instance;
        this._sqlResultSpace = SQLResultSpace.Instance;
        this._sqlHistorySpace = SQLHistorySpace.Instance;
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

    public focus(): void {
        SQLWorkSpace.Instance.refresh();

        this._adjustResize();

        let resizeTimer;
        $(window).on("resize.sqlPanelResize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this._adjustResize();
            }, 300);
        });
    }

    public unfocus(): void {
        $(window).off(".sqlPanelResize");
    }

    private _resizeEvents() {
        let $panel: JQuery = $('#sqlWorkSpacePanel');
        let $mainContent: JQuery = $panel.children(".mainContent");
        let $leftSection: JQuery = $panel.find(".leftSection");
        let $rightSection: JQuery = $panel.find(".rightSection");
        let $histSection: JQuery = $panel.find(".historySection");
        let $resultSection: JQuery = $panel.find(".resultSection");
        let mainContentWidth: number;
        let rightSectionHeight: number;
        let leftSectionMin: number = 200;
        let rightSectionMin: number = 650;

        // resizable left and right sections
        $leftSection.resizable({
            handles: "e",
            containment: 'parent',
            minWidth: leftSectionMin,
            start: function () {
                $panel.addClass("resizing");
                mainContentWidth = $mainContent.width();
            },
            resize: function (_event, ui) {
                let width = ui.size.width;
                if (mainContentWidth - ui.size.width <= rightSectionMin) {
                    width = Math.max(leftSectionMin, mainContentWidth - rightSectionMin);
                    $leftSection.outerWidth(width);
                }
                $rightSection.width("calc(100% - " + width + "px)");
            },
            stop: function (_event, ui) {
                let width = ui.size.width;
                if (mainContentWidth - ui.size.width <= rightSectionMin) {
                    width = Math.max(leftSectionMin, mainContentWidth - rightSectionMin);
                    $leftSection.outerWidth(width);
                }
                $rightSection.width("calc(100% - " + width + "px)");
                $panel.removeClass("resizing");
            }
        });

        // resizable top/bottom result/history sections
        $histSection.resizable({
            handles: "n",
            containment: 'parent',
            minHeight: 36,
            start: function () {
                $panel.addClass("resizing");
                rightSectionHeight = $rightSection.height();
            },
            resize: function (_event, ui) {
                let pct = ui.size.height / rightSectionHeight;
                if (ui.position.top <= 100) {
                    pct = (rightSectionHeight - 100) / rightSectionHeight;
                    $histSection.height(rightSectionHeight - 100)
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
                let pctTop = ui.position.top / rightSectionHeight;
                $histSection.css("top", 100 * pctTop + "%")
                         .height(100 * pct + "%");
                $resultSection.outerHeight(100 * (1 - pct) + "%");
                $panel.removeClass("resizing");
            }
        });
    }

    // if window is shrunk, guarantees that leftSection shrinks so that
    // rightSection retains a minimum width
    private _adjustResize() {
        let $panel: JQuery = $('#sqlWorkSpacePanel');
        let $leftSection: JQuery = $panel.find(".leftSection");
        let $rightSection: JQuery = $panel.find(".rightSection");
        let $mainContent: JQuery = $panel.children(".mainContent");
        let leftSectionMin: number = 200;
        let rightSectionMin: number = 650;

        let mainContentWidth: number = $mainContent.width();
        let width = $leftSection.outerWidth();
        if (mainContentWidth - width <= rightSectionMin) {
            width = Math.max(leftSectionMin, mainContentWidth - rightSectionMin);
            $leftSection.outerWidth(width);
            $rightSection.width("calc(100% - " + width + "px)");
        }
    }
}