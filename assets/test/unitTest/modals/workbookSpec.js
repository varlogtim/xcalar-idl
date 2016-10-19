describe('Workbook Test', function() {
    var $workbookPanel;

    before(function(){
        $workbookPanel = $("#workbookPanel");
    });

    describe("Basic Api Test", function() {
        it("Should show workbook", function(done) {
            Workbook.show();

            var checkFunc = function() {
                return $("#container").hasClass("workbookMode");
            };

            testChecker(checkFunc)
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

            testChecker(checkFunc)
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

            testChecker(checkFunc)
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
    });

    describe("Advanced Behavior Test", function() {
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

            testChecker(checkFunc)
            .then(function() {
                var $box = $workbookPanel.find(".workbookBox").eq(0);
                expect($box.find(".workbookName").val()).to.equal(name);
                expect($box.find(".numWorksheets").text()).to.equal("1");
                expect($box.find(".isActive").text()).to.equal("Inactive");
                done();
            })
            .fail(function() {
                throw "Error Case";
            });
        });

        it("Should edit workbook name", function() {
            var name = xcHelper.randName("testModified");
            var $box = $workbookPanel.find(".workbookBox").eq(0);
            var $input = $box.find(".workbookName");

            $box.find(".modify").click();
            $input.val(name).trigger(fakeEvent.enter);
            expect($input.val()).to.equal(name);
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

            testChecker(checkFunc)
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
                throw "Error Case";
            });
        });

        it("Should delete workbook", function(done) {
            var $boxs = $workbookPanel.find(".workbookBox");
            var wkbkNum = $boxs.length;
            $boxs.eq(0).find(".delete").click();
            $boxs.eq(1).find(".delete").click();

            var checkFunc = function() {
                var diff = $workbookPanel.find(".workbookBox").length - wkbkNum;
                if (diff > 0) {
                    // error case
                    return null;
                }
                return (diff === -2);
            };

            testChecker(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(1);
                done();
            })
            .fail(function() {
                throw "Error Case";
            });
        });
    });

    describe("Close workbook", function() {
        it("Should close workbook", function(done) {
            $("#homeBtn").click();

            var checkFunc = function() {
                return !$("#container").hasClass("workbookMode");
            };

            testChecker(checkFunc)
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
});