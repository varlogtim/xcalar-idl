describe("SQLApi Test", function() {
    describe("Static Function Test", function() {
        var oldIndexTableCache;
        var oldReverseIndexMap;

        before(function() {
            oldIndexTableCache = SQLApi.__testOnly__.indexTableCache;
            oldReverseIndexMap = SQLApi.__testOnly__.reverseIndexMap;
            SQLApi.clear();
        });

        it("SQLApi.getCacheTable should work", function() {
            var res = SQLApi.getCacheTable();
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).to.equal(0);
        });

        it("SQLApi.getIndexTable should work", function() {
            var res = SQLApi.getIndexTable("testTable", "testCol");
            expect(res).to.be.null;
        });

        it("SQLApi.cacheIndexTable should work", function() {
            SQLApi.cacheIndexTable("testTable", "testCol", "test", "testKeys");
            var res = SQLApi.getIndexTable("testTable", "testCol");
            expect(res).to.be.an("object");
            expect(res.tableName).to.be.equal("test");
            expect(res.keys).to.be.equal("testKeys");
        });

        it("SQLApi.deleteIndexTable should work", function() {
            SQLApi.deleteIndexTable("test");
            var res = SQLApi.getIndexTable("testTable", "testCol");
            expect(res).to.be.null;
        });

        it("SQLApi.clear should work", function() {
            SQLApi.cacheIndexTable("testTable", "testCol", "test", "testKeys");
            SQLApi.clear();

            var res = SQLApi.getIndexTable("testTable", "testCol");
            expect(res).to.be.null;
        });

        after(function() {
            SQLApi.__testOnly__.setIndexTableCache(oldIndexTableCache);
            SQLApi.__testOnly__.setReverseIndexMap(oldReverseIndexMap);
        });
    });

    describe("SQLAPi Object Test", function() {
        var sqlApi;
        var oldStart;
        var oldEnd;

        before(function() {
            oldStart = Transaction.start;
            oldEnd = Transaction.done;

            Transaction.start = function() { return 1.5; };
            Transaction.done = function(id) { return "test query:" + id; };
        });

        it("should create an SQLApi object", function() {
            sqlApi = new SQLApi();
            expect(sqlApi).to.be.instanceof(SQLApi);
            expect(Object.keys(sqlApi).length).to.equal(2);
        });

        it("get/setStatus should work", function() {
            var test = false;
            var oldCancel = QueryManager.cancelQuery;
            var oldXcalarCancel = XcalarQueryCancel;
            QueryManager.cancelQuery = function() {
                test = true;
            };
            XcalarQueryCancel = function() {
                test = true;
            }

            expect(sqlApi.status).to.equal(undefined);
            sqlApi.status = SQLStatus.Compiling;
            expect(sqlApi.getStatus()).to.equal(SQLStatus.Compiling);
            sqlApi.setStatus(SQLStatus.Cancelled);
            expect(sqlApi.getStatus()).to.equal(SQLStatus.Cancelled);
            sqlApi.setStatus(SQLStatus.Done);
            expect(sqlApi.getStatus()).to.equal(SQLStatus.Cancelled);
            sqlApi.status = SQLStatus.Done;
            sqlApi.setStatus(SQLStatus.Cancelled);
            expect(sqlApi.getStatus()).to.equal(SQLStatus.Done);
            QueryManager.cancelQuery(this.runTxId);
            sqlApi.status = SQLStatus.Running;
            sqlApi.setStatus(SQLStatus.Cancelled);
            expect(test).to.be.true;

            test = false;
            sqlApi.sqlMode = true;
            sqlApi.status = SQLStatus.Running
            sqlApi.setStatus(SQLStatus.Cancelled);
            expect(test).to.be.true;
            expect(sqlApi.getStatus()).to.equal(SQLStatus.Cancelled);

            test = false;
            sqlApi.status = undefined;
            var dateBefore = new Date();
            sqlApi.setStatus(SQLStatus.Running);
            expect(test).to.be.false;
            expect(sqlApi.getStatus()).to.equal(SQLStatus.Running);
            expect(dateBefore <= sqlApi.startTime).to.be.true;

            sqlApi.status = undefined;
            sqlApi.sqlMode = false;
            QueryManager.cancelQuery = oldCancel;
            XcalarQueryCancel = oldXcalarCancel;
        });

        it("_start should work", function() {
            var txId = sqlApi._start();
            expect(txId).to.equal(1.5);
        });

        it("_end should work", function() {
            var query = sqlApi._end(1.5);
            expect(query).to.equal("test query:1.5");
        });

        it("run should work", function(done) {
            var oldQuery = XIApi.query;
            var testQuery = null;

            XIApi.query = function(txId, queryName, query) {
                testQuery = query;
                return PromiseHelper.resolve();
            };
            sqlApi.sqlMode = true;

            sqlApi.run("testQuery", "testTable")
            .fail(function() {
                done("fail");
            })
            .then(function() {
                expect(testQuery).to.equal("testQuery");
                done();
            })
            .always(function() {
                XIApi.query = oldQuery;
                sqlApi.status = undefined;
                sqlApi.sqlMode = false;
            });
        });

        it("run should handle fail case", function(done) {
            var oldQuery = XIApi.query;

            XIApi.query = function() {
                return PromiseHelper.reject("test error");
            };
            sqlApi.sqlMode = true;

            sqlApi.run("testQuery", "testTable")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test error");
                done();
            })
            .always(function() {
                XIApi.query = oldQuery;
                sqlApi.status = undefined;
                sqlApi.sqlMode = false;
            });
        });

        it("filter should work", function(done) {
            var oldFilter = XIApi.filter;
            XIApi.filter = function() {
                return PromiseHelper.resolve("testTable");
            };

            sqlApi.filter()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.filter = oldFilter;
            });
        });

        it("aggregate should work", function(done) {
            var oldAgg = XIApi.aggregate;
            XIApi.aggregate = function() {
                return PromiseHelper.resolve("testVal", "testTable");
            };

            sqlApi.aggregate()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.val).to.equal("testVal");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.aggregate = oldAgg;
            });
        });

        it("aggregateWithEvalStr should work", function(done) {
            var oldAggWES = XIApi.aggregateWithEvalStr;
            XIApi.aggregateWithEvalStr = function() {
                return PromiseHelper.resolve("testVal", "testTable");
            };

            sqlApi.aggregateWithEvalStr()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.val).to.equal("testVal");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.aggregateWithEvalStr = oldAggWES;
            });
        });

        it("sort should work", function(done) {
            var oldSort = XIApi.sort;
            XIApi.sort = function() {
                return PromiseHelper.resolve("testTable");
            };

            sqlApi.sort([{name: "testName", ordering: "testOrder"}])
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                expect(res.sortColName).to.equal("testName");
                expect(res.order).to.equal("testOrder");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.sort = oldSort;
            });
        });

        it("sort should work for multisort case", function(done) {
            var oldMultiSort = XIApi.sort;
            XIApi.sort = function() {
                return PromiseHelper.resolve({
                    newTableName: "testTable",
                    sortColName: "testName"
                });
            };

            sqlApi.sort([{}, {}])
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                expect(res.sortColName).to.equal("testName");
                expect(res.order).to.equal(XcalarOrderingT.XcalarOrderingAscending);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.sort = oldMultiSort;
            });
        });

        it("map should work", function(done) {
            var oldMap = XIApi.map;
            XIApi.map = function() {
                return PromiseHelper.resolve("testTable");
            };

            sqlApi.map()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.map = oldMap;
            });
        });

        it("join should work", function(done) {
            var oldJoin = XIApi.join;
            XIApi.join = function() {
                return PromiseHelper.resolve("testTable", "testCols");
            };

            sqlApi.join()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.tempCols).to.equal("testCols");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.join = oldJoin;
            });
        });

        it("union should work", function(done) {
            var oldUnion = XIApi.union;
            var oldNewPull = ColManager.newPullCol;
            var oldNewData = ColManager.newDATACol;
            XIApi.union = function() {
                return PromiseHelper.resolve("testTable", [{rename: "testCols", type: "testType"}]);
            };
            ColManager.newPullCol = function(frontName, backName, type) {
                return frontName + "-" + backName + "-" + type;
            };
            ColManager.newDATACol = function() {
                return "newData";
            };

            sqlApi.union()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.newColumns.length).to.equal(2);
                expect(res.newColumns[0]).to.equal("testCols-null-testType");
                expect(res.newColumns[1]).to.equal("newData");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.union = oldUnion;
                ColManager.newPullCol = oldNewPull;
                ColManager.newDATACol = oldNewData;
            });
        });

        it("groupBy should work", function(done) {
            var oldGroupBy = XIApi.groupBy;
            XIApi.groupBy = function() {
                return PromiseHelper.resolve("testTable", "testCols");
            };

            sqlApi.groupBy([])
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.tempCols).to.equal("testCols");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.groupBy = oldGroupBy;
            });
        });

        it("project should work", function(done) {
            var oldSynthesize = XIApi.synthesize;
            var testColName;
            XIApi.synthesize = function(txId, colInfos) {
                testColName = colInfos[0].orig;
                return PromiseHelper.resolve("testTable");
            };

            sqlApi.project([{colName: "testCol", colType: "int"}])
            .then(function(res) {
                expect(res).to.an("object");
                expect(testColName).to.equal("testCol");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.synthesize = oldSynthesize;
            });
        });



        it("addSynthesize should work", function(done) {
            var oldSynthesize = XIApi.synthesize;
            var testColName;
            XIApi.synthesize = function(txId, colInfos) {
                testColName = colInfos[1].new;
                return PromiseHelper.resolve("testTable");
            };

            sqlApi.addSynthesize("[testCli]", "testInputTable",
                                    [{colName: "testCol", colId: 1}],
                                    [{colName: "testCol2",
                                    rename: "testCol2_something",
                                    colId: 2,
                                    udfColName: "testCol"}])
            .then(function(resString, resTableName, resCols) {
                expect(resCols.length).to.equal(1);
                expect(testColName).to.equal("testCol_1");
                expect(resTableName).to.equal("testTable");
                expect(resString).to.equal("[testCli,test query:1.5]");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.synthesize = oldSynthesize;
            });
        });

        it("genRowNum should work", function(done) {
            var oldGenRowNum = XIApi.genRowNum;
            XIApi.genRowNum = function() {
                return PromiseHelper.resolve("testTable");
            };

            sqlApi.genRowNum()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.genRowNum = oldGenRowNum;
            });
        });

        it("deleteTable should work", function(done) {
            var oldDeleteTable = XIApi.deleteTable;
            XIApi.deleteTable = function() {
                return PromiseHelper.resolve();
            };

            sqlApi.deleteTable("test")
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.deleteTable = oldDeleteTable;
            });
        });

        it("get/set should work", function() {
            expect(sqlApi.sqlMode).to.equal(false);
            sqlApi.setSqlMode();
            expect(sqlApi.sqlMode).to.equal(true);
            sqlApi.setQueryName("testQuery");
            expect(sqlApi.getQueryName()).to.equal("testQuery");
            sqlApi.setQueryId("someId");
            expect(sqlApi.getQueryId()).to.equal("someId");
            sqlApi.setError("error message");
            expect(sqlApi.getError()).to.equal("error message");
            sqlApi.setQueryString("queryStr");
            expect(sqlApi.getQueryString()).to.equal("queryStr");
            sqlApi.setNewTableName("tbl#-1");
            expect(sqlApi.getNewTableName()).to.equal("tbl#-1");
        });

        after(function() {
            Transaction.start = oldStart;
            Transaction.done = oldEnd;
        });
    });
});