function freeAllResultSets() {
    // var promises = [];
    // Note from Cheng: use promise is not reliable to send all reqeust to backend
    for (var tableId in gTables) {
        gTables[tableId].freeResultset();
    }

    // Free datasetBrowser resultSetId
    DS.release();
}

function freeAllResultSetsSync() {
    var deferred = jQuery.Deferred();
    var promises = [];

    // if table does not exist and free the resultSetId, it crash the backend

    // check backend table name to see if it exists
    xcHelper.getBackTableSet()
    .then(function(backTableSet) {
        for (var tableId in gTables) {
            var table = gTables[tableId];

            if (!backTableSet.hasOwnProperty(table.tableName)) {
                console.error("Table not in backend!");
                continue;
            }

            promises.push(table.freeResultset.bind(this));
        }

        // Free datasetBrowser resultSetId
        promises.push(DS.release.bind(this));

        return chain(promises);

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
                  rowToPrependTo, retry) {
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
    var resultSetId = table.resultSetId;
    var funcStep = 0;
    gIsTableScrolling = true;

    XcalarSetAbsolute(resultSetId, rowPosition)
    .then(function(){
        funcStep++;
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

        TblManager.pullRowsBulk(tableId, jsonObj, rowPosition, null,
                     direction, rowToPrependTo);
        if (jsonLen > 0) {
            if (direction === RowDirection.Bottom) {
                if (rowPosition + jsonLen > info.currentLastRow) {
                    info.currentLastRow = rowPosition + jsonLen;
                }
            }
        }

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
                        info.currentFirstRow = newRowToGoTo + numRowsStillNeeded;
                        return (goToPage(newRowToGoTo, numRowsStillNeeded,
                                         direction, true, info));
                    } else {
                        deferred2.resolve();
                        return (deferred2.promise());
                    }
                } else {
                    // if newRowToGoTo is 95, numRowsToFetch is 10, but
                    // info.currentFirstRow is 100, we only want to fetch 5 rows
                    // not 10
                    if (newRowToGoTo + numRowsToFetch > info.currentFirstRow) {
                        numRowsToFetch = info.currentFirstRow - newRowToGoTo;
                    }
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
        if (!retry && funcStep === 0 &&
            error.status === StatusT.StatusInvalidResultSetId) {

            XcalarMakeResultSetFromTable(table.tableName)
            .then(function(result) {
                table.resultSetId = result.resultSetId;
                goToPage(rowNumber, numRowsToAdd, direction, loop, info,
                  rowToPrependTo, true)
                .then(function(data1, data2) {
                    deferred.resolve();
                })
                .fail(function(error) {
                    console.error("2nd attempt of goToPage fails!", error);
                    deferred.reject(error);
                });
            })
            .fail(function(error) {
                console.error("generateDataColumnJson fails!", error);
                deferred.reject(error);
            });
        } else {
            console.error("goToPage fails!", error);
            deferred.reject(error);
        }
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


function getFirstPage(table, notIndexed) {
    if (table.resultSetId === 0) {
        return (promiseWrapper(null));
    }
    TblManager.adjustRowFetchQuantity();
    var numRowsToAdd = Math.min(gMaxEntriesPerPage, table.resultSetCount);
    return (generateDataColumnJson(table, null, notIndexed, numRowsToAdd));
}

 // produces an array of all the td values that will go into the DATA column
function generateDataColumnJson(table, direction, notIndexed, numRowsToFetch,
                                retry) {
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

            newValue += ',"' + keyName + '_indexed":' + key + '}';
            jsonWithKey.push(newValue);
        }

        jsonObj = {
            "normal" : jsonNormal,
            "withKey": jsonWithKey
        };

        deferred.resolve(jsonObj, keyName);
    })
    .fail(function(error) {
        if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
            XcalarMakeResultSetFromTable(table.tableName)
            .then(function(result) {
                table.resultSetId = result.resultSetId;
                generateDataColumnJson(table, direction, notIndexed,
                                       numRowsToFetch, true)
                .then(function(data1, data2) {
                    deferred.resolve(data1, data2);
                })
                .fail(function(error) {
                    console.error("2nd attempt of generateDataColumnJson " +
                                  "fails!", error);
                    deferred.reject(error);
                });
            })
            .fail(function(error) {
                console.error("generateDataColumnJson fails!", error);
                deferred.reject(error);
            });
        } else {
            console.error("generateDataColumnJson fails!", error);
            deferred.reject(error);
        }

    });

    return (deferred.promise());
}
