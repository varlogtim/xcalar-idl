describe('ExportView', function() {
    var testDs;
    var tableName;
    var prefix;
    var $exportForm;
    var tableId;

    before(function(done) {
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            $exportForm = $('#exportView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });


            ExportView.show(tableId)
            .then(function() {
                done();
            });
        });
    });
    
    describe('check export initial state', function() {
        it('inputs should be prefilled', function() {
            expect($exportForm.find('.tableList .text:visible')).to.have.lengthOf(1);
            expect($exportForm.find('.tableList .text').text()).to.equal(tableName);
            expect($exportForm.find('#exportName:visible')).to.have.lengthOf(1);
            expect($exportForm.find('#exportName').val()).to.equal(tableName.split('#')[0]);
            expect($exportForm.find("#exportPath").val()).to.equal("Default");
            expect($exportForm.find('.columnsToExport li')).to.have.lengthOf(6);
            expect($exportForm.find('.advancedSection .formRow').length).to.be.gt(4);
            expect($exportForm.find('.advancedSection .formRow:visible')).to.have.lengthOf(0);
        });

        it('advancedOptions defaults should be set', function() {
            var getAdvancedOptions = ExportView.__testOnly__.getAdvancedOptions;
            var options = getAdvancedOptions();
            expect(options.createRule).to.equal(ExExportCreateRuleT.ExExportCreateOnly);
            expect(options.format).to.equal(DfFormatTypeT.DfFormatCsv);
            expect(options.headerType).to.equal(ExSFHeaderTypeT.ExSFHeaderEveryFile);
            expect(options.splitType).to.equal(ExSFFileSplitTypeT.ExSFFileSplitForceSingle);
            expect(options.csvArgs.fieldDelim).to.equal("\t");
            expect(options.csvArgs.recordDelim).to.equal("\n");
        });
    });

    describe('function checkDuplicateExportName', function() {

        // create an export target with name "exportUnitTest";
        var exportName = "exportUnitTest";
        before(function(done) {
            var submitForm = ExportView.__testOnly__.submitForm;
            $exportForm.find("#exportName").val(exportName);
            submitForm()
            .always(function() {
                if ($("#alertModal:visible").length) {
                    $("#alertModal").find('.close').click();
                    ExportView.show(tableId)
                    .then(function() {
                        done();
                    });
                } else {
                    done();
                }
            });
        });
        
        it('checkDuplicateExportName should work', function(done) {
            var check = ExportView.__testOnly__.checkDuplicateExportName;
            var options = ExportView.__testOnly__.getAdvancedOptions();
            // except a duplicate, so should return true
            check(exportName, options)
            .then(function(result) {
                expect(result).to.be.true;

                // using a unique export name, so should return false
                check(exportName + Date.now(), options)
                .then(function(result) {
                    expect(result).to.be.false;
                    done();
                });
            });
        });

    });

    describe('function checkSortedTable', function() {
        // xx need to try sorting table and testing this
        it('checkSortedTable should work', function() {
            var check = ExportView.__testOnly__.checkSortedTable;
            expect(check()).to.be.false;
        });

    });

    describe('advancedOptions', function() {

        it('function restoretAdvanced should work', function() {
            var getAdvancedOptions = ExportView.__testOnly__.getAdvancedOptions;
            var options = getAdvancedOptions();
            expect(options.createRule).to.equal(ExExportCreateRuleT.ExExportCreateOnly);
            expect(options.format).to.equal(DfFormatTypeT.DfFormatCsv);
            expect(options.headerType).to.equal(ExSFHeaderTypeT.ExSFHeaderEveryFile);
            expect(options.splitType).to.equal(ExSFFileSplitTypeT.ExSFFileSplitForceSingle);
            expect(options.csvArgs.fieldDelim).to.equal("\t");
            expect(options.csvArgs.recordDelim).to.equal("\n");

            $exportForm.find('.splitType .radioButton:eq(1)').click();
            $exportForm.find('.headerType .radioButton:eq(1)').click();
            $exportForm.find('.createRule .radioButton:eq(1)').click();
            var options = getAdvancedOptions();
            expect(options.createRule).to.equal(ExExportCreateRuleT.ExExportDeleteAndReplace);
            expect(options.headerType).to.equal(ExSFHeaderTypeT.ExSFHeaderSeparateFile);
            expect(options.splitType).to.equal(ExSFFileSplitTypeT.ExSFFileSplitNone);

            ExportView.__testOnly__.restoreAdvanced();
            var options = getAdvancedOptions();
            expect(options.createRule).to.equal(ExExportCreateRuleT.ExExportCreateOnly);
            expect(options.format).to.equal(DfFormatTypeT.DfFormatCsv);
            expect(options.headerType).to.equal(ExSFHeaderTypeT.ExSFHeaderEveryFile);
            expect(options.splitType).to.equal(ExSFFileSplitTypeT.ExSFFileSplitForceSingle);
            expect(options.csvArgs.fieldDelim).to.equal("\t");
            expect(options.csvArgs.recordDelim).to.equal("\n");
        });
    });

    after(function(done) {
        ExportView.close();

        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
           done();
        });
    });
});