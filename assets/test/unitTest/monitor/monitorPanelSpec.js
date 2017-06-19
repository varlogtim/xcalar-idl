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

            // to ram mode
            $monitorPanel.find(".ramDonut .donut").eq(0).click();

            isxdbMode = $monitorPanel.find(".donutSection")
                                     .eq(1).hasClass("xdbMode");
            expect(isxdbMode).to.be.false;
            expect($("#donutStats3").is(":visible")).to.be.false;
            expect($("#donutStats2").is(":visible")).to.be.true;
            text = $monitorPanel.find(".graphSwitches .row").eq(1)
                                    .find(".text").text();
            expect(text).to.equal("RAM");

            // to xdb mode
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

        it("clicking on cpu donut should toggle child and usrnode", function() {
            var isUsrMode = $monitorPanel.find(".donutSection")
                                         .eq(0).hasClass("usrMode");
            expect(isUsrMode).to.be.true;
            expect($("#donutStats0").is(":visible")).to.be.false;
            expect($("#donutStats1").is(":visible")).to.be.true;

            // to childnode mode
            $monitorPanel.find(".cpuDonut .donut").eq(0).click();

            isUsrMode = $monitorPanel.find(".donutSection")
                                     .eq(0).hasClass("usrMode");
            expect(isUsrMode).to.be.false;
            expect($("#donutStats0").is(":visible")).to.be.true;
            expect($("#donutStats1").is(":visible")).to.be.false;


            // to usrnode mode
            $monitorPanel.find(".cpuDonut .donut").eq(0).click();

            isUsrMode = $monitorPanel.find(".donutSection")
                                     .eq(0).hasClass("usrMode");
            expect(isUsrMode).to.be.true;
            expect($("#donutStats0").is(":visible")).to.be.false;
            expect($("#donutStats1").is(":visible")).to.be.true;
        });
    });

    describe("toggling graph switches", function() {
        it("switching should work", function() {
            var $areas;
            var $area1 = $monitorPanel.find(".area1");
            var $area3 = $monitorPanel.find(".area3");

            expect($monitorPanel.find(".area").index($area3)).to.be.gt(
                                $monitorPanel.find(".area").index($area1));
            $monitorPanel.find(".graphSwitch").eq(0).click();
            expect($area1.css("display")).to.equal("none");
            $monitorPanel.find(".graphSwitch").eq(0).click();
            expect($area1.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area1)).to.be.gt(
                                $monitorPanel.find(".area").index($area3));


            $monitorPanel.find(".graphSwitch").eq(1).click();
            expect($area3.css("display")).to.equal("none");
            $monitorPanel.find(".graphSwitch").eq(1).click();
            expect($area3.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area3)).to.be.gt(
                                $monitorPanel.find(".area").index($area1));
        });
    });

    after(function() {
        $mainTabCache.click();
    });
});