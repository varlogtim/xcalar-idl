describe("Authentication Test", function() {

    describe("Basic API Test", function() {
        it("should getCount", function() {
            var res = Authentication.getCount();
            expect(res).to.be.a("number");
        });

        it("should get hash id", function() {
            var res = Authentication.getHashId();
            expect(res.startsWith("#t")).to.equal(true);
            res = Authentication.getHashId(true);
            expect(res.startsWith("t")).to.equal(true);
        });
    });
});
