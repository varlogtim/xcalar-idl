const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
exports.testSuite = function(VersionService) {
     describe("VersionService test: ", function () {
        it("GetVersion should work", async function () {
            try {
                const result = await VersionService.getVersion()
                console.log(JSON.stringify(result));
                expect(true).to.be.true;
            } catch(err) {
                console.log("getVersion() not work")
                expect.fail(err);
            }
        });
    });
}
