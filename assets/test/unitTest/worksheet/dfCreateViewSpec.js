describe('DFCreateView Test', function() {
    var testDs;
    var tableName;
    var $dfView;
    var tableId;
    var $table;
    var testDfName;

    before(function(done) {
        testDfName = xcHelper.randName("unitTestDF");

        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName) {
            testDs = ds;
            tableName = tName;
            $dfView = $('#dfCreateView');
            tableId = xcHelper.getTableId(tableName);
            $table = $("#xcTable-" + tableId);
            DFCreateView.show($("#dagWrap-" + tableId));
            setTimeout(function() {
                done();
            }, 400);
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

        it("shift clicking columns should work", function() {
            var $th = $("#xcTable-" + tableId).find('th.col1');
            expect($th.hasClass('modalHighlighted')).to.be.true;
            $th.click(); // deselect
            expect($th.hasClass('modalHighlighted')).to.be.false;

            var event = {type: "click", "which": 1, shiftKey: true};
            $th = $("#xcTable-" + tableId).find('th.col7');
            $th.trigger(event);
            expect($th.hasClass('modalHighlighted')).to.be.false;
            expect($("#xcTable-" + tableId).find('th.col4').hasClass("modalHighlighted")).to.be.false;

            $th = $("#xcTable-" + tableId).find('th.col1');
            expect($th.hasClass('modalHighlighted')).to.be.false;
            $th.click(); // select
            expect($th.hasClass('modalHighlighted')).to.be.true;

            var event = {type: "click", "which": 1, shiftKey: true};
            $th = $("#xcTable-" + tableId).find('th.col7');
            $th.trigger(event);
            expect($th.hasClass('modalHighlighted')).to.be.true;
            expect($("#xcTable-" + tableId).find('th.col4').hasClass("modalHighlighted")).to.be.true;
        });

        it("shift clicking lis should work", function() {
            var event = {type: "click", "which": 1, shiftKey: true};
            var numCols = $dfView.find('.cols li').length;
            expect(numCols).to.be.gt(4);
            expect($dfView.find('.cols li.checked').length).to.equal(numCols);

            $dfView.find('.cols li').eq(0).click();
            expect($dfView.find('.cols li.checked').length).to.equal(numCols - 1);


            $dfView.find('.cols li').eq(3).trigger(event);
            expect($dfView.find('.cols li.checked').length).to.equal(numCols - 4);

            $dfView.find('.cols li').eq(0).click();
            expect($dfView.find('.cols li.checked').length).to.equal(numCols - 3);

            $dfView.find('.cols li').eq(3).trigger(event);
            expect($dfView.find('.cols li.checked').length).to.equal(numCols);
        });

        it('clicking on non-exportable column header should not select', function() {
            var $th = $("#xcTable-" + tableId).find('th.col11');
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

        it("selectAllWrap clicking should work", function() {
            var listText = $dfView.find('.columnsToExport li.checked').text();
            expect(listText.length).to.be.gt(20);
            $dfView.find('.selectAllWrap').click();
            listText = $dfView.find('.columnsToExport li.checked').text();
            expect(listText.length).to.equal(0);


            $dfView.find('.selectAllWrap').click();
            listText = $dfView.find('.columnsToExport li.checked').text();
            expect(listText.length).to.be.gt(20);
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
            $newNameInput.val('tz');
            expect(validate('tz')).to.be.true;
            $newNameInput.val('ta2');
            expect(validate('ta2')).to.be.true;
            $newNameInput.val('tB2');
            expect(validate('tB2')).to.be.true;
            $newNameInput.val('tB_2');
            expect(validate('tB_2')).to.be.true;
            $newNameInput.val('tB_2');
            expect(validate('tB-2')).to.be.true;

            $newNameInput.val('tB*2');
            expect(validate('tB*2')).to.be.false;
            $newNameInput.val('tb c');
            expect(validate('tb c')).to.be.false;
            $newNameInput.val('tB$c');
            expect(validate('tb$c')).to.be.false;
            $newNameInput.val('t$c');
            expect(validate('t$c')).to.be.false;
            $newNameInput.val('ta.b');
            expect(validate('ta.b')).to.be.false;
            $newNameInput.val('ta"b');
            expect(validate('ta"b')).to.be.false;
            $newNameInput.val("ta'b");
            expect(validate("ta'b")).to.be.false;
            $newNameInput.val('ta(b)');
            expect(validate('ta(b)')).to.be.false;

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

        it("check duplicate name fail should be handled", function(done) {
            var cache = XcalarGetRetina;
            XcalarGetRetina = function() {return PromiseHelper.resolve()};

            DFCreateView.__testOnly__.selectAll();
            submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.DFConflict);
                XcalarGetRetina = cache;
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
                done("fail");
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
        $("#maximizeDag").click();
        setTimeout(function() {
            $("#closeDag").click();
            setTimeout(function() {
                UnitTest.deleteAll(tableName, testDs)
                .always(function() {
                    done();
                });
            }, 100);
        }, 600);
    });
});