describe('QueryManager Test', function() {
    var queryLists;
    var queryListsCache = {};
    var queryCheckLists;
    var $queryList;
    var $queryDetail;

    before(function() {
        UnitTest.onMinMode();

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

    describe("restore", function() {
        it("restore should work", function() {
            var cachedGetLogs = Log.getLogs;
            Log.getLogs = function() {
                return [];
            };
            QueryManager.restore([{name: "unitTest2"}]);
            expect($queryList.text().indexOf("unitTest2")).to.be.gt(-1);
            expect(queryLists[-1].name).to.equal("unitTest2");
            delete queryLists[-1];
            $queryList.find(".xcQuery").filter(function() {
                return $(this).find('.name') === "unitTest2";
            }).remove();
            Log.getLogs = cachedGetLogs;
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

            expect($queryDetail.find(".xc-query").hasClass("processing"))
            .to.be.true;
            expect($queryDetail.find(".progressBar").width()).to.equal(0);
            expect($queryDetail.find(".querySteps").text()).to.equal("");
            expect($queryDetail.find(".operationSection .content").text())
            .to.equal("");

            var $queryLi = $queryList.find(".xc-query").last();
            expect($queryList.find(".hint").length).to.equal(0);
            expect($queryList.find(".xc-query").length)
            .to.equal(queryListLen + 1);
            expect($queryLi.find(".name").text()).to.equal("testQuery");
            expect($queryLi.find(".querySteps").text()).to.equal("");
            expect($queryLi.hasClass("processing")).to.be.true;
            expect($queryLi.hasClass("active")).to.be.true;

            expect(queryObj.subQueries.length).to.equal(0);
        });

        it('QueryManager.addSubQuery should work', function(done) {
            var getStatsCalled = false;
            XcalarGetOpStats = function() {
                getStatsCalled = true;
                return PromiseHelper.reject();
            };

            var name = "map";
            var dstTable = "destTable";
            var query = 'map --eval "wordCount(fakeCol)" ' +
                        '--srctable "srcTable#ab12" --fieldName "newFakeCol" ' +
                        '--dsttable "destTable";';

            QueryManager.addSubQuery(2, name, dstTable, query); // wrong ID
            expect(queryObj.subQueries.length).to.equal(0);
            expect(getStatsCalled).to.be.false;

            QueryManager.addSubQuery(1, name, dstTable, query); // correct ID
            setTimeout(function() {
                expect(queryObj.subQueries.length).to.equal(1);
                expect(getStatsCalled).to.be.true;
                expect($queryDetail.find(".operationSection .content").text())
                .to.equal(query);
                expect(queryCheckLists[1]).to.be.undefined;
                done();
            }, 100);
        });

        it('QueryManager.addQuery to xcQuery should work', function(done) {
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
                        '--srctable "srcTable#ab12" --fieldName "newFakeCol" ' +
                        '--dsttable "destTable";';

            queryObj.currStep = 1;
            QueryManager.addSubQuery(1, 'mapQuery', 'dstTable2', query, {queryName: 'queryName'});
            setTimeout(function() {
                expect(queryObj.subQueries.length).to.equal(2);
                expect(getStatsCalled).to.be.false;
                expect(getQueryStateCalled).to.be.true;
                expect($queryDetail.find(".operationSection .content").text())
                .to.equal(query + query);
                expect(queryCheckLists[1]).to.be.undefined;
                done();
            }, 100);
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

        it("unlockSrcTables should work", function() {
            var cachedUnlock = xcHelper.unlockTable;
            var tables = [];
            xcHelper.unlockTable = function(tId) {
                tables.push(tId);
            };
            var fn = QueryManager.__testOnly__.unlockSrcTables;
            var fakeQuery = new XcQuery({
                "srcTables": ["table#1a", "table#2b", "table#2b"] // duplicate on purpose
            });
            var firstPart = 'map --eval "concat(\\"1\\", \\"2\\")" --srctable "A#Vi5" ' +
                        '--fieldName "B" --dsttable "A#Vi25";';
            var secondPart = 'join --leftTable "c.index#Vi35" --rightTable ' +
                        '"d.index#Vi36" --joinType innerJoin ' +
                        '--joinTable "a#Vi34";';
            fakeQuery.queryStr = firstPart + secondPart;

            fn(fakeQuery);
            expect(tables.length).to.equal(5);
            expect(tables[0]).to.equal("1a");
            expect(tables[1]).to.equal("2b");
            expect(tables[2]).to.equal("Vi5");
            expect(tables[3]).to.equal("Vi35");
            expect(tables[4]).to.equal("Vi36");
            xcHelper.unlockTable = cachedUnlock;
        });

        it('QueryManager.removeQuery should work', function() {
            var queryListLen = $queryList.find(".xc-query").length;
            expect(queryLists[1]).to.be.an.object;
            expect($queryDetail.find(".operationSection .content").text())
            .to.not.equal("");
            expect($queryList.find(".xc-query").last().hasClass("active"))
            .to.be.true;

            QueryManager.removeQuery(1, true);

            expect(queryLists[1]).to.be.undefined;
            expect($queryDetail.find(".operationSection .content").text())
            .to.equal("");
            expect($queryList.find(".xc-query").last().hasClass("active"))
            .to.be.false;
            expect($queryList.find(".xc-query").length)
            .to.equal(queryListLen - 1);
        });

        after(function() {
            XcalarGetOpStats = cachedGetOpStats;
            XcalarQueryState = cachedQueryState;
        });
    });

    describe("xcalarQuery", function() {
        it("mainQueryCheck should work", function() {
            var cachedQueryState = XcalarQueryState;
            var stateCalled = false;
            XcalarQueryState = function() {
                stateCalled = true;
                return PromiseHelper.resolve({queryState: QueryStateT.qrError,
                    numCompletedWorkItem: 0});
            };

            var cachedXcalarQuery = XcalarQuery;
            var queryCalled = false;
            XcalarQuery = function(name, query) {
                queryCalled = true;
                expect(query).to.equal("filter --dstTable unitTestTable;");
                return PromiseHelper.resolve();
            };
            QueryManager.addQuery(999, "unitTest", {
                query: "filter --dstTable unitTestTable"
            });
            console.log(queryLists);
            var query = queryLists[999];
            expect(query.subQueries.length).to.equal(1);
            expect(query.subQueries[0].name).to.equal("filter");
            expect(queryCalled).to.be.true;
            expect(stateCalled).to.be.true;

            XcalarQueryState = cachedQueryState;
            XcalarQuery = cachedXcalarQuery;
        });

        it("remove query should work", function() {
            expect(queryLists[999]).to.not.be.undefined;
            var numList = $queryList.find(".xc-query").length;
            QueryManager.removeQuery(999);
            expect($queryList.find(".xc-query").length).to.equal(numList - 1);
            expect(queryLists[999]).to.be.undefined;
        });
    });

    describe("Focusing", function() {
        it("should scroll to focused item", function() {
            var lis = "";
            for (var i = 0; i < 100; i++) {
                lis += "<div class='xc-query query'></div>";
            }
            lis += "<div class='xc-query query active'></div>";
            var $lis = $(lis);
            $queryList.append($lis);
            var scrollTop = $queryList.scrollTop();
            QueryManager.scrollToFocused();
            expect($queryList.scrollTop()).to.be.gt(scrollTop + 4000);
            $lis.remove();
        });
        it("focus on output should work", function() {
            var fakeQuery = new XcQuery({});
            queryLists[999] = fakeQuery;
            $queryList.append("<div data-id='999' class='xc-query query active'></div>");

            $("#monitor-inspect").click();

            UnitTest.hasAlertWithTitle("table not found");
            $queryList.find(".query").last().remove();
            delete queryLists[999];
        });

        it("focus on dsOutput should work", function(done) {
            var fakeQuery = new XcQuery({});
            queryLists[999] = fakeQuery;
            $queryList.append("<div data-id='999' class='xc-query query active'></div>");

            fakeQuery.getOutputTableName = function() {
                return gDSPrefix + "fakeDS";
            };

            $("#monitor-inspect").click();
            UnitTest.testFinish(function() {
                return $("#alertHeader .text").text() === "Dataset Not Found";
            })
            .then(function() {
                UnitTest.hasAlertWithTitle("dataset not found", {confirm: true});
                $queryList.find(".query").last().remove();
                delete queryLists[999];
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("focus on table output should work", function() {
            var fakeQuery = new XcQuery({});
            queryLists[999] = fakeQuery;
            $queryList.append("<div data-id='999' class='xc-query query active'></div>");
            var cachedFn = WSManager.getWSFromTable;
            WSManager.getWSFromTable = function() {
                return true;
            };
            fakeQuery.getOutputTableName = function() {
                return "fakeTable#fakeId";
            };

            gTables["fakeId"] = new TableMeta({
                tableId: "fakeId",
                tableName: "test#fakeId",
                status: TableType.Undone
            });

            $("#monitor-inspect").click();

            UnitTest.hasAlertWithTitle("table not found");
            $queryList.find(".query").last().remove();
            delete queryLists[999];
            delete gTables["fakeId"];
            WSManager.getWSFromTable = cachedFn;
        });

        // it("focus on table output should work case 2", function(done) {
        //     var fakeQuery = new XcQuery({});
        //     queryLists[999] = fakeQuery;
        //     $queryList.append("<div data-id='999' class='xc-query query active'></div>");
        //     var cachedFn = WSManager.getWSFromTable;
        //     WSManager.getWSFromTable = function() {
        //         return true;
        //     };
        //     fakeQuery.getOutputTableName = function() {
        //         return "fakeTable#fakeId";
        //     };

        //     $("#monitor-inspect").click();

        //     UnitTest.testFinish(function() {
        //         return $("#alertHeader .text").text() === "Table Not Found";
        //     })
        //     .then(function() {
        //         UnitTest.hasAlertWithTitle("table not found", {confirm: true});
        //         WSManager.getWSFromTable = cachedFn;
        //         $queryList.find(".query").last().remove();
        //         delete queryLists[999];
        //         done();
        //     });
        // });
    });

    describe('Canceling', function() {
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
        it("confirmCanceledQuery should work", function() {
            var list = queryLists;
            var fakeQuery = new XcQuery({});
            var id = 65535;
            list[id] = fakeQuery;
            QueryManager.confirmCanceledQuery(id);
            expect(fakeQuery.outputTableState).to.equal("deleted");
            expect(fakeQuery.state).to.equal("canceled");

            var fnCalled = false;
            var cachedFn = DSCart.queryDone;
            DSCart.queryDone = function() {
                fnCalled = true;
            };
            fakeQuery.subQueries[0] = {
                getName: function() {
                    return "index from DS";
                }
            };

            QueryManager.confirmCanceledQuery(id);
            expect(fnCalled).to.be.true;

            DSCart.queryDone = cachedFn;
            delete list[id];
        });

        it("cleanup canceled tables should work", function() {
            var fakeQuery = new XcQuery({});
            var list = QueryManager.__testOnly__.canceledQueries;
            var id = 65535;
            list[id] = fakeQuery;
            QueryManager.cleanUpCanceledTables(id);
            expect(list[id]).to.be.undefined;
        });
    });

    describe("Bulk action", function() {
        before(function() {
            function getQueryLi(id) {
                var html =
                '<div class="xc-query query no-selection active done" ' +
                'data-id="' + id + '">' +
                    '<div class="queryInfo">' +
                        '<div class="rightPart">' +
                            '<i class="icon xi-trash xc-action deleteIcon"></i>' +
                            '<div class="checkbox">' +
                                '<i class="icon xi-ckbox-empty fa-13"></i>' +
                                '<i class="icon xi-ckbox-selected fa-13"></i>' +
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
            var $query = $("#monitorMenu-query");
            expect($query.find(".bulkOptions").is(":visible")).to.be.false;
            expect($query.find(".checkbox:visible").length).to.equal(0);

            $query.find(".bulkOptionsSection .deleteIcon").click();
            expect($query.find(".bulkOptions").is(":visible")).to.be.true;
            expect($query.find(".checkbox:visible").length).to.be.gt(1);

            $query.find(".bulkOptionsSection .exitOptions").click();
            expect($query.find(".bulkOptions").is(":visible")).to.be.false;
            expect($query.find(".checkbox:visible").length).to.equal(0);

            $query.find(".bulkOptions").click();
            expect($query.find(".bulkOptions").is(":visible")).to.be.false;
        });

        it("selecting checkboxes should work", function() {
            var $query = $("#monitorMenu-query");
            $query.find(".bulkOptionsSection .deleteIcon").click();
            expect($query.find(".bulkOptions").is(":visible")).to.be.true;
            expect($query.find(".checkbox:visible").length).to.be.gt(1);
            var numChecked = $query.find(".checkbox.checked").length;
            expect(numChecked).to.be.gt(1);

            $query.find(".checkbox").eq(0).click();
            expect($query.find(".checkbox.checked").length)
            .to.be.lt(numChecked);

            $query.find(".checkbox").eq(0).click();
            expect($query.find(".checkbox.checked").length)
            .to.equal(numChecked);
        });

        it("select and clear all should work", function() {
            var $query = $("#monitorMenu-query");
            $query.find("li.selectAll").click();

            var numChecked = $query.find(".checkbox.checked").length;
            expect(numChecked).to.be.gt(1);
            expect($query.find(".checkbox").length).to.equal(numChecked);

            $query.find("li.clearAll").click();
            expect($query.find(".checkbox.checked").length).to.equal(0);
        });

        it("bulk delete should work", function() {
            var $query = $("#monitorMenu-query");
            var cachedFn = QueryManager.removeQuery;
            var count = 0;
            var called = false;
            QueryManager.removeQuery = function(ids) {
                if (count === 0) {
                    expect(ids[0]).to.equal(1);
                    expect(ids[1]).to.equal(2);
                } else {
                    expect(id).to.equal(2);
                }
                count++;
                called = true;
            };

            $query.find("li.selectAll").click();
            var numChecked = $query.find(".checkbox.checked").length;
            expect(numChecked).to.be.gt(1);

            expect($query.find(".query").length).to.be.gt(1);
            $query.find("li.deleteAll").click();
            expect(called).to.be.true;
            expect($query.find(".bulkOptions").is(":visible")).to.be.false;
            expect(count).to.equal(1);

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

        UnitTest.offMinMode();
    });
});