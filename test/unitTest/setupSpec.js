// A basic test
describe('Unit test can run', function(done) {
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
        expect(DataCart.getCarts().length >= 0);
    });

    it('Should see private function in module', function() {
        expect(DataCart.__testOnly__.filterCarts instanceof Function);
    });
});


function simplePromiseTest() {
    var deferred = jQuery.Deferred();

    setTimeout(function() {
        deferred.resolve('pass');
    }, 1000);

    return deferred.promise();
}