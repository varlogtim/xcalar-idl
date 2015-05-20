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

function goToPage(pageNumber, direction, tableNum, skipToRow) {
    // pageNumber is checked for validity before calling goToPage()
    var deferred = jQuery.Deferred();
    if (pageNumber > gTables[tableNum].numPages) {
        console.log("Already at last page!");
        return (promiseWrapper(null));
    }
    if (pageNumber < 1) {
        console.log("Cannot go below one!");
        return (promiseWrapper(null));
    }
    gTables[tableNum].currentPageNumber = pageNumber;

    if (skipToRow) {
        var numPagesToAdd = 3;
        gTables[tableNum].currentPageNumber = pageNumber+2;
    } else {
        var numPagesToAdd = 1;
        gTables[tableNum].currentPageNumber = pageNumber;
    }
    
    var shift = numPagesToShift(direction);
    var position = (pageNumber - shift) * gNumEntriesPerPage;

    XcalarSetAbsolute(gTables[tableNum].resultSetId, position)
    .then(function(){
        return (generateDataColumnJson(gTables[tableNum].resultSetId,
                                 null, tableNum, false, numPagesToAdd));
    })
    .then(function(jsonData) {
        if (skipToRow) {
            $('#xcTable'+tableNum).find('tbody').empty();
        }
        pullRowsBulk(tableNum, jsonData, position, null, direction);
        
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("goToPage fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
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
    gTables[tableNum].currentPageNumber = numPagesToAdd;
    return (generateDataColumnJson(resultSetId, null, tableNum, notIndexed, 
                                    numPagesToAdd));
}

 // produces an array of all the td values that will go into the DATA column
function generateDataColumnJson(resultSetId, direction, tableNum, notIndexed, 
                                numPages) {
    var deferred = jQuery.Deferred();

    if (resultSetId === 0) {
        return (promiseWrapper(null));
    }
    var tdHeights = getTdHeights();
    var numRowsToFetch = numPages * gNumEntriesPerPage;
   
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
