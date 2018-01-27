describe("Dataset-DSPreview Test", function() {
    // Note that this function is called in very early time
    // so do not initialize any resuable varible here
    // instead, initialize in the it() function
    var $previewTable;
    var $form;
    var $formatText;

    var $fieldText;
    var $lineText;

    var $udfModuleList;
    var $udfFuncList;

    var $headerCheckBox; // promote header checkbox
    var $genLineNumCheckBox;

    var $skipInput;
    var $quoteInput;

    var $statusBox;

    var loadArgs;

    var $mainTabCache;

    before(function(){
        $previewTable = $("#previewTable");
        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $fieldText = $("#fieldText");
        $lineText = $("#lineText");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox"); // promote header checkbox
        $genLineNumCheckBox = $("#genLineNumbersCheckbox");

        $skipInput = $("#dsForm-skipRows");
        $quoteInput = $("#dsForm-quote");

        $statusBox = $("#statusBox");
        loadArgs = DSPreview.__testOnly__.get().loadArgs;

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();
    });

    describe("Basic Preview Function Test", function() {
        it("parseTdHelper should work", function() {
            var parseTdHelper = DSPreview.__testOnly__.parseTdHelper;
            var testCases = [{
                // test1: when not th, has delimiter
                "delimiter": ",",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h' +
                                '</div>' +
                            '</td>' +
                            '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'i' +
                                '</div>' +
                            '</td>'
            },{
                // test2: when not th, no delimiter
                "delimiter": "",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    '<span class="td">h</span>' +
                                    '<span class="td has-margin has-comma">' +
                                        ',' +
                                    '</span>' +
                                    '<span class="td">i</span>' +
                                '</div>' +
                             '</td>'
            },{
                // test3: when not th, other delimiter
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h,i' +
                                '</div>' +
                            '</td>'
            },{
                // test4: when is th, has delimiter
                "delimiter": ",",
                "isTh": true,
                "data": ["h", ",", "i"],
                "expectRes": '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizedtoheader="false"></div>' +
                                    '<div class="text cell">h</div>' +
                                '</div>' +
                            '</th>' +
                            '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizedtoheader="false"></div>' +
                                    '<div class="text cell">i</div>' +
                                '</div>' +
                            '</th>'
            },{
                // test5: when not th, delimiter ",", data has backslash
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", "\\", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h\\,i' +
                                '</div>' +
                            '</td>'
            }];

            testCases.forEach(function(testCase) {
                var td = parseTdHelper(testCase.data, testCase.delimiter,
                                        testCase.isTh);
                expect(td).to.equal(testCase.expectRes);
            });
        });

        it("getTbodyHTML() shoud work", function() {
            var getTbodyHTML = DSPreview.__testOnly__.getTbodyHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["t", "e", "s", "t"]],
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker">' +
                                        '1' +
                                    '</td>' +
                                    '<td class="cell">' +
                                        '<div class="innerCell">' +
                                            '<span class="td">t</span>' +
                                            '<span class="td">e</span>' +
                                            '<span class="td">s</span>' +
                                            '<span class="td">t</span>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            },{
                // test2: when has header
                "datas": [["t", "e", "s", "t"], ["h", "i"]],
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker">1</td>' +
                                    '<td class="cell">' +
                                        '<div class="innerCell">' +
                                            '<span class="td">h</span>' +
                                            '<span class="td">i</span>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            }];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter;
                loadArgs.setHeader(testCase.hasHeader);
                loadArgs.setFieldDelim(delimiter);
                var tbody = getTbodyHTML(testCase.datas, delimiter);
                expect(tbody).to.equal(testCase.expectRes);
            });

            DSPreview.__testOnly__.set();
        });

        it("getTheadHTML should work", function() {
            var getTheadHTML = DSPreview.__testOnly__.getTheadHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th class="rowNumHead">' +
                                        '<div class="header"></div>' +
                                    '</th>' +
                                    '<th>' +
                                        '<div class="header">' +
                                            '<div class="colGrab" data-sizedtoheader="false"></div>' +
                                            '<div class="text">column0</div>' +
                                        '</div>' +
                                    '</th>' +
                                '</tr>' +
                              '</thead>'
            },{
                // test2: when has header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th class="rowNumHead">' +
                                        '<div class="header"></div>' +
                                    '</th>' +
                                    '<th>' +
                                        '<div class="header">' +
                                            '<div class="text cell">' +
                                                '<span class="td">h</span>' +
                                                '<span class="td">i</span>' +
                                            '</div>' +
                                        '</div>' +
                                    '</th>' +
                                '</tr>' +
                              '</thead>'
            }];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter;
                loadArgs.setHeader(testCase.hasHeader);
                loadArgs.setFieldDelim(delimiter);

                var tHead = getTheadHTML(testCase.datas, delimiter, testCase.tdLen);
                expect(tHead).to.equal(testCase.expectRes);
            });

            DSPreview.__testOnly__.set();
        });

        it("highlightHelper() should work", function() {
            var $cell = $('<div class="text cell">'+
                            '<span class="td">h</span>' +
                            '<span class="td">,</span>' +
                            '<span class="td">i</span>' +
                        '</div>');
            DSPreview.__testOnly__.highlightHelper($cell, ",");

            expect($cell.html()).to.equal('<span class="td">h</span>' +
                                '<span class="td highlight">,</span>' +
                                '<span class="td">i</span>');
        });

        it("getPreviewName() should work", function() {
            var getPreviewTableName = DSPreview.__testOnly__.getPreviewTableName;
            var res = getPreviewTableName("test");
            expect(res.indexOf("test-") > 0).to.be.true;
            expect(res.endsWith("-xcalar-preview")).to.be.true;

            res = getPreviewTableName();
            expect(res.indexOf("previewTable") > 0).to.be.true;
            expect(res.endsWith("-xcalar-preview")).to.be.true;
        });

        it("toggleHeader() should workh", function() {
            var data = "line1\nline2";
            var $checkbox = $headerCheckBox.find(".checkbox");
            var toggleHeader = DSPreview.__testOnly__.toggleHeader;

            loadArgs.reset();
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();
            // has 2 rows
            expect($previewTable.find("tbody tr").length).to.equal(2);

            // toggle to have header
            toggleHeader(true, true);
            expect($checkbox.hasClass("checked")).to.be.true;
            expect(loadArgs.useHeader()).to.be.true;
            // has 1 row
            expect($previewTable.find("tbody tr").length).to.equal(1);

            // toggle to remove header
            toggleHeader(false, true);
            expect($checkbox.hasClass("checked")).to.be.false;
            expect(loadArgs.useHeader()).to.be.false;
            // has 1 row
            expect($previewTable.find("tbody tr").length).to.equal(2);
        });

        it("getDataFromLoadUDF() should fail", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var oldFetch = XcalarFetchData;
            XcalarFetchData = function() {
                return PromiseHelper.resolve("test");
            };

            DSPreview.__testOnly__.getDataFromLoadUDF()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal(DSTStr.NoParse);
                done();
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
                XcalarFetchData = oldFetch;
            });
        });

        it("getDataFromLoadUDF() should work", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 0
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            DSPreview.__testOnly__.getDataFromLoadUDF()
            .then(function(res) {
                expect(res).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
            });
        });

        it("getDataFromLoadUDF() should work 2", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var oldFetch = XcalarFetchData;
            XcalarFetchData = function() {
                return PromiseHelper.resolve(['{"column10":"Opportunity Source"}']);
            };

            DSPreview.__testOnly__.getDataFromLoadUDF()
            .then(function(res) {
                expect(res).to.equal('[{"column10":"Opportunity Source"}]');
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
                XcalarFetchData = oldFetch;
            });
        });

        it("getURLToPreview should work", function(done) {
            var meta = DSPreview.__testOnly__.get();
            var isViewFolder = meta.isViewFolder;
            meta.loadArgs.set({
                "targetName": gDefaultSharedRoot,
                "path": "/url",
            });
            DSPreview.__testOnly__.set(null, null, true);
            var id = DSPreview.__testOnly__.get().id;
            var oldPreview = XcalarPreview;
            XcalarPreview = function() {
                return PromiseHelper.resolve({"relPath": "file/test"});
            };

            DSPreview.__testOnly__.getURLToPreview({
                "targetName": gDefaultSharedRoot,
                "path": "/url"
            }, id)
            .then(function(path) {
                expect(path).equal("/url/file/test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldPreview;
                DSPreview.__testOnly__.set(null, null, isViewFolder);
            });
        });

        it("getURLToPreview should return single file url", function(done) {
            var meta = DSPreview.__testOnly__.get();
            var isViewFolder = meta.isViewFolder;
            meta.loadArgs.set({
                "targetName": gDefaultSharedRoot,
                "path": "/url",
            });
            DSPreview.__testOnly__.set(null, null, false);
            
            DSPreview.__testOnly__.getURLToPreview({
                "targetName": gDefaultSharedRoot,
                "path": "/test"
            })
            .then(function(path) {
                expect(path).equal("/test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DSPreview.__testOnly__.set(null, null, isViewFolder);
            });
        });

        it("getURLToPreview should fail with wrong id", function(done) {
            var meta = DSPreview.__testOnly__.get();
            var isViewFolder = meta.isViewFolder;
            meta.loadArgs.set({
                "targetName": gDefaultSharedRoot,
                "path": "/url",
            });
            DSPreview.__testOnly__.set(null, null, true);
            var oldPreview = XcalarPreview;
            XcalarPreview = function() {
                return PromiseHelper.resolve({"relPath": "/test"});
            };

            DSPreview.__testOnly__.getURLToPreview({
                "targetName": gDefaultSharedRoot,
                "path": "/url"
            }, "wrongId")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal("old preview error");
                done();
            })
            .always(function() {
                XcalarPreview = oldPreview;
                DSPreview.__testOnly__.set(null, null, isViewFolder);
            });
        });

        it("getURLToPreview should handle fail case", function(done) {
            var meta = DSPreview.__testOnly__.get();
            var isViewFolder = meta.isViewFolder;
            meta.loadArgs.set({
                "targetName": gDefaultSharedRoot,
                "path": "/url",
            });
            DSPreview.__testOnly__.set(null, null, true);
            var oldPreview = XcalarPreview;
            XcalarPreview = function() {
                return PromiseHelper.reject("test");
            };

            DSPreview.__testOnly__.getURLToPreview({
                "targetName": gDefaultSharedRoot,
            })
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                XcalarPreview = oldPreview;
                DSPreview.__testOnly__.set(null, null, isViewFolder);
            });
        });

        it("tooManyColAlertHelper should handle valid case", function(done) {
            DSPreview.__testOnly__.tooManyColAlertHelper(0)
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("tooManyColAlertHelper should handle invalid case", function(done) {
            var def = DSPreview.__testOnly__.tooManyColAlertHelper(gMaxColToPull);
            UnitTest.hasAlertWithTitle(DSFormTStr.CreateWarn);

            def
            .then(function() {
                done("fail");
            })
            .fail(function() {
                done();
            });
        });

        it("invalidHeaderDetection should handle no header case", function(done) {
            DSPreview.__testOnly__.invalidHeaderDetection(null)
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("invalidHeaderDetection should handle valid case 2", function(done) {
            var def = DSPreview.__testOnly__.invalidHeaderDetection(["abc"]);
            UnitTest.hasAlertWithTitle(DSTStr.DetectInvalidCol, {
                confirm: true
            });
            def
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("invalidHeaderDetection should handle invalid case 3", function(done) {
            var def = DSPreview.__testOnly__.invalidHeaderDetection(["a.b"]);
            UnitTest.hasAlertWithTitle(DSTStr.DetectInvalidCol);
            def
            .then(function() {
                done("fail");
            })
            .fail(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            });
        });
    });

    describe("Preview Public API Test", function() {
        it("DSPreview.changePreviewFile should work", function() {
            var oldPreviewFile = loadArgs.getPreviewFile();
            DSPreview.changePreviewFile("test", true);
            expect(loadArgs.getPreviewFile()).to.equal("test");
            loadArgs.setPreviewFile(oldPreviewFile);
        });

        it("DSPreview.backFromParser should work", function() {
            var oldFunc = DSPreview.changePreviewFile;
            DSPreview.changePreviewFile = function() {
                return;
            };
            // case 1
            DSPreview.backFromParser("test", {
                "moduleName": "udf"
            });
            var useUDF = DSPreview.__testOnly__.isUseUDF();
            expect(useUDF).to.be.true;
            // case 2
            DSPreview.backFromParser("test", {
                "moduleName": "udf",
                "delimiter": ","
            });
            expect(loadArgs.getLineDelim()).to.be.equal(",");

            DSPreview.changePreviewFile = oldFunc;
        });

        it("DSPreview.toggleXcUDFs should work", function() {
            var isHide = UserSettings.getPref("hideXcUDF") || false;
            var $li = $("<li>_xcalar_test</li>");
            $udfModuleList.append($li);
            DSPreview.toggleXcUDFs(!isHide);
            expect($li.hasClass("xcUDF")).to.be.equal(!isHide);

            DSPreview.toggleXcUDFs(isHide);
            expect($li.hasClass("xcUDF")).to.be.equal(isHide);
            $li.remove();
        });

        it("DSPreview.clear shoule resolve if view is hidden", function(done) {
            var $view = $("#dsForm-preview");
            var isHidden = $view.hasClass("xc-hidden");
            $view.addClass("xc-hidden");

            DSPreview.clear()
            .then(function(res) {
                expect(res).to.equal(null);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                if (!isHidden) {
                    $view.removeClass("xc-hidden");
                }
            });
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Suggest Test", function() {
        before(function() {
            loadArgs.reset();
        });

        it("Should detect correct format", function() {
            var detectFormat = DSPreview.__testOnly__.detectFormat;
            loadArgs.set({"path": "test.xlsx"});
            expect(detectFormat()).to.equal("Excel");
            loadArgs.set({"path": "test"});
            var data = "[{\"test\"}";
            expect(detectFormat(data, "\n")).to.equal("JSON");

            data = "{\"test\": \"val\"}";
            expect(detectFormat(data, "\n")).to.equal("JSON");

            data = "abc";
            expect(detectFormat(data, "\n")).to.equal("CSV");
        });

        it("Should detect correct header", function() {
            var detectHeader = DSPreview.__testOnly__.detectHeader;

            // when nothing to delimit
            var linDelim = "\n";
            var fieldDelim = "";
            var data = "";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;


            // when is not header
            data = "Col0\nCol1";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;


            data = "\t\t\n\tCol1";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;

            data = "1\t2\nCol1\tCol2";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;

            // has header
            data = "ThisisHeader1\tThisisHeader2\n" +
                    "1\t2\n" +
                    "3\t4";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.true;
        });

        it("Should detect excel header", function() {
            var detectExcelHeader = DSPreview.__testOnly__.detectExcelHeader;

            // has header case
            var obj = [{"col0": "test"}, {"col0": 1}, {"col0": 2}];
            var data = JSON.stringify(obj);
            expect(detectExcelHeader(data)).to.be.true;

            // no header case
            obj = [{"col0": 0}, {"col0": 1}, {"col0": 2}];
            data = JSON.stringify(obj);
            expect(detectExcelHeader(data)).to.be.false;

            // error case
            data = "invalid json data";
            expect(detectExcelHeader(data)).to.be.false;
        });
    });

    describe("Get Preview Table Test", function() {
        before(function() {
            $previewTable.html("");
            loadArgs.reset();
        });

        it ("Should get a table from raw data", function() {
            loadArgs.setFormat("CSV");
            loadArgs.setFieldDelim("");

            var data = "h,i\nte,st";
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();

            // has 2 rows and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(2);
            expect($previewTable.hasClass("has-delimiter")).to.be.false;

            loadArgs.setFieldDelim(",");
            DSPreview.__testOnly__.getPreviewTable();
            // has 2 rows and 3 columns
            expect($previewTable.find("th").length).to.equal(3);
            expect($previewTable.find("tbody tr").length).to.equal(2);
            expect($previewTable.hasClass("has-delimiter")).to.be.true;

            // error json
            loadArgs.setFormat("JSON");
            DSPreview.__testOnly__.getPreviewTable();
            var res = $("#dsPreviewWrap").find(".errorSection").text();
            expect(res).to.equal("You file cannot be parsed as JSON. We recommend you use the CSV format instead.");

            // valid json
            data = '{"a": "b"}';
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();
            // has 1 row and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(1);

            // valid json2
            data = '{"a": "\\{b"}';
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();
            // has 1 row and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(1);
        });

        it("Should highlight delimiter", function() {
            var data = "h,i";
            var $highLightBtn = $("#dsForm-highlighter .highlight");
            var $rmHightLightBtn = $("#dsForm-highlighter .rmHightLight");

            loadArgs.setFormat("CSV");
            loadArgs.setFieldDelim("");
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();

            expect($highLightBtn.hasClass("xc-disabled")).to.be.true;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.true;
            // can highlight
            DSPreview.__testOnly__.applyHighlight(",");
            expect(DSPreview.__testOnly__.get().highlighter).to.equal(",");
            expect($previewTable.find(".highlight").length).to.equal(1);
            expect($highLightBtn.hasClass("xc-disabled")).to.be.false;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.false;

            // can remove highlight
            DSPreview.__testOnly__.applyHighlight("");
            expect(DSPreview.__testOnly__.get().highlighter).to.equal("");
            expect($previewTable.find(".highlight").length).to.equal(0);
            expect($highLightBtn.hasClass("xc-disabled")).to.be.true;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.true;
        });

        it("Should clear preview table", function(done) {
            var data = "h,i";
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();

            DSPreview.__testOnly__.clearPreviewTable()
            .then(function(hasDestroyTable) {
                expect(hasDestroyTable).to.be.false;
                var res = DSPreview.__testOnly__.get();
                expect(res.highlighter).to.equal("");
                expect($previewTable.html()).to.equal("");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            DSPreview.__testOnly__.set("");
            $previewTable.empty();
        });
    });

    describe("Preview with UDF Function Test", function() {
        var oldLoad;
        var oldMakeResultSet;
        var oldFetch;
        var oldSetFree;

        before(function() {
            oldLoad = XcalarLoad;
            oldMakeResultSet = XcalarMakeResultSetFromDataset;
            oldSetFree = XcalarSetFree;
            oldFetch = XcalarFetchData;
        });

        it("should loadDataWithUDF handle error case", function(done) {
            XcalarLoad = function() {
                return PromiseHelper.reject("test");
            };

            DSPreview.__testOnly__.loadDataWithUDF(1, "test", "ds", {
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            });
        });

        it("should loadDataWithUDF handle parse error", function(done) {
            loadArgs.set({"path": "test"});
            XcalarLoad = function() {
                return PromiseHelper.resolve();
            };

            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            XcalarFetchData = function() {
                return PromiseHelper.resolve(["test"]);
            };

            DSPreview.__testOnly__.loadDataWithUDF(1, "test", "ds",{
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal(DSTStr.NoParse);
                done();
            });
        });

        it("should loadDataWithUDF", function(done) {
            loadArgs.set({"path": "test"});

            XcalarLoad = function() {
                return PromiseHelper.resolve();
            };

            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            XcalarFetchData = function() {
                var val = JSON.stringify({"a": "test"});
                return PromiseHelper.resolve([val]);
            };

            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            DSPreview.__testOnly__.loadDataWithUDF(1, "test", "ds", {
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function(buffer) {
                expect(buffer).not.to.be.null;
                expect(buffer).contains("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should fetch more rows with UDF load", function(done) {
            var test = false;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 40
                });
            };

            XcalarFetchData = function() {
                test = true;
                var val = JSON.stringify({"a": "test"});
                return PromiseHelper.resolve([val]);
            };

            var $section = $previewTable.closest(".datasetTbodyWrap");
            var $previewBottom = $section.find(".previewBottom");
            $previewBottom.addClass("load");
            $previewBottom.find(".action").click();

            UnitTest.testFinish(function() {
                return !$previewBottom.hasClass("load");
            })
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should clear the table", function(done) {
            var oldDestory = XcalarDestroyDataset;
            XcalarDestroyDataset = function() {
                return PromiseHelper.resolve();
            };
            DSPreview.__testOnly__.clearPreviewTable()
            .then(function(hasDestroyTable) {
                expect(hasDestroyTable).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDestroyDataset = oldDestory;
            });
        });

        after(function() {
            XcalarLoad = oldLoad;
            XcalarSetFree = oldSetFree;
            XcalarMakeResultSetFromDataset = oldMakeResultSet;
            XcalarFetchData = oldFetch;
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Basic form functionality test", function() {
        it("Should reset form", function() {
            $("#dsForm-skipRows").val(1);
            loadArgs.setFieldDelim("test..");
            DSPreview.__testOnly__.resetForm();

            expect($("#dsForm-skipRows").val()).to.equal("0");
            expect(loadArgs.getFieldDelim()).to.equal("");
        });

        it("getNameFromPath should work", function() {
            var getNameFromPath = DSPreview.__testOnly__.getNameFromPath;
        
            var testName = xcHelper.randName("testName");
            var oldhas = DS.has;

            // basic
            var res = getNameFromPath(testName);
            expect(res).to.equal(testName);
                
            var test2 = testName + ".test";
            res = getNameFromPath(test2);
            expect(res).to.equal(testName);

            var test3 = "/var/yelpUnittest/";
            res = getNameFromPath(test3);
            expect(res).to.equal("yelpUnittest");

            var test4 = "/var/gdeltUnittest.csv";
            res = getNameFromPath(test4);
            expect(res).to.equal("gdeltUnittest");

            var test5 = "/var/123";
            res = getNameFromPath(test5);
            expect(res).to.equal("var123");

            var test6 = "/123";
            res = getNameFromPath(test6);
            expect(res).to.equal("ds123");

            DS.has = function(name) {
                if (name === testName) {
                    return true;
                } else {
                    return false;
                }
            };

            res = getNameFromPath(testName);
            expect(res).to.equal(testName + "1");
            DS.has = oldhas;
        });

        it("getSkipRows() should work", function() {
            var $input = $("#dsForm-skipRows");
            var getSkipRows = DSPreview.__testOnly__.getSkipRows;
            // test1
            $input.val("2");
            expect(getSkipRows()).to.equal(2);

            // test2
            $input.val("");
            expect(getSkipRows()).to.equal(0);

            // test3
            $input.val("abc");
            expect(getSkipRows()).to.equal(0);

            // test4
            $input.val("-1");
            expect(getSkipRows()).to.equal(0);

            $input.val("");
        });

        it("applyQuote() should work", function() {
            var applyQuote = DSPreview.__testOnly__.applyQuote;
            var $quote = $("#dsForm-quote");

            applyQuote("\'");
            expect($quote.val()).to.equal("\'");
            expect(loadArgs.getQuote()).to.equal("\'");

            // error case
            applyQuote("test");
            expect(loadArgs.getQuote()).not.to.equal("test");
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Delimiter Selection Test", function() {
        before(function() {
            DSPreview.__testOnly__.toggleFormat("CSV");
        });

        it("applyFieldDelim() should work", function() {
            var applyFieldDelim = DSPreview.__testOnly__.applyFieldDelim;

            // test1
            applyFieldDelim("");
            expect($fieldText.hasClass("nullVal")).to.be.true;
            expect($fieldText.val()).to.equal("Null");
            expect(loadArgs.getFieldDelim()).to.equal("");

            //test 2
            applyFieldDelim(",");
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal(",");
            expect(loadArgs.getFieldDelim()).to.equal(",");

            //test 3
            applyFieldDelim("\t");
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal("\\t");
            expect(loadArgs.getFieldDelim()).to.equal("\t");
        });

        it("applyLineDelim() should work", function() {
            var applyLineDelim = DSPreview.__testOnly__.applyLineDelim;

            // test1
            applyLineDelim("");
            expect($lineText.hasClass("nullVal")).to.be.true;
            expect($lineText.val()).to.equal("Null");
            expect(loadArgs.getLineDelim()).to.equal("");

            //test 2
            applyLineDelim("\n");
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\n");
            expect(loadArgs.getLineDelim()).to.equal("\n");
        });

        it("should select line delim", function() {
            var $ele = $("#lineDelim");
            $ele.find('li[name="null"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.true;
            expect($lineText.val()).to.equal("Null");
            expect(loadArgs.getLineDelim()).to.equal("");

            // test2
            $ele.find('li[name="CRLF"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\r\\n");
            expect(loadArgs.getLineDelim()).to.equal("\r\n");

            // test3
            $ele.find('li[name="CR"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\r");
            expect(loadArgs.getLineDelim()).to.equal("\r");

            // test4
            $ele.find('li[name="LF"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\n");
            expect(loadArgs.getLineDelim()).to.equal("\n");
        });

        it("should select field delim", function() {
            var $ele = $("#fieldDelim");
            $ele.find('li[name="null"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.true;
            expect($fieldText.val()).to.equal("Null");
            expect(loadArgs.getFieldDelim()).to.equal("");

            // test2
            $ele.find('li[name="comma"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal(",");
            expect(loadArgs.getFieldDelim()).to.equal(",");

            // test 3
            $ele.find('li[name="tab"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal("\\t");
            expect(loadArgs.getFieldDelim()).to.equal("\t");
        });

        it("should input line delim", function() {
            $lineText.val(",").trigger("input");
            expect(loadArgs.getLineDelim()).to.equal(",");
        });

        it("should input field delim", function() {
            $fieldText.val(",").trigger("input");
            expect(loadArgs.getFieldDelim()).to.equal(",");
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Format Change Test", function() {
        before(function() {
            $("#dsForm-preview").removeClass("xc-hidden")
                                .siblings().addClass("xc-hidden");
        });

        beforeEach(function() {
            DSPreview.__testOnly__.resetForm();
        });

        it("Format Should be CSV", function() {
            DSPreview.__testOnly__.toggleFormat("CSV");
            expect($formatText.data("format")).to.equal("CSV");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isTrue($fieldText.is(":visible"), "has field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
            assert.isTrue($quoteInput.is(":visible"), "has quote char");
            assert.isTrue($skipInput.is(":visible"), "has skip rows");
        });

        it("Format Should be JSON", function() {
            DSPreview.__testOnly__.toggleFormat("JSON");
            expect($formatText.data("format")).to.equal("JSON");

            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isFalse($skipInput.is(":visible"), "no skip rows");
        });

        it("Format Should be Text", function() {
            DSPreview.__testOnly__.toggleFormat("Text");
            expect($formatText.data("format")).to.equal("TEXT");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
            assert.isTrue($quoteInput.is(":visible"), "has quote char");
            assert.isTrue($skipInput.is(":visible"), "has skip rows");
        });

        it("Format Should be Excel", function() {
            DSPreview.__testOnly__.toggleFormat("Excel");
            expect($formatText.data("format")).to.equal("EXCEL");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isFalse($skipInput.is(":visible"), "no skip rows");
            assert.isFalse($udfModuleList.is(":visible"), "no udf module");
            assert.isFalse($udfFuncList.is(":visible"), "no udf func");
            assert.isFalse($form.find(".matchedXPath").is(":visible"), "no xml paths");
            assert.isFalse($form.find(".elementXPath").is(":visible"), "no xml paths");
        });

        it("Format Should be UDF", function() {
            DSPreview.__testOnly__.toggleFormat("UDF");
            expect($formatText.data("format")).to.equal("UDF");

            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isFalse($skipInput.is(":visible"), "no skip rows");
            assert.isTrue($udfModuleList.is(":visible"), "no udf module");
            assert.isTrue($udfFuncList.is(":visible"), "no udf func");
            assert.isFalse($("#dsForm-xPaths").is(":visible"), "no xml paths");
            assert.isFalse($form.find(".matchedXPath").is(":visible"), "no xml paths");
            assert.isFalse($form.find(".elementXPath").is(":visible"), "no xml paths");
        });

        it("Format Should be XML", function() {
            DSPreview.__testOnly__.toggleFormat("XML");
            expect($formatText.data("format")).to.equal("XML");
            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isFalse($skipInput.is(":visible"), "no skip rows");
            assert.isFalse($udfModuleList.is(":visible"), "no udf module");
            assert.isFalse($udfFuncList.is(":visible"), "no udf func");
            assert.isTrue($("#dsForm-xPaths").is(":visible"), "has xml paths");
            assert.isTrue($form.find(".matchedXPath").is(":visible"), "has xml paths");
            assert.isTrue($form.find(".elementXPath").is(":visible"), "has xml paths");
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
            DSForm.show({"noReset": true});
        });
    });

    describe("UDF Func Test", function() {
        var isUseUDFWithFunc;

        before(function() {
            $("#dsForm-preview").removeClass("xc-hidden")
                                .siblings().addClass("xc-hidden");
            isUseUDFWithFunc = DSPreview.__testOnly__.isUseUDFWithFunc;
        });

        it("Should toggle UDF format", function() {
            var isUseUDF = DSPreview.__testOnly__.isUseUDF;
            // test 1
            DSPreview.__testOnly__.toggleFormat("UDF");
            expect($form.find(".format.udf").hasClass("xc-hidden")).to.be.false;
            expect(isUseUDF()).to.be.true;
            expect(isUseUDFWithFunc()).to.be.false;

            // test 2
            DSPreview.__testOnly__.toggleFormat("CSV");
            expect($form.find(".format.udf").hasClass("xc-hidden")).to.be.true;
            expect(isUseUDF()).to.be.false;
            expect(isUseUDFWithFunc()).to.be.false;
        });

        it("Should have default UDF", function() {
            DSPreview.__testOnly__.toggleFormat("UDF");
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;

            // module default:openExcel should exists
            expect($udfModuleList.find("li:contains(default)")).not.to.be.empty;
            expect($udfFuncList.find("li:contains(openExcel)")).not.to.be.empty;
        });

        it("Should select a UDF module", function() {
            DSPreview.__testOnly__.selectUDFModule(null);
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;

            DSPreview.__testOnly__.selectUDFModule("default");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;
        });

        it("Should select a UDF func", function() {
            DSPreview.__testOnly__.selectUDFFunc(null);
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;

            DSPreview.__testOnly__.selectUDFFunc("openExcel");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");
            expect(isUseUDFWithFunc()).to.be.true;
        });

        it("Should validate UDF module", function() {
            var validateUDFModule = DSPreview.__testOnly__.validateUDFModule;
            expect(validateUDFModule("invalidModule")).to.be.false;
            expect(validateUDFModule("default")).to.be.true;
        });

        it("Should validate UDF module", function() {
            var validateUDFFunc = DSPreview.__testOnly__.validateUDFFunc;
            expect(validateUDFFunc("default", "invalidFunc")).to.be.false;
            expect(validateUDFFunc("default", "openExcel")).to.be.true;
        });

        it("Should reset UDF", function() {
            DSPreview.__testOnly__.resetUdfSection();
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Validate Form Test", function() {
        var validateForm;

        before(function() {
            validateForm = DSPreview.__testOnly__.validateForm;
        });

        it("Should validate name", function() {
            loadArgs.setFormat("CSV");
            var $dsName = $form.find(".dsName").eq(0);
            $dsName.val("");

            // test1
            expect(validateForm()).to.be.null;
            assert.isTrue($statusBox.is(":visible"));
            StatusBox.forceHide();

            // test2
            var name = new Array(350).join("a");
            $dsName.val(name);
            expect(validateForm()).to.be.null;
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.TooLong);
            StatusBox.forceHide();

            // test3
            var oldhas = DS.has;
            DS.has = function() {return true; };
            $dsName.val("test");
            expect(validateForm()).to.be.null;
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.DSNameConfilct);
            StatusBox.forceHide();
            DS.has = oldhas;

            // test4
            $dsName.val("test*test");
            expect(validateForm()).to.be.null;
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoSpecialCharOrSpace);
            StatusBox.forceHide();

            // test5
            $dsName.val("test_test");
            expect(validateForm()).not.to.be.null;
            assert.isFalse($statusBox.is(":visible"));

            // test6
            $dsName.val("test-test");
            expect(validateForm()).not.to.be.null;
            assert.isFalse($statusBox.is(":visible"));

            $dsName.val(xcHelper.randName("test"));
        });

        it("Should validate format", function() {
            loadArgs.setFormat(null);
            expect(validateForm()).to.be.null;
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoEmptyList);
            StatusBox.forceHide();

            loadArgs.setFormat("CSV");
        });

        it("Should validate UDF", function() {
            DSPreview.__testOnly__.toggleFormat("UDF");
            $udfModuleList.find("input").val("");

            // empty module test
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // empty func test
            $udfModuleList.find("input").val("default");
            $udfFuncList.find("input").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // valid test
            $udfFuncList.find("input").val("openExcel");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("JSON");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("openExcel");

            // remove UDF checkbox
            $udfModuleList.find("input").val("");
            $udfFuncList.find("input").val("");
            DSPreview.__testOnly__.toggleFormat("CSV");
            expect(validateForm()).not.to.be.null;
        });

        it("should validate delimiter", function() {
            // invalid field delimiter
            $fieldText.removeClass("nullVal").val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidDelim);
            $fieldText.val(",");

            // invalid line delimiter
            $lineText.removeClass("nullVal").val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidDelim);

            // invalid line delimiter
            $lineText.val("ab");
            loadArgs.setLineDelim("ab");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidLineDelim);

            $lineText.val("\r\n");
            loadArgs.setLineDelim("\r\n");

            // invalid quote
            $quoteInput.val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidQuote);

            // valid case
            $quoteInput.val("\"");
            expect(validateForm()).not.to.be.null;
        });

        it("shoud validate genLineNum case", function() {
            var $genLineNumCheckBox = $("#genLineNumbersCheckbox");
            loadArgs.set({format: "raw"});
            loadArgs.setHeader(true);
            $genLineNumCheckBox.find(".checkbox").addClass("checked");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("JSON");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("genLineNumberWithHeader");

            // case 2
            loadArgs.setHeader(false);
            res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("JSON");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("genLineNumber");

            // clear up
            $genLineNumCheckBox.find(".checkbox").removeClass("checked");
        });

        it("should validate special JSON case", function() {
            var detectArgs = DSPreview.__testOnly__.get().detectArgs;
            detectArgs.isSpecialJSON = true;
            loadArgs.set({format: "JSON"});
            $udfModuleList.find("input").val("");

            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("JSON");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("convertNewLineJsonToArrayJson");

            // clear up
            detectArgs.isSpecialJSON = false;
        });

        it("should validate Excel case", function() {
            loadArgs.set({format: "Excel"});

            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("Excel");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("openExcel");
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Restore Form Test", function() {
        before(function() {
            DSPreview.__testOnly__.resetForm();
        });

        it("Should restore form", function() {
            DSPreview.__testOnly__.restoreForm({
                "dsName": "test",
                "moduleName": "default",
                "funcName": "openExcel",
                "format": "UDF",
                "hasHeader": true,
                "fieldDelim": "",
                "lineDelim": "\n",
                "quoteChar": "\"",
                "skipRows": 1
            });

            expect($form.find(".dsName").eq(0).val()).to.equal("test");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");

            expect($formatText.data("format")).to.equal("UDF");
            expect($headerCheckBox.find(".checkbox").hasClass("checked"))
            .to.be.true;

            expect($lineText.val()).to.equal("\\n");
            expect($fieldText.val()).to.equal("Null");
            expect($("#dsForm-skipRows").val()).to.equal("1");
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Preview UI Behavior Test", function() {
        var $previewCard;

        before(function() {
            $previewCard = $("#dsForm-preview");

            DSPreview.__testOnly__.restoreForm({
                "dsName": "test",
                "moduleName": "default",
                "funcName": "openExcel",
                "format": "raw",
                "hasHeader": true,
                "fieldDelim": "",
                "lineDelim": "\n",
                "quoteChar": "\"",
                "skipRows": 1
            });
            // selection of range needs it to be visible
            DSForm.switchView(DSForm.View.Preview);
        });

        it("should apply highligher", function() {
            var highlighter;
            // case 1
            $previewTable.addClass("has-delimiter");
            $previewTable.mouseup();
            highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.be.empty;

            // case 2
            $previewTable.removeClass("has-delimiter").addClass("truncMessage");
            $previewTable.mouseup();
            highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.be.empty;

            // case 3
            $previewTable.removeClass("truncMessage");

            $previewTable.html("a");

            var range = document.createRange();
            range.setStart($previewTable[0].childNodes[0], 0);
            range.setEnd($previewTable[0].childNodes[0], 1);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            $previewTable.mouseup();
            highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.equal("a");

            $previewTable.empty();
        });

        it("should remove highlighter", function() {
            $previewCard.find(".rmHightLight").click();
            var highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.be.empty;
        });

        it("should apply highlighter to delimiter", function() {
            DSPreview.__testOnly__.set(null, "a");
            $previewCard.find(".highlight").click();
            expect(loadArgs.getFieldDelim()).to.equal("a");
        });

        it("should input to set quote", function() {
            $quoteInput.val("a").focus().trigger("input");
            expect(loadArgs.getQuote()).to.equal("a");
        });

        it("should click header box to toggle promote header", function() {
            var $checkbox = $headerCheckBox.find(".checkbox");
            var hasHeader = $checkbox.hasClass("checked");

            $headerCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(!hasHeader);
            expect(loadArgs.useHeader()).to.equal(!hasHeader);

            // toggle back
            $headerCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(hasHeader);
            expect(loadArgs.useHeader()).to.equal(hasHeader);
        });

        it("should toggle gen line num", function() {
            var $checkbox = $genLineNumCheckBox.find(".checkbox");
            var checked = $checkbox.hasClass("checked");

            $genLineNumCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(!checked);

            // toggle back
            $genLineNumCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(checked);
        });

        it("should click colGrab to trigger col resize", function() {
            var oldFunc = TblAnim.startColResize;
            var test = false;
            TblAnim.startColResize = function() {
                test = true;
            };

            var $ele = $('<div class="colGrab"></div>');
            $previewTable.append($ele);
            // nothing happen
            $ele.mousedown();
            expect(test).to.be.false;
            // trigger resize
            $ele.trigger(fakeEvent.mousedown);
            expect(test).to.be.true;

            $ele.remove();
            TblAnim.startColResize = oldFunc;
        });

        it("should click #dsForm-minimize to toggle minize", function() {
            expect($previewCard.hasClass("minimize")).to.be.false;

            var $btn = $("#dsForm-minimize");
            $btn.click();
            expect($previewCard.hasClass("minimize")).to.be.true;
            $btn.click();
            expect($previewCard.hasClass("minimize")).to.be.false;
        });

        it("shuod click change file to trigger previewFileModal", function() {
            var oldFunc = PreviewFileModal.show;
            var test = false;
            PreviewFileModal.show = function() {
                test = true;
            };
            $("#preview-changeFile").click();
            expect(test).to.be.true;
            PreviewFileModal.show = oldFunc;
        });

        it("should click parser to trigger parser", function() {
            var oldParser = DSParser.show;
            var oldSelect = PreviewFileModal.show;
            var test1 = false;
            var test2 = false;

            DSParser.show = function() {
                test1 = true;
            };
            PreviewFileModal.show = function() {
                test2 = true;
            };

            var isFolder = DSPreview.__testOnly__.get().isViewFolder;
            DSPreview.__testOnly__.set(null, null, false);
            $("#preview-parser").click();
            expect(test1).to.be.true;
            expect(test2).to.be.false;

            DSPreview.__testOnly__.set(null, null, true);
            $("#preview-parser").click();
            expect(test1).to.be.true;
            expect(test2).to.be.true;

            if (isFolder) {
                DSPreview.__testOnly__.set(null, null, true);
            }
            DSParser.show = oldParser;
            PreviewFileModal.show = oldSelect;
        });

        it("should click to toggle advanced option", function() {
            var $advanceSection = $form.find(".advanceSection");
            var $button = $advanceSection.find(".listWrap");

            expect($advanceSection.hasClass("active")).to.be.false;
            // open advance option
            $button.click();
            expect($advanceSection.hasClass("active")).to.be.true;
            // close advance option
            $button.click();
            expect($advanceSection.hasClass("active")).to.be.false;
        });

        it("should click to fetch more rows", function(done) {
            DSPreview.__testOnly__.set("abc");
            $("#dsForm-skipRows").val("0");
            var test = false;
            var oldFunc = XcalarPreview;
            XcalarPreview = function() {
                test = true;
                return PromiseHelper.resolve([{
                    buffer: "efg"
                }]);
            };

            var $section = $previewTable.closest(".datasetTbodyWrap");
            var $previewBottom = $section.find(".previewBottom");
            $previewBottom.addClass("load");
            $previewBottom.find(".action").click();

            UnitTest.testFinish(function() {
                return !$previewBottom.hasClass("load");
            })
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldFunc;
            });
        });

        it("should change format", function() {
            loadArgs.set({format: "CSV"});
            $("#fileFormatMenu").find("li[name=JSON]").trigger(fakeEvent.mouseup);
            expect(loadArgs.getFormat()).to.equal("JSON");
            expect($("#fileFormat input").val()).to.equal("JSON");
            // clear up
            loadArgs.set({format: "CSV"});
        });

        it("should click confirm to submit the form", function() {
            // make an error case
            $form.find(".dsName").eq(0).val("");
            $form.find(".confirm:not(.creatTable)").click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("should click cancel to back to form", function() {
            loadArgs.set({
                targetName: gDefaultSharedRoot,
                path: "/abc"
            });
            var $button = $form.find(".cancel");
            var oldGetLicense = XVM.getLicenseMode;
            var oldUpload = DSUploader.show;
            var oldForm = DSForm.show;
            var oldFileBrowser = FileBrowser.show;
            var test1 = test2 = test3 = false;

            DSUploader.show = function() { test1 = true; };
            DSForm.show = function() { test2 = true; };
            FileBrowser.show = function() { test3 = true; };

            // case 1
            XVM.getLicenseMode = function() { return XcalarMode.Demo; };
            $button.click();
            expect(test1).to.be.true;
            expect(test2).to.be.false;
            expect(test3).to.be.false;
            test1 = false;

            // case 2
            loadArgs.set({
                targetName: gDefaultSharedRoot,
                path: "/abc"
            });
            XVM.getLicenseMode = function() { return XcalarMode.Oper; };
            DSPreview.__testOnly__.setBackToFormCard(true);
            $button.click();
            expect(test1).to.be.false;
            expect(test2).to.be.true;
            expect(test3).to.be.false;
            test2 = false;

            // case 3
            loadArgs.set({
                targetName: gDefaultSharedRoot,
                path: "/abc"
            });
            DSPreview.__testOnly__.setBackToFormCard(false);
            $button.click();
            expect(test1).to.be.false;
            expect(test2).to.be.false;
            expect(test3).to.be.true;

            XVM.getLicenseMode = oldGetLicense;
            DSUploader.show = oldUpload;
            DSForm.show = oldForm;
            FileBrowser.show = oldFileBrowser;
        });

        after(function() {
            DSPreview.__testOnly__.set();
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Show Preview and Submit Test", function() {
        before(function() {
            DSPreview.__testOnly__.resetForm();
            DSForm.show({"noReset": true});
        });

        it("DSPreview.show() should work", function(done) {
            DSPreview.show({
                "targetName": testDatasets.sp500.targetName,
                "path": testDatasets.sp500.path
            }, true)
            .then(function() {
                expect($previewTable.html()).not.to.equal("");
                expect($formatText.data("format")).to.equal("CSV");
                expect($headerCheckBox.find(".checkbox").hasClass("checked"))
                .to.be.false;
                expect($lineText.val()).to.equal("\\n");
                expect($fieldText.val()).to.equal("\\t");
                expect($quoteInput.val()).to.equal("\"");
                expect($skipInput.val()).to.equal("0");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should sumibt form and load ds", function(done) {
            var validFunc = function(dsName) { return !DS.has(dsName); };
            var testDS = xcHelper.uniqueRandName("testSuitesSp500", validFunc, 10);
            $form.find(".dsName").eq(0).val(testDS);
            var $grid;
            DSPreview.__testOnly__.submitForm()
            .then(function() {
                expect(DS.has(testDS)).to.be.true;
                $grid = DS.getGridByName(testDS);
                expect($grid).not.to.be.null;

                var innerDeferred = jQuery.Deferred();
                // dealy delete ds since show the sample table needs time
                setTimeout(function() {
                    var dsObj = DS.getDSObj($grid.data("dsid"));
                    DS.__testOnly__.delDSHelper($grid, dsObj)
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                }, 300);
                return innerDeferred.promise();
            })
            .then(function() {
                // make sure ds is deleted
                expect(DS.has(testDS)).to.be.false;
                $grid = DS.getGridByName(testDS);
                expect($grid).to.be.null;
                done();
            })
            .fail(function() {
                // Intentionally fail the test
                done("fail");
            });
        });
    });

    after(function() {
        StatusBox.forceHide();

        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});
