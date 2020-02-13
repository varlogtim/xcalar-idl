namespace MainMenu {
    let $menuBar: JQuery; // $("#menuBar");
    // offset when a menu is closed (includes 5px padding in .mainContent)
    const openOffset: number = 290; // when the menu is open
    export const defaultWidth: number = 240;
    export const minWidth: number = 100;
    let _isFormOpen: boolean = false; // if export, join, map etc is open
    let ignoreRestoreState: boolean = false; // boolean flag - if closing of a form is
    // triggered by the clicking of a mainMenu tab, we do not want to restore
    // the pre-form state of the menu so we turn the flag on temporarily
    let hasSetUp: boolean = false;
    const formPanels: BaseOpPanel[] = [];
    let rightPanelMargin: number = defaultWidth;
    let $resizableRightPanels: JQuery;
    const minRightPanelWidth = 600;
    export let curSQLLeftWidth = defaultWidth;

    export let historyCursor: number = 0;
    export const tabToPanelMap = {
        dataStoresTab: "datastorePanel",
        sqlTab: "sqlPanel",
        modelingDataflowTab: "dagPanel",
        jupyterTab: "jupyterPanel",
        monitorTab: "monitorPanel",
        helpTab: "helpPanel"
    };

    export const tabToPanelTitleMap = {
        dataStoresTab: "Source & Load Data",
        sqlTab: "Workspace",
        modelingDataflowTab: "Business & Transformation Logic",
        jupyterTab: "Jupyter Notebook",
        monitorTab: "System",
        helpTab: "Help & Support: Tutorials"
    };

    export function setup() {
        if (hasSetUp) {
            return;
        }
        hasSetUp = true;
        $menuBar = $("#menuBar");
        setupTabbing();
        setupDataflowResizable();
        setupDatastoreResizable();
        MainMenu.switchMode();
        $resizableRightPanels = $("#workbookPanel, #monitorPanel, #datastorePanel, #modelingDagPanel")
                .find("> .mainContent > .rightSection");

        let winResizeTimer: number;
        $(window).on("resize.mainMenu", () => {
            clearTimeout(winResizeTimer);
            winResizeTimer = <any>setTimeout(sizeRightPanel, 100);
        });
    };

    export function registerPanels(panel): void {
        formPanels.push(panel);
    };

    export function switchMode(): boolean {
        const $sqlModeTabs: JQuery = $("#sqlTab");
        const $advModeTabs: JQuery = $("#modelingDataflowTab, #jupyterTab, #inButton");
        let allPanelsClosed: boolean = false;
        if (XVM.isDataMart()) {
            // hide dataset in data mart
            $("#inButton").addClass("xc-hidden");
        } else if (XVM.isSQLMode()) {
            $("#inButton").addClass("xc-hidden");
            $sqlModeTabs.removeClass("xc-hidden");
            $advModeTabs.addClass("xc-hidden");
            if ($advModeTabs.hasClass("active")) {
                $advModeTabs.removeClass("active");
                DagViewManager.Instance.hide(); // turn off listeners
                MainMenu.closeForms();
                closeMainPanels();
                allPanelsClosed = true;
            }
        } else {
            $("#inButton").removeClass("xc-hidden");
            $sqlModeTabs.addClass("xc-hidden");
            $advModeTabs.removeClass("xc-hidden");
            if ($sqlModeTabs.hasClass("active")) {
                $sqlModeTabs.removeClass("active");
                MainMenu.closeForms();
                closeMainPanels();
                allPanelsClosed = true;
            }
        }

        return allPanelsClosed;
    };

    export function openDefaultPanel(): void {

        if (XVM.isDataMart()) {
            const params: {panel?: string} = xcHelper.decodeFromUrl(window.location.href);
            if (params.panel) {
                let tabId: string = UrlToTab[params.panel];
                let subTabId: string = null;
                if (tabId === "fileManagerButton" || tabId === "settingsButton") { // handle sub tabs
                    subTabId = tabId;
                    tabId = "monitorTab";
                } else if (tabId === "workbook") {
                    WorkbookPanel.show(true, true);
                    return;
                }

                if (MainMenu.openPanel(MainMenu.tabToPanelMap[tabId], subTabId, true)) {
                    return;
                }
            }
        }
        MainMenu.openPanel("sqlPanel");
    };

    export function openPanel(panelId: string, subTabId?: string, ignoreHistory: boolean = false): boolean {
        let $tab: JQuery;
        switch (panelId) {
            case ("monitorPanel"):
                $tab = $("#monitorTab");
                break;
            case ("datastorePanel"):
                $tab = $("#dataStoresTab");
                break;
            case ("jupyterPanel"):
                $tab = $("#jupyterTab");
                break;
            case ("dagPanel"):
                $tab = $("#modelingDataflowTab");
                break;
            case ("sqlPanel"):
                $tab = $("#sqlWorkSpace");
                break;
            case ("helpPanel"):
                $tab = $("#helpTab");
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
                tabClickEvent($tab, $tab.closest(".topMenuBarTab"), subTabId, !ignoreHistory, true);
            }
            if ($subTab) {
                $subTab.trigger({...fakeEvent.click, subTabId: subTabId});
            }

            return true;
        } else {
            return false;
        }
    };

    function tabClickEvent($target: JQuery, $curTab: JQuery, subTabId?: string, addToHistory?: boolean, noToggle?: boolean) {
        const $tabs: JQuery = $menuBar.find(".topMenuBarTab");
        WorkbookPanel.hide(true, true);
        $menuBar.removeClass("animating");

        if ($curTab.hasClass("active")) {
            if ($target.closest(".subTab").length) {
                const $subTab = $target.closest(".subTab");
                $curTab.find(".subTab").removeClass("active");
                $subTab.addClass("active");

                if (addToHistory && subTabId) {
                    let tabName = TabToUrl[subTabId];
                    if (tabName) {
                        PanelHistory.Instance.push(tabName);
                    }
                }
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
                openMenu($curTab);
                checkUDFMenu($curTab);
            }

            panelSwitchingHandler($curTab, lastTabId);
            xcUIHelper.hideSuccessBox();

            if (addToHistory) {
                let tabId: string ;
                if (subTabId) {
                    tabId = subTabId;
                } else {
                    tabId = $curTab.attr("id");
                }
                let tabName = TabToUrl[tabId];
                PanelHistory.Instance.push(tabName);
            }
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
            tabClickEvent($target, $curTab, event["subTabId"], true);
        });
    }

    export function getOffset(): number {
        return openOffset;
    };

    export function getState(): {
        isPoppedOut: boolean,
        isBottomOpen: boolean,
        $activeBottomSection: JQuery,
        $activeDataflowMenu: JQuery
    } {
        const state = {
            isPoppedOut: BottomMenu.isPoppedOut(),
            isBottomOpen: BottomMenu.isMenuOpen(),
            $activeBottomSection: $("#bottomMenu").find(".menuSection.active"),
            $activeDataflowMenu: $("#dataflowMenu").find(".menuSection:not(.xc-hidden)")
        };
        return (state);
    };

    export function setFormOpen(): boolean {
        _isFormOpen = true;
        return _isFormOpen;
    };

    export function setFormClose(): boolean {
        _isFormOpen = false;
        return _isFormOpen;
    };

    // xx currently only supporting form views in the worksheet panel
    export function restoreState(prevState: {
        isPoppedOut: boolean,
        isBottomOpen: boolean,
        $activeBottomSection: JQuery,
        $activeDataflowMenu: JQuery
    }, ignoreClose?: boolean) {
        // ignoreRestoreState is temporarily set when mainMenu tab is clicked
        // and form is open
        // ignoreClose will be true if different menu tab has been clicked
        // and form is no longer visible
        if (!ignoreRestoreState && !ignoreClose) {
            if (prevState.isBottomOpen && !BottomMenu.isMenuOpen()) {
                BottomMenu.openSection(prevState.$activeBottomSection.index());
            }
        }

        if (prevState.$activeDataflowMenu.is("#dagNodeInfoPanel") &&
            !DagNodeInfoPanel.Instance.isOpen()) {
            $("#dagList").removeClass("xc-hidden");
        } else {
            prevState.$activeDataflowMenu.removeClass("xc-hidden");
        }
    };

    export function closeForms(): void {
        if (_isFormOpen) {
            ignoreRestoreState = true;
            formPanels.forEach((panel) => {
                if (panel["close"]) {
                    panel["close"]();
                }
            });
            ignoreRestoreState = false;
            DagConfigNodeModal.Instance.close();
        }
    };

    // ensures right panels are not too small
    export function sizeRightPanel() {
        let winWidth = $(window).width() - 60;
        if (BottomMenu.isMenuOpen() && !BottomMenu.isPoppedOut()) {
            winWidth -= defaultWidth;
        }
        let halfWinWidth = Math.floor(winWidth / 2);
        rightPanelMargin = $("#workbookPanel, #monitorPanel, #datastorePanel, #modelingDagPanel").find("> .mainContent > .leftSection").filter(":visible").outerWidth();
        if (rightPanelMargin > halfWinWidth || (winWidth - rightPanelMargin) < minRightPanelWidth) {
            rightPanelMargin = Math.min(halfWinWidth, winWidth - minRightPanelWidth);
            rightPanelMargin = Math.max(defaultWidth, rightPanelMargin);
            $resizableRightPanels.filter(":visible").css("margin-left", rightPanelMargin);
        } else {
            if (halfWinWidth > rightPanelMargin) {
                $resizableRightPanels.filter(":visible").css("margin-left", rightPanelMargin);
            }
        }
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

    export function toggleIMDPanel(show: boolean): void {
        let $icon = $("#datastoreMenu .iconSection .imd");
        $icon.add($("#imdTab"));
        if (show) {
            $("#dataStoresTab").removeClass("wkbkMenuBarTabs");
            $icon.removeClass("xc-hidden");
        } else {
            $("#dataStoresTab").addClass("wkbkMenuBarTabs");
            $icon.addClass("xc-hidden");
            // hide the imd panel
            if ($("#datastorePanel").hasClass("imd")) {
                $("#imdView").find(".tableView").click();
            }
        }
    }

    function setupDataflowResizable(): void {
        const $menu = $("#dataflowMenu");
        const onStop = (width) => { MainMenu.resize(width); };
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
        for (let i in tabToPanelMap) {
            $container.removeClass(tabToPanelMap[i] + "-active");
        }
        $("#mainTopBar .panelName").text(tabToPanelTitleMap[curTab] || "");

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
                if (noWorkbook) {
                    openIMDPanel();
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
            case ("jupyterTab"):
                $("#jupyterPanel").addClass("active");
                JupyterPanel.sendInit(); // used to validate session if first
                // time viewing a notebook
                break;
            case ("modelingDataflowTab"):
                $("#modelingDagPanel").addClass("active");
                break;
            case ("sqlTab"):
                $("#sqlWorkSpacePanel").addClass("active");
                SQLWorkSpace.Instance.focus();
                DagViewManager.Instance.show();
                break;
            case ("helpTab"):
                $("#helpPanel").addClass("active");
                break;
            default:
                $(".underConstruction").addClass("active");
                break;
        }

        $container.addClass(tabToPanelMap[curTab] + "-active");
        sizeRightPanel();
        StatusMessage.updateLocation(null, null);
        $(".tableDonePopupWrap").remove();
    }

    function openIMDPanel(): void {
        checkAnim();
        IMDPanel.redraw();
        $("#imdTab").click();
    }

    function openMenu($curTab: JQuery): boolean {
        // Don't open side menu when the UDF panel is opening the file manager,
        // Otherwise the UDF panel will be blocked by the side menu.
        if ($("#udfSection").hasClass("switching")) {
            return;
        }

        const id: string = $curTab.attr("id");
        if (id === "dataStoresTab" && $("#imdTab").hasClass("active")) {
            return;
        }
        if (id === "helpTab") {
            return;
        }

        checkAnim();

        if ($("#monitor-queries").hasClass("active")) {
            QueryManager.scrollToFocused();
        }
        if ($("#sqlWorkSpacePanel").hasClass("active")) {
            DagCategoryBar.Instance.showOrHideArrows();
        }
    }

    function checkUDFMenu($subTab: JQuery): void {
        let isUDFManager: boolean = $subTab.attr("id") === "fileManagerButton";
        if (isUDFManager) {
            BottomMenu.openUDFMenuWithMainMenu();
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
