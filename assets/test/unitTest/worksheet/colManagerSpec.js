describe('ColManager Test', function() {
    var minModeCache;

    before(function() {
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    });

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
            var progCol = ColManager.newPullCol("test", "test2", "integer");
            expect(progCol.getFrontColName()).to.equal('test');
            expect(progCol.getBackColName()).to.equal('test2');
            expect(progCol.getType()).to.equal("integer");
            expect(progCol.isEmptyCol()).to.be.false;

            // case 2
            progCol = ColManager.newPullCol("test3");
            expect(progCol.getFrontColName()).to.equal('test3');
            expect(progCol.getBackColName()).to.equal('test3');
            expect(progCol.getType()).to.be.null;
        });

        it('ColManager.newDATACol() should work', function() {
            var progCol = ColManager.newDATACol();
            expect(progCol.isDATACol()).to.be.true;
        });
    });

    describe("Helper Function Test", function() {
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

        it('parseColFuncArgs(key) should work', function() {
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

        it('formatColumnCell should work', function() {
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

            expect(fn('123', 'default', -1)).to.equal('123');
            expect(fn('123', 'default', 0)).to.equal('123');
            expect(fn('123', 'default', 3)).to.equal('123.000');
            expect(fn('123', 'default', 3)).to.equal('123.000');

            expect(fn('123.456', 'default', -1)).to.equal('123.456');
            expect(fn('123.456', 'default', 0)).to.equal('123');
            expect(fn('123.456', 'default', 1)).to.equal('123.5'); // ceil round
            expect(fn('123.41', 'default', 1)).to.equal('123.4'); // floor round
            expect(fn('123.456789', 'default', 2)).to.equal('123.46');// ceil round
            expect(fn('123.45123', 'default', 2)).to.equal('123.45');// floor round
            expect(fn('123.456', 'default', 5)).to.equal('123.45600');
        });
    });

    describe('Column Modification Test', function() {
        var dsName, tableName, tableId, prefix;

        before(function(done) {
            UnitTest.addAll(testDatasets.fakeYelp, "yelp_colManager_test")
            .then(function(resDS, resTable, resPrefix) {
                dsName = resDS;
                tableName = resTable;
                tableId = xcHelper.getTableId(tableName);
                prefix = resPrefix;
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should Add New Column", function() {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);

            ColManager.addNewCol(1, tableId, ColDir.Left);
            expect(getColLen(tableId) - colLen).to.equal(1);
            expect(table.getCol(1).isEmptyCol()).to.be.true;
        });

        it("Should Delete Column", function() {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);

            ColManager.delCol([1, 2], tableId);
            expect(getColLen(tableId) - colLen).to.equal(-2);
            var progCol = table.getCol(1);
            expect(progCol.isEmptyCol()).to.be.false;
            expect(progCol.getFrontColName()).not.to.equal("yelping_since");
        });

        it("Should Pull Column", function(done) {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);
            var colName = xcHelper.getPrefixColName(prefix, "yelping_since");

            var options = {
                "direction"  : ColDir.Left,
                "fullName"   : colName,
                "escapedName": colName
            };

            ColManager.pullCol(1, tableId, options)
            .then(function() {
                expect(getColLen(tableId) - colLen).to.equal(1);
                var progCol = table.getCol(1);
                expect(progCol.getFrontColName()).to.equal("yelping_since");
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should Rename Column", function() {
            // the yelping_since col
            var progCol = gTables[tableId].getCol(1);
            var $input = $("#xcTable-" + tableId + " th.col1 .editableHead");
            var backCol = xcHelper.getPrefixColName(prefix, "yelping_since");

            ColManager.renameCol(1, tableId, "yelping_since_test", {
                "keepEditable": true
            });
            expect(progCol.getFrontColName()).to.equal("yelping_since_test");
            expect(progCol.getBackColName()).to.equal(backCol);
            expect($input.val()).to.equal("yelping_since_test");
            expect($input.prop("disabled")).to.be.false;
            // rename back
            ColManager.renameCol(1, tableId, "yelping_since");
            expect(progCol.getFrontColName()).to.equal("yelping_since");
            expect(progCol.getBackColName()).to.equal(backCol);
            expect($input.val()).to.equal("yelping_since");
            expect($input.prop("disabled")).to.be.true;
        });

        it("Should Format Column", function() {
            var table = gTables[tableId];
            var backCol = xcHelper.getPrefixColName(prefix, "average_stars");
            var colNum = table.getColNumByBackName(backCol);
            var progCol = table.getCol(colNum);
            expect(progCol).not.to.be.null;

            var $td = $("#xcTable-" + tableId).find("td.col" + colNum).eq(0);
            // case 1
            ColManager.format([colNum], tableId, [ColFormat.Percent]);
            expect(progCol.getFormat()).to.equal(ColFormat.Percent);
            var text = $td.find(".displayedData").text();
            expect(text.endsWith("%")).to.be.true;
            // case 2
            ColManager.format([colNum], tableId, [ColFormat.Default]);
            expect(progCol.getFormat()).to.equal(ColFormat.Default);
            text = $td.find(".displayedData").text();
            expect(text.endsWith("%")).to.be.false;
            // case 3 (nothing happen if change to same format)
            ColManager.format([colNum], tableId, [ColFormat.Default]);
            expect(progCol.getFormat()).to.equal(ColFormat.Default);
            text = $td.find(".displayedData").text();
            expect(text.endsWith("%")).to.be.false;
        });

        it("Should Round Column", function() {
            var table = gTables[tableId];
            var backCol = xcHelper.getPrefixColName(prefix, "average_stars");
            var colNum = table.getColNumByBackName(backCol);
            var progCol = table.getCol(colNum);
            expect(progCol).not.to.be.null;
            
            var $td = $("#xcTable-" + tableId).find("td.col" + colNum).eq(0);
            var srcText = $td.find(".displayedData").text();
            // case 1
            ColManager.roundToFixed([colNum], tableId, [3]);
            expect(progCol.getDecimal()).to.equal(3);
            var text = $td.find(".displayedData").text();
            expect(text).not.to.be.equal(srcText);
            var index = text.indexOf(".");
            // has 3 decimals after dot, include dot is 4
            expect(text.length - index).to.equal(4);
            // case 2
            ColManager.roundToFixed([colNum], tableId, [-1]);
            expect(progCol.getDecimal()).to.equal(-1);
            text = $td.find(".displayedData").text();
            expect(text).to.be.equal(srcText);
        });

        it("Should Reorder Column", function() {
            var table = gTables[tableId];
            var progCol = table.getCol(1);

            ColManager.reorderCol(tableId, 1, 2, {
                "undoRedo": true
            });
            expect(table.getCol(2)).to.equal(progCol);

            // order back
            ColManager.reorderCol(tableId, 2, 1, {
                "undoRedo": true
            });
            expect(table.getCol(1)).to.equal(progCol);
        });

        it("Should check col name", function() {
            var html = '<div class="unittest-checkCol">' +
                            '<input type="text">' +
                        '</div>';
            var $target = $(html).appendTo($("body"));
            var $input = $target.find("input");
            var table = gTables[tableId];
            var firstColName = table.getCol(1).getFrontColName();
            var testCases = [{
                // error case with invalid char
                "val"    : "test^test",
                "inValid": true
            },
            {
                // error case with reserved name
                "val"    : "DATA",
                "inValid": true
            },
            {
                // error case with reserved name
                "val"    : "0test",
                "inValid": true
            },
            {
                // error case with duplicate name
                "val"    : firstColName,
                "inValid": true
            },
            {
                // no error with case with duplicate name
                "val"    : firstColName,
                "inValid": false,
                "colNum" : 1
            },
            {
                // no error with valid name
                "val"    : "test123",
                "inValid": false
            }];

            testCases.forEach(function(testCase) {
                console.log(testCase)
                $input.val(testCase.val);
                var colNum = testCase.colNum;
                var res = ColManager.checkColName($input, tableId, colNum);
                var inValid = testCase.inValid;
                expect(res).to.equal(inValid);
            });

            $(".tooltip").hide();
            $target.remove();
        });

        it("Should Duplicate Column", function() {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);
            var progCol = table.getCol(1);

            ColManager.dupCol(1, tableId);
            expect(getColLen(tableId) - colLen).to.equal(1);
            var dupCol = table.getCol(2);
            expect(dupCol.getFrontColName())
            .not.to.equal(progCol.getFrontColName());
            expect(dupCol.getBackColName())
            .to.equal(progCol.getBackColName());
        });

        it("Should Delete Duplicate Column", function() {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);
            var progCol = table.getCol(1);

            ColManager.delDupCols(2, tableId);

            expect(getColLen(tableId) - colLen).to.equal(-1);
            expect(table.getCol(2).getBackColName())
            .not.to.equal(progCol.getBackColName());
        });

        it("Should Delete All Dups", function() {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);
            ColManager.dupCol(1, tableId);
            ColManager.dupCol(2, tableId);
            ColManager.dupCol(3, tableId);

            ColManager.delAllDupCols(tableId);
            expect(getColLen(tableId) - colLen).to.equal(0);
        });

        it("Should hide and unhide column", function(done) {
            var colNum = 1;
            var $th = $("#xcTable-" + tableId).find(".th.col" + colNum);
            var progCol = gTables[tableId].getCol(colNum);

            ColManager.hideCols([colNum], tableId)
            .then(function() {
                expect($th.outerWidth()).to.equal(gHiddenTableWidth);
                expect(progCol.hasHidden()).to.be.true;
                
                return ColManager.unhideCols([colNum], tableId);
            })
            .then(function() {
                expect($th.outerWidth()).to.equal(progCol.getWidth());
                expect(progCol.hasHidden()).to.be.false;
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should hide and unhide column with animation", function(done) {
            var innerCahceMinMode = gMinModeOn;
            gMinModeOn = false;
            var colNum = 1;
            var $th = $("#xcTable-" + tableId).find(".th.col" + colNum);
            var progCol = gTables[tableId].getCol(colNum);

            ColManager.hideCols([colNum], tableId)
            .then(function() {
                expect($th.outerWidth()).to.equal(gHiddenTableWidth);
                expect(progCol.hasHidden()).to.be.true;
                
                return ColManager.unhideCols([colNum], tableId);
            })
            .then(function() {
                expect($th.outerWidth()).to.equal(progCol.getWidth());
                expect(progCol.hasHidden()).to.be.false;
                gMinModeOn = innerCahceMinMode;
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should text align column", function() {
            var colNum = 1;
            var $td = $("#xcTable-" + tableId).find("td.col" + colNum).eq(0);
            var progCol = gTables[tableId].getCol(colNum);
            // case 1
            ColManager.textAlign([colNum], tableId, "leftAlign");
            expect(progCol.getTextAlign()).to.equal(ColTextAlign.Left);
            expect($td.hasClass("textAlignLeft")).to.be.true;

            // case 2
            ColManager.textAlign([colNum], tableId, "rightAlign");
            expect(progCol.getTextAlign()).to.equal(ColTextAlign.Right);
            expect($td.hasClass("textAlignRight")).to.be.true;

            // case 3
            ColManager.textAlign([colNum], tableId, "wrapAlign");
            expect(progCol.getTextAlign()).to.equal(ColTextAlign.Wrap);
            expect($td.hasClass("textAlignWrap")).to.be.true;

            // case 4
            ColManager.textAlign([colNum], tableId, "centerAlign");
            expect(progCol.getTextAlign()).to.equal(ColTextAlign.Center);
            expect($td.hasClass("textAlignCenter")).to.be.true;
        });

        after(function(done) {
            UnitTest.deleteAll(tableName, dsName)
            .always(function() {
                done();
            });
        });
    });

    after(function() {
        gMinModeOn = minModeCache;
    });

    function getColLen(tableId) {
        var table = gTables[tableId];
        return table.tableCols.length;
    }
});