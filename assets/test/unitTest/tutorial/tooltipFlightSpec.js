describe("Tooltip Flight Test", function(done) {
    // flight tests for the built in tooltip walkthroughs

    it("should do the entire Sql mode walkthrough successfully", function() {
        TooltipWalkthroughs.startWalkthrough("SQL Mode")
            //MenuBar tip
        var e = jQuery.Event("click.tooltip");

        expect($("#menuBar").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //datastore tip
        expect($("#dataStoresTab").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //sqltab tip
        expect($("#sqlTab").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //monitor tip
        expect($("#monitorTab").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //datastore click tip
        expect($("#dataStoresTab").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#dataStoresTab .mainTab").click();

        //sourcetbl click tip
        expect($("#sourceTblButton").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#sourceTblButton").click();

        expect(MainMenu.isMenuOpen()).to.be.true;
        expect($("#dsFormView").hasClass("xc-hidden")).to.be.false;

        //dsform tip
        expect($("#dsForm-path .cardMain").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //dsform target tip
        expect($("#dsForm-target").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //filepath value tip
        expect($("#filePath").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //dsform browse tip
        expect($("#dsForm-path .cardMain .browse").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //dsformButton
        expect($("#dsForm-path .btn-submit").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // sql workspace tip
        expect($("#sqlWorkSpace").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#sqlWorkSpace").click();

        //sql editor
        expect($("#sqlEditorSpace").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //sql table tip
        expect($("#sqlTableListerArea").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //sql history tip
        expect($("#sqlWorkSpacePanel .historySection").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        expect($("#intro-popover").is(":visible")).to.be.false;
    });

});
