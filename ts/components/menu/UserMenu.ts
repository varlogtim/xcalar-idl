class UserMenu {
    private static _instance: UserMenu;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public setup() {
        const $menu: JQuery = $("#userMenu");
        xcMenu.add($menu);
        $("#userName").text(XcUser.CurrentUser.getFullName());

        $("#userNameArea").click(function() {
            const $target: JQuery = $(this);
            if (XVM.isCloud()) {
                $menu.find(".credits").show();
            } else {
                $menu.find(".credits").hide();
            }
            MenuHelper.dropdownOpen($target, $menu, <DropdownOptions>{
                "offsetY": -3,
                "toggle": true,
                "closeListener": true
            });
            XcUser.creditUsageCheck();
        });

        $menu.on("mouseup", ".credits", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            Alert.show({
                "title": "Add Credits",
                "msg": "Call Customer Service to add more credits.",
                "compact": true,
                // "isAlert": true
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
            MainMenu.openPanel("monitorPanel", "setupButton");
            MainMenu.open(true);
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

        $("#logout").mouseup(function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            if (XVM.isCloud()) {
                LogoutModal.Instance.show();
            } else {
                XcUser.CurrentUser.logout();
            }
        });
    }

    public updateCredits(num: number) {
        if (num == null) {
            let credits = "Credits: N/A";
            let $li: JQuery = $("#userMenu").find(".credits");
            $li.find(".num").text(credits);
            $li.removeClass("warning");
            return;
        }
        num = Math.round(num);
        const credits: string = xcStringHelper.numToStr(num) + " Credits";
        let needsWarning: boolean = (num < XcUser.creditWarningLimit);

        let $li: JQuery = $("#userMenu").find(".credits");
        $li.find(".num").text(credits);
        if (needsWarning) {
            if (!$li.hasClass("warning")) {
                // only show message if $li didn't previously have warning class
                MessageModal.Instance.show({
                    title: "You are running low on credits...",
                    msg: AlertTStr.LowOnCredits,
                    sizeToText: true,
                    size: "medium",
                    compact: true
                });
            }
            $li.addClass("warning");
        } else {
            $li.removeClass("warning");
        }
    }
}
