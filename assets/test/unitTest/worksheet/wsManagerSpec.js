describe('Worksheet Test', function() {
    var $tabs;
    var minModeCache;

    before(function() {
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    });

    describe("Clean and Restore Test", function() {
        var meta;
        var numWorksheets;

        before(function() {
            meta = WSManager.getAllMeta();
            numWorksheets = WSManager.getNumOfWS();
        });

        it("Should clear worksheet", function() {
            WSManager.clear();
            expect(WSManager.getNumOfWS()).to.equal(1);       
        });

        it("Should restore worksheet", function() {
            WSManager.restore(meta);
            expect(WSManager.getNumOfWS()).to.equal(numWorksheets);
        });

        it("Should be an error when initalize is wrong", function() {
            var oldFunc = TableList.initialize;
            TableList.initialize = function() { throw "test error" };
            WSManager.initialize();
            assert.isTrue($("#alertModal").is(":visible"));
            $("#alertModal .close").click();
            assert.isFalse($("#alertModal").is(":visible"));

            TableList.initialize = oldFunc;
        });
    });

    describe("Basic Worksheet API Test", function() {
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

        it("Should get active worksheeet", function() {
            var activeWorksheet = WSManager.getActiveWS();
            var $worksheetTab = $("#worksheetTabs .worksheetTab.active");
            expect(activeWorksheet).to.equal($worksheetTab.data("ws"));
        })

        it("Should get active worksheets list", function() {
            var worksheets = WSManager.getWSList();
            expect(worksheets).to.be.an("array");
            expect(worksheets.length).to.be.at.least(1);
            expect(WSManager.getWSByIndex(0))
            .to.equal(worksheets[0]);
        });

        it("Should get hidden worksheets list", function() {
            var hiddenWorksheets = WSManager.getHiddenWSList();
            expect(hiddenWorksheets).to.be.an("array");
        });

        it("Should get no sheet tables", function() {
            var noSheetTables = WSManager.getNoSheetTables();
            expect(noSheetTables).to.be.an("array");
        });

        it("Should get active worksheet index by id", function() {
            var worksheetId = WSManager.getWSByIndex(0);
            var index = WSManager.indexOfWS(worksheetId);
            expect(index).to.equal(0);
        });

        it("Should get num of active worksheet", function() {
            var numWorksheets = WSManager.getNumOfWS();
            var worksheets = WSManager.getWSList();
            expect(numWorksheets).to.equal(worksheets.length);
        });

        it("Should get worksheet id by name", function() {
            var worksheetId = WSManager.getWSByIndex(0);
            var worksheet = WSManager.getWSById(worksheetId);
            var wsName = worksheet.getName();
            var testId = WSManager.getWSIdByName(wsName);
            expect(testId).to.equal(worksheetId);
        });

        it("Should get worksheet name by id", function() {
            var worksheetId = WSManager.getWSByIndex(0);
            var worksheet = WSManager.getWSById(worksheetId);
            var wsName = WSManager.getWSName(worksheetId);
            expect(wsName).to.equal(worksheet.getName());
        });
    });

    describe("Worksheet Basic Behavior Test", function() {
        var worksheetId1 = null;
        var worksheetName1 = null;
        var worksheetId2 = null;

        it("Should add worksheet", function() {
            var numWorksheets = WSManager.getNumOfWS();
            worksheetName1 = xcHelper.randName("testWorksheet");
            worksheetId1 = WSManager.addWS(null, worksheetName1);

            var curNumWorksheet = WSManager.getNumOfWS();
            expect(curNumWorksheet - numWorksheets).to.equal(1);
            var worksheet = WSManager.getWSById(worksheetId1);
            expect(worksheet.getName()).to.equal(worksheetName1);

            worksheetId2 = WSManager.addWS();
            curNumWorksheet = WSManager.getNumOfWS();
            expect(curNumWorksheet - numWorksheets).to.equal(2);
        });

        it("Should add worksheet in undo/redo", function() {
            var numWorksheets = WSManager.getNumOfWS();
            var oldIsUndo = SQL.isUndo;
            SQL.isUndo = function() { return true; };
            // invalid case
            var wsId = WSManager.addWS();
            var curNumWorksheet = WSManager.getNumOfWS();
            expect(wsId).to.be.null;
            expect(curNumWorksheet - numWorksheets).to.equal(0);
            // valid case
            var randId = xcHelper.randName("testWorksheetUndoId");
            var randName = xcHelper.randName("testWorksheetUndoName");
            wsId = WSManager.addWS(randId, randName);
            expect(wsId).to.equal(randId);

            curNumWorksheet = WSManager.getNumOfWS();
            expect(curNumWorksheet - numWorksheets).to.equal(1);

            SQL.isUndo = oldIsUndo;
            WSManager.delWS(wsId, DelWSType.Empty);
        });

        it("Should rename worksheet", function() {
            var worksheet = WSManager.getWSById(worksheetId1);
            // invalid case 1
            WSManager.renameWS(worksheetId1);
            expect(worksheet.getName()).to.equal(worksheetName1);
            // invalid case 2
            WSManager.renameWS(worksheetId1, "");
            expect(worksheet.getName()).to.equal(worksheetName1);
            // invalid case 3
            WSManager.renameWS(worksheetId1, worksheetName1);
            expect(worksheet.getName()).to.equal(worksheetName1);
            // valid case 3
            worksheetName1 = xcHelper.randName("renamedWorsheet");
            WSManager.renameWS(worksheetId1, worksheetName1);
            expect(worksheet.getName()).to.equal(worksheetName1);
        });

        it("Should reorder worksheet", function() {
            var index1 = WSManager.indexOfWS(worksheetId1);
            var index2 = WSManager.indexOfWS(worksheetId2);

            WSManager.reorderWS(index1, index2);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(index2);

            // reorder back
            WSManager.reorderWS(index2, index1);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(index1);

            // no change case
            WSManager.reorderWS(index1, index1);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(index1);
        });

        it("Should hide worksheet", function() {
            WSManager.hideWS(worksheetId1);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(-1);
            var hiddenList = WSManager.getHiddenWSList();
            expect(hiddenList.includes(worksheetId1)).to.be.true;
        });

        it("Should unhide worksheet", function() {
            WSManager.unhideWS(worksheetId1);
            expect(WSManager.indexOfWS(worksheetId1)).not.to.equal(-1);
            var hiddenList = WSManager.getHiddenWSList();
            expect(hiddenList.includes(worksheetId1)).to.be.false;
        });

        it("Should unhide with previous index", function() {
            WSManager.hideWS(worksheetId1);
            WSManager.unhideWS(worksheetId1, 0);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(0);
        });

        it("Should delete empty worksheet", function() {
            WSManager.delWS(worksheetId1, DelWSType.Empty);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(-1);
        });

        it("Should delete empty worksheet by click", function() {
            var $tab = $("#worksheetTab-" + worksheetId2);
            $tab.find(".wsMenu").click();
            $("#worksheetTabMenu .delete").click();
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(-1);
            $("#worksheetTabMenu").hide();
        });
    });

    describe("Worksheet Table Behavior Test", function() {
        var worksheetId;
        var tableId;
        var worksheet;

        before(function() {
            worksheetId = WSManager.addWS();
            worksheet = WSManager.getWSById(worksheetId);
            tableId = xcHelper.randName("testTable");
        });


        it("Should focus on worksheet", function() {
            WSManager.focusOnWorksheet();
            expect(WSManager.getActiveWS()).to.equal(worksheetId);
        });

        it("Should add table to worksheet", function() {
            expect(worksheet.orphanedTables.length).to.equal(0);

            WSManager.addTable(tableId);
            expect(worksheet.orphanedTables.length).to.equal(1);
            expect(worksheet.orphanedTables[0]).to.equal(tableId);

            // invalid add test
            var resId = WSManager.addTable(tableId, worksheetId);
            expect(resId).to.equal(worksheetId);
            expect(worksheet.orphanedTables.length).to.equal(1);
        });

        it("Should replace table from orphan to workseet table", function() {
            expect(worksheet.orphanedTables.length).to.equal(1);
            expect(worksheet.tables.length).to.equal(0);
            WSManager.replaceTable(tableId);

            expect(worksheet.orphanedTables.length).to.equal(0);
            expect(worksheet.tables.length).to.equal(1);
        });

        it("should archive table", function() {
            expect(worksheet.archivedTables.length).to.equal(0);
            WSManager.archiveTable(tableId);

            expect(worksheet.archivedTables.length).to.equal(1);

        });

        it("Should active table", function() {
            expect(worksheet.tables.length).to.equal(0);
            WSManager.activeTable(tableId);

            expect(worksheet.tables.length).to.equal(1);
        });

        it("Should archive table to temp hidden", function() {
            expect(worksheet.tempHiddenTables.length).to.equal(0);
            WSManager.archiveTable(tableId, true);

            expect(worksheet.tempHiddenTables.length).to.equal(1);
            expect(worksheet.tables.length).to.equal(0);

            // replace back
            WSManager.replaceTable(tableId);
            expect(worksheet.tempHiddenTables.length).to.equal(0);
            expect(worksheet.tables.length).to.equal(1);
        });

        it("Should change table status", function() {
            // invalid case
            WSManager.changeTableStatus("errorId");
            expect(worksheet.tables.length).to.equal(1);

            // archive case
            WSManager.changeTableStatus(tableId, TableType.Archived);
            expect(worksheet.tables.length).to.equal(0);
            expect(worksheet.archivedTables.length).to.equal(1);

            // orphan case
            WSManager.changeTableStatus(tableId, TableType.Orphan);
            expect(worksheet.archivedTables.length).to.equal(0);
            expect(worksheet.orphanedTables.length).to.equal(1);

            // Undo case
            WSManager.changeTableStatus(tableId, TableType.Undone);
            expect(worksheet.orphanedTables.length).to.equal(0);
            expect(worksheet.undoneTables.length).to.equal(1);

            worksheet.undoneTables.splice(0, 1);
            worksheet.tempHiddenTables.push(tableId);

            // active case
            WSManager.changeTableStatus(tableId, TableType.Active);
            expect(worksheet.tempHiddenTables.length).to.equal(0);
            expect(worksheet.tables.length).to.equal(1);

            worksheet.tables.splice(0, 1);
            worksheet.tempHiddenTables.push(tableId);

            // error case
            WSManager.changeTableStatus(tableId);
            expect(worksheet.tempHiddenTables.length).to.equal(0);
            expect(worksheet.tables.length).to.equal(1);
        });

        it("Should get table relative position", function() {
            // invalid case
            var tableIndex = WSManager.getTableRelativePosition("errorId");
            expect(tableIndex).to.equal(-1);

            tableIndex = WSManager.getTableRelativePosition(tableId);
            expect(tableIndex).to.equal(0);
        });

        it("Should get table position", function() {
            // invalid case
            var tableIndex = WSManager.getTablePosition("errorId");
            expect(tableIndex).to.equal(-1);

            tableIndex = WSManager.getTablePosition(tableId);
            expect(tableIndex).to.be.at.least(0);
        });

        it("Should remove no sheet table", function() {
            var noSheetTables = WSManager.getNoSheetTables();
            var noSheetTableId = xcHelper.randName("noSheetTable");
            noSheetTables.push(noSheetTableId);

            var len = noSheetTables.length;
            // invalid case
            WSManager.rmNoSheetTable();
            expect(noSheetTables.length).to.equal(len);

            // valid case
            WSManager.rmNoSheetTable(noSheetTableId);
            expect(noSheetTables.length - len).to.equal(-1);
        });

        it("Should add no sheet tables", function() {
            var noSheetTables = WSManager.getNoSheetTables();
            var noSheetTableId = xcHelper.randName("noSheetTable");
            noSheetTables.push(noSheetTableId);
            var len = noSheetTables.length;

            WSManager.addNoSheetTables([noSheetTableId], worksheetId);
            expect(noSheetTables.length - len).to.equal(-1);
            expect(worksheet.orphanedTables.length).to.equal(1);

            WSManager.removeTable(noSheetTableId);
            expect(worksheet.orphanedTables.length).to.equal(0);
        });

        it("Should change table order", function() {
            var anotherTableId = xcHelper.randName("anotherTable");
            worksheet.tables.push(anotherTableId);
            WSManager.reorderTable(tableId, 0, 1);
            expect(WSManager.getTableRelativePosition(tableId)).to.equal(1);
            // remove the anotherTableId
            worksheet.tables.splice(0, 1);
        });

        it("Should remove table from worksheet", function() {
            expect(worksheet.tables.length).to.equal(1);

            WSManager.removeTable(tableId);
            expect(worksheet.tables.length).to.equal(0);
        });

        after(function() {
            WSManager.delWS(worksheetId, DelWSType.Empty);
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

