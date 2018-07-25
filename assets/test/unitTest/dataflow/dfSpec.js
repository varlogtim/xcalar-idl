describe("DF Test", function() {
    describe("main functions", function() {
        it("DF.refresh", function(done) {

            var oldDfs = DFParamModal.__testOnly__.updateDataflows({});


            var called1 = false;
            var cachedFn1 = XcalarListRetinas;
            XcalarListRetinas = function() {
                called1 = true;
                return PromiseHelper.resolve({numRetinas: 1, retinaDescs: [
                    {retinaName: "test"}
                ]})
            };

            var called2 = false;
            var cachedFn2 = XcalarGetRetina;
            XcalarGetRetina = function(name) {
                expect(name).to.equal("test");
                called2 = true;
                return PromiseHelper.resolve({
                    retina: {retinaDag: []}
                });
            }

            var called3 = false;
            var cachedFn3 = XcalarGetRetinaJson;
            XcalarGetRetinaJson = function() {
                called3 = true;
                return PromiseHelper.resolve({query: [{
                    args: {dest: "somedest"}
                }]});
            }

            var called4 = false;
            var cachedFn4 = XcalarListSchedules;
            XcalarListSchedules = function() {
                called4 = true;
                return PromiseHelper.resolve([
                    {scheduleMain: {
                        retName: "test"
                    }}
                ]);
            }

            var cachedFn5 = DFCard.refreshDFList;
            DFCard.refreshDFList = function() {};


            DF.refresh({dataflows: {}})
            .then(function() {
                expect(called1).to.be.true;
                expect(called2).to.be.false;
                expect(called3).to.be.false;
                expect(called4).to.be.true;
                var newDfs = DFParamModal.__testOnly__.updateDataflows({});
                expect(Object.keys(newDfs).length).to.equal(1);
                expect(newDfs.hasOwnProperty("test")).to.be.true;
                DFParamModal.__testOnly__.updateDataflows(oldDfs);
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                XcalarListRetinas = cachedFn1;
                XcalarGetRetina = cachedFn2;
                XcalarGetRetinaJson = cachedFn3;
                XcalarListSchedules = cachedFn4;
                DFCard.refreshDFList = cachedFn5;
            });
        });

        it("DF.addScheduleToDataflow should work", function() {
            var called = false;
            // var dfName = "df" + Date.now();
            var df = {
                schedule: {update: function(){called = true;}}
            };
            var newDfs = {"test": df};
            var oldDfs = DFParamModal.__testOnly__.updateDataflows(newDfs);

            var cache1 = XcalarDeleteSched;
            XcalarDeleteSched = function() {
                return PromiseHelper.resolve();
            };

            var cache2 = XcalarCreateSched;
            XcalarCreateSched = function() {
                return PromiseHelper.resolve();
            };

            var cache3 = DF.commitAndBroadCast;
            DF.commitAndBroadCast = function() {
                return PromiseHelper.resolve();
            };


            DF.addScheduleToDataflow("test", {});
            expect(called).to.be.true;

            XcalarDeleteSched = cache1;
            XcalarCreateSched = cache2;
            DF.commitAndBroadCast = cache3;

            DFParamModal.__testOnly__.updateDataflows(oldDfs);
        });

        it("DF.updateScheduleForDataflow", function() {
            var called = false;
            var df = {
                schedule: {}
            };
            var newDfs = {"test": df};
            var oldDfs = DFParamModal.__testOnly__.updateDataflows(newDfs);

            var cache1 = XcalarUpdateSched;
            XcalarUpdateSched = function() {
                called = true;
                return PromiseHelper.resolve();
            };

            var cache2 = DF.getAdvancedExportOption;
            DF.getAdvancedExportOption = function() {return {};};

            var cache3 = DF.getExportTarget;
            DF.getExportTarget = function(){return {};};


            DF.updateScheduleForDataflow("test");
            expect(called).to.be.true;

            XcalarUpdateSched = cache1;
            DF.getAdvancedExportOption = cache2;
            DF.getExportTarget = cache3;
            DFParamModal.__testOnly__.updateDataflows(oldDfs);
        });

        it("DF.saveAdvancedExportOption", function() {
            var df = {};
            var cache1 = DF.getDataflow;
            DF.getDataflow = function() {
                return df;
            };

            DF.saveAdvancedExportOption("test", {activeSession: "a", newTableName: "b"});
            expect(df.activeSession).to.equal("a");
            expect(df.newTableName).to.equal("b");

            DF.getDataflow = cache1;
        });

        it("DF.getExportTarget", function() {
            var df = {retinaNodes: {
                "1":
                    {
                        operation: "XcalarApiExport",
                        args: {
                            meta: {
                                target: {
                                    name: ""
                                }
                            }
                        }
                    }
                }};
            var cache1 = DF.getDataflow;
            DF.getDataflow = function() {
                return df;
            };
            var cache2 = DSExport.getTarget;
            DSExport.getTarget = function() {
                return {type: 1, info: {name: "testName", formatArg: "here"}};
            };


            var options = DF.getExportTarget(true, null);
            expect(options.exportLocation).to.equal("N/A");
            expect(options.exportTarget).to.equal("XcalarForTable");

            options = DF.getExportTarget(false, "test");
            expect(options.exportLocation).to.equal("here");
            expect(options.exportTarget).to.equal("testName");

            expect(df.activeSession).to.equal(undefined);
            expect(df.newTableName).to.equal(undefined);

            DF.getDataflow = cache1;
            DSExport.getTarget = cache2;
        });

        it("DF.deleteActiveSessionOption", function() {
            var df = {activeSession: "a", newTableName: "b"};
            var cache1 = DF.getDataflow;
            DF.getDataflow = function() {
                return df;
            };

            DF.deleteActiveSessionOption("test", {activeSession: "a", newTableName: "b"});
            expect(df.activeSession).to.equal(undefined);
            expect(df.newTableName).to.equal(undefined);

            DF.getDataflow = cache1;
        });

        it("DF.comment should work", function() {
            var cachedFn = XcalarUpdateRetina;
            var called = false;
            XcalarUpdateRetina = function(dfName, tableName, paramValues, comment) {
                expect(dfName).to.equal("test");
                expect(tableName[0]).to.equal("somename");
                expect(comment[0]).to.equal('{"userComment":"a","meta":{}}');
                called = true;
                return PromiseHelper.resolve();
            };

            var cachedFn2 = DF.commitAndBroadCast;
            DF.commitAndBroadCast = function() {};

            DF.comment("test", "somename", "a");


            expect(called).to.be.true;

            XcalarUpdateRetina = cachedFn;
            DF.commitAndBroadCast = cachedFn2;
        });
    });

    describe("other functions", function() {
        it("getsubstitions should work", function() {
            var oldParams = DF.getParamMap();
            DF.updateParamMap({
                "a": {value: "b"},
                "b": {value: "z"}
            });
            var df = {
                schedule: {},
                retinaNodes: {
                    "node1": {
                        operation: "XcalarApiExport",
                        args: {"something": "hi<a>ho"}
                    }
                }
            };
            var cache1 = DF.getDataflow;
            DF.getDataflow = function() {
                return df;
            };

            var paramsArray = DFParamModal.__testOnly__.getSubstitutions("test", true);
            expect(paramsArray.length).to.equal(2);
            expect(paramsArray[0].paramName).to.equal("a");
            expect(paramsArray[0].paramValue).to.equal("b");
            expect(paramsArray[1].paramName).to.equal("N");
            expect(paramsArray[1].paramValue).to.equal(0);
            DF.updateParamMap(oldParams);
            DF.getDataflow = cache1;
        });
    });
});
