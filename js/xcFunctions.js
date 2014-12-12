var tempCountShit = 0;
// XXX: Dedupe with checkLoad!!!!
function checkStatus(newTableName, tableNum, keepOriginal,
                     additionalTableNum) {
    tempCountShit++;
    var refCount = XcalarGetTableRefCount(newTableName);
    console.log(refCount);
    if (refCount == 1) {
        $("body").css({"cursor": "default"});
        $('#waitCursor').remove();
        console.log("Done loading");
        if (keepOriginal === KeepOriginalTables.Keep) {
            // append newly created table to the back
            addTable(newTableName, gTables.length);
        } else {
            // default
            delTable(tableNum);
            if (additionalTableNum) {
                delTable(additionalTableNum);
            }
            addTable(newTableName, tableNum);
        }
    } else {
        console.log(refCount);
        // Check twice per second
        setTimeout(function() {
            checkStatus(newTableName);
        }, 500);
    }
}

function sortRows(index, tableNum, order) {
    console.log(arguments);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempSortTable"+rand;
    // XXX: Update widths here
    setOrder(newTableName, order);
    setIndex(newTableName, gTables[tableNum].tableCols);
    commitToStorage(); 
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
    XcalarIndexFromTable(gTables[tableNum].frontTableName, fieldName, newTableName);
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
    if (gTables[tableNum].frontTableName.indexOf("joined") > -1) {
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
    XcalarFilter(operator, value, gTables[tableNum].frontTableName, newTableName);
    checkStatus(newTableName, tableNum);
}

function createJoinIndex(rightTableNum, tableNum) {
    // Combine the columns from the 2 current tables
    // Note that we have to create deep copies!!
    var newTableCols = jQuery.extend(true, [],
                                     gTables[tableNum].tableCols);
    for (var i = 0; i<newTableCols.length; i++) {
        newTableCols[i] = jQuery.extend(true, {},
                                        gTables[tableNum].tableCols[i]);
    }
    var removed = false;
    var dataCol;

    for (var i = 0; i<newTableCols.length; i++) {
        if (!removed) {
            if (newTableCols[i].name == "DATA") {
                dataCol = newTableCols.splice(i, 1);
                removed = true;
            }
        } else {
            newTableCols[i].index--;
        }
    }
    removed = false;
    var newRightTableCols = jQuery.extend(true, [], 
                                          gTables[rightTableNum].tableCols);
    for (var i = 0; i<newRightTableCols.length; i++) {
        newRightTableCols[i] = jQuery.extend(true, {},
                                           gTables[rightTableNum].tableCols[i]);
    }
    for (var i = 0; i<newRightTableCols.length; i++) {
        newRightTableCols[i].index+=(newTableCols.length);
        if (!removed) {
            if (newRightTableCols[i].name == "DATA") {
                newRightTableCols.splice(i, 1);
                removed = true;
            }
        } else {
            newRightTableCols[i].index--;

        }
    }
    newTableCols = newTableCols.concat(newRightTableCols);
    dataCol[0].index = newTableCols.length+1;
    newTableCols = newTableCols.concat(dataCol);
    return (newTableCols);
}

function joinTables(rightTable, tableNum) {
    console.log("Joining "+gTables[tableNum].frontTableName+" and "+rightTable);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempJoinTable"+rand;
    var rightTableNum = -1;
    for (var i = 0; i<gTables.length; i++) {
        if (gTables[i].frontTableName == rightTable) {
            rightTableNum = i;
            break;
        }
    }
    if (rightTableNum == -1) {
        console.log("XXX Cannot find meta data for right table!");
    }

    var newTableCols = createJoinIndex(rightTableNum, tableNum);
    setIndex(newTableName, newTableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
        '{cursor: wait !important;}</style>');
    XcalarJoin(gTables[tableNum].frontTableName, rightTable, newTableName);
    checkStatus(newTableName, tableNum, KeepOriginalTables.DontKeep,
                rightTableNum);
    $('#waitCursor').remove();
}
