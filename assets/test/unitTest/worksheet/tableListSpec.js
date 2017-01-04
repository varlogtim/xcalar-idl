describe('TableList Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);

            // put it in the orphaned list
            TblManager.sendTableToOrphaned(tableId, {remove: true})
            .then(function() {
                TableList.refreshOrphanList()
                .then(function() {
                    done();
                })
            });
        });
    });

    describe('initial state', function() {
        it('orphan table list should be populated', function() {
            expect($("#orphanedTablesList").find('.tableName').filter(function() {
                return $(this).text() === tableName;
            }).length).to.equal(1);
        });
    });

    describe('TableList.updatePendingState', function() {
        it('updatePendingState() should work', function() {
            // initial state
            var $listWrap = $("#activeTableListSection");
            expect($listWrap.hasClass('pending')).to.be.false;

            // increment
            TableList.updatePendingState(true);
            expect($listWrap.hasClass('pending')).to.be.true;

            //increment again
            TableList.updatePendingState(true);
            expect($listWrap.hasClass('pending')).to.be.true;

            // decrement
            TableList.updatePendingState(false);
            expect($listWrap.hasClass('pending')).to.be.true;

            //decrement again
            TableList.updatePendingState(false);
            expect($listWrap.hasClass('pending')).to.be.false;
        }); 
    });

    describe('table search', function() {
        it('selected tables should clear when searching', function() {
            var $listWrap = $("#orphanedTableListSection");
            var $li = $("#orphanedTablesList").find('.tableName').filter(function() {
                return $(this).text() === tableName;
            });
            var $input = $listWrap.find('.searchbarArea input');
            expect($input.length).to.equal(1);

            expect($listWrap.find('.addTableBtn.selected').length).to.equal(0);
            $li.siblings('.addTableBtn').click();
            expect($listWrap.find('.addTableBtn.selected').length).to.equal(1);
            
            $input.val('e').trigger(fakeEvent.input);
            expect($listWrap.find('.addTableBtn.selected').length).to.equal(0);
            $input.val("");
        });
    });


    after(function(done) {
        UnitTest.deleteAll(tableName, testDs, TableType.Orphan)
        .always(function() {
            UnitTest.offMinMode();
            done();
        });
    });
});