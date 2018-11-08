/*
 * Module for dataset sample table
 */
window.DSTable = (function($, DSTable) {
    var $dsTableContainer; // $("#dsTableContainer")
    var $tableWrap;   // $("#dsTableWrap")
    var $dsInfoPath; //$("#dsInfo-path");

    var currentRow = 0;
    var totalRows = 0;
    var lastDSToSample; // used to track the last table to samle in async call
    var defaultColWidth = 130;

    // constant
    var initialNumRowsToFetch = 40;

    DSTable.setup = function() {
        $dsTableContainer = $("#dsTableContainer");
        $tableWrap = $("#dsTableWrap");
        $dsInfoPath = $("#dsInfo-path");
        setupSampleTable();
    };

    DSTable.showError = function(dsId, error, isFetchError) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            // error case
            return;
        }
        showTableView(dsId);
        updateTableInfoDisplay(dsObj);
        setupViewAfterError(error, isFetchError);
    };

    DSTable.show = function(dsId, isLoading) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        var notLastDSError = "not last ds";

        showTableView(dsId);
        // update date part of the table info first to make UI smooth
        var beforeFetch = true;
        updateTableInfoDisplay(dsObj, beforeFetch);

        if (isLoading) {
            setupViewBeforeLoading(dsObj);
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var timer;
        var $dsTable = $("#dsTable");

        if ($dsTable.length === 0 ||
            $dsTable.data("dsid") !== dsObj.getId()) {
            // when not the case of already focus on this ds and refresh again
            // only when the loading is slow, show load section

            timer = setTimeout(function() {
                setupViewBeforeLoading();
            }, 300);
        }
        var datasetName = dsObj.getFullName();
        lastDSToSample = datasetName;

        dsObj.fetch(0, initialNumRowsToFetch)
        .then(function(jsons, jsonKeys) {
            if (lastDSToSample !== datasetName) {
                // when network is slow and user trigger another
                // get sample table code will goes here
                return PromiseHelper.reject(notLastDSError);
            } else if (dsObj.getError() != null) {
                return PromiseHelper.reject(DSTStr.PointErr);
            }
            clearTimeout(timer);
            setupViewAfterLoading(dsObj);
            getSampleTable(dsObj, jsonKeys, jsons);

            deferred.resolve();
        })
        .fail(function(error) {
            clearTimeout(timer);
            var noRetry = false;
            if (error === notLastDSError ||
                lastDSToSample !== datasetName)
            {
                deferred.reject(error);
                return;
            }

            error = dsObj.getError() || error;
            var errorMsg;
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

            setupViewAfterError(errorMsg, true, noRetry);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    function showTableView(dsId) {
        $("#dsTableView").removeClass("xc-hidden");
        $dsTableContainer.data("id", dsId);
        DSForm.hide();
    }

    function setupViewBeforeLoading(dsObj) {
        $dsTableContainer.removeClass("error");
        $dsTableContainer.addClass("loading");
        $dsTableContainer.find(".lockedTableIcon").addClass("xc-hidden");
        $tableWrap.html("");
        if (dsObj) {
            var progressAreaHtml = "";
            var txId = DS.getGrid(dsObj.getId()).data("txid");
            var $lockIcon = $dsTableContainer
                            .find('.lockedTableIcon[data-txid="' + txId + '"]');
            if ($lockIcon.length) {
                $lockIcon.removeClass("xc-hidden");
                return;
            }
            var withText = true;
            progressAreaHtml = xcHelper.getLockIconHtml(txId, 0, withText);
            $dsTableContainer.find(".loadSection").append(progressAreaHtml);
            var progressCircle = new ProgressCircle(txId, 0, withText);
            $dsTableContainer.find('.cancelLoad[data-txid="' + txId + '"]')
                            .data("progresscircle", progressCircle);
        }
    }

    function setupViewAfterLoading(dsObj) {
        // update info here
        var postFetch = true;
        updateTableInfoDisplay(dsObj, null, postFetch);

        $dsTableContainer.removeClass("error");
        $dsTableContainer.removeClass("loading");
    }

    function setupViewAfterError(error, isFetchError, noRetry) {
        error = xcHelper.parseError(error);
        // backend might return this: "<string>"
        error = xcHelper.escapeHTMLSpecialChar(error);
        var startError = isFetchError
                         ? StatusMessageTStr.DSFetchFailed
                         : StatusMessageTStr.ImportDSFailed;
        error = startError + ". " + error;

        $tableWrap.html("");
        $dsTableContainer.removeClass("loading");
        $dsTableContainer.addClass("error");

        var $errorSection = $dsTableContainer.find(".errorSection");
        $errorSection.find(".error").html(error);

        var dsId = $dsTableContainer.data("id");
        var dsObj = DS.getDSObj(dsId);
        if (!noRetry && dsObj != null &&
            dsObj.getUser() === XcUser.getCurrentUserName()) {
            $errorSection.find(".suggest").removeClass("xc-hidden");
        } else {
            $errorSection.find(".suggest").addClass("xc-hidden");
        }
    }

    DSTable.hide = function() {
        $("#dsTableView").addClass("xc-hidden");
        $("#dsTableWrap").empty();
        $("#dsListSection").find(".gridItems .grid-unit.active")
                                .removeClass("active");
        $dsTableContainer.removeData("id");
    };

    DSTable.getId = function() {
        var $table = $("#dsTable");
        if ($table.is(":visible")) {
            return $table.data("dsid");
        } else {
            // when not visible
            return null;
        }
    };

    DSTable.clear = function() {
        $tableWrap.html("");
    };

    DSTable.refresh = function(resizeCols) {
        // size tableWrapper so borders fit table size
        // As user can maunally resize to have/not have scrollbar
        // we always need the scrollBarpadding
        var $dsTable = $("#dsTable");
        var tableHeight = $dsTable.height();
        var scrollBarPadding = 10;
        $tableWrap.width($dsTable.width());

        if (resizeCols) {
            sizeColumns();
        }

        $dsTableContainer.height(tableHeight + scrollBarPadding);
    };

    function getSampleTable(dsObj, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsObj, jsonKeys, jsons);
        $tableWrap.html(html);
        DSTable.refresh(true);
        TblFunc.moveFirstColumn($("#dsTable"));

        // scroll cannot use event bubble so we have to add listener
        // to .datasetTbodyWrap every time it's created
        $("#dsTableWrap .datasetTbodyWrap").scroll(function() {
            dataStoreTableScroll($(this));
        });
    }

    function updateTableInfoDisplay(dsObj, preFetch, postFetch) {
        var dsName = dsObj.getName();
        var numEntries = dsObj.getNumEntries();
        var path = dsObj.getPathWithPattern() || CommonTxtTstr.NA;
        var target = dsObj.getTargetName();

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
        // TODO tooltip with query
        if (typeof numEntries === "number") {
            numEntries = xcHelper.numToStr(numEntries);
        } else {
            numEntries = CommonTxtTstr.NA;
        }

        $("#dsInfo-records").text(numEntries);

        totalRows = parseInt(numEntries.replace(/\,/g, ""));
        if (preFetch) {
            toggleErrorIcon(dsObj);
        } else if (!postFetch) {
            $("#dsInfo-error").addClass("xc-hidden");
        }
    }

    function dataStoreTableScroll($tableWrapper) {
        var numRowsToFetch = 20;
        if (currentRow + initialNumRowsToFetch >= totalRows) {
            return PromiseHelper.resolve();
        }

        if ($("#dsTable").hasClass("fetching")) {
            // when still fetch the data, no new trigger
            console.info("Still fetching previous data!");
            return PromiseHelper.reject("Still fetching previous data!");
        }

        if ($tableWrapper[0].scrollHeight - $tableWrapper.scrollTop() -
                   $tableWrapper.outerHeight() <= 1) {
            if (currentRow === 0) {
                currentRow += initialNumRowsToFetch;
            } else {
                currentRow += numRowsToFetch;
            }

            $("#dsTable").addClass("fetching");
            var dsId = $("#dsTable").data("dsid");
            var deferred = PromiseHelper.deferred();

            scrollSampleAndParse(dsId, currentRow, numRowsToFetch)
            .then(deferred.resolve)
            .fail(function(error) {
                deferred.reject(error);
                console.error("Scroll data sample table fails", error);
            })
            .always(function() {
                // when switch ds, #dsTable will be re-built
                // so this is the only place the needs to remove class
                $("#dsTable").removeClass("fetching");
            });

            return deferred.resolve();
        } else {
            return PromiseHelper.reject("no need to scroll");
        }
    }

    function scrollSampleAndParse(dsId, rowToGo, rowsToFetch) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        var deferred = PromiseHelper.deferred();

        dsObj.fetch(rowToGo, rowsToFetch)
        .then(function(jsons) {
            var curDSId = $("#dsTable").data("dsid");
            if (dsId !== curDSId) {
                // when change ds
                console.warn("Sample table change to", curDSId, "cancel fetch");
                deferred.resolve();
                return;
            }

            var $dsTable = $("#dsTable");
            var realJsonKeys = [];

            $dsTable.find("th.th").each(function(index) {
                var $th = $(this);
                var header = $th.find(".editableHead").val();
                // when scroll, it should follow the order of current header
                realJsonKeys[index] = header;
            });

            var tr = getTableRowsHTML(realJsonKeys, jsons, false);
            $dsTable.append(tr);
            TblFunc.moveFirstColumn($dsTable);

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // event set up for the module
    function setupSampleTable() {
        $dsInfoPath.on("click", function() {
            // copies filepath to clipboard
            var value = $dsInfoPath.text();
            xcHelper.copyToClipboard(value);

            $dsInfoPath.parent().addClass("copiableText");
            setTimeout(function() {
                $dsInfoPath.parent().removeClass("copiableText");
            }, 1800);
        });

        var $dsTableView = $("#dsTableView");
        // reload ds with new preview size
        $dsTableView.on("click", ".errorSection .retry", function() {
            var dsId = $dsTableContainer.data("id");
            if (dsId == null) {
                console.error("cannot find ds");
                return;
            }

            rePointDS(dsId);
        });

        // resize column
        $tableWrap.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                minWidth: 25
            });
        });

        $dsTableContainer.scroll(function(){
            var $dsTable = $("#dsTable");
            $(this).scrollTop(0);
            TblFunc.moveFirstColumn($dsTable);
        });

        $dsTableContainer.on("click", ".cancelLoad", function() {
            var txId = $(this).data("txid");
            QueryManager.cancelDS(txId);
        });

        $("#showFileListBtn").click(function() {
            var dsId = $("#dsTableContainer").data("id");
            var dsObj = DS.getDSObj(dsId);
            var isFileError = false;
            var dsName = "";
            if (dsObj && dsObj.advancedArgs) {
                isFIleError = dsObj.advancedArgs.allowFileErrors &&
                             !dsObj.advancedArgs.allowRecordErrors;
                dsName = dsObj.getName();
                numTotalErrors = dsObj.numErrors;
            }
            FileListModal.show(dsId, dsName, isFileError);
        });

        $("#dsInfo-error").click(function() {
            var dsId = $("#dsTableContainer").data("id");
            var dsObj = DS.getDSObj(dsId);
            var isRecordError = false;
            var numTotalErrors;
            if (!dsObj || !dsObj.advancedArgs) {
                isRecordError = true;
            } else {
                isRecordError = dsObj.advancedArgs.allowRecordErrors;
                numTotalErrors = dsObj.numErrors;
            }
            DSImportErrorModal.show(dsId, numTotalErrors, isRecordError);
        });
    }

    // if table is less wide than the panel, expand column widths if content is
    // oveflowing
    function sizeColumns() {
        var destWidth = $dsTableContainer.parent().width() - 40;
        var $headers = $tableWrap.find("th:gt(0)");
        // var numCols = $headers.length;
        // var destColWidth = Math.floor(destWidth / numCols);
        var bestFitWidths = [];
        var totalWidths = 0;
        var needsExpanding = [];
        var numStaticWidths = 0;
        var expandWidths = 0;

        // track which columns will expand and which will remain at
        // default colwidth
        $headers.each(function() {
            var width = TblFunc.getWidestTdWidth($(this), {
                "includeHeader": true,
                "fitAll": true,
                "datastore": true
            });
            var expanding = false;
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

        var ratio = destWidth / totalWidths;
        if (ratio < 1) {
            // extra width is the remainining width that the larger columns
            // can take up
            var remainingWidth = destWidth - (numStaticWidths *
                                              defaultColWidth);
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

        var $dsTable = $("#dsTable");
        $tableWrap.width($dsTable.width());
    }

    function rePointDS(dsId) {
        // maybe it's a succes point but ds table has error
        var dsObj = DS.getErrorDSObj(dsId);
        if (dsObj != null) {
            DS.removeErrorDSObj(dsId);
        } else {
            dsObj = DS.getDSObj(dsId);
        }

        if (!dsObj) {
            Alert.error(DSTStr.NotFindDS);
            return;
        }

        var sources = dsObj.getSources();
        var files = sources.map(function(source) {
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
            "pattern": sources.fileNamePattern,
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
        }, null, true);
    }

    // sample table html
    function getSampleTableHTML(dsObj, jsonKeys, jsons) {
        // validation check
        if (!dsObj || !jsonKeys || !jsons) {
            return "";
        }

        var tr = "";
        var th = "";

        var columnsType = [];  // track column type
        var numKeys = jsonKeys.length;
        numKeys = Math.min(1000, numKeys); // limit to 1000 ths
        var colStrLimit = 250;
        if (numKeys < 5) {
            colStrLimit = Math.max(1000 / numKeys, colStrLimit);
        }
        currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        tr = getTableRowsHTML(jsonKeys, jsons, columnsType, colStrLimit);
        if (numKeys > 0) {
            th += '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                  '</th>';
        }

        // table header
        for (var i = 0; i < numKeys; i++) {
            var key = jsonKeys[i].replace(/\'/g, '&#39');
            var thClass = "th col" + (i + 1);
            var type = columnsType[i];
            var width = xcHelper.getTextWidth(null, key);

            width += 2; // text will overflow without it
            width = Math.max(width, defaultColWidth); // min of 130px

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

        var html =
            '<div class="datasetTbodyWrap">' +
                '<table id="dsTable" class="datasetTable dataTable" ' +
                        'data-dsid="' + dsObj.getId() + '">' +
                    '<thead>' +
                        '<tr>' + th + '</tr>' +
                    '</thead>' +
                    '<tbody>' + tr + '</tbody>' +
                '</table>' +
            '</div>';

        return (html);
    }

    function getTableRowsHTML(jsonKeys, jsons, columnsType, colStrLimit) {
        var tr = "";
        var i  = 0;
        var knf = false;

        jsons.forEach(function(json) {
            tr += '<tr>';
            tr += '<td class="lineMarker"><div class="idSpan">' +
                    (currentRow + i + 1) + '</div></td>';
            // loop through each td, parse object, and add to table cell
            var numKeys = Math.min(jsonKeys.length, 1000); // limit to 1000 ths
            for (var j = 0; j < numKeys; j++) {
                var key = jsonKeys[j];
                var val = json[key];
                knf = false;
                // Check type
                columnsType[j] = xcHelper.parseColType(val, columnsType[j]);

                if (val === undefined) {
                    knf = true;
                }
                var parsedVal = xcHelper.parseJsonValue(val, knf);
                if (colStrLimit) {
                    var hiddenStrLen = parsedVal.length - colStrLimit;
                    if (hiddenStrLen > 0) {
                        parsedVal = parsedVal.slice(0, colStrLimit) +
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

        return (tr);
    }

    function toggleErrorIcon(dsObj) {
        var $dsInfoError = $("#dsInfo-error");
        $dsInfoError.addClass("xc-hidden");

        if (!dsObj.numErrors) {
            return;
        }

        if (!dsObj.advancedArgs) {
            var datasetName = dsObj.getFullName();
            dsObj.addAdvancedArgs()
            .then(function() {
                if (lastDSToSample !== datasetName) {
                    return;
                }
                showIcon();
            }); // if fail, keep hidden
        } else {
            showIcon();
        }

        function showIcon() {
            $dsInfoError.removeClass("xc-hidden");
            var num = xcHelper.numToStr(dsObj.numErrors);
            var text;
            if (dsObj.advancedArgs.allowRecordErrors) {
                $dsInfoError.removeClass("type-file");
                if (dsObj.numErrors === "1") {
                    text = DSTStr.ContainsRecordError;
                } else {
                    text = xcHelper.replaceMsg(DSTStr.ContainsRecordErrors,
                        {num: num});
                }
            } else {
                $dsInfoError.addClass("type-file");
                if (dsObj.numErrors === "1") {
                    text = DSTStr.ContainsFileError;
                } else {
                    text = xcHelper.replaceMsg(DSTStr.ContainsFileErrors,
                        {num: num});
                }
            }
            xcTooltip.changeText($dsInfoError, text);
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSTable.__testOnly__ = {};
        DSTable.__testOnly__.scrollSampleAndParse = scrollSampleAndParse;
        DSTable.__testOnly__.dataStoreTableScroll = dataStoreTableScroll;
    }
    /* End Of Unit Test Only */

    return (DSTable);
}(jQuery, {}));
