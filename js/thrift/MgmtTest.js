+function(undefined) {
    "use strict";

    if (!jQuery || typeof jQuery.Deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    function startTest(deferred, testNameLocal, currentTestNumberLocal, timeout) {
        console.log("====================Test ", currentTestNumberLocal, " Begin====================");
        console.log("                Testing: ", testNameLocal, "                     ");
        setTimeout(function() {
            var reason = "Test " + testNameLocal + " timed out after " + (timeout / 1000) + " seconds";
            deferred.reject(reason, testNameLocal, currentTestNumberLocal);
        }, timeout);
    }

    function printResult(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    }

    function pass(testName, currentTestNumber)
    {
        passes ++;
        console.log("ok " + currentTestNumber + " - Test \"" + testName +
                    "\" passed");
    }

    function fail(testName, currentTestNumber)
    {
        fails ++;
        console.log("not ok " + currentTestNumber + " - Test \"" + testName +
                    "\" failed");
    }

    function skip(testName, currentTestNumber)
    {
        console.log("ok " + currentTestNumber + " - Test \"" + testName +
                    "\" disabled # SKIP");
    }

    // Test related variables
    var passes
    ,   fails
    ,   currentTestNumber
    ,   testName
    ,   returnValue
    ,   runStartNodes
    ,   defaultTimeout;

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

    (function initTests() {
        var deferred = $.Deferred();

	runStartNodes     = 1;
        passes            = 0;
        fails             = 0;
        currentTestNumber = 0;
        testName          = null;
        returnValue       = 0;
        defaultTimeout    = 8000;

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

        deferred.resolve();

        return deferred.promise();
    })()
    .then(function testStartNodes() {
        var deferred = $.Deferred();

        currentTestNumber++;
        testName = "startNodes";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

	if (runStartNodes) {
            xcalarStartNodes(thriftHandle, 2)
		.done(function(result) {
		    printResult(result);

		    pass(testName, currentTestNumber);
		    deferred.resolve();
		})
		.fail(function(reason) {
		    console.log("testStartNodes failed:", reason);

		    returnValue = 1;
		    fail(testName, currentTestNumber);
		    deferred.reject();
		});
	} else {
	    console.log("testStartNodes skipped");
	    pass(testName, currentTestNumber);
	    deferred.resolve();
	}

        return deferred.promise();
	
    })
    .then(function testGetVersion() {
        var deferred = $.Deferred();

        currentTestNumber++;
        testName = "getVersion";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarGetVersion(thriftHandle)
        .done(function(result) {
            printResult(result);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testGetVersion failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testLoad() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "load";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = "";
        loadArgs.csv.fieldDelim = "";

        xcalarLoad(thriftHandle, "file:///var/tmp/yelp/user", "yelp", DfFormatTypeT.DfTypeJson, 0, loadArgs)
        .done(function(result) {
            printResult(result);

            loadOutput = result;
            origDataset = loadOutput.dataset.name;

            pass(testName, currentTestNumber);
            deferred.resolve();
        })
        .fail(function(reason) {
            console.log("testLoad failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
            deferred.reject();
        });

        return deferred.promise();
    })
    .then(function testLoadBogus() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "bogus load";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarLoad(thriftHandle, "somejunk", "junk", DfFormatTypeT.DfTypeJson, 0, loadArgs)
        .done(function(bogusOutput) {
            printResult(bogusOutput);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .fail(function() {
            console.log("testLoadBogus failed*");
            
            pass(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testListDatasets() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "list datasets";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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
                pass(testName, currentTestNumber);
            } else {
                returnValue = 1;
                fail(testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            console.log("testListDatasets failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testEditColumn() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "edit column";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarEditColumn(thriftHandle, loadOutput.dataset.name, "", true,
                         "votes.cool", "votes.cool2", 1)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testEditColumn failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testIndexDatasetIntSync() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "index dataset (int) Sync";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarIndexDataset(thriftHandle,
                           loadOutput.dataset.name, "review_count",
                           "yelp/user-review_count")
        .done(function(syncIndexOutput) {
            printResult(syncIndexOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testIndexDatasetIntSync failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testIndexDatasetInt() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "index dataset (int)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                           "votes.funny", "yelp/user-votes.funny")
        .done(function(indexOutput) {
            printResult(indexOutput);

            pass(testName, currentTestNumber);
            origTable = indexOutput.tableName;
        })
        .fail(function(reason) {
            console.log("testIndexDatasetInt failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testIndexDatasetStr() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "index dataset (str)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
                           "user_id", "yelp/user-user_id")
        .done(function(indexStrOutput) {
            printResult(indexStrOutput);

            origStrTable = indexStrOutput.tableName;
            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testIndexDatasetStr failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testIndexTable() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "index table (str) Sync";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarIndexTable(thriftHandle, origStrTable,
                         "name", "yelp/user-name")
        .done(function(indexStrOutput) {
            printResult(indexStrOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testIndexTable failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    // .then(function testIndexDatasetBogus() {
    //     var deferred = $.Deferred();

    //     currentTestNumber ++;
    //     testName = "bogus index dataset";

    //     printTestBegin();

    //     xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
    //                        "garbage", "yelp/user-garbage")
    //     .done(function(bogusIndexOutput) {
    //         printResult(bogusIndexOutput);

    //         pass(testName, currentTestNumber);
    //     })
    //     .fail(function() {
    //         returnValue = 1;
    //         fail(testName, currentTestNumber);
    //     })
    //     .always(function() {
    //         deferred.resolve();
    //     });
        
    //     return deferred.promise();
    // })
    .then(function testIndexTable2() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "index table (str) 2";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarIndexTable(thriftHandle, origStrTable,
                         "yelping_since", "yelp/user-yelping_since")
        .done(function(indexStrOutput2) {
            printResult(indexStrOutput2);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testIndexTable2 failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testIndexTableBogus() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "bogus index table 2";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarIndexTable(thriftHandle, origTable,
                         "garbage2", "yelp/user-garbage2")
        .done(function(bogusIndexOutput2) {
            printResult(bogusIndexOutput2);

            pass(testName, currentTestNumber);
        })
        .fail(function() {
            returnValue = 1;
            failed(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testGetTableRefCount() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "table refCount";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarGetTableRefCount(thriftHandle, origTable)
        .done(function(refOutput) {
            printResult(refOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testGetTableRefCount failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testGetCount() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "count unique";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarGetCount(thriftHandle, origTable)
        .done(function(countOutput) {
            printResult(countOutput);

            var totalCount = 0;
            for (var i = 0; i < countOutput.numCounts; i ++) {
                totalCount += countOutput.counts[i];
            }

            console.log("\tcount: " + totalCount.toString());

            if (totalCount === 70817) {
                pass(testName, currentTestNumber);
            } else {
                console.log("FAIL: count unique; wrong count: " + totalCount +
                        " expected: 70817");

                returnValue = 1;
                fail(testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            console.log("testGetCount failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testListTables() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "list tables";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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
                pass(testName, currentTestNumber);
            } else {
                console.log("fail to found table votes funny", origTable);
                
                returnValue = 1;
                fail(testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            console.log("testListTables failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testGetStats() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "get stats";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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
                pass(testName, currentTestNumber);
            } else {
                console.log("FAIL: get stats; no stats returned");

                returnValue = 1;
                fail(testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            console.log("testGetStats failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testGetStatGroupIdMap() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "get stats group id map";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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

                pass(testName, currentTestNumber);
            } else {
                console.log("FAIL: get stats group id map; numGroupNames == 0");

                returnValue = 1;
                fail(testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            console.log("testGetStatGroupIdMap failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testGetStatsByGroupId() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "get stats group id";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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
                pass(testName, currentTestNumber);
            } else {
                console.log("FAIL: get stats; no stats returned");

                returnValue = 1;
                fail(testName, currentTestNumber);
            }
        })
        .fail(function(reason) {
            console.log("testGetStatsByGroupId failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
        
        return deferred.promise();
    })
    .then(function testResetStats() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "reset stats";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarResetStats(thriftHandle, 0)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testResetStats failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testMakeResultSetFromDataset() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "result set (via dataset)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarMakeResultSetFromDataset(thriftHandle,
                                       loadOutput.dataset.name)
        .done(function(result) {
            printResult(result);

            makeResultSetOutput1 = result;
            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testMakeResultSetFromDataset failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testMakeResultSetFromTable() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "result set (via tables)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarMakeResultSetFromTable(thriftHandle,
                                     origTable)
        .done(function(result) {
            printResult(result);

            makeResultSetOutput2 = result;
            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testMakeResultSetFromTable failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testResultSetNextDataset() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "result set next (dataset)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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
                pass(testName, currentTestNumber);
            })
            .fail(function(reason) {
                console.log("testResultSetNextDataset failed:", reason);

                returnValue = 1;
                fail(testName, currentTestNumber);
            })
            .always(function() {
                deferred.resolve();
            });
        } else {
            console.log("FAIL: result set next dataset: no resultSetId");

            returnValue = 1;
            fail(testName, currentTestNumber);

            deferred.resolve();
        }

        return deferred.promise();
    })
    .then(function testResultSetAbsolute() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "result set absolute";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        if (makeResultSetOutput2.status === StatusT.StatusOk) {
            xcalarResultSetAbsolute(thriftHandle,
                                    makeResultSetOutput2.resultSetId, 1000)
            .done(function(status) {
                printResult(status);

                pass(testName, currentTestNumber);
            })
            .fail(function(reason) {
                console.log("testResultSetAbsolute failed:", reason);

                returnValue = 1;
                fail(testName, currentTestNumber);
            })
            .always(function() {
                deferred.resolve();
            });
        } else {
            console.log("FAIL: result set absolute: no resultSetId");

            returnValue = 1;
            fail(testName, currentTestNumber);

            deferred.resolve();
        }

        return deferred.promise();
    })
    .then(function testResultSetNextTable() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "result set next (table)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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
                pass(testName, currentTestNumber);
            })
            .fail(function(reason) {
                console.log("testResultSetNextTable failed:", reason);

                returnValue = 1;
                fail(testName, currentTestNumber);
            })
            .always(function() {
                deferred.resolve();
            });
                
        } else {
            console.log("FAIL: result set next table: no resultSetId");

            returnValue = 1;
            fail(testName, currentTestNumber);

            deferred.resolve();
        }

        return deferred.promise();
    })
    .then(function testFreeResultSetDataset() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "free result set (dataset)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarFreeResultSet(thriftHandle, makeResultSetOutput1.resultSetId)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testFreeResultSetDataset failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testFreeResultSetTable() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "free result set (table)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarFreeResultSet(thriftHandle, makeResultSetOutput2.resultSetId)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testFreeResultSetTable failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testFilter() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "filter";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarFilter(thriftHandle, "gt(votes.funny, 900)", origTable,
                     "yelp/user-votes.funny-gt900")
        .done(function(filterOutput) {
            printResult(filterOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testFilter failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testJoin() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "join";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarJoin(thriftHandle, "yelp/user-votes.funny-gt900",
                   "yelp/user-votes.funny-gt900",
                   "yelp/user-dummyjoin",
                   JoinOperatorT.InnerJoin)
        .done(function(result) {
            printResult(result);

            newTableOutput = result;
            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testJoin failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
        
        return deferred.promise();
    })
    .then(function testQuery() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "Submit Query";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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
            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testQuery failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testQueryState() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "Request query state of indexing dataset (int)";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarQueryState(thriftHandle, queryId)
        .done(function(queryStateOutput) {
            printResult(queryStateOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testQueryState failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    // .then(function waitForDag() {
    //     var deferred = $.Deferred();

    //     var queryStateOutput;

    //     +function wait() {
    //         setTimeout(function() {
    //             xcalarQueryState(thriftHandle, queryId)
    //             .done(function(result) {
    //                 queryStateOutput = result;
    //                 if (queryStateOutput.queryState === 1) {
    //                     return wait();
    //                 }

    //                 if (queryStateOutput.queryState === 2) {
    //                     pass(testName, currentTestNumber);
    //                 } else {
    //                     returnValue=1;
    //                     fail(testName, currentTestNumber);
    //                 }

    //                 deferred.resolve();
    //             });
    //         }, 1000);
    //     }();
            
    //     return deferred.promise();
    // })
    // Disable due to bug 568
    // .then(function testDag() {
    //     var deferred = $.Deferred();

    //     currentTestNumber ++;
    //     testName = "dag";

    //     printTestBegin();

    //     xcalarDag(thriftHandle,  queryTableName)
    //     .done(function(dagOutput) {
    //         printResult(dagOutput);

    //         pass(testName, currentTestNumber);
    //     })
    //     .fail(function(reason) {
    //         console.log("testDag failed:", reason);

    //         returnValue = 1;
    //         fail(testName, currentTestNumber);
    //     })
    //     .always(function() {
    //         deferred.resolve();
    //     });

    //     return deferred.promise();
    // })
    .then(function testGroupBy() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "groupBy";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarGroupBy(thriftHandle, "yelp/user-votes.funny-gt900",
                      "yelp/user-votes.funny-gt900-average",
                      AggregateOperatorT.AggrAverage, "votes.funny",
                      "averageVotesFunny")
        .done(function(groupByOutput) {
            printResult(groupByOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testGroupBy failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testAggregate() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "Aggregate";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarAggregate(thriftHandle, origStrTable,
                        AggregateOperatorT.AggrSumKeys, "fans")
        .done(function(aggregateOutput) {
            printResult(aggregateOutput);

            pass(testName, currentTestNumber);

            // console.log("\tjsonAnswer: " + aggregateOutput.jsonAnswer + "\n");
            // var jsonAnswer = JSON.parse(aggregateOutput.jsonAnswer);
            // if (jsonAnswer.Value !== 114674) {
            //     returnValue = 1;
            //     fail(testName, currentTestNumber);
            // } else {
            //     pass(testName, currentTestNumber);
            // }
        })
        .fail(function(reason) {
            console.log("testAggregate failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testApiMap() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "map";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarApiMap(thriftHandle, "votesFunnyPlusUseful",
                     "add(votes.funny, votes.useful)",
                     "yelp/user-votes.funny-gt900",
                     "yelp/user-votes.funny-map")
        .done(function(mapOutput) {
            printResult(mapOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testApiMap failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testDestroyDataset() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "destroy dataset in use";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarDestroyDataset(thriftHandle, loadOutput.dataset.name)
        .done(function(status) {
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .fail(function(reason) {
            pass(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testExport() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "export";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarExport(thriftHandle, "yelp/user-votes.funny-gt900-average",
                     "yelp-user-votes.funny-gt900-average.csv")
        .done(function(exportOutput) {
            printResult(exportOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testExport failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testMakeRetina() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "makeRetina";

        retinaName = "yelpRetina-1";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarMakeRetina(thriftHandle, retinaName,
                         "yelp/user-votes.funny-gt900-average")
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testMakeRetina failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testListRetinas() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "listRetinas";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarListRetinas(thriftHandle)
        .done(function(listRetinasOutput) {
            printResult(listRetinasOutput);

            for (var i = 0; i < listRetinasOutput.numRetinas; i ++) {
                console.log("\tretinaDescs[" + i + "].retinaName = " +
                            listRetinasOutput.retinaDescs[i].retinaName);
            }

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testListRetinas failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testGetRetina() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "getRetina - iter " + 1 + " / 2";
        
        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testGetRetina failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testUpdateRetina() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "updateRetina";
        
        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        paramInput = new XcalarApiParamInputT();
        paramInput.paramFilter = new XcalarApiParamFilterT();
        paramInput.paramFilter.filterStr = "gt(votes.funny, <foo>)";
        xcalarUpdateRetina(thriftHandle, retinaName,
                           retinaFilterDagNodeId,
                           retinaFilterParamType,
                           paramInput)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testUpdateRetina failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testGetRetina2() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "getRetina - iter " + 2 + " / 2";
        
        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testGetRetina2 failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testExecuteRetina() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "executeRetina";
        
        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        var parameters = [];
        parameters.push(new XcalarApiParameterT({ parameterName: "foo", parameterValue: "1000" }));

        xcalarExecuteRetina(thriftHandle, retinaName, retinaDstTable,
                            retinaExportFile, parameters)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testExecuteRetina failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testAddParameterToRetina() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "addParameterToRetina";
        
        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarAddParameterToRetina(thriftHandle, retinaName, "bar", "baz")
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testAddParameterToRetina failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testListParametersToRetina() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "listParametersInRetina";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testListParametersToRetina failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testListFiles() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "list files";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

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

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testListFiles failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testApiMap() {
        var deferred = $.Deferred();

        // Witness to bug 238
        currentTestNumber ++;
        testName = "Long eval string";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        var evalString = "add(votes.funny, 1)"
        while (evalString.length <= XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            evalString = "add(1, " + evalString + ")";
        }

        xcalarApiMap(thriftHandle, "DoesNotExist", evalString, origTable,
                     "ShouldNotExist")
        .then(function(mapOutput) {
            printResult(mapOutput);

            return xcalarFilter(thriftHandle, evalString, 
                                origTable, "ShouldNotExist");      
        })
        .done(function(filterOutput) {
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .fail(function(reason) {
            pass(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testApiKeyAdd() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "key add";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarKeyAddOrReplace(thriftHandle, "mykey", "myvalue1")
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testApiKeyAdd failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testApiKeyReplace() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "key replace";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarKeyAddOrReplace(thriftHandle, "mykey", "myvalue2")
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testApiKeyReplace failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testApiKeyLookup() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "key lookup";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarKeyLookup(thriftHandle, "mykey")
        .done(function(lookupOutput) {
            printResult(lookupOutput);

	    if (lookupOutput.value != "myvalue2") {
		console.log("testApiKeyLookup failed:  wrong value");

		returnValue = 1;
		fail(testName, currentTestNumber);
	    } else {
		pass(testName, currentTestNumber);
	    }
        })
        .fail(function(reason) {
            console.log("testApiKeyLookup failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testApiKeyDelete() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "key delete";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarKeyDelete(thriftHandle, "mykey")
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testApiKeyDelete failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testApiKeyBogusLookup() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "bogus key lookup";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarKeyLookup(thriftHandle, "mykey")
        .done(function(lookupOutput) {
            printResult(lookupOutput);

	    console.log("testApiKeyBogusLookup failed:  lookup did not fail");

	    returnValue = 1;
	    fail(testName, currentTestNumber);
        })
        .fail(function(reason) {
            pass(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testDeleteTable() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "delete table";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarDeleteTable(thriftHandle, "yelp/user-votes.funny-map")
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testDeleteTable failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testBulkDeleteTables() {
        var deferred = $.Deferred();

        // Witness to bug 103
        currentTestNumber ++;
        testName = "bulk delete tables";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarBulkDeleteTables(thriftHandle, "yelp*")
        .done(function(deleteTablesOutput) {
            printResult(deleteTablesOutput);

            for (var i = 0, delTableStatus = null; i < deleteTablesOutput.numTables; i ++) {
                delTableStatus = deleteTablesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testBulkDeleteTables failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testDestroyDataset() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "destroy dataset";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarDestroyDataset(thriftHandle, loadOutput.dataset.name)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testDestroyDataset failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .then(function testShutdown() {
        var deferred = $.Deferred();

        // Witness to bug 98
        currentTestNumber ++;
        testName = "shutdown";

        startTest(deferred, testName, currentTestNumber, defaultTimeout);

        xcalarShutdown(thriftHandle)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testShutdown failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .done(function finishTests() {
        console.log("==========================================");

        console.log("1.." + currentTestNumber + "\n")
    })
    .fail(function(reason, testName, testNumber) {
        console.log("Test failed:", reason); 
        returnValue = 1;
        fail(testName, testNumber);
    })
    .always(function() {
        console.log("# pass", passes);
        console.log("# fail", fails);
        phantom.exit(returnValue);
    });

}();
