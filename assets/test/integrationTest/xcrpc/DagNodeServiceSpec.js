const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
exports.testSuit = function(DagNodeService) {
    describe("DagNodeService test: ", function () {
        // XXX TODO: test all DagNodeService APIs
        // Need session implemented to access the workbook scope
        before(() => {
            // XXX TODO: Setup login/session
         });
        it("delete() should work", () => {
            expect(true).to.be.true;
        });
    });
}