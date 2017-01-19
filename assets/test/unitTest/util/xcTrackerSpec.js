describe("XcTracker", function() {
    var getCache;

    before(function() {
        getCache = xcTracker.__testOnly__.getCache;
    });

    it("Should Track User data", function() {
        var category = "";
        var data = {"test": "data"};

        var id = xcTracker.track(category, data);
        expect(id).not.to.be.null;
        expect(getCache().length).not.to.equal(0);
    });

    describe("Commit data test", function() {
        it("Should commit data", function(done) {
            var category = "";
            var data = {"test": "data"};
            xcTracker.track(category, data);

            xcTracker.commit()
            .then(function() {
                // should clear cache
                expect(getCache().length).to.equal(0);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should still work if has not data", function(done) {
            xcTracker.commit()
            .then(function() {
                // should clear cache
                expect(getCache().length).to.equal(0);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });
    });
});