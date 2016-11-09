describe("About Modal Test", function() {
    before(function() {
        UnitTest.onMinMode();
    });

    it("Should open the about modal", function() {
        AboutModal.show();
        var $modal = $("#aboutModal");
        assert.isTrue($modal.is(":visible"));
        assert.isFalse($("#modalBackground").is(":visible"));

        expect($modal.find(".frontVersion .text").text()).not.to.equal("");
        expect($modal.find(".backVersion .text").text()).not.to.equal("");
        expect($modal.find(".thriftVersion .text").text()).not.to.equal("");
        expect($modal.find(".license span").text()).not.to.equal("");
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