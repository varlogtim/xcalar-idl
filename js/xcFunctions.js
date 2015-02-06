var tempCountShit = 0;
// XXX: Dedupe with checkLoad!!!!
function checkStatus(newTableName, tableNum, keepOriginal,
                     additionalTableNum) {
    tempCountShit++;
    var refCount = XcalarGetTableRefCount(newTableName);
    console.log(refCount);
    if (refCount == 1 || tempCountShit > 20) {
        tempCountShit = 0;
        $("body").css({"cursor": "default"});
        $('#waitCursor').remove();
        console.log("Done loading");
        var newTableNum;
        if (keepOriginal === KeepOriginalTables.Keep) {
            // append newly created table to the back
            newTableNum = gTables.length;
            addTable(newTableName, newTableNum, AfterStartup.After);
            var leftPos = $('#xcTableWrap'+newTableNum).position().left +
                            $('#mainFrame').scrollLeft();
            $('#mainFrame').animate({scrollLeft: leftPos});
        } else {
            // default
            newTableNum = tableNum;
            var savedScrollLeft;
            if (additionalTableNum > -1) {
                var largerTableNum = Math.max(additionalTableNum, tableNum);
                var smallerTableNum = Math.min(additionalTableNum, tableNum);
                archiveTable(largerTableNum);
                archiveTable(smallerTableNum);
                if (newTableNum > gTables.length) {
                    // edge case
                    newTableNum = gTables.length;
                }
            } else {
                savedScrollLeft = $('#mainFrame').scrollLeft();
                archiveTable(tableNum);
            }
            addTable(newTableName, newTableNum, AfterStartup.After);
            if (savedScrollLeft) {
                $('#mainFrame').scrollLeft(savedScrollLeft);
            } 
        }
    } else {
        console.log(refCount);
        // Check twice per second
        setTimeout(function() {
            checkStatus(newTableName, tableNum, keepOriginal,
                        additionalTableNum);
        }, 500);
    }
}

function checkStatusLite(name, funcPtr, args) {
    tempCountShit++;
    if (tHandle == null) {
        return (null);
    }
    var refCount = XcalarGetTableRefCount(name);
    if (refCount == 1 || tempCountShit > 20) {
        tempCountShit = 0;
        funcPtr(args);
    } else {
        setTimeout(function() {
            checkStatusLite(name, funcPtr, args);
        }, 500);
    }
}

function checkLoadStatus(name, secondCall) {
    if (tHandle == null) {
        return (null);
    }
    var dsList = xcalarListDatasets(tHandle);
    var dsFound = false;
    for (var i = 0; i<dsList.numDatasets; i++) {
        if (dsList.datasets[i].name == name) {
            dsFound = true;
            if (!secondCall) {
                appendDSToList(name);
            }
            if (dsList.datasets[i].loadIsComplete) {
                console.log("Load of "+name+" is done!");
                displayNewDataset();
            } else {
                setTimeout(function() {
                    checkLoadStatus(name, true);
                }, 1000);
            }
        }
    }
    return (dsFound);
}

function sortRows(index, tableNum, order) {
    console.log(arguments);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempSortTable"+rand;
    // XXX: Update widths here
    setDirection(newTableName, order);
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
    checkStatus(newTableName, tableNum, KeepOriginalTables.DontKeep,
                undefined);
}

function mapColumn(fieldName, mapString, tableNum) {
    $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
        '{cursor: wait !important;}</style>');
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempMapTable"+rand;
    setIndex(newTableName, gTables[tableNum].tableCols);
    commitToStorage(); 
    XcalarMap(fieldName, mapString, gTables[tableNum].frontTableName,
              newTableName);
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

function groupByCol(operator, newColName, colid, tableNum) {
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempGroupByTable"+rand;
    // TODO Create new gTables entry
    // setIndex(newTableName, newTableCols);
    // commitToStorage();
    $("body").css({"cursor": "wait"});
    XcalarGroupBy(operator, newColName, gTables[tableNum].tableCols[colid-1].name,
                 gTables[tableNum].frontTableName, newTableName);
    checkStatus(newTableName, tableNum, KeepOriginalTables.Keep);
}

function filterCol(operator, value, colid, tableNum) {
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempFilterTable"+rand;
    setIndex(newTableName, gTables[tableNum].tableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"});
    console.log(colid); 
    XcalarFilter(operator, value, gTables[tableNum].tableCols[colid-1].name,
                 gTables[tableNum].frontTableName, newTableName);
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
/**
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
    var newTableCols = [];
    if (rightTableNum == -1) {
        console.log("XXX Right table is not being displayed!");
        newTableCols = jQuery.extend(true, [],
                                     gTables[tableNum].tableCols);
    } else {
        newTableCols = createJoinIndex(rightTableNum, tableNum);
    }
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
*/

function joinTables(newTableName, joinTypeStr, leftTableNum, leftColumnNum,
                    rightTableNum, rightColumnNum) {
   
    switch (joinTypeStr) {
    case ("Inner Join"):
        joinType = OperatorsOpT.OperatorsInnerJoin;
        break;
    default:
        console.log("Incorrect join type!");
        break;
    }

    var leftName = gTables[leftTableNum].backTableName;
    var joinType = "";
    var leftColName =
                    gTables[leftTableNum].tableCols[leftColumnNum].func.args[0];
    var leftIndexColName = XcalarGetNextPage(gTables[leftTableNum].resultSetId,
                           1).keysAttrHeader.name;
    if (leftColName != leftIndexColName) {
        console.log("left not indexed correctly");
        // XXX In the future, we can check if there are other tables that are
        // indexed on this key. But for now, we reindex a new table
        var rand = Math.floor((Math.random() * 100000) + 1);
        var newTableName1 = leftName+rand;
        XcalarIndexFromTable(gTables[leftTableNum].backTableName, leftColName,
                             newTableName1);
        leftName = newTableName1;
        checkStatusLite(newTableName1, joinTables2, [newTableName, joinTypeStr,
                       leftTableNum, leftName, rightTableNum, rightColumnNum]);
    } else {
        console.log("left indexed correctly");
        joinTables2([newTableName, joinTypeStr, leftTableNum, leftName,
                     rightTableNum, rightColumnNum]);
    }
}

function joinTables2(args) {
    var newTableName = args[0];
    var joinTypeStr = args[1];
    var leftTableNum = args[2];
    var leftName = args[3];
    var rightTableNum = args[4];
    var rightColumnNum = args[5];
    
    var rightColName =
                  gTables[rightTableNum].tableCols[rightColumnNum].func.args[0];
    var rightIndexColName = XcalarGetNextPage(gTables[rightTableNum]
                           .resultSetId, 1).keysAttrHeader.name;
    var rightName = gTables[rightTableNum].backTableName;   
    if (rightColName != rightIndexColName) {
        console.log("right not indexed correctly");
        var rand = Math.floor((Math.random() * 100000) + 1);
        var newTableName2 = gTables[rightTableNum].backTableName+rand;
        XcalarIndexFromTable(gTables[rightTableNum].backTableName,
                             rightColName, newTableName2);
        rightName = newTableName2;
        checkStatusLite(newTableName2, joinTables3, [newTableName, joinTypeStr,
                       leftTableNum, leftName, rightTableNum, rightName]);
    } else {
        console.log("right correctly indexed");
        joinTables3([newTableName, joinTypeStr, leftTableNum, leftName,
                     rightTableNum, rightName]);
    }
}

function joinTables3(args) {
    var newTableName = args[0];
    var joinTypeStr = args[1];
    var leftTableNum = args[2];
    var leftName = args[3];
    var rightTableNum = args[4];
    var rightName = args[5];
    
    var newTableCols = createJoinIndex(rightTableNum, leftTableNum);
    setIndex(newTableName, newTableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
        '{cursor: wait !important;}</style>');
    XcalarJoin(leftName, rightName, newTableName);
    checkStatus(newTableName, leftTableNum, KeepOriginalTables.DontKeep,
                rightTableNum);
    $('#waitCursor').remove();
}
