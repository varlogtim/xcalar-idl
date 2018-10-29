describe("BatchDFParamPopup Test", function() {
    var getParamMapCache;
    var getParamMap;
    var updateParamMapCache;
    var getDataflowCache;
    var $tab = $("#dfViz .tabWrap");
    before(function(done) {
        getParamMapCache = DF.getParamMapCache;
        getParamMap = DF.getParamMap;
        updateParamMapCache = DF.updateParamMap;
        getDataflowCache = DF.getDataflow;

        DF.getParamMapCache = function() {};
        DF.getParamMap = function() {return {}};

        $("#dataflowTab").click();
        UnitTest.testFinish(function() {
            return $("#dfViz .cardMain").children().length !== 0;
        })
        .then(function() {
            done();
        })
        .fail(function() {
            done("failed");
        });
    });

    describe("opening", function() {
        it("ret popup should be inactive", function() {
            expect($("#paramPopUp").hasClass("active")).to.be.false;
        });
        it("ret popup should open", function() {
            var called = false;
            DF.getParamMap = function() {
                called = true;
                return {test: {value: "test1", isEmpty: false}};
            };

            $("#dfViz .cardMain").append("<div class='dagWrap test'></div>");
            $tab.click();
            expect($("#paramPopUp").hasClass("active")).to.be.true;
            expect(called).to.be.true;
            $("#dfViz .cardMain").remove(".test");
        });

        it("should close if clicking on tab", function() {
            $tab.click();
            expect($("#paramPopUp").hasClass("active")).to.be.false;
            $tab.click();
            expect($("#paramPopUp").hasClass("active")).to.be.true;
        })

        it("ret popup should have correct rows", function() {
            expect($("#retLists").find(".row").length).to.equal(5);
            expect($("#retLists").find(".row.unfilled").length).to.equal(4);
            expect($("#retLists").find(".paramName").eq(0).text()).to.equal("test")
            expect($("#retLists").find(".paramVal").eq(0).val()).to.equal("test1");
        });
    });

    describe("new param test", function() {
        it("duplicate should be caught", function() {
            $("#paramPopUp .newParam").val("test");
            $("#paramPopUp .submitNewParam").click();
            UnitTest.hasStatusBoxWithError(xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                "name": "test"
            }));
        });
        it("empty name should be caught", function() {
            $("#paramPopUp .newParam").val("");
            $("#paramPopUp .submitNewParam").click();
            UnitTest.hasStatusBoxWithError("Please fill out this field.");
        });
        it("valid name should work", function() {
            $("#paramPopUp .newParam").val("test2");
            expect($("#retLists").find(".row.unfilled").length).to.equal(4);
            $("#paramPopUp .submitNewParam").click();
            expect($("#retLists").find(".row.unfilled").length).to.equal(3);
            expect($("#retLists .checkbox").eq(1).hasClass("checked")).to.be.true;
        });
        it("filling list should be handled", function() {
            $("#retLists").find(".row.unfilled").addClass("temp").removeClass("unfilled");
            $("#paramPopUp .newParam").val("test3");
            $("#paramPopUp .submitNewParam").click();
            expect($("#retLists").find(".row").length).to.equal(6);
            $("#retLists").find(".row").last().remove();
            $("#retLists").find(".row.temp").addClass("unfilled").removeClass("temp");
        });
    });

    describe("param val test", function() {
        it("param val should work", function() {
            $("#retLists").find(".paramVal").eq(1).val("test2").trigger("input");
            expect($("#retLists .checkbox").eq(1).hasClass("checked")).to.be.false;
            expect($("#retLists").find(".paramVal").eq(1).val()).to.equal("test2");
            expect($("#statusBox").is(":visible")).to.be.false;
            expect($("#retLists .checkbox").eq(1).hasClass("xc-disabled")).to.be.true;

            $("#retLists").find(".paramVal").eq(1).val("").trigger("input");
            expect($("#retLists .checkbox").eq(1).hasClass("xc-disabled")).to.be.false;
            $("#retLists").find(".paramVal").eq(1).val("test2").trigger("input");
        });

        it("should blur on enter", function() {
            $("#retLists").find(".paramVal").eq(1).focus();
            $("#retLists").find(".paramVal").eq(1).trigger(fakeEvent.enter);
        });

        it("checkbox should work", function() {
            $("#retLists").find(".paramVal").eq(1).val("").trigger("input");
            expect($("#retLists .checkbox").eq(1).hasClass("checked")).to.be.false;
            $("#retLists .checkbox").click();
            expect($("#retLists .checkbox").eq(1).hasClass("checked")).to.be.true;
            $("#retLists .checkbox").click();
            expect($("#retLists .checkbox").eq(1).hasClass("checked")).to.be.false;
            $("#retLists").find(".paramVal").eq(1).val("test2").trigger("input");
        });
    });

    describe("delete test", function() {
        it("param should be deleted", function() {
            var called = false;
            DF.updateParamMap = function() {
                called = true;
            };
            DF.getDataflow = function(dag) {
                return {
                    checkParamInUse : function (dag) {
                        return false;
                    },
                    paramMapInUsed : {
                        "test": false,
                        "test2": false
                    }
                }
            }

            $("#paramPopUp .paramDelete").eq(0).click();
            expect($("#retLists").find(".row").length).to.equal(5);
            expect($("#retLists").find(".row.unfilled").length).to.equal(4);
            expect(called).to.be.false;
        });
    });

    describe("close test", function() {
        it("close should work", function() {
            var called = false;
            DF.updateParamMap = function(params) {
                expect(Object.keys(params).length).to.equal(1);
                expect(params["test2"].value).to.equal("test2");
                expect(params["test2"].isEmpty).to.be.false;
                called = true;
            };

            expect($("#paramPopUp").hasClass("active")).to.be.true;
            $("#container").trigger(fakeEvent.mousedown);
            expect($("#paramPopUp").hasClass("active")).to.be.false;
            expect(called).to.be.true;
        });
    });

    describe("mode test", function() {
        it('should not open if XcalarMode.Mod', function() {
            var cache = XVM.getLicenseMode;

            XVM.getLicenseMode = function() {
                return XcalarMode.Mod;
            }
            var called = false;
            var cache2 = xcTooltip.refresh;
            xcTooltip.refresh = function() {
                called = true;
            }
            $tab.click();
            $tab.click();

            XVM.getLicenseMode = cache;
            xcTooltip.refresh = cache2;
            expect(called).to.be.true;
        });
    })

    after(function() {
        DF.getParamMapCache = getParamMapCache;
        DF.getParamMap = getParamMap;
        DF.updateParamMap = updateParamMapCache;
        DF.getDataflow = getDataflowCache;
    });
});