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
        });

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

            QueryManager.cancelQuery(1);
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

    describe("Bulk action", function() {
        before(function() {
            function getQueryLi(id) {
                var html = '<div class="xc-query query no-selection active done" data-id="' + id + '">' +
                    '<div class="queryInfo">' +
                        '<div class="rightPart">' +
                            '<i class="icon xi-trash xc-action deleteIcon"></i>' +
                            '<div class="checkbox">' +
                                '<i class="icon xi-ckbox-empty fa-13"></i><i class="icon xi-ckbox-selected fa-13"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
                return html;
            }
            var $li1 = getQueryLi(1);
            var $li2 = getQueryLi(2);
            $("#monitor-queryList").empty();
            $("#monitor-queryList").append($li1).append($li2);
        });

        it("toggling bulk option menu should work", function() {
            expect($("#monitorMenu-query").find(".bulkOptions").is(":visible")).to.be.false;
            expect($("#monitorMenu-query").find(".checkbox:visible").length).to.equal(0);

            $("#monitorMenu-query").find(".bulkOptionsSection .deleteIcon").click();
            expect($("#monitorMenu-query").find(".bulkOptions").is(":visible")).to.be.true;
            expect($("#monitorMenu-query").find(".checkbox:visible").length).to.be.gt(1);

            $("#monitorMenu-query").find(".bulkOptionsSection .exitOptions").click();
            expect($("#monitorMenu-query").find(".bulkOptions").is(":visible")).to.be.false;
            expect($("#monitorMenu-query").find(".checkbox:visible").length).to.equal(0);

            $("#monitorMenu-query").find(".bulkOptions").click();
            expect($("#monitorMenu-query").find(".bulkOptions").is(":visible")).to.be.false;
        });

        it("selecting checkboxes should work", function() {
            $("#monitorMenu-query").find(".bulkOptionsSection .deleteIcon").click();
            expect($("#monitorMenu-query").find(".bulkOptions").is(":visible")).to.be.true;
            expect($("#monitorMenu-query").find(".checkbox:visible").length).to.be.gt(1);
            expect($("#monitorMenu-query").find(".checkbox.checked").length).to.equal(0);

            $("#monitorMenu-query").find(".checkbox").eq(0).click();
            expect($("#monitorMenu-query").find(".checkbox.checked").length).to.equal(1);

            $("#monitorMenu-query").find(".checkbox").eq(0).click();
            expect($("#monitorMenu-query").find(".checkbox.checked").length).to.equal(0);
        });

        it("select and clear all should work", function() {
            expect($("#monitorMenu-query").find(".checkbox.checked").length).to.equal(0);
            $("#monitorMenu-query").find("li.selectAll").click();

            var numChecked = $("#monitorMenu-query").find(".checkbox.checked").length;
            expect(numChecked).to.be.gt(1);
            expect($("#monitorMenu-query").find(".checkbox").length).to.equal(numChecked);

            $("#monitorMenu-query").find("li.clearAll").click();
            expect($("#monitorMenu-query").find(".checkbox.checked").length).to.equal(0);
        });

        it("bulk delete should work", function() {
            var cachedFn = QueryManager.removeQuery;
            var count = 0;
            var called = false;
            QueryManager.removeQuery = function(id) {
                if (count === 0) {
                    expect(id).to.equal(1);
                } else {
                    expect(id).to.equal(2);
                }
                count++;
                called = true;
            };

            $("#monitorMenu-query").find("li.selectAll").click();
            var numChecked = $("#monitorMenu-query").find(".checkbox.checked").length;
            expect(numChecked).to.be.gt(1);

            expect($("#monitorMenu-query .query").length).to.be.gt(1);
            $("#monitorMenu-query").find("li.deleteAll").click();
            expect(called).to.be.true;
            expect($("#monitorMenu-query").find(".bulkOptions").is(":visible")).to.be.false;
            expect(count).to.equal(2);

            QueryManager.removeQuery = cachedFn;
        });

        after(function() {
            $("#monitor-queryList").find(".query").last().remove();
            $("#monitor-queryList").find(".query").last().remove();
        });
    });

    after(function() {
        for (var i in queryLists) {
            delete queryLists[i];
        }
        for (var key in queryListsCache) {
            queryLists[key] = queryListsCache[key];
        }
    });
});