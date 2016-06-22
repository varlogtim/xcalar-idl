// Scroll all the way down to add test cases
// Or search for function addTestCase

(function($, TestSuite) {
    "use strict";

    if (!jQuery || typeof jQuery.Deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    var TestCaseEnabled = true;
    var TestCaseDisabled = false;

    // Test related variables
    var datasetPrefix = ".XcalarDS.";
    var passes
    ,   fails
    ,   skips
    ,   returnValue
    ,   defaultTimeout
    ,   disableIsPass
    ,   testCases;

    var thriftHandle
    ,   loadArgs
    ,   loadOutput
    ,   origDataset
    ,   yelpUserDataset
    ,   moviesDataset
    ,   moviesDatasetSet = false
    ,   queryName
    ,   origTable
    ,   origStrTable
    ,   aggrTable
    ,   queryTableName;

    var makeResultSetOutput1
    ,   makeResultSetOutput2
    ,   makeResultSetOutput3
    ,   newTableOutput;

    // For retina test
    var retinaName
    ,   retinaFilterDagNodeId
    ,   retinaFilterParamType
    ,   retinaFilterParamStr
    ,   retinaExportDagNodeId
    ,   retinaExportParamType
    ,   retinaExportParamStr
    ,   paramInput;

    testCases = [];
   // For start nodes test
    var startNodesState;
    var system = require('system');
    var fs = require('fs');
    var qaTestDir = system.env['QATEST_DIR'];

    console.log("Qa test dir: " + qaTestDir);
    startNodesState = TestCaseEnabled;

    system.args.forEach(function(arg, i) {
        if (arg === "nostartnodes") {
            console.log("Disabling testStartNodes()");
            startNodesState = TestCaseDisabled;
        }
    });

    function TestObj(options) {
        this.deferred = options.deferred || jQuery.Deferred();
        if (options.hasOwnProperty("currentTestNumber")) {
            this.currentTestNumber = options.currentTestNumber;
        } else {
            this.currentTestNumber = -1;
        }
        this.testName = options.testName || "Unnamed test";
        this.testFn = options.testFn;
        this.timeout = options.timeout || defaultTimeout;
        if (options.hasOwnProperty("testCaseEnabled")) {
            this.testCaseEnabled = options.testCaseEnabled;
        } else {
            this.testCaseEnabled = TestCaseEnabled;
        }
        this.witness = options.witness;
        return this;
    }

    TestObj.prototype = {
        "pass": function() {
            if (this.deferred.state() == "pending") {
                passes++;
                console.log("ok " + this.currentTestNumber + " - Test \"" +
                            this.testName + "\" passed");
                this.deferred.resolve();
            }
        },
        "fail": function(reason) {
            if (this.deferred.state() == "pending") {
                fails++;
                console.log("Test " + this.testName + " failed -- " + reason);
                console.log("not ok " + this.currentTestNumber + " - Test \"" +
                            this.testName +
                            "\" failed (" + reason + ")");
                this.deferred.reject();
            }
        },
        "skip": function() {
            console.log("====== Skipping " + this.testName + " ======");
            console.log("ok " + this.currentTestNumber + " - Test \"" +
                        this.testName + "\" disabled # SKIP");
            skips++;
            if (disableIsPass) {
                this.deferred.resolve();
            } else {
                this.deferred.reject();
            }
        },
        "assert": function(statement, sucMsg, failMsg) {
            if (!statement) {
                var reason = "Assertion Failed!";
                if (failMsg) {
                    reason = "Assertion Failed! "+failMsg;
                }
                this.fail(reason);
            } else {
                if (sucMsg) {
                    console.log(sucMsg);
                }
            }
        },
        "trivial": function(deferred) {
            var self = this;
            deferred
            .then(function(retString) {
                printResult(retString);
                self.pass();
            })
            .fail(function(reason) {
                self.fail(reason);
            });
        }
    };

    function printResult(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    }

    function getDatasetCount(datasetName) {
        var numRows = -1;
        var deferred = jQuery.Deferred();
        xcalarMakeResultSetFromDataset(thriftHandle, ".XcalarDS."+datasetName)
        .then(function(ret) {
            numRows = ret.numEntries;
            console.log(JSON.stringify(ret));
            return (xcalarFreeResultSet(thriftHandle, ret.resultSetId));
        })
        .then(function(ret) {
            deferred.resolve(numRows);
        })
        .fail(function() {
            deferred.reject("Failed to get dataset count");
        });
        return deferred.promise();
    }

    function addTestCase(testFn, testName, timeout, testCaseEnabled, witness)
    {
        testCases.push(new TestObj({
            "deferred": jQuery.Deferred(),
            "currentTestNumber": testCases.length + 1,
            "testName": testName,
            "testFn": testFn,
            "testCaseEnabled": testCaseEnabled,
            "timeout": timeout,
            "witness": witness
        }));
    }

    function runTestSuite(testCases)
    {
        var initialDeferred = $.Deferred();
        var ii;
        var deferred;
        deferred = initialDeferred;

        // Start chaining the callbacks
        for (ii = 0; ii < testCases.length; ii++) {
            deferred = deferred.then(
                // Need to trap the value of testCase and ii
                (function trapFn(testCase, currentTestNumber) {
                    return function() {
                        if (testCase.testCaseEnabled) {
                            console.log("====================Test ",
                                        testCase.currentTestNumber,
                                        " Begin====================");
                            console.log("Testing: ", testCase.testName,
                                        "                     ");
                            setTimeout(function() {
                                if (testCase.deferred.state() == "pending") {
                                    var reason = "Timed out after " +
                                                 (testCase.timeout / 1000) +
                                                 " seconds";
                                    testCase.fail(reason);
                                }
                            }, testCase.timeout);

                            testCase.testFn(testCase);
                        } else {
                            testCase.skip();
                        }

                        return testCase.deferred.promise();
                    };
                })(testCases[ii], ii + 1) // Invoking trapFn
            );
        }

        deferred.fail(function() {
            returnValue = 1;
        });

        deferred.always(function() {
            console.log("# pass", passes);
            console.log("# fail", fails);
            console.log("# skips", skips);
            console.log("==========================================");
            console.log("1.." + testCases.length + "\n");
            phantom.exit(returnValue);
        });

        // This starts the entire chain
        initialDeferred.resolve();
    }

    function testStartNodes(test) {
        test.trivial(xcalarStartNodes(thriftHandle, 4));
    }

    function testGetNumNodes(test) {
        test.trivial(xcalarGetNumNodes(thriftHandle));
    }

    function testGetVersion(test) {
        test.trivial(xcalarGetVersion(thriftHandle));
    }

    function testLoad(test) {
        loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
        loadArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
        loadArgs.csv.isCRLF = false;

        xcalarLoad(thriftHandle, "file://" + qaTestDir +
                   "/yelp/user", "yelp",
                   DfFormatTypeT.DfFormatJson, 0, loadArgs)
        .then(function(result) {
            printResult(result);
            loadOutput = result;
            origDataset = loadOutput.dataset.name;
            yelpUserDataset = loadOutput.dataset.name;
            return getDatasetCount("yelp");
        })
        .then(function(count) {
            test.assert(count === 70817)
            test.pass();
        })
        .fail(function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function loadHelper() {
        var lArgs = new XcalarApiDfLoadArgsT();
        lArgs.csv = new XcalarApiDfCsvLoadArgsT();
        lArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
        lArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
        lArgs.csv.isCRLF = false;
        lArgs.csv.hasHeader = true;
        return lArgs;
    }

    function testLoadEdgeCaseDos(test) {
        var lArgs = loadHelper();
        lArgs.csv.isCRLF = false;
        lArgs.csv.fieldDelim = "\t";
        lArgs.csv.recordDelim = "\r";
        xcalarLoad(thriftHandle, "file://" + qaTestDir +
                   "/edgeCases/dosFormat.csv", "dosFormat",
                   DfFormatTypeT.DfFormatCsv, 0, lArgs)
        .then(function(result) {
            return getDatasetCount("dosFormat");
        })
        .then(function(numRows) {
            test.assert(numRows == 123);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }


    function testBadLoad(test) {
        loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
        loadArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
        loadArgs.csv.isCRLF = false;

        xcalarLoad(thriftHandle, "nfs://" + qaTestDir + "/edgeCases/bad.json", "bad", DfFormatTypeT.DfFormatJson, 0, loadArgs)
        .done(function(result) {
            printResult(result);
            loadOutput = result;
            var errStr = "line: 2 column: 1 position: 10892 error: end of file expected near '{'";
            var errFile = "fileName: nfs://" + qaTestDir + "/edgeCases/bad.json";
            if (loadOutput.errorString == errStr &&
                loadOutput.errorFile == errFile) {
                test.pass();
            } else {
                test.fail("errorString: \"" + loadOutput.errorString + "\" should be: \"" + errStr + "\" errorFile: \"" + loadOutput.errorFile + "\" should be: \"" + errFile);
            }
        })
        .fail(function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function testBulkDestroyDs(test) {
        loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
        loadArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
        loadArgs.csv.isCRLF = false;

        xcalarLoad(thriftHandle, "file://" + qaTestDir + "/yelp/reviews",
                   "review", DfFormatTypeT.DfFormatJson, 0, loadArgs)
        .then(function(result) {
            var testloadOutput = result;
            return xcalarDeleteDagNodes(thriftHandle, "*",
                                        SourceTypeT.SrcDataset);
        })
        .then(function(destroyDatasetsOutput) {
            printResult(destroyDatasetsOutput);

            for (var i = 0, delDsStatus = null;
                i < destroyDatasetsOutput.numDataset; i ++) {
                delDsStatus = destroyDatasetsOutput.statuses[i];
                console.log("\t" + delDsStatus.datasetName + ": " +
                            StatusTStr[delDsStatus.status]);
            }
            test.pass();
        })
        .fail(function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function testLoadBogus(test) {
        xcalarLoad(thriftHandle, "somejunk", "junk", DfFormatTypeT.DfFormatJson,
                   0, loadArgs)
        .then(function(bogusOutput) {
            printResult(bogusOutput);
            test.fail("load succeeded when it should have failed");
        })
        .fail(function() {
            test.pass();
        });
    }

    function testListDatasets(test) {
        xcalarListDatasets(thriftHandle)
        .then(function(listDatasetsOutput) {
            printResult(listDatasetsOutput);

            var foundLoadDs = false;
            for (var i = 0, dataset = null; i < listDatasetsOutput.numDatasets;
                 i ++) {
                dataset = listDatasetsOutput.datasets[i];

                console.log("\tdataset[" + i.toString() + "].url = " +
                            dataset.url);
                console.log("\tdataset[" + i.toString() + "].name = " +
                            dataset.name);
                console.log("\tdataset[" + i.toString() + "].datasetId = " +
                    dataset.datasetId.toString());
                console.log("\tdataset[" + i.toString() + "].formatType = " +
                    DfFormatTypeTStr[dataset.formatType]);
                console.log("\tdataset[" + i.toString() + "].loadIsComplete = "+
                    dataset.loadIsComplete.toString());
                console.log("\tdataset[" + i.toString() + "].refCount = " +
                    dataset.refCount.toString());

                if (dataset.name === loadOutput.dataset.name) {
                    foundLoadDs = true;
                    break;
                }
            }
            test.assert(foundLoadDs,
                        "Found dataset \"" + loadOutput.dataset.name + "\"",
                        "Could not find loaded dataset \"" +
                        loadOutput.dataset.name + "\"");
            test.pass();

        })
        .fail(test.fail);
    }

    function testIndexDatasetIntSync(test) {
        test.trivial(xcalarIndexDataset(thriftHandle,
                     loadOutput.dataset.name, "review_count",
                     "yelp/user-review_count", "",
                     XcalarOrderingT.XcalarOrderingUnordered));
    }

    function testIndexDatasetInt(test) {
        xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                           "votes.funny", "yelp/user-votes.funny", "",
                           XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(indexOutput) {
            printResult(indexOutput);
            origTable = indexOutput.tableName;
            test.pass();
        })
        .fail(test.fail);
    }

    function testIndexDatasetStr(test) {
        xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                           "user_id", "yelp/user-user_id", "",
                           XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(indexStrOutput) {
            printResult(indexStrOutput);
            origStrTable = indexStrOutput.tableName;
            test.pass();
        })
        .fail(test.fail);
    }

    function testIndexTable(test) {
        test.trivial(xcalarIndexTable(thriftHandle, origStrTable,
                         "name", "yelp/user-name", "",
                         XcalarOrderingT.XcalarOrderingUnordered));
    }

    function testRenameNode(test) {
        xcalarRenameNode(thriftHandle, origTable, "newName")
        .then(function(status) {
            printResult(status);
            return xcalarRenameNode(thriftHandle, "newName", origTable);
        })
        .then(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(status) {
            test.fail(StatusTStr[status]);
        });
    }

    function testGetQueryIndex(test) {
        var workItem = new WorkItem();
        workItem.input = new XcalarApiInputT();
        workItem.input.indexInput = new XcalarApiIndexInputT();
        workItem.input.indexInput.source = new XcalarApiNamedInputT();
        workItem.input.indexInput.dstTable = new XcalarApiTableT();

        workItem.api = XcalarApisT.XcalarApiIndex;
        workItem.input.indexInput.source.isTable = false;
        workItem.input.indexInput.source.name = "dataset";
        workItem.input.indexInput.source.xid = XcalarApiXidInvalidT;
        workItem.input.indexInput.dstTable.tableName = "dstTable";
        workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
        workItem.input.indexInput.keyName = "keyName";
        workItem.input.indexInput.dhtName = "";
        workItem.input.indexInput.ordering = XcalarOrderingT.XcalarOrderingUnordered;

        xcalarApiGetQuery(thriftHandle, workItem)
        .then(function(getQueryOutput) {
            console.log("\tquery =" + getQueryOutput.query.toString());
            test.pass();
        })
        .fail(test.fail);
    }

    function testGetQueryLoad(test) {
        var workItem = new WorkItem();
        workItem.input = new XcalarApiInputT();
        workItem.input.loadInput = new XcalarApiBulkLoadInputT();
        workItem.input.loadInput.dataset = new XcalarApiDatasetT();
        workItem.input.loadInput.loadArgs = new XcalarApiDfLoadArgsT();
        workItem.input.loadInput.loadArgs.csv = new XcalarApiDfCsvLoadArgsT();

        workItem.api = XcalarApisT.XcalarApiBulkLoad;
        workItem.input.loadInput.maxSize = 1024;
        workItem.input.loadInput.dagNodeId = 9;
        workItem.input.loadInput.loadArgs.csv.recordDelim = ",";
        workItem.input.loadInput.loadArgs.csv.fieldDelim = "\n";
        workItem.input.loadInput.loadArgs.csv.isCRLF = false;
        workItem.input.loadInput.loadArgs.csv.hasHeader = false;
        workItem.input.loadInput.dataset.url = "url";
        workItem.input.loadInput.dataset.datasetId = 2;
        workItem.input.loadInput.dataset.formatType =
                                                     DfFormatTypeT.DfFormatJson;
        workItem.input.loadInput.dataset.name = "datasetName";
        workItem.input.loadInput.dataset.loadIsComplete = false;
        workItem.input.loadInput.dataset.refCount = 32;

        xcalarApiGetQuery(thriftHandle, workItem)
        .done(function(getQueryOutput) {
            console.log("\tquery =" + getQueryOutput.query.toString());
            test.pass();
        })
        .fail(test.fail);
    }

    function testIndexDatasetBogus(test) {
         test.trivial(xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                      "garbage", "yelp/user-garbage", "",
                      XcalarOrderingT.XcalarOrderingUnordered));
    }

    function testIndexTable2(test) {
        test.trivial(xcalarIndexTable(thriftHandle, origStrTable,
                     "yelping_since", "yelp/user-yelping_since", "",
                     XcalarOrderingT.XcalarOrderingUnordered));
    }

    function testIndexTableBogus(test) {
        test.trivial(xcalarIndexTable(thriftHandle, origTable,
                     "garbage2", "yelp/user-garbage2", "",
                     XcalarOrderingT.XcalarOrderingUnordered));
    }

    function testGetTableRefCount(test) {
        test.trivial(xcalarGetTableRefCount(thriftHandle, origTable));
    }

    function testGetTableMeta(test) {
        xcalarGetTableMeta(thriftHandle, origTable)
        .done(function(metaOutput) {
            printResult(metaOutput);

            var pgCount1 = 0;
            var pgCount2 = 0;
            var rowCount1 = 0;
            var rowCount2 = 0;

            for (var i = 0; i < metaOutput.numMetas; i ++) {
                rowCount1 += metaOutput.metas[i].numRows;
                pgCount1 += metaOutput.metas[i].numPages;
                for (var j = 0; j < metaOutput.metas[i].numSlots; j++) {
                    rowCount2 += metaOutput.metas[i].numRowsPerSlot[j];
                    pgCount2 += metaOutput.metas[i].numPagesPerSlot[j];
                }
            }

            if (pgCount1 == pgCount2 && rowCount1 == rowCount2) {
                test.pass();
            } else {
                var reason = "pgCount1: " + pgCount1 +
                    " pgCount2: " + pgCount2 +
                    " rowCount1: " + rowCount1 +
                    " rowCount2: " + rowCount2;
                test.fail(reason);
            }
        })
        .fail(test.fail);
    }

    function curryVerifyCountOutput(test) {
        function verifyCountOutput(metaOutput) {
            printResult(metaOutput);

            var totalCount = 0;
            for (var i = 0; i < metaOutput.numMetas; i ++) {
                totalCount += metaOutput.metas[i].numRows;
                console.log("Node " + i + ": " + metaOutput.metas[i].numRows);
            }

            console.log("\tcount: " + totalCount.toString());
            test.assert(totalCount === 70817, undefined,
                        "wrong count: " + totalCount + " expected: 70817");
            test.pass();
        }
        return (verifyCountOutput);
    }

    function testGetDatasetCount(test) {
        var verifyDatasetCount = curryVerifyCountOutput(test);
        xcalarGetDatasetMeta(thriftHandle, yelpUserDataset)
        .done(verifyDatasetCount)
        .fail(test.fail);
    }

    function testGetTableCount(test) {
        var verifyTableCount = curryVerifyCountOutput(test);
        xcalarGetTableMeta(thriftHandle, origTable)
        .done(verifyTableCount)
        .fail(test.fail);
    }

    function testListTables(test) {
        xcalarListTables(thriftHandle, "yelp*", SourceTypeT.SrcTable)
        .then(function(listTablesOutput) {
            printResult(listTablesOutput);

            var foundVotesFunny = false;
            for (var i = 0, node = null; i < listTablesOutput.numNodes; i ++) {
                node = listTablesOutput.nodeInfo[i];
                console.log("\ttable[" + i.toString() + "].tableName = " + node.name);
                console.log("\ttable[" + i.toString() + "].tableId = " +
                    node.dagNodeId.toString());
                console.log("\ttable[" + i.toString() + "].state = " +
                    node.state.toString());
                if (node.name === origTable && node.size > 0) {
                    foundVotesFunny = true;
                }
            }
            test.assert(foundVotesFunny, "Found node \"" + origTable + "\"",
                        "failed to find node \"" + origTable + "\"");
            test.pass();
        })
        .fail(test.fail);
    }

    function indexAggregateRaceTest(test) {
        var pathToFlightDataset = qaTestDir + "/flight/airlines_2007.csv";
        var pathToAirportDataset = qaTestDir + "/flight/airports.csv";
        var datasetName = "MgmtTest/indexAggregateRaceTest/flightDataset";
        var datasetName2 = "MgmtTest/indexAggregateRaceTest/airportDataset";
        var tmpTableName1 = "MgmtTest/indexAggregateRaceTest/tmpTable1";
        var tmpTableName2 = "MgmtTest/indexAggregateRaceTest/tmpTable2";
        var tmpTableName3 = "MgmtTest/indexAggregateRaceTest/tmpTable3";
        var tmpTableName4 = "MgmtTest/indexAggregateRaceTest/tmpTable4";
        var startTableName = "MgmtTest/indexAggregateRaceTest/startTable";
        var dstTableNameTemplate = "MgmtTest/indexAggregateRaceTest/dstTable";
        var groupByTableNameTemplate = "MgmtTest/indexAggregateRaceTest/groupByTable";
        var keyName = "Month_integer";
        var keyName2 = "Month";
        var keyName3 = "groupBySum";

        var failed = false;
        var raceFailedReason = "";

        var indexAndAggregateOutput = {};
        var indexAndAggDone = false;

        var numIndexes = 0;
        var indexDone = [];

        var aggTableName = { "sum": "MgmtTest/indexAggregateRaceTest/aggTableSum",
                             "avg": "MgmtTest/indexAggregateRaceTest/aggTableAvg",
                             "min": "MgmtTest/indexAggregateRaceTest/aggTableMin",
                             "max": "MgmtTest/indexAggregateRaceTest/aggtableMax",
                             "count": "MgmtTest/indexAggregateRaceTest/aggTableCount"};
        var expectedAggOutput = { "sum": 919477.0, "avg": 919477.0 / 138491.0,
                                  "min": 1, "max": 12, "count": 138491.0 };
        var aggDone = { "sum": false, "avg": false, "min": false, "max": false,
                        "count": false };
        var aggEvalStr = { "sum": "sum(" + keyName + ")",
                           "avg": "avg(" + keyName + ")",
                           "min": "min(" + keyName + ")",
                           "max": "max(" + keyName + ")",
                           "count": "count(" + keyName + ")" };

        function indexAndAggDoneFn() {
            var totalCompleted = 0;
            indexAndAggDone = true;

            function makeGroupByDoneFn(ii) {
                var groupByTableName = groupByTableNameTemplate + ii;
                function groupByDoneFnInt(groupByOutput) {
                    var aggStr = "sum(" + keyName3 + ")";
                    xcalarAggregate(thriftHandle, groupByTableName,
                                    groupByTableName + "-aggr",
                                    aggStr)
                    .done(function(aggregateOutput) {
                        console.log("aggStr: " + aggStr + ", tableName: \"" +
                                    groupByTableName + "\", output: " +
                                    aggregateOutput);
                        var answer = JSON.parse(aggregateOutput);
                        if (answer.Value != expectedAggOutput["sum"]) {
                            failed = true;
                            raceFailedReason += "Returned answer: " +
                                                answer.Value +
                                                " Expected answer: " +
                                                expectedAggOutput["sum"];
                        }
                    })
                    .fail(function(reason) {
                        failed = true;
                        raceFailedReason +="Aggregate failed. Server returned: "
                                           + StatusTStr[reason];
                    })
                    .always(function() {
                        totalCompleted++;
                        if (totalCompleted == numIndexes) {
                            test.assert(!failed, "", raceFailedReason);
                            test.pass();
                        }
                    });
                }
                return (groupByDoneFnInt);
            }

            if (failed) {
                test.fail(raceFailedReason);
            } else {
                // Now we verify that all the months are correct in dstTable
                for (var ii = 0; ii < numIndexes; ii++) {
                    var dstTableName = dstTableNameTemplate + ii;
                    var groupByTableName = groupByTableNameTemplate + ii;
                    xcalarGroupBy(thriftHandle, dstTableName, groupByTableName,
                                  "sum(" + keyName + ")", keyName3, false)
                    .done(makeGroupByDoneFn(ii))
                    .fail(function(reason) {
                        failed = true;
                        raceFailedReason = "Group by failed. Server returned: "
                                           + StatusTStr[reason];
                        totalCompleted++;
                        if (totalCompleted == numIndexes) {
                            test.assert(!failed, "", raceFiledReason);
                            test.pass();
                        }
                    });
                }
            }
        }

        function aggDoneFn(aggOutput, aggOp) {
            if (aggOutput !== null) {
                console.log("Aggregate on \"" + startTableName + "\" done. " +
                            aggEvalStr[aggOp] + " = " + aggOutput);
                indexAndAggregateOutput["aggOutput" + aggOp] = aggOutput;
                var answer = JSON.parse(aggOutput).Value;
                if (answer !== expectedAggOutput[aggOp]) {
                    failed = true;
                    raceFailedReason += "Aggregate returned wrong answer (" +
                                        answer + " instead of " +
                                        expectedAggOutput[aggOp] + ")";
                }
            }
            aggDone[aggOp] = true;
            var allAggDone = true;
            for (var key in aggDone) {
                if (!aggDone[key]) {
                    allAggDone = false;
                    break;
                }
            }

            var allIndexDone = true;
            for (var ii = 0; ii < numIndexes; ii++) {
                if (!indexDone[ii]) {
                    allIndexDone = false;
                }
            }

            if (allIndexDone && allAggDone && !indexAndAggDone) {
                indexAndAggDoneFn();
            }
        }

        function indexDoneFn(indexOutput, idx) {
            console.log("Index " + idx + " done");
            indexAndAggregateOutput["indexOutput" + idx] = indexOutput;
            indexDone[idx] = true;

            var allIndexDone = true;
            for (var ii = 0; ii < numIndexes; ii++) {
                if (!indexDone[ii]) {
                    allIndexDone = false;
                }
            }

            var allAggDone = true;
            for (var key in aggDone) {
                if (!aggDone[key]) {
                    allAggDone = false;
                    break;
                }
            }

            if (allIndexDone && allAggDone && !indexAndAggDone) {
                indexAndAggDoneFn();
            }
        }

        function startRace() {
            // Now we start the race
            for (var aggOp in aggDone) {
                xcalarAggregate(thriftHandle, startTableName,
                                aggTableName[aggOp], aggEvalStr[aggOp])
                .done(
                    (function(key) {
                        return (function(aggOutput) {
                                    aggDoneFn(aggOutput, key);
                                });
                    })(aggOp)
                )
                .fail((function(key) {
                    function anonymousFn(reason) {
                        raceFailedReason +=
                                      "Failed to aggregate. Server returned: " +
                                             StatusTStr[reason];
                        failed = true;
                        aggDoneFn(null, key);
                    }
                    return (anonymousFn);
                })(aggOp));

                var dstTableName = dstTableNameTemplate + numIndexes;

                xcalarIndexTable(thriftHandle, startTableName, keyName,
                                 dstTableName,
                                 "", XcalarOrderingT.XcalarOrderingUnordered)
                .done(
                    (function(idx) {
                    return (function(indexOutput) {
                            indexDoneFn(indexOutput, idx);
                            });
                    })(numIndexes)
                )
                .fail(function(reason) {
                    raceFailedReason += "Failed to index. Server returned: " +
                                        StatusTStr[reason];
                    failed = true;
                    indexDoneFn(null);
                });

                numIndexes++;

            }
        }

        function joinDoneFn() {
            xcalarIndexTable(thriftHandle, tmpTableName3, keyName2,
                             tmpTableName4, "",
                             XcalarOrderingT.XcalarOrderingUnordered)
            .done(function(indexOutput) {
                xcalarApiMap(thriftHandle, keyName, "int(" + keyName2 + ")",
                             tmpTableName3, startTableName)
                .done(startRace)
                .fail(function(reason) {
                    reason = "Failed to cast. Server returned: " +
                                  StatusTStr[reason];
                    test.fail(reason);
                });
            })
            .fail(function(reason) {
                reason = "Index failed. Server returned: " +
                             StatusTStr[reason];
                test.fail(reason);
            });
        }

        function loadDoneFn() {
            xcalarIndexDataset(thriftHandle, datasetName, "Dest", tmpTableName1,
                               "", XcalarOrderingT.XcalarOrderingUnordered)
            .done(function(indexOutput) {
                xcalarIndexDataset(thriftHandle, datasetName2, "iata",
                                   tmpTableName2, "",
                                   XcalarOrderingT.XcalarOrderingUnordered)
                .done(function(indexOutput) {
                    // For some reason, the join is required to reproduce the bug
                    xcalarJoin(thriftHandle, tmpTableName1, tmpTableName2,
                               tmpTableName3, JoinOperatorT.InnerJoin)
                    .done(function(result) {
                        joinDoneFn();
                    })
                    .fail(function(reason) {
                        reason = "Failed to join. Server returned: " +
                                     StatusTStr[reason];
                        test.fail(reason);
                    });
                })
                .fail(function(reason) {
                    reason = "Failed to index. Server returned: " +
                                 StatusTStr[reason];
                    test.fail(reason);
                });
            })
            .fail(function(reason) {
                reason = "Failed to index. Server returned: " +
                             StatusTStr[reason];
                test.fail(reason);
            });
        }

        var loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
        loadArgs.csv.fieldDelim = ',';
        loadArgs.csv.isCRLF = false;
        loadArgs.csv.hasHeader = true;

        xcalarLoad(thriftHandle, "file://" + pathToFlightDataset, datasetName,
                   DfFormatTypeT.DfFormatCsv, 0, loadArgs)
        .done(function(loadOutput) {
            datasetName = loadOutput.dataset.name;
            xcalarLoad(thriftHandle, "file://" + pathToAirportDataset,
                       datasetName2,
                       DfFormatTypeT.DfFormatCsv, 0, loadArgs)
            .done(function(loadOutput) {
                datasetName2 = loadOutput.dataset.name;
                loadDoneFn();
            })
            .fail(function(reason) {
                reason = "Failed to load. Server returned: " +
                         StatusTStr[reason];
                test.fail(reason);
            });
        })
        .fail(function(reason) {
            reason = "Failed to load. Server returned: " + StatusTStr[reason];
            test.fail(reason);
        });
    }

    function testGetStats(test) {
        xcalarGetStats(thriftHandle, 0)
        .then(function(statOutput) {
            printResult(statOutput);

            for (var i = 0, stat = null; i < statOutput.numStats; i ++) {
                stat = statOutput.stats[i];

                console.log("\tstat[" + i.toString() + "].threadName = " +
                        stat.threadName);
                console.log("\tstat[" + i.toString() + "].statName = " +
                        stat.statName);
                console.log("\tstat[" + i.toString() + "].statValue = " +
                        stat.statValue.toString());
                console.log("\tstat[" + i.toString() + "].statType = " +
                        stat.statType.toString());
                console.log("\tstat[" + i.toString() + "].statLife = " +
                        stat.statLife.toString());
                console.log("\tstat[" + i.toString() + "].groupId = " +
                        stat.groupId.toString());
            }
            test.assert(statOutput.numStats, undefined, "No stats returned");
            test.pass();
        })
        .fail(test.fail);
    }

    function testGetStatGroupIdMap(test) {
        xcalarGetStatGroupIdMap(thriftHandle, 0, 5)
        .then(function(groupMapOutput) {
            printResult(groupMapOutput);

            if (groupMapOutput.numGroupNames !== 0) {
                console.log("\tnumGroupNames: " +
                        groupMapOutput.numGroupNames.toString());

                for (var i = 0; i < groupMapOutput.numGroupNames; i ++) {
                    console.log("\tgroupName[" + i.toString() + "] = " +
                        groupMapOutput.groupName[i]);
                }

                test.pass();
            } else {
                var reason = "numGroupNames == 0";
                test.fail(reason);
            }
        })
        .fail(test.fail);
    }

    function testGetStatsByGroupId(test) {
        xcalarGetStatsByGroupId(thriftHandle, 0, [1])
        .then(function(statOutput) {
            printResult(statOutput);

            for (var i = 0, stat = null; i < statOutput.numStats; i ++) {
                stat = statOutput.stats[i];

                console.log("\tstat[" + i.toString() + "].threadName = " +
                        stat.threadName);
                console.log("\tstat[" + i.toString() + "].statName = " +
                        stat.statName);
                console.log("\tstat[" + i.toString() + "].statValue = " +
                        stat.statValue.toString());
                console.log("\tstat[" + i.toString() + "].statType = " +
                        stat.statType.toString());
                console.log("\tstat[" + i.toString() + "].statLife = " +
                        stat.statLife.toString());
                console.log("\tstat[" + i.toString() + "].groupId = " +
                        stat.groupId.toString());
            }
            test.assert(statOutput.numStats, undefined, "No stats returned");
            test.pass();
        })
        .fail(test.fail);
    }

    function testResetStats(test) {
        test.trivial(xcalarResetStats(thriftHandle, 0));
    }

    function testMakeResultSetFromDataset(test) {
        xcalarMakeResultSetFromDataset(thriftHandle,
                                       loadOutput.dataset.name)
        .then(function(result) {
            printResult(result);
            makeResultSetOutput1 = result;
            test.pass();
        })
        .fail(test.fail);
    }

    function testMakeResultSetFromTable(test) {
        xcalarMakeResultSetFromTable(thriftHandle,
                                     origTable)
        .then(function(result) {
            printResult(result);
            makeResultSetOutput2 = result;
            test.pass();
        })
        .fail(test.fail);
    }

    function testMakeResultSetFromAggregate(test) {
        xcalarMakeResultSetFromTable(thriftHandle, aggrTable)
        .then(function(result) {
            printResult(result);
            makeResultSetOutput3 = result;
            test.pass();
        })
        .fail(test.fail);
    }

    function testResultSetNextDataset(test) {
        xcalarResultSetNext(thriftHandle,
                            makeResultSetOutput1.resultSetId, 5)
        .then(function(resultNextOutput1) {
            printResult(resultNextOutput1);

            for (var i = 0, kvPair = null; i < resultNextOutput1.numEntries;
                 i++) {
                kvPair = resultNextOutput1.entries[i];

                console.log("\trecord[" + i.toString() + "].key = " +
                            kvPair.key);
                console.log("\trecord[" + i.toString() + "].value = " +
                            kvPair.value);
            }
            test.pass();
        })
        .fail(test.fail);
    }

    function testResultSetAbsolute(test) {
        test.trivial(xcalarResultSetAbsolute(thriftHandle,
                    makeResultSetOutput2.resultSetId, 1000));
    }

    function testResultSetAbsoluteBogus(test) {
        xcalarResultSetAbsolute(thriftHandle,
                                makeResultSetOutput2.resultSetId,
                                281474976710655)
        .then(test.fail)
        .fail(function() {
            test.pass();
        });
    }

    function testResultSetNextTable(test) {
        xcalarResultSetNext(thriftHandle,
                            makeResultSetOutput2.resultSetId, 5)
        .then(function(resultNextOutput2) {
            printResult(resultNextOutput2);

            for (var i = 0, kvPair = null; i < resultNextOutput2.numEntries;
                 i ++) {
                kvPair = resultNextOutput2.entries[i];
                console.log("\trecord[" + i.toString() + "].key = " +
                            kvPair.key);
                console.log("\trecord[" + i.toString() + "].value = " +
                            kvPair.value);
            }
            test.pass();
        })
        .fail(test.fail);
    }

    function testResultSetNextAggregate(test) {
        xcalarResultSetNext(thriftHandle,
                            makeResultSetOutput3.resultSetId, 5)
        .then(function(resultNextOutput3) {
            printResult(resultNextOutput3);

            for (var i = 0, kvPair = null; i < resultNextOutput3.numEntries;
                 i++) {
                kvPair = resultNextOutput3.entries[i];
                console.log("\trecord[" + i.toString() + "].key = " +
                            kvPair.key);
                console.log("\trecord[" + i.toString() + "].value = " +
                            kvPair.value);
            }
            test.pass();
        })
        .fail(test.fail);
    }

    function testFreeResultSetAggregate(test) {
        test.trivial(xcalarFreeResultSet(thriftHandle,
                                         makeResultSetOutput3.resultSetId));
    }

    function testFreeResultSetDataset(test) {
        test.trivial(xcalarFreeResultSet(thriftHandle,
                                         makeResultSetOutput1.resultSetId));
    }

    function testFreeResultSetTable(test) {
        test.trivial(xcalarFreeResultSet(thriftHandle,
                                         makeResultSetOutput2.resultSetId));
    }

    function testFilter(test) {
        test.trivial(xcalarFilter(thriftHandle, "gt(votes.funny, 900)",
                                  origTable, "yelp/user-votes.funny-gt900"));
    }

    function testProject(test) {
        test.trivial(xcalarProject(thriftHandle, 2, ["votes.funny", "user_id"],
                     origTable, "yelp/user-votes.funny-projected"));
    }

    function testJoin(test) {
        xcalarJoin(thriftHandle, "yelp/user-votes.funny-gt900",
                   "yelp/user-votes.funny-gt900",
                   "yelp/user-dummyjoin",
                   JoinOperatorT.InnerJoin)
        .then(function(result) {
            printResult(result);
            newTableOutput = result;
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testGetOpStats(test) {
        test.trivial(xcalarApiGetOpStats(thriftHandle, "yelp/user-dummyjoin"));
    }

    function testCancel(test) {
        var query = "index --key votes.funny --dataset " + datasetPrefix +
                    "yelp" + " --dsttable cancelledTable ";

        queryName = "testQuery";

        xcalarQuery(thriftHandle, queryName, query, true)
        .then(function() {
            return (xcalarApiCancelOp(thriftHandle, "cancelledTable"));
        })
        .then(function(cancelStatus) {
            (function wait() {
            setTimeout(function() {
                xcalarQueryState(thriftHandle, queryName)
                .done(function(result) {
                    var qrStateOutput = result;
                    if (qrStateOutput.queryState === QueryStateT.qrProcessing ||
                        qrStateOutput.queryState === QueryStateT.qrNotStarted) {
                        return wait();
                    }

                    if (qrStateOutput.failedSingleQueryArray.length === 0 &&
                        qrStateOutput.queryState != QueryStateT.qrFinished) {
                        test.fail("no failed query. queryState: " +
                                  QueryStateTStr[qrStateOutput.queryState]);
                    }

                    if (qrStateOutput.queryState != QueryStateT.qrFinished &&
			            qrStateOutput.failedSingleQueryArray[0].status !=
                        StatusT.StatusCanceled) {
                        console.log("xxx" + JSON.stringify(qrStateOutput));
                        console.log(qrStateOutput.failedSingleQueryArray[0]
                                    .status);
                            test.fail("not canceled");
                     }

                    test.pass();

                 })
                 .fail(test.fail);
             }, 1000);
         })();
        })
        .fail(function(reason) {
            test.fail("status: " + StatusTStr[reason]);
        });
    }

    function testQuery(test) {
        var query = "index --key votes.funny --dataset " + datasetPrefix +
                    "yelp" + " --dsttable yelp-votesFunnyTable; index --key " +
                    "review_count" +
                    " --srctable yelp-votesFunnyTable --dsttable " +
                    "yelp-review_countTable;" +
                    "  map --eval \"add(1,2)\"  --srctable yelp-votesFunnyTable"
                    + " --fieldName newField --dsttable yelp-mapTable;" +
                    " filter yelp-mapTable \" sub(2,1)\" yelp-filterTable;" +
                    " groupBy --srctable yelp-filterTable --eval " +
                    "\"avg(votes.cool)\" --fieldName avgCool --dsttable " +
                    "yelp-groupByTable;" +
                    " join --leftTable yelp-review_countTable --rightTable" +
                    "  yelp-groupByTable --joinTable " + queryTableName;

        queryName = "testQuery";

        test.trivial(xcalarQuery(thriftHandle, queryName, query, false));
    }

    function testGetDagOnAggr(test) {
        var query = "index --key recordNum --dataset " + origDataset +
                    " --dsttable yelpUsers#js0;" +
                    "aggregate --srctable yelpUsers#js0 --dsttable " +
                    "yelpUsers-aggregate#js1 --eval \"count(review_count)\"";

        var locaQueryName = "aggr query";

        console.log("submit query" + query);
        xcalarQuery(thriftHandle, locaQueryName, query, true)
        .done(function(queryOutput) {
            printResult(queryOutput);

            (function wait() {
              setTimeout(function() {
                xcalarQueryState(thriftHandle, locaQueryName)
                .then(function(result) {
                    var qrStateOutput = result;
                    if (qrStateOutput.queryState === QueryStateT.qrProcssing) {
                        return wait();
                    }

                    if (qrStateOutput.queryState === QueryStateT.qrFinished) {
                        console.log("call get dag on aggr");
                        return xcalarDag(thriftHandle,  "yelpUsers-aggregate#js1");
                    }

                    test.fail("qrStateOutput.queryState = " +
                              QueryStateTStr[qrStateOutput.queryState]);
                })
                .then(function(dagOutput) {
                    console.log("dagOutput.numNodes = " + dagOutput.numNodes);
                    test.assert(dagOutput.numNodes === 3, undefined,
                                "the number of dag node returned is incorrect");
                })
                .fail(test.fail);
              }, 1000);
            })();

        })
        .fail(test.fail);
    }

    function testQueryState(test) {
        test.trivial(xcalarQueryState(thriftHandle, queryName));
    }

    function waitForDag(test) {
        var queryStateOutput;

        (function wait() {
            setTimeout(function() {
                xcalarQueryState(thriftHandle, queryName)
                .done(function(result) {
                    queryStateOutput = result;
                    if (queryStateOutput.queryState ===
                                                      QueryStateT.qrProcssing) {
                        return wait();
                    }

                    if (queryStateOutput.queryState ===
                                                       QueryStateT.qrFinished) {
                        test.pass();
                    } else {
                        var reason = "queryStateOutput.queryState = " +
                                    QueryStateTStr[queryStateOutput.queryState];
                        test.fail(reason);
                    }
                 })
                 .fail(function(reason) {
                     test.fail(reason);
                 });
             }, 1000);
         })();
    }

    function testDag(test) {
        xcalarDag(thriftHandle,  queryTableName)
        .done(function(dagOutput) {
            console.log("dagOutput.numNodes = " + dagOutput.numNodes);
            test.assert(dagOutput.numNodes === 9, undefined,
                        "the number of dag node returned is incorrect");
            test.pass();
        })
        .fail(test.fail);
    }

    function testGroupBy(test) {
        test.trivial(xcalarGroupBy(thriftHandle, "yelp/user-votes.funny-gt900",
                      "yelp/user-votes.funny-gt900-average",
                      "avg(votes.funny)", "averageVotesFunny", true));
    }

    function testAggregate(test) {
        aggrTable = "aggrTable";
        xcalarAggregate(thriftHandle, origStrTable, aggrTable, "sum(fans)")
        .done(function(aggregateOutput) {
            console.log("jsonAnswer: " + aggregateOutput + "\n");
            var jsonAnswer = JSON.parse(aggregateOutput);
            test.assert(jsonAnswer.Value === 114674, undefined,
                        "jsonAnswer !== 114674");
            test.pass();
        })
        .fail(test.fail);
    }

    function testApiMap(test) {
        test.trivial(xcalarApiMap(thriftHandle, "votesFunnyPlusUseful",
                     "add(votes.funny, votes.useful)",
                     "yelp/user-votes.funny-gt900",
                     "yelp/user-votes.funny-map"));
    }

    function testApiGetRowNum(test) {
        test.trivial(xcalarApiGetRowNum(thriftHandle, "rowNum",
                           "yelp/user-votes.funny-gt900",
                           "yelp/user-votes.funny-rowNum"));
    }

    function testDestroyDatasetInUse(test) {
        xcalarDeleteDagNodes(thriftHandle, loadOutput.dataset.name, SourceTypeT.SrcDataset)
        .then(function(status) {
            var reason = "Destroyed dataset in use succeeded when "+
                         "it should have failed";
            test.fail(reason);
        })
        .fail(function(status) {
            if (status === StatusT.StatusDgNodeInUse) {
                test.pass();
            } else {
                test.fail(StatusTStr[status]);
            }
        });
    }

    function testAddExportTarget(test) {
        var target = new ExExportTargetT();
        target.hdr = new ExExportTargetHdrT();
        target.hdr.name = "Mgmtd Export Target";
        target.hdr.type = ExTargetTypeT.ExTargetSFType;
        target.specificInput = new ExAddTargetSpecificInputT();
        target.specificInput.odbcInput = new ExAddTargetODBCInputT();

        xcalarAddExportTarget(thriftHandle, target)
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function testListExportTargets(test) {
        test.trivial(xcalarListExportTargets(thriftHandle, "*", "*"));
    }

    function testExportCSV(test) {
        var specInput = new ExInitExportSpecificInputT();
        specInput.sfInput = new ExInitExportSFInputT();
        specInput.sfInput.fileName = "yelp-mgmtdTest" +
                                     Math.floor(Math.random()*10000) + ".csv";
        specInput.sfInput.splitRule = new ExSFFileSplitRuleT();
        specInput.sfInput.splitRule.type = ExSFFileSplitTypeT.ExSFFileSplitNone;
        specInput.sfInput.headerType = ExSFHeaderTypeT.ExSFHeaderSeparateFile;
        specInput.sfInput.format = DfFormatTypeT.DfFormatCsv;
        specInput.sfInput.formatArgs = new ExInitExportFormatSpecificArgsT();
        specInput.sfInput.formatArgs.csv = new ExInitExportCSVArgsT();
        specInput.sfInput.formatArgs.csv.fieldDelim = ",";
        specInput.sfInput.formatArgs.csv.recordDelim = "\n";

        console.log("\texport file name = " + specInput.sfInput.fileName);
        var target = new ExExportTargetHdrT();
        target.type = ExTargetTypeT.ExTargetSFType;
        target.name = "Default";
        var numColumns = 2;
        var columnNames = ["user_id", "name"];
        var headerColumns = ["id_of_user", "user name"];
        var columns = columnNames.map(function (e, i) {
            var col = new ExColumnNameT();
            col.name = columnNames[i];
            col.headerAlias = headerColumns[i];
            return col;
        });

        xcalarExport(thriftHandle, "yelp/user-votes.funny-gt900",
                     target, specInput,
                     ExExportCreateRuleT.ExExportDeleteAndReplace,
                     true, numColumns, columns)
        .then(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function testExportSQL(test) {
        var specInput = new ExInitExportSpecificInputT();
        specInput.sfInput = new ExInitExportSFInputT();
        specInput.sfInput.fileName = "yelp-mgmtdTest" +
                                     Math.floor(Math.random()*10000) + ".sql";
        specInput.sfInput.splitRule = new ExSFFileSplitRuleT();
        specInput.sfInput.splitRule.type = ExSFFileSplitTypeT.ExSFFileSplitNone;
        specInput.sfInput.headerType = ExSFHeaderTypeT.ExSFHeaderSeparateFile;
        specInput.sfInput.format = DfFormatTypeT.DfFormatSql;
        specInput.sfInput.formatArgs = new ExInitExportFormatSpecificArgsT();
        specInput.sfInput.formatArgs.sql = new ExInitExportSQLArgsT();
        specInput.sfInput.formatArgs.sql.tableName = "exportSqlTableName";
        specInput.sfInput.formatArgs.sql.dropTable = true;
        specInput.sfInput.formatArgs.sql.createTable = true;

        console.log("\texport file name = " + specInput.sfInput.fileName);
        var target = new ExExportTargetHdrT();
        target.type = ExTargetTypeT.ExTargetSFType;
        target.name = "Default";
        var numColumns = 2;
        var columnNames = ["user_id", "name"];
        var headerColumns = ["id_of_user", "user name"];
        var columns = columnNames.map(function (e, i) {
            var col = new ExColumnNameT();
            col.name = columnNames[i];
            col.headerAlias = headerColumns[i];
            return col;
        });

        xcalarExport(thriftHandle, "yelp/user-votes.funny-gt900",
                     target, specInput,
                     ExExportCreateRuleT.ExExportCreateOnly,
                     true, numColumns, columns)
        .then(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function testMakeRetina(test) {
        retinaName = "yelpRetina-1";
        var dstTable = new XcalarApiRetinaDstT();
        dstTable.numColumns = 3;
        var columnNames = ["user_id", "name", "votes.funny"];
        var headerColumns = ["User ID", "User Name", "Number of Funny Votes"];
        var columns = columnNames.map(function (e, i) {
            var col = new ExColumnNameT();
            col.name = columnNames[i];
            col.headerAlias = headerColumns[i];
            return col;
        });
        dstTable.columns = columns;
        dstTable.target = new XcalarApiNamedInputT();
        dstTable.target.name = "yelp/user-votes.funny-gt900-average";
        dstTable.target.isTable = true;
        xcalarMakeRetina(thriftHandle, retinaName, [dstTable])
        .then(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            reason = "makeRetina failed with status: " + StatusTStr[reason];
            test.fail(reason);
        });
    }

    function testListRetinas(test) {
        xcalarListRetinas(thriftHandle)
        .then(function(listRetinasOutput) {
            var foundRetina = false;
            printResult(listRetinasOutput);
            for (var i = 0; i < listRetinasOutput.numRetinas; i ++) {
                if (listRetinasOutput.retinaDescs[i].retinaName == retinaName) {
                    foundRetina = true;
                }
                console.log("\tretinaDescs[" + i + "].retinaName = " +
                            listRetinasOutput.retinaDescs[i].retinaName);
            }
            test.assert(foundRetina, undefined,
                        "Could not find retina \"" + retinaName + "\"");
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testGetRetina(iter, test) {
        xcalarGetRetina(thriftHandle, retinaName)
        .done(function(getRetinaOutput) {
            printResult(getRetinaOutput);

            console.log("\tretinaName: " +
                        getRetinaOutput.retina.retinaDesc.retinaName);
            console.log("\tnumNodes: " +
                        getRetinaOutput.retina.retinaDag.numNodes);

            for (var ii = 0; ii < getRetinaOutput.retina.retinaDag.numNodes;
                 ii++) {
                console.log("\tnode[" + ii + "].dagNodeId = " +
                            getRetinaOutput.retina.retinaDag.node[ii].dagNodeId);
                console.log("\tnode[" + ii + "].api = " +
                            XcalarApisTStr[getRetinaOutput.retina.retinaDag.
                            node[ii].api]);
                console.log("\tnode[" + ii + "].apiInputSize = " +
                            getRetinaOutput.retina.retinaDag.node[ii].inputSize);
                switch (getRetinaOutput.retina.retinaDag.node[ii].api) {
                case XcalarApisT.XcalarApiExport:
                    var exportInput = getRetinaOutput.retina.retinaDag.node[ii].
                                      input.exportInput;
                    var exportTargetType = exportInput.meta.target.type;
                    console.log("\tnode[" + ii + "].meta.exportTarget = " +
                                ExTargetTypeTStr[exportTargetType] + " (" +
                                exportTargetType + ")");
                    console.log("\tnode[" + ii + "].meta.numColumns = " +
                                exportInput.meta.numColumns);
                    console.log("\tnode[" + ii + "].meta.columns = " +
                                JSON.stringify(exportInput.meta.columns));
                    switch (exportTargetType) {
                    case ExTargetTypeT.ExTargetODBCType:
                        console.log("\tnode[" + ii +
                                 "].meta.specificInput.odbcInput.tableName = " +
                            exportInput.meta.specificInput.odbcInput.tableName);
                        break;
                    case ExTargetTypeT.ExTargetSFType:
                        console.log("\tnode[" + ii +
                                    "].meta.specificInput.sfInput.fileName = " +
                               exportInput.meta.specificInput.sfInput.fileName);
                        if (iter == 2) {
                            test.assert(
                                exportInput.meta.specificInput.sfInput.fileName
                                === retinaExportParamStr, undefined,
                            "exportFileName does not match parameterized string"
                            );
                        }
                        retinaExportDagNodeId = getRetinaOutput.retina.retinaDag
                                                .node[ii].dagNodeId;
                        break;
                    default:
                    break;
                    }
                    break;
                case XcalarApisT.XcalarApiFilter:
                    console.log("\tnode[" + ii + "].filterStr = " +
                                getRetinaOutput.retina.retinaDag.node[ii].
                                input.filterInput.filterStr);
                    if (iter == 2) {
                        test.assert(getRetinaOutput.retina.retinaDag.node[ii].
                                    input.filterInput.filterStr ===
                                    retinaFilterParamStr, undefined,
                               "FilterStr does not match parameterized string");
                    }

                    retinaFilterDagNodeId = getRetinaOutput.retina.retinaDag.
                                            node[ii].dagNodeId;
                    break;
                case XcalarApisT.XcalarApiBulkLoad:
                    console.log("\tnode[" + ii + "].datasetUrl = " +
                                getRetinaOutput.retina.retinaDag.node[ii].input.
                                loadInput.dataset.url);
                    break;
                default:
                    break;
                }
            }

            test.pass();
        })
        .fail(test.fail);
    }

    function testGetRetina1(test) {
        return (testGetRetina(1, test));
    }

    function testGetRetina2(test) {
        return (testGetRetina(2, test));
    }

    function testUpdateRetina(test) {
        xcalarUpdateRetina(thriftHandle, retinaName,
                           retinaFilterDagNodeId,
                           retinaFilterParamType,
                           retinaFilterParamStr)
        .then(function(status) {
            printResult(status);
            return (xcalarUpdateRetina(thriftHandle, retinaName,
                                       retinaExportDagNodeId,
                                       retinaExportParamType,
                                       retinaExportParamStr));
        })
        .then(function(status) {
            test.pass();
        })
        .fail(test.fail);
    }

    function testExecuteRetina(test) {
        var parameters = [];
        parameters.push(new XcalarApiParameterT({ parameterName: "foo",
                                                  parameterValue: "1000" }));

        xcalarListExportTargets(thriftHandle, "*", "Default")
        .then(function(listExportTargetsOutput) {
            if (listExportTargetsOutput.numTargets < 1) {
                var reason = "No export target named Default";
                test.fail(reason);
                return;
            }

            var exportTarget = listExportTargetsOutput.targets[0];
            if (exportTarget.hdr.type != ExTargetTypeT.ExTargetSFType) {
                var reason = "Default export target not filesystem";
                test.fail(reason);
                return;
            }

            var fullPath = exportTarget.specificInput.sfInput.url.
                           substring("file://".length) + "/" +
                           retinaExportParamStr;

            // Take the .csv off
            fullPath = fullPath.slice(0, -".csv".length);

            console.log("Checking for" + fullPath);

            if (fs.exists(fullPath) && fs.isDirectory(fullPath)) {
                console.log("Deleting " + fullPath);
                fs.removeTree(fullPath);
            }

            return (xcalarExecuteRetina(thriftHandle, retinaName, parameters));
        }, test.fail)
        .then(function(status) {
            test.pass();
        })
        .fail(function(error) {
            var reason = "xcalarExecuteRetina failed with reason: " +
                         StatusTStr[error];
            test.fail(reason);
        });
    }

    function testListParametersInRetina(test) {
        xcalarListParametersInRetina(thriftHandle, retinaName)
        .done(function(listParametersInRetinaOutput) {
            printResult(listParametersInRetinaOutput);

            console.log("\tnumParameters: " +
                        listParametersInRetinaOutput.numParameters);
            for (var i = 0; i < listParametersInRetinaOutput.numParameters;
                 i++) {
                console.log("\tparameters[" + i + "].parameterName = " +
                            listParametersInRetinaOutput.parameters[i].
                            parameterName);
                console.log("\tparameters[" + i + "].parameterValue = " +
                            listParametersInRetinaOutput.parameters[i].
                            parameterValue);
            }

            if (listParametersInRetinaOutput.numParameters == 1 &&
                listParametersInRetinaOutput.parameters[0].parameterName ==
                "foo") {
                test.pass();
            } else {
                var reason = "list Parameters seems wrong";
                test.fail(reason);
            }
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testDeleteRetina(test) {
        xcalarApiDeleteRetina(thriftHandle, retinaName)
        .done(function(status) {
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testListFiles(test) {
        xcalarListFiles(thriftHandle, "file:///", false)
        .done(function(listFilesOutput) {
            printResult(listFilesOutput);

            for (var i = 0, file = null; i < listFilesOutput.numFiles; i ++) {
                file = listFilesOutput.files[i];

                console.log("\tfile[" + i.toString() + "].name = " + file.name);
                console.log("\tfile[" + i.toString() + "].attr.size = " +
                    file.attr.size.toString());
                console.log("\tfile[" + i.toString() + "].attr.isDirectory = " +
                    file.attr.isDirectory.toString());
            }

            test.pass();
        })
        .fail(test.fail);
    }

    // Witness to bug 2020
    function testApiMapStringToString(test) {
        var evalString = "string(user_id)";

        xcalarApiMap(thriftHandle, "castUserId", evalString, origTable,
                     "user_id2")
        .done(function(filterOutput) {
            test.pass();
        })
        .fail(test.fail);
    }

    // Witness to bug 238
    function testApiMapLongEvalString(test) {
        var evalString = "add(votes.funny, 1)";
        while (evalString.length <= XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            evalString = "add(1, " + evalString + ")";
        }

        xcalarApiMap(thriftHandle, "DoesNotExist", evalString, origTable,
                     "ShouldNotExist")
        .done(function(filterOutput) {
            returnValue = 1;
            var reason = "Map succeeded with long eval string when it should have failed";
            test.fail(reason);
        })
        .fail(function(reason) {
            if (reason === StatusT.StatusEvalStringTooLong) {
                test.pass();
            } else {
                test.fail(reason);
            }
        });
    }

    function testApiFilterLongEvalString(test) {
        var evalString = "add(votes.funny, 1)";
        while (evalString.length <= XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            evalString = "add(1, " + evalString + ")";
        }

        xcalarFilter(thriftHandle, evalString, origTable, "filterLongEvalStr")
        .done(function(filterOutput) {
            returnValue = 1;
            var reason = "Map succeeded with long eval string when it should have failed";
            test.fail(reason);
        })
        .fail(function(reason) {
            if (reason === StatusT.StatusEvalStringTooLong) {
                test.pass();
            } else {
                test.fail(reason);
            }
        });
    }

    function testApiKeyAddOrReplace(test, keyName, keyValue) {
        xcalarKeyAddOrReplace(thriftHandle,
                              XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                              keyName, keyValue, true)
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });

    }

    function testApiKeyInvalidScope(test) {
        // XXX Remove once XcalarApiKeyScopeUser is implemented.
        xcalarKeyAddOrReplace(thriftHandle,
                              XcalarApiKeyScopeT.XcalarApiKeyScopeUser,
                              "foo", "foobar", false)
        .done(function(status) {
            test.fail("Expected failure with scope XcalarApiKeyScopeUser.");
        })
        .fail(function(reason) {
            if (reason != StatusT.StatusUnimpl) {
                test.fail(reason);
            }
            xcalarKeyAddOrReplace(thriftHandle, 666, "foo", "foobar", false)
            .done(function(status) {
                test.fail("Expected failure given invalid scope.");
            })
            .fail(function(reason) {
                if (reason == StatusT.StatusInval) {
                    test.pass();
                } else {
                    test.fail(reason);
                }
            });
        });
    }

    function testApiKeyAdd(test) {
        testApiKeyAddOrReplace(test, "mykey", "myvalue1");
    }

    function testApiKeyReplace(test) {
        testApiKeyAddOrReplace(test, "mykey", "myvalue2");
    }

    function testSchedTask(test) {
        var dummyArg = new XcalarApiSchedArgTypeT();
        dummyArg.executeRetinaInput = new XcalarApiExecuteRetinaInputT();

        dummyArg.executeRetinaInput.retinaName = "dummyRetina";
        dummyArg.executeRetinaInput.numParameters = 0;

        xcalarScheduleTask(thriftHandle, "sched task", 1000, 0, 0,
                           SchedTaskTypeT.StQuery, dummyArg)
        .then(function() {
            xcalarListSchedTask(thriftHandle, "sched task")
            .done(function(listSchedTaskOutput) {
                if (listSchedTaskOutput.numSchedTask != 1) {
                    var reason = "wrong number of task. got \"" +
                                 listSchedTaskOutput.numSchedTask +
                                 "\" instead of \"1\"";
                    test.fail(reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].name !=
                           "sched task") {
                    var reason = "wrong name of task. got \"" +
                                 listSchedTaskOutput.schedTaskInfo[0].name +
                                 "\" instead of \"sched task\"";
                    test.fail(reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].numFailure != 0) {
                    var reason = "wrong numFailure of task. got \"" +
                                 listSchedTaskOutput.schedTaskInfo[0].numFailure +
                                 "\" instead of \"0\"";
                    test.fail(reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].
                           scheduleInfo.schedTimeInSecond != 1000) {
                    var reason = "wrong schedule time of task. got \"" +
                                 listSchedTaskOutput.schedTaskInfo[0].
                                 scheduleInfo.schedTimeInSecond +
                                 "\" instead of \"1000\"";
                    test.fail(reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].type !=
                           SchedTaskTypeT.StQuery) {
                    var reason = "wrong task type. got \"" +
                                 listSchedTaskOutput.schedTaskInfo[0].type +
                                 "\" instead of " + SchedTaskTypeT.StQuery;
                    test.fail(reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].arg.
                           executeRetinaInput.retinaName !=
                           dummyArg.executeRetinaInput.retinaName) {
                    var reason = "wrong retina name got \"" +
                                 listSchedTaskOutput.schedTaskInfo[0].arg.
                                 executeRetinaInput.retinaName +
                                 "\" instead of " +
                                 dummyArg.executeRetinaInput.retinaName;
                    test.fail(reason);
                }

                xcalarDeleteSchedTask(thriftHandle, "sched task")
                .done(function(status) {
                  printResult(status);
                  test.pass();
                })
                .fail(function(reason) {
                    test.fail(StatusTStr[reason]);
                });
           })
           .fail(function(reason) {
               test.fail(StatusTStr[reason]);
           });
        }, function(reason) {
            test.fail(StatusTStr[reason]);
        }
        );
    }

    function testApiKeyAppend(test) {
        // Insert original key
        xcalarKeyAddOrReplace(thriftHandle,
                              XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                              "myotherkey", "a", false)
        .then(function() {
            // Append first 'a'
            return xcalarKeyAppend(thriftHandle,
                                   XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                   "myotherkey", "a");
        })
        .then(function() {
            // Append second 'a'
            return xcalarKeyAppend(thriftHandle,
                                   XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                   "myotherkey", "a");
        })
        .then(function() {
            // Lookup. Make sure result is 'aaa'
            return xcalarKeyLookup(thriftHandle,
                                   XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                   "myotherkey");
        })
        .then(function(lookupOutput) {
            if (lookupOutput.value != "aaa") {
                var reason = "wrong value. got \"" + lookupOutput.value + "\" instead of \"aaa\"";
                test.fail(reason);
            } else {
                test.pass();
            }
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testApiKeySetIfEqual(test) {
        // Insert original key
        xcalarKeyAddOrReplace(thriftHandle,
                              XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                              "yourkey", "b", false)
        .then(function() {
            // Try replacing with incorrect oldValue
            xcalarKeySetIfEqual(thriftHandle,
                                XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                false, "yourkey", "wrongvalue", "x", "x", "x")
            .then(function() {
                var reason = "Expected failure due to incorrect oldValue.";
                test.fail(reason);
            })
            .fail(function(reason) {
                // Try replacing with correct oldValue
                xcalarKeySetIfEqual(thriftHandle,
                                   XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                   false, "yourkey", "b", "c", "x", "y")
                .then(function() {
                    // Lookup. Make sure result is as expected
                    return xcalarKeyLookup(thriftHandle,
                                   XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                   "yourkey");
                })
                .then(function(lookupOutput) {
                    if (lookupOutput.value != "c") {
                        test.fail("Wrong value. Got '" + lookupOutput.value +
                                  "'. Expected 'c'.");
                    } else {
                        return xcalarKeyLookup(thriftHandle,
                                     XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                     "x");
                    }
                })
                .then(function(lookupOutput) {
                    if (lookupOutput.value != "y") {
                        test.fail("Wrong value. Got '" + lookupOutput.value +
                                  "'. Expected 'y'.");
                    } else {
                        xcalarKeySetIfEqual(thriftHandle,
                                     XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                     false, "x", "y", "z")
                        .then(function() {
                            xcalarKeyLookup(thriftHandle,
                                     XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                     "x")
                            .then(function(lookupOutput) {
                                if (lookupOutput.value != "z") {
                                    test.fail("Wrong value. Got '" +
                                         lookupOutput.value +
                                         "'. Expected 'z'.");
                                } else {
                                    test.pass();
                                }
                            })
                            .fail(function(reason) {
                                test.fail(reason);
                            });
                        })
                        .fail(function(reason) {
                            test.fail(reason);
                        });
                    }
                })
                .fail(function(reason) {
                    test.fail(reason);
                });
            });
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testApiKeyLookup(test) {
        xcalarKeyLookup(thriftHandle,
                        XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                        "mykey")
        .done(function(lookupOutput) {
            printResult(lookupOutput);
            if (lookupOutput.value != "myvalue2") {
                var reason = "wrong value. got \"" + lookupOutput.value + "\" instead of \"myvalue2\"";
                test.fail(reason);
            } else {
                test.pass();
            }
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testApiKeyDelete(test) {
        xcalarKeyDelete(thriftHandle,
                        XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal, "mykey")
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testApiKeyBogusLookup(test) {
        xcalarKeyLookup(thriftHandle,
                        XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                        "mykey")
        .done(function(lookupOutput) {
            printResult(lookupOutput);
            var reason = "lookup did not fail";
            test.fail(reason);
        })
        .fail(function(reason) {
            test.pass();
        });
    }

    function testApiKeySessions(test) {
        var session1 = "mgmtdTestApiKeySessions1" + (new Date().getTime());
        var session2 = "mgmtdTestApiKeySessions2" + (new Date().getTime());

        var keyName = "sessionKey";

        xcalarApiSessionList(thriftHandle, "*")
        .then(function(ret) {
            return xcalarApiSessionDelete(thriftHandle, "*")
            .always(function() {
                // Start in brand new sesion...
                xcalarApiSessionNew(thriftHandle, session1, false, "")
                .then(function() {
                    // ... and add a key.
                    return xcalarKeyAddOrReplace(thriftHandle,
                                                 XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
                                                 keyName, "x", false);
                })
                .then(function() {
                    // Make sure it exists in this session.
                    return xcalarKeyLookup(thriftHandle,
                                           XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
                                           keyName);
                })
                .then(function(lookupOutput) {
                    if (lookupOutput.value === "x") {
                        // Create a new session and switch to it.
                        return xcalarApiSessionNew(thriftHandle, session2, false, "");
                    } else {
                        test.fail("Failed lookup. Expected x got " + lookupOutput.value);
                    }
                })
                .then(function() {
                    return xcalarApiSessionSwitch(thriftHandle, session2, session1, false);
                })
                .then (function() {
                    // Make sure the key we created in the other session doesn't turn up
                    // in this one.
                    xcalarKeyLookup(thriftHandle,
                                    XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
                                    keyName)
                    .then(function() {
                        test.fail("Lookup in session2 should have failed.");
                    })
                    .fail(function(reason) {
                        test.pass();
                    });
                })
                .fail(function(reason) {
                    test.fail(StatusTStr[reason]);
                });
            });
        }, function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function testTop(test) {
        xcalarApiTop(thriftHandle, XcalarApisConstantsT.XcalarApiDefaultTopIntervalInMs)
        .done(function(topOutput) {
            var ii;
            printResult(topOutput);
            for (ii = 0; ii < topOutput.numNodes; ii++) {
                console.log("\tNode Id: ", topOutput.topOutputPerNode[ii].nodeId);
                console.log("\tCpuUsage(%): ", topOutput.topOutputPerNode[ii].cpuUsageInPercent);
                console.log("\tMemUsage(%): ", topOutput.topOutputPerNode[ii].memUsageInPercent);
                console.log("\tMemUsed: ", topOutput.topOutputPerNode[ii].memUsedInBytes);
                console.log("\tMemAvailable: ", topOutput.topOutputPerNode[ii].totalAvailableMemInBytes);
                console.log("\n\n");
            }
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testMemory(test) {
        xcalarApiMemory(thriftHandle, null)
        .done(function(memOutput) {
            var ii;
            for (ii = 0; ii < memOutput.numNodes; ii++) {
                var jj;
                var nodeOutput = memOutput.memOutputPerNode[ii];
                console.log("\tNode Id: ", nodeOutput.nodeId);
                console.log("\tNum Tags: ", nodeOutput.numTags);
                for (jj = 0; jj < nodeOutput.numTags; jj++) {
                    var tagOutput = nodeOutput.memOutputPerTag[jj];
                    console.log("\t", tagOutput.locName, "\t", tagOutput.tagName, "\t", tagOutput.memUsageInBytes);
                }
                console.log("\n\n");
            }
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testListXdfs(test) {
        xcalarApiListXdfs(thriftHandle, "*", "*")
        .done(function(listXdfsOutput) {
            var ii;
            var jj;
            printResult(listXdfsOutput);
            for (ii = 0; ii < listXdfsOutput.numXdfs; ii++) {
                 console.log("\tfnName: ", listXdfsOutput.fnDescs[ii].fnName);
                 console.log("\tfnDesc: ", listXdfsOutput.fnDescs[ii].fnDesc);
                 console.log("\tNumArgs: ", listXdfsOutput.fnDescs[ii].numArgs);
                 for (jj = 0; jj < listXdfsOutput.fnDescs[ii].numArgs; jj++) {
                      console.log("\tArg ", jj, ": ", listXdfsOutput.fnDescs[ii].argDescs[jj].argDesc);
                 }
                 console.log("\n\n");
             }
             test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testCreateDht(test) {
        var dhtName = "mgmtTestCustomDht";

        function deleteTableSuccessFn(status) {
            xcalarApiDeleteDht(thriftHandle, dhtName)
            .done(function (status) {
                test.pass();
            })
            .fail(function(status) {
                var reason = "deleteDht returned status: " + StatusTStr[status];
                test.fail(reason);
            });
        }

        function indexDatasetSuccessFn(indexOutput) {
            xcalarGetTableMeta(thriftHandle, indexOutput.tableName)
            .done(function(metaOutput) {
                var totalCount = 0;
                for (var ii = 0; ii < metaOutput.numMetas; ii++) {
                    console.log("Node " + ii + " - " + metaOutput.metas[ii].numRows);
                    if (metaOutput.metas[ii].numRows === 0) {
                        var reason = "Node " + ii + " has 0 entries";
                        test.fail(reason);
                    }
                    totalCount += metaOutput.metas[ii].numRows;
                }

                if (totalCount === 70817) {
                    xcalarDeleteDagNodes(thriftHandle, indexOutput.tableName, SourceTypeT.SrcTable)
                    .done(deleteTableSuccessFn)
                    .fail(function(status) {
                        var reason = "deleteTable returned status: " + StatusTStr[status];
                        test.fail(reason);
                    });
                } else {
                    var reason = "Total count " + totalCount + " != 70817";
                    test.fail(reason);
                }
            })
            .fail(function(status) {
                var reason = "getCount returned status: " + StatusTStr[status];
                test.fail(reason);
            });
        }

        function createDhtSuccessFn(status) {
            xcalarIndexDataset(thriftHandle, yelpUserDataset,
                               "average_stars", "yelp/user-average_stars",
                               dhtName, XcalarOrderingT.XcalarOrderingInvalid)
            .done(indexDatasetSuccessFn)
            .fail(function(status) {
                var reason = "Index dataset returned status: " + StatusTStr[status];
                test.fail(reason);
            });
        }

        function startCreateDhtTest(status) {
            console.log("deleteDht returned status: " + StatusTStr[status]);
            xcalarApiCreateDht(thriftHandle, dhtName, 5.0, 0.0,
                               XcalarOrderingT.XcalarOrderingUnordered)
            .done(createDhtSuccessFn)
            .fail(function(status) {
                var reason = "createDht returned status: " + StatusTStr[status];
                test.fail(reason);
            });

        }

        xcalarApiDeleteDht(thriftHandle, dhtName)
        .then(startCreateDhtTest, startCreateDhtTest);
    }

    function testPyExecOnLoad(test) {

        var content = fs.read(system.env['MGMTDTEST_DIR'] +
                      '/PyExecOnLoadTest.py');

        xcalarApiUdfDelete(thriftHandle, "PyExecOnLoadTest")
        .always(function() {
            xcalarApiUdfAdd(thriftHandle, UdfTypeT.UdfTypePython,
                            "PyExecOnLoadTest", content)
            .done(function(uploadPythonOutput) {
                if (status == StatusT.StatusOk) {
                    loadArgs = new XcalarApiDfLoadArgsT();
                    loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
                    loadArgs.udfLoadArgs = new XcalarApiUdfLoadArgsT();
                    loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
                    loadArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
                    loadArgs.csv.isCRLF = false;
                    loadArgs.udfLoadArgs.fullyQualifiedFnName = "PyExecOnLoadTest:poorManCsvToJson";

                    xcalarLoad(thriftHandle,
                               "file://" + qaTestDir + "/operatorsTest/movies/movies.csv",
                               "movies",
                               DfFormatTypeT.DfFormatJson,
                               0,
                               loadArgs)
                    .done(function(result) {
                        printResult(result);
                        loadOutput = result;
                        moviesDataset = loadOutput.dataset.name;
                        moviesDatasetSet = true;
                        origDataset = loadOutput.dataset.name;
                        test.pass();
                    })
                    .fail(function(reason) {
                        test.fail(StatusTStr[reason]);
                    });
                } else {
                    var reason = "status = " + status;
                    test.fail(reason);
                }
            })
            .fail(function(reason) {
                test.fail(reason);
            });
        });
    }

    function testDeleteTable(test) {
        xcalarDeleteDagNodes(thriftHandle, "yelp/user-votes.funny-map", SourceTypeT.SrcTable)
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

/** None of these tests really work yet. It's just stubs for later
    function testSessionNew(test) {
        xcalarApiSessionNew(thriftHandle, "testSession", false, "")
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testSessionDelete(test) {
        xcalarApiSessionDelete(thriftHandle, "*")
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testSessionInact(test) {
        xcalarApiSessionInact(thriftHandle, "*", false)
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testSessionList(test) {
        xcalarApiSessionList(thriftHandle, "*")
        .done(function(sessionListOutput) {
            printResult(sessionListOutput);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testSessionRename(test) {
        xcalarApiSessionRename(thriftHandle, "testSession", "testSession2")
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testSessionSwitch(test) {
        xcalarApiSessionSwitch(thriftHandle, "testSession2", "testSession3",
                               false)
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }

    function testSessionPersist(test) {
        xcalarApiSessionPersist(thriftHandle, "*")
        .done(function(sessionListOutput) {
            printResult(sessionListOutput);
            test.pass();
        })
        .fail(function(reason) {
            test.fail(reason);
        });
    }
*/
    // Witness to bug 103
    function testBulkDeleteTables(test) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcTable)
        .done(function(deleteTablesOutput) {
            printResult(deleteTablesOutput);

            for (var i = 0, delTableStatus = null; i < deleteTablesOutput.numTables; i ++) {
                delTableStatus = deleteTablesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }
            test.pass();
        })
        .fail(test.fail);
    }

    function testBulkDeleteExport(test) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcExport)
        .done(function(deleteDagNodesOutput) {
            printResult(deleteDagNodesOutput);

            for (var i = 0, delTableStatus = null; i < deleteDagNodesOutput.numTables; i ++) {
                delTableStatus = deleteDagNodesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            test.pass();
        })
        .fail(test.fail);
    }

    function testBulkDeleteConstants(test) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcConstant)
        .done(function(deleteDagNodesOutput) {
            printResult(deleteDagNodesOutput);

            for (var i = 0, delTableStatus = null; i < deleteDagNodesOutput.numTables; i ++) {
                delTableStatus = deleteDagNodesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            test.pass();
        })
        .fail(test.fail);
    }

    function testBulkDeleteDataset(test) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcDataset)
        .done(function(deleteDagNodesOutput) {
            printResult(deleteDagNodesOutput);

            for (var i = 0, delTableStatus = null; i < deleteDagNodesOutput.numTables; i ++) {
                delTableStatus = deleteDagNodesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            test.pass();
        })
        .fail(test.fail);
    }

    function testDestroyDataset(test) {
        if (moviesDatasetSet) {
            xcalarDeleteDagNodes(thriftHandle, moviesDataset, SourceTypeT.SrcDataset)
            .done(function(status) {
                printResult(status);
                test.pass();
            })
            .fail(function(reason) {
                test.fail(StatusTStr[reason]);
            });
        } else {
            console.log("Skipping test because this test depends on testPyExecOnLoad\n");
            skip(test);
        }
    }

    // Witness to bug 98
    function testShutdown(test) {
        xcalarShutdown(thriftHandle)
        .done(function(status) {
            printResult(status);
            test.pass();
        })
        .fail(test.fail);
    }

    function testSupportGenerate(test) {

        xcalarApiSupportGenerate(thriftHandle)
        .done(function(output) {
            if (fs.exists(output.bundlePath)) {
                fs.removeTree(output.bundlePath);
                test.pass();
            } else {
                printResult(output);
                test.fail("Failed to locate bundle path from output.");
            }
        })
        .fail(function(reason) {
            test.fail(StatusTStr[reason]);
        });
    }

    function testUdf(test)
    {
        var source1 = "def foo():\n return 'foo'\n";
        var source2 = "def bar():\n return 'bar'\n";

        xcalarApiUdfDelete(thriftHandle, "mgmttest*")
        .always(function () {
            xcalarApiUdfAdd(thriftHandle, UdfTypeT.UdfTypePython,
                            "mgmttestfoo", source1)
            .then(function () {
                return xcalarApiUdfGet(thriftHandle, "mgmttestfoo");
            })
            .then(function (output) {
                if (output.source != source1) {
                    printResult(output);
                    test.fail("Expected source '" + source1 + "' got '" + output.source + "'.");
                } else {
                    return xcalarApiUdfUpdate(thriftHandle,
                                              UdfTypeT.UdfTypePython,
                                              "mgmttestfoo", source2);
                }
            })
            .then(function () {
                return xcalarApiUdfGet(thriftHandle, "mgmttestfoo");
            })
            .then(function (output) {
                if (output.source != source2) {
                    printResult(output);
                    test.fail("Expected source '" + source2 + "' got '" +
                            output.source + "'.");
                } else {
                    return xcalarApiUdfDelete(thriftHandle, "mgmttestfoo");
                }
            })
            .then(function () {
                test.pass();
            })
            .fail(function(reason) {
                test.fail(StatusTStr[reason]);
            });
        });
    }

    // XXX: Implement me
    function testImportRetina(test) {

        xcalarApiImportRetina(thriftHandle)
        .always(function() {
            test.fail("Not implemented");
        });
    }

    passes            = 0;
    fails             = 0;
    skips             = 0;
    returnValue       = 0;
    defaultTimeout    = 256000000;
    disableIsPass     = true;

    var content = fs.read(system.env['MGMTDTEST_DIR'] + '/test-config.cfg');
    var port = content.slice(content.indexOf('Thrift.Port'))
    port = port.slice(port.indexOf('=') + 1, port.indexOf('\n'))

    thriftHandle   = xcalarConnectThrift("localhost", port);
    loadArgs       = null;
    loadOutput     = null;
    origDataset    = null;
    yelpUserDataset = null;
    queryName      = null;
    origTable      = null;
    aggrTable      = null;
    origStrTable   = null;
    queryTableName = "yelp-joinTable";

    makeResultSetOutput1 = null;   // for dataset
    makeResultSetOutput2 = null;   // for table
    makeResultSetOutput3 = null;   // for aggregate
    newTableOutput       = null;

    retinaName            = "";
    retinaFilterDagNodeId = 0;
    retinaFilterParamType = XcalarApisT.XcalarApiFilter;
    retinaFilterParamStr  = "gt(votes.funny, <foo>)";
    retinaExportParamType = XcalarApisT.XcalarApiExport;
    retinaExportParamStr  = "retinaDstFile.csv";

    // Format
    // addTestCase(testFn, testName, timeout, TestCaseEnabled, Witness)
    addTestCase(testStartNodes, "startNodes", defaultTimeout, startNodesState, "");
    addTestCase(testGetNumNodes, "getNumNodes", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testGetVersion, "getVersion", defaultTimeout, TestCaseEnabled, "");

    // This actually starts our sessions, so run this before any test
    // that requires sessions
    addTestCase(testApiKeySessions, "key sessions", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testBulkDestroyDs, "bulk destroy ds", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testSchedTask, "test schedtask", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testBadLoad, "bad load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testLoad, "load", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testLoadEdgeCaseDos, "loadDos", defaultTimeout, TestCaseEnabled, "4415");

    // Xc-1981
    addTestCase(testGetDagOnAggr, "get dag on aggregate", defaultTimeout, TestCaseDisabled, "1981");

    addTestCase(testLoadBogus, "bogus load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testListDatasets, "list datasets", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetQueryIndex, "test get query Index", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetQueryLoad, "test get query Load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testIndexDatasetIntSync, "index dataset (int) Sync", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testIndexDatasetInt, "index dataset (int)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testIndexDatasetStr, "index dataset (str)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testIndexTable, "index table (str) Sync", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testIndexDatasetBogus, "bogus index dataset", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testIndexTable2, "index table (str) 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testIndexTableBogus, "bogus index table 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetTableRefCount, "table refCount", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetTableMeta, "table meta", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testRenameNode, "rename node", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetDatasetCount, "dataset count", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetTableCount, "table count", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testListTables, "list tables", defaultTimeout, TestCaseEnabled, "");

    // XXX Re-enable as soon as bug is fixed
    addTestCase(testGetStats, "get stats", defaultTimeout, TestCaseEnabled, "");

    // XXX Re-enable as soon as bug is fixed
    addTestCase(testGetStatGroupIdMap, "get stats group id map", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testGetStatsByGroupId, "get stats group id", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testResetStats, "reset stats", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testMakeResultSetFromDataset, "result set (via dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testMakeResultSetFromTable, "result set (via tables)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testResultSetNextDataset, "result set next (dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testResultSetAbsolute, "result set absolute", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testResultSetAbsoluteBogus, "result set absolute bogus", defaultTimeout, TestCaseEnabled, "95");
    addTestCase(testResultSetNextTable, "result set next (table)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testFreeResultSetDataset, "free result set (dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testFreeResultSetTable, "free result set (table)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testFilter, "filter", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testProject, "project", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testJoin, "join", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetOpStats, "getOpStats", defaultTimeout, TestCaseEnabled, "");

    // XXX Re-enable when either the query-DAG bug is fixed or the test is changed to create a session and
    //     have the query run under the current session instead of creating its own.
    addTestCase(testCancel, "test cancel", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testQuery, "Submit Query", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testQueryState, "Request query state of indexing dataset (int)", defaultTimeout, TestCaseDisabled, "");
    addTestCase(waitForDag, "waitForDag", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testDag, "dag", defaultTimeout, TestCaseDisabled, "568");
    addTestCase(testGroupBy, "groupBy", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testAggregate, "Aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testMakeResultSetFromAggregate, "result set of aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testResultSetNextAggregate, "result set next of aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testFreeResultSetAggregate, "result set free of aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testApiMap, "map", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testDestroyDatasetInUse, "destroy dataset in use", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testAddExportTarget, "add export target", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testListExportTargets, "list export targets", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testExportCSV, "export csv", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testExportSQL, "export sql", defaultTimeout, TestCaseEnabled, "");

    // Together, these set of test cases make up the retina sanity
    addTestCase(testMakeRetina, "makeRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testListRetinas, "listRetinas", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetRetina1, "getRetina - iter 1 / 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testUpdateRetina, "updateRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testGetRetina2, "getRetina - iter 2 / 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testExecuteRetina, "executeRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testListParametersInRetina, "listParametersInRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testDeleteRetina, "deleteRetina", defaultTimeout, TestCaseEnabled, "");

    // XXX: Re-enable once implemented
    addTestCase(testImportRetina, "importRetina", defaultTimeout, TestCaseDisabled, "");

    addTestCase(testListFiles, "list files", defaultTimeout, TestCaseEnabled, "");

    // This pair must go together
    addTestCase(testPyExecOnLoad, "python during load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testDestroyDataset, "destroy dataset", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testUdf, "UDF test", defaultTimeout, TestCaseEnabled, "");

    // Witness to bug 238
    addTestCase(testApiMapLongEvalString, "Map long eval string", defaultTimeout, TestCaseEnabled, "238");
    addTestCase(testApiFilterLongEvalString, "Filter long eval string", defaultTimeout, TestCaseEnabled, "238");

    // Witness to bug 2020
    addTestCase(testApiMapStringToString, "cast string to string", defaultTimeout, TestCaseEnabled, "2020");

    addTestCase(testApiKeyAdd, "key add", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testApiKeyReplace, "key replace", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testApiKeyLookup, "key lookup", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testApiKeyDelete, "key delete", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testApiKeyBogusLookup, "bogus key lookup", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testApiKeyAppend, "key append", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testApiKeySetIfEqual, "key set if equal", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testTop, "top test", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testMemory, "memory test", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testListXdfs, "listXdfs test", defaultTimeout, TestCaseEnabled, "");

    // Witness to bug Xc-2371
    addTestCase(indexAggregateRaceTest, "index-aggregate race test", defaultTimeout, TestCaseEnabled, "2371")

    // XXX Re-enable when waitpid bug is fixed
    addTestCase(testSupportGenerate, "support generate", defaultTimeout, TestCaseDisabled, "");

    // Re-enabled with delete DHT added
    addTestCase(testCreateDht, "create DHT test", defaultTimeout, TestCaseEnabled, "");

    // XXX re-enable when the query-DAG bug is fixed
    addTestCase(testDeleteTable, "delete table", defaultTimeout, TestCaseDisabled, "");

    addTestCase(testBulkDeleteTables, "bulk delete tables", defaultTimeout, TestCaseEnabled, "103");
    addTestCase(testBulkDeleteExport, "bulk delete export node ", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testBulkDeleteConstants, "bulk delete constant node ", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testBulkDeleteDataset, "bulk delete constant node ", defaultTimeout, TestCaseEnabled, "2314");
    // temporarily disabled due to bug 973
    // temporarily disabled due to bug 973
    addTestCase(testShutdown, "shutdown", defaultTimeout, TestCaseDisabled, "98");

    runTestSuite(testCases);
})($, {});
