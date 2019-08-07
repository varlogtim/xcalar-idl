describe("Tooltip Flight Test", function(done) {

    before((done) => {
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(() => {
            done();
        });
    });

    // flight tests for the built in tooltip walkthroughs
    it("should do the entire dataflow mode walkthrough successfully", function() {
        XVM.setMode(XVM.Mode.Advanced);
        TooltipWalkthroughs.startWalkthrough("Dataflow Mode");

        //mode tip
        expect($("#modeArea").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //tab tip click
        expect($("#tabButton").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#tabButton").click();

        // panel tip
        expect($("#dataflowMenu").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // canvas tip
        expect($(".dataflowMainArea").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // category bar tip
        expect($("#dagView .categoryBar").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // operator bar tip 1
        expect($("#dagView .operatorBar").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // operator bar tip 2
        expect($("#dagView .operatorBar").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // node tip doubleclick
        expect($("#dagView .operatorWrap .active .operator").eq(0).hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#dagView .operatorWrap .active .operator .main").eq(0).dblclick();

        // view tip
        expect($("#dagView").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // view tip2
        expect($("#dagView").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        // help button tip
        expect($("#bottomMenuBarTabs").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#bottomMenuBarTabs #helpMenuTab.sliderBtn").click();

        // help walkthrough tip
        expect($("#tutorialResource").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        expect($("#intro-popover").is(":visible")).to.be.false;
    });

    it("should do the entire Sql mode walkthrough for cloud successfully", function() {
        let oldIsCloud = XVM.isCloud;
        XVM.isCloud = () => true;
        TooltipWalkthroughs.startWalkthrough("SQL Mode")

        //home tip
        expect($("#homeBtn").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //MenuBar tip
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

        //dsSource locaion file
        expect($("#dsForm-source .location.file").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //dsSource locaion s3
        expect($("#dsForm-source .location.s3").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //dsSource locaion database
        expect($("#dsForm-source .location.database").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //dsSource more
        expect($("#dsForm-source .more").hasClass("intro-highlightedElement")).to.be.true;
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

        // help button tip
        expect($("#bottomMenuBarTabs").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#bottomMenuBarTabs #helpMenuTab.sliderBtn").click();

        // help walkthrough tip
        expect($("#tutorialResource").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        expect($("#intro-popover").is(":visible")).to.be.false;
        XVM.isCloud = oldIsCloud;
    });


    it("should do the entire Sql mode walkthrough for on prem successfully", function() {
        let oldIsCloud = XVM.isCloud;
        XVM.isCloud = () => false;
        TooltipWalkthroughs.startWalkthrough("SQL Mode")

        //home tip
        expect($("#homeBtn").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        //MenuBar tip
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

        //dsform tip 2
        expect($("#dsForm-path").hasClass("intro-highlightedElement")).to.be.true;
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

        // help button tip
        expect($("#bottomMenuBarTabs").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#bottomMenuBarTabs #helpMenuTab.sliderBtn").click();

        // help walkthrough tip
        expect($("#tutorialResource").hasClass("intro-highlightedElement")).to.be.true;
        expect($("#intro-popover").is(":visible")).to.be.true;
        $("#intro-popover .next").click();

        expect($("#intro-popover").is(":visible")).to.be.false;
        XVM.isCloud = oldIsCloud;
    });
});
