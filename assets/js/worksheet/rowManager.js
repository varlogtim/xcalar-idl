window.RowManager = (function($, RowManager) {
    RowManager.getFirstPage = function(tableId) {
        var table = gTables[tableId];

        if (table.resultSetId === 0) {
            return PromiseHelper.resolve(null);
        }
        TblManager.adjustRowFetchQuantity();
        var numRowsToAdd = Math.min(gMaxEntriesPerPage, table.resultSetCount);
        return getDataColumnJson(tableId, null, numRowsToAdd);
    };

    // startIndex is the row number we're starting from
    // if our table has rows 0-60 and we're scrolling downwards, startIndex = 60
    // if our table has rows 60-120 and we're scrolling upwards, startIndex = 40
    // assuming we're fetching 20 rows
    RowManager.addRows = function(startIndex, numRowsToAdd, direction, info) {
        // rowNumber is checked for validity before calling RowManager.addRows()
        var deferred = jQuery.Deferred();
        var tableId = info.tableId;
        var table = gTables[tableId];

        if (startIndex >= table.resultSetMax) { // already at the end
            return PromiseHelper.resolve(null);
        } else if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        prepTableForAddingRows(startIndex, numRowsToAdd, direction, info);

        fetchRows(startIndex, numRowsToAdd, direction, info)
        .then(function() {
            moveFirstColumn();
            removeOldRows(info, direction);
            if (info.missingRows) {
                console.log('some rows were too large to be retrieved,' +
                            'rows:', info.missingRows);
            }
            deferred.resolve(info);
        })
        .fail(function(error) {
            console.error("goToPage fails!", error);
            deferred.reject(error);
        })
        .always(function() {
            tableCleanup(info);
        });

        return deferred.promise();
    };

    function fetchRows(startIndex, numRowsToAdd, direction, info,
                        rowToPrependTo) {
        var deferred = jQuery.Deferred();
        var tableId = info.tableId;
        var table = gTables[tableId];

        if (startIndex >= table.resultSetMax) { // already at the end
            deferred.resolve();
            return deferred.promise();
        } else if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        getDataColumnJson(tableId, startIndex, numRowsToAdd)
        .then(function(jsonData) {
            var jsonLen = jsonData.length;
            var numRowsLacking = numRowsToAdd - jsonLen;
            info.numRowsAdded += jsonLen;
            var scrollPosition;
            
            if (jsonLen) {
                if (!info.bulk && rowToPrependTo != null) {
                    rowToPrependTo -= numRowsLacking;
                }
                TblManager.pullRowsBulk(tableId, jsonData, startIndex,
                                    direction, rowToPrependTo);
            } else {
                scrollPosition = cleanupMissingRows(info, startIndex,
                                                    direction);
            }
            moveFirstColumn();
            
            var totalRowsStillNeeded = info.numRowsToAdd - info.numRowsAdded;
               
            if (totalRowsStillNeeded > 0) {
                var newStartIndex = startIndex + Math.max(1, jsonLen);

                if (direction === RowDirection.Bottom) {
                    return (scrollDownHelper(newStartIndex, startIndex, jsonLen,
                                              totalRowsStillNeeded, info,
                                              scrollPosition));
                } else {
                    return (scrollUpHelper(newStartIndex, totalRowsStillNeeded,
                                          numRowsLacking, info, jsonLen));
                }
            } else {
                return PromiseHelper.resolve(null);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function prepTableForAddingRows(startIndex, numRowsToAdd, direction, info) {
        gIsTableScrolling = true;
        info.$table = $("#xcTable-" + info.tableId);
        info.$table.addClass('scrolling');
        info.numRowsToAdd = numRowsToAdd;
        info.numRowsAdded = 0;

        if (info.bulk) {
            TblManager.addWaitingCursor(info.tableId);
        } else {
            addTempRows(info.tableId, startIndex, numRowsToAdd, direction);
        }
    }

    function tableCleanup(info) {
        info.$table.find('.tempRow').remove();
        var $xcTbodyWrap = $('#xcTbodyWrap-' + info.tableId);
        var scrollTop = $xcTbodyWrap.scrollTop();
        if (scrollTop < 2) {
            // leave some space for scrolling up
            $xcTbodyWrap.scrollTop(2);
        } else if ($xcTbodyWrap[0].scrollHeight - scrollTop -
                       $xcTbodyWrap.outerHeight() <= 1) {
            // leave some space for scrolling down
            $xcTbodyWrap.scrollTop(scrollTop - 2);
        }

        info.$table.removeClass('scrolling');
        TblManager.removeWaitingCursor(info.tableId);
        gIsTableScrolling = false;
    }

    // fetches more rows when scrolling down
    function scrollDownHelper(position, oldPosition, jsonLen,
                              numRowsStillNeeded, info, scrollPosition) {
        var newStartIndex;
        var table = gTables[info.tableId];
        var $table = info.$table;
        if (position < table.resultSetMax) {
            newStartIndex = Math.min(position, table.resultSetMax);
            numRowsToFetch = Math.min(numRowsStillNeeded,
                                      (table.resultSetMax - newStartIndex));

            if (jsonLen === 0 && !info.bulk) {
                addTempRows(table.getId(), position, numRowsToFetch,
                            RowDirection.Bottom, false, scrollPosition);
            }

            return (fetchRows(newStartIndex, numRowsToFetch,
                              RowDirection.Bottom, info));

        } else if (info.bulk) {
            // reached the very end of table, will start scrolling up for
            // the first time and should never scroll back down
            newStartIndex = Math.max(0, info.currentFirstRow -
                                        numRowsStillNeeded);
            numRowsStillNeeded = Math.min(info.currentFirstRow,
                                          numRowsStillNeeded);
            info.targetRow = newStartIndex;
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
                return (fetchRows(newStartIndex, numRowsStillNeeded,
                                  RowDirection.Top, info));
            }
        } else {
            return PromiseHelper.resolve(null);
        }
    }

    // fetches more rows when scrolling up
    function scrollUpHelper(position, totalRowsStillNeeded, numRowsToFetch,
                            info, jsonLen) {
        if (numRowsToFetch > 0) {
            if (position + numRowsToFetch > info.currentFirstRow) {
                // if newRowToGoTo is 95, numRowsToFetch is 10, but
                // info.currentFirstRow is 100, we only want to fetch 5 rows
                // not 10
                numRowsToFetch = info.currentFirstRow - position;
            }
            if (numRowsToFetch > 0) {
                if (jsonLen === 0 && !info.bulk) {
                    var numTempRowsToAdd = info.numRowsToAdd -
                                           info.numRowsAdded - numRowsToFetch;
                    var tempRowPosition = Math.max(info.targetRow -
                                                   numTempRowsToAdd, 0);
                    addTempRows(info.tableId, tempRowPosition, numTempRowsToAdd,
                                RowDirection.Top, true);
                }
                return (fetchRows(position, numRowsToFetch,
                                           RowDirection.Top, info,
                                           position + numRowsToFetch));
            } else {
                return (scrollUpHelper(position, totalRowsStillNeeded,
                                       numRowsToFetch, info, jsonLen));
            }
        } else { // need to reposition cursor
            totalRowsStillNeeded = getRowsNeededOnScrollUp(jsonLen, info);

            if (totalRowsStillNeeded > 0 && info.targetRow !== 0) {
                position = resetScrollUpPosition(info, position,
                                                 totalRowsStillNeeded);
                if (jsonLen === 0 && !info.bulk) {
                    addTempRows(info.tableId, position, totalRowsStillNeeded,
                                RowDirection.Top, true);
                }
                return (fetchRows(position, totalRowsStillNeeded,
                                  RowDirection.Top, info));
            } else {
                return PromiseHelper.resolve(null);
            }
        }
    }

    function resetScrollUpPosition(info, position, totalRowsStillNeeded) {
        info.targetRow = Math.max(0, info.targetRow - totalRowsStillNeeded);
        info.currentFirstRow = info.targetRow + totalRowsStillNeeded;
        return info.targetRow;
    }

    function getRowsNeededOnScrollUp(jsonLen, info) {
        var totalRowsStillNeeded;
        if (jsonLen === 0 || info.bulk) {
            var $firstRow = info.$table.find('tbody tr').eq(0);
            var topRowNum = xcHelper.parseRowNum($firstRow);
            totalRowsStillNeeded = Math.min(totalRowsStillNeeded,
                                            topRowNum);
        } else {
            totalRowsStillNeeded = info.$table.find('.tempRow').length;
        }
        return totalRowsStillNeeded;
    }

    // also handles the scroll position
    function removeOldRows(info, direction) {
        if (info.reverseLooped || info.dontRemoveRows) {
            return;
        }

        var $table = info.$table;
        var prevTableHeight = $table.height();
        var $xcTbodyWrap = $('#xcTbodyWrap-' + info.tableId);
        var table = gTables[info.tableId];
        $table.find('.tempRow').remove();

        if (direction === RowDirection.Top) {
            $table.find("tbody tr").slice(gMaxEntriesPerPage).remove();
            if ($xcTbodyWrap.scrollTop() < 2) {
                $xcTbodyWrap.scrollTop(2); // leave some space for scrolling
            }
        } else { // scrolled bottom
            if (info.numRowsAdded === 0) {
                table.resultSetMax = info.lastRowToDisplay - info.numRowsToAdd;
                table.currentRowNumber = table.resultSetMax;
            }

            var numRowsToRemove;
            if (info.bulk) {
                numRowsToRemove = $table.find("tbody tr").length -
                                  info.numRowsAdded;
            } else {
                numRowsToRemove = info.numRowsAdded;
            }

            var prevScrollTop = $xcTbodyWrap.scrollTop();
            $table.find("tbody tr").slice(0, numRowsToRemove).remove();
            var scrollTop = Math.max(2, prevScrollTop - (prevTableHeight -
                                                        $table.height()));
            $xcTbodyWrap.scrollTop(scrollTop);
        }

        var $lastRow = $table.find('tbody tr:last');
        table.currentRowNumber = xcHelper.parseRowNum($lastRow) + 1;
    }

    // produces an array of all the td values that will go into the DATA column
    function getDataColumnJson(tableId, rowPosition, numRowsToFetch) {
        var jsons = [];
        var table = gTables[tableId];

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
            promise = setAbsolute(table, rowPosition);
        }

        promise
        .then(function() {
            return (getNextPage(table, numRowsToFetch));
        })
        .then(function(tableOfEntries) {
            var kvPairs = tableOfEntries.kvPair;
            var numKvPairs = tableOfEntries.numKvPairs;

            if (numKvPairs < gNumEntriesPerPage) {
                resultSetId = 0;
            }

            var numRows = Math.min(numRowsToFetch, numKvPairs);
            
            for (var i = 0; i < numRows; i++) {
                jsons.push(kvPairs[i].value);
            }

            deferred.resolve(jsons);
        })
        .fail(function(error) {
            if (error.status === StatusT.StatusNoBufs) {
                numRowsToFetch = Math.floor(numRowsToFetch / 2);
                getDataColumnJson(table, rowPosition, numRowsToFetch)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                console.error("getDataColumnJson fails!", error);
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    // resets invalid resultsetIds
    function getNextPage(table, numRowsToFetch, retry) {
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
    function setAbsolute(table, rowPosition, retry) {
        var deferred = jQuery.Deferred();

        XcalarSetAbsolute(table.resultSetId, rowPosition)
        .then(deferred.resolve)
        .fail(function(error) {
            // invalid result set ID may need to be refreshed
            if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
                XcalarMakeResultSetFromTable(table.getName())
                .then(function(result) {
                    table.resultSetId = result.resultSetId;
                    return setAbsolute(table, rowPosition, true);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
                Alert.error(ErrTStr.NotDisplayRows, error);
            }
        });

        return (deferred.promise());
    }

    function addTempRows(tableId, startIndex, numRowsToAdd, direction,
                         ignoreScrollHeight, scrollPosition) {
        startIndex = startIndex || 0;
        var table = gTables[tableId];
        // var tableCols = table.tableCols;
        var numCols = table.getNumCols();
        var $table = $('#xcTable-' + tableId);
        var tBodyHTML = "";
        var dataColNum = table.getColNumByBackName('DATA') - 1;
        var tdClass = "";
        var oldTableHeight;

        for (var row = 0; row < numRowsToAdd; row++) {
            var rowNum = row + startIndex;
            // var idTitle = "";

            tBodyHTML += '<tr class="row' + rowNum + ' tempRow">';

            // add bookmark
            if (table.bookmarks.indexOf(rowNum) > -1) {
                tBodyHTML += '<td align="center" class="col0 rowBookmarked">';
            } else {
                tBodyHTML += '<td align="center" class="col0">';
            }

            // Line Marker Column
            tBodyHTML += '<div class="idWrap">' +
                            '<span class="idSpan">' +
                                (rowNum + 1) +
                            '</span>' +
                          '</div>' +
                        '</td>';


            // loop through table tr's tds
            for (var col = 0; col < numCols; col++) {
                if (col === dataColNum) {
                    tdClass = " jsonElement";
                } else {
                    tdClass = "";
                }
                tBodyHTML += '<td class="col' + (col + 1) + tdClass + '"></td>';
            }
            // end of loop through table tr's tds
            tBodyHTML += '</tr>';
        }
        var $rows = $(tBodyHTML);
        if (direction === RowDirection.Top) {
            oldTableHeight = $table.height();
            $table.find('tbody').prepend($rows);

        } else {
            $table.find('tbody').append($rows);
        }

        TblManager.adjustRowHeights($rows, startIndex, tableId);

        var $xcTbodyWrap = $('#xcTbodyWrap-' + tableId);

        if (direction === RowDirection.Top && !ignoreScrollHeight) {
            var newTableHeight = $table.height();
            var heightDiff = newTableHeight - oldTableHeight;
            var scrollTop = Math.max(1, heightDiff);
            $xcTbodyWrap.scrollTop(scrollTop);
        } else if (direction === RowDirection.Bottom && scrollPosition) {
            $xcTbodyWrap.scrollTop(scrollPosition);
        }
        moveFirstColumn();
    }

    function cleanupMissingRows(info, rowPosition, direction) {
        var scrollPosition = $('#xcTbodyWrap-' + info.tableId).scrollTop();
        if (!info.missingRows) {
            info.missingRows = [];
        }
        info.missingRows.push(rowPosition + 1);
        
        if (direction === RowDirection.Bottom) {
            info.$table.find('.tempRow').remove();
        } else {
            info.$table.find('.tempRow.row' + rowPosition).remove();
        }
        return (scrollPosition);
    }
    return (RowManager);
}(jQuery, {}));
