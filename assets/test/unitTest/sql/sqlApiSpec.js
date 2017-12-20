describe("SQL-SQlApi Test", function() {
    describe("Static Function Test", function() {
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
            expect(Object.keys(sqlApi).length).to.equal(0);
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
                    }]
                });
            };

            sqlApi._getQueryTableCols("testTable", [{colName: "test"}])
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

        it("run should work", function(done) {
            var oldQuery = XIApi.query;
            var oldGetMeta = XcalarGetTableMeta;
            var oldRefresh = TblManager.refreshTable;
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

            sqlApi.run("testQuery", "testTable")
            .then(function() {
                expect(test).to.be.true;
                expect(testQuery).to.equal("testQuery");
                expect(testTable).to.equal("testTable");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.query = oldQuery;
                XcalarGetTableMeta = oldGetMeta;
                TblManager.refreshTable = oldRefresh;
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

        it("groupBy should work", function(done) {
            var oldGroupBy = XIApi.groupBy;
            XIApi.groupBy = function() {
                return PromiseHelper.resolve("testTable", "testCols", "renamedCols");
            };

            sqlApi.groupBy()
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

        after(function() {
            Transaction.start = oldStart;
            Transaction.done = oldEnd;
        });
    });
});