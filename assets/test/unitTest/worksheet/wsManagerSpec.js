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
            expect(meta).to.be.an.instanceof(WSMETA);
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

        it("Should get worksheet list", function() {
            // focus on worksheet 1 first
            WSManager.focusOnWorksheet(worksheetId1);
            var numWS = WSManager.getNumOfWS();
            var html = WSManager.getWSLists();
            var $list = $('<div>' + html + '</div>');
            expect($list.find("li").length).to.equal(numWS - 1);

            html = WSManager.getWSLists(true);
            $list = $('<div>' + html + '</div>');
            expect($list.find("li").length).to.equal(numWS);
        });

        it("Should delete empty worksheet", function() {
            // error case
            WSManager.delWS(worksheetId1);
            expect(WSManager.indexOfWS(worksheetId1)).not.to.equal(-1);

            WSManager.delWS(worksheetId1, DelWSType.Empty);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(-1);
        });

        it("Should delete empty worksheet by click", function() {
            var $tab = $("#worksheetTab-" + worksheetId2);
            $tab.find(".wsMenu").click();
            $("#worksheetTabMenu .delete").trigger(fakeEvent.mouseup);
            expect(WSManager.indexOfWS(worksheetId1)).to.equal(-1);
            $("#worksheetTabMenu").hide();
        });
    });

    describe("Worksheet Event Test", function() {
        var worksheetId;
        var $wsMenu;

        before(function() {
            $wsMenu = $("#worksheetTabMenu");
            if (!$("#workspaceMenu").hasClass("active")) {
                $("#workspaceTab .mainTab").click();
            }
        });

        it("Should switch to table list", function() {
            $("#tableListTab").click();
            var $menu = $("#workspaceMenu");
            expect($menu.find(".worksheets").hasClass("xc-hidden"))
            .to.be.true;
            expect($menu.find(".tables").hasClass("xc-hidden"))
            .to.be.false;
        });

        it("Should switch to worksheet list", function() {
            $("#worksheetListTab").click();
            var $menu = $("#workspaceMenu");
            expect($menu.find(".worksheets").hasClass("xc-hidden"))
            .to.be.false;
            expect($menu.find(".tables").hasClass("xc-hidden"))
            .to.be.true;
        });

        it("Should expand/collapse worksheet list", function() {
            var $listWrap = $("#worksheetListSection .listWrap").eq(0);
            var isActive = $listWrap.hasClass("active");
            $listWrap.find(".listInfo").click();
            expect($listWrap.hasClass("active")).to.equal(!isActive);
            $listWrap.find(".listInfo").click();
            expect($listWrap.hasClass("active")).to.equal(isActive);
        });

        it("Should add worksheet by click add worksheet button", function() {
            var $tabSection = $("#worksheetTabs");
            var len = $tabSection.find(".worksheetTab").length;
            $("#addWorksheet").click();
            var $tabs = $tabSection.find(".worksheetTab");
            expect($tabs.length - len).to.equal(1);
            worksheetId = $tabs.last().data("ws");
            expect(worksheetId).not.to.be.null;
            expect(worksheetId).not.to.be.undefined;
        });

        it("Should rename worksheet by some event", function() {
            var $tab = $("#worksheetTab-" + worksheetId);
            $tab.find(".wsMenu").click();
            $wsMenu.find(".rename").trigger(fakeEvent.mouseup);
            var newName = xcHelper.randName("renamedWorsheet");
            $tab.find(".text").val(newName).trigger(fakeEvent.enter);
        });

        it("Should click tab to switch worksheet", function() {
            var $tab = $("#worksheetTab-" + worksheetId);
            var $sibTab = $tab.siblings().eq(0);
            // invalid case
            $sibTab.click();
            expect(WSManager.getActiveWS()).to.equal(worksheetId);
            // switch case
            $sibTab.trigger(fakeEvent.mousedown);
            expect(WSManager.getActiveWS()).not.to.equal(worksheetId);
            // switch back case
            $tab.trigger(fakeEvent.mousedown);
            expect(WSManager.getActiveWS()).to.equal(worksheetId);
        });

        it("Should hide and unhide via worksheet menu", function() {
            var $tab = $("#worksheetTab-" + worksheetId);
            var numOfActiveWS = WSManager.getNumOfWS();
            // hide worksheet
            $tab.find(".wsMenu").click();
            $wsMenu.find(".hide").trigger(fakeEvent.mouseup);
            expect(WSManager.getNumOfWS() - numOfActiveWS).to.equal(-1);
            $tab = $("#worksheetTab-" + worksheetId);
            expect($tab.closest("ul").attr("id")).to.equal("hiddenWorksheetTabs");
            // unhide worksheet
            $tab.find(".unhide").click();
            expect(WSManager.getNumOfWS() - numOfActiveWS).to.equal(0);
        });

        it("Should move up and down worksheet via menu", function() {
            var oldIndex = WSManager.indexOfWS(worksheetId);
            var $tab = $("#worksheetTab-" + worksheetId);
            // move up
            $tab.find(".wsMenu").click();
            $wsMenu.find(".moveUp").trigger(fakeEvent.mouseup);
            var newIndex = WSManager.indexOfWS(worksheetId);
            expect(newIndex - oldIndex).to.equal(-1);
            // move down
            $tab.find(".wsMenu").click();
            $wsMenu.find(".moveDown").trigger(fakeEvent.mouseup);
            newIndex = WSManager.indexOfWS(worksheetId);
            expect(newIndex - oldIndex).to.equal(0);
        });

        it("Should delete worksheet via menu", function() {
            var $tab = $("#worksheetTab-" + worksheetId);
            $tab.find(".wsMenu").click();
            $wsMenu.find(".delete").trigger(fakeEvent.mouseup);
            var index = WSManager.indexOfWS(worksheetId);
            expect(index).to.equal(-1);
        });

        after(function() {
            // close tab
            $("#workspaceTab .mainTab").click();
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

            // error case, manually remove table
            worksheet.tables.splice(0, 1);
            tableIndex = WSManager.getTablePosition(tableId);
            expect(tableIndex).to.be.at.least(-1);

            // normal case
            worksheet.tables.push(tableId);
            tableIndex = WSManager.getTablePosition(tableId);
            expect(tableIndex).to.be.at.least(0);
        });

        it("Should lock table", function() {
            WSManager.lockTable(tableId);

            expect(worksheet.lockedTables.length).to.equal(1);
            var $tab = $("#worksheetTab-" + worksheetId);
            expect($tab.hasClass("locked")).to.be.true;
        });

        it("Should unlock table", function() {
            WSManager.unlockTable(tableId);

            expect(worksheet.lockedTables.length).to.equal(0);
            var $tab = $("#worksheetTab-" + worksheetId);
            expect($tab.hasClass("locked")).to.be.false;
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

        // remove worksheet test
        it("Should remove table from worksheet", function() {
            expect(worksheet.tables.length).to.equal(1);

            WSManager.removeTable(tableId);
            expect(worksheet.tables.length).to.equal(0);
        });

        it("Should remove table from no sheet list", function() {
            var noSheetTables = WSManager.getNoSheetTables();
            var noSheetTableId = xcHelper.randName("noSheetTable");
            var errorTableId = xcHelper.randName("errorTable");
            // may already have no sheet tables in from old cache,
            // so need check the change of length
            noSheetTables.push(noSheetTableId);
            var len = noSheetTables.length;

            // invalid case
            var wsId = WSManager.removeTable(errorTableId);
            expect(wsId).to.be.null;
            expect(noSheetTables.length - len).to.equal(0);
            // valid case
            wsId = WSManager.removeTable(noSheetTableId);
            expect(wsId).to.be.null;
            expect(noSheetTables.length - len).to.equal(-1);
        });

        it("Should remove from tempHidden, undone and lock tables", function() {
            var lists = ["tempHiddenTables",  "undoneTables", "lockedTables"];

            lists.forEach(function(tableType) {
                var testTableId = xcHelper.randName("removeTable");
                WSManager.addTable(testTableId, worksheetId);
                // remove table from orphan list
                worksheet.orphanedTables.splice(0, 1);
                worksheet[tableType].push(testTableId);

                var wsId = WSManager.removeTable(testTableId);
                expect(wsId).not.to.be.null;
                expect(worksheet.tempHiddenTables.length).to.equal(0);
                expect(worksheet[tableType].length).to.equal(0);
            });
        });

        it("Should handle error case of remove table", function() {
            var testTableId = xcHelper.randName("removeTable");
            WSManager.addTable(testTableId, worksheetId);
            // manually remove to create error case
            worksheet.orphanedTables.splice(0, 1);
            var wsId = WSManager.removeTable(testTableId);
            expect(wsId).to.be.null;

            // restore back
            worksheet.orphanedTables.push(testTableId);
            wsId = WSManager.removeTable(testTableId);
            expect(wsId).not.to.be.null;
            expect(worksheet.orphanedTables.length).to.equal(0);
        });

        after(function() {
            WSManager.delWS(worksheetId, DelWSType.Empty);
        });
    });

    describe("Worksheet with real table behavior test", function() {
        var worksheet1, worksheetId1;
        var worksheet2, worksheetId2;
        var dsName;
        var table1, tableId1;
        var table2, tableId2;

        before(function(done) {
            var worksheetName1 = xcHelper.randName("testWS1-");
            worksheetId1 = WSManager.addWS(null, worksheetName1);
            worksheet1 = WSManager.getWSById(worksheetId1);

            var worksheetName2 = xcHelper.randName("testWS2-");
            worksheetId2 = WSManager.addWS(null, worksheetName2);
            worksheet2 = WSManager.getWSById(worksheetId2);

            WSManager.focusOnWorksheet(worksheetId1);

            UnitTest.addAll(testDatasets.schedule, "unitTestWorksheet1")
            .then(function(resDS, resTable) {
                dsName = resDS;
                table1 = resTable;
                tableId1 = xcHelper.getTableId(table1);
                // switch to workshet 2
                WSManager.focusOnWorksheet(worksheetId2);
                return UnitTest.addTable(resDS);
            })
            .then(function(resTable) {
                table2 = resTable;
                tableId2 = xcHelper.getTableId(table2);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should get table list", function() {
            var html = WSManager.getTableList();
            var $list = $("<div>" + html + "</div>");
            var $li = $list.find('li[data-ws="' + worksheetId1 + '"]');
            expect($li.length).to.equal(1);
            expect($li.data("id")).to.equal(tableId1);
        });

        it("Should Hide and unHide worksheet with table", function(done) {
            WSManager.hideWS(worksheetId1);
            expect(worksheet1.tempHiddenTables.length).to.equal(1);
            // hide worksheet has some async call, wait for it
            setTimeout(function() {
                WSManager.unhideWS(worksheetId1)
                .then(function() {
                    expect(worksheet1.tempHiddenTables.length).to.equal(0);
                    done();
                })
                .fail(function(error) {
                    throw error;
                });
            }, 1000);
        });

        it("Should Move Table to another worksheet", function() {
            WSManager.moveTable(tableId1, worksheetId2);
            expect(worksheet1.tables.length).to.equal(0);
            expect(worksheet2.tables.length).to.equal(2);
            // should focus on worksheetId2
            expect(WSManager.getActiveWS()).to.equal(worksheetId2);
        });

        it("Should move inactive table to another worksheet", function(done) {
            TblManager.archiveTables(tableId1);

            WSManager.moveInactiveTable(tableId1, worksheetId1, TableType.Archived)
            .then(function() {
                expect(worksheet1.tables.length).to.equal(1);
                expect(worksheet2.tables.length).to.equal(1);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should not delete worksheet as empty type when has table", function() {
            WSManager.delWS(worksheetId1, DelWSType.Empty);
            expect(WSManager.getWSById(worksheetId1) == null).to.be.false;
        });

        it("Should delete worksheet with hide table", function(done) {
            var noSheetTables = WSManager.getNoSheetTables();
            var len = noSheetTables.length;
            WSManager.delWS(worksheetId1, DelWSType.Archive);
            expect(WSManager.getWSById(worksheetId1) == null).to.be.true;
            // undo it
            SQL.undo()
            .then(function() {
                worksheet1 = WSManager.getWSById(worksheetId1);
                expect(worksheet1 == null).to.be.false;
                expect(worksheet1.tables.length).to.equal(1);
                xcTooltip.hideAll();
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should delete worksheet with delete table", function() {
            WSManager.delWS(worksheetId2, DelWSType.Del);
            expect(WSManager.getWSById(worksheetId2) == null).to.be.true;
        });

        after(function(done) {
            // table2 and worksheet2 are already deleted
            UnitTest.deleteAll(table1, dsName)
            .then(function() {
                WSManager.delWS(worksheetId1, DelWSType.Empty);
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

