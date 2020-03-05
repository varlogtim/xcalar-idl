describe("Xcalar Log Test", function() {
    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    describe("Basic Function Test", function() {
        it("isBackendOperation should work", function() {
            var isBackendOperation = Log.__testOnly__.isBackendOperation;

            var testCases = [{
                "operation": SQLOps.DestroyDS,
                "expect": true
            },{
                "operation": "Invalid operation",
                "expect": null
            }];

            testCases.forEach(function(test) {
                var args = {
                    "options": {
                        "operation": test.operation
                    }
                };
                var log = new XcLog(args);
                var res = isBackendOperation(log);
                expect(res).to.equal(test.expect);
            });
        });

        it("getUndoType should work", function() {
            var getUndoType = Log.__testOnly__.getUndoType;
            var UndoType = Log.__testOnly__.UndoType;
            var testCases = [{
                "operation": null,
                "expect": UndoType.Invalid
            },{
                "operation": SQLOps.RemoveDagTab,
                "expect": UndoType.Invalid
            },{
                "operation": SQLOps.PreviewDS,
                "expect": UndoType.Skip
            }];

            testCases.forEach(function(test) {
                var args = {
                    "options": {
                        "operation": test.operation
                    }
                };
                var xcLog = new XcLog(args);
                var res = getUndoType(xcLog);
                expect(res).to.equal(test.expect);
            });
        });

        it("getCliMachine should work", function() {
            var getCliMachine = Log.__testOnly__.getCliMachine;

            var testCases = [{
                "operation": SQLOps.DestroyDS,
                "cli": "test",
                "expect": '<span class="cliWrap" data-cli=1>test</span>'
            }];

            testCases.forEach(function(test) {
                var args = {
                    "error": test.error,
                    "cli": test.cli,
                    "options": {
                        "operation": test.operation
                    }
                };
                var xcLog = new XcLog(args);
                var res = getCliMachine(xcLog, 1);
                expect(res).to.equal(test.expect);
            });
        });

        it("getCliHTML should work", function() {
            var getCliHTML = Log.__testOnly__.getCliHTML;

            var testCases = [{
                "operation": SQLOps.PreviewDS, // cannot undoable
                "isValid": false
            }];

            testCases.forEach(function(test) {
                var args = {
                    "title": test.title,
                    "error": test.error,
                    "options": {
                        "operation": test.operation,
                        "key": test.key
                    }
                };
                var xcLog = new XcLog(args);
                var res = getCliHTML(xcLog, 1);
                if (test.isValid) {
                    expect(res).not.to.equal("");
                    var $log = $('<div>' + res + '</div>');
                    expect($log.find(".logContentWrap").data("log"))
                    .to.equal(1);
                    expect($log.find(".key").length).to.equal(1);
                } else {
                    expect(res).to.equal("");
                }
            });
        });
    });

    describe("Public API Test", function() {
        it("Log.hasUncommitChange should work", function() {
            var res = Log.hasUncommitChange();
            expect(typeof res).to.equal("boolean");
        });

        it("Log.getCursor should work", function() {
            var res = Log.getCursor();
            expect(typeof res).to.equal("number");
        });

        it("Log.getLogs should work", function() {
            var res = Log.getLogs();
            expect(res instanceof Array).to.be.true;
        });

        it("Log.getErrorLogs should work", function() {
            var res = Log.getErrorLogs();
            expect(res instanceof Array).to.be.true;
        });

        it("Log.getAllLogs should work", function() {
            var res = Log.getAllLogs();
            expect(res).to.an("object");
            expect(res.logs).to.equal(Log.getLogs());
            expect(res.errors).to.equal(Log.getErrorLogs());
        });

        it("Log.getLocalStorage should work", function() {
            var cachedLog = Log.getLocalStorage();
            expect(cachedLog == null || typeof cachedLog === "string");
        });

        it("should backup log", function() {
            Log.backup();
            var cachedLog = Log.getBackup();
            expect(cachedLog).not.to.be.null;
            expect(typeof cachedLog === "string");
        });

        it("Log.getConsoleErrors should work", function() {
            var res = Log.getConsoleErrors();
            expect(res).to.be.an("array");
        });

        it("Log.viewLastAction should work", function() {
            var res = Log.viewLastAction();
            var res2 = Log.viewLastAction(true);
            if (res !== "none") {
                expect(res).not.to.equal(res2);
            }
        });

        it("Log.upgrade should work", function() {
            // null case
            var res = Log.upgrade(null);
            expect(res).to.equal("");

            // error case
            res = Log.upgrade("abc");
            expect(res).to.equal(null);

            // empty case
            res = Log.upgrade("");
            expect(res).to.equal("");

            // normal case
            var xcLog = new XcLog({"title": "test"});
            res = Log.upgrade(JSON.stringify(xcLog));
            expect(res.length).not.to.equal(0);
        });
    });

    describe("Clean, Add, Restore Log Test", function() {
        before(function() {
            // should not have any auto commit during test
            XcSupport.stopHeartbeatCheck();
        });

        it("Log.add should work", function() {
            var logs = Log.getLogs();
            var len = logs.length;
            // error case
            Log.add("test", {}, "testCli", true);
            expect(logs.length - len).to.equal(0);

        });

        it("Log.errorLog should work", function() {
            var errors = Log.getErrorLogs();
            var len = errors.length;

            Log.errorLog("test", null, "testCli", "testError");
            expect(errors.length - len).to.equal(1);
        });

        it("Should clear log", function() {
            Log.clear();
            expect(Log.getLogs().length).to.equal(0);
        });

        it("Should restore log in empty state", function(done) {
            var logs = Log.getLogs();
            var len = logs.length;

            Log.restore(null, true)
            .then(function() {
                expect(logs.length).to.equal(len);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // it("Should not restore in error case", function(done) {
        //     var oldFunc = KVStore.prototype.get;
        //     KVStore.prototype.get = function() {
        //         return PromiseHelper.reject({"error": "test"});
        //     };

        //     Log.restore()
        //     .then(function() {
        //         done("fail");
        //     })
        //     .fail(function(error) {
        //         expect(error).not.to.be.null;
        //         expect(error.error).to.equal("test");
        //         done();
        //     })
        //     .always(function() {
        //         KVStore.prototype.get = oldFunc;
        //     });
        // });

        // it("Should restore old log", function(done) {
        //     var logs = Log.getLogs();
        //     var len = logs.length;

        //     Log.restore()
        //     .then(function() {
        //         if (len !== 0) {
        //             expect(logs.length).not.to.equal(len);
        //         }
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     });
        // });

        after(function() {
            XcSupport.restartHeartbeatCheck();
        });
    });

    describe("Undo Redo Api Test", function() {
        var oldUndo;
        var oldRedo;

        before(function() {
            oldUndo = Undo.run;
            oldRedo = Redo.run;

            Undo.run = function() {
                return PromiseHelper.resolve();
            };

            Redo.run = function() {
                return PromiseHelper.resolve();
            };

            XcSupport.stopHeartbeatCheck();
            Log.add("test", {"operation": SQLOps.MinimizeCols}, "testCli", true);
        });

        it("should click to trigger undo", function() {
            var curUndo = Log.undo;
            var oldGetDag = DagViewManager.Instance.getActiveDag;
            var $undo = $("#undo");
            var isDisabled = $undo.hasClass("disabled");
            var isLocked = $undo.hasClass("locked");
            var called = 0;

            Log.undo = function() {
                called++;
            };

            DagViewManager.Instance.getActiveDag = function() {
                called++;
                return new DagGraph();
            };

            $undo.addClass("disabled");
            $undo.click();
            expect(called).to.equal(0);
            // case 2
            $undo.removeClass("disabled");
            $undo.removeClass("locked");
            $undo.click();
            expect(called).to.equal(2);

            if (isDisabled) {
                $undo.addClass("disabled");
            }
            if (isLocked) {
                $undo.addClass("locked");
            }
            Log.undo = curUndo;
            DagViewManager.Instance.getActiveDag = oldGetDag;
        });

        it("should click to trigger redo", function() {
            var curRedo = Log.redo;
            var $redo = $("#redo");
            var isDisabled = $redo.hasClass("disabled");
            var called = 0;
            var oldGetDag = DagViewManager.Instance.getActiveDag;

            Log.redo = function() {
                called++;
            };

            DagViewManager.Instance.getActiveDag = function() {
                called++;
                return new DagGraph();
            };

            $redo.addClass("disabled");
            $redo.click();
            expect(called).to.equal(0);
            // case 2
            $redo.removeClass("disabled");
            $redo.click();
            expect(called).to.equal(2);

            if (isDisabled) {
                $redo.addClass("disabled");
            }

            Log.redo = curRedo;
            DagViewManager.Instance.getActiveDag = oldGetDag;
        });

        it("Log.isUndo should work", function() {
            var res = Log.isUndo();
            expect(typeof res).to.equal("boolean");
        });

        it("Log.isRedo should work", function() {
            var res = Log.isRedo();
            expect(typeof res).to.equal("boolean");
        });

        it("Should lock and unlock undo redo", function() {
            var $undo = $("#undo");
            var $redo = $("#redo");
            Log.lockUndoRedo();
            expect($undo.hasClass("disabled")).to.be.true;
            Log.unlockUndoRedo();
            expect($redo.hasClass("disabled")).to.be.true;
        });

        it("Should not undo in error case", function(done) {
            Undo.run = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            Log.undo()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                expect(error.error).to.equal("test");
                done();
            });
        });

        it("Should undo in normal case", function(done) {
            Undo.run = function() {
                return PromiseHelper.resolve();
            };

            var cursor = Log.getCursor();
            Log.undo()
            .then(function() {
                expect(Log.getCursor()).to.equal(cursor - 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not redo in error case", function(done) {
            Redo.run = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            Log.redo()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                expect(error.error).to.equal("test");
                done();
            });
        });

        it("Should redo in normal case", function(done) {
            Redo.run = function() {
                return PromiseHelper.resolve();
            };

            var cursor = Log.getCursor();
            Log.redo()
            .then(function() {
                expect(Log.getCursor()).to.equal(cursor + 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function(done) {
            xcTooltip.hideAll();
            Log.clear();
            Log.restore()
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Undo.run = oldUndo;
                Redo.run = oldRedo;
                XcSupport.restartHeartbeatCheck();
            });
        });
    });

    describe("Log Menu Behavior Test", function() {
        var $logButtons;
        var $textarea;
        var $machineTextarea;
        var wasOpen;

        before(function() {
            $logButtons = $("#logButtonWrap");
            $textarea = $("#log-TextArea");
            $machineTextarea = $("#log-MachineTextArea");

            wasOpen = $("#logButton").hasClass("active");
            if (!wasOpen) {
                $("#logButton").click();
            }
        });

        it("Should view machine Log", function() {
            $logButtons.find(".humanLog").click();
            expect($machineTextarea.get(0).style.display)
            .to.equal("block");
            expect($textarea.get(0).style.display)
            .to.equal("none");
        });

        it("Should view human Log", function() {
            $logButtons.find(".machineLog").click();
            expect($machineTextarea.get(0).style.display)
            .to.equal("none");
            expect($textarea.get(0).style.display)
            .to.equal("block");
        });

        it("should download log", function() {
            var test = false;
            var cachedFunc = xcHelper.downloadAsFile;
            xcHelper.downloadAsFile = function(type) {
                test = true;
            };
            var oldFunc = xcAssert;
            // it will fail the test
            xcAssert = function() { return true; };

            $logButtons.find(".downloadLog").click();
            expect(test).to.be.true;

            xcAssert = oldFunc;
            xcHelper.downloadAsFile = cachedFunc;
        });

        it("should right click to collapse all", function() {
            $logButtons.find(".collapseAll").click();
            expect($textarea.find(".logContentWrap.expanded").length)
            .to.equal(0);
        });

        it("should right click to expand all", function() {
            $logButtons.find(".expandAll").click();
            expect($textarea.find(".logContentWrap.collapsed").length)
            .to.equal(0);
        });

        it("should toggle log size", function() {
            var $log = $textarea.find(".logContentWrap.expanded:first-child");
            if ($log.length === 0) {
                // cannot test in this case
                return;
            }

            $log.find(".title").click();
            expect($log.hasClass("expanded")).to.equal(false);
            expect($log.hasClass("collapsed")).to.equal(true);
            // toggle back
            $log.click();
            expect($log.hasClass("expanded")).to.equal(true);
            expect($log.hasClass("collapsed")).to.equal(false);
        });

        after(function() {
            if (!wasOpen) {
                $("#logButton").click();
            }
        });
    });
});