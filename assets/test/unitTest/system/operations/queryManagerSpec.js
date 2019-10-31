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
        let cachedGetLogs;

        before(function() {
            cachedGetLogs = Log.getLogs;
            Log.getLogs = function() {
                return [];
            };
        });

        after(function() {
            Log.getLogs = cachedGetLogs;
        });

        afterEach(function() {
            $queryList.find(".xc-query").remove();
            for (const key of Object.keys(queryLists)) {
                delete queryLists[key];
            }
        });

        it("restore should work", function() {
            QueryManager.restore([{name: "unitTest2", time: Date.now()}]);
            expect($queryList.text().indexOf("unitTest2")).to.be.gt(-1);
            expect(queryLists[-1].name).to.equal("unitTest2");
        });

        it("restore should sort queries", function() {
            const time = Date.now();
            QueryManager.restore([{name: "unitTest3", time: time}, {name: "unitTest4", time: time - 10}]);
            expect($queryList.text().indexOf("unitTest3")).to.be.gt(-1);
            expect($queryList.text().indexOf("unitTest4")).to.be.gt(-1);
            expect(queryLists[-1].name).to.equal("unitTest3");
            expect(queryLists[-2].name).to.equal("unitTest4");
        });

        it("restore should return archive queries", function() {
            const time = Date.now();
            const lifeTime = 90 * 24 * 3600 * 1000;
            const archiveList = QueryManager.restore([{name: "unitTest3", time: time - lifeTime - 1000 * 10}, {name: "unitTest4", time: time}]);
            expect(archiveList.length).to.equal(1);
            expect($queryList.text().indexOf("unitTest3")).to.equal(-1);
            expect($queryList.text().indexOf("unitTest4")).to.be.gt(-1);
            expect(queryLists[-1].name).to.equal("unitTest4");
        });
    });

    describe("general functions", function() {
        it("xcHelper.parseQuery should work", function() {
            var firstPart = 'map --eval "concat(\\"1\\", \\"2\\")" --srctable "A#Vi5" ' +
                            '--fieldName "B" --dsttable "A#Vi25";';
            var secondPart = 'index --key "col1" --dataset ".XcalarDS.a.b" ' +
                            '--dsttable "b#Vi26" --prefix;';
            var thirdPart = 'join --leftTable "c.index#Vi35" --rightTable ' +
                            '"d.index#Vi36" --joinType innerJoin ' +
                            '--joinTable "a#Vi34";';
            var fourthPart = 'load --name "f264.schedule" ' +
                             '--targetName "Default Shared Root" ' +
                             '--path "/schedule/" ' +
                             '--apply "default:parseJson" --parseArgs "{}" ' +
                             '--size 0B;';
            var fifthPart = '   '; // blank

            var query =  firstPart + secondPart + thirdPart + fourthPart + fifthPart;

            var parsedQuery = QueryManager.parseQuery(query);
            expect(parsedQuery).to.be.an("array");
            expect(parsedQuery).to.have.lengthOf(4); // should exclude the blank

            expect(parsedQuery[0].name).to.equal("map");
            expect(parsedQuery[1].name).to.equal("index");
            expect(parsedQuery[2].name).to.equal("join");
            expect(parsedQuery[3].name).to.equal("load");

            expect(parsedQuery[0].dstTable).to.equal("A#Vi25");
            expect(parsedQuery[1].dstTable).to.equal("b#Vi26");
            expect(parsedQuery[2].dstTable).to.equal("a#Vi34");
            expect(parsedQuery[3].dstTable).to.equal(gDSPrefix + "f264.schedule");

            expect(parsedQuery[0].query).to.equal(firstPart.slice(0,-1));
            expect(parsedQuery[1].query).to.equal(secondPart.slice(0,-1));
            expect(parsedQuery[2].query).to.equal(thirdPart.slice(0,-1));
            expect(parsedQuery[3].query).to.equal(fourthPart.slice(0,-1));

            // export
            var sixthPart = 'export --targetType file --tableName A#dl4 ' +
                            '--targetName Default --exportName B#dl5 ' +
                            '--createRule --columnsNames class_id;time; ' +
                            '--headerColumnsNames class_id;time; --format csv ' +
                            '--fileName C.csv  --fieldDelim   --recordDelim b ' +
                            '--quoteDelim';

            parsedQuery = QueryManager.parseQuery(sixthPart);
            expect(parsedQuery).to.be.an("array");
            expect(parsedQuery).to.have.lengthOf(1);

            expect(parsedQuery[0].name).to.equal("export");
            expect(parsedQuery[0].dstTable).to.equal("B#dl5");
            expect(parsedQuery[0].exportFileName).to.equal("C.csv");
            expect(parsedQuery[0].query).to.equal(sixthPart);
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

            expect(queryObj).to.be.an('object');
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
            var query = '{"operation": "XcalarApiIndex","args": {"source": ".XcalarDS.test.73762.schedule4824","dest": "schedule4824#ky109","key":'
            +  '[{"name": "xcalarRecordNum","type": "DfUnknown","keyFieldName": "","ordering": "Unordered"}],"prefix": "schedule4824", "dhtName": "", "delaySort": false, "broadcast": false}}';

            QueryManager.addSubQuery(2, name, dstTable, query); // wrong ID
            expect(queryObj.subQueries.length).to.equal(0);
            expect(getStatsCalled).to.be.false;

            QueryManager.addSubQuery(1, name, dstTable, query); // correct ID
            setTimeout(function() {
                expect(queryObj.subQueries.length).to.equal(1);
                expect(getStatsCalled).to.be.true;
                expect($queryDetail.find(".operationSection .content").text().length);
                expect(queryCheckLists[1]).to.be.undefined;
                done();
            }, 100);
        });

        it("Copy operations should work", function() {
            let text = JSON.stringify({
                "operation": "XcalarApiIndex",
                "args": {
                  "source": ".XcalarDS.test.73762.schedule4824",
                  "dest": "schedule4824#ky109",
                  "key": [
                    {
                      "name": "xcalarRecordNum",
                      "type": "DfUnknown",
                      "keyFieldName": "",
                      "ordering": "Unordered"
                    }
                  ],
                  "prefix": "schedule4824",
                  "dhtName": "",
                  "delaySort": false,
                  "broadcast": false
                }
              }, null, 2);
            var cachedFn = xcUIHelper.copyToClipboard;
            var called = false;
            xcUIHelper.copyToClipboard = function(t) {
                expect(t).to.equal(text);
                called = true;

            }
            $queryDetail.find(".copy").click();
            expect(called).to.be.true;
            xcUIHelper.copyToClipboard = cachedFn;
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

            var query = '{"operation": "XcalarApiIndex","args": {"source": ".XcalarDS.test.73762.schedule4824","dest": "schedule4824#ky109","key":'
            +  '[{"name": "xcalarRecordNum","type": "DfUnknown","keyFieldName": "","ordering": "Unordered"}],"prefix": "schedule4824", "dhtName": "", "delaySort": false, "broadcast": false}}';

            queryObj.currStep = 1;
            QueryManager.addSubQuery(1, 'mapQuery', 'dstTable2', query, {queryName: 'queryName'});
            setTimeout(function() {
                expect(queryObj.subQueries.length).to.equal(2);
                expect(getStatsCalled).to.be.false;
                expect(getQueryStateCalled).to.be.true;
                expect($queryDetail.find(".operationSection .content").text().length);
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
            var cachedUnlock = TblFunc.unlockTable;
            var tables = [];
            TblFunc.unlockTable = function(tId) {
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
            TblFunc.unlockTable = cachedUnlock;
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
        it("xcalarQueryCheck should work", function(done) {
            var cachedQueryState = XcalarQueryState;
            var stateCalled = false;
            XcalarQueryState = function() {
                stateCalled = true;
                return PromiseHelper.resolve({queryState: QueryStateT.qrFinished,
                    numCompletedWorkItem: 2});
            };

            QueryManager.addQuery(999, "unitTest");
            QueryManager.addSubQuery(999, "map", "", '{"operation":"map","args":{"source":"t#0","dest":"t#1"}}', {queryName: "q1"});
            QueryManager.addSubQuery(999, "filter", "", '{"operation":"filter","args":{"source":"t#0","dest":"t#1"}}', {queryName: "q1"});
            UnitTest.testFinish(function() {
                return stateCalled;
            })
            .then(function() {
                expect(stateCalled).to.be.true;
                var query = queryLists[999];
                expect(query.subQueries.length).to.equal(2);
                expect(query.subQueries[0].name).to.equal("map");
                expect(query.subQueries[1].name).to.equal("filter");
                expect(query.subQueries[0].state).to.equal("done");
                expect(query.subQueries[1].state).to.equal("done");
                expect(query.currStep).to.equal(2);
                expect(query.state).to.equal(0);
                QueryManager.subQueryDone(999);
                expect(query.state).to.equal(0);
                QueryManager.queryDone(999);
                expect(query.state).to.equal("done");
                XcalarQueryState = cachedQueryState;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("remove query should work", function() {
            expect(queryLists[999]).to.not.be.undefined;
            var numList = $queryList.find(".xc-query").length;
            QueryManager.removeQuery(999);
            expect($queryList.find(".xc-query").length).to.equal(numList - 1);
            expect(queryLists[999]).to.be.undefined;
        });

        it("finishing transation with 1/2 queries done", function(done) {
            var cachedQueryState = XcalarQueryState;
            var stateCalled = false;
            var stateCalledTwice = false;
            XcalarQueryState = function() {
                if (stateCalled) {
                    stateCalledTwice = true;
                }
                stateCalled = true;
                return PromiseHelper.resolve({
                    queryState: QueryStateT.qrProcessing,
                    numCompletedWorkItem: 1,
                    queryGraph: {
                        node: [{
                            numWorkCompleted: 4,
                            numWorkTotal: 8
                        }]
                    }
                });
            };

            QueryManager.addQuery(9999, "unitTest");
            QueryManager.addSubQuery(9999, "map", "a", '{"operation":"map","args":{"source":"t#0","dest":"t#1"}}', {queryName: "q1"});
            QueryManager.addSubQuery(9999, "filter", "b", '{"operation":"filter","args":{"source":"t#0","dest":"t#1"}}', {queryName: "q1"});
            UnitTest.testFinish(function() {
                return stateCalledTwice;
            })
            .then(function() {
                expect(stateCalled).to.be.true;
                var query = queryLists[9999];
                expect(query.subQueries.length).to.equal(2);
                expect(query.subQueries[0].name).to.equal("map");
                expect(query.subQueries[1].name).to.equal("filter");
                expect(query.subQueries[0].state).to.equal("done");
                expect(query.subQueries[1].state).to.equal(0);
                expect(query.currStep).to.equal(1);
                expect(query.state).to.equal(0);

                QueryManager.queryDone(9999);
                expect(query.state).to.equal("done");

                XcalarQueryState = cachedQueryState;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("remove query should work", function() {
            expect(queryLists[9999]).to.not.be.undefined;
            var numList = $queryList.find(".xc-query").length;
            QueryManager.removeQuery(9999);
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

            QueryManager.addQuery(1, SQLOps.DSImport, {});
            var name = SQLOps.DSImport;
            var dstTable = ".XcalarDS.user.84380.dsName";
            var query = '{"operation": "XcalarApiIndex","args": {"source": ".XcalarDS.test.73762.schedule4824","dest": "schedule4824#ky109","key":'
            +  '[{"name": "xcalarRecordNum","type": "DfUnknown","keyFieldName": "","ordering": "Unordered"}],"prefix": "schedule4824", "dhtName": "", "delaySort": false, "broadcast": false}}';

            QueryManager.addSubQuery(1, name, dstTable, query);

            $queryList.find(".xc-query").last().find(".cancelIcon").click();
            expect(cancelCalled).to.be.true;
            DS.cancel = dsCancelCache;
            XcalarGetOpStats = cachedGetOpStats;

            delete queryLists[1];
            $queryList.find(".xc-query").last().remove();
        });
        // it("confirmCanceledQuery should work", function() {
        //     var list = queryLists;
        //     var fakeQuery = new XcQuery({});
        //     var id = 65535;
        //     list[id] = fakeQuery;
        //     QueryManager.confirmCanceledQuery(id);
        //     expect(fakeQuery.outputTableState).to.equal("deleted");
        //     expect(fakeQuery.state).to.equal("canceled");

        //     var fnCalled = false;
        //     var cachedFn = DSCart.queryDone;
        //     DSCart.queryDone = function() {
        //         fnCalled = true;
        //     };
        //     fakeQuery.subQueries[0] = {
        //         getName: function() {
        //             return "index from DS";
        //         }
        //     };

        //     QueryManager.confirmCanceledQuery(id);
        //     expect(fnCalled).to.be.true;

        //     DSCart.queryDone = cachedFn;
        //     delete list[id];
        // });

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
                            '<i class="icon xi-trash xc-icon-action deleteIcon"></i>' +
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