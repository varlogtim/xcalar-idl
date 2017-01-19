describe("Datastore Module Test", function() {
    var $mainTabCache;

    before(function() {
        // go to the data store tab,
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

        // click again should have no effect
        $("#outButton").click();
        assert.isTrue($("#datastore-out-view").is(":visible"));
        assert.isFalse($("#datastore-in-view").is(":visible"));
    });

    it("Should go to import view", function() {
        $("#inButton").click();
        assert.isTrue($("#datastore-in-view").is(":visible"));
        assert.isFalse($("#datastore-out-view").is(":visible"));
    });

    it("Should check sample size in interactive mode", function() {
        var oldFunc = XVM.getLicenseMode;
        var oldgMaxSampleSize = gMaxSampleSize;
        XVM.getLicenseMode = function() {
            return XcalarMode.Mod;
        };

        gMaxSampleSize = 100;

        // normal case
        var error = DataStore.checkSampleSize(50);
        expect(error).to.be.null;

        // error case
        error = DataStore.checkSampleSize(200);
        var res = xcHelper.replaceMsg(ErrWRepTStr.InvalidSampleSize, {
            "size": xcHelper.sizeTranslator(gMaxSampleSize)
        });
        expect(error).to.equal(res);

        gMaxSampleSize = oldgMaxSampleSize;
        XVM.getLicenseMode = oldFunc;
    });

    it("Should not check sample size in other mode", function() {
        var oldFunc = XVM.getLicenseMode;
        XVM.getLicenseMode = function() {
            return XcalarMode.Oper;
        };

        var error = DataStore.checkSampleSize(50);
        expect(error).to.be.null;

        XVM.getLicenseMode = oldFunc;
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