describe("xcHelper Test", function() {
    it("xcHelper.parseTableId should work", function() {
        // case 1
        var id = "test-id";
        var res = xcHelper.parseTableId(id);
        expect(res).to.equal("id");

        // case 2 (normal to see the console.error)
        id = "test";
        res = xcHelper.parseTableId(id);
        expect(res).to.be.null;

        // case 3
        var $ele = $('<div id="test-id"></div>');
        res = xcHelper.parseTableId($ele);
        expect(res).to.equal("id");
        // case 4
        var ele = $('<div id="test-id"></div>').get(0);
        res = xcHelper.parseTableId(ele);
        expect(res).to.equal("id");
    });

    it("xcHelper.parseError should work", function() {
        var obj = {"test": "a"};
        expect(xcHelper.parseError(obj)).to.equal(JSON.stringify(obj));
        // case 2
        expect(xcHelper.parseError("test")).to.equal("test");
    });

    it("xcHelper.parseRowNum should work", function() {
        // case 1
        var $el = $('<div class="row1"></div>');
        var res = xcHelper.parseRowNum($el);
        expect(res).to.equal(1);
         // case 2
        var $el = $('<div class="row2 tempRow"></div>');
        var res = xcHelper.parseRowNum($el);
        expect(res).to.equal(2);
        // case 3 (normal to see the console.error)
        $el = $("<div></div>");
        res = xcHelper.parseRowNum($el);
        expect(res).to.be.null;
        // case 4
        $el = $('<div class="column1"></div>');
        res = xcHelper.parseRowNum($el);
        expect(res).to.be.null;
    });

    it("xcHelper.parseColNum should work", function() {
        // case 1
        var $el = $('<div class="col1"></div>');
        var res = xcHelper.parseColNum($el);
        expect(res).to.equal(1);
        // case 2 (normal to see the console.error)
        $el = $('<div></div>');
        res = xcHelper.parseColNum($el);
        expect(res).to.equal(null);
        // case 3
        $el = $('<div class="row1"></div>');
        res = xcHelper.parseColNum($el);
        expect(res).to.be.null;
    });

    it("xcHelper.parseJsonValue should work", function() {
        // case 1
        var res = xcHelper.parseJsonValue("test", true);
        expect(res.includes("undefined")).to.be.true;
        // case 2
        res = xcHelper.parseJsonValue(null);
        expect(res).to.equal('<span class="null">null</span>');
        // case 3
        res = xcHelper.parseJsonValue(undefined);
        expect(res).to.equal('<span class="blank">undefined</span>');
        // case 4
        res = xcHelper.parseJsonValue({});
        expect(res).to.equal('');
        // case 5
        res = xcHelper.parseJsonValue({"a": 1});
        expect(res).to.equal('{"a":1}');
        // case 6
        res = xcHelper.parseJsonValue(["a", "b"]);
        expect(res).to.equal('["a","b"]');
        // case 7
        res = xcHelper.parseJsonValue("test<>");
        expect(res).to.equal('test&lt;&gt;');
        // case 8
        res = xcHelper.parseJsonValue('{"a":{"b":"ABC, Inc."}}');
        expect(res).to.equal('{"a":{"b":"ABC, Inc."}}');
    });

    it("xcHelper.parseListDSOutput should work", function() {
        var datasets = [{
            "name": ".XcalarLRQ.test0"
        }, {
            "name": ".XcalarDS.test1"
        }];

        var res = xcHelper.parseListDSOutput(datasets);
        expect(res.length).to.equal(1);
        expect(res[0].name).to.equal("test1");
    });

    it("xcHelper.parseColType should work", function() {
        // case 1
        var res = xcHelper.parseColType(1);
        expect(res).to.equal("integer");
        // case 2
        res = xcHelper.parseColType(1.23);
        expect(res).to.equal("float");
        // case 3
        res = xcHelper.parseColType(1, "float");
        expect(res).to.equal("float");
        // case 4
        res = xcHelper.parseColType(true);
        expect(res).to.equal("boolean");
        // case 5
        res = xcHelper.parseColType("123");
        expect(res).to.equal("string");
        // case 6
        res = xcHelper.parseColType({"a": 1});
        expect(res).to.equal("object");
        // case 7
        res = xcHelper.parseColType([1, 2, 3]);
        expect(res).to.equal("array");
        // case 8
        res = xcHelper.parseColType(1, "mixed");
        expect(res).to.equal("mixed");
        // case 9
        res = xcHelper.parseColType(1, "string");
        expect(res).to.equal("mixed");
        // case 10
        res = xcHelper.parseColType(null, "string");
        expect(res).to.equal("mixed");
    });

    it("xcHelper.parseDSFormat should work", function() {
        var ds = {
            loadArgs: {
                parseArgs: {
                    parserFnName: "default:openExcel"
                }
            }
        };

        expect(xcHelper.parseDSFormat(ds)).to.equal("Excel");
        // case 2
        ds.loadArgs.parseArgs.parserFnName = "default:parseCsv";
        expect(xcHelper.parseDSFormat(ds)).to.equal("CSV");
        // case 3
        ds.loadArgs.parseArgs.parserFnName = "default:parseJson";
        expect(xcHelper.parseDSFormat(ds)).to.equal("JSON");
        // error case
        expect(xcHelper.parseDSFormat("")).to.equal("Unknown");
    });

    it("xcHelper.replaceInsideQuote should work", function() {
        expect(xcHelper.replaceInsideQuote('a"b"c', '"')).to.equal("ac");
        expect(xcHelper.replaceInsideQuote("e'd\nf'g", "'")).to.equal("eg");
    });

    it("xcHelper.fullTextRegExKey should work", function() {
        var res = xcHelper.fullTextRegExKey("test");
        expect(res).to.equal("test$");
    });

    it("xcHelper.containRegExKey should work", function() {
        var res = xcHelper.containRegExKey("test");
        expect(res).to.equal(".*test.*");
    });

    it("xcHelper.getTextWidth should work", function() {
        var res = xcHelper.getTextWidth(null, "test");
        expect(res).to.equal(72);

        // case 2
        res = xcHelper.getTextWidth(null, "testtest");
        expect(res).to.equal(96);

        // case 3
        // this don't have the 48px padding
        var $e = $("<input>");
        $e.css({
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize": "13px",
            "fontWeight": "600"
        });
        res = xcHelper.getTextWidth($e, "test");
        expect(res).to.equal(24);

        // case 4
        $e.val("test");
        res = xcHelper.getTextWidth($e);
        expect(res).to.equal(24);

        // case 5
        $e = $("<div>test</div>");
        $e.css({
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize": "13px",
            "fontWeight": "600"
        });
        res = xcHelper.getTextWidth($e);
        expect(res).to.equal(24);

        // case 6
        $e = $('<div class="truncated">' +
                '<div class="displayedData">test</div>' +
               '</div>');
        $e.find(".displayedData").css({
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize": "13px",
            "fontWeight": "600"
        });
        res = xcHelper.getTextWidth($e);
        expect(res).to.equal(24);
    });

    it("xcHelper.getFileNamePattern should work", function() {
        // case 1
        var res = xcHelper.getFileNamePattern(null);
        expect(res).to.equal("");

        // case 2
        res = xcHelper.getFileNamePattern("test", false);
        expect(res).to.equal("test");

        // case 3
        res = xcHelper.getFileNamePattern("test", true);
        expect(res).to.equal("re:test");
    });

    it("xcHelper.getJoinRenameMap should work", function() {
        var res = xcHelper.getJoinRenameMap("oldName", "newName");
        expect(res).to.be.an("object");
        expect(Object.keys(res).length).to.equal(3);
        expect(res).to.have.property("orig").and.to.equal("oldName");
        expect(res).to.have.property("new").and.to.equal("newName");
        expect(res).to.have.property("type").and
        .to.equal(DfFieldTypeT.DfUnknown);

        // case 2
        res = xcHelper.getJoinRenameMap("oldName2", "newName2", DfFieldTypeT.DfString);
        expect(res.orig).to.equal("oldName2");
        expect(res.new).to.equal("newName2");
        expect(res.type).to.equal(DfFieldTypeT.DfString);
    });

    it("xcHelper.convertColTypeToFieldType should work", function() {
        expect(xcHelper.convertColTypeToFieldType(ColumnType.string)).to.equal(DfFieldTypeT.DfString);
        expect(xcHelper.convertColTypeToFieldType(ColumnType.integer)).to.equal(DfFieldTypeT.DfInt64);
        expect(xcHelper.convertColTypeToFieldType(ColumnType.float)).to.equal(DfFieldTypeT.DfFloat64);
        expect(xcHelper.convertColTypeToFieldType(ColumnType.boolean)).to.equal(DfFieldTypeT.DfBoolean);
        expect(xcHelper.convertColTypeToFieldType(ColumnType.mixed)).to.equal(DfFieldTypeT.DfUnknown);
    });

    it("xcHelper.getFilterOptions should work", function() {
        // error case
        var res = xcHelper.getFilterOptions(null);
        expect(res).to.be.null;
        // filter case 1
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {1: true});
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("eq(test, 1)");
        // filter case 2
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {"a": true, "b": true});
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("or(eq(test, a), eq(test, b))");
        // filter case 3
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", null, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("not(exists(test))");
        // filter case 4
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {1: true}, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("or(eq(test, 1), not(exists(test)))");

        // exclude case 1
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {1: true});
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("neq(test, 1)");
        // exclude case 2
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {"a": true, "b": true});
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("and(neq(test, a), neq(test, b))");
        // exclude case 3
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", null, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("exists(test)");
        // exclude case 4
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {1: true}, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("and(neq(test, 1), exists(test))");
        // exclued case 5
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {}, false, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("not(isNull(test))");
    });

    it("xcHelper.getUserPrefix should work", function() {
        var res = xcHelper.getUserPrefix();
        expect(res).to.equal(XcUser.getCurrentUserName());
    });

    it("xcHelper.wrapDSName should work", function() {
        var res = xcHelper.wrapDSName("test");
        var nameParts = res.split(".");
        var randId = nameParts[nameParts.length - 2];
        var expected = XcUser.getCurrentUserName() + "." + randId + ".test";
        expect(res).to.equal(expected);
        expect(("" + randId).length).to.equal(5);
    });

    it("xcHelper.parseDSName should work", function() {
        // case 1
        var res = xcHelper.parseDSName("test");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal(DSTStr.UnknownUser);
        expect(res.randId).to.be.equal(DSTStr.UnknownId);
        expect(res.dsName).to.be.equal("test");
        // case 2
        res = xcHelper.parseDSName("user.test2");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal("user");
        expect(res.randId).to.be.equal(DSTStr.UnknownId);
        expect(res.dsName).to.be.equal("test2");
        // case 3
        res = xcHelper.parseDSName("user.36472.test2");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal("user");
        expect(("" + res.randId).length).to.be.equal(5);
        expect(res.dsName).to.be.equal("test2");
        // case 4
        res = xcHelper.parseDSName("user.user.36472.test2");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal("user.user");
        expect(("" + res.randId).length).to.be.equal(5);
        expect(res.dsName).to.be.equal("test2");
    });

    it("xcHelper.getUnusedTableName should work", function(done) {
        var dsName = xcHelper.randName("testName");
        xcHelper.getUnusedTableName(dsName)
        .then(function(realName) {
            expect(realName).to.equal(dsName);
            done();
        })
        .fail(function() {
            throw "Fail case!";
        });
    });

    it("xcHelper.getUnusedTableName should work in dup case", function(done) {
        var dsName = xcHelper.randName("testName");
        var oldFunc = XcalarGetTables;

        XcalarGetTables = function() {
            return PromiseHelper.resolve({
                "nodeInfo": [{"name": dsName}],
                "numNodes": 1
            });
        };

        xcHelper.getUnusedTableName(dsName)
        .then(function(realName) {
            expect(realName).not.to.equal(dsName);
            done();
        })
        .fail(function() {
            throw "Fail case!";
        })
        .always(function() {
            XcalarGetTables = oldFunc;
        });
    });

    it("xcHelper.getUniqColName should work", function() {
        // case 1
        var res = xcHelper.getUniqColName(null, null);
        expect(res.includes("NewCol")).to.be.true;
        // case 2
        res = xcHelper.getUniqColName(null, "test");
        expect(res).to.be.equal("test");
        // case 3
        var progCol = ColManager.newCol({
            "backName": "test",
            "name": "test",
            "isNewCol": false,
            "userStr": '"test" = pull(test)',
            "func": {
                "name": "pull",
                "args": ["test"]
            }
        });
        gTables["xc-Test"] = new TableMeta({
            "tableId": "xc-Test",
            "tableName": "test",
            "tableCols": [progCol]
        });

        // case 4
        res = xcHelper.getUniqColName("xc-Test", "t2");
        expect(res).to.be.equal("t2");
        // case 5
        res = xcHelper.getUniqColName("xc-Test", "test");
        expect(res).to.be.equal("test_1");
        delete gTables["xc-Test"];
    });

    it("xcHelper.extractOpAndArgs should work", function() {
        var res = xcHelper.extractOpAndArgs("eq(a, 3)", ",");
        expect(res).to.be.an("object");
        expect(res).have.property("op").and.to.equal("eq");
        expect(res).have.property("args");
        var args = res.args;
        expect(args.length).to.equal(2);
        expect(args[0]).to.equal("a");
        expect(args[1]).to.equal("3");
        // case 2
        res = xcHelper.extractOpAndArgs('eq("a,b", 3)', ',');
        args = res.args;
        expect(args.length).to.equal(2);
        expect(args[0]).to.equal("\"a,b\"");
        expect(args[1]).to.equal("3");
        // case 3
        res = xcHelper.extractOpAndArgs('eq(a\\"b, 3)', ',');
        args = res.args;
        expect(args.length).to.equal(2);
        expect(args[0]).to.equal('a\\"b');
        expect(args[1]).to.equal("3");

        res = xcHelper.extractOpAndArgs('eq(ab, ",")', ',');
        args = res.args;
        expect(args.length).to.equal(2);
        expect(args[0]).to.equal('ab');
        expect(args[1]).to.equal('","');

        res = xcHelper.extractOpAndArgs("eq(ab, ',')", ',');
        args = res.args;
        expect(args.length).to.equal(2);
        expect(args[0]).to.equal('ab');
        expect(args[1]).to.equal("','");

        res = xcHelper.extractOpAndArgs("eq(nest(ab, 5), 'hi')", ',');
        args = res.args;
        expect(args.length).to.equal(2);
        expect(args[0]).to.equal('nest(ab, 5)');
        expect(args[1]).to.equal("'hi'");
    });

    it("xcHelper.getTableKeyFromMeta should work", function() {
        var tableMeta = {
            "keyAttr": [{
                "name": "user::test",
                "valueArrayIndex": 0
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        var res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal("user::test");
        // case 2
        tableMeta = {
            "keyAttr": [{
                "name": "test",
                "valueArrayIndex": 0
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfString
            }]
        };

        res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal("test");

        // case 3
        tableMeta = {
            "keyAttr": [{
                "name": "test",
                "valueArrayIndex": -1
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfString
            }]
        };

        res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.be.null;
    });

    it("xcHelper.getTableKeyInfoFromMeta should work", function() {
        var tableMeta = {
            "keyAttr": [{
                "name": "user::test",
                "valueArrayIndex": 0,
                "ordering": 1
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        var res = xcHelper.getTableKeyInfoFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.be.an("object");
        expect(res[0].name).to.equal("user::test");
        expect(res[0].ordering).to.equal(1);

        // case 2
        tableMeta = {
            "keyAttr": [{
                "name": "test",
                "valueArrayIndex": -1
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfString
            }]
        };

        res = xcHelper.getTableKeyInfoFromMeta(tableMeta);
        expect(res.length).to.equal(0);
    });

    it("xcHelper.deepCopy should work", function() {
        var obj = {"a": 1, "b": "test"};
        var res = xcHelper.deepCopy(obj);
        expect(res).to.deep.equal(obj);

        // test it's a copy, not reference
        res.a = 2;
        expect(obj.a).to.equal(1);
    });

    // it("xcHelper.middleEllipsis should work", function() {
    //     // don't know how to test yet...
    // });
    //
    it("xcHelper.getMaxTextLen should work", function() {
        var canvas = $("<canvas></canvas>")[0];
        var ctx = canvas.getContext("2d");
        expect(xcHelper.getMaxTextLen(ctx, "hello", 100, 0, 5)).to.equal(4);
        expect(xcHelper.getMaxTextLen(ctx, "hello", 10, 0, 5)).to.be.lt(4);
    });

    it("xcHelper.mapColGenerate should work", function() {
        var progCol = ColManager.newCol({
            "backName": "test",
            "name": "test",
            "isNewCol": false,
            "userStr": '"test" = pull(test)',
            "func": {
                "name": "pull",
                "args": ["test"]
            }
        });
        // case 1
        var resCols = xcHelper.mapColGenerate(1, "mapCol", "abs(test)", [progCol]);
        expect(resCols).to.be.an("array");
        expect(resCols.length).to.equal(2);
        expect(resCols[0]).to.be.an("object");
        expect(resCols[0].name).to.equal("mapCol");
        expect(resCols[0].userStr).to.equal('"mapCol" = map(abs(test))');
        expect(resCols[1].name).to.equal("test");
        // case 2
        var options = {"replaceColumn": true};
        resCols = xcHelper.mapColGenerate(1, "mapCol", "abs(test)",
                                            [progCol], options);
        expect(resCols.length).to.equal(1);
        expect(resCols[0].name).to.equal("mapCol");
        // case 3
        options = {"replaceColumn": true, "width": 100};
        resCols = xcHelper.mapColGenerate(1, "mapCol", "abs(test)",
                                            [progCol], options);
        expect(resCols.length).to.equal(1);
        expect(resCols[0].name).to.equal("mapCol");
        // xx temp disabled
        // expect(resCols[0].width).to.equal(100);
    });

    it("xcHelper.getDefaultColWidth should work", function() {
        var testCases = [{
            "colName": "a",
            "prefix": "b",
            "width": 56
        }, {
            "colName": "a",
            "prefix": "bc",
            "width": 63
        }, {
            "colName": "bc",
            "prefix": "a",
            "width": 63
        }, {
            "colName": "a",
            "width": 130
        }, {
            "colName": "a",
            "prefix": "",
            "width": 130
        }];

        testCases.forEach(function(testCase) {
            var colName = testCase.colName;
            var prefix = testCase.prefix;
            var res = xcHelper.getDefaultColWidth(colName, prefix);
            expect(res).to.equal(testCase.width);
        });
    });

    it("xcHelper.listToEnglish should work", function() {
        var testCases = [{
            "list": ["a"],
            "expect": "a"
        }, {
            "list": ["a", "b"],
            "expect": "a and b",
        }, {
            "list": ["a", "b", "c"],
            "expect": "a, b, and c",
        }, {
            "list": [],
            "expect": ""
        }];

        testCases.forEach(function(testCase) {
            var res = xcHelper.listToEnglish(testCase.list);
            expect(res).to.equal(testCase.expect);
        });
    });

    it("xcHelper.randName should work", function() {
        // case 1
        var res = xcHelper.randName("test", 2);
        expect(res.length).to.equal(6);
        expect(res.startsWith("test")).to.be.true;
        // case 2
        res = xcHelper.randName("test");
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;
    });

    it("xcHelper.uniqueName should work", function() {
        // case 1
        var res = xcHelper.uniqueName("test");
        expect(res).to.equal("test");

        // case 2
        var validFunc = function(name) { return name !== "test"; };
        res = xcHelper.uniqueName("test", validFunc);
        expect(res).to.equal("test_1");

        // case 3
        validFunc = function(name) { return name !== "test"; };
        var nameGenFunc = function(cnt) { return "test-" + cnt; };
        res = xcHelper.uniqueName("test", validFunc, nameGenFunc);
        expect(res).to.equal("test-1");

        // case 3
        validFunc = function() { return false; };
        res = xcHelper.uniqueName("test", validFunc, null, 5);
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;
    });

    it("xcHelper.uniqueRandName should work", function() {
        // case 1
        var res = xcHelper.uniqueRandName("test");
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;
        // case 2
        var validFunc = function() { return true; };
        res = xcHelper.uniqueRandName("test", validFunc, 1);
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;

        // case 3
        validFunc = function() { return false; };
        res = xcHelper.uniqueRandName("test", validFunc);
        expect(res.length).to.equal(14);
        expect(res.startsWith("test")).to.be.true;
    });

    it("xcHelper.capitalize should work", function() {
        // case 1
        var res = xcHelper.capitalize("test");
        expect(res).to.equal("Test");
        // case 2
        res = xcHelper.capitalize();
        expect(res).to.be.undefined;
    });

    it("xcHelper.arraySubset should work", function() {
        expect(xcHelper.arraySubset([1, 2], [3, 1, 4, 2])).to.be.true;
        expect(xcHelper.arraySubset([1, 2], [3, 1, 4])).to.be.false;
    });

    it("xcHelper.arrayUnion should work", function() {
        var res = xcHelper.arrayUnion([1, 2], [1, 3, 4]);
        expect([1,2,3,4]).to.deep.equal([1, 2, 3, 4]);
    });

    it("xcHelper.getDate should work", function() {
        // case 1
        var d = new Date("01/01/2001");
        var res = xcHelper.getDate(undefined, d);
        expect(res).to.equal(d.toLocaleDateString().replace(/\//g, "-"));
        // case 2
        res = xcHelper.getDate("/", d);
        expect(res).to.equal(d.toLocaleDateString());
        // case 3
        var time = d.getTime();
        res = xcHelper.getDate("/", null, time);
        expect(res).to.equal(d.toLocaleDateString());
    });

    it("xcHelper.getTime should work", function() {
        var d = new Date("01/01/2001 12:11:00");
        var res = xcHelper.getTime(d);
        var res2 = xcHelper.getTime(null, d.getTime());
        expect(res).to.equal(res2);
        // no second case
        var res3 = xcHelper.getTime(d, null, true);
        expect(res3.split(":").length).to.equal(2);
    });

    it("xcHelper.getCurrentTimeStamp should work", function() {
        var res = xcHelper.getCurrentTimeStamp();
        var d = new Date().getTime();
        expect((res - d) < 100).to.be.true;
    });

    it("xcHelper.timeStampConvertSeconds should work", function() {
        expect(xcHelper.timeStampConvertSeconds(100000))
        .to.equal("1 day, 3 hours, 46 minutes, 40 seconds");

        expect(xcHelper.timeStampConvertSeconds(100000, true))
        .to.equal("1 day, 3 hours, 46 minutes, 40 seconds");

        expect(xcHelper.timeStampConvertSeconds(10000))
        .to.equal("0 days, 2 hours, 46 minutes, 40 seconds");

        expect(xcHelper.timeStampConvertSeconds(10000, true))
        .to.equal("2 hours, 46 minutes, 40 seconds");
    });

    it("xcHelper.downloadAsFile should work", function(done) {
        var fileName = "fileName";
        var fileContent = "test";
        var deferrd = PromiseHelper.deferred();
        function clickEvent (event) {
            event.preventDefault();
            var $a = $(event.target);
            var testName = $a.attr("download");
            var testContent = $a.attr("href");

            deferrd.resolve(testName, testContent);
        }
        $(document).on("click", "a", clickEvent);
        xcHelper.downloadAsFile(fileName, fileContent);

        deferrd.promise()
        .then(function(testName, testContent) {
            expect(testName).to.equal(fileName);
            expect(testContent).to.contain(fileContent);
            done();
        })
        .fail(function(error) {
            throw error;
        })
        .always(function() {
            $(document).off("click", clickEvent);
        });
    });

    it("xcHelper.downloadAsFile with raw data should work", function(done) {
        var fileName = "fileName";
        var fileContent = "test";
        var deferrd = PromiseHelper.deferred();
        function clickEvent (event) {
            event.preventDefault();
            var $a = $(event.target);
            var testName = $a.attr("download");
            var testContent = $a.attr("href");

            deferrd.resolve(testName, testContent);
        }
        $(document).on("click", "a", clickEvent);
        xcHelper.downloadAsFile(fileName, fileContent, true);

        deferrd.promise()
        .then(function(testName, testContent) {
            expect(testName).to.equal(fileName);
            expect(testContent).not.to.contain(fileContent);
            done();
        })
        .fail(function(error) {
            throw error;
        })
        .always(function() {
            $(document).off("click", clickEvent);
        });
    });

    it("xcHelper.sizeTranslator should work", function() {
        // case 1
        var res = xcHelper.sizeTranslator(1);
        expect(res).to.equal("1B");
        // case 2
        res = xcHelper.sizeTranslator(1024);
        expect(res).to.equal("1.00KB");
        // case 3
        res = xcHelper.sizeTranslator(10241);
        expect(res).to.equal("10.0KB");
        // case 4
        res = xcHelper.sizeTranslator(1024, false, "B");
        expect(res).to.equal("1024B");
        // case 5
        res = xcHelper.sizeTranslator(1, true);
        expect(res).to.be.an("array");
        expect(res.length).to.equal(2);
        expect(res[0]).to.equal("1");
        expect(res[1]).to.equal("B");

        // case 6 (rounding)
        res = xcHelper.sizeTranslator(25.3);
        expect(res).to.equal("25B");
    });

    it("xcHelper.textToBytesTranslator should work", function() {
        var res = xcHelper.textToBytesTranslator("1KB");
        expect(res).to.equal(1024);

        res = xcHelper.textToBytesTranslator("1.0KB");
        expect(res).to.equal(1024);
    });

    it("xcHelper.getColTypeIcon should work", function() {
        expect(xcHelper.getColTypeIcon(DfFieldTypeT.DfInt64))
        .to.equal('xi-integer');
        expect(xcHelper.getColTypeIcon(DfFieldTypeT.DfFloat64))
        .to.equal('xi-integer');
        expect(xcHelper.getColTypeIcon(DfFieldTypeT.DfString))
        .to.equal('xi-string');
        expect(xcHelper.getColTypeIcon(DfFieldTypeT.DfBoolean))
        .to.equal('xi-boolean');
        expect(xcHelper.getColTypeIcon(DfFieldTypeT.DfUnknown))
        .to.equal('xi-mixed');
    });

    it("xcHelper.showSuccess should work", function(done) {
        xcHelper.showSuccess("Hello");
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .textBox.success").text()).to
                                                                .equal("Hello");
        UnitTest.testFinish(function() {
            return !$("#successMessageWrap").is(":visible");
        })
        .then(function() {
            assert.isFalse($("#successMessageWrap").is(":visible"));
            done();
        })
        .fail(function() {
            done("failed");
        });
    });

    it("xcHelper.showSuccess should reset text", function(done) {
        xcHelper.showSuccess();
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .textBox.success").text()).to.not
                                                                .equal("Hello");
        UnitTest.testFinish(function() {
            return !$("#successMessageWrap").is(":visible");
        })
        .then(function() {
            assert.isFalse($("#successMessageWrap").is(":visible"));
            done();
        })
        .fail(function() {
            done("failed");
        });
    });

    it("xcHelper.showFail should work", function(done) {
        xcHelper.showFail("World");
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .textBox.success").text()).to.equal("World");
        setTimeout(function() {
            assert.isFalse($("#successMessageWrap").is(":visible"));
            done();
        }, 3000);
    });

    it("xcHelper.showFail should reset text", function(done) {
        xcHelper.showFail();
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .textBox.success").text()).to.not
                                                                .equal("World");
        setTimeout(function() {
            assert.isFalse($("#successMessageWrap").is(":visible"));
            done();
        }, 3000);
    });

    it("xcHelper.replaceMsg should work", function() {
        // case 1
        var res = xcHelper.replaceMsg("<foo>", {
            "foo": "bar"
        });
        expect(res).to.equal("bar");
        // case 2
        res = xcHelper.replaceMsg("<foo>");
        expect(res).to.equal("<foo>");
        // case 3
        res = xcHelper.replaceMsg("<foo>", {
            "foo": null
        });
        expect(res).to.equal("<foo>");
    });

    it("xcHelper.replaceTemplate should work", function() {
        // Global replace
        expect(
            xcHelper.replaceTemplate('<1>abc<1>', {'<1>': '2'}, false)
        ).to.equal('2abc<1>');
        // First match replace
        expect(
            xcHelper.replaceTemplate('<1>abc<1>', {'<1>': '2'}, true)
        ).to.equal('2abc2');
        // Multiple replaces
        expect(
            xcHelper.replaceTemplate('<1>a<2>a<1>a<2>', {'<1>': '-1', '<2>': '-2'}, true)
        ).to.equal('-1a-2a-1a-2');
        // Regex replace
        expect(
            xcHelper.replaceTemplate('a12b45c0', {'[0-9]': 'D'}, true)
        ).to.equal('aDDbDDcD');
        // Invalid input
        expect(
            xcHelper.replaceTemplate('<1>abc<1>', {'<1>': null}, true)
        ).to.equal('<1>abc<1>');
        expect(
            xcHelper.replaceTemplate('<1>abc<1>', {'<1>': undefined}, true)
        ).to.equal('<1>abc<1>');
    });

    it("xcHelper.toggleListGridBtn should work", function() {
        var $btn = $('<button class="gridView">' +
                        '<i class="icon"></i>' +
                     '</button>');
        var $icon = $btn.find(".icon");
        xcHelper.toggleListGridBtn($btn, true);
        expect($btn.hasClass("gridView")).to.be.false;
        expect($btn.hasClass("listView")).to.be.true;
        expect($icon.hasClass("xi-grid-view")).to.be.true;
        expect($icon.hasClass("xi-list-view")).to.be.false;

        xcHelper.toggleListGridBtn($btn, false, false);
        expect($btn.hasClass("gridView")).to.be.true;
        expect($btn.hasClass("listView")).to.be.false;
        expect($icon.hasClass("xi-grid-view")).to.be.false;
        expect($icon.hasClass("xi-list-view")).to.be.true;

        // case 2
        $btn = $('<button class="gridView icon"></button>');
        xcHelper.toggleListGridBtn($btn, true);
        expect($btn.hasClass("gridView")).to.be.false;
        expect($btn.hasClass("listView")).to.be.true;
        expect($btn.hasClass("xi-grid-view")).to.be.true;
        expect($btn.hasClass("xi-list-view")).to.be.false;

        xcHelper.toggleListGridBtn($btn, false, false);
        expect($btn.hasClass("gridView")).to.be.true;
        expect($btn.hasClass("listView")).to.be.false;
        expect($btn.hasClass("xi-grid-view")).to.be.false;
        expect($btn.hasClass("xi-list-view")).to.be.true;
    });

    it("xcHelper.showRefreshIcon should work", function(done) {
        var $location = $("<div></div>");
        xcHelper.showRefreshIcon($location);
        expect($location.find(".refreshIcon").length).to.equal(1);
        setTimeout(function() {
            expect($location.find(".refreshIcon").length).to.equal(0);
            done();
        }, 2000);
    });

    it("xcHelper.toggleBtnInProgress should work", function() {
        var $btn = $("<button>test</button>");
        xcHelper.toggleBtnInProgress($btn);
        expect($btn.hasClass("btnInProgress")).to.be.true;
        expect($btn.text()).to.equal("test...");
        expect($btn.find("icon").length).to.equal(0);
        xcHelper.toggleBtnInProgress($btn);
        expect($btn.hasClass("btnInProgress")).to.be.false;
        expect($btn.text()).to.equal("test");
        // true
        $btn = $('<button>' +
                    '<i class="icon"></i>' +
                    '<span class="text">test</span>' +
                '</button>');
        xcHelper.toggleBtnInProgress($btn, false);
        expect($btn.hasClass("btnInProgress")).to.be.true;
        expect($btn.text()).to.equal("test...");
        expect($btn.find(".icon").length).to.equal(0);
        xcHelper.toggleBtnInProgress($btn, false);
        expect($btn.hasClass("btnInProgress")).to.be.false;
        expect($btn.text()).to.equal("test");
        expect($btn.find(".icon").length).to.equal(1);
    });

    it("xcHelper.optionButtonEvent should work", function() {
        var test = null;
        var $container = $('<div>' +
                            '<button class="radioButton" data-option="test"></button>' +
                          '</div>');
        xcHelper.optionButtonEvent($container, function(option) {
            test = option;
        });
        var $radioButton = $container.find(".radioButton");
        $radioButton.click();
        expect($radioButton.hasClass("active")).to.be.true;
        expect(test).to.be.equal("test");
        // should ignore active event
        test = null;
        $radioButton.click();
        expect($radioButton.hasClass("active")).to.be.true;
        expect(test).to.be.null;
    });

    it("xcHelper.supportButton should work", function() {
        // caase 1
        var $btn = xcHelper.supportButton("log");
        expect($btn.hasClass("downloadLog")).to.be.true;
        // case 2
        $btn = xcHelper.supportButton("support");
        expect($btn.hasClass("genSub")).to.be.true;
        // case 3
        $btn = xcHelper.supportButton();
        expect($btn.hasClass("logout")).to.be.true;
    });

    it("xcHelper.validate should work", function() {
        var cacheMinMode = gMinModeOn;
        gMinModeOn = true;

        // case 1
        var $e = $("<div></div>");
        var res = xcHelper.validate({
            "$ele": $e
        });
        expect(res).to.be.false;
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.NoEmpty);

        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        // case 2
        res = xcHelper.validate({
            "$ele": $e,
            "check": function() { return false; }
        });
        expect(res).to.be.true;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 3
        res = xcHelper.validate([{
            "$ele": $e,
            "check": function() { return false; }
        },{
            "$ele": $e,
            "check": function() { return true; },
            "quite": true
        }]);
        expect(res).to.be.false;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 4
        var test = null;
        res = xcHelper.validate({
            "$ele": $e,
            "check": function() { return true; },
            "callback": function() { test = "test"; }
        });
        expect(res).to.be.false;
        expect(test).to.be.equal("test");
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.InvalidField);
        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        // case 5
        test = null;
        res = xcHelper.validate({
            "$ele": $e,
            "isAlert": true,
            "error": "test error"
        });
        expect(res).to.be.false;
        assert.isTrue($("#alertModal").is(":visible"));
        var text = $("#alertContent .text").text();
        assert.equal(text, "test error");
        $("#alertModal .close").click();
        assert.isFalse($("#alertModal").is(":visible"));

        // case 6
        test = null;
        res = xcHelper.validate({
            "$ele": $e,
            "check": function() { return true; },
            "onErr": function() { test = "test"; }
        });
        expect(res).to.be.false;
        expect(test).to.be.equal("test");
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.InvalidField);
        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        gMinModeOn = cacheMinMode;
    });

    it("xcHelper.tableNameInputChecker should work", function() {
        var $statusBox = $("#statusBox");
        var $input = $('<input type="text">');
        $("body").append($input);

        var onErrTrigger = false;
        var testCases = [{
            "val": "testTable",
            "valid": true
        }, {
            "val": "",
            "valid": false,
            "error": ErrTStr.NoEmpty
        }, {
            "val": "ab:c",
            "valid": false,
            "error": ErrTStr.InvalidTableName
        }, {
            "val": "ab#c",
            "valid": false,
            "error": ErrTStr.InvalidTableName
        }, {
            "val": new Array(300).join("a"),
            "valid": false,
            "error": ErrTStr.TooLong
        }, {
            "val": "testDupName",
            "valid": true
        }];

        testCases.forEach(function(testCase) {
            $input.val(testCase.val);
            var res = xcHelper.tableNameInputChecker($input, testCase.options);
            expect(res).to.equal(testCase.valid);

            if (!testCase.valid) {
                assert.isTrue($statusBox.is(":visible"));
                expect($statusBox.find(".message").text())
                .to.equal(testCase.error);

                if (testCase.options && testCase.options.onErr) {
                    expect(onErrTrigger).to.be.true;
                }

                StatusBox.forceHide();
            }
        });

        $input.remove();
    });

    it("xcHelper.getTableName should work", function() {
        // case 1
        var res = xcHelper.getTableName("test#hd1");
        expect(res).to.equal("test");
        // case 2
        res = xcHelper.getTableName("test");
        expect(res).to.equal("test");
    });

    it("xcHelper.getTableId should work", function() {
        // case 1
        var res = xcHelper.getTableId("test#hd1");
        expect(res).to.equal("hd1");
        // case 2
        res = xcHelper.getTableId("test");
        expect(res).to.be.null;
        // case
        res = xcHelper.getTableId();
        expect(res).to.be.null;
    });

    it("xcHelper.getBackTableSet should work", function(done) {
        xcHelper.getBackTableSet()
        .then(function(backTableSet, numBackTables) {
            expect(backTableSet).to.be.an("object");
            expect(Object.keys(backTableSet).length)
            .to.equal(numBackTables);
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    it("xcHelper.lockTable and xcHelper.unlockTable should work", function() {
        gTables["xcTest"] = new TableMeta({
            "tableId": "xcTest",
            "tableName": "test"
        });

        xcHelper.lockTable("xcTest");
        expect(gTables["xcTest"].hasLock()).to.be.true;

        xcHelper.unlockTable("xcTest");
        expect(gTables["xcTest"].hasLock()).to.be.false;

        delete gTables["xcTest"];
    });

    it("xcHelper.enableSubmit and xcHelper.disableSubmit should work", function() {
        var $button = $("<button></button>");
        xcHelper.disableSubmit($button);
        expect($button.prop("disabled")).to.be.true;

        xcHelper.enableSubmit($button);
        expect($button.prop("disabled")).to.be.false;
    });

    it("xcHelper.insertText should work", function() {
        if (isBrowserMicrosoft) {
            return;
        }
        // case 1
        var $input = $("<input>");
        xcHelper.insertText($input, "test");
        expect($input.val()).to.be.equal("");

        // case 2
        $input = $('<input type="number">');
        xcHelper.insertText($input, 5);
        expect($input.val()).to.be.equal("");

        // case 3
        $input = $('<input type="text">');
        xcHelper.insertText($input, "test");
        expect($input.val()).to.be.equal("test");

        // case 4
        $input = $('<input type="text" value="a">');
        xcHelper.insertText($input, "b");
        expect($input.val()).to.be.equal("b");

        // rest of test cases will use "append" option

        // case 5
        $input = $('<input type="text" value="a">');
        xcHelper.insertText($input, "b", true);
        expect($input.val()).to.be.equal("b, a");

        // case 6
        $input = $('<input type="text" value=", a">');
        xcHelper.insertText($input, "b", true);
        expect($input.val()).to.be.equal("b, a");

        // case 7
        $input = $('<input type="text">');
        xcHelper.insertText($input, "a", true);
        expect($input.val()).to.be.equal("a");

        // case 8
        $input = $('<input type="text" value="a">');
        // set cursor to end
        $input.focus().val("a").caret(1);
        xcHelper.insertText($input, "b", true);
        expect($input.val()).to.be.equal("a, b");

        // case 9
        $input = $('<input type="text" value="ab">');
        // set cursor to between a & b
        $input.focus().caret(1);
        xcHelper.insertText($input, "c", true);
        expect($input.val()).to.be.equal("ac, b");
    });

    it("xcHelper.getFocusedTable should work", function() {
        var $oldTitle = $(".xcTableWrap .tblTitleSelected");
        $oldTitle.removeClass("tblTitleSelected");

        expect(xcHelper.getFocusedTable()).to.equal(null);

        var $fakeTable = $('<div class="xcTableWrap" data-id="test"><div class="tblTitleSelected"></div></div>');
        $("#container").append($fakeTable);
        expect(xcHelper.getFocusedTable()).to.equal("test");

        $fakeTable.remove();
        $oldTitle.addClass("tblTitleSelected");
    });

    it("xcHelper.createNextName should work", function() {
        var res = xcHelper.createNextName("abc", "-");
        expect(res).to.equal("abc-1");
        // case 2
        res = xcHelper.createNextName("abc-1", "-");
        expect(res).to.equal("abc-2");
    });

    it("xcHelper.createNextColumnName should work", function() {
        var allNames = ["test_2_cd1", "test_cd1", "test_asdf_awet_cd1",
                        "_2djt4_cd2", "_awwet_215_cd1"];
        // case 1
        var res = xcHelper.createNextColumnName(allNames, "hello", "cd1");
        expect(res).to.equal("hello_cd1");
        // case 2
        res = xcHelper.createNextColumnName(allNames, "test", "cd1");
        expect(res).to.equal("test_3_cd1");
        // case 3
        res = xcHelper.createNextColumnName(allNames, "test_a", "cd1");
        expect(res).to.equal("test_a_cd1");
        // case 4
        res = xcHelper.createNextColumnName(allNames, "_a", "cd1");
        expect(res).to.equal("_a_cd1");
        // case 5
        res = xcHelper.createNextColumnName(allNames, "_a_1_cd1", "cd1");
        expect(res).to.equal("_a_cd1");
        // case 6
        allNames.push("_a_cd1");
        res = xcHelper.createNextColumnName(allNames, "_a_1_cd1", "cd1");
        expect(res).to.equal("_a_2_cd1");
        // case 7
        res = xcHelper.createNextColumnName(allNames, "test_483_cd1", "cd1");
        expect(res).to.equal("test_484_cd1");
        // case 8
        res = xcHelper.createNextColumnName(allNames, "test_a_cd1", "cd1");
        expect(res).to.equal("test_a_1_cd1");

    });

    it("xcHelper.checkNamePattern should work", function() {
        var testCases = [{
            "category": "dataset",
            "action": "fix",
            "name": "a(F-_&$38",
            "replace": "0",
            "expect": "a0F-_0038"
        }, {
            "category": "folder",
            "action": "fix",
            "name": "a(F-_ &$38)",
            "replace": "0",
            "expect": "a(F-_ 0038)"
        }, {
            "category": "param",
            "action": "fix",
            "name": "a(F-_ &$38)",
            "replace": "",
            "expect": "aF38"
        }, {
            "category": "prefix",
            "action": "check",
            "name": "a(F-_ &$38)",
            "expect": false
        }, {
            "category": "prefix",
            "action": "check",
            "name": "",
            "expect": false
        }, {
            "category": "prefix",
            "action": "check",
            "name": "a012345678901234567890123456789a",
            "expect": false
        }, {
            "category": "prefix",
            "action": "check",
            "name": "a01234568901234567890123456789a",
            "expect": true
        }, {
            "category": "udf",
            "action": "check",
            "name": "9ab",
            "expect": false
        }, {
            "category": "udf",
            "action": "check",
            "name": "-ab",
            "expect": false
        }, {
            "category": "udf",
            "action": "check",
            "name": "_ab9-c.",
            "expect": false
        }, {
            "category": "udf",
            "action": "check",
            "name": "_ab9-c",
            "expect": true
        }, {
            "category": "workbook",
            "action": "check",
            "name": "ab9 --c",
            "expect": true
        }, {
            "category": "workbook",
            "action": "check",
            "name": "_ab9c",
            "expect": false
        }, {
            "category": "workbook",
            "action": "check",
            "name": "ab*9c",
            "expect": false
        }, {
            "category": "target",
            "action": "check",
            "name": "ab9 --c",
            "expect": true
        }, {
            "category": "target",
            "action": "check",
            "name": "_ab9c",
            "expect": false
        }, {
            "category": "target",
            "action": "check",
            "name": "ab*9c",
            "expect": false
        },
        {
            "category": "export",
            "action": "check",
            "name": "ab*9c",
            "expect": false
        },
        {
            "category": "export",
            "action": "check",
            "name": "ab/9c",
            "expect": true
        }
    ];

        testCases.forEach(function(test) {
            var res = xcHelper.checkNamePattern(test.category, test.action,
                                                test.name, test.replace);
            expect(res).to.equal(test.expect);
        });

        function regexEqual(x, y) {
            return (x instanceof RegExp) && (y instanceof RegExp) &&
                   (x.source === y.source) && (x.global === y.global) &&
                   (x.ignoreCase === y.ignoreCase) &&
                   (x.multiline === y.multiline);
        }
        var res = xcHelper.checkNamePattern("doesNotExit", "get");
        expect(regexEqual(res, /^[a-zA-Z0-9_-]+$/)).to.be.true;
    });

    it("xcHelper.isValidTableName should work", function() {
        var res = xcHelper.isValidTableName("");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName(null);
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("a");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("ab");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("abc1");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("ab1c");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("ab#c1");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("a_b");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("a-b");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("1a");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("_a");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("-abc");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName(".abc");
        expect(res).to.be.false;
    });

    it("xcHelper.hasInvalidCharInCol should work", function() {
        var testCases = [
            {
                "str": "abc^",
                "res": true
            },
            {
                "str": "ab(c",
                "res": true
            },
            {
                "str": "ab[c",
                "res": true
            },
            {
                "str": "ab]c",
                "res": true
            },
            {
                "str": "ab:c",
                "res": true
            },
            {
                "str": "ab:c",
                "res": true
            },
            {
                "str": "ab\'c",
                "res": true
            },
            {
                "str": "ab\"c",
                "res": true
            },
            {
                "str": "abc",
                "res": false
            },
            {
                "str": "ab!c",
                "res": false
            },
            {
                "str": "ab@c",
                "res": false
            },
            {
                "str": "ab#c",
                "res": false
            },
            {
                "str": "ab$c",
                "res": false
            },
            {
                "str": "ab}c",
                "res": true
            },
            {
                "str": "ab::c",
                "options": [false, true],
                "res": true
            },
            {
                "str": "ab:c",
                "options": [false, true],
                "res": false
            },
        ];

        testCases.forEach(function(test) {
            var res = (test.options == null)
                ? xcHelper.hasInvalidCharInCol(test.str)
                : xcHelper.hasInvalidCharInCol(test.str, ...test.options);
            expect(res, JSON.stringify(test)).to.equal(test.res);
        });
    });

    it("xcHelper.isColNameStartValid should work", function() {
        expect(xcHelper.isColNameStartValid("")).to.be.false;
        expect(xcHelper.isColNameStartValid(" ")).to.be.false;
        expect(xcHelper.isColNameStartValid("1ab")).to.be.false;
        expect(xcHelper.isColNameStartValid("_ab")).to.be.true;
        expect(xcHelper.isColNameStartValid("abc")).to.be.true;
    });

    it("xcHelper.validateColName should work", function() {
        var testCases = [
            {
                "str": "",
                "res": ErrTStr.NoEmpty
            },
            {
                "str": "\t",
                "res": ErrTStr.NoEmpty
            },
            {
                "str": "a".repeat(256),
                "res": ColTStr.LongName
            },
            {
                "str": "ab[c",
                "res": ColTStr.ColNameInvalidChar
            },
            {
                "str": "DATA",
                "res": ErrTStr.PreservedName
            },
            {
                "str": "data",
                "res": null
            },
            {
                "str": "Data",
                "res": null
            },
            {
                "str": "false",
                "res":  ErrTStr.PreservedName
            },
            {
                "str": "False",
                "res":  ErrTStr.PreservedName
            },
            {
                "str": "fAlse",
                "res":  ErrTStr.PreservedName
            },
            {
                "str": "0test",
                "res": ColTStr.RenameStartInvalid
            },
            {
                "str": "$test",
                "res": ColTStr.RenameStartInvalid
            },
            {
                "str": "_test",
                "res": null
            },
            {
                "str": "-test",
                "res": ColTStr.RenameStartInvalid
            },
            {
                "str": "abc",
                "res": null
            }
        ];

        testCases.forEach(function(test) {
            var res = xcHelper.validateColName(test.str);
            expect(res).to.equal(test.res);
        });
    });

    it("xcHelper.validatePrefixName should work", function() {
        var testCases = [
            {
                "str": "1test",
                "res": ErrTStr.PrefixStartsWithLetter
            },
            {
                "str": "a".repeat(32),
                "res": ErrTStr.PrefixTooLong
            },
            {
                "str": "ab[c",
                "res": ColTStr.RenameSpecialChar
            },
            {
                "str": "ab-c",
                "res": ColTStr.RenameSpecialChar
            },
            {
                "str": "ab_c",
                "res": null
            }
        ];

        testCases.forEach(function(test) {
            var res = xcHelper.validatePrefixName(test.str);
            expect(res).to.equal(test.res);
        });
    });

    it("xcHelper.escapeDblQuoteForHtml should work", function() {
        var res = xcHelper.escapeDblQuoteForHTML('te"st\'ing"');
        expect(res).to.equal('te&quot;st\'ing&quot;');
    });

    it("xcHelper.escapeDblQuote should work", function() {
        var res = xcHelper.escapeDblQuote('te"st\'ing"');
        expect(res).to.equal('te\\"st\'ing\\"');
    });

    it('xcHelper.escapeNonPrintableChar should work', function() {
        var res = xcHelper.escapeNonPrintableChar(String.fromCharCode('feff'), '.');
        expect(res).to.equal('.');
        // case 2
        res = xcHelper.escapeNonPrintableChar('test', '.');
        expect(res).to.equal('test');
        // case 3
        res = xcHelper.escapeNonPrintableChar(null, '.');
        expect(res).to.equal(null);
    });

    it('xcHelper.escapeHTMLSpecialChar should work', function() {
        var res = xcHelper.escapeHTMLSpecialChar('&<>\tabc', false);
        expect(res).to.equal("&amp;&lt;&gt;	abc");
        // case 2
        res = xcHelper.escapeHTMLSpecialChar(null, false);
        expect(res).to.equal(null);
    });

    it("xcHelper.escapeRegExp should work", function() {
        // case 1
        var res = xcHelper.escapeRegExp("]");
        expect(res).to.equal("\\]");
        // case 2
        res = xcHelper.escapeRegExp("a");
        expect(res).to.equal("a");
    });

    it("xcHelper.escapeColName should work", function() {
        // case 1
        var res = xcHelper.escapeColName("a.b");
        expect(res).to.equal("a\\.b");
        // case 2
        res = xcHelper.escapeColName("a\\b");
        expect(res).to.equal("a\\\\b");
        // case 3
        res = xcHelper.escapeColName("a[b]");
        expect(res).to.equal("a\\[b\\]");
    });

    it("xcHelper.unescapeColName should work", function() {
        // case 1
        var res = xcHelper.unescapeColName("a\\.b");
        expect(res).to.equal("a.b");
        // case 2
        res = xcHelper.unescapeColName("a\\\\b");
        expect(res).to.equal("a\\b");
        // case 3
        res = xcHelper.unescapeColName("a\\[b\\]");
        expect(res).to.equal("a[b]");
    });

    it("xcHelper.stripColName should work", function() {
        var res = xcHelper.stripColName("votes.funny");
        expect(res).to.equal("votes_funny");

        res = xcHelper.stripColName("a[b]");
        expect(res).to.equal("a_b");

        res = xcHelper.stripColName("[b]");
        expect(res).to.equal("b");

        res = xcHelper.stripColName("a\\.b");
        expect(res).to.equal("a_b");

        res = xcHelper.stripColName("9b");
        expect(res).to.equal("_9b");

        res = xcHelper.stripColName("^b");
        expect(res).to.equal("b");

        // don't strip ::
        res = xcHelper.stripColName("a::b");
        expect(res).to.equal("a::b");

        // strip ::
        res = xcHelper.stripColName("a::b", false, true);
        expect(res).to.equal("a_b");
    });

    it("xcHelper.scrollToBottom should work", function() {
        var html = '<div id="scrollTest" style="position:fixed; top:0px; left:0px; z-index:999999; height:100px; width: 20px; overflow:hidden; overflow-y:scroll">' +
                        '<div id="scrollTest1" style="height:200px;"></div>' +
                        '<div id="scrollTest2" style="height:10px;"></div>' +
                    '</div>';
        $("body").append(html);
        var $outerDiv = $("#scrollTest");
        expect($outerDiv.scrollTop()).to.equal(0);
        expect($outerDiv.height()).to.equal(100);
        var el = document.elementFromPoint(1, 99);
        expect($(el).attr("id")).to.equal("scrollTest1");

        xcHelper.scrollToBottom($outerDiv);
        expect($outerDiv.scrollTop()).to.equal(110);
        el = document.elementFromPoint(1, 99);
        expect($(el).attr("id")).to.equal("scrollTest2");

        $("#scrollTest").remove();
    });

    it("xcHelper.disableTextSelection and xcHelper.reenableTextSelection should work", function() {
        xcHelper.disableTextSelection();
        expect($("#disableSelection").length).to.equal(1);
        xcHelper.reenableTextSelection();
        expect($("#disableSelection").length).to.equal(0);
    });

    it("xcHelper.castStrHelper should work", function() {
        // case 1
        var res = xcHelper.castStrHelper("test", "boolean");
        expect(res).to.equal("bool(test)");
        // case 2
        res = xcHelper.castStrHelper("test", "float");
        expect(res).to.equal("float(test)");
        // case 3
        res = xcHelper.castStrHelper("test", "integer");
        expect(res).to.equal("int(test, 10)");
        // case 4
        res = xcHelper.castStrHelper("test", "string");
        expect(res).to.equal("string(test)");
        // case 5
        res = xcHelper.castStrHelper("test", "test");
        expect(res).to.equal("test(test)");
    });

    it("xcHelper.isCharEscaped should work", function() {
        // case 1
        var res = xcHelper.isCharEscaped("\\.", 1);
        expect(res).to.be.true;
        res = xcHelper.isCharEscaped("\\\\.", 2);
        expect(res).to.be.false;
    });

    it("xcHelper.isStartWithLetter should work", function() {
        // case 1
        var res = xcHelper.isStartWithLetter("12a");
        expect(res).to.be.false;
        // case 2
        res = xcHelper.isStartWithLetter("abc");
        expect(res).to.be.true;
        // case 3
        res = xcHelper.isStartWithLetter(null);
        expect(res).to.be.false;
        // case 4
        res = xcHelper.isStartWithLetter("");
        expect(res).to.be.false;
    });

    it("xcHelper.deepCompare should work", function() {
        // case 1
        var a = {"a": {"b": 1}};
        var b = {"a": {"b": 1}};
        var res = xcHelper.deepCompare(a, b);
        expect(res).to.be.true;
        // case 2
        a = {"a": 1};
        b = {"a": 2};
        res = xcHelper.deepCompare(a, b);
        expect(res).to.be.false;
        // case 3
        res = xcHelper.deepCompare("a", "a");
        expect(res).to.be.true;
        // case 4
        res = xcHelper.deepCompare("a", "b");
        expect(res).to.be.false;
        // case 5
        res = xcHelper.deepCompare(1, "b");
        expect(res).to.be.false;
        // case 6
        res = xcHelper.deepCompare(1, 1);
        expect(res).to.be.true;
        // case 7
        res = xcHelper.deepCompare(1, 2);
        expect(res).to.be.false;
        // case 8
        res = xcHelper.deepCompare(NaN, NaN);
        expect(res).to.be.true;
        // case 9
        res = xcHelper.deepCompare([1,2,3], [1, 2, 3]);
        expect(res).to.be.true;
        // case 10
        res = xcHelper.deepCompare([1,2,3], [3, 2, 1]);
        expect(res).to.be.false;
        // case 11
        a = {"a": "b", "b": {"b": 1}};
        b = {"a": "b", "b": {"b": 2}};
        res = xcHelper.deepCompare(a, b);
        expect(res).to.be.false;
        // case 12
        res = xcHelper.deepCompare(1);
        expect(res).to.be.true;
        // case 13
        a = {"a": 1};
        b = {"a": 1};
        a["b"] = a;
        b["b"] = a;
        res = xcHelper.deepCompare(1);
        expect(res).to.be.true;
    });

    it("xcHelper.delimiterTranslate should work", function() {
        // case 1
        var $input = $('<input class="nullVal">');
        var res = xcHelper.delimiterTranslate($input);
        expect(res).to.equal("");

        // case 2
        $input = $("<input>").val('"');
        res = xcHelper.delimiterTranslate($input);
        expect(res).to.equal('"');

        // case 3
        $input = $("<input>").val("\\t");
        res = xcHelper.delimiterTranslate($input);
        expect(res).to.equal("\t");
    });

    it("xcHelper.checkMatchingBrackets should work", function() {
        // case 1
        var res = xcHelper.checkMatchingBrackets("(test)").index;
        expect(res).to.equal(-1);
        // case 2
        res = xcHelper.checkMatchingBrackets("test)").index;
        expect(res).to.equal(4);
        // case 3
        res = xcHelper.checkMatchingBrackets("(test").index;
        expect(res).to.equal(0);
        // case 4
        res = xcHelper.checkMatchingBrackets("(())").index;
        expect(res).to.equal(-1);
        // case 5
        res = xcHelper.checkMatchingBrackets('("(")').index;
        expect(res).to.equal(-1);
        // case 6
        res = xcHelper.checkMatchingBrackets('(\\")').index;
        expect(res).to.equal(-1);
        // case 7
        res = xcHelper.checkMatchingBrackets('("\\"(")').index;
        expect(res).to.equal(-1);
        // case 8
        res = xcHelper.checkMatchingBrackets('("(,\'")').index;
        expect(res).to.equal(-1);
         // case 9
        res = xcHelper.checkMatchingBrackets('(\'(,"\')').index;
        expect(res).to.equal(-1);
        // case 11
        res = xcHelper.checkMatchingBrackets('(\'(,")').index;
        expect(res).to.equal(0);
        // case 12
        res = xcHelper.checkMatchingBrackets('("(,\')').index;
        expect(res).to.equal(0);
        // case 13 - testing nested quotes (xa\xaa\xax)
        res = xcHelper.checkMatchingBrackets('("\'(\\"\'(\'\\"\'")').index;
        expect(res).to.equal(-1);
    });

    it("xcHelper.camelCaseToRegular should work", function() {
        var func = xcHelper.camelCaseToRegular;
        expect(func("a")).to.equal("A");
        expect(func("aB")).to.equal("A B");
        expect(func("ab")).to.equal("Ab");
        expect(func("AB")).to.equal("A B");
        expect(func("Ab")).to.equal("Ab");
        expect(func("AaBbC")).to.equal("Aa Bb C");
    });

    it("xcHelper.removeNonQuotedSpaces should work", function() {
        var res = xcHelper.removeNonQuotedSpaces('map(concat  ("a   ", "b"))');
        expect(res).to.equal('map(concat("a   ","b"))');

        res = xcHelper.removeNonQuotedSpaces('map(concat  ("a \\"  ", "b"))');
        expect(res).to.equal('map(concat("a \\"  ","b"))');

        res = xcHelper.removeNonQuotedSpaces('map(concat  (\'a  \', "b"))');
        expect(res).to.equal('map(concat(\'a  \',"b"))');
    });

    it("xcHelper.getFormat should work", function() {
        var getFormat = xcHelper.getFormat;
        expect(getFormat("a")).to.be.null;
        expect(getFormat(34)).to.be.null; // 6311
        expect(getFormat("a.json")).to.equal("JSON");
        expect(getFormat("b.csv")).to.equal("CSV");
        expect(getFormat("c.tsv")).to.equal("CSV");
        expect(getFormat("d.xlsx")).to.equal("Excel");
        expect(getFormat("e.txt")).to.equal("TEXT");
        expect(getFormat("f.test")).to.be.null;
    });

    it("xcHelper.hasSelection should work", function() {
        xcHelper.removeSelectionRange();
        expect(xcHelper.hasSelection()).to.be.false;
        var $input = $("<input style='position:fixed; top: 0px; left:0px; z-index:99999;'>");
        $("body").append($input);
        $input.val(123);
        $input.focus().range(0,2);
        expect(xcHelper.hasSelection()).to.be.true;
        xcHelper.removeSelectionRange();
        expect(xcHelper.hasSelection()).to.be.false;
        $input.remove();
    });

    it("xcHelper.convertToHtmlEntity should work", function() {
        var terribleString = "<&boo>";
        var convertHtml = xcHelper.convertToHtmlEntity;
        expect(convertHtml(terribleString)).to.equal("&#60;&#38;boo&#62;");
    });

    it("xcHelper.autoName should work", function() {
        // case 1
        var res = xcHelper.autoName("test", {});
        expect(res).to.equal("test");

        // case 2
        res = xcHelper.autoName("test", {"test": true});
        expect(res).to.equal("test1");

        // case 3
        res = xcHelper.autoName("test", {"test": true}, 0);
        // should be test + 5digits
        expect(res.length).to.equal(9);
    });

    it("xcHelper.sortVals should work", function() {
        var func = xcHelper.sortVals;
        var asc = ColumnSortOrder.ascending;
        var desc = ColumnSortOrder.descending;
        // to.equal(1) if order is 1 and arg1 < arg2
        // to.equal(-1) if order is 1 and arg1 > arg2
        expect(func("a", "a")).to.equal(0);
        expect(func("a", "b")).to.equal(-1);
        expect(func("a", "b", desc)).to.equal(1);
        expect(func("b", "a", desc)).to.equal(-1);
        expect(func("a", "b", asc)).to.equal(-1);
        expect(func("b", "a", asc)).to.equal(1);

        expect(func("a6", "a50", desc)).to.equal(1);
        expect(func("a60", "a50", desc)).to.equal(-1);

        expect(func("a6z", "a50z", desc)).to.equal(-1);
        expect(func("a6z5", "a50z3", desc)).to.equal(-1);

        expect(func("a6z5", "a6z3", desc)).to.equal(-1);
        expect(func("a6z3", "a6z5", desc)).to.equal(1);


        expect(func("a6z3", "a6z5", desc)).to.equal(1);
        expect(func("a7z3", "a6z5", desc)).to.equal(-1);
    });

    it("xcHelper.sortHTML should work", function() {
        var a = '<div>a</div>';
        var b = '<div>b</div>';
        expect(xcHelper.sortHTML(a, b)).to.equal(-1);
        expect(xcHelper.sortHTML(b, a)).to.equal(1);

        // XXX case 2, it's actually weird
        a = '<div>c</div>';
        b = '<div>c</div>';
        expect(xcHelper.sortHTML(a, b)).to.equal(-1);
    });

    it("xcHelper.parseQuery should work", function() {
        var firstPart = 'map --eval "concat(\\"1\\", \\"2\\")" --srctable "A#Vi5" ' +
                        '--fieldName "B" --dsttable "A#Vi25";';
        var secondPart = 'index --key "col1" --dataset ".XcalarDS.a.b" ' +
                        '--dsttable "b#Vi26" --prefix;';
        var thirdPart = 'join --leftTable "c.index#Vi35" --rightTable ' +
                        '"d.index#Vi36" --joinType innerJoin ' +
                        '--joinTable "a#Vi34";';
        var fourthPart = 'load --name "f264.schedule" ' +
                         '--targetName "Default Shared Root" ' +
                         '--path "/schedule/" ' +
                         '--apply "default:parseJson" --parseArgs "{}" ' +
                         '--size 0B;';
        var fifthPart = '   '; // blank

        var query =  firstPart + secondPart + thirdPart + fourthPart + fifthPart;

        var parsedQuery = xcHelper.parseQuery(query);
        expect(parsedQuery).to.be.an("array");
        expect(parsedQuery).to.have.lengthOf(4); // should exclude the blank

        expect(parsedQuery[0].name).to.equal("map");
        expect(parsedQuery[1].name).to.equal("index");
        expect(parsedQuery[2].name).to.equal("join");
        expect(parsedQuery[3].name).to.equal("load");

        expect(parsedQuery[0].dstTable).to.equal("A#Vi25");
        expect(parsedQuery[1].dstTable).to.equal("b#Vi26");
        expect(parsedQuery[2].dstTable).to.equal("a#Vi34");
        expect(parsedQuery[3].dstTable).to.equal(gDSPrefix + "f264.schedule");

        expect(parsedQuery[0].query).to.equal(firstPart.slice(0,-1));
        expect(parsedQuery[1].query).to.equal(secondPart.slice(0,-1));
        expect(parsedQuery[2].query).to.equal(thirdPart.slice(0,-1));
        expect(parsedQuery[3].query).to.equal(fourthPart.slice(0,-1));

        // export
        var sixthPart = 'export --targetType file --tableName A#dl4 ' +
                        '--targetName Default --exportName B#dl5 ' +
                        '--createRule --columnsNames class_id;time; ' +
                        '--headerColumnsNames class_id;time; --format csv ' +
                        '--fileName C.csv  --fieldDelim   --recordDelim b ' +
                        '--quoteDelim';

        parsedQuery = xcHelper.parseQuery(sixthPart);
        expect(parsedQuery).to.be.an("array");
        expect(parsedQuery).to.have.lengthOf(1);

        expect(parsedQuery[0].name).to.equal("export");
        expect(parsedQuery[0].dstTable).to.equal("B#dl5");
        expect(parsedQuery[0].exportFileName).to.equal("C.csv");
        expect(parsedQuery[0].query).to.equal(sixthPart);
    });

    it("xcHelper.convertFrontColNamesToBack should work", function() {

        // undefined type
        var progCol1 = ColManager.newCol({
            "backName": "test",
            "name": "undfCol",
            "isNewCol": false,
            "userStr": '"test" = pull(test)',
            "func": {
                "name": "pull",
                "args": ["test"]
            }
        });
        // string type
        var progCol2 = ColManager.newCol({
            "backName": "test2",
            "name": "stringCol",
            "isNewCol": false,
            "userStr": '"test2" = pull(test2)',
            "func": {
                "name": "pull",
                "args": ["test2"]
            },
            type: "string"
        });
        // number type
        var progCol3 = ColManager.newCol({
            "backName": "test3",
            "name": "numCol",
            "isNewCol": false,
            "userStr": '"test3" = pull(test3)',
            "func": {
                "name": "pull",
                "args": ["test3"]
            },
            type: "number"
        });

        gTables["xc-Test"] = new TableMeta({
            "tableId": "xc-Test",
            "tableName": "test",
            "tableCols": [progCol1, progCol2, progCol3]
        });

        // case 1 - pass
        var res = xcHelper.convertFrontColNamesToBack(
                                ["stringCol", "numCol"],
                                "xc-Test",
                                ["string", "number"]);
        expect(res).to.be.an("array");
        expect(res).to.deep.equal(["test2", "test3"]);

        // case 2 - pass
        res = xcHelper.convertFrontColNamesToBack(
                                ["numCol", "stringCol"],
                                "xc-Test",
                                ["string", "number"]);
        expect(res).to.be.an("array");
        expect(res).to.deep.equal(["test3", "test2"]);

        // case 3 - pass
        res = xcHelper.convertFrontColNamesToBack(
                                ["undfCol", "stringCol"],
                                "xc-Test",
                                ["string", "undefined"]);
        expect(res).to.be.an("array");
        expect(res).to.deep.equal(["test", "test2"]);

        // case 4 - pass
        res = xcHelper.convertFrontColNamesToBack(
                                ["undfCol", "stringCol", "undfCol", "undfCol"],
                                "xc-Test",
                                ["string", "undefined"]);
        expect(res).to.be.an("array");
        expect(res).to.deep.equal(["test", "test2", "test", "test"]);

        // case 5 - column doesn't exist
        res = xcHelper.convertFrontColNamesToBack(
                                ["fakeCol", "stringCol"],
                                "xc-Test",
                                ["string", "undefined"]);
        expect(res).to.be.an("object");
        expect(res).to.deep.equal({
            invalid: true,
            reason: "notFound",
            name: "fakeCol",
            type: "notFound"
        });

        // case 6 - invalid column type
        res = xcHelper.convertFrontColNamesToBack(
                                ["undfCol", "stringCol"],
                                "xc-Test",
                                ["string"]);
        expect(res).to.be.an("object");
        expect(res).to.deep.equal({
            invalid: true,
            reason: "type",
            name: "undfCol",
            type: "undefined"
        });

        // case 7 - invalid table
        res = xcHelper.convertFrontColNamesToBack(
                                ["undfCol", "stringCol"],
                                "noTable",
                                ["string"]);
        expect(res).to.be.an("object");
        expect(res).to.deep.equal({
            invalid: true,
            reason: "tableNotFound",
            name: "undfCol",
            type: "tableNotFound"
        });

        delete gTables["xc-Test"];
    });

    it("xcHelper.getUDFList should work", function(done) {
        UDFFileManager.Instance.list()
        .then(function(ret) {
            expect(ret).to.be.an("object");
            expect(ret).to.have.all.keys("numXdfs", "fnDescs");

            var udfObj = xcHelper.getUDFList(ret);

            expect(udfObj).to.be.an("object");
            expect(udfObj).to.have.all.keys("moduleLis", "fnLis");

            var $moduleLis = $(udfObj.moduleLis);
            var $fnLis = $(udfObj.fnLis);

            expect($moduleLis.length).to.be.gt(1);
            expect($fnLis.length).to.be.gt(5);
            expect($fnLis.length).to.be.gte($moduleLis.length);
            $fnLis.each(function() {
                var $li = $(this);
                var module = $li.data("module");
                var $moduleLi = $moduleLis.filter(function() {
                    return $(this).data("module") === module;
                });
                expect($moduleLi.length).to.equal(1);
            });
            done();
        });
    });

    // difficult to test this without rewriting the entire function in here...
    it("xcHelper.repositionModalOnWinResize should work", function () {
        var $modal = $('<div id="unitTestModal" style="' +
                        'width:50px;height:50px;position:absolute;"></div>');
        $("#container").prepend($modal);
        var left = 50;
        var top = 50;
        $modal.css({"top": top, "left": left});
        var modalSpecs = {$modal: $modal, top: top, left: left};
        var windowSpecs = {winWidth: 200, winHeight: 200};
        // assuming prev win dimensions were 200 x 200, the modal would be 25%
        // from the top and 25% from the left

        var curWinHeight = $(window).height();
        var curWinWidth = $(window).width();

        xcHelper.repositionModalOnWinResize(modalSpecs, windowSpecs);

        if (curWinWidth > windowSpecs.winWidth) {
            expect($modal.css("left")).to.be.gt(curWinWidth * .25);
            expect($modal.css("left")).to.be.lt(curWinWidth * .50);
        } else if (curWinWidth < windowSpecs.winWidth) {
            expect($modal.css("left")).to.be.lt(curWinWidth * .25);
        }
        if (curWinHeight > windowSpecs.winHeight) {
            expect($modal.css("top")).to.be.gt(curWinHeight * .25);
            expect($modal.css("top")).to.be.lt(curWinHeight * .50);
        } else if (curWinHeight < windowSpecs.winHeight) {
            expect($modal.css("top")).to.be.lt(curWinHeight * .25);
        }

        $modal.height(10000);
        $modal.width(10000);
        $modal.css({"top": top, "left": left});

        xcHelper.repositionModalOnWinResize(modalSpecs, windowSpecs);
        expect($modal.css("top")).to.equal("0px");
        expect($modal.css("left")).to.equal(curWinWidth - 10000 + "px");

        $modal.remove();
    });

    it("xcHelper.numToStr should work", function() {
        expect(xcHelper.numToStr(5)).to.equal("5");
        expect(xcHelper.numToStr(1234)).to.equal("1,234");
        expect(xcHelper.numToStr("1234")).to.equal("1,234");
        expect(xcHelper.numToStr(1.12345)).to.equal("1.123");
        expect(xcHelper.numToStr(1.12345, 5)).to.equal("1.12345");
        expect(xcHelper.numToStr(0.001, 2)).to.equal("1e-3");
        expect(xcHelper.numToStr(-0.001, 2)).to.equal("-1e-3");
        expect(xcHelper.numToStr(0, 2)).to.equal("0");
        expect(xcHelper.numToStr(null)).to.equal(null);
        expect(xcHelper.numToStr(undefined)).to.equal(undefined);
        expect(xcHelper.numToStr("not a num")).to.equal("not a num");
    });

    it("xcHelper.fillInputFromCell should work", function() {
        // case 1
        var $header = $('<div class="header">' +
                        '<div class="test">' +
                            '<input class="editableHead" value="test">' +
                        '</div>' +
                    '</div>');

        var $input = $('<input class="argument" type="text">');
        $("body").append($input);
        xcHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal(gColPrefix + "test");

        // case 2
        var $table = $('<table>' +
                        '<td class="col1">' +
                            '<div class="test">' +
                                '<input class="editableHead col1" value="t2">' +
                            '</div>' +
                        '</td>' +
                    '</table>');

        xcHelper.fillInputFromCell($table.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal(gColPrefix + "t2");
        $input.remove();
        // case 3
        $input = $("<input>");
        $("body").append($input);
        xcHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        $input.remove();
        // case 4
        $input = $('<input class="argument">');
        $("body").append($input);
        xcHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        $input.remove();
        // case 5
        var $container = $('<div class="colNameSection">' +
                    '<input class="argument" type="text">' +
                    '</div>');
        $input = $container.find("input");
        $("body").append($container);
        xcHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        $container.remove();
    });

    it("xcHelper.hasValidColPrefix should work", function() {
        var func = xcHelper.hasValidColPrefix;
        expect(func(gColPrefix)).to.equal(false);
        expect(func('\\' + gColPrefix)).to.equal(false);
        expect(func('\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func('a\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(',a\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix+ 'blah,   \\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, a' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, \\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + '\\' + gColPrefix + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'bl,ah')).to.equal(false);

        expect(func(gColPrefix + 'blah blah')).to.equal(true); // allow column names with spaces
        expect(func(gColPrefix + 'blah' + gColPrefix + 'blah')).to.equal(true); // allow column name to have $ in middle of name
        expect(func(gColPrefix + 'a')).to.equal(true);
        expect(func(gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah,   ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + '\\' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'bl\\,ah, ' + gColPrefix + 'blah')).to.equal(true);

    });

    it("xcHelper.getPrefixColName should work", function() {
        // case 1
        var res = xcHelper.getPrefixColName(null, "test");
        expect(res).to.equal("test");
        // case 2
        res = xcHelper.getPrefixColName("", "test");
        expect(res).to.equal("test");
        // case 3
        res = xcHelper.getPrefixColName("prefix", "test");
        expect(res).to.equal("prefix::test");
    });

    it("xcHelper.parsePrefixColName should work", function() {
        // case 1
        var res = xcHelper.parsePrefixColName("test");
        expect(res).to.be.an("object");
        expect(res).to.have.property("prefix").to.equal("");
        expect(res).to.have.property("name").to.equal("test");

        // case 2
        res = xcHelper.parsePrefixColName("prefix::test");

        expect(res.prefix).to.equal("prefix");
        expect(res.name).to.equal("test");
    });

    it("xcHelper.stripPrefixInColName should work", function() {
        // case 1
        var res = xcHelper.stripPrefixInColName("a::b");
        expect(res).to.equal("a-b");
        // case 2
        res = xcHelper.stripPrefixInColName("ab");
        expect(res).to.equal("ab");
    });

    it("xcHelper.convertPrefixName should work", function() {
        // case 1
        var res = xcHelper.convertPrefixName("a", "b");
        expect(res).to.equal("a-b");
    });

    it("xcHelper.normalizePrefix should work", function() {
        // case 1
        var res = xcHelper.normalizePrefix("abc");
        expect(res).to.equal("abc");
        // case 2
        res = xcHelper.normalizePrefix(new Array(32).join("a"));
        expect(res.length).to.equal(gPrefixLimit);
        // case 3
        res = xcHelper.normalizePrefix("a:b");
        expect(res).to.equal("a_b");
        // case 4
        res = xcHelper.normalizePrefix("a-b");
        expect(res).to.equal("a_b");
    });

    it("xcHelper.stripCSVExt should work", function() {
        expect(xcHelper.stripCSVExt("a.csv")).to.equal("a");
        expect(xcHelper.stripCSVExt("b.json")).to.equal("b.json");
    });

    it("xcHelper.parseUserStr should work", function() {
        var res = xcHelper.parseUserStr('"test" = someFunc ');
        expect(res).to.equal("someFunc");

        res = xcHelper.parseUserStr('"te=st" = someFunc');
        expect(res).to.equal("someFunc");

        res = xcHelper.parseUserStr('"te\\"st" = someFunc');
        expect(res).to.equal("someFunc");

        res = xcHelper.parseUserStr('"test" =someFunc');
        expect(res).to.equal("someFunc");
    });

    it("xcHelper.getColNameMap should work", function() {
        var progCol1 = ColManager.newCol({
            "backName": "Test",
            "name": "undfCol",
            "isNewCol": false
        });

        var progCol2 = ColManager.newCol({
            "backName": "test2",
            "name": "stringCol",
            "isNewCol": false
        });

        var progCol3 = ColManager.newCol({
            "backName": "",
            "name": "",
            "isNewCol": false
        });

        var progCol4 = ColManager.newDATACol();

        gTables["xc-Test"] = new TableMeta({
            "tableId": "xc-Test",
            "tableName": "test",
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });

        var colNameMap = xcHelper.getColNameMap("xc-Test");
        expect(Object.keys(colNameMap).length).to.equal(2);
        expect(colNameMap["test"]).to.equal("Test");
        expect(colNameMap["test2"]).to.equal("test2");

        delete gTables["xc-Test"];
    });

    it("xcHelper.getColNameList should work", function() {
        var progCol1 = ColManager.newCol({
            "backName": "Test",
            "name": "undfCol",
            "isNewCol": false
        });

        var progCol2 = ColManager.newCol({
            "backName": "test2",
            "name": "stringCol",
            "isNewCol": false
        });

        var progCol3 = ColManager.newCol({
            "backName": "",
            "name": "",
            "isNewCol": false
        });

        var progCol4 = ColManager.newDATACol();

        gTables["xc-Test"] = new TableMeta({
            "tableId": "xc-Test",
            "tableName": "test",
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });

        var colNameList = xcHelper.getColNameList("xc-Test");
        expect(colNameList.length).to.equal(2);
        expect(colNameList[0]).to.equal("Test");
        expect(colNameList[1]).to.equal("test2");

        delete gTables["xc-Test"];
    });

    it("xcHelper.disableMenuItem should work", function() {
        var $li = $('<li></li>');
        xcHelper.disableMenuItem($li);
        expect($li.hasClass('unavailable')).to.be.true;
    });

    it("xcHelper.enableMenuItem should work", function() {
        var $li = $('<li class="unavailable"></li>');
        xcHelper.enableMenuItem($li);
        expect($li.hasClass('unavailable')).to.be.false;
    });

    it("xcHelper.getPromiseWhenError should work", function() {
        // case 1
        var args = [{"error": "test1"}, "test"];
        var res = xcHelper.getPromiseWhenError(args);
        expect(res.error).to.equal("test1");

        // case 2
        args = ["test", {"error": "test2"}];
        res = xcHelper.getPromiseWhenError(args);
        expect(res.error).to.equal("test2");

        // case 3
        args = ["test", "test"];
        res = xcHelper.getPromiseWhenError(args);
        expect(res).to.be.null;
    });

    it("xcHelper.addAggInputEvents should work", function() {
        var $input = $('<input val="">');
        $('body').append($input);

        xcHelper.addAggInputEvents($input);
        // XXX FIXME: when window defocus this test will fail
        // $input.focus();
        // expect($input.val()).to.equal(gAggVarPrefix);
        $input.blur();
        expect($input.val()).to.equal("");
        $input.val("^abc").trigger(fakeEvent.enterKeydown);
        expect($input.val()).to.equal("^abc");
        $input.val("test").trigger(fakeEvent.input);
        expect($input.val()).to.equal("^test");

        $input.remove();
    });

    describe("xcHelper.getKeyInfos", function() {
        it("xcHelper.getKeyInfos on regular table should work", function(done) {
            var table = new TableMeta({
                "tableId": "fakeId",
                "tableName": "test#fakeId"
            });
            table.backTableMeta = {
                valueAttrs: [{
                    name: "prefix",
                    type: DfFieldTypeT.DfFatptr
                }, {
                    name: "col",
                    type: DfFieldTypeT.DfString
                }, {
                    name: "test",
                    type: DfFieldTypeT.DfFloat64
                }, {
                    name: "prefix-test",
                    type: DfFieldTypeT.DfFloat64
                }]
            };
            gTables["fakeId"] = table;

            var keys = [{
                name: "col",
                ordering: 0
            }, {
                name: "prefix::a",
                ordering: 0,
            }, {
                name: "prefix::col",
                ordering: 0,
            }, {
                name: "prefix::test",
                ordering: 0
            }];

            var expectedArray = [{
                name: "col",
                type: DfFieldTypeT.DfString,
                keyFieldName: "col",
                ordering: 0
            }, {
                name: "prefix::a",
                type: DfFieldTypeT.DfUnknown,
                keyFieldName: "a",
                ordering: 0
            }, {
                name: "prefix::col",
                type: DfFieldTypeT.DfUnknown,
                keyFieldName: "prefix-col",
                ordering: 0
            }];

            xcHelper.getKeyInfos(keys, "test#fakeId")
            .then(function(keyArray) {
                expect(keyArray).to.be.an("array");
                expect(keyArray.length).to.equal(4);

                expectedArray.forEach(function(expected, index) {
                    var keyRes = keyArray[index];
                    expect(keyRes.name).to.equal(expected.name);
                    expect(keyRes.type).to.equal(expected.type);
                    expect(keyRes.keyFieldName).to.equal(expected.keyFieldName);
                });

                var specialRes = keyArray[3];
                expect(specialRes.keyFieldName).not.to.equal("prefix-test");
                expect(specialRes.keyFieldName).to.contains("prefix-test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                delete gTables["fakeId"];
            });
        });

        it("xcHelper.getKeyInfos on missing table meta should work", function(done) {
            var oldFunc = XcalarGetTableMeta;
            XcalarGetTableMeta = function() {
                return PromiseHelper.resolve({
                    valueAttrs: [{
                        name: "col",
                        type: DfFieldTypeT.DfString
                    }]
                });
            };

            xcHelper.getKeyInfos([{name: "col", ordering: 3}], "test#fakeId")
            .then(function(res) {
                expect(res.length).to.equal(1);
                expect(res[0].type).to.equal(DfFieldTypeT.DfString);
                expect(res[0].keyFieldName).to.equal("col");
                expect(res[0].ordering).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarGetTableMeta = oldFunc;
            });
        });

        it("xcHelper.getKeyInfos on missing table meta should work case2", function(done) {
            var oldFunc = XcalarGetTableMeta;
            XcalarGetTableMeta = function() {
                return PromiseHelper.reject();
            };

            xcHelper.getKeyInfos([{name: "col", ordering: 5}], "test#fakeId")
            .then(function(res) {
                expect(res.length).to.equal(1);
                expect(res[0].type).to.equal(DfFieldTypeT.DfUnknown);
                expect(res[0].keyFieldName).to.equal("col");
                expect(res[0].ordering).to.equal(5);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarGetTableMeta = oldFunc;
            });
        });
    });

    it("xcHelper.formatAsUrl should work", function() {
        var res = xcHelper.formatAsUrl({"a": 1, "b": "c"});
        expect(res).to.equal("?a=1&b=c");
    });

    describe('xcHelper.getElapsedTimeStr())', function() {
        it("xcHelper.getElapsedTimeStr should work", function() {
            var func = xcHelper.getElapsedTimeStr;
            expect(func(999)).to.equal('999ms');
            expect(func(1000)).to.equal('1.00s');
            expect(func(1999)).to.equal('1.99s');
            expect(func(1099)).to.equal('1.09s');
            expect(func(19999)).to.equal('19.9s');
            expect(func(69000)).to.equal('1m 9s');
            expect(func(699900)).to.equal('11m 39s');
            expect(func(5000000)).to.equal('1h 23m 20s');
            expect(func(105000000)).to.equal('29h 10m 0s');
        });
    });

    describe("xcHelper.stringifyFunc()", function() {
        var func;
        before(function() {
            func = xcHelper.stringifyFunc;
        })
        it("should work if no args", function() {
            var fn = {name: "a", args:[]};
            expect(func(fn)).to.equal('a()');

            fn = {name: "a", args:[{name: "b", args: []}]};
            expect(func(fn)).to.equal('a(b())');

            fn = {name: "a", args:[1, {name: "b", args: []}]};
            expect(func(fn)).to.equal('a(1,b())');
        });
        it("nested should work", function() {
            var fn = {name:"a", args:[1, 2, 3]};
            expect(func(fn)).to.equal('a(1,2,3)');

            var fn = {name:"a", args:[1, {name:"b", args:[4, 5, 6]}, 3]};
            expect(func(fn)).to.equal('a(1,b(4,5,6),3)');

            var fn = {name:"a", args:[{name:"b", args:[2, 3, 4]}, 1]};
            expect(func(fn)).to.equal('a(b(2,3,4),1)');

            var fn = {name:"a", args:[{name:"b", args:[2, {name:"c", args:[3, 4]}]}, 1]};
            expect(func(fn)).to.equal('a(b(2,c(3,4)),1)');
        });
    });

    describe("xcHelper.stringifyEval()", function() {
        var func;
        before(function() {
            func = xcHelper.stringifyEval;
        })
        it("should work if no args", function() {
            var fn = {fnName: "a", args:[]};
            expect(func(fn)).to.equal('a()');

            fn = {fnName: "a", args:[{fnName: "b", args: []}]};
            expect(func(fn)).to.equal('a(b())');

            fn = {fnName: "a", args:[1, {fnName: "b", args: []}]};
            expect(func(fn)).to.equal('a(1,b())');
        });
        it("nested should work", function() {
            var fn = {fnName:"a", args:[1, 2, 3]};
            expect(func(fn)).to.equal('a(1,2,3)');

            var fn = {fnName:"a", args:["1", '2', '"3"']};
            expect(func(fn)).to.equal('a(1,2,"3")');

            var fn = {fnName:"a", args:[1, {fnName:"b", args:[4, 5, 6]}, 3]};
            expect(func(fn)).to.equal('a(1,b(4,5,6),3)');

            var fn = {fnName:"a", args:[{fnName:"b", args:[2, 3, 4]}, 1]};
            expect(func(fn)).to.equal('a(b(2,3,4),1)');

            var fn = {fnName:"a", args:[{fnName:"b", args:[2, {fnName:"c", args:[3, 4]}]}, 1]};
            expect(func(fn)).to.equal('a(b(2,c(3,4)),1)');
        });
    });

    describe("xcHelper.getNamesFromFunc", function() {
        var fn, args;
        it ("quotes should be detected", function() {
            fn = xcHelper.getNamesFromFunc;
            args = {args: ["one", "two"]};
            expect(fn(args).length).to.equal(2);
            expect(fn(args)[0]).to.equal("one");
            expect(fn(args)[1]).to.equal("two");

            args = {args: ["'one"]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["one'"]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["\"one"]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["one\""]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["\"one\""]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["'one'"]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["'one\""]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["'one\"", "two"]};
            expect(fn(args).length).to.equal(1);
            expect(fn(args)[0]).to.equal("two");

            args = {args: ["o'ne"]};
            expect(fn(args).length).to.equal(1);
            expect(fn(args)[0]).to.equal("o'ne");

            args = {args: [{args: ["'one\"", "two"]}]};
            expect(fn(args).length).to.equal(1);
            expect(fn(args)[0]).to.equal("two");


        });

        it("nested and duplicates should work", function() {
            args = {args: ["three", {args: ["'one\"", "two"]}, "'four", "five"]};
            expect(fn(args).length).to.equal(3);
            expect(fn(args)[0]).to.equal("three");
            expect(fn(args)[1]).to.equal("two");
            expect(fn(args)[2]).to.equal("five");

            args = {args: ["three", {args: ["two", "two", "four"]}, "'four", "five"]};
            expect(fn(args).length).to.equal(4);
            expect(fn(args)[0]).to.equal("three");
            expect(fn(args)[1]).to.equal("two");
            expect(fn(args)[2]).to.equal("four");
            expect(fn(args)[3]).to.equal("five");
        });

        it("numbers should be detected", function() {
            args = {args: ["9"]};
            expect(fn(args).length).to.equal(0);

            args = {args: ["a9"]};
            expect(fn(args).length).to.equal(1);
            expect(fn(args)[0]).to.equal("a9");

            args = {args: ["'9'"]};
            expect(fn(args).length).to.equal(0);
        });

        it("getting agg names should work", function() {
            args = {args: ["^one", "two", "^one", "^three", "three"]};
            expect(fn(args).length).to.equal(4);
            expect(fn(args)[0]).to.equal("^one");
            expect(fn(args)[1]).to.equal("two");
            expect(fn(args)[2]).to.equal("^three");
            expect(fn(args)[3]).to.equal("three");

            args = {args: ["^one", "two", "^one", "^three", "three", "^"]};
            expect(fn(args, true).length).to.equal(2);
            expect(fn(args, true)[0]).to.equal("one");
            expect(fn(args, true)[1]).to.equal("three");
        });
    })

    it("xcHelper.styleNewLineChar should work", function() {
        expect(xcHelper.styleNewLineChar('\n\r'))
        .to.equal('<span class="newLine lineChar">\\n</span><span class="carriageReturn lineChar">\\r</span>');
    });

    describe("xcHelper.dropdownOpen", function() {
        describe("Basic Test", function() {
            var $icon, $menu;

            before(function() {
                $icon = $('<div id="unitTestIcon">Icon</div>');
                $menu = $('<div id="unitTestMenu">Menu</div>');
                $("body").append($icon)
                        .append($menu);
            });

            beforeEach(function() {
                $menu.hide();
            });

            it("Should open the menu", function() {
                xcHelper.dropdownOpen($icon, $menu);
                assert.isTrue($menu.is(":visible"));
            });

            it("Should toggle the menu", function() {
                xcHelper.dropdownOpen($icon, $menu);
                assert.isTrue($menu.is(":visible"));
                // toggle the menu
                xcHelper.dropdownOpen($icon, $menu, {
                    "toggle": true
                });
                assert.isFalse($menu.is(":visible"));
            });

            it("Should close the menu with toClose option", function() {
                xcHelper.dropdownOpen($icon, $menu);
                assert.isTrue($menu.is(":visible"));
                // toggle the menu
                xcHelper.dropdownOpen($icon, $menu, {
                    "toClose": function() { return false; }
                });
                assert.isTrue($menu.is(":visible"));

                xcHelper.dropdownOpen($icon, $menu, {
                    "toClose": function() { return true; }
                });
                assert.isFalse($menu.is(":visible"));
            });

            after(function() {
                $icon.remove();
                $menu.remove();
            });
        });

        describe("hasMixedCells test", function() {
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
                                    '<td class="col2"><div class="originalData">{"testCol":3}</div></td>' +
                                '</tr>' +
                                '<tr class="row1">' +
                                    '<td class="col1"><div class="undefined">FNF</div></td>' +
                                    '<td class="col2"><div class="originalData">{"a":"b"}</div></td>' +
                                '</tr>' +
                                '<tr class="row2">' +
                                    '<td class="col1"><div>4</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":4}</div></td>' +
                                '</tr>' +
                                '<tr class="row3">' +
                                    '<td class="col1"><div>{"key":"val"}</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":{"key":"val"}}</div></td>' +
                                '</tr>' +
                            +'<table>';
                $("#container").append(html);
                $table = $("#xcTable-ZZ1");
            });

            it("hasMixedCells() should work", function() {
                var fn = xcHelper.__testOnly__.isInvalidMixed;
                var hightlightBox = '<div class="highlightBox"></div>';
                expect($table.length).to.equal(1);
                expect($table.find("td").length).to.equal(8);

                var cells = [];
                cells.push({
                    isMixed: true,
                    isUndefined: true,
                    type: "undefined"
                });

                $table.find("td").eq(2).append(hightlightBox);
                expect(fn("mixed", cells)).to.be.false;

                cells.push({isMixed: true, type: "integer"});

                $table.find("td").eq(0).append(hightlightBox);
                expect(fn("mixed", cells)).to.be.false;

                cells.shift();
                cells.push({isMixed: true, type: "integer"});
                $table.find("td").eq(2).find(".highlightBox").remove();
                $table.find("td").eq(4).append(hightlightBox);
                console.log(cells);
                expect(fn("mixed", cells)).to.be.false;

                cells = [];
                cells.push({isMixed: true, type: "object"});
                $table.find("td").eq(6).append(hightlightBox);
                expect(fn("mixed", cells)).to.be.true;

                $table.find(".highlightBox").remove();

            });
            after(function() {
                $table.remove();
                delete gTables[tableId];
            });
        });

        describe("toggle json options test", function() {
            var testDs;
            var tableName;
            var tableId;

            before(function(done) {
                UnitTest.onMinMode();
                var testDSObj = testDatasets.fakeYelp;
                UnitTest.addAll(testDSObj, "unitTestFakeYelp")
                .always(function(ds, tName) {
                    testDs = ds;
                    tableName = tName;
                    tableId = xcHelper.getTableId(tableName);
                    done();
                });
            });

            it ("toggleUnnestandJsonOptions should work", function() {
                var fn = xcHelper.__testOnly__.toggleUnnestandJsonOptions;
                var $menu = $("#cellMenu");
                var $unnestLi = $menu.find(".tdUnnest");
                var $jsonModalLi = $menu.find(".tdJsonModal");
                var $div = $("#xcTable-" + tableId).find(".row0 .col11 .originalData");
                var multiCell = false;
                var notAllowed = $div.find(".null, .blank").length;
                var columnType = "mixed";
                var options = {rowNum: 1, colNum: 1};

                // initial state
                // expect($menu.is(":visible")).to.be.true;
                expect($unnestLi.length).to.equal(1);
                expect($jsonModalLi.length).to.equal(1);

                $div.html("string");
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                $div.html('{"a":"b"}');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                // test notAllowed, multiCell, and undefined with object val

                notAllowed = true;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                notAllowed = false;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                multiCell = true;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                multiCell = false;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                $div.append('<div class="undefined"></div>');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                $div.find(".undefined").remove();
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                notAllowed = true;
                multiCell = true;
                $div.append('<div class="undefined"></div>');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                notAllowed = false;
                multiCell = false;
                $div.find(".undefined").remove();
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;


                // test array
                $div.html('["a","b"]');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                $div.html('["a", invalid]');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                $div.parent().addClass("truncated");
                $div.html('["a", invalid]');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;
                $div.parent().removeClass("truncated");
            });

            after(function(done) {
                UnitTest.deleteAll(tableName, testDs, TableType.Orphan)
                .always(function() {
                    UnitTest.offMinMode();
                    done();
                });
            });
        });
    });

    describe("boldSuggest test", function() {
        it("should bold simple text correctly", function() {
            var htmlstr = "<li>Cats and Dogs</li>";
            var $html = $(htmlstr);
            xcHelper.boldSuggestedText($html, "and");
            expect($html.text()).to.equal("Cats and Dogs");
            expect($html.html()).to.equal("Cats <strong>and</strong> Dogs");
            $html.remove();
        });

        it("should not bold unmatching text", function() {
            var htmlstr = "<li>Cats and Dogs</li>";
            var $html = $(htmlstr);
            xcHelper.boldSuggestedText($html, "you");
            expect($html.text()).to.equal("Cats and Dogs");
            expect($html.html()).to.equal("Cats and Dogs");
            $html.remove();
        });

        it("should bold text without removing other tags", function() {
            var htmlstr = "<li><i></i>Cats and Dogs<i></i></li>";
            var $html = $(htmlstr);
            xcHelper.boldSuggestedText($html, "and");
            expect($html.text()).to.equal("Cats and Dogs");
            expect($html.html()).to.equal("<i></i>Cats <strong>and</strong> Dogs<i></i>");
            $html.remove();
        });

        it("should bold text without modifying other tags", function() {
            var htmlstr = "<li><i></i>newImd<i></i></li>";
            var $html = $(htmlstr);
            xcHelper.boldSuggestedText($html, "i");
            expect($html.text()).to.equal("newImd");
            expect($html.html()).to.equal("<i></i>new<strong>I</strong>md<i></i>");
            $html.remove();
        });

        it("should handle input text with erroneous characters", function() {
            var htmlstr = "<li><i></i>newImd<i></i></li>";
            var $html = $(htmlstr);
            xcHelper.boldSuggestedText($html, "/////)(i////\\");
            expect($html.text()).to.equal("newImd");
            expect($html.html()).to.equal("<i></i>new<strong>I</strong>md<i></i>");
            $html.remove();
        });

    });

    it("xcHelper.roundToSignificantFigure should work", function() {
        expect(xcHelper.roundToSignificantFigure(1234, 5, 100, 1))
        .to.equal(1000);
    });

    it("setURLParam should work", function() {
        var curHref = window.location.href;
        var res = xcHelper.setURLParam("xyz", "abc");
        expect(res.indexOf("xyz=abc")).to.equal(curHref.length + 1);
    });


    it("deleteURLParam should work", function() {
        var curHref = window.location.href;
        expect(curHref.indexOf("workbook")).to.be.gt(-1);
        var res = xcHelper.deleteURLParam("workbook");
        expect(res.indexOf("workbook=")).to.equal(-1);
    });

    it("xcHelper.getLockIconHtml should work", function() {
        var loadWithStepHtml = xcHelper.getLockIconHtml(1, 1, false, true);
        var loadWithTextHtml = xcHelper.getLockIconHtml(1, 1, true, false);
        var searchHtml = xcHelper.getLockIconHtml(undefined, undefined, false,
                                                  false, true);
        expect(loadWithStepHtml.indexOf("cancelLoad")).to.be.gt(-1);
        expect(loadWithStepHtml.indexOf("stepText")).to.be.gt(-1);
        expect(loadWithTextHtml.indexOf("pctText")).to.be.gt(-1);
        expect(searchHtml.indexOf("cancelSearch")).to.be.gt(-1);
    });

    describe("xcHelper.createJoinedColumns", () => {
        let createJoinedColumns;
        const tableId = 'a';
        const tableName = 'testTable#' + tableId;

        before(() => {
            createJoinedColumns = xcHelper.createJoinedColumns;

            const progCols = []
            progCols.push(ColManager.newPullCol('a'));
            progCols.push(ColManager.newPullCol('prefix::b'));
            progCols.push(ColManager.newDATACol());
            let table = new TableMeta({
                tableId: tableId,
                tableName: tableName,
                tableCols: progCols
            });

            gTables[tableId] = table;
        });

        it('should return DATA col only when no table meta', () => {
            const cols = createJoinedColumns('a', 'b', [], [], [], []);
            expect(cols.length).to.equal(1);
            expect(cols[0].backName).to.equal("DATA");
        });

        it('should return all cols when no pulled cols specified', () => {
            const cols = createJoinedColumns(tableName, 'b', null, [], [], []);
            expect(cols.length).to.equal(3);
            expect(cols[0].backName).to.equal("a");
            expect(cols[1].backName).to.equal("prefix::b");
            expect(cols[2].backName).to.equal("DATA");
        });

        it('should return cols and replace name', () => {
            const lPulledColNames = ['a', 'prefix::b'];
            const lRenames = [{
                type: ColumnType.integer,
                orig: 'a',
                new: 'newA'
            }, {
                type: DfFieldTypeT.DfFatptr,
                orig: 'prefix',
                new: 'newPrefix'
            }];
            const cols = createJoinedColumns(tableName, 'b',
                lPulledColNames, [], lRenames, []);
            expect(cols.length).to.equal(3);
            expect(cols[0].backName).to.equal("newA");
            expect(cols[1].backName).to.equal("newPrefix::b");
            expect(cols[2].backName).to.equal("DATA");
        });

        after(() => {
            delete gTables[tableId];
        });
    });

    describe("xcHelper.createGroupByColumns", () => {
        const tableId = 'a'
        const tableName = 'testTable#' + tableId;
        let createGroupByColumns;

        before(() => {
            createGroupByColumns = xcHelper.createGroupByColumns;
            const table = new TableMeta({
                tableId: tableId,
                tableName: tableName,
                tableCols: [ColManager.newPullCol('colA'), ColManager.newDATACol()]
            });
            gTables[tableId] = table;
        });

        it('should handle normal case', () => {
            const groupByCols = ['groupByCol'];
            const aggArgs = [{ newColName: 'aggCol' }];
            const newProgCols = createGroupByColumns(
            'test#c', groupByCols, aggArgs, null);
            expect(newProgCols.length).to.equal(3);
            expect(newProgCols[0].backName).to.equal('aggCol');
            expect(newProgCols[1].backName).to.equal('groupByCol');
            expect(newProgCols[2].backName).to.equal('DATA');
        });

        it('should handle include sample column case', () => {
            const groupByCols = ['colA'];
            const aggArgs = [{ newColName: 'aggCol' }];
            const newProgCols = createGroupByColumns(
            tableName, groupByCols, aggArgs, [0])
            expect(newProgCols[0].backName).to.equal('aggCol');
            expect(newProgCols[1].backName).to.equal('colA');
            expect(newProgCols[2].backName).to.equal('DATA');
        });

        after(() => {
            delete gTables[tableId];
        });
    });

    it("xcHelper.zip should work", function() {
        // case 1
        var res = xcHelper.zip([1, 2, 3], ["a", "b", "c"]);
        expect(res).to.eql([[1,"a"],[2, "b"],[3, "c"]]);

        // case 2
        res = xcHelper.zip();
        expect(res).to.eql([]);
    });

    after(function() {
        StatusBox.forceHide();
    });
});

