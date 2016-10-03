describe('ColManager', function() {
    describe('Basic API Test', function() {
        it('ColManager.newCol() should work', function() {
            var progCol = ColManager.newCol({
                "name"    : "test",
                "type"    : "string",
                "width"   : gNewCellWidth,
                "isNewCol": false
            });

            expect(progCol.getFrontColName()).to.equal('test');
        });

        it('ColManager.newPullCol() should work', function() {
            var progCol = ColManager.newPullCol("test", "integer");
            expect(progCol.getFrontColName()).to.equal('test');
            expect(progCol.getBackColName()).to.equal('test');
            expect(progCol.getType()).to.equal("integer");
            expect(progCol.isEmptyCol()).to.be.false;
            expect(progCol.getWidth()).to.equal(gNewCellWidth);
        });

        it('ColManager.newDATACol() should work', function() {
            var progCol = ColManager.newDATACol();
            expect(progCol.isDATACol()).to.be.true;
        });
    });

    it('parsePullColArgs(progCol) should work', function() {
        var fn = ColManager.__testOnly__.parsePullColArgs;
        var progCol = {func: {}};
        var func = progCol.func;

        // parsePullColArgs checks to make sure func.name is "pull" and
        // that pull has exactly one argument

        func.name = 'pull';
        func.args = ['a'];
        expect(fn(progCol)).to.equal(true);

        func.args = ['a b'];
        expect(fn(progCol)).to.equal(true);

        func.name = 'pull';
        func.args = [0];
        expect(fn(progCol)).to.equal(true);

        func.name = 'pull';
        func.args = [""];
        expect(fn(progCol)).to.equal(true);

        func.name = 'pull';
        func.args = ['a', 'b'];
        expect(fn(progCol)).to.equal(false);

        func.args = [{func: {}}];
        expect(fn(progCol)).to.equal(false);

        func.args = [];
        expect(fn(progCol)).to.equal(false);

        func.args = [['a']];
        expect(fn(progCol)).to.equal(false);

        func.args = [null];
        expect(fn(progCol)).to.equal(false);

        func.args = [undefined];
        expect(fn(progCol)).to.equal(false);

        func.name = 'map';
        func.args = ['a'];
        expect(fn(progCol)).to.equal(false);

        func.name = ' pull';
        func.args = ['a'];
        expect(fn(progCol)).to.equal(false);
    });

    it('parseFuncString(str, func) should work', function() {
        // functions that call ColManager.parseFuncString already
        // make sure the params are validated
        var fn = ColManager.parseFuncString;
        var func;
        var str;
        var desiredStr;

        str = "add(1,2)";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"add","args":[1,2]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "add  (1,3)";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"add","args":[1,3]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "add(1  ,4)";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"add","args":[1,4]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "add ( 1  , 5  )";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"add","args":[1,5]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = 'concat ("wo rd",5)';
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"concat","args":["\\\"wo rd\\\"",5]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = 'concat (\'wo"r"a"d\',5)';
        func = {args: []};
        fn(str, func);
        var desiredFunc = {
            args: ["'wo\"r\"a\"d'", 5],
            name: 'concat'
        };
        expect(func.args[0]).to.deep.equal(desiredFunc);

        str = 'con\\"c\\,at (\'w\\,o"r\\\'d\',5)';
        func = {args: []};
        fn(str, func);
        desiredFunc = {
            args: ["'w\\,o\"r\\'d'", 5],
            name: 'con\\"c\\,at'
        };
        expect(func.args[0]).to.deep.equal(desiredFunc);

        str = 'concat ("wo\\"rd",6)';
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"concat","args":["\\"wo\\\\\\"rd\\"",6]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = 'concat ("w\'o\\"rd",7)';
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"concat","args":["\\"w\'o\\\\\\"rd\\"",7]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = 'add(1e2,7)';
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"add","args":["1e2",7]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = 'add(0xFF,8)';
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"add","args":["0xFF",8]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = 'add(null,9)';
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"add","args":["null",9]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "map(add()";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"map","args":[{"name":"add","args":[]}]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "map(add( , )";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"map","args":[{"name":"add","args":["",""]}]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "map(add(,)";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"map","args":[{"name":"add","args":[]}]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "map(add(1,)";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"map","args":[{"name":"add","args":[1]}]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = "map(add(1,,2)";
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"map","args":[{"name":"add","args":[1,2]}]}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

        str = 'map( add(1,con cat ("ab", "cd" )) )';
        func = {args: []};
        fn(str, func);
        desiredStr = '[{"name":"map","args":' +
                        '[{"name":"add","args":' +
                            '[1,{"name":"con cat","args":["\\"ab\\"","\\"cd\\""]}]' +
                        '}]' +
                    '}]';
        expect(JSON.stringify(func.args)).to.equal(desiredStr);

    });

    it ('parseColFuncArgs(key) should work', function() {
        var fn = ColManager.__testOnly__.parseColFuncArgs;

        expect(fn('colname')).to.deep.equal(['colname']);
        // expect(fn('colname[child]')).to.deep.equal(['colname', 'child']);
        // expect(fn('colname\\[child\\]')).to.deep.equal(['colname[child]']);
        // expect(fn('colname\\[child]')).to.deep.equal(['colname[child]']);
        // expect(fn('colname\\\\[child]')).to.deep.equal(['colname\\', 'child']);
        // expect(fn('colname[\\[a]')).to.deep.equal(['colname', '[a']);
        expect(fn('colname\\.child')).to.deep.equal(['colname\\.child']);
        expect(fn('colname.child')).to.deep.equal(['colname', 'child']);
        // expect(fn('colname\\.child')).to.deep.equal(['colname.child']);
        // expect(fn('colname\\\\.child')).to.deep.equal(['colname\\', 'child']);
        // expect(fn('colname\\\\\\.child')).to.deep.equal(['colname\\.child']);
        // expect(fn('colname\\.\\\\.child')).to.deep.equal(['colname.\\','child']);
        expect(fn('')).to.equal('');

        expect(fn('colname.child')).to.not.deep.equal(['child', 'colname']);
    });

    it ('formatColumnCell(val, format, decimals) should work', function() {
        var fn = ColManager.__testOnly__.formatColumnCell;

        // always takes a number-like string from an int or float column

        expect(fn('word', 'percent', 3)).to.equal('word');
        expect(fn('null', 'percent', 3)).to.equal('null');

        expect(fn('word234', 'percent', 3)).to.equal('word234');
        expect(fn('234word', 'percent', 4)).to.equal('23400.00%');

        expect(fn('123', 'percent', 1)).to.equal('12300%');
        expect(fn('123', 'percent', -1)).to.equal('12300%');

        expect(fn('123.567', 'percent', 1)).to.equal('12360%');
        expect(fn('123.567', 'percent', -1)).to.equal('12356.7%');
        expect(fn('1.23567', 'percent', -1)).to.equal('123.567%');
        expect(fn('1.23567', 'percent', 2)).to.equal('124%');
        expect(fn('1.23567', 'percent', 3)).to.equal('123.6%');
        expect(fn('1.23567', 'percent', 0)).to.equal('100%');

        expect(fn('123', null, -1)).to.equal('123');
        expect(fn('123', null, 0)).to.equal('123');
        expect(fn('123', null, 3)).to.equal('123.000');
        expect(fn('123', null, 3)).to.equal('123.000');

        expect(fn('123.456', null, -1)).to.equal('123.456');
        expect(fn('123.456', null, 0)).to.equal('123');
        expect(fn('123.456', null, 1)).to.equal('123.5'); // ceil round
        expect(fn('123.41', null, 1)).to.equal('123.4'); // floor round
        expect(fn('123.456789', null, 2)).to.equal('123.46');// ceil round
        expect(fn('123.45123', null, 2)).to.equal('123.45');// floor round
        expect(fn('123.456', null, 5)).to.equal('123.45600');

    });

});