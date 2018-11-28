class XcDatasetViewer extends XcViewer {
    private dataset: DSObj;
    private currentRow: number;
    private totalRows: number;
    private colStrLimit: number;
    private readonly defaultColWidth: number = 130;
    private readonly initialNumRowsToFetch: number = 40;

    public constructor(dataset: DSObj) {
        super(dataset.getFullName()); // use ds full name as id
        this.dataset = dataset;
        this.currentRow = 0;
        this.totalRows = 0;
        this.$view.addClass("datasetTableWrap");
        this._addEventListeners();
    }

    public getTitle(): string {
        return this.dataset.getName();
    }

    /**
     * Clear Dataset Preview
     */
    public clear(): XDPromise<void> {
        super.clear();
        return PromiseHelper.resolve();
    }

     /**
     * Render the view of the data
     */
    public render($container: JQuery): XDPromise<void> {
        super.render($container);

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        // update date part of the table info first to make UI smooth
        // updateTableInfoDisplay(dsObj, true);

        this.dataset.fetch(0, this.initialNumRowsToFetch)
        .then((jsons, jsonKeys) => {
            if (this.dataset.getError() != null) {
                return PromiseHelper.reject(DSTStr.PointErr);
            }
            // updateTableInfoDisplay(dsObj, null, true);
            this.totalRows = this.dataset.getNumEntries();
            this._getSampleTable(jsonKeys, jsons);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getTableEle(): JQuery {
        return this.$view.find("table");
    }

    private _addEventListeners(): void {
        // resize column
        this.$view.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                minWidth: 25
            });
        });

        this.$view.scroll((event) => {
            $(event.target).scrollTop(0);
            TblFunc.moveFirstColumn(this._getTableEle());
        });
    }

    private _getSampleTable(jsonKeys: string[], jsons: object[]): void {
        const html: string = this._getSampleTableHTML(jsonKeys, jsons);
        this.$view.html(html);
        // DSTable.refresh(true);
        this._sizeColumns();
        TblFunc.moveFirstColumn(this._getTableEle());

        // scroll cannot use event bubble so we have to add listener
        // to .datasetTbodyWrap every time it's created
        this.$view.find(".datasetTbodyWrap").scroll((event) => {
            this._dataStoreTableScroll($(event.target));
        });
    }

    private _setColStrLimie(numKeys: number): void {
        this.colStrLimit = 250;
        if (numKeys < 5) {
            this.colStrLimit = Math.max(1000 / numKeys, this.colStrLimit);
        }
    }

    private _getSampleTableHTML(jsonKeys: string[], jsons: object[]): string {
        // validation check
        if (!jsonKeys || !jsons) {
            return "";
        }

        let tr: string = "";
        let th: string = "";

        let columnsType: string[] = [];  // track column type
        let numKeys: number = Math.min(1000, jsonKeys.length); // limit to 1000 ths
        this._setColStrLimie(numKeys);
        this.currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        tr = this._getTableRowsHTML(jsonKeys, jsons, columnsType);
        if (numKeys > 0) {
            th += '<th class="rowNumHead" title="select all columns"' +
                    ' data-toggle="tooltip" data-placement="top"' +
                    ' data-container="body"><div class="header">' +
                  '</div></th>';
        }

        // table header
        for (var i = 0; i < numKeys; i++) {
            var key = jsonKeys[i].replace(/\'/g, '&#39');
            var thClass = "th col" + (i + 1);
            var type = columnsType[i];
            var width = xcHelper.getTextWidth(null, key);

            width += 2; // text will overflow without it
            width = Math.max(width, this.defaultColWidth); // min of 130px

            th +=
                '<th class="' + thClass + '" style="width:' + width + 'px;">' +
                    '<div class="header type-' + type + '" ' +
                         'data-type=' + type + '>' +
                        '<div class="colGrab"></div>' +
                        '<div class="flexContainer flexRow">' +
                            '<div class="flexWrap flex-left" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'title="' + type + '">' +
                                '<span class="iconHidden"></span>' +
                                '<span class="type icon"></span>' +
                            '</div>' +
                            '<div class="flexWrap flex-mid">' +
                                '<input spellcheck="false"' +
                                    'class="tooltipOverflow editableHead ' +
                                    'shoppingCartCol ' +
                                    thClass + '" value=\'' + key + '\' ' +
                                    'disabled ' +
                                    'data-original-title="' + key + '" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +'>' +
                            '</div>' +
                            '<div class="flexWrap flex-right">' +
                                '<i class="icon xi-tick fa-8"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</th>';
        }

        const html: string =
            '<div class="datasetTbodyWrap">' +
                '<table class="datasetTable dataTable" ' +
                        'data-dsid="' + this.dataset.getId() + '">' +
                    '<thead>' +
                        '<tr>' + th + '</tr>' +
                    '</thead>' +
                    '<tbody>' + tr + '</tbody>' +
                '</table>' +
            '</div>';

        return html;
    }

    private _getTableRowsHTML(
        jsonKeys: string[],
        jsons: object[],
        columnsType: string[]
    ): string {
        let tr: string = "";
        let i: number = 0;
        let knf: boolean = false;

        jsons.forEach((json) => {
            tr += '<tr>';
            tr += '<td class="lineMarker"><div class="idSpan">' +
                    (this.currentRow + i + 1) + '</div></td>';
            // loop through each td, parse object, and add to table cell
            const numKeys: number = Math.min(jsonKeys.length, 1000); // limit to 1000 ths
            for (let j = 0; j < numKeys; j++) {
                const key: string = jsonKeys[j];
                const val: any = json[key];
                knf = false;
                // Check type
                columnsType[j] = xcHelper.parseColType(val, columnsType[j]);

                if (val === undefined) {
                    knf = true;
                }
                let parsedVal: any = xcHelper.parseJsonValue(val, knf);
                if (this.colStrLimit) {
                    let hiddenStrLen = parsedVal.length - this.colStrLimit;
                    if (hiddenStrLen > 0) {
                        parsedVal = parsedVal.slice(0, this.colStrLimit) +
                                    "...(" +
                                    xcHelper.numToStr(hiddenStrLen) + " " +
                                    TblTStr.Truncate + ")";
                    }
                }
                if (typeof parsedVal === "string") {
                    parsedVal = xcHelper.styleNewLineChar(parsedVal);
                }

                tr += '<td class="col' + (j + 1) + '">' +
                        '<div class="tdTextWrap">' +
                            '<div class="tdText">' +
                                parsedVal +
                            '</div>' +
                        '</div>' +
                      '</td>';
            }

            tr += '</tr>';
            i++;
        });

        return tr;
    }

    private _dataStoreTableScroll($tableWrapper: JQuery): XDPromise<void> {
        const numRowsToFetch: number = 20;
        if (this.currentRow + this.initialNumRowsToFetch >= this.totalRows) {
            return PromiseHelper.resolve();
        }

        const $table = this._getTableEle();
        if ($table.hasClass("fetching")) {
            // when still fetch the data, no new trigger
            console.info("Still fetching previous data!");
            return PromiseHelper.reject("Still fetching previous data!");
        }

        if ($tableWrapper[0].scrollHeight - $tableWrapper.scrollTop() -
                   $tableWrapper.outerHeight() <= 1) {
            if (this.currentRow === 0) {
                this.currentRow += this.initialNumRowsToFetch;
            } else {
                this.currentRow += numRowsToFetch;
            }

            $table.addClass("fetching");
            const deferred: XDDeferred<void> = PromiseHelper.deferred();

            this._scrollSampleAndParse(this.currentRow, numRowsToFetch)
            .then(deferred.resolve)
            .fail(function(error) {
                deferred.reject(error);
                console.error("Scroll data sample table fails", error);
            })
            .always(function() {
                // so this is the only place the needs to remove class
                $table.removeClass("fetching");
            });

            return deferred.promise();
        } else {
            return PromiseHelper.reject("no need to scroll");
        }
    }

    private _scrollSampleAndParse(
        rowToGo: number,
        rowsToFetch: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.dataset.fetch(rowToGo, rowsToFetch)
        .then((jsons) => {
            const $table = this._getTableEle();
            const jsonKeys: string[] = [];

            $table.find("th.th").each(function(index) {
                // when scroll, it should follow the order of current header
                const header: string = $(this).find(".editableHead").val();
                jsonKeys[index] = header;
            });

            const tr: string = this._getTableRowsHTML(jsonKeys, jsons, []);
            $table.append(tr);
            TblFunc.moveFirstColumn($table);

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _sizeColumns(): void {
        const destWidth: number = this.$view.parent().width() - 40;
        const $headers: JQuery = this._getTableEle().find("th:gt(0)");
        let bestFitWidths: number[] = [];
        let totalWidths: number = 0;
        const needsExpanding: boolean[] = [];
        let numStaticWidths: number = 0;
        let expandWidths: number = 0;

        // track which columns will expand and which will remain at
        // default colwidth
        $headers.each((_index, el) => {
            let width: number = TblFunc.getWidestTdWidth($(el), {
                "includeHeader": true,
                "fitAll": true,
                "datastore": true
            });
            let expanding: boolean = false;
            if (width > this.defaultColWidth) {
                expanding = true;
            } else {
                numStaticWidths++;
            }
            needsExpanding.push(expanding);
            width = Math.max(width, this.defaultColWidth);
            bestFitWidths.push(width);
            totalWidths += width;
            if (expanding) {
                expandWidths += width;
            }
        });

        let ratio: number = destWidth / totalWidths;
        if (ratio < 1) {
            // extra width is the remainining width that the larger columns
            // can take up
            const remainingWidth: number = destWidth - (numStaticWidths *
                                              this.defaultColWidth);
            ratio = remainingWidth / expandWidths;

            bestFitWidths = bestFitWidths.map((width, i) => {
                if (needsExpanding[i]) {
                    return Math.max(this.defaultColWidth, Math.floor(width * ratio));
                } else {
                    return width;
                }
            });
        }

        $headers.each(function(i) {
            $(this).outerWidth(bestFitWidths[i]);
        });

        // var $dsTable = $("#dsTable");
        // $tableWrap.width($dsTable.width());
    }
}