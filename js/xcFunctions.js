var tempCountShit = 0;
// XXX: Dedupe with checkLoad!!!!
function checkStatus(newTableName, tableNum) {
    tempCountShit++;
    var refCount = XcalarGetTableRefCount(newTableName);
    console.log(refCount);
    if (refCount == 1) {
        $("body").css({"cursor": "default"});
        console.log("Done loading");
        // XXX: TODO: FIXME Delete old table replace with new one 
        // window.location.href="?tablename="+newTableName;
    } else {
        console.log(refCount);
        // Check twice per second
        setTimeout(function() {
            checkStatus(newTableName);
        }, 500);
    }
}

function sortRows(index, tableNum, order) {
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempSortTable"+rand;
    // XXX: Update widths here
    setOrder(newTableName, order);
    setIndex(newTableName, gTables[tableNum].tableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
       '{cursor: wait !important;}</style>');
    var fieldName;
    switch(gTables[tableNum].tableCols[index-1].func.func) {
    case ("pull"):
        // Pulled directly, so just sort by this
        fieldName = gTables[tableNum].tableCols[index-1].func.args[0];
        break;
    default:
        console.log("Cannot sort a col derived from unsupported func");
        return;
    }
    XcalarIndexFromTable(gTables[tableNum].tableName, fieldName, newTableName);
    checkStatus(newTableName, tableNum);
}
/*
function cont1(newIndexTable, operator, value, datasetId, key, otherTable) {
    var refCount = XcalarGetTableRefCount(newIndexTable);
    console.log(refCount);
    if (refCount == 1) {
        var rand = Math.floor((Math.random() * 100000) + 1);
        var newFilterTable = "tempFilter"+rand;
        XcalarFilter(operator, value, newIndexTable, newFilterTable);
        // Wait for this filter to be done
        cont2(newFilterTable, operator, value, datasetId, key, otherTable);
    } else {
        // Check twice per second
        setTimeout(function() {
            cont1(newIndexTable, operator, value, datasetId, key, otherTable);
        }, 500);
    }
}

function cont2(newFilterTable, operator, value, datasetId, key, otherTable) {
    var refCount = XcalarGetTableRefCount(newFilterTable);
    console.log(refCount);
    if (refCount == 1) {
        var rand = Math.floor((Math.random() * 100000) + 1);
        var newIndexTable = "tempIndex"+rand;
        if (otherTable == "sp500") {
            XcalarIndexFromTable(newFilterTable, "gdeltDate", newIndexTable);
        } else {
            XcalarIndexFromTable(newFilterTable, "sp500", newIndexTable);
        }
        // Wait for this filter to be done
        cont3(newIndexTable, operator, value, datasetId, key, otherTable);
    } else {
        console.log(refCount);
        // Check twice per second
        setTimeout(function() {
            cont2(newFilterTable, operator, value, datasetId, key, otherTable);
        }, 500);
    }
}

function cont3(newIndexTable, operator, value, datasetId, key, otherTable) {
    var refCount = XcalarGetTableRefCount(newIndexTable);
    console.log(refCount);
    if (refCount == 1) {
        var rand = Math.floor((Math.random() * 100000) + 1);
        var newJoinTable = "joined"+rand;
        XcalarJoin(newIndexTable, otherTable, newJoinTable);
        setIndex(newJoinTable, gTables.tableCols);
        commitToStorage();
        checkStatus(newJoinTable, );
    } else {
        console.log(refCount);
        // Check twice per second
        setTimeout(function() {
            cont3(newIndexTable, operator, value, datasetId, key, otherTable);
        }, 500);
    }
}
*/

// Fucking javascript is so fucking fucked up. So we'll have to do continuation
// passing. Joy!
function filterNonMainCol(operator, value, datasetId, key, otherTable) {
/*    var rand = Math.floor((Math.random() * 100000) + 1);
    var newIndexTable = "tempIndex"+rand;
    console.log(newIndexTable);
    XcalarIndexFromDataset(datasetId, key, newIndexTable);
    // Wait for this index to be done
    cont1(newIndexTable, operator, value, datasetId, key, otherTable); */
}

function filterCol(operator, value, colid, tableNum) {
    if (gTables[tableNum].tableName.indexOf("joined") > -1) {
        var dsId = gTables[tableNum].tableCols[colid-1].datasetId;
        var key = gTables[tableNum].tableCols[colid-1].func.args[0];
        if (getDsId("gdelt") == dsId) {
            var otherTable = "sp500";
        } else {
            var otherTable = "gdelt";
        }
        filterNonMainCol(operator, value, dsId, key, otherTable);
        return;
    }
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempFilterTable"+rand;
    setIndex(newTableName, gTables.tableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    XcalarFilter(operator, value, gTables[tableNum].tableName, newTableName);
    checkStatus(newTableName, tableNum);
}

function joinTables(rightTable, tableNum) {
    console.log("Joining "+gTables[tableNum].tableName+" and "+rightTable);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempJoinTable"+rand;
    setIndex(newTableName, gTables[tableNum].tableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    XcalarJoin(gTables[tableNum].tableName, rightTable, newTableName);
    checkStatus(newTableName, tableNum);
    // TODO: Make decision as to whether we should remove the table that is
    // being joined on
    
}
