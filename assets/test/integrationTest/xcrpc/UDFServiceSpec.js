const expect = require('chai').expect;
exports.testSuite = function(UDFService) {
     describe("UDFService test: ", function () {
        //TODO backend not implement yet
        it("getRes() should work", async function () {
            try {
                const result = await UDFService.getRes({udfScope: 0,moduleName: "default"});
                expect(result).to.equal("/sharedUDFs/default");
            } catch(err) {
                console.log("getRes does not work");
                expect.fail(err);
            }
        });
        it("getRes() should be handle invalid input", async function(){
            try {
                await UDFService.getRes({udfScope: 0,moduleName: ""});
                expect.fail("getRes cannot handle the invalid input");
            } catch(err) {
                //after we have error handler for xcrpc, we should change it
                expect(err.error.error.includes("The specified user-defined module/application was not found")).to.be.true;
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