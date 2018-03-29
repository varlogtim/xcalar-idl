describe("WorkbookManager Test", function() {
    var oldKVGet, oldKVPut, oldKVDelete;
    var oldXcalarPut, oldXcalarDelete;
    var oldJupyterNewWkbk;
    var fakeMap = {};

    before(function() {
        console.clear();
        UnitTest.onMinMode();
        oldKVGet = KVStore.get;
        oldKVPut = KVStore.put;
        oldKVDelete = KVStore.delete;
        oldXcalarPut = XcalarKeyPut;
        oldXcalarDelete = XcalarKeyDelete;
        oldJupyterNewWkbk = JupyterPanel.newWorkbook;

        XcalarKeyPut = function(key, value) {
            fakeMap[key] = value;
            return PromiseHelper.resolve();
        };

        XcalarKeyDelete = function(key) {
            delete fakeMap[key];
            return PromiseHelper.resolve();
        };

        KVStore.get = function(key) {
            return PromiseHelper.resolve(fakeMap[key]);
        };

        KVStore.put = XcalarKeyPut;

        KVStore.delete = XcalarKeyDelete;

        JupyterPanel.newWorkbook = PromiseHelper.resolve();

        generateKey = WorkbookManager.__testOnly__.generateKey;
    });

    beforeEach(function() {
        fakeMap = {};
    });

    describe("Basic Function Test", function() {
        var generateKey;

        before(function() {
            generateKey = WorkbookManager.__testOnly__.generateKey;
        });

        it("setupWorkbooks should handle error case", function(done) {
            var oldFunc = WorkbookManager.getWKBKsAsync;
            WorkbookManager.getWKBKsAsync = function() {
                return PromiseHelper.reject("test");
            };

            WorkbookManager.__testOnly__.setupWorkbooks()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                WorkbookManager.getWKBKsAsync = oldFunc;
            });
        });

        it("generateKey should work", function() {
            var res = generateKey();
            expect(res).not.to.exist;
            // case 2
            res = generateKey("a", "b");
            expect(res).to.equal("a-b");
        });

        it("getWKBKId should work", function() {
            var res = WorkbookManager.__testOnly__.getWKBKId("test");
            expect(res).to.equal(XcSupport.getUser() + "-wkbk-test");
        });

        it("delWKBKHelper should work", function(done) {
            var wkbkId = "testId";
            var storageKey = generateKey(wkbkId, "gInfo", currentVersion);

            fakeMap[storageKey] = "testVal";

            WorkbookManager.__testOnly__.delWKBKHelper(wkbkId)
            .then(function() {
                expect(fakeMap).not.to.ownProperty(storageKey);
                fakeMap = {};
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("delWKBKHelper should fail when error", function(done) {
            var oldFunc = XcalarKeyDelete;
            XcalarKeyDelete = function() {
                return PromiseHelper.reject("testError");
            };

            WorkbookManager.__testOnly__.delWKBKHelper()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("testError");
                done();
            })
            .always(function() {
                XcalarKeyDelete = oldFunc;
            });
        });

        it("copyHelper should work", function(done) {
            var oldId = "oldId";
            var newId = "newId";
            var keys = ["gInfo", "gLog", "gErr"];


            fakeMap = {};
            keys.forEach(function(key) {
                var oldKey = generateKey(oldId, key, currentVersion);
                fakeMap[oldKey] = "testVal";
            });

            WorkbookManager.__testOnly__.copyHelper(oldId, newId)
            .then(function() {
                expect(Object.keys(fakeMap).length)
                .to.equal(keys.length * 2);

                keys.forEach(function(key) {
                    var newKey = generateKey(newId, key, currentVersion);
                    expect(fakeMap).to.ownProperty(newKey);
                });

                fakeMap = {};
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("resetActiveWKBK should work", function(done) {
            var oldSetup = KVStore.setup;
            var oldHold = XcSupport.holdSession;
            var test = false;

            KVStore.setup = function() {};

            XcSupport.holdSession = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            // use the current workbook id
            // to make sure actieve workbook has no chagne
            var wkbkId = WorkbookManager.getActiveWKBK();
            WorkbookManager.__testOnly__.resetActiveWKBK(wkbkId)
            .then(function() {
                expect(test).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                KVStore.setup = oldSetup;
                XcSupport.holdSession = oldHold;
            });
        });

        it("saveWorkbook should work", function(done) {
            WorkbookManager.__testOnly__.saveWorkbook()
            .then(function() {
                var keys = Object.keys(fakeMap);
                expect(keys.length).to.equal(1);
                fakeMap = {};
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("syncSessionInfo should handle error case", function(done) {
            WorkbookManager.__testOnly__.syncSessionInfo(null, null)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("syncSessionInfo should handle no workbok case", function(done) {
            var sessionInfo = {
                "numSessions": 0,
                "sessions": []
            };
            WorkbookManager.__testOnly__.syncSessionInfo(null, sessionInfo)
            .then(function(storedActiveId) {
                expect(storedActiveId).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("switchWorkBookHelper should handle fail case", function(done) {
            var oldActivate = XcalarActivateWorkbook;
            var oldList = XcalarListWorkbooks;

            XcalarActivateWorkbook = function() {
                return PromiseHelper.reject("test");
            };

            XcalarListWorkbooks = function() {
                return PromiseHelper.resolve({
                    "sessions": [{
                        "state": "Active",
                        "info": "has resources"
                    }]
                });
            };

            WorkbookManager.__testOnly__.switchWorkBookHelper("to")
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarActivateWorkbook = oldActivate;
                XcalarListWorkbooks = oldList;
            });
        });

        it("progressCycle should work", function(done) {
            var fnCalled = false;
            var cachedQueryState = XcalarQueryState;
            XcalarQueryState = function() {
                fnCalled = true;
                return PromiseHelper.resolve({
                    numCompletedWorkItem: 2,
                    queryGraph: {
                        numNodes: 4,
                        node: [{
                            state: DgDagStateT.DgDagStateReady
                        }, {
                            state: DgDagStateT.DgDagStateReady
                        }, {
                            state: DgDagStateT.DgDagStateProcessing,
                            api: 15,
                            numWorkCompleted: 2,
                            numWorkTotal: 5
                        }, {
                            state: 0
                        }]
                    }
                });
            };
            WorkbookManager.__testOnly__.changeIntTime(200);
            var cycle = WorkbookManager.__testOnly__.progressCycle;
            cycle("testName", 200);

            UnitTest.testFinish(function() {
                return fnCalled === true;
            })
            .then(function() {
                expect($("#initialLoadScreen").hasClass("sessionProgress")).to.be.true;
                expect($("#initialLoadScreen .numSteps").text()).to.equal("2/4");
                expect($("#initialLoadScreen .progressBar").data("pct")).to.equal(40);

                XcalarQueryState = cachedQueryState;
                WorkbookManager.__testOnly__.endProgressCycle();
                expect($("#initialLoadScreen").hasClass("sessionProgress")).to.be.false;
                WorkbookManager.__testOnly__.changeIntTime(2000);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("count down should work", function(done) {
            var $topBar = $("#monitorTopBar");
            $topBar.attr("id", "monitorTopBar2");
            $fakeBar = $('<div id="monitorTopBar"><div class="wkbkTitle"></div></div>');
            $fakeBar.appendTo($("body"));
            expect($("#monitorTopBar").find(".wkbkTitle").is(":visible"));

            WorkbookManager.__testOnly__.countdown()
            .always(function() {
                var msg = xcHelper.replaceMsg(WKBKTStr.Refreshing, {
                    time: 1
                });
                expect($("#monitorTopBar").find(".wkbkTitle").text())
                .to.equal(msg);
                done();
            });

            // clear up
            $fakeBar.remove();
            $topBar.attr("id", "monitorTopBar");
        });
    });

    describe("Basic Public Api Test", function() {
        it("WorkbookManager.getWorkbooks should work", function() {
            var workbooks = WorkbookManager.getWorkbooks();
            expect(workbooks).to.be.an("object");
        });

        it("WorkbookManager.getWorkbook should work", function() {
            // error case
            var res = WorkbookManager.getWorkbook(null);
            expect(res).to.be.null;
            // normal
            var wkbkId = WorkbookManager.getActiveWKBK();
            res = WorkbookManager.getWorkbook(wkbkId);
            expect(res).not.to.be.null;
        });

        it("WorkbookManager.getWKBKsAsync should work", function(done) {
            WorkbookManager.getWKBKsAsync()
            .then(function(wkbk, sessionInfo) {
                expect(wkbk).not.to.be.null;
                expect(sessionInfo).not.to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("WorkbookManager.getActiveWKBK should work", function() {
            var wkbkId = WorkbookManager.getActiveWKBK();
            expect(wkbkId).to.be.a("string");
        });

        it("WorkbookManager.updateWorksheet should work", function() {
            var wkbkId = WorkbookManager.getActiveWKBK();
            var workbook = WorkbookManager.getWorkbook(wkbkId);
            var oldNum = workbook.numWorksheets;

            WorkbookManager.updateWorksheet(100);
            expect(workbook.numWorksheets).to.equal(100);
            workbook.numWorksheets = oldNum;
        });

        it("WorkbookManager.updateDescription should work", function(done) {
            var wkbkId = WorkbookManager.getActiveWKBK();
            var workbook = WorkbookManager.getWorkbook(wkbkId);
            var oldDescription = workbook.description;
            var description = xcHelper.randName("description");

            WorkbookManager.updateDescription(wkbkId, description)
            .then(function() {
                expect(workbook.description).to.equal(description);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                workbook.description = oldDescription;
            });
        });

        it("WorkbookManager.getStorageKey should work", function() {
            var res = WorkbookManager.getStorageKey("test");
            expect(res).to.equal("test-gInfo-" + currentVersion);
        });
    });

    describe("Upgrade API Test", function() {
        it("WorkbookManager.getGlobalScopeKeys should work", function() {
            var res = WorkbookManager.getGlobalScopeKeys();
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).to.equal(3);
            expect(res).to.ownProperty("gEphStorageKey");
            expect(res).to.ownProperty("gSettingsKey");
            expect(res).to.ownProperty("gSharedDSKey");
        });

        it("WorkbookManager.upgrade should work", function() {
            // case 1
            var res = WorkbookManager.upgrade(null);
            expect(res).to.be.null;

            // case 2
            var wkbks = WorkbookManager.getWorkbooks();
            res = WorkbookManager.upgrade(wkbks);
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).
            to.equal(Object.keys(wkbks).length);
        });

        it("WorkbookManager.getKeysForUpgrade should work", function() {
            var version = currentVersion;
            var sessionInfo = {
                "numSessions": 1,
                "sessions": [{
                    "name": "test"
                }]
            };

            var res = WorkbookManager.getKeysForUpgrade(sessionInfo, version);
            expect(res).to.be.an("object");
            expect(res).to.have.property("global");
            expect(res).to.have.property("user");
            expect(res).to.have.property("wkbk");
        });
    });

    describe("Cancel Workbook Replay Test", function() {
        var $loadScreen;
        before(function() {
            $loadScreen = $("#initialLoadScreen");
        });

        it("should not show alert if already canceling", function() {
            $loadScreen.addClass("canceling");
            $loadScreen.find(".cancel").click();
            assert.isFalse($("#alertModal").is(":visible"));
            $loadScreen.removeClass("canceling");
        });

        it("should show alert", function() {
            $loadScreen.find(".cancel").click();
            UnitTest.hasAlertWithTitle(WKBKTStr.CancelTitle);
        });

        it("should show alert and confirm", function() {
            var oldCancel = XcalarQueryCancel;
            var test = false;
            XcalarQueryCancel = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            $loadScreen.find(".cancel").click();
            UnitTest.hasAlertWithTitle(WKBKTStr.CancelTitle, {
                "confirm": true
            });

            expect(test).to.equal(true);
            XcalarQueryCancel = oldCancel;
        });
    });

    describe("Advanced API Test", function() {
        var testWkbkName;
        var testWkbkId;
        var oldActiveWkbkId;

        var oldRemoveUnload;
        var oldReload;
        var oldActivate;
        var oldDeactive;

        before(function() {
            testWkbkName = xcHelper.randName("testWkbk");
            oldActiveWkbkId = WorkbookManager.getActiveWKBK();

            oldRemoveUnload = xcManager.removeUnloadPrompt;
            oldReload = xcHelper.reload;
            // switch is slow, so use a fake one
            oldActivate = XcalarActivateWorkbook;
            oldDeactive = XcalarDeactivateWorkbook;
            xcManager.removeUnloadPrompt = function() {};
            xcHelper.reload = function() {};
            XcalarActivateWorkbook = function() {
                return PromiseHelper.resolve();
            };

            XcalarDeactivateWorkbook = function() {
                return PromiseHelper.resolve();
            };
        });

        it("Should not new workbook with invalid name", function(done) {
            WorkbookManager.newWKBK(null, "testId")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.equal("Invalid name");
                done();
            });
        });

        it("Should not new workbook with invalid srcId", function(done) {
            var srcId = xcHelper.randName("errorId");
            WorkbookManager.newWKBK(testWkbkName, srcId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.equal("missing workbook meta");
                done();
            });
        });

        it("Should reject if new workbook error", function(done) {
            var oldFunc = XcalarNewWorkbook;
            XcalarNewWorkbook = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            WorkbookManager.newWKBK(testWkbkName)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.be.equal("test");
                done();
            })
            .always(function() {
                XcalarNewWorkbook = oldFunc;
            });
        });

        it("Should create new workbook", function(done) {
            var wkbkSet = WorkbookManager.getWorkbooks();
            var len = Object.keys(wkbkSet).length;

            WorkbookManager.newWKBK(testWkbkName)
            .then(function(id) {
                expect(id).not.to.be.null;
                testWkbkId = id;

                var newLen = Object.keys(wkbkSet).length;
                expect(newLen).to.equal(len + 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("copy workbook should handle fail case", function(done) {
            var oldFunc = KVStore.commit;
            KVStore.commit = function() {
                return PromiseHelper.reject("test");
            };
            WorkbookManager.copyWKBK()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                KVStore.commit = oldFunc;
            });
        });

        it("Should copy workbook", function(done) {
            var oldNewWorkbook = WorkbookManager.newWKBK;

            WorkbookManager.newWKBK = function() {
                return PromiseHelper.resolve("testId");
            };

            WorkbookManager.copyWKBK()
            .then(function(id) {
                expect(id).to.equal("testId");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                WorkbookManager.newWKBK = oldNewWorkbook;
            });
        });

        it("Should not rename if newId exists", function(done) {
            var activeWkbkId = WorkbookManager.getActiveWKBK();
            var activeWkbk = WorkbookManager.getWorkbook(activeWkbkId);
            var newName = activeWkbk.getName();

            WorkbookManager.renameWKBK(testWkbkId, newName)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                var errStr = xcHelper.replaceMsg(ErrTStr.WorkbookExists,
                                             {'workbookName': newName});
                expect(error).to.equal(errStr);
                done();
            });
        });

        it("Should rename workbook", function(done) {
            var newName = xcHelper.randName("newName");
            WorkbookManager.renameWKBK(testWkbkId, newName)
            .then(function(newId) {
                expect(WorkbookManager.getWorkbook(testWkbkId)).to.be.null;
                expect(newId).not.to.be.null;
                var workbook = WorkbookManager.getWorkbook(newId);
                expect(workbook).not.to.be.null;
                expect(workbook.getName()).to.equal(newName);
                testWkbkId = newId;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should reject if switch with wrong id", function(done) {
            WorkbookManager.switchWKBK(null)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal("Invalid workbook Id");
                done();
            });
        });

        it("Should reject if switch to active workbook", function(done) {
            var activeWkbk = WorkbookManager.getActiveWKBK();
            WorkbookManager.switchWKBK(activeWkbk)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal("Cannot switch to same workbook");
                done();
            });
        });

        it("should reject if have error case", function(done) {
            var oldCommit = KVStore.commit;
            KVStore.commit = function() {
                return PromiseHelper.reject("test");
            };

            WorkbookManager.switchWKBK(testWkbkId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.equal("test");
                done();
            })
            .always(function() {
                KVStore.commit = oldCommit;
            });
        });

        it("should hand switch fail case", function(done) {
            var oldFunc = XcalarActivateWorkbook;
            XcalarActivateWorkbook = function() {
                return PromiseHelper.reject("test");
            };
            WorkbookManager.__testOnly__.setAcitiveWKBKId(null);

            WorkbookManager.switchWKBK(testWkbkId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                XcalarActivateWorkbook = oldFunc;
                WorkbookManager.__testOnly__.restoreWKBKId();
            });
        });

        it("Should switch workbook", function(done) {
            WorkbookManager.switchWKBK(testWkbkId)
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.equal(testWkbkId);
                assert.isTrue($("#initialLoadScreen").is(":visible"));
                $("#initialLoadScreen").hide();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should inactive all workbook", function(done) {
            WorkbookManager.inActiveAllWKBK()
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should switch back of workbook", function(done) {
            WorkbookManager.switchWKBK(oldActiveWkbkId)
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.equal(oldActiveWkbkId);
                assert.isTrue($("#initialLoadScreen").is(":visible"));
                $("#initialLoadScreen").hide();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not delete workbook in error case", function(done) {
            var errorId = xcHelper.randName("errorId");

            WorkbookManager.deleteWKBK(errorId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(WKBKTStr.DelErr);
                done();
            });
        });

        it("Should delete workbook", function(done) {
            var wkbkSet = WorkbookManager.getWorkbooks();
            var len = Object.keys(wkbkSet).length;

            WorkbookManager.deleteWKBK(testWkbkId)
            .then(function() {
                var newLen = Object.keys(wkbkSet).length;
                expect(newLen).to.equal(len - 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject deactivate workbbok inn error", function(done) {
            WorkbookManager.deactivate("test")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(WKBKTStr.DeactivateErr);
                done();
            });
        });

        it("Should deactivate workbook", function(done) {
            WorkbookManager.deactivate(oldActiveWkbkId)
            .then(function() {
                var wkbk = WorkbookManager.getWorkbook(oldActiveWkbkId);
                expect(wkbk.hasResource()).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should switch back of workbook", function(done) {
            WorkbookManager.switchWKBK(oldActiveWkbkId)
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.equal(oldActiveWkbkId);
                assert.isTrue($("#initialLoadScreen").is(":visible"));
                $("#initialLoadScreen").hide();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            xcManager.removeUnloadPrompt = oldRemoveUnload;
            xcHelper.reload = oldReload;
            XcalarActivateWorkbook = oldActivate;
            XcalarDeactivateWorkbook = oldDeactive;
        });
    });

    after(function() {
        KVStore.get = oldKVGet;
        KVStore.put = oldKVPut;
        KVStore.delete = oldKVDelete;
        XcalarKeyPut = oldXcalarPut;
        XcalarKeyDelete = oldXcalarDelete;
        UnitTest.offMinMode();
        JupyterPanel.newWorkbook = oldJupyterNewWkbk;
    });
});
