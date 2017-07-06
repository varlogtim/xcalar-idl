describe("Repeat Test", function() {
	var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;

	var testDs2;
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
    		XcalarIndexFromTable = function(tableName) {
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
    			return SQL.repeat();
    		})
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(indexCalled).to.be.true;
    			expect(lastSql.title).to.equal("Sort");
    			expect(lastSql.options.colNum).to.equal(4);
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
    		SQL.repeat()
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

    		SQL.repeat()
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
    			return SQL.repeat();
    		})
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(mapCalled).to.be.true;
    			expect(lastSql.title).to.equal("SplitCol");
    			expect(lastSql.options.colNum).to.equal(10);
    			expect(lastSql.options.delimiter).to.equal(".");
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
    		SQL.repeat()
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
    		var logsLen = SQL.getLogs().length;
    		SQL.repeat()
    		.then(function() {
    			expect(SQL.getLogs().length).to.equal(logsLen);
    			done();
    		})
    		.fail(function() {
    			done("failed");
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
    		SQL.repeat()
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
    			return SQL.repeat();
    		})
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(mapCalled).to.be.true;
    			expect(lastSql.title).to.equal("ChangeType");
    			expect(lastSql.options.colTypeInfos[0].colNum).to.equal(4);
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
    			return SQL.repeat();
    		})
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(lastSql.title).to.equal("Minimize Columns");
    			expect(lastSql.options.colNums[0]).to.equal(3);
    			expect(lastSql.options.colNums[1]).to.equal(4);
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
    			return SQL.repeat();
    		})
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(lastSql.title).to.equal("Maximize Columns");
    			expect(lastSql.options.colNums[0]).to.equal(3);
    			expect(lastSql.options.colNums[1]).to.equal(4);
    			done();
    		})
    		.fail(function() {
    			done("failed");
    		});
    	});

    	it("add new col should work", function(done) {
    		ColManager.addNewCol(1, tableId, 1)
    		TblManager.highlightColumn($table.find("th.col2"));
    		SQL.repeat()
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(lastSql.title).to.equal("Add New Column");
    			expect(lastSql.options.colNum).to.equal(2);
    			expect(lastSql.options.direction).to.equal(1);
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
	    		SQL.repeat();
	    	})
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(lastSql.title).to.equal("Delete Column");
    			expect(lastSql.options.colNums[0]).to.equal(2);

    			done();
    		})
    		.fail(function() {
    			done("failed");
    		});
    	});

    	it("text align should work", function(done) {
    		ColManager.textAlign([1], tableId, "rightAlign");

    		TblManager.highlightColumn($table.find("th.col2"));

	    	SQL.repeat()
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(lastSql.title).to.equal("Text Align");
    			expect(lastSql.options.alignment).to.equal("Right");

    			done();
    		})
    		.fail(function() {
    			done("failed");
    		});
    	});

    	it("change format should work", function(done) {
    		ColManager.format([1], tableId, ["percent"]);

    		TblManager.highlightColumn($table.find("th.col2"));

	    	SQL.repeat()
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(lastSql.title).to.equal("Change Format");
    			expect(lastSql.options.formats[0]).to.equal("percent");
    			done();
    		})
    		.fail(function() {
    			done("failed");
    		});
    	});

    	it("round to fixed should work", function(done) {
    		ColManager.roundToFixed([1], tableId, [4]);

    		TblManager.highlightColumn($table.find("th.col1"));

	    	SQL.repeat()
    		.then(function() {
    			var lastSql = SQL.viewLastAction(true);
    			expect(lastSql.title).to.equal("Round To Fixed");
    			expect(lastSql.options.colNums[0]).to.equal(1);
    			expect(lastSql.options.decimals[0]).to.equal(4);
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
			SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Hide Table");
				expect(lastSql.options.tableIds[0]).to.equal(tableId2);
				return SQL.undo();
			})
			.then(SQL.undo)
			.then(function() {
				done();
			})
			.fail(function() {
				done("fail");
			});
		});

		it("table operation without focuse table should not  work", function(done) {
    		var logsLen = SQL.getLogs().length;
    		$(".tblTitleSelected").removeClass("tblTitleSelected");
    		SQL.repeat()
    		.then(function(){
    			expect(SQL.getLogs().length).to.equal(logsLen);
    			done();
    		})
    		.fail(function() {
    			done("fail");
    		});
		});

		it("hide table should work", function(done) {
			TblManager.hideTable(tableId);
			TblFunc.focusTable(tableId2);
			SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Minimize Table");
				expect(lastSql.options.tableId).to.equal(tableId2);
				done();
			})
			.fail(function() {
				done("fail");
			});
		});

		it("hide table should work", function(done) {
			TblManager.unHideTable(tableId);
			TblFunc.focusTable(tableId2);
			SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Maximize Table");
				expect(lastSql.options.tableId).to.equal(tableId2);
				done();
			})
			.fail(function() {
				done("fail");
			});
		});

		it("mark prefix should work", function(done) {
			TPrefix.markColor(prefix, "green");
			TblManager.highlightColumn($table2.find("th.col1"));
			SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Mark Prefix");
				expect(lastSql.options.prefix).to.equal(prefix2);
				done();
			})
			.fail(function() {
				done("fail");
			});
		});

		it("sort table cols should work", function(done) {
			TblManager.sortColumns(tableId, "name", "reverse");
			TblFunc.focusTable(tableId2);
			SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Sort Table Columns");
				expect(lastSql.options.tableId).to.equal(tableId2);
				expect(lastSql.options.sortKey).to.equal("name");
				expect(lastSql.options.direction).to.equal("reverse");
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

			SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Resize Columns");
				expect(lastSql.options.tableId).to.equal(tableId2);
				expect(lastSql.options.sizeTo).to.equal("contents");
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
			SQL.repeat()
			.then(function(res) {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Create Worksheet");
				expect(lastSql.options.worksheetId).to.not.equal(newWSId);
				secondWSId = lastSql.options.worksheetId;
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

			SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Move Table To Worksheet");
				expect(lastSql.options.newWorksheetId).to.equal(newWSId);
				expect(lastSql.options.tableId).to.equal(tableId2);
				return SQL.undo();
			})
			.then(SQL.undo)
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
            SQL.repeat()
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Hide Worksheet");
				expect(lastSql.options.worksheetId).to.equal(secondWSId);
				return SQL.undo();
			})
			.then(SQL.undo)
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
				SQL.repeat()
				.then(deferred.resolve)
				.fail(deferred.reject);

				UnitTest.hasAlertWithTitle(TblTStr.Del, {confirm: true});

				return deferred.promise();
			})
			.then(function() {
				var lastSql = SQL.viewLastAction(true);
				expect(lastSql.title).to.equal("Drop Tables");
				expect(lastSql.options.tables[0]).to.equal(tableId2);
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