describe('RowManager Test', function() {
    var testDs;
    var tableName;
    var tableId;
    var oldTableName;
    var oldTableId;
    var prefix;
    var $table;
    var tableName2;
    var prefix2;

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



            ExtensionManager.trigger(tableId, "UExtGenRowNum", "genRowNum",
                {newColName: "rowNum"})
            .then(function(tName) {
                oldTableName = tableName;
                tableName = tName;
                oldTableId = tableId;
                tableId = xcHelper.getTableId(tableName);
                $table = $("#xcTable-" + tableId);

                ColManager.delCol([1,2,3,4,5,6,7,8,9,10,11,12], tableId)
                .then(function() {
                    done();
                });
            });
        });
    });

    describe('RowManager.addRows', function() {
        it('scrolling down 20 rows should work', function(done) {
            var info = {
                "targetRow"       : 80,
                "lastRowToDisplay": 80,
                "bulk"            : false,
                "tableId"         : tableId,
                "currentFirstRow" : 0
            };
            RowManager.addRows(60, 20, RowDirection.Bottom, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row20')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row79')).to.be.true;
                expect(info.numRowsAdded).to.equal(20);
                expect(gTables[tableId].currentRowNumber).to.equal(80);
                var contents = gTables[tableId].getColContents(1);
                var colNum;
                for (var i = 0; i < 60; i++) {
                    colNum = "" + (i + 21);
                    expect(contents[i]).to.equal(colNum);
                }
                done();
            });
        });

        it('scrolling up 20 rows should work', function(done) {
            var info = {
                "targetRow"       : 0,
                "lastRowToDisplay": 60,
                "bulk"            : false,
                "tableId"         : tableId,
                "currentFirstRow" : 20
            };
            RowManager.addRows(0, 20, RowDirection.Top, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row0')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row59')).to.be.true;
                expect(info.numRowsAdded).to.equal(20);
                expect(gTables[tableId].currentRowNumber).to.equal(60);
                var contents = gTables[tableId].getColContents(1);
                var colNum;
                for (var i = 0; i < 60; i++) {
                    colNum = "" + (i + 1);
                    expect(contents[i]).to.equal(colNum);
                }

                done();
            });
        });

        // using a fake backend call for XcalarGetNextPage
        it('scrolling down 5 rows with the 1st one missing should work', function(done) {
            var returnZero = true;
            var cachedFn = XcalarGetNextPage;
            XcalarGetNextPage = function(resultSetId, numRowsToFetch) {
                if (returnZero) {
                    returnZero = false;
                    return PromiseHelper.resolve({
                                kvPair: [],
                                numKvPairs: 0
                            });
                } else {
                    return PromiseHelper.resolve({
                        kvPair: [
                        {key: 0,value: '{"rowNum":62}'},
                        {key: 0,value: '{"rowNum":63}'},
                        {key: 0,value: '{"rowNum":64}'},
                        {key: 0,value: '{"rowNum":65}'},
                        {key: 0,value: '{"rowNum":66}'},
                        ],
                        numKvPairs: 5
                    });
                }
            };
            var info = {
                "targetRow"       : 65,
                "lastRowToDisplay": 65,
                "bulk"            : false,
                "tableId"         : tableId,
                "currentFirstRow" : 0
            };
            
            RowManager.addRows(60, 5, RowDirection.Bottom, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row5')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row65')).to.be.true;
                expect(info.numRowsAdded).to.equal(5);
                expect(gTables[tableId].currentRowNumber).to.equal(66);
                expect(info.missingRows[0]).to.equal(61);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);

                expect(contents[0]).to.equal("6");
                expect(contents[1]).to.equal("7");
                expect(contents[numRows - 1]).to.equal("66");
                expect(contents[numRows - 5]).to.equal("62");
                expect(contents[numRows - 6]).to.equal("60");
                expect(contents[numRows - 7]).to.equal("59");
  
                XcalarGetNextPage = cachedFn;
                done();
            });
        });

        it('skipping to first row should work', function(done) {
            [0, 60, 2, Object]
            var info = {
                "lastRowToDisplay": 60,
                "targetRow"       : 1,
                "bulk"            : true,
                "tableId"         : tableId,
                "currentFirstRow" : 0
            };
            RowManager.addRows(0, 60, RowDirection.Bottom, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row0')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row59')).to.be.true;
                expect(info.numRowsAdded).to.equal(60);
                expect(gTables[tableId].currentRowNumber).to.equal(60);
                var contents = gTables[tableId].getColContents(1);
                var colNum;
                for (var i = 0; i < 60; i++) {
                    colNum = "" + (i + 1);
                    expect(contents[i]).to.equal(colNum);
                }
                done();
            });
        });

        // using a fake backend call for XcalarGetNextPage
        it('scrolling down 5 rows when first fetch returns 3 and second returns 2', function(done) {
            var returnThree = true;
            var cachedFn = XcalarGetNextPage;
            XcalarGetNextPage = function(resultSetId, numRowsToFetch) {
                if (returnThree) {
                    returnThree = false;
                    return PromiseHelper.resolve({
                                kvPair: [
                                {key: 0,value: '{"rowNum":61}'},
                                {key: 0,value: '{"rowNum":62}'},
                                {key: 0,value: '{"rowNum":63}'},
                                ],
                                numKvPairs: 3
                            });
                } else {
                    return PromiseHelper.resolve({
                        kvPair: [
                        
                        {key: 0,value: '{"rowNum":64}'},
                        {key: 0,value: '{"rowNum":65}'},
                        ],
                        numKvPairs: 2
                    });
                }
            };
            var info = {
                "targetRow"       : 65,
                "lastRowToDisplay": 65,
                "bulk"            : false,
                "tableId"         : tableId,
                "currentFirstRow" : 0
            };

            RowManager.addRows(60, 5, RowDirection.Bottom, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row5')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row64')).to.be.true;
                expect(info.numRowsAdded).to.equal(5);
                expect(gTables[tableId].currentRowNumber).to.equal(65);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);

                var contents = gTables[tableId].getColContents(1);
                var colNum;
                for (var i = 0; i < 60; i++) {
                    colNum = "" + (i + 6);
                    expect(contents[i]).to.equal(colNum);
                    expect(xcHelper.parseRowNum($table.find('tbody tr').eq(i))).to.equal(i + 5);
                }
  
                XcalarGetNextPage = cachedFn;
                done();
            });
        });

         // using a fake backend call for XcalarGetNextPage
        it('scrolling up 4 rows when first fetch returns 2 and second returns 2', function(done) {
            var returnTwo = true;
            var cachedFn = XcalarGetNextPage;
            XcalarGetNextPage = function(resultSetId, numRowsToFetch) {
                if (returnTwo) {
                    returnTwo = false;
                    return PromiseHelper.resolve({
                                kvPair: [
                                {key: 0,value: '{"rowNum":2}'},
                                {key: 0,value: '{"rowNum":3}'},
                                ],
                                numKvPairs: 2
                            });
                } else {
                    return PromiseHelper.resolve({
                        kvPair: [
                        {key: 0,value: '{"rowNum":4}'},
                        {key: 0,value: '{"rowNum":5}'},
                        ],
                        numKvPairs: 2
                    });
                }
            };
            var info = {
                "targetRow"       : 1,
                "lastRowToDisplay": 56,
                "bulk"            : false,
                "tableId"         : tableId,
                "currentFirstRow" : 5
            };

            RowManager.addRows(1, 4, RowDirection.Top, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row1')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row60')).to.be.true;
                expect(info.numRowsAdded).to.equal(4);
                expect(gTables[tableId].currentRowNumber).to.equal(61);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);

                var contents = gTables[tableId].getColContents(1);
                var colNum;
                for (var i = 0; i < 60; i++) {
                    colNum = "" + (i + 2);
                    expect(contents[i]).to.equal(colNum);
                    expect(xcHelper.parseRowNum($table.find('tbody tr').eq(i))).to.equal(i + 1);
                }
  
                XcalarGetNextPage = cachedFn;
                done();
            });
        });

        it('skipping to end of table with last 2 rows missing', function(done) {
            var count = 0;
            var cachedFn = XcalarGetNextPage;
            XcalarGetNextPage = function(resultSetId, numRowsToFetch) {
                count++;
                if (count === 1) {
                    var pairs = [];
                    for (var i = 0; i < 58; i++) {
                        pairs.push({key: 0, value: '{"rowNum":' + (941 + i) + '}'});
                    }
                    return PromiseHelper.resolve({
                        kvPair: pairs,
                        numKvPairs: 58
                    });
                } else if (count === 2 || count === 3) {
                    return PromiseHelper.resolve({
                        kvPair: [],
                        numKvPairs: 0
                    });
                } else if (count === 4) {
                    return PromiseHelper.resolve({
                        kvPair: [
                        {key: 0,value: '{"rowNum":939}'},
                        {key: 0,value: '{"rowNum":940}'},
                        ],
                        numKvPairs: 2
                    });
                } else if (count === 5) {
                    console.error('should not get page 5 times');
                    expect(true).to.be.false;
                }
        
            };
            var info = {
                bulk: true,
                currentFirstRow:940,
                lastRowToDisplay:1000,
                tableId: tableId,
                targetRow:1000
            };

            RowManager.addRows(940, 60, RowDirection.Bottom, info)
            .then(function() {
                expect($table.find('tbody tr').first().hasClass('row938')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row997')).to.be.true;
                expect(info.numRowsAdded).to.equal(60);
                expect(info.missingRows[0]).to.equal(999);
                expect(info.missingRows[1]).to.equal(1000);
                expect(gTables[tableId].currentRowNumber).to.equal(999);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);
               

                var contents = gTables[tableId].getColContents(1);
                
                expect(contents[0]).to.equal("939");
                expect(contents[1]).to.equal("940");
                expect(contents[2]).to.equal("941");
                expect(contents[numRows - 1]).to.equal("998");
                expect(contents[numRows - 2]).to.equal("997");
                expect(contents[numRows - 11]).to.equal("988");  
  
                XcalarGetNextPage = cachedFn;
                done();
            });

        });
    });

    after(function(done) {
        setTimeout(function() {
            UnitTest.deleteTable(oldTableName, TableType.Orphan)
            .then(function() {
                UnitTest.deleteAll(tableName, testDs)
                .always(function() {
                    done();
                });
            });
        }, 500);
    });
});