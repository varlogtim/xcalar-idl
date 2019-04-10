// XXX TODO: make it a instance of ds.js
class DSTable {
    private static currentRow: number = 0;
    private static totalRows: number = 0;
    private static lastDSToSample: string; // used to track the last table to samle in async call

    // constant
    private static readonly defaultColWidth: number = 130;
    private static readonly initialNumRowsToFetch = 40;

    /**
     * DSTable.setup
     */
    public static setup(): void {
        this._setupSampleTable();
    }

    /**
     * DSTable.showError
     * @param dsId
     * @param error
     * @param isFetchError
     * @param noRetry
     * @param isImportError
     */
    public static showError(
        dsId: string,
        error: string,
        isFetchError: boolean,
        noRetry: boolean,
        isImportError: boolean
    ) {
        let dsObj: DSObj | null = DS.getDSObj(dsId);
        if (dsObj == null) {
            // error case
            return;
        }
        this._showTableView(dsId);
        this._updateTableInfoDisplay(dsObj, false, false);
        this._setupViewAfterError(error, isFetchError, noRetry, isImportError);
    }

    /**
     * DSTable.show
     * @param dsId
     * @param isLoading
     */
    public static show(dsId: string, isLoading: boolean): XDPromise<void> {
        let dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        let notLastDSError: string = "not last ds";

        this._showTableView(dsId);
        // update date part of the table info first to make UI smooth
        this._updateTableInfoDisplay(dsObj, true, false);

        if (isLoading) {
            this.setupViewBeforeLoading(dsObj);
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $dsTable = this._getDSTableEl();
        let timer;

        if ($dsTable.length === 0 ||
            $dsTable.data("dsid") !== dsObj.getId()
        ) {
            // when not the case of already focus on this ds and refresh again
            // only when the loading is slow, show load section

            timer = setTimeout(() => {
                this._resetLoading();
            }, 300);
        }
        let datasetName = dsObj.getFullName();
        this.lastDSToSample = datasetName;

        dsObj.fetch(0, this.initialNumRowsToFetch)
        .then((jsons, jsonKeys) => {
            if (this.lastDSToSample !== datasetName) {
                // when network is slow and user trigger another
                // get sample table code will goes here
                return PromiseHelper.reject(notLastDSError);
            } else if (dsObj.getError() != null) {
                return PromiseHelper.reject(DSTStr.PointErr);
            }
            clearTimeout(timer);
            this._setupViewAfterLoading(dsObj);
            this._getSampleTable(dsObj, jsonKeys, jsons);

            deferred.resolve();
        })
        .fail((error) => {
            clearTimeout(timer);
            let noRetry: boolean = false;
            if (error === notLastDSError ||
                this.lastDSToSample !== datasetName)
            {
                deferred.reject(error);
                return;
            }

            error = dsObj.getError() || error;
            let errorMsg: string;
            if (typeof error === "object" && error.error != null) {
                errorMsg = error.error;
                if (error.status === StatusT.StatusDatasetAlreadyDeleted) {
                    noRetry = true;
                }
            } else if (error instanceof Error){
                errorMsg = String(error);
            } else if (typeof error === "string") {
                errorMsg = error;
            } else {
                // unhanled type of error;
                errorMsg = ErrTStr.Unknown;
            }

            this._setupViewAfterError(errorMsg, true, noRetry, false);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * DSTable.setupViewBeforeLoading
     * this is called sometimes when we're not focusing on the dataset table
     * but we want to initialize the progress circle, so containerId and dsId
     * may not match in that case
     * @param dsObj
     */
    public static setupViewBeforeLoading(dsObj: DSObj): void {
        let $dsTableContainer = this._getContainer();
        let containerId: string = this._getPreviewDSId();
        if (!dsObj || containerId === dsObj.getId()) {
            this._resetLoading();
        }

        if (dsObj) {
            let txId: number = DS.getGrid(dsObj.getId()).data("txid");
            let $lockIcon: JQuery = $dsTableContainer.find('.lockedTableIcon[data-txid="' + txId + '"]');
            if ($lockIcon.length && containerId === dsObj.getId()) {
                $lockIcon.removeClass("xc-hidden");
                return;
            }
            let withText: boolean = true;
            let progressAreaHtml = xcUIHelper.getLockIconHtml(txId, 0, withText);
            $dsTableContainer.find(".loadSection").append(progressAreaHtml);
            let progressCircle = new ProgressCircle(txId, 0, withText);
            $dsTableContainer.find('.cancelLoad[data-txid="' + txId + '"]')
                            .data("progresscircle", progressCircle);
        }
    }

    private static _setupViewAfterError(
        error: any,
        isFetchError: boolean,
        noRetry: boolean,
        isImportError: boolean
    ): void {
        error = this._parseError(error);
        // backend might return this: "<string>"
        error = xcStringHelper.escapeHTMLSpecialChar(error);
        var startError = "";
        if (isFetchError) {
            startError = StatusMessageTStr.DSFetchFailed;
        } else if (isImportError) {
            startError = StatusMessageTStr.ImportDSFailed;
        }
        if (startError) {
            startError += ". ";
        }
        error = startError + error;

        this.clear();
        let $dsTableContainer = this._getContainer();
        $dsTableContainer.removeClass("loading");
        $dsTableContainer.addClass("error");

        let $errorSection = $dsTableContainer.find(".errorSection");
        $errorSection.find(".error").html(error);

        let dsId: string = this._getPreviewDSId();
        let dsObj = DS.getDSObj(dsId);
        if (!noRetry &&
            dsObj != null &&
            isImportError &&
            dsObj.getUser() === XcUser.getCurrentUserName()
        ) {
            $errorSection.find(".suggest").removeClass("xc-hidden");
        } else {
            $errorSection.find(".suggest").addClass("xc-hidden");
        }
    }

    /**
     * DSTable.hide
     */
    public static hide(): void {
        this._getDSTableViewEl().addClass("xc-hidden");
        this.clear();
        DS.unFocus();
        this._getContainer().removeData("id");
    }

    /**
     * DSTable.getId
     */
    public static getId(): string | null {
        let $table = this._getDSTableEl();
        if ($table.is(":visible")) {
            return $table.data("dsid");
        } else {
            // when not visible
            return null;
        }
    }

    /**
     * DSTable.clear
     */
    public static clear(): void {
        this._getTableWrapEl().html("");
    }

    /**
     * DSTable.refresh
     * @param resize
     */
    public static refresh(resize: boolean = false): void {
        // size tableWrapper so borders fit table size
        // As user can maunally resize to have/not have scrollbar
        // we always need the scrollBarpadding
        let $dsTable = this._getDSTableEl();
        let tableHeight = $dsTable.height();
        this._getTableWrapEl().width($dsTable.width());

        if (resize) {
            this._sizeColumns();
        }
        const scrollBarPadding: number = 10;
        this._getContainer().height(tableHeight + scrollBarPadding);
    }

    private static _getContainer(): JQuery {
        return  $("#dsTableContainer");
    }

    private static _getTableWrapEl(): JQuery {
        return $("#dsTableWrap");
    }

    private static _getDSInfoPathEl(): JQuery {
        return $("#dsInfo-path");
    }

    private static _getDSTableEl(): JQuery {
        return $("#dsTable");
    }

    private static _getDSTableViewEl(): JQuery {
        return $("#dsTableView");
    }

    private static _getDSInfoRecordEl(): JQuery {
        return $("#dsInfo-records");
    }

    private static _getDSInfoErrorEl(): JQuery {
        return $("#dsInfo-error");
    }

    private static _getPreviewDSId(): string | null {
        return this._getContainer().data("id");
    }

    private static _showTableView(dsId: string): void {
        this._getDSTableViewEl().removeClass("xc-hidden");
        this._getContainer().data("id", dsId);
        DSForm.hide();
    }

    private static _resetLoading(): void {
        let $dsTableContainer = this._getContainer();
        $dsTableContainer.removeClass("error");
        $dsTableContainer.addClass("loading");
        $dsTableContainer.find(".lockedTableIcon").addClass("xc-hidden");
        this._getTableWrapEl().html("");
    }

    private static _setupViewAfterLoading(dsObj: DSObj): void {
        // update info here
        this._updateTableInfoDisplay(dsObj, false, true);
        let $dsTableContainer = this._getContainer();
        $dsTableContainer.removeClass("error");
        $dsTableContainer.removeClass("loading");
    }

    private static _parseError(error: any): string {
        try {
            if (error && typeof error === "object") {
                var errorStr;
                var log = error.log || "";
                var output = error.output ? JSON.stringify(error.output) : "";
                if (error.status === StatusT.StatusUdfExecuteFailed) {
                    errorStr = log;
                } else {
                    errorStr = error.error + " " + log
                }
                errorStr = errorStr + "\n" + output;
                return errorStr;
            } else {
                return xcHelper.parseError(error);
            }
        } catch (e) {
            return xcHelper.parseError(error);
        }
    }

    private static _getSampleTable(
        dsObj: DSObj,
        jsonKeys: string[],
        jsons: any[]
    ) {
        let html = this._getSampleTableHTML(dsObj, jsonKeys, jsons);
        this._getTableWrapEl().html(html);
        this.refresh(true);
        TblFunc.moveFirstColumn($("#dsTable"));

        // scroll cannot use event bubble so we have to add listener
        // to .datasetTbodyWrap every time it's created
        let self = this;
        $("#dsTableWrap .datasetTbodyWrap").scroll(function() {
            self._dataStoreTableScroll($(this));
        });
    }

    private static _updateTableInfoDisplay(
        dsObj: DSObj,
        preFetch: boolean,
        postFetch: boolean
    ): void {
        let dsName = dsObj.getName();
        let numEntries = dsObj.getNumEntries();
        let path = dsObj.getPathWithPattern() || CommonTxtTstr.NA;
        let target = dsObj.getTargetName();
        let $dsInfoPath = this._getDSInfoPathEl();
        $dsInfoPath.text(path);

        xcTooltip.changeText($dsInfoPath, target + "\n" + path);
        xcTooltip.enable($dsInfoPath);
        $("#dsInfo-title").text(dsName);
        $("#dsInfo-author").text(dsObj.getUser());
        // there is no fail case
        $("#dsInfo-size").text(dsObj.getDisplaySize());
        $("#dsInfo-date").text(dsObj.getDate());

        var format = dsObj.getFormat() || CommonTxtTstr.NA;
        $("#dsInfo-format").text(format);
        var $dsInfoUdf = $("#dsInfo-udf");
        if (dsObj.moduleName && dsObj.moduleName.trim() !== "") {
            var titleJSON = {
                "UDF Module": dsObj.moduleName,
                "UDF Function": dsObj.funcName
            };
            if (dsObj.udfQuery) {
                titleJSON["UDF Query"] = dsObj.udfQuery;
            }
            xcTooltip.add($dsInfoUdf, {title: JSON.stringify(titleJSON)});
            $dsInfoUdf.removeClass("xc-hidden");
        } else {
            xcTooltip.remove($dsInfoUdf);
            $dsInfoUdf.addClass("xc-hidden");
        }
        // XXX TODO tooltip with query
        let numEntriesStr: string;
        if (typeof numEntries === "number") {
            numEntriesStr = xcStringHelper.numToStr(numEntries);
        } else {
            numEntriesStr = CommonTxtTstr.NA;
        }

        this._getDSInfoRecordEl().text(numEntriesStr);
        this.totalRows = parseInt(numEntriesStr.replace(/\,/g, ""));
        if (preFetch || postFetch) {
            this._toggleErrorIcon(dsObj);
        } else {
            this._getDSInfoErrorEl().addClass("xc-hidden");
        }
    }

    private static _dataStoreTableScroll($tableWrapper): XDPromise<void> {
        if (this.currentRow + this.initialNumRowsToFetch >= this.totalRows) {
            return PromiseHelper.resolve();
        }

        const numRowsToFetch: number = 20;
        let $dsTable = this._getDSTableEl();
        if ($dsTable.hasClass("fetching")) {
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

            $dsTable.addClass("fetching");
            let dsId: string = $dsTable.data("dsid");
            let deferred: XDDeferred<void> = PromiseHelper.deferred();

            this._scrollSampleAndParse(dsId, this.currentRow, numRowsToFetch)
            .then(() => {
                deferred.resolve();
            })
            .fail((error) => {
                deferred.reject(error);
                console.error("Scroll data sample table fails", error);
            })
            .always(() => {
                // when switch ds, #dsTable will be re-built
                // so this is the only place the needs to remove class
                $dsTable.removeClass("fetching");
            });

            return deferred.promise();
        } else {
            return PromiseHelper.reject("no need to scroll");
        }
    }

    private static _scrollSampleAndParse(
        dsId: string,
        rowToGo: number,
        rowsToFetch: number
    ): XDPromise<void> {
        let dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        dsObj.fetch(rowToGo, rowsToFetch)
        .then((jsons) => {
            let $dsTable = this._getDSTableEl();
            var curDSId = $dsTable.data("dsid");
            if (dsId !== curDSId) {
                // when change ds
                console.warn("Sample table change to", curDSId, "cancel fetch");
                deferred.resolve();
                return;
            }

            let realJsonKeys: string[] = [];

            $dsTable.find("th.th").each(function(index) {
                let $th = $(this);
                let header = $th.find(".editableHead").val();
                // when scroll, it should follow the order of current header
                realJsonKeys[index] = header;
            });

            let tr = this._getTableRowsHTML(realJsonKeys, jsons, []);
            $dsTable.append(tr);
            TblFunc.moveFirstColumn($dsTable);

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // event set up for the module
    private static _setupSampleTable() {
        let $dsInfoPath = this._getDSInfoPathEl();
        $dsInfoPath.on("click", () => {
            // copies filepath to clipboard
            let value = $dsInfoPath.text();
            xcUIHelper.copyToClipboard(value);

            $dsInfoPath.parent().addClass("copiableText");
            setTimeout(() => {
                $dsInfoPath.parent().removeClass("copiableText");
            }, 1800);
        });

        let $dsTableView = this._getDSTableViewEl();
        // reload ds with new preview size
        $dsTableView.on("click", ".errorSection .retry", () => {
            let dsId = this._getPreviewDSId();
            if (dsId == null) {
                console.error("cannot find ds");
                return;
            }

            this._rePointDS(dsId);
        });

        // resize column
        let $tableWrap = this._getTableWrapEl();
        $tableWrap.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                minWidth: 25
            });
        });

        let $dsTableContainer = this._getContainer();
        $dsTableContainer.scroll(function(){
            var $dsTable = $("#dsTable");
            $(this).scrollTop(0);
            TblFunc.moveFirstColumn($dsTable);
        });

        $dsTableContainer.on("click", ".cancelLoad", function() {
            var txId = $(this).data("txid");
            QueryManager.cancelDS(txId);
        });

        $("#showFileListBtn").click(() => {
            let dsId = this._getPreviewDSId();
            let dsObj = DS.getDSObj(dsId);
            let isFileError : boolean = false;
            let dsName: string = "";
            if (dsObj && dsObj.advancedArgs) {
                isFileError = dsObj.advancedArgs.allowFileErrors &&
                             !dsObj.advancedArgs.allowRecordErrors;
                dsName = dsObj.getName();
            }
            FileListModal.show(dsId, dsName, isFileError);
        });

        $("#createDF").click(() => {
            this._createDF();
        });

        this._getDSInfoErrorEl().click(() => {
            let dsId = this._getPreviewDSId();
            let dsObj = DS.getDSObj(dsId);
            let isRecordError: boolean = false;
            let numTotalErrors: number;
            if (!dsObj || !dsObj.advancedArgs) {
                isRecordError = true;
            } else {
                isRecordError = dsObj.advancedArgs.allowRecordErrors;
                numTotalErrors = dsObj.numErrors;
            }
            DSImportErrorModal.show(dsId, numTotalErrors, isRecordError);
        });
    }

    private static _createDF() {
        let dsId = this._getPreviewDSId();;
        let dsObj = DS.getDSObj(dsId);
        if (dsObj) {
            DagView.newTabFromSource(DagNodeType.Dataset, {
                source: dsObj.getId(),
                prefix: xcHelper.normalizePrefix(dsObj.getName())
            });
        }
    }

    // if table is less wide than the panel, expand column widths if content is
    // oveflowing
    private static _sizeColumns() {
        let destWidth: number = this._getContainer().parent().width() - 40;
        let $tableWrap = this._getTableWrapEl();
        let $headers = $tableWrap.find("th:gt(0)");
        let bestFitWidths: number[] = [];
        let totalWidths: number = 0;
        let needsExpanding: boolean[] = [];
        let numStaticWidths: number = 0;
        let expandWidths: number = 0;
        const defaultColWidth: number = this.defaultColWidth;

        // track which columns will expand and which will remain at
        // default colwidth
        $headers.each(function() {
            let width = TblFunc.getWidestTdWidth($(this), {
                "includeHeader": true,
                "fitAll": true,
                "datastore": true
            });
            let expanding: boolean = false;
            if (width > defaultColWidth) {
                expanding = true;
            } else {
                numStaticWidths++;
            }
            needsExpanding.push(expanding);
            width = Math.max(width, defaultColWidth);
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
            let remainingWidth: number = destWidth - (numStaticWidths * defaultColWidth);
            ratio = remainingWidth / expandWidths;

            bestFitWidths = bestFitWidths.map(function(width, i) {
                if (needsExpanding[i]) {
                    return Math.max(defaultColWidth, Math.floor(width * ratio));
                } else {
                    return width;
                }
            });
        }

        $headers.each(function(i) {
            $(this).outerWidth(bestFitWidths[i]);
        });

        let $dsTable = this._getDSTableEl();
        $tableWrap.width($dsTable.width());
    }

    private static _rePointDS(dsId: string): void {
        // maybe it's a succes point but ds table has error
        let dsObj = DS.getErrorDSObj(dsId);
        if (dsObj != null) {
            DS.removeErrorDSObj(dsId);
        } else {
            dsObj = DS.getDSObj(dsId);
        }

        if (!dsObj) {
            Alert.error(DSTStr.NotFindDS, null);
            return;
        }

        let sources = dsObj.getSources();
        let files = sources.map(function(source) {
            return {
                "path": source.path,
                "recursive": source.recursive,
                "dsToReplace": dsId
            };
        });
        DSPreview.show({
            "targetName": dsObj.getTargetName(),
            "files": files,
            "format": dsObj.getFormat(),
            "dsName": dsObj.getName(),
            "skipRows": dsObj.skipRows,
            "moduleName": dsObj.moduleName,
            "funcName": dsObj.funcName,
            "hasHeader": dsObj.hasHeader,
            "fieldDelim": dsObj.fieldDelim,
            "lineDelim": dsObj.lineDelim,
            "quoteChar": dsObj.quoteChar,
            "typedColumns": dsObj.typedColumns,
            "udfQuery": dsObj.udfQuery,
            "advancedArgs": dsObj.advancedArgs
        }, null, true);
    }

    // sample table html
    private static _getSampleTableHTML(
        dsObj: DSObj,
        jsonKeys: string[],
        jsons: any[]
    ): HTML {
        // validation check
        if (!dsObj || !jsonKeys || !jsons) {
            return "";
        }


        let schema = dsObj.getColumns();
        let knownTypes: ColumnType[] = [];
        if (schema && schema.length) {
            jsonKeys = schema.map((colInfo) => {
                let name = xcHelper.unescapeColName(colInfo.name);
                knownTypes.push(colInfo.type);
                return name;
            });
        }
        let columnsType: ColumnType[] = [];  // track column type
        let numKeys: number = jsonKeys.length;
        numKeys = Math.min(1000, numKeys); // limit to 1000 ths
        let colStrLimit: number = 250;
        if (numKeys < 5) {
            colStrLimit = Math.max(1000 / numKeys, colStrLimit);
        }
        this.currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        let tr: HTML = this._getTableRowsHTML(jsonKeys, jsons, columnsType, colStrLimit);
        let th: HTML = "";
        if (numKeys > 0) {
            th += '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                  '</th>';
        }

        // table header
        for (let i = 0; i < numKeys; i++) {
            let key: string = jsonKeys[i].replace(/\'/g, '&#39');
            let thClass: string = "th col" + (i + 1);
            let type: ColumnType = knownTypes[i] || columnsType[i];
            let width = xcUIHelper.getTextWidth(null, key);

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

        let html =
            '<div class="datasetTbodyWrap">' +
                '<table id="dsTable" class="datasetTable dataTable" ' +
                        'data-dsid="' + dsObj.getId() + '">' +
                    '<thead>' +
                        '<tr>' + th + '</tr>' +
                    '</thead>' +
                    '<tbody>' + tr + '</tbody>' +
                '</table>' +
            '</div>';

        return html;
    }

    private static _getTableRowsHTML(
        jsonKeys: string[],
        jsons: any[],
        columnsType: ColumnType[],
        colStrLimit?: number
    ): HTML {
        let tr: HTML = "";
        let i: number = 0;
        let knf: boolean = false;

        jsons.forEach((json) => {
            tr += '<tr>';
            tr +=
                '<td class="lineMarker">' +
                    '<div class="idSpan">' +
                        (this.currentRow + i + 1) +
                    '</div>' +
                '</td>';
            // loop through each td, parse object, and add to table cell
            let numKeys: number = Math.min(jsonKeys.length, 1000); // limit to 1000 ths
            for (let j = 0; j < numKeys; j++) {
                let key: string = jsonKeys[j];
                let val: any = json[key];
                knf = false;
                // Check type
                columnsType[j] = xcHelper.parseColType(val, columnsType[j]);

                if (val === undefined) {
                    knf = true;
                }
                let parsedVal = xcHelper.parseJsonValue(val, knf);
                if (colStrLimit) {
                    let hiddenStrLen = parsedVal.length - colStrLimit;
                    if (hiddenStrLen > 0) {
                        parsedVal = parsedVal.slice(0, colStrLimit) +
                                    "...(" +
                                    xcStringHelper.numToStr(hiddenStrLen) + " " +
                                    TblTStr.Truncate + ")";
                    }
                }
                if (typeof parsedVal === "string") {
                    parsedVal = xcUIHelper.styleNewLineChar(parsedVal);
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

    private static _toggleErrorIcon(dsObj: DSObj) {
        let $dsInfoError = this._getDSInfoErrorEl();
        $dsInfoError.addClass("xc-hidden");
        if (!dsObj.numErrors) {
            return;
        }

        if (!dsObj.advancedArgs) {
            let datasetName = dsObj.getFullName();
            dsObj.addAdvancedArgs()
            .then(() => {
                if (this.lastDSToSample !== datasetName) {
                    return;
                }
                this._showIcon(dsObj);
            }); // if fail, keep hidden
        } else {
            this._showIcon(dsObj);
        }
    }

    private static _showIcon(dsObj: DSObj): void {
        let $dsInfoError = this._getDSInfoErrorEl();
        $dsInfoError.removeClass("xc-hidden");
        let numErrors: string = xcStringHelper.numToStr(dsObj.numErrors);
        let text: string;
        if (dsObj.advancedArgs.allowRecordErrors) {
            $dsInfoError.removeClass("type-file");
            if (numErrors === "1") {
                text = DSTStr.ContainsRecordError;
            } else {
                text = xcStringHelper.replaceMsg(DSTStr.ContainsRecordErrors, {
                    num: numErrors
                });
            }
        } else {
            $dsInfoError.addClass("type-file");
            if (numErrors === "1") {
                text = DSTStr.ContainsFileError;
            } else {
                text = xcStringHelper.replaceMsg(DSTStr.ContainsFileErrors, {
                    num: numErrors
                });
            }
        }
        xcTooltip.changeText($dsInfoError, text);
    }
}
