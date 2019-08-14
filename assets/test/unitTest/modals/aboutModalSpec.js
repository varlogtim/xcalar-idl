describe("AboutModal Test", function() {
    let $modal;

    before(function() {
        UnitTest.onMinMode();
        $("#modalBackground").hide();
        $modal = $("#aboutModal");
    });

    it("Should open the about modal", function() {
        AboutModal.Instance.show();
        assert.isTrue($modal.is(":visible"));
        assert.isFalse($("#modalBackground").is(":visible"));

        expect($modal.find(".product").text()).not.to.equal("");
        expect($modal.find(".frontVersion").text()).not.to.equal("");
        expect($modal.find(".buildNumber").text()).not.to.equal("");
    });

    it("should show license section in on prem deployment", function() {
        let wasCloud = XVM.isCloud;
        XVM.isCloud = () => false;
        AboutModal.Instance.show();
        expect($modal.find(".expiration").text()).not.to.equal("");
        expect($modal.find(".keyValue").text()).not.to.equal("");
        XVM.isCloud = wasCloud;
    });

    it("should not show license section in cloud deployment", function() {
        let wasCloud = XVM.isCloud;
        XVM.isCloud = () => true;
        AboutModal.Instance.show();
        expect($modal.find(".expiration").text()).to.equal("");
        expect($modal.find(".keyValue").text()).to.equal("");
        XVM.isCloud = wasCloud;
    });

    it("Should clean the modal", function() {
        var $modal = $("#aboutModal");
        $modal.find(".close").click();
        assert.isFalse($modal.is(":visible"));
    });

    after(function() {
        UnitTest.offMinMode();
    });
});