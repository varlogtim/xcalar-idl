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
            expect(isxdbMode).to.be.true;
            expect($("#donutStats3").is(":visible")).to.be.true;
            expect($("#donutStats2").is(":visible")).to.be.false;
            var text = $monitorPanel.find(".graphSwitches .row").eq(1)
                                    .find(".text").text();
            expect(text).to.equal("XDB");

            // to xdb mode
            $monitorPanel.find(".ramDonut .donut").eq(0).click();

            isxdbMode = $monitorPanel.find(".donutSection")
                                     .eq(1).hasClass("xdbMode");
            expect(isxdbMode).to.be.false;
            expect($("#donutStats3").is(":visible")).to.be.false;
            expect($("#donutStats2").is(":visible")).to.be.true;
            text = $monitorPanel.find(".graphSwitches .row").eq(1)
                                    .find(".text").text();
            expect(text).to.equal("RAM");

            // to ram mode
            $monitorPanel.find(".ramDonut .donut").eq(0).click();

            isxdbMode = $monitorPanel.find(".donutSection")
                                     .eq(1).hasClass("xdbMode");
            expect(isxdbMode).to.be.true;
            expect($("#donutStats3").is(":visible")).to.be.true;
            expect($("#donutStats2").is(":visible")).to.be.false;

            text = $monitorPanel.find(".graphSwitches .row").eq(1)
                                    .find(".text").text();
            expect(text).to.equal("XDB");
        });
    });

    describe("toggling graph switches", function() {
        it("switching should work", function() {
            $monitorPanel.find(".graphSwitch").eq(0).click();
            expect($monitorPanel.find(".area1").css("display")).to.equal("none");
            $monitorPanel.find(".graphSwitch").eq(0).click();
            expect($monitorPanel.find(".area1").css("display")).to.not.equal("none");

            $monitorPanel.find(".graphSwitch").eq(1).click();
            expect($monitorPanel.find(".area3").css("display")).to.equal("none");
            $monitorPanel.find(".graphSwitch").eq(1).click();
            expect($monitorPanel.find(".area3").css("display")).to.not.equal("none");
        });
    });

    after(function() {
        $mainTabCache.click();
    });
});