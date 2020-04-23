class UserMenu {
    private static _instance: UserMenu;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * UserMenu.Instance.setup
     */
    public setup() {
        const $menu: JQuery = $("#userMenu");
        xcMenu.add($menu);
        $("#userName").text(XcUser.CurrentUser.getFullName());

        $("#userNameArea").click(function() {
            const $target: JQuery = $(this);
            MenuHelper.dropdownOpen($target, $menu, <DropdownOptions>{
                "offsetY": -1,
                "toggle": true
            });
        });

        $menu.on("mouseup", ".about", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            AboutModal.Instance.show();
        });

        $menu.on('mouseup', ".setup", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            Admin.showModal();
        });

        $menu.on('mouseup', ".preferences", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            UserSettings.show();
        });

        $("#logout").mouseup(function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            XcUser.CurrentUser.logout();
        });
    }
}
