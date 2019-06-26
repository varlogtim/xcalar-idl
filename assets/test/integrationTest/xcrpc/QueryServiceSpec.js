const expect = require('chai').expect;
exports.testSuite = function(QueryService) {
     describe("QueryService test: ", function () {
        it("list() should work", async function () {
            try {
                const listArray = await QueryService.list({ namePattern: "*" });
                // The list is not always empty, in case we already executed a query
                // For now we only test if the API call succeeds
                // XXX TODO: clear and create quries before running the test, so that we can check the count
                expect(listArray != null).to.be.true;
            } catch(err) {
                console.log("list should return an array");
                expect.fail(err);
            }
        });

        describe("Query.execute() should work", () => {
            // XXX TODO: test all the xcalar operators
            // Need session implemented to access the workbook scope
            it("XCALAR_API_BULK_LOAD", () => {
                expect(true).to.be.true;
            });
        });
    });
}