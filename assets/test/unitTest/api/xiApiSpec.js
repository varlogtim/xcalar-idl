describe('XIApi Test', () => {
    let oldGetId;

    before(() => {
        oldGetId = Authentication.getHashId;
        Authentication.getHashId = () => '#12';
    });

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

        it('isValidPrefix should work', function () {
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

        it('getUnusedImmNames should work', () => {
            const getUnusedImmNames = XIApi.__testOnly__.getUnusedImmNames;
            expect(getUnusedImmNames().length).to.equal(0);

            const res = getUnusedImmNames(['a', 'b', 'c'], ['a'], [{ new: 'b' }]);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal('c');
        });
    });

    describe('Index Helper Test', () => {
        it('isSameKey should work', () => {
            const isSameKey = XIApi.__testOnly__.isSameKey;
            expect(isSameKey(['a'], ['b'])).to.be.false;
            expect(isSameKey(['a'], ['a', 'b'])).to.be.false;
            expect(isSameKey(['a'], ['a'])).to.be.true;
        });

        describe('checkIfNeedIndex Test', () => {
            let checkIfNeedIndex;
            const tableName = "testTable";
            const parentTable = "testParentTable";
            let ASC;
            const txId = 1;
            let oldGetUnsortedTableName;
            let oldCheckOrder;
            let oldIndex;

            before(() => {
                ASC = XcalarOrderingT.XcalarOrderingAscending;
                checkIfNeedIndex = XIApi.__testOnly__.checkIfNeedIndex;
                oldGetUnsortedTableName = getUnsortedTableName;
                oldCheckOrder = XIApi.checkOrder;
                oldIndex = XcalarIndexFromTable;
                Authentication.getHashId = () => '#12';
                getUnsortedTableName = () => PromiseHelper.resolve(tableName);
                XcalarIndexFromTable = () => PromiseHelper.resolve();
            });

            it('should resolve true when no cols to index', (done) => {
                checkIfNeedIndex([], tableName, [{ name: 'key' }], ASC, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.false;
                        expect(tName).to.equal(tableName);
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should resolve true when table is sorted but on different keys', (done) => {
                checkIfNeedIndex(['key'], tableName, [{ name: 'key2' }], ASC, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.true;
                        expect(tName).to.equal(tableName);
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it("should resolve true when it's invalid order", (done) => {
                const order = XcalarOrderingT.XcalarOrderingInvalid;
                checkIfNeedIndex(['key'], tableName, [{ name: 'key' }], order, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.true;
                        expect(tName).to.equal(tableName);
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it("should resolve false when it's the same key", (done) => {
                checkIfNeedIndex(['key'], tableName, [{ name: 'key' }], ASC, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.false;
                        expect(tName).to.equal(tableName);
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should resolve false when parent table has the same key as col to index', (done) => {
                getUnsortedTableName = () => PromiseHelper.resolve(parentTable);
                XIApi.checkOrder = () => PromiseHelper.resolve(ASC, [{ name: 'col' }]);

                checkIfNeedIndex(['col'], tableName, [{ name: 'key' }], ASC, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.false;
                        expect(tName).to.equal(parentTable);
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should resolve true when parent table has the same key as table keys', (done) => {
                getUnsortedTableName = () => PromiseHelper.resolve(parentTable);
                XIApi.checkOrder = () => PromiseHelper.resolve(ASC, [{ name: 'key' }]);

                checkIfNeedIndex(['col'], tableName, [{ name: 'key' }], ASC, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.true;
                        expect(tName).to.equal(parentTable);
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should resolve false when parent table has different key but col to index is equal to table key', (done) => {
                getUnsortedTableName = () => PromiseHelper.resolve(parentTable);
                XIApi.checkOrder = () => PromiseHelper.resolve(ASC, [{ name: 'col' }]);

                checkIfNeedIndex(['key'], tableName, [{ name: 'key' }], ASC, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.false;
                        expect(tName).to.not.equal(parentTable);
                        expect(tName).to.not.equal(tableName);
                        expect(tempTables.length).to.equal(1);
                        expect(tempTables[0]).to.equal(tName);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should resolve true when parent table has different key and col to index is different from table key', (done) => {
                getUnsortedTableName = () => PromiseHelper.resolve(parentTable);
                XIApi.checkOrder = () => PromiseHelper.resolve(ASC, [{ name: 'col2' }]);

                checkIfNeedIndex(['col'], tableName, [{ name: 'key' }], ASC, txId)
                    .then((shdoulIndex, tName, tempTables) => {
                        expect(shdoulIndex).to.be.true;
                        expect(tName).to.not.equal(parentTable);
                        expect(tName).to.not.equal(tableName);
                        expect(tempTables.length).to.equal(1);
                        expect(tempTables[0]).to.equal(tName);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            after(() => {
                getUnsortedTableName = oldGetUnsortedTableName;
                XIApi.checkOrder = oldCheckOrder;
                XcalarIndexFromTable = oldIndex;
            });
        });

        describe('checkTableIndex Test', () => {
            let checkTableIndex;
            const txId = 0;
            let oldGetUnsortedTableName;
            let oldCheckOrder;
            let oldIndex;
            let ASC;
            const tableName = 'testTable';

            before(() => {
                checkTableIndex = XIApi.__testOnly__.checkTableIndex;

                oldGetUnsortedTableName = getUnsortedTableName;
                oldCheckOrder = XIApi.checkOrder;
                oldIndex = XcalarIndexFromTable;
                ASC = XcalarOrderingT.XcalarOrderingAscending;

                Authentication.getHashId = () => '#12';
                getUnsortedTableName = () => PromiseHelper.resolve(tableName);
                XcalarIndexFromTable = () => PromiseHelper.resolve({ newKeys: ['newKey'] });
                XIApi.checkOrder = () => PromiseHelper.resolve(ASC, [{ name: 'col' }]);
            });

            it('should return result when there is SQL cache', (done) => {
                const isSimulate = Transaction.isSimulate;
                const isEdit = Transaction.isEdit;
                const getIndexTable = SQLApi.getIndexTable;

                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: 'indexTable', keys: ['key'] }
                };

                checkTableIndex(txId, ['col'], 'testTable#abc', false)
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.indexTable).to.equal('indexTable');
                        expect(res.indexKeys[0]).to.equal('key');
                        expect(res.tempTables.length).to.equal(0);
                        expect(res.hasIndexed).to.be.true;
                        expect(res.isCache).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        Transaction.isEdit = isEdit;
                        Transaction.isSimulate = isSimulate;
                        SQLApi.getIndexTable = getIndexTable;
                    });
            });

            it('should return result when there is gTables cache', (done) => {
                const tableId = 'abc';
                const table = new TableMeta({
                    tableId: tableId,
                    tableName: 'testTable#' + tableId
                });
                const indexTableId = 'efg';
                const indexTable = new TableMeta({
                    tableId: indexTableId,
                    tableName: 'testTable#' + indexTableId
                });
                gTables[tableId] = table;
                gTables[indexTableId] = indexTable;
                table.setIndexTable(['col'], indexTable.getName(), ['key']);

                let oldAddIndex = QueryManager.addIndexTable;
                let test = false;
                QueryManager.addIndexTable = () => { test = true };

                checkTableIndex(txId, ['col'], table.getName(), false)
                    .then((res) => {
                        expect(test).to.equal(true);
                        expect(res).to.be.an('object');
                        expect(res.indexTable).to.equal(indexTable.getName());
                        expect(res.indexKeys[0]).to.equal('key');
                        expect(res.tempTables.length).to.equal(0);
                        expect(res.hasIndexed).to.be.true;
                        expect(res.isCache).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        delete gTables[tableId];
                        delete gTables[indexTableId];
                        QueryManager.addIndexTable = oldAddIndex;
                    });
            });

            it("should resolve when index correctly", (done) => {
                checkTableIndex(txId, ['col'], tableName, false)
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.indexTable).to.equal(tableName);
                        expect(res.indexKeys[0]).to.equal('col');
                        expect(res.tempTables.length).to.equal(0);
                        expect(res.hasIndexed).to.be.false;
                        expect(res.isCache).to.be.false;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it("should resolve and index", (done) => {
                const oldFunc = TblManager.setOrphanTableMeta;
                let test = false;
                TblManager.setOrphanTableMeta = () => { test = true };

                checkTableIndex(txId, ['key'], tableName, false)
                    .then((res) => {
                        expect(test).to.be.true;
                        expect(res).to.be.an('object');
                        expect(res.indexTable).not.to.equal(tableName);
                        expect(res.indexKeys[0]).to.equal('newKey');
                        expect(res.tempTables.length).to.equal(1);
                        expect(res.hasIndexed).to.be.true;
                        expect(res.isCache).to.be.false;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        TblManager.setOrphanTableMeta = oldFunc;
                    });
            });

            it("should resolve when already indexed", (done) => {
                const oldFunc = XcalarIndexFromTable;
                XcalarIndexFromTable = () => PromiseHelper.reject({
                    code: StatusT.StatusAlreadyIndexed
                });

                checkTableIndex(txId, ['key'], tableName, false)
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.indexTable).to.equal(tableName);
                        expect(res.indexKeys[0]).to.equal('key');
                        expect(res.tempTables.length).to.equal(0);
                        expect(res.hasIndexed).to.be.false;
                        expect(res.isCache).to.be.false;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarIndexFromTable = oldFunc;
                    });
            });

            it("should fail when index call fails", (done) => {
                const oldFunc = XcalarIndexFromTable;
                let test = false;
                XcalarIndexFromTable = () => {
                    test = true;
                    return PromiseHelper.reject({});
                };

                checkTableIndex(txId, ['key'], tableName, false)
                    .then(() => {
                        done('fail');
                    })
                    .fail(() => {
                        expect(test).to.be.true;
                        done();
                    })
                    .always(() => {
                        XcalarIndexFromTable = oldFunc;
                    });
            });

            after(() => {
                getUnsortedTableName = oldGetUnsortedTableName;
                XIApi.checkOrder = oldCheckOrder;
                XcalarIndexFromTable = oldIndex;
            });
        });
    });

    describe('Cast Helper Test', () => {
        describe('getCastInfo Test', () => {
            let getCastInfo;

            before(() => {
                getCastInfo = XIApi.__testOnly__.getCastInfo;
            });

            it('should cast when has cast type', () => {
                const res = getCastInfo('test#abc', ['prefix::col'], [ColumnType.integer], {
                    overWrite: true
                });
                expect(res).to.be.an('object');
                expect(res.mapStrs.length).to.equal(1);
                expect(res.mapStrs[0]).to.equal('int(prefix::col, 10)');
                expect(res.newFields.length).to.equal(1);
                expect(res.newFields[0]).to.equal('col');
                expect(res.newColNames.length).to.equal(1);
                expect(res.newColNames[0]).to.equal('col');
                expect(res.newTypes.length).to.equal(1);
                expect(res.newTypes[0]).to.equal(ColumnType.integer);
            });

            it('should cast on fatPtr when no meta', () => {
                const res = getCastInfo('test#abc', ['prefix::col'], [null], {
                    overWrite: true,
                    castPrefix: true
                });
                expect(res).to.be.an('object');
                expect(res.mapStrs.length).to.equal(1);
                expect(res.mapStrs[0]).to.equal('string(prefix::col)');
                expect(res.newFields.length).to.equal(1);
                expect(res.newFields[0]).to.equal('col');
                expect(res.newColNames.length).to.equal(1);
                expect(res.newColNames[0]).to.equal('col');
                expect(res.newTypes.length).to.equal(1);
                expect(res.newTypes[0]).to.equal(ColumnType.string);
            });

            it('should cast on fatPtr with gTables meta', () => {
                const col = 'prefix::col';
                const progCol = ColManager.newPullCol(col, col, ColumnType.integer);
                const tableId = 'abc';
                const table = new TableMeta({
                    tableId: tableId,
                    tableName: 'test#abc',
                    tableCols: [progCol]
                });
                gTables[tableId] = table;
                const res = getCastInfo(table.getName(), [col], [null], {
                    castPrefix: true
                });
                const newName = xcHelper.convertPrefixName('prefix', 'col');
                expect(res).to.be.an('object');
                expect(res.mapStrs.length).to.equal(1);
                expect(res.mapStrs[0]).to.equal('int(prefix::col, 10)');
                expect(res.newFields.length).to.equal(1);
                expect(res.newFields[0]).not.to.equal(newName);
                expect(res.newFields[0]).to.contains(newName);
                expect(res.newColNames.length).to.equal(1);
                expect(res.newColNames[0]).to.contains(newName);
                expect(res.newTypes.length).to.equal(1);
                expect(res.newTypes[0]).to.equal(ColumnType.integer);

                delete gTables[tableId];
            });

            it('should handle name confilct', () => {
                const res = getCastInfo('test#abc', ['prefix::col', 'col'], [null, ColumnType.integer], {
                    overWrite: true,
                    castPrefix: true
                });
                expect(res).to.be.an('object');
                expect(res.mapStrs.length).to.equal(2);
                expect(res.mapStrs[0]).to.equal('string(prefix::col)');
                expect(res.newFields.length).to.equal(2);
                expect(res.newFields[0]).not.to.equal('col');
                expect(res.newColNames.length).to.equal(2);
                expect(res.newColNames[0]).not.to.equal('col');
                expect(res.newTypes.length).to.equal(2);
                expect(res.newTypes[0]).to.equal(ColumnType.string);
            });
        });

        describe('castColumns Test', () => {
            let castColumns;
            const txId = 0;
            const tableName = 'testTable#abc';

            before(() => {
                castColumns = XIApi.__testOnly__.castColumns;
                Authentication.getHashId = () => '#12';
            });

            it('should return when there is no column to cast', (done) => {
                castColumns(txId, tableName, ['col'], [null])
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.tableName).to.equal(tableName);
                        expect(res.colNames.length).to.equal(1);
                        expect(res.colNames[0]).to.equal('col');
                        expect(res.types.length).to.equal(1);
                        expect(res.types[0]).to.equal(null);
                        expect(res.newTable).to.be.false;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should cast', (done) => {
                const oldMap = XIApi.map;
                const oldSetMeta = TblManager.setOrphanTableMeta;

                XIApi.map = () => PromiseHelper.resolve();
                TblManager.setOrphanTableMeta = () => { };

                castColumns(txId, tableName, ['col'], [ColumnType.integer], { overWrite: true })
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.tableName).not.to.equal(tableName);
                        expect(res.colNames.length).to.equal(1);
                        expect(res.colNames[0]).to.equal('col');
                        expect(res.types.length).to.equal(1);
                        expect(res.types[0]).to.equal(ColumnType.integer);
                        expect(res.newTable).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                        TblManager.setOrphanTableMeta = oldSetMeta;
                    });
            });
        });
    });

    describe('Join Helper Test', () => {
        describe('joinCast Tesst', () => {
            let joinCast;
            const txId = 0;

            before(() => {
                joinCast = XIApi.__testOnly__.joinCast;
            });

            it('should resolve when no columns to join', (done) => {
                const lInfo = {
                    tableName: 'l#abc',
                    columns: []
                };
                const rInfo = {
                    tableName: 'r#efg',
                    columns: []
                }
                joinCast(txId, lInfo, rInfo)
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.lTableName).to.equal('l#abc');
                        expect(res.lColNames.length).to.equal(0);
                        expect(res.rTableName).to.equal('r#efg');
                        expect(res.rColNames.length).to.equal(0);
                        expect(res.tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should resolve with cast result', (done) => {
                const oldMap = XIApi.map;
                const oldSetMeta = TblManager.setOrphanTableMeta;

                XIApi.map = () => PromiseHelper.resolve();
                TblManager.setOrphanTableMeta = () => { };

                const lInfo = {
                    tableName: 'l#abc',
                    columns: ['lCol'],
                    casts: [ColumnType.integer]
                };
                const rInfo = {
                    tableName: 'r#efg',
                    columns: ['rCol'],
                    casts: [ColumnType.integer]
                }
                joinCast(txId, lInfo, rInfo)
                    .then((res) => {
                        expect(res).to.be.an('object');
                        expect(res.lTableName).not.to.equal('l#abc');
                        expect(res.lColNames.length).to.equal(1);
                        expect(res.lColNames[0]).not.to.equal('lCol');
                        expect(res.rTableName).not.to.equal('r#efg');
                        expect(res.rColNames.length).to.equal(1);
                        expect(res.rColNames[0]).not.to.equal('rCol');
                        expect(res.tempTables.length).to.equal(2);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                        TblManager.setOrphanTableMeta = oldSetMeta;
                    });
            });

            it('should fail when thrift call fails', (done) => {
                const oldMap = XIApi.map;

                XIApi.map = () => PromiseHelper.reject({ error: 'test' });
                const lInfo = {
                    tableName: 'l#abc',
                    columns: ['lCol'],
                    casts: [ColumnType.integer]
                };
                const rInfo = {
                    tableName: 'r#efg',
                    columns: ['rCol'],
                    casts: [ColumnType.integer]
                }
                joinCast(txId, lInfo, rInfo)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error.error).to.equal('test');
                        done();
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                    });
            });
        });

        describe('joinIndex Test', () => {
            let joinIndex;
            const txId = 0;
            const tableName = 'testTable';
            let oldIsSimulate;
            let oldIsEdit;
            let oldGetIndexCache;

            before(() => {
                joinIndex = XIApi.__testOnly__.joinIndex;

                oldIsSimulate = Transaction.isSimulate;
                oldIsEdit = Transaction.isEdit;
                oldGetIndexCache = SQLApi.getIndexTable;

                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: tableName, keys: ['key'] };
                }
            });

            it('should handle invalid case', (done) => {
                joinIndex(txId, {
                    lColNames: ['lCol'],
                    rColNames: []
                })
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.be.a('string');
                        done();
                    });
            });

            it('should handle cross join case', (done) => {
                joinIndex(txId, {
                    lTableName: 'l#abc',
                    lColNames: [],
                    rTableName: 'r#efg',
                    rColNames: []
                })
                    .then((lRes, rRes) => {
                        expect(lRes.tableName).to.equal('l#abc');
                        expect(lRes.oldKeys.length).to.equal(0);
                        expect(lRes.newKeys.length).to.equal(0);
                        expect(rRes.tableName).to.equal('r#efg');
                        expect(rRes.oldKeys.length).to.equal(0);
                        expect(rRes.newKeys.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle self join case', (done) => {
                const oldFilter = XcalarFilter;
                let test = false;
                XcalarFilter = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                joinIndex(txId, {
                    lTableName: tableName,
                    lColNames: ['key'],
                    rTableName: tableName,
                    rColNames: ['key']
                }, true)
                    .then((lRes, rRes, tempTables) => {
                        expect(test).to.be.true;
                        expect(lRes.tableName).to.equal(tableName);
                        expect(lRes.oldKeys.length).to.equal(1);
                        expect(lRes.oldKeys[0]).to.equal('key');
                        expect(lRes.newKeys.length).to.equal(1);
                        expect(lRes.newKeys[0]).to.equal('key');
                        expect(rRes.tableName).to.equal(tableName);
                        expect(rRes.oldKeys.length).to.equal(1);
                        expect(rRes.oldKeys[0]).to.equal('key');
                        expect(rRes.newKeys.length).to.equal(1);
                        expect(rRes.newKeys[0]).to.equal('key');
                        expect(tempTables.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarFilter = oldFilter;
                    });
            });

            it('should handle self join fail case', (done) => {
                const oldIsSimulate = Transaction.isSimulate;
                const oldCheckOrder = XIApi.checkOrder;
                XIApi.checkOrder = () => PromiseHelper.reject({ error: 'test' });
                Transaction.isSimulate = () => false;

                joinIndex(txId, {
                    lTableName: tableName,
                    lColNames: ['key'],
                    rTableName: tableName,
                    rColNames: ['key']
                })
                    .then(() => {
                        done('fail');
                    })
                    .fail((...arg) => {
                        expect(arg.length).to.equal(1);
                        expect(arg[0].error).to.equal('test');
                        done();
                    })
                    .always(() => {
                        XIApi.checkOrder = oldCheckOrder;
                        Transaction.isSimulate = oldIsSimulate;
                    });
            });

            it('should work on normal case', (done) => {
                joinIndex(txId, {
                    lTableName: tableName,
                    lColNames: ['key'],
                    rTableName: tableName,
                    rColNames: ['key2']
                }, false)
                    .then((lRes, rRes, tempTables) => {
                        expect(lRes.tableName).to.equal(tableName);
                        expect(lRes.oldKeys.length).to.equal(1);
                        expect(lRes.oldKeys[0]).to.equal('key');
                        expect(lRes.newKeys.length).to.equal(1);
                        expect(lRes.newKeys[0]).to.equal('key');
                        expect(rRes.tableName).to.equal(tableName);
                        expect(rRes.oldKeys.length).to.equal(1);
                        expect(rRes.oldKeys[0]).to.equal('key2');
                        expect(rRes.newKeys.length).to.equal(1);
                        expect(rRes.newKeys[0]).to.equal('key');
                        expect(tempTables.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('resolveJoinColRename should work', () => {
                const resolveJoinColRename = XIApi.__testOnly__.resolveJoinColRename;
                let lRename = [];
                let rRename = [];
                let lImm = [];
                let rImm = [];
                const lIndexRes = { newKeys: [], oldKeys: [] };
                const rIndexRes = { newKeys: [], oldKeys: [] };
                resolveJoinColRename(lRename, rRename, lIndexRes, rIndexRes, lImm, rImm);
                expect(lRename.length).to.equal(0);
                expect(rRename.length).to.equal(0);

                // case 2
                rImm = ['a', 'b', 'c', 'd'];
                rIndexRes.newKeys.push('a');
                rRename = [{ orig: 'old', new: 'b' }];
                lIndexRes.newKeys.push('d');
                lIndexRes.oldKeys.push('old');

                resolveJoinColRename(lRename, rRename, lIndexRes, rIndexRes, lImm, rImm);
                expect(lRename.length).to.equal(1);
                expect(lRename[0].orig).to.equal('d');
                expect(lRename[0].new).not.to.equal('d');
                expect(lRename[0].new).to.contains('d');
                expect(rRename.length).to.equal(1);
            });

            after(() => {
                Transaction.isSimulate = oldIsSimulate;
                Transaction.isEdit = oldIsEdit;
                SQLApi.getIndexTable = oldGetIndexCache;
            });
        });

        describe('semiJoinHelper Test', () => {
            const txId = 0;
            let oldGroupBy;
            let oldJoin;
            let oldFilter;
            let oldMap;
            let testJoinTableName;
            let testJoinType;

            let semiJoinHelper;

            before(() => {
                oldGroupBy = XcalarGroupByWithEvalStrings;
                oldJoin = XcalarJoin;

                XcalarGroupByWithEvalStrings = () => PromiseHelper.resolve();

                XcalarJoin = (lTable, rTable, newTableName, joinType) => {
                    testJoinTableName = newTableName;
                    testJoinType = joinType;
                    return PromiseHelper.resolve();
                };

                semiJoinHelper = XIApi.__testOnly__.semiJoinHelper;
            });

            beforeEach(() => {
                testJoinTableName = null;
                testJoinType = null;
            });

            it("should work for anti semi join", (done) => {
                const oldFunc = XcalarFilter;
                const joinType = JoinCompoundOperatorTStr.LeftAntiSemiJoin;
                const tempTables = [];

                let test = false;
                XcalarFilter = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                semiJoinHelper(txId, 'l#a', 'r#b', ['col'], 'new#c', joinType,
                    [], [], tempTables, null)
                    .then((res) => {
                        expect(test).to.be.true;
                        expect(tempTables.length).to.equal(1);
                        expect(res.tempCols[0]).to.contains("XC_GB_COL");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarFilter = oldFunc;
                    });
            });

            it("should work for existence join", (done) => {
                const oldFunc = XcalarMap;
                const joinType = JoinCompoundOperatorTStr.ExistenceJoin;
                const tempTables = [];

                let test = false;
                XcalarMap = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                semiJoinHelper(txId, 'l#a', 'r#b', ['col'], 'new#c', joinType,
                    [], [], tempTables, 'existenceCol')
                    .then((res) => {
                        expect(test).to.be.true;
                        expect(tempTables.length).to.equal(1);
                        expect(res.tempCols[0]).to.contains("XC_GB_COL");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarMap = oldFunc;
                    });
            });

            it("should work for semi join", (done) => {
                const joinType = JoinCompoundOperatorTStr.LeftSemiJoin;
                const tempTables = [];

                semiJoinHelper(txId, 'l#a', 'r#b', ['col'], 'new#c', joinType,
                    [], [], tempTables, null)
                    .then((res) => {
                        expect(tempTables.length).to.equal(0);
                        expect(res.tempCols[0]).to.contains("XC_GB_COL");
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            after(() => {
                XcalarGroupByWithEvalStrings = oldGroupBy;
                XcalarJoin = oldJoin;
            });
        });

        describe('createJoinedColumns Test', () => {
            let createJoinedColumns;
            const tableId = 'a';
            const tableName = 'testTable#' + tableId;

            before(() => {
                createJoinedColumns = XIApi.__testOnly__.createJoinedColumns;

                const progCols = []
                progCols.push(ColManager.newPullCol('a'));
                progCols.push(ColManager.newPullCol('prefix::b'));
                progCols.push(ColManager.newDATACol());
                let table = new TableMeta({
                    tableId: tableId,
                    tableName: tableName,
                    tableCols: progCols
                });

                gTables[tableId] = table;
            });

            it('should return DATA col only when no table meta', () => {
                const cols = createJoinedColumns('a', 'b', [], [], [], []);
                expect(cols.length).to.equal(1);
                expect(cols[0].backName).to.equal("DATA");
            });

            it('should return all cols when no pulled cols specified', () => {
                const cols = createJoinedColumns(tableName, 'b', null, [], [], []);
                expect(cols.length).to.equal(3);
                expect(cols[0].backName).to.equal("a");
                expect(cols[1].backName).to.equal("prefix::b");
                expect(cols[2].backName).to.equal("DATA");
            });

            it('should return cols and replace name', () => {
                const lPulledColNames = ['a', 'prefix::b'];
                const lRenames = [{
                    type: ColumnType.integer,
                    orig: 'a',
                    new: 'newA'
                }, {
                    type: DfFieldTypeT.DfFatptr,
                    orig: 'prefix',
                    new: 'newPrefix'
                }];
                const cols = createJoinedColumns(tableName, 'b',
                    lPulledColNames, [], lRenames, []);
                expect(cols.length).to.equal(3);
                expect(cols[0].backName).to.equal("newA");
                expect(cols[1].backName).to.equal("newPrefix::b");
                expect(cols[2].backName).to.equal("DATA");
            });

            after(() => {
                delete gTables[tableId];
            });
        });
    });

    describe('groupBy Helper Test', () => {
        it('getGroupByAggEvalStr should work', () => {
            const getGroupByAggEvalStr = XIApi.__testOnly__.getGroupByAggEvalStr;
            const colName = 'a';
            const tests = [{
                op: 'stdevp',
                expect: 'sqrt(div(sum(pow(sub(a, avg(a)), 2)), count(a)))'
            }, {
                op: 'stdev',
                expect: 'sqrt(div(sum(pow(sub(a, avg(a)), 2)), sub(count(a), 1)))'
            }, {
                op: 'varp',
                expect: 'div(sum(pow(sub(a, avg(a)), 2)), count(a))'
            }, {
                op: 'var',
                expect: 'div(sum(pow(sub(a, avg(a)), 2)), sub(count(a), 1))'
            }, {
                op: 'min',
                expect: 'min(a)'
            }];

            tests.forEach((test) => {
                const evalStr = getGroupByAggEvalStr({
                    aggColName: colName,
                    operator: test.op
                });
                expect(evalStr).to.equal(test.expect);
            });
        });

        describe('getFinalGroupByCols Test', () => {
            const txId = 0;
            const tableId = 'a'
            const tableName = 'testTable#' + tableId;
            const finalTableName = 'final#b';
            let getFinalGroupByCols;

            before(() => {
                getFinalGroupByCols = XIApi.__testOnly__.getFinalGroupByCols;

                const table = new TableMeta({
                    tableId: tableId,
                    tableName: tableName,
                    tableCols: [ColManager.newPullCol('colA'), ColManager.newDATACol()]
                });
                gTables[tableId] = table;
            });

            it('should handle no table meta case', (done) => {
                const groupByCols = ['groupByCol'];
                const aggArgs = [{ newColName: 'aggCol' }];
                getFinalGroupByCols(txId, 'test#c', finalTableName,
                    groupByCols, aggArgs, false, [])
                    .then((newProgCols, renamedGroupByCols) => {
                        expect(newProgCols.length).to.equal(3);
                        expect(newProgCols[0].backName).to.equal('aggCol');
                        expect(newProgCols[1].backName).to.equal('groupByCol');
                        expect(newProgCols[2].backName).to.equal('DATA');
                        expect(renamedGroupByCols.length).to.equal(1);
                        expect(renamedGroupByCols[0]).to.equal('groupByCol');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle include sample case', (done) => {
                const groupByCols = ['colA'];
                const aggArgs = [{ newColName: 'aggCol' }];
                getFinalGroupByCols(txId, tableName, finalTableName,
                    groupByCols, aggArgs, true, [0])
                    .then((newProgCols, renamedGroupByCols) => {
                        expect(newProgCols.length).to.equal(3);
                        expect(newProgCols[0].backName).to.equal('aggCol');
                        expect(newProgCols[1].backName).to.equal('colA');
                        expect(newProgCols[2].backName).to.equal('DATA');
                        expect(renamedGroupByCols.length).to.equal(1);
                        expect(renamedGroupByCols[0]).to.equal('colA');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle no table keys case', (done) => {
                const oldCheckOrder = XIApi.checkOrder;
                const groupByCols = ['groupByCol'];
                const aggArgs = [{ newColName: 'aggCol' }];

                XIApi.checkOrder = () => PromiseHelper.resolve(null, []);

                getFinalGroupByCols(txId, tableName, finalTableName,
                    groupByCols, aggArgs, false)
                    .then((newProgCols, renamedGroupByCols) => {
                        expect(newProgCols.length).to.equal(2);
                        expect(newProgCols[0].backName).to.equal('aggCol');
                        expect(newProgCols[1].backName).to.equal('DATA');
                        expect(renamedGroupByCols.length).to.equal(1);
                        expect(renamedGroupByCols[0]).to.equal('groupByCol');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.checkOrder = oldCheckOrder;
                    });
            });

            it('should handle has table keys case', (done) => {
                const oldCheckOrder = XIApi.checkOrder;
                const groupByCols = ['groupByCol'];
                const aggArgs = [{ newColName: 'aggCol' }];

                XIApi.checkOrder = () => PromiseHelper.resolve(null, [{ name: 'key' }]);

                getFinalGroupByCols(txId, tableName, finalTableName,
                    groupByCols, aggArgs, false)
                    .then((newProgCols, renamedGroupByCols) => {
                        expect(newProgCols.length).to.equal(3);
                        expect(newProgCols[0].backName).to.equal('aggCol');
                        expect(newProgCols[1].backName).to.equal('key');
                        expect(newProgCols[2].backName).to.equal('DATA');
                        expect(renamedGroupByCols.length).to.equal(1);
                        expect(renamedGroupByCols[0]).to.equal('key');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.checkOrder = oldCheckOrder;
                    });
            });

            it('should handle fail case', (done) => {
                const oldCheckOrder = XIApi.checkOrder;
                const groupByCols = ['groupByCol'];
                const aggArgs = [{ newColName: 'aggCol' }];

                XIApi.checkOrder = () => PromiseHelper.reject();

                getFinalGroupByCols(txId, tableName, finalTableName,
                    groupByCols, aggArgs, false)
                    .then((newProgCols, renamedGroupByCols) => {
                        expect(newProgCols.length).to.equal(2);
                        expect(newProgCols[0].backName).to.equal('aggCol');
                        expect(newProgCols[1].backName).to.equal('DATA');
                        expect(renamedGroupByCols.length).to.equal(1);
                        expect(renamedGroupByCols[0]).to.equal('groupByCol');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.checkOrder = oldCheckOrder;
                    });
            });

            after(() => {
                delete gTables[tableId];
            });
        });

        describe('computeDistinctGroupby Test', () => {
            const txId = 0;
            const tableName = 'test#a';
            let computeDistinctGroupby;
            let oldIsSimulate;
            let oldIsEdit;
            let oldGetIndexCache;
            let oldGroupBy;
            let oldCacheIndexCache;

            before(() => {
                computeDistinctGroupby = XIApi.__testOnly__.computeDistinctGroupby;

                oldIsSimulate = Transaction.isSimulate;
                oldIsEdit = Transaction.isEdit;
                oldGetIndexCache = SQLApi.getIndexTable;
                oldGroupBy = XcalarGroupByWithEvalStrings;
                oldCacheIndexCache = SQLApi.cacheIndexTable;

                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: tableName, keys: ['key'] };
                };
                SQLApi.cacheIndexTable = () => { };
            });

            it("should handle resue index case", (done) => {
                const groupOnCols = ['groupCol'];
                const distinceCol = 'groupCol';
                const aggArgs = [{ operator: 'min', aggColName: 'aggCol' }]
                const distinctGbTables = [];
                const tempTables = [];
                const tempCols = [];
                computeDistinctGroupby(txId, tableName, groupOnCols, distinceCol,
                    aggArgs, distinctGbTables, tempTables, tempCols)
                    .then(() => {
                        expect(distinctGbTables.length).to.equal(1);
                        expect(tempTables.length).to.equal(2);
                        expect(tempCols.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it("should handle non-resue index case", (done) => {
                const groupOnCols = ['groupCol'];
                const distinctCol = 'distinct';
                const aggArgs = [{ operator: 'min', aggColName: 'aggCol' }]
                const distinctGbTables = [];
                const tempTables = [];
                const tempCols = [];
                const oldFunc = XcalarIndexFromTable;
                let test = false;
                XcalarIndexFromTable = () => {
                    test = true;
                    return PromiseHelper.resolve({ newKeys: 'newKey' });
                };

                computeDistinctGroupby(txId, tableName, groupOnCols, distinctCol,
                    aggArgs, distinctGbTables, tempTables, tempCols)
                    .then(() => {
                        expect(test).to.be.true;
                        expect(distinctGbTables.length).to.equal(1);
                        expect(tempTables.length).to.equal(3);
                        expect(tempCols.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarIndexFromTable = oldFunc;
                    });
            });

            after(() => {
                Transaction.isSimulate = oldIsSimulate;
                Transaction.isEdit = oldIsEdit;
                SQLApi.getIndexTable = oldGetIndexCache;
                XcalarGroupByWithEvalStrings = oldGroupBy;
                SQLApi.cacheIndexTable = oldCacheIndexCache;
            });
        });

        describe('cascadingJoins Test', () => {
            let cascadingJoins;
            const txId = 0;
            const tableName = 'test#a';
            let oldJoin = XcalarJoin;
            let testJoinType;

            before(() => {
                cascadingJoins = XIApi.__testOnly__.cascadingJoins;
                oldJoin = XcalarJoin;

                XcalarJoin = (lTable, rTable, newTable, joinType, ...rest) => {
                    testJoinType = joinType
                    return PromiseHelper.resolve();
                };
            });

            beforeEach(() => {
                testJoinType = null;
            });

            it('should handle no distinct groupBy table case', (done) => {
                const distinctGbTables = [];
                const joinCols = [];
                const tempTables = [];
                const tempCols = [];

                cascadingJoins(txId, distinctGbTables, tableName, joinCols,
                    tempTables, tempCols)
                    .then((resTable) => {
                        expect(resTable).to.equal(tableName);
                        expect(testJoinType).to.equal(null);
                        expect(tempTables.length).to.equal(0);
                        expect(tempCols.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle cross join case', (done) => {
                const distinctGbTables = ['t#2'];
                const joinCols = [];
                const tempTables = [];
                const tempCols = [];

                cascadingJoins(txId, distinctGbTables, tableName, joinCols,
                    tempTables, tempCols)
                    .then((resTable) => {
                        expect(resTable).not.to.equal(tableName);
                        expect(testJoinType).to.equal(JoinOperatorT.CrossJoin);
                        expect(tempTables.length).to.equal(1);
                        expect(tempCols.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle normal join case', (done) => {
                const distinctGbTables = ['t#2', 't#3'];
                const joinCols = ['col'];
                const tempTables = [];
                const tempCols = [];

                cascadingJoins(txId, distinctGbTables, tableName, joinCols,
                    tempTables, tempCols)
                    .then((resTable) => {
                        expect(resTable).not.to.equal(tableName);
                        expect(testJoinType).to.equal(JoinOperatorT.InnerJoin);
                        expect(tempTables.length).to.equal(2);
                        expect(tempCols.length).to.equal(2);
                        expect(tempCols[0]).to.equal('col_2');
                        expect(tempCols[1]).to.equal('col_3');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            after(() => {
                XcalarJoin = oldJoin;
            });
        });

        it('distinctGroupby should work', (done) => {
            const oldIsSimulate = Transaction.isSimulate;
            const oldIsEdit = Transaction.isEdit;
            const oldGetIndexCache = SQLApi.getIndexTable;
            const oldGroupBy = XcalarGroupByWithEvalStrings;
            const oldCacheIndexCache = SQLApi.cacheIndexTable;
            const oldJoin = XcalarJoin;
            const oldIndex = XcalarIndexFromTable;

            Transaction.isSimulate = () => true;
            Transaction.isEdit = () => false;
            SQLApi.getIndexTable = () => {
                return { tableName: tableName, keys: ['key'] };
            };
            SQLApi.cacheIndexTable = () => { };
            XcalarJoin = () => PromiseHelper.resolve();
            XcalarIndexFromTable = () => PromiseHelper.resolve({ newKeys: 'newKey' });

            const distinctGroupby = XIApi.__testOnly__.distinctGroupby;
            const txId = 0;
            const tableName = 'test#a';
            const groupOnCols = ['groupOn'];
            const distinctAggArgs = [{
                aggColName: 'gropuOn',
                operator: 'min',
                newColName: 'new1'
            }, {
                aggColName: 'gropuOn',
                operator: 'max',
                newColName: 'new2'
            }];
            const gbTableName = 'gb#b;'

            distinctGroupby(txId, tableName, groupOnCols,
                distinctAggArgs, gbTableName)
                .then((finalJoinedTable, tempTables, tempCols) => {
                    expect(finalJoinedTable).to.be.a('string');
                    expect(tempTables.length).to.equal(4);
                    expect(tempCols.length).to.equal(2);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    Transaction.isSimulate = oldIsSimulate;
                    Transaction.isEdit = oldIsEdit;
                    SQLApi.getIndexTable = oldGetIndexCache;
                    XcalarGroupByWithEvalStrings = oldGroupBy;
                    SQLApi.cacheIndexTable = oldCacheIndexCache;
                    XcalarJoin = oldJoin;
                    XcalarIndexFromTable = oldIndex;
                });
        });
    });

    describe('Union Helper Test', () => {
        describe('checkUnionTableInfos Test', () => {
            let checkUnionTableInfos;

            before(() => {
                checkUnionTableInfos = XIApi.__testOnly__.checkUnionTableInfos;
            });

            it('should handle invalid arg', () => {
                expect(checkUnionTableInfos()).to.be.null;
                expect(checkUnionTableInfos('invalid')).to.be.null;
                expect(checkUnionTableInfos([])).to.be.null;
            });

            it('should check table info', () => {
                const lCol = { name: null, rename: null, type: null };
                const rCol = { name: 'r', rename: 'new', type: ColumnType.integer };
                const tableInfos = [{ columns: [lCol] }, { columns: [rCol] }];
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 2
                lCol.rename = 'old';
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 3
                lCol.rename = 'new';
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 4
                lCol.type = ColumnType.string;
                expect(checkUnionTableInfos(tableInfos)).to.be.null;
                // case 5
                lCol.type = ColumnType.integer;
                const res = checkUnionTableInfos(tableInfos);
                expect(res).not.to.be.null;
                expect(lCol.name).not.to.be.null;
            });
        });

        it('unionCast should work', (done) => {
            const unionCast = XIApi.__testOnly__.unionCast;
            const oldMap = XIApi.map;
            const oldSetMeta = TblManager.setOrphanTableMeta;
            XIApi.map = () => PromiseHelper.resolve();
            TblManager.setOrphanTableMeta = () => { };

            const txId = 0;
            const tableName = 'test#a';
            const tableInfo = {
                tableName: tableName,
                columns: [{
                    name: 'old',
                    cast: true,
                    type: ColumnType.integer,
                    rename: 'new'
                }]
            };

            const tableInfos = [tableInfo];
            unionCast(txId, tableInfos)
                .then((unionRenameInfos, tempTables) => {
                    expect(unionRenameInfos.length).to.equal(1);
                    const renameInfo = unionRenameInfos[0];
                    expect(renameInfo.tableName).not.to.equal(tableName);
                    expect(renameInfo.renames[0].orig).not.to.equal('old');
                    expect(renameInfo.renames[0].new).to.equal('new');
                    expect(renameInfo.renames[0].type).to.equal(4);
                    expect(tempTables.length).to.equal(1);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                    TblManager.setOrphanTableMeta = oldSetMeta;
                });
        });

        it('getUnionConcatMapStr should work', () => {
            const getUnionConcatMapStr = XIApi.__testOnly__.getUnionConcatMapStr;
            const res = 'concat(string(ifStr(exists(a), a, "XC_FNF")), concat(".Xc.", string(ifStr(exists(b), b, "XC_FNF"))))';
            expect(getUnionConcatMapStr(['a', 'b'])).to.equal(res);
        });

        it('unionAllIndex should work', (done) => {
            const unionAllIndex = XIApi.__testOnly__.unionAllIndex;
            const oldMap = XIApi.map;
            const oldIndex = XIApi.index;
            XIApi.map = () => PromiseHelper.resolve('testMapTable');
            XIApi.index = () => PromiseHelper.resolve('testIndexTable');

            const txId = 0;
            const renameInfo = {
                tableName: 'test#a',
                renames: [{
                    orig: 'old',
                    new: 'new',
                    type: 4
                }]
            };
            unionAllIndex(txId, [renameInfo])
                .then((unionRenameInfos, tempTables) => {
                    expect(unionRenameInfos.length).to.equal(1);
                    expect(unionRenameInfos[0].tableName).to.equal('testIndexTable');
                    expect(unionRenameInfos[0].renames.length).to.equal(2);
                    expect(tempTables.length).to.equal(3);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                    XIApi.index = oldIndex;
                });
        });
    });

    describe('Public Function Test', () => {
        before(() => {
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

            XcalarAggregate = function () {
                return PromiseHelper.resolve({ 'Value': 1 });
            };

            XIApi.deleteTable = function () {
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

            XIApi.genAggStr = function () {
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

            XIApi.load({ url: 'test' }, { format: 'CSV' }, 'test', 1)
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

        it('XIApi.index should work', (done) => {
            const isSimulate = Transaction.isSimulate;
            const isEdit = Transaction.isEdit;
            const getIndexTable = SQLApi.getIndexTable;

            Transaction.isSimulate = () => true;
            Transaction.isEdit = () => false;
            SQLApi.getIndexTable = () => {
                return { tableName: 'indexTable', keys: ['key'] }
            };

            const tableName = 'test#a';
            XIApi.index(1, ['col'], 'test#a')
                .then((indexTable) => {
                    expect(indexTable).to.equal('indexTable');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    Transaction.isEdit = isEdit;
                    Transaction.isSimulate = isSimulate;
                    SQLApi.getIndexTable = getIndexTable;
                });
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

        it('XIApi.sort should work', (done) => {
            const tableId = 'a';
            const tableName = 'test#' + tableId;
            const progCol = ColManager.newPullCol('col', 'col', ColumnType.number);
            const table = new TableMeta({
                tableId: tableId,
                tableName: tableName,
                tableCols: [progCol, ColManager.newDATACol()]
            });
            gTables[tableId] = table;

            const oldCheckOrder = XIApi.checkOrder;
            const oldIndex = XcalarIndexFromTable;

            XIApi.checkOrder = () => PromiseHelper.resolve(0, [{
                name: 'diffCol',
                ordering: "Ascending"
            }]);
            XcalarIndexFromTable = () => PromiseHelper.resolve({ newKeys: ['newKey'] });

            const colInfo = {
                colNum: 1,
                ordering: XcalarOrderingT.XcalarOrderingAscending
            };
            XIApi.sort(1, [colInfo], tableName)
                .then((newTableName, newKeys) => {
                    expect(newTableName).to.be.a('string');
                    expect(newKeys[0]).to.equal('newKey');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    delete gTables[tableId];
                    XIApi.checkOrder = oldCheckOrder;
                    XcalarIndexFromTable = oldIndex;
                });
        });

        it('XIApi.sort should reject when already sorted', (done) => {
            const tableId = 'a';
            const tableName = 'test#' + tableId;
            const progCol = ColManager.newPullCol('col', 'col', ColumnType.number);
            const table = new TableMeta({
                tableId: tableId,
                tableName: tableName,
                tableCols: [progCol, ColManager.newDATACol()]
            });
            gTables[tableId] = table;

            const oldCheckOrder = XIApi.checkOrder;
            const oldIndex = XcalarIndexFromTable;

            XIApi.checkOrder = () => PromiseHelper.resolve(0, [{
                name: 'col',
                ordering: "Ascending"
            }]);

            const colInfo = {
                colNum: 1,
                ordering: XcalarOrderingT.XcalarOrderingAscending
            };
            XIApi.sort(1, [colInfo], tableName)
                .then(() => {
                    done('fail');
                })
                .fail((error, flag) => {
                    expect(error).to.be.null;
                    expect(flag).to.be.true;
                    done();
                })
                .always(() => {
                    delete gTables[tableId];
                    XIApi.checkOrder = oldCheckOrder;
                });
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

        it('XIApi.map should reject normal fail', (done) => {
            const oldMap = XcalarMap;
            XcalarMap = () => PromiseHelper.reject('test');

            XIApi.map(1, ['concat(a)'], 'table', 'newCol')
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('test');
                    done();
                })
                .always(() => {
                    XcalarMap = oldMap;
                });
        });

        describe('XIApi.join Test', () => {
            let oldMap;
            let oldJoin;
            let isSimulate;
            let isEdit;
            let getIndexTable;

            before(() => {
                oldMap = XIApi.map;
                oldJoin = XcalarJoin;
                isSimulate = Transaction.isSimulate;
                isEdit = Transaction.isEdit;
                getIndexTable = SQLApi.getIndexTable;

                XIApi.map = () => PromiseHelper.resolve();
                XcalarJoin = () => PromiseHelper.resolve({ tempCols: ['temp'] });
                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: 'indexTable', keys: ['key'] }
                };

            });

            it('should reject invalid case', (done) => {
                XIApi.join()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in join');
                        done();
                    });
            });

            it('should reject invalid columns', (done) => {
                const joinType = JoinOperatorT.InnerJoin;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a']
                };
                const rTableInfo = {
                    tableName: 'r#a',
                    columns: ['b', 'c']
                };
                XIApi.join(1, joinType, lTableInfo, rTableInfo)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in join');
                        done();
                    });
            });

            it('should handle normal join', (done) => {
                const joinType = JoinOperatorT.InnerJoin;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a']
                };
                const rTableInfo = {
                    tableName: 'r#b',
                    columns: ['b'],
                    rename: [{ orig: 'old', new: 'new', type: 4 }]
                };
                XIApi.join(1, joinType, lTableInfo, rTableInfo)
                    .then((newTableName, joinedCols, tempCols) => {
                        expect(newTableName).to.equal('l-r#12');
                        expect(joinedCols.length).to.equal(1);
                        expect(tempCols.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle delete tempTables if set clean', (done) => {
                const joinType = JoinOperatorT.InnerJoin;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a']
                };
                const rTableInfo = {
                    tableName: 'r#b',
                    columns: ['b'],
                    rename: [{ orig: 'old', new: 'new', type: 4 }]
                };
                const oldDelete = XIApi.deleteTableAndMetaInBulk;
                let test = false;
                XIApi.deleteTableAndMetaInBulk = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };

                const options = {
                    clean: true,
                    evalString: 'test'
                };
                XIApi.join(1, joinType, lTableInfo, rTableInfo, options)
                    .then(() => {
                        expect(test).to.equal(true);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.deleteTableAndMetaInBulk = oldDelete;
                    });
            });

            it('should handle semi join case', (done) => {
                const joinType = 10;
                const lTableInfo = {
                    tableName: 'l#a',
                    columns: ['a'],
                    casts: ColumnType.integer
                };
                const rTableInfo = {
                    tableName: 'r#b',
                    columns: ['b'],
                    casts: ColumnType.integer
                };
                const oldGroupBy = XcalarGroupByWithEvalStrings;
                XcalarGroupByWithEvalStrings = () => PromiseHelper.resolve();

                XIApi.join(1, joinType, lTableInfo, rTableInfo)
                    .then((newTableName, joinedCols, tempCols) => {
                        expect(newTableName).to.equal('l-r#12');
                        expect(joinedCols.length).to.equal(1);
                        expect(tempCols.length).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarGroupByWithEvalStrings = oldGroupBy;
                    });
            });

            after(() => {
                XIApi.map = oldMap;
                XcalarJoin = oldJoin;
                Transaction.isSimulate = isSimulate;
                Transaction.isEdit = isEdit;
                SQLApi.getIndexTable = getIndexTable;
            });
        });


        describe('XIApi.groupBy Test', function () {
            let oldGroupBy;
            let isSimulate;
            let isEdit;
            let getIndexTable;

            before(() => {
                oldGroupBy = XcalarGroupByWithEvalStrings;
                isSimulate = Transaction.isSimulate;
                isEdit = Transaction.isEdit;
                getIndexTable = SQLApi.getIndexTable;

                XcalarGroupByWithEvalStrings = () => PromiseHelper.resolve({ tempCols: ['temp'] });
                Transaction.isSimulate = () => true;
                Transaction.isEdit = () => false;
                SQLApi.getIndexTable = () => {
                    return { tableName: 'indexTable', keys: ['key'] }
                };
            });

            it('should reject invalid case', (done) => {
                XIApi.groupBy()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in groupby');
                        done();
                    });
            });

            it('should handle normal case', (done) => {
                const aggArgs = [{
                    operator: 'min',
                    aggColName: 'aggCol',
                    newColName: 'newAggCol'
                }];
                const groupByCols = ['groupByCol'];
                const tableName = 'test#a';

                XIApi.groupBy(1, aggArgs, groupByCols, tableName)
                    .then((finalTable, finalCols, renamedGroupByCols, tempCols) => {
                        expect(finalTable).to.equal('test-GB#12');
                        expect(finalCols.length).to.equal(3);
                        expect(finalCols[0].backName).to.equal('newAggCol');
                        expect(finalCols[1].backName).to.equal('groupByCol');
                        expect(renamedGroupByCols.length).to.equal(1);
                        expect(tempCols.length).to.equal(0);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle delete tempTables if set clean', (done) => {
                const aggArgs = [{
                    operator: 'min',
                    aggColName: 'aggCol',
                    newColName: 'newAggCol'
                }];
                const groupByCols = ['groupByCol'];
                const tableName = 'test#a';
                const oldDelete = XIApi.deleteTableAndMetaInBulk;
                let test = false;
                XIApi.deleteTableAndMetaInBulk = () => {
                    test = true;
                    return PromiseHelper.resolve();
                };
                const options = {
                    clean: true
                };

                XIApi.groupBy(1, aggArgs, groupByCols, tableName, options)
                    .then((finalTable, finalCols, renamedGroupByCols, tempCols) => {
                        expect(test).to.equal(true);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.deleteTableAndMetaInBulk = oldDelete;
                    });
            });

            it('should handle distinct groupBy case', (done) => {
                const aggArgs = [{
                    operator: 'min',
                    aggColName: 'aggCol',
                    newColName: 'newAggCol',
                    isDistinct: true
                }];
                const groupByCols = 'groupByCol';
                const tableName = 'test#a';
                const oldIndex = XcalarIndexFromTable;
                const cacheIndexTable = SQLApi.cacheIndexTable;
                const oldJoin = XcalarJoin;

                XcalarIndexFromTable = () => PromiseHelper.resolve({ newKeys: ['newKey'] });
                SQLApi.cacheIndexTable = () => { };
                XcalarJoin = () => PromiseHelper.resolve();

                XIApi.groupBy(1, aggArgs, groupByCols, tableName)
                    .then((finalTable, finalCols, renamedGroupByCols, tempCols) => {
                        expect(finalTable).to.equal('test-GBjoin#12');
                        expect(finalCols.length).to.equal(3);
                        expect(finalCols[0].backName).not.to.equal('newAggCol');
                        expect(finalCols[1].backName).to.equal('groupByCol');
                        expect(renamedGroupByCols.length).to.equal(1);
                        expect(tempCols.length).to.equal(3);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarIndexFromTable = oldIndex;
                        SQLApi.cacheIndexTable = cacheIndexTable;
                        XcalarJoin = oldJoin;
                    })
            });

            after(() => {
                XcalarGroupByWithEvalStrings = oldGroupBy;
                Transaction.isSimulate = isSimulate;
                Transaction.isEdit = isEdit;
                SQLApi.getIndexTable = getIndexTable;
            });
        });

        describe('XIAPi.union Test', () => {
            let oldUnion;

            before(() => {
                oldUnion = XcalarUnion;
                XcalarUnion = () => PromiseHelper.resolve();
            });

            it('should reject invalid case', (done) => {
                XIApi.union()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in union');
                        done();
                    });
            });

            it('should handle normal case', (done) => {
                const tableInfos = [{
                    tableName: 't1#a',
                    columns: [{ name: 'c1', rename: 'col', type: ColumnType.integer }]
                }, {
                    tableName: 't2#b',
                    columns: [{ name: 'c2', rename: 'col', type: ColumnType.integer }]
                }];

                XIApi.union(1, tableInfos)
                    .then((newTableName, newTableCols) => {
                        expect(newTableName).to.equal('t1#12');
                        expect(newTableCols.length).to.equal(2);
                        expect(newTableCols[0].backName).to.equal('col');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
            });

            it('should handle dedup case', (done) => {
                const tableInfos = [{
                    tableName: 't1#a',
                    columns: [{ name: 'c1', rename: 'col', type: ColumnType.integer }]
                }, {
                    tableName: 't2#b',
                    columns: [{ name: 'c2', rename: 'col', type: ColumnType.integer }]
                }];
                const oldMap = XIApi.map;
                const oldIndex = XIApi.index;
                XIApi.map = () => PromiseHelper.resolve('testMap');
                XIApi.index = () => PromiseHelper.resolve('testIndex');

                XIApi.union(1, tableInfos, true)
                    .then((newTableName, newTableCols) => {
                        expect(newTableName).to.equal('t1#12');
                        expect(newTableCols.length).to.equal(2);
                        expect(newTableCols[0].backName).to.equal('col');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.map = oldMap;
                        XIApi.index = oldIndex;
                    });
            });

            after(() => {
                XcalarUnion = oldUnion;
            });
        });

        it('XIApi.project should handle fail case', (done) => {
            XIApi.project()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in project');
                    done();
                });
        });

        it('XIApi.project should work', (done) => {
            const oldFunc = XcalarProject;
            XcalarProject = () => PromiseHelper.resolve();

            XIApi.project(1, ['col'], 'table')
                .then((newTableName) => {
                    expect(newTableName).to.equal('table#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarProject = oldFunc;
                });
        });

        it('XIApi.synthesize should handle fail case', (done) => {
            XIApi.synthesize()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in synthesize');
                    done();
                });
        });

        it('XIApi.synthesize should work', (done) => {
            const oldFunc = XcalarSynthesize;
            XcalarSynthesize = () => PromiseHelper.resolve();

            XIApi.synthesize(1, [{}], 'table')
                .then((newTableName) => {
                    expect(newTableName).to.equal('table#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarSynthesize = oldFunc;
                });
        });

        it('XIApi.query should handle fail case', (done) => {
            XIApi.query()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in query');
                    done();
                });
        });

        it('XIApi.query should work', (done) => {
            const oldFunc = XcalarQueryWithCheck;
            let test = false;
            XcalarQueryWithCheck = () => {
                test = true;
                return PromiseHelper.resolve();
            };

            XIApi.query(1, 'query', 'queryStr')
                .then(() => {
                    expect(test).to.equal(true);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarQueryWithCheck = oldFunc;
                });
        });

        it('XIApi.exportTable should handle fail case', (done) => {
            XIApi.exportTable()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in export');
                    done();
                });
        });

        it('XIApi.exportTable should work', (done) => {
            const oldFunc = XcalarExport;
            let test = false;
            XcalarExport = () => {
                test = true;
                return PromiseHelper.resolve();
            };

            XIApi.exportTable(1, 'table', 'exportTable')
                .then(() => {
                    expect(test).to.equal(true);
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarExport = oldFunc;
                });
        });

        it('XIApi.genRowNum should handle fail case', (done) => {
            XIApi.genRowNum()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid args in get row num');
                    done();
                });
        });

        it('XIApi.genRowNum should work', (done) => {
            const oldFunc = XcalarGenRowNum;
            let test = false;
            XcalarGenRowNum = () => PromiseHelper.resolve();

            XIApi.genRowNum(1, 'table', 'newCol')
                .then((newTableName) => {
                    expect(newTableName).to.equal('table#12');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarGenRowNum = oldFunc;
                });
        });

        describe('XIApi.getNumRows Test', () => {
            it('XIApi.getNumRows should handle fail case', (done) => {
                XIApi.getNumRows()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in getNumRows');
                        done();
                    });
            });

            it('XIApi.getNumRows should handle constant fail case', (done) => {
                XIApi.getNumRows('test#a', { useConstant: true })
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in getNumRows');
                        done();
                    });
            });

            it('XIApi.getNumRows should handle constant case', (done) => {
                const oldAgg = XIApi.aggregate;
                XIApi.aggregate = () => PromiseHelper.resolve(1);

                XIApi.getNumRows('test#a', { useConstant: true, constantName: 'agg' })
                    .then((res) => {
                        expect(res).to.equal(1);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.aggregate = oldAgg;
                    });
            });

            it('XIApi.getNumRows should work in normal case', (done) => {
                const oldFunc = XcalarGetTableCount;
                XcalarGetTableCount = () => PromiseHelper.resolve(2);

                XIApi.getNumRows('table#a')
                    .then((res) => {
                        expect(res).to.be.equal(2);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarGetTableCount = oldFunc;
                    });
            });

            it('XIApi.getNumRows should work in cache case', (done) => {
                const tableId = 'a';
                const tableName = 'test#' + tableId;
                const table = new TableMeta({
                    tableId: tableId,
                    tableName: tableName
                });
                table.resultSetCount = 3;
                gTables[tableId] = table;

                XIApi.getNumRows(tableName)
                    .then((res) => {
                        expect(res).to.be.equal(3);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        delete gTables[tableId];
                    });
            });
        });

        describe('fetchData API Test', () => {
            it('XIApi.fetchData should handle fail case', (done) => {
                XIApi.fetchData()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error.error).to.equal('Invalid args in fetch data');
                        done();
                    });
            });

            it('XIApi.fetchData should fail in invalid meta', (done) => {
                const oldMakeResultSet = XcalarMakeResultSetFromTable;

                XcalarMakeResultSetFromTable = () => PromiseHelper.resolve({
                    resultSetId: "1",
                    numEntries: null
                })

                XIApi.fetchData('table', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('No Data!');
                        done();
                    })
                    .always(() => {
                        XcalarMakeResultSetFromTable = oldMakeResultSet;
                    });
            });

            it('XIApi.fetchData should work', (done) => {
                const oldMakeResultSet = XcalarMakeResultSetFromTable;
                const oldFetch = XcalarFetchData;
                const oldFree = XcalarSetFree;

                XcalarMakeResultSetFromTable = () => PromiseHelper.resolve({
                    resultSetId: "1",
                    numEntries: 1
                })
                XcalarFetchData = () => PromiseHelper.resolve(['test']);
                XcalarSetFree = () => PromiseHelper.resolve();

                XIApi.fetchData('table', 1, 1)
                    .then((finaData) => {
                        expect(finaData.length).to.equal(1);
                        expect(finaData[0]).to.equal('test');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarMakeResultSetFromTable = oldMakeResultSet;
                        XcalarFetchData = oldFetch;
                        XcalarSetFree = oldFree;
                    });
            });

            it('XIApi.fetchDataAndParse reject in invalid case', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['a'])

                XIApi.fetchDataAndParse('t#a', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).not.to.be.null;
                        done();
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });

            it('XIApi.fetchDataAndParse should work', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['{"a": "b"}'])

                XIApi.fetchDataAndParse('t#a', 1, 1)
                    .then((parsedData) => {
                        expect(parsedData.length).to.equal(1);
                        expect(parsedData[0]).to.be.an('object');
                        expect(parsedData[0].a).to.equal('b');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });

            it('XIApi.fetchColumnData should reject in invalid case', (done) => {
                XIApi.fetchColumnData(null, 't#a', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in fetch data');
                        done();
                    });
            });

            it('XIApi.fetchColumnData reject in cannot parse case', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['a'])

                XIApi.fetchColumnData('t#a', 1, 1)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).not.to.be.null;
                        done();
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });

            it('XIApi.fetchColumnData should work', (done) => {
                const oldFunc = XIApi.fetchData;
                XIApi.fetchData = () => PromiseHelper.resolve(['{"a": "b"}'])

                XIApi.fetchColumnData('a', 't#a', 1, 1)
                    .then((result) => {
                        expect(result.length).to.equal(1);
                        expect(result[0]).to.equal('b');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.fetchData = oldFunc;
                    });
            });
        });

        describe('deleta table API Test', () => {
            it('XIApi.deleteTable should handle invalid case', (done) => {
                XIApi.deleteTable()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in delete table');
                        done();
                    });
            });

            it('XIApi.deleteTable should work', (done) => {
                const oldFunc = XcalarDeleteTable;
                let test = false;
                XcalarDeleteTable = () => {
                    test = true;
                    return PromiseHelper.resolve();
                }

                XIApi.deleteTable(1, 't#a')
                    .then(() => {
                        expect(test).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarDeleteTable = oldFunc;
                    });
            });

            it('XIApi.deleteTable fail when thrift errors', (done) => {
                const oldFunc = XcalarDeleteTable;
                XcalarDeleteTable = () => PromiseHelper.reject('test');

                XIApi.deleteTable(1, 't#a')
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('test');
                        done();
                    })
                    .always(() => {
                        XcalarDeleteTable = oldFunc;
                    });
            });

            it('XIApi.deleteTable still resolve when ignore error', (done) => {
                const oldFunc = XcalarDeleteTable;
                let test = false;
                XcalarDeleteTable = () => {
                    test = true;
                    return PromiseHelper.reject('test');
                }

                XIApi.deleteTable(1, 't#a', true)
                    .then(() => {
                        expect(test).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarDeleteTable = oldFunc;
                    });
            });

            it('XIApi.deleteTables should handle invalid case', (done) => {
                XIApi.deleteTables()
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.equal('Invalid args in delete table');
                        done();
                    });
            });

            it('XIApi.deleteTables should work', (done) => {
                const oldFunc = XcalarQueryWithCheck;
                XcalarQueryWithCheck = () => {
                    return PromiseHelper.resolve({
                        queryGraph: {
                            node: [{
                                input: {
                                    deleteDagNodeInput: {
                                        namePattern: 'a'
                                    }
                                },
                                state: DgDagStateT.DgDagStateDropped
                            }]
                        }
                    });
                };

                const arrayOfQueries = [{
                    args: {
                        namePattern: 'a'
                    }
                }];

                XIApi.deleteTables(1, arrayOfQueries)
                    .then((result) => {
                        expect(result).to.equal(null);
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XcalarQueryWithCheck = oldFunc;
                    });
            });


            it('XIApi.deleteTables should fail when delete fail', (done) => {
                const oldFunc = XcalarQueryWithCheck;
                XcalarQueryWithCheck = () => {
                    return PromiseHelper.resolve({
                        queryGraph: {
                            node: [{
                                input: {
                                    deleteDagNodeInput: {
                                        namePattern: 'a'
                                    }
                                },
                                state: DgDagStateT.DgDagStateUnknown
                            }]
                        }
                    });
                };

                const arrayOfQueries = [{
                    args: {
                        namePattern: 'a'
                    }
                }];

                XIApi.deleteTables(1, arrayOfQueries)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.be.an('object');
                        done();
                    })
                    .always(() => {
                        XcalarQueryWithCheck = oldFunc;
                    });
            });

            it('XIApi.deleteTables should fail when thrift call fail', (done) => {
                const oldFunc = XcalarQueryWithCheck;
                XcalarQueryWithCheck = () => PromiseHelper.reject('test');

                const arrayOfQueries = [{
                    args: {
                        namePattern: 'a'
                    }
                }];

                XIApi.deleteTables(1, arrayOfQueries)
                    .then(() => {
                        done('fail');
                    })
                    .fail((error) => {
                        expect(error).to.be.an('object');
                        done();
                    })
                    .always(() => {
                        XcalarQueryWithCheck = oldFunc;
                    });
            });

            it('XIAPi.deleteTableAndMeta should work', (done) => {
                const tableId = 'a';
                const tableName = 'test#' + tableId;
                const table = new TableMeta({
                    tableId: tableId,
                    tableName, tableName
                });
                gTables[tableId] = table;

                const oldFunc = XIApi.deleteTable;
                XIApi.deleteTable = () => PromiseHelper.resolve();

                XIApi.deleteTableAndMeta(1, tableName)
                    .then(() => {
                        expect(gTables.hasOwnProperty(tableId)).to.be.false;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.deleteTable = oldFunc;
                    });
            });

            it('XIAPi.deleteTableAndMetaInBulk should work', (done) => {
                const oldFunc = XIApi.deleteTableAndMeta;
                let test = false
                XIApi.deleteTableAndMeta = () => {
                    test = true;
                    return PromiseHelper.resolve();
                }

                XIApi.deleteTableAndMetaInBulk(1, ['a'])
                    .then(() => {
                        expect(test).to.be.true;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        XIApi.deleteTableAndMeta = oldFunc;
                    });
            });
        });

        it('XIAPi.createDataTarget should work', (done) => {
            const oldFunc = XcalarTargetCreate;
            let test = false
            XcalarTargetCreate = () => {
                test = true;
                return PromiseHelper.resolve();
            }

            XIApi.createDataTarget()
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarTargetCreate = oldFunc;
                });
        });

        it('XIAPi.deleteDataTarget should work', (done) => {
            const oldFunc = XcalarTargetDelete;
            let test = false
            XcalarTargetDelete = () => {
                test = true;
                return PromiseHelper.resolve();
            }

            XIApi.deleteDataTarget('target')
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XcalarTargetDelete = oldFunc;
                });
        });
    });

    after(() => {
        Authentication.getHashId = oldGetId;
    });
});