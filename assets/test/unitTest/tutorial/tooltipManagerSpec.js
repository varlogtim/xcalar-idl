describe("Tooltip Manager Test", function() {
    let basicTest;
    let basicInfo;

    before(function() {
        if (!XVM.isSQLMode()) {
            $("#modeArea").click();
        }
        basicTest = [{
            highlight_div: "#homeBtn",
            text: "test",
            type: TooltipType.Text
        }];
        basicInfo = {
            tooltipTitle: "SQL Mode",
            background: true,
            startScreen: TooltipStartScreen.SQLWorkspace
        };
    });

    it("Should Display a tooltip without a background", function() {
        expect($("#intro-popover").length).to.equal(0);
        expect($("#intro-overlay").length).to.equal(0);
        basicInfo.background = false;
        TooltipManager.start(basicInfo, basicTest, 0);
        expect($("#intro-overlay").length).to.equal(0);
        expect($("#intro-popover").length).to.equal(1);
        TooltipManager.closeWalkthrough();
    });

    it("Should Display a tooltip with a background", function() {
        expect($("#intro-popover").length).to.equal(0);
        expect($("#intro-overlay").length).to.equal(0);
        basicInfo.background = true;
        TooltipManager.start(basicInfo, basicTest, 0);
        expect($("#intro-overlay").length).to.equal(1);
        expect($("#intro-popover").length).to.equal(1);
        TooltipManager.closeWalkthrough();
    });

    describe("Tooltip Types", function() {
        it("Should support no-interaction tooltips", function() {
            let textTest = [{
                highlight_div: "#homeBtn",
                text: "test",
                type: "text"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            TooltipManager.start(basicInfo, textTest, 0);
            expect($("#intro-popover .textContainer").text()).to.equal("test");
            expect($("#intro-popover .next").hasClass("unavailable")).to.be.false;
            $("#intro-popover .next").click();
            expect($("#intro-popover .textContainer").text()).to.equal("test2");
            TooltipManager.closeWalkthrough();
        });

        it("Should support click-interaction tooltips", function() {
            let textTest = [{
                highlight_div: "#dataStoresTab",
                interact_div: "#dataStoresTab",
                text: "test",
                type: "click"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            TooltipManager.start(basicInfo, textTest, 0);
            expect($("#intro-popover .textContainer").text()).to.equal("test");
            expect($("#intro-popover .next").hasClass("unavailable")).to.be.true;
            var e = jQuery.Event("click.tooltip");
            $("#dataStoresTab").trigger(e);
            expect($("#intro-popover .textContainer").text()).to.equal("test2");
            TooltipManager.closeWalkthrough();
        });

        it("Should support value-interaction tooltips", function() {
            $('body').append("<input id='tooltipSpecTestInput' type='text'></input>");
            let textTest = [{
                highlight_div: "#tooltipSpecTestInput",
                interact_div: "#tooltipSpecTestInput",
                text: "test",
                type: "value",
                value: "a"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            TooltipManager.start(basicInfo, textTest, 0);
            expect($("#intro-popover .textContainer").text()).to.equal("test");
            expect($("#intro-popover .next").hasClass("unavailable")).to.be.true;
            $("#tooltipSpecTestInput").val("a");
            var e = jQuery.Event("keyup");
            $("#tooltipSpecTestInput").trigger(e);
            expect($("#intro-popover .textContainer").text()).to.equal("test2");
            TooltipManager.closeWalkthrough();
            $("#tooltipSpecTestInput").remove();
        });
    });

    describe("Switch screens", function() {
        it("Should be able to switch to sql mode from adv mode", function() {
            if (XVM.isSQLMode()) {
                $("#modeArea").click();
            }
            expect($("#sqlTab").hasClass("active")).to.be.false;
            basicInfo.startScreen = TooltipStartScreen.SQLWorkspace;
            TooltipManager.start(basicInfo, basicTest, 0);
            expect($("#sqlTab").hasClass("active")).to.be.true;
            TooltipManager.closeWalkthrough();
        });

        it("Should be able to switch to adv mode from sql mode", function() {
            if (!XVM.isSQLMode()) {
                $("#modeArea").click();
            }
            expect($("#modelingDataflowTab").hasClass("active")).to.be.false;
            basicInfo.startScreen = TooltipStartScreen.ADVModeDataflow;
            TooltipManager.start(basicInfo, basicTest, 0);
            expect($("#modelingDataflowTab").hasClass("active")).to.be.true;
            TooltipManager.closeWalkthrough();
        });

        it("Should open the sql workspace", function() {
            $("#monitorTab").click();
            if (!XVM.isSQLMode()) {
                $("#modeArea").click();
            }
            expect($("#modelingDataflowTab").hasClass("active")).to.be.false;
            basicInfo.startScreen = TooltipStartScreen.ADVModeDataflow;
            TooltipManager.start(basicInfo, basicTest, 0);
            expect($("#modelingDataflowTab").hasClass("active")).to.be.true;
            TooltipManager.closeWalkthrough();
        });

        it("Should open the dataflow screen", function() {
            $("#monitorTab").click();
            if (XVM.isSQLMode()) {
                $("#modeArea").click();
            }
            expect($("#sqlTab").hasClass("active")).to.be.false;
            basicInfo.startScreen = TooltipStartScreen.SQLWorkspace;
            TooltipManager.start(basicInfo, basicTest, 0);
            expect($("#sqlTab").hasClass("active")).to.be.true;
            TooltipManager.closeWalkthrough();
        });
    });


});