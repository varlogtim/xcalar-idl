describe("ModeAlertModal Test", function() {
    let modeAlertModal;

    before(function() {
        modeAlertModal = ModeAlertModal.Instance;
        UnitTest.onMinMode();
    });
    
    it("should be a valid class", function() {
        expect(modeAlertModal).to.be.an.instanceof(ModeAlertModal);
    });

    it("should not show if notShow is set", function() {
        modeAlertModal._notShow = true;
        modeAlertModal.show();
        assert.isFalse(modeAlertModal._getModal().is(":visible"));
    });

    it("should show modal", function() {
        modeAlertModal._notShow = false;
        modeAlertModal.show();
        assert.isTrue(modeAlertModal._getModal().is(":visible"));
    });

    it("should close the modal", function() {
        modeAlertModal._getModal().find(".close").click();
        assert.isFalse(modeAlertModal._getModal().is(":visible"));
    });

    after(function() {
        UnitTest.offMinMode();
    });
});