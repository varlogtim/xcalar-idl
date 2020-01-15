describe("HelpMenu Test", function() {
    var $menu;

    before(function() {
        $menu = $("#helpAreaMenu");
    });

    // it("should mouseup .help to open help tab", function() {
    //     var oldHelpPanelOpen = HelpPanel.Instance.openHelpResource;
    //     var called = false;

    //     HelpPanel.Instance.openHelpResource = function(resource) {
    //         if (resource == "docsResource") {
    //             called = true;
    //         }
    //         return;
    //     }
    //     // normal mouseup not work
    //     $menu.find(".help").mouseup();
    //     expect(called).to.be.false;
    //     $menu.find(".help").trigger(fakeEvent.mouseup);
    //     expect(called).to.be.true;

    //     HelpPanel.Instance.openHelpResource = oldHelpPanelOpen;
    // });

    it("should mouseup .tutorials to open tutorial workbook screen", function() {
        var oldHelpPanelOpen = HelpPanel.Instance.openHelpResource;
        var called = false;

        HelpPanel.Instance.openHelpResource = function(resource) {
            if (resource == "tutorialResource") {
                called = true;
            }
            return;
        }
        // normal mouseup not work
        $menu.find(".tutorials").mouseup();
        expect(called).to.be.false;
        $menu.find(".tutorials").trigger(fakeEvent.mouseup);
        expect(called).to.be.true;

        HelpPanel.Instance.openHelpResource = oldHelpPanelOpen;
    });

    it("should mouseup .tooltips to open tooltip walkthrough modal", function() {
        var oldHelpPanelOpen = HelpPanel.Instance.openHelpResource;
        var called = false;

        HelpPanel.Instance.openHelpResource = function(resource) {
            if (resource == "tooltipResource") {
                called = true;
            }
            return;
        }
        // normal mouseup not work
        $menu.find(".walkthroughs").mouseup();
        expect(called).to.be.false;
        $menu.find(".walkthroughs").trigger(fakeEvent.mouseup);
        expect(called).to.be.true;

        HelpPanel.Instance.openHelpResource = oldHelpPanelOpen;
    });
});