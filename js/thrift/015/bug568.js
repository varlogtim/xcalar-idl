// Witness to bug 568

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
testName="load";
console.log("==========================================");
console.log("Testing \"" + testName + "\":");
loadArgs = new XcalarApiDfLoadArgsT();
loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
loadArgs.csv.recordDelim = "";
loadArgs.csv.fieldDelim = "";
loadOutput = xcalarLoad(thriftHandle, "file:///var/tmp/qa/indexJoin/classes", "classes", DfFormatTypeT.DfTypeJson, 0, loadArgs);
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
testName="index dataset (class_id)";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
syncIndexOutput = xcalarIndexDataset(thriftHandle,
                  origDataset, "class_id",
                  "classes/class_id");
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
testName="join1";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
newTableOutput = xcalarJoin(thriftHandle, "classes/class_id",
			    "classes/class_id",
			    "classes/class_id/nest1",
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
testName="join2";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
newTableOutput = xcalarJoin(thriftHandle, "classes/class_id/nest1",
			    "classes/class_id/nest1",
			    "classes/class_id/nest2",
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
testName="join3";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
newTableOutput = xcalarJoin(thriftHandle, "classes/class_id/nest2",
			    "classes/class_id/nest2",
			    "classes/class_id/nest3",
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
testName="join4";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
newTableOutput = xcalarJoin(thriftHandle, "classes/class_id/nest3",
			    "classes/class_id/nest3",
			    "classes/class_id/nest4",
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
testName="dag";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");

for (i = 0; i < 100; i++) {
    dagOutput = xcalarDag(thriftHandle, newTableOutput.tableName);
    console.log("RESULT:");
    console.log("\tstatus: " + StatusTStr[dagOutput.status]);
    if (dagOutput.status != StatusT.StatusOk) {
	returnValue=1;
    }
}
if (returnValue != 1) {
    pass(testName, currentTestNumber);
} else {
    fail(testName, currentTestNumber);
}

currentTestNumber++;
testName="bulk delete tables";
console.log("==========================================");
console.log("Testing \"" + testName + "\":\n");
deleteTablesOutput = xcalarBulkDeleteTables(thriftHandle, "*");
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
status = xcalarDestroyDataset(thriftHandle, origDataset);
console.log("RESULT:");
console.log("\tstatus: " + StatusTStr[status]);
if (status != StatusT.StatusOk) {
    returnValue=1;
    fail(testName, currentTestNumber);
} else {
    pass(testName, currentTestNumber);
}

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
