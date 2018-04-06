describe("Authentication Test", function() {

    describe("Basic API Test", function() {
        var oldAuthInfo;
        var oldIdCount;

        before(function() {
            oldAuthInfo = Authentication.getInfo();
            oldIdCount = oldAuthInfo.getIdCount();
        });

        it("should get info", function() {
            var res = Authentication.getInfo();
            expect(res).to.be.instanceof(XcAuth);
        });

        it("should get hash id", function() {
            var oldFunc = KVStore.prototype.put;
            var test = false;
            KVStore.prototype.put = function() {
                test = true;
                // test .fail code
                return PromiseHelper.reject("test");
            };

            var res = Authentication.getHashId();
            expect(res).to.equal("#" + oldIdCount);
            var curAuthInfo = Authentication.getInfo();
            expect(curAuthInfo.getIdCount()).to.equal(oldIdCount + 1);
            // will trigger  KVStore.prototype.put
            expect(test).to.be.true;

            // reverse back
            curAuthInfo.idCount = oldIdCount;
            KVStore.prototype.put = oldFunc;
        });

        it("Authentication.setup should handle fail case", function(done) {
            var oldFunc = KVStore.prototype.getAndParse;
            KVStore.prototype.getAndParse = function() {
                return PromiseHelper.reject("test");
            };

            Authentication.setup()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                KVStore.prototype.getAndParse = oldFunc;
            });
        });
    });
});
