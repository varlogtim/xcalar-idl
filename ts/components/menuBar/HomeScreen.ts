class HomeScreen {
    private static _lastPanel: string = null;


    public static setup(): void {
        this._addEventListeners();
        this._openDefaultScreen();
        if (XVM.isCloud()) {
            this._getHomeScreen().find(".contentSection .hint").text(TooltipTStr.AvailableInEnterprise);
        }
    }

    /**
     * HomeScreen.show
     */
    public static show(): void {
        this._lastPanel = PanelHistory.Instance.getCurrentPanel();
        this._switchScreen(UrlToTab.home);
    }

    /**
     * HomeScreen.switch
     * @param id
     */
    public static switch(id): void {
        return this._switchScreen(id);
    }

    /**
     * HomeScreen.hide
     */
    public static hide(): void {
        if (this._lastPanel) {
            this._switchScreen(this._lastPanel);
        }
    }

    private static _openDefaultScreen(): void {
        const params: {panel?: string} = xcHelper.decodeFromUrl(window.location.href);
        if (params.panel) {
            const panel: string = UrlToTab[params.panel];
            this._switchScreen(panel, false);
        } else {
            this._switchScreen(UrlToTab.home, false);
        }
    }

    private static _getHomeScreen(): JQuery {
        return $("#homeScreen");
    }

    private static _switchScreen(id: string, addHistory: boolean = true): void {
        const $homeScreen = this._getHomeScreen();
        const $notebookScreen = $("#sqlWorkSpacePanel");
        switch (id) {
            case UrlToTab.home:
                LoadScreen.hide();
                $notebookScreen.hide();
                $homeScreen.show();
                break;
            case UrlToTab.load:
                $homeScreen.hide();
                $notebookScreen.hide();
                LoadScreen.show();
                break;
            case UrlToTab.notebook:
                $homeScreen.hide();
                LoadScreen.hide();
                $notebookScreen.show();
                break;
            default:
                console.error("error case");
                return;
        }

        if (addHistory) {
            PanelHistory.Instance.push(TabToUrl[id]);

            if (typeof mixpanel !== "undefined") {
                xcMixpanel.switchScreen(id);
            }
        }
    }

    private static _addEventListeners(): void {
        const $homeScreen = this._getHomeScreen();
        $homeScreen.on("click", ".box", (e) => {
            const id = $(e.currentTarget).data("id");
            if (id === "connect" || id === "schedule") {
                let title = "Coming soon";
                let msg = "This feature will be available in the next release.";
                if (XVM.isCloud()) {
                    title = TooltipTStr.AvailableInEnterprise;
                    msg = "This feature is availabe in Xcalar Enterprise version";
                }
                Alert.show({
                    title,
                    msg,
                    isAlert: true
                });
                return;
            }

            this._switchScreen(id);
        });

        $("#homeBtn").click(() => {
            if (this._getHomeScreen().is(":visible")) {
                this.hide();
            } else {
                this.show();
            }
        });
    }
}