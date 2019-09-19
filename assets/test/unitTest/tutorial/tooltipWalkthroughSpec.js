describe("Tooltip Walkthrough Test", function() {
    var oldGetActiveWKBK;
    var oldStart;

    before(function() {
        console.log("Tooltip Walkthrough Test");
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
        expect(walkthroughs.length).to.equal(3);
        expect(walkthroughs[0].name).to.equal("Workbook Browser");
        expect(walkthroughs[1].name).to.equal("SQL Mode");
    });

    it("Should add a walkthrough for the workbook", function() {
        var wlk = {
            "info": {
                          "tooltipTitle": "Example",
                          "background": true,
                          "startScreen": "Adv Mode Dataflow",
                          "description": "test desc"
                      },
            "walkthrough":            [{
                            "highlight_div": "#dagButton",
                            "text": "testing",
                            "type": "text"
                        }],
            "options":           {
                            "closeOnModalClick": true,
                            "includeNumbering": true
                        }
            };
        TooltipWalkthroughs.setWorkbookWalkthrough(wlk);
        var walkthroughs = TooltipWalkthroughs.getAvailableWalkthroughs();
        expect(walkthroughs.length).to.equal(4);
        expect(walkthroughs[3].name).to.equal("Example");
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

    it("Should 'start' a Dataflow walkthrough", function() {
        var started = false;
        TooltipManager.start = function(obj, list, num) {
            if (obj.tooltipTitle == "Dataflow Mode") {
                started = true;
            }
            return;
        }
        TooltipWalkthroughs.startWalkthrough("Dataflow Mode");
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

    it("Should automatically start if entering a mode we havent seen yet", function() {
        WorkbookManager.getActiveWKBK = function() {
            return {};
        }
        if (XVM.isSQLMode()) {
            XVM.setMode("Advanced", true);
        }
        let started = false;
        TooltipManager.start = function(obj, list, num) {
            if (obj.tooltipTitle == "Dataflow Mode") {
                started = true;
            }
            return;
        }
        TooltipWalkthroughs.setSeenDataflow(false);
        TooltipWalkthroughs.checkFirstTimeTooltip();
        expect(started).to.be.true;
        TooltipManager.start = function(obj, list, num) {
            if (obj.tooltipTitle == "SQL Mode") {
                started = true;
            }
            return;
        }
        started = false;
        XVM.setMode("SQL", true);
        TooltipWalkthroughs.setSeenSQL(false);
        TooltipWalkthroughs.checkFirstTimeTooltip();
        expect(started).to.be.true;
    });

    after(function(done) {
        WorkbookManager.getActiveWKBK = oldGetActiveWKBK;
        TooltipManager.start = oldStart;
        done();
    });


});