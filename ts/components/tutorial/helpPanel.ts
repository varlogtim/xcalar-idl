class HelpPanel {
    private static _instance = null;

    public static get Instance(): HelpPanel {
        return this._instance || (this._instance = new this());
    }

    public setup(): void {
        this._setupResources();
    };

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
                $("#help-documentation").addClass("xc-hidden");
                $tutSearch.removeClass("xc-hidden");
                TutorialPanel.Instance.active();
                StatusMessage.updateLocation(true, "Viewing Tutorial Workbooks");
                break;
            case ("tooltipResource"):
                TooltipModal.Instance.show();
                break;
            case ("docsResource"):
                if (!$helpPanel.hasClass("active")) {
                    MainMenu.openPanel("helpPanel");
                }
                $("#help-documentation").addClass("active");
                $("#help-documentation").removeClass("xc-hidden");
                $("#help-tutorial").addClass("xc-hidden");
                StatusMessage.updateLocation(true, "Viewing Documentation");
                break;
            case ("discourseResource"):
                window.open("https://discourse.xcalar.com/");
                break;
            case ("ticketResource"):
                SupTicketModal.show();
                break;
            case ("chatResource"):
                LiveHelpModal.show();
                break;
            default:
                break;
        }

    }

    private _setupResources() {
        const self = this;
        // main menu
        $('#helpSection').find('.helpResource').click(function(event) {
            var $button = $(this);
            self.openHelpResource($button.attr("id"));
        });    
    }
}
