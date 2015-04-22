// Scroll all the way down to add test cases
// Or search for function addTestCase

+function(undefined) {
    "use strict";

    if (!jQuery || typeof jQuery.Deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    // Test related variables
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
    ,   queryId
    ,   origTable
    ,   origStrTable
    ,   queryTableName;

    var makeResultSetOutput1
    ,   makeResultSetOutput2
    ,   newTableOutput;

    // For retina test
    var retinaName
    ,   retinaFilterDagNodeId
    ,   retinaFilterParamType
    ,   retinaDstTable
    ,   retinaExportFile
    ,   paramInput;

    testCases = new Array();

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
        xcalarStartNodes(thriftHandle, 2)
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
        loadArgs.csv.recordDelim = "";
        loadArgs.csv.fieldDelim = "";
	loadArgs.csv.isCRLF = false;

        xcalarLoad(thriftHandle, "file:///var/tmp/yelp/user", "yelp", DfFormatTypeT.DfTypeJson, 0, loadArgs)
        .done(function(result) {
            printResult(result);
            loadOutput = result;
            origDataset = loadOutput.dataset.name;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber);
        });
    }

    function testLoadBogus(deferred, testName, currentTestNumber) {
        xcalarLoad(thriftHandle, "somejunk", "junk", DfFormatTypeT.DfTypeJson, 0, loadArgs)
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

    function testEditColumn(deferred, testName, currentTestNumber) {
        xcalarEditColumn(thriftHandle, loadOutput.dataset.name, "", true,
                         "votes.cool", "votes.cool2", 1)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testIndexDatasetIntSync(deferred, testName, currentTestNumber) {
        xcalarIndexDataset(thriftHandle,
                           loadOutput.dataset.name, "review_count",
                           "yelp/user-review_count")
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
                           "votes.funny", "yelp/user-votes.funny")
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
                           "user_id", "yelp/user-user_id")
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
                         "name", "yelp/user-name")
        .done(function(indexStrOutput) {
            printResult(indexStrOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testIndexDatasetBogus(deferred, testName, currentTestNumber) {
         xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                            "garbage", "yelp/user-garbage")
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
                         "yelping_since", "yelp/user-yelping_since")
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
                         "garbage2", "yelp/user-garbage2")
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

    function testGetCount(deferred, testName, currentTestNumber) {
        xcalarGetCount(thriftHandle, origTable)
        .done(function(countOutput) {
            printResult(countOutput);

            var totalCount = 0;
            for (var i = 0; i < countOutput.numCounts; i ++) {
                totalCount += countOutput.counts[i];
            }

            console.log("\tcount: " + totalCount.toString());

            if (totalCount === 70817) {
                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "wrong count: " + totalCount + " expected: 70817";
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testListTables(deferred, testName, currentTestNumber) {
        xcalarListTables(thriftHandle, "yelp*")
        .done(function(listTablesOutput) {
            printResult(listTablesOutput);

            var foundVotesFunny = false;
            for (var i = 0, table = null; i < listTablesOutput.numTables; i ++) {
                table = listTablesOutput.tables[i];
                console.log("\ttable[" + i.toString() + "].tableName = " + table.tableName);
                console.log("\ttable[" + i.toString() + "].tableId = " +
                    table.tableId.toString());
                if (table.tableName === origTable) {
                    foundVotesFunny = true;
                }
            }
            if (foundVotesFunny) {
                console.log("Found table \"" + origTable + "\"");
                pass(deferred, testName, currentTestNumber);
            } else {
                var reason = "failed to find table \"" + origTable + "\"";
                fail(deferred, testName, currentTestNumber, reason);
            }
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
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

    function testResultSetNextDataset(deferred, testName, currentTestNumber) {
        if (makeResultSetOutput1.status === StatusT.StatusOk) {
            xcalarResultSetNext(thriftHandle,
                                makeResultSetOutput1.resultSetId, 5)
            .done(function(resultNextOutput1) {
                printResult(resultNextOutput1);

                var recordType = resultNextOutput1.kvPairs.recordType;

                for (var i = 0, kvPair = null; i < resultNextOutput1.kvPairs.numRecords; i ++) {
                    kvPair = resultNextOutput1.kvPairs.records[i];

                    if (recordType === GenericTypesRecordTypeT.GenericTypesFixedSize) {
                        console.log("\trecord[" + i.toString() + "].key = " +
                                kvPair.kvPairFixed.key.toString());
                        console.log("\trecord[" + i.toString() + "].value = " +
                                kvPair.kvPairFixed.value.toString());
                    } else {
                        console.log("\trecord[" + i.toString() + "].key = " +
                                kvPair.kvPairVariable.key.toString());
                        console.log("\trecord[" + i.toString() + "].valueSize = " +
                                kvPair.kvPairVariable.valueSize.toString());
                        console.log("\trecord[" + i.toString() + "].value = " +
                                kvPair.kvPairVariable.value);
                    }
                }
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            })
        } else {
            var reason = "No resultSetId";
            fail(deferred, testName, currentTestNumber, reason);
        }
    }

    function testResultSetAbsolute(deferred, testName, currentTestNumber) {
        if (makeResultSetOutput2.status === StatusT.StatusOk) {
            xcalarResultSetAbsolute(thriftHandle,
                                    makeResultSetOutput2.resultSetId, 1000)
            .done(function(status) {
                printResult(status);
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            })
        } else {
            var reason = "No resultSetId";
            fail(deferred, testName, currentTestNumber, reason);
        }
    }

    function testResultSetNextTable(deferred, testName, currentTestNumber) {
        if (makeResultSetOutput2.status === StatusT.StatusOk) {
            xcalarResultSetNext(thriftHandle,
                                makeResultSetOutput2.resultSetId, 5)
            .done(function(resultNextOutput2) {
                printResult(resultNextOutput2);

                var recordType = resultNextOutput2.kvPairs.recordType;

                for (var i = 0, kvPair = null; i < resultNextOutput2.kvPairs.numRecords; i ++) {
                    kvPair = resultNextOutput2.kvPairs.records[i];
                    if (recordType == GenericTypesRecordTypeT.GenericTypesFixedSize) {
                        console.log("\trecord[" + i.toString() + "].key = " +
                                kvPair.kvPairFixed.key.toString());
                        console.log("\trecord[" + i.toString() + "].value = " +
                                kvPair.kvPairFixed.value.toString());
                    } else {
                        console.log("\trecord[" + i.toString() + "].key = " +
                                kvPair.kvPairVariable.key.toString());
                        console.log("\trecord[" + i.toString() + "].valueSize = " +
                                kvPair.kvPairVariable.valueSize.toString());
                        console.log("\trecord[" + i.toString() + "].value = " +
                                kvPair.kvPairVariable.value);
                    }
                }
                pass(deferred, testName, currentTestNumber);
            })
            .fail(function(reason) {
                fail(deferred, testName, currentTestNumber, reason);
            })
        } else {
            var reason = "No resultSetId";
            fail(deferred, testName, currentTestNumber, reason);
        }
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
        var query = "index --key votes.funny --dataset yelp" +
                    " --dsttable yelp-votesFunnyTable; index --key review_count" +
                    " --srctable yelp-votesFunnyTable --dsttable yelp-review_countTable;" +
                    "  map --eval \"add(1,2)\"  --srctable yelp-votesFunnyTable" +
                    " --fieldName newField --dsttable yelp-mapTable;" +
                    " filter yelp-mapTable \" sub(2,1)\" yelp-filterTable;" +
                    " groupBy yelp-filterTable avg votes.cool avgCool yelp-groupByTable;" +
                    " join --leftTable yelp-review_countTable --rightTable" +
                    "  yelp-groupByTable --joinTable " + queryTableName;

        xcalarQuery(thriftHandle, query)
        .done(function(queryOutput) {
            printResult(queryOutput);
            queryId = queryOutput.queryId;
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testQueryState(deferred, testName, currentTestNumber) {
        xcalarQueryState(thriftHandle, queryId)
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
                xcalarQueryState(thriftHandle, queryId)
                .done(function(result) {
                    queryStateOutput = result;
                    if (queryStateOutput.queryState === 1) {
                        return wait();
                    }

                    if (queryStateOutput.queryState === 2) {
                        pass(deferred, testName, currentTestNumber);
                    } else {
                        var reason = "queryStateOutput.queryState = " + queryStateOutput.queryState.toString();
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
            printResult(dagOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testGroupBy(deferred, testName, currentTestNumber) {
        xcalarGroupBy(thriftHandle, "yelp/user-votes.funny-gt900",
                      "yelp/user-votes.funny-gt900-average",
                      AggregateOperatorT.AggrAverage, "votes.funny",
                      "averageVotesFunny")
        .done(function(groupByOutput) {
            printResult(groupByOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testAggregate(deferred, testName, currentTestNumber) {
        xcalarAggregate(thriftHandle, origStrTable,
                        AggregateOperatorT.AggrSumKeys, "fans")
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
        xcalarDestroyDataset(thriftHandle, loadOutput.dataset.name)
        .done(function(status) {
            var reason = "Destroyed dataset in use succeeded when it should have failed"
            fail(deferred, testName, currentTestNumber, reason);
        })
        .fail(function(status) {
            if (status === StatusT.StatusDsDatasetInUse) {
                pass(deferred, testName, currentTestNumber);
            } else {
                fail(deferred, testName, currentTestNumber, StatusTStr[status]);
            }
        })
    }

    function testExport(deferred, testName, currentTestNumber) {
        xcalarExport(thriftHandle, "yelp/user-votes.funny-gt900-average",
                     "yelp-user-votes.funny-gt900-average.csv")
        .done(function(exportOutput) {
            printResult(exportOutput);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testMakeRetina(deferred, testName, currentTestNumber) {
        retinaName = "yelpRetina-1";
        xcalarMakeRetina(thriftHandle, retinaName,
                         "yelp/user-votes.funny-gt900-average")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        })
    }

    function testListRetinas(deferred, testName, currentTestNumber) {
        xcalarListRetinas(thriftHandle)
        .done(function(listRetinasOutput) {
            printResult(listRetinasOutput);
            for (var i = 0; i < listRetinasOutput.numRetinas; i ++) {
                console.log("\tretinaDescs[" + i + "].retinaName = " +
                            listRetinasOutput.retinaDescs[i].retinaName);
            }

            pass(deferred, testName, currentTestNumber);
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
                console.log("\tnode[" + ii + "].api = " +
                            getRetinaOutput.retina.retinaDag.node[ii].dagNodeId);
                console.log("\tnode[" + ii + "].api = " +
                            XcalarApisTStr[getRetinaOutput.retina.retinaDag.node[ii].api]);
                switch (getRetinaOutput.retina.retinaDag.node[ii].api) {
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

    function testAddParameterToRetina(deferred, testName, currentTestNumber) {
        xcalarAddParameterToRetina(thriftHandle, retinaName, "bar", "baz")
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

        xcalarFilter(thriftHandle, evalString, origTable, "ShouldNotExist")      
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
        xcalarKeyAddOrReplace(thriftHandle, keyName, keyValue, true)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });

    }

    function testApiKeyAdd(deferred, testName, currentTestNumber) {
        testApiKeyAddOrReplace(deferred, testName, currentTestNumber, "mykey", "myvalue1");
    }

    function testApiKeyReplace(deferred, testName, currentTestNumber) {
        testApiKeyAddOrReplace(deferred, testName, currentTestNumber, "mykey", "myvalue2");
    }

    function testApiKeyLookup(deferred, testName, currentTestNumber) {
        xcalarKeyLookup(thriftHandle, "mykey")
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
        xcalarKeyDelete(thriftHandle, "mykey")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    function testApiKeyBogusLookup(deferred, testName, currentTestNumber) {
        xcalarKeyLookup(thriftHandle, "mykey")
        .done(function(lookupOutput) {
            printResult(lookupOutput);
            var reason = "lookup did not fail";
            fail(deferred, testName, currentTestNumber, reason);
        })
        .fail(function(reason) {
            pass(deferred, testName, currentTestNumber);
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

    function testDeleteTable(deferred, testName, currentTestNumber) {
        xcalarDeleteTable(thriftHandle, "yelp/user-votes.funny-map")
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
    }

    // Witness to bug 103
    function testBulkDeleteTables(deferred, testName, currentTestNumber) {
        xcalarBulkDeleteTables(thriftHandle, "yelp*")
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

    function testDestroyDataset(deferred, testName, currentTestNumber) {
        xcalarDestroyDataset(thriftHandle, loadOutput.dataset.name)
        .done(function(status) {
            printResult(status);
            pass(deferred, testName, currentTestNumber);
        })
        .fail(function(reason) {
            fail(deferred, testName, currentTestNumber, reason);
        });
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

    var TestCaseEnabled = true;
    var TestCaseDisabled = false;

    passes            = 0;
    fails             = 0;
    skips             = 0;
    returnValue       = 0;
    defaultTimeout    = 32000;
    disableIsPass     = true;

    thriftHandle   = xcalarConnectThrift("localhost", 9090);
    loadArgs       = null;
    loadOutput     = null;
    origDataset    = null;
    queryId        = null;
    origTable      = null;
    origStrTable   = null;
    queryTableName = "yelp-joinTable";

    makeResultSetOutput1 = null;   // for dataset
    makeResultSetOutput2 = null;   // for table
    newTableOutput       = null;

    retinaName            = "";
    retinaFilterDagNodeId = 0;
    retinaFilterParamType = XcalarApisT.XcalarApiFilter;
    retinaDstTable        = "retinaDstTable";
    retinaExportFile      = "retinaDstFile.csv";

    // Format
    // addTestCase(testCases, testFn, testName, timeout, TestCaseEnabled, Witness)
    addTestCase(testCases, testStartNodes, "startNodes", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetVersion, "getVersion", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testLoad, "load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testLoadBogus, "bogus load", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListDatasets, "list datasets", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testEditColumn, "edit column", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetIntSync, "index dataset (int) Sync", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetInt, "index dataset (int)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetStr, "index dataset (str)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexTable, "index table (str) Sync", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexDatasetBogus, "bogus index dataset", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexTable2, "index table (str) 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testIndexTableBogus, "bogus index table 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetTableRefCount, "table refCount", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetCount, "count unique", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListTables, "list tables", defaultTimeout, TestCaseEnabled, "");

    // XXX Re-enable as soon as bug is fixed
    addTestCase(testCases, testGetStats, "get stats", defaultTimeout, TestCaseDisabled, "");

    // XXX Re-enable as soon as bug is fixed
    addTestCase(testCases, testGetStatGroupIdMap, "get stats group id map", defaultTimeout, TestCaseDisabled, "");

    addTestCase(testCases, testGetStatsByGroupId, "get stats group id", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResetStats, "reset stats", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testMakeResultSetFromDataset, "result set (via dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testMakeResultSetFromTable, "result set (via tables)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResultSetNextDataset, "result set next (dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResultSetAbsolute, "result set absolute", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testResultSetNextTable, "result set next (table)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testFreeResultSetDataset, "free result set (dataset)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testFreeResultSetTable, "free result set (table)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testFilter, "filter", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testJoin, "join", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testQuery, "Submit Query", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testQueryState, "Request query state of indexing dataset (int)", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, waitForDag, "waitForDag", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testDag, "dag", defaultTimeout, TestCaseEnabled, "568");
    addTestCase(testCases, testGroupBy, "groupBy", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testAggregate, "Aggregate", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiMap, "map", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testDestroyDatasetInUse, "destroy dataset in use", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testExport, "export", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testMakeRetina, "makeRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListRetinas, "listRetinas", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetRetina, "getRetina - iter 1 / 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testUpdateRetina, "updateRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testGetRetina, "getRetina - iter 2 / 2", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testExecuteRetina, "executeRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testAddParameterToRetina, "addParamaterToRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListParametersInRetina, "listParametersInRetina", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testListFiles, "list files", defaultTimeout, TestCaseEnabled, "");

    // Witness to bug 238
    addTestCase(testCases, testApiMapLongEvalString, "Map long eval string", defaultTimeout, TestCaseEnabled, "238");
    addTestCase(testCases, testApiFilterLongEvalString, "Filter long eval string", defaultTimeout, TestCaseEnabled, "238");

    addTestCase(testCases, testApiKeyAdd, "key add", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyReplace, "key replace", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyLookup, "key lookup", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyDelete, "key delete", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testApiKeyBogusLookup, "bogus key lookup", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testCases, testTop, "top test", defaultTimeout, TestCaseEnabled, "");

    addTestCase(testCases, testDeleteTable, "delete table", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testBulkDeleteTables, "bulk delete tables", defaultTimeout, TestCaseEnabled, "103");
    addTestCase(testCases, testDestroyDataset, "destroy dataset", defaultTimeout, TestCaseEnabled, "");
    addTestCase(testCases, testShutdown, "shutdown", defaultTimeout, TestCaseEnabled, "98");


    runTestSuite(testCases);
}();

