describe("ModeAlertModal Test", function() {
    let modeAlertModal;
    let notShow

    before(function() {
        modeAlertModal = ModeAlertModal.Instance;
        notShow = modeAlertModal._notShow;
    });
    
    it("should be a valid class", function() {
        expect(modeAlertModal).to.be.an.instanceof(ModeAlertModal);
    });

    it("should not show if notShow is set", function() {
        modeAlertModal._notShow = true;
        let oldFuc = MessageModal.Instance.show;
        let called = false;
        MessageModal.Instance.show = () => { called = true; };
        modeAlertModal.show();
        expect(called).to.be.false;
        MessageModal.Instance.show = oldFuc;
    });

    it("should show modal", function() {
        modeAlertModal._notShow = false;
        let oldFuc = MessageModal.Instance.show;
        let called = true;
        MessageModal.Instance.show = () => { called = true; };
        modeAlertModal.show();
        expect(called).to.be.true;
        MessageModal.Instance.show = oldFuc;
    });

    after(function() {
        modeAlertModal._setNotShow(notShow);
    });
});