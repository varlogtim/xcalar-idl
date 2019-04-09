describe("Tooltip Manager Test", function() {
    let basicTest;

    before(function() {
        if (!XVM.isSQLMode()) {
            $("#modeArea").click();
        }
        basicTest = [{
            highlight_div: "#homeBtn",
            text: "test",
            type: TooltipType.Text
        }];
    });

    it("Should Display a tooltip without a background", function() {
        expect($("#intro-popover").length).to.equal(0);
        expect($("#intro-overlay").length).to.equal(0);
        TooltipManager.start("test", basicTest, false, 0);
        expect($("#intro-overlay").length).to.equal(0);
        expect($("#intro-popover").length).to.equal(1);
        TooltipManager.closeWalkthrough();
    });

    it("Should Display a tooltip with a background", function() {
        expect($("#intro-popover").length).to.equal(0);
        expect($("#intro-overlay").length).to.equal(0);
        TooltipManager.start("test", basicTest, true, 0);
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
            TooltipManager.start("test", textTest, true, 0);
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
            TooltipManager.start("test", textTest, true, 0);
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
            TooltipManager.start("test", textTest, true, 0);
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

});