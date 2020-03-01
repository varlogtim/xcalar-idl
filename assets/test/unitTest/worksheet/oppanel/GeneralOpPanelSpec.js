describe("GeneralOpPanel Test", function() {
    // mostly tested already by filter, agg, groupby, map
    var mapOpPanel;
    var $mapOpPanel;
    var node;
    var $functionsInput;
    var $argSection;
    var prefix = "prefix";
    var $categoryMenu;
    var $functionsMenu;
    var openOptions = {};

    before(function(done) {
        if (XVM.isSQLMode()) {
            $("#modeArea").click();
        }
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            MainMenu.openPanel("sqlPanel");
            node = new DagNodeMap({});
            const parentNode = new DagNodeMap({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'col1'),
                        type: "integer"
                    }),
                    new ProgCol({
                        backName: 'col2',
                        type: "string"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            }
            openOptions = {
                udfDisplayPathPrefix : UDFFileManager.Instance.getCurrWorkbookDisplayPath()
            };


            oldJSONParse = JSON.parse;
            mapOpPanel = MapOpPanel.Instance;
            editor = mapOpPanel.getEditor();
            $mapOpPanel = $('#mapOpPanel');
            $categoryMenu = $mapOpPanel.find('.categoryMenu');
            $functionsMenu = $mapOpPanel.find('.functionsMenu');
            $functionsInput = $mapOpPanel.find('.mapFilter');
            $functionsList = $functionsInput.siblings('.list');
            $argSection = $mapOpPanel.find('.argsSection').eq(0);
            done();
        });

    });

    describe("Basic General Panel Tests", function() {
        it ("mouseup on argument should produce hint list", function(done) {
            mapOpPanel.show(node, openOptions)
            .always(() => {
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "arithmetic");
                }).trigger(fakeEvent.click);
                expect($categoryMenu.find("li.active").text()).to.equal('arithmetic');

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "add");
                }).trigger(fakeEvent.click);

                expect($argSection.hasClass('inactive')).to.be.false;
                expect($argSection.find('.arg').eq(0).val()).to.equal("");
                $argSection.find(".arg").eq(0).trigger("mouseup");
                const $list = $argSection.find(".list.hint");
                // expect($list.is(":visible")).to.be.true;
                expect($list.find("li").length).to.equal(2);
                expect($list.find("li").eq(0).text()).to.equal("col2");
                expect($list.find("li").eq(0).find(".typeIcon.type-string").length).to.equal(1);
                expect($list.find("li").eq(1).text()).to.equal("prefix::col1");
                expect($list.find("li").eq(1).find(".typeIcon.type-integer").length).to.equal(1);
                mapOpPanel._hideDropdowns();
                expect($list.is(":visible")).to.be.false;
                done();
            });
        });

        it("applyArgSuggest should work", function() {
            const $list = $argSection.find(".list.hint");
            expect($argSection.find('.arg').eq(0).val()).to.equal("");
            $list.find("li").eq(0).click();
            expect($argSection.find('.arg').eq(0).val()).to.equal("$col2");
            $argSection.find('.arg').eq(0).val("").change();
        });

        it("mouseup on column name input should not produce hint list", function() {
            expect($argSection.find(".arg").eq(2).closest(".dropDownList").hasClass("colNameSection")).to.be.true;
            $argSection.find(".arg").eq(2).trigger("mouseup");
            const $list = $argSection.find(".list.hint");
            expect($list.is(":visible")).to.be.false;
        });

        it("empty field checkbox should work on optional args", function() {
            $categoryMenu.find('li').filter(function() {
                return ($(this).text() === "user-defined");
            }).trigger(fakeEvent.click);

            $functionsMenu.find('li').filter(function() {
                return ($(this).text() === "default:multiJoin");
            }).trigger(fakeEvent.click);

            $argSection.find(".addExtraArg").click();
            $argSection.find(".extraArg .arg").eq(0).val("test").trigger("change");
            expect($argSection.find(".extraArg .arg").eq(0).val()).to.equal("test");
            let model = mapOpPanel.model.getModel();
            expect(model.groups[0].args.length).to.equal(2);
            expect(model.groups[0].args[0].value).to.equal("");
            expect(model.groups[0].args[1].value).to.equal("test");

            $argSection.find(".skipField").click();

            expect($argSection.find(".extraArg .arg").eq(0).val()).to.equal("");
            model = mapOpPanel.model.getModel();
            expect(model.groups[0].args.length).to.equal(1);
            expect(model.groups[0].args[0].value).to.equal("");
        });


        it('isNumberInQuotes() should return correctly', function() {
            var func = GeneralOpPanelModel.isNumberInQuotes;
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
            expect(func('"1184166469145378821"')).to.be.true;
        });

        it("function isBoolInQuotes", function() {
            var fn = GeneralOpPanelModel.isBoolInQuotes.bind(GeneralOpPanelModel);
            expect(fn("'true'")).to.be.true;
            expect(fn("'true")).to.be.false;
            expect(fn("\"true\"")).to.be.true;
            expect(fn("\"False\"")).to.be.true;
            expect(fn("\"False")).to.be.false;
            expect(fn("'Falsez'")).to.be.false;
        });


        it ('hasFuncFormat(arg) should return correctly', function() {
            var func = GeneralOpPanelModel.hasFuncFormat;
            expect(func(5543)).to.equal(false);
            expect(func('()')).to.equal(false);
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

        it("check special words", function() {
            var fn = mapOpPanel._getMatchingSpecialWords.bind(mapOpPanel);
            expect(fn("n")).to.deep.equal(["$None","$null"]);
            expect(fn("N")).to.deep.equal(["$None","$null"]);
            expect(fn("nu")).to.deep.equal(["$null"]);
            expect(fn("no")).to.deep.equal(["$None"]);
            expect(fn("c")).to.deep.equal([]);
        });

        it("GeneralOpPanel.checkMatchingBrackets should work", function() {
            // case 1
            var res = GeneralOpPanel.checkMatchingBrackets("(test)").index;
            expect(res).to.equal(-1);
            // case 2
            res = GeneralOpPanel.checkMatchingBrackets("test)").index;
            expect(res).to.equal(4);
            // case 3
            res = GeneralOpPanel.checkMatchingBrackets("(test").index;
            expect(res).to.equal(0);
            // case 4
            res = GeneralOpPanel.checkMatchingBrackets("(())").index;
            expect(res).to.equal(-1);
            // case 5
            res = GeneralOpPanel.checkMatchingBrackets('("(")').index;
            expect(res).to.equal(-1);
            // case 6
            res = GeneralOpPanel.checkMatchingBrackets('(\\")').index;
            expect(res).to.equal(-1);
            // case 7
            res = GeneralOpPanel.checkMatchingBrackets('("\\"(")').index;
            expect(res).to.equal(-1);
            // case 8
            res = GeneralOpPanel.checkMatchingBrackets('("(,\'")').index;
            expect(res).to.equal(-1);
             // case 9
            res = GeneralOpPanel.checkMatchingBrackets('(\'(,"\')').index;
            expect(res).to.equal(-1);
            // case 11
            res = GeneralOpPanel.checkMatchingBrackets('(\'(,")').index;
            expect(res).to.equal(0);
            // case 12
            res = GeneralOpPanel.checkMatchingBrackets('("(,\')').index;
            expect(res).to.equal(0);
            // case 13 - testing nested quotes (xa\xaa\xax)
            res = GeneralOpPanel.checkMatchingBrackets('("\'(\\"\'(\'\\"\'")').index;
            expect(res).to.equal(-1);
        });
    });

    after(function() {
        mapOpPanel.close();
    });
});
