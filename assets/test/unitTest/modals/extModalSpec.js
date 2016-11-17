describe("ExtModal Test", function() {
    var $extModal = $("#extModal");

    before(function() {
        UnitTest.onMinMode();
        $extModal = $("#extModal");
    });

    describe("Behavior Test", function() {
        it("Should show extModal", function() {
            ExtModal.show();
            assert.isTrue($extModal.is(":visible"));
        });

        it("Should close extModal", function() {
            $extModal.find(".close").click();
            assert.isFalse($extModal.is(":visible"));
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});