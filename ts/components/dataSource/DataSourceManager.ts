/*
 * Manager Module for Data Source Section
 */
class DataSourceManager {
    private static _isMenOpen: boolean;

    /**
     * DataSourceManager.setup
     */
    public static setup(): void {
        DS.setup();
        this._setupViews();
        DSForm.setup();
        DSTable.setup();
        DSTargetManager.setup();
        this._setupMenus();
    }

    public static initialize(): void {
        // restore list view if saved and ellipsis the icon
        let preference: boolean = UserSettings.getPref('datasetListView');
        this._toggleViewDisplay(preference, true);
    }

    /**
     * DataSourceManager.truncateLabelName
     * @param $labels
     * @param isListView
     */
    public static truncateLabelName(
        $labels: JQuery,
        isListView?: boolean
    ): void {
        let $gridView = $("#datastoreMenu .gridItems").eq(0);
        if (isListView == null) {
            isListView = $gridView.hasClass("listView");
        }

        const maxChar = isListView ? 18 : 8;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = isListView ? '700 12px Open Sans' : '700 9px Open Sans';

        $labels.each(function() {
            const $label = $(this);
            const $grid = $label.closest(".grid-unit");
            const name = $label.data("dsname");
            const shared = $grid.hasClass("shared");
            const maxWidth = isListView ? Math.max(165, $label.width()) : 52;
            const multiLine = !isListView && !shared;

            xcHelper.middleEllipsis(name, $label, maxChar, maxWidth,
                                    multiLine, ctx);
            if (shared) {
                $label.html($label.text() +
                            (isListView ? "" : "<br/>") +
                            "<b>(" + $grid.data("user") + ")</b>");
            }
        });
    }

    private static _getPanel(): JQuery {
        return $("#datastorePanel");
    }

    private static _getMenu(): JQuery {
        return $("#datastoreMenu");
    }

    private static _getTitleEl(): JQuery {
        return this._getPanel().find(".topBar .title");
    }

    private static _setupViews(): void {
        // main menu
        $("#dataStoresTab").find(".subTab").click((event) => {
            let $button: JQuery = $(event.currentTarget);
            if ($button.hasClass("active")) {
                return;
            }
            let $panel: JQuery = this._getPanel();
            let $menu: JQuery = this._getMenu();
            let wasInDatasetScreen: boolean = $panel.hasClass("in");
            let wasInTableScreen: boolean = $panel.hasClass("table");
            $panel.removeClass("in")
                .removeClass("table")
                .removeClass("imd")
                .removeClass("target");
            $menu.removeClass("xc-hidden");
            $menu.find(".menuSection").addClass("xc-hidden");

            let isAdmin: boolean = this._readOnlyForNoAdmin();
            let id: string = $button.attr("id");

            switch (id) {
                case "targetButton":
                    this._switchToViewTarget(isAdmin);
                    break;
                case "inButton":
                    this._switchToViewDatasetSource(wasInTableScreen);
                    break;
                case "sourceTblButton":
                    this._switchToViewTableSource(wasInDatasetScreen);
                    break;
                case "imdTab":
                    this._switchToViewIMD();
                    break;
                default:
                    console.error("invalid view");
                    return;
            }
        });
    }

    private static _setupMenus(): void {
         // click to toggle list view and grid view
        const $switchViews: JQuery = $("#datastoreMenu .iconSection .switchView");
        $switchViews.click((event) => {
            let $btn: JQuery = $(event.currentTarget);
            let isListView: boolean;

            if ($btn.hasClass("gridView")) {
                isListView = true;
            } else {
                isListView = false;
            }

            this._toggleViewDisplay(isListView, false);
        });
    }

    // toggle between list view and grid view
    private static _toggleViewDisplay(
        isListView: boolean,
        noRefreshTooltip: boolean
    ): void {
        let $menu: JQuery = $("#datastoreMenu");
        let $btns: JQuery = $menu.find(".iconSection .switchView");
        let $allGrids = $menu.find(".gridItems");
        xcUIHelper.toggleListGridBtn($btns, isListView, noRefreshTooltip);

        if (isListView) {
            // show list view
            $allGrids.removeClass("gridView").addClass("listView");
        } else {
            $allGrids.removeClass("listView").addClass("gridView");
        }

        let $labels = $allGrids.find(".label:visible");
        DataSourceManager.truncateLabelName($labels, isListView);
    }

    // button switch styling handled in mainMenu.js
    private static _readOnlyForNoAdmin(): boolean {
        let isAdmin: boolean = Admin.isAdmin();
        let $panel = this._getPanel();
        let $menu = this._getMenu();
        if (!isAdmin) {
            $panel.addClass("noAdmin");
            $menu.addClass("noAdmin");
            xcTooltip.changeText($("#dsTarget-create"), DSTargetTStr.AdminOnly);
        } else {
            $panel.removeClass("noAdmin");
            $menu.removeClass("noAdmin");
            xcTooltip.changeText($("#dsTarget-create"), DSTargetTStr.Create);
        }
        return isAdmin;
    }

    private static _switchToViewDatasetSource(wasInTableScreen: boolean): void {
        let $panel = this._getPanel();
        let $menu = this._getMenu();
        let $title = this._getTitleEl();
        $panel.addClass("in");
        $title.text(DSTStr.IN);
        $menu.find(".in").removeClass("xc-hidden");

        DSTable.refresh();
        DS.resize();

        if (wasInTableScreen) {
            DSForm.show(false);
        }
    }

    private static _switchToViewTableSource(wasInDatasetScreen: boolean): void {
        let $panel = this._getPanel();
        let $menu = this._getMenu();
        let $title = this._getTitleEl();
        $panel.addClass("table");
        $("#sourceTblButton").removeClass("xc-hidden");
        $("#imdTab").addClass("xc-hidden");
        $title.text(CommonTxtTstr.Table);
        $menu.find(".table").removeClass("xc-hidden");
        TblSource.Instance.refresh(); // update every time switch to the tab
        if (this._isMenOpen) {
            MainMenu.open(true);
            this._isMenOpen = null;
        }

        if (wasInDatasetScreen) {
            DSForm.show(true);
        }
    }

    private static _switchToViewIMD(): void {
        this._isMenOpen = MainMenu.isMenuOpen();

        let $panel = this._getPanel();
        let $menu = this._getMenu();
        $panel.addClass("imd");
        $menu.addClass("xc-hidden");
        MainMenu.close(true);
        $("#sourceTblButton").addClass("xc-hidden");
        let $tab = $("#imdTab").removeClass("xc-hidden");
        if ($tab.hasClass("firstTouch")) {
            $tab.removeClass("firstTouch");
            IMDPanel.active(true);
        } else {
            IMDPanel.active(false);
        }
    }

    private static _switchToViewTarget(isAdmin: boolean): void {
        let $panel = this._getPanel();
        let $menu = this._getMenu();
        let $title = this._getTitleEl();

        $panel.addClass("target");
        $menu.find(".target").removeClass("xc-hidden");
        $title.text(DSTStr.TARGET);

        let $targetView: JQuery = $("#datastore-target-view");
        if ($targetView.hasClass("firstTouch")) {
            DSTargetManager.getTargetTypeList()
            .always(function() {
                if (!isAdmin) {
                    DSTargetManager.clickFirstGrid();
                }
            });
            $targetView.removeClass("firstTouch");
        }
    }
}
