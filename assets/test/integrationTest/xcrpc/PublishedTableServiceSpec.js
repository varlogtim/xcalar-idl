const expect = require('chai').expect;
exports.testSuite = function(PublishedTableService) {
    describe("PublishedTableService test: ", function () {
        //TODO backend not implement yet
        it("select() should work with normal case", async function () {
            expect(true).to.be.true;
        });

        it("listTables() should work", async function () {
            let response = {};
            let error = null;
            try {
                response = await PublishedTableService.listTables({ patternStr: "*" });
            } catch (err) {
                error = err;
            }

            expect(error == null).to.be.true;

            const { numTables, tables } = response;
            expect(Number.isInteger(numTables)).to.be.true;
            expect(Array.isArray(tables)).to.be.true;
            expect(tables.length).to.equal(numTables);
        });

    });
}