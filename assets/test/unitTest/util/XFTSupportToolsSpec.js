describe("XFTSupportTools Test", function() {
    describe("XFTSupportTools Send Request Test", function() {
        it("prePraseSendData should work", function() {
            var prePraseSendData = XFTSupportTools.__testOnly__.prePraseSendData;
            var res = prePraseSendData("GET");
            expect(res).to.be.an("object");

            // case 2
            res = prePraseSendData("PUT", "test");
            expect(res).to.be.a("string");
            expect(res).contains("test");
        });

        it("parseSuccessData should work", function() {
            var parseSuccessData = XFTSupportTools.__testOnly__.parseSuccessData;
            var res = parseSuccessData("test");
            expect(res).to.equal("test");
            // case 2
            res = parseSuccessData({
                "logs": btoa("test")
            });
            expect(res).to.be.an("object");
            expect(res.logs).to.equal("test");
        });

        it("parseErrorData should work", function() {
            var parseErrorData = XFTSupportTools.__testOnly__.parseErrorData;
            var res = parseErrorData({
                "status": 1,
                "statusText": "test"
            });

            expect(res).to.be.an("object");
            expect(res.status).to.equal(1);
            expect(res.logs).to.equal("test");
            expect(res.unexpectedError).to.be.true;

            // case 2
            res = parseErrorData({
                "responseJSON": {
                    "logs": btoa("test")
                }
            });

            expect(res).to.be.an("object");
            expect(res.logs).to.equal("test");
        });
    });

    describe("XFTSupportTools API Test", function() {
        it("XFTSupportTools.getRecentLogs should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();

            XFTSupportTools.getRecentLogs(10, "path", "file", {"hostA": true})
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(res.requireLineNum).to.equal(10);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should get monitor log", function(done) {
            var ret = {"updatedLastMonitorMap": "test"};
            XFTSupportTools.__testOnly__.setSendRequest(ret);
            var lasMonitorMap = XFTSupportTools.__testOnly__.getMonitorMap();
            // clean first
            XFTSupportTools.stopMonitorLogs();
            expect($.isEmptyObject(lasMonitorMap)).to.be.true;

            var checkFunc = function() {
                var map = XFTSupportTools.__testOnly__.getMonitorMap();
                return !($.isEmptyObject(map));
            };

            var test = false;
            var successCallback = function() {
                test = true;
            };

            XFTSupportTools.monitorLogs("testPath", "testFile", {"hostA": true},
                                        null, successCallback);

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect(test).to.be.true;
                XFTSupportTools.stopMonitorLogs();
                lasMonitorMap = XFTSupportTools.__testOnly__.getMonitorMap();
                expect($.isEmptyObject(lasMonitorMap)).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle fail monitor case", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest({}, true);
            var lasMonitorMap = XFTSupportTools.__testOnly__.getMonitorMap();
            lasMonitorMap["test"] = "testVal";

            var checkFunc = function() {
                var map = XFTSupportTools.__testOnly__.getMonitorMap();
                return $.isEmptyObject(map);
            };

            var test = false;
            var errCallback = function() {
                test = true;
            };

            XFTSupportTools.monitorLogs("testPath", "testFile", {"hostA": true},
                                        errCallback);

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect(test).to.be.true;
                lasMonitorMap = XFTSupportTools.__testOnly__.getMonitorMap();
                expect($.isEmptyObject(lasMonitorMap)).to.be.true;
                XFTSupportTools.stopMonitorLogs();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.clusterStart should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.clusterStart()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.clusterStop should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.clusterStop()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.clusterRestart should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.clusterRestart()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.clusterStatus should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.clusterStatus()
            .then(function(res) {
                expect(res).to.be.an("object");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.removeSessionFiles should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.removeSessionFiles("testFile")
            .then(function(res) {
                expect(res).to.be.a("string");
                expect(res).to.contains("testFile");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.removeSHM should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.removeSHM()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.getLicense should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.getLicense()
            .then(function(res) {
                expect(res).to.be.an("object");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.fileTicket should work", function(done) {
            XFTSupportTools.__testOnly__.setSendRequest();
            XFTSupportTools.fileTicket("testStr")
            .then(function(res) {
                expect(res).to.be.a("string");
                expect(res).to.contains("testStr");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            XFTSupportTools.__testOnly__.resetSendRequest();
        });
    });
});