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

    describe("monitor tabs", function() {
        it("settings button should work", function() {
            $("#settingsButton").click();
            expect($("#monitor-settings").hasClass("active")).to.be.true;
        });
        it("extensionSettingButton should work", function() {
            $("#extensionSettingButton").click();
            expect($("#monitor-extension").hasClass("active")).to.be.true;
        });
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

    describe("list interactions", function() {
        it("toggling monitor system lists should work", function() {
            var $listInfo = $("#monitorMenu-sys").find(".listInfo").eq(0);
            var wasActive = $listInfo.closest(".listWrap").hasClass("active");
            $listInfo.click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.not.equal(wasActive);
            $listInfo.click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.equal(wasActive);
        });

        it("toggling monitor setup lists should work", function() {
            var $listInfo = $("#monitorMenu-setup").find(".listInfo").eq(0);
            var wasActive = $listInfo.closest(".listWrap").hasClass("active");
            $listInfo.click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.not.equal(wasActive);
            $listInfo.click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.equal(wasActive);
        });

        it("monitor-delete button should work", function() {
            var shown = false;
            var cache = DeleteTableModal.show;
            DeleteTableModal.show = function() {
                shown = true;
            };

            $("#monitor-delete").click();
            expect(shown).to.be.true;

            DeleteTableModal.show = cache;
        });
    });

    after(function() {
        $mainTabCache.click();
    });
});