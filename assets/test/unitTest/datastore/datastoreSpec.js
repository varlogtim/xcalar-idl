describe("Dataset-Datastore Module Test", function() {
    var $mainTabCache;

    before(function() {
        // go to the datasets tab,
        // or some UI effect like :visible cannot test
        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        // turn off min mode, as it affectes DOM test
        UnitTest.onMinMode();
    });

    it("Should update num of datasets", function() {
        expect("hello world").to.equal("hello world");

        DataStore.update(3);
        verifyCurrentNum(3);
    });

    it("Should update num of datasets to right num", function() {
        var originNum = $("#dsListSection .gridItems .ds").length;
        DataStore.update();
        verifyCurrentNum(originNum);
    });

    it("Should go to export view", function() {
        $("#outButton").click();
        assert.isTrue($("#datastore-out-view").is(":visible"));
        assert.isFalse($("#datastore-in-view").is(":visible"));
        assert.isFalse($("#datastore-target-view").is(":visible"));

        // click again should have no effect
        $("#outButton").click();
        assert.isTrue($("#datastore-out-view").is(":visible"));
        assert.isFalse($("#datastore-in-view").is(":visible"));
        assert.isFalse($("#datastore-target-view").is(":visible"));
    });

    it("should go to create target view", function() {
        $("#targetButton").click();
        assert.isFalse($("#datastore-out-view").is(":visible"));
        assert.isFalse($("#datastore-in-view").is(":visible"));
        assert.isTrue($("#datastore-target-view").is(":visible"));
    });

    it("Should go to import view", function() {
        $("#inButton").click();
        assert.isTrue($("#datastore-in-view").is(":visible"));
        assert.isFalse($("#datastore-out-view").is(":visible"));
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