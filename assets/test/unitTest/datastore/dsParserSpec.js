describe("DSParser Test", function() {
    var $formatInput;

    before(function() {
        $formatInput = $("#dsParser .fileFormat input");
    });

    describe("Basic Function Test", function() {
        it("should reset view", function() {
            var $previewContent = $("#dsParser .previewContent");
            $previewContent.text("test html");
            DSParser.__testOnly__.resetView("test");
            expect($previewContent.text()).to.be.empty;
        });
    });

    describe("Format Detection Test", function() {
        var oldPreview;
        var detectFormat;
        var getFormat;

        before(function() {
            oldPreview = XcalarPreview;
            detectFormat = DSParser.__testOnly__.detectFormat;
            getFormat = DSParser.__testOnly__.getFormat;
        });

        it("Should detect xml", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.resolve({
                    "buffer": "<a></a>"
                });
            };

            detectFormat("test")
            .then(function() {
                expect(getFormat()).to.equal("XML");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should detect xml including {", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.resolve({
                    "buffer": "<a></a>{}"
                });
            };

            detectFormat("test")
            .then(function() {
                expect(getFormat()).to.equal("XML");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("Should detect json", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.resolve({
                    "buffer": "[{\"a\": \"b\"}]"
                });
            };

            detectFormat("test")
            .then(function() {
                expect(getFormat()).to.equal("JSON");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should detect part of json", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.resolve({
                    "buffer": "[{\"a\": \"b\""
                });
            };

            detectFormat("test")
            .then(function() {
                expect(getFormat()).to.equal("JSON");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should detect part of json with <", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.resolve({
                    "buffer": "[{\"a\": {\"<b>\": {}}"
                });
            };

            detectFormat("test")
            .then(function() {
                expect(getFormat()).to.equal("JSON");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should detect plain text", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.resolve({
                    "buffer": "<a, {b, b"
                });
            };

            detectFormat("test")
            .then(function() {
                expect(getFormat()).to.equal("PLAIN TEXT");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            XcalarPreview = oldPreview;
        });
    });

    describe("Beautifier Test", function() {
        it("parseNoProtocolPath should work", function() {
            var res = DSParser.__testOnly__.parseNoProtocolPath("/test");
            expect(res).to.equal("file:///test");
        });

        it("parseAppResHelper should work", function() {
            var parseAppResHelper = DSParser.__testOnly__.parseAppResHelper;
            var res = parseAppResHelper('[["test"]]');
            expect(res).to.be.an("object");
            expect(res.out).to.equal("test");

            // case 2
            res = parseAppResHelper('error structure');
            expect(res).to.be.an("object");
            expect(res.error).not.to.be.null;
        });

        it("parseAppRes should work", function() {
            var parseAppRes = DSParser.__testOnly__.parseAppRes;
            // case 1
            var res = parseAppRes({"errStr": '[["error"]]'});
            expect(res).to.be.an("object");
            expect(res.error).to.equal("error");

            // case 2
            res = parseAppRes({"outStr": 'cannot parse'});
            expect(res.error).not.to.be.null;

            // case 3
            res = parseAppRes({"outStr": '[["cannt parse"]]'});
            expect(res.error).not.to.be.null;

            // case 4
            res = parseAppRes({"outStr": '[["{\\"key\\":\\"value\\"}"]]'});
            expect(res.out).to.be.an("object");
            expect(res.out.key).to.equal("value");
        });

        it("beautifier should work", function(done) {
            var oldFunc = XcalarAppExecute;
            XcalarAppExecute = function() {
                return PromiseHelper.resolve({
                    "errStr": '[[""]]',
                    "outStr": '[["{\\"key\\":\\"value\\"}"]]'
                });
            };
            DSParser.__testOnly__.beautifier("test")
            .then(function(out) {
                expect(out).to.be.an("object");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarAppExecute = oldFunc;
            });
        });

        it("beautifier should reject error case", function(done) {
            var oldFunc = XcalarAppExecute;
            XcalarAppExecute = function() {
                return PromiseHelper.resolve({
                    "errStr": '[["error"]]'
                });
            };
            DSParser.__testOnly__.beautifier("test")
            .then(function() {
                done("fail");
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

    describe("Preview Mode Box Test", function() {
        var showPreviewMode;
        var setMeta;
        var oldPreview;
        var $box;

        before(function() {
            showPreviewMode = DSParser.__testOnly__.showPreviewMode;
            setMeta = DSParser.__testOnly__.setMeta;
            oldPreview = XcalarPreview;
            $box = $("#previewModeBox");
            $formatInput.val("JSON");
        });

        it("should handle error case", function(done) {
            setMeta({});
            showPreviewMode()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(ErrTStr.Unknown);
                expect($box.hasClass("error")).to.be.true;
                expect($box.find(".boxBody .content").text()).to.equal(ErrTStr.Unknown);
                done();
            });
        });

        it("should handle promise error", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            setMeta({"meta": {"lineLengths": [0, 200]}});

            showPreviewMode(0, 1, 0)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal("test");
                expect($box.hasClass("error")).to.be.true;
                expect($box.find(".boxBody").text()).to.include("test");
                done();
            });
        });

        it("should show preview mode content", function(done) {
            XcalarPreview = function() {
                return PromiseHelper.resolve({"buffer": "testBuffer"});
            };

            setMeta({"meta": {"lineLengths": [0, 200]}});

            showPreviewMode()
            .then(function() {
                expect($box.hasClass("error")).to.be.false;
                expect($box.find(".boxBody .content").text()).to.equal("testBuffer");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            XcalarPreview = oldPreview;
            DSParser.__testOnly__.resetView();
        });
    });

    describe("Find and Match Tag Test", function() {
        var getRightSelection;
        var setBuffers;

        before(function() {
            getRightSelection = DSParser.__testOnly__.getRightSelection;
            setBuffers = DSParser.__testOnly__.setBuffers;
        });

        it("should get selection for xml", function() {
            $formatInput.val("XML");
            setBuffers(["<a></a>"]);
            var res = getRightSelection(1);
            expect(res).to.be.an("object");
            expect(res.start).to.equal(0);
            expect(res.end).to.equal(3);
            expect(res.tag).to.equal("<a>");
        });

        it("should get selection for json", function() {
            $formatInput.val("JSON");
            setBuffers(["{a:{b:c},d:e}"]);
            var res = getRightSelection(8);
            expect(res).to.be.an("object");
            expect(res.start).to.equal(0);
            expect(res.end).to.equal(1);
            expect(res.tag).to.equal("{");
        });

        it("should get selection for json with [", function() {
            $formatInput.val("JSON");
            setBuffers(["{a:[1,2,3],d:e}"]);
            var res = getRightSelection(3);
            expect(res).to.be.an("object");
            expect(res.start).to.equal(3);
            expect(res.end).to.equal(4);
            expect(res.tag).to.equal("[");
        });

        it("should not get selection for plain text", function() {
            $formatInput.val("PLAIN TEXT");
            var res = getRightSelection(1);
            expect(res).to.be.null;
        });

        after(function() {
            $formatInput.val("");
        });
    });

    describe("Seletecd Key Test", function() {
        var $box;
        var $menu;

        before(function() {
            UnitTest.onMinMode();
            $box = $("#delimitersBox");
            $menu = $("#parserMenu");
        });

        it("should get jsonPath", function() {
            var getJSONPath = DSParser.__testOnly__.getJSONPath;
            DSParser.__testOnly__.setBuffers(["{\"a\": {\"b\": 1}}"]);
            var res = getJSONPath(6);
            expect(res).to.equal("a");
            // case 2
            res = getJSONPath(0);
            expect(res).to.equal("...{");

            // case 3
            DSParser.__testOnly__.setMeta({"startPage": 0});
            DSParser.__testOnly__.setBuffers(["[{\"a\": [{\"b\": {\"c\": 1}}, {\"d\": 2}]}]"]);
            res = getJSONPath(25);
            expect(res).to.equal("a[1]");

            // case 4
            res = getJSONPath(1);
            expect(res).to.equal("...[0]");
        });

        it("should not add key item if option disabled", function() {
            var $li = $menu.find(".full");
            $li.addClass("unavailable");
            $li.click();

            expect($box.find(".key").length).to.equal(0);
            $li.removeClass("unavailable");
        });

        it("should add key item", function() {
            DSParser.__testOnly__.setMeta({
                "startPage": 0,
                "lineLengths": [0]
            });
            $formatInput.val("XML");

            addKeyToBox("<a>", 0);
            var $li = $box.find(".key");
            expect($li.length).to.equal(1);
            expect($li.hasClass("active")).to.be.true;
            expect($li.find(".tag").text()).to.equal("<a>");
            expect($li.find(".type").text()).to.equal("full");
        });

        it("should not add the same key", function() {
            $box.find(".key.active").removeClass("active");
            addKeyToBox("<a>", 0);
            var $li = $box.find(".key");
            expect($li.length).to.equal(1);
            expect($li.hasClass("active")).to.be.true;

            $menu.removeData("tag");
            $menu.removeData("end");
        });

        it("should focus on key", function() {
            var $li = $box.find(".key.active");
            $li.removeClass("active");
            $li.click();
            expect($li.hasClass("active")).to.be.true;
        });

        it("should remove key", function() {
            var $li = $box.find(".key");
            $li.find(".remove").click();
            expect($box.find(".key").length).to.equal(0);
        });

        after(function() {
            DSParser.__testOnly__.resetView();
            UnitTest.offMinMode();
        });
    });

    describe("Submit Form Test", function() {
        var submitForm;
        var oldAppExecute;
        var oldUpload;
        var oldRefresh;
        var oldBack;

        before(function() {
            submitForm = DSParser.__testOnly__.submitForm;
            DSParser.__testOnly__.setMeta({
                "startPage": 0,
                "lineLengths": [0]
            });

            oldAppExecute = XcalarAppExecute;
            oldUpload = XcalarUploadPython;
            oldRefresh = UDF.refresh;
            oldBack = DSPreview.backFromParser;

            UDF.refresh = XcalarUploadPython = function() {
                return PromiseHelper.resolve();
            };

            UnitTest.onMinMode();
        });

        it("should handle fail case", function(done) {
            submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("invalid submit");
                done();
            });
        });

        it("should show alert", function(done) {
            $formatInput.val("XML");
            addKeyToBox("<a>", 0);
            var promise = submitForm();
            UnitTest.hasAlertWithText(DSParserTStr.SubmitMsg);

            promise
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal("cancel submit");
                done();
            });
        });

        it("should handle parse error", function(done) {
            $formatInput.val("JSON");
            XcalarAppExecute = function() {
                return PromiseHelper.resolve({
                    "errStr": '[["test"]]',
                    "outStr": '[["{\\"key\\":\\"value\\"}"]]'
                });
            };

            var promise = submitForm();
            UnitTest.hasAlertWithText(DSParserTStr.SubmitMsg, {
                "confirm": true,
                "nextAlert": true
            });

            promise
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal("test");
                UnitTest.hasAlertWithText("test");
                done();
            });
        });

        it("should submit the form", function(done) {
            var test = false;

            XcalarAppExecute = function() {
                return PromiseHelper.resolve({
                    "errStr": '[[""]]',
                    "outStr": '[["{\\"key\\":\\"value\\"}"]]'
                });
            };

            DSPreview.backFromParser = function() {
                test = true;
            };

            var promise = submitForm();
            UnitTest.hasAlertWithText(DSParserTStr.SubmitMsg, {
                "confirm": true,
                "nextAlert": true
            });

            promise
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            DSParser.__testOnly__.resetView();
            XcalarAppExecute = oldAppExecute;
            XcalarUploadPython = oldUpload;
            UDF.refresh = oldRefresh;
            DSPreview.backFromParser = oldBack;
            UnitTest.onMinMode();
        });
    });

    describe("Behavior Test", function() {
        var $mainTabCache;
        var $card;

        before(function() {
            $mainTabCache = $(".topMenuBarTab.active");
            $("#dataStoresTab").click();
            UnitTest.onMinMode();

            $card = $("#dsParser");
        });

        it("should show parser", function(done) {
            var url = "nfs:///netstore/datasets/dsParser/Sample_JSON_-_Ugly.json";
            DSParser.show(url)
            .then(function() {
                assert.isTrue($card.is(":visible"));
                expect($card.find(".totalRows").text()).to.equal("of 540");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // XXX this tirgger checkIfScrolled but don't trigger checkIfNeedFetch
        it("should scroll to fetch new rows", function(done) {
            // scroll to the very bottom
            var scrollHeight = $card.find(".dataPreview")[0].scrollHeight;
            var meta = DSParser.__testOnly__.getMeta();
            var previewCalled = false;
            var cached = XcalarPreview;
            XcalarPreview = function(url, fileNamePattern, isRecur, numBytes, offset) {
                expect(offset).to.equal(meta.lineLengths[meta.lineLengths.length - 1]);
                previewCalled = true;
                return PromiseHelper.reject();
            };

            $card.find(".dataPreview").scrollTop(scrollHeight);

            var checkFunc = function() {
                return previewCalled;
            };

            UnitTest.timeoutPromise(1)
            .then(function() {
                return UnitTest.testFinish(checkFunc);
            })
            .then(function() {
                expect(previewCalled).to.be.true;
                expect($("#parserRowInput").val()).not.to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = cached;
            });
        });

        it("fetchRows() should work", function(done) {
            var previewCalled = false;
            var cached = XcalarPreview;
            XcalarPreview = function(url, fileNamePattern, isRecur, numBytes, offset) {
                previewCalled = true;
                expect(numBytes).to.equal(100);
                return PromiseHelper.reject();
            };
            var meta = {numChar: 500,
                        endPage: 0,
                        lineLengths: [0, 100, 200, 300, 400]
                    };
            DSParser.__testOnly__.fetchRows(meta, 200)
            .then(function() {
                expect(previewCalled).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = cached;
            });
        });

        it("should use input to skip to row", function(done) {
            $("#parserRowInput").val(100).trigger(fakeEvent.enter);
            expect($card.hasClass("fetchingRows")).to.be.true;
            var checkFunc = function() {
                return !$card.hasClass("fetchingRows");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($card.find(".dataPreview").scrollTop())
                .to.above(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("addContent should work", function() {
            $("#dsParser").find(".fileFormat").find("input").val("XML");
            var prevBuffers = DSParser.__testOnly__.getBuffers();
            var buffers = ["a", "b"];
            DSParser.__testOnly__.setBuffers(buffers);
            var html = '<div>' +
                            '<div class="content">' +
                                '<span class="page" data-page="1">a</span>' +
                                '<span class="page" data-page="2">b</span>' +
                            '</div>' +
                        '</div>';

            var $preview = $(html);
            var meta = {startPage: 1, endPage: 2, meta: {}};
            DSParser.__testOnly__.addContent("some text", $preview, meta);
            expect(meta.startPage).to.equal(2);
            expect(meta.endPage).to.equal(3);
            expect($preview.text()).to.equal("bsome text");
            expect($preview.find(".page").length).to.equal(2);
            expect($preview.find(".page").eq(0).data("page")).to.equal(2);
            expect($preview.find(".page").eq(1).data("page")).to.equal(3);
            expect(buffers.length).to.equal(2);
            expect(buffers[0]).to.equal("b");
            expect(buffers[1]).to.equal("some text");

            DSParser.__testOnly__.setBuffers(prevBuffers);
            $("#dsParser").find(".fileFormat").find("input").val("JSON");
        });

        it("box fullscreen should work", function() {
            var $box = $("#previewModeBox");
            var $parserCard = $("#dsParser");
            expect($box.outerWidth()).to.be.lt(301);
            expect($box.outerHeight()).to.be.lt(301);
            $box.find(".resize").click();
            expect($box.outerWidth()).to.be.gt(301);
            expect($box.outerHeight()).to.be.gt(301);
            expect($box.outerWidth()).to.equal($parserCard.find(".cardMain").width());
            expect($box.outerHeight()).to.equal($parserCard.find(".cardMain").height());
        });

        it("box minimize should work", function() {
            var $box = $("#previewModeBox");
            expect($box.outerWidth()).to.be.gt(301);
            expect($box.outerHeight()).to.be.gt(301);
            $box.find(".resize").click();
            expect($box.outerWidth()).to.be.lt(301);
            expect($box.outerHeight()).to.be.lt(301);
        });

        it("box header click should work", function() {
            var $box = $("#previewModeBox");
            expect($box.find(".boxHeader").length).to.equal(1);
            expect($box.hasClass("minimized")).to.be.false;
            expect($box.outerHeight()).to.be.gt(50);

            $box.find(".boxHeader").click();
            expect($box.hasClass("minimized")).to.be.true;
            expect($box.outerHeight()).to.be.lt(50);

            $box.find(".boxHeader").click();
            expect($box.hasClass("minimized")).to.be.false;
            expect($box.outerHeight()).to.be.gt(50);

            $box.addClass("maximized");
            $box.find(".boxHeader").click();
            expect($box.hasClass("minimized")).to.be.false;
            expect($box.outerHeight()).to.be.gt(50);

            $box.removeClass("maximized");
        });

        it("plain text line delim should work", function() {
            var $input = $("#plainTextBox").find("input");
            var $lis = $("#plainTextBox").find(".dropDownList").find("li")
            $lis.eq(1).trigger(fakeEvent.mouseup);
            expect($input.val()).to.equal("Null");

            $lis.eq(0).trigger(fakeEvent.mouseup);
            expect($input.val()).to.equal("\\n");
        });

        it("mousedown selecting text should open menu", function(done) {
            var cached = xcHelper.dropdownOpen;
            var opened = false;
            xcHelper.dropdownOpen = function($target, $menu) {
                expect($menu.data().tag).to.equal("{");
                expect($menu.data().end).to.equal(3806);
                opened = true;
            };

            UnitTest.timeoutPromise(1)
            .then(function() {
                $("#dsParser .previewContent").mouseup();
                return UnitTest.timeoutPromise(1);
            })
            .then(function() {
                // not sure why this element doesn't exists sometimes when it should
                var checkFunc = function() {
                    return ($("#dsParser .page[data-page='1']").find(".line").length &&
                           $("#dsParser .page[data-page='1']").find(".line")[2] != null);
                };
                return UnitTest.testFinish(checkFunc);
            })
            .then(function() {
                expect(opened).to.be.false;
                // select { on 3rd line of page1
                var range = document.createRange();
                range.setStart($("#dsParser .page[data-page='1']").find(".line")[2].childNodes[0], 14);
                range.setEnd($("#dsParser .page[data-page='1']").find(".line")[2].childNodes[0], 15);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

                $("#dsParser .previewContent").mouseup();
                return UnitTest.timeoutPromise(1);
            })
            .then(function() {
                expect(opened).to.be.true;
                xcHelper.dropdownOpen = cached;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should closes the parser", function() {
            $card.find(".close").click();
            assert.isFalse($card.is(":visible"));
        });

        after(function() {
            DSForm.show();
            $mainTabCache.click();
            UnitTest.offMinMode();
        });
    });

    function addKeyToBox(tag, end) {
        var $menu = $("#parserMenu");
        $menu.data("tag", tag);
        $menu.data("end", end);

        $menu.find(".full").click();
        $menu.removeData("tag");
        $menu.removeData("end");
    }
});