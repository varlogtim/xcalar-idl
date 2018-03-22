describe("xcManager Test", function() {
    before(function() {
        console.clear();
    });

    describe("Setup Fail Hanlder Test", function() {
        var handleSetupFail;
        var oldAlert;
        var oldAlertError;
        var title;
        var oldSocketInit;

        before(function() {
            handleSetupFail = xcManager.__testOnly__.handleSetupFail;
            oldAlert = Alert.show;
            oldAlertError = Alert.error;
            oldSocketInit = XcSocket.init;
            Alert.show = function(options) {
                title = options.title;
            };

            Alert.error = function(error) {
                title = error;
            };

            XcSocket.init = function(){};
        });

        it("should handle no wkbk error", function(done) {
            var oldFunc = WorkbookPanel.forceShow;
            var test = false;
            WorkbookPanel.forceShow = function() { test = true; };
            var oldHold = XcSupport.holdSession;
            XcSupport.holdSession = function() {
                return PromiseHelper.resolve();
            };

            handleSetupFail(WKBKTStr.NoWkbk, true);
            UnitTest.testFinish(function() {
                return title === DemoTStr.title;
            })
            .then(function() {
               expect(title).to.equal(DemoTStr.title);
                expect(test).to.be.true;
                // viewLocation is created everytime,
                // so cannot cache the view first
                expect($("#viewLocation").text().includes(WKBKTStr.Location))
                .to.be.true;
                WorkbookPanel.forceShow = oldFunc;
                XcSupport.holdSession = oldHold;
                done();
            })
            .fail(function() {
                done("fail");
            });
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
            XcSocket.init = oldSocketInit;
        });
    });

    describe("Basic Function Test", function() {
        it("restoreActiveTable should work", function(done) {
            var oldFunc = TblManager.parallelConstruct;
            var test = false;
            TblManager.parallelConstruct = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            var tableId = xcHelper.randName("test");
            var table = new TableMeta({
                tableName: tableId,
                tableId: tableId
            });

            table.getMetaAndResultSet = function() {
                return PromiseHelper.resolve();
            };

            gTables[tableId] = table;

            var failures = [];
            xcManager.__testOnly__.restoreActiveTable(tableId, null, failures)
            .then(function() {
                expect(table.status).to.equal(TableType.Active);
                expect(failures.length).to.equal(0);
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                delete gTables[tableId];
                TblManager.parallelConstruct = oldFunc;
            });
        });

        it("restoreActiveTable should handle fail case", function(done) {
            var oldFunc = WSManager.removeTable;
            var test = false;
            WSManager.removeTable = function() { test = true; };
            var tableId = xcHelper.randName("test");
            var table = new TableMeta({
                tableName: tableId,
                tableId: tableId
            });

            table.getMetaAndResultSet = function() {
                return PromiseHelper.reject({error: "test"});
            };
            gTables[tableId] = table;

            var failures = [];
            xcManager.__testOnly__.restoreActiveTable(tableId, null, failures)
            .then(function() {
                expect(table.status).to.equal(TableType.Orphan);
                expect(failures.length).to.equal(1);
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                delete gTables[tableId];
                WSManager.removeTable = oldFunc;
            });
        });

        it("window.error should work", function() {
            var oldFunc = Log.errorLog;
            var $target = $('<div>testDiv</div>');
            gMouseEvents.setMouseDownTarget($target);
            var info = null;
            Log.errorLog = function(arg1, arg2, arg3, arg4) {
                info = arg4;
            },
            window.onerror("test");
            expect(info).to.be.an("object");
            expect(info.error).to.be.equal("test");
            expect(info.lastMouseDown).not.to.be.null;
            // clear up
            Log.errorLog = oldFunc;
        });

        it("window.beforeunload should work", function() {
            var oldUnLoad = xcManager.unload;
            var oldLogCheck = Log.hasUncommitChange;

            xcManager.unload = function() {};
            Log.hasUncommitChange = function() { return true; };

            var res = window.onbeforeunload();
            expect(res).to.equal(CommonTxtTstr.LogoutWarn);

            xcManager.unload = oldUnLoad;
            Log.hasUncommitChange = oldLogCheck;
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
            expect(xcManager.getStatus()).to.equal("Success");
        });

        it("xcManager.isStatusFail should work", function() {
            expect(xcManager.isStatusFail()).to.be.false;
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

        it("xcManager.unload should work in async case", function() {
            var oldFree = TblManager.freeAllResultSets;
            var test;
            TblManager.freeAllResultSets = function() { test = true; };

            xcManager.unload(true);
            expect(test).to.be.true;
            TblManager.freeAllResultSets = oldFree;
        });

        it("xcManager.unload should work in sync case", function(done) {
            xcManager.__testOnly__.fakeLogoutRedirect();

            var oldFree = TblManager.freeAllResultSetsSync;
            var oldRelease =  XcSupport.releaseSession;
            var oldRemove = xcManager.removeUnloadPrompt;
            var test2, test3, test4;
            TblManager.freeAllResultSetsSync = function() {
                test2 = true;
                return PromiseHelper.resolve();
            };
            XcSupport.releaseSession = function() {
                test3 = true;
                return PromiseHelper.resolve();
            };
            xcManager.removeUnloadPrompt = function() { test4 = true; };

            xcManager.unload(false, false);

            UnitTest.testFinish(function() {
                return test4 === true;
            })
            .then(function() {
                expect(test2).to.be.true;
                expect(test3).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                TblManager.freeAllResultSetsSync = oldFree;
                XcSupport.releaseSession = oldRelease;
                xcManager.removeUnloadPrompt = oldRemove;
                xcManager.__testOnly__.resetLogoutRedirect();
            });
        });

        it("xcManager.forceLogout should work", function() {
            xcManager.__testOnly__.fakeLogoutRedirect();
            var oldFunc = xcManager.removeUnloadPrompt;
            var test = false;
            xcManager.removeUnloadPrompt = function() { test = true; };

            xcManager.forceLogout();
            expect(test).to.be.true;

            // clear up
            xcManager.removeUnloadPrompt = oldFunc;
            xcManager.__testOnly__.resetLogoutRedirect();
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
            // clear up
            AboutModal.show = oldFunc;
        });

        it("should mouseup .setup to open setup panel", function() {
            var oldSetup = WorkbookPanel.goToSetup;
            var oldOpenPanel = MainMenu.openPanel;
            var oldOpen = MainMenu.open;
            var test1 = test2 = test3 = false;
            var noWorkbook = $("#container").hasClass("noWorkbook");

            WorkbookPanel.goToSetup = function() { test1 = true; };
            MainMenu.openPanel = function() { test2 = true; };
            MainMenu.open = function() { test3 = true; };

            // normal moouseup not work
            $menu.find(".setup").mouseup();
            expect(test1).to.be.false;
            expect(test2).to.be.false;
            expect(test3).to.be.false;

            // case 1
            $("#container").addClass("noWorkbook");
            $menu.find(".setup").trigger(fakeEvent.mouseup);
            expect(test1).to.be.true;
            expect(test2).to.be.false;
            expect(test3).to.be.false;

            // case 2
            test1 = false;
            $("#container").removeClass("noWorkbook");
            $menu.find(".setup").trigger(fakeEvent.mouseup);
            expect(test1).to.be.false;
            expect(test2).to.be.true;
            expect(test3).to.be.true;

            // clear up
            WorkbookPanel.goToSetup = oldSetup;
            MainMenu.openPanel = oldOpenPanel;
            MainMenu.open = oldOpen;
            if (noWorkbook) {
                $("#container").addClass("noWorkbook");
            }
        });

        it("should mouseup .liveHelp to open about modal", function() {
            var oldFunc = LiveHelpModal.show;
            var test = false;
            LiveHelpModal.show = function() { test = true; };
            // normal moouseup not work
            $menu.find(".liveHelp").mouseup();
            expect(test).to.be.false;
            $menu.find(".liveHelp").trigger(fakeEvent.mouseup);
            expect(test).to.be.true;
            // clear up
            LiveHelpModal.show = oldFunc;
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

        it("should go to workbook monitor in meomryAlert", function() {
            var oldFunc = WorkbookPanel.goToMonitor;
            var test = false;
            $("#container").addClass("switchingWkbk");
            WorkbookPanel.goToMonitor = function() { test = true; };

            $("#memoryAlert").click();
            expect(test).to.be.true;

            // clear up
            WorkbookPanel.goToMonitor = oldFunc;
            $("#container").removeClass("switchingWkbk");
        });

        it("should open meau in nromal meomryAlert", function() {
            var oldFunc = MainMenu.openPanel;
            var mainMenu, subMenu;

            MainMenu.openPanel = function(arg1, arg2) {
                mainMenu = arg1;
                subMenu = arg2;
            };

            $("#memoryAlert").removeClass("yellow red").click();
            expect(mainMenu).to.equal("monitorPanel");
            expect(subMenu).to.equal("systemButton");

            // clear up
            MainMenu.openPanel = oldFunc;
        });

        it("should click auto save to save", function(done) {
            var oldCommit = KVStore.commit;
            var oldShowSuccess = xcHelper.showSuccess;
            var test = false;
            var msg = null;

            KVStore.commit = function() {
                test = true;
                return PromiseHelper.resolve();
            };

            xcHelper.showSuccess = function(arg) { msg = arg; };

            $("#autoSaveBtn").click();

            UnitTest.testFinish(function() {
                return test;
            })
            .then(function() {
                expect(msg).to.equal(SuccessTStr.Saved);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                KVStore.commit = oldCommit;
                xcHelper.showSuccess = oldShowSuccess;
            });
        });

        it("should click to auto save handle fail case", function(done) {
            var oldCommit = KVStore.commit;
            var oldAlert = Alert.error;
            var test = false;
            var error = null;

            KVStore.commit = function() {
                test = true;
                return PromiseHelper.reject();
            };

            Alert.error = function(arg) { error = arg; };

            $("#autoSaveBtn").click();

            UnitTest.testFinish(function() {
                return test;
            })
            .then(function() {
                expect(error).to.equal(AlertTStr.Error);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                KVStore.commit = oldCommit;
                Alert.error = oldAlert;
            });
        });
    });

    describe("Global Keydown Event Test", function() {
        var key, flag;

        before(function() {
            xcManager.__testOnly__.fakeTableScroll(function(arg1, arg2) {
                key = arg1;
                flag = arg2;
                return true;
            });
        });

        beforeEach(function() {
            key = flag = null;
        });

        it("should trigger page up", function() {
            var e = {type: "keydown", which: keyCode.PageUp};
            $(document).trigger(e);
            expect(key).to.equal("pageUpdown");
            expect(flag).to.be.true;
        });

        it("should trigger space", function() {
            var e = {type: "keydown", which: keyCode.Space};
            $(document).trigger(e);
            expect(key).to.equal("pageUpdown");
            expect(flag).to.be.false;
        });

        it("should trigger page down", function() {
            var e = {type: "keydown", which: keyCode.PageDown};
            $(document).trigger(e);
            expect(key).to.equal("pageUpdown");
            expect(flag).to.be.false;
        });

        it("should trigger up", function() {
            var e = {type: "keydown", which: keyCode.Up};
            $(document).trigger(e);
            expect(key).to.equal("updown");
            expect(flag).to.be.true;
        });

        it("should trigger down", function() {
            var e = {type: "keydown", which: keyCode.Down};
            $(document).trigger(e);
            expect(key).to.equal("updown");
            expect(flag).to.be.false;
        });

        it("should trigger home", function() {
            var e = {type: "keydown", which: keyCode.Home};
            $(document).trigger(e);
            expect(key).to.equal("homeEnd");
            expect(flag).to.be.true;
        });

        it("should trigger home", function() {
            var e = {type: "keydown", which: keyCode.End};
            $(document).trigger(e);
            expect(key).to.equal("homeEnd");
            expect(flag).to.be.false;
        });

        after(function() {
            xcManager.__testOnly__.resetFakeScroll();
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
            XcSupport.stopHeartbeatCheck();

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
            XcSupport.restartHeartbeatCheck();
        });
    });
});
