describe("Authentication", function() {
    describe("generateHashTag function", function() {
        var genTag;
        before(function() {
            genTag = Authentication.__testOnly__.generateHashTag;
        });
        it ("should not have number in first character", function() {
            var cache = Math.random;
            Math.random = function() {
                return 0.01;
            };
            var tag = genTag();
            expect(tag.charAt(0)).to.equal("a");
            expect(tag.charAt(1)).to.equal("0");
            Math.random = cache;
        });

        it ("should return valid tag if Math.random produces .99", function() {
            var cache = Math.random;
            Math.random = function() {
                return 0.99;
            };
            var tag = genTag();
            expect(tag.charAt(0)).to.equal("Z");
            expect(tag.charAt(1)).to.equal("Z");
            Math.random = cache;
        });
    });

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
            var oldFunc = KVStore.put;
            var test = false;
            KVStore.put = function() {
                test = true;
                // test .fail code
                return PromiseHelper.reject("test");
            };

            var res = Authentication.getHashId();
            expect(res).to.equal("#" + oldAuthInfo.getHashTag() + oldIdCount);
            var curAuthInfo = Authentication.getInfo();
            expect(curAuthInfo.getIdCount()).to.equal(oldIdCount + 1);
            // will trigger KVStore.put
            expect(test).to.be.true;

            // reverse back
            curAuthInfo.idCount = oldIdCount;
            KVStore.put = oldFunc;
        });

        it("Authentication.setup should handle fail case", function(done) {
            var oldFunc = KVStore.getAndParse;
            KVStore.getAndParse = function() {
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
                KVStore.getAndParse = oldFunc;
            });
        });
    });
});
