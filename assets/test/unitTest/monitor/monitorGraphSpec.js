describe("Monitor Graph Test", function() {
    var $mainTabCache;
    var $monitorPanel;

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $monitorPanel = $("#monitor-system");
        $("#systemButton").click();
    });

    describe('test graph', function() {
        // tests data is correct and line graph is correct
        it('graph should work', function(done) {
            var fn = MonitorGraph.__testOnly__.updateGraph;
            var cachedTopFn = XcalarApiTop;
            XcalarApiTop = function() {
                var stats = {
                    numNodes: 1,
                    topOutputPerNode: [{
                        "childrenCpuUsageInPercent": 5,
                        "cpuUsageInPercent": 10,
                        "parentCpuUsageInPercent": 10,

                        "memUsageInPercent": 60,
                        "totalAvailableMemInBytes": 200 * GB,

                        "xdbUsedBytes": 40 * GB,
                        "xdbTotalBytes": 50 * GB,
                        "networkRecvInBytesPerSec": 0,
                        "networkSendInBytesPerSec": 0,

                        "datasetUsedBytes": 1 * MB,

                        "sysSwapUsedInBytes": 5 * GB,
                        "sysSwapTotalInBytes": 10 * GB
                    }]
                };

                return PromiseHelper.resolve(stats);
            };
            var cachedGetMemUsage = XcalarGetMemoryUsage;
            XcalarGetMemoryUsage = function() {
                return PromiseHelper.resolve({
                    userMemory: {
                        numSessions: 1,
                        sessionMemory: [{
                            numTables: 1,
                            tableMemory: [{
                                totalBytes: 1000
                            }]
                        }]
                    }
                });
            };


            var dataset = [[0],[0],[0]];
            MonitorGraph.__testOnly__.reset(dataset);

            fn()
            .then(function() {
                expect(dataset[0][1]).to.equal("40.0");
                expect(dataset[1][1]).to.equal("5.00");
                expect(dataset[2][1]).to.equal(10);

                expect($monitorPanel.find(".line").length).to.equal(3);
                expect($monitorPanel.find(".area").length).to.equal(3);
                // console.log($monitorPanel.find(".line0").attr("d"), $monitorPanel.find(".line1").attr("d"), $monitorPanel.find(".line2").attr("d"))
                expect($monitorPanel.find(".line0").attr("d")).to.equal("M0,210L6,168");
                expect($monitorPanel.find(".line1").attr("d")).to.equal("M0,210L6,204.75");
                expect($monitorPanel.find(".line2").attr("d")).to.equal("M0,210L6,189");

                // labels should be 40, 80, 120, 160, 200
                expect($monitorPanel.find(".memYAxisWrap text").text()).to.equal("4080120160200");
                expect($monitorPanel.find(".memYAxisWrap .unit").text()).to.equal("0 (GiB)");

                // order changes when clicked
                $monitorPanel.find(".area").eq(0).click();
                expect($monitorPanel.find(".area").last().css("opacity")).to.equal("0.4");
                $monitorPanel.find(".area").last().click();
                expect($monitorPanel.find(".area").last().css("opacity")).to.equal("0.8");

                XcalarApiTop = cachedTopFn;
                XcalarGetMemoryUsage = cachedGetMemUsage;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("error screen should work", function() {
            MonitorGraph.__testOnly__.toggleErrorScreen(true);
            var $errorScreen = $("#monitor-graphCard").find(".statsErrorContainer");
            expect($errorScreen.hasClass("xc-hidden")).to.be.false;
            expect($errorScreen.text()).to.equal(MonitorTStr.StatsFailed);

            MonitorGraph.__testOnly__.toggleErrorScreen(true, {error: "test"});
            expect($errorScreen.text()).to.equal("test");

            MonitorGraph.__testOnly__.toggleErrorScreen(false);
            expect($errorScreen.hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("donut interaction", function() {
        it("stats section should toggle", function(done) {
            $monitorPanel.find(".statsHeadingBar").eq(0).click();
            UnitTest.testFinish(function() {
                return !$monitorPanel.find(".statsSection ul").eq(0).is(":visible");
            })
            .then(function() {
                $monitorPanel.find(".statsHeadingBar").eq(0).click();
                return (UnitTest.testFinish(function() {
                    return $monitorPanel.find(".statsSection ul").eq(0).is(":visible");
                }));
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("clicking on donut should toggle percentage", function() {
            expect($monitorPanel.find(".donut").eq(0)
                    .find(".pctSize").is(":visible")).to.be.false;
            $monitorPanel.find(".donut").click();
            expect($monitorPanel.find(".donut").eq(0)
                    .find(".pctSize").is(":visible")).to.be.true;
            $monitorPanel.find(".donut").click();
            expect($monitorPanel.find(".donut").eq(0)
                    .find(".pctSize").is(":visible")).to.be.false;
        });

        it("clicking on node stats should toggle percentage", function() {
            expect($monitorPanel.find(".statsSection").eq(0)
                    .find(".pct").is(":visible")).to.be.false;
            $monitorPanel.find(".statsSection .listWrap").click();
            expect($monitorPanel.find(".statsSection").eq(0)
                    .find(".pct").is(":visible")).to.be.true;
            $monitorPanel.find(".statsSection .listWrap").click();
            expect($monitorPanel.find(".statsSection").eq(0)
                    .find(".pct").is(":visible")).to.be.false;
        });

        it("mouseenter on ram legend should work", function(){
            var $donut = $monitorPanel.find(".ramDonut");
            expect($donut.find(".donutLegendInfo").is(":visible")).to.be.false;
            $donut.find(".legend li").last().trigger("mouseenter");
            expect($donut.find(".donutLegendInfo").is(":visible")).to.be.true;
            expect($donut.find("svg").first().find("path").first()
                                        .attr("class")).to.be.equal("hover");

            $donut.find(".legend li").last().trigger("mouseleave");
            expect($donut.find(".donutLegendInfo").is(":visible")).to.be.false;
            expect($donut.find("svg").first().find("path").first()
                                        .attr("class")).to.be.equal("");
        });

        it("mouseenter on free memory portion of legend should work", function() {
            var $donut = $monitorPanel.find(".ramDonut");
            expect($donut.find(".donutLegendInfo").is(":visible")).to.be.false;
            $donut.find(".legend li").first().trigger("mouseenter");
            expect($donut.find(".donutLegendInfo").is(":visible")).to.be.true;
            expect($donut.find("svg").eq(1).find("path").eq(1)
                                        .attr("class")).to.be.equal("hover");

            $donut.find(".legend li").last().trigger("mouseleave");
            expect($donut.find(".donutLegendInfo").is(":visible")).to.be.false;
            expect($donut.find("svg").eq(1).find("path").eq(1)
                                        .attr("class")).to.be.equal("");
        });

        it("mouseenter on path should work", function() {
            var $donut = $monitorPanel.find(".ramDonut");
            $donut.find(".thick path").eq(0).trigger("mouseenter");
            expect($donut.find(".legend li").last().hasClass("hover")).to.be.true;
            $donut.find(".thick path").eq(0).trigger("mouseleave");
            expect($donut.find(".legend li").last().hasClass("hover")).to.be.false;
        });

        it("mouseenter on Xcalar Managed Memory path should work", function() {
            var ramData = [1 * KB, 2 * MB, 3 * GB, 4 * TB, 5 * PB];
            var cacheData = MonitorDonuts.__testOnly__setRamData(ramData);
            var $donut = $monitorPanel.find(".ramDonut");
            $donut.find(".thick path").eq(3).trigger("mouseenter");
            expect($donut.find(".legend li").eq(1).hasClass("hover")).to.be.true;
            expect($donut.find(".donutLegendInfo .unitSize").text().replace(/[\n\r]+|[\s]{2,}/g, '').trim()).to.equal("4.00TiB")
            $donut.find(".thick path").eq(3).trigger("mouseleave");
            expect($donut.find(".legend li").eq(1).hasClass("hover")).to.be.false;
            MonitorDonuts.__testOnly__setRamData(cacheData);
        });
    });

    describe("MonitorGraph.clear function", function() {
        it("clear should work", function() {
            expect($("#memYAxis").text().length).to.be.gt(0);
            expect($("#graph svg").length).to.be.gt(0);
            MonitorGraph.clear();
            expect($("#memYAxis").text().length).to.equal(0);
            expect($("#graph svg").length).to.equal(0);
        });
    });

    describe("MonitorGraph interval slider", function() {
        it("slider should work", function() {
            var $bar = $("#monitorIntervalSlider").find(".ui-resizable-e").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX + 300, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX + 300, pageY: pageY });

            expect($("#monitorIntervalSlider").find(".value").val()).to.equal("60");

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX + 300, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX - 500, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX - 500, pageY: pageY});

            expect($("#monitorIntervalSlider").find(".value").val()).to.equal("1");

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX - 500, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY});
        });
    });

    after(function() {
        $mainTabCache.click();
    });
});
