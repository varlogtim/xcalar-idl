describe("DSPreview Test", function() {
    // Note that this function is called in very early time
    // so do not initialize any resuable varible here
    // instead, initialize in the it() function
    var $previewTable;

    var $formatText;

    var $fieldText;
    var $lineText;

    var $udfArgs;
    var $udfModuleList;
    var $udfFuncList;

    var $headerCheckBox; // promote header checkbox
    var $udfCheckbox; // udf checkbox

    var $skipInput;
    var $quoteInput;

    var $statusBox;

    var loadArgs;

    var $mainTabCache;

    before(function(){
        $previewTable = $("#previewTable");

        $formatText = $("#fileFormat .text");

        $fieldText = $("#fieldText");
        $lineText = $("#lineText");

        $udfArgs = $("#udfArgs");
        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox"); // promote header checkbox
        $udfCheckbox = $("#udfCheckbox"); // udf checkbox

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
            expect(res.endsWith(".preview")).to.be.true;

            res = getPreviewTableName();
            expect(res.indexOf("previewTable") > 0).to.be.true;
            expect(res.endsWith(".preview")).to.be.true;
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

        it("Should get advance option", function() {
            var advanceOption = DSPreview.getAdvanceOption();
            expect(advanceOption).to.be.an.instanceof(DSFormAdvanceOption);
        });
    });

    describe("Suggest Test", function() {
        before(function() {
            loadArgs.reset();
        });

        it("Should detect correct format", function() {
            var detectFormat = DSPreview.__testOnly__.detectFormat;
            expect(detectFormat("Excel")).to.equal("Excel");

            var data = "[{\"test\"}";
            expect(detectFormat(null, data, "\n")).to.equal("JSON");

            data = "{\"test\": \"val\"}";
            expect(detectFormat(null, data, "\n")).to.equal("JSON");

            data = "abc";
            expect(detectFormat(null, data, "\n")).to.equal("CSV");
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
            expect(res).to.equal(DSFormTStr.NoParseJSON);

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

            expect($highLightBtn.hasClass("xc-disabled")).to.be.false;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.false;
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
            .then(function() {
                var res = DSPreview.__testOnly__.get();
                expect(res.highlighter).to.equal("");
                expect($previewTable.html()).to.equal("");
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        after(function() {
            DSPreview.__testOnly__.set("");
            $previewTable.empty();
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

        it("getNameFromPath() should work", function() {
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
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
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
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
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
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
            assert.isTrue($quoteInput.is(":visible"), "has quote char");
            assert.isTrue($skipInput.is(":visible"), "has skip rows");
        });

        it("Format Should be Excel", function() {
            DSPreview.__testOnly__.toggleFormat("Excel");
            expect($formatText.data("format")).to.equal("EXCEL");

            // UI part
            assert.isFalse($udfCheckbox.is(":visible"), "no udf checkbox");
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "has quote char");
            assert.isFalse($skipInput.is(":visible"), "has skip rows");
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

        it("Should toggle UDF", function() {
            var isUseUDF = DSPreview.__testOnly__.isUseUDF;
            var $checkbox = $udfCheckbox.find(".checkbox");

            // test 1
            DSPreview.__testOnly__.toggleUDF(true);
            expect($udfArgs.hasClass("active")).to.be.true;
            expect($checkbox.hasClass("checked")).to.be.true;
            expect(isUseUDF()).to.be.true;
            expect(isUseUDFWithFunc()).to.be.false;

            // test 2
            DSPreview.__testOnly__.toggleUDF(false);
            expect($udfArgs.hasClass("active")).to.be.false;
            expect($checkbox.hasClass("checked")).to.be.false;
            expect(isUseUDF()).to.be.false;
            expect(isUseUDFWithFunc()).to.be.false;
        });

        it("Should have default UDF", function() {
            DSPreview.__testOnly__.toggleUDF(true);
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

    describe("Should validate form", function() {
        var validateForm;

        before(function() {
            validateForm = DSPreview.__testOnly__.validateForm;
        });

        it("Should validate name", function() {
            var $dsName = $("#dsForm-dsName");
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
            expect(validateForm()).to.be.true;
            assert.isFalse($statusBox.is(":visible"));

            // test6
            $dsName.val("test-test");
            expect(validateForm()).to.be.true;
            assert.isFalse($statusBox.is(":visible"));

            $dsName.val("test");
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
            $udfCheckbox.find(".checkbox").click();
            $udfModuleList.find("input").val("");

            // empty module test
            expect(validateForm()).to.be.null;
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoEmptyList);
            StatusBox.forceHide();

            // empty func test
            $udfModuleList.find("input").val("default");
            $udfFuncList.find("input").val("");
            expect(validateForm()).to.be.null;
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoEmptyList);
            StatusBox.forceHide();

            // valid test
            $udfFuncList.find("input").val("openExcel");
            expect(validateForm()).not.to.be.null;

            // remove UDF checkbox
            $udfCheckbox.find(".checkbox").click();
            expect(validateForm()).not.to.be.null;
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
                "format": "raw",
                "hasHeader": true,
                "fieldDelim": "",
                "lineDelim": "\n",
                "quoteChar": "\"",
                "skipRows": 1
            });

            expect($("#dsForm-dsName").val()).to.equal("test");

            expect($udfCheckbox.find(".checkbox").hasClass("checked"))
            .to.be.true;
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");

            expect($formatText.data("format")).to.equal("TEXT");
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

    describe("Show Preview and Submit Test", function() {
        before(function() {
            DSPreview.__testOnly__.resetForm();
            DSForm.show({"noReset": true});
        });

        it("DSPreview.show() should work", function(done) {
            var path = testDatasets.sp500.path;
            DSPreview.show({"path": path}, true)
            .then(function() {
                expect($previewTable.html()).not.to.equal("");
                expect($formatText.data("format")).to.equal("CSV");
                expect($headerCheckBox.find(".checkbox").hasClass("checked"))
                .to.be.false;
                expect($udfCheckbox.find(".checkbox").hasClass("checked"))
                .to.be.false;
                expect($lineText.val()).to.equal("\\n");
                expect($fieldText.val()).to.equal("\\t");
                expect($quoteInput.val()).to.equal("\"");
                expect($skipInput.val()).to.equal("0");
                done();
            })
            .fail(function() {
                throw "Fail Case!";
            });
        });

        it("Should sumibt form and load ds", function(done) {
            var testDS = xcHelper.uniqueRandName("testSuitesSp500", DS.has, 10);
            $("#dsForm-dsName").val(testDS);
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
                throw "Fail Case!";
            });
        });
    });

    after(function() {
        StatusBox.forceHide();

        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});
