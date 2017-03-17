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
        // rowNumber is checked for validity before calling RowManager.addRows
        var deferred = jQuery.Deferred();
        var tableId = info.tableId;
        var table = gTables[tableId];

        if (startIndex >= table.resultSetCount) { // already at the end
            return PromiseHelper.resolve(null);
        } else if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        if (direction === RowDirection.Bottom) {
            var num = xcHelper.parseRowNum($("#xcTable-" + tableId).find("tbody tr").last());
            if (!info.bulk && num > startIndex) {

            }
        }
        prepTableForAddingRows(startIndex, numRowsToAdd, direction, info);

        fetchRows(startIndex, numRowsToAdd, direction, info)
        .then(function() {
            TblFunc.moveFirstColumn();
            if (info.bulk) {
                removeOldRows(info, direction);
            }

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

        if (startIndex >= table.resultSetCount) { // already at the end
            deferred.resolve();
            return deferred.promise();
        } else if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        getDataColumnJson(tableId, startIndex, numRowsToAdd)
        .then(function(jsonData) {
            var jsonLen = jsonData.length;
            var emptyReturn = false;
            if (!jsonLen) {
                emptyReturn = true;
                jsonLen = 1;
            }
            var numRowsLacking = numRowsToAdd - jsonLen;
            info.numRowsAdded += jsonLen;

            if (emptyReturn) {
                if (info.bulk) {
                    addTempRows(info.tableId, startIndex, 1, direction);
                }
                cleanupMissingRows(info, startIndex, direction);
            } else {
                if (!info.bulk && rowToPrependTo != null) {
                    rowToPrependTo -= numRowsLacking;
                }
                TblManager.pullRowsBulk(tableId, jsonData, startIndex,
                                    direction, rowToPrependTo);
            }
            var prevRow;
            if (!info.bulk) {
                info.$table.find("tbody tr").each(function() {
                    var $tr = $(this);
                    var curRow = xcHelper.parseRowNum($tr);
                    if (prevRow && curRow !== prevRow + 1) {

                    }
                    prevRow = curRow;
                });
            }


            TblFunc.moveFirstColumn();

            if (numRowsLacking > 0) {
                var newStartIndex = startIndex + Math.max(1, jsonLen);

                if (direction === RowDirection.Bottom) {
                    return (scrollDownHelper(newStartIndex, startIndex, jsonLen,
                                              numRowsLacking, info));
                } else {
                     // fetches more rows when scrolling up
                    return fetchRows(newStartIndex, numRowsLacking, direction,
                                    info, newStartIndex + numRowsLacking);
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

        var table = gTables[info.tableId];

        if (info.bulk) {
            TblManager.addWaitingCursor(info.tableId);
            table.currentRowNumber = startIndex + numRowsToAdd;
        } else {
            if (direction === RowDirection.Bottom) {
                table.currentRowNumber += numRowsToAdd;
            } else {
                table.currentRowNumber -= numRowsToAdd;
            }

            addTempRows(info.tableId, startIndex, numRowsToAdd, direction);
            if (!info.dontRemoveRows) {
                removeRows(info, numRowsToAdd, direction);
            }
        }
    }

    function tableCleanup(info) {
        info.$table.find('.tempRow').remove();
        var $xcTbodyWrap = $('#xcTbodyWrap-' + info.tableId);
        var scrollTop = $xcTbodyWrap.scrollTop();
        var prevScrollTop = scrollTop;
        if (scrollTop < 2) {
            // leave some space for scrolling up
            scrollTop = 2;
            $xcTbodyWrap.scrollTop(scrollTop);
        } else if ($xcTbodyWrap[0].scrollHeight - scrollTop -
                       $xcTbodyWrap.outerHeight() <= 1) {
            // leave some space for scrolling down
            scrollTop -= 2;
            $xcTbodyWrap.scrollTop(scrollTop);
        }

        if (!info.bulk) {
            var table = gTables[info.tableId];
            var visibleRows = Math.min(gMaxEntriesPerPage,
                                       table.resultSetCount);
            var numRowsAbove = table.currentRowNumber - visibleRows;
            var rowsAboveHeight = RowScroller.getRowsAboveHeight(info.tableId,
                                                                numRowsAbove);
            var scrollBarTop = scrollTop + rowsAboveHeight -
                               table.scrollMeta.base;
            var curTop = $xcTbodyWrap.siblings(".tableScrollBar").scrollTop();

            if (curTop !== scrollBarTop) {
                table.scrollMeta.isTableScrolling = true;
                $xcTbodyWrap.siblings(".tableScrollBar")
                            .scrollTop(scrollBarTop);
            }
        }

        info.$table.removeClass('scrolling');
        TblManager.removeWaitingCursor(info.tableId);
        gIsTableScrolling = false;
    }

    // fetches more rows when scrolling down
    function scrollDownHelper(position, oldPosition, jsonLen,
                              numRowsStillNeeded, info) {
        var newStartIndex;
        var table = gTables[info.tableId];
        var $table = info.$table;
        if (position < table.resultSetCount) {
            newStartIndex = Math.min(position, table.resultSetCount);
            numRowsToFetch = Math.min(numRowsStillNeeded,
                                      (table.resultSetCount - newStartIndex));

            return (fetchRows(newStartIndex, numRowsToFetch,
                              RowDirection.Bottom, info));
        } else {
            // reached the very end of table
            return PromiseHelper.resolve(null);
        }
    }

    function removeRows(info, numRowsToRemove, direction) {
        if (info.bulk) {
            return;
        }

        if (direction === RowDirection.Bottom) {
            info.$table.find("tbody tr").slice(0, numRowsToRemove).remove();
        } else {
            info.$table.find("tbody tr").slice(gMaxEntriesPerPage).remove();
        }
    }

    // for bulk
    // also handles the scroll position
    function removeOldRows(info, direction) {
        var $table = info.$table;
        var prevTableHeight = $table.height();
        var $xcTbodyWrap = $('#xcTbodyWrap-' + info.tableId);
        var table = gTables[info.tableId];

        var numRowsToRemove = $table.find("tbody tr").length -
                              info.numRowsAdded;

        var prevScrollTop = $xcTbodyWrap.scrollTop();
        $table.find("tbody tr").slice(0, numRowsToRemove).remove();
        var scrollTop = Math.max(2, prevScrollTop - (prevTableHeight -
                                                    $table.height()));
        $xcTbodyWrap.scrollTop(scrollTop);
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

    function addTempRows(tableId, startIndex, numRowsToAdd, direction) {
        startIndex = startIndex || 0;
        var table = gTables[tableId];
        var numCols = table.getNumCols();
        var $table = $('#xcTable-' + tableId);
        var tBodyHTML = "";
        var dataColNum = table.getColNumByBackName('DATA') - 1;
        var tdClass = "";
        var oldTableHeight;

        for (var row = 0; row < numRowsToAdd; row++) {
            var rowNum = row + startIndex;

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

        if (direction === RowDirection.Top) {
            var newTableHeight = $table.height();
            var heightDiff = newTableHeight - oldTableHeight;
            var scrollTop = Math.max(1, heightDiff);
            $xcTbodyWrap.scrollTop(scrollTop);
        }
        TblFunc.moveFirstColumn();
    }

    function cleanupMissingRows(info, rowPosition, direction) {
        if (!info.missingRows) {
            info.missingRows = [];
        }
        info.$table.find(".tempRow.row" + rowPosition).removeClass("tempRow")
                                                      .addClass("empty");
        info.missingRows.push(rowPosition + 1);
    }
    return (RowManager);
}(jQuery, {}));
