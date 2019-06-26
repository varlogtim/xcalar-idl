const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
exports.testSuite = function(OperatorService) {
    describe("OperatorService test: ", function () {
        it("export should work", async function(){
            // XXX TODO: test target service
            // Need session implemented to access the workbook scope
            try {
                expect(true).to.be.true;
            } catch(err) {
                expect.fail(err);
            }
        });
    });
}