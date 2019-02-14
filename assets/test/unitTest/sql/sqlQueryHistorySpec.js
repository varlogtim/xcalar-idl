describe("SqlQueryHistory Test", function() {
    const QueryInfo = SqlQueryHistory.QueryInfo;
    const sqlListKey = 'gSQLQuery-1';

    let kvMap = {};
    const fakePut = function(value) {
        kvMap[this.key] = value;
        return PromiseHelper.resolve();
    };
    const fakeGet = function() {
        return PromiseHelper.resolve(kvMap[this.key]);
    };
    const fakeGetKey = function() {
        return sqlListKey;
    }

    const fakeAppend = function(input) {
        const content = kvMap[this.key] || '';
        kvMap[this.key] = `${content}${input}`;
        return PromiseHelper.resolve();
    }

    const replaceApi = function() {
        const old = {
            getKey: KVStore.prototype.getKey,
            get: KVStore.prototype.get,
            put: KVStore.prototype.put,
            append: KVStore.prototype.append
        }
        KVStore.prototype.getKey = fakeGetKey;
        KVStore.prototype.get = fakeGet;
        KVStore.prototype.put = fakePut;
        KVStore.prototype.append = fakeAppend;
        return old;
    }

    const restoreApi = function(oldApi) {
        KVStore.prototype.getKey = oldApi.getKey;
        KVStore.prototype.get = oldApi.get;
        KVStore.prototype.put = oldApi.put;
        KVStore.prototype.append = oldApi.append;
    }

    before( function() {
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance();
        restoreApi(oldApi);
    });

    it('SqlQueryHistory.getQueryMap should work', function() {
        const queryInfo = new QueryInfo();
        queryInfo.queryId = 'sql#1';
        const mapExpected = {};
        mapExpected[queryInfo.queryId] = queryInfo;
        const mapExpectedStr = JSON.stringify(mapExpected);

        SqlQueryHistory.getInstance()._queryMap = mapExpected;
        const returnMap = SqlQueryHistory.getInstance().getQueryMap();
        // Check return value
        expect(JSON.stringify(returnMap)).to.equal(mapExpectedStr);
        // Check return value is a copy
        returnMap['testSql'] = 'testSql';
        expect(SqlQueryHistory.getInstance()._queryMap['testSql']).to.be.undefined;
    });

    it('SqlQueryHistory.mergeQuery should work', function() {

        const defaultInfo = new QueryInfo();
        const cases = [
            {
                name: 'case #1',
                input: () => (Object.assign({}, defaultInfo)),
                update: () => ({ queryId: 'newQueryId'}),
                expect: () => {
                    const info = Object.assign({}, defaultInfo);
                    info.queryId = 'newQueryId';
                    return info;
                }
            },
            {
                name: 'case #2',
                input: () => (Object.assign({}, defaultInfo)),
                update: () => ({
                    queryId: 'newQueryId',
                    status: 'newStatus',
                    queryString: 'newQueryString',
                    startTime: 123,
                    endTime: 456,
                    newTableName: 'newTable',
                    errorMsg: 'errorMessage',
                    dataflowId: 'dfId',
                    rows: 'rows',
                    skew: 5,
                    columns: 'columns'
                }),
                expect: () => ({
                    queryId: 'newQueryId',
                    status: 'newStatus',
                    queryString: 'newQueryString',
                    startTime: 123,
                    endTime: 456,
                    tableName: 'newTable',
                    errorMsg: 'errorMessage',
                    dataflowId: 'dfId',
                    rows: 'rows',
                    skew: 5,
                    columns: 'columns'
                })
            }
        ];

        for (const tcase of cases) {
            const result = tcase.input();
            SqlQueryHistory.mergeQuery(result, tcase.update());
            const expected = tcase.expect();
            for (const key of Object.keys(result)) {
                expect(result[key], `${tcase.name}:${key}`).to.equal(expected[key]);
            }
        }
    });

    it('SqlQueryHistory.writeQueryStore should work', function(done) {
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};

        const queryInfo = new SqlQueryHistory.QueryInfo();
        const queryId = 'qID';

        SqlQueryHistory.getInstance().writeQueryStore(queryId, queryInfo)
        .then( () => {
            expect(JSON.stringify(queryInfo)).to.equal(kvMap[queryId]);
            done();
        })
        .fail( (e) => {
            expect('No error').to.equal(undefined);
            done();
        })
        .always( () => {
            restoreApi(oldApi);
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
        });
    });

    it('SqlQueryHistory.readStore(normal) should work', function(done) {
        kvMap = {};
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};

        const idList = 'sql1,sql2,sql3,sql4,sql5,sql6,sql7,sql8,sql9,sql10';
        kvMap[sqlListKey] = idList;
        for (const sqlId of idList.split(',')) {
            kvMap[sqlId] = JSON.stringify({query: `${sqlId}_query`});
        }

        SqlQueryHistory.getInstance().readStore()
        .then( () => {
            expect(SqlQueryHistory.getInstance().isLoaded()).to.be.true;
            for (const sqlId of idList.split(',')) {
                const query = JSON.stringify({query: `${sqlId}_query`});
                expect(JSON.stringify(SqlQueryHistory.getInstance()._queryMap[sqlId])).to.equal(query);
            }
            done();
        })
        .fail( (e) => {
            expect('No error').to.be.undefined;
            done();
        })
        .always( () => {
            restoreApi(oldApi);
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
        })
    });

    it('SqlQueryHistory.readStore(first time user) should work', function(done) {
        kvMap = {};
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};

        SqlQueryHistory.getInstance().readStore()
        .then( () => {
            expect(SqlQueryHistory.getInstance().isLoaded()).to.be.true;
            done();
        })
        .fail( (e) => {
            expect('No error').to.be.undefined;
            done();
        })
        .always( () => {
            restoreApi(oldApi);
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
        })
    });

    it('SqlQueryHistory.upsertQuery(new query) should work', function(done) {
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};
        kvMap = {};

        const updateInfo = {
            queryId: 'sql#1',
            status: 'status',
            queryString: 'queryString',
            startTime: Date.now(),
            endTime: Date.now(),
            newTableName: 'table#1',
        };
        const queryExpected = new QueryInfo();
        SqlQueryHistory.mergeQuery(queryExpected, updateInfo);

        SqlQueryHistory.getInstance().upsertQuery(updateInfo)
        .then( (res) => {
            // Check return value
            expect(res.isNew).to.be.true;
            expect(JSON.stringify(res.queryInfo)).to.equal(JSON.stringify(queryExpected));
            // Check queryMap
            const mapValue = SqlQueryHistory.getInstance().getQuery(updateInfo.queryId);
            expect(mapValue).to.not.be.undefined;
            expect(mapValue).to.not.be.null;
            expect(JSON.stringify(mapValue)).to.equal(JSON.stringify(queryExpected));
            // Check KVStore
            expect(kvMap[sqlListKey]).to.equal(`${updateInfo.queryId},`);
            expect(kvMap[updateInfo.queryId]).to.equal(JSON.stringify(queryExpected));

            done();
        })
        .fail( () => {
            expect('No error').to.be.undefined;
            done();
        }).
        always( () => {
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
            restoreApi(oldApi);
        });
    });

    it('SqlQueryHistory.upsertQuery(existing query) should work', function(done) {
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};
        kvMap = {};

        const updateInfo = {
            queryId: 'sql#1',
            status: 'status',
            queryString: 'queryString',
            startTime: Date.now(),
            endTime: Date.now(),
            newTableName: 'table#1',
        };
        const queryExpected = new QueryInfo();
        SqlQueryHistory.mergeQuery(queryExpected, updateInfo);

        // Setup queryMap & KVStore
        const queryInfo = new QueryInfo();
        queryInfo.queryId = updateInfo.queryId;
        SqlQueryHistory.getInstance().setQuery(queryInfo);
        kvMap[sqlListKey] = `${updateInfo.queryId},`;
        kvMap[queryInfo.queryId] = JSON.stringify(queryInfo);

        SqlQueryHistory.getInstance().upsertQuery(updateInfo)
        .then( (res) => {
            // Check return value
            expect(res.isNew).to.be.false;
            expect(JSON.stringify(res.queryInfo)).to.equal(JSON.stringify(queryExpected));
            // Check queryMap
            const mapValue = SqlQueryHistory.getInstance().getQuery(updateInfo.queryId);
            expect(mapValue).to.not.be.undefined;
            expect(mapValue).to.not.be.null;
            expect(JSON.stringify(mapValue)).to.equal(JSON.stringify(queryExpected));
            // Check KVStore
            expect(kvMap[sqlListKey]).to.equal(`${updateInfo.queryId},`);
            expect(kvMap[updateInfo.queryId]).to.equal(JSON.stringify(queryExpected));

            done();
        })
        .fail( () => {
            expect('No error').to.be.undefined;
            done();
        }).
        always( () => {
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
            restoreApi(oldApi);
        });
    });
});