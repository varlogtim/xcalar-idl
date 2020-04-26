namespace MainMenu {
    let $menuBar: JQuery; // $("#menuBar");
    // offset when a menu is closed (includes 5px padding in .mainContent)
    const openOffset: number = 200; // when the menu is open
    export const defaultWidth: number = 200;
    export const minWidth: number = 100;
    let hasSetUp: boolean = false;
    const formPanels: BaseOpPanel[] = [];
    const minRightPanelWidth = 600;
    export let curSQLLeftWidth = defaultWidth;
    let _popup:  PopupPanel;

    /**
     * MainMenu.setup
     */
    export function setup(openNotebookPanel: boolean) {
        if (hasSetUp) {
            return;
        }
        hasSetUp = true;
        $menuBar = $("#menuBar");
        addEventListeners();
        setupDataflowResizable();

        let winResizeTimer: number;
        $(window).on("resize.mainMenu", () => {
            clearTimeout(winResizeTimer);
            winResizeTimer = <any>setTimeout(sizeRightPanel, 100);
        });

        if (openNotebookPanel) {
            openPanel();
        }
    }

    /**
     * MainMenu.registerPanels
     * @param panel
     */
    export function registerPanels(panel): void {
        formPanels.push(panel);
    }

    function openPanel(): void {
        let $tab: JQuery = $("#sqlTab");
        if (!$tab.hasClass("active") || WorkbookPanel.isWBMode()) {
            WorkbookPanel.hide(true);
            panelSwitchingHandler($tab);
            xcUIHelper.hideSuccessBox();
        }
    }

    function showResourcePanel() {
        const $tab = $("#sqlTab");
        $tab.addClass("showing");
        $("#sqlWorkSpacePanel").removeClass("hidingLeftPanel");
        TblFunc.moveFirstColumn();
        DagCategoryBar.Instance.showOrHideArrows();
        SQLEditorSpace.Instance.refresh();
    }

    function toggleResourcePanel() {
        const $tab = $("#sqlTab");
        if ($tab.hasClass("showing")) {
            $tab.removeClass("showing");
            $("#sqlWorkSpacePanel").addClass("hidingLeftPanel");
        } else {
            showResourcePanel();
        }
        TblFunc.moveFirstColumn();
        DagCategoryBar.Instance.showOrHideArrows();
        SQLEditorSpace.Instance.refresh();
    }

    function addEventListeners(): void {
        $("#sqlTab").click(() => {
            toggleResourcePanel();
        });

        $("#udfTab").click(() => {
            UDFPanel.Instance.toggleDisplay();
        });

        $("#debugTab").click(() => {
            DebugPanel.Instance.toggleDisplay();
        });
    }

    /**
     * MainMenu.getOffset
     */
    export function getOffset(): number {
        return openOffset;
    }

    // ensures right panels are not too small
    function sizeRightPanel() {
        if ($("#sqlWorkSpacePanel").hasClass("active")) {
            TblFunc.moveFirstColumn();
            DagCategoryBar.Instance.showOrHideArrows();
        }
    }

    // XXX for dagpanel only, move this function
    /**
     * MainMenu.resize
     * @param width
     */
    export function resize(width: number): void {
        _resize($("#dataflowMenu"), width);
        curSQLLeftWidth = Math.min(width, minWidth);

        // let codemirror know it's area was resized
        formPanels.forEach(function(panel) {
            if (panel.isOpen()) {
                if (panel.getEditor && panel.getEditor()) {
                    panel.getEditor().refresh();
                }
                if (panel["getSQLEditor"] && panel["getSQLEditor"]()) {
                    panel["getSQLEditor"]().refresh();
                }
                if (panel.panelResize) {
                    panel.panelResize();
                }
            }
        });
    }

    /**
     * MainMenu.setupPopup
     */
    export function setupPopup(): void {
        _popup = new PopupPanel("dataflowMenu", {
            noUndock: true
        });
        _popup
        .on("ResizeDocked", (state) => {
            let width = Math.min(state.dockedWidth, $(window).width() - 20);
            MainMenu.resize(width);
        });
    }

    function setupDataflowResizable(): void {
        const $menu = $("#dataflowMenu");
        const onStop = (width) => {
            MainMenu.resize(width);
            width = $menu[0].getBoundingClientRect().width;
            _popup.trigger("ResizeDocked_BroadCast", {
                dockedWidth: width,
            });
        };
        _setupResizable($menu, minWidth, undefined, onStop);
    }

    function _setupResizable(
        $menu: JQuery,
        minWidth: number,
        onResize?: () => void,
        onStop?: (width) => void
    ): void {
        // const minWidth: number = defaultWidth + 3;
        let isSmall: boolean = true;
        let $ghost: JQuery;
        $menu.resizable({
            "handles": "e",
            "minWidth": minWidth,
            "distance": 2,
            "helper": "mainMenuGhost",
            "start": () => {
                let winWidth =  $(window).width();
                let panelRight: number = $menu[0].getBoundingClientRect().right;

                panelRight = winWidth - panelRight + $menu.width();
                $menu.css("max-width", panelRight - 10);
                $menu.addClass("resizing");
                $ghost = $(".mainMenuGhost");
                $ghost.css("max-width", panelRight - 10);
                $("#container").addClass("noMenuAnim");
            },
            "resize": (_event, ui) => {
                let width = ui.size.width;
                if (!isSmall && width < (defaultWidth + 3)) {
                    $menu.removeClass("expanded");
                    isSmall = true;
                } else if (isSmall && width >= (defaultWidth + 3)) {
                    $menu.addClass("expanded");
                    isSmall = false;
                }
                if (typeof onResize === "function") {
                    onResize();
                }
            },
            "stop": () => {
                $menu.css("max-width", "").css("max-height", "");
                let width: number = $menu.width();
                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);
                if (typeof onStop === "function") {
                    onStop(width);
                } else {
                    _resize($menu, width);
                }
            }
        });
    }

    function _resize($menu: JQuery, width: number): void {
        width = Math.max(width, minWidth);
        $("#container").addClass("noMenuAnim");
        const $mainContent = $menu.closest(".mainPanel").find("> .mainContent");
        const mainContentWidth = $mainContent.outerWidth();

        // if left panel width exceeds 50% of mainContentWidth, right panel width should be the greatest of (fullWidth - 50%) or minRightWidth;
        // if left panel is below 50%, right panel width should be fullWidth - leftPanel width
        // left margin is fullWidth - rightPanelWidth, but can never be smaller than minWidth
        let rightPanelWidth;
        if ((width > (mainContentWidth / 2)) || ((mainContentWidth - width) < minRightPanelWidth)) {
            rightPanelWidth = Math.max(mainContentWidth / 2, minRightPanelWidth);
        } else {
            rightPanelWidth = mainContentWidth - width;
        }
        let rightPanelMargin = Math.max(mainContentWidth - rightPanelWidth, minWidth);

        $menu.outerWidth(width);

        $menu.removeClass("resizing");
        const newWidth: number = $menu.outerWidth();
        if (newWidth < minWidth) {
            $menu.outerWidth(defaultWidth);
            $menu.removeClass("expanded");
        } else {
            $menu.addClass("expanded");
        }

        $mainContent.children(".rightSection").css("margin-left", rightPanelMargin);
        let widthCSS: string = $menu.css("width");
        $menu.attr("style", ""); // remove styling added by ghost
        $menu.css("width", widthCSS);
        TblFunc.moveFirstColumn();
        setTimeout(() => {
            $("#container").removeClass("noMenuAnim");
            // remove animation for a split second so there's no anim
        }, 0);
    }

    function closeMainPanels(): void {
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $(".mainPanel").removeClass("active");
    }

    function panelSwitchingHandler($curTab: JQuery): void {
        SQLWorkSpace.Instance.unfocus();
        DagViewManager.Instance.hide();

        closeMainPanels();
        const $container = $("#container");
        $container.removeClass("monitorViewOpen");
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $curTab.addClass("active");

        $("#sqlWorkSpacePanel").addClass("active");
        SQLWorkSpace.Instance.focus();
        DagViewManager.Instance.show();

        sizeRightPanel();
        StatusMessage.updateLocation(null, null);
        $(".tableDonePopupWrap").remove();
    }
}
