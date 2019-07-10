const ApiStatus = require('xcalarsdk').Error.status;
const expect = require('chai').expect;
exports.testSuite = function(TableService) {
    describe("tableService test: ", function () {
        it("addIndex() should handle invalid input", async function(){
            try {
                await TableService.addIndex("","");
                expect.fail("addIndex cannot handle invalid input");
            } catch(err) {
                expect(err.status).to.equal(ApiStatus.STATUS_NS_INVALID_OBJ_NAME);
            }
        });
    });
}