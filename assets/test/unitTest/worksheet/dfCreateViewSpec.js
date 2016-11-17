describe('DFCreateView', function() {
    var testDs;
    var tableName;
    var prefix;
    var $dfView;
    var tableId;
    var $table;
    var testDfName = "unitTestDF";

    before(function(done) {
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            $dfView = $('#dfCreateView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    $table = $("#xcTable-" + tableId);
                    return false;
                }
            });
            DFCreateView.show($("#dagWrap-" + tableId));
            done();
        });
    });
    
    describe('check dfCreateView initial state', function() {
        it('Batch DF Name should be blank', function() {
            expect($dfView.find('#newDFNameInput')).to.have.lengthOf(1);
            expect($dfView.find('#newDFNameInput').val()).to.equal("");
        });
        it('columns should be selected', function() {
            expect($dfView.find('.columnsToExport li').length).to.equal(6);
            expect($dfView.find('.columnsToExport li.checked').length).to.equal(6);
        });

        it('exit option on table menu should be available', function() {
            expect($('.xcTableWrap.exportMode').length).to.be.gte(1);
            expect($('#xcTheadWrap-' + tableId).find('.dropdownBox').is(":visible")).to.be.true;
            $('#xcTheadWrap-' + tableId).find('.dropdownBox').click();
            expect($("#tableMenu").find('.exitDataflow').is(":visible")).to.be.true;
            $('.menu').hide();
        });
    });

    describe('check user actions', function() {
        it('column picker should work', function() {
            var $tableList = $dfView.find('.tableList');
            var numCols = $dfView.find('.cols li').length;
            expect(numCols).to.be.gt(4);
            expect($dfView.find('.cols li.checked').length).to.equal(numCols);

            $dfView.find('.cols li').eq(0).click();
            expect($dfView.find('.cols li.checked').length).to.equal(numCols - 1);

            $dfView.find('.cols li').eq(0).click();
            expect($dfView.find('.cols li.checked').length).to.equal(numCols);

            var $th = $("#xcTable-" + tableId).find('th.col1');
            expect($th.hasClass('modalHighlighted')).to.be.true;

            $th.click(); // deselect

            expect($th.hasClass('modalHighlighted')).to.be.false;
            expect($dfView.find('.cols li').eq(0).hasClass('checked')).to.be.false;

            $th.click(); // select

            expect($th.hasClass('modalHighlighted')).to.be.true;
            expect($dfView.find('.cols li').eq(0).hasClass('checked')).to.be.true;
        });

        it('clicking on non-exportable column header should not select', function() {
            var $th = $("#xcTable-" + tableId).find('th.col2');
            expect($th.find('input').val()).to.equal("votes");
            expect($th.hasClass('modalHighlighted')).to.be.false;

            $th.click(); // select

            expect($th.hasClass('modalHighlighted')).to.be.false;
        });
    });

    describe('selectAll and deselectAll', function() {
        it('selectAll and deselectAll should work', function() {
            var selectAll = DFCreateView.__testOnly__.selectAll;
            var deselectAll = DFCreateView.__testOnly__.deselectAll;
            var listText = "";
            var colText = "";

            selectAll();
            expect($dfView.find('.columnsToExport li.checked').length).to.equal(6);
            listText = $dfView.find('.columnsToExport li.checked').text();
            colText = getHighlightedColText();
            expect(listText.length).to.be.gt(20);
            expect(listText).to.equal(colText);

            deselectAll();
            expect($dfView.find('.columnsToExport li.checked').length).to.equal(0);
            listText = $dfView.find('.columnsToExport li.checked').text();
            colText = getHighlightedColText();
            expect(listText.length).to.equal(0);
            expect(listText).to.equal(colText);

            selectAll();
            expect($dfView.find('.columnsToExport li.checked').length).to.equal(6);
            listText = $dfView.find('.columnsToExport li.checked').text();
            colText = getHighlightedColText();
            expect(listText.length).to.be.gt(20);
            expect(listText).to.equal(colText);
        });
        
        function getHighlightedColText() {
            var text = "";
            $table.find('th.modalHighlighted').each(function() {
                text += $(this).text() + gPrefixSign + $(this).find('input').val();
            });
            return text;
        }
    });

    describe('validating dataflow name', function() {
        it('validate df name should work', function() {
            var validate = DFCreateView.__testOnly__.validateDFName;
            var $newNameInput = $('#newDFNameInput');

            $newNameInput.val("");
            expect(validate('')).to.be.false;
            // need to check duplicate df names
            $newNameInput.val('a');
            expect(validate('a')).to.be.true;
            $newNameInput.val('a2');
            expect(validate('a2')).to.be.true;
            $newNameInput.val('B2');
            expect(validate('B2')).to.be.true;
            $newNameInput.val('B_2');
            expect(validate('B_2')).to.be.true;
            $newNameInput.val('B_2');
            expect(validate('B-2')).to.be.true;

            $newNameInput.val('B*2');
            expect(validate('B*2')).to.be.false;
            $newNameInput.val('b c');
            expect(validate('b c')).to.be.false;
            $newNameInput.val('B$c');
            expect(validate('b$c')).to.be.false;
            $newNameInput.val('$c');
            expect(validate('$c')).to.be.false;
            $newNameInput.val('a.b');
            expect(validate('a.b')).to.be.false;
            $newNameInput.val('a"b');
            expect(validate('a"b')).to.be.false;
            $newNameInput.val("a'b");
            expect(validate("a'b")).to.be.false;
            $newNameInput.val('a(b)');
            expect(validate('a(b)')).to.be.false;

            expect($("#statusBox").is(":visible")).to.be.true;
            StatusBox.forceHide();
            expect($("#statusBox").is(":visible")).to.be.false;
        }); 
    });

    describe('submit form', function() {
        var submitForm;
        before(function(){
            submitForm = DFCreateView.__testOnly__.submitForm;
        });

        it('no columns should produce error', function(done) {
            var $newNameInput = $('#newDFNameInput');
            $newNameInput.val(testDfName + Date.now());
            DFCreateView.__testOnly__.deselectAll();

            submitForm()
            .then(function() {
                expect('succeeded').to.equal('should fail');
            })
            .fail(function() {
                expect($(".tooltip.error").is(":visible")).to.be.true;
                expect($(".tooltip.error").text().indexOf(TooltipTStr.ChooseColToExport)).to.be.gt(-1);
            })
            .always(function() {
                done();
            });
        });

        it('successful submit should create dataflow', function(done) {
            var $newNameInput = $('#newDFNameInput');
            $newNameInput.val(testDfName);
            DFCreateView.__testOnly__.selectAll();

            submitForm()
            .then(function() {
                var df = DF.getDataflow(testDfName);
                expect(df).to.be.an('object');
                expect(df.name).to.equal(testDfName);
            })
            .fail(function() {
                var df = DF.getDataflow(testDfName);
                expect(df).to.equal('undefined');
                expect('failed').to.equal('should succeed');
            })
            .always(function() {
                // wait for submit inner always
                setTimeout(function() {
                    DFCreateView.show($("#dagWrap-" + tableId));
                    done();
                }, 1);
            });
        });

        it('duplicate name should be detected', function(done) {
            var $newNameInput = $('#newDFNameInput');
            $newNameInput.val(testDfName);
            DFCreateView.__testOnly__.selectAll();

            var df = DF.getDataflow(testDfName);
            expect(df).to.be.an('object');

            submitForm()
            .then(function() {
                expect('succeeded').to.equal('should fail');
            })
            .fail(function() {
                expect($("#statusBox").is(":visible")).to.be.true;
                expect($("#statusBox").text().indexOf(ErrTStr.DFConflict)).to.be.gt(-1);
                StatusBox.forceHide();
            })
            .always(function() {
                done();
            });
        });

        after(function(done) {
            DFCard.__testOnly__.deleteDataflow(testDfName)
            .always(function() {
                done(); 
            });
        });
    });

    describe('resetDFView', function() {
        it('resetDFView should work', function() {
            DFCreateView.__testOnly__.selectAll();
            expect($dfView.find('.columnsToExport li.checked').length).to.equal(6);
            expect($table.find('.modalHighlighted').length).to.be.gt(0);
            $('#newDFNameInput').val('test');
            expect($dfView.find('#newDFNameInput').val()).to.equal("test");

            DFCreateView.__testOnly__.resetDFView();

            expect($table.find('.modalHighlighted').length).to.equal(0);
            expect($dfView.find('#newDFNameInput').val()).to.equal("");
        });
    });

    after(function(done) {
        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            done();
        });
    });
});