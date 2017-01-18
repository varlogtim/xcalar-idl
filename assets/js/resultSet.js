function freeAllResultSets() {
    // var promises = [];
    // Note from Cheng: use promise is not reliable to send all reqeust to backend
    for (var tableId in gTables) {
        gTables[tableId].freeResultset();
    }

    // Free datasetBrowser resultSetId
    DS.release();
}

function freeAllResultSetsSync(alwaysResolve) {
    var deferred = jQuery.Deferred();
    var promises = [];

    // if table does not exist and free the resultSetId, it crash the backend

    // check backend table name to see if it exists
    xcHelper.getBackTableSet()
    .then(function(backTableSet) {
        for (var tableId in gTables) {
            var table = gTables[tableId];
            var tableName = table.getName();

            if (!backTableSet.hasOwnProperty(tableName)) {
                console.error("Table not in backend!");
                continue;
            }

            promises.push(table.freeResultset.bind(table));
        }

        // Free datasetBrowser resultSetId
        promises.push(DS.release.bind(this));
        return PromiseHelper.chain(promises);
    })
    .then(deferred.resolve)
    .fail(function(error) {
        console.error(error);
        if (alwaysResolve) {
            deferred.resolve();
        } else {
            deferred.reject(error);
        }
    });

    return (deferred.promise());
}

// rowNumber is the row number we're starting from
// if our table has rows 0-60 and we're scrolling downwards, rowNumber = 60
// if our table has rows 60-120 and we're scrolling upwards, rowNumber = 40
// if we're fetching 20 rows
function goToPage(rowNumber, numRowsToAdd, direction, info, loop,
                    rowToPrependTo) {
    // rowNumber is checked for validity before calling goToPage()
    var deferred = jQuery.Deferred();
    info = info || {};

    var tableId = info.tableId;
    var table = gTables[tableId];
    var $table = $("#xcTable-" + tableId);

    if (rowNumber >= table.resultSetMax) {
        console.log("Already at last page!");
        return PromiseHelper.resolve(null);
    }

    var rowPosition = rowNumber;
    if (rowPosition < 0) {
        numRowsToAdd += rowPosition;
        rowPosition = 0;
    }

    var prepullTableHeight;
    var setAbsolutePassed = false;
    gIsTableScrolling = true;

    generateDataColumnJson(table, rowPosition, numRowsToAdd)
    .then(function(jsonData) {
        prepullTableHeight = $table.height();
        TblManager.pullRowsBulk(tableId, jsonData, rowPosition,
                                direction, rowToPrependTo);

        var jsonLen = jsonData.length;
        info.numRowsAdded += jsonLen;
        var numRowsLacking = numRowsToAdd - jsonLen;
        var numRowsToIncrement = Math.max(1, jsonLen);
        var position = rowPosition + numRowsToIncrement;

        if (jsonLen === 0) {
            if (!info.missingRows) {
                info.missingRows = [];
            }
            info.missingRows.push(position);
        }

        var totalRowsStillNeeded = info.numRowsToAdd - info.numRowsAdded;
        if (totalRowsStillNeeded > 0) {
            if (!info.looped) {
                TblManager.addWaitingCursor(tableId);
            }

            info.looped = true;
            if (direction === RowDirection.Bottom) {
                return (scrollDownHelper(position, rowPosition, jsonLen,
                        totalRowsStillNeeded, table, $table, info));
            } else { // scrolling up
                return (scrollUpHelper(position, totalRowsStillNeeded,
                                      numRowsLacking, $table, info));
            }
        } else {
            return PromiseHelper.resolve(null);
        }
    })
    .then(function() {
        moveFirstColumn();
        if (!loop && !info.reverseLooped && !info.dontRemoveRows) {
            removeOldRows($table, tableId, info, direction, prepullTableHeight);
        } else if (!loop && info.missingRows) {
            console.log('some rows were too large to be retrieved, rows:',
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

    return deferred.promise();
}

// fetches more rows when scrolling down
function scrollDownHelper(position, oldPosition, jsonLen, numRowsStillNeeded,
                            table, $table, info) {
    var newRowToGoTo;
    if (position < table.resultSetMax) {
        newRowToGoTo = Math.min(position, table.resultSetMax);
        numRowsToFetch = Math.min(numRowsStillNeeded,
                                  (table.resultSetMax - newRowToGoTo));

        return (goToPage(newRowToGoTo, numRowsToFetch, RowDirection.Bottom,
                         info, true));

    } else if (info.bulk) {
        // reached the very end of table, will start scrolling up for
        // the first time and should never scroll back down
        newRowToGoTo = Math.max(0, info.currentFirstRow - numRowsStillNeeded);

        numRowsStillNeeded = Math.min(info.currentFirstRow, numRowsStillNeeded);
        info.targetRow = newRowToGoTo;
        if (!info.reverseLooped) {
            table.resultSetMax = jsonLen + oldPosition;
            table.currentRowNumber = table.resultSetMax;
            var numRowsToRemove = $table.find("tbody tr").length -
                                  info.numRowsAdded;
            $table.find("tbody tr").slice(0, numRowsToRemove).remove();
        }
        if (numRowsStillNeeded === 0) {
            return PromiseHelper.resolve(null);
        } else {
            info.reverseLooped = true;
            return (goToPage(newRowToGoTo, numRowsStillNeeded, RowDirection.Top,
                         info, true));
        }
    } else {
        return PromiseHelper.resolve(null);
    }
}

// fetches more rows when scrolling up
function scrollUpHelper(position, totalRowsStillNeeded, numRowsToFetch, $table,
                        info) {
    if (numRowsToFetch > 0) {
        if (position + numRowsToFetch > info.currentFirstRow) {
            // if newRowToGoTo is 95, numRowsToFetch is 10, but
            // info.currentFirstRow is 100, we only want to fetch 5 rows
            // not 10
            numRowsToFetch = info.currentFirstRow - position;
        }
        if (numRowsToFetch > 0) {
            return (goToPage(position, numRowsToFetch, RowDirection.Top,
                            info, true, position + numRowsToFetch));
        } else {
            return (scrollUpHelper(position, totalRowsStillNeeded,
                                   numRowsToFetch, $table, info));
        }
    } else {
        var firstRow = $table.find('tbody tr:first');
        var topRowNum = xcHelper.parseRowNum(firstRow);

        totalRowsStillNeeded = Math.min(totalRowsStillNeeded, topRowNum);
        if (totalRowsStillNeeded > 0 && info.targetRow !== 0) {
            info.targetRow -= totalRowsStillNeeded;
            position = Math.max(info.targetRow, 0);
            info.currentFirstRow = position + totalRowsStillNeeded;
            return (goToPage(position, totalRowsStillNeeded, RowDirection.Top,
                             info, true));
        } else {
            return PromiseHelper.resolve(null);
        }
    }
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
        var numRowsToRemove;
        if (info.bulk) {
            numRowsToRemove = $table.find("tbody tr").length - info.numRowsAdded;
        } else {
            numRowsToRemove = info.numRowsAdded;
        }

        $table.find("tbody tr").slice(0, numRowsToRemove).remove();
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


function getFirstPage(table) {
    if (table.resultSetId === 0) {
        return PromiseHelper.resolve(null);
    }
    TblManager.adjustRowFetchQuantity();
    var numRowsToAdd = Math.min(gMaxEntriesPerPage, table.resultSetCount);
    return generateDataColumnJson(table, null, numRowsToAdd);
}

// produces an array of all the td values that will go into the DATA column
function generateDataColumnJson(table, rowPosition, numRowsToFetch) {
    var jsons = [];

    if (table.resultSetId === 0) {
        return PromiseHelper.resolve(null);
    }
    if (numRowsToFetch === 0) {
        return PromiseHelper.resolve(jsons);
    }

    var deferred = jQuery.Deferred();
    var promise;

    if (rowPosition == null) {
        promise = PromiseHelper.resolve(null);
    } else {
        promise = tableSetAbsolute(table, rowPosition);
    }

    promise
    .then(function() {
        return (tableGetNextPage(table, numRowsToFetch));
    })
    .then(function(tableOfEntries) {
        var kvPairs = tableOfEntries.kvPair;
        var numKvPairs = tableOfEntries.numKvPairs;

        if (numKvPairs < gNumEntriesPerPage) {
            resultSetId = 0;
        }

        var numRows = Math.min(numRowsToFetch, numKvPairs);
        jsons = [];

        for (var i = 0; i < numRows; i++) {
            jsons.push(kvPairs[i].value);
        }

        deferred.resolve(jsons);
    })
    .fail(function(error) {
        if (error.status === StatusT.StatusNoBufs) {
            numRowsToFetch = Math.floor(numRowsToFetch / 2);
            generateDataColumnJson(table, rowPosition, numRowsToFetch)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            console.error("generateDataColumnJson fails!", error);
            deferred.reject(error);
        }
    });

    return deferred.promise();
}

// resets invalid resultsetIds
function tableGetNextPage(table, numRowsToFetch, retry) {
    var deferred = jQuery.Deferred();

    XcalarGetNextPage(table.resultSetId, numRowsToFetch)
    .then(deferred.resolve)
    .fail(function(error) {
        // invalid result set ID may need to be refreshed
        if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
            XcalarMakeResultSetFromTable(table.getName())
            .then(function(result) {
                table.resultSetId = result.resultSetId;
                return tableGetNextPage(table, numRowsToFetch, true);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            deferred.reject(error);
        }
    });

    return (deferred.promise());
}

// resets invalid resultsetIds
function tableSetAbsolute(table, rowPosition, retry) {
    var deferred = jQuery.Deferred();

    XcalarSetAbsolute(table.resultSetId, rowPosition)
    .then(deferred.resolve)
    .fail(function(error) {
        // invalid result set ID may need to be refreshed
        if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
            XcalarMakeResultSetFromTable(table.getName())
            .then(function(result) {
                table.resultSetId = result.resultSetId;
                return tableSetAbsolute(table, rowPosition, retry);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            deferred.reject(error);
        }
    });

    return (deferred.promise());
}