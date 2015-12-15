// Scroll all the way down to add test cases
// Or search for function addTestCase

+function(undefined) {
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
    ,   retinaDstTable
    ,   retinaExportFile
    ,   paramInput;

    testCases = new Array();

    // For start nodes test
    var startNodesState;
    var system = require('system');
    var qaTestDir = system.env['QATEST_DIR'];

    console.log("Qa test dir: " + qaTestDir);
    startNodesState = TestCaseEnabled;

    system.args.forEach(function(arg, i) {
        if (arg === "nostartnodes") {
            console.log("Disabling testStartNodes()");
            startNodesState = TestCaseDisabled;
        }
    });

    function startTest(deferred, testNameLocal, currentTestNumberLocal, timeout) {
    }

    function printResult(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    }

    function pass(deferred, testName, currentTestNumber)
    {
        if (deferred.state() == "pending") {
            passes ++;
            console.log("ok " + currentTestNumber + " - Test \"" + testName +
                        "\" passed");
            deferred.resolve();
        }
    }

    function fail(deferred, testName, currentTestNumber, reason)
    {
        if (deferred.state() == "pending") {
            fails ++;
            console.log("Test " + testName + " failed -- " + reason);
            console.log("not ok " + currentTestNumber + " - Test \"" + testName +
                        "\" failed (" + reason + ")");
            deferred.reject();
        }
    }

    function skip(deferred, testName, currentTestNumber)
    {
        console.log("====== Skipping " + testName + " ======");
        console.log("ok " + currentTestNumber + " - Test \"" + testName +
                    "\" disabled # SKIP");
        skips ++;
        if (disableIsPass) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    }

    function addTestCase(testCases, testFn, testName, timeout, testCaseEnabled)
    {
        testCases[testCases.length] = {"testFn": testFn,
                                       "testName": testName,
                                       "timeout": timeout,
                                       "testCaseEnabled": testCaseEnabled};
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
                        var localDeferred = $.Deferred();
                        if (testCase.testCaseEnabled) {
                            console.log("====================Test ", currentTestNumber, " Begin====================");
                            console.log("Testing: ", testCase.testName, "                     ");
                            setTimeout(function() {
                                if (localDeferred.state() == "pending") {
                                    var reason = "Timed out after " + (testCase.timeout / 1000) + " seconds";
                                    fail(localDeferred, testCase.testName, currentTestNumber, reason);
                                }
                            }, testCase.timeout);

                            testCase.testFn(localDeferred, testCase.testName, currentTestNumber);
                        } else {
                            skip(localDeferred, testCase.testName, currentTestNumber);
                        }

                        return localDeferred.promise();
                    }
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

    function testStartNodes(deferred, testName, currentTestNumber) {
        xcalarStartNodes(thriftHandle, 4)
        .done(function(result) {
            printResult(result);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testGetNumNodes(deferred, testName, currentTestNumber) {
        xcalarGetNumNodes(thriftHandle)
        .done(function(result) {
            printResult(result);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testGetVersion(deferred, testName, currentTestNumber) {
        xcalarGetVersion(thriftHandle)
        .done(function(result) {
            printResult(result);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testLoad(deferred, testName, currentTestNumber) {
        loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
        loadArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
        loadArgs.csv.isCRLF = false;

        xcalarLoad(thriftHandle, "file://" + qaTestDir + "/yelp/user", "yelp", DfFormatTypeT.DfFormatJson, 0, loadArgs)
        .done(function(result) {
            printResult(result);
            loadOutput = result;
            origDataset = loadOutput.dataset.name;
            yelpUserDataset = loadOutput.dataset.name;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
        });
    }

    function testBulkDestroyDs(deferred, testName, currentTestNumber) {
        loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
        loadArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
        loadArgs.csv.isCRLF = false;

        xcalarLoad(thriftHandle, "file://" + qaTestDir + "/yelp/reviews", "review",
                   DfFormatTypeT.DfFormatJson, 0, loadArgs)
        .done(function(result) {
            var testloadOutput = result;

            xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcDataset)
            .done(function(destroyDatasetsOutput) {
                printResult(destroyDatasetsOutput);

                for (var i = 0, delDsStatus = null;
                    i < destroyDatasetsOutput.numDataset; i ++) {
                    delDsStatus = destroyDatasetsOutput.statuses[i];
                    console.log("\t" + delDsStatus.datasetName + ": " +
                        StatusTStr[delDsStatus.status]);
                }

                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            });

        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
        });
    }

    function testLoadBogus(deferred, testName, currentTestNumber) {
        xcalarLoad(thriftHandle, "somejunk", "junk", DfFormatTypeT.DfFormatJson, 0, loadArgs)
        .done(function(bogusOutput) {
            printResult(bogusOutput);
            fail(deferred, testName, currentTestNumber, "load succeeded when it should have failed");
        })
        .fail(function() {
            pass(deferred, testName, currentTestNumber);
        })
    }

    function testListDatasets(deferred, testName, currentTestNumber) {
        xcalarListDatasets(thriftHandle)
        .done(function(listDatasetsOutput) {
            printResult(listDatasetsOutput);

            var foundLoadDs = false;
            for (var i = 0, dataset = null; i < listDatasetsOutput.numDatasets; i ++) {
                dataset = listDatasetsOutput.datasets[i];

                console.log("\tdataset[" + i.toString() + "].url = " + dataset.url);
                console.log("\tdataset[" + i.toString() + "].name = " + dataset.name);
                console.log("\tdataset[" + i.toString() + "].datasetId = " +
                    dataset.datasetId.toString());
                console.log("\tdataset[" + i.toString() + "].formatType = " +
                    DfFormatTypeTStr[dataset.formatType]);
                console.log("\tdataset[" + i.toString() + "].loadIsComplete = " +
                    dataset.loadIsComplete.toString());
                console.log("\tdataset[" + i.toString() + "].refCount = " +
                    dataset.refCount.toString());

                if (dataset.name === loadOutput.dataset.name) {
                    foundLoadDs = true;
                }
            }
            if (foundLoadDs) {
                console.log("Found dataset \"" + loadOutput.dataset.name + "\"");
                pass(deferred, testName, currentTestNumber);
            } else {
                fail(deferred, testName, currentTestNumber, "Could not find loaded dataset \"" + loadOutput.dataset.name + "\"");
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testRenameNode(deferred, testName, currentTestNumber) {
        xcalarRenameNode(thriftHandle, origTable, "newName")
        .done(function(status) {
            printResult(status);

            xcalarRenameNode(thriftHandle, "newName", origTable)
            .done(function(status) {
                printResult(status);
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(status) {
                fail(deferred, testName, currentTestNumber, StatusTStr[status]);
            })

        })
        .fail(function(status) {
            fail(deferred, testName, currentTestNumber, StatusTStr[status]);
        })
    }

    function testIndexDatasetIntSync(deferred, testName, currentTestNumber) {
        xcalarIndexDataset(thriftHandle,
                           loadOutput.dataset.name, "review_count",
                           "yelp/user-review_count", "", XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(syncIndexOutput) {
            printResult(syncIndexOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testIndexDatasetInt(deferred, testName, currentTestNumber) {
        xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                           "votes.funny", "yelp/user-votes.funny", "", XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(indexOutput) {
            printResult(indexOutput);
            origTable = indexOutput.tableName;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testIndexDatasetStr(deferred, testName, currentTestNumber) {
        xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                           "user_id", "yelp/user-user_id", "", XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(indexStrOutput) {
            printResult(indexStrOutput);
            origStrTable = indexStrOutput.tableName;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testIndexTable(deferred, testName, currentTestNumber) {
        xcalarIndexTable(thriftHandle, origStrTable,
                         "name", "yelp/user-name", "", XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(indexStrOutput) {
            printResult(indexStrOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testGetQueryIndex(deferred, testName, currentTestNumber) {
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
        .done(function(getQueryOutput) {
            console.log("\tquery =" + getQueryOutput.query.toString());
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testGetQueryLoad(deferred, testName, currentTestNumber) {
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
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testIndexDatasetBogus(deferred, testName, currentTestNumber) {
         xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                            "garbage", "yelp/user-garbage", "", XcalarOrderingT.XcalarOrderingUnordered)
         .done(function(bogusIndexOutput) {
             printResult(bogusIndexOutput);
             pass(deferred, testName, currentTestNumber);
         })
         .fail(function(reason) {
             fail(deferred, testName, currentTestNumber, reason);
         })
    }

    function testIndexTable2(deferred, testName, currentTestNumber) {
        xcalarIndexTable(thriftHandle, origStrTable,
                         "yelping_since", "yelp/user-yelping_since", "", XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(indexStrOutput2) {
            printResult(indexStrOutput2);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testIndexTableBogus(deferred, testName, currentTestNumber) {
        xcalarIndexTable(thriftHandle, origTable,
                         "garbage2", "yelp/user-garbage2", "", XcalarOrderingT.XcalarOrderingUnordered)
        .done(function(bogusIndexOutput2) {
            printResult(bogusIndexOutput2);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            failed(deferred, testName, currentTestNumber, reason);
        })
    }

    function testGetTableRefCount(deferred, testName, currentTestNumber) {
        xcalarGetTableRefCount(thriftHandle, origTable)
        .done(function(refOutput) {
            printResult(refOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function curryVerifyCountOutput(deferred, testName, currentTestNumber) {
        function verifyCountOutput(countOutput) {
            printResult(countOutput);

            var totalCount = 0;
            for (var i = 0; i < countOutput.numCounts; i ++) {
                totalCount += countOutput.counts[i];
                console.log("Node " + i + ": " + countOutput.counts[i]);
            }

            console.log("\tcount: " + totalCount.toString());

            if (totalCount === 70817) {
                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "wrong count: " + totalCount + " expected: 70817";
                fail(deferred, testName, currentTestNumber, reason);
            }
        }
        return (verifyCountOutput);
    }

    function testGetDatasetCount(deferred, testName, currentTestNumber) {
        var verifyDatasetCount = curryVerifyCountOutput(deferred, testName,
                                                        currentTestNumber);
        xcalarGetDatasetCount(thriftHandle, yelpUserDataset)
        .done(verifyDatasetCount)
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testGetTableCount(deferred, testName, currentTestNumber) {
        var verifyTableCount = curryVerifyCountOutput(deferred, testName,
                                                      currentTestNumber);
        xcalarGetTableCount(thriftHandle, origTable)
        .done(verifyTableCount)
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testListTables(deferred, testName, currentTestNumber) {
        xcalarListTables(thriftHandle, "yelp*", SourceTypeT.SrcTable)
        .done(function(listTablesOutput) {
            printResult(listTablesOutput);

            var foundVotesFunny = false;
            for (var i = 0, node = null; i < listTablesOutput.numNodes; i ++) {
                node = listTablesOutput.nodeInfo[i];
                console.log("\ttable[" + i.toString() + "].tableName = " + node.name);
                console.log("\ttable[" + i.toString() + "].tableId = " +
                    node.dagNodeId.toString());
                console.log("\ttable[" + i.toString() + "].state = " +
                    node.state.toString());
                if (node.name === origTable) {
                    foundVotesFunny = true;
                }
            }
            if (foundVotesFunny) {
                console.log("Found node \"" + origTable + "\"");
                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "failed to find node \"" + origTable + "\"";
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function indexAggregateRaceTest(deferred, testName, currentTestNumber) {
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

            function doneVerification() {
                if (failed) {
                    fail(deferred, testName, currentTestNumber, raceFailedReason);
                } else {
                    pass(deferred, testName, currentTestNumber);
                }
            }

            function makeGroupByDoneFn(ii) {
                var groupByTableName = groupByTableNameTemplate + ii;
                function groupByDoneFnInt(groupByOutput) {
                    var aggStr = "sum(" + keyName3 + ")";
                    xcalarAggregate(thriftHandle, groupByTableName,
                                    groupByTableName + "-aggr",
                                    aggStr)
                    .done(function(aggregateOutput) {
                        console.log("aggStr: " + aggStr + ", tableName: \"" +
                                    groupByTableName + "\", output: " + aggregateOutput);
                        var answer = JSON.parse(aggregateOutput);
                        if (answer.Value != expectedAggOutput["sum"]) {
                            failed = true;
                            raceFailedReason += "Returned answer: " + answer.Value +
                                                " Expected answer: " + expectedAggOutput["sum"];
                        }
                    })
                    .fail(function(reason) {
                        failed = true;
                        raceFailedReason += "Aggregate failed. Server returned: " + StatusTStr[reason];
                    })
                    .always(function() {
                        totalCompleted++;
                        if (totalCompleted == numIndexes) {
                            doneVerification();
                        }
                    });
                }
                return (groupByDoneFnInt);
            }

            if (failed) {
                fail(deferred, testName, currentTestNumber, raceFailedReason);
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
                        raceFailedReason = "Group by failed. Server returned: " + StatusTStr[reason];
                        totalCompleted++;
                        if (totalCompleted == numIndexes) {
                            doneVerification();
                        }
                    })
                }
            }
        }

        function aggDoneFn(aggOutput, aggOp) {
            if (aggOutput !== null) {
                console.log("Aggregate on \"" + startTableName + "\" done. " + aggEvalStr[aggOp] + " = " + aggOutput);
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
                xcalarAggregate(thriftHandle, startTableName, aggTableName[aggOp], aggEvalStr[aggOp])
                .done((function(key) {
                    return (function(aggOutput) { aggDoneFn(aggOutput, key); });
                })(aggOp))
                .fail((function(key) {
                    function anonymousFn(reason) {
                        raceFailedReason += "Failed to aggregate. Server returned: " +
                                             StatusTStr[reason];
                        failed = true;
                        aggDoneFn(null, key);
                    }
                    return (anonymousFn);
                })(aggOp));

                var dstTableName = dstTableNameTemplate + numIndexes;

                xcalarIndexTable(thriftHandle, startTableName, keyName, dstTableName,
                                 "", XcalarOrderingT.XcalarOrderingUnordered)
                .done((function(idx) {
                    return (function(indexOutput) { indexDoneFn(indexOutput, idx); });
                })(numIndexes))
                .fail(function(reason) {
                    raceFailedReason += "Failed to index. Server returned: " + StatusTStr[reason];
                    failed = true;
                    indexDoneFn(null);
                });

                numIndexes++;

            }
        }

        function joinDoneFn() {
            xcalarIndexTable(thriftHandle, tmpTableName3, keyName2, tmpTableName4,
                             "", XcalarOrderingT.XcalarOrderingUnordered)
            .done(function(indexOutput) {
                xcalarApiMap(thriftHandle, keyName, "int(" + keyName2 + ")",
                             tmpTableName3, startTableName)
                .done(startRace)
                .fail(function(reason) {
                    var reason = "Failed to cast. Server returned: " + StatusTStr[reason];
                    fail(deferred, testName, currentTestNumber, reason);
                });
            })
            .fail(function(reason) {
                var reason = "Index failed. Server returned: " + StatusTStr[reason];
                fail(deferred, testName, currentTestNumber, reason);
            });
        }

        function loadDoneFn() {
            xcalarIndexDataset(thriftHandle, datasetName, "Dest", tmpTableName1,
                               "", XcalarOrderingT.XcalarOrderingUnordered)
            .done(function(indexOutput) {
                xcalarIndexDataset(thriftHandle, datasetName2, "iata", tmpTableName2,
                                   "", XcalarOrderingT.XcalarOrderingUnordered)
                .done(function(indexOutput) {
                    // For some reason, the join is required to reproduce the bug
                    xcalarJoin(thriftHandle, tmpTableName1, tmpTableName2,
                               tmpTableName3, JoinOperatorT.InnerJoin)
                    .done(function(result) {
                        joinDoneFn();
                    })
                    .fail(function(reason) {
                        var reason = "Failed to join. Server returned: " + StatusTStr[reason];
                        fail(deferred, testName, currentTestNumber, reason);
                    });
                })
                .fail(function(reason) {
                    var reason = "Failed to index. Server returned: " + StatusTStr[reason];
                    fail(deferred, testName, currentTestNumber, reason);
                });
            })
            .fail(function(reason) {
                var reason = "Failed to index. Server returned: " + StatusTStr[reason];
                fail(deferred, testName, currentTestNumber, reason);
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
            xcalarLoad(thriftHandle, "file://" + pathToAirportDataset, datasetName2,
                       DfFormatTypeT.DfFormatCsv, 0, loadArgs)
            .done(function(loadOutput) {
                datasetName2 = loadOutput.dataset.name;
                loadDoneFn();
            })
            .fail(function(reason) {
                reason = "Failed to load. Server returned: " + StatusTStr[reason];
                fail(deferred, testName, currentTestNumber, reason);
            });
        })
        .fail(function(reason) {
            reason = "Failed to load. Server returned: " + StatusTStr[reason];
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testGetStats(deferred, testName, currentTestNumber) {
        xcalarGetStats(thriftHandle, 0)
        .done(function(statOutput) {
            printResult(statOutput);

            for (var i = 0, stat = null; i < statOutput.numStats; i ++) {
                stat = statOutput.stats[i];

                console.log("\tstat[" + i.toString() + "].threadName = " +
                        stat.threadName);
                console.log("\tstat[" + i.toString() + "].statName = " + stat.statName);
                console.log("\tstat[" + i.toString() + "].statValue = " +
                        stat.statValue.toString());
                console.log("\tstat[" + i.toString() + "].statType = " +
                        stat.statType.toString());
                console.log("\tstat[" + i.toString() + "].statLife = " +
                        stat.statLife.toString());
                console.log("\tstat[" + i.toString() + "].groupId = " +
                        stat.groupId.toString());
            }
            if (statOutput.numStats > 0) {
                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "No stats returned";
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testGetStatGroupIdMap(deferred, testName, currentTestNumber) {
        xcalarGetStatGroupIdMap(thriftHandle, 0, 5)
        .done(function(groupMapOutput) {
            printResult(groupMapOutput);

            if (groupMapOutput.numGroupNames !== 0) {
                console.log("\tnumGroupNames: " +
                        groupMapOutput.numGroupNames.toString());

                for (var i = 0; i < groupMapOutput.numGroupNames; i ++) {
                    console.log("\tgroupName[" + i.toString() + "] = " +
                        groupMapOutput.groupName[i]);
                }

                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "numGroupNames == 0";
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testGetStatsByGroupId(deferred, testName, currentTestNumber) {
        xcalarGetStatsByGroupId(thriftHandle, 0, [1])
        .done(function(statOutput) {
            printResult(statOutput);

            for (var i = 0, stat = null; i < statOutput.numStats; i ++) {
                stat = statOutput.stats[i];

                console.log("\tstat[" + i.toString() + "].threadName = " +
                        stat.threadName);
                console.log("\tstat[" + i.toString() + "].statName = " + stat.statName);
                console.log("\tstat[" + i.toString() + "].statValue = " +
                        stat.statValue.toString());
                console.log("\tstat[" + i.toString() + "].statType = " +
                        stat.statType.toString());
                console.log("\tstat[" + i.toString() + "].statLife = " +
                        stat.statLife.toString());
                console.log("\tstat[" + i.toString() + "].groupId = " +
                        stat.groupId.toString());
            }
            if (statOutput.numStats > 0) {
                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "No stats returned";
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testResetStats(deferred, testName, currentTestNumber) {
        xcalarResetStats(thriftHandle, 0)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testMakeResultSetFromDataset(deferred, testName, currentTestNumber) {
        xcalarMakeResultSetFromDataset(thriftHandle,
                                       loadOutput.dataset.name)
        .done(function(result) {
            printResult(result);
            makeResultSetOutput1 = result;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testMakeResultSetFromTable(deferred, testName, currentTestNumber) {
        xcalarMakeResultSetFromTable(thriftHandle,
                                     origTable)
        .done(function(result) {
            printResult(result);
            makeResultSetOutput2 = result;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testMakeResultSetFromAggregate(deferred, testName, currentTestNumber) {
        xcalarMakeResultSetFromTable(thriftHandle, aggrTable)
        .done(function(result) {
            printResult(result);
            makeResultSetOutput3 = result;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testResultSetNextDataset(deferred, testName, currentTestNumber) {
            xcalarResultSetNext(thriftHandle,
                                makeResultSetOutput1.resultSetId, 5)
            .done(function(resultNextOutput1) {
                printResult(resultNextOutput1);

                for (var i = 0, kvPair = null; i < resultNextOutput1.numEntries; i ++) {
                    kvPair = resultNextOutput1.entries[i];

                    console.log("\trecord[" + i.toString() + "].key = " +
                                kvPair.key);
                    console.log("\trecord[" + i.toString() + "].value = " +
                                kvPair.value);
                }
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            })
    }

    function testResultSetAbsolute(deferred, testName, currentTestNumber) {
            xcalarResultSetAbsolute(thriftHandle,
                                    makeResultSetOutput2.resultSetId, 1000)
            .done(function(status) {
                printResult(status);
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            })
    }

    function testResultSetAbsoluteBogus(deferred, testName, currentTestNumber) {
            xcalarResultSetAbsolute(thriftHandle,
                                    makeResultSetOutput2.resultSetId,
                                    281474976710655)
            .done(function(status) {
                fail(deferred, testName, currentTestNumber, reason);
            })
            .fail(function(reason) {
                pass(deferred, testName, currentTestNumber);
            })
    }

    function testResultSetNextTable(deferred, testName, currentTestNumber) {
            xcalarResultSetNext(thriftHandle,
                                makeResultSetOutput2.resultSetId, 5)
            .done(function(resultNextOutput2) {
                printResult(resultNextOutput2);

                for (var i = 0, kvPair = null; i < resultNextOutput2.numEntries; i ++) {
                    kvPair = resultNextOutput2.entries[i];
                    console.log("\trecord[" + i.toString() + "].key = " +
                                kvPair.key);
                    console.log("\trecord[" + i.toString() + "].value = " +
                                kvPair.value);
                }
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            })
    }

    function testResultSetNextAggregate(deferred, testName, currentTestNumber) {
            xcalarResultSetNext(thriftHandle,
                                makeResultSetOutput3.resultSetId, 5)
            .done(function(resultNextOutput3) {
                printResult(resultNextOutput3);

                for (var i = 0, kvPair = null; i < resultNextOutput3.numEntries; i ++) {
                    kvPair = resultNextOutput3.entries[i];
                    console.log("\trecord[" + i.toString() + "].key = " +
                                kvPair.key);
                    console.log("\trecord[" + i.toString() + "].value = " +
                                kvPair.value);
                }
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            })
    }

    function testFreeResultSetAggregate(deferred, testName, currentTestNumber) {
        xcalarFreeResultSet(thriftHandle, makeResultSetOutput3.resultSetId)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testFreeResultSetDataset(deferred, testName, currentTestNumber) {
        xcalarFreeResultSet(thriftHandle, makeResultSetOutput1.resultSetId)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testFreeResultSetTable(deferred, testName, currentTestNumber) {
        xcalarFreeResultSet(thriftHandle, makeResultSetOutput2.resultSetId)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testFilter(deferred, testName, currentTestNumber) {
        xcalarFilter(thriftHandle, "gt(votes.funny, 900)", origTable,
                     "yelp/user-votes.funny-gt900")
        .done(function(filterOutput) {
            printResult(filterOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testJoin(deferred, testName, currentTestNumber) {
        xcalarJoin(thriftHandle, "yelp/user-votes.funny-gt900",
                   "yelp/user-votes.funny-gt900",
                   "yelp/user-dummyjoin",
                   JoinOperatorT.InnerJoin)
        .done(function(result) {
            printResult(result);
            newTableOutput = result;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testQuery(deferred, testName, currentTestNumber) {
        var query = "index --key votes.funny --dataset " + datasetPrefix +
                    "yelp" + " --dsttable yelp-votesFunnyTable; index --key review_count" +
                    " --srctable yelp-votesFunnyTable --dsttable yelp-review_countTable;" +
                    "  map --eval \"add(1,2)\"  --srctable yelp-votesFunnyTable" +
                    " --fieldName newField --dsttable yelp-mapTable;" +
                    " filter yelp-mapTable \" sub(2,1)\" yelp-filterTable;" +
                    " groupBy --srctable yelp-filterTable --eval \"avg(votes.cool)\" --fieldName avgCool --dsttable yelp-groupByTable;" +
                    " join --leftTable yelp-review_countTable --rightTable" +
                    "  yelp-groupByTable --joinTable " + queryTableName;

        queryName = "testQuery";

        xcalarQuery(thriftHandle, queryName, query, false, "", false)
        .done(function(queryOutput) {
            printResult(queryOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }
    function testGetDagOnAggr(deferred, testName, currentTestNumber) {
        var query = "index --key recordNum --dataset " + origDataset +
                    " --dsttable yelpUsers#js0;" +
                    "aggregate --srctable yelpUsers#js0 --dsttable " +
                    "yelpUsers-aggregate#js1 --eval \"count(review_count)\""

        var locaQueryName = "aggr query";

        console.log("submit query" + query);
        xcalarQuery(thriftHandle, locaQueryName, query, false, "", true)
        .done(function(queryOutput) {
            printResult(queryOutput);

            (function wait() {
            setTimeout(function() {
                xcalarQueryState(thriftHandle, locaQueryName)
                .done(function(result) {
                    var qrStateOutput = result;
                    if (qrStateOutput.queryState === QueryStateT.qrProcssing) {
                        return wait();
                    }

                    if (qrStateOutput.queryState === QueryStateT.qrFinished) {
                    console.log("call get dag on aggr");
                    xcalarDag(thriftHandle,  "yelpUsers-aggregate#js1")
                    .done(function(dagOutput) {
                        console.log("dagOutput.numNodes = " + dagOutput.numNodes);
                        if (dagOutput.numNodes != 3) {
                            var reason = "the number of dag node returned is incorrect";
                            fail(deferred, testName, currentTestNumber, reason);
                        } else {
                            pass(deferred, testName, currentTestNumber);
                        }
                    })
                    .fail(function(reason) {
                        fail(deferred, testName, currentTestNumber, reason);
                    });

                    } else {
                        var reason = "qrStateOutput.queryState = " +
                                    QueryStateTStr[qrStateOutput.queryState];
                        fail(deferred, testName, currentTestNumber, reason);
                    }
                 })
                 .fail(function(reason) {
                     fail(deferred, testName, currentTestNumber, reason);
                 });
             }, 1000);
         })();

        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testQueryState(deferred, testName, currentTestNumber) {
        xcalarQueryState(thriftHandle, queryName)
        .done(function(queryStateOutput) {
            printResult(queryStateOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function waitForDag(deferred, testName, currentTestNumber) {
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
                        pass(deferred, testName, currentTestNumber);
                    } else {
                        var reason = "queryStateOutput.queryState = " +
                                    QueryStateTStr[queryStateOutput.queryState];
                        fail(deferred, testName, currentTestNumber, reason);
                    }
                 })
                 .fail(function(reason) {
                     fail(deferred, testName, currentTestNumber, reason);
                 });
             }, 1000);
         })();
    }

    function testDag(deferred, testName, currentTestNumber) {
        xcalarDag(thriftHandle,  queryTableName)
        .done(function(dagOutput) {
            console.log("dagOutput.numNodes = " + dagOutput.numNodes);
            if (dagOutput.numNodes != 9) {
                var reason = "the number of dag node returned is incorrect";
                fail(deferred, testName, currentTestNumber, reason);
            } else {
                pass(deferred, testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testGroupBy(deferred, testName, currentTestNumber) {
        xcalarGroupBy(thriftHandle, "yelp/user-votes.funny-gt900",
                      "yelp/user-votes.funny-gt900-average",
                      "avg(votes.funny)", "averageVotesFunny", true)
        .done(function(groupByOutput) {
            printResult(groupByOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testAggregate(deferred, testName, currentTestNumber) {
        aggrTable = "aggrTable";
        xcalarAggregate(thriftHandle, origStrTable, aggrTable, "sum(fans)")
        .done(function(aggregateOutput) {
            console.log("jsonAnswer: " + aggregateOutput + "\n");
            var jsonAnswer = JSON.parse(aggregateOutput);
            if (jsonAnswer.Value !== 114674) {
                var reason = "jsonAnswer !== 114674";
                fail(deferred, testName, currentTestNumber, reason);
            } else {
                pass(deferred, testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testApiMap(deferred, testName, currentTestNumber) {
        xcalarApiMap(thriftHandle, "votesFunnyPlusUseful",
                     "add(votes.funny, votes.useful)",
                     "yelp/user-votes.funny-gt900",
                     "yelp/user-votes.funny-map")
        .done(function(mapOutput) {
            printResult(mapOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testDestroyDatasetInUse(deferred, testName, currentTestNumber) {
        xcalarDeleteDagNodes(thriftHandle, loadOutput.dataset.name, SourceTypeT.SrcDataset)
        .done(function(status) {
            var reason = "Destroyed dataset in use succeeded when it should have failed"
            fail(deferred, testName, currentTestNumber, reason);
        })
        .fail(function(status) {
            if (status === StatusT.StatusDgNodeInUse) {
                pass(deferred, testName, currentTestNumber);
            } else {
                fail(deferred, testName, currentTestNumber, StatusTStr[status]);
            }
        })
    }

    function testAddExportTarget(deferred, testName, currentTestNumber) {
        var target = new DsExportTargetT();
        target.hdr = new DsExportTargetHdrT();
        target.hdr.name = "Mgmtd Export Target";
        target.hdr.type = DsTargetTypeT.DsTargetSFType;
        target.specificInput = new DsAddTargetSpecificInputT();
        target.specificInput.odbcInput = new DsAddTargetODBCInputT();

        xcalarAddExportTarget(thriftHandle, target)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, "fail reason" + reason);
        })
    }

    function testListExportTargets(deferred, testName, currentTestNumber) {
        xcalarListExportTargets(thriftHandle, "*", "*")
        .done(function(listTargetsOutput) {
            printResult(listTargetsOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testExport(deferred, testName, currentTestNumber) {
        var specInput = new DsInitExportSpecificInputT();
        specInput.sfInput = new DsInitExportSFInputT();
        specInput.sfInput.fileName = "yelp-mgmtdTest" +
                                     Math.floor(Math.random()*10000) + ".csv";
        specInput.sfInput.format = DfFormatTypeT.DfFormatCsv;
        specInput.sfInput.formatArgs = new DsInitExportFormatSpecificArgsT();
        specInput.sfInput.formatArgs.csv = new DsInitExportCSVArgsT();
        specInput.sfInput.formatArgs.csv.fieldDelim = ",";
        specInput.sfInput.formatArgs.csv.recordDelim = "\n";

        console.log("\texport file name = " + specInput.sfInput.fileName);
        var target = new DsExportTargetHdrT();
        target.type = DsTargetTypeT.DsTargetSFType;
        target.name = "Default";
        var numColumns = 2;
        var columns = ["user_id", "name"];

        xcalarExport(thriftHandle, "yelp/user-votes.funny-gt900",
                     target, specInput,
                     DsExportCreateRuleT.DsExportCreateOnly,
                     numColumns, columns)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testMakeRetina(deferred, testName, currentTestNumber) {
        retinaName = "yelpRetina-1";
        var dstTable = new XcalarApiRetinaDstT();
        dstTable.numColumns = 3;
        dstTable.columnNames = ["user_id", "name", "votes.funny"];
        dstTable.target = new XcalarApiNamedInputT();
        dstTable.target.name = "yelp/user-votes.funny-gt900-average";
        dstTable.target.isTable = true;
        xcalarMakeRetina(thriftHandle, retinaName, [dstTable])
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            var reason = "makeRetina failed with status: " + StatusTStr[reason];
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testListRetinas(deferred, testName, currentTestNumber) {
        xcalarListRetinas(thriftHandle)
        .done(function(listRetinasOutput) {
            var foundRetina = false;
            printResult(listRetinasOutput);
            for (var i = 0; i < listRetinasOutput.numRetinas; i ++) {
                if (listRetinasOutput.retinaDescs[i].retinaName == retinaName) {
                    foundRetina = true;
                }
                console.log("\tretinaDescs[" + i + "].retinaName = " +
                            listRetinasOutput.retinaDescs[i].retinaName);
            }

            if (foundRetina) {
                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "Could not find retina \"" + retinaName + "\""
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testGetRetina(deferred, testName, currentTestNumber) {
        xcalarGetRetina(thriftHandle, retinaName)
        .done(function(getRetinaOutput) {
            printResult(getRetinaOutput);

            console.log("\tretinaName: " + getRetinaOutput.retina.retinaDesc.retinaName);
            console.log("\tnumNodes: " + getRetinaOutput.retina.retinaDag.numNodes);

            for (var ii = 0; ii < getRetinaOutput.retina.retinaDag.numNodes; ii ++) {
                console.log("\tnode[" + ii + "].dagNodeId = " +
                            getRetinaOutput.retina.retinaDag.node[ii].dagNodeId);
                console.log("\tnode[" + ii + "].api = " +
                            XcalarApisTStr[getRetinaOutput.retina.retinaDag.node[ii].api]);
                console.log("\tnode[" + ii + "].apiInputSize = " +
                            getRetinaOutput.retina.retinaDag.node[ii].inputSize);
                switch (getRetinaOutput.retina.retinaDag.node[ii].api) {
                case XcalarApisT.XcalarApiExport:
                    var exportInput = getRetinaOutput.retina.retinaDag.node[ii].input.exportInput;
                    var exportTargetType = exportInput.meta.target.type;
                    console.log("\tnode[" + ii + "].meta.exportTarget = " + 
                                DsTargetTypeTStr[exportTargetType] + " (" + exportTargetType + ")");
                    console.log("\tnode[" + ii + "].meta.numColumns = " +
                                exportInput.meta.numColumns);
                    console.log("\tnode[" + ii + "].meta.columnNames = " +
                                exportInput.meta.columnNames);
                    switch (exportTargetType) {
                    case DsTargetTypeT.DsTargetODBCType:
                        console.log("\tnode[" + ii + "].meta.specificInput.odbcInput.tableName = " +
                                    exportInput.meta.specificInput.odbcInput.tableName);
                        break;
                    case DsTargetTypeT.DsTargetSFType:
                        console.log("\tnode[" + ii + "].meta.specificInput.sfInput.fileName = " +
                                    exportInput.meta.specificInput.sfInput.fileName);
                        break;
                    default:
                    break;
                    }
                    break;
                case XcalarApisT.XcalarApiFilter:
                    console.log("\tnode[" + ii + "].filterStr = " +
                                getRetinaOutput.retina.retinaDag.node[ii].input.filterInput.filterStr);
                    retinaFilterDagNodeId = getRetinaOutput.retina.retinaDag.node[ii].dagNodeId;
                    retinaFilterParamType = getRetinaOutput.retina.retinaDag.node[ii].api;
                    break;
                case XcalarApisT.XcalarApiBulkLoad:
                    console.log("\tnode[" + ii + "].datasetUrl = " +
                                getRetinaOutput.retina.retinaDag.node[ii].input.loadInput.dataset.url);
                    break;
                default:
                    break;
                }
            }

            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testUpdateRetina(deferred, testName, currentTestNumber) {
        paramInput = new XcalarApiParamInputT();
        paramInput.paramFilter = new XcalarApiParamFilterT();
        paramInput.paramFilter.filterStr = "gt(votes.funny, <foo>)";
        xcalarUpdateRetina(thriftHandle, retinaName,
                           retinaFilterDagNodeId,
                           retinaFilterParamType,
                           paramInput)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testExecuteRetina(deferred, testName, currentTestNumber) {
        var parameters = [];
        parameters.push(new XcalarApiParameterT({ parameterName: "foo", parameterValue: "1000" }));

        xcalarExecuteRetina(thriftHandle, retinaName, retinaDstTable,
                            retinaExportFile, parameters)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testListParametersInRetina(deferred, testName, currentTestNumber) {
        xcalarListParametersInRetina(thriftHandle, retinaName)
        .done(function(listParametersInRetinaOutput) {
            printResult(listParametersInRetinaOutput);

            console.log("\tnumParameters: " + listParametersInRetinaOutput.numParameters);
            for (var i = 0; i < listParametersInRetinaOutput.numParameters; i ++) {
                console.log("\tparameters[" + i + "].parameterName = " +
                            listParametersInRetinaOutput.parameters[i].parameterName);
                console.log("\tparameters[" + i + "].parameterValue = " +
                            listParametersInRetinaOutput.parameters[i].parameterValue);
            }

            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testDeleteRetina(deferred, testName, currentTestNumber) {
        xcalarApiDeleteRetina(thriftHandle, retinaName)
        .done(function(status) {
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testListFiles(deferred, testName, currentTestNumber) {
        xcalarListFiles(thriftHandle, "file:///")
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

            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    // Witness to bug 2020
    function testApiMapStringToString(deferred, testName, currentTestNumber) {
        var evalString = "string(user_id)"

        xcalarApiMap(thriftHandle, "castUserId", evalString, origTable,
                     "user_id2")
        .done(function(filterOutput) {
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    // Witness to bug 238
    function testApiMapLongEvalString(deferred, testName, currentTestNumber) {
        var evalString = "add(votes.funny, 1)"
        while (evalString.length <= XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            evalString = "add(1, " + evalString + ")";
        }

        xcalarApiMap(thriftHandle, "DoesNotExist", evalString, origTable,
                     "ShouldNotExist")
        .done(function(filterOutput) {
            returnValue = 1;
            var reason = "Map succeeded with long eval string when it should have failed";
            fail(deferred, testName, currentTestNumber, reason);
        })
        .fail(function(reason) {
            if (reason === StatusT.StatusEvalStringTooLong) {
                pass(deferred, testName, currentTestNumber);
            } else {
                fail(deferred, testName, currentTestNumber, reason);
            }
        });
    }

    function testApiFilterLongEvalString(deferred, testName, currentTestNumber) {
        var evalString = "add(votes.funny, 1)"
        while (evalString.length <= XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            evalString = "add(1, " + evalString + ")";
        }

        xcalarFilter(thriftHandle, evalString, origTable, "filterLongEvalStr")
        .done(function(filterOutput) {
            returnValue = 1;
            var reason = "Map succeeded with long eval string when it should have failed";
            fail(deferred, testName, currentTestNumber, reason);
        })
        .fail(function(reason) {
            if (reason === StatusT.StatusEvalStringTooLong) {
                pass(deferred, testName, currentTestNumber);
            } else {
                fail(deferred, testName, currentTestNumber, reason);
            }
        });
    }

    function testApiKeyAddOrReplace(deferred, testName, currentTestNumber, keyName, keyValue) {
        xcalarKeyAddOrReplace(thriftHandle,
                              XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                              keyName, keyValue, true)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });

    }

    function testApiKeyInvalidScope(deferred, testName, currentTestNumber) {
        // XXX Remove once XcalarApiKeyScopeUser is implemented.
        xcalarKeyAddOrReplace(thriftHandle,
                              XcalarApiKeyScopeT.XcalarApiKeyScopeUser,
                              "foo", "foobar", false)
        .done(function(status) {
            fail(deferred, testName, currentTestNumber,
                 "Expected failure with scope XcalarApiKeyScopeUser.");
        })
        .fail(function(reason) {
            if (reason != StatusT.StatusUnimpl) {
                fail(deferred, testName, currentTestNumber, reason);
            }
            xcalarKeyAddOrReplace(thriftHandle, 666, "foo", "foobar", false)
            .done(function(status) {
                fail(deferred, testName, currentTestNumber,
                     "Expected failure given invalid scope.");
            })
            .fail(function(reason) {
                if (reason == StatusT.StatusInval) {
                    pass(deferred, testName, currentTestNumber);
                } else {
                    fail(deferred, testName, currentTestNumber, reason);
                }
            });
        });
    }

    function testApiKeyAdd(deferred, testName, currentTestNumber) {
        testApiKeyAddOrReplace(deferred, testName, currentTestNumber, "mykey", "myvalue1");
    }

    function testApiKeyReplace(deferred, testName, currentTestNumber) {
        testApiKeyAddOrReplace(deferred, testName, currentTestNumber, "mykey", "myvalue2");
    }

    function testSchedTask(deferred, testName, currentTestNumber) {
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
                    var reason = "wrong number of task. got \"" + listSchedTaskOutput.numSchedTask + "\" instead of \"1\"";
                    fail(deferred, testName, currentTestNumber, reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].name != "sched task") {
                    var reason = "wrong name of task. got \"" + listSchedTaskOutput.schedTaskInfo[0].name + "\" instead of \"sched task\"";
                    fail(deferred, testName, currentTestNumber, reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].numFailure != 0) {
                    var reason = "wrong numFailure of task. got \"" + listSchedTaskOutput.schedTaskInfo[0].numFailure + "\" instead of \"0\"";
                    fail(deferred, testName, currentTestNumber, reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].scheduleInfo.schedTimeInSecond != 1000) {
                    var reason = "wrong schedule time of task. got \"" + listSchedTaskOutput.schedTaskInfo[0].scheduleInfo.schedTimeInSecond + "\" instead of \"1000\"";
                    fail(deferred, testName, currentTestNumber, reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].type != SchedTaskTypeT.StQuery) {
                    var reason = "wrong task type. got \"" + listSchedTaskOutput.schedTaskInfo[0].type + "\" instead of " + SchedTaskTypeT.StQuery;
                    fail(deferred, testName, currentTestNumber, reason);
                } else if (listSchedTaskOutput.schedTaskInfo[0].arg.executeRetinaInput.retinaName != dummyArg.executeRetinaInput.retinaName) {
                    var reason = "wrong retina name got \"" + listSchedTaskOutput.schedTaskInfo[0].arg.executeRetinaInput.retinaName + "\" instead of " + dummyArg.executeRetinaInput.retinaName;
                    fail(deferred, testName, currentTestNumber, reason);
                }

                xcalarDeleteSchedTask(thriftHandle, "sched task")
                .done(function(status) {
                  printResult(status);
                  pass(deferred, testName, currentTestNumber);
                })
                .fail(function(reason) {
                    fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
                });
           })
           .fail(function(reason) {
               fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
           });
        }, function(reason) {
            fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
        }
        );
    }

    function testApiKeyAppend(deferred, testName, currentTestNumber) {
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
                fail(deferred, testName, currentTestNumber, reason);
            } else {
                pass(deferred, testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testApiKeySetIfEqual(deferred, testName, currentTestNumber) {
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
                var reason = "Expected failure due to incorrect oldValue."
                fail(deferred, testName, currentTestNumber, reason);
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
                        fail(deferred, testName, currentTestNumber,
                             "Wrong value. Got '" + lookupOutput.value +
                             "'. Expected 'c'.");
                    } else {
                        return xcalarKeyLookup(thriftHandle,
                                     XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                                     "x");
                    }
                })
                .then(function(lookupOutput) {
                    if (lookupOutput.value != "y") {
                        fail(deferred, testName, currentTestNumber,
                             "Wrong value. Got '" + lookupOutput.value +
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
                                    fail(deferred, testName, currentTestNumber,
                                         "Wrong value. Got '" +
                                         lookupOutput.value +
                                         "'. Expected 'z'.");
                                } else {
                                    pass(deferred, testName, currentTestNumber);
                                }
                            })
                            .fail(function(reason) {
                                fail(deferred, testName, currentTestNumber,
                                     reason);
                            });
                        })
                        .fail(function(reason) {
                            fail(deferred, testName, currentTestNumber, reason);
                        });
                    }
                })
                .fail(function(reason) {
                    fail(deferred, testName, currentTestNumber, reason);
                });
            });
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testApiKeyLookup(deferred, testName, currentTestNumber) {
        xcalarKeyLookup(thriftHandle,
                        XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                        "mykey")
        .done(function(lookupOutput) {
            printResult(lookupOutput);
            if (lookupOutput.value != "myvalue2") {
                var reason = "wrong value. got \"" + lookupOutput.value + "\" instead of \"myvalue2\"";
                fail(deferred, testName, currentTestNumber, reason);
            } else {
                pass(deferred, testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testApiKeyDelete(deferred, testName, currentTestNumber) {
        xcalarKeyDelete(thriftHandle,
                        XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal, "mykey")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testApiKeyBogusLookup(deferred, testName, currentTestNumber) {
        xcalarKeyLookup(thriftHandle,
                        XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
                        "mykey")
        .done(function(lookupOutput) {
            printResult(lookupOutput);
            var reason = "lookup did not fail";
            fail(deferred, testName, currentTestNumber, reason);
        })
        .fail(function(reason) {
            pass(deferred, testName, currentTestNumber);
        });
    }

    function testApiKeySessions(deferred, testName, currentTestNumber) {
        var session1 = "mgmtdTestApiKeySessions1" + (new Date().getTime());
        var session2 = "mgmtdTestApiKeySessions2" + (new Date().getTime());

        var keyName = "sessionKey";

        xcalarApiSessionDelete(thriftHandle, "*")
        .then(function() {
            // Start in brand new sesion...
            return xcalarApiSessionNew(thriftHandle, session1, false, "");
        })
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
                fail(deferred, testName, currentTestNumber,
                     "Failed lookup. Expected x got " + lookupOutput.value);
            }
        })
        .then(function() {
            return xcalarApiSessionSwitch(thriftHandle, session2, session1);
        })
        .then (function() {
            // Make sure the key we created in the other session doesn't turn up
            // in this one.
            xcalarKeyLookup(thriftHandle,
                            XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
                            keyName)
            .then(function() {
                fail(deferred, testName, currentTestNumber,
                     "Lookup in session2 should have failed.");
            })
            .fail(function(reason) {
                pass(deferred, testName, currentTestNumber);
            });
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
        });
    }

    function testTop(deferred, testName, currentTestNumber) {
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
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testMemory(deferred, testName, currentTestNumber) {
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
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testListXdfs(deferred, testName, currentTestNumber) {
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
             pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testCreateDht(deferred, testName, currentTestNumber) {
        var dhtName = "mgmtTestCustomDht"

        function deleteTableSuccessFn(status) {
            xcalarApiDeleteDht(thriftHandle, dhtName)
            .done(function (status) {
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(status) {
                var reason = "deleteDht returned status: " + StatusTStr[status]
                fail(deferred, testName, currentTestNumber, reason);
            });
        }

        function indexDatasetSuccessFn(indexOutput) {
            xcalarGetTableCount(thriftHandle, indexOutput.tableName)
            .done(function(countOutput) {
                var totalCount = 0;
                for (var ii = 0; ii < countOutput.numCounts; ii++) {
                    console.log("Node " + ii + " - " + countOutput.counts[ii]);
                    if (countOutput.counts[ii] == 0) {
                        var reason = "Node " + ii + " has 0 entries"
                        fail(deferred, testName, currentTestNumber, reason);
                    }
                    totalCount += countOutput.counts[ii];
                }

                if (totalCount === 70817) {
                    xcalarDeleteDagNodes(thriftHandle, indexOutput.tableName, SourceTypeT.SrcTable)
                    .done(deleteTableSuccessFn)
                    .fail(function(status) {
                        var reason = "deleteTable returned status: " + StatusTStr[status];
                        fail(deferred, testName, currentTestNumber, reason);
                    });
                } else {
                    var reason = "Total count " + totalCount + " != 70817";
                    fail(deferred, testName, currentTestNumber, reason);
                }
            })
            .fail(function(status) {
                var reason = "getCount returned status: " + StatusTStr[status]
                fail(deferred, testName, currentTestNumber, reason);
            });
        }

        function createDhtSuccessFn(status) {
            xcalarIndexDataset(thriftHandle, yelpUserDataset,
                               "average_stars", "yelp/user-average_stars", dhtName, XcalarOrderingT.XcalarOrderingUnordered)
            .done(indexDatasetSuccessFn)
            .fail(function(status) {
                var reason = "Index dataset returned status: " + StatusTStr[status]
                fail(deferred, testName, currentTestNumber, reason);
            });
        }

        function startCreateDhtTest(status) {
            console.log("deleteDht returned status: " + StatusTStr[status]);
            xcalarApiCreateDht(thriftHandle, dhtName, 5.0, 0.0, XcalarOrderingT.XcalarOrderingUnordered)
            .done(createDhtSuccessFn)
            .fail(function(status) {
                var reason = "createDht returned status: " + StatusTStr[status]
                fail(deferred, testName, currentTestNumber, reason);
            });

        }

        xcalarApiDeleteDht(thriftHandle, dhtName)
        .then(startCreateDhtTest, startCreateDhtTest);
    }

    function testUploadDownloadPython(deferred, testName, currentTestNumber) {
        var pythonCode =
            "def strLength( strVal ):\n  return \"%d\" % len(strVal)\n";
        xcalarApiUploadPython(thriftHandle, "MgmtTest", pythonCode)
        .then(function() {
            return xcalarApiDownloadPython(thriftHandle, "MgmtTest");
        })
        .then(function(downloadPythonOutput) {
            if (downloadPythonOutput.pythonSrc === pythonCode) {
                pass(deferred, testName, currentTestNumber);
            } else {
                fail(deferred, testName, currentTestNumber,
                     "Incorrect python source downloaded: " +
                     downloadPythonOutput.pythonSrc);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testPyExecOnLoad(deferred, testName, currentTestNumber) {
        var fs = require('fs');

        var content = fs.read(system.env['MGMTDTEST_DIR'] + '/PyExecOnLoadTest.py');

        xcalarApiUploadPython(thriftHandle, "PyExecOnLoadTest", content)
        .done(function(uploadPythonOutput) {
            if (status == StatusT.StatusOk) {
                loadArgs = new XcalarApiDfLoadArgsT();
                loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
                loadArgs.pyLoadArgs = new XcalarApiPyLoadArgsT();
                loadArgs.csv.recordDelim = XcalarApiDefaultRecordDelimT;
                loadArgs.csv.fieldDelim = XcalarApiDefaultFieldDelimT;
                loadArgs.csv.isCRLF = false;
                loadArgs.pyLoadArgs.fullyQualifiedFnName = "PyExecOnLoadTest:poorManCsvToJson";

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
                    pass(deferred, testName, currentTestNumber);
                })
                .fail(function(reason) {
                    fail(deferred, testName, currentTestNumber,
                         StatusTStr[reason]);
                });
            } else {
                var reason = "status = " + status;
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testDeleteTable(deferred, testName, currentTestNumber) {
        xcalarDeleteDagNodes(thriftHandle, "yelp/user-votes.funny-map", SourceTypeT.SrcTable)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
        });
    }

/** None of these tests really work yet. It's just stubs for later
    function testSessionNew(deferred, testName, currentTestNumber) {
        xcalarApiSessionNew(thriftHandle, "testSession", false, "")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testSessionDelete(deferred, testName, currentTestNumber) {
        xcalarApiSessionDelete(thriftHandle, "*")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testSessionInact(deferred, testName, currentTestNumber) {
        xcalarApiSessionInact(thriftHandle, "*")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testSessionList(deferred, testName, currentTestNumber) {
        xcalarApiSessionList(thriftHandle, "*")
        .done(function(sessionListOutput) {
            printResult(sessionListOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testSessionRename(deferred, testName, currentTestNumber) {
        xcalarApiSessionRename(thriftHandle, "testSession", "testSession2")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testSessionSwitch(deferred, testName, currentTestNumber) {
        xcalarApiSessionSwitch(thriftHandle, "testSession2", "testSession3")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testSessionPersist(deferred, testName, currentTestNumber) {
        xcalarApiSessionPersist(thriftHandle, "*")
        .done(function(sessionListOutput) {
            printResult(sessionListOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }
*/
    // Witness to bug 103
    function testBulkDeleteTables(deferred, testName, currentTestNumber) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcTable)
        .done(function(deleteTablesOutput) {
            printResult(deleteTablesOutput);

            for (var i = 0, delTableStatus = null; i < deleteTablesOutput.numTables; i ++) {
                delTableStatus = deleteTablesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testBulkDeleteExport(deferred, testName, currentTestNumber) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcExport)
        .done(function(deleteDagNodesOutput) {
            printResult(deleteDagNodesOutput);

            for (var i = 0, delTableStatus = null; i < deleteDagNodesOutput.numTables; i ++) {
                delTableStatus = deleteDagNodesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testBulkDeleteConstants(deferred, testName, currentTestNumber) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcConstant)
        .done(function(deleteDagNodesOutput) {
            printResult(deleteDagNodesOutput);

            for (var i = 0, delTableStatus = null; i < deleteDagNodesOutput.numTables; i ++) {
                delTableStatus = deleteDagNodesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testBulkDeleteDataset(deferred, testName, currentTestNumber) {
        xcalarDeleteDagNodes(thriftHandle, "*", SourceTypeT.SrcDataset)
        .done(function(deleteDagNodesOutput) {
            printResult(deleteDagNodesOutput);

            for (var i = 0, delTableStatus = null; i < deleteDagNodesOutput.numTables; i ++) {
                delTableStatus = deleteDagNodesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testDestroyDataset(deferred, testName, currentTestNumber) {
        if (moviesDatasetSet) {
            xcalarDeleteDagNodes(thriftHandle, moviesDataset, SourceTypeT.SrcDataset)
            .done(function(status) {
                printResult(status);
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, StatusTStr[reason]);
            });
        } else {
            console.log("Skipping test because this test depends on testPyExecOnLoad\n");
            skip(deferred, testName, currentTestNumber);
        }
    }

    // Witness to bug 98
    function testShutdown(deferred, testName, currentTestNumber) {
        xcalarShutdown(thriftHandle)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testSupportSend(deferred, testName, currentTestNumber) {
        xcalarApiSupportSend(thriftHandle)
        .done(function(status) {
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason){
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    passes            = 0;
    fails             = 0;
    skips             = 0;
    returnValue       = 0;
    defaultTimeout    = 256000;
    disableIsPass     = true;

    var fs2 = require('fs');
    var content = fs2.read(system.env['MGMTDTEST_DIR'] + '/test-config.cfg');
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
    retinaDstTable        = "retinaDstTable";
    retinaExportFile      = "retinaDstFile.csv";

    // Format
    // addTestCase(testCases, testFn, testName, timeout, TestCaseEnabled, Witness)
    addTestCase(testCases, testStartNodes, "startNodes", defaultTimeout, startNodesState, "");
    addTestCase(testCases, testGetVersion, "getVersion", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testBulkDestroyDs, "bulk destroy ds", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testSchedTask, "test schedtask", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testLoad, "load", defaultTimeout, TestCaseEnabled, "");

    // Xc-1981
    addTestCase(testCases, testGetDagOnAggr, "get dag on aggregate", defaultTimeout, TestCaseDisabled, "1981");

    addTestCase(testCases, testLoadBogus, "bogus load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListDatasets, "list datasets", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetQueryIndex, "test get query Index", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetQueryLoad, "test get query Load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetIntSync, "index dataset (int) Sync", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetInt, "index dataset (int)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetStr, "index dataset (str)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexTable, "index table (str) Sync", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetBogus, "bogus index dataset", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexTable2, "index table (str) 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexTableBogus, "bogus index table 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetTableRefCount, "table refCount", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testRenameNode, "rename node", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetDatasetCount, "dataset count", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetTableCount, "table count", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListTables, "list tables", defaultTimeout, TestCaseEnabled, "");

    // XXX Re-enable as soon as bug is fixed
    addTestCase(testCases, testGetStats, "get stats", defaultTimeout, TestCaseEnabled, "");

    // XXX Re-enable as soon as bug is fixed
    addTestCase(testCases, testGetStatGroupIdMap, "get stats group id map", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testCases, testGetStatsByGroupId, "get stats group id", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResetStats, "reset stats", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testMakeResultSetFromDataset, "result set (via dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testMakeResultSetFromTable, "result set (via tables)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResultSetNextDataset, "result set next (dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResultSetAbsolute, "result set absolute", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResultSetAbsoluteBogus, "result set absolute bogus", defaultTimeout, TestCaseEnabled, "95");
    addTestCase(testCases, testResultSetNextTable, "result set next (table)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testFreeResultSetDataset, "free result set (dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testFreeResultSetTable, "free result set (table)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testFilter, "filter", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testJoin, "join", defaultTimeout, TestCaseEnabled, "");

    // XXX Re-enable when either the query-DAG bug is fixed or the test is changed to create a session and
    //     have the query run under the current session instead of creating its own.
    addTestCase(testCases, testQuery, "Submit Query", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testQueryState, "Request query state of indexing dataset (int)", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, waitForDag, "waitForDag", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testDag, "dag", defaultTimeout, TestCaseDisabled, "568");
    addTestCase(testCases, testGroupBy, "groupBy", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testAggregate, "Aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testMakeResultSetFromAggregate, "result set of aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResultSetNextAggregate, "result set next of aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testFreeResultSetAggregate, "result set free of aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiMap, "map", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testApiMap, "map", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testDestroyDatasetInUse, "destroy dataset in use", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testAddExportTarget, "add export target", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListExportTargets, "list export targets", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testExport, "export", defaultTimeout, TestCaseEnabled, "");

    // Together, these set of test cases make up the retina sanity
    addTestCase(testCases, testMakeRetina, "makeRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListRetinas, "listRetinas", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetRetina, "getRetina - iter 1 / 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testUpdateRetina, "updateRetina", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testGetRetina, "getRetina - iter 2 / 2", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testExecuteRetina, "executeRetina", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testListParametersInRetina, "listParametersInRetina", defaultTimeout, TestCaseDisabled, "");
    addTestCase(testCases, testDeleteRetina, "deleteRetina", defaultTimeout, TestCaseDisabled, "");

    addTestCase(testCases, testListFiles, "list files", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testUploadDownloadPython, "upload and download python", defaultTimeout, TestCaseEnabled, "");

    // This pair must go together
    addTestCase(testCases, testPyExecOnLoad, "python during load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testDestroyDataset, "destroy dataset", defaultTimeout, TestCaseEnabled, "");

    // Witness to bug 238
    addTestCase(testCases, testApiMapLongEvalString, "Map long eval string", defaultTimeout, TestCaseEnabled, "238");
    addTestCase(testCases, testApiFilterLongEvalString, "Filter long eval string", defaultTimeout, TestCaseEnabled, "238");

    // Witness to bug 2020
    addTestCase(testCases, testApiMapStringToString, "cast string to string", defaultTimeout, TestCaseEnabled, "2020");

    addTestCase(testCases, testApiKeyAdd, "key add", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyReplace, "key replace", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyLookup, "key lookup", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyDelete, "key delete", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyBogusLookup, "bogus key lookup", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyAppend, "key append", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeySetIfEqual, "key set if equal", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testCases, testTop, "top test", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testMemory, "memory test", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListXdfs, "listXdfs test", defaultTimeout, TestCaseEnabled, "");

    // Witness to bug Xc-2371
    addTestCase(testCases, indexAggregateRaceTest, "index-aggregate race test", defaultTimeout, TestCaseEnabled, "2371")


    // Re-enabled with delete DHT added
    addTestCase(testCases, testCreateDht, "create DHT test", defaultTimeout, TestCaseEnabled, "");

    // XXX re-enable when the query-DAG bug is fixed
    addTestCase(testCases, testDeleteTable, "delete table", defaultTimeout, TestCaseDisabled, "");

    addTestCase(testCases, testBulkDeleteTables, "bulk delete tables", defaultTimeout, TestCaseEnabled, "103");
    addTestCase(testCases, testBulkDeleteExport, "bulk delete export node ", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testBulkDeleteConstants, "bulk delete constant node ", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testBulkDeleteDataset, "bulk delete constant node ", defaultTimeout, TestCaseEnabled, "2314");
    // temporarily disabled due to bug 973
    // temporarily disabled due to bug 973
    addTestCase(testCases, testShutdown, "shutdown", defaultTimeout, TestCaseDisabled, "98");

    addTestCase(testCases, testSupportSend, "support send", defaultTimeout, TestCaseDisabled, "");

    // XXX Currently, this must be last because it ends in a different session.
    // XXX delete session was removed from testApiKeySessions and wasn't moved anywhere else. 
    // Since two new sessions are generated every time this test runs and they are made unique
    // using the date and time, this means they will accumulate.  Something needs to be done to
    // delete them. Disable this test until the sessions created are deleted
    addTestCase(testCases, testApiKeySessions, "key sessions", defaultTimeout, TestCaseDisabled, "");

    runTestSuite(testCases);
}();
