const expect = require('chai').expect;
exports.testSuit = function(QueryService) {
     describe("QueryService test: ", function () {
        //TODO only handle empty case
        it("list() should work", async function () {
            try {
                const listArray = await QueryService.list({ namePattern: "*" });
                expect(listArray).to.be.empty;
            } catch(err) {
                console.log("list should return an empty array");
                expect.fail(err);
            }
        });
    });
}