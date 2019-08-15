describe("DSS3Config Test", function() {
    let $mainTabCache;
    let $card;
    let $dropdown;

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        $card = $("#dsForm-s3Config");
        $dropdown = $card.find(".dropDownList.bucket");
    });

    it("should show the card", function() {
        DSS3Config.show();
        assert.isTrue($card.is(":visible"));
    });

    it("should click the dropdown to show the list", function() {
        $dropdown.find(".iconWrapper").click();
        let $lis = $dropdown.find(".list li");
        expect($lis.length).to.be.at.least(1);
        expect($lis.eq(0).hasClass("createNew")).to.be.true;
    });

    it("should click create new to create new s3 bucket", function() {
        let oldFunc = S3ConfigModal.Instance.show;
        let called = false;
        S3ConfigModal.Instance.show = () => called = true;
        $dropdown.find(".list li.createNew").trigger(fakeEvent.mouseup);
        expect(called).to.be.true;

        S3ConfigModal.Instance.show = oldFunc;
    });

    it("should validate error case", function() {
        let oldStatus = StatusBox.show;
        let called = 0;
        StatusBox.show = () => called++;

        $dropdown.find("input").val("");
        $card.find(".confirm").click();
        expect(called).to.equal(1);

        // case 2
        $dropdown.find("input").val("test");
        $card.find(".path input").val("");
        $card.find(".confirm").click();
        expect(called).to.equal(2);

        StatusBox.show = oldStatus;
    });

    it("should submit", function() {
        let oldFunc = DSPreview.show;
        let test = null;
        DSPreview.show = (arg) => { test = arg; };

        $dropdown.find("input").val("target");
        $card.find(".path input").val("path");
        $card.find(".confirm").click();

        expect(test).to.deep.equal({
            targetName: "target",
            files: [{path: "path"}]
        });
        expect($card.find(".path input").val()).to.equal("");
        DSPreview.show = oldFunc;
    });

    it("back from preview should restore form", function() {
        var oldFunc = DSPreview.show;
        DSPreview.show = function(_arg, cb) {
            cb();
        };

        $dropdown.find("input").val("target");
        $card.find(".path input").val("path");
        $card.find(".confirm").click();

        expect($card.find(".path input").val()).to.equal("path");
        DSPreview.show = oldFunc;
    });

    it("should clear", function() {
        $dropdown.find("input").val("target");
        $card.find(".path input").val("path");
        $card.find(".cancel").click();

        expect($dropdown.find("input").val()).to.equal("target");
        expect($card.find(".path input").val()).to.equal("");
    });


    it("should go back", function() {
        let oldFunc = DataSourceManager.startImport;
        let called;
        DataSourceManager.startImport = (arg) => called = arg;
        $card.find(".path input").val("path");
        $card.find(".cardBottom .link").click();
        expect(called).to.equal(null);
        expect($card.find(".path input").val()).to.equal("");

        DataSourceManager.startImport = oldFunc;
    });

    after(function() {
        $dropdown.find("input").val("");
        DataSourceManager.startImport(XVM.isSQLMode());
        // go back to previous tab
        $mainTabCache.click();
    });
});