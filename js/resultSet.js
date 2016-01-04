function freeAllResultSets() {
    // var promises = [];
    // Note from Cheng: use promise is not reliable to send all reqeust to backend
    var table;
    for (table in gTables) {
        XcalarSetFree(gTables[table].resultSetId);
    }

    // Free datasetBrowser resultSetId
    if (gDatasetBrowserResultSetId !== 0) {
        XcalarSetFree(gDatasetBrowserResultSetId);
    }

    // return (chain(promises));
}

function freeAllResultSetsSync() {
    var deferred = jQuery.Deferred();
    var promises = [];
    var tableNames = {};

    // if table does not exist and free the resultSetId, it crash the backend

    // check backend table name to see if it exists
    XcalarGetTables()
    .then(function(results) {
        var tables = results.nodeInfo;
        for (var i = 0, len = results.numNodes; i < len; i++) {
            tableNames[tables[i].name] = true;
        }

        for (table in gTables) {
            if (!tableNames.hasOwnProperty(gTables.tableName)) {
                continue;
            }
            promises.push(XcalarSetFree.bind(this, gTables[i].resultSetId));
        }

        // Free datasetBrowser resultSetId
        if (gDatasetBrowserResultSetId !== 0) {
            promises.push(XcalarSetFree.bind(this, gDatasetBrowserResultSetId));
        }

        return (chain(promises));

    })
    .then(deferred.resolve)
    .fail(function(error) {
        console.error(error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function getResultSet(tableName) {
    return (XcalarMakeResultSetFromTable(tableName));
}

function goToPage(rowNumber, numRowsToAdd, direction, loop, info,
                  rowToPrependTo) {
    // rowNumber is checked for validity before calling goToPage()
    var deferred = jQuery.Deferred();
    info = info || {};

    var tableId = info.tableId;
    var table = gTables[tableId];
    var $table;

    if (rowNumber >= table.resultSetMax) {
        console.log("Already at last page!");
        return (promiseWrapper(null));
    }

    var rowPosition = rowNumber;
    if (rowPosition < 0) {
        numRowsToAdd += rowPosition;
        rowPosition = 0;
    }

    var prepullTableHeight;
    // var numRowsBefore;
    var resultSetId = table.resultSetId;
    gIsTableScrolling = true;

    XcalarSetAbsolute(resultSetId, rowPosition)
    .then(function(){
        return (generateDataColumnJson(table, null, false, numRowsToAdd));
    })
    .then(function(jsonObj, keyName) {
        var deferred2 = jQuery.Deferred();
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

        $table = $("#xcTable-" + tableId);
        prepullTableHeight = $table.height();

        info.numRowsAdded += jsonLen;
        // numRowsBefore = $table.find('tbody tr').length;

        pullRowsBulk(tableId, jsonObj, rowPosition, null,
                     direction, rowToPrependTo);

        var numRowsStillNeeded = info.numRowsToAdd - info.numRowsAdded;

        if (numRowsStillNeeded > 0) {
            showWaitCursor();
            info.looped = true;
            var newRowToGoTo;
            var numRowsToFetch;

            if (direction === RowDirection.Bottom) {
                if (position < table.resultSetMax) {
                    newRowToGoTo = Math.min(position, table.resultSetMax);
                    numRowsToFetch = Math.min(numRowsStillNeeded,
                                        (table.resultSetMax - newRowToGoTo));

                    return (goToPage(newRowToGoTo, numRowsToFetch,
                                     direction, true, info));

                } else if (info.bulk) {
                    newRowToGoTo = (info.targetRow - info.numRowsToAdd) -
                                        numRowsStillNeeded;

                    numRowsStillNeeded = Math.min(info.targetRow -
                                        info.numRowsToAdd, numRowsStillNeeded);
                    info.targetRow = newRowToGoTo;
                    if (!info.reverseLooped) {
                        table.resultSetMax = jsonLen + rowPosition;
                        table.currentRowNumber = table.resultSetMax;
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
        removeWaitCursor();
        moveFirstColumn();
        if (!loop && !info.reverseLooped && !info.dontRemoveRows) {
            removeOldRows($table, tableId, info, direction, prepullTableHeight);
        } else if (!loop && info.missingRows) {
            console.log('some rows were too large to be retrieved, rows: ' +
                        info.missingRows);
        }
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("goToPage fails!", error);
        deferred.reject(error);
    })
    .always(function() {
        gIsTableScrolling = false;
    });

    return (deferred.promise());
}

function removeOldRows($table, tableId, info, direction, prepullTableHeight) {
    // also handles the scroll position
    var scrollTop;
    var postpullTableHeight = $table.height();
    var $xcTbodyWrap = $('#xcTbodyWrap-' + tableId);
    var table = gTables[tableId];

    if (direction === RowDirection.Top) {
        $table.find("tbody tr").slice(gMaxEntriesPerPage).remove();
        scrollTop = Math.max(2, postpullTableHeight - prepullTableHeight);

        $xcTbodyWrap.scrollTop(scrollTop);
    } else {
        var preScrollTop = $xcTbodyWrap.scrollTop();
        if (info.numRowsAdded === 0) {
            table.resultSetMax = info.lastRowToDisplay - info.numRowsToAdd;
            table.currentRowNumber = table.resultSetMax;
        }
        $table.find("tbody tr").slice(0, info.numRowsAdded).remove();
        var postRowRemovalHeight = $table.height();
        scrollTop = Math.max(2, preScrollTop - (postpullTableHeight -
                                                    postRowRemovalHeight));
        $xcTbodyWrap.scrollTop(scrollTop - 1);
    }

    var lastRow = $table.find('tbody tr:last');
    var bottomRowNum = parseInt(lastRow.attr('class').substr(3));
    table.currentRowNumber = bottomRowNum + 1;

    if (info.missingRows) {
        console.warn('some rows were too large to be retrieved, rows: ' +
                    info.missingRows);
    }
}


function getFirstPage(table, notIndexed) {
    if (table.resultSetId === 0) {
        return (promiseWrapper(null));
    }
    var numRowsToAdd = Math.min(gMaxEntriesPerPage, table.resultSetCount);
    return (generateDataColumnJson(table, null, notIndexed, numRowsToAdd));
}

 // produces an array of all the td values that will go into the DATA column
function generateDataColumnJson(table, direction, notIndexed, numRowsToFetch) {
    var deferred = jQuery.Deferred();
    var jsonObj = {
        "normal" : [],
        "withKey": []
    };

    if (table.resultSetId === 0) {
        return (promiseWrapper(null));
    }
    if (numRowsToFetch === 0) {
        deferred.resolve(jsonObj);
        return (deferred.promise());
    }

    XcalarGetNextPage(table.resultSetId, numRowsToFetch)
    .then(function(tableOfEntries) {
        var tableId = table.tableId;
        var keyName = table.keyName;
        var kvPairs = tableOfEntries.kvPair;
        var numKvPairs = tableOfEntries.numKvPairs;

        if (numKvPairs < gNumEntriesPerPage) {
            resultSetId = 0;
        }
        if (notIndexed) {
            ColManager.setupProgCols(tableId);
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
