describe("Util Constructor Test", function() {
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
                "pattern"    : "testPattern",
                "isRecur"    : true,
                "isRegex"    : true,
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
                "pattern"    : "testPattern",
                "isRecur"    : true,
                "isRegex"    : true,
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
                "path"  : "testPath",
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

            controller.reset();
            expect(Object.keys(controller).length).to.equal(4);
            expect(controller.getFieldDelim()).to.equal("");
            expect(controller.getLineDelim()).to.equal("\n");
            expect(controller.useHeader()).to.be.false;
            expect(controller.getQuote()).to.equal("\"");
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
        it("Corrector Shhould work", function() {
            var corrector = new Corrector(["test", "yelp", "hello"]);
            expect(corrector.correct("ylp")).to.equal("yelp");
            expect(corrector.suggest("ylp")).to.equal("yelp");
            expect(corrector.suggest("t")).to.equal("test");
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
            var progCol =  new ProgCol({
                "name"    : "test",
                "backName": "test",
                "isNewCol": false,
                "type"    : "string",
                "func"    : {
                    "name": "pull"
                }
            });

            var tableId = "unitTest-exportHelper";
            var table = new TableMeta({
                "tableName": "test#" + tableId,
                "tableId"  : tableId,
                "tableCols": [progCol],
                "isLocked" : false
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

    describe("Extension Constructor Test", function() {
        var extItem;

        it("ExtItem should be a constructor", function() {
            extItem = new ExtItem({
                "name"       : "testItem",
                "version"    : "2.0",
                "description": "test",
                "author"     : "test user",
                "category"   : "test",
                "imageUrl"   : "test.jpg",
                "website"    : "test.com",
                "installed"  : true,
                "repository" : {
                    "url": "test.ext.com"
                }
            });

            expect(extItem).to.be.an("object");
            expect(Object.keys(extItem).length).to.equal(11);

            expect(extItem.getName()).to.equal("testItem");
            expect(extItem.getCategory()).to.equal("test");
            expect(extItem.getAuthor()).to.equal("test user");
            expect(extItem.getDescription()).to.equal("test");
            expect(extItem.getVersion()).to.equal("2.0");
            expect(extItem.getWebsite()).to.equal("test.com");
            expect(extItem.getImage()).to.equal("test.jpg");
            expect(extItem.getUrl()).to.equal("test.ext.com");
            expect(extItem.isInstalled()).to.be.true;

            extItem.setImage("image.jpg");
            expect(extItem.getImage()).to.equal("image.jpg");
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
            expect(list.length).to.equal(1);
            expect(list[0].getName()).to.equal("testItem");
        });

        it("ExtCategorySet should be constructor", function() {
            var extSet = new ExtCategorySet();

            expect(extSet).to.be.an("object");
            expect(Object.keys(extSet).length).to.equal(1);

            expect(extSet.has("test")).to.be.false;
            extSet.addExtension(extItem);
            expect(extSet.get("test").getName()).to.equal("test");

            var item2 = new ExtItem({
                "name"      : "marketTestItem",
                "installed" : false,
                "category"  : "marketTest",
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
});