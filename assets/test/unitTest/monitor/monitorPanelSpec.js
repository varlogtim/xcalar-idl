describe("Monitor Panel Test", function() {
    var $mainTabCache;
    var $monitorPanel;
    var $monitorMenu;

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $monitorPanel = $("#monitor-system");
        $monitorMenu = $("#monitorMenu-sys");
        // $("#monitorTab").find(".mainTab");
        $("#systemButton").click();
    });

    describe.skip("toggling units and pct", function() {

    });

    describe("toggling graph switches", function() {
        it("switching should work", function() {
            var $area0 = $monitorPanel.find(".area0");
            var $area1 = $monitorPanel.find(".area1");

            expect($monitorPanel.find(".area").index($area1)).to.be.gt(
                                $monitorPanel.find(".area").index($area0));
            $monitorMenu.find(".graphSwitch").eq(0).click();
            expect($area0.css("display")).to.equal("none");
            $monitorMenu.find(".graphSwitch").eq(0).click();
            expect($area0.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area0)).to.be.gt(
                                $monitorPanel.find(".area").index($area1));


            $monitorMenu.find(".graphSwitch").eq(1).click();
            expect($area1.css("display")).to.equal("none");
            $monitorMenu.find(".graphSwitch").eq(1).click();
            expect($area1.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area1)).to.be.gt(
                                $monitorPanel.find(".area").index($area0));
        });
    });

    after(function() {
        $mainTabCache.click();
    });
});