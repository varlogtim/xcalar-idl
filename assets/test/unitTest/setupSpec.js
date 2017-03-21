// A basic test
mocha.timeout(20000);
describe("Mocha Setup Test", function() {
    before(function() {
        UnitTest.onMinMode();
    });

    it("Should pass Hello World Test", function() {
        expect("hello world").to.equal("hello world");
    });

    // Note that this test helps to wait for 1s so that
    // UI has enough time to load
    it("Should pass simple promise test", function(done) {
        simplePromiseTest()
        .then(function(res) {
            expect(res).to.equal("pass");
            done();
        });
    });

    it("Should set up XI", function(done) {
        xcManager.setup()
        .then(function() {
            expect("pass").to.equal("pass");
            done();
        })
        .fail(function(error) {
            console.error(error);
            // fail case
            throw error;
        });
    });

    it("Should check license type", function() {
        var mode = XVM.getLicenseMode();
        var valid = (mode === XcalarMode.Oper) || (mode === XcalarMode.Mod)
                    || (mode === XcalarMode.Demo);
        expect(valid).to.be.true;
        if (mode === XcalarMode.Demo) {
            UnitTest.hasAlertWithTitle(DemoTStr.title);
        }
    });

    it("Should be able to test DSCart module", function() {
        expect(DSCart.getCarts()).to.exist;
    });

    it("Should see private function in module", function() {
        expect(DSCart.__testOnly__.filterCarts).to.be.a("function");
    });

    after(function() {
        UnitTest.offMinMode();
    });

    function simplePromiseTest() {
        var deferred = jQuery.Deferred();

        setTimeout(function() {
            deferred.resolve("pass");
        }, 100);

        return deferred.promise();
    }
});



