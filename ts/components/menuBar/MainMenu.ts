namespace MainMenu {
    let $menuBar: JQuery; // $("#menuBar");
    // offset when a menu is closed (includes 5px padding in .mainContent)
    const openOffset: number = 200; // when the menu is open
    export const defaultWidth: number = 200;
    export const minWidth: number = 100;
    let hasSetUp: boolean = false;
    const formPanels: BaseOpPanel[] = [];
    let $resizableRightPanels: JQuery;
    const minRightPanelWidth = 600;
    export let curSQLLeftWidth = defaultWidth;
    let _popup:  PopupPanel;

    export function setup() {
        if (hasSetUp) {
            return;
        }
        hasSetUp = true;
        $menuBar = $("#menuBar");
        setupTabbing();
        setupDataflowResizable();
        setupDatastoreResizable();
        $resizableRightPanels = $("#workbookPanel, #monitorPanel, #datastorePanel")
                .find("> .mainContent > .rightSection");

        let winResizeTimer: number;
        $(window).on("resize.mainMenu", () => {
            clearTimeout(winResizeTimer);
            winResizeTimer = <any>setTimeout(sizeRightPanel, 100);
        });
    };

    export function registerPanels(panel): void {
        formPanels.push(panel);
    }

    export function openDefaultPanel(): void {
        MainMenu.openPanel("sqlPanel");
    }

    export function openPanel(panelId: string, subTabId?: string): boolean {
        let $tab: JQuery;
        switch (panelId) {
            case ("monitorPanel"):
                $tab = $("#monitorTab");
                break;
            case ("datastorePanel"):
                $tab = $("#dataStoresTab");
                break;
            case ("sqlPanel"):
                $tab = $("#sqlWorkSpace");
                break;
            default:
                break;
        }
        if ($tab) {
            let $subTab: JQuery;
            if (subTabId && $tab.find("#" + subTabId).length) {
                $subTab = $tab.find("#" + subTabId);
                if ($subTab.hasClass("active")) {
                    $subTab = null;
                }
            } else {
                subTabId = null;
            }
            if (!$tab.hasClass("active") || WorkbookPanel.isWBMode()) {
                tabClickEvent($tab, $tab.closest(".topMenuBarTab"), true);
            }
            if ($subTab) {
                $subTab.trigger({...fakeEvent.click, subTabId: subTabId});
            }

            return true;
        } else {
            return false;
        }
    };

    function tabClickEvent($target: JQuery, $curTab: JQuery, noToggle?: boolean) {
        const $tabs: JQuery = $menuBar.find(".topMenuBarTab");
        WorkbookPanel.hide(true);
        $menuBar.removeClass("animating");

        if ($curTab.hasClass("active")) {
            if ($target.closest(".subTab").length) {
                const $subTab = $target.closest(".subTab");
                $curTab.find(".subTab").removeClass("active");
                $subTab.addClass("active");
            } else if (!noToggle && $curTab.attr("id") === "sqlTab") {
                toggleResourcePanel();
            }
        } else { // this tab was inactive, will make active
            const $lastActiveTab: JQuery = $tabs.filter(".active");
            const lastTabId: string = $lastActiveTab.attr("id");
            $lastActiveTab.addClass("noTransition")
                          .find(".icon")
                          .addClass("noTransition");
            // we dont want transition when active tab goes to inactive
            setTimeout(function() {
                $tabs.removeClass("noTransition")
                     .find(".icon")
                     .removeClass("noTransition");
            }, 100);

            const $subTab: JQuery = $curTab.find(".subTab.active");
            if (!$curTab.hasClass("noLeftPanel") &&
                !$subTab.hasClass("noLeftPanel")) {
                openMenu();
            }

            panelSwitchingHandler($curTab, lastTabId);
            xcUIHelper.hideSuccessBox();
        }
    }

    // not used
    export function showResourcePanel() {
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
            MainMenu.showResourcePanel();
        }
        TblFunc.moveFirstColumn();
        DagCategoryBar.Instance.showOrHideArrows();
        SQLEditorSpace.Instance.refresh();
    }

    function setupTabbing(): void {
        const $tabs: JQuery = $menuBar.find(".topMenuBarTab");

        $tabs.click(function(event) {
            const $target: JQuery = $(event.target);
            const $curTab: JQuery = $(this);
            const id: string = $curTab.attr("id");
            if (id === "projectTab" ||
                id === "udfTab" ||
                id === "debugTab"
            ) {
                // XXX a temp solution
                return;
            }
            tabClickEvent($target, $curTab);
        });

        $("#udfTab").click(() => {
            UDFPanel.Instance.toggleDisplay();
        });

        $("#debugTab").click(() => {
            DebugPanel.Instance.toggleDisplay();
        });
    }

    export function getOffset(): number {
        return openOffset;
    };

    // ensures right panels are not too small
    export function sizeRightPanel() {
        // XXX has bugs in load wizard and may not be needed after new design
        // of sql panel
        // let winWidth = $(window).width() - 60;
        // if (BottomMenu.isMenuOpen()) {
        //     winWidth -= defaultWidth;
        // }
        // let halfWinWidth = Math.floor(winWidth / 2);
        // rightPanelMargin = $("#workbookPanel, #monitorPanel, #datastorePanel").find("> .mainContent > .leftSection").filter(":visible").outerWidth();
        // if (rightPanelMargin > halfWinWidth || (winWidth - rightPanelMargin) < minRightPanelWidth) {
        //     rightPanelMargin = Math.min(halfWinWidth, winWidth - minRightPanelWidth);
        //     rightPanelMargin = Math.max(defaultWidth, rightPanelMargin);
        //     $resizableRightPanels.filter(":visible").css("margin-left", rightPanelMargin);
        // } else {
        //     if (halfWinWidth > rightPanelMargin) {
        //         $resizableRightPanels.filter(":visible").css("margin-left", rightPanelMargin);
        //     }
        // }
        if ($("#sqlWorkSpacePanel").hasClass("active")) {
            TblFunc.moveFirstColumn();
            DagCategoryBar.Instance.showOrHideArrows();
        }
    }
    // XXX for dagpanel only, move this function
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

    function setupDatastoreResizable(): void {
        const $menu = $("#datastoreMenu");
        const onResize = () => { DS.resize(); };
        _setupResizable($menu, defaultWidth, onResize, null);
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
            // "minWidth": defaultWidth,
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

    function panelSwitchingHandler($curTab: JQuery, lastTabId: string): void {
        if (lastTabId === "monitorTab") {
            MonitorPanel.inActive();
        } else if (lastTabId === "sqlTab") {
            SQLWorkSpace.Instance.unfocus();
            DagViewManager.Instance.hide();
        }
        closeMainPanels();
        const $container = $("#container");
        $container.removeClass("monitorViewOpen");
        const curTab: string = $curTab.attr("id");
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $curTab.addClass("active");

        switch (curTab) {
            case ("dataStoresTab"):
                let noWorkbook: boolean = $container.hasClass("noWorkbook");
                $("#datastorePanel").addClass("active");
                DSTable.refresh();
                if ($curTab.hasClass("firstTouch")) {
                    $curTab.removeClass("firstTouch");
                    DataSourceManager.initialize();
                    DSForm.initialize();
                    if (DataSourceManager.isCreateTableMode() && !noWorkbook) {
                        $("#sourceTblButton").click(); // switch to source panel
                    }
                }
                if ($curTab.find(".subTab.active").length === 0 && !noWorkbook) {
                    if (DataSourceManager.isCreateTableMode()) {
                        $("#sourceTblButton").click(); // switch to source panel
                    } else {
                        $("#inButton").click();
                    }
                } else if ($("#sourceTblButton").hasClass("active")) {
                    // when used to focus on table source
                    TblSource.Instance.refresh();
                }
                DS.resize();
                break;
            case ("monitorTab"):
                $("#monitorPanel").addClass("active");
                $("#container").addClass("monitorViewOpen");
                MonitorPanel.active();
                if ($curTab.hasClass("firstTouch")) {
                    $curTab.removeClass("firstTouch");
                }
                break;
            case ("sqlTab"):
                $("#sqlWorkSpacePanel").addClass("active");
                SQLWorkSpace.Instance.focus();
                DagViewManager.Instance.show();
                break;
            default:
                $(".underConstruction").addClass("active");
                break;
        }

        sizeRightPanel();
        StatusMessage.updateLocation(null, null);
        $(".tableDonePopupWrap").remove();
    }

    function openMenu(): void {
        // Don't open side menu when the UDF panel is opening the file manager,
        // Otherwise the UDF panel will be blocked by the side menu.
        checkAnim();

        if ($("#sqlWorkSpacePanel").hasClass("active")) {
            DagCategoryBar.Instance.showOrHideArrows();
        }
    }

    // turns off animation during open or close
    function checkAnim(): void {
        $("#container").addClass("noMenuAnim");
        // noAnim classes only need to take effect for a split second
        // to get rid of transition animations
        setTimeout(function() {
            $("#container").removeClass("noMenuAnim");
        }, 0);
    }
}
