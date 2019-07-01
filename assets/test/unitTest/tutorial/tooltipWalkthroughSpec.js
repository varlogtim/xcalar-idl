describe("Tooltip Walkthrough Test", function() {
    var oldGetActiveWKBK;
    var oldStart;

    before(function() {
        oldGetActiveWKBK = WorkbookManager.getActiveWKBK;
        oldStart = TooltipManager.start;

        WorkbookManager.getActiveWKBK = function() {
            return {};
        }
        TooltipManager.start = function(obj, list, num) {
            return;
        }
    });

    it("Should get available built in walkthroughs", function() {
        var walkthroughs = TooltipWalkthroughs.getAvailableWalkthroughs();
        expect(walkthroughs.length).to.equal(2);
        expect(walkthroughs[0].name).to.equal("SQL Mode");
    });

    it("Should 'start' a SQL walkthrough", function() {
        var started = false;
        TooltipManager.start = function(obj, list, num) {
            if (obj.tooltipTitle == "SQL Mode") {
                started = true;
            }
            return;
        }
        TooltipWalkthroughs.startWalkthrough("SQL Mode");
        expect(started).to.be.true;
    });

    it("Should 'start' a Advanced walkthrough", function() {
        var started = false;
        TooltipManager.start = function(obj, list, num) {
            if (obj.tooltipTitle == "Advanced Mode") {
                started = true;
            }
            return;
        }
        TooltipWalkthroughs.startWalkthrough("Advanced Mode");
        expect(started).to.be.true;
    });

    it("Should 'start' a walkthrough while in a wkbk on the wkbk screen", function(done) {
        WorkbookPanel.show(true);
        expect(WorkbookPanel.isWBMode()).to.be.true;
        var started = false;
        TooltipManager.start = function(obj, list, num) {
            if (obj.tooltipTitle == "SQL Mode") {
                started = true;
            }
            return;
        }
        var startErr = TooltipWalkthroughs.startWalkthrough("SQL Mode");
        setTimeout(function() { // allow time for the click event to go through
            expect(started).to.be.true;
            expect(startErr).to.equal("");
            expect(WorkbookPanel.isWBMode()).to.be.false;
            done();
        }, 500);
    });

    it("Should not 'start' a walkthrough while not in a wkbk on the wkbk screen", function() {
        WorkbookPanel.show(true);
        var started = false;
        WorkbookManager.getActiveWKBK = function() {
            return null;
        }
        TooltipManager.start = function(obj, list, num) {
            started = true;
            return;
        }
        var startErr = TooltipWalkthroughs.startWalkthrough("SQL Mode");
        expect(started).to.be.false;
        expect(startErr).to.equal("A workbook must be opened in order to start a walkthrough");
        $("#homeBtn").click();
    });

    after(function(done) {
        WorkbookManager.getActiveWKBK = oldGetActiveWKBK;
        TooltipManager.start = oldStart;
        done();
    });


});