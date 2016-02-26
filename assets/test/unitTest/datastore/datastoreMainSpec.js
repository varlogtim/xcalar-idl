// A basic test
describe('Datastore Test', function() {
    var $mainTabCache;

    before(function() {
        // go to the data store tab, or some UI effect like :visible cannot test
        $mainTabCache = $(".mainMenuTab.active");
        $('#dataStoresTab').click();
    });

    describe('Datastore Module Test', datasetModuleTest);
    describe('Dsobj Test', dsObjTest);
    describe('Data Form Module Test', dataFormModuleTest);
    describe('Data Preview Module Test', dataPreviewModuleTest);
    describe('Data Cart Module Test', dataCartModuleTest);

    after(function() {
        // go back to previous tab
        $mainTabCache.click();
    });
});

// test Datastore Module
function datasetModuleTest() {
    it('Should update num of datasets', function() {
        expect('hello world').to.equal('hello world');

        DataStore.update(3);
        verifyCurrentNum(3);
    });

    it('Should update num of datasets to right num', function() {
        var originNum = $("#exploreView .gridItems .ds").length;
        DataStore.update();
        verifyCurrentNum(originNum);
    });

    it("Should go to export view", function() {
        $("#outButton").click();
        assert.isTrue($("#exportView").is(":visible"), "see export view");
        assert.isFalse($("#exploreView").is(":visible"), "not see explore view");
    });

    it("Should go to explore view", function() {
        $("#inButton").click();
        assert.isTrue($("#exploreView").is(":visible"), "see export view");
        assert.isFalse($("#exportView").is(":visible"), "not see explore view");
    });

    function verifyCurrentNum(testNum) {
        var currentNum = Number($(".numDataStores").eq(0).text());
        expect(currentNum).to.equal(testNum);
    }
}