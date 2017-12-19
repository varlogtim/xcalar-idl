describe('ProjectView Test', function() {
    var testDs;
    var tableName;
    var $projectForm;
    var tableId;
    var cachedGetTableList;
    var cachedCenterFn;
    var $table;

    before(function(done) {
        var testDSObj = testDatasets.fakeYelp;
        cachedGetTableList = WSManager.getTableList;
        cachedCenterFn = xcHelper.centerFocusedTable;

        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName) {
            testDs = ds;
            tableName = tName;
            $projectForm = $('#projectView');
            tableId = xcHelper.getTableId(tableName);

            // generate an immediate from average_stars, four to boolean
            ColManager.changeType([{colNum: 1, type: "float"}, {colNum: 4, type: "boolean"}], tableId)
            .then(function(newTId) {
                tableId = newTId;
                tableName = gTables[tableId].getName();

                $table = $("#xcTable-" + tableId);

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

                xcHelper.centerFocusedTable = function() {return PromiseHelper.resolve();};

                ProjectView.show(tableId, [1]);
                setTimeout(function() {
                    done();
                }, 500);
            });
        });
    });

    describe('check project initial state', function() {
        it('inputs should be prefilled', function() {
            expect($projectForm.find('.tableList .text:visible')).to.have.lengthOf(1);
            expect($projectForm.find('.tableList .text').text()).to.equal(tableName);
            expect($projectForm.find('.columnsToExport li')).to.have.lengthOf(12);
        });

        it('exit option on table menu should be available', function() {
            expect($('#xcTheadWrap-' + tableId).find('.dropdownBox').is(":visible")).to.be.true;
            $('#xcTheadWrap-' + tableId).find('.dropdownBox').click();
            expect($("#tableMenu").find('.exitProject').is(":visible")).to.be.true;
            $('.menu').hide();
        });
    });

    describe('check user actions', function() {
        it("focusTable btn should work", function() {
            var table = gTables[tableId];
            var fnCalled = false;

            xcHelper.centerFocusedTable = function(tId) {
                expect(tId).to.equal(tableId);
                fnCalled = true;
                return PromiseHelper.resolve();
            };

            delete gTables[tableId];
            $projectForm.find('.focusTable').click();
            expect(fnCalled).to.be.false;

            gTables[tableId] = table;
            $projectForm.find('.focusTable').click();
            expect(fnCalled).to.be.true;
            xcHelper.centerFocusedTable = function() {return PromiseHelper.resolve();};
        });

        it('tableList menu should select table', function() {
            var $tableList = $projectForm.find('.tableList');
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


        });

        it('tablelist menu select should select 0 columns', function() {
            var $tableList = $projectForm.find('.tableList');
            var $ul = $tableList.find('ul');
            var $text = $tableList.find('.text');
            var numCols = $projectForm.find('.cols li').length;

            expect(numCols).to.equal(0);
            expect($projectForm.find('.cols li.checked').length).to.equal(0);

            var $selectedLi = $ul.find('li').filter(function() {
                return $(this).text() === tableName;
            });
            $selectedLi.trigger(fakeEvent.mouseup);
            expect($text.text()).to.equal(tableName);

            expect($projectForm.find('.cols li.checked').length).to.equal(0);
            $projectForm.find('.cols li').eq(0).click();
            expect($projectForm.find('.cols li.checked').length).to.equal(1);

            // select new new table then back to prev table
            $tableList.trigger(fakeEvent.click);
            $tableList.find('li').filter(function() {
                return $(this).text() === tableName2;
            }).trigger(fakeEvent.mouseup);
            $tableList.find('li').filter(function() {
                return $(this).text() === tableName;
            }).trigger(fakeEvent.mouseup);

            expect($tableList.find('.text').text()).to.equal(tableName);
            expect($projectForm.find('.cols li.checked').length).to.equal(0);
        });

        it('column picker should work', function() {
            var numCols = $projectForm.find('.cols li').length;
            expect(numCols).to.be.gt(4);

            expect($projectForm.find('.cols li.checked').length).to.equal(0);

            $projectForm.find(".selectAllWrap .checkbox").trigger(fakeEvent.click);

            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);

            $projectForm.find('.cols li').eq(0).click();
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols - 1);

            $projectForm.find('.cols li').eq(0).click();
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);

            var $th = $("#xcTable-" + tableId).find('th.col1 .header');
            expect($th.closest('.modalHighlighted').length).to.equal(1);

            $th.click(); // deselect

            expect($th.closest('.modalHighlighted').length).to.equal(0);
            expect($projectForm.find('.cols li').eq(0).hasClass('checked')).to.be.false;

            $th.click(); // select

            expect($th.closest('.modalHighlighted').length).to.equal(1);
            expect($projectForm.find('.cols li').eq(0).hasClass('checked')).to.be.true;
        });

        it('column name checkboxes should work', function() {
            var numCols = $projectForm.find('.cols li').length;
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);

            $projectForm.find(".selectAllWrap .checkbox").click();
            expect($projectForm.find('.cols li.checked').length).to.equal(0);

            $projectForm.find(".selectAllWrap .checkbox").click();
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);
        });

        it("shift click should work on columns list", function() {

            expect($projectForm.find(".cols li").eq(0).find(".checked").length).to.equal(1);
            $projectForm.find(".cols li").eq(0).click();
            expect($projectForm.find(".cols li").eq(0).find(".checked").length).to.equal(0);
            expect($projectForm.find(".cols li").eq(1).find(".checked").length).to.equal(1);

            var event = {"type": "click", "which": 1, "shiftKey": true};
            expect($projectForm.find(".cols li").eq(1).find(".checked").length).to.equal(1);
            $projectForm.find(".cols li").eq(1).trigger(event);
            expect($projectForm.find(".cols li").eq(0).find(".checked").length).to.equal(0);
            expect($projectForm.find(".cols li").eq(1).find(".checked").length).to.equal(0);

            $projectForm.find(".cols li").eq(0).click();
            $projectForm.find(".cols li").eq(1).trigger(event);
            expect($projectForm.find(".cols li").eq(0).find(".checked").length).to.equal(1);
            expect($projectForm.find(".cols li").eq(1).find(".checked").length).to.equal(1);
        });

        it("shift click should work on table columns", function() {
            $table.find("th").eq(0).mousedown();
            var $target = $table.find(".header").eq(1);
            var event = {"type": "click", "which": 1, "shiftKey": true};
            expect($target.closest(".modalHighlighted").length).to.equal(1);
            $target.click();
            expect($target.closest(".modalHighlighted").length).to.equal(0);

            // shift deselect 7th column
            $target = $table.find(".header").eq(7);
            expect($target.closest(".modalHighlighted").length).to.equal(1);
            expect($table.find(".header").eq(4).closest(".modalHighlighted").length).to.equal(1);
            $target.trigger(event);
            expect($target.closest(".modalHighlighted").length).to.equal(0);
            expect($table.find(".header").eq(4).closest(".modalHighlighted").length).to.equal(0);

            // select 1st column
            $target = $table.find(".header").eq(1);
            expect($target.closest(".modalHighlighted").length).to.equal(0);
            $target.click();
            expect($target.closest(".modalHighlighted").length).to.equal(1);

            // shift select 7th column
            $target = $table.find(".header").eq(7);
            expect($target.closest(".modalHighlighted").length).to.equal(0);
            expect($table.find(".header").eq(4).closest(".modalHighlighted").length).to.equal(0);

            $target.trigger(event);
            expect($target.closest(".modalHighlighted").length).to.equal(1);
            expect($table.find(".header").eq(4).closest(".modalHighlighted").length).to.equal(1);

            $target = $table.find(".header").eq(1);
            $target.click();
            expect($target.closest(".modalHighlighted").length).to.equal(0);
            $table.find("th .header").eq(0).click();
            expect($table.find(".header").eq(1).closest(".modalHighlighted").length).to.equal(1);
        });

    });

    describe("ProjectView.updateColumns", function() {
        it("colum refresh should work", function() {
            var $cols = $projectForm.find('.columnsToExport li.checked');
            expect($cols.is($projectForm.find('.columnsToExport li.checked'))).to.be.true;
            expect($projectForm.find('.columnsToExport li.checked')).to.have.lengthOf(12);
            ProjectView.updateColumns();
            expect($projectForm.find('.columnsToExport li.checked')).to.have.lengthOf(12);
            expect($cols.is($projectForm.find('.columnsToExport li.checked'))).to.be.false;
        });
    });

    describe('test submit errors', function() {
        it("invalid table name should produce error", function() {
            var tableCache = gTables[tableId];
            delete gTables[tableId];
            $projectForm.mousedown();
            $(document).trigger(fakeEvent.enter);
            UnitTest.hasStatusBoxWithError(ErrTStr.TableNotExists);
            gTables[tableId] = tableCache;
        });
        // invalid column name
        it("invalid backnames should produce error", function(done) {
            var cachedFn = xcHelper.convertFrontColNamesToBack;
            var fnCalled = false;
            xcHelper.convertFrontColNamesToBack = function(colNames, tId) {
                expect(colNames.length).to.equal(12);
                expect(tId).to.equal(tableId);

                fnCalled = true;
                return {invalid: true, reason: 'notFound', name: 'badColumn'};
            };

            ProjectView.__testOnly__.submitForm()
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
            xcHelper.convertFrontColNamesToBack = function(colNames, tId) {
                expect(colNames.length).to.equal(12);
                expect(tId).to.equal(tableId);

                fnCalled = true;
                return {invalid: true, reason: 'tableNotFound'};
            };

            ProjectView.__testOnly__.submitForm()
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
    });

    describe("restore columns", function() {
        it("restore columns should work", function(done) {
            $projectForm.find(".close").click();
            expect($("#xcTable-" + tableId).find('th.modalHighlighted').length).to.equal(0);
            var formHelper = ProjectView.__testOnly__.getFormHelper();
            formHelper.getOpenTime = function() {return 2;};

            ProjectView.show(tableId, null, {restoreTime: 2});

            setTimeout(function() {
                expect($("#xcTable-" + tableId).find('th.modalHighlighted').length).to.equal(12);
                done();
            }, 400);
        });
    });

    after(function(done) {
        delete gTables[tableId2];
        WSManager.getTableList = cachedGetTableList;
        xcHelper.centerFocusedTable = cachedCenterFn;
        $projectForm.find(".close").click();

        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            done();
        });
    });
});