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
            QueryManager.cancelQuery = function() {
                test = true;
            };

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

            sqlApi.status = undefined;
            QueryManager.cancelQuery = oldCancel;
        });

        it("_start should work", function() {
            var txId = sqlApi._start();
            expect(txId).to.equal(1.5);
        });

        it("_end should work", function() {
            var query = sqlApi._end(1.5);
            expect(query).to.equal("test query:1.5");
        });

        it("_getColType should work", function() {
            var tests = [{
                id: "error id",
                expect: null
            }, {
                id: DfFieldTypeT.DfUnknown,
                expect: ColumnType.unknown
            }, {
                id: DfFieldTypeT.DfString,
                expect: ColumnType.string
            }, {
                id: DfFieldTypeT.DfInt32,
                expect: ColumnType.integer
            }, {
                id: DfFieldTypeT.DfInt64,
                expect: ColumnType.integer
            }, {
                id: DfFieldTypeT.DfUInt32,
                expect: ColumnType.integer
            }, {
                id: DfFieldTypeT.DfUInt64,
                expect: ColumnType.integer
            }, {
                id: DfFieldTypeT.DfFloat32,
                expect: ColumnType.float
            }, {

                id: DfFieldTypeT.DfFloat64,
                expect: ColumnType.float
            }, {
                id: DfFieldTypeT.DfBoolean,
                expect: ColumnType.boolean
            }, {
                id: DfFieldTypeT.DfTimespec,
                expect: ColumnType.timestamp
            }, {
                id: DfFieldTypeT.DfMixed,
                expect: ColumnType.mixed
            }, {
                id: DfFieldTypeT.DfFatptr,
                expect: null
            }, {
                id: DfFieldTypeT.DfScalarObj,
                expect: null
            }];

            tests.forEach(function(test) {
                var res = sqlApi._getColType(test.id);
                expect(res).to.equal(test.expect);
            });
        });

        it("_getQueryTableCols should work", function(done) {
            var oldFunc = XcalarGetTableMeta;
            XcalarGetTableMeta = function() {
                return PromiseHelper.resolve({
                    valueAttrs: [{
                        name: "test",
                        type: DfFieldTypeT.DfMixed
                    },
                    {
                        name: "test2",
                        type: DfFieldTypeT.DfMixed
                    },
                    {
                        name: "test3",
                        type: DfFieldTypeT.DfMixed
                    }]
                });
            };

            sqlApi._getQueryTableCols("testTable", [{colName: "test"},
                                        {colName: "testTable::test2"},
                                        {colName: "test", rename: "test3"}])
            .then(function(res) {
                expect(res).to.be.an("array");
                expect(res.length).to.equal(4);
                expect(res[0].getBackColName()).to.equal("test");
                expect(res[0].getType()).to.equal(ColumnType.mixed);
                expect(res[1].getBackColName()).to.equal("test2");
                expect(res[1].getType()).to.equal(ColumnType.mixed);
                expect(res[2].getBackColName()).to.equal("test3");
                expect(res[2].getFrontColName()).to.equal("test_1");
                expect(res[2].getType()).to.equal(ColumnType.mixed);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarGetTableMeta = oldFunc;
            });
        });

        it("_getQueryTableCols immediate should work", function(done) {
            var oldFunc = XcalarGetTableMeta;
            XcalarGetTableMeta = function() {
                return PromiseHelper.resolve({
                    valueAttrs: [{
                        name: "test",
                        type: DfFieldTypeT.DfMixed
                    }]
                });
            };

            sqlApi._getQueryTableCols("testTable", [], true)
            .then(function(res) {
                expect(res).to.be.an("array");
                expect(res.length).to.equal(2);
                expect(res[0].getBackColName()).to.equal("test");
                expect(res[0].getType()).to.equal(ColumnType.mixed);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarGetTableMeta = oldFunc;
            });
        });

        it("_getQueryTableCols should work case 2", function(done) {
            var oldFunc = XcalarGetTableMeta;
            XcalarGetTableMeta = function() {
                return PromiseHelper.resolve(null);
            };

            sqlApi._getQueryTableCols()
            .then(function(res) {
                expect(res).to.be.an("array");
                expect(res.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarGetTableMeta = oldFunc;
            });
        });

        it("_refreshTable should work", function(done) {
            var oldGQTC = sqlApi._getQueryTableCols;
            var oldAMFI = sqlApi._addMetaForImmediates;
            var oldGAWS = WSManager.getActiveWS;
            var oldRT = TblManager.refreshTable;
            var oldXGD = XcalarGetDag;
            var testTable;
            var test;
            var testAllTables;
            var testConstants;

            sqlApi._getQueryTableCols = function() {
                testTable = "testTable";
                return PromiseHelper.resolve();
            };
            sqlApi._addMetaForImmediates = function(allTables, constants) {
                testAllTables = allTables;
                testConstants = constants;
                return PromiseHelper.resolve();
            };
            WSManager.getActiveWS = function() {
                return PromiseHelper.resolve();
            };
            TblManager.refreshTable = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            XcalarGetDag = function() {
                return PromiseHelper.resolve({node:
                                [{name: {name: "testTable#1"}},
                                 {name: {name: "testConstant"},
                                  numRowsTotal: 0, numParents: [1],
                                  input: {aggregateInput: "sum(1)"}}]});
            };

            sqlApi._refreshTable()
            .then(function(res) {
                expect(testTable).to.equal("testTable");
                expect(test).to.be.true;
                expect(testAllTables.length).to.equal(1);
                expect(testAllTables[0]).to.equal("testTable#1");
                expect(testConstants.length).to.equal(1);
                expect(testConstants[0].name).to.equal("testConstant");
                expect(testConstants[0].input).to.equal("sum(1)");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                sqlApi._getQueryTableCols = oldGQTC;
                sqlApi._addMetaForImmediates = oldAMFI;
                WSManager.getActiveWS = oldGAWS;
                TblManager.refreshTable = oldRT;
                XcalarGetDag = oldXGD;
            });
        });

        it("_addMetaForImmediates should work ", function(done) {
            var oldGQTC = sqlApi._getQueryTableCols;
            var oldSOTM = TblManager.setOrphanTableMeta;
            var oldXMRSFT = XcalarMakeResultSetFromTable;
            var oldXGNP = XcalarGetNextPage;
            var oldAddAgg = Aggregates.addAgg;
            var oldRCL = TableList.refreshConstantList;
            var oldXSF = XcalarSetFree;
            var testTable = null;
            var test = false;
            var testFree = false;

            sqlApi._getQueryTableCols = function() {
                testTable = "testTable";
                return PromiseHelper.resolve();
            };
            TblManager.setOrphanTableMeta = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            XcalarMakeResultSetFromTable = function() {
                return PromiseHelper.resolve({resultSetId: 1,
                                              numEntries: 1});
            };
            XcalarGetNextPage = function() {
                return PromiseHelper.resolve({values: ["{\"constant\": 1}"]});
            };
            Aggregates.addAgg = function() {
                return PromiseHelper.resolve();
            };
            TableList.refreshConstantList = function() {
                return PromiseHelper.resolve();
            };
            XcalarSetFree = function() {
                testFree = true;
                return PromiseHelper.resolve();
            };

            sqlApi._addMetaForImmediates(["testTable"], [{name: "testConstant",
                                    input: {eval: [{evalString: "int(1)"}],
                                    source: "tableName#1"}}])
            .then(function() {
                expect(test).to.be.true;
                expect(testTable).to.equal("testTable");
                expect(testFree).to.be.true;

                testFree = false;
                XcalarMakeResultSetFromTable = function() {
                    return PromiseHelper.reject();
                };
                return sqlApi._addMetaForImmediates(["testTable"],
                                    [{name: "testConstant",
                                    input: {eval: [{evalString: "int(1)"}],
                                    source: "tableName#1"}}]);
            })
            .then(function() {
                expect(testFree).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                sqlApi._getQueryTableCols = oldGQTC;
                TblManager.setOrphanTableMeta = oldSOTM;
                XcalarMakeResultSetFromTable = oldXMRSFT;
                XcalarGetNextPage = oldXGNP;
                Aggregates.addAgg = oldAddAgg;
                TableList.refreshConstantList = oldRCL;
                XcalarSetFree = oldXSF;
            });
        });

        it("run should work", function(done) {
            var oldQuery = XIApi.query;
            var oldGetMeta = XcalarGetTableMeta;
            var oldRefresh = TblManager.refreshTable;
            var oldGetDag = XcalarGetDag;
            var oldCancel = Transaction.cancel;
            var testQuery = null;
            var testTable = null;
            var test = false;

            XIApi.query = function(txId, queryName, query) {
                testQuery = query;
                return PromiseHelper.resolve();
            };
            XcalarGetTableMeta = function(tableName) {
                testTable = tableName;
                return PromiseHelper.resolve();
            };
            TblManager.refreshTable = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            XcalarGetDag = function() {
                return PromiseHelper.resolve({node: []});
            }
            Transaction.cancel = function() {
                test = false;
            }

            sqlApi.run("testQuery", "testTable")
            .fail(function() {
                done("fail");
            })
            .then(function() {
                expect(test).to.be.true;
                expect(testQuery).to.equal("testQuery");
                expect(testTable).to.equal("testTable");
                done();
            })
            .always(function() {
                XIApi.query = oldQuery;
                XcalarGetTableMeta = oldGetMeta;
                TblManager.refreshTable = oldRefresh;
                XcalarGetDag = oldGetDag;
                Transaction.cancel = oldCancel;
                sqlApi.status = undefined;
            });
        });

        it("run should handle fail case", function(done) {
            var oldQuery = XIApi.query;
            var oldFail = Transaction.fail;
            var test = false;

            XIApi.query = function() {
                return PromiseHelper.reject("test error");
            };
            Transaction.fail = function() { test = true; };

            sqlApi.run("testQuery", "testTable")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(test).to.be.true;
                expect(error).to.equal("test error");
                done();
            })
            .always(function() {
                XIApi.query = oldQuery;
                Transaction.fail = oldFail;
                sqlApi.status = undefined;
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
                expect(res.newColumns).to.equal("testCols");
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
            XIApi.union = function() {
                return PromiseHelper.resolve("testTable", "testCols");
            };

            sqlApi.union()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.newColumns).to.equal("testCols");
                expect(res.cli).to.equal("test query:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.union = oldUnion;
            });
        });

        it("groupBy should work", function(done) {
            var oldGroupBy = XIApi.groupBy;
            XIApi.groupBy = function() {
                return PromiseHelper.resolve("testTable", "testCols", "renamedCols");
            };

            sqlApi.groupBy([])
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.newColumns).to.equal("testCols");
                expect(res.renamedColumns).to.equal("renamedCols");
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
            var oldProject = XIApi.project;
            XIApi.project = function() {
                return PromiseHelper.resolve("testTable");
            };

            sqlApi.project()
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
                XIApi.project = oldProject;
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