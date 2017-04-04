describe("XFTSupportTools Test", function() {
    describe("XFTSupportTools Send Request Test", function() {
        var sendRequest;
        var oldAjax;

        before(function() {
            sendRequest = XFTSupportTools.__testOnly__.sendRequest;
            oldAjax = $.ajax;
        });

        it("should send request", function(done) {
            $.ajax = function(options) {
                var data = btoa("test");
                options.success({"logs": data});
            };

            sendRequest("POST", "testURL")
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(res.logs).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle send request error case 1", function(done) {
            $.ajax = function(options) {
                var data = btoa("test");
                options.error({"responseJSON": {"logs": data}});
            };

            sendRequest("POST", "testURL")
            .then(function() {
                done("fail");
            })
            .fail(function(res) {
                expect(res).to.be.an("object");
                expect(res.logs).to.equal("test");
                done();
            });
        });

        it("should handle send request error case 2", function(done) {
            $.ajax = function(options) {
                options.error({
                    "status": "testStatus",
                    "statusText": "testText"
                });
            };

            sendRequest("POST", "testURL")
            .then(function() {
                done("fail");
            })
            .fail(function(res) {
                expect(res).to.be.an("object");
                expect(res.status).to.equal("testStatus");
                expect(res.logs).to.equal("testText");
                expect(res.unexpectedError).to.be.true;
                done();
            });
        });

        after(function() {
            $.ajax = oldAjax;
        });
    });

    describe("XFTSupportTools API Test", function() {
        var oldAjax;

        before(function() {
            oldAjax = $.ajax;
            $.ajax = function(options) {
                options = options || {};
                options.success(options.data);
            };
        });

        it("XFTSupportTools.getRecentLogs should work", function(done) {
            XFTSupportTools.getRecentLogs(10)
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
            var cache = $.ajax;
            $.ajax = function(options) {
                options.success({"updatedLastMonitorMap": "test"});
            };
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

            XFTSupportTools.monitorLogs(null, successCallback);

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
            })
            .always(function() {
                $.ajax = cache;
            });
        });

        it("should handle fail monitor case", function(done) {
            var cache = $.ajax;
            $.ajax = function(options) {
                options.error({});
            };
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

            XFTSupportTools.monitorLogs(errCallback);

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
            })
            .always(function() {
                $.ajax = cache;
            });
        });

        it("XFTSupportTools.clusterStart should work", function(done) {
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
            XFTSupportTools.removeSessionFiles("testFile")
            .then(function(res) {
                expect(res).to.be.an("string");
                expect(res).to.contains("testFile");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("XFTSupportTools.removeSHM should work", function(done) {
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
            $.ajax = oldAjax;
        });
    });
});