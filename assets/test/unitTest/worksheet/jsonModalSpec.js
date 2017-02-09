describe('JsonModal Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var $jsonModal;
    var tableId;
    var $table;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            $jsonModal = $('#jsonModal');
            tableId = xcHelper.getTableId(tableName);
            $table = $('#xcTable-' + tableId);
            JSONModal.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                done();
            }, 500);
        });
    });

    describe('check data browser initial state', function() {
        it('top row should be correct', function() {
            expect($jsonModal.find('.compareIcon').length).to.equal(1);
            expect($jsonModal.find('.compareIcon .xi-ckbox-empty:visible').length).to.equal(1);
            expect($jsonModal.find('.compareIcon .xi-ckbox-selected').length).to.equal(1);
            expect($jsonModal.find('.compareIcon .xi-ckbox-selected:visible').length).to.equal(0);

            expect($jsonModal.find('.btn:visible').length).to.equal(5);
            expect($jsonModal.find('.remove').css('pointer-events')).to.equal('none');

            expect($jsonModal.find('.tableName').text()).to.equal('Table:' + tableName);
            expect($jsonModal.find('.rowNum').text()).to.equal('Row:' + 1);
        });

        it ('second row should be correct', function() {
            expect($jsonModal.find('.tab').length).to.equal(2);
            expect($jsonModal.find('.tab:visible').length).to.equal(2);
            expect($jsonModal.find('.tab').eq(1).text()).to.equal(prefix);
            expect($jsonModal.find('.tab.active').eq(0).length).to.equal(1);
            expect($jsonModal.find('.tab.active').eq(1).length).to.equal(0);
        });

        it('json text should be correct', function() {
            expect($jsonModal.find('.jObject').length).to.equal(1);
            expect($jsonModal.find('.jObject:visible').length).to.equal(1);
            var jsonObj = JSON.parse("{" + $jsonModal.find('.jObject').text().replace(/[\s\n]/g, "") + "}");
            expect(Object.keys(jsonObj).length).to.equal(12);
        });
    });

    describe('opening modal from td', function() {
        before(function(done) {
            JSONModal.__testOnly__.closeJSONModal();
            setTimeout(function() {
                done();
            }, 300);
        });

        it('object in mixed col should work', function(done) {
            var $td = $table.find('.row0 .col11');
            $td.find('.displayedData').html('{"a":"b"}');
            JSONModal.show($td, {type: "mixed"});
            // allow modal to fade in
            setTimeout(function() {
                expect($jsonModal.find('.jObject').length).to.equal(1);
                expect($jsonModal.find('.jObject:visible').length).to.equal(1);
                var text = $jsonModal.find('.prettyJson').text().replace(/[\s\n]/g, "");
                expect(text).to.equal('{"a":"b"}');

                JSONModal.__testOnly__.closeJSONModal();
                setTimeout(function() {
                    done();
                }, 300);
            }, 500);
        });

        it('array in mixed col should work', function(done) {
            var $td = $table.find('.row0 .col11');
            $td.find('.displayedData').html('["a","b"]');
            JSONModal.show($td, {type: "mixed"});
            // allow modal to fade in
            setTimeout(function() {
                expect($jsonModal.find('.jObject').length).to.equal(1);
                expect($jsonModal.find('.jObject:visible').length).to.equal(1);
                var text = $jsonModal.find('.prettyJson').text().replace(/[\s\n]/g, "");
                expect(text).to.equal('["a","b"]');

                JSONModal.__testOnly__.closeJSONModal();
                setTimeout(function() {
                    done();
                }, 300);
            }, 500);
        });

        after(function(done) {
            JSONModal.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                done();
            }, 500);
        });
    });

    describe('test sort btn', function() {
        it('sorting should work', function() {
            expect($jsonModal.find('.mainKey').length).to.equal(12);
        
            expect($jsonModal.find('.sort').length).to.equal(1);
            expect($jsonModal.find('.sort.desc').length).to.equal(0);
            $jsonModal.find('.sort').click();
            expect($jsonModal.find('.sort.desc').length).to.equal(1);
            expect($jsonModal.find('.mainKey:eq(0) .jKey').text()).to.equal('average_stars');
            expect($jsonModal.find('.mainKey:eq(11) .jKey').text()).to.equal('yelping_since');

            $jsonModal.find('.sort').click();
            expect($jsonModal.find('.sort.desc').length).to.equal(0);
            expect($jsonModal.find('.mainKey:eq(11) .jKey').text()).to.equal('average_stars');
            expect($jsonModal.find('.mainKey:eq(0) .jKey').text()).to.equal('yelping_since');

            $jsonModal.find('.sort').click();
            expect($jsonModal.find('.sort.desc').length).to.equal(1);
            expect($jsonModal.find('.mainKey:eq(0) .jKey').text()).to.equal('average_stars');
            expect($jsonModal.find('.mainKey:eq(11) .jKey').text()).to.equal('yelping_since');
        });
    });

    describe('pulling out a field', function() {
        it('pulling a field out should work', function(done) {
            ColManager.delCol([1], tableId, {noAnimate: true})
            .then(function() {
                var $averageStarsKey = $jsonModal.find('.jKey').filter(function() {
                    return ($(this).text() === "average_stars");
                });
                expect($averageStarsKey.length).to.equal(1);
                expect($averageStarsKey.siblings().text()).to.equal("3.54");
                $averageStarsKey.click();
                var $headerInput = $table.find('.editableHead').filter(function() {
                    return ($(this).val() === "average_stars");
                });
                expect($headerInput.length).to.equal(1);
                expect($headerInput.closest('th').hasClass('col12')).to.be.true;
                expect($table.find('.row0 .col12 .displayedData').text()).to.equal("3.54");

                JSONModal.show($table.find('.jsonElement').eq(0));
                // allow modal to fade in
                setTimeout(function() {
                    done();
                }, 500);
            });
        });

        it('pulling a nested field out should work', function() {
            var $complimentsNoteKey = $jsonModal.find('.jKey').filter(function() {
                return ($(this).text() === "note");
            });
            expect($complimentsNoteKey.length).to.equal(1);
            expect($complimentsNoteKey.siblings().text()).to.equal("1");
            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.note");
            });
            expect($headerInput.length).to.equal(0);

            // trigger pull col
            $complimentsNoteKey.click();

            $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.note");
            });
            expect($headerInput.length).to.equal(1);
            expect($headerInput.closest('th').hasClass('col13')).to.be.true;
            expect($table.find('.row0 .col13 .displayedData').text()).to.equal("1");
        });

        it('trying to pull out existing field should focus on field', function(done) {
            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "yelping_since");
            });
            expect($headerInput.length).to.equal(1);
            expect($headerInput.closest('th.selectedCell')).to.have.lengthOf(0);
            JSONModal.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                var $yelpingSinceKey = $jsonModal.find('.jKey').filter(function() {
                    return ($(this).text() === "yelping_since");
                });
                expect($yelpingSinceKey.length).to.equal(1);
                expect($yelpingSinceKey.siblings().text()).to.equal("2008-03");
                $yelpingSinceKey.click();
                expect($headerInput.closest('th.selectedCell')).to.have.lengthOf(1);

                done();
            }, 500);
        });
    });

    describe('opening json modal from non-data column', function() {
        // click on compliments column
        it('clicking on object column should work', function(done) {
            var colNum = gTables[tableId].getColNumByBackName(prefix + gPrefixSign + 'compliments');
            expect(colNum).to.be.gt(0);
            JSONModal.show($table.find('.row0 .col' + colNum), {type: "object"});
            UnitTest.timeoutPromise(500)
            .then(function() {
                expect($jsonModal.find('.bar:visible').length).to.equal(1);
                var jsonObj = JSON.parse("{" + $jsonModal.find('.jObject').text().replace(/[\s\n]/g, "") + "}");
                expect(Object.keys(jsonObj).length).to.equal(2);
                expect(jsonObj.note).to.equal(1);
                expect(jsonObj.cool).to.equal(1);
                done();
            });
        });

        // will pull out compliments.cool
        it('pull field should work', function() {
            var colNum = gTables[tableId].getColNumByBackName(prefix + gPrefixSign + 'compliments');
            expect(colNum).to.be.gt(0);
            var $complimentsCoolKey = $jsonModal.find('.jKey').filter(function() {
                return ($(this).text() === "cool");
            });
            expect($complimentsCoolKey.length).to.equal(1);
            expect($complimentsCoolKey.siblings().text()).to.equal("1");
            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.cool");
            });
            expect($headerInput.length).to.equal(0);

            // trigger pull col
            $complimentsCoolKey.click();

            $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.cool");
            });
            expect($headerInput.length).to.equal(1);
            expect($headerInput.closest('th').hasClass('col' + (colNum + 1))).to.be.true;
            expect($table.find('.row0 .col'+ (colNum + 1) + ' .displayedData').text()).to.equal("1");
        });
    });

    describe('examine option in json modal', function() {
        it('examine should work', function(done) {
            var $td = $table.find('td').filter(function() {
                return $(this).text() === '2008-03';
            }).eq(0);

            JSONModal.show($td, {type: "string"});
            UnitTest.timeoutPromise(500)
            .then(function() {
                expect($jsonModal.find('.jsonWrap .prettyJson').text()).to.equal('"2008-03"');
                JSONModal.__testOnly__.closeJSONModal();
                setTimeout(function() {
                    done();
                }, 300);
            });
        });
    });

    describe('multiple json panels', function() {
        var compare;
        var duplicate;
        // select 2 dataCol cells
        before(function(done) {
            compare = JSONModal.__testOnly__.compareIconSelect;
            duplicate = JSONModal.__testOnly__.duplicateView;
            JSONModal.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                JSONModal.show($table.find('.jsonElement').eq(1));
                setTimeout(function() {
                    done();
                }, 100);
            }, 500);
        });

        it('compare matches on 2 data browser panels', function() {
            // click on 1 compare icon
            compare($jsonModal.find('.compareIcon').eq(0));
            expect($jsonModal.find('.compareIcon').eq(0).hasClass('on')).to.be.true;
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('on')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('active')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('comparison')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.false;

            // click on 2nd compare icon
            compare($jsonModal.find('.compareIcon').eq(1));
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('on')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('comparison')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.true;

            // check matches
            expect($jsonModal.find('.matched').eq(0).children().length).to.equal(3);
            var matched1Text = $jsonModal.find('.matched').eq(0).text();
            var matched2Text = $jsonModal.find('.matched').eq(1).text();
            expect(matched1Text).to.equal(matched2Text);

            // check partial matches
            expect($jsonModal.find('.partial').eq(0).children().length).to.equal(8);
            expect($jsonModal.find('.partial').eq(1).children().length).to.equal(8);
            expect($jsonModal.find('.partial').eq(0).children().eq(0).data('key'))
            .to.equal($jsonModal.find('.partial').eq(1).children().eq(0).data('key'));
            var partialKeyText1 = $jsonModal.find('.partial').eq(0).children().children('.jKey').text();
            var partialKeyText2 = $jsonModal.find('.partial').eq(1).children().children('.jKey').text();
            expect(partialKeyText1.length).to.be.gt(40);
            expect(partialKeyText1).to.equal(partialKeyText2);

            // check non-matches
            expect($jsonModal.find('.unmatched').eq(0).children().length).to.equal(1);
            expect($jsonModal.find('.unmatched').eq(1).text()).to.equal("");
            var keyText1 = $jsonModal.find('.unmatched').eq(0).children().children('.jKey').text();
            var keyText2 = $jsonModal.find('.unmatched').eq(1).children().children('.jKey').text();
            expect(keyText1.length).to.be.gt(10);
            expect(keyText1).to.not.equal(keyText2);
        });

        it('compare matches on 3 data browser panels', function() {
            var modalWidth = $jsonModal.width();
            
            JSONModal.show($table.find('.jsonElement').eq(2));

            expect($jsonModal.width()).to.be.gt(modalWidth);
            compare($jsonModal.find('.compareIcon').eq(2));

            // check matches
            expect($jsonModal.find('.matched').eq(2).children().length).to.equal(3);
            var matched1Text = $jsonModal.find('.matched').eq(0).text();
            var matched2Text = $jsonModal.find('.matched').eq(1).text();
            var matched3Text = $jsonModal.find('.matched').eq(2).text();
            expect(matched1Text).to.equal(matched2Text);
            expect(matched2Text).to.equal(matched3Text);


            // check partial matches
            expect($jsonModal.find('.partial').eq(2).children().length).to.equal(8);
  
            expect($jsonModal.find('.partial').eq(1).children().eq(0).data('key'))
            .to.equal($jsonModal.find('.partial').eq(2).children().eq(0).data('key'));
            var partialKeyText1 = $jsonModal.find('.partial').eq(1).children().children('.jKey').text();
            var partialKeyText2 = $jsonModal.find('.partial').eq(2).children().children('.jKey').text();
            expect(partialKeyText2.length).to.be.gt(40);
            expect(partialKeyText1).to.equal(partialKeyText2);

            // check non-matches
            expect($jsonModal.find('.unmatched').eq(2).children().length).to.equal(1);
            var keyText1 = $jsonModal.find('.unmatched').eq(1).children().children('.jKey').text();
            var keyText2 = $jsonModal.find('.unmatched').eq(2).children().children('.jKey').text();
            expect(keyText2.length).to.be.gt(10);
            expect(keyText1).to.not.equal(keyText2);
        });

        it('uncheck compare should work', function() {
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('on')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('comparison')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(2).hasClass('comparison')).to.be.true;

            // click to remove middle comparison
            compare($jsonModal.find('.compareIcon').eq(1));
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('on')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.false;
            expect($jsonModal.find('.comparison').length).to.equal(2);
            expect($jsonModal.find('.matched').length).to.equal(2);

            expect($jsonModal.find('.matched').eq(0).children().length).to.equal(3);
            var matched1Text = $jsonModal.find('.matched').eq(0).text();
            var matched2Text = $jsonModal.find('.matched').eq(1).text();
            expect(matched1Text).to.equal(matched2Text);

            // check partial matches
            expect($jsonModal.find('.partial').eq(0).children().length).to.equal(9);
            expect($jsonModal.find('.partial').eq(1).children().length).to.equal(9);
            expect($jsonModal.find('.partial').eq(0).children().eq(0).data('key'))
            .to.equal($jsonModal.find('.partial').eq(1).children().eq(0).data('key'));
            var partialKeyText1 = $jsonModal.find('.partial').eq(0).children().children('.jKey').text();
            var partialKeyText2 = $jsonModal.find('.partial').eq(1).children().children('.jKey').text();
            expect(partialKeyText1.length).to.be.gt(40);
            expect(partialKeyText1).to.equal(partialKeyText2);

            // check non-matches
            expect($jsonModal.find('.unmatched').eq(0).children().length).to.equal(0);
            expect($jsonModal.find('.unmatched').eq(1).children().length).to.equal(0);
        });

        it('remove panel should work', function() {
            expect($jsonModal.find('.jsonWrap').length).to.equal(3);
            expect($jsonModal.find('.matched').length).to.equal(2);
            expect($jsonModal.find('.comparison').length).to.equal(2);
            var modalWidth = $jsonModal.width();

            // click on remove last panel
            $jsonModal.find('.remove').eq(2).click();
            expect($jsonModal.width()).to.be.lt(modalWidth);
            expect($jsonModal.find('.jsonWrap').length).to.equal(2);
            expect($jsonModal.find('.comparison').length).to.equal(0);
            expect($jsonModal.find('.matches').length).to.equal(0);
            expect($jsonModal.find('.jsonWrap').eq(0).find('.rowNum').text()).to.equal('Row:1');
            expect($jsonModal.find('.jsonWrap').eq(1).find('.rowNum').text()).to.equal('Row:2');

            // remove 2nd panel
            $jsonModal.find('.remove').eq(1).click();
            expect($jsonModal.find('.jsonWrap').length).to.equal(1);
            expect($jsonModal.find('.jsonWrap').eq(0).find('.rowNum').text()).to.equal('Row:1');
        });

        it('duplicate view should work', function() {
            expect($jsonModal.find('.jsonWrap').length).to.equal(1);

            duplicate($jsonModal.find('.jsonWrap').eq(0));

            expect($jsonModal.find('.jsonWrap').length).to.equal(2);

            var $origWrap = $jsonModal.find('.jsonWrap').eq(0);
            var $dupWrap = $jsonModal.find('.jsonWrap').eq(1);

            expect($dupWrap.data('tableid')).to.equal(tableId);
            expect($dupWrap.data('rownum')).to.equal(0);
            expect($dupWrap.find('.rowNum').text()).to.equal('Row:1');

            expect($origWrap.text()).to.equal($dupWrap.text());

            $jsonModal.find('.remove').eq(1).click();
            expect($jsonModal.find('.jsonWrap').length).to.equal(1);
        });
    });

    // xx need to add actual projection testing
    describe('project mode', function() {
        it('toggle project mode should work', function() {
            expect($jsonModal.find('.jsonWrap').length).to.equal(1);
            var $jsonWrap = $jsonModal.find('.jsonWrap');
            expect($jsonWrap.hasClass('projectMode')).to.be.false;
            expect($jsonWrap.find('.submitProject').is(":visible")).to.be.false;
            expect($jsonWrap.find('.jsonModalMenu .projectOpt .check').is(":visible")).to.be.false;

            // project mode
            $jsonWrap.find('.jsonModalMenu .projectionOpt').trigger(fakeEvent.mouseup);
        
            expect($jsonWrap.hasClass('projectMode')).to.be.true;
            expect($jsonWrap.find('.submitProject').is(":visible")).to.be.true;
            expect($jsonWrap.find('.projectModeBar .numColsSelected').text()).to.equal("12/12 fields selected to project");

             // deselect prefixed fields
            $jsonWrap.find('.prefixGroupTitle .checkbox').click();
            expect($jsonWrap.find('.projectModeBar .numColsSelected').text()).to.equal("0/12 fields selected to project");

            // select prefixed fields
            $jsonWrap.find('.prefixGroupTitle .checkbox').click();
            expect($jsonWrap.find('.projectModeBar .numColsSelected').text()).to.equal("12/12 fields selected to project");

            // select mode
            $jsonWrap.find('.jsonModalMenu .selectionOpt').trigger(fakeEvent.mouseup);

            expect($jsonWrap.hasClass('projectMode')).to.be.false;
            expect($jsonWrap.find('.submitProject').is(":visible")).to.be.false;
            expect($jsonWrap.find('.projectModeBar .numColsSelected').text()).to.equal("0/12 fields selected to project");
            expect($jsonWrap.find('.projectModeBar .numColsSelected').is(":visible")).to.be.false;
        });
    });

    describe('multiSelectMode', function() {
        var $jsonWrap;
        before(function() {
            $jsonWrap = $jsonModal.find('.jsonWrap');
        });
        it('toggle multiSelectMode should work', function() {
            expect($jsonWrap.hasClass('multiSelectMode')).to.be.false;
            expect($jsonWrap.find('.submitProject').is(":visible")).to.be.false;
            expect($jsonWrap.find('.jsonModalMenu .multiSelectionOpt .check').is(":visible")).to.be.false;

             // multiSelect mode
            $jsonWrap.find('.jsonModalMenu .multiSelectionOpt').trigger(fakeEvent.mouseup);

            expect($jsonWrap.hasClass('multiSelectMode')).to.be.true;
            expect($jsonWrap.find('.submitProject').is(":visible")).to.be.true;
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("0/12 fields selected to pull");

        });

        it('selecting a field should work', function() {
            $jsonWrap.find('.jKey').eq(0).click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("1/12 fields selected to pull");
        });

        it('select and deselect all should work', function() {
            $jsonWrap.find('.selectAll').click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("12/12 fields selected to pull");

            $jsonWrap.find('.jKey').eq(0).click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("11/12 fields selected to pull");

            $jsonWrap.find('.clearAll').click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("0/12 fields selected to pull");
        });

        it('back to select mode', function() {
            $jsonWrap.find('.jKey').eq(0).click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("1/12 fields selected to pull");

            $jsonWrap.find('.jsonModalMenu .selectionOpt').trigger(fakeEvent.mouseup);

            expect($jsonWrap.hasClass('multiSelectMode')).to.be.false;
            expect($jsonWrap.find('.submitProject').is(":visible")).to.be.false;
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("0/12 fields selected to pull");
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').is(":visible")).to.be.false;
        });
    });

    describe('saveLastMode() function test', function() {
        it('save last mode should work', function() {
            fn = JSONModal.__testOnly__.saveLastMode;
            var $wrap = $jsonModal.find(".jsonWrap");
            expect($wrap.length).to.equal(1);
            var $secondWrap = $wrap.clone();
            $wrap.after($secondWrap);

            $wrap.addClass("projectMode"); // 1 project, 1 single
            expect(fn()).to.equal("single");

            $secondWrap.addClass("projectMode"); // 2 projects
            expect(fn()).to.equal("project");

            $secondWrap.removeClass("projectMode").addClass("multiSelectMode"); // 1 project, 1 multi
            expect(fn()).to.equal("project");

            $wrap.removeClass("projectMode").addClass("multiSelectMode"); // 2 multi
            expect(fn()).to.equal("multiple");

            $wrap.removeClass("multiSelectMode"); // 1 single, 1 multi
            expect(fn()).to.equal("single");

            $secondWrap.remove();
        });
    });

    // xx need to test with immediates
    describe('tabs should work', function() {
        var selectTab;
        before(function() {
            selectTab = JSONModal.__testOnly__.selectTab;
        });

        it('tabbing should work', function() {
            expect($jsonModal.find('.tab').length).to.equal(2);
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.true;
            expect($jsonModal.find('.tab').eq(1).hasClass('active')).to.be.false;
            expect($jsonModal.find('.prefixGroupTitle').is(":visible")).to.be.true;
            expect($jsonModal.find('.prefix').is(":visible")).to.be.true;

            selectTab($jsonModal.find('.tab').eq(1));
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.false;
            expect($jsonModal.find('.tab').eq(1).hasClass('active')).to.be.true;
            expect($jsonModal.find('.prefixGroupTitle').is(":visible")).to.be.false;
            expect($jsonModal.find('.prefix').is(":visible")).to.be.false;
            expect($jsonModal.find('.mainKey').length).to.equal(12);
            expect($jsonModal.find('.mainKey:visible').length).to.equal(12);

            selectTab($jsonModal.find('.tab').eq(0));
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.true;
            expect($jsonModal.find('.tab').eq(1).hasClass('active')).to.be.false;
            expect($jsonModal.find('.prefixGroupTitle').is(":visible")).to.be.true;
            expect($jsonModal.find('.prefix').is(":visible")).to.be.true;
            expect($jsonModal.find('.mainKey').length).to.equal(12);
            expect($jsonModal.find('.mainKey:visible').length).to.equal(12);
        });
    });

    describe('function rehighlightTds', function() {
        it('rehighlightTds should work', function() {
            var numRows = $table.find('tbody tr').length;
            expect(numRows).to.be.gt(30);
            expect($table.find('.jsonElement').length).to.equal(numRows);
            expect($table.find('.modalHighlighted').length).to.equal(numRows);
            $table.find('.jsonElement:gt(20)').removeClass('modalHighlighted');
            expect($table.find('.modalHighlighted').length).to.equal(21);

            JSONModal.rehighlightTds($table);
            expect($table.find('.modalHighlighted').length).to.be.gt(30);
        });
    });

    describe('pull all button', function() {
        before(function(done) {
            var numCols = gTables[tableId].tableCols.length;
            var colNums = [];
            for (var i = 0; i < numCols - 1; i++) {
                colNums.push(i + 1); // colnums 1 indexed
            }
            ColManager.delCol(colNums, tableId, {noAnimate: true})
            .then(function() {
                done();
            });
        });

        it('pull all should work', function(done) {
            expect($table.find('th').length).to.equal(2);
            // the "1" comes from the row number td
            expect($table.find('tbody tr:eq(0) td:not(".jsonElement")').text()).to.equal("1");
            $jsonModal.find(".pullAll").eq(0).click();
            setTimeout(function() {
                expect(1).to.equal(1);
                expect($table.find('th').length).to.be.gt(5).and.lt(30);
                var rowText = $table.find('tbody tr:eq(0) td:not(".jsonElement")').text();
                expect(rowText.indexOf("72lSH7LyIdaPzqZgA0v7Qg")).to.not.equal(-1);
                expect(rowText.indexOf('"useful":20')).to.not.equal(-1);
                done();
            }, 1);
        });

        it('pull all should not pull if all cols pulled already', function(done) {
            JSONModal.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                var numCols = gTables[tableId].tableCols.length;
                expect($table.find('th').length).to.equal(numCols + 1);
                var rowText = $table.find('tbody tr:eq(0) td:not(".jsonElement")').text();
                $jsonModal.find(".pullAll").eq(0).click();
                setTimeout(function() {
                    expect($table.find('th').length).to.equal(numCols + 1);
                    var newRowText = $table.find('tbody tr:eq(0) td:not(".jsonElement")').text();
                    expect(newRowText).to.equal(rowText);
                    done();
                }, 1);
            }, 500);
        });
    });

    after(function(done) {
        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            UnitTest.offMinMode();
            done();
        });
    });
});