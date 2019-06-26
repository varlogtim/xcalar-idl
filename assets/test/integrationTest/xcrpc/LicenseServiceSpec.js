const expect = require('chai').expect;
exports.testSuite = function(LicenseService) {
    describe("LicenseService: ", function () {
        it("getLicense() should work", async function () {
            try {
                const result = await LicenseService.getLicense();
                expect(result.array.length).to.equal(13);
                expect(result.getLicensee()).to.equal("Xcalar, Inc");
            } catch(err) {
                console.log("getLicense fails");
                expect.fail(err);
            }
        });

        it("updateLicense() should handle the invalid input", async function () {
            try {
                await LicenseService.updateLicense({ newLicense: null });
                expect.fail("updateLicense cannot handle invalid input");
            } catch(err) {
                expect(err.error.error).to.equal("The signature of the Xcalar license is invalid");
            }
        });
    });
}
