describe('xcHelper Test', function() {
    it('xcHelper.assert should work', function() {
        // case 1
        try {
            xcHelper.assert(1 == 2, "test error");
        } catch (error) {
            expect(error).to.equal("test error");
        }

        // case 2
        try {
            xcHelper.assert(1 == 2);
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

    it('xcHelper.wrapDSName should work', function() {
        var res = xcHelper.wrapDSName("test");
        var expected = Support.getUser() + "." + "test";
        expect(res).to.equal(expected);
    });

    it('xcHelper.parseDSName should work', function() {
        // case 1
        var res = xcHelper.parseDSName("test");
        expect(res).to.be.an('object');
        expect(res.user).to.be.equal(DSTStr.UnknownUser);
        expect(res.dsName).to.be.equal("test");
        // case 2
        res = xcHelper.parseDSName("user.test2");
        expect(res).to.be.an('object');
        expect(res.user).to.be.equal("user");
        expect(res.dsName).to.be.equal("test2");
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
        expect(resCols[0].width).to.equal(100);
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
        var checkFunc = function(name) { return false; };
        res = xcHelper.uniqueRandName("test", checkFunc, 1);
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;

        // case 3
        checkFunc = function(name) { return true; };
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
    });

    it('xcHelper.getCurrentTimeStamp should work', function() {
        var res = xcHelper.getCurrentTimeStamp();
        var d = new Date().getTime();
        expect((res - d) < 100).to.be.true;
    });

    it('xcHelper.timeStampTranslater should work', function() {
        // case 1
        var res = xcHelper.timeStampTranslater(1463788661);
        expect(res).to.equal("4:57:41 PM 5-20-2016");
        //case 2
        res = xcHelper.timeStampTranslater();
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
    });

    it('xcHelper.textToBytesTranslator should work', function() {
        var res = xcHelper.textToBytesTranslator("1KB");
        expect(res).to.equal(1024);
    });

    it('xcHelper.showSuccess should work', function(done) {
        xcHelper.showSuccess();
        assert.isTrue($('#successMessageWrap').is(":visible"));
        setTimeout(function() {
            assert.isFalse($('#successMessageWrap').is(":visible"));
            done();
        }, 3000)
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
        test = null
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
            "$selector": $e
        });
        expect(res).to.be.false;
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.NoEmpty);

        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        // case 2
        res = xcHelper.validate({
            "$selector": $e,
            "check"    : function() { return false; }
        });
        expect(res).to.be.true;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 3
        res = xcHelper.validate([
        {
            "$selector": $e,
            "check"    : function() { return false; }
        },
        {
            "$selector": $e,
            "check"    : function() { return true; },
            "noWarn"   : true
        }
        ]);
        expect(res).to.be.false;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 4
        var test = null;
        res = xcHelper.validate({
            "$selector": $e,
            "check"    : function() { return true; },
            "callback" : function() { test = "test" }
        });
        expect(res).to.be.false;
        expect(test).to.be.equal("test");
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.InvalidField);
        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        // case 5
        var test = null;
        res = xcHelper.validate({
            "$selector": $e,
            "isAlert"  : true,
            "text"     : "test error"
        });
        expect(res).to.be.false;
        assert.isTrue($("#alertModal").is(":visible"));
        var text = $("#alertContent .text").text();
        assert.equal(text, "test error");
        $("#alertModal .close").click();
        assert.isFalse($("#alertModal").is(":visible"));

        gMinModeOn = cacheMinMode;
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
    });

    it('xcHelper.getBackTableSet should work', function(done) {
        xcHelper.getBackTableSet()
        .then(function(backTableSet, numBackTables) {
            expect(backTableSet).to.be.an('object');
            var count = 0;
            for (var key in backTableSet) {
                count++;
            }
            expect(count).to.equal(numBackTables);
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    it('xcHelper.checkDupTableName should work', function(done) {
        var tableName = xcHelper.randName("test-noConflict");
        xcHelper.checkDupTableName(tableName)
        .then(function(res) {
            expect(res).to.equal('success');
            done();
        })
        .fail(function(error) {
            throw error;
        });
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
        $input = $('<input type="text">');
        xcHelper.insertText($input, "test");
        expect($input.val()).to.be.equal("test");

        // case 3
        $input = $('<input type="text" value="a">');
        xcHelper.insertText($input, "b");
        expect($input.val()).to.be.equal("b, a");

        // case 4
        $input = $('<input type="text" value=", a">');
        xcHelper.insertText($input, "b");
        expect($input.val()).to.be.equal("b, a");

        // XXX don't know how to test other case yet...
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
        expect(res).to.equal('int(test)');
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

    it('xcHelper.fillInputFromCell should work', function() {
        // case 1
        var $header = $('<div class="header">' +
                        '<div class="test">' +
                            '<input class="editableHead" value="test">' +
                        '</div>' +
                    '</div>');

        var $input = $('<input class="argument" type="text">');
        xcHelper.fillInputFromCell($header.find(".test"), $input, "$");
        expect($input.val()).to.equal("$test");
        // case 2
        var $table = $('<table>' +
                        '<td class="col1">' +
                            '<div class="test">' +
                                '<input class="editableHead col1" value="t2">' +
                            '</div>' +
                        '</td>' +
                    '</table>');

        $input = $('<input class="argument" type="text">');
        xcHelper.fillInputFromCell($table.find(".test"), $input, "$");
        expect($input.val()).to.equal("$t2");
        // case 3
        $input = $('<input>');
        xcHelper.fillInputFromCell($header.find(".test"), $input, "$");
        expect($input.val()).to.equal("");
        // case 4
        $input = $('<input class="argument">');
        xcHelper.fillInputFromCell($header.find(".test"), $input, "$");
        expect($input.val()).to.equal("");
        // case 5
        $input = $('<div class="colNameSection">' +
                    '<input class="argument" type="text">' +
                    '</div>').find('input');
        xcHelper.fillInputFromCell($header.find(".test"), $input, "$");
        expect($input.val()).to.equal("");
    });

    it('xcHelper.hasValidColPrefix should work', function() {
        // case 1
        var res = xcHelper.hasValidColPrefix(1, '$');
        expect(res).to.be.false;
        // case 2
        res = xcHelper.hasValidColPrefix('test', '$');
        expect(res).to.be.false;
        // case 3
        res = xcHelper.hasValidColPrefix('$test', '$');
        expect(res).to.be.true;
        // case 4
        res = xcHelper.hasValidColPrefix('$test, $test2', '$');
        expect(res).to.be.true;
        // case 5
        res = xcHelper.hasValidColPrefix('$test, $', '$');
        expect(res).to.be.false;
    });
});