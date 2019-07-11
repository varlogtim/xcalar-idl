const ApiStatus = require('xcalarsdk').Error.status;
const UDF = require('xcalarsdk').UDF;
const expect = require('chai').expect;
exports.testSuite = function(UDFService) {
     describe("UDFService test: ", function () {
        //TODO backend not implement yet
        it("getRes() should work", async function () {
            try {
                const result = await UDFService.getRes({udfScope: UDF.SCOPE.GLOBAL,moduleName: "default"});
                expect(result).to.equal("/sharedUDFs/default");
            } catch(err) {
                expect.fail(null, null, JSON.stringify(err));
            }
        });
        it("getRes() should be handle invalid input", async function(){
            try {
                await UDFService.getRes({udfScope: UDF.SCOPE.GLOBAL,moduleName: ""});
                expect.fail(null, null, "getRes cannot handle the invalid input");
            } catch(err) {
                expect(err.status).to.equal(ApiStatus.STATUS_UDF_MODULE_NOT_FOUND);
            }
        })
        it("get() should work", async function () {
            expect(true).to.be.true;
        });
        it("add() should work", async function () {
            expect(true).to.be.true;
        });
        it("update() should work", async function () {
            expect(true).to.be.true;
        });
        it('delete() should work', async function () {
            expect(true).to.be.true;
        });
    });
}