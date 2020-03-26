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
                "offsetY": -1,
                "toggle": true
            });
        });

        // $menu.on("mouseup", ".discourse", function(event: JQueryEventObject): void {
        //     if (event.which !== 1) {
        //         return;
        //     }
        //     const win: Window = window.open('https://discourse.xcalar.com/', '_blank');
        //     if (win) {
        //         win.focus();
        //     } else {
        //         alert('Please allow popups for this website');
        //     }
        // });

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
