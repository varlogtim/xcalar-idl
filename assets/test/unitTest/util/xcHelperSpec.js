describe('xcHelper Test', function() {
    it('xcHelper.assert should work', function() {
        // case 1
        try {
            xcHelper.assert(1 === 2, "test error");
        } catch (error) {
            expect(error).to.equal("test error");
        }

        // case 2
        try {
            xcHelper.assert(1 === 2);
        } catch (error) {
            expect(error).to.equal("Assert failed");
        }
    });

    it('xcHelper.parseTableId should work', function() {
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

    it('xcHelper.parseRowNum should work', function() {
        // case 1
        var $el = $('<div class="row1"></div>');
        var res = xcHelper.parseRowNum($el);
        expect(res).to.equal(1);
        // case 2 (normal to see the console.error)
        $el = $('<div></div>');
        res = xcHelper.parseRowNum($el);
        expect(res).to.be.null;
        // case 3
        $el = $('<div class="col1"></div>');
        res = xcHelper.parseRowNum($el);
        expect(res).to.be.null;
    });

    it('xcHelper.parseColNum should work', function() {
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

    it('xcHelper.parseJsonValue should work', function() {
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
        expect(res).to.equal('["a", "b"]');
        // case 7
        res = xcHelper.parseJsonValue("test<>");
        expect(res).to.equal('test&lt;&gt;');
    });

    it('xcHelper.parseColType should work', function() {
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
    });

    it('xcHelper.getPreviewSize should work', function() {
        expect(xcHelper.getPreviewSize("")).to.be.equal(gMaxSampleSize);
        expect(xcHelper.getPreviewSize(null)).to.equal(gMaxSampleSize);
        expect(xcHelper.getPreviewSize("abc")).to.equal(gMaxSampleSize);

        expect(xcHelper.getPreviewSize("1", "KB"))
        .to.equal(1 * 1024);
        expect(xcHelper.getPreviewSize("2", "MB"))
        .to.equal(2 * 1024 * 1024);
        expect(xcHelper.getPreviewSize("3", "GB"))
        .to.equal(3 * 1024 * 1024 * 1024);
        expect(xcHelper.getPreviewSize("4", "TB"))
        .to.equal(4 * 1024 * 1024 * 1024 * 1024);
        expect(xcHelper.getPreviewSize("5", "garbage"))
        .to.equal(5);
    });

    it('xcHelper.getMultiJoinMapString should work', function() {
        // case 1
        var res = xcHelper.getMultiJoinMapString([1, 2]);
        expect(res).to.equal('concat(string(1), concat(".Xc.", string(2)))');
        // case 2
        res = xcHelper.getMultiJoinMapString([1, 2, 3]);
        expect(res).to.equal('concat(string(1), concat(".Xc.", concat(string(2), concat(".Xc.", string(3)))))');

        // case 3
        res = xcHelper.getMultiJoinMapString([1, 2, 3, 4]);
        var openCount = 0;
        var closeCount = 0;
        for (var i = 0; i < res.length; i++) {
            var c = res.charAt(i);
            if (c === '(') {
                openCount++;
            }

            if (c === ')') {
                closeCount++;
            }
        }

        expect(openCount).to.equal(closeCount);
    });

    it('xcHelper.getJoinRenameMap should work', function() {
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

    it('xcHelper.getFilterOptions should work', function() {
        // error case
        var res = xcHelper.getFilterOptions(null);
        expect(res).to.be.null;
        // filter case 1
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {1: true});
        expect(res).to.be.an('object');
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal('eq(test, 1)');
        // filter case 2
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {"a": true, "b": true});
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal('or(eq(test, a), eq(test, b))');
        // filter case 3
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", null, true);
        expect(res).to.be.an('object');
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal('not(exists(test))');
        // filter case 4
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {1: true}, true);
        expect(res).to.be.an('object');
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal('or(eq(test, 1), not(exists(test)))');

        // exclude case 1
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {1: true});
        expect(res).to.be.an('object');
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal('not(eq(test, 1))');
        // exclude case 2
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {"a": true, "b": true});
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal('and(not(eq(test, a)), not(eq(test, b)))');
        // exclude case 3
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", null, true);
        expect(res).to.be.an('object');
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal('exists(test)');
        // exclude case 4
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {1: true}, true);
        expect(res).to.be.an('object');
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal('and(not(eq(test, 1)), exists(test))');
    });

    it("xcHelper.getUserPrefix should work", function() {
        var res = xcHelper.getUserPrefix();
        expect(res).to.equal(Support.getUser());
    });

    it('xcHelper.wrapDSName should work', function() {
        var res = xcHelper.wrapDSName("test");
        var nameParts = res.split(".");
        var userName = nameParts[0];
        var randId = nameParts[1];
        nameParts.splice(0, 2);
        var actualName = nameParts.join(".");
        var expected = Support.getUser() + "." + "test";
        expect(userName + "." + actualName).to.equal(expected);
        expect(("" + randId).length).to.equal(5);
    });

    it('xcHelper.parseDSName should work', function() {
        // case 1
        var res = xcHelper.parseDSName("test");
        expect(res).to.be.an('object');
        expect(res.user).to.be.equal(DSTStr.UnknownUser);
        expect(res.randId).to.be.equal(DSTStr.UnknownId);
        expect(res.dsName).to.be.equal("test");
        // case 2
        res = xcHelper.parseDSName("user.test2");
        expect(res).to.be.an('object');
        expect(res.user).to.be.equal("user");
        expect(res.randId).to.be.equal(DSTStr.UnknownId);
        expect(res.dsName).to.be.equal("test2");
        // case 3
        res = xcHelper.parseDSName("user.36472.test2");
        expect(res).to.be.an('object');
        expect(res.user).to.be.equal("user");
        expect(("" + res.randId).length).to.be.equal(5);
        expect(res.dsName).to.be.equal("test2");
        // case 4
        res = xcHelper.parseDSName("user.user.36472.test2");
        expect(res).to.be.an('object');
        expect(res.user).to.be.equal("user.user");
        expect(("" + res.randId).length).to.be.equal(5);
        expect(res.dsName).to.be.equal("test2");
    });

    it('xcHelper.getUnusedTableName should work', function(done) {
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

    it('xcHelper.getUnusedTableName should work in dup case', function(done) {
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

    it('xcHelper.getUniqColName should work', function() {
        // case 1
        var res = xcHelper.getUniqColName(null, null);
        expect(res.includes("NewCol")).to.be.true;
        // case 2
        res = xcHelper.getUniqColName(null, "test");
        expect(res).to.be.equal("test");
        // case 3
        var progCol = ColManager.newCol({
            "backName": "test",
            "name"    : "test",
            "isNewCol": false,
            "userStr" : '"test" = pull(test)',
            "func"    : {
                "name": "pull",
                "args": ["test"]
            }
        });
        gTables["xc-Test"] = new TableMeta({
            "tableId"  : "xc-Test",
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

    it('xcHelper.extractOpAndArgs should work', function() {
        var res = xcHelper.extractOpAndArgs('eq(a, 3)', ',');
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
    });

    it('xcHelper.getTableKeyFromMeta should work', function() {
        var tableMeta = {
            "keyAttr": {
                "name"           : "test",
                "valueArrayIndex": 0
            },
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfFatptr
            }]
        }

        var res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res).to.equal("user::test");
        // case 2
        tableMeta = {
            "keyAttr": {
                "name"           : "test",
                "valueArrayIndex": 0
            },
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfString
            }]
        }

        res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res).to.equal("test");
    });

    it('xcHelper.deepCopy should work', function() {
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

    it("xcHelper.mapColGenerate should work", function() {
        var progCol = ColManager.newCol({
            "backName": "test",
            "name"    : "test",
            "isNewCol": false,
            "userStr" : '"test" = pull(test)',
            "func"    : {
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
        expect(resCols[1].name).to.equal('test');
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
        // case 1
        var testCases = [{
            "colName": "a",
            "prefix" : "b",
            "width"  : 56
        },
        {
            "colName": "a",
            "prefix" : "bc",
            "width"  : 63
        },
        {
            "colName": "bc",
            "prefix" : "a",
            "width"  : 63
        },
        {
            "colName": "a",
            "width"  : 130
        },
        {
            "colName": "a",
            "prefix" : "",
            "width"  : 130
        }]

        testCases.forEach(function(testCase) {
            var colName = testCase.colName;
            var prefix = testCase.prefix;
            var res = xcHelper.getDefaultColWidth(colName, prefix);
            expect(res).to.equal(testCase.width);
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

    it("xcHelper.uniqueRandName should work", function() {
        // case 1
        var res = xcHelper.uniqueRandName("test");
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;
        // case 2
        var checkFunc = function() { return false; };
        res = xcHelper.uniqueRandName("test", checkFunc, 1);
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;

        // case 3
        checkFunc = function() { return true; };
        res = xcHelper.uniqueRandName("test", checkFunc);
        expect(res.length).to.equal(9);
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

    it('xcHelper.isFloat should work', function() {
        // case 1
        var res = xcHelper.isFloat(1);
        expect(res).to.be.false;
        // case 2
        res = xcHelper.isFloat(1.23);
        expect(res).to.be.true;
    });

    it('xcHelper.getDate should work', function() {
        // case 1
        var d = new Date('01/01/2001');
        var res = xcHelper.getDate(null, d);
        expect(res).to.equal(d.toLocaleDateString().replace(/\//g, '-'));
        // case 2
        res = xcHelper.getDate('/', d);
        expect(res).to.equal(d.toLocaleDateString());
        // case 3
        var time = d.getTime();
        res = xcHelper.getDate('/', null, time);
        expect(res).to.equal(d.toLocaleDateString());
    });

    it('xcHelper.getTime should work', function() {
        var d = new Date('01/01/2001 12:11:00');
        var res = xcHelper.getTime(d);
        var res2 = xcHelper.getTime(null, d.getTime());
        expect(res).to.equal(res2);
        // no second case
        var res3 = xcHelper.getTime(d, null, true);
        expect(res3.split(":").length).to.equal(2);
    });

    it('xcHelper.getCurrentTimeStamp should work', function() {
        var res = xcHelper.getCurrentTimeStamp();
        var d = new Date().getTime();
        expect((res - d) < 100).to.be.true;
    });

    it('xcHelper.downloadAsFile should work', function(done) {
        var fileName = "fileName";
        var fileContent = "test";
        var deferrd = jQuery.Deferred();
        function clickEvent (event) {
            event.preventDefault();
            var $a = $(event.target);
            var testName = $a.attr("download");
            var testContent = $a.attr("href");

            deferrd.resolve(testName, testContent);
        };
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

    it('xcHelper.downloadAsFile with raw data should work', function(done) {
        var fileName = "fileName";
        var fileContent = "test";
        var deferrd = jQuery.Deferred();
        function clickEvent (event) {
            event.preventDefault();
            var $a = $(event.target);
            var testName = $a.attr("download");
            var testContent = $a.attr("href");

            deferrd.resolve(testName, testContent);
        };
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

    it('xcHelper.timeStampTranslator should work', function() {
        // case 1
        var res = xcHelper.timeStampTranslator(1463788661);
        expect(res).to.equal("4:57:41 PM 5-20-2016");
        //case 2
        res = xcHelper.timeStampTranslator();
        expect(res).to.be.null;
    });

    it('xcHelper.sizeTranslator should work', function() {
        // case 1
        var res = xcHelper.sizeTranslator(1);
        expect(res).to.equal('1B');
        // case 2
        res = xcHelper.sizeTranslator(1024);
        expect(res).to.equal('1KB');
        // case 3
        res = xcHelper.sizeTranslator(10241);
        expect(res).to.equal('10KB');
        // case 4
        res = xcHelper.sizeTranslator(1024, false, 'B');
        expect(res).to.equal('1024B');
        // case 5
        res = xcHelper.sizeTranslator(1, true);
        expect(res).to.be.an('array');
        expect(res.length).to.equal(2);
        expect(res[0]).to.equal(1);
        expect(res[1]).to.equal('B');

        // case 6 (rounding)
        res = xcHelper.sizeTranslator(25.3);
        expect(res).to.equal('25B');
    });

    it('xcHelper.textToBytesTranslator should work', function() {
        var res = xcHelper.textToBytesTranslator("1KB");
        expect(res).to.equal(1024);

        res = xcHelper.textToBytesTranslator("1.0KB");
        expect(res).to.equal(1024);
    });

    it('xcHelper.showSuccess should work', function(done) {
        xcHelper.showSuccess();
        assert.isTrue($('#successMessageWrap').is(":visible"));
        setTimeout(function() {
            assert.isFalse($('#successMessageWrap').is(":visible"));
            done();
        }, 3000);
    });

    it('xcHelper.showFail should work', function(done) {
        xcHelper.showFail();
        assert.isTrue($('#successMessageWrap').is(":visible"));
        setTimeout(function() {
            assert.isFalse($('#successMessageWrap').is(":visible"));
            done();
        }, 3000);
    });

    it('xcHelper.replaceMsg should work', function() {
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

    it('xcHelper.toggleListGridBtn should work', function() {
        var $btn = $('<button class="gridView"></button>');
        xcHelper.toggleListGridBtn($btn, true);
        expect($btn.hasClass("gridView")).to.be.false;
        expect($btn.hasClass("listView")).to.be.true;

        xcHelper.toggleListGridBtn($btn, false, false);
        expect($btn.hasClass("gridView")).to.be.true;
        expect($btn.hasClass("listView")).to.be.false;
    });

    it('xcHelper.showRefreshIcon should work', function(done) {
        var $location = $('<div></div>');
        xcHelper.showRefreshIcon($location);
        expect($location.find(".refreshIcon").length).to.equal(1);
        setTimeout(function() {
            expect($location.find(".refreshIcon").length).to.equal(0);
            done();
        }, 2000);
    });

    it('xcHelper.toggleBtnInProgress should work', function() {
        var $btn = $('<button>test</button>');
        xcHelper.toggleBtnInProgress($btn);
        expect($btn.hasClass("btnInProgress")).to.be.true;
        expect($btn.text()).to.equal('test...');
        expect($btn.find('icon').length).to.equal(0);
        xcHelper.toggleBtnInProgress($btn);
        expect($btn.hasClass("btnInProgress")).to.be.false;
        expect($btn.text()).to.equal('test');
        // true
        $btn = $('<button>' +
                    '<span class="text">test</span>' +
                    '<span class="icon"></span>' +
                '</button>');
        xcHelper.toggleBtnInProgress($btn, true);
        expect($btn.hasClass("btnInProgress")).to.be.true;
        expect($btn.text()).to.equal('test...');
        expect($btn.find('.icon').length).to.equal(0);
        xcHelper.toggleBtnInProgress($btn, true);
        expect($btn.hasClass("btnInProgress")).to.be.false;
        expect($btn.text()).to.equal('test');
        expect($btn.find('.icon').length).to.equal(1);
    });

    it('xcHelper.optionButtonEvent should work', function() {
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

    it('xcHelper.supportButton should work', function() {
        // caase 1
        var $btn = xcHelper.supportButton("sql");
        expect($btn.hasClass("copySql")).to.be.true;
        // case 2
        $btn = xcHelper.supportButton("support");
        expect($btn.hasClass("genSub")).to.be.true;
        // case 3
        $btn = xcHelper.supportButton();
        expect($btn.hasClass("logout")).to.be.true;
    });

    it('xcHelper.validate should work', function() {
        var cacheMinMode = gMinModeOn;
        gMinModeOn = true;

        // case 1
        var $e = $('<div></div>');
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
            "$ele" : $e,
            "check": function() { return false; }
        });
        expect(res).to.be.true;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 3
        res = xcHelper.validate([{
            "$ele" : $e,
            "check": function() { return false; }
        },{
            "$ele" : $e,
            "check": function() { return true; },
            "quite": true
        }]);
        expect(res).to.be.false;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 4
        var test = null;
        res = xcHelper.validate({
            "$ele"    : $e,
            "check"   : function() { return true; },
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
            "$ele"   : $e,
            "isAlert": true,
            "error"  : "test error"
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
            "$ele" : $e,
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

    it('xcHelper.tableNameInputChecker should work', function() {
        var $statusBox = $("#statusBox");
        var $input = $('<input type="text">');
        $("body").append($input);

        var onErrTrigger = false;
        var oldFunc = xcHelper.checkDupTableName;
        xcHelper.checkDupTableName = function(name) {
            return name !== "testDupName";
        };

        var testCases = [{
            "val"  : "testTable",
            "valid": true
        },
        {
            "val"  : "",
            "valid": false,
            "error": ErrTStr.NoEmpty
        },
        {
            "val"  : "ab:c",
            "valid": false,
            "error": ErrTStr.InvalidTableName
        },
        {
            "val"  : "ab#c",
            "valid": false,
            "error": ErrTStr.InvalidTableName
        },
        {
            "val"  : new Array(300).join("a"),
            "valid": false,
            "error": ErrTStr.TooLong
        },
        {
            "val"    : "testDupName",
            "valid"  : false,
            "error"  : ErrTStr.TableConflict,
            "options":  {
                onErr: function() { onErrTrigger = true; }
            }
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
        xcHelper.checkDupTableName = oldFunc;
    });

    it("xcHelper.getTableName should work", function() {
        // case 1
        var res = xcHelper.getTableName("test#hd1");
        expect(res).to.equal("test");
        // case 2
        res = xcHelper.getTableName("test");
        expect(res).to.equal("test");
    });

    it('xcHelper.getTableId should work', function() {
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

    it('xcHelper.getBackTableSet should work', function(done) {
        xcHelper.getBackTableSet()
        .then(function(backTableSet, numBackTables) {
            expect(backTableSet).to.be.an('object');
            expect(Object.keys(backTableSet).length)
            .to.equal(numBackTables);
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    it('xcHelper.checkDupTableName should work', function() {
        var tableName = xcHelper.randName("test-noConflict");
        var res = xcHelper.checkDupTableName(tableName);
        expect(res).to.equal(true);
    });

    it("xcHelper.suggestType should work", function() {
        // case 1
        var res = xcHelper.suggestType(null, "integer");
        expect(res).to.equal("integer");
        // case 2
        res = xcHelper.suggestType(null, "float");
        expect(res).to.equal("float");
        // case 3
        res = xcHelper.suggestType("1", "string");
        expect(res).to.equal("integer");
        // case 4
        res = xcHelper.suggestType(["1", null, ""], "string");
        expect(res).to.equal("integer");
        // case 5
        res = xcHelper.suggestType(["1.1", "2"], "string");
        expect(res).to.equal("float");
        // case 6
        res = xcHelper.suggestType(null, "string");
        expect(res).to.equal("string");
        // case 7
        res = xcHelper.suggestType(["1", "a"], "string");
        expect(res).to.equal("string");
        // case 8
        res = xcHelper.suggestType(["1", "a"], "string", 0.1);
        expect(res).to.equal("integer");
        // case 9
        res = xcHelper.suggestType(["t", "False"], "string", 0.1);
        expect(res).to.equal("boolean");
    });

    it('xcHelper.lockTable and  xcHelper.unlockTable should work', function() {
        gTables["xcTest"] = new TableMeta({
            "tableId"  : "xcTest",
            "tableName": "test"
        });

        xcHelper.lockTable("xcTest");
        expect(gTables["xcTest"].hasLock()).to.be.true;

        xcHelper.unlockTable("xcTest");
        expect(gTables["xcTest"].hasLock()).to.be.false;

        delete gTables["xcTest"];
    });

    it('xcHelper.enableSubmit and xcHelper.disableSubmit should work', function() {
        var $button = $('<button></button>');
        xcHelper.disableSubmit($button);
        expect($button.prop('disabled')).to.be.true;

        xcHelper.enableSubmit($button);
        expect($button.prop('disabled')).to.be.false;
    });

    it('xcHelper.insertText should work', function() {
        // case 1
        var $input = $('<input>');
        xcHelper.insertText($input, "test");
        expect($input.val()).to.be.equal("");

        // case 2
        var $input = $('<input type="number">');
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
        xcHelper.insertText($input, "b", {append: true});
        expect($input.val()).to.be.equal("b, a");

        // case 6
        $input = $('<input type="text" value=", a">');
        xcHelper.insertText($input, "b", {append: true});
        expect($input.val()).to.be.equal("b, a");

        // case 7
        $input = $('<input type="text">');
        xcHelper.insertText($input, "a", {append: true});
        expect($input.val()).to.be.equal("a");

        // case 8
        $input = $('<input type="text" value="a">');
        // set cursor to end
        $input.focus().val("a");
        xcHelper.insertText($input, "b", {append: true});
        expect($input.val()).to.be.equal("a, b");

        // case 9
        $input = $('<input type="text" value="ab">');
        // set cursor to between a & b
        $input.focus().caret(1);
        xcHelper.insertText($input, "c", {append: true});
        expect($input.val()).to.be.equal("ac, b");

    });

    it('xcHelper.createNextName should work', function() {
        var res = xcHelper.createNextName("abc", "-");
        expect(res).to.equal("abc-1");
        // case 2
        res = xcHelper.createNextName("abc-1", "-");
        expect(res).to.equal("abc-2");
    });

    it('xcHelper.hasSpecialChar should work', function() {
        // case 1
        var res = xcHelper.hasSpecialChar("abc$ 1");
        expect(res).to.be.true;
        // case 2
        res = xcHelper.hasSpecialChar("abc1");
        expect(res).to.be.false;
        // case 3
        res = xcHelper.hasSpecialChar("abc 1", true);
        expect(res).to.be.false;
        // case 4
        res = xcHelper.hasSpecialChar("abc-1");
        expect(res).to.be.true;
        // case 5
        res = xcHelper.hasSpecialChar("abc-1", null, true);
        expect(res).to.be.false;
    });

    it('xcHelper.isValidTableName should work', function() {
        var res = xcHelper.isValidTableName('');
        expect(res).to.be.false;

        res = xcHelper.isValidTableName(null);
        expect(res).to.be.false;

        res = xcHelper.isValidTableName('a');
        expect(res).to.be.true;

        res = xcHelper.isValidTableName('ab');
        expect(res).to.be.true;

        res = xcHelper.isValidTableName('abc1');
        expect(res).to.be.true;

        res = xcHelper.isValidTableName('ab1c');
        expect(res).to.be.true;

        res = xcHelper.isValidTableName('ab#c1');
        expect(res).to.be.false;

        res = xcHelper.isValidTableName('a_b');
        expect(res).to.be.true;

        res = xcHelper.isValidTableName('a-b');
        expect(res).to.be.true;

        res = xcHelper.isValidTableName('1a');
        expect(res).to.be.false;

        res = xcHelper.isValidTableName('_a');
        expect(res).to.be.false;

        res = xcHelper.isValidTableName('-abc');
        expect(res).to.be.false;

        res = xcHelper.isValidTableName('.abc');
        expect(res).to.be.false;
    });

    it('xcHelper.hasInvalidCharInCol should work', function() {
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
                "res": false
            },
        ]

        testCases.forEach(function(test) {
            var res = xcHelper.hasInvalidCharInCol(test.str);
            expect(res).to.equal(test.res);
        });
    });

    it('xcHelper.escapeRegExp should work', function() {
        // case 1
        var res = xcHelper.escapeRegExp(']');
        expect(res).to.equal('\\]');
        // case 2
        res = xcHelper.escapeRegExp('a');
        expect(res).to.equal('a');
    });

    it('xcHelper.escapeColName should work', function() {
        // case 1
        var res = xcHelper.escapeColName('a.b');
        expect(res).to.equal('a\\.b');
        // case 2
        res = xcHelper.escapeColName('a\\b');
        expect(res).to.equal('a\\\\b');
        // case 3
        res = xcHelper.escapeColName('a[b]');
        expect(res).to.equal('a\\[b\\]');
    });

    it('xcHelper.unescapeColName should work', function() {
        // case 1
        var res = xcHelper.unescapeColName('a\\.b');
        expect(res).to.equal('a.b');
        // case 2
        res = xcHelper.unescapeColName('a\\\\b');
        expect(res).to.equal('a\\b');
        // case 3
        res = xcHelper.unescapeColName('a\\[b\\]');
        expect(res).to.equal('a[b]');
    });

    it('xcHelper.stripeColName should work', function() {
        var res = xcHelper.stripeColName("votes.funny");
        expect(res).to.equal("votes_funny");

        res = xcHelper.stripeColName("a[b]");
        expect(res).to.equal("a_b");

        res = xcHelper.stripeColName("[b]");
        expect(res).to.equal("b");

        res = xcHelper.stripeColName("a\\.b");
        expect(res).to.equal("a_b");
    });

    it('xcHelper.disableTextSelection and xcHelper.reenableTextSelection should work', function() {
        xcHelper.disableTextSelection();
        expect($("#disableSelection").length).to.equal(1);
        xcHelper.reenableTextSelection();
        expect($("#disableSelection").length).to.equal(0);
    });

    it('xcHelper.castStrHelper should work', function() {
        // case 1
        var res = xcHelper.castStrHelper("test", "boolean");
        expect(res).to.equal('bool(test)');
        // case 2
        res = xcHelper.castStrHelper("test", "float");
        expect(res).to.equal('float(test)');
        // case 3
        res = xcHelper.castStrHelper("test", "integer");
        expect(res).to.equal('int(test, 10)');
        // case 4
        res = xcHelper.castStrHelper("test", "string");
        expect(res).to.equal('string(test)');
        // case 5
        res = xcHelper.castStrHelper("test", "test");
        expect(res).to.equal('test(test)');
    });

    it('xcHelper.isCharEscaped should work', function() {
        // case 1
        var res = xcHelper.isCharEscaped('\\.', 1);
        expect(res).to.be.true;
        res = xcHelper.isCharEscaped('\\\\.', 2);
        expect(res).to.be.false;
    });

    it('xcHelper.isStartWithLetter should work', function() {
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

    it('xcHelper.deepCompare should work', function() {
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

    it('xcHelper.delimiterTranslate should work', function() {
        // case 1
        var $input = $('<input class="nullVal">');
        var res = xcHelper.delimiterTranslate($input);
        expect(res).to.equal("");

        // case 2
        $input = $('<input>').val('"');
        res = xcHelper.delimiterTranslate($input);
        expect(res).to.equal('"');

        // case 3
        $input = $('<input>').val('\\t');
        res = xcHelper.delimiterTranslate($input);
        expect(res).to.equal('\t');
    });

    it('xcHelper.checkMatchingBrackets should work', function() {
        // case 1
        var res = xcHelper.checkMatchingBrackets('(test)').index;
        expect(res).to.equal(-1);
        // case 2
        res = xcHelper.checkMatchingBrackets('test)').index;
        expect(res).to.equal(4);
        // case 3
        res = xcHelper.checkMatchingBrackets('(test').index;
        expect(res).to.equal(0);
        // case 4
        res = xcHelper.checkMatchingBrackets('(())').index;
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

    it('xcHelper.camelCaseToRegular should work', function() {
        var func = xcHelper.camelCaseToRegular;
        expect(func('a')).to.equal('A');
        expect(func('aB')).to.equal('A B');
        expect(func('ab')).to.equal('Ab');
        expect(func('AB')).to.equal('A B');
        expect(func('Ab')).to.equal('Ab');
        expect(func('AaBbC')).to.equal('Aa Bb C');
    });

    it('xcHelper.removeNonQuotedSpaces should work', function() {
        var res = xcHelper.removeNonQuotedSpaces('map(concat  ("a   ", "b"))');
        expect(res).to.equal('map(concat("a   ","b"))');

        res = xcHelper.removeNonQuotedSpaces('map(concat  ("a \\"  ", "b"))');
        expect(res).to.equal('map(concat("a \\"  ","b"))');

        res = xcHelper.removeNonQuotedSpaces('map(concat  (\'a  \', "b"))');
        expect(res).to.equal('map(concat(\'a  \',"b"))');
    });

    it('xcHelper.getFormat should work', function() {
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

    it('xcHelper.convertToHtmlEntity should work', function() {
        var terribleString = "<&boo>";
        var convertHtml = xcHelper.convertToHtmlEntity;
        expect(convertHtml(terribleString)).to.equal("&#60;&#38;boo&#62;");
    });

    it('xcHelper.sortVals should work', function() {
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

    it('xcHelper.parseQuery should work', function() {
        var firstPart = 'map --eval "concat(\\"1\\", \\"2\\")" --srctable "A#Vi5" ' +
                        '--fieldName "B" --dsttable "A#Vi25";';
        var secondPart = 'index --key "col1" --dataset ".XcalarDS.a.b" ' +
                        '--dsttable "b#Vi26" --prefix;';
        var thirdPart = 'join --leftTable "c.index#Vi35" --rightTable ' +
                        '"d.index#Vi36" --joinType innerJoin ' +
                        '--joinTable "a#Vi34";';
        var fourthPart = 'load --url "nfs:///schedule/" --format json ' +
                         '--size 0B --name "f264.schedule";';
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

        var parsedQuery = xcHelper.parseQuery(sixthPart);
        expect(parsedQuery).to.be.an("array");
        expect(parsedQuery).to.have.lengthOf(1);

        expect(parsedQuery[0].name).to.equal("export");
        expect(parsedQuery[0].dstTable).to.equal("B#dl5");
        expect(parsedQuery[0].exportFileName).to.equal("C.csv");
        expect(parsedQuery[0].query).to.equal(sixthPart);
    });

    it('xcHelper.convertFrontColNamesToBack should work', function() {

        // undefined type
        var progCol1 = ColManager.newCol({
            "backName": "test",
            "name"    : "undfCol",
            "isNewCol": false,
            "userStr" : '"test" = pull(test)',
            "func"    : {
                "name": "pull",
                "args": ["test"]
            }
        });
        // string type
        var progCol2 = ColManager.newCol({
            "backName": "test2",
            "name"    : "stringCol",
            "isNewCol": false,
            "userStr" : '"test2" = pull(test2)',
            "func"    : {
                "name": "pull",
                "args": ["test2"]
            },
            type: "string"
        });
        // number type
        var progCol3 = ColManager.newCol({
            "backName": "test3",
            "name"    : "numCol",
            "isNewCol": false,
            "userStr" : '"test3" = pull(test3)',
            "func"    : {
                "name": "pull",
                "args": ["test3"]
            },
            type: "number"
        });

        gTables["xc-Test"] = new TableMeta({
            "tableId"  : "xc-Test",
            "tableName": "test",
            "tableCols": [progCol1, progCol2, progCol3]
        });

        // case 1 - pass
        var res = xcHelper.convertFrontColNamesToBack(
                                ['stringCol', 'numCol'],
                                'xc-Test',
                                ['string', 'number']);
        expect(res).to.be.an('array');
        expect(res).to.deep.equal(['test2', 'test3']);

        // case 2 - pass
        res = xcHelper.convertFrontColNamesToBack(
                                ['numCol', 'stringCol'],
                                'xc-Test',
                                ['string', 'number']);
        expect(res).to.be.an('array');
        expect(res).to.deep.equal(['test3', 'test2']);

        // case 3 - pass
        res = xcHelper.convertFrontColNamesToBack(
                                ['undfCol', 'stringCol'],
                                'xc-Test',
                                ['string', 'undefined']);
        expect(res).to.be.an('array');
        expect(res).to.deep.equal(['test', 'test2']);

        // case 4 - pass
        res = xcHelper.convertFrontColNamesToBack(
                                ['undfCol', 'stringCol', 'undfCol', 'undfCol'],
                                'xc-Test',
                                ['string', 'undefined']);
        expect(res).to.be.an('array');
        expect(res).to.deep.equal(['test', 'test2', 'test', 'test']);

        // case 5 - column doesn't exist
        res = xcHelper.convertFrontColNamesToBack(
                                ['fakeCol', 'stringCol'],
                                'xc-Test',
                                ['string', 'undefined']);
        expect(res).to.be.an('object');
        expect(res).to.deep.equal({
            invalid: true,
            reason: 'notFound',
            name: 'fakeCol',
            type: 'notFound'
        });

        // case 6 - invalid column type
        res = xcHelper.convertFrontColNamesToBack(
                                ['undfCol', 'stringCol'],
                                'xc-Test',
                                ['string']);
        expect(res).to.be.an('object');
        expect(res).to.deep.equal({
            invalid: true,
            reason: 'type',
            name: 'undfCol',
            type: 'undefined'
        });

        // case 7 - invalid table
        res = xcHelper.convertFrontColNamesToBack(
                                ['undfCol', 'stringCol'],
                                'noTable',
                                ['string']);
        expect(res).to.be.an('object');
        expect(res).to.deep.equal({
            invalid: true,
            reason: 'tableNotFound',
            name: 'undfCol',
            type: 'tableNotFound'
        });

        delete gTables['xc-Test'];
    });

    it('xcHelper.getUDFList should work', function(done) {
        XcalarListXdfs("*", "User*")
        .then(function(ret) {
            expect(ret).to.be.an('object');
            expect(ret).to.have.all.keys('numXdfs', 'fnDescs');

            var udfObj = xcHelper.getUDFList(ret);

            expect(udfObj).to.be.an('object');
            expect(udfObj).to.have.all.keys('moduleLis', 'fnLis');

            var $moduleLis = $(udfObj.moduleLis);
            var $fnLis = $(udfObj.fnLis);

            expect($moduleLis.length).to.be.gt(1);
            expect($fnLis.length).to.be.gt(5);
            expect($fnLis.length).to.be.gte($moduleLis.length);
            $fnLis.each(function() {
                var $li = $(this);
                var module = $li.data('module');
                var $moduleLi = $moduleLis.filter(function() {
                    return $(this).text() === module;
                });
                expect($moduleLi.length).to.equal(1); 
            });
            done();
        });
    });

    // difficult to test this without rewriting the entire function in here...
    it('xcHelper.repositionModalOnWinResize should work', function () {
        var $modal = $('<div id="unitTestModal" style="' +
                        'width:50px;height:50px;position:absolute;"></div>');
        $('#container').prepend($modal);
        var left = 50;
        var top = 50;
        $modal.css({'top': top, 'left': left});
        var modalSpecs = {$modal: $modal, top: top, left: left};
        var windowSpecs = {winWidth: 200, winHeight: 200};
        // assuming prev win dimensions were 200 x 200, the modal would be 25%
        // from the top and 25% from the left

        var curWinHeight = $(window).height();
        var curWinWidth = $(window).width();

        xcHelper.repositionModalOnWinResize(modalSpecs, windowSpecs);

        if (curWinWidth > windowSpecs.winWidth) {
            expect($modal.css('left')).to.be.gt(curWinWidth * .25);
            expect($modal.css('left')).to.be.lt(curWinWidth * .50);
        } else if (curWinWidth < windowSpecs.winWidth) {
            expect($modal.css('left')).to.be.lt(curWinWidth * .25);
        }
        if (curWinHeight > windowSpecs.winHeight) {
            expect($modal.css('top')).to.be.gt(curWinHeight * .25);
            expect($modal.css('top')).to.be.lt(curWinHeight * .50);
        } else if (curWinHeight < windowSpecs.winHeight) {
            expect($modal.css('top')).to.be.lt(curWinHeight * .25);
        }

        $modal.height(10000);
        $modal.width(10000);
        $modal.css({'top': top, 'left': left});

        xcHelper.repositionModalOnWinResize(modalSpecs, windowSpecs);
        expect($modal.css('top')).to.equal("0px");
        expect($modal.css('left')).to.equal(curWinWidth - 10000 + "px");

        $modal.remove();
    });

    it('xcHelper.numToStr should work', function() {
        expect(xcHelper.numToStr(5)).to.equal("5");
        expect(xcHelper.numToStr(1234)).to.equal("1,234");
        expect(xcHelper.numToStr("1234")).to.equal("1,234");
        expect(xcHelper.numToStr(1.12345)).to.equal("1.123");
        expect(xcHelper.numToStr(1.12345, 5)).to.equal("1.12345");
        expect(xcHelper.numToStr(null)).to.equal(null);
        expect(xcHelper.numToStr(undefined)).to.equal(undefined);
    });

    it('xcHelper.fillInputFromCell should work', function() {
        // case 1
        var $header = $('<div class="header">' +
                        '<div class="test">' +
                            '<input class="editableHead" value="test">' +
                        '</div>' +
                    '</div>');

        var $input = $('<input class="argument" type="text">');
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

        $input = $('<input class="argument" type="text">');
        xcHelper.fillInputFromCell($table.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal(gColPrefix + "t2");
        // case 3
        $input = $('<input>');
        xcHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        // case 4
        $input = $('<input class="argument">');
        xcHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        // case 5
        $input = $('<div class="colNameSection">' +
                    '<input class="argument" type="text">' +
                    '</div>').find('input');
        xcHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
    });

    it ('xcHelper.hasValidColPrefix(str) should work', function() {
        var func = xcHelper.hasValidColPrefix;
        expect(func(gColPrefix)).to.equal(false);
        expect(func('\\' + gColPrefix)).to.equal(false);
        expect(func('\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func('a\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(',a\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix+ 'blah,   \\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah ' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, a' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, \\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + '\\' + gColPrefix + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'bl,ah')).to.equal(false);

        expect(func(gColPrefix + 'blah blah')).to.equal(true); // allow column names with spaces
        expect(func(gColPrefix + 'a')).to.equal(true);
        expect(func(gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah,   ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + '\\' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'bl\\,ah, ' + gColPrefix + 'blah')).to.equal(true);

    });

    it('xcHelper.getPrefixColName should work', function() {
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

    it('xcHelper.parsePrefixColName should work', function() {
        // case 1
        var res = xcHelper.parsePrefixColName("test");
        expect(res).to.be.an('object');
        expect(res).to.have.property('prefix').to.equal("");;
        expect(res).to.have.property('name').to.equal("test");;

        // case 2
        res = xcHelper.parsePrefixColName("prefix::test");

        expect(res.prefix).to.equal("prefix");
        expect(res.name).to.equal("test");
    });

    it("xcHelper.normalizePrefix should work", function() {
        // case 1
        var res = xcHelper.normalizePrefix("abc");
        expect(res).to.equal("abc");
        // case 2
        res = xcHelper.normalizePrefix(new Array(25).join("a"));
        expect(res.length).to.equal(gPrefixLimit);
        // case 3
        res = xcHelper.normalizePrefix("a:b");
        expect(res).to.equal("a_b");
    });

    it('xcHelper.getColNameMap', function() {
        var progCol1 = ColManager.newCol({
            "backName": "Test",
            "name"    : "undfCol",
            "isNewCol": false
        });
   
        var progCol2 = ColManager.newCol({
            "backName": "test2",
            "name"    : "stringCol",
            "isNewCol": false
        });

        var progCol3 = ColManager.newCol({
            "backName": "",
            "name"    : "",
            "isNewCol": false
        });

         var progCol4 = ColManager.newDATACol();

        gTables["xc-Test"] = new TableMeta({
            "tableId"  : "xc-Test",
            "tableName": "test",
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });

        var colNameMap = xcHelper.getColNameMap('xc-Test');
        expect(Object.keys(colNameMap).length).to.equal(2);
        expect(colNameMap["test"]).to.equal("Test");
        expect(colNameMap["test2"]).to.equal("test2");

        delete gTables["xcTest"];
    });

    describe("xcHelper.getMemUsage", function() {
        it("Should work in normal case", function(done) {
            xcHelper.getMemUsage()
            .then(function(res) {
                expect(res).to.be.an("array");
                expect(res.length).to.be.at.least(1);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should handle cannot parse error", function(done) {
            var oldFunc = XcalarAppExecute;
            XcalarAppExecute = function() {
                return PromiseHelper.resolve({
                    "outStr": "invalid thing to parse"
                });
            };

            xcHelper.getMemUsage()
            .then(function() {
                throw "error case";
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            })
            .always(function() {
                XcalarAppExecute = oldFunc;
            });
        });

        it("Should handle inner parse error", function(done) {
            var oldFunc = XcalarAppExecute;
            XcalarAppExecute = function() {
                return PromiseHelper.resolve({
                    "outStr": "[\"invalid thing to parse\"]" 
                });
            };

            xcHelper.getMemUsage()
            .then(function() {
                throw "error case";
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            })
            .always(function() {
                XcalarAppExecute = oldFunc;
            });
        });
    });

    describe('xcHelper.dropdownOpen', function() {
        describe('Basic Test', function() {
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

        describe('toggle json options test', function() {
            var testDs;
            var tableName;
            var prefix;
            var tableId;

            before(function(done) {
                UnitTest.onMinMode();
                var testDSObj = testDatasets.fakeYelp;
                UnitTest.addAll(testDSObj, "unitTestFakeYelp")
                .always(function(ds, tName, tPrefix) {
                    testDs = ds;
                    tableName = tName;
                    prefix = tPrefix;
                    tableId = xcHelper.getTableId(tableName);
                    done();
                });
            });

            it ('toggleUnnestandJsonOptions should work', function() {
                var fn = xcHelper.__testOnly__.toggleUnnestandJsonOptions;
                var $menu = $("#cellMenu");
                var $unnestLi = $menu.find('.tdUnnest');
                var $jsonModalLi = $menu.find('.tdJsonModal');
                var $div = $('#xcTable-' + tableId).find('.row0 .col11 .displayedData');
                var multiCell = false;
                var notAllowed = $div.find('.null, .blank').length;
                var columnType = "mixed";
                var options;

                // initial state
                // expect($menu.is(":visible")).to.be.true;
                expect($unnestLi.length).to.equal(1);
                expect($jsonModalLi.length).to.equal(1);

                $div.html("string");
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.true;
                expect($jsonModalLi.hasClass('hidden')).to.be.true;

                $div.html('{"a":"b"}');
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.false;
                expect($jsonModalLi.hasClass('hidden')).to.be.false;

                // test notAllowed, multiCell, and undefined with object val

                notAllowed = true;
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.true;
                expect($jsonModalLi.hasClass('hidden')).to.be.true;

                notAllowed = false;
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.false;
                expect($jsonModalLi.hasClass('hidden')).to.be.false;

                multiCell = true;
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.true;
                expect($jsonModalLi.hasClass('hidden')).to.be.true;

                multiCell = false;
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.false;
                expect($jsonModalLi.hasClass('hidden')).to.be.false;

                $div.append('<div class="undefined"></div>');
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.true;
                expect($jsonModalLi.hasClass('hidden')).to.be.true;

                $div.find('.undefined').remove();
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.false;
                expect($jsonModalLi.hasClass('hidden')).to.be.false;

                notAllowed = true;
                multiCell = true;
                $div.append('<div class="undefined"></div>');
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.true;
                expect($jsonModalLi.hasClass('hidden')).to.be.true;

                notAllowed = false;
                multiCell = false;
                $div.find('.undefined').remove();
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.false;
                expect($jsonModalLi.hasClass('hidden')).to.be.false;


                // test array
                $div.html('["a","b"]');
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.false;
                expect($jsonModalLi.hasClass('hidden')).to.be.false;

                $div.html('["a", invalid]');
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.true;
                expect($jsonModalLi.hasClass('hidden')).to.be.true;

                $div.parent().addClass('truncated');
                $div.html('["a", invalid]');
                fn($menu, $div, columnType, multiCell, notAllowed, options);
                expect($unnestLi.hasClass('hidden')).to.be.true;
                expect($jsonModalLi.hasClass('hidden')).to.be.false;
                $div.parent().removeClass('truncated');
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

    after(function() {
        StatusBox.forceHide();
    });
});

