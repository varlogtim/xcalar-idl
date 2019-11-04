class HelpPanel {
    private static _instance = null;

    public static get Instance(): HelpPanel {
        return this._instance || (this._instance = new this());
    }

    public setup(): void {
        this._setupResources();
    }

    public getHelpDocBaseURL(): string {
        if (XVM.isCloud()) {
            return "assets/help/Cloud/Content/";
        } else {
            return "assets/help/XD/Content/";
        }
    }

    /**
     * Opens the relevant help panel resource.
     * @param resource Resource desired
     */
    public openHelpResource(resource: string) {
        let $helpPanel = $("#helpPanel");
        $helpPanel.find(".active").removeClass("active");
        var $tutSearch = $("#tutorial-search").addClass("xc-hidden");
        switch (resource) {
            case ("tutorialResource"):
                if (!$helpPanel.hasClass("active")) {
                    MainMenu.openPanel("helpPanel");
                }
                $("#help-tutorial").addClass("active");
                $("#help-tutorial").removeClass("xc-hidden");
                $tutSearch.removeClass("xc-hidden");
                TutorialPanel.Instance.active();
                StatusMessage.updateLocation(true, "Viewing Tutorial Workbooks");
                break;
            case ("tooltipResource"):
                TooltipModal.Instance.show();
                break;
            case ("docsResource"):
                this._openHelpDocs();
                break;
            case ("discourseResource"):
                window.open("https://discourse.xcalar.com/");
                break;
            case ("ticketResource"):
                SupTicketModal.Instance.show();
                break;
            case ("chatResource"):
                LiveHelpModal.Instance.show();
                break;
            default:
                break;
        }

    }

    private _setupResources(): void {
        // main menu
        $('#helpSection').find('.helpResource').click((event) => {
            let $button = $(event.currentTarget);
            this.openHelpResource($button.attr("id"));
        });
    }

    private _openHelpDocs(): void {
        let url = this.getHelpDocBaseURL();
        if (XVM.isCloud()) {
            url += "Home_cloud.htm";
        } else {
            url += "Home.htm";
        }
        window.open(url);
    }
}
