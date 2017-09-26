describe("MonitorLog Test", function() {
    var $logCard;
    var $alertModal;
    var retHosts;
    var recentLog;
    var monitorLog;
    var unknowError;
    before(function() {
        $logCard = $("#monitorLogCard");
        $alertModal = $("#alertModal");
        retHosts = {
            matchHosts: ["testHost1", "testHost2", "testHost3"],
            matchNodeIds: ["0", "1", "2"]
        };

        recentLog = {
            results: {
                testHost1: {
                    status: 200,
                    logs: "success"
                }
            }
        };
        monitorLog = {
            results: {
                testHost1: {
                    status: 200,
                    logs: "success"
                },
                testHost2: {
                    status: 500,
                    error: "error"
                },
                testHost3: {}
            }
        };
        unknowError = {logs: "unknown error"};
    });
    describe("Basic API Test", function() {
        it("monitorLogCard should show", function() {
            // MonitorLog.show();
            $("#setupButton").click();
            expect($logCard.is(":visible")).to.equal(true);
        });
        // it("adjustTabNumber", function() {
        //     MonitorLog.adjustTabNumber();

        // })
    });
    describe("Get recent logs Test", function() {
        before(function() {
            if (!Admin.isAdmin()) {
                MonitorLog.setup();
            }
        });

        it("getHost should work", function(done) {
            var oldFunc = XFTSupportTools.getMatchHosts;
            XFTSupportTools.getMatchHosts = function() {
                var ret = {
                    matchHosts: ["testHost"],
                    matchNodeIds: [0]
                };
                return jQuery.Deferred().resolve(ret).promise();
            };
            MonitorLog.__testOnly__.getHost()
            .then(function() {
                expect(MonitorLog.__testOnly__.getThisHosts()).to.have.property("testHost");
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XFTSupportTools.getMatchHosts = oldFunc;
                done();
            });
        });

        it("getRecentLogs should fail when getMatchHosts rejects", function() {
            $logCard.find(".inputSection .lastRow .xc-input").val(1);
            var oldFunc = XFTSupportTools.getMatchHosts;
            var oldFlush = XcalarLogLevelSet;
            XcalarLogLevelSet = function() {
                return PromiseHelper.resolve();
            };
            XFTSupportTools.getMatchHosts = function() {
                return jQuery.Deferred().reject(unknowError).promise();
            };
            $logCard.find(".getRecentLogs").click();
            expect($("#alertContent").is(":visible")).to.equal(true);
            XFTSupportTools.getMatchHosts = oldFunc;
            XcalarLogLevelSet = oldFlush;
        });

        it("getRecentLogs should work", function() {
            $logCard.find(".inputSection .lastRow .xc-input").val(1);
            var oldFlush = XcalarLogLevelSet;
            var oldFunc1 = XFTSupportTools.getMatchHosts;
            var oldFunc2 = XFTSupportTools.getRecentLogs;
            XcalarLogLevelSet = function() {
                return PromiseHelper.resolve();
            };

            XFTSupportTools.getMatchHosts = function() {
                return jQuery.Deferred().resolve(retHosts).promise();
            };
            XFTSupportTools.getRecentLogs = function() {
                return jQuery.Deferred().resolve(recentLog).promise();
            };

            var keyEvent = $.Event("keydown", {which: keyCode.Enter});
            $logCard.find(".lastRow .xc-input").trigger(keyEvent);
            expect($logCard.find(".msgRow").text()).to.include("success");

            XFTSupportTools.getMatchHosts = oldFunc1;
            XFTSupportTools.getRecentLogs = oldFunc2;
            XcalarLogLevelSet = oldFlush;
        });
    });

    describe("Monitor logs Test", function() {
        it("startMonitorLog should fail when returns unknown error", function() {
            var oldFlush = XcalarLogLevelSet;
            var oldFunc1 = XFTSupportTools.getMatchHosts;
            var oldFunc2 = XFTSupportTools.getRecentLogs;
            XcalarLogLevelSet = function() {
                return PromiseHelper.resolve();
            };

            XFTSupportTools.getMatchHosts = function() {
                return jQuery.Deferred().resolve(retHosts).promise();
            };
            XFTSupportTools.monitorLogs = function(filePath, fileName, hosts,
                                                errCallback) {
                errCallback(unknowError);
            };

            $logCard.find(".startStream").click();
            expect($logCard.find(".streamBtns").hasClass("streaming")).to.equal(false);

            XFTSupportTools.getMatchHosts = oldFunc1;
            XFTSupportTools.monitorLogs = oldFunc2;
            XcalarLogLevelSet = oldFlush;
        });

        it("startMonitorLog should fail when getMatchHosts has error", function() {
            var oldFunc = XFTSupportTools.getMatchHosts;
            var oldFlush = XcalarLogLevelSet;
            XcalarLogLevelSet = function() {
                return PromiseHelper.resolve();
            };
            XFTSupportTools.getMatchHosts = function() {
                return jQuery.Deferred().reject(unknowError).promise();
            };

            $logCard.find(".startStream").click();
            expect($logCard.find(".streamBtns").hasClass("streaming")).to.equal(false);

            XFTSupportTools.getMatchHosts = oldFunc;
            XcalarLogLevelSet = oldFlush;
        });

        it("startMonitorLog should work", function() {
            for (var i = 4; i < 30; i++) {
                var hostname = "testHost" + i;
                monitorLog.results[hostname] = {};
                retHosts.matchHosts.push(hostname);
                retHosts.matchNodeIds.push(i - 1);
            }
            var oldFunc1 = XFTSupportTools.getMatchHosts;
            var oldFunc2 = XFTSupportTools.monitorLogs;
            var oldFlush = XcalarLogLevelSet;
            XcalarLogLevelSet = function() {
                return PromiseHelper.resolve();
            };
            XFTSupportTools.getMatchHosts = function() {
                return jQuery.Deferred().resolve(retHosts).promise();
            };
            XFTSupportTools.monitorLogs = function(filePath, fileName, hosts,
                                                errCallback, successCallback) {
                successCallback(monitorLog);
            };

            $logCard.find(".startStream").click();
            expect($logCard.find(".msgRow").text()).to.include("success");
            var logs = MonitorLog.__testOnly__.getThisLogs();
            expect(logs["testHost2"]).to.include("error");

            XFTSupportTools.getMatchHosts = oldFunc1;
            XFTSupportTools.monitorLogs = oldFunc2;
            XcalarLogLevelSet = oldFlush;
        });

        it("appendResultToFocusTab should work", function() {
            var resSucc = {testHost1: {status: 200, logs: "success"}};
            var resFail = {testHost1: {status: 500, error: "error"}};
            var resNone = {testHost1: {}};
            MonitorLog.__testOnly__.appendResultToFocusTab(resSucc);
            MonitorLog.__testOnly__.appendResultToFocusTab(resFail);
            MonitorLog.__testOnly__.appendResultToFocusTab(resNone);
            expect($logCard.find(".msgRow").text()).to.include("success");
            expect($logCard.find(".msgRow").text()).to.include("error");
            expect($logCard.find(".msgRow").text()).to.include(MonitorTStr.GetLogsFail);
        });

        it("stopMonitorLog should work", function() {
            $logCard.find(".stopStream").click();
            expect($logCard.find(".streamBtns").hasClass("streaming")).to.equal(false);
        });
    });

    describe("Cleanup and other UI behaviors Test", function() {
        it("adjustTabNumber should work", function() {
            MonitorLog.adjustTabNumber();
            expect($logCard.find(".rightEnd").hasClass("xc-disabled")).to.equal(false);
        });
        it("focuseTab should work", function() {
            $logCard.find("#1").click();
            expect($logCard.find("#1").hasClass("focus")).to.equal(true);
        });
        it("scrollToRight should work", function() {
            $logCard.find(".rightEnd").click();
            expect($logCard.find(".tabArea").css("left")).to.include("-");
        });
        it("scrollToLeft should work", function() {
            $logCard.find(".leftEnd").click();
            expect($logCard.find(".tabArea").css("left")).to.equal("0px");
        });
        it("clearLogs should work", function() {
            $logCard.find(".msgRow").text("success");
            $logCard.find(".clear").click();
            expect($logCard.find(".content").html()).to.be.empty;
        });
        it("closeTab should work", function() {
            $logCard.find(".tabClose .icon").click();
            expect(MonitorLog.__testOnly__.getThisHosts()).to.be.empty;
        });
    });
    after(function() {
        $alertModal.find(".cancel").click();
    });
});