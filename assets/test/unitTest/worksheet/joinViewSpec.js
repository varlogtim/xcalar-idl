describe('JoinView', function() {
    var testDs;
    var tableName;
    var prefix;
    var $joinForm;
    var tableId;

    before(function(done) {
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            $joinForm = $('#joinView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });


            JoinView.show(tableId, 1);

            done();
        });
    });
    

    describe('check join initial state', function() {
        it('join type should be selected', function() {
            expect($("#joinType .text:visible")).to.have.lengthOf(1);
            expect($('#joinType .text').text()).to.equal("Inner Join");
            expect($("#joinType li").length).to.equal(4); // in left right full
        });

        it('left table name should be selected', function() {
            expect($('#joinLeftTableList .text').val()).to.equal(tableName);
            expect($joinForm.find('.tableListSection.left .iconWrap')
                .css('pointer-events')).to.not.equal("none");
        });

        it('right table name should not be selected', function() {
            expect($('#joinRightTableList .text').val()).to.equal(""); 
            expect($joinForm.find('.tableListSection.right .iconWrap')
                .css('pointer-events')).to.equal("none");
        });

        it('should only have one clause row', function() {
            expect($joinForm.find('.joinClause')).to.have.lengthOf(1);
            var colName = prefix + gPrefixSign + "yelping_since";
            expect($joinForm.find('.leftClause').val()).to.equal(colName);
            expect($joinForm.find('.leftClause').prop('disabled')).to.be.false;
            expect($joinForm.find('.rightClause').val()).to.equal("");
            expect($joinForm.find('.rightClause').prop('disabled')).to.be.true;
        });

        it('next button should not be clickable', function() {
            expect($joinForm.find('.next:visible').length).to.equal(1);
            expect($joinForm.find('.next').css('pointer-events')).to.equal("none");
        });
    });

    // to be continued
    describe('check menu and input actions', function() {
        it('add another clause should work', function() {
            var addClause = JoinView.__testOnly__.addClause;
            addClause();

            expect($joinForm.find('.joinClause')).to.have.lengthOf(2);
            expect($joinForm.find('.leftClause:eq(1)').val()).to.equal("");
            expect($joinForm.find('.leftClause:eq(1)').prop('disabled')).to.be.false;
            expect($joinForm.find('.rightClause:eq(1)').val()).to.equal("");
            expect($joinForm.find('.rightClause:eq(1)').prop('disabled')).to.be.true;
        });

        it('remove clause should work', function(done) {
            // should have 2 rows now
            expect($joinForm.find('.middleIcon').length).to.equal(2);
            expect($joinForm.find('.middleIcon:eq(0)').css('pointer-events')).to.equal("none");
            expect($joinForm.find('.middleIcon:eq(1)').css('pointer-events')).to.not.equal("none");

            // remove last row
            $joinForm.find('.middleIcon:eq(1)').click();

            // animation time
            setTimeout(function() {
                expect($joinForm.find('.middleIcon').length).to.equal(1);
                var colName = prefix + gPrefixSign + "yelping_since";
                expect($joinForm.find('.leftClause').val()).to.equal(colName);
                expect($joinForm.find('.leftClause').prop('disabled')).to.be.false;
                done();
            }, 300);
        });

        it('selecting right table should work', function() {
            expect($joinForm.find('.joinClause')).to.have.lengthOf(1);
            expect($joinForm.find('.rightClause').val()).to.equal("");
            expect($joinForm.find('.rightClause').prop('disabled')).to.be.true;

            $('#joinRightTableList').find('.text').val(tableName).change();

            expect($joinForm.find('.rightClause').val()).to.equal("");
            expect($joinForm.find('.rightClause').prop('disabled')).to.be.false;
            // // rightclause should be focused
            expect($(document.activeElement).is($joinForm.find('.rightClause'))).to.be.true;
        });

        it('next button should work', function() {
            expect($joinForm.find('.next:visible').length).to.equal(1);
            expect($joinForm.find('.next').css('pointer-events')).to.equal("none");

            var colName = prefix + gPrefixSign + "yelping_since";
            $joinForm.find('.rightClause').val(colName).change();
            expect($joinForm.find('.next').css('pointer-events')).to.not.equal("none");
            
            expect($joinForm.find('.firstStep:visible').length).to.equal(1);
            expect($joinForm.find('.secondStep:visible').length).to.equal(0);
            $joinForm.find('.next').click();
            expect($joinForm.find('.firstStep:visible').length).to.equal(0);
            expect($joinForm.find('.secondStep:visible').length).to.equal(1);

            $joinForm.find('.back').click();
        });

        it('checkMatchingColTypes should work', function() {
            var check = JoinView.__testOnly__.checkMatchingColTypes;
            var tableCols = gTables[tableId].tableCols;
            var cols = tableCols;
            var checkRes;


            checkRes = check([cols[0].backName], [cols[0].backName], [tableId, tableId]);
            expect(cols[0].getType()).to.equal('string');
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.true;

            checkRes = check([cols[1].backName], [cols[1].backName], [tableId, tableId]);
            expect(cols[1].getType()).to.equal('object');
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.true;

            checkRes = check([cols[4].backName], [cols[4].backName], [tableId, tableId]);
            expect(cols[4].getType()).to.equal('array');
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.true;


            checkRes = check([cols[7].backName], [cols[7].backName], [tableId, tableId]);
            expect(cols[7].getType()).to.equal('integer');
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.true;

            checkRes = check([cols[7].backName], [cols[0].backName], [tableId, tableId]);
            expect(cols[7].getType()).to.equal('integer');
            expect(cols[7].isImmediate()).to.be.false;
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.false;
            expect(checkRes.types[0]).to.equal('integer');
            expect(checkRes.types[1]).to.equal('string');
            expect(checkRes.row).to.equal(0);

            checkRes = check([cols[7].backName], [cols[9].backName], [tableId, tableId]);
            expect(cols[9].getType()).to.equal('float');
            expect(cols[9].isImmediate()).to.be.false;
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.true;

        });
    });

    describe('check constants', function() {

        // submission fail handler relies on this
        it('status_types should have out of (memory) property', function() {
            var oomMsgs = [];
            for (var i in StatusTStr) {
                if (StatusTStr[i].toLowerCase().indexOf("out of resource") > -1) {
                    oomMsgs.push(StatusTStr[i]);
                }
            }
            expect(oomMsgs.length).to.be.gt(1);
        }) ;
    });

    after(function(done) {
        JoinView.close();

        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
           done();
        });
    });
});