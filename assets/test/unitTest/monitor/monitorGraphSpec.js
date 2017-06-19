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
                        "parentCpuUsageInPercent": 10,

                        "memUsageInPercent": 60,
                        "memUsedInBytes": 120 * GB,

                        "xdbUsedBytes": 40 * MB,
                        "xdbTotalBytes": 50 * MB,
                        "networkRecvInBytesPerSec": 0,
                        "networkSendInBytesPerSec": 0
                    }]
                };

                return PromiseHelper.resolve(stats);
            };


            var dataset = [[0],[0],[0],[0]];
            MonitorGraph.__testOnly__.reset(dataset);

            fn()
            .then(function() {
                expect(dataset[0][1]).to.equal(5);
                expect(dataset[1][1]).to.equal(10);
                expect(dataset[2][1]).to.equal(120);
                expect(dataset[3][1]).to.equal(40);

                expect($monitorPanel.find(".line").length).to.equal(4);
                expect($monitorPanel.find(".area").length).to.equal(4);

                expect($monitorPanel.find(".line0").attr("d")).to.equal("M0,210L6,199.5");
                expect($monitorPanel.find(".line2").attr("d")).to.equal("M0,210L6,84");

                // labels should be 40, 80, 120, 160, 200
                expect($monitorPanel.find(".rightYAxisWrap:eq(0) text").text()).to.equal("4080120160200");
                expect($monitorPanel.find(".rightYAxisWrap:eq(0) .unit").text()).to.equal("0 (GB)");
                // labels should be 10, 20, 30, 40, 50
                expect($monitorPanel.find(".rightYAxisWrap:eq(1) text").text()).to.equal("1020304050");
                expect($monitorPanel.find(".rightYAxisWrap:eq(1) .unit").text()).to.equal("0 (MB)");

                XcalarApiTop = cachedTopFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    after(function() {
        $mainTabCache.click();
    });
});