describe("Monitor Panel Test", function() {
    var $mainTabCache;
    var $monitorPanel;

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $monitorPanel = $("#monitor-system");
        // $("#monitorTab").find(".mainTab");
        $("#systemButton").click();
    });

    describe("toggling xdb and ram", function() {
        it("clicking on donut should toggle xdb and ram", function() {
            var isxdbMode = $monitorPanel.find(".donutSection")
                                         .eq(1).hasClass("xdbMode");
            expect(isxdbMode).to.be.false;
            expect($("#donutStats2").is(":visible")).to.be.false;
            expect($("#donutStats1").is(":visible")).to.be.true;
            var text = $monitorPanel.find(".graphSwitches .row").eq(1)
                                    .find(".text").text();
            expect(text).to.equal("RAM");

            // to xdb mode
            $monitorPanel.find(".ramDonut .donut").eq(0).click();

            isxdbMode = $monitorPanel.find(".donutSection")
                                     .eq(1).hasClass("xdbMode");
            expect(isxdbMode).to.be.true;
            expect($("#donutStats2").is(":visible")).to.be.true;
            expect($("#donutStats1").is(":visible")).to.be.false;
            text = $monitorPanel.find(".graphSwitches .row").eq(1)
                                    .find(".text").text();
            expect(text).to.equal("XDB");

            // to ram mode
            $monitorPanel.find(".ramDonut .donut").eq(0).click();

            isxdbMode = $monitorPanel.find(".donutSection")
                                     .eq(1).hasClass("xdbMode");
            expect(isxdbMode).to.be.false;
            expect($("#donutStats2").is(":visible")).to.be.false;
            expect($("#donutStats1").is(":visible")).to.be.true;

            text = $monitorPanel.find(".graphSwitches .row").eq(1)
                                    .find(".text").text();
            expect(text).to.equal("RAM");
        });
    });

    after(function() {
        $mainTabCache.click();
    });
});