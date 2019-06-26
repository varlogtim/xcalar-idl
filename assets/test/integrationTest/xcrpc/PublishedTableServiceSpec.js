const expect = require('chai').expect;
exports.testSuite = function(PublishedTableService) {
    describe("PublishedTableService test: ", function () {
        //TODO backend not implement yet
        it("select() should work with normal case", async function () {
            expect(true).to.be.true;
        });

        //TODO only test empty case util create table implemented
        it("listTables() should work", async function () {
            const emptyList = { numTables: 0, tables: [] };
            try {
                const listInfo = await PublishedTableService.listTables({ patternStr: "*" });
                expect(listInfo).to.deep.equal(emptyList);
            } catch (err) {
                console.log("listTable should return an empty table array");
                expect.fail(err);
            }
        });

    });
}