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
                        "totalAvailableMemInBytes": 200 * GB,

                        "xdbUsedBytes": 40 * MB,
                        "xdbTotalBytes": 50 * MB,
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
                expect(dataset[0][1]).to.equal(120);
                expect(dataset[1][1]).to.equal(5);
                expect(dataset[2][1]).to.equal(10);

                expect($monitorPanel.find(".line").length).to.equal(3);
                expect($monitorPanel.find(".area").length).to.equal(3);
                // console.log($monitorPanel.find(".line0").attr("d"), $monitorPanel.find(".line1").attr("d"), $monitorPanel.find(".line2").attr("d"))
                expect($monitorPanel.find(".line0").attr("d")).to.equal("M0,210L6,84");
                expect($monitorPanel.find(".line1").attr("d")).to.equal("M0,210L6,204.75");
                expect($monitorPanel.find(".line2").attr("d")).to.equal("M0,210L6,189");

                // labels should be 40, 80, 120, 160, 200
                expect($monitorPanel.find(".memYAxisWrap text").text()).to.equal("4080120160200");
                expect($monitorPanel.find(".memYAxisWrap .unit").text()).to.equal("0 (GiB)");

                XcalarApiTop = cachedTopFn;
                XcalarGetMemoryUsage = cachedGetMemUsage;
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