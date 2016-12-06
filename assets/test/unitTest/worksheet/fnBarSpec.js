describe('FnBar', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;
    var editor;
    var newTableName;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            $table = $('#xcTable-' + tableId);
            editor = FnBar.getEditor();
            done();
        });
    });

    describe('fn bar test', function() {
    	before(function() {
    		$table.find('th.col1 .dragArea').mousedown();
    	});

    	it('fnBar should read correctly', function() {
    		expect(true).to.be.true;
    		expect($("#functionArea").find(".CodeMirror-code").text()).to.equal('= pull(' + prefix + gPrefixSign + 'yelping_since)');
    	});
    });

    describe('filter test', function() {
    	it('successful filter should work', function(done) {
    		var cachedFunc = ColManager.execCol;
    		var passed = false;
    		ColManager.execCol = function(op, newFuncStr, tableId, colNum) {
    			passed = true;
    			return PromiseHelper.resolve();
    		}

    		editor.setValue('= filter(eq(' + prefix + gPrefixSign + 'yelping_since, 0))');

    		FnBar.__testOnly__.functionBarEnter()
    		.then(function() {
    			expect(passed).to.be.true;
    		})
    		.fail(function() {
    			expect('failed').to.equal('should succeed');
    		})
    		.always(function() {
    			ColManager.execCol = cachedFunc;
    			done();
    		});
    		
    	});

    	it('error filter should not work', function(done) {
    		var cachedFunc = ColManager.execCol;
    		var passed = false;
    		ColManager.execCol = function(op, newFuncStr, tId, colNum) {
    			passed = true;
    			expect(op).to.equal('filter');
    			expect(newFuncStr).to.equal('"yelping_since" = filter(eq(' + prefix + gPrefixSign + 'yelping_since, 0)))');
    			expect(tId).to.equal(tableId);
    			expect(colNum).to.equal(1);
    			return PromiseHelper.resolve();
    		}

    		editor.setValue('= filter(eq(' + prefix + gPrefixSign + 'wrongName, 0))');

    		FnBar.__testOnly__.functionBarEnter()
    		.then(function() {
    			expect('succeeded').to.equal('should fail');
    		})
    		.fail(function() {
    			var msg = xcHelper.replaceMsg(FnBarTStr.DiffColumn, {
                    colName: prefix + gPrefixSign + 'yelping_since'
                });
                UnitTest.hasAlertWithText(msg);
    			expect(passed).to.be.false;
    		})
    		.always(function() {
    			ColManager.execCol = cachedFunc;
    			done();
    		});
    		
    	});

    	it('submit filter should work', function(done) {
    		editor.setValue('= filter(eq(' + prefix + gPrefixSign + 'yelping_since, "2008-03"))');
    		expect($table.find('tbody tr').length).to.be.gt(10);

    		FnBar.__testOnly__.functionBarEnter()
    		.then(function(ret) {
    			newTableName = ret;
    			var newTableId = xcHelper.getTableId(ret);
            	var $newTable = $('#xcTable-' + newTableId);
    		
    			expect($newTable.find('tbody tr').length).to.equal(8);
    			expect($newTable.find('.row0 td.col1').text()).to.equal('2008-03');
    			expect($newTable.find('.row5 td.col1').text()).to.equal('2008-03');
    			done();
    		})
    		.fail(function() {
    			expect('failed').to.equal('should succeed');
    			done();
    		});
    	});
    });

    after(function(done) {
    	UnitTest.deleteTable(tableName, TableType.Orphan)
    	.always(function(){
    		UnitTest.deleteAll(newTableName, testDs)
	        .always(function() {
	            UnitTest.offMinMode();
	            done();
	        });
    	});
        
    });
});