describe("Ephemeral Constructor Test", function() {
    function timeoutPromise(timeTmp) {
        var time = timeTmp || 200;
        var deferred = PromiseHelper.deferred();
        setTimeout(function() {
            deferred.resolve();
        }, time);
        return deferred;
    }

    describe("XcMap Test", function() {
        it("Should be a map", function() {
            var map = new XcMap();
            expect(map.entries()).to.be.an("object");
            expect(map.has("a")).to.be.false;
            map.set("a", "item1");
            expect(map.has("a")).to.be.true;
            map.delete("a");
            expect(map.has("a")).to.be.false;

            map.set("b", "item2");
            expect(map.has("b")).to.be.true;

            map.clear();
            expect(map.has("b")).to.be.false;
        });
    });

    describe("Mutex Constructor Test", function() {
        it("should have 2 attributes", function() {
            var scope = XcalarApiKeyScopeT.XcalarApiKeyScopeSession;
            var mutex = new Mutex("key", scope);
            expect(mutex).to.be.instanceof(Mutex);
            expect(Object.keys(mutex).length).to.equal(2);

            expect(mutex.key).to.equal("key");
            expect(mutex.scope).to.equal(scope);
        });

        it("should accept null value", function() {
            var mutex = new Mutex();
            expect(mutex.key).not.to.be.null;
            expect(mutex.scope)
            .to.equal(XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal);
        });
    });

    describe("WKBKSet Constructor Test", function() {
        var wkbkSet;
        var wkbk;

        before(function() {
            wkbkSet = new WKBKSet();
        });

        it("Should be a WKBKSet", function() {
            expect(wkbkSet).to.be.instanceof(WKBKSet);
        });

        it("Should put workbook", function() {
            wkbk = new WKBK({
                "name": "test",
                "id": "testId"
            });

            wkbkSet.put("testId", wkbk);
            expect(wkbkSet.getAll()).be.have.property("testId");
        });

        it("Should get workbook", function() {
            expect(wkbkSet.get("testId")).to.equal(wkbk);
        });

        it("Should know if has workbook", function() {
            expect(wkbkSet.has("testId")).to.be.true;
            expect(wkbkSet.has("errorId")).to.be.false;
        });

        it("Should getWithStringify", function() {
            expect(wkbkSet.getWithStringify().indexOf("testId") >= 0)
            .to.be.true;
        });

        it("Should delete workbook", function() {
            wkbkSet.delete("testId");
            expect(wkbkSet.has("testId")).to.be.false;
        });
    });

    describe("MouseEvents Constructor Test", function() {
        it("MouseEvents should be a constructor", function() {
            var mouseEvent = new MouseEvents();
            var $target = $('<div id="test"></div>');
            expect(mouseEvent.getLastClickTarget()).not.to.equal($target);
            expect(mouseEvent.getLastMouseDownTarget()).not.to.equal($target);

            mouseEvent.setClickTarget($target);
            expect(mouseEvent.getLastClickTarget()).to.equal($target);

            mouseEvent.setMouseDownTarget(null);
            expect(mouseEvent.getLastMouseDownTarget().length).to.equal(0);

            mouseEvent.setMouseDownTarget($target);
            expect(mouseEvent.getLastMouseDownTarget()).to.equal($target);
            expect(mouseEvent.getLastMouseDownTime()).to.be.a("number");
            expect(mouseEvent.getLastMouseDownParents().length).to.equal(0);
        });

        it("Should set and get multiple mouse down target", function() {
            var mouseEvent = new MouseEvents();
            var mouseDownTargets = mouseEvent.getLastMouseDownTargets();
            expect(mouseDownTargets).to.be.an("array");
            expect(mouseDownTargets.length).to.equal(1);
            for (var i = 1; i <= 3; i++) {
                var $target = $('<div id="test' + i + '"></div>');
                mouseEvent.setMouseDownTarget($target);
                // upto 3
                var len = Math.min(3, i + 1);
                expect(mouseDownTargets.length).to.equal(len);
            }
        });
    });

    describe("DSFormAdvanceOption Constructor Test", function() {
        var advanceOption;
        var $section;
        var $pattern;
        var test = false;

        before(function() {
            var html =
            '<section>' +
                '<div class="listInfo no-selection">' +
                    '<span class="expand"></span>' +
                '</div>' +
                '<ul>' +
                    '<li class="pattern option">' +
                        '<input type="text" class="input">' +
                        '<div class="recursive checkboxSection">' +
                            '<div>Recursive</div>' +
                            '<div class="checkbox"></div>' +
                        '</div>' +
                        '<div class="regex checkboxSection">' +
                            '<div>Regex</div>' +
                            '<div class="checkbox"></div>' +
                        '</div>' +
                    '</li>' +
                '</ul>' +
            '</section>';
            $section = $(html);
            $pattern = $section.find(".option.pattern");
        });

        it("Should be a valid constructor", function() {
            advanceOption = new DSFormAdvanceOption($section, {
                "container": "body",
                "onOpenList": function() { test = true; }
            });
            expect(advanceOption).to.be.an("object");
            expect(Object.keys(advanceOption).length).to.equal(2);

            expect(advanceOption).to.have.property("$section");
            expect(advanceOption).to.have.property("options");
        });

        it("Should have valid event", function() {
            // expand
            $section.find(".listInfo .expand").click();
            expect($section.hasClass("active")).to.be.true;
            expect(test).to.be.true;

            // checkbox
            $pattern.find(".recursive.checkboxSection").click();
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.true;
        });

        it("Should reset options", function() {
            advanceOption.reset();
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.false;
        });

        it("Should set options", function() {
            advanceOption.set({
                "pattern": "testPattern",
                "isRecur": true,
                "isRegex": true
            });

            expect($pattern.find("input").val()).to.equal("testPattern");
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.true;
            expect($pattern.find(".regex .checkbox").hasClass("checked"))
            .to.be.true;
        });

        it("Should get args", function() {
            advanceOption.reset();

            advanceOption.set({
                "pattern": "testPattern",
                "isRecur": true,
                "isRegex": true
            });

            var res = advanceOption.getArgs();
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).to.equal(3);

            expect(res).to.have.property("pattern")
            .and.to.equal("testPattern");

            expect(res).to.have.property("isRecur")
            .and.to.be.true;

            expect(res).to.have.property("isRegex")
            .and.to.be.true;
        });
    });

    describe("DSFormController Constructor Test", function() {
        it("DSFormController Should be a constructor", function() {
            var controller = new DSFormController();
            expect(controller).to.be.an("object");
            expect(Object.keys(controller).length).to.equal(0);

            controller.set({
                "targetName": "testTarget",
                "path": "testPath",
                "format": "testFormat"
            });

            expect(controller.getTargetName()).to.equal("testTarget");
            expect(controller.getPath()).to.equal("testPath");
            expect(controller.getFormat()).to.equal("testFormat");

            // set format
            controller.setFormat("testFormat2");
            expect(controller.getFormat()).to.equal("testFormat2");

            // set header
            controller.setHeader(false);
            expect(controller.useHeader()).to.be.false;

            controller.setHeader();
            expect(controller.useHeader()).to.be.true;

            // set field delim
            controller.setFieldDelim(",");
            expect(controller.getFieldDelim()).to.be.equal(",");

            // set line delim
            controller.setLineDelim("\n");
            expect(controller.getLineDelim()).to.be.equal("\n");

            // set quote
            controller.setQuote("\'");
            expect(controller.getQuote()).to.be.equal("\'");

            // set and get preview file
            controller.setPreviewFile("testFile");
            expect(controller.getPreviewFile()).to.equal("testFile");

            controller.reset();
            expect(Object.keys(controller).length).to.equal(6);
            expect(controller.getTargetName()).to.equal("testTarget");
            expect(controller.getFieldDelim()).to.equal("");
            expect(controller.getLineDelim()).to.equal("\n");
            expect(controller.useHeader()).to.be.false;
            expect(controller.getQuote()).to.equal("\"");
            expect(controller.getPreviewFile()).to.be.null;
            expect(controller.getArgStr())
            .to.equal('{"targetName":"testTarget","hasHeader":false,"fieldDelim":"","lineDelim":"\\n","quote":"\\""}');
        });
    });

    describe("WorksheetScrollTracker Constructor Test", function() {
        it("WorksheetScrollTracker Should be a constuctor", function() {
            var scrollTracker = new WorksheetScrollTracker();

            expect(scrollTracker).to.be.an("object");
            expect(Object.keys(scrollTracker).length).to.equal(1);

            // cahce and restore
            scrollTracker.cache("test");
            var res = scrollTracker.restore("test");
            expect(res == null).to.be.false;
            // case 2
            res = scrollTracker.restore("test2");
            expect(res == null).to.be.true;
        });
    });

    describe("Corrector Constructor Test", function() {
        it("Corrector Should work", function() {
            var corrector = new Corrector(["test", "yelp", "hello"]);
            expect(corrector.correct("ylp")).to.equal("yelp");
            expect(corrector.suggest("ylp")).to.equal("yelp");
            expect(corrector.suggest("t")).to.equal("test");
        });
    });

    describe("Searchbar test", function() {
        var searchHelper;
        var $searchArea;
        var $input;

        before(function() {
            var html = '<div id="unitTestSearchWrap" class="slidingSearchWrap">' +
                        '<div id="unitTestSearch" class="searchbarArea closed">' +
                          '<i class="icon searchIcon xi-search"></i>' +
                          '<input type="text" spellcheck="false">' +
                          '<div class="closeBox iconWrap">' +
                            '<i class="icon xi-cancel"></i>' +
                          '</div>' +
                          '<div class="counter">' +
                            '<span class="position"></span>' +
                            '<span class="total"></span>' +
                          '</div>' +
                          '<div class="arrows">' +
                            '<div class="upArrow iconWrap">' +
                              '<i class="icon xi-up"></i>' +
                            '</div>' +
                            '<div class="downArrow iconWrap">' +
                              '<i class="icon xi-down"></i>' +
                            '</div>' +
                          '</div>' +
                        '</div>' +
                        '<ul id="unitTestUl">' +
                            '<li>test</li>' +
                            '<li>text</li>' +
                            '<li>word</li>' +
                        '</ul>' +
                        '</div>';
            $("body").append(html);
            $searchArea = $("#unitTestSearch");
            $input = $searchArea.find("input");
            searchHelper = new SearchBar($searchArea, {
                "removeSelected": function() {
                    $("#unitTestUl").find('.selected').removeClass('selected');
                },
                removeHighlight: true,
                $list: $("#unitTestUl")
            });
        });

        it("searchHelper update results should work", function() {
            var val = "te";
            $input.val(val);
            expect(true).to.be.true;
            var regex = new RegExp(val, "gi");
            $("#unitTestUl").find("li").each(function() {
                var text = $(this).text();
                if (text.indexOf(val) > -1) {
                    text = text.replace(regex, function(match) {
                        return ('<span class="highlightedText">' +
                                    match +
                                '</span>');
                    });
                    $(this).html(text);
                }
            });
            var $matches = $("#unitTestUl").find(".highlightedText");
            searchHelper.updateResults($matches);
            expect($matches.eq(0).hasClass("selected")).to.be.true;
            expect($matches.eq(1).hasClass("selected")).to.be.false;
        });

        it("keyboard events should work", function() {
            var $matches = $("#unitTestUl").find(".highlightedText");
            expect($searchArea.find(".counter").text()).to.equal("1of 2");

            // down
            var e = {
                type: "keydown",
                which: keyCode.Down
            };

            $input.trigger(e);
            expect($matches.eq(0).hasClass("selected")).to.be.false;
            expect($matches.eq(1).hasClass("selected")).to.be.true;
            expect($searchArea.find(".counter").text()).to.equal("2of 2");

            $input.trigger(e);
            expect($matches.eq(0).hasClass("selected")).to.be.true;
            expect($matches.eq(1).hasClass("selected")).to.be.false;
            expect($searchArea.find(".counter").text()).to.equal("1of 2");

            // enter(down)
            e = {
                type: "keydown",
                which: keyCode.Down
            };

            $input.trigger(e);
            expect($matches.eq(0).hasClass("selected")).to.be.false;
            expect($matches.eq(1).hasClass("selected")).to.be.true;
            expect($searchArea.find(".counter").text()).to.equal("2of 2");

            $input.trigger(e);
            expect($matches.eq(0).hasClass("selected")).to.be.true;
            expect($matches.eq(1).hasClass("selected")).to.be.false;
            expect($searchArea.find(".counter").text()).to.equal("1of 2");

            // up
            e = {
                type: "keydown",
                which: keyCode.Up
            };

            $input.trigger(e);
            expect($matches.eq(0).hasClass("selected")).to.be.false;
            expect($matches.eq(1).hasClass("selected")).to.be.true;
            expect($searchArea.find(".counter").text()).to.equal("2of 2");

            $input.trigger(e);
            expect($matches.eq(0).hasClass("selected")).to.be.true;
            expect($matches.eq(1).hasClass("selected")).to.be.false;
            expect($searchArea.find(".counter").text()).to.equal("1of 2");
        });

        it("arrow keys should work", function() {
            var $matches = $("#unitTestUl").find(".highlightedText");
            $searchArea.find(".upArrow").click();
            expect($matches.eq(0).hasClass("selected")).to.be.false;
            expect($matches.eq(1).hasClass("selected")).to.be.true;
            expect($searchArea.find(".counter").text()).to.equal("2of 2");

            $searchArea.find(".upArrow").click();
            expect($matches.eq(0).hasClass("selected")).to.be.true;
            expect($matches.eq(1).hasClass("selected")).to.be.false;
            expect($searchArea.find(".counter").text()).to.equal("1of 2");

            $searchArea.find(".downArrow").click();
            expect($matches.eq(0).hasClass("selected")).to.be.false;
            expect($matches.eq(1).hasClass("selected")).to.be.true;
            expect($searchArea.find(".counter").text()).to.equal("2of 2");

            $searchArea.find(".downArrow").click();
            expect($matches.eq(0).hasClass("selected")).to.be.true;
            expect($matches.eq(1).hasClass("selected")).to.be.false;
            expect($searchArea.find(".counter").text()).to.equal("1of 2");
        });

        it("clear search should work", function() {
            var $matches = $("#unitTestUl").find(".highlightedText");
            expect($searchArea.find(".counter").text()).to.equal("1of 2");
            expect($matches.length).to.equal(2);

            searchHelper.clearSearch();

            $matches = $("#unitTestUl").find(".highlightedText");
            expect($searchArea.find(".counter").text()).to.equal("");
            expect($matches.length).to.equal(0);
        });

        it("slider should work", function() {
            $searchArea.find(".searchIcon").click();
            expect($searchArea.hasClass("closed")).to.be.false;

            $searchArea.find(".searchIcon").click();
            expect($searchArea.hasClass("closed")).to.be.true;
        });

        after(function() {
            $("#unitTestSearchWrap").remove();
        });
    });

    describe("ModalHelper Constructor Test", function() {
        var $fakeModal;
        var modalHelper;
        before(function() {
            UnitTest.onMinMode();
            var html =
            '<div id="fakeModalInst" class="modalContainer">' +
                '<header class="modalHeader">' +
                    '<div class="headerBtn exitFullScreen">' +
                        '<i class="icon xi-exit-fullscreen">::before</i>' +
                    '</div>' +
                    '<div class="headerBtn fullScreen">' +
                        '<i class="icon xi-fullscreen">::before</i>' +
                    '</div>' +
                    '<div class="close">' +
                        '<i class="icon xi-close">::before</i>' +
                    '</div>' +
                '</header>' +
                '<section class="modalMain">' +
                    '<input id="fakeInput" class="focusable" style="width:34px;">' +
                    '<button id="fakeButton" class="btn focusable">hehe</button>' +
                '</section>' +
            '</div>';
            $fakeModal = $(html);
            $("#container").append($fakeModal);
        });

        it("ModalHelper should be constructor", function (){
            modalHelper = new ModalHelper($fakeModal, {});
            $fakeModal.modalHelper = modalHelper;

            $fakeModal.on("click", ".close", function() {modalHelper.clear();});
            expect(modalHelper.id).to.equal("fakeModalInst");
        });
        it("ModalHelper setup should work", function(done) {
            modalHelper.setup();
            timeoutPromise()
            .then(function() {
                expect($fakeModal.is(":visible")).to.be.true;
                done();
            });
        });
        it("ModalHelper clear should work", function() {
            modalHelper.clear();
            expect($fakeModal.is(":visible")).to.be.false;
        });
        it("ModalHelper toggleBG should work", function(done) {
            var $modalBackground = $("#modalBackground");
            modalHelper.setup();
            expect($fakeModal.is(":visible")).to.be.true;
            modalHelper.toggleBG("all", false);
            timeoutPromise()
            .then(function() {
                expect($modalBackground.hasClass("light")).to.be.true;
                modalHelper.toggleBG("all", true);
                return timeoutPromise(500);
            })
            .then(function() {
                expect($modalBackground.hasClass("light")).to.be.false;
                modalHelper.toggleBG("all", false);
                return timeoutPromise();
            })
            .then(function() {
                expect($modalBackground.hasClass("light")).to.be.true;
                done();
            });
        });
        it("ModalHelper waitingBG should work", function() {
            modalHelper.addWaitingBG();
            expect($("#modalWaitingBG").length).above(0);
            expect($("#modalWaitingBG .waitingIcon").is(":visible")).to.be.true;
            modalHelper.removeWaitingBG();
            expect($("#modalWaitingBG").length).to.equal(0);
            expect($("#modalWaitingBG .waitingIcon").is(":visible")).to.be.false;
        });
        // TODO: unskip when below issue resolved
        it("ModalHelper tabbing should work", function(done) {
            expect($fakeModal.find(":focus").length).to.equal(0);
            var tabEvent = jQuery.Event("keydown");
            tabEvent.which = keyCode.Tab;
            $fakeModal.trigger(tabEvent);
            setTimeout(function() {
                // TODO: uncomment & unskip when focus issue resolved.
                // Problem: focus will not trigger when in different window
                // expect($fakeModal.find(":focus").length).to.equal(1);
                done();
            },200);
        });
        it("ModalHelper esc should exit", function(done) {
            var escEvent = jQuery.Event("keydown");
            escEvent.which = keyCode.Escape;
            $fakeModal.trigger(escEvent);
            setTimeout(function() {
                expect($fakeModal.is(":visible")).to.be.false;
                done();
            },200);
        });
        after(function() {
            // Why is the following line not done in clear?
            $("#mainFrame").removeClass('modalOpen');
            $("#fakeModalInst").remove();
            UnitTest.offMinMode();
        });
    });

    describe("ExportHelper Constructor Test", function() {
        var $view;
        var exportHelper;

        before(function() {
            var fakeHtml =
            '<div id="unitst-view" class="mainContent">' +
                '<div class="columnsToExport">' +
                    '<ul class="cols">' +
                        '<li class="checked">' +
                            '<span class="text">user::user_id</span>' +
                        '</li>' +
                        '<li class="checked">' +
                            '<span class="text">reviews::user_id</span>' +
                       '</li>' +
                       '<li class="checked">' +
                            '<span class="text">reviews::test</span>' +
                       '</li>' +
                    '</ul>' +
                '</div>' +
                '<div class="renameSection xc-hidden">' +
                    '<div class="renamePart"></div>' +
                '</div>' +
            '</div>';

            $view = $(fakeHtml).appendTo("body");
        });

        it("Should have staic getTableCols method", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "test",
                "isNewCol": false,
                "type": "string",
                "func": {
                    "name": "pull"
                }
            });

            var tableId = "unitTest-exportHelper";
            var table = new TableMeta({
                "tableName": "test#" + tableId,
                "tableId": tableId,
                "tableCols": [progCol],
                "isLocked": false
            });

            gTables[tableId] = table;

            // case 1
            var validTypes = ["string"];
            var html = ExportHelper.getTableCols(tableId, validTypes);
            var $ele = $(html);
            expect($ele.find(".text").text()).to.equal("test");

            // case 2
            validTypes = ["integer"];
            html = ExportHelper.getTableCols(tableId, validTypes);
            $ele = $(html);
            expect($ele.find(".text").length).to.equal(0);

            delete gTables[tableId];
        });

        it("Should create exportHelper", function() {
            exportHelper = new ExportHelper($view);
            exportHelper.setup();

            expect(exportHelper).to.be.an("object");
            expect(Object.keys(exportHelper).length).to.equal(1);
            expect(exportHelper.$view).to.equal($view);
        });

        it("Should get export columns", function() {
            var exportColumns = exportHelper.getExportColumns();
            expect(exportColumns).to.be.an("array");
            expect(exportColumns.length).to.equal(3);
            expect(exportColumns[0]).to.equal("user::user_id");
            expect(exportColumns[1]).to.equal("reviews::user_id");
            expect(exportColumns[2]).to.equal("reviews::test");
        });

        it("Should not pass name check with invalid arg", function() {
            // error case
            var exportColumns = exportHelper.checkColumnNames();
            expect(exportColumns).to.be.null;
        });

        it("Should pass name check with valid names", function() {
            var exportColumns = exportHelper.checkColumnNames(["a", "b", "c"]);
            expect(exportColumns).to.be.an("array");
            expect(exportColumns.length).to.equal(3);
            expect(exportColumns[0]).to.equal("a");
            expect(exportColumns[1]).to.equal("b");
            expect(exportColumns[2]).to.equal("c");
        });

        it("Should check the conflict of column names", function() {
            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);
            expect(exportColumns).to.be.null;

            var $renameSection = $view.find(".renameSection");
            var $renames = $renameSection.find(".rename");
            expect($renameSection.hasClass("xc-hidden")).to.be.false;
            expect($renames.length).to.equal(2);
            expect($renames.eq(0).find(".origName").val())
            .to.equal("user::user_id");
            expect($renames.eq(1).find(".origName").val())
            .to.equal("reviews::user_id");
        });

        it("Should check empty rename", function() {
            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);
            expect(exportColumns).to.be.null;

            assert.isTrue($("#statusBox").is(":visible"));
            assert.equal($("#statusBox .message").text(), ErrTStr.NoEmpty);
            StatusBox.forceHide();
            assert.isFalse($("#statusBox").is(":visible"));
        });

        it("Should check name conflict", function() {
            var $renames = $view.find(".rename");
            $renames.eq(0).find(".newName").val("user_id");
            $renames.eq(1).find(".newName").val("user_id");

            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);
            expect(exportColumns).to.be.null;

            assert.isTrue($("#statusBox").is(":visible"));
            assert.equal($("#statusBox .message").text(), ErrTStr.NameInUse);
            StatusBox.forceHide();
            assert.isFalse($("#statusBox").is(":visible"));
        });

        it("Should smartly rename", function() {
            var $renames = $view.find(".rename");
            $renames.eq(0).find(".renameIcon").click();
            $renames.eq(1).find(".renameIcon").click();

            expect($renames.eq(0).find(".newName").val())
            .to.equal("user-user_id");
            expect($renames.eq(1).find(".newName").val())
            .to.equal("reviews-user_id");
        });

        it("Should pass name check after rename", function() {
            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);

            expect(exportColumns).to.be.an("array");
            expect(exportColumns.length).to.equal(3);
            expect(exportColumns[0]).to.equal("user-user_id");
            expect(exportColumns[1]).to.equal("reviews-user_id");
            expect(exportColumns[2]).to.equal("test");
        });

        it("Show Helper should work", function() {
            $("#container").prepend('<div class="xcTableWrap" ' +
                                    'id="unitTestTable"></div>');
            expect($(".xcTableWrap.exportMode").length).to.equal(0);
            exportHelper.showHelper();
            expect($(".xcTableWrap.exportMode").length).to.be.gte(1);
        });

        it("Should clear the helper", function() {
            expect($(".xcTableWrap.exportMode").length).to.be.gte(1);
            exportHelper.clear();
            var $renameSection = $view.find(".renameSection");
            expect($renameSection.hasClass("xc-hidden")).to.be.true;
            expect($renameSection.find(".rename").length).to.equal(0);
            expect($(".xcTableWrap.exportMode").length).to.equal(0);
            $("#unitTestTable").remove();
        });

        after(function() {
            $view.remove();
        });
    });

    describe("FormHelper Constructor Test", function() {
        var testDs;
        var tableName;
        var tableId;
        var $table;
        var formHelper;

        before(function(done) {
            var testDSObj = testDatasets.fakeYelp;
            UnitTest.addAll(testDSObj, "unitTestFakeYelp")
            .always(function(ds, tName) {
                testDs = ds;
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                $table = $("#xcTable-" + tableId);

                done();
            });
        });

        it("formHelper columnPicker should work", function() {
            var colPickerCallBackTriggered = false;
            var columnPicker = {
                "state": "testState",
                "validColTypes": ["float"],
                "colCallback": function() {
                    colPickerCallBackTriggered = true;
                }
            };
            formHelper = new FormHelper($(), {"columnPicker": columnPicker});

            // initial state
            expect($(".xcTableWrap.columnPicker").length).to.equal(0);
            expect($("#container.columnPicker").length).to.equal(0);
            expect($("#container.testState").length).to.equal(0);

            formHelper.setup(); // activate

            expect($(".xcTableWrap.columnPicker").length).to.be.gt(0);
            expect($("#container.columnPicker.testState").length).to.equal(1);
            expect($table.find("th.col1 .header").hasClass("noColumnPicker")).to.be.false;
            expect($table.find("th.col2 .header").hasClass("noColumnPicker")).to.be.true;
            var $colHead = $table.find("th.col2 .header");
            expect($colHead.attr("data-original-title").indexOf("Cannot") > -1).to.be.true;
            expect($colHead.attr("data-original-title").indexOf("objects") > -1).to.be.true;

            // click on object column
            $table.find("th.col2 .header").trigger("click");
            expect(colPickerCallBackTriggered).to.be.false;

            // click on boolean column
            $table.find("th.col1 .header").trigger("click");
            expect(colPickerCallBackTriggered).to.be.true;
        });

        it("formHelper clear should work", function() {
            expect($table.find(".header.noColumnPicker").length).to.be.gt(2);
            formHelper.clear();
            expect($table.find(".header.noColumnPicker").length).to.equal(0);
            var $colHead = $table.find("th.col2 .header");
            expect($colHead.attr("data-original-title")).to.be.undefined;
        });

        after(function(done) {
            UnitTest.deleteAll(tableName, testDs)
            .always(function() {
                done();
            });
        });
    });


    describe("Rangeslider Constructor Test", function() {
        this.timeout(200000);
        // TODO: ensure that .slider itself is being updated
        var $rangeSliderWrap;
        var randPrefName;
        var USSetPrefCached;
        var curVal;

        before(function() {
            randPrefName = "RANDPREFNAME";
            USSetPrefCached = UserSettings.setPref;
            UserSettings.setPref = function(pref, val) {
                if (pref === randPrefName) {
                    curVal = val;
                }
            };
            var html =
            '<div id="testSlider" class="optionSelector rangeSliderWrap">' +
                '<div class="rangeSlider" style="width:275px;">' +
                    '<div class="leftArea">' +
                        '::before' +
                        '<div class="slider"></div>' +
                    '</div>' +
                    '<div class="rightArea">' +
                        '::before' +
                    '</div>' +
                '</div>' +
                '<input class="value" type="number" min="10" max="600">' +
                '<span>seconds</span>' +
            '</div>';
            $rangeSliderWrap = $(html);
            curVal = -1;
        });

        it("RangeSlider should be a constructor.", function() {
            expect($rangeSliderWrap.find(".leftArea").hasClass("ui-resizable"))
            .to.be.false;
            var options = {
                minVal: 0,
                maxVal: 275,
            };
            new RangeSlider($rangeSliderWrap, randPrefName,
                                          options);
            expect($rangeSliderWrap.find(".leftArea").hasClass("ui-resizable"))
            .to.be.true;
        });

        it("Click in slider but not on slider tab should work", function() {
            function mouseDownAt(someX) {
                var e = jQuery.Event("mousedown");
                e.which = 1;
                e.pageX = someX;
                return e;
            }
            // Mousedown should be handled like click
            expect(curVal).to.equal(-1);
            $rangeSliderWrap.find(".leftArea").trigger(mouseDownAt(100));
            expect(curVal).to.equal(100);
            expect(parseInt($rangeSliderWrap.find("input").val()))
            .to.equal(100);

            $rangeSliderWrap.find(".rightArea").trigger(mouseDownAt(200));
            expect(curVal).to.equal(200);
            expect(parseInt($rangeSliderWrap.find("input").val()))
            .to.equal(200);

            // Click on slider should do nothing.
            $rangeSliderWrap.find(".rightArea .slider")
            .trigger(mouseDownAt(150));
            expect(curVal).to.equal(200);
            expect(parseInt($rangeSliderWrap.find("input").val()))
            .to.equal(200);
        });

        it("Change input also changes slider", function() {
            var $input = $rangeSliderWrap.find("input");
            var domEvent = new Event("input");

            $input.val(125).change();
            expect(curVal).to.equal(125);
            $input.val(0).change();
            expect(curVal).to.equal(0);
            $input.val(275).change();
            expect(curVal).to.equal(275);

            $input.val(125);
            $input[0].dispatchEvent(domEvent);
            expect($rangeSliderWrap.find(".leftArea").width()).to.equal(125);
            $input.val(0);
            $input[0].dispatchEvent(domEvent);
            expect($rangeSliderWrap.find(".leftArea").width()).to.equal(0);
            $input.val(275);
            $input[0].dispatchEvent(domEvent);
            expect($rangeSliderWrap.find(".leftArea").width()).to.equal(275);
        });

        it("Max and min respected", function() {
            var $input = $rangeSliderWrap.find("input");
            var domEvent = new Event("input");

            $input.val(-1).change();
            $input[0].dispatchEvent(domEvent);
            expect(curVal).to.equal(0);
            expect($rangeSliderWrap.find(".leftArea").width()).to.equal(0);

            $input.val(276).change();
            $input[0].dispatchEvent(domEvent);
            expect(curVal).to.equal(275);
            expect($rangeSliderWrap.find(".leftArea").width()).to.equal(275);
        });

        after(function() {
            UserSettings.setPref = USSetPrefCached;
        });

    });

    describe("Menuhelper Constructor Test", function() {
        // ONLY test here is piggyback onto colMenu to test scrolling features.
        var $dragArea;
        var tableName;
        var testDs;

        before(function(done) {
            UnitTest.onMinMode();
            var repStr = "";
            for (i = 0; i < 100; i++) {
                repStr += "<li>RandElt" + String(i) + "</li>";
            }
            $("#colMenu ul").append($(repStr));
            var testDSObj = testDatasets.fakeYelp;
            UnitTest.addAll(testDSObj, "unitTestFakeYelp")
            .then(function(ds, tName, tPrefix) {
                testDs = ds;
                tableName = tName;
                var prefix = tPrefix;
                var tableId = xcHelper.getTableId(tableName);
                var $table = $("#xcTable-" + tableId);
                var table = gTables[tableId];
                $colMenu = $("#colMenu");
                var yelpColNum = table.getColNumByBackName(prefix +
                                                      gPrefixSign +
                                                      "yelping_since");
                $dragArea = $table.find("th.col" + String(yelpColNum) +
                                                " .dragArea");
                done();
            })
            .fail(done);
        });

        it("Menu scrolling should work", function(done) {
            $dragArea.contextmenu();
            $("#colMenu").css("max-height", 100);
            $("#colMenu ul").css("max-height", 100);
            $("#colMenu .scrollArea").show();
            var oldY = $("#colMenu li").last().position().top;
            var newY;
            $("#colMenu .scrollArea.bottom").mouseenter();

            UnitTest.testFinish(function() {
                return $("#colMenu li").last().position().top < oldY;
            })
            .then(function() {
                $("#colMenu .scrollArea.bottom").mouseleave();
                newY = $("#colMenu li").last().position().top;
                expect(newY).to.be.below(oldY);
                oldY = newY;
                return timeoutPromise(100);
            })
            .then(function() {
                newY = $("#colMenu li").last().position().top;
                expect(oldY).to.equal(newY);

                $("#colMenu .scrollArea.top").mouseenter();

                return UnitTest.testFinish(function() {
                    return $("#colMenu li").last().position().top > oldY;
                });
            })
            .then(function() {
                newY = $("#colMenu li").last().position().top;
                expect(oldY).to.be.below(newY);
                done();
            });
        });

        after(function(done) {
            $("#colMenu li").filter(function(idx, elt) {
                return $(elt).text().startsWith("RandElt");
            }).remove();
            $("#colMenu").hide();
            UnitTest.deleteAll(tableName, testDs)
            .always(function(){
                UnitTest.offMinMode();
                done();
            });
        });
    });

    describe("InputSuggest Constructor Test", function() {
        var $container;
        var test = false;
        var inputSuggest;

        before(function() {
            $container = $('<div>' +
                                '<input>' +
                                '<ul class="hint openList">' +
                                    '<li></li>' +
                                '</ul>' +
                            '</div>');
        });

        it("should have 2 attributes", function() {
            inputSuggest = new InputSuggest({
                "$container": $container,
                "onClick": function() {
                    test = true;
                }
            });

            expect(inputSuggest).to.be.instanceof(InputSuggest);
            expect(Object.keys(inputSuggest).length).to.equal(2);
            expect(inputSuggest.$container).to.equal($container);
            expect(inputSuggest.onClick).to.be.a("function");
        });

        it("should trigger click event", function() {
            $container.find(".hint li").click();
            expect(test).to.be.true;
        });

        it("should list high light", function() {
            var $input = $container.find("input");
            var oldList = xcHelper.listHighlight;

            xcHelper.listHighlight = function() {
                test = false;
            };

            inputSuggest.listHighlight({
                "currentTarget": $input.get(0),
                "which": keyCode.Down
            });

            expect(test).to.be.false;
            xcHelper.listHighlight = oldList;
        });
    });

    describe("InputDropdownHint Constructor Test", function() {
        var $dropdown;
        var $input;
        var menuHelper;
        var select;
        var dropdownHint;

        before(function() {
            var dropdown =
                '<div id="test-dropdown" class="dropDownList">' +
                    '<input class="text">' +
                    '<div class="iconWrapper"></div>' +
                    '<div class="list">' +
                        '<ul>' +
                            '<li>aa</li>' +
                            '<li>bb</li>' +
                        '</ul>' +
                    '</div>' +
                '</div>';

            $dropdown = $(dropdown).appendTo("body");
            $input = $dropdown.find("input");

            menuHelper = new MenuHelper($dropdown, {
                "onSelect": function() { select = 0; },
                "container": "body",
                "bounds": "body"
            });
        });

        it("Should have 2 attrs", function() {
            dropdownHint = new InputDropdownHint($dropdown, {
                "menuHelper": menuHelper,
                "onEnter": function() { select = 1; }
            });

            expect(dropdownHint).to.be.an.instanceof(InputDropdownHint);
            expect(Object.keys(dropdownHint).length).to.equal(2);
            expect(dropdownHint.$dropdown).to.equal($dropdown);
            expect(dropdownHint.options).to.be.an("object");
        });

        it("should set input", function() {
            dropdownHint.setInput("test");
            expect($input.val()).to.equal("test");
            expect($input.data("val")).to.equal("test");
        });

        it("should clear input", function() {
            dropdownHint.clearInput();
            expect($input.val()).to.equal("");
            expect($input.data("val")).to.be.undefined;
        });

        it("should open menu", function() {
            $dropdown.find(".iconWrapper").click();
            expect($dropdown.hasClass("open")).to.be.true;
        });

        it("should input to filter", function() {
            $input.val("a").trigger("input");

            var $li = $dropdown.find("li:not(.xc-hidden)");
            expect($li.length).to.equal(1);
            expect($li.text()).to.equal("aa");

            // case 2
            $input.val("z").trigger("input");
            $li = $dropdown.find("li:not(.xc-hidden)");
            expect($li.length).to.equal(1);
            expect($li.text()).to.equal(CommonTxtTstr.NoResult);

            // case 3
            $input.val("").trigger("input");
            $li = $dropdown.find("li:not(.xc-hidden)");
            expect($li.length).to.equal(2);
        });

        it("should keydown to highlight list", function() {
            var event = $.Event("keydown", {"which": keyCode.Down});
            $input.trigger(event);
            expect($dropdown.find("li.highlighted").length).to.equal(1);
        });

        it("should keyenter to apply onEnter", function() {
            var event = $.Event("keydown", {"which": keyCode.Enter});
            $input.trigger(event);
            expect(select).to.equal(1);
        });

        // XXX this doesn't work when test is not in focus
        // it("should blur to old val", function() {
        //     dropdownHint.setInput("test");
        //     $input.focus().val("a").blur();
        //     expect($input.val()).to.equal("test");
        // });

        after(function() {
            $dropdown.remove();
        });
    });

    describe("ExtItem Constructor Test", function() {
        var extItem;

        beforeEach(function() {
            extItem = new ExtItem({
                "appName": "testItem",
                "version": "2.0",
                "description": "test",
                "author": "test user",
                "image": "testImage",
                "category": "test",
                "main": "main",
                "website": "http://test.com"
            });
        });

        it("should be a constructor", function() {
            expect(extItem).to.be.an.instanceof(ExtItem);
            expect(Object.keys(extItem).length).to.equal(8);
        });

        it("should get name", function() {
            expect(extItem.getName()).to.equal("testItem");
        });

        it("should get main name", function() {
            expect(extItem.getMainName()).to.equal("main (testItem)");
            // empty main
            extItem.main = "";
            expect(extItem.getMainName()).to.equal("testItem");
        });

        it("should get category", function() {
            expect(extItem.getCategory()).to.equal("test");
        });

        it("should get author", function() {
            expect(extItem.getAuthor()).to.equal("test user");
        });

        it("should get description", function() {
            expect(extItem.getDescription()).to.equal("test");
        });

        it("should get version", function() {
            expect(extItem.getVersion()).to.equal("2.0");
        });

        it("should get image", function() {
            expect(extItem.getImage()).to.equal("testImage");
        });

        it("should set image", function() {
            extItem.setImage("testImage2");
            expect(extItem.getImage()).to.equal("testImage2");

            // case 2
            extItem.setImage(null);
            expect(extItem.getImage()).to.equal("");
        });

        it("should get website", function() {
            expect(extItem.getWebsite()).to.equal("http://test.com");
        });

        it("should know if it's installed", function() {
            var $fakeItem = $('<div class="item">item1</div>');
            $("#extension-lists").append($fakeItem);
            expect(extItem.isInstalled()).to.be.false;

            // case 2
            $fakeItem.addClass("error");
            expect(extItem.isInstalled()).to.be.false;

            // clean up
            $fakeItem.remove();
        });
    });

    describe("ExtCategory Constructor Test", function() {
        var extItem;

        before(function() {
            extItem = new ExtItem({
                "appName": "testItem",
                "version": "2.0",
                "description": "test",
                "author": "test user",
                "image": "testImage",
                "category": "test",
                "main": "main"
            });
        });

        it("ExtCategory should be a constructor", function() {
            var extCategory = new ExtCategory("test category");

            expect(extCategory).to.be.an("object");
            expect(Object.keys(extCategory).length).to.equal(2);

            expect(extCategory.getName()).to.equal("test category");
            var res = extCategory.addExtension(extItem);
            expect(res).to.be.true;
            // cannot add the same extension twice
            res = extCategory.addExtension(extItem);
            expect(res).to.be.false;

            expect(extCategory.getExtension("testItem").getName()).to.equal("testItem");
            expect(extCategory.hasExtension("testItem")).to.equal(true);

            var list = extCategory.getExtensionList();
            expect(list.length).to.equal(1);
            expect(list[0].getName()).to.equal("testItem");
            list = extCategory.getExtensionList("noResultKey");
            expect(list.length).to.equal(0);

            list = extCategory.getAvailableExtensionList();
            expect(list.length).to.equal(0);
        });

        it("ExtCategorySet should be constructor", function() {
            var extSet = new ExtCategorySet();

            expect(extSet).to.be.an("object");
            expect(Object.keys(extSet).length).to.equal(1);

            expect(extSet.has("test")).to.be.false;
            extSet.addExtension(extItem);
            expect(extSet.get("test").getName()).to.equal("test");

            var item2 = new ExtItem({
                "appName": "marketTestItem",
                "installed": false,
                "category": "marketTest",
                "repository": {
                    "type": "market"
                }
            });

            expect(extSet.has("marketTest")).to.be.false;
            extSet.addExtension(item2);
            expect(extSet.has("marketTest")).to.be.true;
            expect(extSet.get("marketTest").getName()).to.equal("markettest");
            var ext = extSet.getExtension("wrong category", "test");
            expect(ext).to.be.null;
            ext = extSet.getExtension("marketTest", "marketTestItem");
            expect(ext).not.to.be.null;
            expect(ext.getName()).to.equal("marketTestItem");

            var list = extSet.getList(true);
            expect(list.length).to.equal(2);
            expect(list[0].getName()).to.equal("markettest");
            expect(list[1].getName()).to.equal("test");
        });
    });

    describe("Storage Test", function() {
        it("Should have locoal storage and session storage", function() {
            expect(xcLocalStorage).to.exists;
            expect(xcSessionStorage).to.exists;
            expect(xcLocalStorage.storage).to.equal(localStorage);
            expect(xcSessionStorage.storage).to.equal(sessionStorage);
        });

        it("Should setItem", function() {
            xcSessionStorage.setItem("key", "value");
            expect(sessionStorage.hasOwnProperty("key")).to.be.true;
            // should be encoded
            expect(sessionStorage.getItem("key")).not.to.equal("value");
        });

        it("Should getItem", function() {
            // case 1
            var value = xcSessionStorage.getItem("errorKey");
            expect(value).to.be.null;

            // case 2
            value = xcSessionStorage.getItem("key");
            expect(value).to.equal("value");
        });

        it("Should removeItem", function() {
            xcSessionStorage.removeItem("key");
            expect(sessionStorage.hasOwnProperty("key")).to.be.false;
        });
    });

    describe("DSFileUpload Constructor Test", function() {
        var dsFileUpload;
        var call;

        before(function() {
            UnitTest.onMinMode();
        });

        it("should have 12 attributes", function() {
            dsFileUpload = new DSFileUpload("test", 123, {"name": "test"}, {
                onComplete: function() { call = "complete"; },
                onUpdate: function() { call = "update"; },
                onError: function() { call = "error"; },
            });

            expect(dsFileUpload).to.be.instanceof(DSFileUpload);
            expect(Object.keys(dsFileUpload).length).to.equal(12);
            expect(dsFileUpload.name).to.equal("test");
            expect(dsFileUpload.chunks).to.be.an("array");
            expect(dsFileUpload.totalSize).to.equal(123);
            expect(dsFileUpload.sizeCompleted).to.equal(0);
            expect(dsFileUpload.status).to.equal("started");
            expect(dsFileUpload.cancelStatus).to.be.null;
            expect(dsFileUpload.isWorkerDone).to.be.false;
            expect(dsFileUpload.onCompleteCallback).to.be.a("function");
            expect(dsFileUpload.onUpdateCallback).to.be.a("function");
            expect(dsFileUpload.onErrorCallback).to.be.a("function");
            expect(dsFileUpload.times).to.be.an("array");
            expect(dsFileUpload.fileObj).to.be.an("object");
        });

        it("should get size completed", function() {
            expect(dsFileUpload.getSizeCompleted()).to.equal(0);
        });

        it("should get file obj", function() {
            var fileObj = dsFileUpload.getFileObj();
            expect(fileObj.name).to.equal("test");
        });

        it("should get status", function() {
            expect(dsFileUpload.getStatus()).to.equal("started");
        });

        it("should complete", function() {
            dsFileUpload.complete();
            expect(dsFileUpload.getStatus()).to.equal("done");
        });

        it("should cancel", function() {
            dsFileUpload.status = "started";
            dsFileUpload.chunks = ["1"];

            var oldDelete = XcalarDemoFileDelete;
            var test = false;
            XcalarDemoFileDelete = function() {
                test = true;
            };

            dsFileUpload.cancel();
            expect(dsFileUpload.getStatus()).to.equal("canceled");
            expect(dsFileUpload.chunks.length).to.equal(0);
            expect(test).to.be.true;

            XcalarDemoFileDelete = oldDelete;
        });

        it("should errorAdding", function() {
            dsFileUpload.errorAdding("testErr");
            expect(dsFileUpload.getStatus()).to.equal("errored");
            expect(call).to.equal("error");
            UnitTest.hasAlertWithTitle(DSTStr.UploadFailed);
        });

        it("should set wokerDone", function() {
            dsFileUpload.workerDone();
            expect(dsFileUpload.isWorkerDone).to.be.true;
        });

        it("should not add in cancel case", function(done) {
            dsFileUpload.status = "canceled";

            dsFileUpload.add()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                done();
            });
        });

        it("should not add in errored case", function(done) {
            dsFileUpload.status = "errored";

            dsFileUpload.add()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                done();
            });
        });

        it("should not add with more than 2 chunks", function(done) {
            dsFileUpload.status = "started";
            dsFileUpload.chunks = ["1", "2"];

            dsFileUpload.add("test", 1)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                done();
            });
        });

        it("should reject if cancel", function(done) {
            dsFileUpload.status = "started";
            dsFileUpload.chunks = [];

            var oldAppend = XcalarDemoFileAppend;
            var oldDelete = XcalarDemoFileDelete;
            var test = false;

            XcalarDemoFileAppend = function() {
                dsFileUpload.status = "canceled";
                return PromiseHelper.resolve();
            };

            XcalarDemoFileDelete = function() {
                test = true;
            };

            dsFileUpload.add("test", 1)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(test).to.be.true;
                done();
            })
            .always(function() {
                XcalarDemoFileAppend = oldAppend;
                XcalarDemoFileDelete = oldDelete;
            });
        });

        it("should reject if errored", function(done) {
            dsFileUpload.status = "started";
            dsFileUpload.chunks = [];

            var oldAppend = XcalarDemoFileAppend;
            XcalarDemoFileAppend = function() {
                dsFileUpload.status = "errored";
                return PromiseHelper.resolve();
            };

            dsFileUpload.add("test", 1)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(call).to.be.equal("update");
                done();
            })
            .always(function() {
                XcalarDemoFileAppend = oldAppend;
            });
        });

        it("should handle fail case", function(done) {
            dsFileUpload.status = "started";
            dsFileUpload.chunks = [];

            var oldAppend = XcalarDemoFileAppend;
            XcalarDemoFileAppend = function() {
                return PromiseHelper.reject();
            };

            dsFileUpload.add("test", 1)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(call).to.be.equal("error");
                UnitTest.hasAlertWithTitle(DSTStr.UploadFailed);
                done();
            })
            .always(function() {
                XcalarDemoFileAppend = oldAppend;
            });
        });

        it("should complete", function(done) {
            dsFileUpload.status = "started";
            dsFileUpload.chunks = [];

            var oldAppend = XcalarDemoFileAppend;
            XcalarDemoFileAppend = function() {
                dsFileUpload.isWorkerDone = true;
                return PromiseHelper.resolve();
            };

            dsFileUpload.add("test", 1)
            .then(function() {
                expect(call).to.be.equal("complete");
                expect(dsFileUpload.getStatus()).to.equal("done");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDemoFileAppend = oldAppend;
            });
        });

        after(function() {
            UnitTest.offMinMode();
        });
    });

    describe("XcSubQuery Constructor Test", function() {
        it("should have 10 attributes", function() {
            var xcSubQuery = new XcSubQuery({
                "name": "test",
                "time": 123,
                "query": "testQuery",
                "dstTable": "testDstTable",
                "id": 1,
                "index": 2,
                "queryName": "testQueryName",
                "exportFileName": "testExport"
            });

            expect(xcSubQuery).to.be.an.instanceof(XcSubQuery);
            expect(Object.keys(xcSubQuery).length).to.equal(10);
            expect(xcSubQuery).to.have.property("name")
            .and.to.equal("test");
            expect(xcSubQuery).to.have.property("time")
            .and.to.equal(123);
            expect(xcSubQuery).to.have.property("query")
            .and.to.equal("testQuery");
            expect(xcSubQuery).to.have.property("dstTable")
            .and.to.equal("testDstTable");
            expect(xcSubQuery).to.have.property("id")
            .and.to.equal(1);
            expect(xcSubQuery).to.have.property("index")
            .and.to.equal(2);
            expect(xcSubQuery).to.have.property("queryName")
            .and.to.equal("testQueryName");
            expect(xcSubQuery).to.have.property("exportFileName")
            .and.to.equal("testExport");
        });
    });

    describe("ScollTableChecker Constructor Test", function() {
        it("should have 2 attrs", function() {
            var scrollChecker = new ScollTableChecker();
            expect(scrollChecker).to.be.an.instanceof(ScollTableChecker);
            expect(scrollChecker.startTime).to.be.a("number");
            expect(scrollChecker.scrollPos)
            .to.equal($("#mainFrame").scrollLeft());
        });

        it("should check to scroll", function() {
            var scrollChecker = new ScollTableChecker();
            // immediate check should return true
            expect(scrollChecker.checkScroll()).to.be.true;
        });
    });

    describe("ProgressCircle Constructor Test", function() {
        var $fakeIcon;
        var circle;

        before(function() {
            $fakeIcon = $('<div class="lockedTableIcon" data-txId="test" ' +
                          'data-iconnum="1"' +
                            '<div class="progress"></div>' +
                         '</div>');
            $fakeIcon.appendTo($("body"));
        });

        it("should have 8 attributes", function() {
            circle = new ProgressCircle("test", 1);
            expect(circle).to.be.instanceof(ProgressCircle);
            expect(Object.keys(circle).length).to.equal(8);
            expect(circle.txId).to.equal("test");
            expect(circle.iconNum).to.equal(1);
            expect(circle.status).to.equal("inProgress");
            expect(circle.progress).to.equal(0);
            expect(circle.svg).not.to.be.null;
            expect(circle.pie).not.to.be.null;
            expect(circle.arc).not.to.be.null;
            expect(circle.prevPct).to.equal(0);
        });

        it("should update", function() {
            circle.update(10);
            expect(circle.status).to.equal("inProgress");
            expect(circle.prevPct).to.equal(10);
        });

        it("should not update if pass in same pct", function() {
            circle.update(10);
            expect(circle.status).to.equal("inProgress");
            expect(circle.prevPct).to.equal(10);
        });

        it("should reset if pass in wrong pct", function() {
            circle.update();
            expect(circle.status).to.equal("inProgress");
            expect(circle.prevPct).to.equal(0);
        });

        it("should done", function() {
            circle.done();
            expect(circle.status).to.equal("done");
            expect(circle.prevPct).to.equal(100);
        });

        it("should not update after done", function() {
            circle.update();
            expect(circle.status).to.equal("done");
            expect(circle.prevPct).to.equal(100);
        });

        after(function() {
            $fakeIcon.remove();
        });
    });

    describe("RectSelction Constructor Test", function() {
        var rect;
        var test;

        beforeEach(function() {
            test = null;
        });

        it("RectSelction should have 8 attributes", function() {
            rect = new RectSelction(100, 200, {
                "id": "test-selection",
                "$container": $("#container"),
                onStart: function() { test = "start"; },
                onDraw: function() { test = "draw"; },
                onEnd: function() { test = "end"; }
            });

            expect(rect).to.be.instanceof(RectSelction);
            expect(Object.keys(rect).length).to.equal(8);

            expect(rect.x).to.equal(101);
            expect(rect.y).to.equal(200);
            expect(rect.id).to.equal("test-selection");
            expect(rect.$container.attr("id")).to.equal("container");
            expect(rect.bound).to.exists;
            expect(rect.onStart).to.be.a("function");
            expect(rect.onDraw).to.be.a("function");
            expect(rect.onEnd).to.be.a("function");
        });

        it("should get rect", function() {
            var $rect = rect.__getRect();
            expect($rect.attr("id")).to.equal("test-selection");
        });

        it("should checkMovement", function() {
            rect.checkMovement(101, 200);
            expect(test).to.be.null;

            rect.checkMovement(102, 201);
            expect(test).to.equal("start");
        });

        it("should draw", function() {
            rect.draw(120, 220);
            expect(test).to.equal("draw");
        });

        it("should end draw", function() {
            rect.end();
            expect(test).to.equal("end");
            // should be removed
            var $rect = $("#test-selection");
            expect($rect.length).to.equal(0);
        });
    });

    describe("InfScroll Constructor Test", function() {
        var $list;
        var infList;
        before(function() {
            var lis = "";
            for (var i = 0; i < 100; i++) {
                lis += '<li style="height:100px;">Item</li>';
            }
            var list = '<ul id="infScrollList" ' +
                'style="position:absolute; top:0px; left:0px; z-index:99999; ' +
                'height: 500px; overflow:auto;">' + lis + '</ul>';
            $("#container").append(list);
            $list = $("#infScrollList");
            infList = new InfList($list);
        });

        it("restore should work", function() {
            expect($list.find("li:visible").length).to.equal(100);
            infList.restore("li");
            expect($list.find("li:visible").length).to.equal(40);
            expect($list.find("li").eq(0).is(":visible")).to.be.false;
        });

        it("mouseup should work", function() {
            expect($list.scrollTop()).to.equal(0);
            $list.mousedown();
            $(document).mouseup();
            expect($list.scrollTop()).to.equal(2000);
            expect($list.find("li:visible").length).to.equal(60);
        });

        it("scroll should work", function(done) {
            expect($list.scrollTop()).to.equal(2000);
            $list.scrollTop(0);
            if (!ifvisible.now()) {
                $list.scroll();
            }
            UnitTest.testFinish(function() {
                return $list.find("li:visible").length === 80;
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            $list.remove();
        });
    });
});