describe("Repeat Test", function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;

    var tableName2;
    var prefix2;
    var tableId2;
    var $table2;

    var newWSId;
    var secondWSId;

    before(function(done) {
        UnitTest.onMinMode();

        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);
            prefix = tPrefix;
            $table = $("#xcTable-" + tableId);
            done();
        });
    });

    describe("Column operations", function() {
        it("sort should work", function(done) {
            var cachedIndexFn = XcalarIndexFromTable;
            var cachedRefreshFn = TblManager.refreshTable;
            var indexCalled = false;
            XcalarIndexFromTable = function() {
                indexCalled = true;
                return PromiseHelper.resolve();
            };
            TblManager.refreshTable = function() {
                return PromiseHelper.resolve();
            };

            xcFunction.sort(1, tableId, SortDirection.Forward)
            .then(function() {
                indexCalled = false;
                TblManager.highlightColumn($table.find("th.col4"));
                return Log.repeat();
            })
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(indexCalled).to.be.true;
                expect(lastLog.title).to.equal("Sort");
                expect(lastLog.options.colNum).to.equal(4);
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                XcalarIndexFromTable = cachedIndexFn;
                TblManager.refreshTable = cachedRefreshFn;
            });
        });

        it("sort on object should not work", function(done) {
            var cachedSortFn = xcFunction.sort;
            var sortCalled = false;
            xcFunction.sort = function() {
                sortCalled = true;
                return PromiseHelper.resolve();
            };

            TblManager.highlightColumn($table.find("th.col2"));
            Log.repeat()
            .then(function() {
                expect(sortCalled).to.be.false;
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                xcFunction.sort = cachedSortFn;
            });
        });

        it("sort when multiple columns selected should not work", function(done) {
            var cachedSortFn = xcFunction.sort;
            var sortCalled = false;
            xcFunction.sort = function() {
                sortCalled = true;
                return PromiseHelper.resolve();
            };

            TblManager.highlightColumn($table.find("th.col1"));
            TblManager.highlightColumn($table.find("th.col4"), true);

            Log.repeat()
            .then(function() {
                expect(sortCalled).to.be.false;
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                xcFunction.sort = cachedSortFn;
            });
        });

        it("split col should work", function(done) {
            var cachedMapFn = XIApi.map;
            var cachedAggFn = XIApi.aggregate;
            var cachedDeleteFn = XIApi.deleteTable;
            var cachedRefreshFn = TblManager.refreshTable;
            var mapCalled = false;
            XIApi.map = function() {
                mapCalled = true;
                return PromiseHelper.resolve();
            };
            XIApi.aggregate = function() {
                return PromiseHelper.resolve(2);
            };
            XIApi.deleteTable = function() {
                return PromiseHelper.resolve();
            };

            TblManager.refreshTable = function() {
                return PromiseHelper.resolve();
            };

            ColManager.splitCol(7, tableId, ".")
            .then(function() {
                mapCalled = false;
                TblManager.highlightColumn($table.find("th.col10"));
                return Log.repeat();
            })
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(mapCalled).to.be.true;
                expect(lastLog.title).to.equal("SplitCol");
                expect(lastLog.options.colNum).to.equal(10);
                expect(lastLog.options.delimiter).to.equal(".");
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                XIApi.map = cachedMapFn;
                XIApi.aggregate = cachedAggFn;
                XIApi.deleteTable = cachedDeleteFn;
                TblManager.refreshTable = cachedRefreshFn;
            });
        });

        it("split col on non string should not work", function(done) {
            var cachedMapFn = XIApi.map;
            var mapCalled = false;
            XIApi.map = function() {
                mapCalled = true;
                return PromiseHelper.resolve();
            };

            TblManager.highlightColumn($table.find("th.col1"));
            Log.repeat()
            .then(function() {
                expect(mapCalled).to.be.false;
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                XIApi.map = cachedMapFn;
            });
        });

        it("column operation without selected column should not work", function(done) {
            $(".selectedCell").removeClass("selectedCell");
            var logsLen = Log.getLogs().length;
            Log.repeat()
            .then(function() {
                done("failed");
            })
            .fail(function() {
                expect(Log.getLogs().length).to.equal(logsLen);
                done();
            })
            .always(function() {
            });
        });


        it("split col on multiple cols should not work", function(done) {
            var cachedMapFn = XIApi.map;
            var mapCalled = false;
            XIApi.map = function() {
                mapCalled = true;
                return PromiseHelper.resolve();
            };

            TblManager.highlightColumn($table.find("th.col7"));
            TblManager.highlightColumn($table.find("th.col10"), true);
            Log.repeat()
            .then(function() {
                expect(mapCalled).to.be.false;
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                XIApi.map = cachedMapFn;
            });
        });

        it("change type should work", function(done) {
            var cachedMapFn = XIApi.map;
            var cachedRefreshFn = TblManager.refreshTable;
            var mapCalled = false;
            XIApi.map = function() {
                mapCalled = true;
                return PromiseHelper.resolve();
            };

            TblManager.refreshTable = function() {
                return PromiseHelper.resolve();
            };


            ColManager.changeType([{colNum: 1, type: "string"}], tableId)
            .then(function() {
                mapCalled = false;
                TblManager.highlightColumn($table.find("th.col4"));
                return Log.repeat();
            })
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(mapCalled).to.be.true;
                expect(lastLog.title).to.equal("ChangeType");
                expect(lastLog.options.colTypeInfos[0].colNum).to.equal(4);
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                XIApi.map = cachedMapFn;
                TblManager.refreshTable = cachedRefreshFn ;
            });
        });

        it("minimize cols should work", function(done) {
            ColManager.minimizeCols([1, 2], tableId)
            .then(function() {
                TblManager.highlightColumn($table.find("th.col3"));
                TblManager.highlightColumn($table.find("th.col4"), true);
                return Log.repeat();
            })
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Minimize Columns");
                expect(lastLog.options.colNums[0]).to.equal(3);
                expect(lastLog.options.colNums[1]).to.equal(4);
                done();
            })
            .fail(function() {
                done("failed");
            });
        });

        it("maximize cols should work", function(done) {
            ColManager.maximizeCols([1, 2], tableId)
            .then(function() {
                TblManager.highlightColumn($table.find("th.col3"));
                TblManager.highlightColumn($table.find("th.col4"), true);
                return Log.repeat();
            })
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Maximize Columns");
                expect(lastLog.options.colNums[0]).to.equal(3);
                expect(lastLog.options.colNums[1]).to.equal(4);
                done();
            })
            .fail(function() {
                done("failed");
            });
        });

        it("add new col should work", function(done) {
            ColManager.addNewCol(1, tableId, 1);
            TblManager.highlightColumn($table.find("th.col2"));
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Add New Column");
                expect(lastLog.options.colNum).to.equal(2);
                expect(lastLog.options.direction).to.equal(1);
                done();
            })
            .fail(function() {
                done("failed");
            });
        });

        it("hide col should work", function(done) {
            ColManager.delCol([3], tableId)
            .then(function() {
                TblManager.highlightColumn($table.find("th.col2"));
                Log.repeat();
            })
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Delete Column");
                expect(lastLog.options.colNums[0]).to.equal(2);

                done();
            })
            .fail(function() {
                done("failed");
            });
        });

        it("text align should work", function(done) {
            ColManager.textAlign([1], tableId, "rightAlign");

            TblManager.highlightColumn($table.find("th.col2"));

            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Text Align");
                expect(lastLog.options.alignment).to.equal("Right");

                done();
            })
            .fail(function() {
                done("failed");
            });
        });

        it("change format should work", function(done) {
            ColManager.format([1], tableId, ["percent"]);

            TblManager.highlightColumn($table.find("th.col2"));

            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Change Format");
                expect(lastLog.options.formats[0]).to.equal("percent");
                done();
            })
            .fail(function() {
                done("failed");
            });
        });

        it("round to fixed should work", function(done) {
            ColManager.roundToFixed([1], tableId, [4]);

            TblManager.highlightColumn($table.find("th.col1"));

            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Round To Fixed");
                expect(lastLog.options.colNums[0]).to.equal(1);
                expect(lastLog.options.decimals[0]).to.equal(4);
                done();
            })
            .fail(function() {
                done("failed");
            });
        });
    });

    describe("table operations", function() {
        before(function(done) {
            var testDSObj = testDatasets.fakeYelp;
            UnitTest.addAll(testDSObj, "unitTestFakeYelp")
            .always(function(ds, tName, tPrefix) {
                testDs2 = ds;
                tableName2 = tName;
                tableId2 = xcHelper.getTableId(tableName2);
                prefix2 = tPrefix;
                $table2 = $("#xcTable-" + tableId2);
                done();
            });
        });

        it("archive table should work", function(done) {
            TblManager.archiveTables(tableId);
            TblFunc.focusTable(tableId2);
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Hide Table");
                expect(lastLog.options.tableIds[0]).to.equal(tableId2);
                return Log.undo();
            })
            .then(Log.undo)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("table operation without focuse table should not  work", function(done) {
            var logsLen = Log.getLogs().length;
            $(".tblTitleSelected").removeClass("tblTitleSelected");
            Log.repeat()
            .then(function(){
                expect(Log.getLogs().length).to.equal(logsLen);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("hide table should work", function(done) {
            TblManager.hideTable(tableId);
            TblFunc.focusTable(tableId2);
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Minimize Table");
                expect(lastLog.options.tableId).to.equal(tableId2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("hide table should work", function(done) {
            TblManager.unHideTable(tableId);
            TblFunc.focusTable(tableId2);
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Maximize Table");
                expect(lastLog.options.tableId).to.equal(tableId2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("mark prefix should work", function(done) {
            TPrefix.markColor(prefix, "green");
            TblManager.highlightColumn($table2.find("th.col1"));
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Mark Prefix");
                expect(lastLog.options.prefix).to.equal(prefix2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("sort table cols should work", function(done) {
            TblManager.sortColumns(tableId, "name", "reverse");
            TblFunc.focusTable(tableId2);
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Sort Table Columns");
                expect(lastLog.options.tableId).to.equal(tableId2);
                expect(lastLog.options.sortKey).to.equal("name");
                expect(lastLog.options.direction).to.equal("reverse");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("resize table cols should work", function(done) {
            TblManager.resizeColumns(tableId, "contents");
            TblFunc.focusTable(tableId2);
            $(".selectedCell").removeClass("selectedCell");

            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Resize Columns");
                expect(lastLog.options.tableId).to.equal(tableId2);
                expect(lastLog.options.sizeTo).to.equal("contents");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Worksheet operations", function() {

        it("add ws should work", function(done) {
            newWSId = WSManager.addWS();
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Create Worksheet");
                expect(lastLog.options.worksheetId).to.not.equal(newWSId);
                secondWSId = lastLog.options.worksheetId;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("move table to ws should work", function(done) {
            WSManager.moveTable(tableId, newWSId);
            var wsToFocus = WSManager.getWSFromTable(tableId2);
            var activeWS = WSManager.getActiveWS();
            if (wsToFocus !== activeWS) {
                $("#worksheetTab-" + wsToFocus).trigger(fakeEvent.mousedown);
            }
            TblFunc.focusTable(tableId2);

            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Move Table To Worksheet");
                expect(lastLog.options.newWorksheetId).to.equal(newWSId);
                expect(lastLog.options.tableId).to.equal(tableId2);
                return Log.undo();
            })
            .then(Log.undo)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("hide ws should work", function(done) {
            WSManager.hideWS(newWSId);
            var activeWS = WSManager.getActiveWS();
            if (secondWSId !== activeWS) {
                $("#worksheetTab-" + secondWSId).trigger(fakeEvent.mousedown);
            }
            Log.repeat()
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Hide Worksheet");
                expect(lastLog.options.worksheetId).to.equal(secondWSId);
                return Log.undo();
            })
            .then(Log.undo)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("delete table", function() {
        it("delete should work", function(done) {
            TblManager.deleteTables([tableId], TableType.Active, true)
            .then(function() {
                var deferred = jQuery.Deferred();

                var wsToFocus = WSManager.getWSFromTable(tableId2);
                var activeWS = WSManager.getActiveWS();
                if (wsToFocus !== activeWS) {
                    $("#worksheetTab-" + wsToFocus).trigger(fakeEvent.mousedown);
                }
                TblFunc.focusTable(tableId2);
                Log.repeat()
                .then(deferred.resolve)
                .fail(deferred.reject);

                UnitTest.hasAlertWithTitle(TblTStr.Del, {confirm: true});

                return deferred.promise();
            })
            .then(function() {
                var lastLog = Log.viewLastAction(true);
                expect(lastLog.title).to.equal("Drop Tables");
                expect(lastLog.options.tables[0]).to.equal(tableId2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    after(function(done) {
        WSManager.delWS(newWSId, DelWSType.Archive);
        WSManager.delWS(secondWSId, DelWSType.Archive);

        UnitTest.deleteAllTables()
        .then(function() {
            UnitTest.deleteDS(testDs);
        })
        .always(function() {
            done();
        });
    });
});