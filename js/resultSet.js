function freeAllResultSets() {
    var promises = [];
    var gTablesLen = gTables.length;
    for (var i = 0; i < gTablesLen; i++) {
        promises.push(XcalarSetFree(gTables[i].resultSetId));
    }

    var gHiddenTablesLen = gHiddenTables.length;
    for (var i = 0; i < gHiddenTablesLen; i ++) {
        promises.push(XcalarSetFree(gHiddenTables[i].resultSetId));
    }

    return (jQuery.when.apply(jQuery, promises));
}

function goToPage(pageNumber, direction, tableNum) {
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
    var shift = numPagesToShift(direction);
    var position = (pageNumber - shift) * gNumEntriesPerPage;

    XcalarSetAbsolute(gTables[tableNum].resultSetId, position)
    .then(function(){
        return (generateDataColumnJson(gTables[tableNum].resultSetId,
                                 true, null, tableNum));
    })
    .done(function(jsonData) {
        var startingIndex;
        var $tableBody = $('#xcTable' + tableNum).find('tbody');
        if ($tableBody.children().length === 0) {
            startingIndex = position;
        } else {
            if (direction === 1) {
                startingIndex = parseInt($tableBody.find('tr:first')
                                                   .attr('class')
                                                   .substring(3)) 
                                - jsonData.length;
            } else {
                startingIndex = parseInt($tableBody.find('tr:last')
                                                   .attr('class')
                                                   .substring(3)) + 1;
            }
        }
        
        pullRowsBulk(tableNum, jsonData, startingIndex, null, direction);
        
        deferred.resolve();
    });

    return (deferred.promise());
}

function numPagesToShift(direction) {
    var shift;
    if (direction == 1) {
        shift = 4;// shift 4 if we show 3 'pages' at once
    } else {
        shift = 1;
    }
    return (shift);
}

function resetAutoIndex() {
    gTableRowIndex = 1;
}

function getNextPage(resultSetId, firstTime, tableNum, notIndexed) {
    if (resultSetId === 0) {
        return (promiseWrapper(null));
    }
    gTables[tableNum].currentPageNumber++;
    
    return (generateDataColumnJson(resultSetId, firstTime, 
                                   null, tableNum, notIndexed));
}

function generateDataColumnJson(resultSetId, firstTime, 
                                direction, tableNum, notIndexed) {
    var deferred = jQuery.Deferred();
    // produces an array of all the td values that will go into the DATA column
    if (resultSetId === 0) {
        return (promiseWrapper(null));
    }
    var tdHeights = getTdHeights();

    XcalarGetNextPage(resultSetId, gNumEntriesPerPage)
    .done(function(tableOfEntries) {
        // console.log(tableOfEntries, 'gendatacolumnjson');
        if (tableOfEntries.kvPairs.numRecords < gNumEntriesPerPage) {
            resultSetId = 0;
        }
        if (notIndexed) {
            setupProgCols(tableNum, tableOfEntries);
        }
        var shift = numPagesToShift(direction);
        var indexNumber = (gTables[tableNum].currentPageNumber-shift) *
                          gNumEntriesPerPage;
        var numRows = Math.min(gNumEntriesPerPage,
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

        deferred.resolve(jsonData);
    });

    return (deferred.promise());
}


function setupProgCols(tableNum, tableOfEntries) {
    gTables[tableNum].keyName = tableOfEntries.keysAttrHeader.name;
    // We cannot rely on addCol to create a new progCol object because
    // add col relies on gTableCol entry to determine whether or not to add
    // the menus specific to the main key
    var newProgCol = new ProgCol();
    newProgCol.index = 1;
    newProgCol.isDark = false;
    newProgCol.width = gNewCellWidth;
    newProgCol.name = gTables[tableNum].keyName;
    newProgCol.func.func = "pull";
    newProgCol.func.args = [gTables[tableNum].keyName];
    newProgCol.userStr = '"' + gTables[tableNum].keyName +
                         '" = pull('+gTables[tableNum].keyName+')';
    insertColAtIndex(0, tableNum, newProgCol);
    //is this where we add the indexed column??

    newProgCol = new ProgCol();
    newProgCol.index = 2;
    newProgCol.name = "DATA";
    newProgCol.width = 500; // XXX FIXME Grab from CSS
    newProgCol.func.func = "raw";
    newProgCol.func.args = [];
    newProgCol.userStr = '"DATA" = raw()';
    newProgCol.isDark = false;
    insertColAtIndex(1, tableNum, newProgCol);
}
