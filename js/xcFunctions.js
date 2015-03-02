var tempCountShit = 0;
// XXX: Dedupe with checkLoad!!!!
function checkStatus(newTableName, tableNum, keepOriginal,
                     additionalTableNum) {
    var deferred = jQuery.Deferred();

    (function internalCheckStatus() {
        tempCountShit++;
        var refCount = XcalarGetTableRefCount(newTableName);
        console.log(refCount);
        if (refCount == 1 || tempCountShit > 20) {
            tempCountShit = 0;
            refreshTable(newTableName, tableNum, 
                         keepOriginal, additionalTableNum)
            .done(function() {
                deferred.resolve();
            });
        } else {
            console.log(refCount);
            // Check twice per second
            setTimeout(function() {
                internalCheckStatus();
            }, 500);
        }
    })();

    return (deferred.promise());
}

function refreshTable(newTableName, tableNum, 
                      keepOriginal, additionalTableNum) {
    var deferred = jQuery.Deferred();

    $('#dagPanel').addClass('hidden');
    $("#workspaceTab").trigger('click');
    var newTableNum;
    if (keepOriginal === KeepOriginalTables.Keep) {
        // append newly created table to the back
        newTableNum = gTables.length;
        addTable(newTableName, newTableNum, AfterStartup.After)
        .done(function() {
            var leftPos = $('#xcTableWrap'+newTableNum).position().left +
                            $('#mainFrame').scrollLeft();
            $('#mainFrame').animate({scrollLeft: leftPos});
            $("body").css({"cursor": "default"});
            $('#waitCursor').remove();
            deferred.resolve();
        });
    } else {
        // default
        newTableNum = tableNum;
        var savedScrollLeft;
        if (additionalTableNum > -1) {
            var largerTableNum = Math.max(additionalTableNum, tableNum);
            var smallerTableNum = Math.min(additionalTableNum, tableNum);
            archiveTable(largerTableNum, DeleteTable.Keep);
            archiveTable(smallerTableNum, DeleteTable.Keep);
            if (newTableNum > gTables.length) {
                // edge case
                newTableNum = gTables.length;
            }
        } else {
            savedScrollLeft = $('#mainFrame').scrollLeft();
            archiveTable(tableNum, DeleteTable.Keep);
        }
        addTable(newTableName, newTableNum, AfterStartup.After)
        .done(function() {
            if (savedScrollLeft) {
                $('#mainFrame').scrollLeft(savedScrollLeft);
            } 
            $("body").css({"cursor": "default"});
            $('#waitCursor').remove();
            deferred.resolve();
        });
    }

    return (deferred.promise());
}

function checkStatusLite(name, funcPtr, args) {
    var deferred = jQuery.Deferred();

    (function internalCheckStatusLite() {
        tempCountShit++;
        if ([null, undefined].indexOf(tHandle) !== -1) {
            return (promiseWrapper(null));
        }
        var refCount = XcalarGetTableRefCount(name);
        if (refCount == 1 || tempCountShit > 20) {
            tempCountShit = 0;
            funcPtr(args);

            deferred.resolve();
        } else {
            setTimeout(function() {
                internalCheckStatusLite();
            }, 500);
        }
    })();

    return (deferred.promise());
}

function checkLoadStatus(name) {
    var deferred = jQuery.Deferred();

    if ([null, undefined].indexOf(tHandle) !== -1) {
        return promiseWrapper(null);
    }

    (function internalCheckLoadStatus(secondCall) {
        xcalarListDatasets(tHandle)
        .done(function(dsList) {
            var dsFound = false;
            for (var i = 0; i < dsList.numDatasets; i++) {
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
                            internalCheckLoadStatus(true);
                        }, 1000);
                    }
                }
            }
            deferred.resolve(dsFound);
        });
    })(false);

    return (deferred.promise());  
}

function sortRows(index, tableNum, order) {
    console.log(arguments);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempSortTable"+rand;
    var srcTableName = gTables[tableNum].frontTableName; 
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

    // add cli
    var cliOptions = {};
    cliOptions.operation = 'sort';
    cliOptions.tableName = srcTableName;
    cliOptions.key = fieldName;
    cliOptions.newTableName = newTableName;
    if (order == SortDirection.Forward) {
        cliOptions.direction = 'ASC';
    } else {
        cliOptions.direction = "DESC";
    }

    XcalarIndexFromTable(srcTableName, fieldName, newTableName);
    refreshTable(newTableName, tableNum, KeepOriginalTables.DontKeep)
    .done(function() {
        addCli('Sort Table', cliOptions);
    });
}

function mapColumn(fieldName, mapString, tableNum) {
    var deferred = jQuery.Deferred();

    $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
        '{cursor: wait !important;}</style>');
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempMapTable"+rand;
    setIndex(newTableName, gTables[tableNum].tableCols);
    commitToStorage(); 
    XcalarMap(fieldName, mapString, 
        gTables[tableNum].frontTableName, newTableName);
    refreshTable(newTableName, tableNum)
    .done(function() {
        deferred.resolve();
    });

    return (deferred.promise());
}

function groupByCol(operator, newColName, colid, tableNum) {
    var deferred = jQuery.Deferred();

    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempGroupByTable"+rand;
    var srcTableName = gTables[tableNum].frontTableName
    var fieldName = gTables[tableNum].tableCols[colid - 1].name;
    // TODO Create new gTables entry
    // setIndex(newTableName, newTableCols);
    // commitToStorage();

    // add cli
    var cliOptions = {};
    cliOptions.operation = 'groupBy';
    cliOptions.tableName = srcTableName;
    cliOptions.colName = fieldName;
    cliOptions.colIndex = colid;
    cliOptions.operator = operator;
    cliOptions.newTableName = newTableName;
    cliOptions.newColumnName = newColName;

    $("body").css({"cursor": "wait"});

    XcalarGroupBy(operator, newColName, fieldName, srcTableName, newTableName)
    .then(refreshTable(newTableName, tableNum, KeepOriginalTables.Keep))
    .done(function() {
        addCli('Group By', cliOptions);
        deferred.resolve();
    });

    return (deferred.promise());
}

function filterCol(operator, value, colid, tableNum) {
    var deferred = jQuery.Deferred();

    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempFilterTable"+rand;
    var srcTableName = gTables[tableNum].frontTableName;
    var colName = gTables[tableNum].tableCols[colid - 1].name;
    // add cli
    var cliOptions = {};
    cliOptions.operation = 'filter';
    cliOptions.tableName = srcTableName;
    cliOptions.colName = colName;
    cliOptions.colIndex = colid;
    cliOptions.operator = operator;
    cliOptions.value = value;
    cliOptions.newTableName = newTableName;

    setIndex(newTableName, gTables[tableNum].tableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"});
    console.log(colid); 

    XcalarFilter(operator, value, colName, srcTableName, newTableName)
    .done(function(){
        refreshTable(newTableName, tableNum)
        .done(function() {
            addCli('Filter Table', cliOptions);
            deferred.resolve();
        });
    });
    
    return (deferred.promise());
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
    var deferred = jQuery.Deferred();
   
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
    
    XcalarGetNextPage(gTables[leftTableNum].resultSetId, 1)
    .then(function(result) {
        var leftIndexColName = result.keysAttrHeader.name;

        if (leftColName != leftIndexColName) {
            console.log("left not indexed correctly");
            // XXX In the future, we can check if there are other tables that are
            // indexed on this key. But for now, we reindex a new table
            var rand = Math.floor((Math.random() * 100000) + 1);
            var newTableName1 = leftName+rand;
            XcalarIndexFromTable(gTables[leftTableNum].backTableName, leftColName,
                                 newTableName1);
            leftName = newTableName1;
            return (checkStatusLite(newTableName1, joinTables2, [newTableName,
                                    joinTypeStr, leftTableNum, leftName,
                                    rightTableNum, rightColumnNum]));
        } else {
            console.log("left indexed correctly");
            return (joinTables2([newTableName, joinTypeStr, leftTableNum, 
                                 leftName, rightTableNum, rightColumnNum]));
        }
    })
    .done(deferred.resolve);

    return (deferred.promise());
}

function joinTables2(args) {
    var deferred = jQuery.Deferred();

    var newTableName = args[0];
    var joinTypeStr = args[1];
    var leftTableNum = args[2];
    var leftName = args[3];
    var rightTableNum = args[4];
    var rightColumnNum = args[5];
    
    var rightColName =
                  gTables[rightTableNum].tableCols[rightColumnNum].func.args[0];
    

    XcalarGetNextPage(gTables[rightTableNum].resultSetId, 1)
    .then(function(result) {
        var rightIndexColName = result.keysAttrHeader.name;

        var rightName = gTables[rightTableNum].backTableName;   
        if (rightColName != rightIndexColName) {
            console.log("right not indexed correctly");
            var rand = Math.floor((Math.random() * 100000) + 1);
            var newTableName2 = gTables[rightTableNum].backTableName+rand;
            XcalarIndexFromTable(gTables[rightTableNum].backTableName,
                                 rightColName, newTableName2);
            rightName = newTableName2;
            return (checkStatusLite(newTableName2, joinTables3, [newTableName,
                                    joinTypeStr, leftTableNum, leftName,
                                    rightTableNum, rightName]));
        } else {
            console.log("right correctly indexed");
            return (joinTables3([newTableName, joinTypeStr, leftTableNum, 
                                 leftName, rightTableNum, rightName]));
        }
    })
    .done(deferred.resolve);

    return (deferred.promise());
}

function joinTables3(args) {
    var deferred = jQuery.Deferred();

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

    XcalarJoin(leftName, rightName, newTableName)
    .then(refreshTable(newTableName, leftTableNum, 
                       KeepOriginalTables.DontKeep, rightTableNum))
    .done(function() {
        $('#waitCursor').remove();
        deferred.resolve();
    });

    return (deferred.promise());
}
