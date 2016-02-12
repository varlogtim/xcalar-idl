describe('OperationsModal', function() {
       
    describe('checkHasFuncFormat', function() {
        var func;
        before(function() {
            func = OperationsModal.__testOnly__.hasFuncFormat;
        });

        // it ('"add(x,1)" should be true', function() {
        it ('hasFuncFormat(arg) should return correctly', function() {
            expect(func('add(x,1)')).to.equal(true);
            expect(func('add(x,1')).to.equal(false);
            expect(func('(xwf,1)')).to.equal(false);
            expect(func('add(xwf,1)x')).to.equal(false);
            expect(func('(xwf,1)x')).to.equal(false);
            expect(func('a(x,1))')).to.equal(false);
            expect(func('a((x,1)')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
            expect(func('a(()"("x,1))')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);

            expect(func('a(()x,(1))')).to.equal(true);
            expect(func('a("((("x,1)')).to.equal(true);
            expect(func('a(""x,1)')).to.equal(true);
            expect(func('a(x,1)')).to.equal(true);
        });
    });
});