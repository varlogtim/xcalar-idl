
// XXX i can't find a javascript sleep()
function busywait(millis)
{
    var date = new Date();
    var curDate = null;
    do { curDate = new Date(); }
    while(curDate-date < millis);
}

function pass(testName, currentTestNumber)
{
    console.log("ok " + currentTestNumber + " - Test \"" + testName +
                "\" passed");
}

function fail(testName, currentTestNumber)
{
    console.log("not ok " + currentTestNumber + " - Test \"" + testName +
                "\" failed");
}

function skip(testName, currentTestNumber)
{
    console.log("ok " + currentTestNumber + " - Test \"" + testName +
                "\" disabled # SKIP");
}

thriftHandle = xcalarConnectThrift("localhost", 9090);

currentTestNumber=0;
returnValue=0;

currentTestNumber++;
testName="startNodes";
console.log("==========================================");
console.log("Testing \"" + testName + "\":")
status = xcalarStartNodes(thriftHandle, 2);
console.log("\tstatus: " + StatusTStr[status]);
console.log("RESULT:")
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="getVersion";
console.log("==========================================");
console.log("Testing \"" + testName + "\":")
verOutput = xcalarGetVersion(thriftHandle);
console.log("RESULT:")
console.log("\tversion is " + verOutput.version);
console.log("\tapiVersionFull is " + verOutput.apiVersionSignatureFull);
console.log("\tapiVersionShort is " + verOutput.apiVersionSignatureShort);

myApiVersionShort = XcalarApiVersionT['XcalarApiVersionSignature']
console.log("\tmy apiVersionShort is " + myApiVersionShort);

myApiVersionFull = XcalarApiVersionTStr[myApiVersionShort]
console.log("\tmy apiVersionFull is " + myApiVersionFull);

if (myApiVersionShort == verOutput.apiVersionSignatureShort &&
    myApiVersionFull == verOutput.apiVersionSignatureFull) {
    pass(testName, currentTestNumber);
} else {
    returnValue=1;
    fail(testName, currentTestNumber);
}

currentTestNumber++;
testName="load";
console.log("==========================================");
console.log("Testing \"" + testName + "\":");
loadArgs = new XcalarApiDfLoadArgsT();
loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
loadArgs.csv.recordDelim = "";
loadArgs.csv.fieldDelim = "";
loadOutput = xcalarLoad(thriftHandle, "file:///var/tmp/yelp/user", "yelp", DfFormatTypeT.DfTypeJson, 0, loadArgs);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[loadOutput.status]);
if (loadOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
    console.log("FAIL: load");
} else {
    console.log("\tdataset: " + loadOutput.dataset.name);
    pass(testName, currentTestNumber);
}

origDataset = loadOutput.dataset.name;

currentTestNumber++;
testName="bogus load";
console.log("==========================================");
console.log("Testing \"" + testName + "\":");
bogusOutput = xcalarLoad(thriftHandle, "somejunk", "junk", DfFormatTypeT.DfTypeJson, 0, loadArgs);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[bogusOutput.status]);
if (bogusOutput.status == StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="list datasets";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
listDatasetsOutput = xcalarListDatasets(thriftHandle);
console.log("RESULT:");
foundLoadDs = false;
for (i = 0; i < listDatasetsOutput.numDatasets; i++) {
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
    if (dataset.name == loadOutput.dataset.name) {
	foundLoadDs = true;
    }
}
if (foundLoadDs) {
    pass(testName, currentTestNumber);
} else {
    returnValue=1;
    fail(testName, currentTestNumber);
}

currentTestNumber++;
testName="edit column";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
status = xcalarEditColumn(thriftHandle, loadOutput.dataset.name, "", true,
				 "votes.cool", "votes.cool2", 1);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="index dataset (int) Sync";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
syncIndexOutput = xcalarIndexDataset(thriftHandle,
                  loadOutput.dataset.name, "review_count",
                  "yelp/user-review_count");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[syncIndexOutput.status]);
if (syncIndexOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + syncIndexOutput.tableName);
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="index dataset (int)";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
indexOutput = xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
				 "votes.funny", "yelp/user-votes.funny");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[indexOutput.status]);
if (indexOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + indexOutput.tableName);
    pass(testName, currentTestNumber);
}
origTable = indexOutput.tableName

currentTestNumber++;
testName="index dataset (str)";
console.log("Testing \"" + testName + "\":\n");
indexStrOutput = xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
				    "user_id", "yelp/user-user_id");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[indexStrOutput.status]);
if (indexStrOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
    console.log("FAIL: index dataset (str)");
} else {
    console.log("\ttableName: " + indexStrOutput.tableName);
}
origStrTable = indexStrOutput.tableName

console.log(origStrTable + " indexed successfully");
pass(testName, currentTestNumber);

currentTestNumber++;
testName="index table (str) Sync";
console.log("Testing \"" + testName + "\":\n");
indexStrOutput = xcalarIndexTable(thriftHandle, origStrTable,
			       "name", "yelp/user-name");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[indexStrOutput.status]);
if (indexStrOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + indexStrOutput.tableName);
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="bogus index dataset";
console.log("Testing \"" + testName + "\":\n");
bogusIndexOutput = xcalarIndexDataset(thriftHandle, loadOutput.dataset.name,
				 "garbage", "yelp/user-garbage");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[bogusIndexOutput.status]);
console.log("PASS: bogus index dataset");

console.log("==========================================");
console.log("Testing index table (int):\n");
indexOutput2 = xcalarIndexTable(thriftHandle, origTable,
			       "votes.useful", "yelp/user-votes.useful");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[indexOutput2.status]);
if (indexOutput2.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + indexOutput2.tableName);
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="index table (str) 2";
console.log("Testing \"" + testName + "\":\n");
indexStrOutput2 = xcalarIndexTable(thriftHandle, origStrTable,
			       "yelping_since", "yelp/user-yelping_since");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[indexStrOutput2.status]);
if (indexStrOutput2.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + indexStrOutput2.tableName);
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="bogus index table 2";
console.log("Testing \"" + testName + "\":\n");
bogusIndexOutput2 = xcalarIndexTable(thriftHandle, origTable,
			       "garbage2", "yelp/user-garbage2");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[bogusIndexOutput2.status]);
pass(testName, currentTestNumber);

currentTestNumber++;
testName="table refCount";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
console.log("RESULT:");
do {
    refOutput = xcalarGetTableRefCount(thriftHandle, origTable);
    if (refOutput.status != StatusT.StatusOk) {
        returnValue=1
        console.log("\tstatus: " + StatusTStr[refOutput.status]);
        fail(testName, currentTestNumber);
        break;
    } else {
        console.log("\trefCount: " + refOutput.refCount);
    }
} while(refOutput.refCount > 1);
if (refOutput.status == StatusT.StatusOk) {
    console.log("\tstatus: " + StatusTStr[refOutput.status]);
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="count unique";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
countOutput = xcalarGetCount(thriftHandle, origTable);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[countOutput.status]);
if (countOutput.status != StatusT.StatusOk) {
    returnValue=1
    console.log("FAIL: count unique");
} else {
    totalCount=0;
    for (i=0; i < countOutput.numCounts; i++) {
	totalCount += countOutput.counts[i];
    }
    console.log("\tcount: " + totalCount.toString());
    if (totalCount == 70817) {
        pass(testName, currentTestNumber);
    } else {
        returnValue=1
        console.log("FAIL: count unique; wrong count: " + totalCount +
                " expected: 70817");
        fail(testName, currentTestNumber);
    }
}

currentTestNumber++;
testName="list tables";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
listTablesOutput = xcalarListTables(thriftHandle, "yelp*");
console.log("RESULT:");
foundVotesFunny = false;
for (i = 0; i < listTablesOutput.numTables; i++) {
    table = listTablesOutput.tables[i];
    console.log("\ttable[" + i.toString() + "].tableName = " + table.tableName);
    console.log("\ttable[" + i.toString() + "].tableId = " +
		table.tableId.toString());
    if (table.tableName == origTable) {
        foundVotesFunny = true;
    }
}
if (foundVotesFunny) {
    pass(testName, currentTestNumber);
} else {
    returnValue=1;
    console.log("FAIL: list tables; missing table: " + origTable);
    fail(testName, currentTestNumber);
}

currentTestNumber++;
testName="get stats";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
statOutput = xcalarGetStats(thriftHandle, 0);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[statOutput.status]);
if (statOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    for (i = 0; i < statOutput.numStats; i++) {
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
        returnValue = 1;
        console.log("FAIL: get stats; no stats returned");
        fail(testName, currentTestNumber);
    }
}

currentTestNumber++;
testName="get stats group id map";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
groupMapOutput = xcalarGetStatGroupIdMap(thriftHandle, 0, 5);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[groupMapOutput.status]);
if (groupMapOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    if (groupMapOutput.numGroupNames != 0) {
        console.log("\tnumGroupNames: " +
                groupMapOutput.numGroupNames.toString());
        for (i = 0; i < groupMapOutput.numGroupNames; i++) {
            console.log("\tgroupName[" + i.toString() + "] = " +
                groupMapOutput.groupName[i]);
        }
        pass(testName, currentTestNumber);
    } else {
        returnValue=1;
        console.log("FAIL: get stats group id map; numGroupNames == 0");
        fail(testName, currentTestNumber);
    }
}

currentTestNumber++;
testName="get stats group id";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
statOutput = xcalarGetStatsByGroupId(thriftHandle, 0, [1]);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[statOutput.status]);
if (statOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    for (i = 0; i < statOutput.numStats; i++) {
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
        returnValue = 1;
        console.log("FAIL: get stats; no stats returned");
        fail(testName, currentTestNumber);
    }
}

currentTestNumber++;
testName="reset stats";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
status = xcalarResetStats(thriftHandle, 0);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="result set (via dataset)";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
makeResultSetOutput1 = xcalarMakeResultSetFromDataset(thriftHandle,
						     loadOutput.dataset.name);
console.log("RESULT (make from dataset):");
console.log("\tstatus: " + StatusTStr[makeResultSetOutput1.status]);
if (makeResultSetOutput1.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\tresultSetId: " +
		makeResultSetOutput1.resultSetId.toString());
    console.log("\tnumEntries: " + makeResultSetOutput1.numEntries.toString());
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="result set (via tables)";
makeResultSetOutput2 = xcalarMakeResultSetFromTable(thriftHandle,
						    origTable);
console.log("RESULT (make from table):");
console.log("\tstatus: " + StatusTStr[makeResultSetOutput2.status]);
if (makeResultSetOutput2.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\tresultSetId: " +
		makeResultSetOutput2.resultSetId.toString());
    console.log("\tnumEntries: " + makeResultSetOutput2.numEntries.toString());
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="result set next (dataset)";
if (makeResultSetOutput1.status == StatusT.StatusOk) {
    resultNextOutput1 = xcalarResultSetNext(thriftHandle,
					    makeResultSetOutput1.resultSetId, 5);
    console.log("RESULT (result set next dataset):");
    console.log("\tstatus: " + StatusTStr[resultNextOutput1.status]);
    if (resultNextOutput1.status != StatusT.StatusOk) {
        returnValue=1;
        fail(testName, currentTestNumber);
    } else {
        recordType = resultNextOutput1.kvPairs.recordType;
        console.log("\trecordType: " + GenericTypesRecordTypeTStr[recordType]);
        console.log("\ttotalRecordsSize: " +
                resultNextOutput1.kvPairs.totalRecordsSize);
        for (i = 0; i < resultNextOutput1.kvPairs.numRecords; i++) {
            kvPair = resultNextOutput1.kvPairs.records[i];
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
    }
} else {
    returnValue=1;
    console.log("FAIL: result set next dataset: no resultSetId");
    fail(testName, currentTestNumber);
}

currentTestNumber++;
testName="result set absolute";
if (makeResultSetOutput2.status == StatusT.StatusOk) {
    status = xcalarResultSetAbsolute(thriftHandle,
				     makeResultSetOutput2.resultSetId, 1000);
    console.log("RESULT (result set absolute):");
    console.log("\tstatus: " + StatusTStr[status]);
    if (status != StatusT.StatusOk) {
        returnValue=1;
        fail(testName, currentTestNumber);
    } else {
        pass(testName, currentTestNumber);
    }
} else {
    returnValue=1;
    console.log("FAIL: result set absolute: no resultSetId");
    fail(testName, currentTestNumber);
}

currentTestNumber++;
testName="result set next (table)";
if (makeResultSetOutput2.status == StatusT.StatusOk) {
    resultNextOutput2 = xcalarResultSetNext(thriftHandle,
					    makeResultSetOutput2.resultSetId,
					    5);
    console.log("RESULT (result set next table):");
    console.log("\tstatus: " + StatusTStr[resultNextOutput2.status]);
    if (resultNextOutput2.status != StatusT.StatusOk) {
        returnValue=1;
        fail(testName, currentTestNumber);
    } else {
        recordType = resultNextOutput2.kvPairs.recordType;
        console.log("\trecordType: " + GenericTypesRecordTypeTStr[recordType]);
        console.log("\ttotalRecordsSize: " +
                resultNextOutput2.kvPairs.totalRecordsSize);
        for (i = 0; i < resultNextOutput2.kvPairs.numRecords; i++) {
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
    }
} else {
    returnValue=1;
    console.log("FAIL: result set next table: no resultSetId");
    fail(testName, currentTestNumber);
}

currentTestNumber++;
testName="free result set (dataset)";
status = xcalarFreeResultSet(thriftHandle, makeResultSetOutput1.resultSetId);
console.log("RESULT (free result set dataset):");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="free result set (table)";
status = xcalarFreeResultSet(thriftHandle, makeResultSetOutput2.resultSetId);
console.log("RESULT (free result set table):");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="filter";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
filterOutput = xcalarFilter(thriftHandle, "gt(votes.funny, 900)", origTable,
                            "yelp/user-votes.funny-gt900");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[filterOutput.status]);
if (filterOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="join";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
newTableOutput = xcalarJoin(thriftHandle, "yelp/user-votes.funny-gt900",
			    "yelp/user-votes.funny-gt900",
			    "yelp/user-dummyjoin",
			    JoinOperatorT.InnerJoin);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[newTableOutput.status]);
if (newTableOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + newTableOutput.tableName);
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="Submit Query";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
queryTableName = "yelp-joinTable"
query = "index --key votes.funny --dataset yelp"+
        " --dsttable yelp-votesFunnyTable; index --key review_count"+
        " --srctable yelp-votesFunnyTable --dsttable yelp-review_countTable;"+
        "  map --eval \"add(1,2)\"  --srctable yelp-votesFunnyTable"+
        " --fieldName newField --dsttable yelp-mapTable;"+
        " filter yelp-mapTable \" sub(2,1)\" yelp-filterTable;"+
        " groupBy yelp-filterTable avg votes.cool avgCool yelp-groupByTable;"+
        " join --leftTable yelp-review_countTable --rightTable"+
        "  yelp-groupByTable --joinTable " + queryTableName;

queryOutput = xcalarQuery(thriftHandle, query);
queryId = queryOutput.queryId
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[queryOutput.status]);
if (queryOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\tQueryId: " + queryOutput.queryId.toString());
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="Request query state of indexing dataset (int)";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

queryStateOutput = xcalarQueryState(thriftHandle, queryId);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[queryStateOutput.queryStatus]);
if (queryStateOutput.queryStatus != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
}

// wait for dag to finish
while(queryStateOutput.queryState == 1)
{
    busywait(1000);
    queryStateOutput = xcalarQueryState(thriftHandle, queryId);
    console.log("\tQuery State: " + queryStateOutput.queryState.toString());
}

if (queryStateOutput.queryState != 2 ) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\tQuery State: " + queryStateOutput.queryState.toString());
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="dag";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

dagOutput = xcalarDag(thriftHandle,  queryTableName);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[dagOutput.status]);
if (dagOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="groupBy";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

groupByOutput = xcalarGroupBy(thriftHandle, "yelp/user-votes.funny-gt900",
			      "yelp/user-votes.funny-gt900-average",
			      AggregateOperatorT.AggrAverage, "votes.funny",
			      "averageVotesFunny");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[groupByOutput.status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + groupByOutput.tableName);
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="Aggregate";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

aggregateOutput = xcalarAggregate(thriftHandle, origStrTable,
                                  AggregateOperatorT.AggrSumKeys, "fans")
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[aggregateOutput.status] + "\n");
if (aggregateOutput.status != StatusT.StatusOk) {
    returnValue = 1;
    fail(testName, currentTestNumber);
} else {
    console.log("\tjsonAnswer: " + aggregateOutput.jsonAnswer + "\n");
    var jsonAnswer = JSON.parse(aggregateOutput.jsonAnswer);
    if (jsonAnswer.Value != 114674) {
        returnValue = 1;
        fail(testName, currentTestNumber);
    } else {
        pass(testName, currentTestNumber);
    }
}

currentTestNumber++;
testName="map";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
mapOutput = xcalarApiMap(thriftHandle, "votesFunnyPlusUseful",
                         "add(votes.funny, votes.useful)",
                         "yelp/user-votes.funny-gt900",
                         "yelp/user-votes.funny-map");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[mapOutput.status]);
if (mapOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\ttableName: " + mapOutput.tableName + "\n");
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="destroy dataset in use";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
status = xcalarDestroyDataset(thriftHandle, loadOutput.dataset.name);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusDsDatasetInUse) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="export";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
exportOutput = xcalarExport(thriftHandle, "yelp/user-votes.funny-gt900-average",
                            "yelp-user-votes.funny-gt900-average.csv");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[exportOutput.status]);
console.log("\toutputPath: " + exportOutput.outputPath);
if (exportOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

// ========== Start of retina test cases =================
// Please do not re-order any of the test cases in this group
// Dependency: yelp/user-votes.funny-gt900-average
retinaName=""
retinaFilterDagNodeId=0
retinaFilterParamType=XcalarApisT.XcalarApiFilter
retinaDstTable="retinaDstTable"
retinaExportFile="retinaDstFile.csv"

currentTestNumber++;
testName="makeRetina";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
retinaName="yelpRetina-1";
status = xcalarMakeRetina(thriftHandle, retinaName,
                          "yelp/user-votes.funny-gt900-average");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="listRetinas"
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
listRetinasOutput = xcalarListRetinas(thriftHandle);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[listRetinasOutput.status]);
if (listRetinasOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    console.log("\tNumRetinas: " + listRetinasOutput.numRetinas);
    for (ii = 0; ii < listRetinasOutput.numRetinas; ii++) {
        console.log("\tretinaDescs[" + ii + "].retinaName = " +
                    listRetinasOutput.retinaDescs[ii].retinaName)
    }
    pass(testName, currentTestNumber);
}

for (jj = 0; jj < 2; jj++) {
    currentTestNumber++;
    testName="getRetina - iter " + (jj + 1) + " / 2";
    console.log("==========================================");
    console.log("Testing \"" + testName + "\":\n");
    getRetinaOutput = xcalarGetRetina(thriftHandle, retinaName);
    console.log("RESULT:");
    console.log("\tstatus: " + StatusTStr[getRetinaOutput.status]);
    if (getRetinaOutput.status != StatusT.StatusOk) {
        returnValue=1;
        fail(testName, currentTestNumber);
        break;
    } else {
        console.log("\tretinaName: " + getRetinaOutput.retina.retinaDesc.retinaName);
        console.log("\tnumNodes: " + getRetinaOutput.retina.retinaDag.numNodes);
        for (ii = 0; ii < getRetinaOutput.retina.retinaDag.numNodes; ii++) {
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
    }

    if (jj == 0) {
        currentTestNumber++;
        testName="updateRetina";
        console.log("==========================================");
        console.log("Testing \"" + testName + "\":\n");
        paramInput = new XcalarApiParamInputT();
        paramInput.paramFilter = new XcalarApiParamFilterT();
        paramInput.paramFilter.filterStr = "gt(votes.funny, <foo>)";
        status = xcalarUpdateRetina(thriftHandle, retinaName,
                                    retinaFilterDagNodeId,
                                    retinaFilterParamType,
                                    paramInput);
        console.log("RESULT:");
        console.log("\tstatus: " + StatusTStr[status]);
        if (status != StatusT.StatusOk) {
            returnValue=1;
            fail(testName, currentTestNumber);
            break;
        } else {
            pass(testName, currentTestNumber);
        }
    }
}

currentTestNumber++;
testName="executeRetina";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

var parameters = [];
parameters.push(new XcalarApiParameterT({ parameterName: "foo", parameterValue: "1000" }));

status = xcalarExecuteRetina(thriftHandle, retinaName, retinaDstTable,
                             retinaExportFile, parameters);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="addParameterToRetina";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

status = xcalarAddParameterToRetina(thriftHandle, retinaName, "bar", "baz");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="listParametersInRetina";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

listParametersInRetinaOutput = xcalarListParametersInRetina(thriftHandle, retinaName);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[listParametersInRetinaOutput.status]);
if (listParametersInRetinaOutput.status == StatusT.StatusOk) {
    console.log("\tnumParameters: " + listParametersInRetinaOutput.numParameters);
    for (ii = 0; ii < listParametersInRetinaOutput.numParameters; ii++) {
        console.log("\tparameters[" + ii + "].parameterName = " +
                    listParametersInRetinaOutput.parameters[ii].parameterName);
        console.log("\tparameters[" + ii + "].parameterValue = " +
                    listParametersInRetinaOutput.parameters[ii].parameterValue);
    }
    pass(testName, currentTestNumber);
} else {
    returnValue=1;
    fail(testName, currentTestNumber);
}
// ================== end of retina test cases =====================

currentTestNumber++;
testName="list files";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

listFilesOutput = xcalarListFiles(thriftHandle, "file:///");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[listFilesOutput.status]);
for (i = 0; i < listFilesOutput.numFiles; i++) {
    file = listFilesOutput.files[i];
    console.log("\tfile[" + i.toString() + "].name = " + file.name);
    console.log("\tfile[" + i.toString() + "].attr.size = " +
		file.attr.size.toString());
    console.log("\tfile[" + i.toString() + "].attr.isDirectory = " +
		file.attr.isDirectory.toString());
}
if (listFilesOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

// Witness to bug 238
currentTestNumber++;
testName="Long eval string";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
evalString="add(votes.funny, 1)"
while (evalString.length <= XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
    evalString="add(1, " + evalString + ")";
}
mapOutput = xcalarApiMap(thriftHandle, "DoesNotExist", evalString, origTable,
                         "ShouldNotExist");
console.log("mapOutput.status = " + StatusTStr[mapOutput.status]);
if (mapOutput.status != StatusT.StatusEvalStringTooLong) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    filterOutput = xcalarFilter(thriftHandle, evalString, origTable,
                                "ShouldNotExist");
    console.log("filterOutput.status = " + StatusTStr[filterOutput.status]);
    if (filterOutput.status != StatusT.StatusEvalStringTooLong) {
        returnValue=1;
        fail(testName, currentTestNumber);
    } else {
        pass(testName, currentTestNumber);
    }
}

currentTestNumber++;
testName="delete table";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
status = xcalarDeleteTable(thriftHandle, "yelp/user-votes.funny-map");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

// Witness to bug 103
currentTestNumber++;
testName="bulk delete tables";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
deleteTablesOutput = xcalarBulkDeleteTables(thriftHandle, "yelp*");
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[deleteTablesOutput.status]);
if (deleteTablesOutput.status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    for (i = 0; i < deleteTablesOutput.numTables; i++) {
        delTableStatus = deleteTablesOutput.statuses[i];
        console.log("\t" + delTableStatus.table.tableName + ": " +
                    StatusTStr[delTableStatus.status]);
    }
    pass(testName, currentTestNumber);
}

currentTestNumber++;
testName="destroy dataset";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
status = xcalarDestroyDataset(thriftHandle, loadOutput.dataset.name);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

// Witness to bug 98
currentTestNumber++;
testName="shutdown";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
status = xcalarShutdown(thriftHandle);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

console.log("==========================================");

console.log("1.." + currentTestNumber + "\n")
phantom.exit(returnValue);
