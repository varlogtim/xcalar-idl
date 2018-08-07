describe("SqlQueryHistoryPanel Test", function() {
    let kvMap = {};
    const keySqlList = 'gSQLQuery-1';
    const fakeApi = {
        getKey: function() {
            return  keySqlList;
        },
        get: function() {
            return PromiseHelper.resolve(kvMap[this.key]);
        },
        put: function(content) {
            kvMap[this.key] = content;
            return PromiseHelper.resolve();
        },
        append: function(content) {
            const value = kvMap[this.key] || '';
            kvMap[this.key] = `${value}${content}`;
            return PromiseHelper.resolve();
        }
    };
    const oldApi = {};
    const replaceApi = function() {
        for (const fname of Object.keys(fakeApi)) {
            oldApi[fname] = KVStore.prototype[fname];
            KVStore.prototype[fname] = fakeApi[fname];
        }
    }
    const restoreApi = function() {
        for (const fname of Object.keys(oldApi)) {
            KVStore.prototype[fname] = oldApi[fname];
        }
    }

    const clearMap = function() {
        kvMap = {};
    }

    const makeupQueryMap = function(count) {
        const statusList = [
            SQLStatus.Running,
            SQLStatus.Compiling,
            SQLStatus.Failed,
            SQLStatus.Done,
            SQLStatus.Cancelled,
        ];
        const queryMap = {};
        for (let i = 0; i < count; i ++) {
            const queryInfo = new SqlQueryHistory.QueryInfo();
            queryInfo.queryId = `sql#${i}`;
            queryInfo.status = statusList[i % statusList.length];
            queryInfo.queryString = `query#${i}`;
            queryInfo.startTime = Date.now();
            if (queryInfo.status !== SQLStatus.Running && queryInfo.status !== SQLStatus.Compiling) {
                queryInfo.endTime = queryInfo.startTime + 1000 * i;
            }
            if (queryInfo.status === SQLStatus.Failed) {
                queryInfo.errorMsg = `error#${i}`;
            } else {
                queryInfo.tableName = `table#${i}`;
            }

            queryMap[queryInfo.queryId] = queryInfo;
        }
        return queryMap;
    }

    before( function() {
        UnitTest.onMinMode();
        replaceApi();
    });

    describe("SqlQueryHistoryPanel.Table Test", function() {
        const compCard = SqlQueryHistoryPanel.Card.getInstance();
        compCard.setup();
        const compTable = compCard._tableComponent;
        const onClickQuery = () => {};
        const onClickTable = () => {};
        const onClickError = () => {};

        it("Table.updateUI should work", function() {
            // Empty table
            let queryMap = {}, orderIndex = [];
            compTable.updateUI(
                queryMap, orderIndex,
                onClickQuery, onClickTable, onClickError
            );
            expect(compTable._$bodyContainer.html().length).to.equal(0);
            // Normal table
            queryMap = makeupQueryMap(10);
            orderIndex = Object.keys(queryMap);
            compTable.updateUI(
                queryMap, orderIndex,
                onClickQuery, onClickTable, onClickError
            );
            expect(compTable._$bodyContainer.children().length).to.equal(10);
        });

        it("Table.updateOneQuery should work", function() {
            const queryMap = makeupQueryMap(10);
            const orderIndex = Object.keys(queryMap);
            compTable.updateUI(
                queryMap, orderIndex,
                onClickQuery, onClickTable, onClickError
            );
            // Query exists
            const updateQueryInfo = queryMap[orderIndex[1]];
            updateQueryInfo.queryString = 'updatedQueryString';
            expect(compTable.updateOneQuery(updateQueryInfo)).to.be.true;
            expect($(compTable._$bodyContainer.children()[1]).html().indexOf('updatedQueryString')).to.be.gt(0);
            // Query doesn't exist
            const expectedHTML = compTable._$bodyContainer.html();
            expect(compTable.updateOneQuery({queryId: 'not-exist'})).to.be.false;
            expect(compTable._$bodyContainer.html()).to.equal(expectedHTML);
        });

        it("Table.addOneQuery should work", function() {
            const queryMap = makeupQueryMap(10);
            const orderIndex = Object.keys(queryMap);
            const tBody = compTable._$bodyContainer;

            const queryInfo = new SqlQueryHistory.QueryInfo();
            queryInfo.queryId = 'newSql';
            queryInfo.queryString = 'ThisIsANewQuery';

            // Add to head
            compTable.updateUI(
                queryMap, orderIndex,
                onClickQuery, onClickTable, onClickError
            );
            compTable.addOneQuery(
                queryInfo, onClickQuery, onClickTable, onClickError, false
            );
            expect($(tBody.children()[0]).html().indexOf(queryInfo.queryString))
                .to.be.gt(0);

            // Add to tail
            compTable.updateUI(
                queryMap, orderIndex,
                onClickQuery, onClickTable, onClickError
            );
            compTable.addOneQuery(
                queryInfo, onClickQuery, onClickTable, onClickError, true
            );
            const children = tBody.children();
            expect($(children[children.length - 1]).html().indexOf(queryInfo.queryString))
                .to.be.gt(0);

            // Invalid query
            const qId = Object.keys(compTable._updateHandlers)[0];
            const result = compTable.addOneQuery(
                {queryId: qId},onClickQuery, onClickTable, onClickError
            );
            expect(result).to.be.false;
        });

        it('Table handlers should work', function() {
            // Duration handler
            const fakeElem = {text: function(txt){this.value = txt;}, value: ''};
            compTable._createDurationHandler(fakeElem, Date.now() - 1000)();
            expect(fakeElem.value.length).to.be.gt(0);

        });
    });

    describe('SqlQueryHistoryPanel.Card Test', function() {
        const compCard = SqlQueryHistoryPanel.Card.getInstance();
        compCard.setup();
        const compTable = compCard._tableComponent;

        it('Card._sortFunctions should work', function() {
            let list = [];

            // Sort duration
            const sortDuration = SqlQueryHistoryPanel.Card._sortFunctions.sortDuration;
            for (let i = 0; i < 5; i ++) {
                list.push({ startTime: 0, endTime: 100 - i, id: i});
            }
            list.sort(sortDuration);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }

            // Sort start time
            list = [];
            const sortStartTime = SqlQueryHistoryPanel.Card._sortFunctions.sortStartTime;
            for (let i = 0; i < 5; i ++) {
                list.push({ startTime: 10 - i, id: i});
            }
            list.sort(sortStartTime);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }

            // Sort Status
            list = [];
            const sortStatus = SqlQueryHistoryPanel.Card._sortFunctions.sortStatus;
            for (let i = 0; i < 5; i ++) {
                list.push({ status: `${9 - i}`, id: i});
            }
            list.sort(sortStatus);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }

        });

        it('Card handlers should work', function() {
            const card = SqlQueryHistoryPanel.Card.getInstance();
            // Click error
            card._onClickError('error message')();
            expect(Alert.isOpen()).to.be.true;
            Alert.forceClose();
        });

        it('Card.setup option should work', function(done) {
            SqlQueryHistory.getInstance()._queryMap = {};
            clearMap();
            const queryMap = makeupQueryMap(500);
            const sqlIdList = Object.keys(queryMap).join(',') + ',';
            for (const sqlId of Object.keys(queryMap)) {
                const query = queryMap[sqlId];
                SqlQueryHistory.getInstance().writeQueryStore(sqlId, query);
            }
            kvMap[keySqlList] = sqlIdList;

            PromiseHelper.resolve()
            .then( () => {
                // isShowAll: false
                SqlQueryHistory.getInstance()._isLoaded = false;
                compCard.setup({ isShowAll: false });
                return compCard.show();
            })
            .then( () => {
                expect(compTable._$bodyContainer.children().length).to.be.lt(500);
            })
            .then( () => {
                // isShowAll: true
                SqlQueryHistory.getInstance()._isLoaded = false;
                compCard.setup({ isShowAll: true });
                return compCard.show();
            })
            .then( () => {
                expect(compTable._$bodyContainer.children().length).to.equal(500);
            })
            .then( () => {
                done();
            })
            .fail( () => {
                expect('No error').to.be.undefined;
                done();
            })
        });

        it('Card.update should work', function(done) {
            clearMap();
            const queryMap = makeupQueryMap(10);
            const sqlIdList = Object.keys(queryMap).join(',') + ',';
            for (const sqlId of Object.keys(queryMap)) {
                const query = queryMap[sqlId];
                SqlQueryHistory.getInstance().writeQueryStore(sqlId, query);
            }
            kvMap[keySqlList] = sqlIdList;

            PromiseHelper.resolve()
            .then( () => {
                // Init table
                SqlQueryHistory.getInstance()._queryMap = {};
                SqlQueryHistory.getInstance()._isLoaded = false;
                compCard.setup();
                return compCard.show();
            })
            .then( () => {
                // Existing query
                const updateInfo = {
                    queryId: Object.keys(queryMap)[0],
                    queryString: 'updateQueryString'
                };
                return compCard.update(updateInfo);
            })
            .then( () => {
                expect(compTable._$bodyContainer.children().length).to.equal(10);
            })
            .then( () => {
                // New query
                const updateInfo = {
                    queryId: 'newSqlID',
                    queryString: 'updateQueryString'
                };
                return compCard.update(updateInfo);
            })
            .then( () => {
                expect(compTable._$bodyContainer.children().length).to.equal(11);
            })
            .then( () => { done(); })
            .fail( () => {
                expect('No error').to.be.undefined;
                done();
            })
        });
    });

    after( function() {
        restoreApi();
        UnitTest.offMinMode();
    })
});