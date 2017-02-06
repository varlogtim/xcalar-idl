describe('QueryManager Test', function() {
    var queryLists;
    var queryListsCache = {};
    var queryCheckLists;
    var $queryList;
    var $queryDetail;

    before(function() {
        queryLists = QueryManager.__testOnly__.queryLists;
        queryCheckLists = QueryManager.__testOnly__.queryCheckLists;
        for (var i in queryLists) {
            queryListsCache[i] = queryLists[i];
            delete queryLists[i];
        }
        $queryList = $("#monitor-queryList");
        $queryDetail = $("#monitor-queryDetail");

        if (!$("#monitorTab").hasClass("active")) {
            $("#monitorTab .mainTab").click();
        }
        // open up panel
        if (!$("#mainMenu").hasClass("open")) {
            $("#monitorTab .mainTab").click();
        }
        if (!$("#monitorMenu .menuSection.query").is(":visible")) {
            $("#queriesButton").click();
        }

        $queryList.find(".xc-query").remove(); // clear the list
    });

    describe('getElapsedTimeStr())', function() {
        it("getElapsedTimeStr should work", function() {
            var func = QueryManager.__testOnly__.getElapsedTimeStr;
            expect(func(999)).to.equal('999ms');
            expect(func(1000)).to.equal('1.0s');
            expect(func(1999)).to.equal('1.99s');
            expect(func(19999)).to.equal('19.9s');
            expect(func(69000)).to.equal('1m 9s');
            expect(func(699900)).to.equal('11m 39s');
            expect(func(5000000)).to.equal('1h 23m 20s');
            expect(func(105000000)).to.equal('29h 10m 0s');
        });
    });

    describe('QueryManager.addQuery()', function() {
        var queryObj;
        var cachedGetOpStats;

        before(function() {
            cachedGetOpStats = XcalarGetOpStats;
            cachedQueryState = XcalarQueryState;
        })

        it('addQuery should initialize query display', function() {
            $queryList.find(".hint").removeClass("xc-hidden");
            var queryListLen = $queryList.find(".xc-query").length;
           
            expect(queryLists[1]).to.be.undefined;
            expect($queryList.find(".hint.xc-hidden").length).to.equal(0);
            $queryDetail.find(".operationSection .content").text("");
            QueryManager.addQuery(1, 'testQuery', {});
            queryObj = queryLists[1];

            expect(queryObj).to.be.an.object;
            expect(queryObj.fullName.indexOf('testQuery-')).to.be.gt(-1);
            expect(queryObj.type).to.equal("xcFunction");
            expect(queryObj.numSteps).to.equal(-1);

            expect($queryDetail.find(".xc-query").hasClass("processing")).to.be.true;
            expect($queryDetail.find(".progressBar").width()).to.equal(0);
            expect($queryDetail.find(".querySteps").text()).to.equal("");
            expect($queryDetail.find(".operationSection .content").text()).to.equal("");
            
            var $queryLi = $queryList.find(".xc-query").last();
            expect($queryList.find(".hint.xc-hidden").length).to.equal(1);
            expect($queryList.find(".xc-query").length).to.equal(queryListLen + 1);
            expect($queryLi.find(".name").text()).to.equal("testQuery");
            expect($queryLi.find(".querySteps").text()).to.equal("");
            expect($queryLi.hasClass("processing")).to.be.true;
            expect($queryLi.hasClass("active")).to.be.true;

            expect(queryObj.subQueries.length).to.equal(0);
        });

        it('QueryManager.addSubQuery should work', function() {
            var getStatsCalled = false;
            XcalarGetOpStats = function() {
                expect(queryCheckLists[1]).to.be.gt(0);
                getStatsCalled = true;
                return PromiseHelper.reject();
            };

            var name = "map";
            var dstTable = "destTable";
            var query = 'map --eval "wordCount(fakeCol)" ' +
            '--srctable "srcTable" --fieldName "newFakeCol" --dsttable "destTable";';

            QueryManager.addSubQuery(2, name, dstTable, query); // wrong ID
            expect(queryObj.subQueries.length).to.equal(0);
            expect(getStatsCalled).to.be.false;

            QueryManager.addSubQuery(1, name, dstTable, query); // correct ID
            expect(queryObj.subQueries.length).to.equal(1);
            expect(getStatsCalled).to.be.true;
            expect($queryDetail.find(".operationSection .content").text()).to.equal(query);
            expect(queryCheckLists[1]).to.be.undefined;
        });

        it('QueryManager.addQuery to xcQuery should work', function() {
            var getStatsCalled = false;
            var getQueryStateCalled = false;
            XcalarGetOpStats = function() {
                getStatsCalled = true;
                return PromiseHelper.reject();
            };
            XcalarQueryState = function() {
                getQueryStateCalled = true;
                expect(queryCheckLists[1]).to.be.gt(0);
                return PromiseHelper.reject();
            };

            var query = 'map --eval "wordCount(fakeCol)" ' +
            '--srctable "srcTable" --fieldName "newFakeCol" --dsttable "destTable";';

            queryObj.currStep = 1;
            QueryManager.addSubQuery(1, 'mapQuery', 'dstTable2', query, 'queryName');
            expect(queryObj.subQueries.length).to.equal(2);
            expect(getStatsCalled).to.be.false;
            expect(getQueryStateCalled).to.be.true;
            expect($queryDetail.find(".operationSection .content").text()).to.equal(query + query);
            expect(queryCheckLists[1]).to.be.undefined;

        });

        it('QueryManager.cancelQuery should work', function(done) {
            var transactionCanceled = false;
            var queryCancelCalled = false;
            var cancelOpCalled = false;
            var transactionCancelCache = Transaction.cancel;
            var transactionCancelableCache = Transaction.isCancelable;
            var deleteTableCache = XcalarDeleteTable;
            var queryCancelCache = XcalarQueryCancel;
            var cancelOpCache = XcalarCancelOp;
            Transaction.cancel = function() {
                transactionCanceled = true;  
            };
            Transaction.isCancelable = function() {
                return true;
            };
            XcalarDeleteTable = function() {
                return PromiseHelper.resolve();
            };
            XcalarQueryCancel = function() {
                queryCancelCalled = true;
                return PromiseHelper.resolve();
            };
            XcalarCancelOp = function() {
                cancelOpCalled = true;
                return PromiseHelper.resolve();  
            };

            QueryManager.cancelQuery(2); // should fail, wrong id
            expect(transactionCanceled).to.be.false;
            expect(queryCancelCalled).to.be.false;
            expect(cancelOpCalled).to.be.false;

            queryObj.state = QueryStatus.Done;

            QueryManager.cancelQuery(1); // should fail
            expect(transactionCanceled).to.be.false;
            expect(queryCancelCalled).to.be.false;
            expect(cancelOpCalled).to.be.false;

            queryObj.state = QueryStatus.Run;
          
            QueryManager.cancelQuery(1); // should pass
            expect(transactionCanceled).to.be.true;
            expect(queryCancelCalled).to.be.true;
            expect(cancelOpCalled).to.be.false;

            queryObj.currStep = 0;

            QueryManager.cancelQuery(1)
            expect(cancelOpCalled).to.be.true;

            Transaction.cancel = transactionCancelCache;
            Transaction.isCancelable = transactionCancelableCache;
            XcalarDeleteTable = deleteTableCache;
            XcalarQueryCancel = queryCancelCache;
            XcalarCancelOp = cancelOpCache;
            done();
        });

        it('QueryManager.removeQuery should work', function() {
            var queryListLen = $queryList.find(".xc-query").length;
            expect(queryLists[1]).to.be.an.object;
            expect($queryDetail.find(".operationSection .content").text()).to.not.equal("");
            expect($queryList.find(".xc-query").last().hasClass("active")).to.be.true;

            QueryManager.removeQuery(1, true);

            expect(queryLists[1]).to.be.undefined;
            expect($queryDetail.find(".operationSection .content").text()).to.equal("");
            expect($queryList.find(".xc-query").last().hasClass("active")).to.be.false;
            expect($queryList.find(".xc-query").length).to.equal(queryListLen - 1);
        });

        after(function() {
            XcalarGetOpStats = cachedGetOpStats;
            XcalarQueryState = cachedQueryState;
        });
    });

    describe('Cancel DS upload', function() {
        it("QueryManager.cancelDS should work", function() {
            var dsCancelCache = DS.cancel;
            var cachedGetOpStats = XcalarGetOpStats;
            var cancelCalled = false;
            DS.cancel = function() {
                cancelCalled = true;
            };
            XcalarGetOpStats = function() {
                return PromiseHelper.reject();
            };

            QueryManager.addQuery(1, SQLOps.DSPoint, {});
            var name = SQLOps.DSPoint;
            var dstTable = ".XcalarDS.user.84380.dsName";
            var query = 'load --url "someurl" --name "name";';

            QueryManager.addSubQuery(1, name, dstTable, query);

            $queryList.find(".xc-query").last().find(".cancelIcon").click();
            expect(cancelCalled).to.be.true;
            DS.cancel = dsCancelCache;
            XcalarGetOpStats = cachedGetOpStats;

            delete queryLists[1];
            $queryList.find(".xc-query").last().remove();
        });
    });

    after(function() {
        for (var i in queryLists) {
            delete queryLists[i];
        }
        for (var i in queryListsCache) {
            queryLists[i] = queryListsCache[i];
        }
    });
});