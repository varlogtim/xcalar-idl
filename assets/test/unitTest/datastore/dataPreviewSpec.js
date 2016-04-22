function dataPreviewModuleTest() {
    // Note that this function is called in very early time
    // so do not initialize any resuable varible here
    // instead, initialize in the it() function
    var $previewTable;
    var $highLightBtn;
    var $rmHightLightBtn;

    before(function(){
        $previewTable = $("#previewTable");
        $highLightBtn = $("#preview-highlight");
        $rmHightLightBtn = $("#preview-rmHightlight");
    });

    describe("Basic Function Test", function() {
        it('parseTdHelper should work', function() {
            var parseTdHelper = DataPreview.__testOnly__.parseTdHelper;
            var testCases = [{
                // test1: when not th, has delimiter
                "delimiter": ",",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">h</td>' +
                             '<td class="cell">i</td>'
            },
            {
                // test2: when not th, no delimiter
                "delimiter": "",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<span class="td">h</span>' +
                                '<span class="td has-margin has-comma">' +
                                    ',' +
                                '</span>' +
                                '<span class="td">i</span>' +
                             '</td>'
            },
            {
                // test3: when not th, other delimiter
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">h,i</td>'
            },
            {
                // test4: when is th, has delimiter
                "delimiter": ",",
                "isTh": true,
                "data": ["h", ",", "i"],
                "expectRes": '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizetoheader="true"></div>' +
                                    '<div class="text cell">h</div>' +
                                '</div>' +
                            '</th>' +
                            '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizetoheader="true"></div>' +
                                    '<div class="text cell">i</div>' +
                                '</div>' +
                            '</th>'
            },
            {
                // test5: when not th, delimiter ",", data has backslash
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", "\\", ",", "i"],
                "expectRes": '<td class="cell">h\\,i</td>'
            }];

            testCases.forEach(function(testCase) {
                var td = parseTdHelper(testCase.data, testCase.delimiter,
                                        testCase.isTh);
                expect(td).to.equal(testCase.expectRes);
            });
        });

        it("getTbodyHTML() shoud work", function() {
            var getTbodyHTML = DataPreview.__testOnly__.getTbodyHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["t", "e", "s", "t"]],
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker promote" ' +
                                    'title="Promote Header" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-placement="top" ' +
                                    'data-container="body">' +
                                        '<div class="promoteWrap">' +
                                            '<div class="iconWrapper">' +
                                                '<span class="icon"></span>' +
                                            '</div>' +
                                        '<div class="divider"></div>' +
                                        '</div>' +
                                    '</td>' +
                                    '<td class="cell">' +
                                        '<span class="td">t</span>' +
                                        '<span class="td">e</span>' +
                                        '<span class="td">s</span>' +
                                        '<span class="td">t</span>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            },
            {
                // test2: when has header
                "datas": [["t", "e", "s", "t"], ["h", "i"]],
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker">1</td>' +
                                    '<td class="cell">' +
                                        '<span class="td">h</span>' +
                                        '<span class="td">i</span>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            }
            ];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter
                var hasHeader = testCase.hasHeader;

                DataPreview.__testOnly__.set(delimiter, hasHeader, "");
                var tbody = getTbodyHTML(testCase.datas);
                expect(tbody).to.equal(testCase.expectRes);
            });

            DataPreview.__testOnly__.set("", false, "");
        });

        it("getTheadHTML should work", function() {
            var getTheadHTML = DataPreview.__testOnly__.getTheadHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th>' +
                                        '<div class="header"></div>' +
                                    '</th>' +
                                    '<th>' +
                                        '<div class="header">' +
                                            '<div class="text">Column0</div>' +
                                        '</div>' +
                                    '</th>' +
                                '</tr>' +
                              '</thead>'
            },
            {
                // test2: when has header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th class="undo-promote">' +
                                        '<div class="header" ' +
                                        'title="Undo Promote Header" ' +
                                        'data-toggle="tooltip" ' +
                                        'data-placement="top" ' +
                                        'data-container="body">' +
                                            '<span class="icon"></span>' +
                                        '</div>' +
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
            }
            ];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter
                var hasHeader = testCase.hasHeader;

                DataPreview.__testOnly__.set(delimiter, hasHeader, "");
                var tHead = getTheadHTML(testCase.datas, testCase.tdLen);
                expect(tHead).to.equal(testCase.expectRes);
            });

            DataPreview.__testOnly__.set("", false, "");
        });

        it("highlightHelper() should work", function() {
            var $cell = $('<div class="text cell">'+
                            '<span class="td">h</span>' +
                            '<span class="td">,</span>' +
                            '<span class="td">i</span>' +
                        '</div>');
            DataPreview.__testOnly__.highlightHelper($cell, ",");

            expect($cell.html()).to.equal('<span class="td">h</span>' +
                                '<span class="td highlight">,</span>' +
                                '<span class="td">i</span>');
        });
    });

    describe("Suggest Test", function() {
        var $content;

        before(function() {
            $content = $("#previewSugg .content");
        });

        it("should suggest proper delimiter", function() {
            var $actions;

            DataPreview.__testOnly__.set("", false, "");

            // when nothing to delimit
            $previewTable.html('');
            DataPreview.__testOnly__.suggestHelper();

            $actions = $content.find(".action");
            expect($actions.length).to.equal(1);
            expect($actions.eq(0).hasClass("hint")).to.be.false;
            expect($actions.eq(0).text()).equal('Save & Exit');


            // when delimiter on comma
            $previewTable.html('<span class="has-comma"></span>');
            DataPreview.__testOnly__.suggestHelper();

            $actions = $content.find(".action");
            expect($actions.length).to.equal(2);
            expect($actions.eq(0).hasClass("commaDelim")).to.be.true;
            expect($actions.eq(0).text()).equal('Apply comma as delimiter');
            expect($actions.eq(1).hasClass("hint")).to.be.true;
            expect($actions.eq(1).text()).equal('or Highlight another character as delimiter');

            // when delimiter on tab
            $previewTable.html('<span class="has-tab"></span>');
            DataPreview.__testOnly__.suggestHelper();

            $actions = $content.find(".action");
            expect($actions.length).to.equal(2);
            expect($actions.eq(0).hasClass("tabDelim")).to.be.true;
            expect($actions.eq(0).text()).equal('Apply tab as delimiter');
            expect($actions.eq(1).hasClass("hint")).to.be.true;
            expect($actions.eq(1).text()).equal('or Highlight another character as delimiter');
        });

        it("Should suggest about highlight when has highlighter", function() {
            DataPreview.__testOnly__.set("", false, ",");
            DataPreview.__testOnly__.suggestHelper();

            var $actions = $content.find(".action");
            expect($actions.length).to.equal(2);
            expect($actions.eq(0).hasClass("apply-highlight")).to.be.true;
            expect($actions.eq(0).text()).equal('Apply hightlighted characters as delimiter');
            expect($actions.eq(1).hasClass("rm-highlight")).to.be.true;
            expect($actions.eq(1).text()).equal('Remove highlights');
        });

        it("Should suggest in error url", function() {
            var $actions;
            // load execl error
            DataPreview.__testOnly__.errorSuggestHelper("test.xlsx");

            $actions = $content.find(".action");
            expect($actions.length).to.equal(2);
            expect($actions.eq(0).hasClass("excelLoad hasHeader")).to.be.true;
            expect($actions.eq(0).text()).equal('Load as EXCEL dataset and promote header');
            expect($actions.eq(1).hasClass("excelLoad")).to.be.true;
            expect($actions.eq(1).text()).equal('Load as EXCEL dataset');

            // load json error
            DataPreview.__testOnly__.errorSuggestHelper("test.json");

            $actions = $content.find(".action");
            expect($actions.length).to.equal(1);
            expect($actions.eq(0).hasClass("jsonLoad")).to.be.true;
            expect($actions.eq(0).text()).equal('Load as JSON dataset');

            // other kind of error
            DataPreview.__testOnly__.errorSuggestHelper("test");

            $actions = $content.find(".action");
            expect($actions.length).to.equal(1);
            expect($actions.eq(0).hasClass("hint")).to.be.true;
            expect($actions.eq(0).text()).equal('Use UDF to parse the dataset');
        });

        it("headerPromoteDetect() should work", function() {
            // when no delimiter
            DataPreview.__testOnly__.set("", false, "");
            expect(DataPreview.__testOnly__.headerPromoteDetect()).to.be.false;

            // when has delimiter
            DataPreview.__testOnly__.set(",", false, "");
            // case1
            $previewTable.html('<table><tbody>' +
                                    '<tr>' +
                                        '<td>1</td>' +
                                        '<td>2</td>' +
                                    '<tr>' +
                                    '<tr>' +
                                        '<td>b</td>' +
                                        '<td>b</td>' +
                                    '<tr>' +
                                '</tbody></table>');
            expect(DataPreview.__testOnly__.headerPromoteDetect()).to.be.false;

            // case2
            $previewTable.html('<table><tbody>' +
                                    '<tr>' +
                                        '<td>H1</td>' +
                                        '<td>H2</td>' +
                                        '<td>H3</td>' +
                                    '<tr>' +
                                    '<tr>' +
                                        '<td>1</td>' +
                                        '<td>2</td>' +
                                        '<td>3</td>' +
                                    '<tr>' +
                                '</tbody></table>');
            expect(DataPreview.__testOnly__.headerPromoteDetect()).to.be.true;
        });

        after(function() {
            DataPreview.__testOnly__.set("", false, "");
            $previewTable.empty();
            $content.empty();
        });
    });

    describe("Get Preview Table Test", function() {
        it ("Should get a table from raw data", function() {
            var data = [["h", ",", "i"], ["t", "e", "s", "t"]];
            DataPreview.__testOnly__.set("", false, "", data);
            DataPreview.__testOnly__.getPreviewTable();

            // has 2 rows and 2 columns
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(2);

            DataPreview.__testOnly__.set(",", false, "", data);
            DataPreview.__testOnly__.getPreviewTable();

            // has 2 rows and 3 columns
            expect($previewTable.find("th").length).to.equal(3);
            expect($previewTable.find("tbody tr").length).to.equal(2);
        });

        it("Should highlight delimiter", function() {
            var data = [["h", ",", "i"]];
            DataPreview.__testOnly__.set("", false, "", data);
            DataPreview.__testOnly__.getPreviewTable();

            // can highlight
            DataPreview.__testOnly__.applyHighlight(",");
            expect(DataPreview.__testOnly__.get().highlighter).to.equal(",");
            expect($previewTable.find(".highlight").length).to.equal(1);
            expect($highLightBtn.hasClass("active")).to.be.true;
            expect($rmHightLightBtn.hasClass("active")).to.be.true;

            // can remove highlight
            DataPreview.__testOnly__.applyHighlight("");
            expect(DataPreview.__testOnly__.get().highlighter).to.equal("");
            expect($previewTable.find(".highlight").length).to.equal(0);
            expect($highLightBtn.hasClass("active")).to.be.false;
            expect($rmHightLightBtn.hasClass("active")).to.be.false;
        });

        it("Should apply delimiter", function() {
            var data = [["h", ",", "i"]];
            DataPreview.__testOnly__.set("", false, "", data);
            DataPreview.__testOnly__.getPreviewTable();

            // can apply delimiter
            DataPreview.__testOnly__.applyDelim(",");
            var res = DataPreview.__testOnly__.get();
            expect(res.delimiter).to.equal(",");
            expect(res.highlighter).to.equal("");
            expect($rmHightLightBtn.hasClass("active")).to.be.true;
            expect($previewTable.find(".has-comma").length).to.equal(0);

            // can remove delimiter
            DataPreview.__testOnly__.applyDelim("");
            expect(DataPreview.__testOnly__.get().delimiter).to.equal("");
            expect($rmHightLightBtn.hasClass("active")).to.be.false;
            expect($previewTable.find(".has-comma").length).to.equal(1);
        });

        it("Should toggle promote", function() {
            var data = [["h", ",", "i"]];
            DataPreview.__testOnly__.set("", false, "", data);
            DataPreview.__testOnly__.getPreviewTable();

            // toggle to have header
            DataPreview.__testOnly__.togglePromote();
            expect(DataPreview.__testOnly__.get().hasHeader).to.be.true;
            expect($previewTable.find(".undo-promote").length).to.equal(1);

            // toggle to remove header
            DataPreview.__testOnly__.togglePromote();
            expect(DataPreview.__testOnly__.get().hasHeader).to.be.false;
            expect($previewTable.find(".undo-promote").length).to.equal(0);
        });

        it("Should toggle minimize", function() {
            var $previeWrap = $("#dsPreviewWrap");

            // default is middleSize
            expect($previeWrap.hasClass("fullSize")).to.be.false;

            // can toggle
            DataPreview.__testOnly__.toggleMinimize();
            expect($previeWrap.hasClass("fullSize")).to.be.true;
            DataPreview.__testOnly__.toggleMinimize();
            expect($previeWrap.hasClass("fullSize")).to.be.false;
        });

        it("Should clear preview table", function() {
            var data = [["h", ",", "i"]];
            DataPreview.__testOnly__.set(",", true, "", data);
            DataPreview.__testOnly__.getPreviewTable();

            DataPreview.__testOnly__.clearAll();
            var res = DataPreview.__testOnly__.get();
            expect(res.delimiter).to.equal("");
            expect(res.highlighter).to.equal("");
            expect(res.hasHeader).to.equal(false);
            expect($previewTable.html()).to.equal("");
        });

        after(function() {
            DataPreview.__testOnly__.set("", false, "");
            $previewTable.empty();
        });
    });

    describe("Preview API Test", function() {
        it("DataPreview.show() should work", function(done) {
            $("#filePath").val(testDatasets.sp500.url);

            DataPreview.show()
            .then(function() {
                // expect($previewTable.is(":visible")).to.be.true;
                expect($previewTable.html()).not.to.equal("");
                expect($previewTable.find(".has-tab").length).to.be.above(0);
                done();
            })
            .fail(function() {
                throw "Fail Case!";
            });
        });

        it("DataPreview.clear() should work", function(done) {
            DataPreview.clear()
            .then(function() {
                var res = DataPreview.__testOnly__.get();
                expect(res.delimiter).to.equal("");
                expect(res.highlighter).to.equal("");
                expect(res.hasHeader).to.equal(false);
                done();
            })
            .fail(function() {
                throw "Fail Case!";
            });
        });

        after(function() {
            // DataPreview.clear() doesn't remove preview table's html,
            // so call clearAll() to totally clear
            DataPreview.__testOnly__.clearAll();
        });
    });
}
