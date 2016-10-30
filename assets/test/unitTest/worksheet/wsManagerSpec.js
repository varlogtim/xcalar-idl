describe('Worksheet Test', function() {
    var $tabs;
    var minModeCache;

    before(function() {
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    });

    describe("Worksheet API Test", function() {
        it("Should get all meta", function() {
            var meta = WSManager.getAllMeta();
            expect(meta).to.be.an("object");
            expect(Object.keys(meta).length).to.equal(5);
            expect(meta).have.property("wsInfos");
            expect(meta).have.property("wsOrder");
            expect(meta).have.property("hiddenWS");
            expect(meta).have.property("noSheetTables");
            expect(meta).have.property("activeWS");
        });

        it("Should get worksheets", function() {
            var worksheets = WSManager.getWorksheets();
            expect(worksheets).to.be.an("object");
            // have at least one worksheet
            var numWorksheets = Object.keys(worksheets).length;
            expect(numWorksheets).be.at.least(1);
        });

        it("Should get worksheet by id", function() {
            var worksheets = WSManager.getWorksheets();
            var worksheetId = Object.keys(worksheets)[0];
            var worksheet = WSManager.getWSById(worksheetId);
            expect(worksheet).not.to.be.null;
            expect(worksheet).to.equal(worksheets[worksheetId]);
        });

        it("Should get active worksheets list", function() {
            var activeWorksheets = WSManager.getActiveWSList();
            expect(activeWorksheets).to.be.an("array");
            expect(activeWorksheets.length).to.be.at.least(1);
            expect(WSManager.getActiveWSByIndex(0))
            .to.equal(activeWorksheets[0]);
        });
    });

    describe.skip('Worksheet existence', function() {
        it('should have at least one worksheet', function() {
            $tabs = $('#worksheetTabs').find('.worksheetTab');
            expect($tabs).to.have.length.above(0);
        });

        it('addworksheet should create worksheet', function() {
            var numTabsBefore = $tabs.length;
            $('#addWorksheet').click();
            $tabs = $('#worksheetTabs').find('.worksheetTab');
            expect($tabs).to.have.length(numTabsBefore + 1);
        });

        it('new worksheet should be active', function() {
            var $lastTab = $('#worksheetTabs').find('.worksheetTab').last();
            expect($lastTab.hasClass('active')).to.equal(true);
        });
    });

    describe.skip('Worksheet deletion', function() {
        it ('should remove worksheet', function() {
            var minModeCache = gMinModeOn;
            gMinModeOn = true;
            var numTabsBefore = $tabs.length;
            var wsId = $tabs.last().data('ws');
            WSManager.delWS(wsId, DelWSType.Empty);
            $tabs = $('#worksheetTabs').find('.worksheetTab');
            expect($tabs).to.have.length(numTabsBefore - 1);
            expect($('#worksheetTabs').find('[data-ws=' + wsId +']'))
                    .to.have.length(0);
            gMinModeOn = minModeCache;
        });
    });

    describe.skip('Worksheet Scrolling', function() {
        var dsName, table1, table2;

        before(function(done) {
            ensureWorksheetsExist(2);

            UnitTest.addAll(testDatasets.schedule, "unitTestWorksheet1")
            .then(function(resDS, resTable) {
                dsName = resDS;
                table1 = resTable;
                // switch to second to last worksheet
                var $tab = $('#worksheetTabs').find('.worksheetTab')
                                              .last().prev();
                $tab.trigger(fakeEvent.mousedown);
                return UnitTest.addTable(resDS);
            })
            .then(function(resTable) {
                table2 = resTable;
                done();
            });
        });

        it('should center on table when moving worksheet', function() {
            var $lastTab = $('#worksheetTabs').find('.worksheetTab')
                                              .last();
            $lastTab.trigger(fakeEvent.mousedown);
            var wsId = $lastTab.data('ws');
            $('#mainFrame').scrollLeft(0); // set to 0;
            var $prevTab = $('#worksheetTabs').find('.worksheetTab')
                                              .last().prev();

            $prevTab.trigger(fakeEvent.mousedown);
            var tableId = $('.xcTableWrap:visible').eq(0).data('id');
            WSManager.moveTable(tableId, wsId);
            var $tableWrap = $('#xcTableWrap-' + tableId + '.worksheet-' +
                                wsId);
            expect($lastTab.is('.active')).to.equal(true);
            expect($('#worksheetTabs').find('.worksheetTab.active'))
                                      .to.have.length.of(1);
            expect($tableWrap).to.have.length.of(1);
            expect($tableWrap.find('.tblTitleSelected')).to.have.length.of(1);

            var winTop = $(window).scrollTop();
            var mainFrameTop = $('#mainFrame').offset().top;
            $(window).scrollTop(mainFrameTop);

            var windowCenter = $(window).width() / 2;
            var yCoor = mainFrameTop - $(window).scrollTop() + 15;
            var el = document.elementFromPoint(windowCenter, yCoor);
            $(window).scrollTop(winTop);
            var correctTable = $(el).closest('#xcTableWrap-' + tableId).length >
                                0;
            var scrolledToEnd = ($('#mainFrame').width() +
                                 $('#mainFrame').scrollLeft()) ===
                                 $('#mainFrame')[0].scrollWidth;

            expect(scrolledToEnd || correctTable).to.equal(true);
        });

        after(function(done) {
            UnitTest.deleteTable(table2)
            .then(function() {
                return UnitTest.deleteAll(table1, dsName)
            })
            .then(function() {
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });
    });

    after(function() {
        gMinModeOn = minModeCache;
    });
});

function ensureWorksheetsExist(minNumWS) {
    var reqNumWS = minNumWS || 1;
    var numWS = $('#worksheetTabs').find('.worksheetTab').length;
    var numWSNeeded = Math.max(0, reqNumWS - numWS);
    if (numWSNeeded > 0) {
        for (var i = 0; i < numWSNeeded; i++) {
            $('#addWorksheet').click();
        }
    }
}

