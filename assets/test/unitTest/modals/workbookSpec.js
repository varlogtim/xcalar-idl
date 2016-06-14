describe('Workbook Test', function() {
    var minModeCache;
    var $workbookModal;

    before(function(){
        // turn off min mode, as it affectes DOM test
        minModeCache = gMinModeOn;
        gMinModeOn = true;

        $workbookModal = $("#workbookModal");
    });

    describe('Workbook Modal Test', function() {
        it("Should show workbook", function() {
            WorkbookModal.show();
            assert.isTrue($workbookModal.is(":visible"));
        });

        it('Should switch action', function() {
            var $radioWraps = $workbookModal.find(".radioButton");
            $radioWraps.eq(0).click();
            assert.isTrue($radioWraps.eq(0).hasClass("active"));
            $radioWraps.eq(1).click();
            assert.isTrue($radioWraps.eq(1).hasClass("active"));
            $radioWraps.eq(2).click();
            assert.isTrue($radioWraps.eq(2).hasClass("active"));
            $radioWraps.eq(3).click();
            assert.isTrue($radioWraps.eq(3).hasClass("active"));
        });

        it('Should close modal', function() {
            $workbookModal.find(".close").click();
            assert.isFalse($workbookModal.is(":visible"));
        });
    });


    after(function() {
        gMinModeOn = minModeCache;
    });
});