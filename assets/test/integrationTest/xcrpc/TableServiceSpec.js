const expect = require('chai').expect;
exports.testSuite = function(TableService) {
    describe("tableService test: ", function () {
        it("addIndex() should handle invalid input", async function(){
            try {
                await TableService.addIndex("","");
                expect.fail("addIndex cannot handle invalid input");
            } catch(err) {
                expect(err.error.error.includes("Bad name for Namespace")).to.be.true;
            }
        });
    });
}