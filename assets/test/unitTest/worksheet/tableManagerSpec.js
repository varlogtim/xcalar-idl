describe("TableManager Test", function() {
    before(function() {
        UnitTest.onMinMode();
    });

    describe("Basic Function Test", function() {
        it("TblManager.refreshTable should handle transaction error", function(done) {
            var oldFunc = Transaction.checkAndSetCanceled;
            Transaction.checkAndSetCanceled = function() {
                return true;
            };

            TblManager.refreshTable("test", null, null, null, "testTxId")
            .then(function() {
                throw "error";
            })
            .fail(function(error) {
                expect(error).to.equal(StatusTStr[StatusT.StatusCanceled]);
                done();
            })
            .always(function() {
                Transaction.checkAndSetCanceled = oldFunc;
            });
        });

        it("TableManager.refreshTable should handle set meta error", function(done) {
            var oldFunc = XcalarMakeResultSetFromTable;
            XcalarMakeResultSetFromTable = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            var tableName = xcHelper.randName("test_orphan#ab");
            var tableId = xcHelper.getTableId(tableName);

            TblManager.refreshTable([tableName])
            .then(function() {
                throw "error case";
            })
            .fail(function(error) {
                expect(error).to.exist;
                expect(gTables).not.to.ownProperty(tableId);
                done();
            })
            .always(function() {
                XcalarMakeResultSetFromTable = oldFunc;
            });
        });

        it("TblManager.setOrphanTableMeta should work", function() {
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);

            TblManager.setOrphanTableMeta(tableName);
            expect(gTables).to.ownProperty(tableId);
            var table = gTables[tableId];
            expect(table.getType()).to.equal(TableType.Orphan);
            delete gTables[tableId];
        });

        it("verifyTableType should work", function() {
            var vefiryTableType = TblManager.__testOnly__.vefiryTableType;
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active
            });

            gTables[tableId] = table;
            // case 1
            var res = vefiryTableType(tableName, TableType.Orphan);
            expect(res).to.be.false;
            // case 2
            res = vefiryTableType(tableId, TableType.Active);
            expect(res).to.be.true;

            delete gTables[tableId];

            // case 3
            res = vefiryTableType(tableName, TableType.Orphan);
            expect(res).to.be.true;
        });

        it("TblManager.restoreTableMeta should work", function() {
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active
            });
            table.lock();

            var oldgTables = {};
            oldgTables[tableId] = table;

            TblManager.restoreTableMeta(oldgTables);
            expect(gTables).to.ownProperty(tableId);
            // gTables[tableId] is being written
            table = gTables[tableId];
            expect(table.hasLock()).to.be.false;
            expect(table.getType()).to.equal(TableType.Orphan);

            delete gTables[tableId];
        });

        it("TblManager.getColHeadHTML should work", function() {
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active,
                "tableCols": [ColManager.newDATACol]
            });

            gTables[tableId] = table;

            var progCol = ColManager.newPullCol("test", "test", "string");
            progCol.minimize();
            table.addCol(1, progCol);
            // case 1 hidden column
            var th = TblManager.getColHeadHTML(1, tableId);
            var $th = $(th);
            expect($th.hasClass("userHidden")).to.be.true;
            // case 2 index column
            table.keyName = "test";
            th = TblManager.getColHeadHTML(1, tableId);
            $th = $(th);
            expect($th.hasClass("indexedColumn")).to.be.true;
            // case 3 empty column
            var progCol2 = ColManager.newPullCol("", "");
            table.addCol(2, progCol2);
            th = TblManager.getColHeadHTML(2, tableId);
            $th = $(th);
            expect($th.find(".header").hasClass("editable")).to.be.true;

            delete gTables[tableId];
        });
    });

    describe("TblManager.deleteTables Test", function() {
        var oldFunc;
        var tableName;
        var tableId;
        var table;

        before(function() {
            oldFunc = XcalarDeleteTable;

            XcalarDeleteTable = function() {
                return PromiseHelper.resolve();
            };
        });

        beforeEach(function() {
            tableName = xcHelper.randName("test_table#ab");
            tableId = xcHelper.getTableId(tableName);

            table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active
            });

            gTables[tableId] = table;
        });

        it("Should delete active table", function(done) {
            TblManager.deleteTables(tableId, TableType.Active)
            .then(function() {
                expect(gTables).not.to.ownProperty(tableId);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should delete archived table", function(done) {
            table.beArchived();
            expect(table.getType()).to.equal(TableType.Archived);

            TblManager.deleteTables(tableId, TableType.Archived)
            .then(function() {
                expect(gTables).not.to.ownProperty(tableId);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should delete orphaned table", function(done) {
            table.beOrphaned();
            expect(table.getType()).to.equal(TableType.Orphan);
            gOrphanTables.push(tableName);

            TblManager.deleteTables(tableName, TableType.Orphan)
            .then(function() {
                expect(gTables).not.to.ownProperty(tableId);
                expect(gOrphanTables.includes(tableName)).to.be.false;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should delete undone table", function(done) {
            table.beUndone();
            expect(table.getType()).to.equal(TableType.Undone);

            TblManager.deleteTables(tableId, TableType.Undone)
            .then(function() {
                expect(gTables).not.to.ownProperty(tableId);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should handle fails", function(done) {
            XcalarDeleteTable = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            TblManager.deleteTables(tableId, TableType.Active)
            .then(function() {
                throw "error case";
            })
            .fail(function(error) {
                expect(error).to.exist;
                UnitTest.hasAlertWithTitle(StatusMessageTStr.DeleteTableFailed);
                delete gTables[tableId];
                done();
            });
        });

        it("Should handle partial fail", function(done) {
            XcalarDeleteTable = function() {
                return PromiseHelper.reject(null);
            };

            TblManager.deleteTables(tableId, TableType.Active)
            .then(function() {
                UnitTest.hasAlertWithTitle(StatusMessageTStr.PartialDeleteTableFail);
                delete gTables[tableId];
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        after(function() {
            XcalarDeleteTable = oldFunc;
        });
    });

    describe("Table Related Api Test", function() {
        var dsName, tableName, tableId;

        before(function(done){
            UnitTest.addAll(testDatasets.sp500, "sp500_tableManager_test")
            .then(function(resDS, resTable) {
                dsName = resDS;
                tableName = resTable;
                tableId = xcHelper.getTableId(tableName);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("TblManager.archiveTables should work", function(done) {
            var worksheet = WSManager.getActiveWS();
            var table = gTables[tableId];
            TblManager.archiveTables(tableId);
            expect(table.resultSetId).not.to.equal(-1);

            var checkFunc = function() {
                return table.resultSetId === -1;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect(table.getType()).to.equal(TableType.Archived);
                // back to active
                return TblManager.refreshTable([tableName], null, null, worksheet);
            })
            .then(function() {
                expect(table.getType()).to.equal(TableType.Active);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("TblManager.sendTableToOrphaned should work", function(done) {
            var worksheet = WSManager.getActiveWS();
            var table = gTables[tableId];
            TblManager.sendTableToOrphaned(tableId, {"remove": true})
            .then(function() {
                expect(table.getType()).to.equal(TableType.Orphan);
                return TblManager.refreshTable([tableName], null, null, worksheet);
            })
            .then(function() {
                expect(table.getType()).to.equal(TableType.Active);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("TblManager.sendTableToUndone should work", function(done) {
            var worksheet = WSManager.getActiveWS();
            var table = gTables[tableId];
            TblManager.sendTableToUndone(tableId, {"remove": true})
            .then(function() {
                expect(table.getType()).to.equal(TableType.Undone);
                return TblManager.refreshTable([tableName], null, null, worksheet);
            })
            .then(function() {
                expect(table.getType()).to.equal(TableType.Active);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("TblManager.hideWorksheetTable should work", function(done) {
            gActiveTableId = tableId;
            TblManager.hideWorksheetTable(tableId);
            expect(gActiveTableId).to.be.null;
            // use this way to make the table active again
            var worksheet = WSManager.getActiveWS();
            var table = gTables[tableId];
            TblManager.sendTableToUndone(tableId, {"remove": true})
            .then(function() {
                expect(table.getType()).to.equal(TableType.Undone);
                return TblManager.refreshTable([tableName], null, null, worksheet);
            })
            .then(function() {
                expect(table.getType()).to.equal(TableType.Active);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("TblManager.hideTable should work", function() {
            TblManager.hideTable(tableId);
            var $tableWrap = $("#xcTableWrap-" + tableId);
            expect($tableWrap.hasClass("tableHidden"))
            .to.be.true;
        });

        it("TblManager.unHideTable should work", function() {
            TblManager.unHideTable(tableId);
            var $tableWrap = $("#xcTableWrap-" + tableId);
            expect($tableWrap.hasClass("tableHidden"))
            .to.be.false;
        });

        it("TblManager.sortColumns should work", function() {
            var table = gTables[tableId];
            var colName = table.getCol(1).getFrontColName();
            TblManager.sortColumns(tableId, ColumnSortType.name, "reverse");
            var curColName = table.getCol(1).getFrontColName();
            expect(curColName).not.to.equal(colName);
        });

        it("Should reorder columns", function() {
            // it's hard coded
            var order = [1, 0, 2];
            var table = gTables[tableId];
            var colName = table.getCol(1).getFrontColName();
            TblManager.orderAllColumns(tableId, order);
            var curColName = table.getCol(1).getFrontColName();
            expect(curColName).not.to.equal(colName);
        });

        it("Should resize colum to content", function() {
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            // default to be true
            expect(progCol.sizedToHeader).to.be.true;
            TblManager.resizeColumns(tableId, "sizeToContents", 1);
            expect(progCol.sizedToHeader).to.be.false;
        });

        it("Should resize column to header", function() {
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            TblManager.resizeColumns(tableId, "sizeToHeader");
            expect(progCol.sizedToHeader).to.be.true;
        });

        it("Should resize column to fit all", function() {
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            progCol.sizedToHeader = false;
            TblManager.resizeColumns(tableId, "sizeToFitAll", 1);
            expect(progCol.sizedToHeader).to.be.true;
        });

        it("Should throw error in invalid resize", function() {
            try {
                TblManager.resizeColumns(tableId, "sizeToFitAll", 1);
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it("TblManager.resizeColsToWidth should work", function(done) {
            // use undo/redo to test it
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            expect(progCol.sizedToHeader).to.be.true;
            TblManager.resizeColumns(tableId, "sizeToContents", 1);
            expect(progCol.sizedToHeader).to.be.false;

            SQL.undo()
            .then(function() {
                expect(progCol.sizedToHeader).to.be.true;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("TblManager.bookmarkRow should work", function() {
            var table = gTables[tableId];
            var rowNum = 0;
            expect(table.bookmarks.length).to.equal(0);
            TblManager.bookmarkRow(rowNum, tableId);
            expect(table.bookmarks.length).to.equal(1);
            var $table = $("#xcTable-" + tableId);
            var $td = $table.find(".row" + rowNum + " .col0");
            expect($td.hasClass("rowBookmarked"))
            .to.be.true;
        });

        it("TblManager.unbookmarkRow should work", function() {
            var table = gTables[tableId];
            var rowNum = 0;
            TblManager.unbookmarkRow(rowNum, tableId);
            expect(table.bookmarks.length).to.equal(0);
            var $table = $("#xcTable-" + tableId);
            var $td = $table.find(".row" + rowNum + " .col0");
            expect($td.hasClass("rowBookmarked"))
            .to.be.false;
        });

        describe("Thead Listener Test", function() {
            var $xcTheadWrap;

            before(function() {
                $xcTheadWrap = $("#xcTheadWrap-" + tableId);
            });

            it("Should rename the table", function() {
                var $div = $xcTheadWrap.find(".tableTitle .text");
                var $tableName = $div.find(".tableName");
                var name = $tableName.val();
                var test = null;
                var oldFunc = xcFunction.rename;

                xcFunction.rename = function() {
                    test = true;
                    return PromiseHelper.resolve();
                };
                // case 1
                $div.trigger(fakeEvent.enter);
                expect(test).to.be.null;
                // case 2
                $tableName.focus();
                $tableName.val("rename").trigger("input");
                $div.trigger(fakeEvent.enter);
                expect(test).to.be.true;
                $tableName.val(name).blur();

                xcFunction.rename = oldFunc;
            });

            it("Should prevent space in rename", function() {
                var $div = $xcTheadWrap.find(".tableTitle .text");
                var e = jQuery.Event("keydown", {"which": keyCode.Space});
                $div.trigger(e);
                expect(e.isDefaultPrevented()).to.be.true;
                expect(e.isPropagationStopped()).to.be.true;
            });

            it("Should open tableMenu", function() {
                var $menu = $("#tableMenu");
                $xcTheadWrap.find(".dropdownBox").click();
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should right click to open the menu", function() {
                var $menu = $("#tableMenu");
                $xcTheadWrap.find(".dropdownBox").contextmenu();
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Shuld click .tableGrab to open menu", function() {
                var $menu = $("#tableMenu");
                $xcTheadWrap.find(".tableGrab").click();
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should right click .tableGrab to open the menu", function() {
                var $menu = $("#tableMenu");
                $xcTheadWrap.find(".tableGrab").contextmenu();
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should mousedown tableGrab to start drag", function() {
                var test = null;
                var oldFunc = TblAnim.startTableDrag;
                TblAnim.startTableDrag = function() {
                    test = true;
                };

                var $tableGrab = $xcTheadWrap.find(".tableGrab").eq(0);
                expect($tableGrab.length).to.equal(1);
                $tableGrab.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $tableGrab.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;

                TblAnim.startTableDrag = oldFunc;
            });
        });

        describe("Table Listener Test", function() {
            var $xcTableWrap;

            before(function() {
                $xcTableWrap = $("#xcTableWrap-" + tableId);
            });

            it("Should mousedown lockedTableIcon to cancel query", function() {
                var test = null;
                var oldFunc = QueryManager.cancelQuery;
                QueryManager.cancelQuery = function() {
                    test = true;
                };
                xcHelper.lockTable(tableId);

                var $icon = $xcTableWrap.find(".lockedTableIcon");
                expect($icon.length).to.equal(1);
                $icon.mousedown();
                expect(test).to.be.true;

                QueryManager.cancelQuery = oldFunc;
                xcHelper.unlockTable(tableId);
                expect($xcTableWrap.find(".lockedTableIcon").length)
                .to.equal(0);
            });

            it("Should mousedown to focus on table", function() {
                var $title = $xcTableWrap.find(".tableTitle");
                gActiveTableId = null;
                $title.removeClass("tblTitleSelected");
                // case 1
                $xcTableWrap.addClass("tableOpSection");
                $xcTableWrap.mousedown();
                expect(gActiveTableId).to.be.null;
                // case 2
                $xcTableWrap.removeClass("tableOpSection");
                $xcTableWrap.mousedown();
                expect(gActiveTableId).to.equal(tableId);
                expect($title.hasClass("tblTitleSelected")).to.be.true;
            });

            it("Should mousedown rowGrab to start resize", function() {
                var test = null;
                var oldFunc = TblAnim.startRowResize;
                TblAnim.startRowResize = function() {
                    test = true;
                };

                var $rowGrab = $("#xcTbodyWrap-" + tableId).find(".rowGrab.last");
                expect($rowGrab.length).to.equal(1);
                $rowGrab.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $rowGrab.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;

                TblAnim.startRowResize = oldFunc;
            });

            after(function() {
                xcTooltip.hideAll();
            });
        });

        describe("Row Listener Test", function() {
            var $tbody;

            before(function() {
                $tbody = $("#xcTable-" + tableId).find("tbody");
            });

            it("Should click rowGrab to start resize", function() {
                var test = null;
                var oldFunc = TblAnim.startRowResize;
                TblAnim.startRowResize = function() {
                    test = true;
                };

                var $rowGrab = $tbody.find(".rowGrab").eq(0);
                expect($rowGrab.length).to.equal(1);
                $rowGrab.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $rowGrab.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;

                TblAnim.startRowResize = oldFunc;
            });

            it("Should click idSpan to book mark", function() {
                var $td = $tbody.find(".row0 .col0");
                var $idSpan = $td.find(".idSpan");
                expect($idSpan.length).to.equal(1);
                // bookmark
                $idSpan.click();
                expect($td.hasClass("rowBookmarked"))
                .to.be.true;
                // unbookmark
                $idSpan.click();
                expect($td.hasClass("rowBookmarked"))
                .to.be.false;
            });

            it("Should click json elemet to open json modal", function() {
                var test = null;
                var oldFunc = JSONModal.show;
                JSONModal.show = function() {
                    test = true;
                };

                var $pop = $tbody.find(".jsonElement").eq(0).find(".pop");
                expect($pop.length).to.equal(1);
                // case 1
                $("#mainFrame").addClass("modalOpen");
                $pop.click();
                expect(test).to.be.null;
                // case 2
                $("#mainFrame").removeClass("modalOpen");
                $pop.click();
                expect(test).to.be.true;

                JSONModal.show = oldFunc;
            });
        });

        describe("Col Listener Test", function() {
            var $thead;

            before(function() {
                $thead = $("#xcTable-" + tableId).find("thead tr");
            });

            it("Should open menu by right click", function() {
                var $menu = $("#colMenu");
                // .eq(0) is empty
                $thead.find(".header").eq(1).contextmenu();
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should mousedown header to select a column", function() {
                var $header = $thead.find(".flexContainer").eq(1);
                $header.mousedown();
                expect($thead.find(".selectedCell").length).to.equal(1);
            });

            it("Should shift select column", function() {
                var $header = $thead.find(".flexContainer").eq(0);
                var e = jQuery.Event("mousedown", {"shiftKey": true});
                // unselect
                $header.trigger(e);
                expect($thead.find(".selectedCell").length).to.equal(2);
                // select
                $header.trigger(e);
                expect($thead.find(".selectedCell").length).to.equal(1);
            });

            it("Should trigger prefixColorMenu", function() {
                var $menu = $("#prefixColorMenu");
                var $dotWrap = $thead.find(".dotWrap").eq(0);
                $dotWrap.click();
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should mousedown colGrab to start resize", function() {
                var test = null;
                var oldFunc = TblAnim.startColResize;
                TblAnim.startColResize = function() {
                    test = true;
                };

                var $colGrab = $thead.find(".colGrab").eq(0);
                expect($colGrab.length).to.equal(1);
                $colGrab.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $colGrab.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;

                TblAnim.startColResize = oldFunc;
            });

            it("Should mousedown dragArea to start drag", function() {
                var test = null;
                var oldFunc = TblAnim.startColDrag;
                TblAnim.startColDrag = function() {
                    test = true;
                };

                var $dragArea = $thead.find(".dragArea").eq(0);
                expect($dragArea.length).to.equal(1);
                $dragArea.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $dragArea.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;

                TblAnim.startColDrag = oldFunc;
            });

            it("Should mousedown editableHead to start drag", function() {
                var test = null;
                var oldFunc = TblAnim.startColDrag;
                TblAnim.startColDrag = function() {
                    test = true;
                };

                var $editableHead = $thead.find(".editableHead").eq(0);
                expect($editableHead.length).to.equal(1);
                $editableHead.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $editableHead.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;

                TblAnim.startColDrag = oldFunc;
            });
        });

        describe("Tbody Listener Test", function() {
            var $tbody;

            before(function() {
                $tbody = $("#xcTable-" + tableId).find("tbody");
            });

            it("Should mousedown on td to remove highlightBox", function() {
                var $td = $tbody.find(".row0 td.col1");
                var $menu = $("#cellMenu");
                // only left mouse down works
                $td.mousedown();
                assert.isFalse($menu.is(":visible"));
                $td.trigger(fakeEvent.mousedown);
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));

                var e = jQuery.Event("mousedown", {
                    "which": 1,
                    "shiftKey": true
                });
                $td.trigger(e);
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));

                // click on jsonElement not work
                $td = $tbody.find("td.jsonElement").eq(0);
                $td.trigger(fakeEvent.mousedown);
                assert.isFalse($menu.is(":visible"));
            });

            it("Should right click to open menu", function() {
                var $td = $tbody.find(".row0 td.col1");
                var $menu = $("#cellMenu");
                var e = jQuery.Event("contextmenu", {"target": $td.get(0)});

                $tbody.trigger(e);
                assert.isTrue($menu.is(":visible"));
                $("#mainFrame").mousedown();
                assert.isFalse($menu.is(":visible"));
            });
        });

        after(function(done) {
            UnitTest.deleteAll(tableName, dsName)
            .always(function() {
                done();
            });
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});