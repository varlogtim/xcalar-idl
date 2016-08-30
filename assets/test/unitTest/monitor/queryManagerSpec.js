describe('QueryManager Test', function() {

    describe('getElapsedTimeStr())', function() {
        it("getElapsedTimeStr should work", function() {
            var func = QueryManager.__testOnly__.getElapsedTimeStr;
            expect(func(999)).to.equal('999ms');
            expect(func(1000)).to.equal('1.0s');
            expect(func(1999)).to.equal('1.99s');
            expect(func(19999)).to.equal('19.9s');
            expect(func(69000)).to.equal('1m 9s');
            expect(func(699900)).to.equal('11m 39s');
            expect(func(5000000)).to.equal('1h 23m 20s');
            expect(func(105000000)).to.equal('29h 10m 0s');
        });
    });
});