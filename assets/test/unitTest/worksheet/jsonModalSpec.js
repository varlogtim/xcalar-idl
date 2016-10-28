describe('JsonModal', function() {
    var testDs;
    var tableName;
    var prefix;
    var $jsonModal;
    var tableId;
    var $table;

    before(function(done) {
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            $jsonModal = $('#jsonModal');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });
            $table = $('#xcTable-' + tableId)
            JSONModal.show($table.find('.jsonElement').eq(0))
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
                var $yelpingSinceKey = $jsonModal.find('.jKey').filter(function() {
                    return ($(this).text() === "yelping_since");
                });
                expect($yelpingSinceKey.length).to.equal(1);
                expect($yelpingSinceKey.siblings().text()).to.equal("2008-03");
                $yelpingSinceKey.click();
                var $headerInput = $table.find('.editableHead').filter(function() {
                    return ($(this).val() === "yelping_since")
                });
                expect($headerInput.length).to.equal(1);
                expect($headerInput.closest('th').hasClass('col12')).to.be.true;
                expect($table.find('.row0 .col12 .displayedData').text()).to.equal("2008-03");

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

            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.note")
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
            JSONModal.show($table.find('.row0 .col' + colNum), false, {type: "object"});
            setTimeout(function() {
                expect($jsonModal.find('.bar').length).to.equal(0);
                var jsonObj = JSON.parse("{" + $jsonModal.find('.jObject').text().replace(/[\s\n]/g, "") + "}");
                expect(Object.keys(jsonObj).length).to.equal(2);
                expect(jsonObj.note).to.equal(1);
                expect(jsonObj.cool).to.equal(1);
                done();
            }, 500);
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

            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.cool")
            });
            expect($headerInput.length).to.equal(1);
            expect($headerInput.closest('th').hasClass('col' + (colNum + 1))).to.be.true;
            expect($table.find('.row0 .col'+ (colNum + 1) + ' .displayedData').text()).to.equal("1");
        });
    });


    after(function(done) {
        JSONModal.__testOnly__.closeJSONModal();
        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
           done();
        });
    });
});