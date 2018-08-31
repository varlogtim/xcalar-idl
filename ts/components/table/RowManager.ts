class RowManager {
    private table: TableMeta;
    private $view: JQuery;

    public constructor(table: TableMeta, $view: JQuery) {
        this.table = table;
        this.$view = $view;
    }

    /**
     * @return {XDPromise}
     */
    public getFirstPage(): XDPromise<string[]> {
        const table: TableMeta = this.table;
        // XXX TODO: this need to update
        TblManager.adjustRowFetchQuantity();
        const numRowsToAdd: number = Math.min(gMaxEntriesPerPage, table.resultSetCount);
        return this._getDataColumnJson(null, numRowsToAdd);
    }

    /**
     *
     * @param startIndex the row number we're starting from
     * if our table has rows 0-60 and we're scrolling downwards, startIndex = 60
     * if our table has rows 60-120 and we're scrolling upwards, startIndex = 40
     * assuming we're fetching 20 rows
     * @param numRowsToAdd
     * @param direction
     * @param info
     */
    public addRows(
        startIndex: number,
        numRowsToAdd: number,
        direction: RowDirection,
        info: {
            bulk: boolean,
            numRowsToAdd: number,
            numRowsAdded: number,
            dontRemoveRows: boolean
            missingRows: number[]
        }
    ): XDPromise<any> {
        // rowNumber is checked for validity before calling addRows
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const table: TableMeta = this.table;

        if (startIndex >= table.resultSetCount) { // already at the end
            return PromiseHelper.resolve(null);
        } else if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        this._prepTableForAddingRows(startIndex, numRowsToAdd, direction, info);
        this._fetchRows(startIndex, numRowsToAdd, direction, info)
        .then(() => {
            TblFunc.moveFirstColumn(null);

            if (info.missingRows) {
                console.log('some rows were too large to be retrieved,' +
                            'rows:', info.missingRows);
            }
            this._tableCleanup(info);
            deferred.resolve(info);
        })
        .fail((error) => {
            this._tableCleanup(info);
            console.error("goToPage fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _getTable(): JQuery {
        return this.$view.find(".xcTable");
    }

    // produces an array of all the td values that will go into the DATA column
    private _getDataColumnJson(
        rowPosition: number,
        numRowsToFetch: number
    ): XDPromise<string[]> {
        const jsons: string[] = [];
        if (numRowsToFetch === 0) {
            return PromiseHelper.resolve(jsons);
        }

        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        let promise: XDPromise<void>;
        if (rowPosition == null) {
            promise = PromiseHelper.resolve();
        } else {
            promise = this._setAbsolute(rowPosition, false);
        }

        promise
        .then(() => {
            return this._getNextPage(numRowsToFetch, false);
        })
        .then((tableOfEntries) => {
            const numValues: number = tableOfEntries.numValues;
            const numRows: number = Math.min(numRowsToFetch, numValues);
            const values: string[] = tableOfEntries.values;
            for (let i = 0; i < numRows; i++) {
                jsons.push(values[i]);
            }
            deferred.resolve(jsons);
        })
        .fail((error) => {
            if (error.status === StatusT.StatusNoBufs) {
                numRowsToFetch = Math.floor(numRowsToFetch / 2);
                this._getDataColumnJson(rowPosition, numRowsToFetch)
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
    private _setAbsolute(
        rowPosition,
        retry
    ): XDPromise<void> {
        const table: TableMeta = this.table;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const resultSetId: string = String(table.resultSetId);

        XcalarSetAbsolute(resultSetId, rowPosition)
        .then(deferred.resolve)
        .fail((error) => {
            // invalid result set ID may need to be refreshed
            if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
                table.updateResultset()
                .then(() => {
                    return this._setAbsolute(rowPosition, true);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
                Alert.error(ErrTStr.NotDisplayRows, error);
            }
        });

        return deferred.promise();
    }

     // resets invalid resultsetIds
     private _getNextPage(
        numRowsToFetch: number,
        retry: boolean
    ): XDPromise<{values: string[], numValues: number}> {
        const table: TableMeta = this.table;
        const deferred: XDDeferred<{values: string[], numValues: number}> = PromiseHelper.deferred();

        XcalarGetNextPage(table.resultSetId, numRowsToFetch)
        .then(deferred.resolve)
        .fail((error) => {
            // invalid result set ID may need to be refreshed
            if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
                table.updateResultset()
                .then(() => {
                    return this._getNextPage(numRowsToFetch, true);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
                Alert.error(ErrTStr.NotDisplayRows, error);
            }
        });

        return deferred.promise();
    }

    private _prepTableForAddingRows(
        startIndex: number,
        numRowsToAdd: number,
        direction: number,
        info: {
            bulk: boolean,
            numRowsToAdd: number,
            numRowsAdded: number,
            dontRemoveRows: boolean
        }
    ): void {
        gIsTableScrolling = true;

        const table: TableMeta = this.table;
        const $table: JQuery = this._getTable();
        $table.addClass('scrolling');
        info.numRowsToAdd = numRowsToAdd;
        info.numRowsAdded = 0;

        if (info.bulk) {
            const tableId: TableId = this.table.getId();
            TblManager.addWaitingCursor(tableId);
            table.currentRowNumber = startIndex + numRowsToAdd;
        } else {
            if (direction === RowDirection.Bottom) {
                table.currentRowNumber += numRowsToAdd;
            } else {
                table.currentRowNumber -= numRowsToAdd;
            }

            this._addTempRows(startIndex, numRowsToAdd, direction);
            if (!info.dontRemoveRows && !info.bulk) {
                this._removeRows(numRowsToAdd, direction);
            }
        }
    }

    private _addTempRows(
        startIndex: number = 0,
        numRowsToAdd: number,
        direction: RowDirection
    ): void {
        const table: TableMeta = this.table;
        const numCols: number = table.getNumCols();
        const $table: JQuery = this._getTable();
        const dataColNum: number = table.getColNumByBackName('DATA') - 1;
        let tBodyHTML: string = "";

        for (let row = 0; row < numRowsToAdd; row++) {
            const rowNum: number = row + startIndex;
            tBodyHTML += '<tr class="row' + rowNum + ' tempRow">' +
                            '<td align="center" class="col0">' +
                                '<div class="idWrap">' +  // Line Marker Column
                                    '<span class="idSpan">' +
                                        (rowNum + 1) +
                                    '</span>' +
                                '</div>' +
                            '</td>';


            // loop through table tr's tds
            for (let col = 0; col < numCols; col++) {
                let tdClass: string;
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
        const $rows: JQuery = $(tBodyHTML);
        const oldTableHeight: number = $table.height();
        if (direction === RowDirection.Top) {
            $table.find('tbody').prepend($rows);
        } else {
            $table.find('tbody').append($rows);
        }

        const tableId: TableId = table.getId();
        TblManager.adjustRowHeights($rows, startIndex, tableId);

        if (direction === RowDirection.Top) {
            const heightDiff: number = $table.height() - oldTableHeight;
            const scrollTop: number = Math.max(1, heightDiff);
            const $xcTbodyWrap: JQuery = $('#xcTbodyWrap-' + tableId);
            $xcTbodyWrap.scrollTop(scrollTop);
        }
        TblFunc.moveFirstColumn(null);
    }

    private _removeRows(
        numRowsToRemove: number,
        direction: RowDirection
    ): void {
        const $table: JQuery = this._getTable();
        if (direction === RowDirection.Bottom) {
            const $xcTbodyWrap: JQuery = $table.closest(".xcTbodyWrap");
            const distFromBottom: number = $xcTbodyWrap[0].scrollHeight -
                          $xcTbodyWrap.scrollTop() - $xcTbodyWrap.outerHeight();

            $table.find("tbody tr").slice(0, numRowsToRemove).remove();

            let newScrollTop: number = $xcTbodyWrap.scrollTop();
            const newDist: number = $xcTbodyWrap[0].scrollHeight -
                          $xcTbodyWrap.scrollTop() - $xcTbodyWrap.outerHeight();
            if (distFromBottom > newDist) {
                // this doesn't happen in chrome
                newScrollTop -= (distFromBottom - newDist);
                $xcTbodyWrap.scrollTop(newScrollTop);
            }
        } else {
            $table.find("tbody tr").slice(gMaxEntriesPerPage).remove();
        }
    }

    private _fetchRows(
        startIndex: number,
        numRowsToAdd: number,
        direction: RowDirection,
        info: {
            numRowsAdded: number,
            bulk: boolean,
            missingRows: number[]
        },
        rowToPrependTo?: number
    ): XDPromise<void> {
        const table: TableMeta = this.table;

        if (startIndex >= table.resultSetCount) {
            // already at the end
            return PromiseHelper.resolve();
        }
        if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getDataColumnJson(startIndex, numRowsToAdd)
        .then((jsonData) => {
            let jsonLen: number = jsonData.length;
            let emptyReturn: boolean = false;
            if (!jsonLen) {
                emptyReturn = true;
                jsonLen = 1;
            }
            info.numRowsAdded += jsonLen;
            const numRowsLacking: number = numRowsToAdd - jsonLen;

            if (emptyReturn) {
                if (info.bulk) {
                    this._addTempRows(startIndex, 1, direction);
                }
                this._cleanupMissingRows(info, startIndex);
            } else {
                if (!info.bulk && rowToPrependTo != null) {
                    rowToPrependTo -= numRowsLacking;
                }
                const tableId: TableId = table.getId();
                TblManager.pullRowsBulk(tableId, jsonData, startIndex,
                                        direction, rowToPrependTo);
            }
            TblFunc.moveFirstColumn(null);

            if (numRowsLacking > 0) {
                const newStartIndex: number = startIndex + Math.max(1, jsonLen);
                if (direction === RowDirection.Bottom) {
                    return this._scrollDownHelper(newStartIndex, numRowsLacking, info);
                } else {
                     // fetches more rows when scrolling up
                    return this._fetchRows(newStartIndex, numRowsLacking, direction,
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

    private _cleanupMissingRows(
        info: {
            missingRows: number[]
        },
        rowPosition
    ): void {
        if (!info.missingRows) {
            info.missingRows = [];
        }
        this._getTable().find(".tempRow.row" + rowPosition)
                    .removeClass("tempRow")
                    .addClass("empty");
        info.missingRows.push(rowPosition + 1);
    }

    // fetches more rows when scrolling down
    private _scrollDownHelper(
        position: number,
        numRowsStillNeeded: number,
        info: {
            numRowsAdded: number,
            bulk: boolean,
            missingRows: number[]
        }
    ): XDPromise<void> {
        const table: TableMeta = this.table;
        if (position < table.resultSetCount) {
            const newStartIndex: number = Math.min(position, table.resultSetCount);
            const numRowsToFetch: number = Math.min(numRowsStillNeeded,
                        (table.resultSetCount - newStartIndex));

            return this._fetchRows(newStartIndex, numRowsToFetch,
                                    RowDirection.Bottom, info);
        } else {
            // reached the very end of table
            return PromiseHelper.resolve(null);
        }
    }

    // for bulk, also handles the scroll position
    private _removeOldRows(
        info: {
            numRowsAdded: number,
            numRowsToAdd: number
        }
    ): void {
        const $table: JQuery = this._getTable();
        const prevTableHeight: number = $table.height();
        const table: TableMeta = this.table;
        const $xcTbodyWrap: JQuery = $table.closest(".xcTbodyWrap");
        const numRowsToRemove: number = $table.find("tbody tr").length -
                              info.numRowsAdded;

        const prevScrollTop: number = $xcTbodyWrap.scrollTop();
        $table.find("tbody tr").slice(0, numRowsToRemove).remove();
        const scrollTop: number = Math.max(2, prevScrollTop - (prevTableHeight -
                                                    $table.height()));
        $xcTbodyWrap.scrollTop(scrollTop);
        const numMissingRows: number = info.numRowsToAdd - info.numRowsAdded;
        if (numMissingRows) {
            const startIndex: number = table.currentRowNumber - numMissingRows;
            this._addTempRows(startIndex, numMissingRows, RowDirection.Bottom);
        }
    }

    private _tableCleanup(
        info: {
            bulk: boolean,
            numRowsAdded: number,
            numRowsToAdd: number
        }
    ): void {
        if (info.bulk) {
            this._removeOldRows(info);
        }
        const $table: JQuery = this._getTable();
        $table.find('.tempRow')
                .removeClass("tempRow")
                .addClass("empty");
        const table: TableMeta = this.table;
        const $xcTbodyWrap: JQuery = $table.closest(".xcTbodyWrap");
        let scrollTop: number = $xcTbodyWrap.scrollTop();
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

        const tableId: TableId = table.getId();
        if (!info.bulk) {
            const visibleRows: number = Math.min(gMaxEntriesPerPage,
                                       table.resultSetCount);
            const numRowsAbove: number = table.currentRowNumber - visibleRows;
            const rowsAboveHeight: number = RowScroller.getRowsAboveHeight(tableId,
                                                                numRowsAbove);
            const scrollBarTop: number = scrollTop + rowsAboveHeight -
                               table.scrollMeta.base;
            const curTop: number = $xcTbodyWrap.siblings(".tableScrollBar").scrollTop();
            if (curTop !== scrollBarTop) {
                table.scrollMeta.isTableScrolling = true;
                $xcTbodyWrap.siblings(".tableScrollBar")
                            .scrollTop(scrollBarTop);
            }
        }

        $table.removeClass('scrolling');
        TblManager.removeWaitingCursor(tableId);
        gIsTableScrolling = false;
    }

}