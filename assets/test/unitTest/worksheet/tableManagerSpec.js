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

        it("vefiryTableType should work", function() {
            var vefiryTableType = TblManager.__testOnly__.vefiryTableType;
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);
            var table = new TableMeta({
                "tableId"  : tableId,
                "tableName": tableName,
                "status"   : TableType.Active
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
                "tableId"  : tableId,
                "tableName": tableName,
                "status"   : TableType.Active
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
        var dsName, tableName, tableId, prefix;

        before(function(done){
            UnitTest.addAll(testDatasets.sp500, "sp500_tableManager_test")
            .then(function(resDS, resTable, resPrefix) {
                dsName = resDS;
                tableName = resTable;
                prefix = resPrefix;
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

        it("Should sort columns", function() {
            var table = gTables[tableId];
            var colName = table.getCol(1).getFrontColName();
            TblManager.sortColumns(tableId, "reverse");
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