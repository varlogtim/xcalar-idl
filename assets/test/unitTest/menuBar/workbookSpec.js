describe("Workbook Test", function() {
    var $workbookPanel;

    before(function(){
        $workbookPanel = $("#workbookPanel");
        UnitTest.onMinMode();
    });

    describe("Basic Api Test", function() {
        it("Should show workbook", function(done) {
            Workbook.show();

            var checkFunc = function() {
                return $("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(1);
                done();
            })
            .fail(function() {
                throw "Error Case";
            });
        });

        it("Should hide workbook", function(done) {
            Workbook.hide(true);
            var checkFunc = function() {
                return !$("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(0);
                done();
            })
            .fail(function() {
                throw "Error Case";
            });
        });
    });

    describe("Basic Behavior Test", function() {
        it("Should show workbook from home button", function(done) {
            $("#homeBtn").click();
            var checkFunc = function() {
                return $("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(1);
                done();
            })
            .fail(function() {
                throw "Error Case";
            });
        });

        it("Should access monitor", function() {
            $workbookPanel.find(".monitorBtn, .monitorLink").click();
            expect($("#container").hasClass("workbookMode")).to.be.true;
            expect($("#container").hasClass("monitorMode")).to.be.true;
        });

        it("Should back to workbook", function() {
            $("#monitorPanel .backToWB").click();
            expect($("#container").hasClass("workbookMode")).to.be.true;
            expect($("#container").hasClass("monitorMode")).to.be.false;
        });

        it("Should close workbook", function(done) {
            $("#homeBtn").click();

            var checkFunc = function() {
                return !$("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(0);
                done();
            })
            .fail(function() {
                throw "Error Case";
            });
        });
    });

    describe("Advanced Workbook Behavior Test", function() {
        // this.timeout(200000);
        var oldKVGet, oldKVPut, oldKVDelete;
        var oldXcalarPut, oldXcalarDelete;
        var oldWkbkNew, oldWkbkList, oldWkbkRename, oldWkbkDelete;
        var fakeMap = {};

        before(function() {
            oldKVGet = KVStore.get;
            oldKVPut = KVStore.put;
            oldKVDelete = KVStore.delete;
            oldXcalarPut = XcalarKeyPut;
            oldXcalarDelete = XcalarKeyDelete;

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

            oldWkbkNew = XcalarNewWorkbook;
            oldWkbkList = XcalarListWorkbooks;
            oldWkbkRename = XcalarRenameWorkbook;
            oldWkbkDelete = XcalarDeleteWorkbook;

            XcalarNewWorkbook = function() {
                return PromiseHelper.resolve();
            };

            XcalarListWorkbooks = function() {
                return PromiseHelper.resolve({
                    "numSessions": 1,
                    "sessions": [{"state": "InActive"}]
                });
            };

            XcalarRenameWorkbook = function() {
                return PromiseHelper.resolve();
            };

            XcalarDeleteWorkbook = function() {
                return PromiseHelper.resolve();
            };
        });

        beforeEach(function() {
            fakeMap = {};
        });

        it("Should force show the workbook", function() {
            var $input = $workbookPanel.find(".newWorkbookBox input");
            $input.val();
            Workbook.forceShow();
            expect($("#container").hasClass("noWorkbook")).to.be.true;
            expect($input.val()).not.to.equal("");
            $("#container").removeClass("noWorkbook");
        });

        it("Should create new workbook", function(done) {
            var selector = ".workbookBox:not(.loading)";
            var wkbkNum = $workbookPanel.find(selector).length;
            var name = xcHelper.randName("testWorkbook");
            var $newWorkbookBox = $workbookPanel.find(".newWorkbookBox");

            $newWorkbookBox.find("input").val(name)
                    .end()
                    .find(".btn").click();
            var checkFunc = function() {
                var diff = $workbookPanel.find(selector).length - wkbkNum;
                if (diff < 0) {
                    // error case
                    return null;
                }
                return (diff === 1);
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $box = $workbookPanel.find(".workbookBox").eq(0);
                expect($box.find(".workbookName").val()).to.equal(name);
                expect($box.find(".numWorksheets").text()).to.equal("1");
                expect($box.find(".isActive").text()).to.equal("Inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should edit workbook name", function(done) {
            var name = xcHelper.randName("testModified");
            var $box = $workbookPanel.find(".workbookBox").eq(0);
            var $input = $box.find(".workbookName");
            $box.find(".modify").click();
            $input.focus().val(name).trigger(fakeEvent.enter);
            var checkFunc = function() {
                var $title = $box.find(".subHeading");
                return ($title.attr("data-original-title") === name);
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($input.val()).to.equal(name);
                $input.blur();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should duplicate workbook", function(done) {
            var selector = ".workbookBox:not(.loading)";
            var wkbkNum = $workbookPanel.find(selector).length;
            var $box = $workbookPanel.find(".workbookBox").eq(0);
            $box.find(".duplicate").click();

            var checkFunc = function() {
                var diff = $workbookPanel.find(selector).length - wkbkNum;
                if (diff < 0) {
                    // error case
                    return null;
                }

                if (diff === 1) {
                    // has a fadeIn animation, so need to wait for it
                    var $dupBox = $workbookPanel.find(".workbookBox").eq(1);
                    if ($dupBox.find(".workbookName").val()) {
                        return true;
                    }
                }
                return false;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var name = $box.find(".workbookName").val();
                var $dupBox = $workbookPanel.find(".workbookBox").eq(1);
                var dupName = $dupBox.find(".workbookName").val();

                expect(dupName.startsWith(name)).to.be.true;
                expect($dupBox.find(".numWorksheets").text()).to.equal("1");
                expect($dupBox.find(".isActive").text()).to.equal("Inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not activate active workbook", function() {
            var oldHide = Workbook.hide;
            var test = false;
            Workbook.hide = function() { test = true; };

            var $box = $workbookPanel.find(".workbookBox.active");
            $box.find(".activate").click();
            expect(test).to.be.true;

            Workbook.hide = oldHide;
        });

        it("Should activate inactive workbook", function() {
            var oldSwitch = WorkbookManager.switchWKBK;
            var test = false;
            WorkbookManager.switchWKBK = function() {
                test = true;
                return PromiseHelper.resolve();
            };

            var $box = $workbookPanel.find(".workbookBox:not(.active)").eq(0);
            $box.find(".activate").click();
            expect(test).to.be.true;
            WorkbookManager.switchWKBK = oldSwitch;
        });

        it("Should activate inactive workbook", function() {
            var oldSwitch = WorkbookManager.switchWKBK;
            var test = false;
            WorkbookManager.switchWKBK = function() {
                test = true;
                return PromiseHelper.resolve();
            };

            var $box = $workbookPanel.find(".workbookBox:not(.active)").eq(0);
            $box.find(".activate").click();
            expect(test).to.be.true;
            WorkbookManager.switchWKBK = oldSwitch;
        });

        it("Should delete workbook", function(done) {
            // delete two test created workbooks one by one
            var promises = [];
            promises.push(deleteHelper.bind(this));
            promises.push(deleteHelper.bind(this));

            PromiseHelper.chain(promises)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });

            function deleteHelper() {
                var $boxs = $workbookPanel.find(".workbookBox");
                var wkbkNum = $boxs.length;
                $boxs.eq(0).find(".delete").click();

                assert.isTrue($("#alertModal").is(":visible"));
                $("#alertModal").find(".confirm").click();

                var checkFunc = function() {
                    var diff = $workbookPanel.find(".workbookBox").length - wkbkNum;
                    if (diff > 0) {
                        // error case
                        return null;
                    }
                    return (diff === -1);
                };

                return UnitTest.testFinish(checkFunc);
            }
        });

        it("Should close workbook", function(done) {
            $("#homeBtn").click();

            var checkFunc = function() {
                return !$("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(0);
                done();
            })
            .fail(function() {
                throw "Error Case";
            });
        });

        after(function() {
            KVStore.get = oldKVGet;
            KVStore.put = oldKVPut;
            KVStore.delete = oldKVDelete;
            XcalarKeyPut = oldXcalarPut;
            XcalarKeyDelete = oldXcalarDelete;

            XcalarNewWorkbook = oldWkbkNew;
            XcalarListWorkbooks = oldWkbkList;
            XcalarRenameWorkbook = oldWkbkRename;
            XcalarDeleteWorkbook = oldWkbkDelete;
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});