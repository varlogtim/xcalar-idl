describe("SQL Test", function() {
    describe("Basic Function Test", function() {
        it("isBackendOperation should work", function() {
            var isBackendOperation = SQL.__testOnly__.isBackendOperation;

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
                var sql = new XcLog(args);
                var res = isBackendOperation(sql);
                expect(res).to.equal(test.expect);
            });
        });

        it("getUndoType should work", function() {
            var getUndoType = SQL.__testOnly__.getUndoType;
            var UndoType = SQL.__testOnly__.UndoType;
            var testCases = [{
                "operation": null,
                "expect": UndoType.Invalid
            },{
                "operation": SQLOps.DSPoint,
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
                var sql = new XcLog(args);
                var res = getUndoType(sql);
                expect(res).to.equal(test.expect);
            });
        });

        it("getCliMachine should work", function() {
            var getCliMachine = SQL.__testOnly__.getCliMachine;

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
                var sql = new XcLog(args);
                var res = getCliMachine(sql, 1);
                expect(res).to.equal(test.expect);
            });
        });

        it("getCliHTML should work", function() {
            var getCliHTML = SQL.__testOnly__.getCliHTML;

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
                var sql = new XcLog(args);
                var res = getCliHTML(sql, 1);
                if (test.isValid) {
                    expect(res).not.to.equal("");
                    var $sql = $('<div>' + res + '</div>');
                    expect($sql.find(".sqlContentWrap").data("sql"))
                    .to.equal(1);
                    expect($sql.find(".key").length).to.equal(1);
                } else {
                    expect(res).to.equal("");
                }
            });
        });
    });

    describe("Public API Test", function() {
        it("SQL.hasUnCommitChange should work", function() {
            var res = SQL.hasUnCommitChange();
            expect(typeof res).to.equal("boolean");
        });

        it("SQL.getCursor should work", function() {
            var res = SQL.getCursor();
            expect(typeof res).to.equal("number");
        });

        it("SQL.getLogs should work", function() {
            var res = SQL.getLogs();
            expect(res instanceof Array).to.be.true;
        });

        it("SQL.getErrorLogs should work", function() {
            var res = SQL.getErrorLogs();
            expect(res instanceof Array).to.be.true;
        });

        it("SQL.getAllLogs should work", function() {
            var res = SQL.getAllLogs();
            expect(res).to.an("object");
            expect(res.logs).to.equal(SQL.getLogs());
            expect(res.errors).to.equal(SQL.getErrorLogs());
        });

        it("SQL.getLocalStorage should work", function() {
            var cachedSQL = SQL.getLocalStorage();
            expect(cachedSQL == null || typeof cachedSQL === "string");
        });

        it("should backup sql", function() {
            SQL.backup();
            var cachedSQL = SQL.getBackup();
            expect(cachedSQL).not.to.be.null;
            expect(typeof cachedSQL === "string");
        });

        it("SQL.getConsoleErrors should work", function() {
            var res = SQL.getConsoleErrors();
            expect(res).to.be.an("array");
        });

        it("SQL.viewLastAction should work", function() {
            var res = SQL.viewLastAction();
            var res2 = SQL.viewLastAction(true);
            if (res !== "none") {
                expect(res).not.to.equal(res2);
            }
        });

        it("SQL.upgrade should work", function() {
            // null case
            var res = SQL.upgrade(null);
            expect(res).to.equal("");

            // error case
            res = SQL.upgrade("abc");
            expect(res).to.equal(null);

            // empty case
            res = SQL.upgrade("");
            expect(res).to.equal("");

            // normal case
            var sql = new XcLog({"title": "test"});
            res = SQL.upgrade(JSON.stringify(sql));
            expect(res.length).not.to.equal(0);
        });
    });

    describe("Clean, Add, Restore SQL Test", function() {
        before(function() {
            // should not have any auto commit during test
            Support.stopHeartbeatCheck();
        });

        it("SQL.add should work", function() {
            var logs = SQL.getLogs();
            var len = logs.length;
            // error case
            SQL.add("test", {}, "testCli", true);
            expect(logs.length - len).to.equal(0);

        });

        it("SQL.errorLog should work", function() {
            var errors = SQL.getErrorLogs();
            var len = errors.length;

            SQL.errorLog("test", null, "testCli", "testError");
            expect(errors.length - len).to.equal(1);
        });

        it("Should clear sql", function() {
            SQL.clear();
            expect(SQL.getLogs().length).to.equal(0);
        });

        it("Should restore sql in empty state", function(done) {
            var logs = SQL.getLogs();
            var len = logs.length;

            SQL.restore(null, true)
            .then(function() {
                expect(logs.length).to.equal(len);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not restore in error case", function(done) {
            var oldFunc = KVStore.get;
            KVStore.get = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            SQL.restore()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                expect(error.error).to.equal("test");
                done();
            })
            .always(function() {
                KVStore.get = oldFunc;
            });
        });

        it("Should restore old sql", function(done) {
            var logs = SQL.getLogs();
            var len = logs.length;

            SQL.restore()
            .then(function() {
                if (len !== 0) {
                    expect(logs.length).not.to.equal(len);
                }
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            Support.restartHeartbeatCheck();
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

            Support.stopHeartbeatCheck();
            SQL.add("test", {"operation": SQLOps.MinimizeCols}, "testCli", true);
        });

        it("should click to trigger undo", function() {
            var curUndo = SQL.undo;
            var $undo = $("#undo");
            var isDisabled = $undo.hasClass("disabled");
            var test = false;

            SQL.undo = function() {
                test = true;
            };

            $undo.addClass("disabled");
            $undo.click();
            expect(test).to.be.false;
            // case 2
            $undo.removeClass("disabled");
            $undo.click();
            expect(test).to.be.true;
        
            if (isDisabled) {
                $undo.addClass("disabled");
            }
            SQL.undo = curUndo;
        });

        it("should click to trigger redo", function() {
            var curRedo = SQL.redo;
            var $redo = $("#redo");
            var isDisabled = $redo.hasClass("disabled");
            var test = false;

            SQL.redo = function() {
                test = true;
            };

            $redo.addClass("disabled");
            $redo.click();
            expect(test).to.be.false;
            // case 2
            $redo.removeClass("disabled");
            $redo.click();
            expect(test).to.be.true;

            if (isDisabled) {
                $redo.addClass("disabled");
            }

            SQL.redo = curRedo;
        });

        it("SQL.isUndo should work", function() {
            var res = SQL.isUndo();
            expect(typeof res).to.equal("boolean");
        });

        it("SQL.isRedo should work", function() {
            var res = SQL.isRedo();
            expect(typeof res).to.equal("boolean");
        });

        it("Should lock and unlock undo redo", function() {
            var $undo = $("#undo");
            var $redo = $("#redo");
            SQL.lockUndoRedo();
            expect($undo.hasClass("disabled")).to.be.true;
            SQL.unlockUndoRedo();
            expect($redo.hasClass("disabled")).to.be.true;
        });

        it("Should not undo in error case", function(done) {
            Undo.run = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            SQL.undo()
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

            var cursor = SQL.getCursor();
            SQL.undo()
            .then(function() {
                expect(SQL.getCursor()).to.equal(cursor - 1);
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

            SQL.redo()
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

            var cursor = SQL.getCursor();
            SQL.redo()
            .then(function() {
                expect(SQL.getCursor()).to.equal(cursor + 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function(done) {
            xcTooltip.hideAll();
            SQL.clear();
            SQL.restore()
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Undo.run = oldUndo;
                Redo.run = oldRedo;
                Support.restartHeartbeatCheck();
            });
        });
    });

    describe("SQl Menu Behavior Test", function() {
        var $sqlButtons;
        var $textarea;
        var $machineTextarea;
        var $sqlMenu;
        var wasOpen;

        before(function() {
            $sqlButtons = $("#sqlButtonWrap");
            $textarea = $("#sql-TextArea");
            $machineTextarea = $("#sql-MachineTextArea");
            $sqlMenu = $("#sqlMenu");

            wasOpen = $("#sqlTab").hasClass("active");
            if (!wasOpen) {
                $("#sqlTab").click();
            }
        });

        it("Should view machine SQL", function() {
            $sqlButtons.find(".humanLog").click();
            expect($machineTextarea.get(0).style.display)
            .to.equal("block");
            expect($textarea.get(0).style.display)
            .to.equal("none");
        });

        it("should open sql menu in machine SQL", function() {
            openContextMenu();
            assert.isTrue($sqlMenu.is(":visible"));
            expect($sqlMenu.find("li:visible").length).to.equal(1);
            $sqlMenu.hide();
        });

        it("Should view human SQL", function() {
            $sqlButtons.find(".machineLog").click();
            expect($machineTextarea.get(0).style.display)
            .to.equal("none");
            expect($textarea.get(0).style.display)
            .to.equal("block");
        });

        it("should open sql menu in human SQL", function() {
            openContextMenu();
            assert.isTrue($sqlMenu.is(":visible"));
            expect($sqlMenu.find("li:visible").length).to.equal(3);
            $sqlMenu.hide();
        });

        it("Should copy log", function(done) {
            var oldFunc = xcAssert;
            // it will fail the test
            xcAssert = function() { return true; };

            $sqlButtons.find(".copyLog").click();
            var $successMessageWrap = $("#successMessageWrap");
            assert.isTrue($successMessageWrap.is(":visible"));

            var checkFunc = function() {
                return !$successMessageWrap.is(":visible");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                xcAssert = oldFunc;
            });
        });

        it("should toggle sql size", function() {
            var $sql = $textarea.find(".sqlContentWrap.expanded:first-child");
            if ($sql.length === 0) {
                // cannot test in this case
                return;
            }

            $sql.find(".title").click();
            expect($sql.hasClass("expanded")).to.equal(false);
            expect($sql.hasClass("collapsed")).to.equal(true);
            // toggle back
            $sql.click();
            expect($sql.hasClass("expanded")).to.equal(true);
            expect($sql.hasClass("collapsed")).to.equal(false);
        });

        it("should right click to copy log", function() {
            var test = false;
            var oldSuccess = xcHelper.showSuccess;
            xcHelper.showSuccess = function() {
                test = true;
            };

            var $li = $sqlMenu.find("li.copy");
            $li.mouseup();
            expect(test).to.be.false;

            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            xcHelper.showSuccess = oldSuccess;
        });

        it("should right click to collapse all", function() {
            var $li = $sqlMenu.find("li.collapseAll");
            $li.trigger(fakeEvent.mouseup);
            expect($textarea.find(".sqlContentWrap.expanded").length)
            .to.equal(0);
        });

        it("should right click to expand all", function() {
            var $li = $sqlMenu.find("li.expandAll");
            $li.trigger(fakeEvent.mouseup);
            expect($textarea.find(".sqlContentWrap.collapsed").length)
            .to.equal(0);
        });

        function openContextMenu() {
            var e = jQuery.Event("contextmenu", {
                "target": $sqlMenu
            });
            $textarea.parent().trigger(e);
        }

        after(function() {
            if (!wasOpen) {
                $("#sqlTab").click();
            }
        });
    });
});