describe("CloudFileBrowser Test", function() {
    let $fileBrowser;

    before(function() {
        $fileBrowser = $("#fileBrowser");
    });
    
    it("should show", function() {
        let oldFunc = FileBrowser.show;
        called = false;
        FileBrowser.show = () => called = true;
        
        CloudFileBrowser.show();
        expect(called).to.equal(true);
        expect($fileBrowser.hasClass("cloud")).to.be.true;

        FileBrowser.show = oldFunc;
    });

    it("should clear", function() {
        CloudFileBrowser.clear();
        expect($fileBrowser.hasClass("cloud")).to.be.false;
    });
});