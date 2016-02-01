// A basic test
describe('Datastore Test', function() {
    describe('Datastore Module Test', datasetModuleTest);
    describe('Data Form Module Test', dataFormModuleTest);
    describe('Data Cart Module Test', dataCartModuleTest);
});

// test Datastore Module
function datasetModuleTest() {
    it('Can update num of datasets', function() {
        expect('hello world').to.equal('hello world');

        DataStore.update(3);
        verifyCurrentNum(3);
    });

    it('Can update num of datasets to right num', function() {
        var originNum = $("#exploreView .gridItems .ds").length;
        DataStore.update();
        verifyCurrentNum(originNum);
    });

    function verifyCurrentNum(testNum) {
        var currentNum = Number($(".numDataStores").eq(0).text());
        expect(currentNum).to.equal(testNum);
    }
}
