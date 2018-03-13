describe('OperationsView Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $operationsView;

    before(function(done) {
        UnitTest.onMinMode();
        $operationsView = $('#operationsView');

        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);
            prefix = tPrefix;
            done();
        });
    });

    describe('functions without opening operations view', function() {
        describe('function hasFuncFormat', function() {
            var func;
            before(function() {
                func = OperationsView.__testOnly__.hasFuncFormat;
            });

            it ('hasFuncFormat(arg) should return correctly', function() {
                expect(func('add(x,1)')).to.equal(true);
                expect(func('a(()x,(1))')).to.equal(true);
                expect(func('a("((("x,1)')).to.equal(true);
                expect(func('a(""x,1)')).to.equal(true);
                expect(func('a(x,1)')).to.equal(true);
                expect(func('a("\\"",1)')).to.equal(true);

                expect(func('add(x,1')).to.equal(false);
                expect(func('add(x,1\"')).to.equal(false);
                expect(func('a("\"",1)')).to.equal(false);
                expect(func('add(x,1")')).to.equal(false);
                expect(func('(xwf,1)')).to.equal(false);
                expect(func('add(xwf,1)x')).to.equal(false);
                expect(func('(xwf,1)x')).to.equal(false);
                expect(func('a(x,1))')).to.equal(false);
                expect(func('a((x,1)')).to.equal(false);
                expect(func('a(()x,1))')).to.equal(false);
                expect(func('a(()x,1))')).to.equal(false);
                expect(func('a(()"("x,1))')).to.equal(false);
                expect(func('a(()x,1))')).to.equal(false);
            });
        });

        describe('function hasUnescapedParens', function() {
            var func;
            before(function() {
                func = OperationsView.__testOnly__.hasUnescapedParens;
            });

            it ('hasUnescapedParens(arg) should return correctly', function() {
                expect(func('(')).to.equal(true);
                expect(func(')')).to.equal(true);
                expect(func('"")')).to.equal(true);
                expect(func('"\\"")')).to.equal(true);
                expect(func(')(')).to.equal(true);

                expect(func('")"')).to.equal(false);
                expect(func('")\\)"')).to.equal(false);
                expect(func('\\)')).to.equal(false);
                expect(func('"\\")')).to.equal(false);
            });
        });

        describe('function formulateMapFilterString', function() {
            var func;
            before(function() {
                func = OperationsView.__testOnly__.formulateMapFilterString;
            });

            it ('formulateMapFilterString() should return correctly', function() {
                var args = ['1', 2];
                var colTypeInfos = [{
                    argNum: 0,
                    type: "integer"
                }];
                expect(func('add', args, colTypeInfos)).to.equal("add(int(1, 10), 2)");

                args = [['1', 2], ['3', 4]];
                colTypeInfos = [
                [{
                    argNum: 0,
                    type: 'integer'
                }],
                [{
                    argNum: 0,
                    type: 'integer'
                }]];
                expect(func('add', args, colTypeInfos, true)).to.equal(
                    "and(add(int(1, 10), 2), add(int(3, 10), 4))");
            });
        });

        describe('function isNumberInQuotes', function() {
            var func;
            before(function() {
                func = OperationsView.__testOnly__.isNumberInQuotes;
            });

            it('isNumberInQuotes() should return correctly', function() {
                expect(func('"3"')).to.be.true;
                expect(func("'3'")).to.be.true;
                expect(func("'3.342'")).to.be.true;

                expect(func("'3")).to.be.false;
                expect(func("3'")).to.be.false;
                expect(func('"3')).to.be.false;
                expect(func(3)).to.be.false;
                expect(func("3")).to.be.false;
                expect(func("''3")).to.be.false;
                expect(func("'3''")).to.be.false;
                expect(func("'3t'")).to.be.false;
                expect(func("'3.342t'")).to.be.false;
            });
        });

        describe('function getMatchingAggNames', function() {
            it('getMatchingAggNames() should work', function() {
                var fn = OperationsView.__testOnly__.getMatchingAggNames;
                var aggNames = OperationsView.__testOnly__.aggNames;
                var oldAggNames = [];
                for (var i = 0; i < aggNames.length; i++) {
                    oldAggNames.push(aggNames[i]);
                }

                aggNames.length = 0; // empty the array;
                aggNames.push("^ayz");
                aggNames.push("^abc");
                aggNames.push("^abcd");

                expect(fn("^ay")).to.deep.equal(["^ayz"]);
                expect(fn("^Ay")).to.deep.equal(["^ayz"]);
                expect(fn("^ayz")).to.deep.equal([]); // exact matches will be empty
                expect(fn("ayz")).to.deep.equal(['^ayz']); // exact matches will be empty
                expect(fn("^aYz")).to.deep.equal(["^ayz"]);
                expect(fn("ay")).to.deep.equal(["^ayz"]);
                expect(fn("ayf")).to.deep.equal([]);
                expect(fn("")).to.deep.equal([]);

                expect(fn("a")).to.deep.equal(["^abc", "^abcd", "^ayz"]);
                expect(fn("ab")).to.deep.equal(["^abc", "^abcd"]);
                expect(fn("bc")).to.deep.equal(["^abc", "^abcd"]);

                aggNames.length = 0;
                oldAggNames.forEach(function(aggName) {
                    aggNames.push(aggName);
                });
            });
        });

        describe('function getMatchingColNames', function() {
            it('getMatchingColNames() should work', function() {
                var fn = OperationsView.__testOnly__.getMatchingColNames;
                var colNames = OperationsView.__testOnly__.getColNamesCache();
                var oldColNames = xcHelper.deepCopy(colNames);
                emptyColName();
                colNames["ayz"] = "ayz";
                colNames["abc"] = "abc";
                colNames["abcd"] = "Abcd";

                expect(fn("ay")).to.deep.equal(["ayz"]);
                expect(fn("$ay")).to.deep.equal(["ayz"]);
                expect(fn("ayz")).to.deep.equal(["ayz"]); // not considered match without $
                expect(fn("$ayz")).to.deep.equal([]); // exact match will be empty
                expect(fn("Ayz")).to.deep.equal(["ayz"]);

                expect(fn("abcd")).to.deep.equal(["Abcd"]);
                expect(fn("$Abcd")).to.deep.equal([]); // exact match will be empty

                expect(fn("a")).to.deep.equal(["ayz", "abc", "Abcd"]);
                expect(fn("ab")).to.deep.equal(["abc", "Abcd"]);

                emptyColName();

                for (var oldName in oldColNames) {
                    colNames[oldName] = oldColNames[oldName];
                }

                function emptyColName() {
                    for (var i in colNames) {
                        delete colNames[i];// empty the object;
                    }
                }
            });
        });

        it("function isBoolInQuotes", function() {
            var fn = OperationsView.__testOnly__.isBoolInQuotes;
            expect(fn("'true'")).to.be.true;
            expect(fn("'true")).to.be.false;
            expect(fn("\"true\"")).to.be.true;
            expect(fn("\"False\"")).to.be.true;
            expect(fn("\"False")).to.be.false;
            expect(fn("'Falsez'")).to.be.false;
        });

        describe("check arg types", function() {
            var fn;
            var parseTypeCache;
            before(function() {
                fn = OperationsView.__testOnly__.checkArgTypes;
                parseTypeCache = OperationsView.__testOnly__.changeParseTypeFn();
            });

            it("test when only strings are valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["string"];
                });

                expect(fn("test")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("false")).to.equal(null);
            });

            it("test when only mixed is valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["mixed"];
                });

                expect(fn("test")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("false")).to.equal(null);
            });

            it("test when only booleans are valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["boolean"];
                });

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["boolean"]);

                expect(fn("TrUe")).to.equal(null);

                expect(fn("5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("2.5")).to.equal(null);
            });

            it("test when only strings and booleans are valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["string", "boolean"];
                });

                expect(fn("test")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("false")).to.equal(null);
            });

            it("test when only ints are valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["integer"];
                });

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["integer"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["integer"]);

                expect(fn("5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
                expect(fn("5.5").currentType).to.equal("float");
                expect(fn("5.5").validType).to.deep.equal(["integer"]);
            });

            it("test when only floats are valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["float"];
                });

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["float"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["float"]);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
            });

            it("test when only floats and ints are valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["float", "integer"];
                });

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["float", "integer"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["float", "integer"]);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
            });

            it("test when only booleans floats and ints are valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["boolean", "float", "integer"];
                });

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["boolean", "float", "integer"]);

                expect(fn("true")).to.equal(null);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
            });

            it("test when only undefined is valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["undefined"];
                });

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["undefined"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["undefined"]);

                expect(fn("5").currentType).to.equal("string/boolean/integer/float");
                expect(fn("5").validType).to.deep.equal(["undefined"]);

                expect(fn("5.5").currentType).to.equal("string/boolean/integer/float");
                expect(fn("5.5").validType).to.deep.equal(["undefined"]);

                expect(fn("-1").currentType).to.equal("string/boolean/integer/float");
                expect(fn("-1").validType).to.deep.equal(["undefined"]);
            });

            it("test when only somthing weird is valid", function() {
                OperationsView.__testOnly__.changeParseTypeFn(function() {
                    return ["newType"];
                });

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["newType"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["newType"]);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
            });

            after(function() {
                OperationsView.__testOnly__.changeParseTypeFn(parseTypeCache);
            });
        });
    });

    describe('function getAllColumnTypesFromArg (map)', function() {
        var cachedTable;
        before(function(done) {
            cachedTable = gTables[tableId];
            var progCol1 = new ProgCol({
                "name": "testCol",
                "backName": "testCol",
                "isNewCol": false,
                "func": {"name": "pull"},
                "type": "integer"
            });

            var progCol2 = new ProgCol({
                "name": "testCol2[0]",
                "backName": "testCol2[0]",
                "isNewCol": false,
                "func": {"name": "pull"},
                "type": "string",
            });

            var progCol3 = new ProgCol({
                "name": "testCol3[0].abc",
                "backName": "testCol3[0].abc",
                "isNewCol": false,
                "func": {"name": "pull"},
                "type": "float"
            });

            var progCol4 = new ProgCol({
                "name": "testCol4",
                "backName": "testCol4",
                "isNewCol": false,
                "func": {"name": "pull"},
                "type": "integer",
                "immediate": true,
                "knownType": true
            });

            var table = new TableMeta({
                "tableName": tableName,
                "tableId": tableId,
                "tableCols": [progCol1, progCol2, progCol3, progCol4],
                "isLocked": false
            });
            gTables[tableId] = table;
            OperationsView.show(tableId, [1], "map")
            .always(function() {
                done();
            });
        });

        it('getAllColumnTypesFromArg() should work', function() {
            var fn = OperationsView.__testOnly__.getAllColumnTypesFromArg;
            var res = fn("nonExistantCol");
            expect(res.length).to.equal(0);

            res = fn("testCol");
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(ColumnType.number);

            res = fn("testCol2[0]", false);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal("string");

            res = fn("testCol2[0], testCol");
            expect(res.length).to.equal(2);
            expect(res[0]).to.equal("string");
            expect(res[1]).to.equal(ColumnType.number);

            res = fn("testCol2[0]", true);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal("string");

            res = fn("testCol3[0].abc", false);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal("float");

            res = fn("testCol4");
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(ColumnType.integer);
        });

        after(function(done){
            gTables[tableId] = cachedTable;
            OperationsView.close();
            // allow time for operations view to close
            setTimeout(function() {
                done();
            }, 500);
        });
    });

    describe('group by', function() {
        var $operationsModal;
        var $functionInput;
        var $functionsMenu;
        var operatorsMap;
        var aggsList;
        var $argInputs;
        var getExistingTypes;
        var argumentFormatHelper;
        var parseType;
        var someColumns;
        var someColumnNames = ["average_stars","compliments","four","friends","mixVal","review_count","yelping_since", "DATA"];

        before(function(done) {
            getExistingTypes = OperationsView.__testOnly__.getExistingTypes;
            argumentFormatHelper = OperationsView.__testOnly__.argumentFormatHelper;
            parseType = OperationsView.__testOnly__.parseType;
            $operationsModal = $('#operationsView');

            OperationsView.show(tableId, [1], 'group by')
            .then(function() {
                operatorsMap = OperationsView.getOperatorsMap();
                $functionInput = $operationsView.find('.groupby .functionsInput');
                $functionsMenu = $functionInput.siblings('.list');
                done();
            });
        });

        describe('var operatorsMap', function() {
            it('number of "group by" categories is valid', function() {
                aggsList = operatorsMap[FunctionCategoryT.FunctionCategoryAggregate];
                expect(aggsList.length).to.be.at.least(5);
                var indexOfCount = -1;
                for (var i = 0; i < aggsList.length; i++) {
                    if (aggsList[i].fnName === "count") {
                        indexOfCount = i;
                        break;
                    }
                }
                // XX gotta check this is agg somehow?
                expect(indexOfCount).to.be.at.least(0);
            });
        });

        describe('table list', function() {
            var cachedColNameMap = xcHelper.getColNameMap;
            var cachedCenterTable = xcHelper.centerFocusedTable;
            before(function() {
                gTables['fakeTable'] = {tableCols: []};
            });
            it("selecting table should work", function() {
                var colNameCacheCalled = false;
                var centerCalled = false;
                xcHelper.getColNameMap = function(id) {
                    expect(id).to.equal("fakeTable");
                    colNameCacheCalled = true;
                    return {};
                };
                xcHelper.centerFocusedTable = function(id) {
                    expect(id).to.equal("fakeTable");
                    centerCalled = true;
                };

                var $listWrap = $(".groupby").find(".tableList");
                // list gets repopulated everytime we open it so it's ok to
                // replace contents
                $listWrap.find('ul').html('<li data-id="' + tableId + '">' + tableName + '</li>' +
                                        '<li data-id="fakeTable">fakeTable</li>');
                $listWrap.find('li').eq(0).trigger(fakeEvent.mouseup);
                expect(colNameCacheCalled).to.be.false;
                expect(centerCalled).to.be.false;

                $listWrap.find('li').eq(1).trigger(fakeEvent.mouseup);
                expect(colNameCacheCalled).to.be.true;
                expect(centerCalled).to.be.true;
            });

            it("focus table should work", function() {
                expect($operationsModal.find(".groupby .focusTable").length).to.equal(1);
                var called = false;
                var cache = xcHelper.centerFocusedTable;
                xcHelper.centerFocusedTable = function() {
                    called = true;
                };

                $operationsModal.find(".groupby .focusTable").click();
                expect(called).to.be.true;
                xcHelper.centerFocusedTable = cache;
            });

            after(function() {
                xcHelper.getColNameMap = cachedColNameMap;
                xcHelper.centerFocusedTable = cachedCenterTable;
                // resets tableId
                $(".groupby").find(".tableList").find('li').eq(0).trigger(fakeEvent.mouseup);
                delete gTables['fakeTable'];
            });
        });

        describe('function input', function() {
            it('list should match operatorsMap', function() {
                // dropdown requires mousedown and click
                $functionInput.siblings('.dropdown').mousedown();
                $functionInput.siblings('.dropdown').click();

                expect($functionsMenu.is(':visible')).to.equal(true);
                expect($functionsMenu.find('li')).to.have.length(aggsList.length);
            });

            it('input should read Avg', function() {
                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "avg");
                }).trigger(fakeEvent.mouseup);
                expect($functionInput.val()).to.equal('avg');
                var description = $operationsView.find('.groupby .descriptionText').text();
                expect(description.indexOf('average') > - 1);
            });

            // this should trigger an update of the arg inputs
            it('clicking outside of function menu when list item is highlighted', function() {
                $functionInput.siblings('.dropdown').mousedown();
                $functionInput.siblings('.dropdown').click();

                $functionsMenu.find("li").filter(function() {
                    return $(this).text() === "count";
                }).addClass("highlighted");
                $functionInput.val("count");
                $(document).mousedown(); // required change of lastMouseDownTarget
                $(document).click();
                expect($functionInput.val()).to.equal("count");
                var description = $operationsView.find('.groupby .descriptionText').text();
                expect(description.indexOf('Counts') === 0);
            });
        });

        describe('argument section', function() {
            before(function() {
                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "avg");
                }).trigger(fakeEvent.mouseup);
            });

            it('should have 3 visible text inputs', function() {
                expect($operationsView.find('.arg[type=text]:visible')).to.have.lengthOf(3);
                $argInputs = $operationsView.find('.arg[type=text]:visible');
            });

            it('new table name should be visible', function() {
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);
            });

            it('advancedSection should be visible', function() {
                expect($operationsView.find('.advancedSection:visible')).to.have.lengthOf(1);
            });

            it('should have 13 checkboxes for inc sample', function() {
                $operationsView.find('.advancedTitle').click();
                expect($operationsView.find('.advancedSection .checkbox:visible')).to.have.lengthOf(4);
            });

            it('new table name should not be visible if join selected', function() {
                var $joinBackCheckbox = $operationsView.find('.groupby .joinBack .checkbox');

                $joinBackCheckbox.click();
                expect($joinBackCheckbox.filter('.checked').length).to.equal(1);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(0);

                $joinBackCheckbox.click();
                expect($joinBackCheckbox.filter('.checked').length).to.equal(0);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);

                var $incSampleBox = $operationsView.find('.groupby .incSample .checkbox');
                $incSampleBox.click();
                expect($incSampleBox.filter('.checked').length).to.equal(1);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);

                $incSampleBox.click();
                expect($incSampleBox.filter('.checked').length).to.equal(0);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);
            });

            it("keep table checkbox should work", function() {
                var $joinBackCheckbox = $operationsView.find('.groupby .joinBack .checkbox');
                $joinBackCheckbox.click();
                expect($joinBackCheckbox.filter('.checked').length).to.equal(1);

                $operationsView.find(".groupby .keepTable .checkbox").click();
                expect($joinBackCheckbox.filter('.checked').length).to.equal(0);
                $operationsView.find(".groupby .keepTable .checkbox").click();
            });

            it("keydown down direction on arg field should highlight list", function() {
                var $arg = $operationsView.find(".arg").eq(0);
                var $list = $operationsView.find(".arg").eq(0).siblings(".list").find("ul");
                $list.html("<li>col1</li><li>col2</li>");
                $list.show();
                $list.parent().show().addClass("openList");

                var e = {type: "keydown", which: 40};
                $arg.trigger(e);
                expect($list.find("li").eq(0).hasClass("highlighted")).to.be.true;
                expect($list.find("li").eq(1).hasClass("highlighted")).to.be.false;
                expect($arg.val()).to.equal("$col1");
                $arg.val("");
                $list.empty();
                $list.parent().hide().removeClass("openList");
            });

            // purposely fail the submitform check to prevent submitting
            it("keypress enter on arg field should submitForm", function() {
                var $arg = $operationsView.find(".arg").eq(0);
                var $list = $operationsView.find(".arg").eq(0).siblings(".list").find("ul");
                $list.html('<li class="highlighted">col1</li><li>col2</li>');
                $list.show();
                $list.parent().show().addClass("openList");

                expect($arg.val()).to.equal("");
                $arg.trigger(fakeEvent.enter);
                expect($arg.val()).to.equal("$col1");
                expect($("#statusBox").is(":visible")).to.be.false;

                $list.find(".highlighted").removeClass("highlighted");
                StatusBox.forceHide();
                $arg.trigger(fakeEvent.enter);
                expect($("#statusBox").is(":visible")).to.be.true;
                StatusBox.forceHide();
                $list.parent().hide().removeClass("openList");
            });

            it("keypress enter on any input field except functionsInput should submit form", function(done) {
                var submitCount = 0;
                var promises = [];
                $operationsView.find("input:not(.functionsInput)").each(function(i) {
                    promises.push(promise.bind(null, $(this), i));
                });

                PromiseHelper.chain(promises)
                .then(function() {
                    expect(submitCount).to.be.gt(4);
                    done();
                });

                // need timeouts to open and close statusboxes
                function promise($input, timeout) {
                    var deferred = PromiseHelper.deferred();
                    setTimeout(function() {
                        StatusBox.forceHide();
                        expect($("#statusBox").is(":visible")).to.be.false;

                        $input.trigger(fakeEvent.enter);

                        expect($("#statusBox .message").text()).to.equal("Please fill out this field.");
                        expect($("#statusBox").is(":visible")).to.be.true;

                        StatusBox.forceHide();
                        submitCount++;
                        deferred.resolve();

                    }, timeout * 2);
                    return deferred.promise();
                }
            });

            it('empty option checkboxes should work', function() {
                var $checkboxWrap = $operationsView.find(".checkboxWrap").eq(0);
                var $checkbox = $checkboxWrap.find(".checkbox");
                var $row = $checkboxWrap.closest('.row');
                var $input = $row.find(".arg");
                $input.val("test");

                expect($checkbox.hasClass("checked")).to.be.false;
                expect($input.val()).to.equal("test");

                $checkbox.click();

                expect($checkbox.hasClass("checked")).to.be.true;
                expect($row.find(".inputWrap").hasClass("semiHidden")).to.be.true;
                expect($input.val()).to.equal("");
                expect($row.find(".cast").hasClass("semiHidden")).to.be.true;

                $checkbox.click();

                expect($checkbox.hasClass("checked")).to.be.false;
                expect($row.find(".inputWrap").hasClass("semiHidden")).to.be.false;
                expect($row.find(".cast").hasClass("semiHidden")).to.be.false;
            });

            it("argSuggest() should work", function() {
                var fn = OperationsView.__testOnly__.argSuggest;
                var $arg = $operationsView.find(".arg").eq(0);
                var $ul = $arg.siblings(".list");
                var time = Date.now();
                var colName = time + "1234";
                $arg.val(colName);
                $ul.find("li").remove();

                var colMapCache = xcHelper.getColNameMap;
                xcHelper.getColNameMap = function() {
                    var cache = {};
                    cache[colName] = colName;
                    return cache;
                };

                OperationsView.__testOnly__.updateColNamesCache();

                expect($ul.is(":visible")).to.be.false;
                expect($ul.hasClass("openList")).to.be.false;
                expect($ul.find("li").length).to.equal(0);

                fn($arg);

                expect($ul.is(":visible")).to.be.true;
                expect($ul.hasClass("openList")).to.be.true;
                expect($ul.find("li").length).to.equal(1);
                expect($ul.find("li").text()).to.equal(colName);

                // close dropdown
                $(document).trigger({type: "keydown", which: keyCode.Escape});
                expect($ul.is(':visible')).to.be.false;

                xcHelper.getColNameMap = colMapCache;
                OperationsView.__testOnly__.updateColNamesCache();
            });
        });

        describe("column highlighting", function() {
            it("something", function(done) {
                var $argInputs = $operationsView.find(".arg");
                $argInputs.eq(0).focus().trigger("focus").val("");

                var $header = $('#xcTable-' + tableId).find('th.col1 .header');
                expect($header.find('input').val()).to.equal('average_stars');
                $header.click();

                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                expect($header.closest("th").hasClass("modalHighlighted")).to.be.true;

                var $header2 = $('#xcTable-' + tableId).find('th.col4 .header');
                expect($header2.find('input').val()).to.equal('four');
                $header2.click();

                expect($header.closest("th").hasClass("modalHighlighted")).to.be.false;
                expect($header2.closest("th").hasClass("modalHighlighted")).to.be.true;
                expect($argInputs.eq(0).data("colname")).to.equal(xcHelper.getPrefixColName(prefix, 'four'));

                $argInputs.eq(0).val("").trigger("input");
                UnitTest.testFinish(function() {
                    return !$header2.closest("th").hasClass("modalHighlighted");
                })
                .always(function() {
                    done();
                });
            });
        });

        describe('column select section', function() {
            it('clicking on column should work', function() {
                $operationsView.find('.mainContent').scrollTop(1000);
                var $incSampleBox = $operationsView.find('.groupby .incSample .checkbox');

                expect($operationsView.find(".columnsWrap").is(":visible")).to.be.false;
                $incSampleBox.click();
                expect($operationsView.find(".columnsWrap").is(":visible")).to.be.true;

                var $cols = $operationsView.find(".cols li");
                expect($cols.length).to.equal(12);
                expect($cols.find(".checkbox.checked").length).to.equal(0);

                $cols.eq(0).click();
                expect($cols.find(".checkbox.checked").length).to.equal(1);

                $cols.eq(0).click();
                expect($cols.find(".checkbox.checked").length).to.equal(0);
            });

            it("clicking select all should work", function() {
                var $cols = $operationsView.find(".cols li");
                expect($cols.find(".checkbox.checked").length).to.equal(0);
                $operationsView.find(".selectAllCols").click();
                expect($cols.find(".checkbox.checked").length).to.equal(12);
                $operationsView.find(".selectAllCols").click();
                expect($cols.find(".checkbox.checked").length).to.equal(0);
            });

            it("colMenu shouldn't open", function() {
                $(".xcTable .header").trigger(fakeEvent.mousedown);
                expect($("#colMenu").is(":visible")).to.be.false;
            });

            after(function() {
                $operationsView.find('.groupby .incSample .checkbox').click();
            });
        });

        // XXX basic test, need to expand on this
        describe('groupby() function', function() {
            var cachedGB;
            before(function() {
                cachedGB = xcFunction.groupBy;
            });

            it('group by should work', function(done) {
                var gbCalled = false;
                xcFunction.groupBy = function(tId, gbArgs, groupByCols, options) {
                    expect(gbArgs[0].operator).to.equal("count");
                    expect(tId).to.equal(tableId);
                    expect(groupByCols.length).to.equal(1);
                    expect(groupByCols[0].colName).to.equal("a");
                    expect(gbArgs[0].aggColName).to.equal("b");
                    expect(gbArgs[0].newColName).to.equal("c");
                    expect(options.icvMode).to.be.false;
                    expect(options.isIncSample).to.be.false;
                    expect(options.isJoin).to.be.false;

                    gbCalled = true;
                    return PromiseHelper.resolve();
                };

                OperationsView.__testOnly__.groupBy(["count"], [["a", "b", "c"]], [])
                .then(function() {
                    expect(gbCalled).to.be.true;
                    done();
                });
            });

            after(function() {
                xcFunction.groupBy = cachedGB;
            });
        });

        describe('groupbyCheck()', function() {
            it("groupByCheck should work", function() {
                var fn = OperationsView.__testOnly__.groupByCheck;
                expect(fn([prefix + '::average_stars', prefix + '::average_stars', 'c'])).to.be.true;
                expect(fn([prefix + '::average_stars', 'fakeName', 'c'])).to.be.false;
                expect(fn(['fakename', prefix + '::average_stars', 'c'])).to.be.false;
            });
        });

        describe('test type checking', function() {
            this.timeout(120000);
            // this will take a long time because we
            // test out all combination of argument pairs and each test
            // loops through all the columns in a table each time to check if the
            // column name exists in the table
            it.skip('should detect if arg types are valid or invalid', function() {
                cols = gTables[tableId].tableCols;
                       // yelping_since, votes,  one,two\\.three,review_count,four,average_stars, mixVal
                someColumns = [cols[11], cols[10], cols[6], cols[8], cols[7], cols[3], cols[0], cols[5]];

                expect(cols.length).to.equal(13);
                var testArgs = [];
                var args;
                for (var i = 0; i < someColumns.length; i++) {
                    for (var j = 0; j < someColumns.length; j++) {
                        args = [];
                        args.push(gColPrefix + someColumns[i].getFrontColName(true));
                        args.push(gColPrefix + someColumns[j].getFrontColName(true));
                        args.push('new_column_name');
                        testArgs.push(args);
                    }
                }
                expect(testArgs.length).to.be.above(7 * 7);

                var testedGBTypes = [];
                aggsList.forEach(function(agg) {
                    var groupByType = agg.fnName;
                    testGroupByInputsColTypes(groupByType, testArgs, testedGBTypes);
                });
            });

            it('variety of different arguments should be formatted correctly', function(done) {
                var testArgs1 = ["str", "null", "undefined", "sp aced", "com,ma", "d.ot", gColPrefix, "\\" + gColPrefix, gColPrefix + "a", "\\" + gColPrefix + "a", "a\\" + gColPrefix, "5a", "a5", -5, 5, 3.2, 0];
                var testArgs2 = [];
                var testArgs2Unprefixed = [];
                someColumnNames.forEach(function(colName) {
                    if (colName === "DATA") {
                        return;
                    }

                    colName = xcHelper.getPrefixColName(prefix, colName);

                    testArgs2.push(gColPrefix + colName);
                    testArgs2Unprefixed.push(colName);
                });

                var arg1Types = testArgs1.map(function(arg) {
                    var arg1Type = typeof(arg);
                    if (arg1Type === "number") {
                        if (arg % 1 === 0) {
                            arg1Type = "integer";
                        } else {
                            arg1Type = "float";
                        }
                    }
                    return arg1Type;
                });

                var arg2Types = testArgs2.map(function(arg, index) {
                    var colName = testArgs2Unprefixed[index];
                    var progCol = gTables[tableId].getColByFrontName(colName);

                    if (testArgs2Unprefixed[index] === "DATA") {
                        return "object";
                    } else {
                        return progCol.getType();
                    }
                });

                var testedGBTypes = [];
                aggsList.forEach(function(agg, i) {
                    if (!(i % 2)) {
                        return;
                    }
                    var groupByType = agg.fnName;
                    testVariousInputsTypes(groupByType, testedGBTypes, testArgs1,
                                            testArgs2, arg1Types, arg2Types);
                });

                // switch args around;
                testedGBTypes = [];
                aggsList.forEach(function(agg, i) {
                    if (i % 2) {
                        return;
                    }
                    var groupByType = agg.fnName;
                    testVariousInputsTypes(groupByType, testedGBTypes, testArgs2,
                                            testArgs1, arg2Types, arg1Types);
                });
                done();
            });
        });

        describe('adding another column argument', function() {
            var $argInputs;
            it('add arg button should be visible', function() {
                expect($operationsView.find(".addGroupArg:visible")).to.have.lengthOf(1);
            });
            it('button should add another argument', function() {
                $argInputs = $operationsView.find('.arg[type=text]:visible');
                $operationsView.find(".addGroupArg").click();
                expect($operationsView.find('.arg[type=text]:visible').length).to.be.above($argInputs.length);
                expect($operationsView.find(".extraArg .arg").is(document.activeElement)).to.equal(true);
            });
            it('argument should be removable', function() {
                $operationsView.find(".extraArg .xi-cancel").click();
                expect($operationsModal.find('.arg[type=text]:visible').length).to.equal($argInputs.length);
            });
        });

        describe('multiGroupBy from multiple selected columns', function() {
            before(function(done) {
                $("#operationsView .close").click();
                setTimeout(function() {
                    done();
                }, 500);
            });

            it('2 selected columns should produce 2 group on inputs', function(done) {
                OperationsView.show(tableId, [1, 2], 'group by')
                .then(function() {
                    expect($operationsModal.find('.gbOnArg').length).to.equal(2);
                    expect($operationsModal.find('.gbOnArg').eq(0).val()).to.equal(gColPrefix + prefix + gPrefixSign + "average_stars");
                    expect($operationsModal.find('.gbOnArg').eq(1).val()).to.equal(gColPrefix + prefix + gPrefixSign + "compliments");
                    done();
                });
            });
        });

        describe("addGroupbyGroup", function() {
            it("addGroupbyGroup should work", function() {
                expect($operationsView.find(".groupbyGroup").length).to.equal(1);
                $operationsView.find(".addGBGroup").click();
                expect($operationsView.find(".groupbyGroup").length).to.equal(2);
                expect($operationsView.find(".groupbyGroup").eq(0).find(".argsSection").length).to.equal(2);
                expect($operationsView.find(".groupbyGroup").eq(1).find(".argsSection").length).to.equal(1);
                $operationsView.find(".closeGroup").click();
            });
        });

        describe("function newColNameCheck", function() {
            it("newColNameCheck should work", function(done) {
                var cachedFn;
                $functionInput.siblings('.dropdown').mousedown();
                $functionInput.siblings('.dropdown').click();

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "avg");
                }).trigger(fakeEvent.mouseup);

                var $inputs = $operationsModal.find(".groupby .group .arg");
                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                $inputs.eq(2).val(prefixCol);
                $inputs.eq(3).val(xcHelper.parsePrefixColName(prefixCol).name + "_avg");
                $operationsModal.find('.groupby .newTableName').val("a" + Date.now());

                var firstPass = false;
                OperationsView.__testOnly__.newColNameCheck()
                .then(function() {
                    firstPass = true;
                    $inputs.eq(3).val("test");
                    cachedFn = ColManager.checkColName;
                    $operationsModal.find(".groupbyGroup").append('<div class="resultantColNameRow testDiv"><input value="test"></div>');
                    ColManager.checkColName = function() {return false;};
                    return OperationsView.__testOnly__.newColNameCheck();
                })
                .then(function() {
                    done("failed");
                })
                .fail(function() {
                    expect(firstPass).to.be.true;
                    UnitTest.hasStatusBoxWithError(ErrTStr.NameInUse);
                    $operationsModal.find(".testDiv").remove();
                    ColManager.checkColName = cachedFn;
                    done();
                });
            });
        });

        describe("function submitFinalForm for groupby", function() {
            var cachedGB;
            var fn;
            before(function() {
                cachedGB = xcFunction.groupBy;
                fn = OperationsView.__testOnly__.submitFinalForm;
            });
            it("submitFinalForm", function(done) {
                var called = false;
                xcFunction.groupBy = function() {
                    called = true;
                    return PromiseHelper.reject();
                };

                var colName = xcHelper.getPrefixColName(prefix, "average_stars");
                fn([colName, colName, "c"])
                .then(function() {

                    done("fail");
                })
                .fail(function() {
                    expect(called).to.be.true;
                    UnitTest.hasAlertWithTitle(StatusMessageTStr.GroupByFailed, {confirm: true});
                    done();
                });
            });

            after(function() {
                xcFunction.groupBy = cachedGB;
            });
        });

        after(function() {
            $("#operationsView .close").click();
        });

        function setArgInputs(arr) {
            $argInputs.each(function(i) {
                if ([undefined, null].indexOf(arr[i]) > -1) {
                    $(this).val("defaultvalue");
                } else {
                    $(this).val(arr[i]);
                }
            });
        }
        // groupByType could be "avg","count", "max" etc.
        // testArgs is an array of the 2 input vals such as [$class_id, $time]
        // testedGBTypes is an array of the groupbys we've already tested ["avg", "count"]
        function testGroupByInputsColTypes(groupByType, testArgs, testedGBTypes) {
            var existingTypes;
            expect(testedGBTypes).to.not.include(groupByType);
            $functionInput.val(groupByType).trigger(fakeEvent.enter);
            expect($operationsModal.find('.arg[type=text]:visible')).to.have.length(3);
            testedGBTypes.push(groupByType);
            var groupNum = 0;

            var argInfos = testArgs.map(function(arg) {
                setArgInputs(arg);
                existingTypes = getExistingTypes();
                return argumentFormatHelper(existingTypes, groupNum);
            });

            var count = 0;
            var hasValidTypes = false;
            var arg1TypeId = $argInputs.eq(0).data('typeid');
            var arg2TypeId = $argInputs.eq(1).data('typeid');
            var arg1Types = parseType(arg1TypeId);
            var arg2Types = parseType(arg2TypeId);

            for (var i = 0; i < someColumns.length; i++) {
                for (var j = 0; j < someColumns.length; j++) {
                    arg1ColumnType = someColumns[i].type;
                    arg2ColumnType = someColumns[j].type;
                    if (arg1Types.indexOf(arg1ColumnType) > -1 &&
                        arg2Types.indexOf(arg2ColumnType) > -1)
                    {
                        hasValidTypes = true;
                    } else {
                        hasValidTypes = false;
                    }
                    expect(hasValidTypes).to.equal(argInfos[count].isPassing);
                    count++;
                }
            }
            expect(count).to.be.above(7 * 7);
        }

        function testVariousInputsTypes(groupByType, testedGBTypes, testArgs1,
                                        testArgs2, arg1Types, arg2Types) {
            var existingTypes;
            var argInfos = [];
            var count = 0;
            var hasValidTypes;
            var hasValidColPrefix = xcHelper.hasValidColPrefix;

            expect(testedGBTypes).to.not.include(groupByType);
            $functionInput.val(groupByType).trigger(fakeEvent.enter);
            expect($operationsModal.find('.arg[type=text]:visible'))
                                                            .to.have.lengthOf(3);
            testedGBTypes.push(groupByType);

            var arg1TypeId = $argInputs.eq(0).data('typeid');
            var arg2TypeId = $argInputs.eq(1).data('typeid');
            var arg1ValidTypes = parseType(arg1TypeId);
            var arg2ValidTypes = parseType(arg2TypeId);
            var groupNum = 0;

            for (var i = 0; i < testArgs1.length; i++) {
                for (var j = 0; j < testArgs2.length; j++) {
                    setArgInputs([testArgs1[i], testArgs2[j], 'defaultval']);
                    existingTypes = getExistingTypes();
                    argInfos.push(argumentFormatHelper(existingTypes, groupNum));

                    if (hasValidColPrefix(testArgs1[i]) &&
                        !gTables[tableId].hasCol(testArgs1[i].slice(1))) {
                        hasValidTypes = false;
                    } else if (hasValidColPrefix(testArgs2[j]) &&
                                !gTables[tableId].hasCol(testArgs2[j].slice(1))) {
                        hasValidTypes = false;
                    } else if (arg1Types[i] === "mixed") {
                        // mixed not allowed for indexed cols
                        hasValidTypes = false;
                    } else if ((arg1ValidTypes.indexOf(arg1Types[i]) > -1) &&
                        (arg2ValidTypes.indexOf(arg2Types[j]) > -1 ||
                        arg2Types[j] === "mixed")) {
                        // if arg's type matches one of the input's types or is mixed
                        // then it is valid
                        hasValidTypes = true;
                    } else {
                        hasValidTypes = false;
                    }
                    if (hasValidTypes !== argInfos[count].isPassing) {
                        console.error('types allowed: ' + arg1ValidTypes, '   type provided: ' + arg1Types[i]);
                        console.warn('types allowed: ' + arg2ValidTypes, '   type provided: ' + arg2Types[j]);
                        console.info('arg1: ' + testArgs1[i], '   arg2: ' + testArgs2[j], '   argInfos: ' + argInfos[count]);
                        debugger;
                    }

                    expect(hasValidTypes).to.equal(argInfos[count].isPassing);
                    count++;
                }
            }
            expect(count).to.be.above(7 * 7);
        }
    });

    // using map in operations view
    describe('column pickers test (map)', function() {
        var $categoryMenu;
        var $functionsMenu;
        var $argInputs;

        before(function(done) {

            OperationsView.show(tableId, [1], 'map')
            .then(function() {
                operatorsMap = OperationsView.getOperatorsMap();
                $categoryMenu = $operationsView.find('.map .categoryMenu');
                $functionsMenu = $operationsView.find('.map .functionsMenu');
                done();
            });
        });

        describe('category menu in map', function() {
            it('menu should be visible', function() {
                expect($categoryMenu.is(":visible")).to.equal(true);
                expect($categoryMenu.find('li').length).to.be.above(7);
            });

            it('should select category when clicked', function() {
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "string");
                }).trigger(fakeEvent.click);
                expect($categoryMenu.find("li.active").text()).to.equal('string');
            });
            it('should select correct function list when clicked', function() {
                expect($functionsMenu.is(":visible")).to.equal(true);
                expect($functionsMenu.find('li').length).to.be.above(6);
                expect($functionsMenu.find('li').eq(0).text()).to.equal('ascii');
            });
        });

        describe('functions menu in map', function() {
            it('should not have selected li', function() {
                expect($functionsMenu.find('li.active').length).to.equal(0);
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.equal(true);
            });
            it('should select function name when clicked', function() {
                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "concat");
                }).trigger(fakeEvent.click);
                expect($functionsMenu.find("li.active").text()).to.equal('concat');
            });
            it ('should show arguments after clicking function name', function() {
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.equal(false);
            });
        });

        describe('argument section in map', function() {
            it('should have 3 visible text inputs', function() {
                expect($operationsView.find('.arg[type=text]:visible')).to.have.length(3);
                $argInputs = $operationsView.find('.arg[type=text]:visible');
            });
            it ('should have 1 visible checkbox for ICV', function() {
                expect($operationsView.find('.checkbox:visible')).to.have.lengthOf(1);
            });
        });

        describe('column pickers should work', function() {
            it ('input should fill from column header', function() {
                $argInputs.eq(0).focus().trigger('focus').val(""); // focus & trigger to make sure
                expect($argInputs.eq(0).val()).to.equal("");
                var $header = $('#xcTable-' + tableId).find('th.col1 .header');
                expect($header.find('input').val()).to.equal('average_stars');
                $header.click();

                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);

                var $allEls = $header.find('*');
                var count = 0;
                // go through each element inside .header and click
                $allEls.each(function() {
                    if ($(this).closest('.dropdownBox').length ||
                        !$(this).is(":visible")) {
                        return;
                    }
                    var $hiddenParents = $(this).parents().andSelf()
                            .filter(function() {
                                return $(this).css('visibility') === "hidden";
                            });
                    if ($hiddenParents.length) {
                        return;
                    }

                    $argInputs.eq(0).focus().trigger('focus').val("");
                    expect($argInputs.eq(0).val()).to.equal("");
                    $(this).click();
                    expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                    count++;
                });
                expect(count).to.be.at.least(5);
            });

            it("column picker should not work when operationsView closes", function() {
                // close operations view
                $("#operationsView .close").click();
                expect($operationsView.hasClass('xc-hidden')).to.equal(true);
                // argsSection should stil be open even when operationsView is closed
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.equal(false);


                $argInputs.eq(0).focus().trigger('focus').val(""); // focus & trigger to make sure
                expect($argInputs.eq(0).val()).to.equal("");
                var $header = $('#xcTable-' + tableId).find('th.col1 .header');
                expect($header.find('input').val()).to.equal('average_stars');
                $header.click();
                expect($argInputs.eq(0).val()).to.equal("");

            });
        });

        after(function(done) {
            OperationsView.close();
            setTimeout(function() { // allow time for op menu to close
                done();
            }, 500);
        });
    });

    // using filter in operations view
    describe('functions input test (filter)', function() {
        var $functionsInput;
        var $functionsList;
        var $argSection;

        before(function(done) {
            OperationsView.show(tableId, [1], 'filter')
            .then(function() {
                $functionsInput = $operationsView.find('.filter .functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $operationsView.find('.filter .argsSection').eq(0);
                done();
            });
        });

        it('clicking on functions input should work', function() {
            expect($functionsInput.length).to.equal(1);
            expect($functionsInput.is(":visible")).to.true;
            expect($functionsList.length).to.equal(1);
            expect($functionsList.is(":visible")).to.be.false;

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            var numLis = $functionsList.find('li:visible').length;
            expect(numLis).to.be.gt(10);

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('clicking on functions input iconWrapper produce full list', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);

            $functionsInput.val('is').trigger(fakeEvent.input);
            expect($functionsList.find("li:visible").length).to.be.lt(numLis);

            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('functions list li highlighting should work', function() {
            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find("li.highlighted").length).to.equal(0);
            expect($functionsList.hasClass("hovering")).to.be.false;

            $functionsList.find("li").eq(0).trigger('mouseenter');
            expect($functionsList.find("li.highlighted").length).to.equal(1);
            expect($functionsList.find("li").eq(0).hasClass("highlighted")).to.be.true;
            expect($functionsList.hasClass("hovering")).to.be.true;

            $functionsList.find("li").eq(0).trigger('mouseleave');
            expect($functionsList.find("li.highlighted").length).to.equal(0);
            expect($functionsList.hasClass("hovering")).to.be.false;

            $functionsList.addClass("disableMouseEnter");
            $functionsList.find("li").eq(0).trigger("mouseenter");
            expect($functionsList.hasClass("disableMouseEnter")).to.be.false;
            expect($functionsList.find("li.highlighted").length).to.equal(0);
            expect($functionsList.hasClass("hovering")).to.be.false;

            $functionsList.addClass("disableMouseEnter");
            $functionsList.find("li").eq(0).addClass("highlighted");
            $functionsList.find("li").eq(0).trigger("mouseleave");
            expect($functionsList.find("li.highlighted").length).to.equal(1);
            expect($functionsList.find("li").eq(0).hasClass("highlighted")).to.be.true;

            $functionsList.removeClass("disableMouseEnter");
            $functionsList.find("li").removeClass("highlighted");
        });


        it('keydown enter and tab should update argument section', function() {
            $functionsInput.val('').trigger(fakeEvent.enterKeydown);
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;

            $functionsInput.val('and').trigger(fakeEvent.enterKeydown);
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Tab});
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;

            $functionsInput.val('and').trigger({type: "keydown", which: keyCode.Tab});
            expect($argSection.hasClass('inactive')).to.be.false;

            prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;
        });

        it("keydown escape should close dropdowns", function() {
            $operationsView.find(".filter .list").show();
            expect($operationsView.find(".filter .list:visible").length).to.be.gt(1);
            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Escape});
            // only table list should be open
            expect($operationsView.find(".filter .list:visible").length).to.equal(1);
            $operationsView.find(".filter .tableList:visible .list").hide();
        });

        it('$.change on input should update argument section', function() {
            StatusBox.forceHide();

            $functionsInput.val('').change();
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;
            expect($('#statusBox:visible').length).to.equal(0);

            $functionsInput.val('and').change();
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $functionsInput.trigger(fakeEvent.mousedown);
            $functionsInput.val('invalidFunction').change();
            expect($('#statusBox:visible').length).to.equal(0);

            // trigger change via submit button to see if status box error shows
            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $operationsView.find('.submit').trigger(fakeEvent.mousedown);
            $functionsInput.val('test').change();
            expect($('#statusBox:visible').length).to.equal(1);
            StatusBox.forceHide();
        });

        it('functions list should scroll with key events', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.val("");
            $functionsInput.siblings('.iconWrapper').mousedown();
            $functionsInput.siblings('.iconWrapper').click();

            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
            expect(numLis).to.be.gt(10);
            expect($functionsList.find('li.highlighted').length).to.equal(0);

            $('body').trigger({type: "keydown", which: keyCode.Down});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').eq(0).hasClass('highlighted')).to.be.true;

            $('body').trigger({type: "keydown", which: keyCode.Up});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').last().hasClass('highlighted')).to.be.true;

            $('body').trigger({type: "keydown", which: keyCode.Down});
            $('body').trigger({type: "keydown", which: keyCode.Down});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').eq(1).hasClass('highlighted')).to.be.true;
            expect($functionsInput.val()).to.equal("between");
        });

        it("dblclick should select full text", function() {
            $functionsInput.val("$something");
            expect($functionsInput.range().length).to.equal(0);
            $functionsInput.trigger("dblclick");
            expect($functionsInput.range().length).to.equal(10);
        });

        after(function() {
            OperationsView.close();
        });
    });

    describe('functions input test (groupby)', function() {
        var $functionsInput;
        var $functionsList;

        before(function(done) {
            OperationsView.show(tableId, [1], "group by")
            .then(function() {
                $functionsInput = $operationsView.find('.groupby .functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                done();
            });
        });

        it('clicking on functions input should work', function() {
            expect($functionsInput.length).to.equal(1);
            expect($functionsInput.is(":visible")).to.true;
            expect($functionsList.length).to.equal(1);
            expect($functionsList.is(":visible")).to.be.false;

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            var numLis = $functionsList.find('li:visible').length;
            // expect(numLis).to.be.gt(7);
            // expect(numLis).to.be.lt(12);
            // XXX We want to hide minFloat, minInteger, minString...
            // and only expose to user min
            expect(numLis).to.equal(13);

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('clicking on functions input iconWrapper produce full list', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);

            $functionsInput.val('is').trigger(fakeEvent.input);
            expect($functionsList.find("li:visible").length).to.be.lt(numLis);

            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        after(function() {
            OperationsView.close();
        });
    });

    describe('functions input test (aggregate)', function() {
        var $functionsInput;
        var $functionsList;

        before(function(done) {
            OperationsView.show(tableId, [1], "aggregate")
            .then(function() {
                $functionsInput = $operationsView.find('.aggregate .functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                done();
            });
        });

        it('clicking on functions input should work', function() {
            expect($functionsInput.length).to.equal(1);
            expect($functionsInput.is(":visible")).to.true;
            expect($functionsList.length).to.equal(1);
            expect($functionsList.is(":visible")).to.be.false;

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            var numLis = $functionsList.find('li:visible').length;
            // expect(numLis).to.be.gt(7);
            // expect(numLis).to.be.lt(12);
            expect(numLis).to.equal(13);

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('clicking on functions input iconWrapper produce full list', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);

            $functionsInput.val('is').trigger(fakeEvent.input);
            expect($functionsList.find("li:visible").length).to.be.lt(numLis);

            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        after(function(done) {
            OperationsView.close();
            setTimeout(function() { // allow time for op menu to close
                done();
            }, 500);
        });
    });

    describe('filter', function() {
        var $functionsInput;
        var $argSection;
        var $filterForm;

        before(function(done) {
            $filterForm = $operationsView.find('.filter');

            OperationsView.show(tableId, [1], 'filter')
            .then(function() {
                $functionsInput = $operationsView.find('.filter .functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $filterForm.find('.argsSection').eq(0);
                done();
            });
        });

        describe('filter()', function() {
            var cachedFilter;
            var fn;
            before(function(){
                cachedFilter = xcFunction.filter;

                fn = OperationsView.__testOnly__.filter;
                $filterForm.find('.functionsInput').val("eq");
            });

            it('filter() should work', function(done) {
                var filterCalled = false;
                xcFunction.filter = function(colNum, tId, opts) {
                    expect(colNum).to.equal(1);
                    expect(tId).to.equal(tableId);
                    expect(opts.filterString).to.equal("eq()");
                    filterCalled = true;
                    return PromiseHelper.resolve();
                };

                $filterForm.find('.functionsInput').val("eq");

                fn("eq", [], [], false)
                .then(function() {
                    expect(filterCalled).to.be.true;
                    done();
                });
            });

            it('filter() should work', function(done) {
                $filterForm.find('.functionsInput').val("gt");

                var filterCalled = false;
                xcFunction.filter = function(colNum, tId, opts) {
                    expect(colNum).to.equal(1);
                    expect(tId).to.equal(tableId);
                    expect(opts.filterString).to.equal("gt(int(arg1, 10), string(arg2))");
                    filterCalled = true;
                    return PromiseHelper.resolve();
                };

                var typeInfo = [{
                    type: "string",
                    argNum: 1
                }, {
                    type: "integer",
                    argNum: 0
                }];
                fn("gt", ["arg1", "arg2"], typeInfo, false)
                .then(function() {
                    expect(filterCalled).to.be.true;
                    done();
                });
            });

            after(function(){
                xcFunction.filter = cachedFilter;
                $filterForm.find('.functionsInput').val("");
            });
        });

        describe('testing multiple conditions', function() {
            var addGroup;
            var removeGroup;
            before(function() {
                addGroup = OperationsView.__testOnly__.addFilterGroup;
                removeGroup = OperationsView.__testOnly__.removeFilterGroup;
            });

            it('minimizing group with no args should work', function() {
                expect($argSection.hasClass('inactive')).to.be.true;
                expect($filterForm.find('.minGroup').length).to.equal(1);
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(0);
                expect($filterForm.find('.functionsInput').val()).to.equal("");
                expect($filterForm.find('.group').hasClass('minimized')).to.be.false;

                $filterForm.find('.minGroup').click();

                expect($filterForm.find('.group').hasClass('minimized')).to.be.true;
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(1);
                expect($filterForm.find('.group').attr('data-numargs')).to.equal("0");
            });

            it('unminimize should work', function() {
                expect($filterForm.find('.group').hasClass('minimized')).to.be.true;
                $filterForm.find('.group').mouseup();
                expect($filterForm.find('.group').hasClass('minimized')).to.be.false;
            });

            it('minimizing group with args should work', function() {
                // check state
                expect($argSection.hasClass('inactive')).to.be.true;
                expect($filterForm.find('.minGroup').length).to.equal(1);
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(0);
                expect($filterForm.find('.functionsInput').val()).to.equal("");
                expect($filterForm.find('.group').hasClass('minimized')).to.be.false;
                expect($argSection.find('.arg:visible').length).to.equal(0);

                // trigger function and arg section
                $functionsInput.val('eq').trigger(fakeEvent.enterKeydown);
                expect($argSection.hasClass('inactive')).to.be.false;
                expect($argSection.find('.arg:visible').length).to.equal(2);

                // click minimize
                $filterForm.find('.minGroup').click();

                // check
                expect($filterForm.find('.group').hasClass('minimized')).to.be.true;
                expect($filterForm.find('.group').attr('data-numargs')).to.equal("2");
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(0);

                // unminimize
                $filterForm.find('.group').mouseup();
            });

            it('adding and removing filter args should work', function() {
                expect($filterForm.find('.group').length).to.equal(1);
                expect($filterForm.find('.group').eq(0).hasClass('minimized')).to.be.false;

                addGroup();

                expect($filterForm.find('.group').length).to.equal(2);
                expect($filterForm.find('.group').eq(0).hasClass('minimized')).to.be.true;
                expect($filterForm.find('.group').eq(0).attr('data-numargs')).to.equal("2");
                expect($filterForm.find('.group').eq(1).hasClass('minimized')).to.be.false;
                $filterForm.find('.group').eq(1).find(".functionsInput").val("between").change();

                // add another group
                $filterForm.find(".addFilterArg").click();
                expect($filterForm.find('.group').length).to.equal(3);

                // switch and to or to and
                expect($operationsView.find(".strPreview").text().indexOf("and(")).to.be.gt(-1);
                expect($operationsView.find(".strPreview").text().indexOf("or(")).to.equal(-1);

                $operationsView.find(".switch").click();
                expect($operationsView.find(".strPreview").text().indexOf("and(")).to.equal(-1);
                expect($operationsView.find(".strPreview").text().indexOf("or(")).to.be.gt(-1);

                $operationsView.find(".switch").click();
                expect($operationsView.find(".strPreview").text().indexOf("and(")).to.be.gt(-1);
                expect($operationsView.find(".strPreview").text().indexOf("or(")).to.equal(-1);

                // cache 3rd group
                var $thirdGroup = $filterForm.find('.group').eq(2);
                expect($thirdGroup.find('.functionsList').data('fnlistnum')).to.equal(2);

                // remove middle group
                removeGroup($filterForm.find('.group').eq(1));

                expect($filterForm.find('.group').length).to.equal(2);
                expect($thirdGroup.find('.functionsList').data('fnlistnum')).to.equal(1);

                $filterForm.find(".closeGroup").last().click();
                expect($filterForm.find('.group').length).to.equal(1);
                expect($filterForm.find('.andOrToggle').is(":visible")).to.be.false;
            });
        });

        // XXX just a quick test
        describe('submission fail handler', function() {
            var fn;
            before(function() {
                fn = OperationsView.__testOnly__.submissionFailHandler;
            });

            it('submission fail hanlder should work', function() {
                fn(Date.now(), StatusTStr[StatusT.StatusCanceled]);
                expect($("#alertModal").is(":visible")).to.be.false;

                $(document).trigger('mousedown'); // no alert modal if mousedown

                fn(Date.now() - 1000, "someError");
                expect($("#alertModal").is(":visible")).to.be.false;

                $("#alertContent").find(".text").text("1234");

                fn(Date.now(), "someError");
                UnitTest.hasAlertWithText("1234.\nWould you like to modify the filter?");
            });
        });


        describe("function submitFinalForm for filter", function() {
            var cachedFilter;
            var fn;
            before(function() {
                cachedFilter = xcFunction.filter;
                fn = OperationsView.__testOnly__.submitFinalForm;
            });
            it("submitFinalForm", function(done) {
                var called = false;
                xcFunction.filter = function() {
                    called = true;
                    return PromiseHelper.reject();
                };

                var colName = xcHelper.getPrefixColName(prefix, "average_stars");

                fn([colName, colName])
                .then(function() {
                    done("fail");
                })
                .fail(function() {
                    expect(called).to.be.true;
                    UnitTest.hasAlertWithTitle(StatusMessageTStr.FilterFailedAlt, {confirm: true});
                    done();
                });
            });

            after(function() {
                xcFunction.filter = cachedFilter;
            });
        });


        after(function(done) {
            OperationsView.close();
            setTimeout(function() { // allow time for op menu to close
                done();
            }, 500);
        });
    });

    // using map in operations view
    describe('map', function() {
        var $filterInput;
        var $categoryMenu;
        var $functionsMenu;
        var $strPreview;

        before(function(done) {
            $strPreview = $operationsView.find('.strPreview');

            OperationsView.show(tableId, [1], 'map')
            .then(function() {
                $categoryMenu = $operationsView.find('.map .categoryMenu');
                $functionsMenu = $operationsView.find('.map .functionsMenu');
                $filterInput = $('#mapFilter');

                done();
            });
        });

        describe('map\'s search filter', function() {
            it('filter on input should update menus', function() {
                $filterInput.val('add').trigger(fakeEvent.input);
                var $catLis = $categoryMenu.find('li:visible').filter(function() {
                    return ($(this).text().indexOf('user') === -1);
                });

                var $funcLis = $functionsMenu.find('li:visible').filter(function() {
                    return ($(this).text().indexOf(':') === -1);
                });
                expect($catLis).to.have.length(2);
                expect($catLis.text()).to.equal("arithmeticconversion");

                expect($funcLis).to.have.length(7);
                expect($funcLis.text()).to.equal("adddateAddDaydateAddIntervaldateAddMonthdateAddYearipAddrToIntmacAddrToInt");

                $filterInput.val('').trigger(fakeEvent.input);
                expect($categoryMenu.find('li:visible').length).to.be.within(7, 11);
                expect($functionsMenu.find('li:visible').length).to.be.above(70);

                $filterInput.val('add').trigger(fakeEvent.input);
                $funcLis = $functionsMenu.find('li:visible').filter(function() {
                    return ($(this).text().indexOf(':') === -1);
                });
                expect($funcLis.text()).to.equal("adddateAddDaydateAddIntervaldateAddMonthdateAddYearipAddrToIntmacAddrToInt");

                $filterInput.val('sub').trigger(fakeEvent.input);
                $funcLis = $functionsMenu.find('li:visible').filter(function() {
                    return ($(this).text().indexOf(':') === -1);
                });
                expect($funcLis.text()).to.equal("subsubstringsubstringIndex");
            });

            it('mapFilter keydown up/down actions should work', function() {
                $filterInput.val('').trigger(fakeEvent.input);
                expect($categoryMenu.find('li:visible').length).to.be.within(7, 11);
                expect($categoryMenu.find('li.active').length).to.equal(0);

                $filterInput.trigger({type: "keydown", which: keyCode.Up});
                expect($categoryMenu.find('li.active').length).to.equal(1);
                expect($categoryMenu.find('li').eq(0).hasClass('active')).to.be.true;

                $filterInput.trigger({type: "keydown", which: keyCode.Down});
                expect($categoryMenu.find('li.active').length).to.equal(1);
                expect($categoryMenu.find('li').eq(1).hasClass('active')).to.be.true;

                $filterInput.trigger({type: "keydown", which: keyCode.Up});
                expect($categoryMenu.find('li.active').length).to.equal(1);
                expect($categoryMenu.find('li').eq(0).hasClass('active')).to.be.true;
            });

            it('mapFilter keydown enter should work', function() {
                $filterInput.val('aTAn2').trigger(fakeEvent.input);
                expect($categoryMenu.find('li').eq(6).hasClass('active')).to.be.true;
                expect($functionsMenu.find('li:visible').length).to.equal(1);
                expect($functionsMenu.find('li:visible').eq(0).hasClass('active')).to.be.false;
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.be.true;

                $filterInput.trigger({type: "keydown", which: keyCode.Enter});
                expect($functionsMenu.find('li:visible').eq(0).hasClass('active')).to.be.true;
                expect($categoryMenu.find('li:visible').eq(0).hasClass('active')).to.be.true;
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.be.false;
            });

            it('mapFilter clear should work', function() {
                $filterInput.val('atan2').trigger(fakeEvent.input);
                expect($filterInput.val()).to.equal('atan2');
                expect($categoryMenu.find('li:visible').length).to.equal(1);
                expect($functionsMenu.find('li:visible').length).to.equal(1);

                $operationsView.find('.filterMapFuncArea .clear').trigger(fakeEvent.mousedown);
                expect($filterInput.val()).to.equal('');
                expect($categoryMenu.find('li:visible').length).to.be.within(7, 11);
                expect($functionsMenu.find('li:visible').length).to.be.above(70);
            });

            it('clicking on filtered category list should work', function() {
                $filterInput.val('sub').trigger(fakeEvent.input);
                $categoryMenu.find('li:visible').eq(0).trigger(fakeEvent.click);
                expect($categoryMenu.find("li.active").text()).to.equal('arithmetic');
                expect($functionsMenu.find('li:visible')).to.have.length(1);
                expect($functionsMenu.find('li:visible').text()).to.equal("sub");
            });

            it('clicking away from category list should reset func list', function() {
                expect($functionsMenu.find('li:visible').text()).to.equal("sub");
                $operationsView.find('.map .catFuncHeadings').trigger(fakeEvent.mousedown);
                expect($functionsMenu.find('li:visible').text()).to.equal("subsubstringsubstringIndex");
                expect($categoryMenu.find("li.active")).to.have.length(0);
                $filterInput.val('').trigger(fakeEvent.input);
            });
        });

        describe('autofilled input args', function() {
            it('should select category when clicked', function() {
                // string - concat
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "arithmetic");
                }).trigger(fakeEvent.click);
                expect($categoryMenu.find("li.active").text()).to.equal('arithmetic');

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "add");
                }).trigger(fakeEvent.click);
                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                var prefixCol = xcHelper.getPrefixColName(prefix, "average_stars");
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                expect($argInputs.eq(1).val()).to.equal("");
                expect($argInputs.eq(2).val()).to.startsWith("average_stars_add");

                // user-defined - default:splitWithDelim
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "user-defined");
                }).trigger(fakeEvent.click);

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "default:splitWithDelim");
                }).trigger(fakeEvent.click);

                $argInputs = $operationsView.find('.arg[type=text]:visible');
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                expect($argInputs.eq(1).val()).to.equal("");
                expect($argInputs.eq(2).val()).to.equal("");
                expect($argInputs.eq(3).val()).to.startsWith("average_stars_udf");

                // check arg descriptions
                var $descriptions = $argInputs.closest('.row').find('.description');
                expect($descriptions.eq(0).text()).to.equal("txt:");
                expect($descriptions.eq(1).text()).to.equal("index:");
                expect($descriptions.eq(2).text()).to.equal("delim:");
                expect($descriptions.eq(3).text()).to.equal("New Resultant Column Name:");

            });

            it('should focus on first empty input', function() {
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "string");
                }).trigger(fakeEvent.click);

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "concat");
                }).trigger(fakeEvent.click);

                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                expect($argInputs.eq(1).is(document.activeElement)).to.be.true;
            });
        });

        describe("special argument cases", function() {
            it("addMapArg should work", function() {
                $categoryMenu.find("li:contains('user-defined')").click();
                $functionsMenu.find("li:contains('default:multiJoin')").click();
                expect($operationsView.find(".addMapArg").length).to.equal(1);
                expect($operationsView.find(".arg:visible").length).to.equal(2);
                $operationsView.find(".addMapArg").click();
                expect($operationsView.find(".arg:visible").length).to.equal(3);
            });

            it("boolean checkbox should work", function() {
                $categoryMenu.find("li:contains('conditional')").click();
                $functionsMenu.find("li:contains('startsWith')").click();
                expect($operationsView.find(".boolArg").length).to.equal(1);

                $operationsView.find(".boolArgWrap").click();
                expect($operationsView.find(".boolArgWrap .checkbox").hasClass("checked")).to.be.true;
                expect($operationsView.find(".map .arg").eq(2).val()).to.equal("true");
            });

            it("no arg box should be visible for optional args", function() {
                $categoryMenu.find("li:contains('type-casting')").click();
                $functionsMenu.find("li:contains('int')").click();
                expect($operationsView.find(".checkboxWrap:visible").length).to.equal(1);
            });
        });

        describe('run map functions', function() {
            var submitForm;
            before(function() {
                submitForm = OperationsView.__testOnly__.submitForm;
            });

            it ('string-concat should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    category: "string",
                    func: "concat",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefixCol
                    }, {
                        num: 1,
                        str: "zz"
                    }],
                    expectedMapStr: 'concat(' + prefixCol + ', "zz")',
                    expectedCliMapStr: 'concat(' + prefixCol + ', "zz")',
                    transform: function(colVal) {
                        return (colVal + this.args[1].str);
                    }
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('string-concat with empty param should not work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    category: "string",
                    func: "concat",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefixCol
                    },{
                        num: 1,
                        str: ""
                    }],
                    expectedMapStr: 'concat(' + prefixCol + ', "")',
                    expectedCliMapStr: 'concat(' + prefixCol + 'yelping_since, "")',
                    transform: null
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('arithmetic-add with string should not work', function(done) {
                var options = {
                    category: "arithmetic",
                    func: "add",
                    args: [{
                        num: 0,
                        str: '"2"'
                    }, {
                        num: 1,
                        str: '"3"'
                    }],
                    expectedMapStr: 'add("2", "3")',
                    expectedCliMapStr: 'add("2", "3")',
                    transform: null
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('udf default:splitWithDelim should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var mapStr = 'default:splitWithDelim(' + prefixCol + ', 1, "-")';
                var options = {
                    category: "user-defined",
                    func: "default:splitWithDelim",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefixCol
                    }, {
                        num: 1,
                        str: 1
                    }, {
                        num: 2,
                        str: "-"
                    }],
                    expectedMapStr: mapStr,
                    expectedCliMapStr: mapStr,
                    transform: function(colVal) {
                        var delim = "-";
                        var index = this.args[1].str;
                        return colVal.split(delim).splice(index).join(delim);
                    }
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('add with string to int conversion should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    category: "arithmetic",
                    func: "add",
                    args: [{
                        num: 0,
                        str: 'int(' + prefixCol + ', 10)'
                    }, {
                        num: 1,
                        str: 5
                    }],
                    expectedMapStr: 'add(int(' + prefixCol + ', 10), 5)',
                    expectedCliMapStr: 'add(int(' + prefixCol + ', 10), 5)',
                    transform: function(colVal) {
                        return parseInt(colVal) + this.args[1].str + "";
                    }
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            function runMap(options) {
                var deferred = PromiseHelper.deferred();
                var category = options.category;
                var func = options.func;
                var args = options.args;
                var expectedMapStr = options.expectedMapStr;
                var expectedCliMapStr = options.expectedCliMapStr;

                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === category);
                }).trigger(fakeEvent.click);

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === func);
                }).trigger(fakeEvent.click);

                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                for (var i = 0; i < args.length; i++) {
                    var argNum = args[i].num;
                    $argInputs.eq(argNum).val(args[i].str).trigger(fakeEvent.input);
                }

                var promise = function() {
                    var innerDeferred = PromiseHelper.deferred();
                    setTimeout(function() {
                        // quotes/parsing doesn't get applied til 200 ms after inputed
                        var previewStr = $strPreview.find('.descArgs').text();
                        expect(previewStr).to.equal(expectedMapStr);
                        innerDeferred.resolve();
                    }, 250);
                    return innerDeferred.promise();
                };

                promise()
                .then(function() {
                    return submitForm();
                })
                .then(function() {
                    expect(options.transform).to.not.be.null;
                    var $tableWrap;
                    $('.xcTableWrap').each(function() {
                        if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                            $tableWrap = $(this);
                            return false;
                        }
                    });
                    var orgCellText = $tableWrap.find('.row0 .col13 .originalData').text();
                    var newCellText = $tableWrap.find('.row0 .col1 .originalData').text();
                    expect(newCellText).to.equal(options.transform(orgCellText));

                    orgCellText = $tableWrap.find('.row15 .col13 .originalData').text();
                    newCellText = $tableWrap.find('.row15 .col1 .originalData').text();
                    expect(newCellText).to.equal(options.transform(orgCellText));
                    var cli = Log.viewLastAction(true).cli;

                    expect(cli).to.contain(JSON.stringify(expectedCliMapStr));
                    Log.undo()
                    .always(function() {
                        deferred.resolve();
                    });
                })
                .fail(function() {
                    expect(options.transform).to.be.null;
                    deferred.reject();
                });

                return deferred.promise();
            }
        });

        describe("cast helper", function() {
            // assumes "add" function is chosen
            it("add on string col should show cast helper", function(done) {
                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                var prefixCol = gColPrefix + xcHelper.getPrefixColName(prefix, "yelping_since");
                $argInputs.eq(0).val(prefixCol);
                $argInputs.eq(1).val(5).change();
                OperationsView.__testOnly__.submitForm()
                .always(function() {
                    expect($operationsView.find(".strPreview").text().indexOf("float(")).to.equal(-1);
                    var $castSection = $operationsView.find(".cast.showing");
                    expect($castSection.length).to.equal(1);
                    expect($castSection.find(".list").is(":visible")).to.be.false;
                    $castSection.find("input").trigger(fakeEvent.mousedown);
                    $castSection.find("input").click();

                    expect($castSection.find(".list").is(":visible")).to.be.true;
                    $castSection.find("li").filter(function() {
                        return $(this).text() === "float";
                    }).trigger(fakeEvent.mouseup);
                    expect($operationsView.find(".strPreview").text().indexOf("float(")).to.be.gt(-1);
                    done();
                });
            });
        });

        after(function(done) {
            $(document).trigger({type: "keydown", which: keyCode.Escape});
            // allow time for operations view to close
            setTimeout(function() {
                UnitTest.removeOrphanTable()
                .always(function() {
                    done();
                });
            }, 300);
        });
    });

    describe('aggregate', function() {
        var $aggForm;
        var $functionsInput;
        before(function(done) {
            $strPreview = $operationsView.find('.strPreview');

            OperationsView.show(tableId, [1], 'aggregate')
            .then(function() {
                $aggForm = $operationsView.find('.aggregate:visible');
                $functionsInput = $aggForm.find('.functionsInput:visible');
                done();
            });
        });

        describe('check aggregate form initial state', function() {
            it('agg form elements should be visible', function() {
                expect($aggForm).to.have.length(1);
                expect($aggForm.find('.tableList .text:visible')).to.have.length(1);
                expect($aggForm.find('.tableList .text').text()).to.startsWith('unitTestFakeYelp');
                expect($functionsInput).to.have.length(1);
                expect($functionsInput.val()).to.equal("");
                expect($functionsInput.attr('placeholder')).to.equal("avg");
            });

            it('functions menu should be filled', function() {
                var $menu = $aggForm.find('.genFunctionsMenu:hidden');
                expect($menu).to.have.length(1);
                expect($menu.find('li').length).to.be.gt(8);
                expect($menu.find('li').eq(0).text()).to.equal('avg');
                expect($menu.find('li').last().text()).to.equal('sumInteger');
                expect($functionsInput.val()).to.equal("");
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.true;
            });
        });

        describe('agg function', function() {
            it('agg function input should work', function() {
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.true;
                $functionsInput.val('avg').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.false;

                $functionsInput.val('avgWrong').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.true;

                $functionsInput.val('count').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.false;
                expect($aggForm.find('.descriptionText').text()).to.equal("Description: Counts the occurrences of a field");

                $functionsInput.val('avg').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.false;
                expect($aggForm.find('.descriptionText').text()).to.equal("Description: Computes the average (mean) value in a set.");
                expect($aggForm.find('.description').eq(0).text()).to.equal("Field name to compute average (mean) value of:");
                expect($aggForm.find('.colNameSection .arg').val()).to.equal("");
            });
        });

        describe('field name input', function() {
            it('field name input should be autofilled when function selected', function() {
                var $fieldInput = $aggForm.find('.arg').eq(0);
                $functionsInput.val('avg').trigger('change');
                expect($fieldInput.val()).to.equal(gColPrefix + prefix + gPrefixSign + "average_stars");
            });
        });

        describe('resultant name input', function() {
            it('resultant name input should work', function() {
                var $resultInput = $aggForm.find('.colNameSection .arg');

                expect($resultInput.val()).to.equal("");
                $resultInput.focus().trigger("focus");
                expect($resultInput.val()).to.equal(gAggVarPrefix);
                $resultInput.blur().trigger("blur");
                expect($resultInput.val()).to.equal("");

                $resultInput.val('something').trigger('input');
                expect($resultInput.val()).to.equal(gAggVarPrefix + 'something');
                $resultInput.caret(0);
                expect($resultInput.caret()).to.equal(0);
                $resultInput.trigger("keydown");
                expect($resultInput.caret()).to.equal(1);
            });
        });

        describe('checkAggregateNameValidity() check', function() {
            it('checkAggregateNameValidity() fail should work', function(done) {
                var aggCheck = OperationsView.__testOnly__.checkAggregateNameValidity;
                var $resultInput = $aggForm.find('.colNameSection .arg');
                $resultInput.val('fa#il').trigger('input');
                var valid = false;

                aggCheck()
                .then(function(ret) {
                    expect(ret).to.equal(valid);
                })
                .fail(function() {
                    expect(valid).to.be.false;
                })
                .always(function() {
                    done();
                });
            });

            it('checkAggregateNameValidity() success should work', function(done) {
                var aggCheck = OperationsView.__testOnly__.checkAggregateNameValidity;
                var $resultInput = $aggForm.find('.colNameSection .arg');
                $resultInput.val('pa1ss').trigger('input');
                var valid = true;

                aggCheck()
                .then(function(ret) {
                    expect(ret).to.equal(valid);
                })
                .fail(function() {
                    expect(valid).to.be.false;
                })
                .always(function() {
                    done();
                });
            });
        });

        describe("functions test", function() {
            it("function getColNumFromFunc should work", function() {
                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                var str = "test(" + prefixCol + ", blah)";
                var res = OperationsView.__testOnly__.getColNumFromFunc(str);
                expect(res).to.equal(1);
            });
        });

        describe('aggregate submit test', function() {
            var submitForm;
            before(function() {
                submitForm = OperationsView.__testOnly__.submitForm;
            });

            it ('arg1-count, arg2-blank should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "count",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefixCol
                    }],
                    output: "1,000"
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            it ('arg1-count, arg2-test should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "count",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefixCol
                    },{
                        num: 1,
                        str: gAggVarPrefix + "yelping_since"
                    },
                    ],
                    output: "1,000"
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            it ('arg1-invalid, arg2-blank should not work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "invalid",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefixCol
                    }],
                    output: null
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            it ('arg1-avg, arg2-blank on str should not work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "avg",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefixCol
                    }],
                    output: null
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            function runAgg(options) {
                var deferred = PromiseHelper.deferred();
                var func = options.func;
                var args = options.args;

                $functionsInput.val(func).trigger('change');
                $functionsInput.blur();

                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                for (var i = 0; i < args.length; i++) {
                    var argNum = args[i].num;
                    $argInputs.eq(argNum).val(args[i].str).trigger(fakeEvent.input);
                }

                submitForm()
                .then(function() {
                    expect(options.output).to.not.be.null;
                    var alertText = $('#alertContent .text').text().trim();
                    expect(alertText).to.equal('{"Value":' + options.output +'}');
                    if (args[1]) {
                        Aggregates.deleteAggs([args[1].str.slice(1)])
                        .then(function() {
                            deferred.resolve();
                        })
                        .fail(function() {
                            expect(false).to.be.true;
                            deferred.reject();
                        })
                        .always(function() {
                            Alert.forceClose();
                            OperationsView.show(tableId, [1], 'aggregate')
                            .then(function() {
                                deferred.resolve();
                            });
                        });
                    } else {
                        OperationsView.show(tableId, [1], 'aggregate')
                        .then(function() {
                            deferred.resolve();
                        });
                    }
                })
                .fail(function() {
                    Alert.forceClose();
                    expect(options.output).to.be.null;
                    deferred.reject();
                });

                return deferred.promise();
            }
        });

        after(function(done) {
            OperationsView.close();
            // allow time for operations view to close
            setTimeout(function() {
                done();
            }, 500);
        });
    });

    describe("editing dataflow", function() {
        var cachedDFFn;
        before(function() {
            cachedDFFn = DagEdit.isEditMode;
            DagEdit.isEditMode = function() {
                return true;
            };
        })
        describe("editing map", function() {
            var colName;
            var $functionsMenu;
            var $filterInput;
            var $mapSection;
            before(function() {
                colName = prefix + gPrefixSign + "average_stars";
                $functionsMenu = $operationsView.find('.map .functionsMenu');
                $filterInput = $('#mapFilter');
                $mapSection = $("#operationsView .map");
            });

            it("should show map form", function(done) {
                var prefillInfo = {
                    ops: ["concat"],
                    args: [[colName, "\"blah\""]],
                    newFields: ["newField"],
                    icv: true,
                    isDroppedTable: false
                };

                expect($mapSection.is(":visible")).to.be.false;

                OperationsView.show(tableId, [], "map", {prefill: prefillInfo})
                .then(function() {
                    expect($mapSection.is(":visible")).to.be.true;
                    expect($filterInput.val()).to.equal("concat");
                    expect($functionsMenu.find("li.active").text()).to.equal("concat");
                    expect($mapSection.find(".arg").length).to.equal(3);
                    expect($mapSection.find(".arg").eq(0).val()).to.equal(gColPrefix + colName);
                    expect($mapSection.find(".arg").eq(1).val()).to.equal("blah");
                    expect($mapSection.find(".arg").eq(2).val()).to.equal("newField");
                    done();
                });
            });

            // failing at newColNameCheck to prevent actually submitting
            // but if it reaches here it would have submitted
            it("should submit even with unknown column", function() {
                var called = false;
                var cachedFn = ColManager.checkColName;
                ColManager.checkColName = function($input, tId, colNum, options) {
                    expect(options.ignoreNewCol).to.be.true;
                    called = true;
                    return true;
                }

                $mapSection.find(".arg").eq(0).val(gColPrefix + "nonExistantCol");
                expect($mapSection.find(".arg").eq(0).val()).to.equal(gColPrefix + "nonExistantCol");

                $operationsView.find(".submit").click();
                expect(called).to.be.true;
                $mapSection.find(".arg").eq(0).val(gColPrefix + colName);
                ColManager.checkColName = cachedFn;
            });

            it("should save without errors even with column of wrong type", function() {
                var called = false;
                var cachedFn = DagEdit.store;
                DagEdit.store = function(info) {
                    called = true;
                    expect(info.args.icv).to.be.true;
                    expect(info.args.eval.length).to.equal(1);
                    expect(info.args.eval[0].evalString).to.equal("concat(" + colName + ", \"blah\")");
                    expect(info.args.eval[0].newField).to.equal("newField");
                };
                $operationsView.find(".submit").click();
                expect(called).to.be.true;
                DagEdit.store = cachedFn;
            });

            after(function(done) {
                OperationsView.close();
                // allow time for operations view to close
                setTimeout(function() {
                    done();
                }, 500);
            });
        });

        describe("editing group by", function() {
            var colName1;
            var colName2;
            var $functionInputs;
            var $groupbySection;

            before(function() {
                colName1 = prefix + gPrefixSign + "average_stars";
                colName2 = prefix + gPrefixSign + "compliments";

                $groupbySection = $("#operationsView .groupby");
            });

            it("should show groupby form", function(done) {
                var prefillInfo = {
                    "ops": ["count", "avg"],
                    "args": [[colName1], [colName2]],
                    "newFields": ["newField1", "newField2"],
                    "dest": "destTableName",
                    "indexedFields": [colName2, colName1],
                    "icv": true,
                    "includeSample": true,
                    "isDroppedTable": false
                };

                expect($groupbySection.is(":visible")).to.be.false;

                OperationsView.show(tableId, [], "group by", {prefill: prefillInfo})
                .then(function() {
                    $functionInputs = $operationsView.find('.groupby .functionsInput');

                    expect($groupbySection.is(":visible")).to.be.true;
                    expect($functionInputs.length).to.equal(2);
                    expect($functionInputs.eq(0).val()).to.equal("count");
                    expect($functionInputs.eq(1).val()).to.equal("avg");
                    expect($groupbySection.find(".arg").length).to.equal(6);
                    expect($groupbySection.find(".arg").eq(0).val()).to.equal(gColPrefix + colName2);
                    expect($groupbySection.find(".arg").eq(1).val()).to.equal(gColPrefix + colName1);
                    expect($groupbySection.find(".arg").eq(2).val()).to.equal(gColPrefix + colName1);
                    expect($groupbySection.find(".arg").eq(3).val()).to.equal("newField1");
                    expect($groupbySection.find(".arg").eq(4).val()).to.equal(gColPrefix + colName2);
                    expect($groupbySection.find(".arg").eq(5).val()).to.equal("newField2");

                    done();
                });
            });

            it("should save without errors", function() {
                var called = false;
                var cachedFn = DagEdit.store;
                DagEdit.store = function(info) {
                    called = true;
                    expect(info.args.icv).to.be.true;
                    expect(info.args.includeSample).to.be.true;
                    expect(info.args.newKeyField).to.equal("");

                    expect(info.args.eval.length).to.equal(2);
                    expect(info.args.eval[0].evalString).to.equal("count(" + colName1 + ")");
                    expect(info.args.eval[0].newField).to.equal("newField1");
                    expect(info.args.eval[1].evalString).to.equal("avg(" + colName2 + ")");
                    expect(info.args.eval[1].newField).to.equal("newField2");

                    expect(info.indexFields.length).to.equal(2);
                    expect(info.indexFields[0]).to.equal(colName2);
                    expect(info.indexFields[1]).to.equal(colName1);
                };
                $operationsView.find(".submit").click();
                expect(called).to.be.true;
                DagEdit.store = cachedFn;
            });

            after(function(done) {
                OperationsView.close();
                // allow time for operations view to close
                setTimeout(function() {
                    done();
                }, 500);
            });
        });

        describe("editing filter", function() {
            var colName;
            var $functionInput;
            var $filterSection;

            before(function() {
                colName = prefix + gPrefixSign + "average_stars";
                $filterSection = $("#operationsView .filter");
            });

            it("should show filter form", function(done) {
                var prefillInfo = {
                    ops: ["eq"],
                    args: [[colName, "\"blah\""]],
                    isDroppedTable: false
                };

                expect($filterSection.is(":visible")).to.be.false;

                OperationsView.show(tableId, [], "filter", {prefill: prefillInfo})
                .then(function() {
                    $functionInput = $operationsView.find('.filter .functionsInput');

                    expect($filterSection.is(":visible")).to.be.true;
                    expect($functionInput.val()).to.equal("eq");
                    expect($filterSection.find(".arg").length).to.equal(2);
                    expect($filterSection.find(".arg").eq(0).val()).to.equal(gColPrefix + colName);
                    expect($filterSection.find(".arg").eq(1).val()).to.equal("blah");
                    done();
                });
            });

            it("should save without errors", function() {
                var called = false;
                var cachedFn = DagEdit.store;
                DagEdit.store = function(info) {
                    called = true;
                    expect(info.args.eval.length).to.equal(1);
                    expect(info.args.eval[0].evalString).to.equal("eq(" + colName + ", \"blah\")");
                    expect(info.args.eval[0].newField).to.equal("");
                };
                $operationsView.find(".submit").click();
                expect(called).to.be.true;
                DagEdit.store = cachedFn;
            });

            after(function(done) {
                OperationsView.close();
                // allow time for operations view to close
                setTimeout(function() {
                    done();
                }, 500);
            })
        });

        describe("editing aggregate", function() {
            var colName;
            var $functionInput;
            var $aggSection;

            before(function() {
                colName = prefix + gPrefixSign + "average_stars";
                $aggSection = $("#operationsView .aggregate");
            });

            it("should show agg form", function(done) {
                var prefillInfo = {
                    ops: ["avg"],
                    args: [[colName]],
                    isDroppedTable: false
                };

                expect($aggSection.is(":visible")).to.be.false;

                OperationsView.show(tableId, [], "aggregate", {prefill: prefillInfo})
                .then(function() {
                    $functionInput = $operationsView.find('.aggregate .functionsInput');

                    expect($aggSection.is(":visible")).to.be.true;
                    expect($functionInput.val()).to.equal("avg");
                    expect($aggSection.find(".arg").length).to.equal(2);
                    expect($aggSection.find(".arg").eq(0).val()).to.equal(gColPrefix + colName);
                    expect($aggSection.find(".arg").eq(1).val()).to.equal("");
                    done();
                });
            });

            it("should fail submit if no agg name provided", function() {
                var called = false;
                var cachedFn = DagEdit.store;
                DagEdit.store = function(info) {
                    called = true;
                };
                $operationsView.find(".submit").click();
                expect(called).to.be.false;
                expect($(".tooltip").last().text()).to.equal("Aggregate name must be prefixed with ^");
                DagEdit.store = cachedFn;
            });

            it("should save without errors", function() {
                var called = false;
                var cachedFn = DagEdit.store;
                DagEdit.store = function(info) {
                    called = true;
                    expect(info.args.eval.length).to.equal(1);
                    expect(info.args.eval[0].evalString).to.equal("avg(" + colName + ")");
                    expect(info.args.eval[0].newField).to.equal("");
                    expect(info.args.dest).to.equal("test");
                };

                var cachedFn2 = XcalarGetConstants;
                XcalarGetConstants = function() {
                    return PromiseHelper.reject();
                };

                $aggSection.find(".arg").eq(1).val("^test");
                $operationsView.find(".submit").click();
                expect(called).to.be.true;
                DagEdit.store = cachedFn;
                XcalarGetConstants = cachedFn2;
            });

            after(function(done) {
                OperationsView.close();
                // allow time for operations view to close
                setTimeout(function() {
                    done();
                }, 500);
            })
        });

        describe("using droppedTable", function() {

            it("dropped table should show error message", function(done) {
                DagEdit.isEditMode = cachedDFFn;
                OperationsView.show(tableId, [1], "map")
                .then(function() {
                    var tableCache = gTables[tableId];
                    delete gTables[tableId];
                    $operationsView.find(".submit").click();
                    UnitTest.hasStatusBoxWithError(ErrTStr.TableNotExists);
                    gTables[tableId] = tableCache;
                    done();
                });
            });

            it("inactive table should show error message", function() {
                gTables[tableId].status = "orphaned";
                $operationsView.find(".submit").click();
                UnitTest.hasStatusBoxWithError(TblTStr.NotActive);
                gTables[tableId].status = "active";
            });

            after(function(done) {
                OperationsView.close();
                // allow time for operations view to close
                setTimeout(function() {
                    done();
                }, 500);
            });
        });

        after(function() {
            DagEdit.isEditMode = cachedDFFn;
        });
    });

    describe("pulling column in map form", function() {
        var $mapForm;
        var colLower;

        before(function(done) {
            ColManager.hideCol([4], tableId, {noAnimate: true})
            .then(function() {
                return OperationsView.show(tableId, [1], "map");
            })
            .then(function() {
                $mapForm = $operationsView.find('.map:visible');
                colLower = (prefix + gPrefixSign + "four").toLowerCase();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("check colnames", function() {
            var colNames =  OperationsView.__testOnly__.getColNamesCache();
            expect(Object.keys(colNames).length).to.equal(11);
            expect(colNames[colLower]).to.be.undefined;
        });

        it("json modal should open", function(done) {
            $("#xcTable-" + tableId).find(".jsonElement .pop").eq(0).click();
            UnitTest.testFinish(function() {
                return $("#jsonModal").is(":visible");
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("update columns should be triggered", function(done) {
            var colNames =  OperationsView.__testOnly__.getColNamesCache();
            expect(Object.keys(colNames).length).to.equal(11);
            expect(colNames[colLower]).to.be.undefined;

            $("#jsonModal").find('.mainKey[data-key="four"]').find(".jKey")
                                                            .eq(0).click();
            UnitTest.testFinish(function() {
                var colNames =  OperationsView.__testOnly__.getColNamesCache();
                return colNames[colLower] !== undefined;
            })
            .then(function() {
                var colNames =  OperationsView.__testOnly__.getColNamesCache();
                expect(Object.keys(colNames).length).to.equal(12);
                expect(colNames[colLower]).to.not.be.undefined;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function(done) {
            OperationsView.close();
            // allow time for operations view to close
            setTimeout(function() {
                done();
            }, 500);
        });
    });

    after(function(done) {
        StatusBox.forceHide();
        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            UnitTest.offMinMode();
            done();
        });
    });
});
