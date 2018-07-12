// Tests for dagTabs.

describe('DagTab Test', function() {

    var $dagTabArea;
    var $dagTabs;
    var $dataFlowAreas;
    var $newTabButton;

    before(function(done) {
        UnitTest.onMinMode();
        $dagTabArea = $(".dagTabSectionTabs");
        $dagTabs = $(".dagTab");
        $newTabButton = $("#tabButton");
        done();
    });

    describe('Dag Tabs Test', function() {

        describe("dagTabManager should note active tabs", function() {
            it("Should activate a clicked tab", function() {
                var $firstTab = $($dagTabs.get(0));
                var $firstDataflow = $($(".dataflowArea").get(0));
                // Remove active classes if they exist.
                $firstTab.removeClass("active");
                $firstDataflow.removeClass("active");
                $($firstTab).click();
                expect($firstTab.hasClass("active")).to.be.true;
                expect($firstDataflow.hasClass("active")).to.be.true;
            });

            it("Should unactivate old active tabs", function() {
                var $firstTab = $($dagTabs.get(0));
                // Remove active classes if they exist
                var $firstDataflow = $($(".dataflowArea").get(0));
                $($firstTab).click();
                // Show they have an active state now
                expect($firstTab.hasClass("active")).to.be.true;
                expect($firstDataflow.hasClass("active")).to.be.true;
                $($dagTabs.get(1)).click();
                // And now they don't
                expect($firstTab.hasClass("active")).to.be.false;
                expect($firstDataflow.hasClass("active")).to.be.false;
            });

        });
        
        describe("dagTabManager should handle new tabs", function() {
            it("Should create a new tab when prompted", function(){
                var prior_len = $dagTabs.size();
                $newTabButton.click();
                expect($(".dagTab").size()).to.equal(prior_len + 1);
            });

            it("Should create a new dataflow view when prompted", function() {
                var prior_len = $(".dataflowArea").size();
                $newTabButton.click();
                expect($(".dataflowArea").size()).to.equal(prior_len + 1);
            });
        })
    });

    after(function(done) {
        done();
    });
});
