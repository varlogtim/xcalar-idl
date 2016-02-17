function dataFormModuleTest() {
    var $mainTabCache;

    var $filePath;
    var $fileName;
    var $formatText;

    var $csvDelim; // csv delimiter args
    var $fieldText;
    var $lineText;

    var $udfArgs;
    var $udfModuleList;
    var $udfFuncList;

    var $headerCheckBox; // promote header checkbox
    var $udfCheckbox; // udf checkbox

    var $statusBox;

    before(function(){
        // go to the data store tab, or some UI effect like :visible cannot test
        $mainTabCache = $(".mainMenuTab.active");
        $('#dataStoresTab').click();

        $filePath = $("#filePath");
        $fileName = $("#fileName");
        $formatText  = $("#fileFormat .text");

        $csvDelim = $("#csvDelim"); // csv delimiter args
        $fieldText = $("#fieldText");
        $lineText = $("#lineText");

        $udfArgs  = $("#udfArgs");
        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox"); // promote header checkbox
        $udfCheckbox = $("#udfCheckbox"); // udf checkbox

        $statusBox = $("#statusBox");
    });

    describe("Show Form Test", function() {
        it("Should not see form", function() {
            DatastoreForm.hide();
            assert.isFalse($("#importDataView").is(":visible"), "Should see form");
        });

        it("Should see form", function() {
            DatastoreForm.show();
            assert.isTrue($("#importDataView").is(":visible"), "Should see form");
        });
    });

    describe("Reset Form Test", function() {
        before(function() {
            // set some test value and reset
            $filePath.val("test");
            $fileName.val("test");
            $formatText.val("test");

            expect($filePath.val()).to.equal("test");
            expect($fileName.val()).to.equal("test");
            expect($formatText.val()).to.equal("test");
        });

        it("Should Reset Form When call resetForm()", function() {
            DatastoreForm.__testOnly__.resetForm();
            expect($filePath.val()).to.be.empty;
            expect($fileName.val()).to.be.empty;
            expect($formatText.val()).to.be.empty;
        });

        it("Should not see checkbox", function() {
            assert.isFalse($headerCheckBox.is(":visible"), "No header checkbox");
            assert.isFalse($udfCheckbox.is(":visible"), "No udf checkbox");
        });

        it("Should not see delimiter and udf section", function() {
            assert.isFalse($csvDelim.is(":visible"), "No delimiter section");
            assert.isFalse($udfArgs.is(":visible"), "No udf checkbox");
        });
    });

    describe("Format Change Test", function() {
        beforeEach(function() {
            DatastoreForm.__testOnly__.resetForm();
        });

        it("Format Should be CSV", function() {
            DatastoreForm.__testOnly__.toggleFormat("CSV");
            expect($formatText.val()).to.equal("CSV");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isTrue($csvDelim.is(":visible"), "has delimiter section");
            assert.isTrue($fieldText.is(":visible"), "has field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
        });

        it("Format Should be JSON", function() {
            DatastoreForm.__testOnly__.toggleFormat("JSON");
            expect($formatText.val()).to.equal("JSON");

            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isFalse($csvDelim.is(":visible"), "no delimiter section");
        });

        it("Format Should be Raw", function() {
            DatastoreForm.__testOnly__.toggleFormat("Raw");
            expect($formatText.val()).to.equal("Raw");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isTrue($csvDelim.is(":visible"), "has delimiter section");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
        });

        it("Format Should be Excel", function() {
            DatastoreForm.__testOnly__.toggleFormat("Excel");
            expect($formatText.val()).to.equal("Excel");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isFalse($udfCheckbox.is(":visible"), "no udf checkbox");
            assert.isFalse($csvDelim.is(":visible"), "no delimiter section");
        });

        it("Format Should be Random", function() {
            DatastoreForm.__testOnly__.toggleFormat("Random");
            expect($formatText.val()).to.equal("Random");

            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isFalse($csvDelim.is(":visible"), "no delimiter section");
        });

        after(function() {
            DatastoreForm.__testOnly__.resetForm();
        });
    });

    describe("Allow Preview Test", function() {
        beforeEach(function() {
            $("#statusBoxClose").mousedown();
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        it("Should not allow preivew of empty path", function() {
            $filePath.val("");
            var isValid = DatastoreForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.false;

            // check status box
            assert.isTrue($statusBox.is(":visible"), "see statux box");
            assert.equal($statusBox.find(".message").text(), ErrorTextTStr.NoEmpty);
        });

        // We allow preview of json and excel now
        // it("Should not allow preivew json", function() {
        //     $filePath.val("test.json");
        //     var isValid = DatastoreForm.__testOnly__.isValidToPreview();
        //     expect(isValid).to.be.false;

        //     // check status box
        //     assert.isTrue($statusBox.is(":visible"), "see statux box");
        //     assert.equal($statusBox.find(".message").text(), ErrorTextTStr.NoPreviewJSON);
        // });

        // it("Should not allow preivew excel", function() {
        //     $filePath.val("test.xlsx");
        //     var isValid = DatastoreForm.__testOnly__.isValidToPreview();
        //     expect(isValid).to.be.false;

        //     // check status box
        //     assert.isTrue($statusBox.is(":visible"), "see statux box");
        //     assert.equal($statusBox.find(".message").text(), ErrorTextTStr.NoPreviewExcel);
        // });

        it("Should allow other case", function() {
            $filePath.val("test");
            var isValid = DatastoreForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.true;

            // check status box
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        after(function() {
            DatastoreForm.__testOnly__.resetForm();
        });
    });

    describe("Delimiter Func Test", function() {
        var tests = [
            {args: "\\t",  expected: "\t"},
            {args: "\\n",  expected: "\n"},
            {args: ",",    expected: ","}
        ];

        before(function() {
            DatastoreForm.__testOnly__.toggleFormat("CSV");
        });

        tests.forEach(function(test) {
            it(test.args + " should be translated", function() {
              $fieldText.val(test.args);
              var res =  DatastoreForm.__testOnly__.delimiterTranslate($fieldText);
              expect(res).to.equal(test.expected);
            });
        });

        it("Should reset to default delimiter", function() {
            DatastoreForm.__testOnly__.resetDelimiter();
            expect($fieldText.val()).to.equal("\\t");
            expect($lineText.val()).to.equal("\\n");
        })

        after(function() {
            DatastoreForm.__testOnly__.resetForm();
        });
    });

    describe("UDF Func Test", function() {
        before(function() {
            DatastoreForm.__testOnly__.toggleFormat("CSV");
            $udfCheckbox.find(".checkbox").click();
        });

        it("Should have default udf", function() {
            assert.isTrue($udfArgs.is(":visible"), "should see udf section");
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;

            // module default:openExcel should exists
            expect($udfModuleList.find('li:contains(default)')).not.to.be.empty;
            expect($udfFuncList.find('li:contains(openExcel)')).not.to.be.empty;
        });

        it("Should select a udf module", function() {
            DatastoreForm.__testOnly__.selectUDFModule("default");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
        });

        it("Should select a udf func", function() {
            DatastoreForm.__testOnly__.selectUDFFunc("openExcel");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");
        });

        it("Should reset udf", function() {
            DatastoreForm.__testOnly__.resetUdfSection();
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
        });

        after(function() {
            DatastoreForm.__testOnly__.resetForm();
        });
    });

    describe("Submit Form Test", function() {
        var testDS;

        before(function() {
            testDS = xcHelper.uniqueRandName("testSuites-dsForm-sp500", DS.has, 10);
            $filePath.val(testDatasets.sp500.url);
            $fileName.val(testDS);
        });

        it("Should not allow empty format", function(done) {
            DatastoreForm.__testOnly__.submitForm()
            .then(function() {
                // Intentionally fail the test
                throw "Fail Case!";
            })
            .fail(function(error) {
                expect(error).to.equal("Checking Invalid");
                done();
            });
        });

        it("Should not pass invalid url", function(done) {
            DatastoreForm.__testOnly__.toggleFormat("CSV");
            $filePath.val("file:///netstore/datasets/sp500-invalidurl");

            DatastoreForm.__testOnly__.submitForm()
            .then(function() {
                // Intentionally fail the test
                throw "Fail Case!";
            })
            .fail(function(error) {
                console.log(error)
                expect(error).to.be.an("object")
                expect(error.status).to.equal(StatusT.StatusNoEnt);
                done();
            });
        });

        it("Should load ds", function(done) {
            DatastoreForm.__testOnly__.toggleFormat("CSV");
            $filePath.val("file:///netstore/datasets/sp500.csv");

            var $grid;

            DatastoreForm.__testOnly__.submitForm()
            .then(function() {
                expect(DS.has(testDS)).to.be.true;
                $grid = DS.getGridByName(testDS);
                expect($grid).not.to.be.null;

                var innerDeferred = jQuery.Deferred();
                // dealy delete ds since show the sample table needs time
                setTimeout(function() {
                    DS.__testOnly__.delDSHelper($grid, testDS)
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
            .fail(function(error) {
                // Intentionally fail the test
                throw "Fail Case!";
            });
        });
    });

    after(function() {
        $mainTabCache.click(); // go back to previous tab
    });
}
