describe("License Modal Test", function() {
    var $modal;

    before(function() {
        $modal = $("#licenseModal");
        UnitTest.onMinMode();
    });

    it("should show modal", function() {
        LicenseModal.show();
        assert.isTrue($modal.is(":visible"));
    });

    it("should submit form", function(done) {
        var testUpdate, testSuccess;
        var oldUpdate = XcalarUpdateLicense;
        var oldSuccess = xcHelper.showSuccess;

        XcalarUpdateLicense = function(input) {
            testUpdate = input;
            return PromiseHelper.resolve();
        };

        xcHelper.showSuccess = function(input) {
            testSuccess = input;
        };

        var checkFunc = function() {
            return (testSuccess === SuccessTStr.UpdateLicense);
        };

        $modal.find(".newLicenseKey").val("test");
        $modal.find(".confirm").click();
        UnitTest.testFinish(checkFunc)
        .then(function() {
            expect(testUpdate).to.equal("test");
            assert.isFalse($modal.is(":visible"));
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarUpdateLicense = oldUpdate;
            xcHelper.showSuccess = oldSuccess;
        });
    });


    after(function() {
        UnitTest.offMinMode();
    });
});
