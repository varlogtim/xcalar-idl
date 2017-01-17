describe('JoinView', function() {
    var testDs;
    var tableName;
    var prefix;
    var $joinForm;
    var tableId;
    var $table;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            $joinForm = $('#joinView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    $table = $(this);
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
            var colName = prefix + gPrefixSign + "average_stars";
            expect($joinForm.find('.leftClause').val()).to.equal(colName);
            expect($joinForm.find('.leftClause').prop('disabled')).to.be.false;
            expect($joinForm.find('.rightClause').val()).to.equal("");
            expect($joinForm.find('.rightClause').prop('disabled')).to.be.true;
        });

        it('next button should not be clickable', function() {
            expect($joinForm.find('.next:visible').length).to.equal(1);
            expect($joinForm.find('.next').css('pointer-events')).to.equal("none");
        });

        it('exit option on column menu should be available', function() {
            expect($('.xcTableWrap.columnPicker').length).to.be.gte(1);
            expect($table.find('.header').eq(1).find('.dropdownBox').is(":visible")).to.be.true;
            $table.find('.header').eq(1).find('.dropdownBox').click();
            expect($("#colMenu").find('.exitJoin').is(":visible")).to.be.true;
            $('.menu').hide();
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

        it('remove clause should work', function() {
            // should have 2 rows now
            expect($joinForm.find('.middleIcon').length).to.equal(2);
            expect($joinForm.find('.middleIcon:eq(0)').css('pointer-events')).to.equal("none");
            expect($joinForm.find('.middleIcon:eq(1)').css('pointer-events')).to.not.equal("none");

            // remove last row
            $joinForm.find('.middleIcon:eq(1)').click();

            expect($joinForm.find('.middleIcon').length).to.equal(1);
            var colName = prefix + gPrefixSign + "average_stars";
            expect($joinForm.find('.leftClause').val()).to.equal(colName);
            expect($joinForm.find('.leftClause').prop('disabled')).to.be.false;
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

        it('next and back button should work', function() {
            expect($joinForm.find('.next:visible').length).to.equal(1);
            expect($joinForm.find('.next').css('pointer-events')).to.equal("none");

            var colName = prefix + gPrefixSign + "average_stars";
            $joinForm.find('.rightClause').val(colName).change();
            expect($joinForm.find('.next').css('pointer-events')).to.not.equal("none");
            
            expect($joinForm.find('.firstStep:visible').length).to.equal(1);
            expect($joinForm.find('.secondStep:visible').length).to.equal(0);
            $joinForm.find('.next').click();
            expect($joinForm.find('.firstStep:visible').length).to.equal(0);
            expect($joinForm.find('.secondStep:visible').length).to.equal(1);

            $joinForm.find('.back').click();
            expect($joinForm.find('.firstStep:visible').length).to.equal(1);
            expect($joinForm.find('.secondStep:visible').length).to.equal(0);
        });

        it('enter key on step1 should activate step2', function() {
            expect($joinForm.find('.firstStep:visible').length).to.equal(1);
            expect($joinForm.find('.secondStep:visible').length).to.equal(0);
            $('body').trigger(fakeEvent.enter);
            expect($joinForm.find('.firstStep:visible').length).to.equal(0);
            expect($joinForm.find('.secondStep:visible').length).to.equal(1);


            $joinForm.find('.back').click();
            expect($joinForm.find('.firstStep:visible').length).to.equal(1);
            expect($joinForm.find('.secondStep:visible').length).to.equal(0);
        });

        it('checkMatchingColTypes should work', function() {
            var check = JoinView.__testOnly__.checkMatchingColTypes;
            var tableCols = gTables[tableId].tableCols;
            var cols = tableCols;
            var checkRes;
            // cols
            // col 11 - yelping_since (string)
            // col 10 - votes (object)
            // col 4 - friends (array)
            // col 7 - review_count (integer)
            // col 0 - average_stars (float)


            checkRes = check([cols[11].backName], [cols[11].backName], [tableId, tableId]);
            expect(cols[11].getType()).to.equal('string');
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.true;

            checkRes = check([cols[10].backName], [cols[10].backName], [tableId, tableId]);
            expect(cols[10].getType()).to.equal('object');
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

            checkRes = check([cols[7].backName], [cols[11].backName], [tableId, tableId]);
            expect(cols[7].getType()).to.equal('integer');
            expect(cols[7].isImmediate()).to.be.false;
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.false;
            expect(checkRes.types[0]).to.equal('integer');
            expect(checkRes.types[1]).to.equal('string');
            expect(checkRes.row).to.equal(0);

            checkRes = check([cols[7].backName], [cols[0].backName], [tableId, tableId]);
            expect(cols[0].getType()).to.equal('float');
            expect(cols[0].isImmediate()).to.be.false;
            expect(checkRes).to.be.an('object');
            expect(checkRes.success).to.be.true;

        });

        it('join type menu should work', function() {
            expect($("#joinType").find('.list').length).to.equal(1);
            expect($("#joinType").find('.list:visible').length).to.equal(0);

            $('#joinType').find('.text').trigger(fakeEvent.click);

            expect($("#joinType").find('.list:visible').length).to.equal(1);
            expect($("#joinType").find('li:visible').length).to.equal(4);
            expect($("#joinType").find('.text').text()).to.equal('Inner Join');

            $('#joinType').find('li').last().trigger(fakeEvent.mouseup);

            expect($("#joinType").find('.text').text()).to.equal('Full Outer Join');
            expect($("#joinType").find('.list:visible').length).to.equal(0);

            $('#joinType').find('li').first().trigger(fakeEvent.mouseup);
            expect($("#joinType").find('.text').text()).to.equal('Inner Join');
        });
    });

    describe('clause column pickers', function() {
        it('clause column pickers should work', function() {
            var colName1 = prefix + gPrefixSign + "average_stars";
            var colName2 = prefix + gPrefixSign + "compliments";
            var colName3 = prefix + gPrefixSign + "four";
            $joinForm.find('.leftClause').val("").change();
            $joinForm.find('.rightClause').val("").change();
            expect($joinForm.find('.leftClause').val()).to.equal("");
            expect($joinForm.find('.rightClause').val()).to.equal("");

            // type number should work
            $joinForm.find('.leftClause').focus().trigger('focus');
            $table.find('.header').eq(1).click();
            expect($joinForm.find('.leftClause').val()).to.equal(colName1);

            // type object should not work
            $joinForm.find('.rightClause').focus().trigger('focus');
            $table.find('.header').eq(2).click();
            expect($joinForm.find('.rightClause').val()).to.equal("");

            // type boolean should work
            $joinForm.find('.rightClause').focus().trigger('focus');
            $table.find('.header').eq(4).click();
            expect($joinForm.find('.rightClause').val()).to.equal(colName3);

            // add another row of clauses
            JoinView.__testOnly__.addClause();
            expect($joinForm.find('.leftClause').eq(1).val()).to.equal("");
            expect($joinForm.find('.rightClause').eq(1).val()).to.equal("");

            $joinForm.find('.leftClause').eq(1).focus().trigger('focus');
            $table.find('.header').eq(1).click();
            expect($joinForm.find('.leftClause').eq(1).val()).to.equal(colName1);

            $joinForm.find('.rightClause').eq(1).focus().trigger('focus');
            $table.find('.header').eq(4).click();
            expect($joinForm.find('.rightClause').eq(1).val()).to.equal(colName3);

            // remove last clause row
            $joinForm.find('.middleIcon:eq(1)').click();
        });

        it('table title picker should work', function() {
            $("#joinLeftTableList input").val("").focus().trigger('focus');
            expect($("#joinLeftTableList input").val()).to.equal("");
            $table.find('.xcTheadWrap').click();
            expect($("#joinLeftTableList input").val()).to.equal(tableName);
        });
    });

    describe('column selector', function() {
        it('column selector should work', function() {
            // set up step 2 view
            var colName = prefix + gPrefixSign + "yelping_since";
            $joinForm.find('.leftClause').val(colName).change();
            $joinForm.find('.rightClause').val(colName).change();
            
            $joinForm.find('.next').click();
            expect($joinForm.find('.firstStep:visible').length).to.equal(0);
            expect($joinForm.find('.secondStep:visible').length).to.equal(1);

            // start test for left table

            var numCols = $joinForm.find('.leftCols li').length;
            expect(numCols).to.be.gt(4);
            expect($joinForm.find('.leftCols li.checked').length).to.equal(numCols);

            $joinForm.find('.leftCols li').eq(0).click();
            expect($joinForm.find('.leftCols li.checked').length).to.equal(numCols - 1);

            $joinForm.find('.leftCols li').eq(0).click();
            expect($joinForm.find('.leftCols li.checked').length).to.equal(numCols);

            // deselect and select all
            $joinForm.find('.leftColHeading .checkbox').click();
            expect($joinForm.find('.leftCols li.checked').length).to.equal(0);
            expect($joinForm.find('.leftColHeading .checkbox').hasClass('checked')).to.be.false;
            $joinForm.find('.leftColHeading .checkbox').click();
            expect($joinForm.find('.leftCols li.checked').length).to.equal(numCols);
            expect($joinForm.find('.leftColHeading .checkbox').hasClass('checked')).to.be.true;

            // start test for right table

            var numCols = $joinForm.find('.rightCols li').length;
            expect(numCols).to.be.gt(4);
            expect($joinForm.find('.rightCols li.checked').length).to.equal(numCols);

            $joinForm.find('.rightCols li').eq(0).click();
            expect($joinForm.find('.rightCols li.checked').length).to.equal(numCols - 1);

            $joinForm.find('.rightCols li').eq(0).click();
            expect($joinForm.find('.rightCols li.checked').length).to.equal(numCols);

            // deselect and select all
            $joinForm.find('.rightColHeading .checkbox').click();
            expect($joinForm.find('.rightCols li.checked').length).to.equal(0);
             expect($joinForm.find('.rightColHeading .checkbox').hasClass('checked')).to.be.false;
            $joinForm.find('.rightColHeading .checkbox').click();
            expect($joinForm.find('.rightCols li.checked').length).to.equal(numCols);
            expect($joinForm.find('.rightColHeading .checkbox').hasClass('checked')).to.be.true;

            // go back to step 1
            $joinForm.find('.back').click();
            expect($joinForm.find('.firstStep:visible').length).to.equal(1);
            expect($joinForm.find('.secondStep:visible').length).to.equal(0);
        });
    });

    // xx should test individual smart suggest functions, this is just a basic test
    describe('smart suggest', function() {
        it ('smart suggest on self join col should work', function() {
            var colName = prefix + gPrefixSign + "yelping_since";
            $joinForm.find('.leftClause').val(colName).change();
            $joinForm.find('.rightClause').val("").change();
            expect($joinForm.find('.rightClause').val()).to.equal("");

            $joinForm.find('.smartSuggest').click();

            expect($joinForm.find('.rightClause').val()).to.equal(colName);


            $joinForm.find('.leftClause').val("").change();
            $joinForm.find('.rightClause').val(colName).change();
            $joinForm.find('.smartSuggest').click();
            expect($joinForm.find('.leftClause').val()).to.equal(colName);
        });

        it('smart suggest error should show if both inputs filled', function() {
            var cachededTooltipFunc = xcTooltip.transient;
            xcTooltip.transient = function($el, options, time) {
                expect($el.is($joinForm.find('.smartSuggest').siblings('.suggError'))).to.be.true;
                expect(options.title).to.equal(JoinTStr.NoColToCheck);
            };

            var colName = prefix + gPrefixSign + "yelping_since";
            expect($joinForm.find('.leftClause').val()).to.equal(colName);
            expect($joinForm.find('.rightClause').val()).to.equal(colName);

            $joinForm.find('.smartSuggest').click();
            // xcTooltip.transient should be called
            xcTooltip.transient = cachededTooltipFunc;
        });
    });

    describe('function checkFirstView', function() {
        it('checkFirstView should work', function() {
            var check = JoinView.__testOnly__.checkFirstView;

            var firstColName = prefix + gPrefixSign + "yelping_since"; // string
            var secondColName = prefix + gPrefixSign + "votes"; // obj
            var thirdColName = prefix + gPrefixSign + "average_stars"; // num
            var fourthColName = prefix + gPrefixSign + "user_id"; // string

            $joinForm.find('.leftClause').val("").change();
            $joinForm.find('.rightClause').val("").change();
            expect(check()).to.be.false;

            $joinForm.find('.leftClause').val(firstColName).change();
            $joinForm.find('.rightClause').val(secondColName).change();
            expect(check()).to.be.false;

            $joinForm.find('.leftClause').val(secondColName).change();
            $joinForm.find('.rightClause').val(thirdColName).change();
            expect(check()).to.be.false;

            $joinForm.find('.leftClause').val(secondColName).change();
            $joinForm.find('.rightClause').val(secondColName).change();
            expect(check()).to.be.false;

            $joinForm.find('.leftClause').val(firstColName).change();
            $joinForm.find('.rightClause').val("").change();
            expect(check()).to.be.false;

            $joinForm.find('.leftClause').val("test").change();
            $joinForm.find('.rightClause').val("test").change();
            expect(check()).to.be.false;

            $joinForm.find('.leftClause').val(firstColName).change();
            $joinForm.find('.rightClause').val(fourthColName).change();
            expect(check()).to.be.true;

            $joinForm.find('.leftClause').val(thirdColName).change();
            $joinForm.find('.rightClause').val(thirdColName).change();
            expect(check()).to.be.true;

            $joinForm.find('.leftClause').val(firstColName).change();
            $joinForm.find('.rightClause').val(firstColName).change();
            expect(check()).to.be.true;
        });
    });

    describe('function validTableNameChecker', function() {
        it('validTableNameChecker should work', function() {
            var check = JoinView.__testOnly__.validTableNameChecker;
            $("#joinLeftTableList input").val("test");
            $("#joinRightTableList input").val("test");
            expect(check()).to.equal(false);

            $("#joinLeftTableList input").val("test");
            $("#joinRightTableList input").val(tableName);
            expect(check()).to.equal(false);

            $("#joinLeftTableList input").val(tableName);
            $("#joinRightTableList input").val("test");
            expect(check()).to.equal(false);

            $("#joinLeftTableList input").val(tableName);
            $("#joinRightTableList input").val(tableName);
            expect(check()).to.equal(true);
        });
    });

    describe('join estimator', function() {
        it('join estimator should work', function(done) {
            $joinForm.find('.next').click();
            expect($joinForm.find('.firstStep:visible').length).to.equal(0);
            expect($joinForm.find('.secondStep:visible').length).to.equal(1);

            expect($joinForm.find('.estimatorWrap .checkbox').hasClass('checked')).to.be.false;
            expect($joinForm.find('.stats').is(":visible")).to.be.false;

            JoinView.__testOnly__.estimateJoinSize()
            .then(function() {
                expect($joinForm.find('.stats').is(":visible")).to.be.true;
                var expectedText = "Min:14,878Med:14,878Max:14,878";
                expect($joinForm.find('.stats').text().replace(/ /g, "").replace(/\n/g, "")).to.equal(expectedText);
            })
            .fail(function() {
                expect('failed').to.equal('succeeded');
            })
            .always(function() {
                done();
            });

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
        });
    });

    // xx to add some other tests, including failed joins
    describe('submit test', function() {
        it('valid submit should work', function(done) {
            var submit = JoinView.__testOnly__.submitJoin;

            var newTableName = "joinUnitTest" + Date.now();
            $("#joinTableNameInput").val(newTableName);
            expect($joinForm.find('.renameSection').is(":visible")).to.be.false;
            
            // should fail because needs rename;
            submit()
            .then(function() {
                expect('succeeded').to.equal('should fail');
                done();
            })
            .fail(function() {
                expect($joinForm.find('.renameSection').is(":visible")).to.be.true;

                $joinForm.find('.newName').eq(0).val("testYelp1");
                $joinForm.find('.newName').eq(1).val("testYelp2");

                submit()
                .then(function(newTableName) {
                    console.log(newTableName);
                    var tableId = xcHelper.getTableId(newTableName);
                    expect(tableId).to.not.be.null;
                    expect(gTables[tableId].resultSetCount).to.equal(14878);
                    SQL.undo()
                    .always(function() {
                        done();
                    });
                })
                .fail(function() {
                    expect('failed').to.equal('succeeded');
                    done();
                });

            });
           
        });
    });

    after(function(done) {
        JoinView.close();

        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            UnitTest.offMinMode();
            done();
        });
    });
});
