const expect = require('chai').expect;
exports.testSuite = function(dataflowService) {
     describe("DataflowService test: ", function () {
        // XXX TODO: test all DataflowService APIs
        // Need session implemented to access the workbook scope
        before(() => {
            // XXX TODO: Setup login/session
         });
        it("DataflowService.executeOptimized() should work", () => {
            expect(true).to.be.true;
        });
    });
}