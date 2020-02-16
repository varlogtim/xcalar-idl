class PanelHistory {
    private _wasSetup: boolean = false;
    private static _instance: PanelHistory;
    private _cursor: number = 0;
    private _sessionID: number;
    private _preventNavigation: boolean = false;

    public static get Instance() {
        return this._instance || (this._instance = new PanelHistory());
    }
    constructor() {
        this._sessionID = Date.now();
    }

    public setup() {
        if (this._wasSetup) {
            return;
        }
        this._wasSetup = true;
        if (!XVM.isDataMart()) {
            return;
        }

        window.addEventListener('popstate', (event) => {
            this._popStateEvent(event);
        });
        if (!window.history.state) {
            window.history.pushState({
                panel: "projects",
                cursor: this._cursor,
                sessionID: this._sessionID
            }, "", window.location.href);
        } else if (window.history.state && window.history.state.sessionID) {
            window.history.replaceState({
                panel: window.history.state.panel,
                cursor: this._cursor,
                sessionID: this._sessionID
            }, "", window.location.href);
        }
    }

    public push(panel: string): void {
        if (!XVM.isDataMart()) {
            return;
        }
        if (window.history.state && window.history.state.panel === panel) {
            return;
        }
        let url = xcHelper.setURLParam("panel", panel);
        window.history.pushState({
            panel: panel,
            cursor: ++this._cursor,
            sessionID: this._sessionID
        }, "", url);
    }

    public deletePanelParam(): void {
        if (!XVM.isDataMart()) {
            return;
        }
        const newHref: string = xcHelper.deleteURLParam("panel");
        window.history.replaceState("", "", newHref);
    }

    public getCurrentPanel(): string {
        if (window.history.state) {
            return window.history.state.panel;
        }
        return null;
    }

    private _popStateEvent(event) {
        if (!event.state || !event.state.sessionID || (event.state.sessionID !== this._sessionID)) {
            if (!this._preventNavigation) {
                this._preventNavigation = true;
                window.history.forward();
            } else {
                this._preventNavigation = false;
            }
            return;
        }
        const oldCursor = this._cursor;
        let url;

        if (!event.state || !event.state.panel) {
            url = "projects";
            this._cursor = -1;
        } else {
            url = event.state.panel;
            this._cursor = event.state.cursor;
        }

        if (this._preventNavigation) {
            this._preventNavigation = false;
            return;
        }

        if (ModalHelper.isModalOn()) {
            // prevent user from navigating if modal is open
            this._handleHistoryChange(event, oldCursor);
            return;
        }

        let tabId: string = UrlToTab[url];
        let subTabId: string = null;
        if (tabId === "settingsButton") { // handle sub tabs
            subTabId = tabId;
            tabId = "monitorTab";
        } else if (tabId === "workbook") {
            WorkbookPanel.show(false, true);
            return;
        }
        const $container = $("#container");
        if (WorkbookPanel.isWBMode() || ($container.hasClass("noWorkbook") ||
            $container.hasClass("switchingWkbk"))) {
            if (tabId !== "monitorTab" && tabId !== "helpTab" &&
                ($container.hasClass("noWorkbook") ||
                    $container.hasClass("switchingWkbk"))) {
                this._handleHistoryChange(event, oldCursor);
                return;
            } else {
                $container.removeClass("monitorMode setupMode");
            }
        }
        MainMenu.openPanel(MainMenu.tabToPanelMap[tabId], subTabId, true);
    }

    private _handleHistoryChange(event, oldCursor: number) {
          // use _preventNavigation flag to prevent looping
          this._preventNavigation = true;
          if (event.state.cursor == null || event.state.cursor < 1 || oldCursor >= event.state.cursor) {
              this._cursor++;
              window.history.forward();
          } else {
              this._cursor--;
              window.history.back();
          }
    }
}