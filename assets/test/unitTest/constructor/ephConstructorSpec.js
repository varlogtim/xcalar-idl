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

            mouseEvent.setMouseDownTarget($target);
            expect(mouseEvent.getLastMouseDownTarget()).to.equal($target);
            expect(mouseEvent.getLastMouseDownTime()).to.be.a("number");
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
        var $limit;
        var $pattern;

        before(function() {
            var html =
            '<section>' +
                '<div class="listInfo no-selection">' +
                    '<span class="expand"></span>' +
                '</div>' +
                '<ul>' +
                    '<li class="limit option">' +
                        '<div class="radioButtonGroup">' +
                            '<div class="radioButton" ' +
                            'data-option="default"></div>' +
                            '<div class="radioButton" data-option="custom">' +
                                '<input class="size" type="number">' +
                                '<div class="dropDownList">' +
                                    '<input class="text unit">' +
                                    '<div class="list">' +
                                        '<ul>' +
                                          '<li>B</li>' +
                                        '</ul>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</li>' +
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
            $limit = $section.find(".option.limit");
            $pattern = $section.find(".option.pattern");
        });

        it("Should be a valid constructor", function() {
            advanceOption = new DSFormAdvanceOption($section, "body");
            expect(advanceOption).to.be.an("object");
            expect(Object.keys(advanceOption).length).to.equal(1);

            expect(advanceOption).to.have.property("$section");
        });

        it("Should have valid event", function() {
            // expand
            $section.find(".listInfo .expand").click();
            expect($section.hasClass("active")).to.be.true;

            // dropdown list
            $limit.find("li").trigger(fakeEvent.mouseup);

            expect($limit.find(".unit").val()).to.equal("B");

            // checkbox
            $pattern.find(".recursive.checkboxSection").click();
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.true;

            // radio
            var $radioButton = $limit.find(".radioButton[data-option='custom']");
            $radioButton.click();
            expect($radioButton.hasClass("active")).to.be.true;
        });

        it("Should reset options", function() {
            advanceOption.reset();

            var defaultVal = UserSettings.getPref("DsDefaultSampleSize");
            var size = xcHelper.sizeTranslator(defaultVal, true);
            expect(size[0]).to.be.gt(0);
            expect(size[1]).to.be.a("string").and.to.have.length(2);

            expect($limit.find(".size").val()).to.equal(size[0] + "");
            expect($limit.find(".unit").val()).to.equal(size[1]);
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.false;

            $radioButton = $limit.find(".radioButton[data-option='default']");
            expect($radioButton.hasClass("active")).to.be.true;
        });

        it("Should set options", function() {
            advanceOption.set({
                "pattern": "testPattern",
                "isRecur": true,
                "isRegex": true,
                "previewSize": 123
            });

            expect($pattern.find("input").val()).to.equal("testPattern");
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.true;
            expect($pattern.find(".regex .checkbox").hasClass("checked"))
            .to.be.true;
            expect($limit.find(".unit").val()).to.equal("B");
            expect($limit.find(".size").val()).to.equal("123");
        });

        it("Should modify preview size", function() {
            advanceOption.modify({"previewSize": 456});
            expect($limit.find(".unit").val()).to.equal("B");
            expect($limit.find(".size").val()).to.equal("456");
        });

        it("Should get args", function() {
            advanceOption.reset();

            advanceOption.set({
                "pattern": "testPattern",
                "isRecur": true,
                "isRegex": true,
                "previewSize": 123
            });

            var res = advanceOption.getArgs();
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).to.equal(4);

            expect(res).to.have.property("pattern")
            .and.to.equal("testPattern");

            expect(res).to.have.property("isRecur")
            .and.to.be.true;

            expect(res).to.have.property("isRegex")
            .and.to.be.true;

            expect(res).to.have.property("previewSize")
            .and.to.equal(123);

            // case 2
            var $radioButton = $limit.find(".radioButton[data-option='custom']");
            advanceOption.reset();
            res = advanceOption.getArgs();
            expect(res).to.have.property("pattern")
            .and.to.be.null;

            $radioButton.click();
            $limit.find(".unit").val("");
            $limit.find(".size").val("123");
            res = advanceOption.getArgs();
            expect(res).to.be.null;
            assert.isTrue($("#statusBox").is(":visible"));

            $("#statusBox .close").click();
        });
    });

    describe("DSFormController Constructor Test", function() {
        it("DSFormController Should be a constructor", function() {
            var controller = new DSFormController();
            expect(controller).to.be.an("object");
            expect(Object.keys(controller).length).to.equal(0);

            controller.set({
                "path": "testPath",
                "format": "testFormat"
            });

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
            expect(Object.keys(controller).length).to.equal(5);
            expect(controller.getFieldDelim()).to.equal("");
            expect(controller.getLineDelim()).to.equal("\n");
            expect(controller.useHeader()).to.be.false;
            expect(controller.getQuote()).to.equal("\"");
            expect(controller.getPreviewFile()).to.be.null;
            expect(controller.getArgStr())
            .to.equal('{"hasHeader":false,"fieldDelim":"","lineDelim":"\\n","quote":"\\""}');
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

            $("#container").remove("#fakeModalInst");
            UnitTest.offMinMode();
        });
    });

    describe("ExportHelper Constructor Test", function() {
        var $view;
        var exportHelper;

        before(function() {
            var fakeHtml =
            '<div id="unitst-view">' +
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

        it('formHelper columnPicker should work', function() {
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
            expect($('.xcTableWrap.columnPicker').length).to.equal(0);
            expect($('#container.columnPicker').length).to.equal(0);
            expect($('#container.testState').length).to.equal(0);

            formHelper.setup(); // activate

            expect($('.xcTableWrap.columnPicker').length).to.be.gt(0);
            expect($('#container.columnPicker.testState').length).to.equal(1);
            expect($table.find('th.col1 .header').hasClass('noColumnPicker')).to.be.false;
            expect($table.find('th.col2 .header').hasClass('noColumnPicker')).to.be.true;
            var $colHead = $table.find('th.col2 .header');
            expect($colHead.attr('data-original-title').indexOf('Cannot') > -1).to.be.true;
            expect($colHead.attr('data-original-title').indexOf('objects') > -1).to.be.true;

            // click on object column
            $table.find('th.col2 .header').trigger('click');
            expect(colPickerCallBackTriggered).to.be.false;

            // click on boolean column
            $table.find('th.col1 .header').trigger('click');
            expect(colPickerCallBackTriggered).to.be.true;
        });

        it('formHelper clear should work', function() {
            expect($table.find('.header.noColumnPicker').length).to.be.gt(2);
            formHelper.clear();
            expect($table.find('.header.noColumnPicker').length).to.equal(0);
            var $colHead = $table.find('th.col2 .header');
            expect($colHead.attr('data-original-title')).to.be.undefined;
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
                var $table = $('#xcTable-' + tableId);
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
            var oldY = $("#colMenu li").last().position().top;
            var newY;
            $("#colMenu .scrollArea.bottom").mouseenter();
            timeoutPromise(400)
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
                return timeoutPromise(400);
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
            UnitTest.deleteAll(tableName, testDs)
            .always(function(){
                UnitTest.offMinMode();
                done();
            });
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
                "main": "main"
            });
        });

        it("should be a constructor", function() {
            expect(extItem).to.be.an.instanceof(ExtItem);
            expect(Object.keys(extItem).length).to.equal(7);
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

        it("should test image", function() {
            extItem.setImage("testImage2");
            expect(extItem.getImage()).to.equal("testImage2");
        });

        it("should know if it's installed", function() {
            expect(extItem.isInstalled()).to.be.false;
        });
    });

    describe("Extension Constructor Test", function() {
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

            list = extCategory.getInstalledExtensionList();
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
            expect(extSet.get("marketTest").getName()).to.equal("marketTest");
            var ext = extSet.getExtension("wrong category", "test");
            expect(ext).to.be.null;
            ext = extSet.getExtension("marketTest", "marketTestItem");
            expect(ext).not.to.be.null;
            expect(ext.getName()).to.equal("marketTestItem");

            var list = extSet.getList(true);
            expect(list.length).to.equal(2);
            expect(list[0].getName()).to.equal("marketTest");
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

    describe("XcSubQuery Constructor Test", function() {
        it("Should have 10 attributes", function() {
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
            expect(Object.keys(xcSubQuery).length).to.equal(9);
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

    describe("ScollTableChecker should work", function() {
        it("Shuold have 2 attrs", function() {
            var scrollChecker = new ScollTableChecker();
            expect(scrollChecker).to.be.an.instanceof(ScollTableChecker);
            expect(scrollChecker.startTime).to.be.a("number");
            expect(scrollChecker.scrollPos)
            .to.equal($("#mainFrame").scrollLeft());
        });

        it("Should check to scroll", function() {
            var scrollChecker = new ScollTableChecker();
            // immediate check should return true
            expect(scrollChecker.checkScroll()).to.be.true;
        });
    });
});