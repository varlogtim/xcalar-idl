describe("S3ConfigModal Test", function() {
    let oldList;
    let oldRender;
    let oldCreate;
    let test;
    let $modal;

    before(function() {
        oldList = DSTargetManager.getTargetTypeList;
        oldRender = DSTargetManager.renderS3Config;
        oldCreate = DSTargetManager.createS3Target;
        DSTargetManager.getTargetTypeList = () => PromiseHelper.resolve();
        DSTargetManager.renderS3Config = () => "test";

        test = undefined;
        $modal = S3ConfigModal.Instance._getModal();
    });

    it("should show modal", function() {
        S3ConfigModal.Instance.show((targetName) => {
            test = targetName
        });
        expect($modal.is(":visible")).to.be.true;
        expect($modal.find(".formContent").text()).to.equal("test");
    });

    it("submit should handle error", function(done) {
        DSTargetManager.createS3Target = () => PromiseHelper.reject({log: "test"});
        let oldStatus = StatusBox.show;
        let called = false;
        StatusBox.show = () => called = true;

        S3ConfigModal.Instance._submitForm()
        .then(function() {
            done("fail");
        })
        .fail(function() {
            expect(called).to.be.true;
            expect(test).to.equal(undefined);
            done();
        })
        .always(function() {
            StatusBox.show = oldStatus;
        });
    });

    it("submit should work", function(done) {
        DSTargetManager.createS3Target = () => PromiseHelper.resolve("test");
        S3ConfigModal.Instance._submitForm()
        .then(function() {
            expect(test).to.equal("test");
            // modal should be closed
            expect($modal.is(":visible")).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    after(function() {
        DSTargetManager.getTargetTypeList = oldList;
        DSTargetManager.renderS3Config = oldRender;
        DSTargetManager.createS3Target = oldCreate;
    });
});