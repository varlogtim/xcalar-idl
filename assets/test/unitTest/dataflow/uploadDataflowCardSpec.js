describe("Upload Dataflow Test", function() {
    var $mainTabCache;
    var $card;
    var $retPath;
    var $dfName;

    before(function() {
        $card = $("#uploadDataflowCard");
        $retPath = $card.find("#retinaPath");
        $dfName = $card.find("#dfName");

        $mainTabCache = $(".topMenuBarTab.active");
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $("#dataflowTab").click();
        }
    });

    describe("Upload Dataflow Api Test", function() {
        it("should show the card", function() {
            UploadDataflowCard.show();
            assert.isTrue($card.is(":visible"));
        });

        it("should change the file path and check invalid case", function() {
            UploadDataflowCard.__testOnly__.changeFilePath("test.pdf");
            expect($retPath.val()).to.equal("test.pdf");
            expect($dfName.val()).to.equal("test");
            expect($card.find(".confirm").hasClass("btn-disabled"))
            .to.be.true;
            UnitTest.hasStatusBoxWithError(ErrTStr.RetinaFormat);
        });

        it("should change file path to valid case", function() {
            UploadDataflowCard.__testOnly__.changeFilePath("file.tar.gz");
            expect($retPath.val()).to.equal("file.tar.gz");
            expect($dfName.val()).to.equal("file");
            expect($card.find(".confirm").hasClass("btn-disabled"))
            .to.be.false;
        });

        it("should toggle checkbox", function() {
            var $checkbox = $card.find(".overwriteUdf .checkbox");
            expect($checkbox.hasClass("checked")).to.be.false;
            // check
            $checkbox.click();
            expect($checkbox.hasClass("checked")).to.be.true;
            // uncheck
            $card.find(".overwriteUdf span").click();
            expect($checkbox.hasClass("checked")).to.be.false;
        });

        it("should close the card", function() {
            $card.find(".close").click();
            assert.isFalse($card.is(":visible"));
        });
    });

    after(function() {
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $mainTabCache.click();
        }
    });
});