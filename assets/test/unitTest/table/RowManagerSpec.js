// XXX temporary disable it
describe.skip('RowManager Test', function() {
    var testDs;
    var tableName;
    var tableId;
    var oldTableName;
    var $table;
    var rowManager
    var tabId;
    var nodeId;
    let cachedUserPref;

    before(function(done) {
        console.clear();
        console.log("RowManager Test");
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        let node;

        cachedUserPref = UserSettings.getPref;
        UserSettings.getPref = function(val) {
            if (val === "dfAutoExecute" || val === "dfAutoPreview") {
                return false;
            } else {
                return cachedUserPref(val);
            }
        };
        UnitTest.testFinish(() => {
            return DagTabManager.Instance._hasSetup;
        })
        .then(() => {
            return UnitTest.addAll(testDSObj, "unitTestFakeYelp");
        })
        .then(function(ds, tName, tPrefx, _nodeId, _tabId) {
            testDs = ds;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);
            $table = $('#xcTable-' + tableId);
            tabId = _tabId;
            nodeId = _nodeId;

            return PromiseHelper.convertToJQuery(DagViewManager.Instance.autoAddNode("rowNum", null, _nodeId, {newField: "rowNum"}));
        })
        .then(function(res) {
            node = res;
            node.setParam({newField: "rowNum"});
            return DagViewManager.Instance.run();
        })
        .then(function() {
            return DagViewManager.Instance.viewResult(DagViewManager.Instance.getActiveDag().getNode(node.getId()));
        })
        .then(function() {
            oldTableName = tableName;
            tableId = $(".xcTable").data("id");
            tableName = gTables[tableId].tableName;
            tableId = xcHelper.getTableId(tableName);
            $table = $("#xcTable-" + tableId);

            return ColManager.hideCol([1,2,3,4,5,6,7,8,9,10,11,12], tableId);
        })
        .then(function() {
            rowManager = new RowManager(gTables[tableId],  $("#xcTableWrap-" + tableId));
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe('rowManager.addRows', function() {
        it("RowManager.parseRowNum should work", function() {
            // case 1
            var $el = $('<div class="row1"></div>');
            var res = RowManager.parseRowNum($el);
            expect(res).to.equal(1);
             // case 2
            var $el = $('<div class="row2 tempRow"></div>');
            var res = RowManager.parseRowNum($el);
            expect(res).to.equal(2);
            // case 3 (normal to see the console.error)
            $el = $("<div></div>");
            res = RowManager.parseRowNum($el);
            expect(res).to.be.null;
            // case 4
            $el = $('<div class="column1"></div>');
            res = RowManager.parseRowNum($el);
            expect(res).to.be.null;
        });

        it('scrolling down 20 rows should work', function(done) {
            var info = {
                "bulk": false
            };
            rowManager.addRows(60, 20, RowDirection.Bottom, info)
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
                "bulk": false,
            };
            rowManager.addRows(0, 20, RowDirection.Top, info)
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
            XcalarGetNextPage = function() {
                if (returnZero) {
                    returnZero = false;
                    return PromiseHelper.resolve({
                        values: [],
                        numValues: 0
                    });
                } else {
                    return PromiseHelper.resolve({
                        values: [
                        '{"rowNum":62}',
                        '{"rowNum":63}',
                        '{"rowNum":64}',
                        '{"rowNum":65}',
                        ],
                        numValues: 4
                    });
                }
            };
            var info = {
                "bulk": false,
            };

            rowManager.addRows(60, 5, RowDirection.Bottom, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row5')).to.be.true;
                expect($table.find(".row60").hasClass("empty")).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row64')).to.be.true;
                expect(info.numRowsAdded).to.equal(5);
                expect(gTables[tableId].currentRowNumber).to.equal(65);
                expect(info.missingRows[0]).to.equal(61);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);

                expect(contents[0]).to.equal("6");
                expect(contents[1]).to.equal("7");
                expect(contents[numRows - 1]).to.equal("65");
                expect(contents[numRows - 5]).to.equal("");
                expect(contents[numRows - 6]).to.equal("60");
                expect(contents[numRows - 7]).to.equal("59");

                XcalarGetNextPage = cachedFn;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it('skipping to first row should work', function(done) {
            var info = {
                "bulk": true,
            };
            rowManager.addRows(0, 60, RowDirection.Bottom, info)
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
            XcalarGetNextPage = function() {
                if (returnThree) {
                    returnThree = false;
                    return PromiseHelper.resolve({
                        values: [
                        '{"rowNum":61}',
                        '{"rowNum":62}',
                        '{"rowNum":63}',
                        ],
                        numValues: 3
                    });
                } else {
                    return PromiseHelper.resolve({
                        values: [
                        '{"rowNum":64}',
                        '{"rowNum":65}',
                        ],
                        numValues: 2
                    });
                }
            };
            var info = {
                "bulk": false
            };

            rowManager.addRows(60, 5, RowDirection.Bottom, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row5')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row64')).to.be.true;
                expect(info.numRowsAdded).to.equal(5);
                expect(gTables[tableId].currentRowNumber).to.equal(65);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);

                contents = gTables[tableId].getColContents(1);
                var colNum;
                for (var i = 0; i < 60; i++) {
                    colNum = "" + (i + 6);
                    expect(contents[i]).to.equal(colNum);
                    expect(RowManager.parseRowNum($table.find('tbody tr').eq(i))).to.equal(i + 5);
                }
                XcalarGetNextPage = cachedFn;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

         // using a fake backend call for XcalarGetNextPage
        it('scrolling up 4 rows when first fetch returns 2 and second returns 2', function(done) {
            var returnTwo = true;
            var cachedFn = XcalarGetNextPage;
            XcalarGetNextPage = function() {
                if (returnTwo) {
                    returnTwo = false;
                    return PromiseHelper.resolve({
                        values: [
                        '{"rowNum":2}',
                        '{"rowNum":3}',
                        ],
                        numValues: 2
                    });
                } else {
                    return PromiseHelper.resolve({
                        values: [
                        '{"rowNum":4}',
                        '{"rowNum":5}',
                        ],
                        numValues: 2
                    });
                }
            };
            var info = {
                "bulk": false
            };

            rowManager.addRows(1, 4, RowDirection.Top, info)
            .then(function(info) {
                expect($table.find('tbody tr').first().hasClass('row1')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row60')).to.be.true;
                expect(info.numRowsAdded).to.equal(4);
                expect(gTables[tableId].currentRowNumber).to.equal(61);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);

                contents = gTables[tableId].getColContents(1);
                var colNum;
                for (var i = 0; i < 60; i++) {
                    colNum = "" + (i + 2);
                    expect(contents[i]).to.equal(colNum);
                    expect(RowManager.parseRowNum($table.find('tbody tr').eq(i))).to.equal(i + 1);
                }
                XcalarGetNextPage = cachedFn;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it('skipping to end of table with last 2 rows missing', function(done) {
            var count = 0;
            var cachedFn = XcalarGetNextPage;
            XcalarGetNextPage = function() {
                count++;
                if (count === 1) {
                    var pairs = [];
                    for (var i = 0; i < 58; i++) {
                        pairs.push('{"rowNum":' + (941 + i) + '}');
                    }
                    return PromiseHelper.resolve({
                        values: pairs,
                        numValues: 58
                    });
                } else if (count === 2 || count === 3) {
                    return PromiseHelper.resolve({
                        values: [],
                        numValues: 0
                    });
                } else if (count === 4) {
                    console.error('should not get page 5 times');
                    expect(true).to.be.false;
                }
            };
            var info = {
                bulk: true,
            };

            rowManager.addRows(940, 60, RowDirection.Bottom, info)
            .then(function() {
                expect($table.find('tbody tr').first().hasClass('row940')).to.be.true;
                expect($table.find('tbody tr').last().hasClass('row999')).to.be.true;
                expect(info.numRowsAdded).to.equal(60);
                expect(info.missingRows[0]).to.equal(999);
                expect(info.missingRows[1]).to.equal(1000);
                expect(gTables[tableId].currentRowNumber).to.equal(1000);
                var contents = gTables[tableId].getColContents(1);
                var numRows = contents.length;
                expect(numRows).to.equal(60);

                contents = gTables[tableId].getColContents(1);
                expect(contents[0]).to.equal("941");
                expect(contents[1]).to.equal("942");
                expect(contents[2]).to.equal("943");
                expect(contents[numRows - 1]).to.equal("");
                expect(contents[numRows - 2]).to.equal("");
                expect(contents[numRows - 3]).to.equal("998");
                expect(contents[numRows - 11]).to.equal("990");

                XcalarGetNextPage = cachedFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Fail Handlers", function() {
        it("SetAbsolute Fail should work", function(done) {
            var cachedFn = XcalarSetAbsolute;
            XcalarSetAbsolute = function() {
                return PromiseHelper.reject({status: StatusT.StatusInvalidResultSetId});
            };

            var info = {
                bulk: true,
            };

            rowManager.addRows(0, 60, RowDirection.Bottom, info)
            .then(function() {
                expect(true).to.be.false;
            })
            .fail(function() {
                expect($table.find("tbody tr").length).to.equal(60);
                expect($table.find("tbody tr.empty").length).to.equal(60);
                expect($table.find("tbody tr").eq(0).hasClass("row0")).to.be.true;
                expect($table.find("tbody tr").last().hasClass("row59")).to.be.true;
                expect(gTables[tableId].currentRowNumber).to.equal(60);
                UnitTest.hasAlertWithTitle("Could not display rows");
                XcalarSetAbsolute = cachedFn;
                done();
            });
        });

        it("GetNextPage Fail should work", function(done) {
            var cachedFn = XcalarGetNextPage;
            XcalarGetNextPage = function() {
                return PromiseHelper.reject({status: StatusT.StatusInvalidResultSetId});
            };

            var info = {
                bulk: true,
            };

            rowManager.addRows(0, 60, RowDirection.Bottom, info)
            .then(function() {
                expect(true).to.be.false;
            })
            .fail(function() {
                expect($table.find("tbody tr").length).to.equal(60);
                expect($table.find("tbody tr.empty").length).to.equal(60);
                expect($table.find("tbody tr").eq(0).hasClass("row0")).to.be.true;
                expect($table.find("tbody tr").last().hasClass("row59")).to.be.true;
                expect(gTables[tableId].currentRowNumber).to.equal(60);
                UnitTest.hasAlertWithTitle("Could not display rows");
                XcalarGetNextPage = cachedFn;
                done();
            });
        });
    });

    describe("getRowsAboveHeight", function() {
        it("get rows above height should  work", function() {
            // rowheight change at row 2,4, and 43
            var fakeTable = {rowHeights: {0: {2: 100, 4: 200}, 2: {43: 400}}};
            var fakeRowManager = new RowManager(fakeTable, $());
            expect(fakeRowManager.getRowsAboveHeight(200)).to.equal((200 * 21) + (79 + 179 + 379));
            expect(fakeRowManager.getRowsAboveHeight(40)).to.equal((40 * 21) + (79 + 179));
            expect(fakeRowManager.getRowsAboveHeight(42)).to.equal((42 * 21) + (79 + 179));
            expect(fakeRowManager.getRowsAboveHeight(43)).to.equal((43 * 21) + (79 + 179 + 379));
            expect(fakeRowManager.getRowsAboveHeight(44)).to.equal((44 * 21) + (79 + 179 + 379));
        });
    });

    after(function(done) {
        UserSettings.getPref = cachedUserPref;
        setTimeout(function() {
            UnitTest.deleteTab(tabId)
            .then(() => {
                return UnitTest.deleteAllTables();
            })
            .then(function() {
                UnitTest.deleteDS(testDs)
                .always(function() {
                    UnitTest.offMinMode();
                    done();
                });
            })
            .fail(function() {
                done("fail");
            });
        }, 500);
    });
});