const ApiStatus = require('xcalarsdk').Error.status;
const TableScope = require('xcalarsdk').Table.SCOPE
const expect = require('chai').expect;
exports.testSuite = function(TableService) {
    describe("tableService test: ", function () {
        it.skip("addIndex() should handle invalid input", async function(){
            try {
                await TableService.addIndex("","");
                expect.fail("addIndex cannot handle invalid input");
            } catch(err) {
                expect(err.status).to.equal(ApiStatus.STATUS_NS_INVALID_OBJ_NAME);
            }
        });

        it('listTables availability', async () => {
            try {
                const tableNames = await TableService.listTables({
                    scope: TableScope.GLOBAL
                });
                expect(Array.isArray(tableNames), 'Check response').to.be.true;
            } catch(e) {
                expect.fail('Service error');
            }
        });
    });
}