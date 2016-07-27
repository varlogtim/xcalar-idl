function dsFormModuleTest() {
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
            DSForm.hide();
            assert.isFalse($("#importDataView").is(":visible"), "Should see form");
        });

        it("Should see form", function() {
            DSForm.show();
            assert.isTrue($("#importDataView").is(":visible"), "Should see form");
        });
    });

    describe("Reset Form Test", function() {
        before(function() {
            // set some test value and reset
            $filePath.val("test");
            $fileName.val("test");
            $formatText.data("format", "test");
        });

        it("Should Reset Form When call resetForm()", function() {
            DSForm.__testOnly__.resetForm();
            expect($filePath.val()).to.be.empty;
            expect($fileName.val()).to.be.empty;
            expect($formatText.data('format')).to.equal('');
        });
    });

    describe("Reset Form Test2", function() {
        before(function() {
            // set some test value and reset
            $filePath.val("test");
            $fileName.val("test");
            $formatText.data("format", "test");
        });

        it("Should Use DSForm.clear() to reset", function() {
            DSForm.clear();
            expect($filePath.val()).to.be.empty;
            expect($fileName.val()).to.be.empty;
            expect($formatText.data("format")).to.equal("");
        });
    });

    describe("Format Change Test", function() {
        beforeEach(function() {
            DSForm.__testOnly__.resetForm();
        });

        it("Format Should be CSV", function() {
            DSForm.__testOnly__.toggleFormat("CSV");
            expect($formatText.data("format")).to.equal("CSV");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isTrue($csvDelim.is(":visible"), "has delimiter section");
            assert.isTrue($fieldText.is(":visible"), "has field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
        });

        it("Format Should be JSON", function() {
            DSForm.__testOnly__.toggleFormat("JSON");
            expect($formatText.data("format")).to.equal("JSON");

            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isFalse($csvDelim.is(":visible"), "no delimiter section");
        });

        it("Format Should be Text", function() {
            DSForm.__testOnly__.toggleFormat("Text");
            expect($formatText.data("format")).to.equal("TEXT");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isTrue($udfCheckbox.is(":visible"), "has udf checkbox");
            assert.isTrue($csvDelim.is(":visible"), "has delimiter section");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
        });

        it("Format Should be Excel", function() {
            DSForm.__testOnly__.toggleFormat("Excel");
            expect($formatText.data("format")).to.equal("EXCEL");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isFalse($udfCheckbox.is(":visible"), "no udf checkbox");
            assert.isFalse($csvDelim.is(":visible"), "no delimiter section");
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    describe("Allow Browse Test", function() {
        var isValidPathToBrowse;

        before(function() {
            isValidPathToBrowse = DSForm.__testOnly__.isValidPathToBrowse;
        });

        it("Should allow browse invalid path", function() {
            var paths = [
            {
                "protocol": "nfs:///",
                "path"    : ""
            },
            {
                "protocol": "hdfs://",
                "path"    : "host/"
            }];
            paths.forEach(function(pathObj) {
                var isValid = isValidPathToBrowse(pathObj.protocol, pathObj.path);
                expect(isValid).to.be.true;
                assert.isFalse($statusBox.is(":visible"), "no statux box");
            });
        });

        it("Should not allow browse of invalid path", function() {
            var paths = [{
                "protocol": "hdfs://",
                "path"    : "hostNoSlash"
            },
            {
                "protocol": "hdfs://",
                "path"    : ""
            }];
            paths.forEach(function(pathObj) {
                var isValid = isValidPathToBrowse(pathObj.protocol, pathObj.path);
                expect(isValid).to.be.false;
                assert.isTrue($statusBox.is(":visible"), "see statux box");

                $("#statusBoxClose").mousedown();
                assert.isFalse($statusBox.is(":visible"), "no statux box");
            });
        });
    });

    describe("Allow Preview Test", function() {
        beforeEach(function() {
            $("#statusBoxClose").mousedown();
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        it("Should not allow preivew of empty path", function() {
            $filePath.val("");
            $formatText.data("format", "CSV");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.false;

            // check status box
            assert.isTrue($statusBox.is(":visible"), "see statux box");
            assert.equal($statusBox.find(".message").text(), ErrTStr.NoEmpty);
        });

        it("Should not allow preivew of invalid format", function() {
            $filePath.val("test");
            $formatText.data("format", "wrongformat");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.false;

            // check status box
            assert.isTrue($statusBox.is(":visible"), "see statux box");
            assert.equal($statusBox.find(".message").text(), ErrTStr.NoEmptyList);
        });

        it("Should allow preivew json", function() {
            $filePath.val("test");
            $formatText.data("format", "JSON");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.true;

            // check status box
            assert.isFalse($statusBox.is(":visible"), "see statux box");
        });

        it("Should not allow preivew excel", function() {
            $formatText.data("format", "EXCEL");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.false;

            // check status box
            assert.isTrue($statusBox.is(":visible"), "see statux box");
            assert.equal($statusBox.find(".message").text(), ErrTStr.NoPreviewExcel);
        });

        it("Should allow empty format", function() {
            $formatText.data("format", "");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.true;

            // check status box
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        it("Should allow other case", function() {
            $formatText.data("format", "CSV");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.true;

            // check status box
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    describe("Check UDF Test", function() {
        var checkUDF;

        before(function() {
            checkUDF = DSForm.__testOnly__.checkUDF;
            DSForm.__testOnly__.toggleFormat("CSV");
        });

        it("Should be valid with no udf", function() {
            var res = checkUDF();
            expect(res).to.be.an('object');
            expect(res).to.have.property('isValid', true);
            expect(res).to.have.property('hasUDF', false);
            expect(res).to.have.property('moduleName', '');
            expect(res).to.have.property('funcName', '');
        });

        it("Should be invalid with udf check but no module", function() {
            $("#udfCheckbox .checkbox").click();
            var res = checkUDF();
            expect(res).to.be.an('object');
            expect(res).to.have.property('isValid', false);
            expect(res).to.have.property('hasUDF', true);
            expect(res).to.have.property('moduleName', '');
            expect(res).to.have.property('funcName', '');
            // check status box
            assert.isTrue($statusBox.is(":visible"), "see statux box");
            assert.equal($statusBox.find(".message").text(), ErrTStr.NoEmptyList);
        });

        it("Should be invalid with no func", function() {
            $("#udfArgs-moduleList .text").val("testModule");
            var res = checkUDF();
            expect(res).to.be.an('object');
            expect(res).to.have.property('isValid', false);
            expect(res).to.have.property('hasUDF', true);
            expect(res).to.have.property('moduleName', 'testModule');
            expect(res).to.have.property('funcName', '');
            // check status box
            assert.isTrue($statusBox.is(":visible"), "see statux box");
            assert.equal($statusBox.find(".message").text(), ErrTStr.NoEmptyList);
        });

        it("Should be valid with module and func", function() {
            $("#udfArgs-funcList .text").val("testFunc");
            var res = checkUDF();
            expect(res).to.be.an('object');
            expect(res).to.have.property('isValid', true);
            expect(res).to.have.property('hasUDF', true);
            expect(res).to.have.property('moduleName', 'testModule');
            expect(res).to.have.property('funcName', 'testFunc');
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    describe("promoptHeaderAlert Test", function() {
        var minModeCache;
        var promoptHeaderAlert;
        var $alertModal;

        before(function() {
            $alertModal = $("#alertModal");
            promoptHeaderAlert = DSForm.__testOnly__.promoptHeaderAlert;
        });

        it("Should alert when CSV with no header", function(done) {
            promoptHeaderAlert("CSV", false)
            .always(function() {
                assert.isFalse($alertModal.is(":visible"), "close alert");
                done();
            });

            assert.isTrue($alertModal.is(":visible"), "see alert");
            $alertModal.find(".close").click();
        });

        it("Should not alert when CSV with header", function(done) {
            promoptHeaderAlert("CSV", true)
            .always(function() {
                assert.isFalse($alertModal.is(":visible"), "close alert");
                done();
            });
        });

        it("Should alert when Raw with no header", function(done) {
            promoptHeaderAlert("raw", false)
            .always(function() {
                assert.isFalse($alertModal.is(":visible"), "close alert");
                done();
            });

            assert.isTrue($alertModal.is(":visible"), "see alert");
            $alertModal.find(".close").click();
        });

        it("Should not alert when Raw with header", function(done) {
            promoptHeaderAlert("raw", true)
            .always(function() {
                assert.isFalse($alertModal.is(":visible"), "close alert");
                done();
            });
        });

        it("Should alert when Excel with no header", function(done) {
            promoptHeaderAlert("Excel", false)
            .always(function() {
                assert.isFalse($alertModal.is(":visible"), "close alert");
                done();
            });

            assert.isTrue($alertModal.is(":visible"), "see alert");
            $alertModal.find(".close").click();
        });

        it("Should not alert when Excel with header", function(done) {
            promoptHeaderAlert("Excel", true)
            .always(function() {
                assert.isFalse($alertModal.is(":visible"), "close alert");
                done();
            });
        });

        it("Should not alert when format is JSON", function(done) {
            promoptHeaderAlert("JSON", true)
            .always(function() {
                assert.isFalse($alertModal.is(":visible"), "close alert");
                done();
            });
        });
    });

    describe("UDF Func Test", function() {
        before(function() {
            DSForm.__testOnly__.toggleFormat("CSV");
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
            DSForm.__testOnly__.selectUDFModule("default");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
        });

        it("Should select a udf func", function() {
            DSForm.__testOnly__.selectUDFFunc("openExcel");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");
        });

        it("Should reset udf", function() {
            DSForm.__testOnly__.resetUdfSection();
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    describe("Submit Form Test", function() {
        var testDS;

        before(function() {
            testDS = xcHelper.uniqueRandName("testSuitesSp500", DS.has, 10);
            $("#fileProtocol input").val(testDatasets.sp500.protocol);
            $filePath.val(testDatasets.sp500.path);
            $fileName.val(testDS);
            // test the case when have header(otherwise it will have header prmopt)
            $("#promoteHeaderCheckbox .checkbox").addClass("checked");
        });

        // no format is always not empty, default is CSV
        // it("Should not allow empty format", function(done) {
        //     DSForm.__testOnly__.submitForm()
        //     .then(function() {
        //         // Intentionally fail the test
        //         throw "Fail Case!";
        //     })
        //     .fail(function(error) {
        //         expect(error).to.equal("Checking Invalid");
        //         done();
        //     });
        // });

        it("Should not pass invalid url", function(done) {
            DSForm.__testOnly__.toggleFormat("CSV");
            $filePath.val("netstore/datasets/sp500-invalidurl");

            DSForm.__testOnly__.submitForm()
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
            DSForm.__testOnly__.toggleFormat("CSV");
            $filePath.val("netstore/datasets/sp500.csv");

            var $grid;

            DSForm.__testOnly__.submitForm()
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
            .fail(function(error) {
                // Intentionally fail the test
                throw "Fail Case!";
            });
        });
    });

    after(function() {
        $("#promoteHeaderCheckbox .checkbox").removeClass("checked");
    });
}
