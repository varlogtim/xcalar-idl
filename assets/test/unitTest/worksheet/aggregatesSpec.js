describe("Aggregates", function() {
    describe("general functionality", function() {
        var isTheAgg;

        before(function() {
            isTheAgg = Aggregates.__testOnly__.isTheAgg;
        });

        it("aggregates should start empty", function() {
            Aggregates.clear();
            expect(Aggregates.getAggs()).to.be.empty;
        });

        it("adding and getting aggs should work", function() {
            var testId = "TS1";
            var testCol = "testCol";
            var aggOp = "sum";
            var aggRes = {
                "value": 5,
                "dagName": "aggy",
                "aggName": "^aggy",
                "tableId": testId,
                "backColName": testCol,
                "op": aggOp
            };
            var isTemp = false;
            Aggregates.addAgg(aggRes, isTemp);

            var agg = Aggregates.getAgg(testId, testCol, aggOp);
            expect(agg).to.be.an.instanceof(Agg);
            expect(isTheAgg(agg, testId, testCol, aggOp))
            .to.be.true;
        });

        it("adding temp agg should work", function() {
            var testId = "TS2";
            var testCol = "testCol2";
            var aggOp = "sum";
            var aggRes = {
                "value": 6,
                "dagName": "aggy2",
                "aggName": "^aggy2",
                "tableId": testId,
                "backColName": testCol,
                "op": aggOp
            };
            var isTemp = true;
            Aggregates.addAgg(aggRes, isTemp);
            var agg = Aggregates.getAgg(testId, testCol, aggOp);
            expect(agg).to.be.an.instanceof(Agg);
            expect(isTheAgg(agg, testId, testCol, aggOp))
            .to.be.true;

            // should have 1 temp agg and 1 non-temp agg by now
            var aggs = Aggregates.getAggs();
            expect(aggs).to.be.an("object");
            expect(aggs).to.have.ownProperty("aggy");
            expect(aggs).to.not.have.ownProperty("aggy2");
        });

        it("get named aggs should work", function() {
            // add a 3rd agg
            var testId = "TS3";
            var testCol = "testCol3";
            var aggOp = "sum";
            var aggRes = {
                "value": 6,
                "dagName": "aggy3",
                "aggName": "aggy3",
                "tableId": testId,
                "backColName": testCol,
                "op": aggOp
            };
            var isTemp = false;
            Aggregates.addAgg(aggRes, isTemp);

            var aggs = Aggregates.getAggs();
            expect(aggs).to.have.all.keys("aggy", "aggy3");

            aggs = Aggregates.getNamedAggs();
            expect(aggs).to.have.ownProperty("aggy");
            expect(aggs).to.not.have.ownProperty("aggy3");
        });

        it("remove agg should work", function() {
            var aggs = Aggregates.getAggs();
            expect(aggs).to.be.an("object");
            expect(aggs).to.have.ownProperty("aggy");

            Aggregates.removeAgg("aggy");

            aggs = Aggregates.getAggs();
            expect(aggs).to.be.an("object");
            expect(aggs).to.not.have.ownProperty("aggy");
        });

        it("clear should work", function() {
            var aggs = Aggregates.getAggs();
            expect(aggs).to.have.ownProperty("aggy3");
            expect(aggs).to.not.be.empty;

            Aggregates.clear();
            aggs = Aggregates.getAggs();
            expect(aggs).to.be.an("object");
            expect(aggs).to.be.empty;
        });

        it("restore should work", function() {
            var aggInfos = {"aggy4": {key: "fakeKey"}};
            Aggregates.restore(aggInfos);
            expect(Aggregates.getAggs()).to.have.ownProperty("aggy4");

            Aggregates.clear();
            var aggs = Aggregates.getAggs();
            expect(aggs).to.be.an("object");
            expect(aggs).to.be.empty;
        });
    });

    describe("testing with backend", function() {
        var testDs;
        var tableName;
        var prefix;
        var tableId;

        before(function(done) {
            var testDSObj = testDatasets.fakeYelp;
            UnitTest.addAll(testDSObj, "unitTestFakeYelp")
            .always(function(ds, tName, tPrefix) {
                testDs = ds;
                tableName = tName;
                prefix = tPrefix;
                $(".xcTableWrap").each(function() {
                    if ($(this).find(".tableName").val().indexOf(testDs) > -1) {
                        tableId = $(this).find(".hashName").text().slice(1);
                        return false;
                    }
                });
                done();
            });
        });

        it("aggregate should be added when xcFunction.aggregate is called", function(done) {
            Aggregates.clear();
            expect(Aggregates.getAggs()).to.be.empty;
            xcFunction.aggregate(null, tableId, "count",
                                prefix + "::yelping_since", "^namedAgg")
            .then(function() {
                var aggs = Aggregates.getAggs();
                expect(aggs).to.not.be.empty;
                expect(aggs.namedAgg).to.be.an("object");
                expect(aggs.namedAgg.value).to.equal(1000);
                expect(aggs.namedAgg.dagName).to.equal("namedAgg");
                expect(aggs.namedAgg.aggName).to.equal("^namedAgg");
                expect(aggs.namedAgg.tableId).to.equal(tableId);
                expect(aggs.namedAgg.backColName)
                .to.equal(prefix + "::yelping_since");
                expect(aggs.namedAgg.op).to.equal("count");

                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("aggregate should show on agg list in menu panel", function(done) {
            setTimeout(function() {
                Alert.forceClose();
                var listItem = $("#constantList")
                                .find('li.tableInfo[data-id="namedAgg"]');
                expect(listItem.length).to.equal(1);
                done();
            }, 500);
        });

        // todo - create a dataflow that has an aggregate in it and delete it
        // todo - cause a fail by trying to delete nonexistant aggs
        it("aggregates deleteAggs should work", function(done) {
            var aggs = Aggregates.getAggs();
            expect(aggs).to.not.be.empty;
            expect(aggs.namedAgg).to.be.an("object");
            var listItem = $("#constantList")
                            .find('li.tableInfo[data-id="namedAgg"]');
            expect(listItem.length).to.equal(1);
            Aggregates.deleteAggs("namedAgg")
            .then(function() {
                expect(Aggregates.getAggs()).to.be.empty;
                TableList.refreshConstantList()
                .then(function() {
                    listItem = $("#constantList")
                                    .find('li.tableInfo[data-id="namedAgg"]');
                    expect(listItem.length).to.equal(0);
                })
                .fail(function() {
                    expect("tablelist refresh failed")
                    .to.equal("tableList refresh succeeded");
                })
                .always(function() {
                    done();
                });
            })
            .fail(function() {
                expect("failed").to.equal("succeeded");
                done();
            });
        });

        after(function(done) {
            UnitTest.deleteAll(tableName, testDs)
            .always(function() {
                done();
            });
        });
    });
});