class HelpMenu {
    private static _instance: HelpMenu;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * HelpMenu.Instance.setup
     */
    public setup() {
        const $menu: JQuery = this._getMenu();
        xcMenu.add($menu);

        $("#helpArea").click((event) =>  {
            const $target: JQuery = $(event.currentTarget);
            MenuHelper.dropdownOpen($target, $menu, <DropdownOptions>{
                "offsetY": -3,
                "toggle": true,
                "closeListener": true
            });
        });

        $menu.on("mouseup", ".help", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            HelpPanel.Instance.openHelpResource("docsResource");
        });

        $menu.on("mouseup", ".tutorials", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            HelpPanel.Instance.openHelpResource("tutorialResource");
        });

        $menu.on("mouseup", ".walkthroughs", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            HelpPanel.Instance.openHelpResource("tooltipResource");
        });

        $menu.on("mouseup", ".discourse", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            const win: Window = window.open('https://discourse.xcalar.com/', '_blank');
            if (win) {
                win.focus();
            } else {
                alert('Please allow popups for this website');
            }
        });

        $menu.on("mouseup", ".liveHelp", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            LiveHelpModal.Instance.show();
        });

        $menu.on("mouseup", ".supTicket", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            SupTicketModal.Instance.show();
        });
    }

    private _getMenu(): JQuery {
        return $("#helpAreaMenu");
    }
}
