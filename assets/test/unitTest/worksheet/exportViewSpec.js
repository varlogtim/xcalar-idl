describe('ExportView Test', function() {
    var testDs;
    var tableName;
    var $exportForm;
    var tableId;
    var tableName2;
    var tableId2;
    var cachedGetTableList;
    var cachedCenterFn;

    before(function(done) {
        var testDSObj = testDatasets.fakeYelp;
        cachedGetTableList = WSManager.getTableList;
        cachedCenterFn = xcHelper.centerFocusedTable;

        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName) {
            testDs = ds;
            tableName = tName;
            $exportForm = $('#exportView');
            tableId = xcHelper.getTableId(tableName);
            
            // add a second table for table list testing
            tableName2 = "fakeTable#zz999";
            tableId2 = "zz999";
            var table = new TableMeta({
                "tableId": tableId2,
                "tableName": tableName2,
                "status": TableType.Active,
                "tableCols": []
            });
            gTables[tableId2] = table;

            WSManager.getTableList = function() {
                var tableList =
                        '<li data-id="' + tableId + '">' + tableName + '</li>' +
                        '<li data-id="' + tableId2 + '">' + tableName2 + '</li>';
                return tableList;
            };

            xcHelper.centerFocusedTable = function() {return;};

            ExportView.show(tableId)
            .then(function() {
                setTimeout(function() {
                    done();
                }, 500);
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
            expect($exportForm.find("#exportLists li").length).to.be.gt(1);
            expect($exportForm.find('.columnsToExport li')).to.have.lengthOf(6);
            expect($exportForm.find('.advancedSection .formRow').length).to.be.gt(4);
            expect($exportForm.find('.advancedSection .formRow:visible')).to.have.lengthOf(0);
        });

        it('exit option on table menu should be available', function() {
            expect($('.xcTableWrap.exportMode').length).to.be.gte(1);
            expect($('#xcTheadWrap-' + tableId).find('.dropdownBox').is(":visible")).to.be.true;
            $('#xcTheadWrap-' + tableId).find('.dropdownBox').click();
            expect($("#tableMenu").find('.exitExport').is(":visible")).to.be.true;
            $('.menu').hide();
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
            expect($exportForm.find('.headerType .subHeading').hasClass('xc-disabled')).to.be.false;
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
                    StatusBox.forceHide();
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

        it("sorted table should return true", function() {
            var check = ExportView.__testOnly__.checkSortedTable;
            var cachedOrder = gTables[tableId].backTableMeta.ordering;
            gTables[tableId].backTableMeta.ordering =
                                    XcalarOrderingT.XcalarOrderingDescending;

            var cachedType = $("#exportPath").data('type');
            $("#exportPath").data('type', 'invalidType');
            expect(check()).to.be.false;
            expect($exportForm.find('.exportRowOrderSection').hasClass("xc-hidden"))
                .to.be.true;

            $("#exportPath").data('type', 1); // ExTargetTypeT.ExTargetSFType
            expect(check()).to.be.true;
            expect($exportForm.find('.exportRowOrderSection').hasClass("xc-hidden"))
                .to.be.false;

            $exportForm.find('.exportRowOrderSection').addClass('xc-hidden');

            gTables[tableId].backTableMeta.ordering = cachedOrder;
            $("#exportPath").data('type', cachedType);
        });
    });

    describe('check user actions', function() {
        var $advancedSection;
        before(function() {
            $advancedSection = $exportForm.find('.advancedSection');
        });

        it("focusTable btn should work", function() {
            var table = gTables[tableId];
            var fnCalled = false;

            xcHelper.centerFocusedTable = function(tId) {
                expect(tId).to.equal(tableId);
                fnCalled = true;
            };

            delete gTables[tableId];
            $exportForm.find('.focusTable').click();
            expect(fnCalled).to.be.false;

            gTables[tableId] = table;
            $exportForm.find('.focusTable').click();
            expect(fnCalled).to.be.true;
            xcHelper.centerFocusedTable = function() {return;};
        });

        it('tableList menu should select table', function() {
            var $tableList = $exportForm.find('.tableList');
            var $ul = $tableList.find('ul');
            var $text = $tableList.find('.text');
            expect($ul.length).to.equal(1);
            expect($ul.is(":visible")).to.be.false;
            expect($text.text()).to.equal(tableName);

            $tableList.trigger(fakeEvent.click);
            expect($ul.is(":visible")).to.be.true;
            expect($ul.find('li').length).to.be.gt(1);
            var $selectedLi = $ul.find('li').filter(function() {
                return $(this).text() === tableName;
            });
            expect($selectedLi.length).to.equal(1);
            expect($ul.find('li.selected').is($selectedLi)).to.be.true;

            var $nextLi = $selectedLi.next();
            expect($nextLi.length).to.equal(1);
            var nextLiName = $nextLi.text();
            expect(nextLiName).to.equal(tableName2);
            $nextLi.trigger(fakeEvent.mouseup);
            expect($text.text()).to.equal(tableName2);

            $selectedLi.trigger(fakeEvent.mouseup);
            expect($text.text()).to.equal(tableName);
        });

        it('tablelist menu select should update columns', function() {
            var $tableList = $exportForm.find('.tableList');
            var numCols = $exportForm.find('.cols li').length;
            expect(numCols).to.be.gt(4);
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols);
            $exportForm.find('.cols li').eq(0).click();
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols - 1);

            // select new new table then back to prev table
            $tableList.trigger(fakeEvent.click);
            $tableList.find('li').filter(function() {
                return $(this).text() === tableName2;
            }).trigger(fakeEvent.mouseup);
            $tableList.find('li').filter(function() {
                return $(this).text() === tableName;
            }).trigger(fakeEvent.mouseup);
      
            expect($tableList.find('.text').text()).to.equal(tableName);
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols);
        });

        it("export location menu should work", function() {
            var $exportList = $("#exportLists");
            var $ul = $exportList.find('ul');
            var $text = $exportList.find('.text');
            expect($ul.length).to.equal(1);
            expect($ul.is(":visible")).to.be.false;
            expect($text.val()).to.equal("Default");

            $exportList.trigger(fakeEvent.click);
            expect($ul.is(":visible")).to.be.true;
            expect($ul.find('li').length).to.be.gt(1);
            var $selectedLi = $ul.find('li').filter(function() {
                return $(this).text() === "Default";
            });
            expect($selectedLi.length).to.equal(1);

            // click the hint
            $ul.find("li").first().trigger(fakeEvent.mouseup);
            expect($text.val()).to.equal("Default");
            expect($text.data('type')).to.equal(1);
            
            $ul.append('<li data-type="2" class="">Other</li>');
            $ul.find('li').last().trigger(fakeEvent.mouseup);
            expect($text.val()).to.equal("Other");
            expect($text.data('type')).to.equal(2);

            $ul.find("li").last().remove();
            $selectedLi.trigger(fakeEvent.mouseup);
            expect($text.val()).to.equal("Default");
            expect($text.data('type')).to.equal(1);
        });

        it('column picker should work', function() {
            var numCols = $exportForm.find('.cols li').length;
            expect(numCols).to.be.gt(4);
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols);

            $exportForm.find('.cols li').eq(0).click();
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols - 1);

            $exportForm.find('.cols li').eq(0).click();
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols);

            var $th = $("#xcTable-" + tableId).find('th.col1');
            expect($th.hasClass('exportable')).to.be.true;
            expect($th.hasClass('modalHighlighted')).to.be.true;

            $th.click(); // deselect

            expect($th.hasClass('exportable')).to.be.true;
            expect($th.hasClass('modalHighlighted')).to.be.false;
            expect($exportForm.find('.cols li').eq(0).hasClass('checked')).to.be.false;

            $th.click(); // select

            expect($th.hasClass('exportable')).to.be.true;
            expect($th.hasClass('modalHighlighted')).to.be.true;
            expect($exportForm.find('.cols li').eq(0).hasClass('checked')).to.be.true;
        });

        it('column name checkboxes should work', function() {
            var numCols = $exportForm.find('.cols li').length;
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols);

            $exportForm.find(".selectAllWrap .checkbox").click();
            expect($exportForm.find('.cols li.checked').length).to.equal(0);

            $exportForm.find(".selectAllWrap .checkbox").click();
            expect($exportForm.find('.cols li.checked').length).to.equal(numCols);
        });

        it('advancedSection should toggle', function() {
            expect($advancedSection.hasClass('collapsed')).to.be.true;
            expect($advancedSection.hasClass('expanded')).to.be.false;
            expect($advancedSection.find('.createRule').length).to.equal(1);
            expect($advancedSection.find('.createRule:visible').length).to.equal(0);
            expect($advancedSection.find('.advancedTitle:visible').length).to.equal(1);
            expect($advancedSection.find('.advancedTitle').height()).to.be.gt(10);

            $advancedSection.find('.advancedTitle').click(); // show

            expect($advancedSection.hasClass('collapsed')).to.be.false;
            expect($advancedSection.hasClass('expanded')).to.be.true;
            expect($advancedSection.find('.createRule:visible').length).to.equal(1);

            $advancedSection.find('.advancedTitle').click(); // hide

            expect($advancedSection.hasClass('collapsed')).to.be.true;
            expect($advancedSection.hasClass('expanded')).to.be.false;
            expect($advancedSection.find('.createRule:visible').length).to.equal(0);
        });

        it('csv to sql toggling should work', function() {
            var $typeRow = $advancedSection.find('.typeRow');
            $advancedSection.find('.advancedTitle').click(); // show
            expect($advancedSection.hasClass('collapsed')).to.be.false;
            expect($advancedSection.hasClass('expanded')).to.be.true;
            expect($typeRow.is(":visible")).to.be.true;

            // first button is CSV and is active
            expect($typeRow.find('.radioButton').eq(0).hasClass('active')).to.be.true;
            expect($typeRow.find('.radioButton').eq(1).hasClass('active')).to.be.false;
            expect($advancedSection.find('.csvRow:visible').length).to.equal(2);

            // select SQL
            $typeRow.find('.radioButton').eq(1).click();

            expect($typeRow.find('.radioButton').eq(0).hasClass('active')).to.be.false;
            expect($typeRow.find('.radioButton').eq(1).hasClass('active')).to.be.true;
            expect($advancedSection.find('.csvRow:visible').length).to.equal(0);

            // select CSV
            $typeRow.find('.radioButton').eq(0).click();

            expect($typeRow.find('.radioButton').eq(0).hasClass('active')).to.be.true;
            expect($typeRow.find('.radioButton').eq(1).hasClass('active')).to.be.false;
            expect($advancedSection.find('.csvRow:visible').length).to.equal(2);
        });

        it('csv delimiters should work', function() {
            // field delims
            expect($advancedSection.find('.fieldDelim').val()).to.equal("\\t");
            $advancedSection.find('.fieldDelim').trigger(fakeEvent.click);
            $advancedSection.find('.fieldDelim').siblings('.list').find('li').eq(1).trigger(fakeEvent.mouseup);
            expect($advancedSection.find('.fieldDelim').val()).to.equal(",");

            $advancedSection.find('.fieldDelim').trigger(fakeEvent.click);
            $advancedSection.find('.fieldDelim').siblings('.list').find('li').eq(0).trigger(fakeEvent.mouseup);
            expect($advancedSection.find('.fieldDelim').val()).to.equal("\\t");

            expect($advancedSection.find('.recordDelim').val()).to.equal("\\n");
            expect($advancedSection.find('.recordDelim').siblings('.list').find('li').length).to.equal(1);
            $advancedSection.find('.recordDelim').trigger(fakeEvent.click);
            $advancedSection.find('.recordDelim').siblings('.list').find('li').eq(0).trigger(fakeEvent.mouseup);
            expect($advancedSection.find('.recordDelim').val()).to.equal("\\n");
        });
    });

    describe('advancedOptions', function() {

        it('function restoreAdvanced should work', function() {
            var getAdvancedOptions = ExportView.__testOnly__.getAdvancedOptions;
            var options = getAdvancedOptions();
            expect(options.createRule).to.equal(ExExportCreateRuleT.ExExportCreateOnly);
            expect(options.format).to.equal(DfFormatTypeT.DfFormatCsv);
            expect(options.headerType).to.equal(ExSFHeaderTypeT.ExSFHeaderEveryFile);
            expect(options.splitType).to.equal(ExSFFileSplitTypeT.ExSFFileSplitForceSingle);
            expect(options.csvArgs.fieldDelim).to.equal("\t");
            expect(options.csvArgs.recordDelim).to.equal("\n");
            expect($exportForm.find('.headerType .subHeading').hasClass('xc-disabled')).to.be.false;

            $exportForm.find('.splitType .radioButton:eq(1)').click();
            $exportForm.find('.headerType .radioButton:eq(1)').click();
            $exportForm.find('.createRule .radioButton:eq(2)').click();
            options = getAdvancedOptions();
            expect(options.createRule).to.equal(ExExportCreateRuleT.ExExportAppendOnly);
            expect(options.headerType).to.equal(ExSFHeaderTypeT.ExSFHeaderNone);
            expect(options.splitType).to.equal(ExSFFileSplitTypeT.ExSFFileSplitNone);
            expect($exportForm.find('.headerType .subHeading').hasClass('xc-disabled')).to.be.true;

            ExportView.__testOnly__.restoreAdvanced();
            options = getAdvancedOptions();
            expect(options.createRule).to.equal(ExExportCreateRuleT.ExExportCreateOnly);
            expect(options.format).to.equal(DfFormatTypeT.DfFormatCsv);
            expect(options.headerType).to.equal(ExSFHeaderTypeT.ExSFHeaderEveryFile);
            expect(options.splitType).to.equal(ExSFFileSplitTypeT.ExSFFileSplitForceSingle);
            expect(options.csvArgs.fieldDelim).to.equal("\t");
            expect(options.csvArgs.recordDelim).to.equal("\n");
            expect($exportForm.find('.headerType .subHeading').hasClass('xc-disabled')).to.be.false;
        });

        it("apply other delimiter should work", function() {
            var cachedVal = $exportForm.find(".fieldDelim.text").val();

            $exportForm.find(".csvRow .delimVal").val("sample");
            $exportForm.find(".csvRow .delimVal").trigger(fakeEvent.enterKeyup);
            expect($exportForm.find(".csvRow .delimVal").val()).to.equal("");
            expect($exportForm.find(".fieldDelim.text").val()).to.equal("sample");

            $exportForm.find(".csvRow .delimVal").val("sample");
            $exportForm.find(".inputAction").trigger(fakeEvent.mousedown);
            expect($exportForm.find(".csvRow .delimVal").val()).to.equal("");
            expect($exportForm.find(".fieldDelim.text").val()).to.equal("sample");

            $exportForm.find(".fieldDelim.text").val(cachedVal);
        });
    });

    describe('test submit errors', function() {
        // invalid column name
        it("invalid backnames should produce error", function(done) {
            var cachedFn = xcHelper.convertFrontColNamesToBack;
            var fnCalled = false;
            xcHelper.convertFrontColNamesToBack = function(colNames, tId, validTypes) {
                expect(colNames.length).to.equal(6);
                expect(tId).to.equal(tableId);
                expect(validTypes.length).to.equal(4);

                fnCalled = true;
                return {invalid: true, reason:'notFound', name: 'badColumn'};
            };

            ExportView.__testOnly__.submitForm()
            .then(function() {
                expect('passed').to.equal('should not pass');
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError('Column "badColumn" does not exist.');
                expect(fnCalled).to.be.true;
            })
            .always(function() {
                xcHelper.convertFrontColNamesToBack = cachedFn;
                done();
            });
        });

        // table not found
        it("invalid backnames should produce error", function(done) {
            var cachedFn = xcHelper.convertFrontColNamesToBack;
            var fnCalled = false;
            xcHelper.convertFrontColNamesToBack = function(colNames, tId, validTypes) {
                expect(colNames.length).to.equal(6);
                expect(tId).to.equal(tableId);
                expect(validTypes.length).to.equal(4);

                fnCalled = true;
                return {invalid: true, reason:'tableNotFound'};
            };

            ExportView.__testOnly__.submitForm()
            .then(function() {
                expect('passed').to.equal('should not pass');
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError('Source table does not exist.');
                expect(fnCalled).to.be.true;
            })
            .always(function() {
                xcHelper.convertFrontColNamesToBack = cachedFn;
                done();
            });
        });

        // bad type
        it("invalid backnames should produce error", function(done) {
            var cachedFn = xcHelper.convertFrontColNamesToBack;
            var fnCalled = false;
            xcHelper.convertFrontColNamesToBack = function(colNames, tId, validTypes) {
                expect(colNames.length).to.equal(6);
                expect(tId).to.equal(tableId);
                expect(validTypes.length).to.equal(4);

                fnCalled = true;
                return {invalid: true, reason:'type', name: 'badColumn', type: 'array'};
            };

            ExportView.__testOnly__.submitForm()
            .then(function() {
                expect('passed').to.equal('should not pass');
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError('Column "badColumn" has an invalid type: array');
                expect(fnCalled).to.be.true;
            })
            .always(function() {
                xcHelper.convertFrontColNamesToBack = cachedFn;
                done();
            });
        });

        it("invalid export name", function(done) {
            $("#exportName").val("bl*ah");

            ExportView.__testOnly__.submitForm()
            .then(function() {
                expect('passed').to.equal('should not pass');
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError('Please input a valid name with no special characters.');
            })
            .always(function() {
                done();
            });
        });

        it("invalid export name", function(done) {
            var name = "";
            for (var i = 0; i < XcalarApisConstantsT.XcalarApiMaxTableNameLen + 2; i++) {
                name += "a";
            }
            $("#exportName").val(name);

            ExportView.__testOnly__.submitForm()
            .then(function() {
                expect('passed').to.equal('should not pass');
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError('Please use fewer than 255 characters.');
            })
            .always(function() {
                done();
            });
        });

        it('appending to non-existant file should return error', function(done) {
            $exportForm.find('.splitType .radioButton:eq(0)').click();
            $exportForm.find('.headerType .radioButton:eq(0)').click();
            $exportForm.find('.createRule .radioButton:eq(2)').click();
            var uniqueName = "exportUnitTest" + Date.now() + Math.floor(Math.random() * 100000);
            $exportForm.find("#exportName").val(uniqueName);

            ExportView.__testOnly__.submitForm()
            .then(function() {
                expect('passed').to.equal('should not pass');
            })
            .fail(function() {
                expect($('#alertModal:visible').length).to.equal(1);
                var expectedText = StatusTStr[StatusT.StatusExportSFFileDoesntExist];
                expect($('#alertContent').text().indexOf(expectedText)).to.be.gt(-1);
                Alert.forceClose();
            })
            .always(function() {
                done();
            });
        });
    });

    after(function(done) {
        delete gTables[tableId2];
        WSManager.getTableList = cachedGetTableList;
        xcHelper.centerFocusedTable = cachedCenterFn;
        ExportView.close();

        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            done();
        });
    });
});