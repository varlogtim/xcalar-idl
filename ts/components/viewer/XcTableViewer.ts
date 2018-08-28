class XcTableViewer extends XcViewer {
    protected table: TableMeta;
    protected modelingMode: boolean;

    public constructor(table: TableMeta) {
        const id: string = table.getName(); // use table name as unique id
        super(id);
        this.table = table;
        this.modelingMode = true;
        this._addEventListeners();
    }

    /**
     * Clear Table Preview
     */
    public clear(): XDPromise<void> {
        super.clear();
        return this.table.freeResultset();
    }

    /**
     * Render the view of the data
     */
    public render($container: JQuery): XDPromise<void> {
        super.render($container);

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.table.getMetaAndResultSet()
        .then(() => {
            return this._startBuildTable();
        })
        .then(() => {
            this._afterBuild();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _afterGenerateTableShell(): void {};
    protected _afterBuildInitialTable(_tableId: TableId): void {};

    private _addEventListeners(): void {
        // XXX this is still buggy, need update!
        this.$view.scroll((event) => {
            // if (!mainFrameScrolling) {
            //     mainFrameScrolling = true;
            //     // apply the following actions only once per scroll session
            //     if ($(this).hasClass('scrollLocked')) {
            //         scrollPrevented = true;
            //     }
            //     else {
            //         xcMenu.close();
            //     }
            //     xcMenu.removeKeyboardNavigation();
            //     // table head's dropdown has position issue if not hide
            //     $('.xcTheadWrap').find('.dropdownBox')
            //         .addClass('dropdownBoxHidden');
            //     $(".xcTheadWrap").find(".lockIcon").addClass("xc-hidden");
            //     xcTooltip.hideAll();
            //     $('.tableScrollBar').hide();
            // }
            $(event.target).scrollTop(0);
            // clearTimeout(mainFrameScrollTimer);
            // mainFrameScrollTimer = setTimeout(mainFrameScrollingStop, 300);
            // if (!scrollPrevented) {
            TblFunc.moveFirstColumn(null, true);
            // }
        });
    }

    private _startBuildTable(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const table: TableMeta = this.table;
        const tableId: string = table.getId();
        let initialTableBuilt: boolean = false;

        RowManager.getFirstPage(tableId)
        .then((jsonData) => {
            let isEmpty: boolean = false;
            table.currentRowNumber = jsonData.length;
            if (table.resultSetCount === 0) {
                isEmpty = true;
            }

            this._generateTableShell(tableId);
            this._buildInitialTable(tableId, jsonData, isEmpty);
            initialTableBuilt = true;

            const $table: JQuery = $('#xcTable-' + tableId);
            const requiredNumRows: number = Math.min(gMaxEntriesPerPage,
                                              table.resultSetCount);
            const numRowsStillNeeded: number = requiredNumRows - $table.find('tbody tr').length;
            if (numRowsStillNeeded > 0) {
                const $firstRow: JQuery = $table.find('tbody tr:first');
                let topRowNum: number;
                if (!$firstRow.length) {
                    // if no rows were built on initial fetch
                    topRowNum = 0;
                } else {
                    xcHelper.parseRowNum($firstRow);
                }
                const targetRow: number = table.currentRowNumber + numRowsStillNeeded;
                const info: object = {
                    "targetRow": targetRow,
                    "lastRowToDisplay": targetRow,
                    "bulk": false,
                    "dontRemoveRows": true,
                    "tableId": tableId,
                    "currentFirstRow": topRowNum,
                };

                return RowManager.addRows(table.currentRowNumber,
                                            numRowsStillNeeded,
                                            RowDirection.Bottom, info);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            if (!initialTableBuilt) {
                console.error("startBuildTable fails!", error);
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    // creates thead and cells but not the body of the table
    private _generateTableShell(tableId: TableId): void {
        const xcTableWrap: string =
            '<div id="xcTableWrap-' + tableId + '"' +
                ' class="xcTableWrap tableWrap building" ' +
                'data-id="' + tableId + '">' +
                '<div id="xcTbodyWrap-' + tableId + '" class="xcTbodyWrap" ' +
                'data-id="' + tableId + '"></div>' +
                '<div class="tableScrollBar">' +
                    '<div class="sizer"></div>' +
                '</div>' +
            '</div>';
        this.getView().html(xcTableWrap);

        const tableShell: string = TblManager.generateTheadTbody(tableId);
        const tableHtml: string =
            '<table id="xcTable-' + tableId + '" class="xcTable dataTable" ' +
            'style="width:0px;" data-id="' + tableId + '">' +
                tableShell +
            '</table>' +
            '<div class="rowGrab last"></div>';

        this.getView().find(".xcTbodyWrap").append(tableHtml);
        this._afterGenerateTableShell();
    }

    private _buildInitialTable(
        tableId: TableId,
        jsonData: string[],
        isEmpty: boolean
    ): void {
        const numRows: number = jsonData.length;
        const $table: JQuery = $("#xcTable-" + tableId);
        RowScroller.add(tableId);

        if (isEmpty && numRows === 0) {
            console.log('no rows found, ERROR???');
            $table.addClass('emptyTable');
            jsonData = [""];
        }

        TblManager.pullRowsBulk(tableId, jsonData, 0);
        this._addTableListeners(tableId);
        TblManager.addColListeners($table, tableId, {
            modelingMode: this.modelingMode
        });

        if (numRows === 0) {
            $table.find('.idSpan').text("");
        }
        this._afterBuildInitialTable(tableId);
    }

    protected _afterBuild(): void {
        const tableId: TableId = this.table.getId();
        const $table: JQuery = $('#xcTable-' + tableId);
        const table: TableMeta = this.table;
        const $lastRow: JQuery = $table.find('tr:last');
        const lastRowNum: number = xcHelper.parseRowNum($lastRow);
        table.currentRowNumber = lastRowNum + 1;

        const $xcTableWrap: JQuery = $('#xcTableWrap-' + tableId);
        RowScroller.resize();
        $xcTableWrap.removeClass("building");
        this._autoSizeDataCol(tableId);
    }

    private _autoSizeDataCol(tableId: TableId): void {
        const progCols: ProgCol[] = this.table.tableCols;
        let dataCol: ProgCol;
        let dataColIndex: number;
        for (let i = 0; i < progCols.length; i++) {
            if (progCols[i].isDATACol()) {
                dataCol = progCols[i];
                dataColIndex = i + 1;
                break;
            }
        }
        if (dataCol.width === "auto") {
            const winWidth: number = $(window).width();
            let maxWidth: number = 200;
            let minWidth: number = 150;
            if (winWidth > 1400) {
                maxWidth = 300;
            } else if (winWidth > 1100) {
                maxWidth = 250;
            }
            if (dataCol.hasMinimized()) {
                dataCol.width = minWidth;
                return;
            } else {
                dataCol.width = minWidth;
            }
            const $th: JQuery = $('#xcTable-' + tableId).find('th.col' + dataColIndex);
            TblFunc.autosizeCol($th, {
                fitAll: true,
                minWidth: minWidth,
                maxWidth: maxWidth,
                datastore: false,
                dblClick: false,
                unlimitedWidth: false,
                multipleCols: false,
                includeHeader: false
            });
        }
    }

    protected _addTableListeners(tableId: TableId): void {
        const $xcTableWrap: JQuery = $("#xcTableWrap-" + tableId);
        $xcTableWrap.scroll(function() {
            $(this).scrollLeft(0); // prevent scrolling when colmenu is open
            $(this).scrollTop(0); // prevent scrolling when colmenu is open
        });

        const $rowGrab: JQuery = $("#xcTbodyWrap-" + tableId).find(".rowGrab.last");
        $rowGrab.mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });
    }
}