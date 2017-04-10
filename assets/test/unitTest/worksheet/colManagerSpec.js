describe('ColManager Test', function() {
    var minModeCache;

    before(function() {
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    });

    describe('Basic API Test', function() {
        it('ColManager.newCol() should work', function() {
            var progCol = ColManager.newCol({
                "name": "test",
                "type": "string",
                "width": gNewCellWidth,
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

        describe("ColManager.getCellType() test", function() {
            var tableId = "ZZ1";
            var $table;

            before(function() {
                var progCol1 = new ProgCol({
                    "name": "testCol",
                    "backName": "testCol",
                    "isNewCol": false,
                    "type": "mixed",
                    "func": {
                        "name": "pull"
                    }
                });

                var progCol2 = new ProgCol({
                    "name": "DATA",
                    "backName": "DATA",
                    "isNewCol": false,
                    "func": {
                        "name": "raw"
                    }
                });
                var table = new TableMeta({
                    "tableName": "unitTest#ZZ1",
                    "tableId": tableId,
                    "tableCols": [progCol1, progCol2],
                    "isLocked": false
                });

                gTables[tableId] = table;

                var html = '<table id="xcTable-ZZ1">'+
                                '<tr class="row0">' +
                                    '<td class="col1"><div>3</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":"3"}</div></td>' +
                                '</tr>' +
                                '<tr class="row1">' +
                                    '<td class="col1"><div class="undefined">FNF</div></td>' +
                                    '<td class="col2"><div class="originalData">{"a":"b"}</div></td>' +
                                '</tr>' +
                                '<tr class="row2">' +
                                    '<td class="col1"><div>3</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":3}</div></td>' +
                                '</tr>' +
                                '<tr class="row3">' +
                                    '<td class="col1"><div>[3,4]</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":[3,4]}</div></td>' +
                                '</tr>' +
                            +'<table>';
                $("#container").append(html);
                $table = $("#xcTable-ZZ1");
            });

            it("ColManager.getCellType should work", function() {
                var fn = ColManager.getCellType;
                expect(fn($table.find("td").eq(0), tableId)).to.equal('string');
                expect(fn($table.find("td").eq(2), tableId)).to.equal('undefined');
                expect(fn($table.find("td").eq(4), tableId)).to.equal('integer');
                expect(fn($table.find("td").eq(6), tableId)).to.equal('array');
            });

            after(function() {
                $table.remove();
                delete gTables["ZZ1"];
            });
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
            desiredStr = '[{"version":1,"name":"add","args":[1,2]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "add  (1,3)";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"add","args":[1,3]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "add(1  ,4)";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"add","args":[1,4]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "add ( 1  , 5  )";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"add","args":[1,5]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'concat ("wo rd",5)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"concat","args":["\\\"wo rd\\\"",5]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'concat (\'wo"r"a"d\',5)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"concat","args":["\'wo\\\"r\\\"a\\\"d\'",5]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'con\\"c\\,at (\'w\\,o"r\\\'d\',5)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"con\\\\\\"c\\\\,at","args":["\'w\\\\,o\\"r\\\\\'d\'",5]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'concat ("wo\\"rd",6)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"concat","args":["\\"wo\\\\\\"rd\\"",6]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'concat ("w\'o\\"rd",7)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"concat","args":["\\"w\'o\\\\\\"rd\\"",7]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'add(1e2,7)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"add","args":["1e2",7]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'add(0xFF,8)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"add","args":["0xFF",8]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'add(null,9)';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"add","args":["null",9]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "map(add()";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[]}]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "map(add( , )";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"map","args":[{"version":1,"name":"add","args":["",""]}]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "map(add(,)";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[]}]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "map(add(1,)";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[1]}]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = "map(add(1,,2)";
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[1,2]}]}]';
            expect(JSON.stringify(func.args)).to.equal(desiredStr);

            str = 'map( add(1,con cat ("ab", "cd" )) )';
            func = {args: []};
            fn(str, func);
            desiredStr = '[{"version":1,"name":"map","args":' +
                            '[{"version":1,"name":"add","args":' +
                                '[1,{"version":1,"name":"con cat","args":["\\"ab\\"","\\"cd\\""]}]' +
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
            expect(fn('colname\\.child')).to.deep.equal(['colname.child']);
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

        it('getTdInfo should work', function() {
            var tdValue;
            var nested;
            var fn = ColManager.__testOnly__.getTdInfo;

            // === null td values, knf false ===
            tdValue = {"a": {"b": null}};
            nested = ["a", "b"];
            expect(fn(tdValue, nested)).to.deep.equal({
                tdValue: null,
                knf: false,
                isChildOfArray: false
            });

            tdValue = {"a": [{"b": null}]};
            nested = ["a", "0", "b"];
            expect(fn(tdValue, nested)).to.deep.equal({
                tdValue: null,
                knf: false,
                isChildOfArray: true
            });

            // === null td values, knf true ===
            tdValue = {"a": {}};
            nested = ["a", "b"];
            expect(fn(tdValue, nested)).to.deep.equal({
                tdValue: null,
                knf: true,
                isChildOfArray: false
            });

            tdValue = {"a": [{}]};
            nested = ["a", "0", "b"];
            expect(fn(tdValue, nested)).to.deep.equal({
                tdValue: null,
                knf: true,
                isChildOfArray: true
            });

            tdValue = {"a": [{"b": "no"}]};
            nested = ["a", "x", "b"];
            expect(fn(tdValue, nested)).to.deep.equal({
                tdValue: null,
                knf: true,
                isChildOfArray: false
            });

            // === string td values ===
            tdValue = {"a": {"b": "yes"}};
            nested = ["a", "b"];
            expect(fn(tdValue, nested)).to.deep.equal({
                tdValue: "yes",
                knf: false,
                isChildOfArray: false
            });

            tdValue = {"a": [{"b": "yes"}]};
            nested = ["a", "0", "b"];
            expect(fn(tdValue, nested)).to.deep.equal({
                tdValue: "yes",
                knf: false,
                isChildOfArray: true
            });

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
                done(error);
            });
        });

        it("Should Add New Column", function() {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);

            ColManager.addNewCol(1, tableId, ColDir.Left);
            expect(getColLen(tableId) - colLen).to.equal(1);
            expect(table.getCol(1).isEmptyCol()).to.be.true;
        });

        // simple test for newColumn and immediate classes on th
        // XX need to expand on this test
        it("Should Exec Column (Pull)", function() {
            // initial state
            var $th = $("#xcTable-" + tableId + " th.col1");
            expect($th.hasClass('newColumn')).to.be.true;
            expect($th.find('.prefix').hasClass('immediate')).to.be.true;

            // give a name then exec a pullcol
            ColManager.renameCol(1, tableId, "fakeCol");
            var usrStr = 'fakeCol" = pull(schedule::fakeCol)';
            ColManager.execCol("pull", usrStr, tableId, 1);
            expect($th.hasClass('newColumn')).to.be.false;
            expect($th.find('.prefix').hasClass('immediate')).to.be.false;
        });

        // simple test for newColumn and immediate classes on th
        // XX need to expand on this test
        it('Undo Exec Column should restore previous col', function(done) {
            // initial state
            var $th = $("#xcTable-" + tableId + " th.col1");
            expect($th.hasClass('newColumn')).to.be.false;
            expect($th.find('.prefix').hasClass('immediate')).to.be.false;

            // exec a pullcol
            SQL.undo()
            .then(function() {
                expect($th.hasClass('newColumn')).to.be.true;
                expect($th.find('.prefix').hasClass('immediate')).to.be.true;
                done();
            });
        });

        it("Should Delete Column", function() {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);

            expect(table.hasCol("average_stars")).to.be.true;
            ColManager.delCol([1, 2], tableId);
            expect(getColLen(tableId) - colLen).to.equal(-2);
            var progCol = table.getCol(1);
            expect(progCol.isEmptyCol()).to.be.false;
            expect(progCol.getFrontColName()).not.to.equal("average_stars");
            expect(table.hasCol("average_stars")).to.be.false;
        });

        it("Should Pull Column", function(done) {
            var table = gTables[tableId];
            var colLen = getColLen(tableId);
            var colName = xcHelper.getPrefixColName(prefix, "average_stars");
            var options = {
                "direction": ColDir.Left,
                "fullName": colName,
                "escapedName": colName
            };

            ColManager.pullCol(1, tableId, options)
            .then(function() {
                expect(getColLen(tableId) - colLen).to.equal(1);
                var progCol = table.getCol(1);
                expect(progCol.getFrontColName()).to.equal("average_stars");
                done();
            })
            .fail(function(error) {
                done(error);
            });
        });

        it("Should Rename Column", function() {
            // the yelping_since col
            var progCol = gTables[tableId].getCol(1);
            var $input = $("#xcTable-" + tableId + " th.col1 .editableHead");
            var backCol = xcHelper.getPrefixColName(prefix, "average_stars");

            ColManager.renameCol(1, tableId, "average_stars_test", {
                "keepEditable": true
            });
            expect(progCol.getFrontColName()).to.equal("average_stars_test");
            expect(progCol.getBackColName()).to.equal(backCol);
            expect($input.val()).to.equal("average_stars_test");
            expect($input.prop("disabled")).to.be.false;
            // rename back
            ColManager.renameCol(1, tableId, "average_stars");
            expect(progCol.getFrontColName()).to.equal("average_stars");
            expect(progCol.getBackColName()).to.equal(backCol);
            expect($input.val()).to.equal("average_stars");
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
            var fullColName = table.getCol(1).getFrontColName(true);
            var testCases = [{
                // error case with invalid char
                "val": "test^test",
                "inValid": true
            },{
                // error case with reserved name
                "val": "DATA",
                "inValid": true
            },{
                // error case with reserved name
                "val": "0test",
                "inValid": true
            },{
                // error case with duplicate name but no prefix
                "val": firstColName,
                "inValid": false
            },{
                // error case with duplicate name
                "val": fullColName,
                "inValid": true
            },{
                // no error with valid name
                "val": "test123",
                "inValid": false
            }];

            testCases.forEach(function(testCase) {
                $input.val(testCase.val);
                var colNum = testCase.colNum;
                var res = ColManager.checkColName($input, tableId, colNum);
                var inValid = testCase.inValid;
                expect(res).to.equal(inValid);
            });

            $(".tooltip.error").tooltip("destroy");
            $target.remove();
        });

        it("checkDuplicateName should work", function() {
            var table = gTables[tableId];
            var firstColName = table.getCol(1).getFrontColName();
            var fullColName = table.getCol(1).getFrontColName(true);

            var testCases = [{
                // error case with duplicate name
                "val": fullColName,
                "inValid": true,
                "colNum": 2
            },{
                // no error with case with duplicate name
                "val": fullColName,
                "inValid": false,
                "colNum": 1
            }];

            testCases.forEach(function(testCase) {
                var colNum = testCase.colNum;
                var val = testCase.val;
                var res = ColManager.checkDuplicateName(tableId, colNum, val);
                var inValid = testCase.inValid;
                expect(res).to.equal(inValid);
            });
        });

        it("Should hide and maximize column", function(done) {
            var colNum = 1;
            var $th = $("#xcTable-" + tableId).find(".th.col" + colNum);
            var progCol = gTables[tableId].getCol(colNum);

            ColManager.minimizeCols([colNum], tableId)
            .then(function() {
                expect($th.outerWidth()).to.equal(gHiddenColumnWidth);
                expect(progCol.hasMinimized()).to.be.true;

                return ColManager.maximizeCols([colNum], tableId);
            })
            .then(function() {
                expect($th.outerWidth()).to.equal(progCol.getWidth());
                expect(progCol.hasMinimized()).to.be.false;
                done();
            })
            .fail(function(error) {
                done(error);
            });
        });

        it("Should minimize and maximize column with animation", function(done) {
            var innerCahceMinMode = gMinModeOn;
            gMinModeOn = false;
            var colNum = 1;
            var $th = $("#xcTable-" + tableId).find(".th.col" + colNum);
            var progCol = gTables[tableId].getCol(colNum);

            ColManager.minimizeCols([colNum], tableId)
            .then(function() {
                expect($th.outerWidth()).to.equal(gHiddenColumnWidth);
                expect(progCol.hasMinimized()).to.be.true;

                return ColManager.maximizeCols([colNum], tableId);
            })
            .then(function() {
                expect($th.outerWidth()).to.equal(progCol.getWidth());
                expect(progCol.hasMinimized()).to.be.false;
                gMinModeOn = innerCahceMinMode;
                done();
            })
            .fail(function(error) {
                done(error);
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

        it("Should unnest a column", function() {
            var table = gTables[tableId];
            var backCol = xcHelper.getPrefixColName(prefix, "votes");
            var colNum = table.getColNumByBackName(backCol);
            var progCol = table.getCol(colNum);

            expect(progCol).not.to.be.null;

            var numCols = getColLen(tableId);
            var rowNum = 1;
            ColManager.unnest(tableId, colNum, rowNum);
            // 3 new cols: votes.funny, votes.useful and votes.cool
            expect(getColLen(tableId) - numCols).to.equal(3);
        });

        it("Should split column", function(done) {
            var table = gTables[tableId];
            var backCol = xcHelper.getPrefixColName(prefix, "one");
            var colNum = table.getColNumByBackName(backCol);
            var numCols = table.getNumCols();
            expect(colNum).not.to.equal(-1);
            // when too much splits, will have alert
            ColManager.splitCol(colNum, tableId, ".", 16, true);
            assert.isTrue($("#alertModal").is(":visible"));
            $("#alertModal .cancel").click();
            assert.isFalse($("#alertModal").is(":visible"));

            ColManager.splitCol(colNum, tableId, ".")
            .then(function(newTableId) {
                // split will generate two columns
                var newTable = gTables[newTableId];
                expect(newTable.getNumCols() - numCols).to.equal(2);
                var splitColNum = newTable.getColNumByBackName("one-split-1");
                expect(splitColNum).not.to.equal(-1);

                done();
            })
            .fail(function(error) {
                done(error);
            });
        });

        it("Should undo the split", function(done) {
            SQL.undo()
            .then(function() {
                var table = gTables[tableId];
                expect(table.getType()).to.equal(TableType.Active);
                xcTooltip.hideAll();
                done();
            })
            .fail(function(error) {
                done(error);
            });
        });

        it("Should change type of column", function(done) {
            var table = gTables[tableId];
            var backCol = xcHelper.getPrefixColName(prefix, "votes.funny");
            var colNum = table.getColNumByBackName(backCol);
            var numCols = table.getNumCols();
            expect(colNum).not.to.equal(-1);

            var colTypeInfos = [{"colNum": colNum, "type": "string"}];
            ColManager.changeType(colTypeInfos, tableId)
            .then(function(newTableId) {
                var newTable = gTables[newTableId];
                expect(newTable.getNumCols()).to.equal(numCols);
                var newCol = newTable.getCol(colNum);
                expect(newCol).not.to.be.null;
                expect(newCol.getType()).to.equal(ColumnType.string);
                expect(newCol.getFrontColName()).to.equal("votes_funny_string");

                done();
            })
            .fail(function(error) {
                done(error);
            });
        });

        it("Should undo change type of column", function(done) {
            SQL.undo()
            .then(function() {
                var table = gTables[tableId];
                expect(table.getType()).to.equal(TableType.Active);
                xcTooltip.hideAll();
                done();
            })
            .fail(function(error) {
                done(error);
            });
        });

        it('ColManager.pullAllCols() should work', function() {
            var $table = $("#xcTable-" + tableId);
            var numRows = $table.find('tbody tr').length;
            var jsonData = ['{"a":"b"}'];
            var $rows = ColManager.pullAllCols(numRows, jsonData, tableId,
                                            RowDirection.Bottom);
            expect($rows.length).to.equal(1); // 1 row
            var newNumRows = numRows + 1;
            // 17 columns (including rowNum and dataCol)
            expect($rows.find('td').length).to.equal(17);
            expect($rows.find('td').eq(0).text()).to.equal(newNumRows + "");
            expect($rows.find('td').eq(1).text()).to.equal("FNF");
            expect($rows.find('td').last().text()).to.equal('{"a":"b"}');
            expect($table.find('tr').last().is($rows)).to.be.true;

            numRows = newNumRows;

            // same as before but placing row at index 0
            $rows = ColManager.pullAllCols(0, jsonData, tableId,
                                            RowDirection.Bottom);
            expect($rows.length).to.equal(1); // 1 row
            newNumRows = numRows + 1;
            expect($rows.find('td').length).to.equal(17);
            expect($rows.find('td').eq(0).text()).to.equal("1");
            expect($rows.find('td').eq(1).text()).to.equal("FNF");
            expect($rows.find('td').last().text()).to.equal('{"a":"b"}');
            expect($table.find('tr').last().is($rows)).to.be.true;

            numRows = newNumRows;
            var colName1 = xcHelper.getPrefixColName(prefix, 'average_stars');
            var colName2 = xcHelper.getPrefixColName(prefix, 'compliments');
            jsonData = ['{"' + colName1 + '":"testValue1"}', '{"' + colName2 + '":"testValue2"}'];

            // adding 2 rows now, Rowdirection top so prepended
            $rows = ColManager.pullAllCols(0, jsonData, tableId,
                                            RowDirection.Top);
            expect($rows.length).to.equal(2); // 2 rows
            newNumRows = numRows + 2;
            expect($rows.eq(0).find('td').length).to.equal(17);
            expect($rows.eq(1).find('td').length).to.equal(17);
            expect($rows.find('td').eq(0).text()).to.equal("1");
            expect($rows.find('td').eq(1).find(".displayedData").text())
            .to.equal("testValue1");
            expect($rows.find('td').eq(2).find(".displayedData").text())
            .to.equal("FNF");
            expect($rows.eq(0).find('td').last().find(".displayedData").text())
            .to.equal('{"' + colName1 + '":"testValue1"}');
            expect($rows.eq(1).find('td').eq(0).text()).to.equal("2");
            expect($rows.eq(1).find('td').eq(1).find(".displayedData").text())
            .to.equal("FNF");
            expect($rows.eq(1).find('td').eq(2).find(".displayedData").text())
            .to.equal("testValue2");
            expect($rows.eq(1).find('td').last().find(".displayedData").text())
            .to.equal('{"' + colName2 + '":"testValue2"}');

            expect($table.find('tbody tr:lt(3)').is($rows)).to.be.true;

            numRows = newNumRows;

            jsonData = [""];
            $rows = ColManager.pullAllCols(numRows, jsonData, tableId,
                                            RowDirection.Bottom);
            expect($rows.length).to.equal(1); // 1 row
            newNumRows = numRows + 1;
            // 17 columns (including rowNum and dataCol)
            expect($rows.find('td').length).to.equal(17);
            expect($rows.find('td').eq(0).text()).to.equal(newNumRows + "");
            expect($rows.find('td').eq(1).text()).to.equal("FNF");
            expect($rows.find('td').last().text()).to.equal("");
            expect($table.find('tr').last().is($rows)).to.be.true;

            numRows = newNumRows;

            jsonData = null;
            $rows = ColManager.pullAllCols(numRows, jsonData, tableId,
                                            RowDirection.Bottom);
            expect($rows.length).to.equal(1); // 1 row
            newNumRows = numRows + 1;
            // 17 columns (including rowNum and dataCol)
            expect($rows.find('td').length).to.equal(17);
            expect($rows.find('td').eq(0).text()).to.equal(newNumRows + "");
            expect($rows.find('td').eq(1).text()).to.equal("FNF");
            expect($rows.find('td').last().text()).to.equal("");
            expect($table.find('tr').last().is($rows)).to.be.true;

            numRows = newNumRows;

            colName1 = xcHelper.getPrefixColName(prefix, 'average_stars');
            jsonData = ['{"' + colName1 + '":null}'];
            $rows = ColManager.pullAllCols(numRows, jsonData, tableId,
                                            RowDirection.Bottom);
            expect($rows.length).to.equal(1); // 1 row
            newNumRows = numRows + 1;
            // 17 columns (including rowNum and dataCol)
            expect($rows.find('td').length).to.equal(17);
            expect($rows.find('td').eq(0).text()).to.equal(newNumRows + "");
            expect($rows.find('td').eq(1).text()).to.equal("null");
            expect($rows.find('td').eq(2).text()).to.equal("FNF");
            expect($rows.find('td').last().text()).to.equal('{"' + colName1 + '":null}');
            expect($table.find('tr').last().is($rows)).to.be.true;

            numRows = newNumRows;

            colName1 = xcHelper.getPrefixColName(prefix, 'average_stars');
            jsonData = ['{"' + colName1 + '":null, badJson}'];
            $rows = ColManager.pullAllCols(numRows, jsonData, tableId,
                                            RowDirection.Bottom);
            expect($rows.length).to.equal(1); // 1 row
            newNumRows = numRows + 1;
            // 17 columns (including rowNum and dataCol)
            expect($rows.find('td').length).to.equal(17);
            expect($rows.find('td').eq(0).text()).to.equal(newNumRows + "");
            expect($rows.find('td').eq(1).text()).to.equal("FNF");
            expect($rows.find('td').eq(2).text()).to.equal("FNF");
            expect($rows.find('td').last().text()).to.equal('null');
            expect($table.find('tr').last().is($rows)).to.be.true;
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
        return table.getNumCols();
    }
});