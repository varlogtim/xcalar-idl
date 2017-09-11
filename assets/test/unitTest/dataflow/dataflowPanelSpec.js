describe("Dataflow Panel Test", function() {
    before(function() {
        var $mainTabCache = $(".topMenuBarTab.active");
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $("#dataflowTab").click();
        }
    });

    describe("Refresh test", function() {
        it("refresh should work", function() {
            var cache1 = DFCard.getActiveDF;
            DFCard.getActiveDF = function() {
                return "unitTestDF";
            };


            $("#scheduleDetail").removeClass("xc-hidden");
            $("#dfViz .retTab").addClass("active");
            $("#dfParamModal").show();
            expect($("#scheduleDetail").is(":visible")).to.be.true;
            expect($("#dfViz .retTab").hasClass("active")).to.be.true;
            expect($("#dfParamModal").is(":visible")).to.be.true;
            DataflowPanel.refresh("unitTestDF");
            expect($("#scheduleDetail").is(":visible")).to.be.false;
            expect($("#dfViz .retTab").hasClass("active")).to.be.false;
            expect($("#dfParamModal").is(":visible")).to.be.false;
            UnitTest.hasAlertWithTitle(DFTStr.Refresh);

            DFCard.getActiveDF = cache1;
        });

        it("refresh should do nothing if not on active dataflow", function() {
            var cache1 = DFCard.getActiveDF;
            DFCard.getActiveDF = function() {
                return "unitTestDF2";
            };

            $("#scheduleDetail").removeClass("xc-hidden");
            $("#dfViz .retTab").addClass("active");
            $("#dfParamModal").show();
            expect($("#scheduleDetail").is(":visible")).to.be.true;
            expect($("#dfViz .retTab").hasClass("active")).to.be.true;
            expect($("#dfParamModal").is(":visible")).to.be.true;
            DataflowPanel.refresh("unitTestDF1");
            expect($("#scheduleDetail").is(":visible")).to.be.true;
            expect($("#dfViz .retTab").hasClass("active")).to.be.true;
            expect($("#dfParamModal").is(":visible")).to.be.true;
            expect($("#alertModal").is(":visible")).to.be.false;
            $("#scheduleDetail").addClass("xc-hidden");
            $("#dfViz .retTab").removeClass("active");
            $("#dfParamModal").hide();

            DFCard.getActiveDF = cache1;
        });


        it("refresh should do nothing if nothing is open", function() {
            var cache1 = DFCard.getActiveDF;
            DFCard.getActiveDF = function() {
                return "unitTestDF";
            };

            expect($("#scheduleDetail").is(":visible")).to.be.false;
            expect($("#dfViz .retTab").hasClass("active")).to.be.false;
            expect($("#dfParamModal").is(":visible")).to.be.false;

            DataflowPanel.refresh("unitTestDF");
            expect($("#scheduleDetail").is(":visible")).to.be.false;
            expect($("#dfViz .retTab").hasClass("active")).to.be.false;
            expect($("#dfParamModal").is(":visible")).to.be.false;

            expect($("#alertModal").is(":visible")).to.be.false;

            DFCard.getActiveDF = cache1;
        });
    });

    after(function() {

    });
});