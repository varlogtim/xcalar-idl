describe("Datastore-DSTargetManger Test", function() {
    var $mainTabCache;
    var testTarget;
    var getNumTargets = function() {
        return Number($(".numDSTargets").eq(0).text());
    };

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();
    });

    describe("Public API Test", function() {
        it("DSTargetManager.refreshTargets", function(done) {
            DSTargetManager.refreshTargets()
            .then(function() {
                var numTargets = getNumTargets();
                // at least has 1 default targets
                expect(numTargets).to.be.at.least(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("DSTargetManager.getTarget should work", function() {
            var res = DSTargetManager.getTarget("Default Shared Root");
            expect(res).not.to.be.null;
            expect(res).to.be.an("object");
        });

        it("DSTargetManager.isGeneratedTarget should work", function() {
            var res = DSTargetManager.isGeneratedTarget("Default Shared Root");
            expect(res).to.be.false;
        });

        it("DSTargetManager.isPreSharedTarget should work", function() {
            var res = DSTargetManager.isPreSharedTarget("Default Shared Root");
            expect(res).to.be.false;
        });

        it("DSTargetManager.getTargetTypeList should work", function(done) {
            var $targetTypeList = $("#dsTarget-type");
            $targetTypeList.find("ul").empty();

            DSTargetManager.getTargetTypeList()
            .then(function() {
                expect($targetTypeList.find("li").length).be.above(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Create Target Form Test", function() {
        before(function() {
            var $targetButton = $("#targetButton");
            if (!$targetButton.hasClass("active")) {
                $targetButton.click();
            }

            testTarget = xcHelper.randName("target");
            $("#datastoreMenu").removeClass("noAdmin");
            $("#datastorePanel").removeClass("noAdmin");
        });

        it("should show create target view", function() {
            var $targetCreateCard = $("#dsTarget-create-card");
            $targetCreateCard.addClass("xc-hidden");
            $("#dsTarget-create").click();
            expect($targetCreateCard.hasClass("xc-hidden"))
            .to.be.false;
        });

        it("should reset the form", function() {
            var $input = $("#dsTarget-name");
            $input.val("test");
            $("#dsTarget-reset").click();
            expect($input.val()).to.be.empty;
        });

        it("should select type list", function() {
            var $targetTypeList = $("#dsTarget-type");
            var $li = $targetTypeList.find('li[data-id="shared"]');
            expect($li.length).to.equal(1);
            $li.trigger(fakeEvent.mouseup);
            expect($targetTypeList.find(".text").val())
            .to.equal("Shared File System");
            // click again has no side-affect
            $li.trigger(fakeEvent.mouseup);
            expect($targetTypeList.find(".text").val())
            .to.equal("Shared File System");
        });

        it("should validte form", function() {
            var $name = $("#dsTarget-name");
            $name.val("");
            $("#dsTarget-submit").click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            // $name.val(testTarget);
            // $("#dsTarget-submit").click();
            // UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("should submit and create a target", function(done) {
            var numTargets = getNumTargets();
            $("#dsTarget-name").val(testTarget);
            $("#dsTarget-param-0").val("netstore/");
            $("#dsTarget-submit").click();

            var testFunc = function() {
                var currentNumTargets = getNumTargets();
                return (currentNumTargets - numTargets) >= 1;
            };

            UnitTest.testFinish(testFunc)
            .then(function() {
                var $grid = $('#dsTarget-list .grid-unit[data-name="' +
                              testTarget + '"]');
                expect($grid.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should focus on ds path form when clicking on import", function() {
            expect($("#dsTarget-import:visible").length).to.equal(1);
            expect($("#dsForm-target:visible").length).to.equal(0);

            $("#dsTarget-import").click();

            expect($("#dsForm-target:visible").length).to.equal(1);
            expect($("#dsTarget-import:visible").length).to.equal(0);
            expect($("#dsForm-target input").val()).to.equal(testTarget);

            MainMenu.openPanel("datastorePanel", "targetButton");
        });

        after(function() {
            if (!Admin.isAdmin()) {
                $("#datastoreMenu").addClass("noAdmin");
                $("#datastorePanel").addClass("noAdmin");
            }
        })
    });

    describe("Target Info Form Test", function() {
        var $grid;

        before(function() {
            $grid = $('#dsTarget-list .grid-unit[data-name="' +
                        testTarget + '"]');
        });

        it("should click to refresh targets", function() {
            var oldFunc = DSTargetManager.refreshTargets;
            var test = false;
            DSTargetManager.refreshTargets = function() {
                test = true;
            };
            $("#dsTarget-refresh").click();
            expect(test).to.be.true;
            DSTargetManager.refreshTargets = oldFunc;
        });

        it("should click to focus target", function() {
            $grid.click();
            expect($grid.hasClass("active")).to.be.true;
            expect($("#dsTarget-info-card").is(":visible")).to.be.true;
        });

        it("should delete target", function(done) {
            $("#dsTarget-delete").click();
            var numTargets = getNumTargets();

            UnitTest.hasAlertWithTitle(DSTargetTStr.DEL, {
                confirm: true
            });

            var testFunc = function() {
                var currentNumTargets = getNumTargets();
                return (currentNumTargets - numTargets) < 0;
            };

            UnitTest.testFinish(testFunc)
            .then(function() {
                var $grid = $('#dsTarget-list .grid-unit[data-name="' +
                              testTarget + '"]');
                expect($grid.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        describe("Target Grid Menu Test", function() {
            var $wrap;
            var $gridMenu;
            var $target;

            before(function() {
                $wrap = $("#dsTarget-list .gridViewWrapper");
                $gridMenu = $("#dsTarget-menu");
                $target = $("#dsTarget-list").find(".grid-unit").eq(0);
            });

            afterEach(function() {
                $gridMenu.hide();
            });

            it("should open menu on background", function() {
                var e = jQuery.Event("contextmenu", {
                    "target": $("#dsTarget-list").get(0)
                });
                $wrap.trigger(e);
                assert.isTrue($gridMenu.is(":visible"));
                expect($gridMenu.hasClass("bgOpts")).to.be.true;
            });

            it("should go to create target form", function() {
                var $li = $gridMenu.find('li[data-action="create"]');
                var $createCard = $("#dsTarget-create-card").addClass("xc-hidden");
                $li.addClass("unavailable");
                $li.trigger(fakeEvent.mouseup);
                expect($createCard.hasClass("xc-hidden")).to.be.true;

                $li.removeClass("unavailable");
                // simple mouse up not work
                $li.mouseup();
                expect($createCard.hasClass("xc-hidden")).to.be.true;

                $li.trigger(fakeEvent.mouseup);
                expect($createCard.hasClass("xc-hidden")).to.be.false;
            });

            it("should trigger refresh", function() {
                var $li = $gridMenu.find('li[data-action="refresh"]');
                var oldFunc = DSTargetManager.refreshTargets;
                var test = false;
                DSTargetManager.refreshTargets = function() {
                    test = true;
                };
                $li.trigger(fakeEvent.mouseup);
                expect(test).to.be.true;
                DSTargetManager.refreshTargets = oldFunc;
            });

            it("should open menu on target", function() {
                var e = jQuery.Event("contextmenu", {
                    "target": $target.get(0)
                });
                $wrap.trigger(e);
                assert.isTrue($gridMenu.is(":visible"));
                expect($gridMenu.hasClass("targetOpts")).to.be.true;
            });

            it("should select target from menu", function() {
                var e = jQuery.Event("contextmenu", {
                    "target": $target.get(0)
                });
                $wrap.trigger(e);
                var $li = $gridMenu.find('li[data-action="view"]');
                $li.trigger(fakeEvent.mouseup);
                assert.isTrue($("#dsTarget-info-card").is(":visible"));
            });
        });
    });

    after(function() {
        // go back to previous tab
        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});