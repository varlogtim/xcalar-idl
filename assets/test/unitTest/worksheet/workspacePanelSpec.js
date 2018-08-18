describe("WorkspacePanel Test", function() {
    before(function() {
        if ($("#imdButton").hasClass('active')) {
            // switch panel
            $("#worksheetButton").addClass('active');
        } 
    });

    describe("active test", function() {
        it("active should work", function() {
            var cachedFn =  xcTooltip.changeText;
            xcTooltip.changeText = function($obj, text) {
                expect(text).to.equal(TooltipTStr.CloseQG)
                called = true;
            };
            $("#workspacePanel").removeClass("active");
            $("#statusBar").removeClass("worksheetMode");
            $("#dagPanel").removeClass("hidden");

            WorkspacePanel.active();

            expect($("#workspacePanel").hasClass("active")).to.be.true;
            expect($("#worksheetButton").hasClass("active")).to.be.true;
            expect($("#statusBar").hasClass("worksheetMode")).to.be.true;
            $("#dagPanel").addClass("hidden");
            expect(called).to.be.true;
            xcTooltip.changeText = cachedFn;
        });
    });

    describe("inactive test", function() {
        it ("inactive should work", function() {

            var cachedFn2 = TblFunc.hideOffScreenTables;
            var called2 = false;
            TblFunc.hideOffScreenTables = function() {
                called2 = true;
            };

            $("#statusBar").addClass("worksheetMode");
            expect($("#statusBar").hasClass("worksheetMode")).to.be.true;
            $("#worksheetButton").addClass("active");

            WorkspacePanel.inActive();

            expect($("#statusBar").hasClass("worksheetMode")).to.be.false;
            TblFunc.hideOffScreenTables = cachedFn2;
        });
    });

    describe("view toggling", function() {
        it("worksheetButton should work", function(){
            expect($("#worksheetButton").hasClass("active")).to.be.true;
            $("#worksheetButton").click();

            $("#worksheetButton").removeClass("active");
            $("#worksheetButton").click();

            expect($("#worksheetView").hasClass("active")).to.be.true;
            expect($("#workspaceBar").hasClass("xc-hidden")).to.be.false;
            expect($("#statusBar").hasClass("worksheetMode")).to.be.true;
        });
    });
});