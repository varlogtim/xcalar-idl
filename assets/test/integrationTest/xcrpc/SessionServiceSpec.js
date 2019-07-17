const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
exports.testSuite = function(SessionService) {
     describe("SessionService test: ", function () {
        it("new should work", function () {
            // XXX TODO: test session service
            // Need session implemented to access the workbook scope
            try {
                expect(true).to.be.true;
            } catch(err) {
                expect.fail(err);
            }
        });
    });
}