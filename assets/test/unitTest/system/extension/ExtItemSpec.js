describe("ExtItem Constructor Test", function() {
    var extItem;

    beforeEach(function() {
        extItem = new ExtItem({
            "appName": "testItem",
            "version": "2.0",
            "XDVersion": "2.1",
            "description": "test",
            "author": "test user",
            "image": "testImage",
            "category": "test",
            "main": "main",
            "website": "http://test.com"
        });
    });

    it("should be a constructor", function() {
        expect(extItem).to.be.an.instanceof(ExtItem);
        expect(Object.keys(extItem).length).to.equal(9);
    });

    it("should get name", function() {
        expect(extItem.getName()).to.equal("testItem");
    });

    it("should get main name", function() {
        expect(extItem.getMainName()).to.equal("main (testItem)");
        // empty main
        extItem.main = "";
        expect(extItem.getMainName()).to.equal("testItem");
    });

    it("should get category", function() {
        expect(extItem.getCategory()).to.equal("test");
    });

    it("should get author", function() {
        expect(extItem.getAuthor()).to.equal("test user");
    });

    it("should get description", function() {
        expect(extItem.getDescription()).to.equal("test");
    });

    it("should get version", function() {
        expect(extItem.getVersion()).to.equal("2.0");
    });

    it("should get XDversion", function() {
        expect(extItem.getXDVersion()).to.equal("2.1");
    });


    it("should get image", function() {
        expect(extItem.getImage()).to.equal("testImage");
    });

    it("should set image", function() {
        extItem.setImage("testImage2");
        expect(extItem.getImage()).to.equal("testImage2");

        // case 2
        extItem.setImage(null);
        expect(extItem.getImage()).to.equal("");
    });

    it("should get website", function() {
        expect(extItem.getWebsite()).to.equal("http://test.com");
    });
});