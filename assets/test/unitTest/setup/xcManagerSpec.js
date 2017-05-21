describe("xcManager Test", function() {
    describe("Setup Fail Hanlder Test", function() {
        var handleSetupFail;
        var oldAlert;
        var oldAlertError;
        var title;

        before(function() {
            handleSetupFail = xcManager.__testOnly__.handleSetupFail;
            oldAlert = Alert.show;
            oldAlertError = Alert.error;
            Alert.show = function(options) {
                title = options.title;
            };

            Alert.error = function(error) {
                title = error;
            };
        });

        it("should handle no wkbk error", function() {
            var oldFunc = Workbook.forceShow;
            var test = false;
            Workbook.forceShow = function() { test = true; };

            handleSetupFail(WKBKTStr.NoWkbk, true);
            expect(title).to.equal(DemoTStr.title);
            expect(test).to.be.true;
            // viewLocation is created everytime,
            // so cannot cache the view first
            expect($("#viewLocation").text().includes(WKBKTStr.Location))
            .to.be.true;
            Workbook.forceShow = oldFunc;
        });

        it("should handle workbook hold error", function() {
            handleSetupFail(WKBKTStr.Hold);
            expect(title).to.equal(WKBKTStr.Hold);
            expect($("#viewLocation").text().includes(WKBKTStr.Hold))
            .to.be.true;
        });

        it("should handle session not found error", function() {
            handleSetupFail({"status": StatusT.StatusSessionNotFound});
            expect(title).to.equal(WKBKTStr.NoOldWKBK);
            expect($("#viewLocation").text().includes(WKBKTStr.NoOldWKBK))
            .to.be.true;
        });

        it("should hanlde active else where error", function() {
            handleSetupFail({
                "status": StatusT.StatusSessionUsrAlreadyExists
            });
            expect(title).to.equal(ThriftTStr.SessionElsewhere);
            expect($("#viewLocation").text().includes(ThriftTStr.SessionElsewhere))
            .to.be.true;
        });

        it("should hanlde random error", function() {
            handleSetupFail("test");
            expect(title).to.equal(ThriftTStr.SetupErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde expire error", function() {
            handleSetupFail({"error": "expired"});
            expect(title).to.equal(ThriftTStr.SetupErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde update error", function() {
            handleSetupFail({"error": "Update required"});
            expect(title).to.equal(ThriftTStr.UpdateErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde connection error", function() {
            handleSetupFail({"error": "Connection"});
            expect(title).to.equal(ThriftTStr.CCNBEErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde other error from backend", function() {
            handleSetupFail({"error": "test"});
            expect(title).to.equal(ThriftTStr.SetupErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        after(function() {
            Alert.show = oldAlert;
            Alert.error = oldAlertError;
        });
    });

    describe("Public API Test", function() {
        it("xcManager.isInSetup should work", function() {
            $("body").addClass("xc-setup");
            expect(xcManager.isInSetup()).to.be.true;
            $("body").removeClass("xc-setup");
            expect(xcManager.isInSetup()).to.be.false;
        });

        it("xcManager.getStatus should work", function() {
            expect(xcManager.getStatus()).to.equal(SetupStatus.Success);
        });

        it("xcManager.removeUnloadPrompt should work", function() {
            var beforunload = window.onbeforeunload;
            var unload = window.onunload;

            xcManager.removeUnloadPrompt();
            expect(window.onbeforeunload).not.to.equal(beforunload);
            expect(window.onunload).not.to.equal(unload);

            window.onbeforeunload = beforunload;
            window.onunload = unload;
        });
    });

    describe("User Box Test", function() {
        var $menu;

        before(function() {
            $menu = $("#userMenu");
        });

        it("should click username area to open dropdown", function() {
            $("#userNameArea").click();
            assert.isTrue($menu.is(":visible"));

            $("#userNameArea").click();
            assert.isFalse($menu.is(":visible"));
        });

        it("should mouseup .help to open help tab", function() {
            // normal mouseup not work
            $menu.find(".help").mouseup();
            expect($("#bottomMenu").hasClass("open")).to.be.false;
            $menu.find(".help").trigger(fakeEvent.mouseup);
            expect($("#bottomMenu").hasClass("open")).to.be.true;
            expect($("#helpSection").hasClass("active")).to.be.true;

            // close bottomo menu
            $("#bottomMenu .close").click();
        });

        it("should mouseup .about to open about modal", function() {
            var oldFunc = AboutModal.show;
            var test = false;
            AboutModal.show = function() { test = true; };
            // normal moouseup not work
            $menu.find(".about").mouseup();
            expect(test).to.be.false;
            $menu.find(".about").trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            AboutModal.show = oldFunc;
        });

        it("should mouseup logout button to sign out", function() {
            var oldFunc = xcManager.unload;
            var test = false;
            xcManager.unload = function() { test = true; };
            // normal moouseup not work
            $("#logout").mouseup();
            expect(test).to.be.false;
            $("#logout").trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            xcManager.unload = oldFunc;
        });

        it("should trigger meomryAlert with table", function() {
            var oldFunc = DeleteTableModal.show;
            var test = false;
            DeleteTableModal.show = function() {
                test = true;
            };
            $("#memoryAlert").addClass("yellow")
                             .addClass("tableAlert")
                             .click();
            expect(test).to.be.true;
            DeleteTableModal.show = oldFunc;
        });

        it("should trigger meomryAlert with ds", function() {
            $("#memoryAlert").addClass("yellow")
                             .removeClass("tableAlert")
                             .click();
            expect($("#mainMenu").hasClass("open")).to.be.true;
            expect($("#datastoreMenu").hasClass("active")).to.be.true;
            // close menu
            $("#datastoreMenu .minimizeBtn").click();
            $("#memoryAlert").removeClass("yellow");
        });
    });

    describe("Mouse Wheel Reimplement Test", function() {
        var reImplementMouseWheel;
        var $e;

        before(function() {
            reImplementMouseWheel = xcManager.__testOnly__.reImplementMouseWheel;
            var text = "a".repeat(50);
            $e = $('<div id="test">' + text + '</div>');
            $e.css({
                "width": "10px",
                "height": "10px",
                "white-space": "nowrap",
                "overflow": "scroll"
            }).prependTo($("#container"));
        });

        afterEach(function() {
            $e.scrollLeft(0);
            $e.scrollTop(0);
        });

        it("should scroll left and top", function() {
            var e = {
                "originalEvent": {
                    "wheelDeltaX": -10,
                    "wheelDeltaY": -5
                },
                "target": $e.get(0)
            };
            reImplementMouseWheel(e);
            expect($e.scrollLeft()).to.equal(10);
            expect($e.scrollTop()).to.equal(5);
        });

        it("should scroll left and top test 2", function() {
            $e.scrollLeft(10);
            $e.scrollTop(10);

            var e = {
                "originalEvent": {
                    "wheelDeltaX": "test",
                    "wheelDeltaY": "test"
                },
                "deltaX": -5,
                "deltaY": 3,
                "target": $e.get(0)
            };
            reImplementMouseWheel(e);
            expect($e.scrollLeft()).to.equal(5);
            expect($e.scrollTop()).to.equal(7);
        });

        it("should scroll when is dataTable", function() {
            $e.addClass("dataTable");
            var e = {
                "originalEvent": {
                    "wheelDeltaX": -10,
                    "wheelDeltaY": -5
                },
                "target": $e.get(0)
            };
            reImplementMouseWheel(e);
            expect($e.scrollLeft()).to.equal(0);
            expect($e.scrollTop()).to.equal(0);
        });

        it("should scroll when is dataTable test 2", function() {
            $e.addClass("dataTable");
            var e = {
                "originalEvent": {
                    "wheelDeltaX": -10,
                    "wheelDeltaY": -20
                },
                "target": $e.get(0)
            };
            reImplementMouseWheel(e);
            expect($e.scrollLeft()).to.equal(0);
            expect($e.scrollTop()).to.equal(9);
        });

        after(function() {
            $e.remove();
        });
    });

    describe("oneTimeSetup Test", function() {
        var oldKeyLookup;
        var oldKeyPut;
        var oldInitLock;
        var oldTryLock;
        var oldUnLock;
        var oneTimeSetup;
        var keyMap = {};

        before(function() {
            oldKeyLookup = XcalarKeyLookup;
            oldKeyPut = XcalarKeyPut;
            oldInitLock = Concurrency.initLock;
            oldTryLock = Concurrency.tryLock;
            oldUnLock = Concurrency.unlock;
            oneTimeSetup = xcManager.__testOnly__.oneTimeSetup;
            UnitTest.onMinMode();
            Support.stopHeartbeatCheck();

            XcalarKeyPut = function(key, value) {
                keyMap[key] = value;
                return PromiseHelper.resolve();
            };

            Concurrency.initLock = function() {
                return PromiseHelper.resolve();
            };

            Concurrency.tryLock = function() {
                return PromiseHelper.resolve("testLockStr");
            };

            Concurrency.unlock = function() {
                return PromiseHelper.resolve();
            };
        });

        beforeEach(function() {
            keyMap = {}; // reset
        });

        it("should resolve if already initialized", function(done) {
            XcalarKeyLookup = function() {
                return PromiseHelper.resolve({
                    "value": InitFlagState.AlreadyInit
                });
            };

            oneTimeSetup()
            .then(function() {
                // nothing happened
                expect(Object.keys(keyMap).length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should still resolve in fail case", function(done) {
            XcalarKeyLookup = function() {
                return PromiseHelper.reject("test");
            };

            oneTimeSetup()
            .then(function() {
                // nothing happened
                expect(Object.keys(keyMap).length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should go through normal setup case", function(done) {
            XcalarKeyLookup = function() {
                return PromiseHelper.resolve();
            };

            oneTimeSetup()
            .then(function() {
                expect(Object.keys(keyMap).length).to.equal(1);
                expect(keyMap[GlobalKVKeys.InitFlag])
                .to.equal(InitFlagState.AlreadyInit);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should force unlock", function(done) {
            var curTryLock = Concurrency.tryLock;
            Concurrency.tryLock = function() {
                return PromiseHelper.reject(ConcurrencyEnum.OverLimit);
            };

            var promise = oneTimeSetup();
            var checkFunc = function() {
                return $("#alertModal").is(":visible");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $btn = $("#alertModal").find(".force");
                expect($btn.length).to.equal(1);
                $btn.click();
            })
            .fail(function() {
                done("fail");
            });

            promise
            .then(function() {
                expect(Object.keys(keyMap).length).to.equal(2);
                expect(keyMap[GlobalKVKeys.InitFlag])
                .to.equal(InitFlagState.AlreadyInit);
                expect(keyMap[GlobalKVKeys.XdFlag]).to.equal("0");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Concurrency.tryLock = curTryLock;
                $("#initialLoadScreen").hide();
            });
        });

        it("should reftry unlock", function(done) {
            var curTryLock = Concurrency.tryLock;
            var curKeyLookUp = XcalarKeyLookup;

            Concurrency.tryLock = function() {
                return PromiseHelper.reject();
            };

            var promise = oneTimeSetup();
            var checkFunc = function() {
                return $("#alertModal").is(":visible");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                XcalarKeyLookup = function() {
                    return PromiseHelper.resolve({
                        "value": InitFlagState.AlreadyInit
                    });
                };

                var $btn = $("#alertModal").find(".retry");
                expect($btn.length).to.equal(1);
                $btn.click();
            })
            .fail(function() {
                done("fail");
            });

            promise
            .then(function() {
                expect(Object.keys(keyMap).length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Concurrency.tryLock = curTryLock;
                XcalarKeyLookup = curKeyLookUp;
                $("#initialLoadScreen").hide();
            });
        });

        after(function() {
            XcalarKeyLookup = oldKeyLookup;
            XcalarKeyPut = oldKeyPut;
            Concurrency.initLock = oldInitLock;
            Concurrency.tryLock = oldTryLock;
            Concurrency.unlock = oldUnLock;

            UnitTest.offMinMode();
            Support.restartHeartbeatCheck();
        });
    });
});
