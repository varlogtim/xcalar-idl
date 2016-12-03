describe('XcalarThrift', function() {
    it('remove findMinIdx when invalid', function(done) {
        xcalarApiListXdfs(tHandle, "findMinIdx", "*")
        .then(function(ret) {
            expect(ret.fnDescs.length).to.equal(1);
            expect(ret.fnDescs[0].fnName).to.equal('findMinIdx');
            expect(ret.fnDescs[0].numArgs).to.equal(-1);
            expect(ret.fnDescs[0].argDescs[0].typesAccepted).to.equal(0);
            expect(ret.fnDescs[0].argDescs[0].argDesc).to.equal("");

            XcalarListXdfs('findMinIdx', '*')
            .then(function(ret) {
                expect(ret.fnDescs.length).to.equal(0);
                done();
            });
        });
    });
});

