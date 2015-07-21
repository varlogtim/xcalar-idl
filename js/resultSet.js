function freeAllResultSets() {
    // var promises = [];
    // XXX use promise is not reliable to send all reqeust to backend
    var i;
    for (i = 0; i < gTables.length; i++) {
        // promises.push(XcalarSetFree.bind(this, gTables[i].resultSetId));
        XcalarSetFree(gTables[i].resultSetId);
    }

    for (i = 0; i < gHiddenTables.length; i++) {
        // promises.push(XcalarSetFree.bind(this, gHiddenTables[i].resultSetId));
        XcalarSetFree(gHiddenTables[i].resultSetId);
    }

    // Free datasetBrowser resultSetId
    if (gDatasetBrowserResultSetId !== 0) {
        XcalarSetFree(gDatasetBrowserResultSetId);
    }
    // return (chain(promises));
}

function freeAllResultSetsSync() {
    var promises = [];
    var i, len;

    for (i = 0, len = gTables.length; i < len; i++) {
        promises.push(XcalarSetFree.bind(this, gTables[i].resultSetId));
    }

    for (i = 0, len = gHiddenTables.length; i < len; i++) {
        promises.push(XcalarSetFree.bind(this, gHiddenTables[i].resultSetId));
    }

    // Free datasetBrowser resultSetId
    if (gDatasetBrowserResultSetId !== 0) {
        promises.push(XcalarSetFree.bind(this, gDatasetBrowserResultSetId));
    }

    return (chain(promises));
}

function getResultSet(tableName) {
    return (XcalarMakeResultSetFromTable(tableName));
}

function goToPage(rowNumber, numRowsToAdd, direction, loop, info,
                  rowToPrependTo) {
    // rowNumber is checked for validity before calling goToPage()
    var deferred = jQuery.Deferred();
    info = info || {};
    var tableNum = xcHelper.getTableIndexFromName(info.tableName);
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
    var resultSetId = gTables[tableNum].resultSetId;
    XcalarSetAbsolute(resultSetId, rowPosition)
    .then(function(){
        return (generateDataColumnJson(resultSetId, null, info.tableName,
                                       false, numRowsToAdd));
    })
    .then(function(jsonObj, keyName) {
        var deferred2 = jQuery.Deferred();
        tableNum = xcHelper.getTableIndexFromName(info.tableName);
        var jsonLen   = jsonObj.normal.length;

        var numRowsLacking     = numRowsToAdd - jsonLen;
        var numRowsToIncrement = Math.max(1, jsonLen);

        var position = rowNumber + numRowsToIncrement;

        if (jsonLen === 0) {
            if (!info.missingRows) {
                info.missingRows = [];
            }

            info.missingRows.push(position);
        }

        $table = $('#xcTable' + tableNum);
        prepullTableHeight = $table.height();

        info.numRowsAdded += jsonLen;
        numRowsBefore = $table.find('tbody tr').length;

        pullRowsBulk(tableNum, jsonObj, rowPosition, null,
                     direction, rowToPrependTo);

        var numRowsStillNeeded = info.numRowsToAdd - info.numRowsAdded;

        if (numRowsStillNeeded > 0) {
            showWaitCursor();
            info.looped = true;
            var newRowToGoTo;
            var numRowsToFetch;

            if (direction === RowDirection.Bottom) {
                if (position < gTables[tableNum].resultSetMax) {
                    newRowToGoTo =
                        // Math.min(position + 1, gTables[tableNum].resultSetMax);
                        Math.min(position, gTables[tableNum].resultSetMax);
                    numRowsToFetch =
                        Math.min(numRowsStillNeeded,
                                (gTables[tableNum].resultSetMax -
                                 newRowToGoTo));

                    return (goToPage(newRowToGoTo, numRowsToFetch,
                                     direction, true, info));

                } else if (info.bulk) {
                    newRowToGoTo = (info.targetRow - info.numRowsToAdd) -
                                        numRowsStillNeeded;

                    numRowsStillNeeded = Math.min(info.targetRow -
                                        info.numRowsToAdd, numRowsStillNeeded);
                    info.targetRow = newRowToGoTo;
                    if (!info.reverseLooped) {
                        gTables[tableNum].resultSetMax = jsonLen + rowPosition;
                        gTables[tableNum].currentRowNumber =
                                            gTables[tableNum].resultSetMax;
                        var numRowsToRemove = $table.find("tbody tr").length -
                                              info.numRowsAdded;
                        $table.find("tbody tr").slice(0, numRowsToRemove)
                                               .remove();
                    }
                    info.reverseLooped = true;
                    return (goToPage(newRowToGoTo, numRowsStillNeeded,
                                     RowDirection.Top, true, info));
                } else {
                    deferred2.resolve();
                    return (deferred2.promise());
                }
            } else { // scrolling up
                // var newRowToGoTo = position + 1;
                newRowToGoTo = position;
                numRowsToFetch = numRowsLacking;

                if (numRowsToFetch <= 0) {
                    var firstRow = $table.find('tbody tr:first');
                    var topRowNum = xcHelper.parseRowNum(firstRow);

                    numRowsStillNeeded =
                                Math.min(numRowsStillNeeded, topRowNum);
                    if (numRowsStillNeeded > 0 && info.targetRow !== 0) {
                        info.targetRow -= numRowsStillNeeded;
                        newRowToGoTo = Math.max(info.targetRow, 0);
                        return (goToPage(newRowToGoTo, numRowsStillNeeded,
                                         direction, true, info));
                    } else {
                        deferred2.resolve();
                        return (deferred2.promise());
                    }       
                } else {
                    return (goToPage(newRowToGoTo, numRowsToFetch, direction,
                                     true, info, newRowToGoTo + numRowsToFetch));
                }  
            }
        } else {
            deferred2.resolve();
            return (deferred2.promise());
        }
    })
    .then(function() {
        tableNum = xcHelper.getTableIndexFromName(info.tableName);
        removeWaitCursor();
        moveFirstColumn();
        if (!loop && !info.reverseLooped && !info.dontRemoveRows) {
            removeOldRows($table, tableNum, info, direction,
                            prepullTableHeight, numRowsBefore, numRowsToAdd);
        } else if (!loop && info.missingRows) {
            console.log('some rows were too large to be retrieved, rows: ' +
                        info.missingRows);
        }
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("goToPage fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function removeOldRows($table, tableNum, info, direction, prepullTableHeight,
                        numRowsBefore, numRowsToAdd) {
    // also handles the scroll position
    var scrollTop;
    var postpullTableHeight = $table.height();

    if (direction === RowDirection.Top) {
        $table.find("tbody tr").slice(60).remove();
        scrollTop = Math.max(2, postpullTableHeight - prepullTableHeight);
        $('#xcTbodyWrap' + tableNum).scrollTop(scrollTop);
    } else {
        var preScrollTop = $('#xcTbodyWrap' + tableNum).scrollTop();
        if (info.numRowsAdded === 0) {
            gTables[tableNum].resultSetMax = info.lastRowToDisplay -
                                             info.numRowsToAdd;
            gTables[tableNum].currentRowNumber = gTables[tableNum].resultSetMax;
        }
        $table.find("tbody tr").slice(0, info.numRowsAdded).remove();
        var postRowRemovalHeight = $table.height();
        scrollTop = Math.max(2, preScrollTop - (postpullTableHeight -
                                                    postRowRemovalHeight));
        $('#xcTbodyWrap' + tableNum).scrollTop(scrollTop - 1);
    }

    var lastRow = $table.find('tbody tr:last');
    var bottomRowNum = parseInt(lastRow.attr('class').substr(3));
    gTables[tableNum].currentRowNumber = bottomRowNum + 1;

    if (info.missingRows) {
        console.warn('some rows were too large to be retrieved, rows: ' +
                    info.missingRows);
    }
}


function getFirstPage(resultSetId, tableName, notIndexed) {
    if (resultSetId === 0) {
        return (promiseWrapper(null));
    }
    var tableNum = xcHelper.getTableIndexFromName(tableName);
    var numRowsToAdd = Math.min(60, gTables[tableNum].resultSetCount);
    return (generateDataColumnJson(resultSetId, null, tableName, notIndexed,
                                    numRowsToAdd));
}

 // produces an array of all the td values that will go into the DATA column
function generateDataColumnJson(resultSetId, direction, tableName, notIndexed,
                                numRowsToFetch) {
    var deferred = jQuery.Deferred();
    var jsonObj = {
        "normal" : [],
        "withKey": []
    };

    if (resultSetId === 0) {
        return (promiseWrapper(null));
    }
    if (numRowsToFetch === 0) {
        deferred.resolve(jsonObj);
        return (deferred.promise());
    }

    XcalarGetNextPage(resultSetId, numRowsToFetch)
    .then(function(tableOfEntries) {
        var tableNum = xcHelper.getTableIndexFromName(tableName);
        var keyName = gTables[tableNum].keyName;
        var kvPairs = tableOfEntries.kvPair;
        var numKvPairs = tableOfEntries.numKvPairs;

        if (numKvPairs < gNumEntriesPerPage) {
            resultSetId = 0;
        }
        if (notIndexed) {
            ColManager.setupProgCols(tableNum);
        }

        var numRows     = Math.min(numRowsToFetch, numKvPairs);
        var jsonNormal  = [];
        var jsonWithKey = [];
        var index;
        var key;
        var value;
        var newValue;

        for (var i = 0; i < numRows; i++) {
            index = (direction === 1) ? (numRows - 1 - i) : i;
            key = kvPairs[index].key;
            value = kvPairs[index].value;

            jsonNormal.push(value);
            // remove the last char, which should be "}"
            newValue = value.substring(0, value.length - 1);
            newValue += ',"' + keyName + '_indexed":"' + key + '"}';

            jsonWithKey.push(newValue);
        }

        jsonObj = {
            "normal" : jsonNormal,
            "withKey": jsonWithKey
        };

        deferred.resolve(jsonObj, keyName);
    })
    .fail(function(error) {
        console.error("generateDataColumnJson fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}
