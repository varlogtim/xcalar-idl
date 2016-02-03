/*
 * Module for data sample table
 */
window.DataSampleTable = (function($, DataSampleTable) {
    var $datasetWrap = $("#datasetWrap");
    var $tableWrap = $("#dataSetTableWrap");
    var currentRow = 0;
    var totalRows = 0;
    var previousColSelected; // used for shift clicking columns

    DataSampleTable.setup = function() {
        setupSampleTable();
    };

    DataSampleTable.show = function(dsId, isLoading) {
        var deferred = jQuery.Deferred();
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            deferred.reject("No DS");
            return (deferred.promise());
        }

        var datasetName = dsObj.name;

        // only show buttons(select all, clear all, etc) when table can be disablyed
        var $dsColsBtn = $("#dsColsBtn");

        DatastoreForm.hide();

        // update date part of the table info first to make UI smooth
        var partialUpdate = true;
        updateTableInfo(dsObj, partialUpdate, isLoading);

        if (isLoading) {
            var animatedDots =
                '<div class="animatedEllipsis">' +
                  '<div>.</div>' +
                  '<div>.</div>' +
                  '<div>.</div>' +
                '</div>';
            var loadingMsg =
                '<div class="loadingMsg">' +
                        'Data set is loading' + animatedDots +
                '</div>';
            $tableWrap.html(loadingMsg);
            $datasetWrap.addClass("loading");
            $dsColsBtn.hide();
            deferred.resolve();

            return (deferred.promise());
        }

        // XcalarSample sets gDatasetBrowserResultSetId
        XcalarSample(datasetName, 40)
        .then(function(result, totalEntries) {
            var innerDeferred = jQuery.Deferred();

            if (!result) {
                innerDeferred.reject({"error": "Cannot parse the dataset."});
                return innerDeferred.promise();
            }

            var kvPairs    = result.kvPair;
            var numKvPairs = result.numKvPairs;
            // update info here
            dsObj.setNumEntries(totalEntries);
            updateTableInfo(dsObj);

            var value;
            var json;
            var uniqueJsonKey = {}; // store unique Json key
            var jsonKeys = [];
            var jsons = [];  // store all jsons

            try {
                for (var i = 0; i < numKvPairs; i++) {
                    value = kvPairs[i].value;
                    json = $.parseJSON(value);
                    // HACK: this is based on the assumption no other
                    // fields called recordNum, if more than one recordNum in
                    // json, only one recordNum will be in the parsed obj,
                    // which is incorrect behavior
                    delete json.recordNum;
                    jsons.push(json);
                    // get unique keys
                    for (var key in json) {
                        uniqueJsonKey[key] = "";
                    }
                }

                for (var uniquekey in uniqueJsonKey) {
                    jsonKeys.push(uniquekey);
                }

                $datasetWrap.removeClass("loading");
                getSampleTable(datasetName, jsonKeys, jsons);
                innerDeferred.resolve();
            } catch(err) {
                console.error(err, value);
                innerDeferred.reject({"error": "Cannot parse the dataset."});
            }

            return innerDeferred.promise();
        })
        .then(function() {
            $dsColsBtn.show();
            $datasetWrap.removeClass("error");
            deferred.resolve();
        })
        .fail(function(error) {
            $dsColsBtn.hide();
            $datasetWrap.addClass("error");
            var errorHTML = "<div class='loadError'>" +
                                "Loading dataset failed. " + error.error +
                            "</div>";

            $tableWrap.html(errorHTML);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    DataSampleTable.clear = function() {
        $tableWrap.html("");
    };

    DataSampleTable.sizeTableWrapper = function() {
        var $worksheetTable = $('#worksheetTable');

        // size tableWrapper so borders fit table size
        var tableHeight = $worksheetTable.height();
        var scrollBarPadding = 0;
        $tableWrap.width($worksheetTable.width());
        if ($worksheetTable.width() > $datasetWrap.width()) {
            scrollBarPadding = 10;
        }
        $datasetWrap.height(tableHeight + scrollBarPadding);
    };

    function getSampleTable(dsName, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsName, jsonKeys, jsons);
        $tableWrap.html(html);
        restoreSelectedColumns();
        DataSampleTable.sizeTableWrapper();
        var $worksheetTable = $('#worksheetTable');
        moveFirstColumn($worksheetTable);

        // scroll cannot use event bubble
        $("#dataSetTableWrap .datasetTbodyWrap").scroll(function() {
            dataStoreTableScroll($(this));
        });
    }

    function updateTableInfo(dsObj, partial, isLoading) {
        var dsName = dsObj.getName();
        var format = dsObj.getFormat();
        var path = dsObj.getPath() || 'N/A';
        var numEntries = dsObj.getNumEntries() || 'N/A';

        $("#dsInfo-title").text(dsName);
        // XXX TODO(bug 2742): these info should be changed after better backend support
        $("#dsInfo-author").text(WKBKManager.getUser());
        $("#dsInfo-createDate").text(xcHelper.getDate());
        $("#dsInfo-updateDate").text(xcHelper.getDate());

        // file size is special size it needs to be calculated
        dsObj.getFileSize()
        .then(function(fileSize) {
            $("#dsInfo-size").text(fileSize);
        });

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
        }

        if (format) {
            $("#schema-format").text(format);
        }
        totalRows = parseInt(numEntries.replace(/\,/g, ""));
    }

    function dataStoreTableScroll($tableWrapper) {
        var numRowsToFetch = 20;
        if (currentRow + 20 >= totalRows) {
            return;
        }
        if ($tableWrapper[0].scrollHeight - $tableWrapper.scrollTop() -
                   $tableWrapper.outerHeight() <= 1) {
            if (currentRow === 0) {
                currentRow += 40;
            } else {
                currentRow += numRowsToFetch;
            }
            XcalarSetAbsolute(gDatasetBrowserResultSetId, currentRow)
            .then(function() {
                return (XcalarGetNextPage(gDatasetBrowserResultSetId,
                        numRowsToFetch));
            })
            .then(function(result) {
                var kvPairs    = result.kvPair;
                var numKvPairs = result.numKvPairs;

                var value;
                var json;
                var uniqueJsonKey = {}; // store unique Json key
                var jsonKeys = [];
                var jsons = [];  // store all jsons

                try {
                    for (var i = 0; i < numKvPairs; i++) {
                        value = kvPairs[i].value;
                        json = jQuery.parseJSON(value);
                        jsons.push(json);
                        // get unique keys
                        for (var key in json) {
                            uniqueJsonKey[key] = true;
                        }
                    }

                    for (var uniquekey in uniqueJsonKey) {
                        jsonKeys.push(uniquekey);
                    }

                    var selectedCols = {};

                    $('#worksheetTable').find('th.selectedCol').each(
                        function() {
                            selectedCols[$(this).index()] = true;
                        }
                    );

                    var tr = getTableRowsHTML(jsonKeys, jsons, false,
                                              selectedCols);
                    $('#worksheetTable').append(tr);
                    moveFirstColumn($('#worksheetTable'));

                } catch(err) {
                    console.error(err, value);
                }
            });
        }
    }

    // event set up for the module
    function setupSampleTable() {
        // select table witout picking columns
        $("#noDScols").click(function() {
            var $table = $("#worksheetTable");
            var dsName = $table.data("dsname");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");

            DataCart.addItem(dsName, null);
        });

        // select all columns
        $("#selectDSCols").click(function() {
            var items = [];
            var dsName = $("#worksheetTable").data("dsname");

            $("#worksheetTable .editableHead").each(function() {
                var $input = $(this);
                if (!$input.closest(".header").hasClass("colAdded")) {
                    var colNum = xcHelper.parseColNum($input);
                    var val = $input.val();
                    items.push({
                        "colNum": colNum,
                        "value" : val
                    });
                    highlightColumn($input);
                }
            });
            DataCart.addItem(dsName, items);
        });

        // clear all columns
        $("#clearDsCols").click(function() {
            var $table = $("#worksheetTable");
            var dsName = $table.data("dsname");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");
            DataCart.removeCart(dsName);
        });

        // click to select a column
        $tableWrap.on("click", ".header > .flexContainer", function(event) {
            var $input = $(this).find('.editableHead');
            var $table = $("#worksheetTable");

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
            setTimeout(function() { // delay check for shadow due to animation
                DataCart.overflowShadow();
            }, 105);
        });

        // resize column
        $tableWrap.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            gRescolMouseDown($(this), event, {target: "datastore"});
            dblClickResize($(this), {minWidth: 25, target: "datastore"});
        });

        $datasetWrap.scroll(function(){
            var $worksheetTable = $('#worksheetTable');
            $(this).scrollTop(0);
            moveFirstColumn($worksheetTable);

            if ($(this).scrollLeft() === 0) {
                $worksheetTable.find('.rowNumHead .header')
                               .css('margin-left', 0);
                $worksheetTable.find('.idSpan')
                               .css('margin-left', -5);
            } else {
                $worksheetTable.find('.rowNumHead .header')
                               .css('margin-left', 1);
                $worksheetTable.find('.idSpan')
                               .css('margin-left', -4);
            }
        });
    }

    // select a column
    function selectColumn($input, selectAll) {
        var dsName  = $("#worksheetTable").data("dsname");
        var $header = $input.closest(".header");
        var colNum  = xcHelper.parseColNum($input);
        // unselect the column
        if ($header.hasClass("colAdded") && !selectAll) {
            highlightColumn($input, IsActive.Active);
            DataCart.removeItem(dsName, colNum);
        } else {
            highlightColumn($input);
            DataCart.addItem(dsName, {
                "colNum": colNum,
                "value" : $input.val()
            });
        }
    }

    // re-selecte columns that are in data carts
    function restoreSelectedColumns() {
        var $table = $("#worksheetTable");
        var dsName = $table.data("dsname");

        $("#selectedTable-" + dsName).find("li").each(function() {
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

    // sample table html
    function getSampleTableHTML(dsName, jsonKeys, jsons) {
        // validation check
        if (!dsName || !jsonKeys || !jsons) {
            return "";
        }

        var tr = "";
        var th = "";

        var columnsType = [];  // track column type
        var numKeys = jsonKeys.length;
        numKeys = Math.min(1000, numKeys); // limit to 1000 ths

        currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        tr = getTableRowsHTML(jsonKeys, jsons, columnsType);
        if (numKeys > 0) {
            th += '<th class="rowNumHead"><div class="header">' +
                  '</div></th>';
        }
        // table header
        for (var i = 0; i < numKeys; i++) {
            var key     = jsonKeys[i];
            var thClass = "th col" + (i + 1);
            var type    = columnsType[i];
            th +=
                '<th title=\'' + key + '\' class="' + thClass + '">' +
                    '<div class="header type-' + type + '" ' +
                         'data-type=' + type + '>' +
                        '<div class="colGrab" ' +
                            'title="Double click to <br />auto resize" ' +
                            'data-toggle="tooltip" ' +
                            'data-container="body" ' +
                            'data-placement="left" ' +
                            'data-sizetoheader="true">' +
                        '</div>' +
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
                                    'class="editableHead shoppingCartCol ' +
                                    thClass + '" value=\'' + key + '\' ' +
                                    'readonly="true">' +
                            '</div>' +
                            '<div class="flexWrap flex-right">' +
                                '<span class="tick icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</th>';
        }

        var html =
            '<div class="datasetTbodyWrap">' +
                '<table id="worksheetTable" class="datasetTable dataTable" ' +
                        'data-dsname="' + dsName + '">' +
                    '<thead>' +
                        '<tr>' + th + '</tr>' +
                    '</thead>' +
                    '<tbody>' + tr + '</tbody>' +
                '</table>' +
            '</div>';

        return (html);
    }

    function getTableRowsHTML(jsonKeys, jsons, columnsType, selectedCols) {
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

                var selected  = "";

                if (val === undefined) {
                    knf = true;
                }
                var parsedVal = xcHelper.parseJsonValue(val, knf);

                if (selectedCols && selectedCols[j + 1]) {
                    selected = " selectedCol";
                }

                tr += '<td class="col' + (j + 1) + selected + '">' +
                        '<div class="addedBarTextWrap">' +
                            '<div class="addedBarText">' +
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

    return (DataSampleTable);
}(jQuery, {}));
