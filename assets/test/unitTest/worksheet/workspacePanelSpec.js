describe("WorkspacePanel Test", function() {
    describe("active test", function() {
        it("active should work", function() {
            var cachedFn =  xcTooltip.changeText;
            xcTooltip.changeText = function($obj, text) {
                expect(text).to.equal(TooltipTStr.CloseQG)
                called = true;
            };
            $("#workspacePanel").removeClass("active");
            expect($("#workspacePanel").hasClass("active")).to.be.false;
            $("#statusBar").removeClass("worksheetMode");
            expect($("#statusBar").hasClass("worksheetMode")).to.be.false;
            $("#dagPanel").removeClass("hidden")

            WorkspacePanel.active();

            expect($("#workspacePanel").hasClass("active")).to.be.true;
            expect($("#worksheetButton").hasClass("active")).to.be.true;
            expect($("#statusBar").hasClass("worksheetMode")).to.be.true;
            $("#dagPanel").addClass("hidden");
            expect(called).to.be.true;
            xcTooltip.changeText = cachedFn;
        });

        it("active on IMDPanel should work", function() {
            var cachedFn = IMDPanel.active;
            var called = false;
            IMDPanel.active = function(firstTouch) {
                expect(firstTouch).to.be.false;
                called = true;
            };

            $("#worksheetButton").removeClass("active");
            $("#statusBar").removeClass("worksheetMode");
            expect($("#statusBar").hasClass("worksheetMode")).to.be.false;

            WorkspacePanel.active();
            expect($("#statusBar").hasClass("worksheetMode")).to.be.false;
            expect(called).to.be.true;
            IMDPanel.active = cachedFn;
        });
    });

    describe("inactive test", function() {
        it ("inactive should work", function() {
            var cachedFn = IMDPanel.inActive;
            var called = false;
            IMDPanel.inActive = function() {
                called = true;
            };

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
            IMDPanel.inActive = cachedFn;
            TblFunc.hideOffScreenTables = cachedFn2;
        });
    });

    describe("view toggling", function() {
        it("worksheetButton should work", function(){
            var cachedFn = IMDPanel.inActive;
            var called = false;
            IMDPanel.inActive = function() {
                called = true;
            };
            var cachedFn2 = IMDPanel.active;
            var called2 = false;
            IMDPanel.active = function() {
                called2 = true;
            };

            expect($("#worksheetButton").hasClass("active")).to.be.true;
            $("#worksheetButton").click();
            expect(called).to.be.false;

            $("#worksheetButton").removeClass("active");
            $("#worksheetButton").click();
            expect(called).to.be.true;
            expect(called2).to.be.false;

            expect($("#imdView").hasClass("active")).to.be.false;
            expect($("#worksheetView").hasClass("active")).to.be.true;
            expect($("#workspaceBar").hasClass("xc-hidden")).to.be.false;
            expect($("#imdBar").hasClass("xc-hidden")).to.be.true;
            expect($("#statusBar").hasClass("worksheetMode")).to.be.true;

            IMDPanel.inActive = cachedFn;
            IMDPanel.active = cachedFn2;
        });

        it("imdButton should work", function(){
            var cachedFn = IMDPanel.inActive;
            var called = false;
            IMDPanel.inActive = function() {
                called = true;
            };
            var cachedFn2 = IMDPanel.active;
            var called2 = false;
            IMDPanel.active = function() {
                called2 = true;
            };

            $("#imdButton").click();
            expect($("#imdView").hasClass("active")).to.be.truce;
            expect($("#worksheetView").hasClass("active")).to.be.false;
            expect($("#workspaceBar").hasClass("xc-hidden")).to.be.true;
            expect($("#imdBar").hasClass("xc-hidden")).to.be.false;
            expect($("#statusBar").hasClass("worksheetMode")).to.be.false;
            expect(called2).to.be.true;
            expect(called).to.be.false;

            IMDPanel.inActive = cachedFn;
            IMDPanel.active = cachedFn2;
        });
    });
});