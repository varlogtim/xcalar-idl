// A basic test
mocha.timeout(5000);
describe('Mocha Setup Test', function() {
    this.timeout(5000);
    it('Should pass Hello World Test', function() {
        expect('hello world').to.equal('hello world');
    });

    // Note that this test helps to wait for 1s so that 
    // UI has enough time to load
    it('Should pass simple promise test', function(done) {
        simplePromiseTest()
        .then(function(res) {
            expect(res).to.equal('pass');
            done();
        });
    });

    it('Should be able to test DataCart module', function() {
        expect(DataCart.getCarts()).to.exist;
    });

    it('Should see private function in module', function() {
        expect(DataCart.__testOnly__.filterCarts).to.be.a('function');
    });

    function simplePromiseTest() {
        var deferred = jQuery.Deferred();

        setTimeout(function() {
            deferred.resolve('pass');
        }, 4000);

        return deferred.promise();
    }
});



