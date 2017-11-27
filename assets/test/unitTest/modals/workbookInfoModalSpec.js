describe("Workbook Info Modal Test", function() {
    var $modal;

    before(function() {
        $modal = $("#workbookInfoModal");
        UnitTest.onMinMode();
    });

    it("should open modal", function() {
        var workbookId = WorkbookManager.getActiveWKBK();
        var workbook = WorkbookManager.getWorkbook(workbookId);
        WorkbookInfoModal.show(workbookId);

        assert.isTrue($modal.is(":visible"));
        expect($modal.find(".name input").val())
        .to.equal(workbook.getName());
        expect($modal.find(".description input").val())
        .to.equal(workbook.getDescription() || "");
    });

    it("should show name error", function() {
        $modal.find(".name input").val("").trigger("input");
        expect($modal.find(".error").text()).to.equal(WKBKTStr.WkbkNameRequired);
        expect($modal.find(".confirm").hasClass("xc-disabled")).to.be.true;
    });

    it("should hide name error", function() {
        $modal.find(".name input").val("test").trigger("input");
        expect($modal.find(".error").text()).to.equal("");
        expect($modal.find(".confirm").hasClass("xc-disabled")).to.be.false;
    });

    it("should click cancel to close modal", function() {
        $modal.find(".cancel").click();
        assert.isFalse($modal.is(":visible"));
    });

    it("should click confirm to submit", function() {
        var workbookId = WorkbookManager.getActiveWKBK();
        WorkbookInfoModal.show(workbookId);
        assert.isTrue($modal.is(":visible"));

        var test = false;
        var oldFunc = WorkbookPanel.edit;
        WorkbookPanel.edit = function() {
            test = true;
        };

        $modal.find(".confirm").click();
        expect(test).to.be.true;
        assert.isFalse($modal.is(":visible"));
        WorkbookPanel.edit = oldFunc;
    });

    after(function() {
        UnitTest.onMinMode();
    });
});