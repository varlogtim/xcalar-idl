describe("Data Source Manager Test", function() {
    var $mainTabCache;

    before(function() {
        // go to the datasets tab,
        // or some UI effect like :visible cannot test
        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        // turn off min mode, as it affectes DOM test
        UnitTest.onMinMode();
    });
    
    it("should go to create target view", function() {
        $("#targetButton").click();
        assert.isFalse($("#datastore-in-view").is(":visible"));
        assert.isTrue($("#datastore-target-view").is(":visible"));
    });

    it("Should go to import view", function() {
        $("#inButton").click();
        assert.isTrue($("#datastore-in-view").is(":visible"));
        assert.isFalse($("#datastore-target-view").is(":visible"));
    });

    function verifyCurrentNum(testNum) {
        var currentNum = Number($(".numDataStores").eq(0).text());
        expect(currentNum).to.equal(testNum);
    }

    after(function() {
        // go back to previous tab
        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});