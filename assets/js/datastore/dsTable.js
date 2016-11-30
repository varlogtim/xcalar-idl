/*
 * Module for dataset sample table
 */
window.DSTable = (function($, DSTable) {
    var $dsTableContainer; // $("#dsTableContainer")
    var $tableWrap;   // $("#dsTableWrap")

    var currentRow = 0;
    var totalRows = 0;
    var previousColSelected; // used for shift clicking columns
    var lastDSToSample; // used to track the last table to samle in async call
    var advanceOption;

    // constant
    var initialNumRowsToFetch = 40;

    DSTable.setup = function() {
        $dsTableContainer = $("#dsTableContainer");
        $tableWrap = $("#dsTableWrap");
        var $advanceOption = $dsTableContainer.find(".advanceOption");
        advanceOption = new DSFormAdvanceOption($advanceOption,
                                                "#dsTableContainer");

        setupSampleTable();
    };

    DSTable.show = function(dsId, isLoading) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        // only show buttons(select all, clear all, etc)
        // when table can be disablyed
        var $dsColsBtn = $("#dsColsBtn");
        var notLastDSError = "not last ds";

        $("#dsTableView").removeClass("xc-hidden");
        $("#dataCartBtn").removeClass("xc-hidden");
        $dsTableContainer.data("id", dsId);
        DSForm.hide();

        // update date part of the table info first to make UI smooth
        var partialUpdate = true;
        updateTableInfo(dsObj, partialUpdate, isLoading);

        if (isLoading) {
            setupViewBeforeLoading();
            // hide carts
            DSCart.switchToCart(null);
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
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
        DSCart.switchToCart(dsId);

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
            setupViewAfterLoading();
            getSampleTable(dsObj, jsonKeys, jsons);

            deferred.resolve();
        })
        .fail(function(error) {
            clearTimeout(timer);
            dsObj.release();

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
            } else if (error instanceof Error){
                errorMsg = String(error);
            } else if (typeof error === "string") {
                errorMsg = error;
            } else {
                // unhanled type of error;
                errorMsg = ErrTStr.Unknown;
            }

            errorMsg = StatusMessageTStr.LoadFailed + ". " + errorMsg;
            setupViewAfterError(errorMsg);

            var $errorSection = $dsTableContainer.find(".errorSection");
            $errorSection.find(".error").html(errorMsg);

            deferred.reject(error);
        });

        return deferred.promise();

        function setupViewBeforeLoading() {
            $dsTableContainer.removeClass("error");
            $dsTableContainer.addClass("loading");
            $dsColsBtn.addClass("xc-hidden");
            $tableWrap.html("");
        }

        function setupViewAfterLoading() {
            // update info here
            updateTableInfo(dsObj);

            $dsTableContainer.removeClass("error");
            $dsTableContainer.removeClass("loading");
            $dsColsBtn.removeClass("xc-hidden");
        }

        function setupViewAfterError(error) {
            $tableWrap.html("");
            $dsColsBtn.addClass("xc-hidden");
            $dsTableContainer.removeClass("loading");
            $dsTableContainer.addClass("error");

            var $errorSection = $dsTableContainer.find(".errorSection");
            $errorSection.find(".error").html(error);
            // XXX this part is confusing as we cannot tell
            // if the error is because of size limit or other reason
            // so hide it for now
            $errorSection.find(".limit, .or").addClass("xc-hidden");
        }
    };

    DSTable.hide = function() {
        $("#dsTableView").addClass("xc-hidden");
        $("#dsTableWrap").empty();
        $("#dataCartBtn").addClass("xc-hidden");
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

    DSTable.refresh = function() {
        // size tableWrapper so borders fit table size
        var $dsTable = $("#dsTable");
        var tableHeight = $dsTable.height();
        var scrollBarPadding = 0;
        $tableWrap.width($dsTable.width());
        if ($dsTable.width() > $dsTableContainer.width()) {
            scrollBarPadding = 10;
        }
        $dsTableContainer.height(tableHeight + scrollBarPadding);
    };

    function getSampleTable(dsObj, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsObj, jsonKeys, jsons);
        $tableWrap.html(html);
        restoreSelectedColumns();
        DSTable.refresh();
        moveFirstColumn($("#dsTable"));

        // scroll cannot use event bubble
        $("#dsTableWrap .datasetTbodyWrap").scroll(function() {
            dataStoreTableScroll($(this));
        });
    }

    function updateTableInfo(dsObj, partial, isLoading) {
        var dsName = dsObj.getName();
        var format = dsObj.getFormat();
        var path = dsObj.getPathWithPattern() || "N/A";
        var numEntries = dsObj.getNumEntries() || "N/A";
        var size = dsObj.getSize() || "N/A";

        $("#dsInfo-title").text(dsName);
        $("#dsInfo-author").text(dsObj.getUser());
        $("#dsInfo-size").text(size);

        if (typeof numEntries === "number") {
            numEntries = Number(numEntries).toLocaleString('en');
        }

        // If we are preloading the data, we want to show N/A until it is done
        if (partial && numEntries === "N/A") {
            if (isLoading) {
                $("#dsInfo-records").text(numEntries);
            }
        } else {
            $("#dsInfo-records").text(numEntries);
        }

        if (path !== "N/A" || !partial) {
            $("#dsInfo-path").text(path);
            xcTooltip.changeText($("#dsInfo-path"), path);
            xcTooltip.enable($("#dsInfo-path"));
        }

        if (format) {
            $("#schema-format").text(format);
        }
        totalRows = parseInt(numEntries.replace(/\,/g, ""));
    }

    function dataStoreTableScroll($tableWrapper) {
        var numRowsToFetch = 20;

        if (currentRow + initialNumRowsToFetch >= totalRows) {
            return;
        }

        if ($("#dsTable").hasClass("fetching")) {
            // when still fetch the data, no new trigger
            console.info("Still fetching previous data!");
            return;
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

            scrollSampleAndParse(dsId, currentRow, numRowsToFetch)
            .fail(function(error) {
                console.error("Scroll data sample table fails", error);
            })
            .always(function() {
                // when switch ds, #dsTable will be re-built
                // so this is the only place the needs to remove class
                $("#dsTable").removeClass("fetching");
            });
        }
    }

    function scrollSampleAndParse(dsId, rowToGo, rowsToFetch) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        var deferred = jQuery.Deferred();

        dsObj.fetch(rowToGo, rowsToFetch)
        .then(function(jsons) {
            var curDSId = $("#dsTable").data("dsid");
            if (dsId !== curDSId) {
                // when change ds
                console.warn("Sample table change to", curDSId, "cancel fetch");
                deferred.resolve();
                return;
            }

            var selectedCols = {};
            var $dsTable = $("#dsTable");
            var realJsonKeys = [];

            $dsTable.find("th.th").each(function(index) {
                var $th = $(this);
                if ($th.hasClass("selectedCol")) {
                    // the first column is column 1
                    selectedCols[index + 1] = true;
                }

                var header = $th.find(".editableHead").val();
                // when scroll, it should follow the order of current header
                realJsonKeys[index] = header;
            });

            var tr = getTableRowsHTML(realJsonKeys, jsons, false, selectedCols);
            $dsTable.append(tr);
            moveFirstColumn($dsTable);

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // event set up for the module
    function setupSampleTable() {
        // select table witout picking columns
        $("#noDScols").click(function() {
            var $table = $("#dsTable");
            var dsId = $table.data("dsid");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");

            DSCart.addItem(dsId, null);
        });

        // select all columns
        $("#selectDSCols").click(function() {
            selectAllDSCols();
        });

        // clear all columns
        $("#clearDsCols").click(function() {
            var $table = $("#dsTable");
            var dsId = $table.data("dsid");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");
            DSCart.removeCart(dsId);
        });

        var $dsTableView = $("#dsTableView");
        // reload ds with new preview size
        $dsTableView.on("click", ".errorSection .retry", function() {
            var $grid = $("#dsListSection .grid-unit.active");
            var dsId = $grid.data("dsid");
            if (dsId == null) {
                console.error("cannot find ds");
                return;
            }

            if ($(this).hasClass("limit")) {
                reloadDS(dsId);
            } else {
                rePointDS(dsId);
            }
        });

        $dsTableView.on('mouseenter', '.tooltipOverflow', function() {
            xcTooltip.auto(this);
        });

        // click to select a column
        $tableWrap.on("click", ".header > .flexContainer", function(event) {
            var $input = $(this).find('.editableHead');
            var $table = $("#dsTable");

            if (event.shiftKey && previousColSelected) {

                var startIndex = previousColSelected.closest("th").index();
                // var highlight = gLastClickTarget.closest("th")
                //                 .hasClass('selectedCol');
                var isHighlighted = $input.closest('th')
                                          .hasClass('selectedCol');

                var endIndex = $input.closest('th').index();
                if (startIndex > endIndex) {
                    var temp = endIndex;
                    endIndex = startIndex;
                    startIndex = temp;
                }

                var $ths = $table.find('th');
                for (var i = startIndex; i <= endIndex; i++) {
                    var $th = $ths.eq(i);
                    if (isHighlighted === $th.hasClass('selectedCol')) {
                        selectColumn($th.find(".editableHead"),
                                            SelectUnit.Single);
                    }
                }
            } else {
                selectColumn($input, SelectUnit.Single);
            }
            previousColSelected = $input.closest('th');
        });

        // select all columns when clicking on row num header
        $tableWrap.on("click", ".rowNumHead", function() {
            selectAllDSCols();
        });

        // resize column
        $tableWrap.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {
                target  : "datastore",
                minWidth: 25
            });
        });

        $dsTableContainer.scroll(function(){
            var $dsTable = $("#dsTable");
            $(this).scrollTop(0);
            moveFirstColumn($dsTable);
        });
    }

    // select all columns
    function selectAllDSCols() {
        var items = [];
        var dsId = $("#dsTable").data("dsid");

        $("#dsTable .editableHead").each(function() {
            var $input = $(this);
            var $header = $input.closest(".header");
            if (!$header.hasClass("colAdded")) {
                var colNum = xcHelper.parseColNum($input);
                var val = $input.val();
                var type = $header.data("type");
                items.push({
                    "colNum": colNum,
                    "value" : val,
                    "type"  : type
                });
                highlightColumn($input);
            }
        });
        DSCart.addItem(dsId, items);
    }

    // select a column
    function selectColumn($input, selectAll) {
        var dsId = $("#dsTable").data("dsid");
        var $header = $input.closest(".header");
        var colNum = xcHelper.parseColNum($input);
        // unselect the column
        if ($header.hasClass("colAdded") && !selectAll) {
            highlightColumn($input, IsActive.Active);
            DSCart.removeItem(dsId, colNum);
        } else {
            highlightColumn($input);
            DSCart.addItem(dsId, {
                "colNum": colNum,
                "value" : $input.val(),
                "type"  : $header.data("type")
            });
        }
    }

    // re-selecte columns that are in data carts
    function restoreSelectedColumns() {
        var $table = $("#dsTable");
        var dsId = $table.data("dsid");
        var $cart = DSCart.getCartElement(dsId);

        $cart.find("li").each(function() {
            var colNum = $(this).data("colnum");
            var $input = $table.find(".editableHead.col" + colNum);
            highlightColumn($input);
        });
        previousColSelected = null;
    }
    // hightligt column
    function highlightColumn($input, active) {
        var colNum  = xcHelper.parseColNum($input);
        var $table  = $input.closest(".datasetTable");
        var $header = $input.closest(".header");

        if (active) {
            $header.removeClass("colAdded");
            $table.find(".col" + colNum).removeClass("selectedCol");
        } else {
            $header.addClass("colAdded");
            $table.find(".col" + colNum).addClass("selectedCol");
        }
    }

    function reloadDS(dsId) {
        var advancedArgs = advanceOption.getArgs();
        if (advancedArgs == null) {
            // invalid case
            return;
        }

        var previewSize = advancedArgs.previewSize;
        return DS.reload(dsId, previewSize);
    }

    function rePointDS(dsId) {
        var dsObj = DS.getDSObj(dsId);
        DSPreview.show({
            "path"       : dsObj.getPath(),
            "format"     : dsObj.getFormat(),
            "previewSize": dsObj.previewSize,
            "pattern"    : dsObj.pattern,
            "isRecur"    : dsObj.isRecur,
            "isRegex"    : dsObj.isRegex
        }, false, dsId);
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
        tr = getTableRowsHTML(jsonKeys, jsons, columnsType, null, colStrLimit);
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
            var width = getTextWidth(null, key, {
                "defaultHeaderStyle": true
            });

            width += 2; // text will overflow without it
            width = Math.max(width, 130); // min of 130px

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

    function getTableRowsHTML(jsonKeys, jsons, columnsType, selectedCols,
                              colStrLimit) {
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
                                    hiddenStrLen.toLocaleString("en") + " " +
                                    TblTStr.Truncate + ")";
                    }
                }

                var selected  = "";
                if (selectedCols && selectedCols[j + 1]) {
                    selected = " selectedCol";
                }

                tr += '<td class="col' + (j + 1) + selected + '">' +
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSTable.__testOnly__ = {};
        DSTable.__testOnly__.scrollSampleAndParse = scrollSampleAndParse;
    }
    /* End Of Unit Test Only */

    return (DSTable);
}(jQuery, {}));
