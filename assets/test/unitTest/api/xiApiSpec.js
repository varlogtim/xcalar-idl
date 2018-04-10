describe('XIApi Test', () => {
    describe('Basic API Test', () => {
        it('isCorrectTableNameFormat should work', () => {
            const isCorrectTableNameFormat = XIApi.__testOnly__.isCorrectTableNameFormat;
            expect(isCorrectTableNameFormat(null)).to.be.false;
            expect(isCorrectTableNameFormat("")).to.be.false;

            window.sqlMode = true;
            expect(isCorrectTableNameFormat("table")).to.be.true;

            window.sqlMode = false;
            expect(isCorrectTableNameFormat("table")).to.be.false;
            expect(isCorrectTableNameFormat("table#ab12")).to.be.false;
            expect(isCorrectTableNameFormat("table#12")).to.be.true;
        });

        it('isValidTableName should work', () => {
            const isValidTableName = XIApi.__testOnly__.isValidTableName;
            expect(isValidTableName("table")).to.be.false;
            expect(isValidTableName("ta&ble#123")).to.be.false;
            expect(isValidTableName("table#123")).to.be.true;
            expect(isValidTableName("tab&.le#123")).to.be.false;
            expect(isValidTableName("tab.le#123")).to.be.true;
        });

        it('isValidAggName should work', () => {
            const tests = [{
                name: 'ab#12',
                expect: true
            }, {
                name: 'ab#ab12',
                expect: false
            }, {
                name: 'a&b#12',
                expect: false
            }, {
                name: 'test',
                expect: true
            }, {
                name: 'te&st',
                expect: false
            }];

            tests.forEach((test) => {
                const res = XIApi.__testOnly__.isValidAggName(test.name);
                expect(res).to.equal(test.expect);
            });
        });

        it('isValidPrefix should work', function() {
            const tests = [{
                name: null,
                expect: false
            }, {
                name: '',
                expect: false
            }, {
                name: 'ab12',
                expect: true
            }, {
                name: 'te&st',
                expect: false
            }];

            tests.forEach((test) => {
                const res = XIApi.__testOnly__.isValidPrefix(test.name);
                expect(res).to.equal(test.expect);
            });
        });

        it('getNewTableName should work', () => {
            const getNewTableName = XIApi.__testOnly__.getNewTableName;
            const res = getNewTableName('test');
            expect(res).to.contains('test');
            expect(res).not.to.equal('test');

            // case 2
            const res2 = getNewTableName('test', 'affix');
            expect(res2).to.contains('testaffix');

            // case 3
            const res3 = getNewTableName('test', 'affix', true);
            expect(res3).to.contains('testaffix');
            expect(res3.length > res2.length).to.be.true;
        });

        it('getNewJoinTableName should work', () => {
            const getNewJoinTableName = XIApi.__testOnly__.getNewJoinTableName;
            const res = getNewJoinTableName('leftTable', 'rightTable', 'test#12');
            expect(res).to.equal('test#12');

            // case 2
            const res2 = getNewJoinTableName('leftTable', 'rightTable', 'test');
            expect(res2).to.contains('leftT-right');
        });

        it('convertOp shuold work', () => {
            const convertOp = XIApi.__testOnly__.convertOp;
            expect(convertOp('')).to.equal('');
            expect(convertOp('Count')).to.equal('count');
            expect(convertOp('MaxInteger')).to.equal('maxInteger');
        });

        it('parseAggOps should work', () => {
            const parseAggOps = XIApi.__testOnly__.parseAggOps;
            const res1 = parseAggOps(null);
            expect(res1).to.be.instanceOf(Set);
            expect(res1.size).to.equal(9);

            const res2 = parseAggOps({
                fnDescs: [{
                    fnName: 'Test'
                }]
            });
            expect(res2).to.be.instanceOf(Set);
            expect(res2.size).to.equal(1);
            expect(res2.has('Test')).to.be.true;
        });

        it('isSameKey should work', () => {
            const isSameKey = XIApi.__testOnly__.isSameKey;
            expect(isSameKey(['a'], ['b'])).to.be.false;
            expect(isSameKey(['a'], ['a', 'b'])).to.be.false;
            expect(isSameKey(['a'], ['a'])).to.be.true;
        });

        it('getUnusedImmNames should work', () => {
            const getUnusedImmNames = XIApi.__testOnly__.getUnusedImmNames;
            expect(getUnusedImmNames().length).to.equal(0);

            const res = getUnusedImmNames(['a', 'b', 'c'], ['a'], [{new: 'b'}]);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal('c');
        });
    });

    describe('Public Function Test', () => {
        let oldGetId;

        before(() => {
            oldGetId = Authentication.getHashId;
            Authentication.getHashId = () => '#12';
        });

        it('XIApi.filter should work', (done) => {
            const oldFunc = XcalarFilter;
            XcalarFilter = () => PromiseHelper.resolve();

            XIApi.filter(1, 'eq(a, 1)', 'test#1')
            .then((newTableName) => {
                expect(newTableName).to.equal('test#12');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarFilter = oldFunc;
            });
        });

        it('XIApi.filter should reject fail case', (done) => {
            XIApi.filter()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid args in filter');
                done();
            });
        });

        it('XIApi.genAggStr should work', (done) => {
            const oldFunc = XcalarListXdfs;
            XcalarListXdfs = () => PromiseHelper.resolve(null);

            XIApi.genAggStr('test', 'op')
            .then((res) => {
                expect(res).to.equal('');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarListXdfs = oldFunc;
            });
        });

        it('XIApi.genAggStr should work case2', (done) => {
            const oldFunc = XcalarListXdfs;
            XcalarListXdfs = () => PromiseHelper.resolve(null);

            XIApi.genAggStr('test', 'Count')
            .then((res) => {
                expect(res).to.equal('count(test)');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarListXdfs = oldFunc;
            });
        });

        it('XIApi.aggregateWithEvalStr should work', (done) => {
            const oldAgg = XcalarAggregate;
            const oldDelete = XIApi.deleteTable;

            XcalarAggregate = function() {
                return PromiseHelper.resolve({'Value': 1});
            };

            XIApi.deleteTable = function() {
                return PromiseHelper.resolve();
            };

            XIApi.aggregateWithEvalStr(1, 'count(a)', 'a#1')
            .then((val, dstAggName) => {
                expect(val).to.equal(1);
                expect(dstAggName).to.contains('a');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarAggregate = oldAgg;
                XIApi.deleteTable = oldDelete;
            });
        });

        it('XIApi.aggregateWithEvalStr should handle invalid case', (done) => {
            XIApi.aggregateWithEvalStr()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal("Invalid args in aggregate");
                done();
            });
        });

        it('XIApi.aggregate should work', (done) => {
            const oldGenAgg = XIApi.genAggStr;
            const oldAgg = XIApi.aggregateWithEvalStr;

            XIApi.genAggStr = function() {
                return PromiseHelper.resolve("count(1)");
            };

            XIApi.aggregateWithEvalStr = () => {
                return PromiseHelper.resolve('test');
            };

            XIApi.aggregate(1, 'count', 'test', 'a#1', 'a#2')
            .then((res) => {
                expect(res).to.equal('test');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.genAggStr = oldGenAgg;
                XIApi.aggregateWithEvalStr = oldAgg;
            });
        });

        it('XIApi.aggregate should handle invalid case', (done) => {
            XIApi.aggregate()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal("Invalid args in aggregate");
                done();
            });
        });

        it('XIApi.checkOrder should work', (done) => {
            const oldFunc = XcalarGetTableMeta;
            const ret = {
                "keyAttr": [{
                    "name": "user::test",
                    "valueArrayIndex": 0,
                    "ordering": 1
                }],
                "valueAttrs": [{
                    "name": "user",
                    "type": DfFieldTypeT.DfFatptr
                }],
                ordering: XcalarOrderingTStr[3]
            };
            XcalarGetTableMeta = () => PromiseHelper.resolve(ret);

            XIApi.checkOrder('test1')
            .then((ordering, keys) => {
                expect(ordering).to.equal(XcalarOrderingTStr[3]);
                expect(keys[0].name).to.equal("user::test");
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarGetTableMeta = oldFunc;
            });
        });

        it('XIApi.checkOrder should use gTable caches', (done) => {
            const tableId = 'test12';
            const table = new TableMeta({
                tableName: 'test#' + tableId,
                tableId: tableId
            });
            table.keys = [];
            table.ordering = 3;
            gTables[tableId] = table;

            XIApi.checkOrder(table.getName())
            .then((ordering, keys) => {
                expect(ordering).to.be.equal(3);
                expect(keys.length).to.equal(0);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
               delete gTables[tableId];
            });
        });

        it('XIApi.checkOrder should skip simulate case', (done) => {
            const oldFunc = Transaction.isSimulate;
            Transaction.isSimulate = () => true;

            XIApi.checkOrder('test#1', 1)
            .then((ordering, keys) => {
                expect(ordering).to.be.null;
                expect(keys.length).to.equal(0);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                Transaction.isSimulate = oldFunc;
            });
        });

        it('XIApi.checkOrder should reject invalid case', (done) => {
            XIApi.checkOrder()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid args in checkOrder');
                done();
            });
        });

        it('XIApi.load should work', (done) => {
            const oldFunc = XcalarLoad;
            let test = false
            XcalarLoad = () => {
                test = true;
                return PromiseHelper.resolve();
            };

            XIApi.load({url: 'test'}, {format: 'CSV'}, 'test', 1)
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarLoad = oldFunc;
            });
        });

        it('XIApi.load should reject invalid case', (done) => {
            XIApi.load()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid args in load');
                done();
            });
        });

        it('XIApi.indexFromDataset should work', (done) => {
            const oldFunc = XcalarIndexFromDataset;
            XcalarIndexFromDataset = () => PromiseHelper.resolve();

            XIApi.indexFromDataset(0, 'dsName', 'test', 'prefix')
            .then((newTableName, prefix) => {
                expect(newTableName).to.equal('test#12');
                expect(prefix).to.equal('prefix');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarIndexFromDataset = oldFunc;
            });
        });

        it('XIApi.indexFromDataset should reject invalid case', (done) => {
            XIApi.indexFromDataset()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid args in indexFromDataset');
                done();
            });
        });

        it.skip('XIApi.index should work', (done) => {
            // XIApi.index()
            // .then(() => {
            //     done();
            // })
            // .fail(() => {
            //     done('fail');
            // })
            // .always(() => {
            //     XcalarIndexFromDataset = oldFunc;
            // });
        });

        it('XIApi.index should reject invalid case', (done) => {
            XIApi.index()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid args in index');
                done();
            });
        });

        it.skip('XIApi.sort should work', (done) => {
            // XIApi.index()
            // .then(() => {
            //     done();
            // })
            // .fail(() => {
            //     done('fail');
            // })
            // .always(() => {
            //     XcalarIndexFromDataset = oldFunc;
            // });
        });

        it('XIApi.sort should reject invalid case', (done) => {
            XIApi.sort()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid args in sort');
                done();
            });
        });

        it('XIApi.sortAscending should work', (done) => {
            const oldFunc = XIApi.sort;
            let testInfos;
            XIApi.sort = (txId, colInfos) => {
                testInfos = colInfos;
                return PromiseHelper.resolve();
            };

            XIApi.sortAscending(1, 'testCol', 'table')
            .then(() => {
                expect(testInfos).to.be.an('array');
                expect(testInfos.length).to.equal(1);
                expect(testInfos[0].name).to.equal('testCol');
                expect(testInfos[0].ordering).to.equal(XcalarOrderingT.XcalarOrderingAscending);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.sort = oldFunc;
            });
        });

        it('XIApi.sortDescending should work', (done) => {
            const oldFunc = XIApi.sort;
            let testInfos;
            XIApi.sort = (txId, colInfos) => {
                testInfos = colInfos;
                return PromiseHelper.resolve();
            };

            XIApi.sortDescending(1, 'testCol', 'table')
            .then(() => {
                expect(testInfos).to.be.an('array');
                expect(testInfos.length).to.equal(1);
                expect(testInfos[0].name).to.equal('testCol');
                expect(testInfos[0].ordering).to.equal(XcalarOrderingT.XcalarOrderingDescending);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.sort = oldFunc;
            });
        });

        it('XIApi.map should work', (done) => {
            const oldFunc = XcalarMap;
            XcalarMap = () => PromiseHelper.resolve();

            XIApi.map(1, ['concat(a)'], 'table', 'newCol')
            .then((newTableName) => {
                expect(newTableName).to.equal('table#12');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarMap = oldFunc;
            });
        });

        it('XIApi.map should reject invalid case', (done) => {
            XIApi.map()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid args in map');
                done();
            });
        });

        after(() => {
            Authentication.getHashId = oldGetId;
        });
    });
});