function filePreviewerTest() {
    var $fileBrowserPreview;

    before(function() {
        $fileBrowserPreview = $("#fileBrowserPreview");
    });

    describe("Previewer Id Test", function() {
        it("Should set previewer id", function() {
            FilePreviewer.__testOnly__.setPreviewerId();
            expect($fileBrowserPreview.data("id")).not.to.be.null;
        });

        it("Should get previewer id", function() {
            var id = FilePreviewer.__testOnly__.getPreviewerId();
            expect(id).to.equal($fileBrowserPreview.data("id"));
        });

        it("Should test valid id", function() {
            var id = FilePreviewer.__testOnly__.getPreviewerId();
            // case 1
            var valid = FilePreviewer.__testOnly__.isValidId(id);
            expect(valid).to.be.true;
            // case 2
            valid = FilePreviewer.__testOnly__.isValidId(123);
            expect(valid).to.be.false;
        });
    });
}