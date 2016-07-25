// A basic test
describe('Datastore Test', function() {
    var $mainTabCache;
    var minModeCache;

    before(function() {
        // go to the data store tab, or some UI effect like :visible cannot test
        $mainTabCache = $(".topMenuBarTab.active");
        $('#dataStoresTab').click();

        // turn off min mode, as it affectes DOM test
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    });

    describe('Datastore Module Test', datastoreModuleTest);
    describe('Dsobj Test', dsObjTest);
    describe('Dataset Form Module Test', dsFormModuleTest);
    describe('Dataset Preview Module Test', dsPreviewModuleTest);
    describe('Data Cart Module Test', dsCartModuleTest);
    describe('Dataset Sample Table Test', dsTableTest);

    after(function() {
        // go back to previous tab
        $mainTabCache.click();
        gMinModeOn = minModeCache;
    });
});

// test Datastore Module
function datastoreModuleTest() {
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