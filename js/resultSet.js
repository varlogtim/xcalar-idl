function freeAllResultSets() {
    // var promises = [];
    // XXX use promise is not reliable to send all reqeust to backend
    for (var i = 0; i < gTables.length; i++) {
        // promises.push(XcalarSetFree.bind(this, gTables[i].resultSetId));
        XcalarSetFree(gTables[i].resultSetId);
    }

    for (var i = 0; i < gHiddenTables.length; i ++) {
        // promises.push(XcalarSetFree.bind(this, gHiddenTables[i].resultSetId));
        XcalarSetFree(gHiddenTables[i].resultSetId);
    }

    // Free datasetBrowser resultSetId
    if (gDatasetBrowserResultSetId != 0) {
        XcalarSetFree(gDatasetBrowserResultSetId);
    }
    // return (chain(promises));
}

function freeAllResultSetsSync() {
    var promises = [];

    for (var i = 0; i < gTables.length; i++) {
        promises.push(XcalarSetFree.bind(this, gTables[i].resultSetId));
    }

    for (var i = 0; i < gHiddenTables.length; i ++) {
        promises.push(XcalarSetFree.bind(this, gHiddenTables[i].resultSetId));
    }

    // Free datasetBrowser resultSetId
    if (gDatasetBrowserResultSetId != 0) {
        promises.push(XcalarSetFree.bind(this, gDatasetBrowserResultSetId));
    }

    return (chain(promises));
}
 magic = 100;
// function goToPage(pageNumber, direction, tableNum, skipToRow) {
function goToPage(rowNumber, numRowsToAdd, direction, tableNum, loop, info) {
    // rowNumber is checked for validity before calling goToPage()
    var info = info || {};
    var deferred = jQuery.Deferred();
    if (rowNumber >= gTables[tableNum].resultSetMax) {
        console.log("Already at last page!");
        return (promiseWrapper(null));
    }

    var rowPosition = rowNumber;
    if (rowPosition < 0) {
        numRowsToAdd += rowPosition;
        rowPosition = 0;
    }

    var prepullTableHeight;
    var numRowsBefore;

    XcalarSetAbsolute(gTables[tableNum].resultSetId, rowPosition)
    .then(function(){
        return (generateDataColumnJson(gTables[tableNum].resultSetId,
                                 null, tableNum, false, numRowsToAdd));
    })
    .then(function(jsonData) {
        var deferred2 = jQuery.Deferred();
        $table = $('#xcTable'+tableNum);
        prepullTableHeight = $table.height();
        // var rand = Math.random()* 100;
       
        // if (magic < 90) {
        //     if (rand < 95) {
        //         jsonData = [];
        //     }
            
        // }
        info.numRowsAdded += jsonData.length;
        var numRowsLacking = numRowsToAdd - jsonData.length;
        var position = rowNumber + jsonData.length;
        numRowsBefore = $table.find('tbody tr').length;

        pullRowsBulk(tableNum, jsonData, rowPosition, null, direction);
        var numRowsStillNeeded = info.numRowsToAdd - info.numRowsAdded;
        if (numRowsStillNeeded > 0) {
            info.looped = true;
            if (direction == RowDirection.Bottom) {
                if (position < gTables[tableNum].resultSetMax - 1) {
                    var newRowToGoTo = 
                        Math.min(position+1, gTables[tableNum].resultSetMax);
                    var numRowsToFetch = 
                        Math.min(numRowsStillNeeded, 
                                (gTables[tableNum].resultSetMax -
                                 newRowToGoTo));
                    return (goToPage(newRowToGoTo, numRowsToFetch, 
                            direction, tableNum, true, info));
                } else if (info.bulk) {
                    var newRowToGoTo = (info.targetRow - info.numRowsToAdd) - 
                                        numRowsStillNeeded;

                    numRowsStillNeeded = Math.min(info.targetRow - 
                                        info.numRowsToAdd, numRowsStillNeeded);
                    info.targetRow = newRowToGoTo;
                    if (!info.reverseLooped) {
                        gTables[tableNum].resultSetMax = jsonData.length + 
                                                         rowPosition;
                        gTables[tableNum].currentRowNumber = 
                                            gTables[tableNum].resultSetMax;
                        var numRowsToRemove = $table.find("tbody tr").length -
                                              info.numRowsAdded;
                        $table.find("tbody tr").slice(0, numRowsToRemove)
                                               .remove();
                    }
                    info.reverseLooped = true;
                    return (goToPage(newRowToGoTo, numRowsStillNeeded, 
                            RowDirection.Top, tableNum, true, info));
                } else {
                    deferred2.resolve();
                    return (deferred2.promise());
                }
            } else {
                var newRowToGoTo = position+1;
                var numRowsToFetch = numRowsLacking - 1;
                if (numRowsToFetch <= 0) {
                    var firstRow = $table.find('tbody tr:first');
                    var topRowNum = parseInt(firstRow.attr('class').substr(3));
                    numRowsStillNeeded = 
                                Math.min(numRowsStillNeeded, topRowNum);
                    if (numRowsStillNeeded > 0 && info.targetRow != 0) {
                        info.targetRow -= numRowsStillNeeded;
                        var newRowToGoTo = Math.max(info.targetRow, 0);
                        return (goToPage(newRowToGoTo, numRowsStillNeeded, 
                                direction, tableNum, true, info));
                    } else {
                        deferred2.resolve();
                        return (deferred2.promise());
                    }       
                } else {
                    return (goToPage(newRowToGoTo, numRowsToFetch, 
                                     direction, tableNum, true, info));
                }  
            }
        } else {
            deferred2.resolve();
            return (deferred2.promise());
        }
    }).
    then(function() {
        if (!loop && !info.reverseLooped) {
            removeOldRows($table, tableNum, info, direction, 
                           prepullTableHeight, numRowsBefore, numRowsToAdd);
        } else if (!loop) {
            alert('some rows were too large to be retrieved');
        }
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("goToPage fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}

function removeOldRows($table, tableNum, info, direction, prepullTableHeight, 
                        numRowsBefore, numRowsToAdd) {
    // also handles the scroll position
    var postpullTableHeight = $table.height();
    if (direction == RowDirection.Top) {
        $table.find("tbody tr").slice(60).remove();
        $('#xcTbodyWrap'+tableNum).scrollTop(postpullTableHeight - 
                                             prepullTableHeight);
    } else {
        var preScrollTop = $('#xcTbodyWrap'+tableNum).scrollTop();
        if (info.bulk) {
            var numRowsToRemove = numRowsBefore;
        } else {
            var numRowsToRemove = numRowsToAdd;
        }
        var numRowsNotAdded = info.numRowsToAdd - info.numRowsAdded;
        if (info.numRowsAdded == 0) {
            gTables[tableNum].resultSetMax = info.lastRowToDisplay - 
                                             info.numRowsToAdd;
            gTables[tableNum].currentRowNumber = gTables[tableNum].resultSetMax;
        }
        $table.find("tbody tr").slice(0, info.numRowsAdded).remove();
        var numRows = $table.find('tbody tr').length;
        var numExtraRows = Math.max(0, numRows - 60);
        var postRowRemovalHeight = $table.height();
        var newScrollTop = preScrollTop - (postpullTableHeight -
                                            postRowRemovalHeight);
        $('#xcTbodyWrap'+tableNum).scrollTop(newScrollTop - 1);
    }
    var lastRow = $table.find('tbody tr:last');
    var bottomRowNum = parseInt(lastRow.attr('class').substr(3));
    gTables[tableNum].currentRowNumber = bottomRowNum + 1;
    if (info.looped) {
        alert('some rows were too large to be retrieved');
    }
}

function numPagesToShift(direction) {
    var shift;
    if (direction == 1) {
        shift = 3;// shift 3 if we show 3 'pages' at once
    } else {
        shift = 1;
    }
    return (shift);
}

function resetAutoIndex() {
    gTableRowIndex = 1;
}

function getFirstPage(resultSetId, tableNum, notIndexed) {
    if (resultSetId === 0) {
        return (promiseWrapper(null));
    }
    
    var numPagesToAdd = Math.min(3, gTables[tableNum].numPages);
    var numRowsToAdd = Math.min(60, gTables[tableNum].resultSetCount);
    return (generateDataColumnJson(resultSetId, null, tableNum, notIndexed, 
                                    numRowsToAdd));
}

 // produces an array of all the td values that will go into the DATA column
function generateDataColumnJson(resultSetId, direction, tableNum, notIndexed, 
                                numRowsToFetch) {
    var deferred = jQuery.Deferred();

    if (resultSetId === 0) {
        return (promiseWrapper(null));
    }
    var tdHeights = getTdHeights();
   
    XcalarGetNextPage(resultSetId, numRowsToFetch)
    .then(function(tableOfEntries) {
        var keyName = tableOfEntries.keysAttrHeader.name;
        if (tableOfEntries.kvPairs.numRecords < gNumEntriesPerPage) {
            resultSetId = 0;
        }
        if (notIndexed) {
            ColManager.setupProgCols(tableNum, tableOfEntries);
        }

        var numRows = Math.min(numRowsToFetch,
                               tableOfEntries.kvPairs.numRecords);
        var jsonData = [];
        for (var i = 0; i<numRows; i++) {
            if (direction == 1) {
                var index = numRows-1-i;
            } else {
                var index = i;
            }
            if (tableOfEntries.kvPairs.recordType ==
                GenericTypesRecordTypeT.GenericTypesVariableSize) { 
                var value = tableOfEntries.kvPairs
                            .records[index].kvPairVariable.value;

            } else {
                var value = tableOfEntries.kvPairs.records[index]
                            .kvPairFixed.value;
            }
            jsonData.push(value);
        }

        deferred.resolve(jsonData, keyName);
    })
    .fail(function(error) {
        console.log("generateDataColumnJson fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}
