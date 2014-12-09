function freeAllResultSets() {
    XcalarSetFree(gResultSetId);    
}

function goToPage(pageNumber, direction, tableNum) {
    // deselectPage(gCurrentPageNumber);
    if (pageNumber > gNumPages) {
        console.log("Already at last page!");
        return;
    }
    if (pageNumber < 1) {
        console.log("Cannot go below one!");
        return;
    }
    gCurrentPageNumber = pageNumber;
    var shift = numPagesToShift(direction);
    XcalarSetAbsolute(gResultSetId, (pageNumber-shift)*gNumEntriesPerPage);
    getPage(gResultSetId, null, direction, tableNum);
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

function getNextPage(resultSetId, firstTime, tableNum) {
    if (resultSetId == 0) {
        return;
    }
    gCurrentPageNumber++;
    getPage(resultSetId, firstTime, null, tableNum);
}

function getPage(resultSetId, firstTime, direction, tableNum) {
    console.log('made it to getpage')
    if (resultSetId == 0) {
        return;
        // Reached the end
    }
    var tdHeights = getTdHeights();
    var tableOfEntries = XcalarGetNextPage(resultSetId,
                                           gNumEntriesPerPage);
    if (tableOfEntries.kvPairs.numRecords < gNumEntriesPerPage) {
        // This is the last iteration
        // Time to free the handle
        // XXX: Function call to free handle?
        resultSetId = 0;
    }
    var shift = numPagesToShift(direction);
    var indexNumber = (gCurrentPageNumber-shift) * gNumEntriesPerPage;
    var numRows = Math.min(gNumEntriesPerPage,
                           tableOfEntries.kvPairs.numRecords);
    var rowTemplate = createRowTemplate(tableNum);
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
        if (firstTime) {
            generateFirstScreen(value, indexNumber+i, tableNum, tdHeights[i]);
        } else {
            generateRowWithCurrentTemplate(value, indexNumber+index, 
                                            rowTemplate, direction, tableNum);        
        }
    }
    console.log(firstTime, 'firstTime');

    if (firstTime && !getIndex(gTableName)) {
        gKeyName = tableOfEntries.keysAttrHeader.name;
        // We cannot rely on addCol to create a new progCol object because
        // add col relies on gTableCol entry to determine whether or not to add
        // the menus specific to the main key
        var newProgCol = new ProgCol();
        newProgCol.index = 1;
        newProgCol.isDark = false;
        newProgCol.name = gKeyName;
        newProgCol.func.func = "pull";
        newProgCol.func.args = [gKeyName];
        newProgCol.userStr = '"' + gKeyName + '" = pull('+gKeyName+')';
        insertColAtIndex(0, tableNum, newProgCol);
        addCol("col0", "autoGenTable"+tableNum, gKeyName, {progCol: newProgCol}); 
        newProgCol = new ProgCol();
        newProgCol.index = 2;
        newProgCol.name = "DATA";
        newProgCol.width = gNewCellWidth; // XXX FIXME Grab from CSS
        newProgCol.func.func = "raw";
        newProgCol.func.args = [];
        newProgCol.userStr = '"DATA" = raw()';
        newProgCol.isDark = false;
        insertColAtIndex(1, tableNum, newProgCol);
    }
    for (var i = 0; i<gTableCols[tableNum].length; i++) {
        if (gTableCols[tableNum][i].name == "DATA") {
            // We don't need to do anything here because if it's the first time
            // they won't have anything stored. If it's not the first time, the
            // column would've been sized already. If it's indexed, we
            // would've sized it in CatFunction
        } else {
            if (firstTime && !getIndex(gTableName)) {
                execCol(gTableCols[tableNum][i], tableNum);
            } else { 

                if (direction) { 
                    var startingIndex;
                    if (direction == 1) {
                        startingIndex = parseInt($('#autoGenTable'+tableNum+
                                        ' tbody tr:first')
                                        .attr('class').substring(3));
                    } else {
                        var tr = $('#autoGenTable'+tableNum+
                                ' tr:nth-last-child('+gNumEntriesPerPage+')');
                        startingIndex = parseInt(tr.attr('class').substring(3));
                    }
                    var execColArgs = {};
                    execColArgs.startIndex = startingIndex;
                    execColArgs.numberofRows = numRows;
                    execCol(gTableCols[tableNum][i], tableNum, execColArgs);
                } else {
                    execCol(gTableCols[tableNum][i], tableNum);
                }
                if (gTableCols[tableNum][i].name == gKeyName) {
                    // autosizeCol($('#autoGenTable0 th.col'+(gTableCols[i].index)));
                }
            }
        }
    }
    $('.colGrab').height($('#autoGenTableWrap0').height());
    var idColWidth = getTextWidth($('#autoGenTable'+tableNum+' tr:last td:first'));
    var newWidth = Math.max(idColWidth, 24);
    $('#autoGenTable'+tableNum+' th:first-child').width(newWidth+14);
    matchHeaderSizes(tableNum);
    alignMultipleTableHeaders();
}