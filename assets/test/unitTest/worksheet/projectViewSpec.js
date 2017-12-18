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

            ProjectView.show(tableId)
            .then(function() {
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
            expect($projectForm.find('.columnsToExport li')).to.have.lengthOf(6);
        });

        it('exit option on table menu should be available', function() {
            expect($('.xcTableWrap.projectMode').length).to.be.gte(1);
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

            $selectedLi.trigger(fakeEvent.mouseup);
            expect($text.text()).to.equal(tableName);
        });

        it('tablelist menu select should update columns', function() {
            var $tableList = $projectForm.find('.tableList');
            var numCols = $projectForm.find('.cols li').length;
            expect(numCols).to.be.gt(4);
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);
            $projectForm.find('.cols li').eq(0).click();
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols - 1);

            // select new new table then back to prev table
            $tableList.trigger(fakeEvent.click);
            $tableList.find('li').filter(function() {
                return $(this).text() === tableName2;
            }).trigger(fakeEvent.mouseup);
            $tableList.find('li').filter(function() {
                return $(this).text() === tableName;
            }).trigger(fakeEvent.mouseup);

            expect($tableList.find('.text').text()).to.equal(tableName);
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);
        });

        it('column picker should work', function() {
            var numCols = $projectForm.find('.cols li').length;
            expect(numCols).to.be.gt(4);
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);

            $projectForm.find('.cols li').eq(0).click();
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols - 1);

            $projectForm.find('.cols li').eq(0).click();
            expect($projectForm.find('.cols li.checked').length).to.equal(numCols);

            var $th = $("#xcTable-" + tableId).find('th.col1');
            expect($th.hasClass('modalHighlighted')).to.be.true;

            $th.click(); // deselect

            expect($th.hasClass('modalHighlighted')).to.be.false;
            expect($projectForm.find('.cols li').eq(0).hasClass('checked')).to.be.false;

            $th.click(); // select

            expect($th.hasClass('modalHighlighted')).to.be.true;
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

            var event = {"type": "click", "which": 1, "shiftKey": true};
            expect($projectForm.find(".cols li").eq(1).find(".checked").length).to.equal(1);
            expect($projectForm.find(".cols li").eq(2).find(".checked").length).to.equal(1);
            $projectForm.find(".cols li").eq(2).trigger(event);
            expect($projectForm.find(".cols li").eq(1).find(".checked").length).to.equal(0);
            expect($projectForm.find(".cols li").eq(2).find(".checked").length).to.equal(0);

            $projectForm.find(".cols li").eq(0).click();
            $projectForm.find(".cols li").eq(2).trigger(event);
            expect($projectForm.find(".cols li").eq(0).find(".checked").length).to.equal(1);
            expect($projectForm.find(".cols li").eq(1).find(".checked").length).to.equal(1);
            expect($projectForm.find(".cols li").eq(2).find(".checked").length).to.equal(1);
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
            $table.find("th").eq(0).click();
            expect($table.find(".header").eq(1).closest(".modalHighlighted").length).to.equal(1);
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
            xcHelper.convertFrontColNamesToBack = function(colNames, tId, validTypes) {
                expect(colNames.length).to.equal(6);
                expect(tId).to.equal(tableId);
                expect(validTypes.length).to.equal(4);

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
            xcHelper.convertFrontColNamesToBack = function(colNames, tId, validTypes) {
                expect(colNames.length).to.equal(6);
                expect(tId).to.equal(tableId);
                expect(validTypes.length).to.equal(4);

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

        // bad type
        it("invalid backnames should produce error", function(done) {
            var cachedFn = xcHelper.convertFrontColNamesToBack;
            var fnCalled = false;
            xcHelper.convertFrontColNamesToBack = function(colNames, tId, validTypes) {
                expect(colNames.length).to.equal(6);
                expect(tId).to.equal(tableId);
                expect(validTypes.length).to.equal(4);

                fnCalled = true;
                return {
                    invalid: true,
                    reason: 'type',
                    name: 'badColumn',
                    type: 'array'
                };
            };

            ProjectView.__testOnly__.submitForm()
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

        it("invalid project name", function(done) {
            $("#projectName").val("bl*ah");

            ProjectView.__testOnly__.submitForm()
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

        it("invalid project name", function(done) {
            var name = "";
            for (var i = 0; i < XcalarApisConstantsT.XcalarApiMaxTableNameLen + 2; i++) {
                name += "a";
            }
            $("#projectName").val(name);

            ProjectView.__testOnly__.submitForm()
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
            $projectForm.find('.splitType .radioButton:eq(0)').click();
            $projectForm.find('.headerType .radioButton:eq(0)').click();
            $projectForm.find('.createRule .radioButton:eq(2)').click();
            var uniqueName = "projectUnitTest" + Date.now() + Math.floor(Math.random() * 100000);
            $projectForm.find("#projectName").val(uniqueName);

            ProjectView.__testOnly__.submitForm()
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
        $projectForm.find(".close").click();

        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            done();
        });
    });
});