describe("DSSource Test", function() {
    let $card;

    before(function() {
        $card = $("#dsForm-source");
    });

    it("should switch to source panel if it's cloud", function() {
        let oldIsCloud = XVM.isCloud;
        let oldFormShow = DSForm.show;
        let oldSwitch = DataSourceManager.switchView;
        let test1 = false, test2 = false;
        XVM.isCloud = () => true;
        DSForm.show = () => test1 = true;
        DataSourceManager.switchView = () => test2 = true;

        DSSource.show();
        expect(test1).to.be.false;
        expect(test2).to.be.true;

        XVM.isCloud = oldIsCloud;
        DSForm.show = oldFormShow;
        DataSourceManager.switchView = oldSwitch;
    });

    it("should switch to form panel if it's on prem", function() {
        let oldIsCloud = XVM.isCloud;
        let oldFormShow = DSForm.show;
        let oldSwitch = DataSourceManager.switchView;
        let test1 = false, test2 = false;
        XVM.isCloud = () => false;
        DSForm.show = () => test1 = true;
        DataSourceManager.switchView = () => test2 = true;

        DSSource.show();
        expect(test1).to.be.true;
        expect(test2).to.be.false;

        XVM.isCloud = oldIsCloud;
        DSForm.show = oldFormShow;
        DataSourceManager.switchView = oldSwitch;
    });

    it("should show form if click more", function() {
        let oldFormShow = DSForm.show;
        let called = false;
        DSForm.show = () => called = true;

        $card.find(".more").click();
        expect(called).to.be.true;

        DSForm.show = oldFormShow;
    });

    it("should show s3 config panel if click s3 part", function() {
        let oldFunc = DSS3Config.show;
        let called = false;
        DSS3Config.show = () => called = true;

        $card.find(".location.s3").click();
        expect(called).to.be.true;

        DSS3Config.show = oldFunc;
    });
});